import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";
import "./Toast.css";

// Lower-left notification stack for the portal, in the site's own toast
// design (the dark glass card the home page contact form used, see Toast.css).
// Errors stay up longer than confirmations, both pause while hovered or
// focused, and at most three show at once.
const DURATION = { error: 8000, ok: 5000 };
const MAX_VISIBLE = 3;
const EXIT_MS = 180;

let nextId = 1;

function ToastItem({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION[toast.type] ?? DURATION.ok);
  const startedAt = useRef(0);

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), EXIT_MS);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (paused || leaving) return;
    startedAt.current = Date.now();
    const timer = setTimeout(close, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, leaving, close]);

  return (
    <li
      className={`hp-toast hp-toast--${toast.type}${leaving ? " is-leaving" : ""}`}
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="hp-toast__icon" aria-hidden="true">{toast.type === "error" ? "!" : "✓"}</span>
      <p className="hp-toast__text">{toast.text}</p>
      {toast.action && (
        <button type="button" className="hp-toast__action" onClick={() => { toast.action.onClick(); close(); }}>
          {toast.action.label}
        </button>
      )}
      <button type="button" className="hp-toast__close" aria-label="Dismiss notification" onClick={close}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </button>
    </li>
  );
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((text, { type = "error", action } = {}) => {
    if (!text) return;
    setToasts((list) => {
      // The same message again (e.g. a retry that failed the same way)
      // replaces the old one instead of stacking a duplicate.
      const rest = list.filter((t) => t.text !== text);
      return [...rest, { id: nextId++, text, type, action }].slice(-MAX_VISIBLE);
    });
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol className="hp-toasts" aria-label="Notifications">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </ol>
    </ToastContext.Provider>
  );
}
