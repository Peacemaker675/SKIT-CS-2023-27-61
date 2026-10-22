// Dev-only fake live feed, enabled with VITE_USE_MOCKS=true. Emits an
// SRS-shaped state for each subscribed intersection every 2s through the
// same (id, data) callback as subscribeToIntersections, so the dashboard
// can be worked on without a backend.
//
// Values follow a slow sine wave per intersection (offset so they don't
// move together) and sweep through smooth / moderate / heavy. The flat
// max_queue_length and lane_occupancy fields are included because
// congestionLevel reads those, not the per-lane maps.

export const MOCK_INTERVAL_MS = 2000;
export const MOCK_LANES = ["N", "E", "S", "W"];
export const PHASE_SECONDS = 10;

// One full smooth -> heavy -> smooth cycle every 20 ticks (40s).
const CYCLE_TICKS = 20;

function round(value, places = 1) {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

// Load between 0 and 1 for an intersection at a given tick.
export function loadAt(tick, offset) {
  return (Math.sin(((tick + offset) / CYCLE_TICKS) * 2 * Math.PI) + 1) / 2;
}

export function buildMockState(tick, offset, now = Date.now()) {
  const load = loadAt(tick, offset);
  const vehicle_counts = {};
  const queue_lengths = {};
  const avg_wait_times = {};
  MOCK_LANES.forEach((lane, i) => {
    // Small fixed spread between lanes so they aren't identical.
    const laneLoad = Math.min(1, load * (0.7 + i * 0.1));
    vehicle_counts[lane] = Math.round(2 + laneLoad * 30);
    queue_lengths[lane] = round(laneLoad * 40);
    avg_wait_times[lane] = round(5 + laneLoad * 60);
  });

  // Green rotates between lanes every PHASE_SECONDS of wall-clock time.
  const phaseMs = PHASE_SECONDS * 1000;
  const phaseIndex = Math.floor(now / phaseMs) + offset;
  const lane = MOCK_LANES[phaseIndex % MOCK_LANES.length];
  const phaseEnd = (Math.floor(now / phaseMs) + 1) * phaseMs;

  return {
    timestamp: new Date(now).toISOString(),
    vehicle_counts,
    queue_lengths,
    avg_wait_times,
    current_phase: `${lane}_GREEN`,
    phase_end: new Date(phaseEnd).toISOString(),
    max_queue_length: Math.max(...Object.values(queue_lengths)),
    lane_occupancy: round(load, 2),
  };
}

export function subscribeToMockIntersections(ids, onUpdate) {
  let tick = 0;
  const emit = () => {
    ids.forEach((id, i) => onUpdate(id, buildMockState(tick, i * 5)));
    tick += 1;
  };
  emit();
  const timer = setInterval(emit, MOCK_INTERVAL_MS);
  return () => clearInterval(timer);
}
