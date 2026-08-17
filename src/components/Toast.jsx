import "./Toast.css";

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="hp-toast hp-toast--error" role="alert" aria-live="assertive">
      <span className="hp-toast__icon" aria-hidden="true">!</span>
      <p>{toast}</p>
      <button type="button" className="hp-toast__close" onClick={onClose} aria-label="Dismiss notification">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
