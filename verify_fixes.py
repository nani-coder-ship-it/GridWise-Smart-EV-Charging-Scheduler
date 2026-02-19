import requests
import json
from datetime import datetime, timedelta
import time

BASE_URL = "http://localhost:5000/api"

def print_result(test_name, success, response, expected_status):
    status_icon = "✅" if success else "❌"
    print(f"{status_icon} {test_name}")
    print(f"   Expected: {expected_status}, Got: {response.status_code}")
    print(f"   Response: {response.text}\n")

def test_valid_request():
    print("--- Test 1: Valid Request ---")
    departure = datetime.utcnow() + timedelta(days=1)
    payload = {
        "vehicle_id": "EV-VERIFY-1",
        "current_battery": "20",
        "target_battery": "80",
        "departure_time": departure.isoformat() + "Z",
        "priority": "normal"
    }
    print(f"Payload: {json.dumps(payload, indent=2)}")
    try:
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        print_result("Valid Request", resp.status_code == 200, resp, 200)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def test_missing_field():
    print("--- Test 2: Missing Field ---")
    payload = {
        "vehicle_id": "EV-VERIFY-2",
        # Missing current_battery
        "target_battery": "80",
        "departure_time": (datetime.utcnow() + timedelta(hours=5)).isoformat() + "Z",
        "priority": "normal"
    }
    try:
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        print_result("Missing Field", resp.status_code == 400 and "Missing required fields" in resp.text, resp, 400)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def test_invalid_battery():
    print("--- Test 3: Invalid Battery Range ---")
    payload = {
        "vehicle_id": "EV-VERIFY-3",
        "current_battery": "150", # Invalid
        "target_battery": "80",
        "departure_time": (datetime.utcnow() + timedelta(hours=5)).isoformat() + "Z",
        "priority": "normal"
    }
    try:
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        print_result("Invalid Battery", resp.status_code == 400 and "Battery percentage must be" in resp.text, resp, 400)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def test_past_departure():
    print("--- Test 4: Past Departure Time ---")
    payload = {
        "vehicle_id": "EV-VERIFY-4",
        "current_battery": "20",
        "target_battery": "80",
        "departure_time": (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z", # Past
        "priority": "normal"
    }
    try:
        resp = requests.post(f"{BASE_URL}/schedule", json=payload)
        print_result("Past Departure", resp.status_code == 400 and "Departure time must be in the future" in resp.text, resp, 400)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    # Wait for server to start if running immediately
    time.sleep(2)
    test_valid_request()
    test_missing_field()
    test_invalid_battery()
    test_past_departure()
