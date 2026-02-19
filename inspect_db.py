import sqlite3
import os
from datetime import datetime

# 1. Inspect DB
db_path = os.path.join(os.path.dirname(__file__), 'backend', 'gridwise.db')
print(f"Checking database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(charging_allocations)")
    columns = [info[1] for info in cursor.fetchall()]
    print(f"Columns in charging_allocations: {columns}")
    
    if 'charger_power_kw' in columns:
        print("SUCCESS: charger_power_kw exists.")
    elif 'power_allocated_kw' in columns:
        print("WARNING: power_allocated_kw exists instead.")
    else:
        print("ERROR: Neither column exists.")
    conn.close()
except Exception as e:
    print(f"DB Error: {e}")

# 2. Test Date Parsing
try:
    date_str = "2026-02-18T20:15:00.000Z"
    dt = datetime.fromisoformat(date_str)
    print(f"Parsed 'Z' date successfully: {dt}")
except ValueError as e:
    print(f"Failed to parse 'Z' date: {e}")
    # Python < 3.11 doesn't support Z. Fix is replace Z with +00:00
    fixed_str = date_str.replace('Z', '+00:00')
    dt = datetime.fromisoformat(fixed_str)
    print(f"Parsed fixed date successfully: {dt}")
