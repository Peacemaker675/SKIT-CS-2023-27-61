from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room

frontend_origin = "http://localhost:3000"

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
cors = CORS(origins=[frontend_origin], supports_credentials=True)
socketio = SocketIO(cors_allowed_origins=frontend_origin)


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
