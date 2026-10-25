// SRS Tab 1, Component 2: top-down diagram of a 4-way intersection, one strip
// per lane from normalizeState().lanes.

const SIDES = ["N", "E", "S", "W"];
const SIZE = 200;
const LANE = 14;
const CENTER = SIZE / 2;

// Lanes named after a side (N, east, S_1, ...) go on that side. The rest,
// e.g. the SRS lane_1.. ids, are dealt round the four sides in order.
export function lanesBySide(lanes) {
  const sides = { N: [], E: [], S: [], W: [] };
  const rest = [];
  for (const lane of lanes) {
    const match = /^(n|e|s|w)(?:orth|ast|outh|est)?(?![a-z])/i.exec(lane.id);
    const side = match && match[1].toUpperCase();
    if (side) sides[side].push(lane);
    else rest.push(lane);
  }
  rest.forEach((lane, i) => sides[SIDES[i % 4]].push(lane));
  return sides;
}

// Box for lane `i` of `count` on `side`, drawn from the edge to the box.
function laneRect(side, i, count, half) {
  const across = CENTER - (count * LANE) / 2 + i * LANE;
  const length = CENTER - half;
  if (side === "N") return { x: across, y: 0, width: LANE, height: length };
  if (side === "S")
    return { x: across, y: CENTER + half, width: LANE, height: length };
  if (side === "W") return { x: 0, y: across, width: length, height: LANE };
  return { x: CENTER + half, y: across, width: length, height: LANE };
}

function labelPos(rect, side) {
  const vertical = side === "N" || side === "S";
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    transform: vertical
      ? `rotate(-90 ${rect.x + rect.width / 2} ${rect.y + rect.height / 2})`
      : undefined,
  };
}

export default function IntersectionDiagram({ lanes = [] }) {
  // The flat backend payload only has an "all" row, so there is nothing
  // per-lane to draw yet.
  const real = lanes.filter((lane) => lane.id !== "all");
  if (!real.length) {
    return <p className="muted">No per-lane data for a diagram yet.</p>;
  }

  const sides = lanesBySide(real);
  const widest = Math.max(1, ...SIDES.map((s) => sides[s].length));
  const half = (widest * LANE) / 2 + 4;

  return (
    <svg
      className="intersection-diagram"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Intersection with ${real.length} lanes`}
      style={{ width: "100%", maxWidth: 260, display: "block" }}
    >
      <rect
        x={CENTER - half}
        y={CENTER - half}
        width={half * 2}
        height={half * 2}
        style={{ fill: "var(--surface-2)", stroke: "var(--border)" }}
      />
      {SIDES.map((side) =>
        sides[side].map((lane, i) => {
          const rect = laneRect(side, i, sides[side].length, half);
          const label = labelPos(rect, side);
          return (
            <g key={lane.id}>
              <title>{lane.id}</title>
              <rect
                {...rect}
                style={{ fill: "var(--surface-2)", stroke: "var(--border)" }}
              />
              <text
                {...label}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: "var(--muted)", fontSize: 8 }}
              >
                {lane.id}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
