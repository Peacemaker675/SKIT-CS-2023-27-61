"""
Simple 4-way intersection traffic environment for OpenAI Gymnasium.

Observation Space:  Box(4,) — car count on each of the 4 sides [North, East, South, West]
Action Space:       Discrete(4) — which lane gets the green signal next
                    0 = North, 1 = East, 2 = South, 3 = West

Each step simulates one 15-second green phase:
  • Cars on the green lane are cleared (reduced).
  • Cars on red lanes accumulate (new arrivals).
  • Reward = -(total waiting cars) so the agent learns to minimise congestion.
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np


class TrafficIntersectionEnv(gym.Env):
    """
    A simplified single-intersection traffic signal environment.

    Parameters
    ----------
    max_cars : int
        Maximum car count per lane (observation upper bound).
    green_clear_rate : float
        Fraction of cars cleared from the green lane each step.
    red_arrival_range : tuple[int, int]
        (min, max) new cars arriving at each red lane per step.
    max_steps : int
        Maximum steps (signal changes) per episode.
    """

    metadata = {"render_modes": ["human", "ansi"], "render_fps": 1}

    LANE_NAMES = ["North", "East", "South", "West"]

    def __init__(
        self,
        max_cars: int = 60,
        green_clear_rate: float = 0.6,
        red_arrival_range: tuple = (1, 5),
        max_steps: int = 200,
        render_mode: str | None = None,
    ):
        super().__init__()
        self.max_cars = max_cars
        self.green_clear_rate = green_clear_rate
        self.red_arrival_range = red_arrival_range
        self.max_steps = max_steps
        self.render_mode = render_mode

        # --- Spaces ---
        # Observation: car count on each of the 4 sides
        self.observation_space = spaces.Box(
            low=0.0,
            high=float(max_cars),
            shape=(4,),
            dtype=np.float32,
        )

        # Action: which lane gets the green signal (0-3)
        self.action_space = spaces.Discrete(4)

        # Internal state
        self.car_counts: np.ndarray | None = None
        self.current_step: int = 0
        self.last_action: int | None = None

    # ------------------------------------------------------------------
    # Gym API
    # ------------------------------------------------------------------
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        # Initialise with random car counts on each lane
        self.car_counts = self.np_random.integers(
            low=5, high=self.max_cars // 2, size=(4,)
        ).astype(np.float32)
        self.current_step = 0
        self.last_action = None
        return self._get_obs(), self._get_info()

    def step(self, action: int):
        assert self.action_space.contains(action), f"Invalid action {action}"
        self.last_action = action
        self.current_step += 1

        # 1. GREEN lane: clear a fraction of waiting cars
        cleared = int(self.car_counts[action] * self.green_clear_rate)
        self.car_counts[action] = max(0, self.car_counts[action] - cleared)

        # 2. RED lanes: new cars arrive
        for lane in range(4):
            if lane != action:
                arrivals = self.np_random.integers(
                    self.red_arrival_range[0], self.red_arrival_range[1] + 1
                )
                self.car_counts[lane] = min(
                    self.max_cars, self.car_counts[lane] + arrivals
                )

        # 3. Small random arrival on green lane too (traffic doesn't fully stop)
        green_arrival = self.np_random.integers(0, 2)
        self.car_counts[action] = min(
            self.max_cars, self.car_counts[action] + green_arrival
        )

        # 4. Reward: negative of total waiting cars (we want to minimise)
        total_waiting = float(np.sum(self.car_counts))
        reward = -total_waiting

        # Bonus for clearing the most congested lane
        if action == int(np.argmax(self.car_counts)):
            reward += 5.0

        # 5. Episode termination
        terminated = False
        truncated = self.current_step >= self.max_steps

        return self._get_obs(), reward, terminated, truncated, self._get_info()

    def render(self):
        if self.render_mode == "human" or self.render_mode == "ansi":
            output = self._render_text()
            if self.render_mode == "human":
                print(output)
            return output
        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get_obs(self) -> np.ndarray:
        return self.car_counts.copy()

    def _get_info(self) -> dict:
        return {
            "step": self.current_step,
            "total_waiting": int(np.sum(self.car_counts)),
            "lane_counts": {
                name: int(c) for name, c in zip(self.LANE_NAMES, self.car_counts)
            },
        }

    def _render_text(self) -> str:
        green_lane = (
            self.LANE_NAMES[self.last_action] if self.last_action is not None else "—"
        )
        lines = [
            f"╔══════════════════════════════════╗",
            f"║  Step {self.current_step:>4}  |  Green → {green_lane:<6} ║",
            f"╠══════════════════════════════════╣",
        ]
        for i, name in enumerate(self.LANE_NAMES):
            bar = "█" * min(int(self.car_counts[i]), 30)
            signal = "🟢" if self.last_action == i else "🔴"
            lines.append(
                f"║ {signal} {name:>5}: {int(self.car_counts[i]):>3} {bar:<30} ║"
            )
        lines.append(f"║  Total waiting: {int(np.sum(self.car_counts)):>4}             ║")
        lines.append(f"╚══════════════════════════════════╝")
        return "\n".join(lines)
