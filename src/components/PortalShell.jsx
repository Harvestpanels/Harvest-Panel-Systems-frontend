import { useState } from "react";
import Nav from "./Nav";
import PageLoader from "./PageLoader";
import logo from "../assets/images/General/harvest_panels_logo.png";
import { useNavScroll } from "../hooks/useNavScroll";
import { usePageReady } from "../hooks/usePageReady";
import "../styles/App.css";
import "../pages/Portal.css";

// The portal's own links: the four public pages, so someone can get back to
// the marketing site from inside their account.
const PORTAL_TOP_LINKS = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/specs", label: "Specs" },
  { to: "/blog", label: "Blog" },
];

// Menu and FAQs, so the nav has the same six items here as everywhere else.
// Without these the pill is identical but the link row sits ~106px further
// right, because the row is narrower — the nav visibly "moves" on the way in.
//
// The marketing pages point these at their own sections and scroll in place.
// The portal has no such sections, so each item is a `to` link at the
// homepage's section instead; App.jsx's hash effect scrolls it into view on
// arrival. Same labels, same order, same widths as the homepage's copy.
const HOME_SECTION = (id, label) => ({ to: `/#${id}`, label });

const PORTAL_NAV_DROPDOWNS = [
  {
    key: "menu",
    label: "Menu",
    items: [
      HOME_SECTION("why", "Who We Are"),
      HOME_SECTION("indoor-agriculture", "Controlled Environment Agriculture"),
      HOME_SECTION("cold-storage", "Cold Storage"),
      HOME_SECTION("pvc-panels", "PVC Panels"),
      HOME_SECTION("laboratories", "Laboratories"),
      HOME_SECTION("modular-housing", "Modular IMP Housing"),
      HOME_SECTION("doors", "Doors"),
      HOME_SECTION("trim-hardware", "Trim & Hardware"),
      HOME_SECTION("flooring", "Flooring"),
      HOME_SECTION("gallery", "Photo Gallery"),
      HOME_SECTION("memberships", "Memberships"),
      HOME_SECTION("sustainability", "Sustainability"),
    ],
  },
  {
    key: "faqs",
    label: "FAQs",
    items: [
      HOME_SECTION("faq", "FAQ"),
      HOME_SECTION("contact", "Contact Us"),
      HOME_SECTION("social-media", "Follow Us"),
    ],
  },
];

// Chrome shared by every portal screen. Uses the site's real <Nav> and
// <PageLoader> rather than a stripped-down bar, so signing in does not feel
// like leaving the website.
//
// It deliberately shows no account strip of its own: the signed-in email and
// Sign out both live in the nav avatar's account menu (see ACCOUNT_ITEMS in
// Nav.jsx), and repeating them under the navbar was just saying the same thing
// twice on every portal page.
//
// No critical images or videos to declare: usePageReady still waits for fonts
// and for the chat widget's icons (which it always includes), which is what
// stops the portal painting in a fallback font for a frame.
const PORTAL_IMAGES = [];
const PORTAL_VIDEOS = [];

export default function PortalShell({ children, ready = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const navRef = useNavScroll(menuOpen);
  const pageReady = usePageReady(PORTAL_IMAGES, PORTAL_VIDEOS);

  return (
    <div className={loaderDone ? "hp-anim-ready" : undefined}>
      {/* `ready` lets a page keep this overlay up until its own data has
          arrived, so a portal screen shows ONE loading state — this one —
          instead of the page-loader followed by its own "Loading..." text. */}
      <PageLoader ready={pageReady && ready} onDone={() => setLoaderDone(true)} />

      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        dropdowns={PORTAL_NAV_DROPDOWNS}
        desktopLinks={PORTAL_TOP_LINKS}
        links={PORTAL_TOP_LINKS}
        entranceReady={loaderDone}
      />

      {/* Target for the skip link in App.jsx. tabIndex -1 makes it
          focusable programmatically without adding a tab stop. */}
      <span id="hp-main" tabIndex={-1} />

      {/* `hp-anim-ready` above is what plays the content's entrance — see
          "portal entrance" in Portal.css. It is a class rather than a context
          because a portal page renders THIS component as its child, so the
          page sits above the shell in the tree and could never read a context
          the shell provides. */}
      <div className="hp-portal">{children}</div>
    </div>
  );
}
