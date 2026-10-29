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
        # 10-dim state vector
        sample_state = [10.0, 20.0, 5.0, 15.0, 25.0, 30.0, 8.0, 12.0, 18.0, 22.0]
        action = self.model.predict(sample_state)
        self.assertIn(action, [0, 1, 2, 3])
        phase = ACTION_TO_PHASE[action]
        self.assertIn(phase, ["N_GREEN", "E_GREEN", "S_GREEN", "W_GREEN"])

    def test_state_padding(self):
        # Short state vector (< 10)
        short_state = [15.0, 30.0]
        action = self.model.predict(short_state)
        self.assertIn(action, [0, 1, 2, 3])

    def test_state_clipping(self):
        # Values exceeding 50.0 should be bounded
        large_state = [100.0] * 10
        action = self.model.predict(large_state)
        self.assertIn(action, [0, 1, 2, 3])


if __name__ == "__main__":
    unittest.main()
