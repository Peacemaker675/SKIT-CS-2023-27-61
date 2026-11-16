// Route for the emergency green corridor: the path through the fewest
// intersections, found with breadth-first search on the graph from
// buildGraph() (lib/graph.js), plus the route's length in km from GPS.

const EARTH_RADIUS_KM = 6371;

// Returns the intersection ids from startId to endId inclusive, or null if
// either id is unknown or the two are not connected.
//
// BFS explores the graph one "hop" at a time, so the first time it reaches
// endId it has used the fewest intersections. `previous` doubles as the
// visited set, so cycles in the road graph (A-B-C-A) can't loop forever.
// Neighbours are visited in sorted id order, so when two routes are equally
// short the same one is always chosen (stable UI and tests).
export function shortestPath(graph, startId, endId) {
  if (!(graph instanceof Map)) return null;
  if (!graph.has(startId) || !graph.has(endId)) return null;
  if (startId === endId) return [startId];

  const previous = new Map([[startId, null]]);
  const queue = [startId];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    const next = [...(graph.get(current) ?? [])].sort();
    for (const other of next) {
      if (previous.has(other)) continue;
      previous.set(other, current);
      if (other === endId) return pathTo(previous, endId);
      queue.push(other);
    }
  }

  return null;
}

function pathTo(previous, endId) {
  const path = [];
  for (let id = endId; id !== null; id = previous.get(id)) path.push(id);
  return path.reverse();
}

function hasCoords(point) {
  return (
    point != null &&
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng)
  );
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Straight-line ("as the crow flies") distance in km between two
// { lat, lng } points, or null if either has no usable coordinates.
export function haversineKm(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Total length of a route (array of intersection ids) in km, summing each
// leg between consecutive intersections. Returns null if the route is not an
// array or any intersection on it is unknown or has no coordinates, so the UI
// can hide the distance instead of showing a wrong one.
export function routeDistanceKm(intersections, route) {
  if (!Array.isArray(route) || !Array.isArray(intersections)) return null;
  const byId = new Map(
    intersections.filter((i) => i && i.id).map((i) => [i.id, i]),
  );
  let total = 0;
  for (let i = 0; i < route.length; i++) {
    if (!hasCoords(byId.get(route[i]))) return null;
    if (i === 0) continue;
    total += haversineKm(byId.get(route[i - 1]), byId.get(route[i]));
  }
  return total;
}
