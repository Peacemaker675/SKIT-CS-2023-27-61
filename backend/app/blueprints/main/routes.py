from . import main
from flask import current_app, jsonify
from app.extensions import db
from sqlalchemy import text


@main.route("/health", methods=["GET"])
def health_check():
    try:
        redis_status = current_app.redis.ping()
        influx_status = current_app.influx.get_server_version()
        postgres_status = db.session.execute(text("SELECT 1")).scalar() == 1
        if influx_status:
            influx_status = True
        else:
            influx_status = False
            raise Exception("InfluxDB not reachable")

        return jsonify(
            {
                "status": "ok",
                "redis": redis_status,
                "influx": influx_status,
                "postgres": postgres_status,
            }
        ), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
