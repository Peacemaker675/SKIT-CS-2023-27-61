// Green corridor helpers: where each intersection on an emergency's route
// stands, and a stable colour per emergency so several corridors can be told
// apart on the map.

// Status of every intersection on the route, in travel order:
//   passed  - before the vehicle's current intersection
//   green   - the current intersection and the next one (held green)
//   pending - further along the route
// While the current intersection is unknown (null or not on the route)
// nothing has been passed or turned green yet, so all are pending.
export function corridorStatus(emergency) {
  const route = Array.isArray(emergency?.route) ? emergency.route : [];
  const current = route.indexOf(emergency?.current_id);
  return route.map((id, index) => {
    let status = "pending";
    if (current !== -1 && index < current) status = "passed";
    else if (current !== -1 && index <= current + 1) status = "green";
    return { id, status };
  });
}

// Colours for corridors. None is a congestion colour (green / yellow / red /
// grey). White text on each passes WCAG AA (>= 4.5:1) and each line keeps at
// least 3:1 against the dark-mode map tiles.
export const CORRIDOR_COLORS = ["#2563eb", "#7c3aed", "#0e7490", "#c026d3"];

// Same emergency id -> same colour on every render. Ids ending in a number
// (EMG_001, EMG_002, ...) take consecutive colours, so emergencies started
// one after another never share one until the palette runs out; other ids
// fall back to a string hash.
export function emergencyColor(id) {
  const text = String(id ?? "");
  const digits = text.match(/(\d+)$/);
  let n;
  if (digits) {
    n = Number(digits[1]) - 1;
  } else {
    n = 0;
    for (const ch of text) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const size = CORRIDOR_COLORS.length;
  return CORRIDOR_COLORS[((n % size) + size) % size];
}

// For each intersection id, the emergencies whose route passes through it,
// in the order given. Used to draw one ring per corridor on shared junctions.
export function corridorsByIntersection(emergencies) {
  const result = new Map();
  for (const emergency of emergencies || []) {
    for (const id of new Set(emergency?.route || [])) {
      if (!result.has(id)) result.set(id, []);
      result.get(id).push(emergency);
    }
  }
  return result;
}
