import { useState } from "react";
import "./SocialMedia.css";

// Mirrors Memberships.jsx's own flip-card pattern exactly (desktop hovers
// to flip, touch taps — same accordion-style "only one open at once"
// state — see MembershipCard's comment for why the flip class lives on an
// *inner* wrapper rather than this card itself).
const SOCIAL_LINKS = [
  {
    name: "Facebook",
    handle: "Harvest Panel Systems",
    href: "https://www.facebook.com/profile.php?id=61555678774736",
    color: "#2f7de1",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30" aria-hidden="true"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
    ),
  },
  {
    name: "Instagram",
    handle: "@harvestpanels",
    href: "https://www.instagram.com/harvestpanels/",
    color: "#d6249f",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
    ),
  },
  {
    name: "TikTok",
    handle: "@harvestpanels",
    href: "https://www.tiktok.com/@harvestpanels",
    color: "#111827",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0115.54 3h-3.09v12.4a2.592 2.592 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3s-1.88.09-3.24-1.48z" /></svg>
    ),
  },
  {
    name: "Twitter",
    handle: "@harvestpanels",
    href: "https://www.x.com/harvestpanels",
    color: "#1a2b45",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
    ),
  },
];

function SocialBadge({ name, handle, href, color, icon, registerReveal, flipped, onToggle }) {
  return (
    <a
      className="hp-social-badge hp-reveal"
      ref={registerReveal}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} (opens in a new tab)`}
      onClick={(e) => {
        // Touch devices tap to flip first, then tap again to actually
        // follow the link — same two-step pattern MembershipCard's own
        // click handler avoids needing, since that one never navigates.
        if (window.matchMedia("(hover: none)").matches && !flipped) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className={`hp-social-badge__inner${flipped ? " is-flipped" : ""}`}>
        <div className="hp-social-badge__face hp-social-badge__face--front">
          <span className="hp-social-badge__icon" style={{ background: color }}>{icon}</span>
        </div>
        <div className="hp-social-badge__face hp-social-badge__face--back">
          <h3>{name}</h3>
          <p>{handle}</p>
        </div>
      </div>
    </a>
  );
}

export default function SocialMedia({ registerReveal }) {
  const [flippedName, setFlippedName] = useState(null);
  return (
    <section className="hp-section" id="social-media">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Follow us</p>
          <h2 className="hp-reveal" ref={registerReveal}>Connect with us on social media</h2>
          <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
            Follow along for project highlights, product updates, and behind-the-scenes looks at our panels in the field.
          </p>
          <div className="hp-social-grid">
            {SOCIAL_LINKS.map((s) => (
              <SocialBadge
                key={s.name}
                {...s}
                registerReveal={registerReveal}
                flipped={flippedName === s.name}
                onToggle={() => setFlippedName((cur) => (cur === s.name ? null : s.name))}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
