import json
import os
from flask import current_app, request, jsonify
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity
from app.blueprints.intersections import intersections
from app.influx_models import TrafficPoint
from app.blueprints.intersections.helpers import write_traffic_point
from app.extensions import socketio


def deserialize_redis_state(raw_hash):
    """Parses Redis hash strings back into typed values and JSON structures."""
    state = {}
    for k, v in raw_hash.items():
        if isinstance(v, str):
            try:
                state[k] = json.loads(v)
            except Exception:
                if v == "true":
                    state[k] = True
                elif v == "false":
                    state[k] = False
                else:
                    try:
                        state[k] = int(v) if "." not in v else float(v)
                    except ValueError:
                        state[k] = v
        else:
            state[k] = v
    return state


def _authenticate_ingest_request():
    """
    Validates that the ingest request comes from an authorized source:
    Either a valid JWT (operator/admin) or a matching edge API key.
    """
    # 1. Check API Key header
    api_key = request.headers.get("X-API-KEY")
    if not api_key:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            api_key = auth_header.split(" ", 1)[1].strip()

    expected_key = current_app.config.get("INGEST_API_KEY", "intelliroute-edge-secret")
    if api_key and api_key == expected_key:
        return True, "API_KEY"

    # 2. Check JWT in cookies or headers
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return True, f"JWT:{identity}"
    except Exception:
        pass

    # In dev mode if explicitly configured, allow unauthenticated
    if os.getenv("INGEST_AUTH_REQUIRED", "true").lower() == "false":
        return True, "DEV_OVERRIDE"

    return False, None


def _validate_telemetry_payload(intersection_id, data):
    """
    Validates telemetry payload BEFORE writing to Redis or InfluxDB.
    Returns (valid: bool, error_message: str, traffic_point: TrafficPoint).
    """
    if not isinstance(data, dict):
        return False, "Payload must be a JSON object", None

    # Validate per-lane counts if present
    if "vehicle_counts" in data:
        vc = data["vehicle_counts"]
        if not isinstance(vc, dict):
            return False, "'vehicle_counts' must be a dictionary keyed by lane", None
        for lane, cnt in vc.items():
            if not isinstance(cnt, (int, float)) or cnt < 0:
                return False, f"Invalid vehicle count for lane '{lane}': must be non-negative number", None
    elif "vehicle_count" in data:
        vc = data["vehicle_count"]
        if not isinstance(vc, (int, float)) or vc < 0:
            return False, "'vehicle_count' must be a non-negative number", None
    else:
        return False, "Payload must include either 'vehicle_counts' or 'vehicle_count'", None

    if "queue_lengths" in data and isinstance(data["queue_lengths"], dict):
        for lane, q in data["queue_lengths"].items():
            if not isinstance(q, (int, float)) or q < 0:
                return False, f"Invalid queue length for lane '{lane}': must be non-negative number", None

    if "avg_wait_times" in data and isinstance(data["avg_wait_times"], dict):
        for lane, w in data["avg_wait_times"].items():
            if not isinstance(w, (int, float)) or w < 0:
                return False, f"Invalid avg wait time for lane '{lane}': must be non-negative number", None

    try:
        traffic_point = TrafficPoint(intersection_id=intersection_id, **data)
        return True, None, traffic_point
    except Exception as e:
        return False, f"Model validation error: {str(e)}", None


@intersections.route("/latest", methods=["GET"])
@jwt_required(optional=True)
def get_latest():
    """Returns the latest cached state for requested intersection IDs."""
    ids_param = request.args.get("ids", "")
    id_list = [i.strip() for i in ids_param.split(",") if i.strip()]
    result = {}
    for i_id in id_list:
        raw = current_app.redis.hgetall(f"intersection:{i_id}") or current_app.redis.hgetall(i_id)
        if raw:
            result[i_id] = deserialize_redis_state(raw)
    return jsonify(result), 200


@intersections.route("/<intersection_id>", methods=["GET"])
@jwt_required(optional=True)
def get_intersection(intersection_id):
    raw = current_app.redis.hgetall(f"intersection:{intersection_id}") or current_app.redis.hgetall(intersection_id)
    if not raw:
        return (
            jsonify(
                {
                    "code": "INTERSECTION_NOT_FOUND",
                    "message": f"No telemetry found for intersection {intersection_id}",
                    "error": f"No telemetry found for intersection {intersection_id}",
                }
            ),
            404,
        )
    return jsonify(deserialize_redis_state(raw)), 200


@intersections.route("/<intersection_id>/data", methods=["POST"])
def put_data(intersection_id):
    if not intersection_id:
        return (
            jsonify(
                {
                    "code": "MISSING_INTERSECTION_ID",
                    "message": "Missing intersection_id in URL path",
                    "error": "Missing intersection_id",
                }
            ),
            400,
        )

    # 1. Authenticate request (API key or JWT)
    is_auth, auth_src = _authenticate_ingest_request()
    if not is_auth:
        return (
            jsonify(
                {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required. Provide a valid JWT or X-API-KEY header.",
                    "error": "Unauthorized",
                }
            ),
            401,
        )

    data = request.get_json()
    if not data:
        return (
            jsonify(
                {
                    "code": "MISSING_DATA",
                    "message": "No data payload provided",
                    "error": "No data provided",
                }
            ),
            400,
        )

    # 2. Validate payload BEFORE writing to Redis or InfluxDB
    valid, err_msg, traffic_point = _validate_telemetry_payload(intersection_id, data)
    if not valid:
        return (
            jsonify(
                {
                    "code": "INVALID_DATA",
                    "message": f"Telemetry validation failed: {err_msg}",
                    "error": "Validation error",
                }
            ),
            400,
        )

    # 3. Only write to Redis cache after successful validation
    clean_data = {
        k: (
            json.dumps(v)
            if isinstance(v, (dict, list))
            else ("true" if v is True else "false" if v is False else str(v))
        )
        for k, v in data.items()
    }

    current_app.redis.hset(f"intersection:{intersection_id}", mapping=clean_data)
    current_app.redis.hset(intersection_id, mapping=clean_data)

    payload = {"intersection_id": intersection_id, "data": data}
    current_app.redis.publish("traffic_updates", json.dumps(payload))
    current_app.redis.publish(f"intersection:telemetry:{intersection_id}", json.dumps(payload))

    # 4. Persist to InfluxDB
    try:
        write_traffic_point(traffic_point)
    except Exception as e:
        current_app.logger.warning(
            f"Could not persist Influx point for intersection {intersection_id}: {e}"
        )

    return (
        jsonify(
            {
                "code": "TELEMETRY_RECORDED",
                "message": f"Data recorded for intersection {intersection_id}",
                "status": "success",
            }
        ),
        200,
    )


def redis_listener(app):
    with app.app_context():
        pubsub = app.redis.pubsub()
        pubsub.subscribe("traffic_updates")

        for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    intersection_id = data.get("intersection_id")
                    socketio.emit("traffic_update", data, room=intersection_id)
                except Exception as e:
                    print(f"Error handling redis message: {e}")
