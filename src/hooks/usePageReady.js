import { useEffect, useState } from "react";

// Adds a <link rel="preload"> hint to <head> for one asset, so the browser
// starts fetching it at high priority immediately rather than discovering
// it only once React actually renders the <img>/<video> that uses it.
// Left in the document afterward (not cleaned up) — a stray preload hint
// for an asset that's already cached is harmless, and removing it right as
// the fetch it kicked off is still in flight risks the browser deciding it
// no longer needs to finish.
function addPreloadLink(href, as) {
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = as;
  link.href = href;
  document.head.appendChild(link);
}

// Waits for this page's critical first-view images (the hero background
// image/poster, plus the site's web fonts) to actually finish loading
// before flipping `ready` to true. `videoSrcs` gets the same <link
// rel="preload"> treatment so the browser starts fetching each video at
// high priority right away, but is deliberately NOT awaited — a
// background video can be several MB, and blocking the reveal on a full
// video download would trade a flash of missing content for several
// seconds of blank loading screen, which is worse than what this hook
// exists to fix. The video keeps loading/buffering in the background
// regardless of `ready`; its own `poster` attribute (one of the images
// this hook DOES wait for) already covers the gap until it has enough
// buffered to actually play/scrub.
//
// Both arrays must be stable references (module-level constants, same
// convention useScrollSpy's `ids` param already uses) — fresh array
// literals on every render would re-run this effect every render.
export function usePageReady(imageSrcs, videoSrcs = []) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    videoSrcs.forEach((src) => addPreloadLink(src, "video"));

    const images = imageSrcs.map(
      (src) =>
        new Promise((resolve) => {
          addPreloadLink(src, "image");
          const img = new Image();
          // Resolve on error too — one broken/slow asset shouldn't hang
          // the reveal forever.
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    );

    // Resolves once the page's own @font-face downloads have settled (or
    // immediately, in browsers without the Font Loading API) — without
    // this, revealing before the fonts finish downloading would still
    // show a flash of the fallback font before Big Shoulders Display/
    // Inter/JetBrains Mono swap in.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    Promise.all([...images, fontsReady]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [imageSrcs, videoSrcs]);

  return ready;
}
