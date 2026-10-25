import { useEffect, useRef, useState } from "react";
import {
  formatDuration,
  secondsElapsed,
  secondsRemaining,
} from "../lib/phaseTimer.js";
import { useT } from "../i18n/i18n.js";

// Current green phase for an intersection. Counts down to `phaseEnd` when the
// backend sends it, otherwise counts up from when `phase` last changed here
// (so elapsed time starts at the first update this page saw, not the real
// phase start).
export default function SignalPhaseIndicator({ phase, phaseEnd }) {
  const { t } = useT();
  const [now, setNow] = useState(() => Date.now());
  const changedAt = useRef({ phase, at: Date.now() });

  if (changedAt.current.phase !== phase) {
    changedAt.current = { phase, at: Date.now() };
  }

  // One ticker for the component's lifetime.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!phase) {
    return (
      <div className="phase-indicator phase-unknown">
        <span className="phase-dot" aria-hidden="true" />
        <span className="phase-label">{t("phase.unknown")}</span>
      </div>
    );
  }

  const remaining = secondsRemaining(phaseEnd, now);
  const timer =
    remaining !== null
      ? t("phase.left", { time: formatDuration(remaining) })
      : t("phase.elapsed", {
          time: formatDuration(secondsElapsed(changedAt.current.at, now)),
        });

  return (
    <div className="phase-indicator">
      <span className="phase-dot" aria-hidden="true" />
      <span className="phase-label">
        {t("phase.green")} <strong>{phase}</strong>
      </span>
      <span className="phase-timer">{timer}</span>
    </div>
  );
}
