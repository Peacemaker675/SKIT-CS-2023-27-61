import { useEffect, useState } from "react";
import { lastUpdatedInfo } from "../lib/lastUpdated.js";

// "Last updated Xs ago" with a Stale badge once 30s pass without an update.
export default function LastUpdated({ timestamp }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { label, stale } = lastUpdatedInfo(timestamp, now);

  return (
    <span className="last-updated">
      <span>{label}</span>
      {stale && <span className="stale-badge">Stale</span>}
    </span>
  );
}
