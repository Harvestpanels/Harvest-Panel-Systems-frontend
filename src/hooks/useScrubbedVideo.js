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

// Time-based easing settles within 350ms of the latest target change,
// regardless of clip length or refresh rate, avoiding prolonged decoding.
const TOUCH_SETTLE_MS = 350;

export function createVideoScrubber(video) {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isTouch = window.matchMedia("(hover: none)").matches;
  const quantum = isTouch ? TOUCH_QUANTUM_SEC : FRAME_SEC;

  let seeking = false;
  let pending = null;
  let unlocked = false;
  let lastFrame = -1;
  let destroyed = false;
  let settleRaf = null;
  let targetTime = null;
  let startTime = 0;
  let fromTime = 0;

  function cancelSettling() {
    if (settleRaf !== null) cancelAnimationFrame(settleRaf);
    settleRaf = null;
    targetTime = null;
    pending = null;
    lastFrame = -1;
  }

  function onMotionChange() {
    if (motionQuery.matches) cancelSettling();
  }

  function interpolatedTime(now) {
    const progress = Math.min(1, Math.max(0, (now - startTime) / TOUCH_SETTLE_MS));
    return fromTime + (targetTime - fromTime) * (1 - (1 - progress) ** 3);
  }

  function requestSeek(time) {
    const frame = Math.round(time / quantum);
    if (frame === lastFrame) return;
    lastFrame = frame;
    seek(Math.min(video.duration, frame * quantum));
  }

  function settle(now) {
    settleRaf = null;
    if (destroyed || motionQuery.matches) return;
    requestSeek(interpolatedTime(now));
    if (now - startTime < TOUCH_SETTLE_MS) {
      settleRaf = requestAnimationFrame(settle);
    }
  }

  // Only ever one seek in flight — piling further seeks onto a decoder that
  // hasn't finished the last one stalls it. The newest target supersedes any
  // earlier queued one, so the video always lands where the scroll actually is.
  function seek(target) {
    if (destroyed || motionQuery.matches) return;
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
    if (destroyed || motionQuery.matches || unlocked) return;
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
        if (destroyed) return;
        video.pause();
        if (targetTime === null && lastFrame === -1 && !motionQuery.matches) video.currentTime = 0;
      }).catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }

  return {
    attach() {
      if (destroyed) return;
      motionQuery.addEventListener("change", onMotionChange);
      video.addEventListener("seeked", onSeeked);
      video.load();
      video.addEventListener("canplay", unlock, { once: true });
      window.addEventListener("touchstart", unlock, { passive: true, once: true });
    },

    // `progress` is 0..1 through the scrollable range.
    update(progress) {
      if (destroyed || motionQuery.matches || !unlocked) return;
      if (!Number.isFinite(progress) || !video.duration || !isFinite(video.duration)) return;

      const target = Math.max(0, Math.min(1, progress)) * video.duration;
      if (!isTouch) {
        requestSeek(target);
        return;
      }
      // Duplicate events must not keep extending the settling deadline.
      if (target === targetTime) return;
      const now = performance.now();
      fromTime = targetTime === null ? video.currentTime || 0 : interpolatedTime(now);
      targetTime = target;
      startTime = now;
      if (settleRaf === null) settleRaf = requestAnimationFrame(settle);
    },

    destroy() {
      destroyed = true;
      cancelSettling();
      motionQuery.removeEventListener("change", onMotionChange);
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
    // Touch height-only changes retain the baseline; desktop height-only
    // resizes must update it.
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
      if (window.innerWidth !== vw || !window.matchMedia("(hover: none)").matches) {
        vw = window.innerWidth;
        vh = window.innerHeight;
        onScroll();
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
