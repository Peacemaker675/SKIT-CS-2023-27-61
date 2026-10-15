# server.py (Flask RL Model Server)
from flask import Flask
from flask_socketio import SocketIO, emit
import numpy as np

app = Flask(__name__)
# async_mode='eventlet' or 'gevent' is highly recommended for production performance
socketio = SocketIO(app, cors_allowed_origins="*")


class TrafficRLModel:
    def __init__(self):
        # Load your trained model here later (e.g., PyTorch/TensorFlow/SB3 model)
        pass

    def predict(self, state):
        # Placeholder for actual inference logic
        # Simulating returning an action space integer (e.g., 0: phase 1, 1: phase 2)
        return np.random.randint(0, 4)


model = TrafficRLModel()


@socketio.on("connect")
def handle_connect():
    print("[SERVER] Backend environment connected.")


@socketio.on("disconnect")
def handle_disconnect():
    print("[SERVER] Backend environment disconnected.")


@socketio.on("step_environment")
def handle_step(data):
    """
    Receives the current state (and optional reward) from the backend,
    passes it to the RL model, and emits the chosen action back.
    """
    intersection_id = data.get("intersection_id")
    state = data.get("state")

    # 1. Run inference
    action = model.predict(state)

    # 2. Push the action back through the socket immediately
    emit("execute_action", {"intersection_id": intersection_id, "action": int(action)})


if __name__ == "__main__":
    # Runs the WebSocket server on port 5000
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
