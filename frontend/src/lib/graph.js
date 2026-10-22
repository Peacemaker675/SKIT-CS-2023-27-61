// Road graph between intersections, built from each intersection's
// `neighbors` list (mocks/intersections.json, later GET /api/admin/intersections).
// Used by the emergency green corridor to find a route.
//
// The data is cleaned rather than trusted: links are made two-way (a road
// between A and B works in both directions), and neighbour ids that are not
// in the list are dropped and reported as warnings instead of crashing.

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validId(value) {
  return typeof value === "string" && value !== "";
}

// Returns { graph, warnings }. graph is a Map of intersection id -> Set of
// neighbour ids; every known intersection is a key, even with no neighbours.
export function buildGraph(intersections) {
  const graph = new Map();
  const warnings = [];
  const list = Array.isArray(intersections) ? intersections : [];

  for (const item of list) {
    if (isPlainObject(item) && validId(item.id) && !graph.has(item.id)) {
      graph.set(item.id, new Set());
    }
  }

  for (const item of list) {
    if (!isPlainObject(item) || !graph.has(item.id)) continue;
    const neighbors = Array.isArray(item.neighbors) ? item.neighbors : [];
    for (const other of neighbors) {
      if (other === item.id) continue;
      if (!graph.has(other)) {
        warnings.push(`${item.id} lists unknown neighbour ${String(other)}`);
        continue;
      }
      graph.get(item.id).add(other);
      graph.get(other).add(item.id);
    }
  }

  return { graph, warnings };
}

// The intersection with this id, or null.
export function getIntersection(intersections, id) {
  if (!Array.isArray(intersections)) return null;
  return (
    intersections.find((item) => isPlainObject(item) && item.id === id) ?? null
  );
}
