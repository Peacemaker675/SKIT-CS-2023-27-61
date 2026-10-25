import { useEffect, useRef, useState } from "react";
import { ALERT_TYPES, staleAlerts, transitionAlerts } from "../lib/alerts.js";

export const MAX_ALERTS = 20;
const STALE_CHECK_MS = 5000;

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// SRS Tab 1, Component 3: system-wide alert feed, newest first, last 20.
export default function AlertFeed({ intersections, liveData }) {
  const [alerts, setAlerts] = useState([]);
  const prev = useRef({});
  const stale = useRef(new Set());

  const add = (fresh) => {
    if (fresh.length) {
      setAlerts((list) => [...fresh.reverse(), ...list].slice(0, MAX_ALERTS));
    }
  };

  // Compare each changed intersection with what it was last time.
  useEffect(() => {
    const fresh = [];
    for (const [id, data] of Object.entries(liveData)) {
      if (data !== prev.current[id]) {
        fresh.push(...transitionAlerts(id, prev.current[id], data));
      }
    }
    prev.current = liveData;
    add(fresh);
  }, [liveData]);

  // A feed going quiet sends no update, so check on a timer.
  useEffect(() => {
    const id = setInterval(() => {
      const result = staleAlerts(prev.current, stale.current);
      stale.current = result.staleIds;
      add(result.alerts);
    }, STALE_CHECK_MS);
    return () => clearInterval(id);
  }, []);

  const names = Object.fromEntries(
    intersections.map((i) => [i.id, i.name || i.id]),
  );

  return (
    <section className="panel alert-feed" aria-live="polite">
      <h2>Alerts</h2>
      {alerts.length === 0 ? (
        <p className="muted">No alerts yet.</p>
      ) : (
        <ol>
          {alerts.map((a) => (
            <li key={a.key} className={`alert alert-${a.type}`}>
              <time dateTime={new Date(a.time).toISOString()}>
                {formatTime(a.time)}
              </time>
              <span className="alert-type">{ALERT_TYPES[a.type]}</span>
              <span className="alert-text">
                {names[a.intersectionId] || a.intersectionId}: {a.message}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
