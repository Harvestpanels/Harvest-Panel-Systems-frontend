import { useEffect, useState } from "react";

const EMPTY_IMAGES = Object.freeze([]);
export const READY_CEILING_MS = 2500;

// Only first-view posters/logo belong here. Videos and offscreen images stream
// independently. Callers keep declarations at module scope.
export function usePageReady(imageSrcs = EMPTY_IMAGES) {
  const [completed, setCompleted] = useState(null);

  useEffect(() => {
    let active = true;
    const images = [];
    const cleanup = () => {
      clearTimeout(timer);
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute("src");
      });
    };
    const finish = () => {
      if (!active) return;
      active = false;
      cleanup();
      setCompleted(imageSrcs);
    };
    const timer = setTimeout(finish, READY_CEILING_MS);
    const loads = [...new Set(imageSrcs)].map((src) => new Promise((resolve) => {
      const image = new Image();
      images.push(image);
      image.onload = resolve;
      image.onerror = resolve;
      image.src = src;
      if (image.complete) resolve();
    }));
    Promise.all(loads).then(finish);
    return () => {
      active = false;
      cleanup();
    };
  }, [imageSrcs]);

  return completed === imageSrcs;
}
