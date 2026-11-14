import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// Keyboard behaviour for a modal dialog: focus moves into it on open
// (`initialFocus` ref, else the first focusable element), Tab / Shift+Tab
// stay inside it, Esc calls onClose, and focus returns to whatever was
// focused before when it closes. Attach the returned ref to the dialog box.
//
// Only the top-most dialog reacts, so a confirm dialog opened over a form
// dialog handles Esc / Tab itself.
const openDialogs = [];

export function useDialog({ onClose, initialFocus } = {}) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const previous = document.activeElement;
    openDialogs.push(node);

    const target =
      initialFocus?.current || node.querySelector(FOCUSABLE) || node;
    target.focus();

    function onKeyDown(event) {
      if (openDialogs[openDialogs.length - 1] !== node) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!node.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openDialogs.splice(openDialogs.indexOf(node), 1);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
    // Runs once per open; initialFocus is a ref and read on mount only.
  }, []);

  return ref;
}
