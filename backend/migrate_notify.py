"""One-off migration: add phone_number and sms_notified to charging_requests."""
import sqlite3, os

db_path = os.path.join(os.path.dirname(__file__), 'gridwise.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get existing columns
cur.execute("PRAGMA table_info(charging_requests)")
existing = {row[1] for row in cur.fetchall()}

added = []
if 'phone_number' not in existing:
    cur.execute("ALTER TABLE charging_requests ADD COLUMN phone_number TEXT")
    added.append('phone_number')
if 'sms_notified' not in existing:
    cur.execute("ALTER TABLE charging_requests ADD COLUMN sms_notified TEXT DEFAULT ''")
    added.append('sms_notified')

conn.commit()
conn.close()

if added:
    print(f"✅ Added columns: {', '.join(added)}")
else:
    print("✅ Columns already exist — nothing to do.")
