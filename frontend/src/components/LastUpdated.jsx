import { useEffect, useState } from "react";
import { lastUpdatedInfo } from "../lib/lastUpdated.js";
import { useT } from "../i18n/i18n.js";

// "Last updated Xs ago" with a Stale badge once 30s pass without an update.
export default function LastUpdated({ timestamp }) {
  const { t } = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { ageMs, stale } = lastUpdatedInfo(timestamp, now);
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  const label =
    ageMs === null
      ? t("lastUpdated.never")
      : seconds < 60
        ? t("lastUpdated.seconds", { n: seconds })
        : t("lastUpdated.minutes", { n: Math.floor(seconds / 60) });

  return (
    <span className="last-updated">
      <span>{label}</span>
      {stale && <span className="stale-badge">{t("lastUpdated.stale")}</span>}
    </span>
  );
}
