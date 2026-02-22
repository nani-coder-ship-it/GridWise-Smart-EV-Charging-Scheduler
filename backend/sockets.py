"""
sockets.py — Flask-SocketIO instance shared across the app.
Import `socketio` from here in routes.py and app.py.
"""
from flask_socketio import SocketIO

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading",   # works with Flask dev server & threading
    logger=False,
    engineio_logger=False,
)
