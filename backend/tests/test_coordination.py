import sys
from unittest.mock import MagicMock
import unittest
import json

# Mock external dependencies if not installed in current python env
if "redis" not in sys.modules:
    sys.modules["redis"] = MagicMock()
if "app.extensions" not in sys.modules:
    mock_ext = MagicMock()
    mock_ext.socketio = MagicMock()
    sys.modules["app.extensions"] = mock_ext

from app.coordination import (
    get_5_intersection_window,
    extract_intersection_features,
    build_5_intersection_state,
)
from app.influx_models import TrafficPoint


class TestCoordination(unittest.TestCase):
    def test_5_intersection_window(self):
        window = get_5_intersection_window("INT_001")
        self.assertEqual(len(window), 5)
        self.assertEqual(window[0], "INT_001")
        for node in window:
            self.assertTrue(isinstance(node, str) and node.startswith("INT_"))

    def test_extract_features_per_lane(self):
        mock_redis = MagicMock()
        mock_redis.hgetall.return_value = {
            "vehicle_counts": json.dumps({"N": 10, "E": 5, "S": 15, "W": 8}),
            "queue_lengths": json.dumps({"N": 20.5, "E": 12.0, "S": 35.0, "W": 18.2}),
            "current_phase": "N_GREEN",
        }

        count, queue = extract_intersection_features(mock_redis, "INT_001")
        self.assertEqual(count, 38.0)
        self.assertEqual(queue, 35.0)

    def test_build_5_intersection_state(self):
        mock_redis = MagicMock()
        mock_redis.hgetall.return_value = {
            "vehicle_counts": json.dumps({"N": 5, "S": 5}),
            "queue_lengths": json.dumps({"N": 10.0, "S": 15.0}),
        }

        state = build_5_intersection_state(mock_redis, "INT_001")
        self.assertEqual(len(state), 10)
        self.assertEqual(state, [10.0, 15.0] * 5)

    def test_traffic_point_per_lane(self):
        tp = TrafficPoint(
            intersection_id="INT_001",
            vehicle_counts={"N": 12, "S": 8},
            queue_lengths={"N": 40.0, "S": 60.0},
            current_phase="N_GREEN",
        )
        self.assertEqual(tp.vehicle_count, 20)
        self.assertEqual(tp.max_queue_length, 60)
        self.assertEqual(tp.signal_state, "N_GREEN")


if __name__ == "__main__":
    unittest.main()
