import { useState } from "react";
import "../styles/App.css";
import "./BlogPage.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import blogBgVideo from "../assets/videos/AI Video - CEA BG1 - 1.mp4";
import blogBgVideoPoster from "../assets/images/General/blog-bg-poster.webp";
import { BLOG_POSTS, TESTIMONIALS } from "../data/blog";
import { useNavScroll } from "../hooks/useNavScroll";
import { useScrubbedVideo } from "../hooks/useScrubbedVideo";
import { usePageMeta } from "../hooks/usePageMeta";
import { usePageReady } from "../hooks/usePageReady";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useScrollSpy } from "../hooks/useScrollSpy";
import { scrollCenter, scrollToTop } from "../utils/scroll";
import Nav from "../components/Nav";
import BlogSlideshow from "../components/BlogSlideshow";
import Testimonials from "../components/Testimonials";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import PageLoader from "../components/PageLoader";
import SocialMedia from "../components/SocialMedia";
import Footer from "../components/Footer";

// Every photo actually used on this page (see usePageReady) — not just the
// hero's own poster/logo, but every post's own photo in the slideshow, so
// nothing on the page is still loading once a visitor is let in.
// Module-level constants, not recreated per render, since usePageReady's
// effect depends on these arrays by reference.
const BLOG_CRITICAL_IMAGES = [blogBgVideoPoster, logo, ...BLOG_POSTS.map((p) => p.img)];
const BLOG_CRITICAL_VIDEOS = [blogBgVideo];

// This page's own destination links, shown as plain top-level nav items
// (see desktopLinks below) — matches the pattern every other page's own
// nav config uses (see HOME_TOP_LINKS in HomePage.jsx). "Blog" scrolls to
// top rather than navigating (this page already is /blog), and is marked
// `active` so the mobile dropdown highlights it the same red ".is-current"
// mark (see Nav.css) the Menu/FAQs dropdowns already use for the
// current in-page section.
const blogTopLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/specs", label: "Specs" },
  { id: "blog-top", label: "Blog", onClick: scrollToTop, active: true },
];

// This page's own scrollable sections, shown as a "Menu" nav dropdown —
// same pattern as SPECS_SECTIONS/"Specs" in SpecsPage.jsx and
// PRODUCTS_NAV_SECTIONS/"Categories" in ProductsPage.jsx. Follow Us sits in
// the FAQs dropdown instead (see INQUIRY_SECTIONS below), matching
// where every other page's own nav puts it.
const BLOG_SECTIONS = [
  { id: "posts", label: "Latest Posts" },
  { id: "testimonials", label: "Customer Testimonials" },
];

const INQUIRY_SECTIONS = [
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact Us" },
  { id: "social-media", label: "Follow Us" },
];

const BLOG_SCROLL_SPY_IDS = [...BLOG_SECTIONS, ...INQUIRY_SECTIONS].map((s) => s.id);

export default function BlogPage() {
  usePageMeta({
    title: "Blog & News | Harvest Panel Systems",
    description: "Company news, industry insights, and project case studies from the Harvest Panel Systems team.",
    path: "/blog",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const navRef = useNavScroll(menuOpen);
  const pageReady = usePageReady(BLOG_CRITICAL_IMAGES, BLOG_CRITICAL_VIDEOS);

  // Scroll-scrubbed background video — the clip stays paused and its
  // currentTime tracks scroll progress through the page. See
  // hooks/useScrubbedVideo.js; this page needs only the scrub, not the home
  // page's hero-fade/curtain-parallax (its nav behavior comes from
  // useNavScroll above).
  const bgVideoRef = useScrubbedVideo();

  // Gated on `loaderDone` — see HomePage.jsx's own comment on this same
  // call for why.
  const { registerReveal } = useRevealOnScroll(loaderDone);
  const activeSectionId = useScrollSpy(BLOG_SCROLL_SPY_IDS);

  // Same collapsed-dropdown pattern as the Products/Specs/Home nav —
  // "Menu" jumps to any section on this page, "FAQs" covers FAQ/
  // Contact Us, both now sections on this page too (see <Faq>/<Contact>
  // below), so both dropdowns scroll rather than navigate. The site's own
  // pages (Home/Blog/Products/Specs) are a flat row via desktopLinks below,
  // not tucked into a dropdown.
  const blogNavDropdowns = [
    {
      key: "menu",
      label: "Menu",
      items: BLOG_SECTIONS.map((section) => ({
        label: section.label,
        onClick: () => scrollCenter(section.id),
        active: section.id === activeSectionId,
      })),
    },
    {
      key: "faqs",
      label: "FAQs",
      items: INQUIRY_SECTIONS.map((section) => ({
        label: section.label,
        onClick: () => scrollCenter(section.id),
        active: section.id === activeSectionId,
      })),
    },
  ];

  return (
    <div className={loaderDone ? "hp-anim-ready" : undefined}>
      <PageLoader ready={pageReady} onDone={() => setLoaderDone(true)} />

      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        logoTo="/"
        desktopLinks={blogTopLinks}
        dropdowns={blogNavDropdowns}
        entranceReady={loaderDone}
      />

      {/* Target for the skip link in App.jsx. tabIndex -1 makes it
          focusable programmatically without adding a tab stop. */}
      <span id="hp-main" tabIndex={-1} />

      <div className="hp-bgvideo-layer" aria-hidden="true">
        <video
          className="hp-bgvideo"
          ref={bgVideoRef}
          src={blogBgVideo}
          poster={blogBgVideoPoster}
          muted
          playsInline
          webkit-playsinline="true"
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>

      <section className="hp-blog-hero">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-eyebrow hp-reveal" ref={registerReveal}>Blog &amp; news</p>
            <h1 className="hp-hero-heading hp-reveal" ref={registerReveal}>Stories, updates, and insights from Harvest Panel Systems</h1>
            <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
              Company news, industry insights, project case studies, and what our customers have to say, all in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="hp-section" id="posts">
        <div className="hp-section__inner">
          <div className="hp-glass">
            <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Latest posts</p>
            <h2 className="hp-reveal" ref={registerReveal}>News, insights &amp; case studies</h2>
            <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
              Company news, industry insights, and project case studies from the Harvest Panel Systems team.
            </p>
            <BlogSlideshow posts={BLOG_POSTS} registerReveal={registerReveal} />
          </div>
        </div>
      </section>

      <Testimonials testimonials={TESTIMONIALS} registerReveal={registerReveal} />
      <Faq registerReveal={registerReveal} />
      <Contact registerReveal={registerReveal} />
      <SocialMedia registerReveal={registerReveal} />
      <Footer logo={logo} />
    </div>
  );
}
