from typing import Optional, Dict, Any

try:
    from pydantic import BaseModel
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)


class TrafficPoint(BaseModel):
    intersection_id: str
    has_special_event: bool = False
    vehicle_count: int = 0
    avg_speed: float = 0.0
    lane_occupancy: float = 0.0
    signal_state: str = "UNKNOWN"
    max_queue_length: int = 0
    weather_condition: Optional[str] = None
    vehicle_counts: Optional[Dict[str, Any]] = None
    queue_lengths: Optional[Dict[str, Any]] = None
    avg_wait_times: Optional[Dict[str, Any]] = None
    current_phase: Optional[str] = None

    def __init__(self, **data):
        # Auto-compute aggregate metrics from per-lane telemetry if provided
        if "vehicle_counts" in data and isinstance(data["vehicle_counts"], dict):
            if "vehicle_count" not in data or data["vehicle_count"] is None:
                counts = [
                    v
                    for v in data["vehicle_counts"].values()
                    if isinstance(v, (int, float))
                ]
                data["vehicle_count"] = int(sum(counts)) if counts else 0
        if "queue_lengths" in data and isinstance(data["queue_lengths"], dict):
            if "max_queue_length" not in data or data["max_queue_length"] is None:
                queues = [
                    v
                    for v in data["queue_lengths"].values()
                    if isinstance(v, (int, float))
                ]
                data["max_queue_length"] = int(max(queues)) if queues else 0
        if "current_phase" in data and data["current_phase"]:
            if (
                "signal_state" not in data
                or not data["signal_state"]
                or data["signal_state"] == "UNKNOWN"
            ):
                data["signal_state"] = str(data["current_phase"])
        super().__init__(**data)
