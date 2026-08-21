import { useState } from "react";
import "../styles/App.css";
import logo from "../assets/images/General/harvest-panel-logo.webp";
import {
  AIRPLANE_HANGAR_PANELS,
  COLD_STORAGE_PANELS,
  DOOR_PANELS,
  FLOORING_PANELS,
  GALLERY_IMAGES,
  INDOOR_AGRICULTURE_PANELS,
  INSULATED_BOOTH_PANELS,
  LABORATORY_PANELS,
  MODULAR_HOUSING_PANELS,
  PEMB_PANELS,
  PHARMACEUTICAL_PANELS,
  TRIM_HARDWARE_PANELS,
} from "../data/panels";
import { CURTAIN_BG_URL, PARALLAX_BG_URL, VIDEO_URL } from "../data/site";
import { useHeroParallax } from "../hooks/useHeroParallax";
import { useLightbox } from "../hooks/useLightbox";
import { usePageMeta } from "../hooks/usePageMeta";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useScrollSpy } from "../hooks/useScrollSpy";
import { useToast } from "../hooks/useToast";
import { scrollCenter, scrollToTop } from "../utils/scroll";
import Nav from "../components/Nav";
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

// Plain top-level nav links, not tucked inside a dropdown — "Home" scrolls
// to top rather than navigating (this page already is "/").
const HOME_TOP_LINKS = [
  { id: "top", label: "Home", onClick: scrollToTop },
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
  { id: "pharmaceutical", label: "Pharmaceutical" },
  { id: "laboratories", label: "Laboratories" },
  { id: "airplane-hangars", label: "Airplane Hangars" },
  { id: "insulated-booths", label: "Insulated Booths" },
  { id: "flooring", label: "Flooring" },
  { id: "pemb", label: "Pre-Engineered Metal Buildings" },
  { id: "modular-housing", label: "Modular IMP Housing" },
  { id: "doors", label: "Doors" },
  { id: "trim-hardware", label: "Trim & Hardware" },
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

function HomePage() {
  usePageMeta({
    title: "Harvest Panel Systems | Insulated Metal Panels & Doors",
    description: "Global distributor of Insulated Metal Panels and Doors for Industrial, Commercial, and Residential projects. Stock inventory ships anywhere in the U.S. within 48 hours from our Oklahoma distribution center.",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const { registerReveal } = useRevealOnScroll();
  const { navRef, parallaxLayerRef, videoRef, parallaxRef, heroContentRef } = useHeroParallax();
  const lightbox = useLightbox(GALLERY_IMAGES.length);
  const [toast, setToast] = useToast();
  const activeSectionId = useScrollSpy(SCROLL_SPY_IDS);

  const homeNavDropdowns = [
    {
      key: "overview",
      label: "Overview",
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
    <div>
      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        dropdowns={homeNavDropdowns}
        desktopLinks={HOME_TOP_LINKS}
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
        id="pharmaceutical"
        eyebrow="Pharmaceutical industry"
        heading="Insulated panels for pharmaceutical facilities"
        description="Sanitary, temperature-controlled panel systems engineered for GMP-compliant pharmaceutical manufacturing, cleanrooms, and storage environments."
        panels={PHARMACEUTICAL_PANELS}
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
        id="airplane-hangars"
        eyebrow="Airplane hangars"
        heading="Insulated panels for airplane hangar facilities"
        description="Long-span insulated panel systems built for the scale of aviation hangars, covering wide clear spans while holding a consistent, weather-tight interior envelope."
        panels={AIRPLANE_HANGAR_PANELS}
        registerReveal={registerReveal}
      />
      <PanelSection
        id="insulated-booths"
        eyebrow="Insulated booths"
        heading="Insulated panels for booths, huts, and shacks"
        description="Compact insulated panel structures built for hunting huts, guard shacks, and lawn sheds, keeping small standalone spaces sealed and temperature-stable."
        panels={INSULATED_BOOTH_PANELS}
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
      <PanelSection
        id="pemb"
        eyebrow="Pre-engineered metal buildings"
        heading="Complete metal building systems, frame to finish"
        description="Steel frame structures clad with insulated wall and roof panels, available in custom sizes, designs, and colors for any project."
        panels={PEMB_PANELS}
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
