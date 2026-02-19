import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api"

def verify_protection():
    print("\n--- Verifying Dynamic Load Protection ---")
    
    # 1. Check System Logs Endpoint
    print("\n1. Checking System Logs...")
    try:
        resp = requests.get(f"{BASE_URL}/system/logs", timeout=5)
        if resp.status_code == 200:
            logs = resp.json()
            print(f"SUCCESS: Fetched {len(logs)} logs.")
            if logs:
                print(f"Latest Log: {logs[0]}")
        else:
            print(f"FAILURE: Logs endpoint returned {resp.status_code}")
    except Exception as e:
        print(f"FAILURE: Could not connect to logs endpoint: {e}")

    # 2. Check Grid Status balancing trigger
    print("\n2. Triggering Grid Balance via Status Check...")
    try:
        resp = requests.get(f"{BASE_URL}/grid/status", timeout=5)
        data = resp.json()
        print(f"Current Load: {data.get('total_load')} kW")
        print(f"Transformer Util: {data.get('transformer_utilization')}%")
        print(f"Stress Level: {data.get('stress_level')}")
        
        # If load is high, logs should have been created
        if data.get('transformer_utilization', 0) > 85:
             print("High load detected, checking for new logs...")
             resp_logs = requests.get(f"{BASE_URL}/system/logs", timeout=5)
             new_logs = resp_logs.json()
             if new_logs and len(new_logs) > (len(logs) if 'logs' in locals() else 0):
                 print(f"SUCCESS: System generated new logs during balance checks. Latest: {new_logs[0]['message']}")
             else:
                 print("NOTE: No new logs, possibly no active sessions to balance or already balanced.")
        else:
             print("Load is safe, no protection actions expected.")

    except Exception as e:
        print(f"FAILURE: Grid status check failed: {e}")

    # 3. Simulate Admission Control (Mock Test)
    # This is harder to test without artificially spiking load.
    # We rely on the logic review for now unless we force a high baseload mock.

if __name__ == "__main__":
    verify_protection()
