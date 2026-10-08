from pydantic import BaseModel
from typing import Optional


class TrafficPoint(BaseModel):
    intersection_id: str
    has_special_event: bool = False
    vehicle_count: int
    avg_speed: float
    lane_occupancy: float
    signal_state: str
    max_queue_length: int
    weather_condition: Optional[str] = None
