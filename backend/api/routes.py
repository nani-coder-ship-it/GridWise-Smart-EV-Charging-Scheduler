from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
from database.db import db
from database.models import ChargingRequest, GridStatus, ChargingAllocation, SystemLog
from engine.scheduler import Scheduler
from engine.insights import InsightsGenerator
from engine.grid_manager import GridLoadManager
from engine.slot_suggester import SlotSuggester
from engine.sms_service import WhatsAppService
from sockets import socketio

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
        if not (1 <= battery_capacity <= 200):
            return jsonify({'error': 'Battery capacity must be between 1 and 200 kWh'}), 400
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

    # ── Input validation ────────────────────────────────────────────────────
    required_fields = ['vehicle_id', 'current_battery', 'target_battery', 'departure_time', 'priority']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({'error': f"Missing required fields: {', '.join(missing_fields)}"}), 400

    try:
        current_battery  = float(data['current_battery'])
        target_battery   = float(data['target_battery'])
        if not (0 <= current_battery <= 100) or not (0 <= target_battery <= 100):
            return jsonify({'error': 'Battery percentage must be between 0 and 100'}), 400
        if current_battery >= target_battery:
            return jsonify({'error': 'Target battery must be greater than current battery'}), 400

        battery_capacity = float(data.get('battery_capacity', 60.0))
        if not (1 <= battery_capacity <= 200):
            return jsonify({'error': 'Battery capacity must be between 1 and 200 kWh'}), 400

        charger_type     = data.get('charger_type', 'AC').upper()
        priority         = data.get('priority', 'normal')

        # ── Time handling ───────────────────────────────────────────────────
        departure_time   = datetime.fromisoformat(data['departure_time'].replace('Z', '+00:00'))
        current_utc_aware = datetime.now(timezone.utc)
        # UTC-naive for all engine comparisons (SQLite stores naive)
        departure_naive  = departure_time.replace(tzinfo=None)
        now_naive        = datetime.utcnow()

        print(f"DEBUG: Departure: {departure_naive}, Now UTC: {now_naive}")

        if departure_naive <= now_naive:
            print(f"DEBUG: ERROR! Departure {departure_naive} <= Now {now_naive}")
            return jsonify({'error': 'Departure time must be in the future'}), 400

        # ── Pre-flight feasibility calc ─────────────────────────────────────
        power_kw          = 50.0 if charger_type == 'DC' else 7.2
        fast_power_kw     = 50.0  # DC fast charger baseline
        required_kwh      = (target_battery - current_battery) / 100.0 * battery_capacity
        full_duration_h   = required_kwh / power_kw          # time needed at requested charger
        fast_duration_h   = required_kwh / fast_power_kw     # time needed at DC fast charge
        available_h       = (departure_naive - now_naive).total_seconds() / 3600
        is_partial        = full_duration_h > available_h    # can't fully charge before departure
        not_feasible_fast = fast_duration_h > available_h    # even DC fast charge can't finish

        # ISO helper – all times returned with Z so JS parses as UTC
        def iso_utc(dt):
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')

        # If even DC fast-charge can't finish before departure, return structured response
        if not_feasible_fast and priority != 'emergency':
            earliest_completion = now_naive + timedelta(hours=full_duration_h)
            return jsonify({
                'status': 'not_feasible',
                'message': 'Charging cannot be completed before departure even with DC fast charging.',
                'schedule': {
                    'partialCharge': True,
                    'achievableBattery': round(
                        current_battery + (available_h / full_duration_h) * (target_battery - current_battery)
                    ) if full_duration_h > 0 else current_battery,
                    'warning': (
                        f"Insufficient time before departure. "
                        f"Even DC Fast Charge needs {int(fast_duration_h)}h {int((fast_duration_h % 1)*60)}m "
                        f"but you only have {int(available_h)}h {int((available_h % 1)*60)}m."
                    ),
                    'earliestCompletionTime': iso_utc(earliest_completion),
                    'fastChargeOption': {
                        'chargerType': 'DC',
                        'duration': f"{int(fast_duration_h)}h {int((fast_duration_h % 1)*60)}m",
                        'achievable': int(target_battery)
                    },
                    'confirmation': None
                }
            }), 200

        # ── Auto-sweep stale sessions (prevents load inflation) ──────────────
        now = datetime.utcnow()
        overdue = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_end_time < now,
            ChargingAllocation.status.in_(['Scheduled', 'Charging'])
        ).all()
        for a in overdue:
            a.status = 'Completed'
            if a.request and a.request.status == 'scheduled':
                a.request.status = 'completed'
        if overdue:
            db.session.flush()

        # ── Grid admission control ───────────────────────────────────────────
        base_load = grid_manager.get_base_load(now)
        active_power = db.session.query(db.func.sum(ChargingAllocation.charger_power_kw)).filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time   >  now,
            ChargingAllocation.status.in_(['Scheduled', 'Charging'])
        ).scalar() or 0
        new_power_kw = 50.0 if charger_type == 'DC' else 7.2
        projected    = base_load + active_power + new_power_kw
        if grid_manager.check_protection_rules(projected) == 'RESTRICT':
            if priority != 'emergency':
                scheduler.log_system_action('ERROR',
                    f"Rejected {data['vehicle_id']} — Grid Emergency (projected {projected:.1f} kW).", 'RESTRICT')
                return jsonify({'error': 'Grid in Emergency Mode. Only Emergency requests accepted.'}), 503

        # ── Remove duplicate active request for same vehicle ─────────────────
        existing_req = ChargingRequest.query.filter_by(vehicle_id=data['vehicle_id']).filter(
            ChargingRequest.status.in_(['pending', 'scheduled'])
        ).first()
        if existing_req:
            if existing_req.allocation:
                db.session.delete(existing_req.allocation)
            db.session.delete(existing_req)
            db.session.flush()

        # ── Create request record ────────────────────────────────────────────
        req = ChargingRequest(
            vehicle_id=data['vehicle_id'],
            current_battery_percent=current_battery,
            target_battery_percent=target_battery,
            battery_capacity_kwh=battery_capacity,
            departure_time=departure_naive,
            priority_level=priority,
            charger_type=charger_type,
            required_kwh=required_kwh,
            estimated_duration_minutes=int(full_duration_h * 60),
        )
        db.session.add(req)
        db.session.flush()   # get req.id before scheduling

        # ── Run Scheduler ────────────────────────────────────────────────────
        preferred_slot = data.get('preferred_slot')
        allocation = scheduler.schedule_request(req, preferred_start=preferred_slot)
        db.session.add(allocation)
        req.status = 'scheduled'
        db.session.commit()

        db.session.commit()

        actual_duration_h = (allocation.allocated_end_time - allocation.allocated_start_time
                             ).total_seconds() / 3600
        dur_h_int = int(actual_duration_h)
        dur_m_int = int((actual_duration_h * 60) % 60)

        # Partial charge: scheduled duration < full needed duration (2% tolerance)
        actual_is_partial = actual_duration_h < full_duration_h * 0.98
        achievable_pct = round(
            current_battery + (actual_duration_h / full_duration_h) *
            (target_battery - current_battery)
        ) if actual_is_partial and full_duration_h > 0 else int(target_battery)

        # Confirm or warn
        if actual_is_partial:
            confirmation = None
            fast_option = {
                'chargerType': 'DC',
                'duration': f"{int(fast_duration_h)}h {int((fast_duration_h % 1)*60)}m",
                'achievable': int(target_battery)
            } if charger_type != 'DC' else None
            warning_msg = (
                f"Not enough time for full charge. Battery will reach ~{achievable_pct}% "
                f"by departure. Consider DC Fast Charge ({int(fast_duration_h)}h "
                f"{int((fast_duration_h % 1)*60)}m for 100%)."
            )
        else:
            confirmation = '\u2714 Charging will complete before your departure.'
            fast_option  = None
            warning_msg  = None

        insight = InsightsGenerator.generate_insight(req, allocation)

        # ── Push live update to all connected clients ──────────────────────
        socketio.emit('schedule_update', {
            'vehicle_id': req.vehicle_id,
            'event': 'scheduled'
        })

        return jsonify({
            'status': 'success',
            'request_id': req.id,
            'schedule': {
                'startTime':         iso_utc(allocation.allocated_start_time),
                'endTime':           iso_utc(allocation.allocated_end_time),
                'duration':          f"{dur_h_int}h {dur_m_int}m",
                'cost':              f'\u20b9{allocation.estimated_cost}',
                'savings':           f'\u20b9{allocation.cost_without_optimization - allocation.estimated_cost:.2f}',
                'load':              'Optimized' if allocation.peak_optimized else 'Standard',
                'carbonReduced':     f'{allocation.carbon_savings_kg} kg CO\u2082',
                'isOffPeak':         allocation.peak_optimized,
                'partialCharge':     actual_is_partial,
                'achievableBattery': achievable_pct,
                'confirmation':      confirmation,
                'warning':           warning_msg,
                'fastChargeOption':  fast_option,
            },
            'insight': insight
        })

    except ValueError as ve:
        return jsonify({'error': f'Invalid data format: {str(ve)}'}), 400
    except Exception as e:
        db.session.rollback()
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e), 'message': f'Scheduling Failed: {str(e)}'}), 500

@api.route('/active-schedule', methods=['GET'])
def get_active_schedule():
    # Return future/active allocations with real derived status
    IST = timedelta(hours=5, minutes=30)
    now = datetime.utcnow()
    allocations = ChargingAllocation.query.filter(ChargingAllocation.allocated_end_time > now).all()
    
    results = []
    for alloc in allocations:
        vehicle_id = alloc.request.vehicle_id if alloc.request else f"EV-{alloc.request_id}"
        priority = alloc.request.priority_level.capitalize() if alloc.request else "Normal"
        cost_inr = alloc.estimated_cost
        cost_usd = round(cost_inr / 83.0, 2)
        
        # Convert UTC → IST for display (matches what the frontend parses from ISO-Z strings)
        start_ist = alloc.allocated_start_time + IST
        end_ist   = alloc.allocated_end_time   + IST

        # Derive real status from time window (compare against UTC)
        if alloc.allocated_start_time <= now <= alloc.allocated_end_time:
            status = 'Charging'
        else:
            status = 'Scheduled'
        
        results.append({
            'vehicle_id': vehicle_id,
            'priority': priority,
            'start_time': start_ist.strftime('%H:%M'),
            'end_time':   end_ist.strftime('%H:%M'),
            'status': status,
            'cost_inr': cost_inr,
            'cost_usd': cost_usd,
            '_sort_key': alloc.allocated_start_time.isoformat()  # sort by raw UTC
        })
    
    results.sort(key=lambda x: x.pop('_sort_key'))
    return jsonify(results)


@api.route('/completed-sessions', methods=['GET'])
def get_completed_sessions():
    """Return past charging sessions (allocated_end_time <= now)"""
    IST = timedelta(hours=5, minutes=30)
    now = datetime.utcnow()
    allocations = ChargingAllocation.query.filter(ChargingAllocation.allocated_end_time <= now).all()
    
    results = []
    for alloc in allocations:
        vehicle_id = alloc.request.vehicle_id if alloc.request else f"EV-{alloc.request_id}"
        priority = alloc.request.priority_level.capitalize() if alloc.request else "Normal"
        cost_inr = alloc.estimated_cost
        cost_usd = round(cost_inr / 83.0, 2)

        # Convert UTC → IST for display
        start_ist = alloc.allocated_start_time + IST
        end_ist   = alloc.allocated_end_time   + IST
        
        results.append({
            'id': alloc.id,
            'request_id': alloc.request_id,
            'vehicle_id': vehicle_id,
            'priority': priority,
            'start_time': start_ist.strftime('%H:%M'),
            'end_time':   end_ist.strftime('%H:%M'),
            'status': 'Completed',
            'cost_inr': cost_inr,
            'cost_usd': cost_usd,
            '_sort_key': alloc.allocated_end_time.isoformat()  # sort by raw UTC
        })
    
    results.sort(key=lambda x: x.pop('_sort_key'), reverse=True)
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


@api.route('/completed-sessions/all', methods=['DELETE'])
def delete_all_completed_sessions():
    """Delete ALL completed allocations and their orphaned parent requests."""
    try:
        now = datetime.utcnow()
        completed = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_end_time <= now
        ).all()

        request_ids = {a.request_id for a in completed}

        # Delete all completed allocations
        for alloc in completed:
            db.session.delete(alloc)
        db.session.flush()

        # Delete parent requests that now have no remaining allocations
        for rid in request_ids:
            remaining = ChargingAllocation.query.filter_by(request_id=rid).count()
            if remaining == 0:
                parent = ChargingRequest.query.get(rid)
                if parent:
                    db.session.delete(parent)

        db.session.commit()
        return jsonify({'success': True, 'deleted_count': len(completed)}), 200
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


@api.route('/charging-status/<vehicle_id>', methods=['GET'])
def get_charging_status(vehicle_id):
    """
    Login-free status lookup for residents.
    Returns the most recent charging session for the given vehicle_id.
    Computes real-time derived status: Scheduled / Charging / Completed.
    """
    # Find the latest request for this vehicle (by id DESC)
    req = (
        ChargingRequest.query
        .filter(ChargingRequest.vehicle_id == vehicle_id)
        .order_by(ChargingRequest.id.desc())
        .first()
    )

    if not req:
        return jsonify({'error': f'No session found for vehicle "{vehicle_id}"'}), 404

    alloc = req.allocation
    now = datetime.utcnow()

    def iso_utc(dt):
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ') if dt else None

    if not alloc:
        # Request exists but no allocation yet (pending)
        return jsonify({
            'vehicle_id': req.vehicle_id,
            'status': 'Pending',
            'scheduled_start': None,
            'scheduled_end': None,
            'estimated_completion': None,
            'energy_delivered_kwh': 0.0,
            'total_required_kwh': round(req.required_kwh, 3),
            'charger_type': req.charger_type,
            'charger_power_kw': None,
            'time_remaining_minutes': None,
            'estimated_cost': None,
            'total_cost': None,
        }), 200

    start = alloc.allocated_start_time
    end   = alloc.allocated_end_time
    power_kw = alloc.charger_power_kw
    required_kwh = req.required_kwh

    # ── Derive status from time window ──────────────────────────────────────
    if now < start:
        status = 'Scheduled'
        elapsed_hours = 0.0
        time_remaining_minutes = round((end - now).total_seconds() / 60)
    elif start <= now <= end:
        status = 'Charging'
        elapsed_hours = (now - start).total_seconds() / 3600
        time_remaining_minutes = max(0, round((end - now).total_seconds() / 60))
    else:
        status = 'Completed'
        elapsed_hours = (end - start).total_seconds() / 3600
        time_remaining_minutes = 0

    energy_delivered_kwh = round(min(power_kw * elapsed_hours, required_kwh), 3)

    return jsonify({
        'vehicle_id': req.vehicle_id,
        'status': status,
        'scheduled_start': iso_utc(start),
        'scheduled_end': iso_utc(end),
        'estimated_completion': iso_utc(end),
        'energy_delivered_kwh': energy_delivered_kwh,
        'total_required_kwh': round(required_kwh, 3),
        'charger_type': req.charger_type,
        'charger_power_kw': power_kw,
        'time_remaining_minutes': time_remaining_minutes,
        'estimated_cost': round(alloc.estimated_cost, 2),
        'total_cost': round(alloc.estimated_cost, 2) if status == 'Completed' else None,
        'peak_optimized': alloc.peak_optimized,
        'carbon_savings_kg': round(alloc.carbon_savings_kg or 0.0, 3),
    }), 200


@api.route('/charging-status/<vehicle_id>', methods=['DELETE'])
def cancel_charging_session(vehicle_id):
    """
    Cancel a SCHEDULED session for the given vehicle_id.
    Refuses to cancel sessions that are already Charging or Completed.
    """
    req = (
        ChargingRequest.query
        .filter(ChargingRequest.vehicle_id == vehicle_id)
        .order_by(ChargingRequest.id.desc())
        .first()
    )

    if not req:
        return jsonify({'error': f'No session found for "{vehicle_id}"'}), 404

    alloc = req.allocation
    now = datetime.utcnow()

    if not alloc:
        # Pending request — just cancel it
        req.status = 'cancelled'
        db.session.commit()
        socketio.emit('schedule_update', {'vehicle_id': vehicle_id, 'event': 'cancelled'})
        return jsonify({'message': f'Pending request for "{vehicle_id}" cancelled.'}), 200

    # Derive current status
    if now < alloc.allocated_start_time:
        current_status = 'Scheduled'
    elif alloc.allocated_start_time <= now <= alloc.allocated_end_time:
        current_status = 'Charging'
    else:
        current_status = 'Completed'

    if current_status != 'Scheduled':
        return jsonify({
            'error': f'Cannot cancel a session that is already {current_status}.'
        }), 409

    # Delete allocation + mark request cancelled
    db.session.delete(alloc)
    req.status = 'cancelled'
    db.session.commit()

    socketio.emit('schedule_update', {'vehicle_id': vehicle_id, 'event': 'cancelled'})
    return jsonify({'message': f'Session for "{vehicle_id}" cancelled successfully.'}), 200
