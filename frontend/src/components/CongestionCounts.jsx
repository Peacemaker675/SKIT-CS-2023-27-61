import { CONGESTION, congestionLevel } from "../lib/congestion.js";

const ORDER = ["smooth", "moderate", "heavy", "unknown"];

// How many intersections are at each congestion level.
export function countByLevel(intersections, liveData) {
  const counts = { smooth: 0, moderate: 0, heavy: 0, unknown: 0 };
  for (const i of intersections) counts[congestionLevel(liveData[i.id])] += 1;
  return counts;
}

// Strip above the Live tab: n Smooth / Moderate / Heavy / No data.
export default function CongestionCounts({ intersections, liveData }) {
  const counts = countByLevel(intersections, liveData);

  return (
    <ul className="congestion-counts" aria-label="Intersections by congestion">
      {ORDER.map((level) => (
        <li key={level}>
          <span
            className="congestion-dot"
            style={{ background: CONGESTION[level].color }}
            aria-hidden="true"
          />
          <strong>{counts[level]}</strong> {CONGESTION[level].label}
        </li>
      ))}
    </ul>
  );
}
