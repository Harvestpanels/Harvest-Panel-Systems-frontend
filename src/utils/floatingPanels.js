// Coordinates the site's mutually-exclusive floating panels — right now
// the mobile nav dropdown and the chat widget, both fixed-position overlays
// that can end up open at the same time otherwise (they don't render in the
// same tree: Nav is per-page, ChatWidget is mounted once in App.jsx outside
// the routed pages), stacking awkwardly on a small screen. A plain window
// CustomEvent is the simplest way for two otherwise-unrelated components to
// tell each other "something else just opened" without threading shared
// state through props or a context neither of them otherwise needs.
const EVENT_NAME = "hp:floating-panel-opened";

// Announces that `source` just opened — every other floating panel
// listening for this event closes itself in response.
export function announcePanelOpened(source) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: source }));
}

// Calls `onOtherPanelOpened` whenever a *different* panel announces it
// opened. Returns the cleanup function, so callers can return it directly
// from a useEffect.
export function onOtherPanelOpened(source, onOtherPanelOpened) {
  function handleEvent(e) {
    if (e.detail !== source) onOtherPanelOpened();
  }
  window.addEventListener(EVENT_NAME, handleEvent);
  return () => window.removeEventListener(EVENT_NAME, handleEvent);
}
