from influxdb_client_3 import Point
from flask import current_app
from app.influx_models import TrafficPoint


def traffic_point_to_influx(point: TrafficPoint) -> Point:
    p = Point("traffic_data")  # measurement name

    # Tags
    p.tag("intersection_id", point.intersection_id)
    p.tag("has_special_event", str(point.has_special_event).lower())
    if point.weather_condition:
        p.tag("weather_condition", point.weather_condition)
    # Fields
    p.field("vehicle_count", point.vehicle_count)
    p.field("avg_speed", point.avg_speed)
    p.field("lane_occupancy", point.lane_occupancy)
    p.field("signal_state", point.signal_state)
    p.field("max_queue_length", point.max_queue_length)

    return p


def write_traffic_point(point_data: TrafficPoint):
    point = traffic_point_to_influx(point_data)
    current_app.influx._write_api.write(
        bucket=current_app.config["INFLUX_BUCKET"],
        org=current_app.config["INFLUX_ORG"],
        record=point,
    )
