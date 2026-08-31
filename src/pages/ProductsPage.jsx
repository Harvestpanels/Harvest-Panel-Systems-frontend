import { useEffect, useRef, useState } from "react";
import "../styles/App.css";
import "./ProductsPage.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import dataCenterVideo from "../assets/videos/AI Video - Data Center Background1 - 1.mp4";
import dataCenterVideoPoster from "../assets/images/General/products-bg-poster.webp";
import { PRODUCT_CATEGORIES } from "../data/products";
import { useCountUp } from "../hooks/useCountUp";
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
import Footer from "../components/Footer";
import Lightbox from "../components/Lightbox";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import PageLoader from "../components/PageLoader";
import SocialMedia from "../components/SocialMedia";
import Toast from "../components/Toast";

// Every photo actually used on this page (see usePageReady) — not just the
// hero's own poster/logo, but every product card's photo too,
// so nothing on the page is still loading once a visitor is let in.
// Module-level constant, not recreated per render, since usePageReady's
// effect depends on this array by reference.
const PRODUCTS_CRITICAL_IMAGES = [
  dataCenterVideoPoster,
  logo,
  ...PRODUCT_CATEGORIES.flatMap((category) => category.products.map((p) => p.img)),
];
const PRODUCTS_CRITICAL_VIDEOS = [dataCenterVideo];

// Maps a product into the { src, title, category, desc } shape Lightbox
// expects (the same shape the photo gallery already feeds it).
function toAlbumItem(product) {
  return {
    src: product.img,
    title: product.name,
    category: product.categoryName ? `${product.categoryName} · ${product.spec}` : product.spec,
    desc: product.desc,
  };
}


const PRODUCTS_NAV_SECTIONS = [
  { id: "cold-storage-panels", label: "Cold Storage" },
  { id: "foam-panels", label: "Wall & Roof" },
  { id: "mineral-wool-panels", label: "Fire-Rated" },
  // ids match PRODUCT_CATEGORIES' own "-panels"-suffixed ids (see
  // src/data/products.js) — kept in sync deliberately since these are
  // used both to scroll to the matching <section id="..."> and to
  // highlight it via useScrollSpy.
  { id: "doors-panels", label: "Doors" },
  { id: "trim-hardware-panels", label: "Trim & Hardware" },
];

const PRODUCTS_SCROLL_SPY_IDS = [...PRODUCTS_NAV_SECTIONS.map((s) => s.id), "faq", "contact", "social-media"];

const CATEGORY_FILTERS = [
  { id: "all", label: "All products" },
  ...PRODUCT_CATEGORIES.map((category) => ({ id: category.id, label: category.name })),
];

const HERO_HEADING_WORDS = "Panels & doors for every part of the building envelope".split(" ");

// Every product, flattened once with its category attached — this is the
// single, stable list the search view filters over. Filtering it in place
// (CSS display, not array filtering) keeps every card permanently mounted
// so scroll-reveal never has to re-discover a card that briefly left the DOM.
const ALL_PRODUCTS = PRODUCT_CATEGORIES.flatMap((category) =>
  category.products.map((product) => ({
    ...product,
    categoryName: category.name,
    categoryId: category.id,
  }))
);

// A bare substring match misses plurals ("walls" doesn't contain "wall"),
// so each query word also gets checked against a singularized form (and
// vice versa) before falling back to a straight substring check.
function textMatchesWord(text, word) {
  if (text.includes(word)) return true;
  if (word.endsWith("s") && text.includes(word.slice(0, -1))) return true;
  if (!word.endsWith("s") && text.includes(`${word}s`)) return true;
  return false;
}

function productMatchesQuery(product, query) {
  if (!query) return true;
  const searchableText = `${product.categoryName ?? ""} ${product.name} ${product.spec} ${product.desc}`.toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  return words.every((word) => textMatchesWord(searchableText, word));
}

// Subtle cursor-tracked 3D tilt. Ancestor `.hp-products-grid` supplies the
// perspective; this just drives the per-card CSS variables.
function handleCardMouseMove(e) {
  if (window.matchMedia("(hover: none)").matches) return;
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;
  card.style.setProperty("--tilt-x", `${(0.5 - py) * 12}deg`);
  card.style.setProperty("--tilt-y", `${(px - 0.5) * 12}deg`);
}

function handleCardMouseLeave(e) {
  const card = e.currentTarget;
  card.style.setProperty("--tilt-x", "0deg");
  card.style.setProperty("--tilt-y", "0deg");
}

function ProductCard({ product, hidden, showCategory, onOpen }) {
  return (
    <article
      className={`hp-product-card hp-anim-item${hidden ? " hp-product-card--hidden" : ""}`}
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      onAnimationEnd={clearAnimOnEnd}
      onClick={onOpen}
      role="button"
      tabIndex={hidden ? -1 : 0}
      aria-label={`View ${product.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="hp-product-card__img">
        <img
          src={product.img}
          alt={product.name}
          className="hp-product-card__img-el"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="hp-product-card__body">
        <span className="hp-product-card__spec">
          {showCategory ? `${product.categoryName} · ${product.spec}` : product.spec}
        </span>
        <h3>{product.name}</h3>
        <p>{product.desc}</p>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  usePageMeta({
    title: "Products | Harvest Panel Systems",
    description: "Browse our complete line of insulated wall panels, roof panels, fire-rated panels, cold storage panels, doors, and trim & hardware.",
    path: "/products",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useNavScroll(menuOpen);

  // Same scroll-scrubbed video technique the home page's background uses
  // (see useHeroParallax.js) — the video stays paused and its currentTime
  // is driven directly off scroll progress through the whole page, so the
  // footage itself visibly advances as you scroll instead of just playing
  // on a loop regardless of what you're doing. Kept as a local effect
  // rather than reusing that hook: it also drives hero-fade/curtain-
  // parallax/nav-hide behavior this page doesn't have (it already gets
  // its nav scroll behavior from useNavScroll above).
  const bgVideoRef = useRef(null);
  // Cached viewport height, not re-read from window.innerHeight on every
  // scroll tick — mobile Chrome/Safari collapse their toolbar as the page
  // scrolls, changing innerHeight mid-gesture independent of the user
  // resizing anything, which would otherwise make the same scroll
  // position map to a different point in the video from one tick to the
  // next (same root cause already fixed for the home page's hero
  // parallax in useHeroParallax.js). Updated only on a genuine resize
  // (width also changes), not on that toolbar-driven noise.
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
    // same as the home page's video. Same on touch and desktop; scroll
    // drives which frame shows either way (see onScroll below).
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
    // is what the home page relies on, and it holds up fine even on this
    // page's own background video.
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

  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const [loaderDone, setLoaderDone] = useState(false);
  const pageReady = usePageReady(PRODUCTS_CRITICAL_IMAGES, PRODUCTS_CRITICAL_VIDEOS);
  // Gated on `loaderDone` — see HomePage.jsx's own comment on this same
  // hook for why.
  const { registerReveal } = useRevealOnScroll(loaderDone);
  const [toast, setToast] = useToast();
  const activeSectionId = useScrollSpy(PRODUCTS_SCROLL_SPY_IDS);

  // Clicking any product card opens a shared lightbox "album" scoped to
  // whichever list that card belongs to (its category's products when
  // browsing, or the current search results when searching) — next/prev
  // cycles through that same list, landing on the clicked card's position.
  const [albumImages, setAlbumImages] = useState([]);
  const albumLightbox = useLightbox(albumImages.length);
  function openAlbum(images, index) {
    setAlbumImages(images);
    albumLightbox.openLightbox(index);
  }

  // Debounced separately from `query` itself: the input needs to feel
  // instant as you type, but the filter/cascade effect below re-runs a
  // forced-reflow pass over every visible product card on every change to
  // this value — doing that on every keystroke caused visible stutter
  // while typing. Decoupling the two means typing stays snappy while the
  // (more expensive) card re-filter settles ~180ms after you stop.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(timer);
  }, [query]);

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const isSearching = normalizedQuery !== "";

  // Clicking a category in the top nav needs to clear any active search or
  // chip filter first — otherwise the target section could still be
  // `display: none` and the click would silently do nothing. The actual
  // scroll happens in an effect (below), after that filter reset has
  // rendered and the section is genuinely visible.
  function handleNavSectionClick(id) {
    setQuery("");
    setActiveCategoryId("all");
    setPendingScrollId(id);
  }

  // This page's own destination links, shown as plain top-level nav items
  // (see desktopLinks below) — "Products" scrolls to top rather than
  // navigating (this page already is /products), and is marked `active` so
  // the mobile dropdown highlights it the same red ".is-current" mark (see
  // Nav.css) the Contents/Inquiry dropdowns already use for the current
  // in-page section.
  const productsTopLinks = [
    { to: "/", label: "Home" },
    { to: "/blog", label: "Blog" },
    { id: "products-top", label: "Products", onClick: scrollToTop, active: true },
    { to: "/specs", label: "Specs" },
  ];

  // Same collapsed-dropdown pattern as the homepage nav — "Contents"
  // grouping every product section, and "Inquiry" for FAQ/Contact Us/
  // Follow Us — instead of a long flat row of links. The site's own pages
  // (Home/Blog/Products/Specs) are a flat row via desktopLinks below, not
  // tucked into a dropdown.
  const productsNavDropdowns = [
    {
      key: "contents",
      label: "Contents",
      items: PRODUCTS_NAV_SECTIONS.map((section) => ({
        label: section.label,
        onClick: () => handleNavSectionClick(section.id),
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

  useEffect(() => {
    if (!pendingScrollId) return;
    scrollCenter(pendingScrollId);
    const raf = requestAnimationFrame(() => setPendingScrollId(null));
    return () => cancelAnimationFrame(raf);
  }, [pendingScrollId, normalizedQuery, activeCategoryId]);

  const visibleSearchProducts = ALL_PRODUCTS.filter(
    (product) =>
      (activeCategoryId === "all" || activeCategoryId === product.categoryId) &&
      productMatchesQuery(product, normalizedQuery)
  );

  const categoryHasResults = Object.fromEntries(
    PRODUCT_CATEGORIES.map((category) => [
      category.id,
      activeCategoryId === "all" || activeCategoryId === category.id,
    ])
  );

  const totalResults = isSearching
    ? visibleSearchProducts.length
    : PRODUCT_CATEGORIES.reduce((sum, c) => (categoryHasResults[c.id] ? sum + c.products.length : sum), 0);
  const animatedTotalResults = useCountUp(totalResults);

  // The category headings, blurbs, and cards play their entrance animation
  // (a class removed, reflowed, and re-added — the reliable way to restart
  // a CSS animation) both on first mount — i.e. every time this page is
  // navigated to — and again on every search/category-filter change, so
  // nothing needs to be scrolled into view to animate in. Scoped to
  // `.hp-products-category` specifically so the hero text and filter bar
  // (which use their own separate, mount-only animation — see
  // .hp-hero-fade) never replay just because someone typed a search.
  //
  // On that first mount specifically, sections cascade top-to-bottom (each
  // section's items starting a little after the previous section's),
  // continuing the hero's downward wave. Search/filter changes skip the
  // cascade and animate everything at once for a snappy, direct response.
  //
  // The "is this the first run" flag is flipped via a deferred timer
  // rather than immediately: React's Strict Mode intentionally mounts,
  // cleans up, and re-runs effects once synchronously in development to
  // surface bugs, and flipping the flag straight away would make that
  // harmless second pass land after it — losing the cascade in dev only.
  // Cancelling the timer in cleanup means both Strict Mode passes see
  // "first run" as true, while any later, genuinely user-triggered change
  // (which only happens after real async delay) correctly sees it as false.
  const isFirstRun = useRef(true);
  useEffect(() => {
    // Gated on `loaderDone` (see usePageReady/PageLoader) — the first,
    // cascading run of this effect is what plays the whole page's initial
    // entrance, so it needs to wait until the loading overlay has actually
    // faded away, or the visitor never gets to see the cascade at all.
    // Later reruns (search/filter changes) can only happen after that
    // anyway, since the overlay blocks all interaction until then.
    if (!loaderDone) return;
    const cascade = isFirstRun.current;
    const timer = setTimeout(() => {
      isFirstRun.current = false;
    }, 0);

    const root = document.querySelector(".hp-products-page");
    if (root) {
      const sections = Array.from(root.querySelectorAll(".hp-products-category")).filter(
        (section) => !section.classList.contains("hp-products-hidden")
      );

      sections.forEach((section, sectionIndex) => {
        const items = Array.from(section.querySelectorAll(".hp-anim-item")).filter(
          (el) => !el.closest(".hp-product-card--hidden")
        );
        items.forEach((el, itemIndex) => {
          // 1.35s = just after the hero/filter bar's own animation fully
          // settles (filter bar starts at 0.6s, runs 0.7s), so the category
          // cascade begins only once the hero block is completely done
          // rather than overlapping with its tail end.
          const sectionDelay = cascade ? 1.35 + sectionIndex * 0.16 : 0;
          const itemDelay = Math.min(itemIndex, 8) * 0.045;
          el.style.animationDelay = `${(sectionDelay + itemDelay).toFixed(3)}s`;
          el.classList.remove("hp-filter-anim", "hp-anim-done");
          void el.offsetWidth;
          el.classList.add("hp-filter-anim");
        });
      });
    }

    return () => clearTimeout(timer);
  }, [normalizedQuery, activeCategoryId, loaderDone]);

  return (
    <div className={`hp-products-page${loaderDone ? " hp-anim-ready" : ""}`}>
      <PageLoader ready={pageReady} onDone={() => setLoaderDone(true)} />

      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        dropdowns={productsNavDropdowns}
        desktopLinks={productsTopLinks}
        ctaLabel="Request pricing"
        entranceReady={loaderDone}
      />

      <div className="hp-bgvideo-layer" aria-hidden="true">
        <video
          className="hp-bgvideo"
          ref={bgVideoRef}
          src={dataCenterVideo}
          poster={dataCenterVideoPoster}
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>

      <section className="hp-products-hero">
      <div className="hp-products-category__inner">
      <div className="hp-products-panel">
        <p className="hp-eyebrow hp-hero-fade">Full product catalog</p>
        <h1 className="hp-hero-heading">
          {HERO_HEADING_WORDS.map((word, i) => (
            <span className="hp-hero-word" style={{ animationDelay: `${i * 0.055}s` }} key={`${word}-${i}`}>
              {word}
              {i < HERO_HEADING_WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>
        <p className="hp-products-hero__sub hp-hero-fade" style={{ animationDelay: "0.45s" }}>
          Browse our complete line of insulated wall panels, roof panels,
          fire-rated panels, cold storage panels, and doors.
        </p>

        <div className="hp-products-filter hp-hero-fade" style={{ animationDelay: "0.6s" }}>
        <div className="hp-products-filter__search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
        </div>
        <div className="hp-products-filter__chips" role="group" aria-label="Filter by category">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`hp-products-filter__chip${activeCategoryId === filter.id ? " is-active" : ""}`}
              aria-pressed={activeCategoryId === filter.id}
              onClick={() => setActiveCategoryId(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        </div>
      </div>
      </div>
      </section>

      {totalResults === 0 && (
        <p className="hp-products-empty">
          No products match "{query}". Try a different search term or category.
        </p>
      )}

      {/* Merged, flat results — always mounted, shown only while searching.
          Filtering toggles each card's own hidden class instead of adding/
          removing it from the array, so cards never remount mid-search. */}
      <section
        className={`hp-products-category${isSearching ? "" : " hp-products-hidden"}`}
        id="search-results"
      >
        <div className="hp-products-category__inner">
          <div className="hp-products-panel">
            <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
              {animatedTotalResults} result{animatedTotalResults === 1 ? "" : "s"} for "{query}"
            </h2>
            <div className="hp-products-grid">
              {ALL_PRODUCTS.map((product) => (
                <ProductCard
                  key={`search-${product.categoryId}-${product.name}`}
                  product={product}
                  hidden={!visibleSearchProducts.includes(product)}
                  showCategory
                  onOpen={() =>
                    openAlbum(visibleSearchProducts.map(toAlbumItem), visibleSearchProducts.indexOf(product))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category-grouped browsing view — always mounted, shown only when
          not searching. Category chips hide a whole section via CSS. */}
      <div className={isSearching ? "hp-products-hidden" : undefined}>
        {PRODUCT_CATEGORIES.map((category) => (
          <section
            className={`hp-products-category${categoryHasResults[category.id] ? "" : " hp-products-hidden"}`}
            id={category.id}
            key={category.id}
          >
            <div className="hp-products-category__inner">
              <div className="hp-products-panel">
                <h2 className="hp-anim-item" onAnimationEnd={clearAnimOnEnd}>{category.name}</h2>
                <p className="hp-products-category__blurb hp-anim-item" onAnimationEnd={clearAnimOnEnd}>
                  {category.blurb}
                </p>
                <div className="hp-products-grid">
                  {category.products.map((product, i) => (
                    <ProductCard
                      key={`browse-${category.id}-${product.name}`}
                      product={product}
                      hidden={false}
                      onOpen={() => openAlbum(category.products.map(toAlbumItem), i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <Faq registerReveal={registerReveal} />

      <Contact registerReveal={registerReveal} onToast={setToast} />

      <SocialMedia registerReveal={registerReveal} />

      <Footer logo={logo} />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {albumLightbox.lightboxOpen && (
        <Lightbox
          images={albumImages}
          index={albumLightbox.lightboxIndex}
          onClose={albumLightbox.closeLightbox}
          onNext={albumLightbox.lightboxNext}
          onPrev={albumLightbox.lightboxPrev}
        />
      )}
    </div>
  );
}
