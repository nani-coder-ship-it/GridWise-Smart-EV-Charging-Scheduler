import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'gridwise.db')
print(f"Migrating database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add columns safely (ignore if exist)
    try:
        cursor.execute("ALTER TABLE charging_requests ADD COLUMN charger_type TEXT DEFAULT 'AC'")
        print("Added charger_type to charging_requests")
    except sqlite3.OperationalError as e:
        print(f"Skipped charging_requests (already exists?): {e}")

    try:
        cursor.execute("ALTER TABLE charging_allocations ADD COLUMN charger_type TEXT DEFAULT 'AC'")
        print("Added charger_type to charging_allocations")
    except sqlite3.OperationalError as e:
        print(f"Skipped charging_allocations (charger_type): {e}")

    try:
        cursor.execute("ALTER TABLE charging_allocations ADD COLUMN status TEXT DEFAULT 'Scheduled'")
        print("Added status to charging_allocations")
    except sqlite3.OperationalError as e:
        print(f"Skipped charging_allocations (status): {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")
except Exception as e:
    print(f"Migration failed: {e}")
