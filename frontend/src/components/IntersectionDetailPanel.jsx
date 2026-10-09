import { CONGESTION, congestionLevel } from "../lib/congestion.js";

// Fields the backend currently stores per update
// (backend/app/influx_models/TrafficPoint.py).
const FIELDS = [
  ["vehicle_count", "Vehicle count"],
  ["max_queue_length", "Max queue length"],
  ["avg_speed", "Avg. speed"],
  ["lane_occupancy", "Lane occupancy"],
  ["signal_state", "Signal state"],
  ["weather_condition", "Weather"],
  ["has_special_event", "Special event"],
];

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

// SRS Tab 1, Component 2 (minimal): live values for the selected intersection.
export default function IntersectionDetailPanel({ intersection, data }) {
  if (!intersection) {
    return (
      <aside className="panel">
        <p className="muted">Select an intersection on the map.</p>
      </aside>
    );
  }

  const { label, color } = CONGESTION[congestionLevel(data)];

  return (
    <aside className="panel">
      <h2>{intersection.name || intersection.id}</h2>
      <p className="muted">
        {intersection.id}
        <span className="badge" style={{ background: color }}>
          {label}
        </span>
      </p>
      {data ? (
        <dl className="metrics">
          {FIELDS.map(([key, name]) => (
            <div key={key}>
              <dt>{name}</dt>
              <dd>{formatValue(data[key])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="muted">Waiting for live data from this intersection…</p>
      )}
    </aside>
  );
}
