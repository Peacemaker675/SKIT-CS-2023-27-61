import { useId, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from "../i18n/i18n.js";
import { buildGraph } from "../lib/graph.js";
import {
  VEHICLE_TYPES,
  canManageEmergencies,
  hasErrors,
  routePreview,
  startRequest,
  validate,
} from "../lib/emergencyForm.js";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { useDialog } from "./useDialog.js";

function Field({ id, label, error, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Modal form to start an emergency green corridor: vehicle type, start and
// end intersection, a live route preview, then a confirmation before
// onStart(body) is called. Operator and Admin only. Render it only while
// open; onClose is called on cancel and after a successful start.
export default function EmergencyForm({ intersections, onStart, onClose }) {
  const { user } = useAuth();
  const { lang, t } = useT();
  const [type, setType] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState(null);
  const ref = useDialog({ onClose: () => !busy && onClose() });
  const titleId = useId();
  const ids = { type: useId(), start: useId(), end: useId() };

  const graph = useMemo(() => buildGraph(intersections).graph, [intersections]);
  const sorted = useMemo(
    () => [...intersections].sort((a, b) => a.id.localeCompare(b.id)),
    [intersections],
  );
  const errors = validate({ start, end, type, graph });
  const preview = routePreview(intersections, graph, start, end);

  if (!canManageEmergencies(user?.role)) return null;

  // Missing fields only count after a submit attempt; a bad start/end pair
  // is shown as soon as both are chosen.
  const shown = submitted
    ? errors
    : errors.end && errors.end !== "required"
      ? { end: errors.end }
      : {};
  const message = (field) =>
    shown[field] ? t(`emergency.errors.${shown[field]}`) : null;
  const nameOf = (id) => intersections.find((i) => i.id === id)?.name || id;

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setApiError(null);
    if (!hasErrors(errors)) setConfirming(true);
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      await onStart(startRequest({ start, end, type }));
      onClose();
    } catch (err) {
      setApiError(t("emergency.errors.failed", { reason: err.message }));
      setConfirming(false);
      setBusy(false);
    }
  }

  const select = (field, value, setValue, options) => (
    <select
      id={ids[field]}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      aria-invalid={shown[field] ? true : undefined}
      aria-describedby={shown[field] ? `${ids[field]}-error` : undefined}
      disabled={busy}
    >
      <option value="">{t("emergency.choose")}</option>
      {options}
    </select>
  );

  const intersectionOptions = sorted.map((i) => (
    <option key={i.id} value={i.id}>
      {i.name ? `${i.name} (${i.id})` : i.id}
    </option>
  ));

  return (
    <>
      <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
        <div
          ref={ref}
          className="modal emergency-form"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 id={titleId}>{t("emergency.formTitle")}</h2>
          <p className="muted">{t("emergency.formText")}</p>

          <form onSubmit={handleSubmit} noValidate>
            <Field
              id={ids.type}
              label={t("emergency.vehicleType")}
              error={message("type")}
            >
              {select(
                "type",
                type,
                setType,
                VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`emergency.vehicles.${v}`)}
                  </option>
                )),
              )}
            </Field>
            <Field
              id={ids.start}
              label={t("emergency.from")}
              error={message("start")}
            >
              {select("start", start, setStart, intersectionOptions)}
            </Field>
            <Field
              id={ids.end}
              label={t("emergency.to")}
              error={message("end")}
            >
              {select("end", end, setEnd, intersectionOptions)}
            </Field>

            {preview && (
              <section className="route-preview" aria-live="polite">
                <h3>
                  {t("emergency.routePreview")}
                  <span className="muted">
                    {" · "}
                    {t("emergency.stops", { n: preview.stops.length })}
                    {preview.distanceKm !== null &&
                      ` · ${t("emergency.distance", {
                        km: preview.distanceKm.toLocaleString(
                          lang === "hi" ? "hi-IN" : "en-IN",
                          { maximumFractionDigits: 1 },
                        ),
                      })}`}
                  </span>
                </h3>
                <ol>
                  {preview.stops.map((stop) => (
                    <li key={stop.id}>{stop.name}</li>
                  ))}
                </ol>
              </section>
            )}

            {apiError && (
              <p className="error" role="alert">
                {apiError}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={onClose}
                disabled={busy}
              >
                {t("emergency.cancel")}
              </button>
              <button type="submit" className="danger" disabled={busy}>
                {busy ? t("emergency.starting") : t("emergency.submit")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={t("emergency.confirmTitle")}
          message={t("emergency.confirmText", {
            vehicle: t(`emergency.vehicles.${type}`),
            from: nameOf(start),
            to: nameOf(end),
            n: preview ? preview.stops.length : 0,
          })}
          confirmLabel={busy ? t("emergency.starting") : t("emergency.confirm")}
          cancelLabel={t("emergency.cancel")}
          danger
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
