// Signals "the current page's PageLoader has fully faded away" to
// components that don't live inside any one page's own tree — right now
// just ChatWidget, which is mounted once in App.jsx outside the routed
// pages (see the comment there) and so has no direct access to whichever
// page happens to be showing right now, or that page's own `loaderDone`
// state. A plain window CustomEvent plus a persisted "already fired" flag
// (module state survives for the life of the tab, same as ChatWidget
// itself, which never unmounts across SPA navigations) — mirrors
// floatingPanels.js's own event-based pattern for the same reason: two
// otherwise-unrelated components coordinating without threading shared
// state through props or a context neither otherwise needs.
//
// Only ever fires once per real page load: PageLoader on every route calls
// markAppReady() when it finishes, but the first call is the one that
// matters (a visitor's first PageLoader completing after either a fresh
// load or a refresh) — subsequent ones (later SPA navigations, each with
// their own fresh PageLoader) are no-ops here, since ChatWidget itself
// only ever needs to play its own entrance once, not replay it on every
// route change.
const EVENT_NAME = "hp:app-ready";
let appIsReady = false;

export function markAppReady() {
  if (appIsReady) return;
  appIsReady = true;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Calls `callback` once the app is ready — immediately if markAppReady()
// already fired before this was called, otherwise once it does. Returns a
// cleanup function, so callers can return it directly from a useEffect.
export function onAppReady(callback) {
  if (appIsReady) {
    callback();
    return () => {};
  }
  function handleEvent() {
    callback();
  }
  window.addEventListener(EVENT_NAME, handleEvent);
  return () => window.removeEventListener(EVENT_NAME, handleEvent);
}
