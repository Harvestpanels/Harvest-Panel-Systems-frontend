import { useState } from "react";

// Tracks which gallery photo the lightbox is showing and whether it's open.
export function useLightbox(length) {
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = (i) => { setLightboxIndex(i); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const lightboxNext = () => setLightboxIndex((i) => Math.min(i + 1, length - 1));
  const lightboxPrev = () => setLightboxIndex((i) => Math.max(i - 1, 0));

  return { lightboxIndex, lightboxOpen, openLightbox, closeLightbox, lightboxNext, lightboxPrev };
}
