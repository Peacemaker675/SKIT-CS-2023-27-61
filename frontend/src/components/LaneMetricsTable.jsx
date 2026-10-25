import { formatMetric } from "../lib/laneMetrics.js";
import { useT } from "../i18n/i18n.js";

// Per-lane count / queue / wait for one intersection.
// `lanes` is normalizeState(...).lanes: [{ id, count, queue, wait }].
export default function LaneMetricsTable({ lanes }) {
  const { t } = useT();
  if (!lanes || lanes.length === 0) return null;

  return (
    <table className="lane-table">
      <thead>
        <tr>
          <th scope="col">{t("lanes.lane")}</th>
          <th scope="col">{t("lanes.count")}</th>
          <th scope="col">{t("lanes.queue")}</th>
          <th scope="col">{t("lanes.wait")}</th>
        </tr>
      </thead>
      <tbody>
        {lanes.map((lane) => (
          <tr key={lane.id}>
            <th scope="row">{lane.id === "all" ? t("lanes.all") : lane.id}</th>
            <td>{formatMetric(lane.count)}</td>
            <td>{formatMetric(lane.queue)}</td>
            <td>{formatMetric(lane.wait)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
