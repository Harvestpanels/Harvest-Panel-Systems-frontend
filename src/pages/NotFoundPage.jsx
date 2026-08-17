import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/App.css";
import "./NotFoundPage.css";
import logo from "../assets/images/General/harvest-panel-logo.webp";
import { useNavScroll } from "../hooks/useNavScroll";
import { usePageMeta } from "../hooks/usePageMeta";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function NotFoundPage() {
  usePageMeta({
    title: "Page Not Found | Harvest Panel Systems",
    description: "The page you're looking for doesn't exist. Browse our insulated wall, roof, and cold storage panels instead.",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useNavScroll(menuOpen);

  return (
    <div>
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} navRef={navRef} logo={logo} logoTo="/" ctaTo="/#contact" />

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
