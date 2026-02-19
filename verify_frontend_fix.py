import requests
import json
from datetime import datetime, timezone, timedelta
import random

BASE_URL = "http://localhost:5000/api"

def test_frontend_payload():
    print("\nTesting Exact Frontend Payload...")
    # This matches the structure in GridContext.jsx
    payload = {
        "vehicle_id": f"EV-{random.randint(100, 999)}",
        "current_battery": 25,
        "target_battery": 100,
        "departure_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "priority": "emergency",
        "charger_type": "DC"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        if resp.status_code == 200:
            print("Frontend Payload Accepted!")
            data = resp.json()
            print(f"Allocated: {data['schedule']['start']} - {data['schedule']['end']}")
        else:
            print(f"Failed Status: {resp.status_code}")
            try:
                err_data = resp.json()
                error_msg = f"ERROR DETAIL: {err_data.get('error')}\nMESSAGE: {err_data.get('message')}"
                print(error_msg)
                with open("error_verify.txt", "w") as f:
                    f.write(error_msg)
            except:
                print(f"Response (Not JSON): {resp.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

def check_grid_status():
    try:
        print("\nChecking Grid Status...")
        resp = requests.get(f"{BASE_URL}/grid/status")
        try:
            data = resp.json()
            print(f"Stress Level: {data.get('stress_level')}")
            print(f"AC Load: {data.get('ac_load_kw')} kW")
            print(f"DC Load: {data.get('dc_load_kw')} kW")
            print(f"Transformers: {data.get('transformer_utilization')}%")
        except:
             print(f"Grid Status Failed (Not JSON): {resp.status_code}")
             print(f"Response Snippet: {resp.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_grid_status()
    test_frontend_payload()
    check_grid_status()
