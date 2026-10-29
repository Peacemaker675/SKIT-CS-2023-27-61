from . import main
from flask import current_app, jsonify
from app.extensions import db
from sqlalchemy import text


@main.route("/health", methods=["GET"])
def health_check():
    try:
        redis_status = bool(current_app.redis.ping())
        try:
            influx_version = current_app.influx.get_server_version()
            influx_status = bool(influx_version)
        except Exception:
            influx_status = False

        postgres_status = bool(db.session.execute(text("SELECT 1")).scalar() == 1)

        is_healthy = redis_status and postgres_status
        status_str = "ok" if is_healthy else "degraded"

        return (
            jsonify(
                {
                    "code": "HEALTH_OK" if is_healthy else "HEALTH_DEGRADED",
                    "status": status_str,
                    "redis": redis_status,
                    "influx": influx_status,
                    "postgres": postgres_status,
                }
            ),
            200 if is_healthy else 503,
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "code": "HEALTH_ERROR",
                    "status": "error",
                    "message": str(e),
                    "error": str(e),
                }
            ),
            500,
        )
