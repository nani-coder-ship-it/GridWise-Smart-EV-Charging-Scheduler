from datetime import datetime
from database.db import db

class ChargingRequest(db.Model):
    __tablename__ = 'charging_requests'
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.String(50), nullable=False)
    current_battery_percent = db.Column(db.Float, nullable=False)
    target_battery_percent = db.Column(db.Float, nullable=False)
    battery_capacity_kwh = db.Column(db.Float, nullable=False)
    departure_time = db.Column(db.DateTime, nullable=False)
    priority_level = db.Column(db.String(20), nullable=False)  # 'emergency', 'normal', 'flexible'
    required_kwh = db.Column(db.Float, nullable=False)
    estimated_duration_minutes = db.Column(db.Float, nullable=False)
    fairness_score = db.Column(db.Float, default=1.0)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'scheduled', 'completed'

    def to_dict(self):
        return {
            'id': self.id,
            'vehicle_id': self.vehicle_id,
            'current_battery': self.current_battery_percent,
            'target_battery': self.target_battery_percent,
            'departure_time': self.departure_time.isoformat(),
            'priority': self.priority_level,
            'status': self.status
        }

class ChargingAllocation(db.Model):
    __tablename__ = 'charging_allocations'
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('charging_requests.id'), nullable=False)
    allocated_start_time = db.Column(db.DateTime, nullable=False)
    allocated_end_time = db.Column(db.DateTime, nullable=False)
    charger_power_kw = db.Column(db.Float, nullable=False)
    estimated_cost = db.Column(db.Float, nullable=False)
    cost_without_optimization = db.Column(db.Float, nullable=False)
    peak_optimized = db.Column(db.Boolean, default=False)
    carbon_savings_kg = db.Column(db.Float, default=0.0)

    request = db.relationship('ChargingRequest', backref=db.backref('allocation', uselist=False))

class GridStatus(db.Model):
    __tablename__ = 'grid_status'
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    base_load_kw = db.Column(db.Float, nullable=False)
    ev_load_kw = db.Column(db.Float, nullable=False)
    total_load_kw = db.Column(db.Float, nullable=False)
    transformer_capacity_kw = db.Column(db.Float, nullable=False)
    stress_level = db.Column(db.String(20), nullable=False)  # 'Stable', 'Moderate', 'Critical'
