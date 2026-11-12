import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "../../i18n/i18n.js";

const FOCUSABLE =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)";

// Modal confirmation. Render it only while open: mounting moves focus inside,
// unmounting puts focus back where it was. Tab stays inside and Esc cancels.
// `children` is the body, which may hold form fields.
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useT();
  const box = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    box.current.querySelector(FOCUSABLE)?.focus();
    return () => opener?.focus?.();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...box.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="dialog-backdrop">
      <div
        ref={box}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={danger ? "danger" : undefined}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
