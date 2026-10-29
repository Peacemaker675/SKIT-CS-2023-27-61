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
        Accepts a 10-dimensional state vector:
        [count_center, queue_center, count_n, queue_n, count_e, queue_e, count_w, queue_w, count_s, queue_s]
        Returns discrete action (0: N_GREEN, 1: E_GREEN, 2: S_GREEN, 3: W_GREEN).
        """
        if not isinstance(state, (list, tuple, np.ndarray)):
            return 0

        arr = np.array(state, dtype=np.float32).flatten()
        # Ensure 10-dimensional Box observation space
        if len(arr) < 10:
            arr = np.pad(arr, (0, 10 - len(arr)), "constant")
        elif len(arr) > 10:
            arr = arr[:10]

        # Clip values to [0, 50] matching model observation space bounds
        arr = np.clip(arr, 0.0, 50.0)

        if self.sb3_model is not None:
            try:
                action, _ = self.sb3_model.predict(arr, deterministic=True)
                return int(action)
            except Exception as e:
                print(f"[RL_AGENT] SB3 inference error: {e}. Falling back to heuristic.")

        # Intelligent demand-responsive fallback:
        # Lanes: N (index 2-3), E (index 4-5), W (index 6-7), S (index 8-9)
        lane_demands = [
            arr[3] * 1.5 + arr[2],  # North: queue * 1.5 + vehicle count
            arr[5] * 1.5 + arr[4],  # East
            arr[9] * 1.5 + arr[8],  # South
            arr[7] * 1.5 + arr[6],  # West
        ]
        best_action = int(np.argmax(lane_demands))
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


start_background_threads()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    print(f"[RL_AGENT] Starting server on port {port}...")
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
