import { useEffect, useRef } from "react";

// Scroll-scrubbed background video: the clip stays paused and its
// currentTime is driven directly off scroll progress, so the footage
// visibly advances as you scroll instead of autoplaying on a loop.
//
// This was previously copy-pasted four times (the home page's
// useHeroParallax plus Products/Specs/Blog), which meant every fix had to
// be made four times and the copies had already drifted apart. The scrub
// itself now lives here once; useHeroParallax still owns its own scroll
// listener because it drives hero-fade/curtain-parallax/nav-hide off the
// same tick, so it feeds progress in rather than using the hook below.

// A scrub can never display anything between two encoded frames, so the
// smallest seek worth issuing is exactly one frame. Every background clip
// on the site is 24fps (one frame = 41.7ms); the old threshold was 30ms,
// *below* a frame, so a large share of seeks decoded the frame the visitor
// was already looking at — full decode cost, nothing new on screen.
// Quantizing onto the frame grid and skipping repeats leaves every
// displayed frame identical while dropping that wasted work.
const FRAME_SEC = 1 / 24;

// Touch gets a 2-frame quantum, preserving the coarser step the phone path
// already used deliberately: mobile decoders are weaker, and the footage
// pans slowly enough that a half-rate scrub still reads as continuous.
const TOUCH_QUANTUM_SEC = FRAME_SEC * 2;

// A fast flick can jump the raw scroll-mapped target across several seconds
// of footage in one tick, and snapping straight there reads as the
// background suddenly zooming/lurching (the footage itself pans/zooms over
// time, so a big time-jump looks like a big visual jump). Chasing the
// target with a capped per-tick step instead means the video always
// advances smoothly through the footage in between, same as a real desktop
// scroll-scrub, no matter how fast the flick was.
const MAX_TOUCH_STEP_SEC = 0.06;

export function createVideoScrubber(video) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const quantum = isTouch ? TOUCH_QUANTUM_SEC : FRAME_SEC;

  let seeking = false;
  let pending = null;
  let unlocked = false;
  let lastFrame = -1;
  let smoothedTouchTime = null;

  // Only ever one seek in flight — piling further seeks onto a decoder that
  // hasn't finished the last one stalls it. The newest target supersedes any
  // earlier queued one, so the video always lands where the scroll actually is.
  function seek(target) {
    if (seeking) {
      pending = target;
      return;
    }
    seeking = true;
    video.currentTime = target;
  }

  function onSeeked() {
    seeking = false;
    if (pending !== null) {
      const target = pending;
      pending = null;
      seek(target);
    }
  }

  // iOS / mobile: video must be played at least once before seeking is
  // allowed. We play it silently then pause immediately to "unlock" it —
  // same on touch and desktop, scroll drives which frame shows either way.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    video.muted = true;
    const p = video.play();
    // Pause immediately/synchronously, not just once the play() promise
    // resolves — on mobile browsers that promise can take noticeably longer
    // to settle than actual decode start, which left the video visibly
    // autoplaying for a real stretch after landing on/refreshing a page.
    // The .then() pause stays as a fallback for browsers that ignore a
    // pause() called before playback has truly started.
    video.pause();
    if (p && typeof p.then === "function") {
      p.then(() => {
        video.pause();
        video.currentTime = 0;
      }).catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }

  return {
    attach() {
      video.addEventListener("seeked", onSeeked);
      video.load();
      video.addEventListener("canplay", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { passive: true, once: true });
    },

    // `progress` is 0..1 through the scrollable range.
    update(progress) {
      if (reducedMotion || !unlocked) return;
      if (!video.duration || !isFinite(video.duration)) return;

      const raw = Math.max(0, Math.min(1, progress)) * video.duration;
      let target = raw;
      if (isTouch) {
        // Seeded from the video's actual current time, not the raw target —
        // seeding it at the target would let the very first scroll tick (if
        // it happens to already be a big flick) skip the clamp entirely.
        if (smoothedTouchTime === null) smoothedTouchTime = video.currentTime || 0;
        const diff = raw - smoothedTouchTime;
        smoothedTouchTime += Math.max(-MAX_TOUCH_STEP_SEC, Math.min(MAX_TOUCH_STEP_SEC, diff));
        target = smoothedTouchTime;
      }

      const frame = Math.round(target / quantum);
      if (frame === lastFrame) return; // same frame — nothing new to show
      lastFrame = frame;
      seek(frame * quantum);
    },

    destroy() {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("canplay", unlock);
      window.removeEventListener("touchstart", unlock);
    },
  };
}

// Drop-in for a page whose only scroll-driven behavior is the background
// scrub. Returns the ref to put on the <video>.
export function useScrubbedVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const scrubber = createVideoScrubber(video);
    scrubber.attach();

    // Cached viewport height, not re-read from window.innerHeight on every
    // scroll tick — mobile Chrome/Safari collapse their toolbar as the page
    // scrolls, changing innerHeight mid-gesture independent of the user
    // resizing anything, which would otherwise make the same scroll position
    // map to a different point in the video from one tick to the next.
    // Updated only on a genuine resize (width also changes), not on that
    // toolbar-driven noise.
    let vh = window.innerHeight;
    let vw = window.innerWidth;
    let raf = null;

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const scrollable = document.documentElement.scrollHeight - vh;
        if (scrollable > 0) scrubber.update(window.scrollY / scrollable);
      });
    }

    function onResize() {
      if (window.innerWidth !== vw) {
        vw = window.innerWidth;
        vh = window.innerHeight;
      }
    }

    // touchmove, not just scroll — mobile Safari/Chrome can throttle/delay
    // `scroll` events until an active touch-drag gesture settles, so
    // scrubbing only on `scroll` reads as the video "catching up" in one
    // jump once you lift your finger rather than tracking the drag
    // continuously. touchmove fires throughout the gesture itself.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
      window.removeEventListener("resize", onResize);
      scrubber.destroy();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return videoRef;
}
