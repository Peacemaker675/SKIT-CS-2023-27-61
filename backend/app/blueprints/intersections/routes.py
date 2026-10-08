from app.blueprints.intersections import intersections
from app.influx_models import TrafficPoint
import json
from flask import current_app, request, jsonify
from app.blueprints.intersections.helpers import write_traffic_point
from app.extensions import socketio


@intersections.route("<intersection_id>/data", methods=["POST"])
def put_data(intersection_id):
    data = request.get_json()

    if not intersection_id:
        return jsonify({"error": "Missing intersection_id"}), 400

    if not data:
        return jsonify({"error": "No data provided"}), 400

    clean_data = {
        k: (
            json.dumps(v)
            if isinstance(v, (dict, list))
            else ("true" if v is True else "false" if v is False else v)
        )
        for k, v in data.items()
    }

    current_app.redis.hset(intersection_id, mapping=clean_data)

    payload = {"intersection_id": intersection_id, "data": data}
    current_app.redis.publish("traffic_updates", json.dumps(payload))
    try:
        traffic_point = TrafficPoint(intersection_id=intersection_id, **data)
    except Exception as e:
        return jsonify({"error": "Invalid data", "details": str(e)}), 400
    write_traffic_point(traffic_point)
    return jsonify({"status": "success"}), 200


def redis_listener(app):
    with app.app_context():
        pubsub = app.redis.pubsub()
        pubsub.subscribe("traffic_updates")

        for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                intersection_id = data.get("intersection_id")
                socketio.emit("traffic_update", data, room=intersection_id)
                print(f"Emitted update to intersection {intersection_id}: {data}")
