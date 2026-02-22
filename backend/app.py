from flask import Flask
from flask_cors import CORS
from database.db import db
from api.routes import api
from sockets import socketio
import os
import threading
import time

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/socket.io/*": {"origins": "*"}})

# Configure SQLite
if os.environ.get('FLASK_ENV') == 'testing':
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
else:
    db_path = os.path.join(os.path.dirname(__file__), 'gridwise.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
socketio.init_app(app)

# Register Blueprints
app.register_blueprint(api, url_prefix='/api')


# ── Background Notification Worker ──────────────────────────────────────────
def _notification_worker():
    """
    Daemon thread — polls every 30 s.
    Fires WhatsApp/SMS for:
      Event 2 — Charging Started  (when start_time <= now < end_time)
      Event 3 — Charging Completed (when end_time <= now)
    Uses sms_notified column to prevent duplicates.
    """
    time.sleep(10)  # give Flask a moment to start

    from engine.sms_service import WhatsAppService
    from database.models import ChargingAllocation, ChargingRequest
    from datetime import datetime, timedelta

    IST = timedelta(hours=5, minutes=30)

    while True:
        try:
            with app.app_context():
                now = datetime.utcnow()

                # Check all scheduled requests
                reqs = ChargingRequest.query.filter(
                    ChargingRequest.status == 'scheduled',
                ).all()

                for req in reqs:
                    alloc = req.allocation
                    if not alloc:
                        continue

                    changed = False

                    # Status Transition: Scheduled -> Charging
                    if (alloc.status == 'Scheduled' 
                            and alloc.allocated_start_time <= now
                            and alloc.allocated_end_time > now):
                        alloc.status = 'Charging'
                        changed = True
                        print(f"[Worker] {req.vehicle_id} started charging.")

                    # Status Transition: Scheduled/Charging -> Completed
                    if (alloc.status in ['Scheduled', 'Charging'] 
                            and alloc.allocated_end_time <= now):
                        alloc.status = 'Completed'
                        req.status = 'completed'
                        changed = True
                        print(f"[Worker] {req.vehicle_id} completed charging.")

                    if changed:
                        db.session.commit()

        except Exception as exc:
            print(f'[Notify Worker] Error: {exc}')

        time.sleep(30)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print('Database initialized.')

    if os.environ.get('FLASK_ENV') != 'testing':
        t = threading.Thread(target=_notification_worker, daemon=True, name='notify-worker')
        t.start()
        print('[Notify] Background worker started (30s polling).')

    is_production = os.environ.get('RENDER') is not None
    socketio.run(app, host='0.0.0.0', debug=not is_production, port=5000, allow_unsafe_werkzeug=True)
