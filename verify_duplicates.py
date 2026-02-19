import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api"

def schedule_request(vehicle_id, priority):
    print(f"\nSending Charging Request for {vehicle_id} ({priority})...")
    departure = datetime.utcnow() + timedelta(hours=5)
    payload = {
        "vehicle_id": vehicle_id,
        "current_battery": "20",
        "target_battery": "80",
        "departure_time": departure.isoformat() + "Z",
        "priority": priority
    }
    resp = requests.post(f"{BASE_URL}/schedule", json=payload)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("Success")
    else:
        print(f"Error: {resp.text}")

def check_active_schedule(vehicle_id):
    print(f"\nChecking Active Schedule for {vehicle_id}...")
    resp = requests.get(f"{BASE_URL}/active-schedule")
    data = resp.json()
    
    count = 0
    for s in data:
        if s['vehicle_id'] == vehicle_id:
            count += 1
            print(f"- Found: {s['vehicle_id']} | Slot: {s['start_time']}-{s['end_time']} | Priority: {s['priority']}")
            
    if count == 1:
        print("PASS: Single active schedule found.")
    elif count == 0:
        print("FAIL: No schedule found.")
    else:
        print(f"FAIL: {count} schedules found (Duplicate detected).")

if __name__ == "__main__":
    vid = "EV-DUPLICATE-TEST"
    
    # 1. First Request
    schedule_request(vid, "normal")
    
    # 2. Second Request (Should overwrite)
    schedule_request(vid, "emergency")
    
    # 3. Verify
    check_active_schedule(vid)
