import unittest
import json
import os
os.environ['FLASK_ENV'] = 'testing' # Set before importing app

from datetime import datetime, timedelta
from app import app, db
from database.models import ChargingRequest

class BackendTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        with app.app_context():
            db.create_all()

    def test_schedule_request(self):
        payload = {
            "vehicle_id": "EV-123",
            "current_battery": 20,
            "target_battery": 80,
            "battery_capacity": 60,
            "departure_time": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
            "priority": "normal"
        }
        res = self.app.post('/api/schedule', json=payload)
        data = res.get_json()
        
        self.assertEqual(res.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('startTime', data['schedule'])
        self.assertIn('cost', data['schedule'])
        # Check if DB has record
        with app.app_context():
            req = ChargingRequest.query.first()
            self.assertIsNotNone(req)
            self.assertEqual(req.vehicle_id, "EV-123")

    def test_grid_status(self):
        res = self.app.get('/api/grid/status')
        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertIn('stress_level', data)

if __name__ == '__main__':
    unittest.main()
