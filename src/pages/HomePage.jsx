import { useState } from "react";
import "../styles/App.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import {
  COLD_STORAGE_PANELS,
  DOOR_PANELS,
  FLOORING_PANELS,
  GALLERY_IMAGES,
  INDOOR_AGRICULTURE_PANELS,
  LABORATORY_PANELS,
  MODULAR_HOUSING_PANELS,
  TRIM_HARDWARE_PANELS,
} from "../data/panels";
import { CURTAIN_BG_URL, PARALLAX_BG_URL, VIDEO_URL } from "../data/site";
import { useHeroParallax } from "../hooks/useHeroParallax";
import { useLightbox } from "../hooks/useLightbox";
import { usePageMeta } from "../hooks/usePageMeta";
import { usePageReady } from "../hooks/usePageReady";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useScrollSpy } from "../hooks/useScrollSpy";
import { useToast } from "../hooks/useToast";
import { scrollCenter, scrollToTop } from "../utils/scroll";
import Nav from "../components/Nav";
import PageLoader from "../components/PageLoader";
import Hero from "../components/Hero";
import WhoWeAre from "../components/WhoWeAre";
import Sustainability from "../components/Sustainability";
import PanelSection from "../components/PanelSection";
import Gallery from "../components/Gallery";
import Memberships from "../components/Memberships";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import SocialMedia from "../components/SocialMedia";
import Footer from "../components/Footer";
import Lightbox from "../components/Lightbox";
import Toast from "../components/Toast";

// This page's own destination links, shown as plain top-level nav items
// (see desktopLinks below) — "Home" scrolls to top rather than navigating
// (this page already is "/"), and is marked `active` so the mobile
// dropdown highlights it the same way NavDropdown/MobileDropdownGroup
// already highlight the current in-page section (the ".is-current" red
// mark in Nav.css) — this is just that same mechanism applied to "which
// page you're on" instead of "which section you've scrolled to".
const HOME_TOP_LINKS = [
  { id: "top", label: "Home", onClick: scrollToTop, active: true },
  { to: "/blog", label: "Blog" },
  { to: "/products", label: "Products" },
  { to: "/specs", label: "Specs" },
];

// Every scrollable section on the homepage, top to bottom — Who We Are
// through Memberships (Welcome/the hero is reachable via Menu > Home).
// `id` doubles as the section id both for scrolling to it and for
// useScrollSpy to know which item to highlight as "current" — kept as a
// stable module-level array (not rebuilt every render) since it's also the
// scroll spy hook's dependency list.
const OVERVIEW_SECTIONS = [
  { id: "why", label: "Who We Are" },
  { id: "indoor-agriculture", label: "Controlled Environment Agriculture" },
  { id: "cold-storage", label: "Cold Storage" },
  { id: "laboratories", label: "Laboratories" },
  { id: "modular-housing", label: "Modular IMP Housing" },
  { id: "doors", label: "Doors" },
  { id: "trim-hardware", label: "Trim & Hardware" },
  { id: "flooring", label: "Flooring" },
  { id: "gallery", label: "Photo Gallery" },
  { id: "memberships", label: "Memberships" },
  { id: "sustainability", label: "Sustainability" },
];

const INQUIRY_SECTIONS = [
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact Us" },
  { id: "social-media", label: "Follow Us" },
];

const SCROLL_SPY_IDS = [...OVERVIEW_SECTIONS, ...INQUIRY_SECTIONS].map((s) => s.id);

// Every photo actually used on this page (see usePageReady) — not just the
// hero's own poster/logo, but every panel/door/trim photo and every photo
// gallery shot too, so nothing on the page is still loading once a visitor
// is let in. Module-level constant, not recreated per render, since
// usePageReady's effect depends on this array by reference.
const HOME_CRITICAL_IMAGES = [
  PARALLAX_BG_URL,
  CURTAIN_BG_URL,
  logo,
  ...GALLERY_IMAGES.map((g) => g.src),
  ...INDOOR_AGRICULTURE_PANELS.map((p) => p.img),
  ...COLD_STORAGE_PANELS.map((p) => p.img),
  ...LABORATORY_PANELS.map((p) => p.img),
  ...FLOORING_PANELS.map((p) => p.img),
  ...MODULAR_HOUSING_PANELS.map((p) => p.img),
  ...DOOR_PANELS.map((p) => p.img),
  ...TRIM_HARDWARE_PANELS.map((p) => p.img),
];
const HOME_CRITICAL_VIDEOS = [VIDEO_URL];

function HomePage() {
  usePageMeta({
    title: "Harvest Panel Systems | Insulated Metal Panels & Doors",
    description: "Global distributor of Interior Insulated Metal Panels and Doors for Industrial, Commercial, and Residential projects. Stock inventory ships anywhere in the U.S. within 48 hours from our Oklahoma distribution center.",
    path: "/",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  // Gated on `loaderDone`, not just mounted unconditionally — see
  // usePageReady/PageLoader and useRevealOnScroll's own comment: this
  // page's content shouldn't start its entrance animations until the
  // loading overlay has actually fully faded away, or the visitor never
  // gets to see them play.
  const { registerReveal } = useRevealOnScroll(loaderDone);
  const { navRef, parallaxLayerRef, videoRef, parallaxRef, heroContentRef } = useHeroParallax();
  const lightbox = useLightbox(GALLERY_IMAGES.length);
  const [toast, setToast] = useToast();
  const pageReady = usePageReady(HOME_CRITICAL_IMAGES, HOME_CRITICAL_VIDEOS);
  const activeSectionId = useScrollSpy(SCROLL_SPY_IDS);

  const homeNavDropdowns = [
    {
      key: "contents",
      label: "Contents",
      items: OVERVIEW_SECTIONS.map((s) => ({
        label: s.label,
        onClick: () => scrollCenter(s.id),
        active: s.id === activeSectionId,
      })),
    },
    {
      key: "inquiry",
      label: "Inquiry",
      items: INQUIRY_SECTIONS.map((s) => ({
        label: s.label,
        onClick: () => scrollCenter(s.id),
        active: s.id === activeSectionId,
      })),
    },
  ];

  // Lightbox takes a ready-to-use `src` — gallery photos are now local,
  // bundler-resolved imports (see GALLERY_IMAGES in data/panels.js), so no
  // URL transformation is needed before handing them to it.
  const galleryLightboxImages = GALLERY_IMAGES;

  return (
    <div className={loaderDone ? "hp-anim-ready" : undefined}>
      <PageLoader ready={pageReady} onDone={() => setLoaderDone(true)} />

      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        dropdowns={homeNavDropdowns}
        desktopLinks={HOME_TOP_LINKS}
        entranceReady={loaderDone}
      />

      {/* ===== FIXED VIDEO BACKGROUND ===== */}
      <div className="hp-bgvideo-layer" aria-hidden="true">
        <video
          className="hp-bgvideo"
          ref={videoRef}
          src={VIDEO_URL}
          poster={PARALLAX_BG_URL}
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>

      {/* ===== CURTAIN ===== */}
      <div className="hp-parallax-layer" ref={parallaxLayerRef} aria-hidden="true">
        <div
          className="hp-parallax"
          ref={parallaxRef}
          style={{ backgroundImage: `url(${CURTAIN_BG_URL})` }}
        />
      </div>

      <Hero heroContentRef={heroContentRef} />
      <WhoWeAre registerReveal={registerReveal} />
      <PanelSection
        id="indoor-agriculture"
        eyebrow="Controlled environment agriculture"
        heading="Insulated panels for every growing environment"
        description="Precision climate-control panel systems engineered for indoor cultivation, greenhouse construction, and modular grow room facilities."
        panels={INDOOR_AGRICULTURE_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="cold-storage"
        eyebrow="Cold storage"
        heading="Insulated panels for cold storage facilities"
        description="Interior panel systems engineered to hold a consistent thermal envelope for refrigerated and frozen storage."
        panels={COLD_STORAGE_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="laboratories"
        eyebrow="Laboratories"
        heading="Insulated panels for laboratory facilities"
        description="Precision-controlled panel systems engineered for research and testing laboratories, holding tight temperature, humidity, and contamination tolerances."
        panels={LABORATORY_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="modular-housing"
        eyebrow="Modular IMP housing"
        heading="Modular housing built from insulated metal panels"
        description="Fast-assembling modular units for disaster relief, affordable housing, and weatherproof housing, all built from the same insulated panel envelope."
        panels={MODULAR_HOUSING_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="doors"
        eyebrow="Insulated Doors"
        heading="Insulated Doors"
        description="High-speed, sliding, and personnel doors that seal tight for reliable temperature control on cold storage and cooler rooms."
        panels={DOOR_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="trim-hardware"
        eyebrow="Trim & hardware"
        heading="Trim & Hardware"
        description="The finishing details that complete every install: trim, fasteners, and sealants engineered specifically for insulated panel systems to keep every seam clean and weather-tight."
        panels={TRIM_HARDWARE_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="flooring"
        eyebrow="Flooring"
        heading="Flooring systems to match your panel envelope"
        description="Epoxy coatings, grind and seal finishes, and combined material and install packages that round out the building envelope from wall to floor."
        panels={FLOORING_PANELS}
        registerReveal={registerReveal}
      />
      <Gallery images={GALLERY_IMAGES} registerReveal={registerReveal} onSelect={lightbox.openLightbox} />
      <Memberships registerReveal={registerReveal} />
      <Sustainability registerReveal={registerReveal} />
      <Faq registerReveal={registerReveal} />
      <Contact registerReveal={registerReveal} onToast={setToast} />
      <SocialMedia registerReveal={registerReveal} />
      <Footer logo={logo} />

      {lightbox.lightboxOpen && (
        <Lightbox
          images={galleryLightboxImages}
          index={lightbox.lightboxIndex}
          onClose={lightbox.closeLightbox}
          onNext={lightbox.lightboxNext}
          onPrev={lightbox.lightboxPrev}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default HomePage;
