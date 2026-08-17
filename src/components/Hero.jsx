import { Link } from "react-router-dom";
import "./Hero.css";
import { CONTACT } from "../data/site";

export default function Hero({ heroContentRef }) {
  return (
    <header className="hp-hero">
      <div className="hp-hero__content" ref={heroContentRef}>
        <p className="hp-eyebrow">
          Insulated metal panels &amp; doors &middot; immediate availability
        </p>
        <h1>
          Build faster.
          <br />
          Insulate smarter.
        </h1>
        <p className="hp-hero__sub">
          Harvest Panel Systems is a global distributor of Insulated Metal
          Panels and Doors for Industrial, Commercial, and
          Residential projects.
        </p>
        <div className="hp-hero__ctas">
          <Link to="/products" className="hp-btn hp-btn--primary">
            Shop panels
          </Link>
          <a href={`tel:${CONTACT.phoneHref}`} className="hp-btn hp-btn--ghost">
            Call today: {CONTACT.phone}
          </a>
        </div>
      </div>
    </header>
  );
}
