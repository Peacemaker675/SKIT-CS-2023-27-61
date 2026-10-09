// Congestion level shown on the map (SRS: Green = Smooth, Yellow = Moderate,
// Red = Heavy).
//
// TEMPORARY: the SRS bases this on a composite score from the RL agent's
// observation space, which isn't defined yet. Until it is, take the worse of
// two simple thresholds on the fields the backend currently receives
// (backend/app/influx_models/TrafficPoint.py). Replace once the team agrees
// on the score.
const QUEUE_MODERATE = 10;
const QUEUE_HEAVY = 25;
const OCCUPANCY_MODERATE = 0.4;
const OCCUPANCY_HEAVY = 0.7;

export const CONGESTION = {
  smooth: { label: "Smooth", color: "#2e9e44" },
  moderate: { label: "Moderate", color: "#e0a400" },
  heavy: { label: "Heavy", color: "#d32f2f" },
  unknown: { label: "No data", color: "#8a94a3" },
};

const RANK = ["smooth", "moderate", "heavy"];

function level(value, moderate, heavy) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value >= heavy) return "heavy";
  if (value >= moderate) return "moderate";
  return "smooth";
}

export function congestionLevel(data) {
  if (!data) return "unknown";
  // lane_occupancy may arrive as a fraction (0-1) or a percentage.
  const occupancy =
    typeof data.lane_occupancy === "number" && data.lane_occupancy > 1
      ? data.lane_occupancy / 100
      : data.lane_occupancy;
  const levels = [
    level(data.max_queue_length, QUEUE_MODERATE, QUEUE_HEAVY),
    level(occupancy, OCCUPANCY_MODERATE, OCCUPANCY_HEAVY),
  ].filter(Boolean);
  if (!levels.length) return "unknown";
  return levels.reduce((a, b) => (RANK.indexOf(a) >= RANK.indexOf(b) ? a : b));
}
