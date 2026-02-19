import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from engine.scheduler import Scheduler
from database.models import ChargingRequest

def test_scheduler_crash():
    print("Testing Scheduler with Aware Datetime...")
    
    # Create an aware datetime (like routes.py does)
    departure = datetime.now(timezone.utc) + timedelta(hours=5)
    
    # Mock request object
    # We populate only fields used by scheduler/cost_optimizer
    req = ChargingRequest(
        vehicle_id="TEST-EV",
        current_battery_percent=20.0,
        target_battery_percent=80.0,
        battery_capacity_kwh=60.0,
        departure_time=departure, # Aware
        priority_level='normal',
        required_kwh=36.0,
        estimated_duration_minutes=300
    )
    # req.id is None, but that's fine for this test as long as DB not accessed
    # Scheduler uses req.id for allocation, so we might need to mock it or handle DB error
    # But the datetime crash happens BEFORE DB access in CostOptimizer
    req.id = 1 
    
    scheduler = Scheduler()
    
    try:
        allocation = scheduler.schedule_request(req)
        print("Success! Allocation created.")
    except TypeError as e:
        print(f"Caught expected TypeError: {e}")
    except Exception as e:
        print(f"Caught unexpected exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_scheduler_crash()
