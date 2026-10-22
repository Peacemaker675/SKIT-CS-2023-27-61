// Route for the emergency green corridor: the path through the fewest
// intersections, found with breadth-first search on the graph from
// buildGraph() (lib/graph.js).
//
// Neighbours are visited in sorted id order, so when two routes are equally
// short the same one is always chosen (stable UI and tests).

// Returns the intersection ids from startId to endId inclusive, or null if
// either id is unknown or the two are not connected.
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
