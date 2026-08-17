import { useEffect, useState } from "react";

// Holds a toast message string and auto-dismisses it after `duration` ms.
export function useToast(duration = 5000) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  return [toast, setToast];
}
