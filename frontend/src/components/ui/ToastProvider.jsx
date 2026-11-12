import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export const TOAST_MS = 4000;

const ToastContext = createContext(null);

// Short success / error messages at the corner of the screen. Screen readers
// hear them through the polite live region.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const show = useCallback((kind, text) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((list) => [...list, { id, kind, text }]);
    setTimeout(() => {
      setToasts((list) => list.filter((toast) => toast.id !== id));
    }, TOAST_MS);
  }, []);

  const api = useMemo(
    () => ({
      success: (text) => show("success", text),
      error: (text) => show("error", text),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className={`toast toast-${toast.kind}`}>
            {toast.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast needs a ToastProvider");
  return api;
}
