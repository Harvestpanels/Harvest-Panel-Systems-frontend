import { useEffect, useRef, useState } from "react";

const GALLERY_GAP_PX = 16;

// Manages the responsive column count, slide offset (in px), and current
// index for the horizontally-sliding photo gallery track.
export function useGalleryCarousel(images) {
  const galleryViewportRef = useRef(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryCols, setGalleryCols] = useState(3);
  const [galleryStepPx, setGalleryStepPx] = useState(0);

  useEffect(() => {
    // Single breakpoint, matching every other card grid on the page
    // (.hp-panel-grid in PanelSection.css, .hp-cards in WhoWeAre.css/
    // Sustainability.css — all go straight from their full column count
    // to one full-width column at 1024px, with no smaller intermediate
    // step). This used to have its own separate 640px/1024px two-tier
    // breakpoint, giving a 2-column layout across the whole tablet range
    // — at 768px wide, that rendered a gallery card barely 300px across
    // while the full-width panel cards right above it hit 480px, a
    // visibly much smaller card in the one section that didn't match
    // the rest of the page's mobile/tablet sizing.
    const query = window.matchMedia("(max-width: 1024px)");

    function updateCols() {
      const cols = query.matches ? 1 : 3;
      setGalleryCols(cols);
      setGalleryIndex((i) => Math.min(i, Math.max(0, images.length - cols)));
    }

    updateCols();
    query.addEventListener("change", updateCols);
    return () => query.removeEventListener("change", updateCols);
  }, [images.length]);

  // Measure the real rendered width so the slide offset is computed in px —
  // a transform translateX(%) would be relative to the (much wider) track's
  // own width, not the visible viewport, so it can't be used here.
  useEffect(() => {
    const viewport = galleryViewportRef.current;
    if (!viewport) return;

    function measure() {
      const cs = getComputedStyle(viewport);
      const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const trackWidth = viewport.clientWidth - paddingX;
      const itemWidth = (trackWidth - GALLERY_GAP_PX * (galleryCols - 1)) / galleryCols;
      setGalleryStepPx(itemWidth + GALLERY_GAP_PX);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [galleryCols]);

  const galleryMaxIndex = Math.max(0, images.length - galleryCols);
  const galleryNext = () => setGalleryIndex((i) => Math.min(i + 1, galleryMaxIndex));
  const galleryPrev = () => setGalleryIndex((i) => Math.max(i - 1, 0));

  return {
    galleryViewportRef,
    galleryIndex,
    galleryCols,
    galleryStepPx,
    galleryMaxIndex,
    galleryNext,
    galleryPrev,
  };
}
