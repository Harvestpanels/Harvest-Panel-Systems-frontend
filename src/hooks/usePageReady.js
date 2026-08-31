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

// Waits for every one of this page's own photos to finish loading, plus
// its video(s) reaching "ready to play" (not necessarily 100% of the file
// — see below), plus the site's web fonts, before flipping `ready` to
// true. Nothing on the page is reachable until this resolves (see
// PageLoader, which blocks all interaction the whole time `ready` is
// false) — the point is that a visitor never gets in before what's
// actually on the page has loaded.
//
// Videos wait for `loadeddata` (the point a video has decoded and can
// render its current frame — effectively "this video is real and ready",
// the same bar a poster-image swap-in would clear) rather than the entire
// file finishing download. A background video can run many MB; requiring
// every last byte before reveal would frequently mean a much longer wait
// for marginal benefit, since scroll-scrubbing only ever needs the frame
// currently being seeked to, not the whole file at once — `loadeddata`
// is the point playback is genuinely usable, which is what "loaded"
// actually means for a video used this way.
//
// Both arrays must be stable references (module-level constants, same
// convention useScrollSpy's `ids` param already uses) — fresh array
// literals on every render would re-run this effect every render.
export function usePageReady(imageSrcs, videoSrcs = []) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

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

    // Throwaway probe elements, each torn down as soon as it has answered
    // "is this video renderable yet" — see `finish` below.
    const releaseProbes = [];

    const videos = videoSrcs.map(
      (src) =>
        new Promise((resolve) => {
          addPreloadLink(src, "video");
          const video = document.createElement("video");
          video.preload = "auto";
          video.muted = true;
          // `preload="auto"` is what gets us as far as `loadeddata`, but it
          // also means this detached probe keeps pulling the *whole* file
          // long after that — while the real <video> on the page downloads
          // the very same file itself. On the Specs page that is a 6.3MB
          // production clip fetched twice over, and the probe's leftover
          // request only ever stopped whenever garbage collection got
          // around to it (which surfaced as a stream of stray
          // net::ERR_ABORTED media requests). Releasing it here ends that
          // download at a deterministic point instead, right after it has
          // served its only purpose. Gating on `loadeddata` rather than a
          // complete download is the same contract as before — the frame
          // is decoded and the video is genuinely renderable.
          const finish = () => {
            video.removeEventListener("loadeddata", finish);
            video.removeEventListener("error", finish);
            video.removeAttribute("src");
            video.load();
            resolve();
          };
          releaseProbes.push(finish);
          video.addEventListener("loadeddata", finish);
          video.addEventListener("error", finish);
          video.src = src;
          video.load();
        })
    );

    // Resolves once the page's own @font-face downloads have settled (or
    // immediately, in browsers without the Font Loading API) — without
    // this, revealing before the fonts finish downloading would still
    // show a flash of the fallback font before Big Shoulders Display/
    // Inter/JetBrains Mono swap in.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    Promise.all([...images, ...videos, fontsReady]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      // Navigating away mid-load: stop any probe still downloading rather
      // than leaving it to finish a file nobody is waiting on any more.
      releaseProbes.forEach((release) => release());
    };
  }, [imageSrcs, videoSrcs]);

  return ready;
}
