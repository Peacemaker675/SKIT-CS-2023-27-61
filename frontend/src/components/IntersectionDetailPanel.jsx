import { CONGESTION, congestionLevel } from "../lib/congestion.js";
import { normalizeState } from "../lib/normalizeState.js";
import { MapPinIcon } from "./icons.jsx";
import IntersectionDiagram from "./IntersectionDiagram.jsx";
import LaneMetricsTable from "./LaneMetricsTable.jsx";
import LastUpdated from "./LastUpdated.jsx";
import SignalPhaseIndicator from "./SignalPhaseIndicator.jsx";
import VideoFeedPlaceholder from "./VideoFeedPlaceholder.jsx";

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
export default function IntersectionDetailPanel({
  intersection,
  data,
  summary,
}) {
  if (!intersection) {
    return (
      <aside className="panel panel-empty">
        <span className="empty-icon">
          <MapPinIcon size={26} />
        </span>
        <h2>No intersection selected</h2>
        <p className="muted">
          Click a marker on the map to see live traffic for that junction.
        </p>
        {summary && (
          <div className="stat-row">
            <div className="stat">
              <strong>{summary.total}</strong>
              <span>Intersections</span>
            </div>
            <div className="stat">
              <strong>{summary.live}</strong>
              <span>Live now</span>
            </div>
          </div>
        )}
      </aside>
    );
  }

  const { label, color } = CONGESTION[congestionLevel(data)];
  const state = normalizeState(data);

  return (
    <aside className="panel">
      <VideoFeedPlaceholder name={intersection.name || intersection.id} />
      <h2>{intersection.name || intersection.id}</h2>
      <p className="muted">
        {intersection.id}
        <span className="badge" style={{ background: color }}>
          {label}
        </span>
      </p>
      {data ? (
        <>
          <LastUpdated timestamp={state.timestamp} />
          <SignalPhaseIndicator phase={state.phase} phaseEnd={data.phase_end} />
          <IntersectionDiagram lanes={state.lanes} phase={state.phase} />
          <dl className="metrics">
            {FIELDS.map(([key, name]) => (
              <div key={key}>
                <dt>{name}</dt>
                <dd>{formatValue(data[key])}</dd>
              </div>
            ))}
          </dl>
          <LaneMetricsTable lanes={state.lanes} />
        </>
      ) : (
        <p className="muted">Waiting for live data from this intersection…</p>
      )}
    </aside>
  );
}
