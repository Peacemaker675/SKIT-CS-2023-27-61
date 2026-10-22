// Pure helpers for the signal phase timer (SignalPhaseIndicator).

// Seconds as "mm:ss"; minutes keep growing past 59. Null for bad input.
export function formatDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Whole seconds left until `phaseEnd` (ISO string), clamped at 0.
// Null when phaseEnd is missing or unparseable.
export function secondsRemaining(phaseEnd, now = Date.now()) {
  if (!phaseEnd) return null;
  const end = Date.parse(phaseEnd);
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

// Whole seconds since `since` (ms timestamp), clamped at 0.
export function secondsElapsed(since, now = Date.now()) {
  if (typeof since !== "number" || !Number.isFinite(since)) return null;
  return Math.max(0, Math.floor((now - since) / 1000));
}
