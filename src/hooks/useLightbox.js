import { useState } from "react";
import { usePresence } from "./usePresence.js";

// Tracks which gallery photo the lightbox is showing and whether it's open.
// `lightboxMounted`/`lightboxClosing`/`onLightboxExited` keep it rendered
// through its exit animation (see usePresence).
export function useLightbox(length) {
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = (i) => { setLightboxIndex(i); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const lightboxNext = () => setLightboxIndex((i) => Math.min(i + 1, length - 1));
  const lightboxPrev = () => setLightboxIndex((i) => Math.max(i - 1, 0));

  const presence = usePresence(lightboxOpen);

  return {
    lightboxIndex, lightboxOpen,
    lightboxMounted: presence.mounted, lightboxClosing: presence.closing, onLightboxExited: presence.onExited,
    openLightbox, closeLightbox, lightboxNext, lightboxPrev,
  };
}
