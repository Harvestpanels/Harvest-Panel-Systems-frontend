import { useEffect } from "react";
import { useToast } from "./toastContext";

// Drop-in for the old inline message boxes: render <Notify text={error} />
// where `{error && <p className="hp-portal-msg">}` used to be, and the message
// pops up in the lower-left notification stack each time `text` changes to a
// new value. Outside a ToastProvider (unit tests render pages bare) it falls
// back to the inline box, so behaviour and assertions stay the same.
export default function Notify({ text, type = "error", action }) {
  const toast = useToast();
  useEffect(() => {
    if (toast && text) toast.show(text, { type, action });
    // `action` is a fresh object each render; only a new message should fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, text, type]);

  if (toast || !text) return null;
  return (
    <p className={`hp-portal-msg hp-portal-msg--${type === "ok" ? "ok" : "error"}`} role={type === "ok" ? "status" : "alert"}>
      {text}
      {action && <> <button type="button" className="hp-btn hp-btn--ghost" onClick={action.onClick}>{action.label}</button></>}
    </p>
  );
}
