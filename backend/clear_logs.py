from app import app
from database.db import db
from database.models import SystemLog

with app.app_context():
    try:
        deleted = db.session.query(SystemLog).delete()
        db.session.commit()
        print(f"Cleared {deleted} logs.")
    except Exception as e:
        print(f"Failed: {e}")
