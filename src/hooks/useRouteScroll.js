import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollCenter } from "../utils/scroll";

const HASH_WAIT_MS = 10000;

// Retry across lazy commits and the overlay fade before measuring layout.
export function waitForHash(hash) {
  let id;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return () => {}; }
  let frame;
  let retry;
  let stopped = false;
  const stop = () => {
    stopped = true;
    clearTimeout(retry);
    clearTimeout(ceiling);
    cancelAnimationFrame(frame);
  };
  const check = () => {
    if (stopped) return;
    if (document.getElementById(id) && !document.querySelector(".hp-page-loader")) {
      frame = requestAnimationFrame(() => {
        if (document.getElementById(id) && !document.querySelector(".hp-page-loader")) {
          scrollCenter(id);
          stop();
        } else check();
      });
    } else retry = setTimeout(check, 50);
  };
  const ceiling = setTimeout(stop, HASH_WAIT_MS);
  check();
  return stop;
}

export function useRouteScroll() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (hash) return waitForHash(hash);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, key]);
}
