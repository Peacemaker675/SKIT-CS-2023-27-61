import os
from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, decode_token
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room

frontend_origin = "http://localhost:3000"

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
cors = CORS(origins=[frontend_origin], supports_credentials=True)
socketio = SocketIO(cors_allowed_origins=frontend_origin)


@socketio.on("connect")
def handle_connect(auth=None):
    """
    Authenticates Socket.IO connections.
    Checks JWT in access_token_cookie (sent via withCredentials: true),
    or auth payload { token: ... }, or Authorization header.
    """
    token = request.cookies.get("access_token_cookie")
    if not token and auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    auth_required = os.getenv("SOCKETIO_AUTH_REQUIRED", "false" if os.getenv("FLASK_ENV") == "development" else "true").lower() == "true"
    if not token:
        if auth_required:
            print("[SOCKETIO] Connect rejected: Missing authentication token.")
            return False
        return True

    try:
        decoded = decode_token(token)
        print(f"[SOCKETIO] Client authenticated: user_id={decoded.get('sub')}")
        return True
    except Exception as e:
        print(f"[SOCKETIO] Connect rejected: Invalid token ({e})")
        if auth_required:
            return False
        return True


@socketio.on("join_room")
def handle_join_room(data):
    room = data.get("intersection_id")
    print(f"Joining room: {room}")
    join_room(room)


@socketio.on("leave_room")
def handle_leave_room(data):
    room = data.get("intersection_id")
    print(f"Leaving room: {room}")
    leave_room(room)
