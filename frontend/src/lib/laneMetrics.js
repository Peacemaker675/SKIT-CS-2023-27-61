// Display helpers for the per-lane table (lanes come from normalizeState).

export function laneLabel(id) {
  return id === "all" ? "All lanes" : id;
}

// Numbers only; anything else shows as "—". Decimals are trimmed to one place.
export function formatMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
