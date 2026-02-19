import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api"

def test_priority_pricing():
    print("\n--- Testing Priority Pricing ---")
    
    # Base Request Data
    base_payload = {
        "current_battery": 20,
        "target_battery": 80,
        "departure_time": (datetime.utcnow() + timedelta(hours=12)).isoformat() + "Z", # 12 hours from now
        "vehicle_id": "EV-PRICE-TEST",
        "charger_type": "AC" # 7.2kW
    }
    
    # 1. Normal Request
    print("Submitting Normal Request...")
    resp_normal = requests.post(f"{BASE_URL}/schedule", json={**base_payload, "priority": "normal"})
    if resp_normal.status_code != 200:
        print(f"Normal Request Failed: {resp_normal.text}")
        return
    data_normal = resp_normal.json()
    cost_normal = float(data_normal['schedule']['cost'].replace('₹', ''))
    print(f"Normal Cost: ₹{cost_normal}")
    
    # 2. Emergency Request
    print("Submitting Emergency Request...")
    resp_emergency = requests.post(f"{BASE_URL}/schedule", json={**base_payload, "priority": "emergency"})
    if resp_emergency.status_code != 200:
        print(f"Emergency Request Failed: {resp_emergency.text}")
        return
    data_emergency = resp_emergency.json()
    cost_emergency = float(data_emergency['schedule']['cost'].replace('₹', ''))
    print(f"Emergency Cost: ₹{cost_emergency}")

    # 3. Flexible Request
    print("Submitting Flexible Request...")
    resp_flexible = requests.post(f"{BASE_URL}/schedule", json={**base_payload, "priority": "flexible"})
    if resp_flexible.status_code != 200:
        print(f"Flexible Request Failed: {resp_flexible.text}")
        return
    data_flexible = resp_flexible.json()
    cost_flexible = float(data_flexible['schedule']['cost'].replace('₹', ''))
    print(f"Flexible Cost: ₹{cost_flexible}")
    
    # Verification
    ratio_emergency = cost_emergency / cost_normal
    ratio_flexible = cost_flexible / cost_normal
    
    print(f"Emergency/Normal: {ratio_emergency:.2f}")
    print(f"Flexible/Normal: {ratio_flexible:.2f}")
    
    if 1.4 <= ratio_emergency <= 1.6 and 0.8 <= ratio_flexible <= 1.0:
        print("PRICING VERIFICATION: SUCCESS")
    else:
        print("PRICING VERIFICATION: FAILURE")

def test_timezone_format():
    payload = {
        "current_battery": 50,
        "target_battery": 60,
        "departure_time": (datetime.utcnow() + timedelta(hours=5)).isoformat() + "Z",
        "vehicle_id": "EV-TIME-TEST",
        "charger_type": "AC",
        "priority": "normal"
    }
    
    resp = requests.post(f"{BASE_URL}/schedule", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        start_time = data['schedule']['startTime']
        if 'T' in start_time:
             print("TIMEZONE VERIFICATION: SUCCESS (ISO Format)")
        else:
             print(f"TIMEZONE VERIFICATION: FAILURE ({start_time})")
    else:
        print(f"Request Failed: {resp.text}")

if __name__ == "__main__":
    try:
        test_priority_pricing()
        test_timezone_format()
    except Exception as e:
        print(f"Test Execution Error: {e}")
