import { useState } from "react";
import { useT } from "../i18n/i18n.js";
import { vehicleLetter } from "../lib/vehicles.js";
import { corridorStatus, emergencyColor } from "../lib/corridor.js";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";

export function formatStartTime(iso, lang) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(lang === "hi" ? "hi-IN" : "en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Active emergency corridors: vehicle, from -> to, start time and the status
// of every intersection on the route. Clicking an emergency selects it (the
// map zooms to its route); Clear and Cancel end it after a confirmation.
// onClear / onCancel return promises and throw on failure.
export default function EmergencyPanel({
  emergencies,
  intersections,
  error,
  loading,
  selectedId,
  onSelect,
  onClear,
  onCancel,
}) {
  const { lang, t } = useT();
  // { kind: "clear" | "cancel", emergency } while a confirmation is open.
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const nameOf = (id) => intersections.find((i) => i.id === id)?.name || id;
  const vehicleOf = (e) => t(`emergency.vehicles.${e.vehicle_type}`);

  async function runPending() {
    const { kind, emergency } = pending;
    setBusy(true);
    setActionError(null);
    try {
      await (kind === "clear" ? onClear : onCancel)(emergency.id);
      if (selectedId === emergency.id) onSelect(null);
    } catch (err) {
      setActionError(
        t("emergency.actionFailed", { id: emergency.id, reason: err.message }),
      );
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  let body;
  if (error) {
    body = (
      <p className="error">{t("emergency.loadFailed", { reason: error })}</p>
    );
  } else if (loading) {
    body = <p className="muted">{t("common.loading")}</p>;
  } else if (!emergencies.length) {
    body = <p className="muted">{t("emergency.none")}</p>;
  } else {
    body = (
      <ul>
        {emergencies.map((e) => {
          const color = emergencyColor(e.id);
          const vehicle = vehicleOf(e);
          const selected = e.id === selectedId;
          return (
            <li
              key={e.id}
              className={`emergency-item${selected ? " selected" : ""}`}
              style={{ "--corridor": color }}
            >
              <button
                type="button"
                className="emergency-row"
                aria-pressed={selected}
                aria-label={t("emergency.showOnMap", { vehicle, id: e.id })}
                onClick={() => onSelect(selected ? null : e.id)}
              >
                <span className="vehicle-chip" aria-hidden="true">
                  {vehicleLetter(e.vehicle_type)}
                </span>
                <span className="emergency-main">
                  <strong>{vehicle}</strong>{" "}
                  <span className="muted">{e.id}</span>
                  <span className="emergency-route">
                    {nameOf(e.start_id)} → {nameOf(e.end_id)}
                  </span>
                </span>
                <time dateTime={e.started_at} className="muted">
                  {formatStartTime(e.started_at, lang)}
                </time>
              </button>

              <ol
                className="corridor-steps"
                aria-label={t("emergency.corridorLabel", { id: e.id })}
              >
                {corridorStatus(e).map(({ id, status }) => (
                  <li
                    key={id}
                    className={`corridor-step step-${status}`}
                    title={nameOf(id)}
                  >
                    <span className="step-id">{id}</span>
                    <span className="step-status">
                      {t(`emergency.status.${status}`)}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="emergency-actions">
                <button
                  type="button"
                  className="secondary small"
                  aria-label={t("emergency.clearLabel", { vehicle, id: e.id })}
                  onClick={() => setPending({ kind: "clear", emergency: e })}
                >
                  {t("emergency.clear")}
                </button>
                <button
                  type="button"
                  className="secondary small"
                  aria-label={t("emergency.cancelLabel", { vehicle, id: e.id })}
                  onClick={() => setPending({ kind: "cancel", emergency: e })}
                >
                  {t("emergency.cancelRun")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="panel emergency-panel">
      <h2>{t("emergency.panelTitle")}</h2>
      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}
      <div aria-live="polite">{body}</div>

      {pending && (
        <ConfirmDialog
          title={t(`emergency.${pending.kind}Title`)}
          confirmLabel={
            busy
              ? t("emergency.working")
              : t(`emergency.${pending.kind}Confirm`)
          }
          danger={pending.kind === "cancel"}
          confirmDisabled={busy}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        >
          <p>
            {t(`emergency.${pending.kind}Text`, {
              vehicle: vehicleOf(pending.emergency),
              id: pending.emergency.id,
              to: nameOf(pending.emergency.end_id),
            })}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
