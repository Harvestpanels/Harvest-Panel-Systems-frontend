import { useEffect, useRef, useState } from "react";
import "../styles/App.css";
import "./SpecsPage.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import bgVideoSrc from "../assets/videos/AI VIdeo - Project1 - 1.mp4";
import bgVideoPoster from "../assets/images/General/specs-bg-poster.webp";
import productionVideoSrc from "../assets/videos/Real Video - HPS Panel Production1 - 1.mp4";
import {
  CERTIFICATIONS,
  COLOR_PALETTE,
  CONSTRUCTION_EFFICIENCY,
  DIMENSIONAL_TOLERANCE,
  DIMENSIONAL_TOLERANCE_NOTE,
  ENGINEERING_NOTE,
  EXTERNAL_FACE_PROFILES,
  FM_CERTIFICATION,
  FOAM_INFO,
  OVERLOAD_WHEELBASE_TABLES,
  PANEL_FEATURES,
  PANEL_PROFILES,
  PANEL_WEIGHT,
  PERFORMANCE_HIGHLIGHTS,
  STRUCTURAL_SPECS,
  THERMAL_INSULATION,
  TRIM_ACCESSORIES,
} from "../data/specs";
import { useLightbox } from "../hooks/useLightbox";
import { useNavScroll } from "../hooks/useNavScroll";
import { usePageMeta } from "../hooks/usePageMeta";
import { usePageReady } from "../hooks/usePageReady";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useScrollSpy } from "../hooks/useScrollSpy";
import { useToast } from "../hooks/useToast";
import { scrollCenter, scrollToTop } from "../utils/scroll";
import { clearAnimOnEnd } from "../utils/animation";
import Nav from "../components/Nav";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import PageLoader from "../components/PageLoader";
import SocialMedia from "../components/SocialMedia";
import Footer from "../components/Footer";
import Lightbox from "../components/Lightbox";
import Toast from "../components/Toast";

// This page's own critical first-view assets (see usePageReady) —
// module-level constants, not recreated per render, since usePageReady's
// effect depends on these arrays by reference. The production-process
// video further down the page is not included — it's not above the fold,
// so there's no reason to block the initial reveal on it.
const SPECS_CRITICAL_IMAGES = [bgVideoPoster, logo];
const SPECS_CRITICAL_VIDEOS = [bgVideoSrc];

const specsLinks = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Blog" },
  { to: "/products", label: "Products" },
  { id: "specs-top", label: "Specs", onClick: scrollToTop, active: true },
];

// Every scrollable spec section, top to bottom — Efficiency through Our
// Process — shown as a "Specs" nav dropdown so any one of them is a single
// click away, same pattern as PRODUCTS_NAV_SECTIONS/"Categories" in
// ProductsPage.jsx.
const SPECS_SECTIONS = [
  { id: "efficiency", label: "Efficiency" },
  { id: "profiles", label: "Profiles" },
  { id: "colors", label: "Color Palette" },
  { id: "foam-core", label: "Panel Foam" },
  { id: "certifications", label: "Certifications" },
  { id: "structural", label: "Structural Specs" },
  { id: "engineering", label: "Engineering Data" },
  { id: "production-video", label: "Our Process" },
];

const SPECS_SCROLL_SPY_IDS = [...SPECS_SECTIONS.map((s) => s.id), "faq", "contact", "social-media"];

// Mirrors WhoWeAreCard in WhoWeAre.jsx exactly, so this section's hover/
// tap behavior matches Who We Are 100% — desktop gets the navy-fill
// hover effect for free via :hover (see #foam-core .hp-card:hover in
// SpecsPage.css); touch devices have no hover, so tap drives the same
// effect instead, via a class on an *inner* wrapper rather than this
// card itself. This card also carries .hp-anim-item for the mount-time
// entrance animation (see the cascade effect below); toggling a class
// directly on it would change its own className string on every tap,
// and React fully replaces an element's className on any string
// change — silently wiping the "hp-anim-done" class the cascade effect
// had added *imperatively* (via classList.add, outside React's own
// tracking), reading as the whole card fading out the moment it's
// tapped. (Same bug, same fix, already hit for WhoWeAre's own cards.)
function FoamTraitCard({ name, desc }) {
  const [active, setActive] = useState(false);
  return (
    <article
      className="hp-card hp-anim-item" onAnimationEnd={clearAnimOnEnd}
      onClick={() => setActive((a) => !a)}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${name}, tap to show details`}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        setActive((a) => !a);
      }}
    >
      <div className={active ? "is-active" : undefined}>
        <h3>{name}</h3>
        <p>{desc}</p>
      </div>
    </article>
  );
}

// Mirrors Faq.jsx's own accordion exactly — same single-open-at-a-time
// list (activeCertIndex, not per-item state), same "+" rotating to "×"
// via aria-expanded, same grid-template-rows 0fr->1fr open/close. Passed
// the page's shared activeCertIndex/setActiveCertIndex rather than owning
// its own state, so opening one cert closes whichever other one was open,
// exactly like the FAQ list does.
function CertItem({ cert, isOpen, onToggle }) {
  const answerId = `cert-answer-${cert.code}`;
  return (
    <div className="hp-specs-cert-item hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
      <button
        type="button"
        className="hp-specs-cert-item__q"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
      >
        <span className="hp-specs-cert-item__code">{cert.code}</span>
        {cert.name}
        <span className="hp-specs-cert-item__icon" aria-hidden="true">+</span>
      </button>
      <div id={answerId} className={`hp-specs-cert-item__a${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
        <div>
          <p>{cert.desc}</p>
          {cert.standards && (
            <ul className="hp-specs-cert__standards">
              {cert.standards.map((standard) => (
                <li key={standard.section}>
                  <span className="hp-specs-cert__standard-section">{standard.section}</span>
                  {standard.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpecsPage() {
  usePageMeta({
    title: "Panel Specs | Harvest Panel Systems",
    description: "PIR foam core details, color options, certifications, fire rating tolerances, and construction efficiency for Harvest Panel Systems insulated metal panels.",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const navRef = useNavScroll(menuOpen);
  // Gated on `loaderDone` — see HomePage.jsx's own comment on this same
  // call for why.
  const { registerReveal } = useRevealOnScroll(loaderDone);
  const [toast, setToast] = useToast();
  const activeSectionId = useScrollSpy(SPECS_SCROLL_SPY_IDS);
  const pageReady = usePageReady(SPECS_CRITICAL_IMAGES, SPECS_CRITICAL_VIDEOS);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const profileLightbox = useLightbox(PANEL_PROFILES.length);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const colorLightbox = useLightbox(COLOR_PALETTE.length);
  const [activeCertIndex, setActiveCertIndex] = useState(null);
  const [tappedFaceProfile, setTappedFaceProfile] = useState(null);

  // Same scroll-scrubbed background video technique the Home and Products
  // pages use (see useHeroParallax.js / ProductsPage.jsx) — the video stays
  // paused and its currentTime is driven directly off scroll progress
  // through the whole page, so the footage itself visibly advances as you
  // scroll instead of just looping regardless of what you're doing. Kept
  // as a local effect rather than the shared hook, same reasoning
  // ProductsPage.jsx's copy already documents: this page doesn't need that
  // hook's hero-fade/curtain-parallax/nav-hide behavior, just the scrub.
  const bgVideoRef = useRef(null);
  // Cached viewport height, not re-read from window.innerHeight on every
  // scroll tick — mobile Chrome/Safari collapse their toolbar as the page
  // scrolls, changing innerHeight mid-gesture independent of the user
  // resizing anything, which would otherwise make the same scroll
  // position map to a different point in the video from one tick to the
  // next. Updated only on a genuine resize (width also changes), not on
  // that toolbar-driven noise.
  const vhRef = useRef(window.innerHeight);
  const vwRef = useRef(window.innerWidth);
  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;
    let raf = null;
    let lastVideoTime = -1;
    let videoSeeking = false;
    let pendingTarget = null;
    let videoUnlocked = false;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none)").matches;
    const SEEK_THRESHOLD = isTouch ? 0.08 : 0.03;
    // Chases the raw scroll-mapped target with a capped per-tick step on
    // touch — a fast flick can jump the raw target across several seconds
    // of footage in one tick, and snapping straight there reads as the
    // background suddenly zooming/lurching. See useHeroParallax.js for
    // the full rationale (this mirrors it).
    let smoothedTouchTime = null;
    const MAX_TOUCH_STEP_SEC = 0.06;

    function seekVideo(target) {
      if (reducedMotion) return;
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

    // Requires the video to have actually played once before seeking is
    // allowed — play it silently then immediately pause to "unlock" it,
    // same as the home/products page's video. Same on touch and desktop;
    // scroll drives which frame shows either way (see onScroll below).
    function unlockVideo() {
      if (videoUnlocked) return;
      videoUnlocked = true;
      video.muted = true;
      const p = video.play();
      // Pause immediately/synchronously too (not just once the play()
      // promise resolves) — on mobile browsers that promise can take
      // noticeably longer to settle than actual decode start, which left
      // the video visibly autoplaying for a real stretch on load/refresh.
      video.pause();
      if (p && typeof p.then === "function") {
        p.then(() => { video.pause(); video.currentTime = 0; }).catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }

    video.addEventListener("seeked", onSeeked);
    video.load();
    video.addEventListener("canplay", unlockVideo, { once: true });
    window.addEventListener("touchstart", unlockVideo, { passive: true, once: true });

    // Matches useHeroParallax.js's own onScroll exactly (no extra
    // time-based throttle beyond the rAF coalescing above) — an earlier
    // version of this effect added a MIN_SEEK_INTERVAL_MS gap on top,
    // which actually made this page's scrub feel *choppier* than the
    // home page's, not smoother: it capped seeks to ~8/sec regardless of
    // how often the browser was already willing to paint. rAF coalescing
    // alone (only one seek queued per animation frame, via the `raf`
    // guard) plus the pending-seek coalescing in seekVideo/onSeeked below
    // is what the home page relies on, and it holds up fine here too.
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (reducedMotion || !videoUnlocked || !video.duration || !isFinite(video.duration)) return;
        const scrollable = document.documentElement.scrollHeight - vhRef.current;
        if (scrollable <= 0) return;
        const progress = Math.max(0, Math.min(1, window.scrollY / scrollable));
        const rawTarget = progress * video.duration;
        let target = rawTarget;
        if (isTouch) {
          // Seeded from the video's actual current time, not the raw
          // target — seeding it at the target would let the very first
          // scroll tick (if it happens to already be a big flick) skip
          // the clamp entirely on that one tick.
          if (smoothedTouchTime === null) smoothedTouchTime = video.currentTime || 0;
          const diff = rawTarget - smoothedTouchTime;
          const step = Math.max(-MAX_TOUCH_STEP_SEC, Math.min(MAX_TOUCH_STEP_SEC, diff));
          smoothedTouchTime += step;
          target = smoothedTouchTime;
        }
        if (Math.abs(target - lastVideoTime) > SEEK_THRESHOLD) seekVideo(target);
      });
    }
    function onResize() {
      if (window.innerWidth !== vwRef.current) {
        vwRef.current = window.innerWidth;
        vhRef.current = window.innerHeight;
      }
    }
    window.addEventListener("resize", onResize);

    // touchmove, not just scroll — same as useHeroParallax.js. Mobile
    // Safari/Chrome can throttle/delay `scroll` events until an active
    // touch-drag gesture settles, so scrubbing only on `scroll` reads as
    // the video "catching up" in one jump once you lift your finger
    // rather than tracking the drag continuously. touchmove fires
    // throughout the gesture itself, closing that gap.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
      window.removeEventListener("touchstart", unlockVideo);
      window.removeEventListener("resize", onResize);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("canplay", unlockVideo);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Same mount-time entrance cascade ProductsPage.jsx uses for its own
  // .hp-anim-item content, instead of this page's previous scroll-
  // triggered IntersectionObserver reveal — per request, this page's
  // content animation should match Products' rather than use its own
  // distinct effect. Every .hp-anim-item on the page plays its
  // hp-filter-pop entrance the moment SpecsPage mounts (nothing needs to
  // be scrolled into view first), cascading section-by-section top to
  // bottom, with a smaller stagger between items within the same section.
  // Runs once loaderDone flips true (unlike Products, nothing on this page
  // — selecting a color, expanding a cert — should replay the whole page's
  // entrance, so there's no cascade-vs-snap distinction to track, and
  // loaderDone itself only ever flips false→true once). Gated so this
  // doesn't run to completion hidden behind PageLoader's overlay before
  // the visitor ever sees it — see usePageReady/PageLoader.
  useEffect(() => {
    if (!loaderDone) return;
    const root = document.querySelector(".hp-specs-page");
    if (!root) return;
    const sections = Array.from(root.querySelectorAll(".hp-specs-hero, .hp-section"));
    sections.forEach((section, sectionIndex) => {
      const items = Array.from(section.querySelectorAll(".hp-anim-item"));
      items.forEach((el, itemIndex) => {
        const sectionDelay = sectionIndex * 0.16;
        const itemDelay = Math.min(itemIndex, 8) * 0.045;
        el.style.animationDelay = `${(sectionDelay + itemDelay).toFixed(3)}s`;
        el.classList.remove("hp-filter-anim", "hp-anim-done");
        void el.offsetWidth;
        el.classList.add("hp-filter-anim");
      });
    });
  }, [loaderDone]);

  // Same collapsed-dropdown pattern as the Products/Home nav — a "Specs"
  // popover grouping every spec section (Efficiency through Our Process)
  // and an "Inquiry" popover for FAQ/Contact Us/Follow Us — instead of a
  // long flat row of links. Mobile still uses the flat `specsLinks` list
  // above.
  const specsNavDropdowns = [
    {
      key: "menu",
      label: "Menu",
      items: specsLinks,
    },
    {
      key: "contents",
      label: "Contents",
      items: SPECS_SECTIONS.map((section) => ({
        label: section.label,
        onClick: () => scrollCenter(section.id),
        active: section.id === activeSectionId,
      })),
    },
    {
      key: "inquiry",
      label: "Inquiry",
      items: [
        { label: "FAQ", onClick: () => scrollCenter("faq"), active: activeSectionId === "faq" },
        { label: "Contact Us", onClick: () => scrollCenter("contact"), active: activeSectionId === "contact" },
        { label: "Follow Us", onClick: () => scrollCenter("social-media"), active: activeSectionId === "social-media" },
      ],
    },
  ];

  return (
    <div className={`hp-specs-page${loaderDone ? " hp-anim-ready" : ""}`}>
      <PageLoader ready={pageReady} onDone={() => setLoaderDone(true)} />

      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        logoTo="/"
        links={specsLinks}
        desktopLinks={[]}
        dropdowns={specsNavDropdowns}
        ctaLabel="Request details"
        entranceReady={loaderDone}
      />

      <div className="hp-bgvideo-layer" aria-hidden="true">
        <video
          className="hp-bgvideo"
          ref={bgVideoRef}
          src={bgVideoSrc}
          poster={bgVideoPoster}
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>

      <section className="hp-specs-hero">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Specs</p>
            <h1 className="hp-hero-heading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Panel specifications</h1>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              What's actually inside our panels, core material, color
              options, certifications, and the fire performance standards
              every panel is built to meet.
            </p>
          </div>
        </div>
      </section>

      <section className="hp-section" id="efficiency">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Save time, save money</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>One panel, seven trades replaced</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{CONSTRUCTION_EFFICIENCY.intro}</p>
            <ul className="hp-specs-feature-list">
              {CONSTRUCTION_EFFICIENCY.replaces.map((item) => (
                <li className="hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={item}>{item}</li>
              ))}
            </ul>
            <p className="hp-specs-note hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{CONSTRUCTION_EFFICIENCY.note}</p>
          </div>
        </div>
      </section>

      <section className="hp-section" id="profiles">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Profiles</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Panel face profiles</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              Four standard face profiles to match the look of any project, select one to preview it on an actual panel.
            </p>
            <div className="hp-specs-profile-pills hp-anim-item" onAnimationEnd={clearAnimOnEnd} role="group" aria-label="Panel face profiles">
              {PANEL_PROFILES.map((profile, i) => (
                <button
                  type="button"
                  key={profile.name}
                  className="hp-specs-profile-pill"
                  onClick={() => setSelectedProfileIndex(i)}
                  aria-pressed={i === selectedProfileIndex}
                >
                  {profile.name}
                </button>
              ))}
            </div>
            <p className="hp-specs-profile-desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              {PANEL_PROFILES[selectedProfileIndex].desc}
            </p>
            <button
              type="button"
              className="hp-specs-color-preview hp-specs-profile-preview hp-anim-item" onAnimationEnd={clearAnimOnEnd}
              onClick={() => profileLightbox.openLightbox(selectedProfileIndex)}
              aria-label={`View ${PANEL_PROFILES[selectedProfileIndex].name} profile full screen`}
            >
              {PANEL_PROFILES.map((profile, i) => (
                <img
                  key={profile.name}
                  src={profile.img}
                  alt={`${profile.name} panel face profile`}
                  className={`hp-specs-color-preview__img${i === selectedProfileIndex ? " is-active" : ""}`}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ))}
              <span className="hp-specs-color-preview__label">{PANEL_PROFILES[selectedProfileIndex].name}</span>
              <span className="hp-specs-color-preview__zoom" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="hp-section" id="colors">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Color palette</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Finish and color options</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              Standard color options shown below, select a swatch to preview
              it on an actual panel. Custom panel colors are also available
              on request.
            </p>
            <div className="hp-specs-color-layout">
              <div className="hp-specs-swatches" role="group" aria-label="Panel color swatches">
                {COLOR_PALETTE.map((color, i) => (
                  <button
                    type="button"
                    key={color.name}
                    className="hp-specs-swatch hp-anim-item" onAnimationEnd={clearAnimOnEnd}
                                       onClick={() => setSelectedColorIndex(i)}
                    aria-pressed={i === selectedColorIndex}
                  >
                    <span className={i === selectedColorIndex ? "hp-specs-swatch__inner is-selected" : "hp-specs-swatch__inner"}>
                      <span className="hp-specs-swatch__chip" style={{ background: color.hex }} aria-hidden="true" />
                      <span className="hp-specs-swatch__name">{color.name}</span>
                      <span className={`hp-specs-swatch__badge${color.inStock ? " is-in-stock" : ""}`}>
                        {color.inStock ? "In Stock" : "Custom"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="hp-specs-color-preview hp-anim-item" onAnimationEnd={clearAnimOnEnd}
                               onClick={() => colorLightbox.openLightbox(selectedColorIndex)}
                aria-label={`View ${COLOR_PALETTE[selectedColorIndex].name} panel finish full screen`}
              >
                {COLOR_PALETTE.map((color, i) => (
                  <img
                    key={color.name}
                    src={color.img}
                    alt={`${color.name} panel finish`}
                    className={`hp-specs-color-preview__img${i === selectedColorIndex ? " is-active" : ""}`}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ))}
                <span className="hp-specs-color-preview__label">{COLOR_PALETTE[selectedColorIndex].name}</span>
                <span className="hp-specs-color-preview__zoom" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="hp-section" id="foam-core">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Panel foam</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{FOAM_INFO.title}</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{FOAM_INFO.intro}</p>
            <div className="hp-cards">
              {FOAM_INFO.traits.map((trait) => (
                <FoamTraitCard key={trait.name} name={trait.name} desc={trait.desc} />
              ))}
            </div>
            <p className="hp-specs-note hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{FOAM_INFO.alternatives}</p>
            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Performance highlights</p>
            <ul className="hp-specs-feature-list">
              {PERFORMANCE_HIGHLIGHTS.map((item) => (
                <li className="hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={item}>{item}</li>
              ))}
            </ul>
            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Panel features</p>
            <ul className="hp-specs-feature-list">
              {PANEL_FEATURES.map((feature) => (
                <li className="hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hp-section" id="certifications">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Certifications</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Certifications &amp; fire rating tolerances</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              Every panel is manufactured under an ISO 9001 quality system and
              tested to FM's Class 1 fire performance standards.
            </p>
            <div className="hp-specs-cert-list">
              {CERTIFICATIONS.map((cert, i) => (
                <CertItem
                  key={cert.code}
                  cert={cert}
                  isOpen={activeCertIndex === i}
                  onToggle={() => setActiveCertIndex(activeCertIndex === i ? null : i)}
                />
              ))}
            </div>
            <div className="hp-specs-fm hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              <h3>{FM_CERTIFICATION.title}</h3>
              <p>{FM_CERTIFICATION.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="hp-section" id="structural">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Structural specs</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Sizing &amp; construction options</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              Our team works directly with architects, designers, and
              engineers to spec the right panel size, insulation type, and
              finish for your project.
            </p>
            <dl className="hp-specs-table">
              {STRUCTURAL_SPECS.map((spec) => (
                <div className="hp-specs-table__row hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Trim &amp; accessories</p>
            <ul className="hp-specs-feature-list">
              {TRIM_ACCESSORIES.map((item) => (
                <li className="hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hp-section" id="engineering">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Engineering data</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Span, weight &amp; tolerance charts</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              Full engineering reference data for steel sheets 24/26 gauge,
              4⅜" bearing, across every panel thickness we offer.
            </p>

            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>External face profile</p>
            <div className="hp-specs-profiles hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              {EXTERNAL_FACE_PROFILES.map((profile) => (
                <div
                  key={profile.name}
                  className="hp-specs-profile"
                  role="button"
                  tabIndex={0}
                  aria-pressed={tappedFaceProfile === profile.name}
                  aria-label={`${profile.name}, tap to show details`}
                  onClick={() =>
                    setTappedFaceProfile((cur) => (cur === profile.name ? null : profile.name))
                  }
                >
                  <div className={tappedFaceProfile === profile.name ? "is-active" : undefined}>
                    <h4>{profile.name}</h4>
                    <p>{profile.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Panel weight (PSF)</p>
            <div className="hp-specs-datatable-wrap hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              <table className="hp-specs-datatable">
                <thead>
                  <tr>
                    <th>Steel thickness</th>
                    {PANEL_WEIGHT.columns.map((col) => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PANEL_WEIGHT.rows.map((row) => (
                    <tr key={row.steel}>
                      <th scope="row">{row.steel}</th>
                      {row.values.map((v, i) => <td key={PANEL_WEIGHT.columns[i]}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Thermal insulation (R-value)</p>
            {THERMAL_INSULATION.conditions.map((condition) => (
              <div className="hp-specs-datatable-wrap hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={condition.label}>
                <p className="hp-specs-datatable-caption">{condition.label}</p>
                <table className="hp-specs-datatable">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      {THERMAL_INSULATION.columns.map((col) => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {condition.rows.map((row) => (
                      <tr key={row.unit}>
                        <th scope="row">{row.unit}</th>
                        {row.values.map((v, i) => <td key={THERMAL_INSULATION.columns[i]}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Dimensional tolerance</p>
            <dl className="hp-specs-table">
              {DIMENSIONAL_TOLERANCE.map((spec) => (
                <div className="hp-specs-table__row hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
            <p className="hp-specs-note hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{DIMENSIONAL_TOLERANCE_NOTE}</p>

            <p className="hp-specs-subheading hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Overload wheelbase, load distribution / max spans (ft/in)</p>
            {OVERLOAD_WHEELBASE_TABLES.map((table) => (
              <div className="hp-specs-datatable-wrap hp-anim-item" onAnimationEnd={clearAnimOnEnd} key={table.label}>
                <p className="hp-specs-datatable-caption">{table.label}</p>
                <table className="hp-specs-datatable">
                  <thead>
                    <tr>
                      <th>PSF</th>
                      {table.columns.map((col) => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.psf}>
                        <th scope="row">{row.psf}</th>
                        {row.values.map((v, i) => <td key={table.columns[i]}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="hp-specs-note hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{ENGINEERING_NOTE}</p>
          </div>
        </div>
      </section>

      <section className="hp-section" id="production-video">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-anim-item" onAnimationEnd={clearAnimOnEnd}>Our process</p>
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>See how our panels are made</h2>
            <p className="hp-panel-section__desc hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              A look inside our production process, from raw material to
              finished panel, manufactured in our Italian- and
              German-engineered production facilities.
            </p>
            <div className="hp-specs-video hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              <video
                src={productionVideoSrc}
                controls
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </div>
      </section>

      <Faq registerReveal={registerReveal} />

      <Contact registerReveal={registerReveal} onToast={setToast} />

      <SocialMedia registerReveal={registerReveal} />

      <Footer logo={logo} />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {colorLightbox.lightboxOpen && (
        <Lightbox
          images={COLOR_PALETTE.map((color) => ({
            src: color.img,
            title: color.name,
            category: "Color palette",
            desc: "",
          }))}
          index={colorLightbox.lightboxIndex}
          onClose={colorLightbox.closeLightbox}
          onNext={colorLightbox.lightboxNext}
          onPrev={colorLightbox.lightboxPrev}
        />
      )}

      {profileLightbox.lightboxOpen && (
        <Lightbox
          images={PANEL_PROFILES.map((profile) => ({
            src: profile.img,
            title: profile.name,
            category: "Panel face profiles",
            desc: profile.desc,
          }))}
          index={profileLightbox.lightboxIndex}
          onClose={profileLightbox.closeLightbox}
          onNext={profileLightbox.lightboxNext}
          onPrev={profileLightbox.lightboxPrev}
        />
      )}
    </div>
  );
}
