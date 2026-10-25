// Client-side alert rules for the Live tab alert feed (SRS Tab 1, Component 3).
//
// Until the backend sends its own `alert` socket event, alerts are worked out
// here by comparing each intersection's previous and new state. Each rule
// fires on the change only, not on every update while it stays true.

import { congestionLevel } from "./congestion.js";
import { STALE_AFTER_MS, toMillis } from "./lastUpdated.js";

export const ALERT_TYPES = {
  heavy: "Heavy congestion",
  stale: "Feed stale",
  event: "Special event",
  manual: "Manual mode",
};

let seq = 0;

function alert(type, intersectionId, message, time) {
  seq += 1;
  return { key: `${time}-${seq}`, type, intersectionId, message, time };
}

// The signal is under manual control. No field for this is agreed yet, so
// accept a `control_mode` of "manual" or a phase / signal state naming it.
export function isManual(data) {
  if (!data) return false;
  if (data.control_mode === "manual") return true;
  return [data.current_phase, data.signal_state].some(
    (v) => typeof v === "string" && /manual/i.test(v),
  );
}

// Alerts raised by one intersection going from `prev` to `next` state.
export function transitionAlerts(intersectionId, prev, next, now = Date.now()) {
  if (!next) return [];
  const alerts = [];
  if (congestionLevel(prev) !== "heavy" && congestionLevel(next) === "heavy") {
    alerts.push(
      alert("heavy", intersectionId, "Congestion rose to Heavy", now),
    );
  }
  if (!prev?.has_special_event && next.has_special_event === true) {
    alerts.push(alert("event", intersectionId, "Special event reported", now));
  }
  if (!isManual(prev) && isManual(next)) {
    alerts.push(
      alert("manual", intersectionId, "Signal switched to manual", now),
    );
  }
  return alerts;
}

// Alerts for intersections whose feed has gone quiet for over 30s.
// `staleIds` is the set already alerted on; returns the new set too, so an
// intersection alerts again only after it has recovered and gone stale again.
export function staleAlerts(liveData, staleIds, now = Date.now()) {
  const alerts = [];
  const nextStale = new Set();
  for (const [id, data] of Object.entries(liveData)) {
    const ms = toMillis(data?.timestamp);
    if (ms === null || now - ms <= STALE_AFTER_MS) continue;
    nextStale.add(id);
    if (!staleIds.has(id)) {
      alerts.push(alert("stale", id, "No update for over 30s", now));
    }
  }
  return { alerts, staleIds: nextStale };
}
