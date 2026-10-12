import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./chat-entry.css";
import ChatWidget from "./components/ChatWidget";
// ChatWidget's own stylesheet belongs to a chunk shared with the portal, and a
// plain script entry doesn't auto-link the CSS of shared chunks, so the bundle
// links it itself. (The file has no url() references, so a raw copy is safe.)
import chatWidgetCss from "./components/ChatWidget.css?url";
import { markAppReady } from "./utils/appReady";

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = chatWidgetCss;
document.head.appendChild(styleLink);

// Mounts the site's real chat assistant on the static marketing pages
// (public/*.html). Same component, same knowledge base and behaviour as in the
// portal; only the way it is loaded differs.
//
// The bot's answers link to other pages ("/products", "/#contact", ...). Inside
// the React app those are client-side routes, but on the static pages they must
// be ordinary page loads, so clicks on those links are intercepted early and
// turned into normal navigation.
document.addEventListener(
  "click",
  (event) => {
    const link = event.target instanceof Element ? event.target.closest("a.hp-chat__link") : null;
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(href);
  },
  true,
);

const root = document.getElementById("hp-chat-root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <ChatWidget />
      </BrowserRouter>
    </StrictMode>,
  );
  // The static pages have no loading overlay, so the launcher can play its
  // entrance as soon as the bundle runs.
  markAppReady();
}
