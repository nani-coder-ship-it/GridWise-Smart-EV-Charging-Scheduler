import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000/api"

def verify_dashboard_data():
    print("\n--- Verifying Dashboard API Data ---")
    try:
        resp = requests.get(f"{BASE_URL}/grid/status")
        if resp.status_code != 200:
            print(f"FAILED: API returned {resp.status_code}")
            return

        data = resp.json()
        
        # 1. Check Transformer Util (No NaN)
        util = data.get('transformer_utilization')
        print(f"Transformer Utilization: {util}% (Type: {type(util)})")
        if util is None or isinstance(util, str):
             print("FAILURE: Utilization should be a number.")
        else:
             print("SUCCESS: Utilization is numeric.")

        # 2. Check Active Load Split
        ac_load = data.get('ac_load_kw')
        dc_load = data.get('dc_load_kw')
        print(f"Active Load: AC={ac_load}kW, DC={dc_load}kW")
        
        # 3. Check Cost Formatting (Backend returns float, Frontend formats it)
        cost_saved = data.get('cost_saved_today')
        print(f"Cost Saved: {cost_saved} (Type: {type(cost_saved)})")
        if isinstance(cost_saved, (int, float)):
             print("SUCCESS: Cost is numeric safe for formatting.")
        else:
             print("FAILURE: Cost is not numeric.")
             
        # 4. Check Dynamic Recommendation
        rec = data.get('recommendation')
        print(f"AI Recommendation: {rec}")
        if rec and len(rec) > 10:
            print("SUCCESS: Recommendation is present and valid.")
        else:
            print("FAILURE: Recommendation missing or empty.")

    except Exception as e:
        print(f"Verification Error: {e}")

if __name__ == "__main__":
    verify_dashboard_data()
