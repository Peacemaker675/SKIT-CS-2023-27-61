// Turns an intersection state payload into one shape the UI can render.
//
// Two payloads exist right now: the flat one the backend currently stores
// (backend/app/influx_models/TrafficPoint.py) and the per-lane one agreed in
// the SRS (Redis value with vehicle_counts / queue_lengths / avg_wait_times
// keyed by lane id). Until the backend switches over, components should read
// from this instead of either raw shape.
//
// Values are strict: only finite numbers are kept. Anything else, including
// numeric strings like "12", becomes null so bad data shows as "no data"
// instead of being silently guessed.

const PER_LANE_KEYS = ["vehicle_counts", "queue_lengths", "avg_wait_times"];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value) {
  return typeof value === "string" ? value : null;
}

function emptyState() {
  return {
    lanes: [],
    phase: null,
    timestamp: null,
    totals: { count: null, queue: null, wait: null },
  };
}

function laneIds(raw) {
  const ids = [];
  for (const key of PER_LANE_KEYS) {
    if (!isPlainObject(raw[key])) continue;
    for (const id of Object.keys(raw[key])) {
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function metric(source, id) {
  return isPlainObject(source) ? num(source[id]) : null;
}

function perLaneLanes(raw) {
  return laneIds(raw).map((id) => ({
    id,
    count: metric(raw.vehicle_counts, id),
    queue: metric(raw.queue_lengths, id),
    wait: metric(raw.avg_wait_times, id),
  }));
}

function flatLanes(raw) {
  return [
    {
      id: "all",
      count: num(raw.vehicle_count),
      queue: num(raw.max_queue_length),
      wait: null,
    },
  ];
}

function present(lanes, key) {
  return lanes.map((lane) => lane[key]).filter((value) => value !== null);
}

function totals(lanes) {
  const counts = present(lanes, "count");
  const queues = present(lanes, "queue");
  const waits = present(lanes, "wait");
  return {
    count: counts.length ? counts.reduce((a, b) => a + b, 0) : null,
    queue: queues.length ? Math.max(...queues) : null,
    wait: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
  };
}

export function normalizeState(raw) {
  if (!isPlainObject(raw)) return emptyState();
  const perLane = PER_LANE_KEYS.some((key) => isPlainObject(raw[key]));
  const lanes = perLane ? perLaneLanes(raw) : flatLanes(raw);
  return {
    lanes,
    phase: str(raw.current_phase) ?? str(raw.signal_state),
    timestamp: str(raw.timestamp),
    totals: totals(lanes),
  };
}
