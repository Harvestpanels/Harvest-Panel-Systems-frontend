import { useState } from "react";
import "../styles/App.css";
import "./BlogPage.css";
import logo from "../assets/images/General/harvest-panel-logo.webp";
import { BLOG_POSTS, TESTIMONIALS } from "../data/blog";
import { useNavScroll } from "../hooks/useNavScroll";
import { usePageMeta } from "../hooks/usePageMeta";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useScrollSpy } from "../hooks/useScrollSpy";
import { useToast } from "../hooks/useToast";
import { scrollCenter, scrollToTop } from "../utils/scroll";
import Nav from "../components/Nav";
import BlogSlideshow from "../components/BlogSlideshow";
import Testimonials from "../components/Testimonials";
import Faq from "../components/Faq";
import Contact from "../components/Contact";
import SocialMedia from "../components/SocialMedia";
import Footer from "../components/Footer";
import Toast from "../components/Toast";

// Every scrollable section on this page, top to bottom — grouped into a
// "Contents" nav dropdown, same pattern SpecsPage.jsx's own "Class"
// dropdown and ProductsPage.jsx's "Categories" dropdown use.
const BLOG_SECTIONS = [
  { id: "posts", label: "Latest Posts" },
  { id: "testimonials", label: "Customer Testimonials" },
];

const BLOG_SCROLL_SPY_IDS = [...BLOG_SECTIONS.map((s) => s.id), "faq", "contact", "social-media"];

// Plain top-level nav links, matching the pattern every other page's own
// nav config uses — "Blog" scrolls to top rather than navigating, since
// this page already is /blog.
const blogTopLinks = [
  { to: "/", label: "Home" },
  { id: "blog-top", label: "Blog", onClick: scrollToTop },
  { to: "/products", label: "Products" },
  { to: "/specs", label: "Specs" },
];

// Flat fallback for the mobile dropdown, which has no room for nested
// popovers — same flattening ProductsPage.jsx's own productsNavLinks does.
const blogNavLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/specs", label: "Specs" },
  ...BLOG_SECTIONS.map((s) => ({ id: s.id, label: s.label, onClick: () => scrollCenter(s.id) })),
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact Us" },
  { id: "social-media", label: "Follow Us" },
];

export default function BlogPage() {
  usePageMeta({
    title: "Blog & News | Harvest Panel Systems",
    description: "Company news, industry insights, and project case studies from the Harvest Panel Systems team.",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useNavScroll(menuOpen);
  const { registerReveal } = useRevealOnScroll();
  const [toast, setToast] = useToast();
  const activeSectionId = useScrollSpy(BLOG_SCROLL_SPY_IDS);

  const blogNavDropdowns = [
    {
      key: "contents",
      label: "Contents",
      items: BLOG_SECTIONS.map((section) => ({
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
    <div className="hp-blog-page">
      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        logoTo="/"
        links={blogNavLinks}
        desktopLinks={blogTopLinks}
        dropdowns={blogNavDropdowns}
        ctaLabel="Get a quote"
      />

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
      <Contact registerReveal={registerReveal} onToast={setToast} />
      <SocialMedia registerReveal={registerReveal} />
      <Footer logo={logo} />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
