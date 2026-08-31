import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/App.css";
import "./NotFoundPage.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import { useNavScroll } from "../hooks/useNavScroll";
import { usePageMeta } from "../hooks/usePageMeta";
import { usePageReady } from "../hooks/usePageReady";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PageLoader from "../components/PageLoader";

// This page has no hero image/video of its own — just the logo, so that's
// its only critical first-view asset (see usePageReady). Module-level
// constant, not recreated per render, since usePageReady's effect depends
// on this array by reference.
const NOTFOUND_CRITICAL_IMAGES = [logo];

export default function NotFoundPage() {
  usePageMeta({
    title: "Page Not Found | Harvest Panel Systems",
    description: "The page you're looking for doesn't exist. Browse our insulated wall, roof, and cold storage panels instead.",
    noindex: true,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const navRef = useNavScroll(menuOpen);
  const pageReady = usePageReady(NOTFOUND_CRITICAL_IMAGES);

  return (
    <div>
      <PageLoader ready={pageReady} onDone={() => setLoaderDone(true)} />

      <Nav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        navRef={navRef}
        logo={logo}
        logoTo="/"
        ctaTo="/#contact"
        entranceReady={loaderDone}
      />

      <section className="hp-section hp-notfound">
        <div className="hp-section__inner hp-notfound__inner">
          <p className="hp-eyebrow">404</p>
          <h1 className="hp-hero-heading">Page not found</h1>
          <p>The page you're looking for doesn't exist or may have moved.</p>
          <Link to="/" className="hp-btn hp-btn--primary">Back to home</Link>
        </div>
      </section>

      <Footer logo={logo} />
    </div>
  );
}
