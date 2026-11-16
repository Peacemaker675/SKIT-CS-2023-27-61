import datetime
import json
import os
import threading
import time
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import numpy as np
import redis

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASS = os.getenv("REDIS_PASS", None)

ACTION_TO_PHASE = {
    0: "N_GREEN",
    1: "E_GREEN",
    2: "S_GREEN",
    3: "W_GREEN",
}


class TrafficRLModel:
    def __init__(self):
        self.sb3_model = None
        self.model_loaded = False
        self._load_model()

    def _load_model(self):
        # Look for best_model.zip in standard model directories
        candidates = [
            os.path.join(os.path.dirname(__file__), "../../models/best_model.zip"),
            os.path.join(os.getcwd(), "models/best_model.zip"),
            os.path.join(os.getcwd(), "rl_agent/models/best_model.zip"),
        ]
        model_path = next((p for p in candidates if os.path.exists(p)), None)

        if model_path:
            try:
                from stable_baselines3 import PPO

                self.sb3_model = PPO.load(model_path)
                self.model_loaded = True
                print(f"[RL_AGENT] Successfully loaded Stable-Baselines3 model from {model_path}")
            except Exception as e:
                print(f"[RL_AGENT] Notice: SB3 model loading skipped ({e}). Using intelligent heuristic inference.")
        else:
            print("[RL_AGENT] No model file found. Using intelligent heuristic inference.")

    def predict(self, state):
        """
        Accepts a 4-dimensional state vector (or dict/list):
        [count_north, count_east, count_south, count_west]
        Returns discrete action (0: N_GREEN, 1: E_GREEN, 2: S_GREEN, 3: W_GREEN).
        """
        if isinstance(state, dict):
            # Support both {"N": x, "E": y, "S": z, "W": w} and full lane names
            n = float(state.get("N", state.get("north", 0.0)))
            e = float(state.get("E", state.get("east", 0.0)))
            s = float(state.get("S", state.get("south", 0.0)))
            w = float(state.get("W", state.get("west", 0.0)))
            arr = np.array([n, e, s, w], dtype=np.float32)
        elif isinstance(state, (list, tuple, np.ndarray)):
            arr = np.array(state, dtype=np.float32).flatten()
            if len(arr) < 4:
                arr = np.pad(arr, (0, 4 - len(arr)), "constant")
            elif len(arr) > 4:
                arr = arr[:4]
        else:
            return 0

        # Clip values to [0, 60] matching environment observation space bounds
        arr = np.clip(arr, 0.0, 60.0)

        if self.sb3_model is not None:
            try:
                action, _ = self.sb3_model.predict(arr, deterministic=True)
                return int(action)
            except Exception as e:
                print(f"[RL_AGENT] SB3 inference error: {e}. Falling back to heuristic.")

        # Heuristic fallback: select lane with maximum vehicle count
        # 0: North, 1: East, 2: South, 3: West
        best_action = int(np.argmax(arr))
        return best_action


model = TrafficRLModel()


def get_redis_client():
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASS or None,
        decode_responses=True,
    )


def rl_pubsub_worker():
    """Background worker listening for 5-intersection inference requests from Backend."""
    print(f"[RL_AGENT] Starting Redis Pub/Sub worker connected to {REDIS_HOST}:{REDIS_PORT}...")
    while True:
        try:
            r = get_redis_client()
            pubsub = r.pubsub()
            pubsub.subscribe("rl:requests")
            print("[RL_AGENT] Subscribed to channel 'rl:requests'")

            for message in pubsub.listen():
                if message and message.get("type") == "message":
                    try:
                        data = json.loads(message["data"])
                        intersection_id = data.get("intersection_id", "UNKNOWN")
                        state = data.get("state", [])

                        action = model.predict(state)
                        phase = ACTION_TO_PHASE.get(action, "N_GREEN")

                        decision = {
                            "intersection_id": intersection_id,
                            "action": int(action),
                            "phase": phase,
                            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        }

                        # Publish decision back to Redis
                        r.publish("rl:decisions", json.dumps(decision))
                        # Also publish to specific intersection signal channel
                        r.publish(f"intersection:signals:{intersection_id}", json.dumps(decision))
                        print(f"[RL_AGENT] Processed {intersection_id} -> Action {action} ({phase})")
                    except Exception as e:
                        print(f"[RL_AGENT] Error processing inference request: {e}")
        except Exception as e:
            print(f"[RL_AGENT] Redis worker error: {e}. Reconnecting in 3s...")
            time.sleep(3)


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "service": "rl_agent",
            "status": "ok",
            "model_loaded": model.model_loaded,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    ), 200


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    intersection_id = data.get("intersection_id", "UNKNOWN")
    state = data.get("state", [])

    action = model.predict(state)
    phase = ACTION_TO_PHASE.get(action, "N_GREEN")

    return jsonify(
        {
            "intersection_id": intersection_id,
            "action": int(action),
            "phase": phase,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    ), 200


@socketio.on("connect")
def handle_connect():
    print("[RL_AGENT] WebSocket client connected.")


@socketio.on("disconnect")
def handle_disconnect():
    print("[RL_AGENT] WebSocket client disconnected.")


@socketio.on("step_environment")
def handle_step(data):
    intersection_id = data.get("intersection_id")
    state = data.get("state")
    action = model.predict(state)
    phase = ACTION_TO_PHASE.get(action, "N_GREEN")
    emit(
        "execute_action",
        {
            "intersection_id": intersection_id,
            "action": int(action),
            "phase": phase,
        },
    )


def start_background_threads():
    t = threading.Thread(target=rl_pubsub_worker, daemon=True)
    t.start()


if __name__ == "__main__" or os.getenv("RUN_WORKER", "false").lower() == "true":
    start_background_threads()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    print(f"[RL_AGENT] Starting server on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
