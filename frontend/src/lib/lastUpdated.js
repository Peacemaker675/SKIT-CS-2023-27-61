// Pure helpers for the "Last updated Xs ago" indicator.

export const STALE_AFTER_MS = 30 * 1000;

// Accepts an ISO string or epoch milliseconds; returns ms or null.
export function toMillis(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === "") {
    return null;
  }
  const ms = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  return Number.isFinite(ms) ? ms : null;
}

// "5s" below a minute, "3m" from a minute on. Future times clamp to 0s.
export function formatAge(ageMs) {
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

export function lastUpdatedInfo(timestamp, now = Date.now()) {
  const ms = toMillis(timestamp);
  if (ms === null)
    return { label: "No updates yet", stale: false, ageMs: null };
  const age = now - ms;
  return {
    label: `Last updated ${formatAge(age)} ago`,
    stale: age > STALE_AFTER_MS,
    ageMs: age,
  };
}
