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

// Ids of lanes that are green in `phase`. Phases look like "lane_1_green"
// (SRS schema) or "N_GREEN" (mock feed); a side group such as "NS_GREEN"
// lights every lane on those sides.
export function greenLaneIds(lanes, phase) {
  if (!phase) return new Set();
  const token = phase.replace(/_green$/i, "").toLowerCase();
  const exact = lanes.filter((lane) => lane.id.toLowerCase() === token);
  if (exact.length || !/^[nesw]+$/.test(token)) {
    return new Set(exact.map((lane) => lane.id));
  }
  const sides = lanesBySide(lanes);
  return new Set(
    [...token.toUpperCase()].flatMap((s) => sides[s].map((lane) => lane.id)),
  );
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

// Room kept at the outer end of each lane for its label.
const LABEL_ROOM = 22;

// Label sits at the outer (map edge) end of the lane.
function labelPos(rect, side) {
  const end = LABEL_ROOM / 2;
  const x =
    side === "W"
      ? rect.x + end
      : side === "E"
        ? rect.x + rect.width - end
        : rect.x + rect.width / 2;
  const y =
    side === "N"
      ? rect.y + end
      : side === "S"
        ? rect.y + rect.height - end
        : rect.y + rect.height / 2;
  const vertical = side === "N" || side === "S";
  return { x, y, transform: vertical ? `rotate(-90 ${x} ${y})` : undefined };
}

// Queue bar growing back from the stop line; `share` is 0..1 of the room
// left after the label.
function queueRect(rect, side, share) {
  const vertical = side === "N" || side === "S";
  const room = (vertical ? rect.height : rect.width) - LABEL_ROOM;
  const len = Math.max(0, Math.min(1, share)) * room;
  const inset = LANE * 0.25;
  if (side === "N")
    return {
      x: rect.x + inset,
      y: rect.y + rect.height - len,
      width: LANE / 2,
      height: len,
    };
  if (side === "S")
    return { x: rect.x + inset, y: rect.y, width: LANE / 2, height: len };
  if (side === "W")
    return {
      x: rect.x + rect.width - len,
      y: rect.y + inset,
      width: len,
      height: LANE / 2,
    };
  return { x: rect.x, y: rect.y + inset, width: len, height: LANE / 2 };
}

// Bars are scaled to the longest queue here, but never below this many
// metres so short queues don't fill the lane.
const MIN_QUEUE_SCALE = 10;

// Same green as the "Smooth" congestion marker (lib/congestion.js).
const GREEN = "#2e9e44";

export default function IntersectionDiagram({ lanes = [], phase = null }) {
  // The flat backend payload only has an "all" row, so there is nothing
  // per-lane to draw yet.
  const real = lanes.filter((lane) => lane.id !== "all");
  if (!real.length) {
    return <p className="muted">No per-lane data for a diagram yet.</p>;
  }

  const sides = lanesBySide(real);
  const widest = Math.max(1, ...SIDES.map((s) => sides[s].length));
  const half = (widest * LANE) / 2 + 4;
  const green = greenLaneIds(real, phase);
  const queueScale = Math.max(
    MIN_QUEUE_SCALE,
    ...real.map((lane) => lane.queue ?? 0),
  );

  return (
    <svg
      className="intersection-diagram"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Intersection with ${real.length} lanes`}
      // Scales with the panel, capped so it doesn't dominate wide screens.
      style={{
        width: "100%",
        maxWidth: 240,
        display: "block",
        margin: "12px auto",
      }}
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
          const isGreen = green.has(lane.id);
          const queue =
            lane.queue === null || lane.queue === undefined
              ? ""
              : `, queue ${lane.queue} m`;
          return (
            <g key={lane.id}>
              <title>
                {lane.id}
                {isGreen ? " (green)" : ""}
                {queue}
              </title>
              <rect
                {...rect}
                style={{
                  fill: isGreen ? GREEN : "var(--surface-2)",
                  stroke: isGreen ? GREEN : "var(--border)",
                }}
              />
              {lane.queue > 0 && (
                <rect
                  className="queue-bar"
                  {...queueRect(rect, side, lane.queue / queueScale)}
                  rx={2}
                  style={{ fill: isGreen ? "#ffffff" : "var(--accent)" }}
                />
              )}
              <text
                {...label}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fill: isGreen ? "#ffffff" : "var(--muted)",
                  fontSize: 8,
                  fontWeight: isGreen ? 600 : 400,
                }}
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
