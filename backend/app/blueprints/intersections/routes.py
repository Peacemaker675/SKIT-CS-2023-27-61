import json
from flask import current_app, request, jsonify
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


@intersections.route("/latest", methods=["GET"])
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
    data = request.get_json()

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

    clean_data = {
        k: (
            json.dumps(v)
            if isinstance(v, (dict, list))
            else ("true" if v is True else "false" if v is False else str(v))
        )
        for k, v in data.items()
    }

    # Cache both prefixed and bare keys for backward compatibility
    current_app.redis.hset(f"intersection:{intersection_id}", mapping=clean_data)
    current_app.redis.hset(intersection_id, mapping=clean_data)

    payload = {"intersection_id": intersection_id, "data": data}
    current_app.redis.publish("traffic_updates", json.dumps(payload))
    current_app.redis.publish(f"intersection:telemetry:{intersection_id}", json.dumps(payload))

    try:
        traffic_point = TrafficPoint(intersection_id=intersection_id, **data)
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
