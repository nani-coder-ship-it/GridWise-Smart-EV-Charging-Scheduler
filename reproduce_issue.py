import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api"

def check_grid_status():
    try:
        print("Checking Grid Status...")
        resp = requests.get(f"{BASE_URL}/grid/status")
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Error checking grid status: {e}")

def schedule_request():

    try:
        print("\nSending Charging Request...")
        departure = datetime.utcnow() + timedelta(hours=10)
        payload = {
            "vehicle_id": "EV-TEST-STRING",
            "current_battery": "20",
            "target_battery": "80",
            "departure_time": departure.isoformat() + "Z", # Mimic frontend ISO string
            "priority": "normal"
        }
        print(f"Payload: {json.dumps(payload, indent=2)}")
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        print(f"Status Code: {resp.status_code}")
        
        if resp.status_code == 200:
            print(f"Response: {json.dumps(resp.json(), indent=2)}")
        else:
            print(f"Error Response Text: {resp.text}")
            
    except Exception as e:
        print(f"Error scheduling request: {e}")

def get_active_schedule():
    try:
        print("\nFetching Active Schedule...")
        resp = requests.get(f"{BASE_URL}/active-schedule")
        data = resp.json()
        print(f"Count: {len(data)}")
        for s in data:
            # Calculate savings if possible or just print cost
            print(f"- {s['vehicle_id']} | {s['start_time']}-{s['end_time']} | Priority: {s['priority']} | Cost: ₹{s['cost_inr']}")
    except Exception as e:
        print(f"Error: {e}")

def test_dc_charging():
    print("\nTesting DC Fast Charging Request...")
    payload = {
        "current_battery": 20,
        "target_battery": 80,
        "departure_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), # 1 hour
        "priority": "emergency",
        "charger_type": "DC"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        if resp.status_code == 200:
            print("!!! SUCCESS: DC Request Scheduled Successfully! !!!")
            data = resp.json()
            print(f"Allocated: {data['schedule']['start']} - {data['schedule']['end']}")
        else:
            print(f"!!! FAILURE: Status {resp.status_code} !!!")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

def check_grid_status():
    try:
        print("\nChecking Grid Status...")
        resp = requests.get(f"{BASE_URL}/grid/status")
        data = resp.json()
        print(f"Stress Level: {data.get('stress_level')}")
        print(f"AC Load: {data.get('ac_load_kw')} kW")
        print(f"DC Load: {data.get('dc_load_kw')} kW")
        print(f"Transformers: {data.get('transformer_utilization')}%")
    except Exception as e:
        print(f"Error: {e}")

def get_grid_load_history():
    try:
        print("\nFetching Grid Load History...")
        resp = requests.get(f"{BASE_URL}/grid/load-history")
        data = resp.json()
        print(f"Status Code: {resp.status_code}")
        print(f"History Points: {len(data)}")
        if len(data) > 0:
            print(f"Sample Point: {data[0]}")
    except Exception as e:
        print(f"Error fetching load history: {e}")
        try:
            print(f"Response Text: {resp.text}")
        except:
            pass

if __name__ == "__main__":
    check_grid_status()
    schedule_request() 
    get_active_schedule()
    get_grid_load_history()
