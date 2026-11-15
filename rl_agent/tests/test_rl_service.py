import sys
from unittest.mock import MagicMock
import unittest
import numpy as np

if "flask" not in sys.modules:
    mock_flask = MagicMock()
    sys.modules["flask"] = mock_flask
if "redis" not in sys.modules:
    sys.modules["redis"] = MagicMock()
if "flask_socketio" not in sys.modules:
    mock_sio = MagicMock()
    sys.modules["flask_socketio"] = mock_sio

from rl_agent.src.app.app import TrafficRLModel, ACTION_TO_PHASE


class TestRLService(unittest.TestCase):
    def setUp(self):
        self.model = TrafficRLModel()

    def test_prediction_output(self):
        # 4-dim state vector [North, East, South, West]
        sample_state = [10.0, 5.0, 25.0, 8.0]
        action = self.model.predict(sample_state)
        self.assertIn(action, [0, 1, 2, 3])
        phase = ACTION_TO_PHASE[action]
        self.assertIn(phase, ["N_GREEN", "E_GREEN", "S_GREEN", "W_GREEN"])

    def test_prediction_dict_input(self):
        # Dictionary input by lane name
        sample_dict = {"N": 10, "E": 5, "S": 35, "W": 8}
        action = self.model.predict(sample_dict)
        self.assertIn(action, [0, 1, 2, 3])

    def test_state_padding(self):
        # Short state vector (< 4)
        short_state = [15.0, 30.0]
        action = self.model.predict(short_state)
        self.assertIn(action, [0, 1, 2, 3])

    def test_state_clipping(self):
        # Values exceeding 60.0 should be bounded
        large_state = [100.0] * 4
        action = self.model.predict(large_state)
        self.assertIn(action, [0, 1, 2, 3])


if __name__ == "__main__":
    unittest.main()
