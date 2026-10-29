import datetime
import json
import math
import os
import random
import threading
import time
from flask import Flask, jsonify, request
import redis

app = Flask(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASS = os.getenv("REDIS_PASS", None)
INTERSECTION_MODE = os.getenv("INTERSECTION_ID", "all")
TICK_INTERVAL_SECONDS = float(os.getenv("TICK_INTERVAL_SECONDS", "3.0"))

LANES = ["N", "E", "S", "W"]

# In-memory tracking of active phases
current_phase_state = {}


def get_redis_client():
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASS or None,
        decode_responses=True,
    )


def load_intersection_ids():
    """Loads intersection IDs from shared config or falls back to standard IDs."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "../shared/configs/intersections.json"),
        os.path.join(os.getcwd(), "shared/configs/intersections.json"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return [item["id"] for item in data if "id" in item]
            except Exception as e:
                print(f"[INTERSECTION] Error reading config from {p}: {e}")

    return [f"INT_{i:03d}" for i in range(1, 11)]


ALL_INTERSECTIONS = load_intersection_ids()
SIMULATED_INTERSECTIONS = (
    ALL_INTERSECTIONS
    if INTERSECTION_MODE.lower() == "all"
    else [INTERSECTION_MODE]
)

for i_id in SIMULATED_INTERSECTIONS:
    current_phase_state[i_id] = "N_GREEN"


def get_vision_data(intersection_id, tick=0):
    """
    Perception module placeholder (vision model currently not connected).
    Generates realistic per-lane telemetry matching shared/schemas/intersection_state.schema.json.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    offset = hash(intersection_id) % 10

    # Sine-wave traffic load variation
    load = (math.sin(((tick + offset) / 20.0) * 2 * math.pi) + 1.0) / 2.0

    vehicle_counts = {}
    queue_lengths = {}
    avg_wait_times = {}

    for idx, lane in enumerate(LANES):
        lane_load = min(1.0, max(0.05, load * (0.7 + idx * 0.1) + random.uniform(-0.05, 0.05)))
        vehicle_counts[lane] = int(round(2 + lane_load * 28))
        queue_lengths[lane] = round(lane_load * 38.0, 1)
        avg_wait_times[lane] = round(5.0 + lane_load * 55.0, 1)

    max_queue = max(queue_lengths.values()) if queue_lengths else 0.0
    occupancy = round(min(1.0, load), 2)
    phase = current_phase_state.get(intersection_id, "N_GREEN")

    return {
        "timestamp": now.isoformat(),
        "vehicle_counts": vehicle_counts,
        "queue_lengths": queue_lengths,
        "avg_wait_times": avg_wait_times,
        "current_phase": phase,
        "max_queue_length": max_queue,
        "lane_occupancy": occupancy,
    }


def change_traffic_light(intersection_id, new_phase):
    """
    Actuator stub for updating signal hardware / physical controllers.
    Currently an empty function as physical hardware is not connected yet.
    """
    current_phase_state[intersection_id] = new_phase
    print(f"[INTERSECTION:{intersection_id}] Light changed to phase: {new_phase}")


def telemetry_publisher_worker():
    """Background publisher that generates perception data and pushes to Redis."""
    print(f"[INTERSECTION] Starting telemetry publisher for {SIMULATED_INTERSECTIONS}...")
    tick = 0
    while True:
        try:
            r = get_redis_client()
            for intersection_id in SIMULATED_INTERSECTIONS:
                data = get_vision_data(intersection_id, tick)

                # Format data for Redis hash
                clean_data = {
                    k: (
                        json.dumps(v)
                        if isinstance(v, (dict, list))
                        else ("true" if v is True else "false" if v is False else str(v))
                    )
                    for k, v in data.items()
                }

                # Store latest state in Redis hash
                r.hset(f"intersection:{intersection_id}", mapping=clean_data)
                r.hset(intersection_id, mapping=clean_data)

                # Publish to pub-sub channels
                payload = json.dumps({"intersection_id": intersection_id, "data": data})
                r.publish(f"intersection:telemetry:{intersection_id}", payload)
                r.publish("traffic_updates", payload)

            tick += 1
            time.sleep(TICK_INTERVAL_SECONDS)
        except Exception as e:
            print(f"[INTERSECTION] Publisher error: {e}. Retrying in 2s...")
            time.sleep(2)


def signal_subscriber_worker():
    """Background subscriber listening for traffic light control decisions from Redis."""
    print("[INTERSECTION] Starting signal subscriber...")
    while True:
        try:
            r = get_redis_client()
            pubsub = r.pubsub()

            # Subscribe to signals for all simulated intersections
            channels = [f"intersection:signals:{i_id}" for i_id in SIMULATED_INTERSECTIONS]
            channels.append("intersection:signals:all")
            pubsub.subscribe(*channels)
            print(f"[INTERSECTION] Subscribed to signal channels: {channels}")

            for message in pubsub.listen():
                if message and message.get("type") == "message":
                    try:
                        data = json.loads(message["data"])
                        intersection_id = data.get("intersection_id")
                        new_phase = data.get("phase")

                        if intersection_id and new_phase:
                            change_traffic_light(intersection_id, new_phase)
                    except Exception as e:
                        print(f"[INTERSECTION] Error parsing signal message: {e}")
        except Exception as e:
            print(f"[INTERSECTION] Subscriber error: {e}. Reconnecting in 3s...")
            time.sleep(3)


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "service": "intersection",
            "status": "ok",
            "simulated_intersections": SIMULATED_INTERSECTIONS,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
    ), 200


@app.route("/status", methods=["GET"])
def status():
    return jsonify(
        {
            "intersections": SIMULATED_INTERSECTIONS,
            "current_phases": current_phase_state,
        }
    ), 200


@app.route("/light", methods=["POST"])
def manual_light_change():
    data = request.get_json() or {}
    intersection_id = data.get("intersection_id")
    phase = data.get("phase")
    if not intersection_id or not phase:
        return jsonify({"code": "INVALID_PARAMS", "message": "intersection_id and phase are required"}), 400

    change_traffic_light(intersection_id, phase)
    return jsonify({"code": "LIGHT_CHANGED", "intersection_id": intersection_id, "phase": phase}), 200


def start_background_threads():
    pub_thread = threading.Thread(target=telemetry_publisher_worker, daemon=True)
    pub_thread.start()

    sub_thread = threading.Thread(target=signal_subscriber_worker, daemon=True)
    sub_thread.start()


if __name__ == "__main__" or os.getenv("RUN_WORKER", "false").lower() == "true":
    start_background_threads()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5002"))
    print(f"[INTERSECTION] Starting Flask intersection service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
