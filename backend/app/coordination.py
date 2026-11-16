import datetime
import json
import os
import time
from app.extensions import socketio

# Track last inference time per intersection to avoid excessive churn
_last_inference_time = {}
INFERENCE_COOLDOWN_SECONDS = 3.0


def load_topology():
    candidates = [
        os.path.abspath(
            os.path.join(os.path.dirname(__file__), "configs/topology.json")
        ),
        "/app/app/configs/topology.json",
        "/app/shared/configs/topology.json",
        os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../shared/configs/topology.json")
        ),
        os.path.abspath(
            os.path.join(os.getcwd(), "shared/configs/topology.json")
        ),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[COORDINATOR] Error reading topology {p}: {e}")
    return {}


TOPOLOGY = load_topology()


def get_5_intersection_window(center_id):
    """
    Returns list of 5 intersection IDs: [center, north, east, west, south].
    Falls back to center_id if any direction is unmapped.
    """
    mapping = TOPOLOGY.get(center_id, {})
    return [
        mapping.get("center", center_id),
        mapping.get("north", center_id),
        mapping.get("east", center_id),
        mapping.get("west", center_id),
        mapping.get("south", center_id),
    ]


def extract_4_lane_counts(redis_client, intersection_id, payload_data=None):
    """
    Extracts [North, East, South, West] vehicle counts for one intersection.
    Checks incoming payload first, then falls back to Redis hash.
    """
    counts = {"N": 0.0, "E": 0.0, "S": 0.0, "W": 0.0}

    # 1. Try payload data if provided
    raw_vc = None
    if isinstance(payload_data, dict):
        if "vehicle_counts" in payload_data:
            raw_vc = payload_data["vehicle_counts"]
        elif isinstance(payload_data.get("data"), dict) and "vehicle_counts" in payload_data["data"]:
            raw_vc = payload_data["data"]["vehicle_counts"]

    # 2. Try Redis hash if not in payload
    if raw_vc is None and redis_client:
        raw = redis_client.hgetall(f"intersection:{intersection_id}") or redis_client.hgetall(
            intersection_id
        )
        if raw and "vehicle_counts" in raw:
            try:
                raw_vc = json.loads(raw["vehicle_counts"])
            except Exception:
                pass
        elif raw and "vehicle_count" in raw:
            try:
                total = float(raw["vehicle_count"])
                return [total / 4.0] * 4
            except ValueError:
                pass

    if isinstance(raw_vc, dict):
        for k, v in raw_vc.items():
            if not isinstance(v, (int, float)):
                continue
            key_upper = str(k).strip().upper()
            if key_upper in ("N", "NORTH"):
                counts["N"] = float(v)
            elif key_upper in ("E", "EAST"):
                counts["E"] = float(v)
            elif key_upper in ("S", "SOUTH"):
                counts["S"] = float(v)
            elif key_upper in ("W", "WEST"):
                counts["W"] = float(v)
    elif isinstance(raw_vc, (list, tuple)) and len(raw_vc) >= 4:
        return [float(raw_vc[0]), float(raw_vc[1]), float(raw_vc[2]), float(raw_vc[3])]

    return [counts["N"], counts["E"], counts["S"], counts["W"]]


def extract_intersection_features(redis_client, intersection_id):
    """
    Extracts [vehicle_count, queue_length] for one intersection from Redis.
    """
    raw = redis_client.hgetall(f"intersection:{intersection_id}") or redis_client.hgetall(
        intersection_id
    )
    if not raw:
        return [0.0, 0.0]

    count = 0.0
    queue = 0.0

    # Parse per-lane vehicle counts if available
    if "vehicle_counts" in raw:
        try:
            vc = json.loads(raw["vehicle_counts"])
            if isinstance(vc, dict):
                count = float(sum(v for v in vc.values() if isinstance(v, (int, float))))
        except Exception:
            pass
    elif "vehicle_count" in raw:
        try:
            count = float(raw["vehicle_count"])
        except ValueError:
            pass

    # Parse per-lane queue lengths if available
    if "queue_lengths" in raw:
        try:
            ql = json.loads(raw["queue_lengths"])
            if isinstance(ql, dict):
                queue = float(
                    max(
                        (v for v in ql.values() if isinstance(v, (int, float))),
                        default=0.0,
                    )
                )
        except Exception:
            pass
    elif "max_queue_length" in raw:
        try:
            queue = float(raw["max_queue_length"])
        except ValueError:
            pass

    return [count, queue]


def build_5_intersection_state(redis_client, center_id):
    """
    Constructs a 10-float observation vector for RL from the 5 intersections:
    [count_c, queue_c, count_n, queue_n, count_e, queue_e, count_w, queue_w, count_s, queue_s].
    """
    window = get_5_intersection_window(center_id)
    state = []
    for node_id in window:
        feats = extract_intersection_features(redis_client, node_id)
        state.extend(feats)

    return state


def coordination_listener(app):
    """
    Unified Redis listener for:
    1. traffic_updates: forwards telemetry to SocketIO & triggers 5-intersection RL requests.
    2. rl:decisions: receives RL model decisions, updates Redis, forwards to intersection & emits SocketIO.
    """
    with app.app_context():
        print("[COORDINATOR] Starting Backend Redis Pub/Sub coordination listener...")
        while True:
            try:
                pubsub = app.redis.pubsub()
                pubsub.subscribe("traffic_updates", "rl:decisions")
                print("[COORDINATOR] Subscribed to 'traffic_updates' and 'rl:decisions'")

                for message in pubsub.listen():
                    if not message or message.get("type") != "message":
                        continue

                    channel = message.get("channel")
                    try:
                        data = json.loads(message["data"])
                    except Exception:
                        continue

                    if channel == "traffic_updates":
                        handle_telemetry_update(app, data)
                    elif channel == "rl:decisions":
                        handle_rl_decision(app, data)

            except Exception as e:
                print(
                    f"[COORDINATOR] Error in coordination listener: {e}. Reconnecting in 3s..."
                )
                time.sleep(3)


def handle_telemetry_update(app, payload):
    intersection_id = payload.get("intersection_id")
    if not intersection_id:
        return

    # 1. Forward telemetry to frontend subscribers in intersection room
    socketio.emit("traffic_update", payload, room=intersection_id)

    # Check for alerts to emit optional Socket.IO alert event
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    if isinstance(data, dict):
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        alerts = []

        # Heavy congestion check
        max_q = float(data.get("max_queue_length", 0.0))
        if max_q > 35.0:
            alerts.append({"type": "heavy", "message": "Congestion rose to Heavy"})

        # Special event check
        if data.get("has_special_event") is True:
            alerts.append({"type": "event", "message": "Special event reported"})

        # Manual control mode check
        ctrl = str(data.get("control_mode", "")).lower()
        phase_str = str(data.get("current_phase", "")).lower()
        if ctrl == "manual" or "manual" in phase_str:
            alerts.append({"type": "manual", "message": "Signal switched to manual"})

        for alt in alerts:
            alert_payload = {
                "type": alt["type"],
                "intersection_id": intersection_id,
                "message": alt["message"],
                "timestamp": now_iso,
            }
            socketio.emit("alert", alert_payload, room=intersection_id)
            socketio.emit("alert", alert_payload)

    # 2. Check cooldown to avoid flooding RL agent
    now = time.time()
    last = _last_inference_time.get(intersection_id, 0.0)
    if now - last < INFERENCE_COOLDOWN_SECONDS:
        return
    _last_inference_time[intersection_id] = now

    # 3. Gather 4-lane observation state [North, East, South, West]
    state_vector = extract_4_lane_counts(app.redis, intersection_id, payload_data=payload)

    # 4. Publish inference request to rl:requests
    rl_request = {
        "intersection_id": intersection_id,
        "state": state_vector,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    app.redis.publish("rl:requests", json.dumps(rl_request))


def handle_rl_decision(app, decision):
    intersection_id = decision.get("intersection_id")
    phase = decision.get("phase")
    action = decision.get("action")

    if not intersection_id or not phase:
        return

    # 1. Update active phase in Redis hash
    app.redis.hset(f"intersection:{intersection_id}", "current_phase", phase)
    app.redis.hset(intersection_id, "current_phase", phase)

    # 2. Push signal command to intersection microservice
    signal_command = {
        "intersection_id": intersection_id,
        "phase": phase,
        "action": action,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    app.redis.publish(
        f"intersection:signals:{intersection_id}", json.dumps(signal_command)
    )

    # 3. Emit updated phase to frontend via SocketIO with complete cached telemetry state
    raw = app.redis.hgetall(f"intersection:{intersection_id}") or app.redis.hgetall(
        intersection_id
    )
    if raw:
        from app.blueprints.intersections.routes import deserialize_redis_state

        state_data = deserialize_redis_state(raw)
        state_data["current_phase"] = phase
    else:
        state_data = {
            "current_phase": phase,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

    socketio.emit(
        "traffic_update",
        {
            "intersection_id": intersection_id,
            "data": state_data,
        },
        room=intersection_id,
    )
