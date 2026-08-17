import { useState } from "react";
import "./Memberships.css";
import bbbLogo from "../assets/images/Sections/Memberships/BBB Logo.webp";
import cebaLogo from "../assets/images/Sections/Memberships/CEBA Logo.webp";
import gccaLogo from "../assets/images/Sections/Memberships/GCCA Logo.webp";
import mbceaLogo from "../assets/images/Sections/Memberships/MBCEA Logo.webp";

const MEMBERSHIPS = [
  {
    logo: mbceaLogo,
    name: "MBCEA",
    desc: "Metal Building Contractors & Erectors Association, supporting the metal building industry nationwide through education, advocacy, and shared safety and erection standards.",
  },
  {
    logo: gccaLogo,
    name: "GCCA",
    desc: "Global Cold Chain Alliance, the leading trade association for the temperature-controlled supply chain, connecting cold storage and logistics providers worldwide.",
  },
  {
    logo: bbbLogo,
    name: "BBB",
    desc: "Better Business Bureau, a trusted nonprofit that sets standards for ethical business practices and helps customers find businesses they can rely on.",
  },
  {
    logo: cebaLogo,
    name: "CEBA",
    desc: "Controlled Environment Building Association, advancing design, construction, and performance standards for controlled environment buildings.",
  },
];

// Desktop flips on :hover (see Memberships.css). Touch devices have no
// hover, so they flip via tap instead — driven by the parent's
// `flippedName` state (below), not a local one here, so that tapping one
// card can flip a *different* already-open card back at the same time
// (accordion-style, only one open at once). This used to cause a real
// bug the first time tap-to-flip was tried: the flip class was applied
// to this same outer element that also carries .hp-reveal and
// registerReveal's ref, so toggling state changed this element's own
// className string on every tap, and React fully replaces an element's
// className on any string change — silently wiping out the "is-visible"
// class registerReveal's IntersectionObserver had added *imperatively*
// (via classList.add, outside React's own tracking). The card instantly
// reverted to .hp-reveal's default opacity: 0, reading as the whole card
// fading out the moment it was tapped. Fixed this time by keeping the
// outer element's className a permanently static string and applying the
// flip class to the *inner* wrapper instead — that inner element has no
// reveal ref and no imperative classList changes of its own, so
// re-rendering it on every tap is completely safe.
function MembershipCard({ logo, name, desc, registerReveal, flipped, onToggle }) {
  return (
    <article
      className="hp-membership-badge hp-reveal"
      ref={registerReveal}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${name}, tap to show details`}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onToggle();
      }}
    >
      <div className={`hp-membership-badge__inner${flipped ? " is-flipped" : ""}`}>
        <div className="hp-membership-badge__face hp-membership-badge__face--front">
          <img
            src={logo}
            alt={name}
            className="hp-membership-badge__logo"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="hp-membership-badge__face hp-membership-badge__face--back">
          <h3>{name}</h3>
          <p>{desc}</p>
        </div>
      </div>
    </article>
  );
}

export default function Memberships({ registerReveal }) {
  // Which card (by name) is currently tap-flipped on touch devices — only
  // one at a time, so flipping a new one automatically flips back
  // whichever was already open, rather than each card tracking its own
  // independent state.
  const [flippedName, setFlippedName] = useState(null);
  return (
    <section className="hp-section" id="memberships">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Affiliations</p>
          <h2 className="hp-reveal" ref={registerReveal}>Proud member of leading industry organizations</h2>
          <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
            Our membership in these organizations reflects our commitment to
            industry standards, ethical business practices, and continued
            excellence on every project we deliver.
          </p>
          <div className="hp-membership-grid">
            {MEMBERSHIPS.map((m) => (
              <MembershipCard
                key={m.name}
                {...m}
                registerReveal={registerReveal}
                flipped={flippedName === m.name}
                onToggle={() => setFlippedName((cur) => (cur === m.name ? null : m.name))}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
