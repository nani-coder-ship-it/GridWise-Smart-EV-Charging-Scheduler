from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
from database.db import db
from database.models import ChargingRequest, GridStatus, ChargingAllocation, SystemLog
from engine.scheduler import Scheduler
from engine.insights import InsightsGenerator
from engine.grid_manager import GridLoadManager
from engine.slot_suggester import SlotSuggester

api = Blueprint('api', __name__)
scheduler = Scheduler()
grid_manager = GridLoadManager()
slot_suggester = SlotSuggester()

@api.route('/suggest-slots', methods=['POST'])
def suggest_slots():
    """Return top-3 alternative charging slots scored by grid, cost, and solar."""
    data = request.json or {}
    required = ['current_battery', 'target_battery', 'departure_time']
    missing  = [f for f in required if f not in data]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    try:
        current_battery  = float(data['current_battery'])
        target_battery   = float(data['target_battery'])
        battery_capacity = float(data.get('battery_capacity', 60.0))
        charger_type     = data.get('charger_type', 'AC')
        priority         = data.get('priority', 'normal')

        power_kw         = 50.0 if charger_type == 'DC' else 7.2
        required_kwh     = (target_battery - current_battery) / 100.0 * battery_capacity
        duration_hours   = required_kwh / power_kw

        departure_time   = datetime.fromisoformat(data['departure_time'].replace('Z', '+00:00'))
        # Work in UTC-naive for scoring (same as rest of engine)
        dep_naive        = departure_time.replace(tzinfo=None)
        now_naive        = datetime.utcnow()

        suggestions = slot_suggester.suggest(
            kwh=required_kwh,
            duration_hours=duration_hours,
            departure_time=dep_naive,
            current_time=now_naive,
            priority=priority,
            db=db,
        )

        # Strip datetime objects (not JSON-serialisable)
        for s in suggestions:
            s.pop('start_dt', None)
            s.pop('end_dt',   None)

        return jsonify({'suggestions': suggestions}), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@api.route('/schedule', methods=['POST'])
def schedule_charging():
    data = request.json
    
    # Input Validation
    required_fields = ['vehicle_id', 'current_battery', 'target_battery', 'departure_time', 'priority']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({'error': f"Missing required fields: {', '.join(missing_fields)}"}), 400

    try:
        # Validate data types and logic
        current_battery = float(data['current_battery'])
        target_battery = float(data['target_battery'])
        if not (0 <= current_battery <= 100) or not (0 <= target_battery <= 100):
             return jsonify({'error': "Battery percentage must be between 0 and 100"}), 400
        if current_battery >= target_battery:
             return jsonify({'error': "Target battery must be greater than current battery"}), 400
             
        # Normalize to UTC aware datetime
        departure_time = datetime.fromisoformat(data['departure_time'].replace('Z', '+00:00'))
        current_utc = datetime.now(timezone.utc)
        
        print(f"DEBUG: Departure: {departure_time}, Current UTC: {current_utc}")

        # Compare with current UTC time (aware)
        if departure_time <= current_utc:
            print(f"DEBUG: ERROR! Departure {departure_time} <= Current {current_utc}")
            return jsonify({'error': "Departure time must be in the future"}), 400

        # ADMISSION CONTROL: Check Grid Stress
        # Get current load estimate (Base + Active)
        # For simplicity, we can fetch from grid_manager if we moved load calc there, 
        # or re-calculate briefly here. 
        # Let's call a helper or just check base load + active count * 3 (approx) for speed.
        now = datetime.utcnow()
        active_count = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time >= now
        ).count()
        base_load = grid_manager.get_base_load(now)
        current_load_est = base_load + (active_count * 30.0) # Using 30kW as DC worst case or 7kW average? 
        # Let's use a safer estimate: query sum of power.
        active_power = db.session.query(db.func.sum(ChargingAllocation.charger_power_kw)).filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time >= now
        ).scalar() or 0
        
        total_load_check = base_load + active_power
        
        if grid_manager.check_protection_rules(total_load_check) == 'RESTRICT':
            if data['priority'] != 'emergency':
                # Log rejection
                scheduler.log_system_action('ERROR', f"Rejected request derived from {data['vehicle_id']} due to GRID EMERGENCY.", 'RESTRICT')
                return jsonify({'error': "Grid in Emergency Mode. Only Emergency requests accepted."}), 503

        # Remove any existing active request for this vehicle (Prevent Duplicates)
        existing_req = ChargingRequest.query.filter_by(vehicle_id=data['vehicle_id']).filter(
            ChargingRequest.status.in_(['pending', 'scheduled'])
        ).first()
        
        if existing_req:
            if existing_req.allocation:
                db.session.delete(existing_req.allocation)
            db.session.delete(existing_req)
            db.session.flush() # Ensure delete is processed before adding new

        # Create Request Record
        req = ChargingRequest(
            vehicle_id=data['vehicle_id'],
            current_battery_percent=current_battery,
            target_battery_percent=target_battery,
            battery_capacity_kwh=data.get('battery_capacity', 60.0), # Default 60kWh
            departure_time=departure_time,
            priority_level=data['priority'],
            charger_type=data.get('charger_type', 'AC'), # New field
            required_kwh=0, # Calculated below
            estimated_duration_minutes=0
        )
        
        # Pre-calculate for DB record
        req.required_kwh = (req.target_battery_percent - req.current_battery_percent) / 100.0 * req.battery_capacity_kwh
        req.estimated_duration_minutes = (req.required_kwh / 7.2) * 60
        
        db.session.add(req)
        db.session.flush() # Generate ID but don't commit yet to avoid zombie requests if scheduling fails
        
        # 3b. If caller supplied a preferred slot (from slot suggestion), use it directly
        preferred_slot = data.get('preferred_slot')
        if preferred_slot:
            req.status = 'scheduled'
        # Run Scheduler (will respect preferred_slot inside)
        allocation = scheduler.schedule_request(req, preferred_start=preferred_slot)
        db.session.add(allocation)
        req.status = 'scheduled'
        
        # Commit everything as a single transaction
        db.session.commit()
        
        # Calculate duration for response
        duration_delta = allocation.allocated_end_time - allocation.allocated_start_time
        duration_hours_float = duration_delta.total_seconds() / 3600
        duration_hours_int = int(duration_hours_float)
        duration_minutes_int = int((duration_hours_float * 60) % 60)

        # Generate Insight (Post-commit as it doesn't affect DB integrity usually, but could be inside if critical)
        insight = InsightsGenerator.generate_insight(req, allocation)
        
        return jsonify({
            'status': 'success',
            'request_id': req.id,
            'schedule': {
                'startTime': allocation.allocated_start_time.isoformat(), # ISO format for frontend parsing
                'endTime': allocation.allocated_end_time.isoformat(),
                'duration': f"{duration_hours_int}h {duration_minutes_int}m",
                'cost': f"₹{allocation.estimated_cost}",
                'savings': f"₹{allocation.cost_without_optimization - allocation.estimated_cost:.2f}",
                'load': 'Optimized' if allocation.peak_optimized else 'Standard',
                'carbonReduced': f"{allocation.carbon_savings_kg} kg CO₂",
                'isOffPeak': allocation.peak_optimized
            },
            'insight': insight
        })

    except ValueError as ve:
        return jsonify({'error': f"Invalid data format: {str(ve)}"}), 400
    except Exception as e:
        db.session.rollback() # Rollback changes if anything fails
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'message': f"Scheduling Failed: {str(e)}"}), 500

@api.route('/active-schedule', methods=['GET'])
def get_active_schedule():
    # Return future/active allocations with real derived status
    now = datetime.utcnow()
    allocations = ChargingAllocation.query.filter(ChargingAllocation.allocated_end_time > now).all()
    
    results = []
    for alloc in allocations:
        vehicle_id = alloc.request.vehicle_id if alloc.request else f"EV-{alloc.request_id}"
        priority = alloc.request.priority_level.capitalize() if alloc.request else "Normal"
        cost_inr = alloc.estimated_cost
        cost_usd = round(cost_inr / 83.0, 2)
        
        # Derive real status from time window
        if alloc.allocated_start_time <= now <= alloc.allocated_end_time:
            status = 'Charging'
        else:
            status = 'Scheduled'
        
        results.append({
            'vehicle_id': vehicle_id,
            'priority': priority,
            'start_time': alloc.allocated_start_time.strftime('%H:%M'),
            'end_time': alloc.allocated_end_time.strftime('%H:%M'),
            'status': status,
            'cost_inr': cost_inr,
            'cost_usd': cost_usd
        })
    
    results.sort(key=lambda x: x['start_time'])
    return jsonify(results)


@api.route('/completed-sessions', methods=['GET'])
def get_completed_sessions():
    """Return past charging sessions (allocated_end_time <= now)"""
    now = datetime.utcnow()
    allocations = ChargingAllocation.query.filter(ChargingAllocation.allocated_end_time <= now).all()
    
    results = []
    for alloc in allocations:
        vehicle_id = alloc.request.vehicle_id if alloc.request else f"EV-{alloc.request_id}"
        priority = alloc.request.priority_level.capitalize() if alloc.request else "Normal"
        cost_inr = alloc.estimated_cost
        cost_usd = round(cost_inr / 83.0, 2)
        
        results.append({
            'id': alloc.id,
            'request_id': alloc.request_id,
            'vehicle_id': vehicle_id,
            'priority': priority,
            'start_time': alloc.allocated_start_time.strftime('%H:%M'),
            'end_time': alloc.allocated_end_time.strftime('%H:%M'),
            'status': 'Completed',
            'cost_inr': cost_inr,
            'cost_usd': cost_usd
        })
    
    results.sort(key=lambda x: x['end_time'], reverse=True)
    return jsonify(results)


@api.route('/sessions/<int:allocation_id>', methods=['DELETE'])
def delete_session(allocation_id):
    """Delete a completed allocation (and its parent request if no other allocations remain)."""
    try:
        alloc = ChargingAllocation.query.get(allocation_id)
        if not alloc:
            return jsonify({'error': 'Session not found'}), 404

        request_id = alloc.request_id
        db.session.delete(alloc)
        db.session.flush()  # Push delete before checking siblings

        # If the parent request has no remaining allocations, delete it too
        remaining = ChargingAllocation.query.filter_by(request_id=request_id).count()
        if remaining == 0:
            parent = ChargingRequest.query.get(request_id)
            if parent:
                db.session.delete(parent)

        db.session.commit()
        return jsonify({'success': True, 'deleted_id': allocation_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@api.route('/system/logs', methods=['GET'])
def get_system_logs():
    # Return last 20 logs desc
    logs = SystemLog.query.order_by(SystemLog.timestamp.desc()).limit(20).all()
    return jsonify([log.to_dict() for log in logs])

@api.route('/grid/status', methods=['GET'])
def get_grid_status():
    now = datetime.utcnow()
    
    # 1. Calculate Active & Waiting EVs
    
    # Active: Currently in time window
    active_count = ChargingAllocation.query.filter(
        ChargingAllocation.allocated_start_time <= now,
        ChargingAllocation.allocated_end_time >= now
    ).count()
    
    # Waiting: Scheduled but future OR Pending requests
    waiting_scheduled = ChargingAllocation.query.filter(
        ChargingAllocation.allocated_start_time > now
    ).count()
    waiting_pending = ChargingRequest.query.filter_by(status='pending').count()
    waiting_count = waiting_scheduled + waiting_pending
    
    # 2. Calculate Cost Saved Today
    # For simplicity, sum all savings (in real app, filter eventually by today)
    allocations = ChargingAllocation.query.all()
    total_savings = sum((a.cost_without_optimization - a.estimated_cost) for a in allocations)
    
    # 3. Load & Stress
    # 3. Load & Stress
    base_load = grid_manager.get_base_load(now)
    # Real EV load based on active count (3 kW per EV as per requirement)
    ev_load = active_count * 3.0 
    total_load = base_load + ev_load
    capacity = 100.0
    
    utilization_percent = (total_load / capacity) * 100
    
    # Use centralized stress logic
    stress = grid_manager.calculate_stress_level(total_load)
    
    # Prediction
    prediction = grid_manager.predict_peak_load(now)
    
    # Carbon Savings
    total_carbon = sum((a.carbon_savings_kg or 0.0) for a in allocations)

    # Calculate split (Active Only)
    active_allocations = ChargingAllocation.query.filter(
        ChargingAllocation.allocated_start_time <= now,
        ChargingAllocation.allocated_end_time >= now
    ).all()

    ac_load = sum(a.charger_power_kw for a in active_allocations if a.charger_type == 'AC')
    dc_load = sum(a.charger_power_kw for a in active_allocations if a.charger_type == 'DC')
    
    # Recalculate total load to match the split exactly
    # Base load + Active EV load
    total_load = base_load + ac_load + dc_load
    
    utilization_percent = (total_load / capacity) * 100 if capacity > 0 else 0

    # TRIGGER PROTECTION LOGIC
    # Every time the dashboard polls for status, we check and balance if needed.
    scheduler.balance_grid(total_load)
        
    return jsonify({
        'timestamp': now.isoformat(),
        'base_load': round(base_load, 1),
        'ev_load': round(ac_load + dc_load, 1),
        'total_load': round(total_load, 1),
        'capacity_kw': capacity,
        'active_evs': len(active_allocations),
        'waiting_evs': waiting_count,
        'cost_saved_today': round(total_savings, 2), # Ensure float
        'carbon_saved_total': round(total_carbon, 2),
        'renewable_percent': 45.5, # Mock dynamic
        'stress_level': stress,
        'transformer_utilization': round(utilization_percent, 1),
        'peak_prediction': prediction['peak_time'],
        'recommendation': prediction['recommendation'],
        'ac_load_kw': round(ac_load, 1),
        'dc_load_kw': round(dc_load, 1)
    })


@api.route('/grid/load-history', methods=['GET'])
def get_grid_load_history():
    # Simulate 24h history for the graph
    history = []
    now = datetime.utcnow()
    
    for i in range(24):
        # Generate time points for the last 24 hours
        point_time = now - timedelta(hours=23-i)
        hour = point_time.hour
        
        import math
        import random
        
        # Base load curve from GridManager logic
        if 18 <= hour <= 22:
            base_val = 60.0
        elif 7 <= hour < 18:
            base_val = 40.0
        else:
            base_val = 20.0
            
        # Add some random variance
        base_val += random.uniform(-2, 5)
        
        # Optimized vs Raw simulation (Active EVs * 3kW)
        # Assume fluctuating active count for history
        active_evs_sim = 0
        if 18 <= hour <= 22:
            active_evs_sim = random.randint(5, 12) # High usage
        elif 8 <= hour < 18:
            active_evs_sim = random.randint(2, 8) # Moderate
        else:
            active_evs_sim = random.randint(0, 3) # Low
            
        # FORCE SYNC: If this is the current hour (last point), use REAL data
        if i == 23:
             from database.models import ChargingAllocation
             real_active_count = ChargingAllocation.query.filter(
                ChargingAllocation.allocated_start_time <= now,
                ChargingAllocation.allocated_end_time >= now
             ).count()
             active_evs_sim = real_active_count

        ev_load_raw = active_evs_sim * 3.0
        
        # Raw = Base + Unoptimized (assume higher peak)
        raw_total = base_val + ev_load_raw
        
        # Optimized = Actual Load (Base + Active * 3.0)
        # For historical simulation, we create a gap. 
        # For the last point (Real Time), optimized line MUST match actual load.
        if i == 23:
             opt_total = raw_total # This IS the actual load
             # To show "savings", we can inflate raw_total artificially for the demo
             raw_total = raw_total * 1.2 # "What if unmanaged?"
        else:
            if 18 <= hour <= 22:
                 # Simulation: Optimized would be lower here
                 opt_total = base_val + (ev_load_raw * 0.4) 
            else:
                 # Optimized might be slightly higher off-peak due to shifting
                 opt_total = base_val + (ev_load_raw * 1.1)

        history.append({
            'time': point_time.strftime('%H:%M'),
            'raw_load': round(max(0, raw_total), 1),
            'optimized_load': round(max(0, opt_total), 1)
        })
        
    return jsonify(history)
