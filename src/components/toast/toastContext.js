import { createContext, useContext } from "react";

// Portal notifications (see ToastProvider). Kept apart from the component file
// so react-refresh can hot-reload the provider on its own.
export const ToastContext = createContext(null);

/** `{ show(text, { type, action }) }`, or null outside a ToastProvider. */
export function useToast() {
  return useContext(ToastContext);
}
