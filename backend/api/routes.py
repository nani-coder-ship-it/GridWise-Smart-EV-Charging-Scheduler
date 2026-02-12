from flask import Blueprint, request, jsonify
from datetime import datetime
from database.db import db
from database.models import ChargingRequest, GridStatus
from engine.scheduler import Scheduler
from engine.insights import InsightsGenerator
from engine.grid_manager import GridLoadManager

api = Blueprint('api', __name__)
scheduler = Scheduler()
grid_manager = GridLoadManager()

@api.route('/schedule', methods=['POST'])
def schedule_charging():
    data = request.json
    
    # Create Request Record
    req = ChargingRequest(
        vehicle_id=data['vehicle_id'],
        current_battery_percent=data['current_battery'],
        target_battery_percent=data['target_battery'],
        battery_capacity_kwh=data.get('battery_capacity', 60.0), # Default 60kWh
        departure_time=datetime.fromisoformat(data['departure_time'].replace('Z', '+00:00')),
        priority_level=data['priority'],
        required_kwh=0, # Calculated in scheduler, but model needs value. Update later or calculate here.
        estimated_duration_minutes=0
    )
    
    # Pre-calculate for DB record (simplified)
    req.required_kwh = (req.target_battery_percent - req.current_battery_percent) / 100.0 * req.battery_capacity_kwh
    req.estimated_duration_minutes = (req.required_kwh / 7.2) * 60
    
    db.session.add(req)
    db.session.commit()
    
    # Run Scheduler
    try:
        allocation = scheduler.schedule_request(req)
        db.session.add(allocation)
        req.status = 'scheduled'
        db.session.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    # Generate Insight
    insight = InsightsGenerator.generate_insight(req, allocation)
    
    return jsonify({
        'status': 'scheduled',
        'schedule': {
            'startTime': allocation.allocated_start_time.strftime('%H:%M'),
            'endTime': allocation.allocated_end_time.strftime('%H:%M'),
            'duration': f"{(allocation.allocated_end_time - allocation.allocated_start_time).seconds // 3600}h {((allocation.allocated_end_time - allocation.allocated_start_time).seconds // 60) % 60}m",
            'cost': f"${allocation.estimated_cost}",
            'savings': f"${allocation.cost_without_optimization - allocation.estimated_cost:.2f}",
            'load': 'Optimized' if allocation.peak_optimized else 'Standard',
            'carbonReduced': f"{allocation.carbon_savings_kg} kg CO₂",
            'isOffPeak': allocation.peak_optimized
        },
        'insight': insight
    })

@api.route('/grid/status', methods=['GET'])
def get_grid_status():
    # Mock Real-time status
    now = datetime.utcnow()
    base_load = grid_manager.get_base_load(now)
    # Simulate some random variance
    import random
    ev_load = random.uniform(10, 30) 
    total = base_load + ev_load
    stress = grid_manager.calculate_stress_level(total)
    
    return jsonify({
        'timestamp': now.isoformat(),
        'base_load_kw': base_load,
        'ev_load_kw': ev_load,
        'total_load_kw': total,
        'stress_level': stress,
        'capacity_percent': (total / 100.0) * 100
    })
