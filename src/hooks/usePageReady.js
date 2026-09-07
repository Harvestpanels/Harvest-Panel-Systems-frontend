import { useEffect, useState } from "react";
import { CHAT_ICONS } from "../data/chatIcons";

// App chrome that lives outside any one page's tree and so can't be picked up
// by that page's own asset list. ChatWidget is mounted once in App.jsx and
// renders whichever mascot pose matches its current state, so only one of the
// three is ever in the DOM for the sweep below to find — the rest are pulled
// in here instead. Every page waits for these, because the widget is on every
// page.
const GLOBAL_CHROME_IMAGES = CHAT_ICONS;

// Nothing on the page is reachable until this resolves — PageLoader keeps a
// full-viewport overlay up, blocking all interaction, the whole time `ready`
// is false. So "ready" has to mean *genuinely* ready: every photo decoded,
// every video buffered enough to play through, fonts settled.
//
// A stalled CDN or a single dead asset must never trap a visitor behind the
// overlay forever, so the whole wait is capped (see READY_CEILING_MS). Every
// individual load also resolves on error rather than rejecting — one broken
// file degrades to "shown unloaded", never to "site never opens".
const READY_CEILING_MS = 25000;

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

function loadImage(src) {
  return new Promise((resolve) => {
    addPreloadLink(src, "image");
    const img = new Image();
    // Resolve on error too — one broken/slow asset shouldn't hang the reveal.
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

// Pulls a whole file into the HTTP cache. Used for the scroll-scrubbed
// backgrounds, where "loaded" has to mean the entire clip is local: the
// visitor can flick to the end of the timeline a second after arriving.
//
// Done with fetch rather than by watching the <video> element's own
// `buffered` ranges, because a scrubbed video defeats that measurement —
// every seek makes the browser buffer around the new position, so `buffered`
// becomes a set of scattered ranges that never merge into one span covering
// the duration. Waiting on that condition simply never resolved (measured:
// the blog page sat on the safety ceiling for the full 25s). A fetch has an
// unambiguous completion point.
function warmCache(src) {
  return fetch(src, { cache: "force-cache" })
    .then((r) => r.blob())
    // Never reject — a failed prefetch should degrade to "streams normally",
    // not to "the site never opens".
    .catch(() => {});
}

// For a video the visitor presses play on (the Specs "Our Process" clip is
// 6.3MB), HAVE_ENOUGH_DATA is the right bar: playback starts at 0 and streams
// forward from there like any normal video, so holding the whole site shut
// until every byte has arrived buys nothing.
function waitForVideoElement(el) {
  return new Promise((resolve) => {
    if (el.readyState >= 4) return resolve(); // HAVE_ENOUGH_DATA
    const done = () => {
      el.removeEventListener("canplaythrough", done);
      el.removeEventListener("error", done);
      resolve();
    };
    el.addEventListener("canplaythrough", done);
    // Resolve on error too — a dead video shouldn't hold the site shut.
    el.addEventListener("error", done);
  });
}

// Every <img> and <video> React actually rendered for this page, read back
// off the DOM rather than from a hand-kept list.
//
// The explicit `imageSrcs`/`videoSrcs` arguments still matter — they fire as
// <link rel="preload"> before React has painted anything, which is the whole
// point of a preload hint. But a hand-maintained list silently goes stale the
// moment a section is added, and it also cannot see the images that are in
// the DOM yet never fetch on their own: anything `loading="lazy"` below the
// fold, and the search view's duplicate product cards, which sit at
// `display: none` and so are never "in view" for the lazy loader to fire on.
// Sweeping the real tree covers all of that, and keeps covering it as these
// pages change.
function sweepDom() {
  const images = new Set();
  document.querySelectorAll("img").forEach((el) => {
    // .src is the resolved absolute URL and is populated from the attribute
    // immediately, unlike .currentSrc which stays empty until a load starts.
    if (el.src) images.add(el.src);
  });
  const videos = [...document.querySelectorAll("video")];
  videos.forEach((el) => {
    if (el.poster) images.add(el.poster);
  });
  return { images: [...images], videos };
}

// Both arrays must be stable references (module-level constants, same
// convention useScrollSpy's `ids` param already uses) — fresh array
// literals on every render would re-run this effect every render.
export function usePageReady(imageSrcs, videoSrcs = []) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Phase 1 — the page's declared critical assets. Kicked off synchronously
    // so their preload hints hit the network before anything else happens.
    // Videos only get the hint here; the actual waiting happens in phase 2
    // against the real <video> element (see waitForVideoElement).
    videoSrcs.forEach((src) => addPreloadLink(src, "video"));
    const declared = [...imageSrcs, ...GLOBAL_CHROME_IMAGES].map(loadImage);

    // Phase 2 — everything else the page actually rendered. This effect runs
    // after React has committed the page's tree, so the DOM is fully there to
    // read. Waiting two frames first lets any layout-effect-driven content
    // (and the browser's own first pass) settle before the sweep.
    const swept = new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return resolve();
        const { images, videos } = sweepDom();
        const already = new Set(
          [...imageSrcs, ...GLOBAL_CHROME_IMAGES].map((s) => new URL(s, window.location.href).href)
        );
        resolve(Promise.all([
          ...images.filter((s) => !already.has(s)).map(loadImage),
          ...videos.map(waitForVideoElement),
          // Scroll-scrubbed backgrounds additionally get their whole file
          // pulled down, so seeking anywhere in the timeline is instant.
          ...videos
            .filter((el) => el.classList.contains("hp-bgvideo") && el.src)
            .map((el) => warmCache(el.src)),
        ]));
      }));
    });

    // Resolves once the page's own @font-face downloads have settled (or
    // immediately, in browsers without the Font Loading API) — without this,
    // revealing before the fonts finish downloading would still show a flash
    // of the fallback font before Big Shoulders Display/Inter/JetBrains Mono
    // swap in.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    const everything = Promise.all([...declared, swept, fontsReady]);
    const ceiling = new Promise((resolve) => setTimeout(resolve, READY_CEILING_MS));

    Promise.race([everything, ceiling]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [imageSrcs, videoSrcs]);

  return ready;
}
