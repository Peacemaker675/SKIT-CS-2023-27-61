import { CONGESTION, congestionLevel } from "../lib/congestion.js";

const ORDER = ["heavy", "moderate", "smooth", "unknown"];

// Intersections with their congestion level, worst first, then by name.
export function sortByCongestion(intersections, liveData) {
  return intersections
    .map((i) => ({ ...i, level: congestionLevel(liveData[i.id]) }))
    .sort(
      (a, b) =>
        ORDER.indexOf(a.level) - ORDER.indexOf(b.level) ||
        (a.name || a.id).localeCompare(b.name || b.id),
    );
}

// All intersections from Heavy to Smooth, shown beside the map.
export default function CongestionSummaryList({ intersections, liveData }) {
  if (!intersections.length) return null;

  return (
    <section className="panel congestion-list">
      <h2>Congestion</h2>
      <ul>
        {sortByCongestion(intersections, liveData).map((i) => {
          const { label, color } = CONGESTION[i.level];
          return (
            <li key={i.id}>
              <span
                className="congestion-dot"
                style={{ background: color }}
                aria-hidden="true"
              />
              <span className="congestion-name">{i.name || i.id}</span>
              <span className="congestion-level">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
