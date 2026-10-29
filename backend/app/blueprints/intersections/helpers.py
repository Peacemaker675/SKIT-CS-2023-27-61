from influxdb_client_3 import Point
from flask import current_app
from app.influx_models import TrafficPoint


def traffic_point_to_influx(point: TrafficPoint) -> Point:
    p = Point("traffic_data")  # measurement name

    # Tags
    p.tag("intersection_id", point.intersection_id)
    p.tag("has_special_event", str(getattr(point, "has_special_event", False)).lower())
    if getattr(point, "weather_condition", None):
        p.tag("weather_condition", point.weather_condition)
    # Fields
    p.field("vehicle_count", int(getattr(point, "vehicle_count", 0)))
    p.field("avg_speed", float(getattr(point, "avg_speed", 0.0)))
    p.field("lane_occupancy", float(getattr(point, "lane_occupancy", 0.0)))
    p.field("signal_state", str(getattr(point, "signal_state", "UNKNOWN")))
    p.field("max_queue_length", int(getattr(point, "max_queue_length", 0)))

    return p


def write_traffic_point(point_data: TrafficPoint):
    point = traffic_point_to_influx(point_data)
    current_app.influx._write_api.write(
        bucket=current_app.config["INFLUX_BUCKET"],
        org=current_app.config["INFLUX_ORG"],
        record=point,
    )
