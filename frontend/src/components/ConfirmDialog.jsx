import { useId, useRef } from "react";
import { useDialog } from "./useDialog.js";

// Reusable yes/no dialog. Render it only while open. The confirm button gets
// focus first, Esc or the backdrop cancels, and Tab stays inside the dialog.
// `danger` styles the confirm button for actions like starting an emergency.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const cancel = () => {
    if (!busy) onCancel();
  };
  const ref = useDialog({ onClose: cancel, initialFocus: confirmRef });
  const titleId = useId();
  const textId = useId();

  return (
    <div className="modal-backdrop" onMouseDown={cancel}>
      <div
        ref={ref}
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={textId}>{message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="secondary"
            onClick={cancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? "danger" : undefined}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
