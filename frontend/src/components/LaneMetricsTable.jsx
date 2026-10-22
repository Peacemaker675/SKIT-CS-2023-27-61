import { formatMetric, laneLabel } from "../lib/laneMetrics.js";

// Per-lane count / queue / wait for one intersection.
// `lanes` is normalizeState(...).lanes: [{ id, count, queue, wait }].
export default function LaneMetricsTable({ lanes }) {
  if (!lanes || lanes.length === 0) return null;

  return (
    <table className="lane-table">
      <thead>
        <tr>
          <th scope="col">Lane</th>
          <th scope="col">Vehicle Count</th>
          <th scope="col">Queue Length (m)</th>
          <th scope="col">Avg Wait (s)</th>
        </tr>
      </thead>
      <tbody>
        {lanes.map((lane) => (
          <tr key={lane.id}>
            <th scope="row">{laneLabel(lane.id)}</th>
            <td>{formatMetric(lane.count)}</td>
            <td>{formatMetric(lane.queue)}</td>
            <td>{formatMetric(lane.wait)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
