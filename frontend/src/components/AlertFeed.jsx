import { useEffect, useRef, useState } from "react";
import {
  dedupeAlerts,
  serverAlert,
  staleAlerts,
  transitionAlerts,
} from "../lib/alerts.js";
import { subscribeToServerAlerts } from "../realtime/alerts.js";
import { useT } from "../i18n/i18n.js";

export const MAX_ALERTS = 20;
const STALE_CHECK_MS = 5000;

function formatTime(ms, lang) {
  return new Date(ms).toLocaleTimeString(lang === "hi" ? "hi-IN" : "en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// SRS Tab 1, Component 3: system-wide alert feed, newest first, last 20.
export default function AlertFeed({ intersections, liveData }) {
  const { lang, t } = useT();
  const [alerts, setAlerts] = useState([]);
  const prev = useRef({});
  const stale = useRef(new Set());
  const seen = useRef(new Map());

  const add = (fresh) => {
    const result = dedupeAlerts(fresh, seen.current);
    seen.current = result.seen;
    const newest = result.alerts.reverse();
    if (newest.length) {
      setAlerts((list) => [...newest, ...list].slice(0, MAX_ALERTS));
    }
  };

  const dismiss = (key) => {
    setAlerts((list) => list.filter((a) => a.key !== key));
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

  useEffect(
    () =>
      subscribeToServerAlerts((msg) => {
        const pushed = serverAlert(msg);
        if (pushed) add([pushed]);
      }),
    [],
  );

  const names = Object.fromEntries(
    intersections.map((i) => [i.id, i.name || i.id]),
  );

  return (
    <section className="panel alert-feed" aria-live="polite">
      <div className="alert-feed-header">
        <h2>{t("alerts.title")}</h2>
        {alerts.length > 0 && (
          <button
            type="button"
            className="alert-clear"
            onClick={() => setAlerts([])}
          >
            {t("alerts.clearAll")}
          </button>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="muted">{t("alerts.empty")}</p>
      ) : (
        <ol>
          {alerts.map((a) => (
            <li key={a.key} className={`alert alert-${a.type}`}>
              <time dateTime={new Date(a.time).toISOString()}>
                {formatTime(a.time, lang)}
              </time>
              <span className="alert-type">{t(`alerts.types.${a.type}`)}</span>
              <span className="alert-text">
                {a.intersectionId &&
                  `${names[a.intersectionId] || a.intersectionId}: `}
                {a.type === "server"
                  ? a.message
                  : t(`alerts.messages.${a.type}`)}
              </span>
              <button
                type="button"
                className="alert-dismiss"
                aria-label={t("alerts.dismiss")}
                title={t("alerts.dismiss")}
                onClick={() => dismiss(a.key)}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
