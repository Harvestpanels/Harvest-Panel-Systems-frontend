import { useEffect, useLayoutEffect, useRef } from "react";

// Drives the fixed video background, the parallax "curtain" reveal, the
// hero fade/shift, and the nav's solid/hidden state — all keyed off scroll
// position. Also scroll-scrubs the background video's currentTime so it
// plays in sync with how far the visitor has scrolled.
export function useHeroParallax() {
  const navRef = useRef(null);
  const parallaxLayerRef = useRef(null);
  const videoRef = useRef(null);
  const parallaxRef = useRef(null);
  const heroContentRef = useRef(null);
  // Cached viewport height, deliberately *not* re-read from
  // window.innerHeight on every scroll tick (see the vhRef effect below
  // for why) — every scroll-driven calculation in this hook divides by
  // this value, so it needs to stay a stable reference for the whole
  // gesture rather than a moving target.
  const vhRef = useRef(window.innerHeight);
  const vwRef = useRef(window.innerWidth);

  // Synchronous initial pass so a reload mid-scroll doesn't flash the
  // pre-scroll layout before the first scroll-driven paint.
  useLayoutEffect(() => {
    const y = window.scrollY;
    const vh = vhRef.current;

    navRef.current?.classList.toggle("hp-nav--solid", y > vh * 0.4);

    const parallaxProgress = Math.max(0, Math.min(1, y / (vh * 0.8)));
    if (parallaxRef.current) {
      parallaxRef.current.style.transform = `translate3d(0, ${parallaxProgress * 100}%, 0)`;
    }
    if (parallaxLayerRef.current) {
      parallaxLayerRef.current.style.pointerEvents =
        parallaxProgress >= 1 ? "none" : "auto";
    }
    if (heroContentRef.current) {
      const fade = Math.max(0, 1 - y / (vh * 0.5));
      heroContentRef.current.style.opacity = fade;
      heroContentRef.current.style.transform = `translate3d(0, ${(y / vh) * -40}px, 0)`;
    }
  }, []);

  useEffect(() => {
    let raf = null;
    let lastVideoTime = -1;
    let videoSeeking = false;
    let pendingTarget = null;
    let videoUnlocked = false;
    let hoverHideTimer = null;
    const video = videoRef.current;

    const isTouch = window.matchMedia("(hover: none)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SEEK_THRESHOLD = isTouch ? 0.08 : 0.03;
    // Tracks the video-time the visitor has actually "seen" scrubbed to on
    // touch, separate from the raw scroll-mapped target — a fast flick can
    // jump the raw target across several seconds of footage in one tick,
    // and snapping straight there reads as the background suddenly
    // zooming/lurching (the footage itself pans/zooms over time, so a big
    // time-jump looks like a big visual jump). Chasing the target with a
    // capped per-tick step instead means the video always advances
    // smoothly through the footage in between, same as a real desktop
    // scroll-scrub, no matter how fast the flick was.
    let smoothedTouchTime = null;
    const MAX_TOUCH_STEP_SEC = 0.06;

    function seekVideo(target) {
      if (!video || reducedMotion) return;
      if (videoSeeking) { pendingTarget = target; return; }
      lastVideoTime = target;
      videoSeeking = true;
      video.currentTime = target;
    }

    function onSeeked() {
      videoSeeking = false;
      if (pendingTarget !== null) {
        const t = pendingTarget;
        pendingTarget = null;
        seekVideo(t);
      }
    }

    // iOS / mobile: video must be played at least once before seeking is
    // allowed. We play it silently then pause immediately to "unlock" it —
    // same on touch and desktop, scroll drives which frame shows either
    // way (see onScroll below).
    function unlockVideo() {
      if (videoUnlocked || !video) return;
      videoUnlocked = true;
      video.muted = true;
      const p = video.play();
      // Pause immediately/synchronously, not just once the play() promise
      // resolves — on mobile browsers that promise can take noticeably
      // longer to settle than actual decode start, which left the video
      // visibly autoplaying for a real stretch after landing on/refreshing
      // a page (only ever appeared to "stop on scroll" because that's
      // roughly when the delayed pause happened to land). Pausing right
      // away stops it almost immediately everywhere; the .then() pause
      // stays as a fallback for browsers that ignore a pause() called
      // before playback has truly started.
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

    if (video) {
      video.addEventListener("seeked", onSeeked);
      // Trigger load so the browser buffers the video
      video.load();
      video.addEventListener("canplay", unlockVideo, { once: true });
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const vh = vhRef.current;

        // Also gates the solid-pill toggle just below, not just the hide
        // logic — the open mobile menu *is* the pill (see .hp-nav--solid
        // .hp-nav__pill in Nav.css, which scales it down 1% and shifts it
        // 2px), so toggling this mid-scroll while it's open visibly
        // "resized" the whole open menu, links, CTA and all, out from
        // under the user.
        const menuIsOpen =
          navRef.current?.classList.contains("hp-nav--open") ||
          navRef.current?.classList.contains("hp-nav--dropdown-open");

        if (!menuIsOpen) {
          navRef.current?.classList.toggle("hp-nav--solid", y > vh * 0.4);
        }

        // Hide nav once scrolled past the top; only hovering near the top
        // (see onMouseMove below) or scrolling back to the very top reveals
        // it. Also held visible while the mobile menu or a desktop
        // Menu/Overview/Inquiry dropdown is open — those popups are
        // positioned relative to the nav (or portaled but anchored to it),
        // so hiding the nav out from under an open one would strand it.
        if (!menuIsOpen) {
          if (y < 80) {
            clearTimeout(hoverHideTimer);
            navRef.current?.classList.remove("hp-nav--hidden");
          } else {
            navRef.current?.classList.add("hp-nav--hidden");
          }
        }

        if (!reducedMotion) {
          const parallaxProgress = Math.max(0, Math.min(1, y / (vh * 0.8)));
          if (parallaxRef.current) {
            parallaxRef.current.style.transform = `translate3d(0, ${parallaxProgress * 100}%, 0)`;
          }
          if (parallaxLayerRef.current) {
            parallaxLayerRef.current.style.pointerEvents =
              parallaxProgress >= 1 ? "none" : "auto";
          }

          if (heroContentRef.current) {
            const fade = Math.max(0, 1 - y / (vh * 0.5));
            const shift = isTouch ? (y / vh) * -20 : (y / vh) * -40;
            heroContentRef.current.style.opacity = fade;
            heroContentRef.current.style.transform = `translate3d(0, ${shift}px, 0)`;
          }

          const scrollable = document.documentElement.scrollHeight - vh;
          if (videoUnlocked && video?.duration && isFinite(video.duration) && scrollable > 0) {
            const progress = Math.max(0, Math.min(1, y / scrollable));
            const rawTarget = progress * video.duration;
            let target = rawTarget;
            if (isTouch) {
              // Seeded from the video's actual current time, not the raw
              // target — seeding it at the target would let the very
              // first scroll tick (if it happens to already be a big
              // flick) skip the clamp entirely on that one tick.
              if (smoothedTouchTime === null) smoothedTouchTime = video.currentTime || 0;
              const diff = rawTarget - smoothedTouchTime;
              const step = Math.max(-MAX_TOUCH_STEP_SEC, Math.min(MAX_TOUCH_STEP_SEC, diff));
              smoothedTouchTime += step;
              target = smoothedTouchTime;
            }
            if (Math.abs(target - lastVideoTime) > SEEK_THRESHOLD) seekVideo(target);
          }
        }

        raf = null;
      });
    }

    // Fallback unlock on first touch
    function onFirstInteraction() { unlockVideo(); }
    window.addEventListener("touchstart", onFirstInteraction, { passive: true, once: true });

    // Reveal the nav whenever the cursor hovers near its position, even
    // while it would otherwise be hidden from scrolling down. Moving away
    // re-hides it after a short delay — but only if still scrolled past
    // the top by the time the delay elapses (the user may have scrolled
    // back to the top in the meantime, which must always win).
    // Coalesced via rAF like onScroll above — native mousemove can fire far
    // more often than the display refreshes, and this only ever needs to
    // react once per frame to a threshold crossing, not on every raw event.
    let mouseRaf = null;
    function onMouseMove(e) {
      if (mouseRaf) return;
      const clientY = e.clientY;
      mouseRaf = requestAnimationFrame(() => {
        mouseRaf = null;
        const menuIsOpen =
          navRef.current?.classList.contains("hp-nav--open") ||
          navRef.current?.classList.contains("hp-nav--dropdown-open");
        if (menuIsOpen) return;
        if (clientY <= 100) {
          clearTimeout(hoverHideTimer);
          navRef.current?.classList.remove("hp-nav--hidden");
        } else if (window.scrollY >= 80) {
          clearTimeout(hoverHideTimer);
          hoverHideTimer = setTimeout(() => {
            if (window.scrollY >= 80) {
              navRef.current?.classList.add("hp-nav--hidden");
            }
          }, 1200);
        }
      });
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Mobile Chrome/Safari collapse their address bar / toolbar as the
    // page scrolls, which changes window.innerHeight *mid-gesture* —
    // independent of anything the user actually resized. Since every
    // parallax/fade/shift calculation above divides by vhRef.current,
    // updating it from a height-only change made the same scroll
    // position map to a different transform from one scroll tick to the
    // next, reading as the hero content visibly jumping/rescaling while
    // scrolling (confirmed: this is exactly what toolbar collapse looks
    // like paired with a live-vh scroll handler). A genuine resize/
    // rotation always changes the *width* too, so only updating the
    // cached height when width has actually changed filters out the
    // toolbar-collapse noise while still tracking real viewport changes.
    function onResize() {
      if (window.innerWidth !== vwRef.current) {
        vwRef.current = window.innerWidth;
        vhRef.current = window.innerHeight;
      }
    }
    window.addEventListener("resize", onResize);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      clearTimeout(hoverHideTimer);
      if (raf) cancelAnimationFrame(raf);
      if (mouseRaf) cancelAnimationFrame(mouseRaf);
      video?.removeEventListener("seeked", onSeeked);
      video?.removeEventListener("canplay", unlockVideo);
    };
  }, []);

  return { navRef, parallaxLayerRef, videoRef, parallaxRef, heroContentRef };
}
