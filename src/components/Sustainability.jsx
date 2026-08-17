import { useState } from "react";
import "./Sustainability.css";

const CARDS = [
  {
    title: "Material & Sourcing",
    body: "Panels manufactured with recycled steel content and responsibly sourced raw materials, with the embodied carbon of the panels themselves factored into every product decision we make.",
  },
  {
    title: "Performance & Efficiency",
    body: "High R-value insulation and airtight seams cut building energy use for the life of the structure, while panel durability stretches replacement cycles far beyond conventional cladding.",
  },
  {
    title: "End-of-Life & Circularity",
    body: "A long useful life on the building itself, steel cores that are fully recyclable at the end of that life, and take-back options that keep panels out of the landfill.",
  },
];

// Desktop gets the navy-fill hover effect (see #sustainability
// .hp-card:hover in Sustainability.css) for free via :hover. Touch
// devices have no hover, so tap drives the same effect instead — via a
// class on an *inner* wrapper, not on this card itself. This card is
// also where registerReveal's ref and .hp-reveal live for the scroll-in
// animation; toggling a class directly on it would change its own
// className string on every tap, and React fully replaces an element's
// className on any string change — silently wiping the "is-visible"
// class registerReveal's IntersectionObserver had added *imperatively*
// (via classList.add, outside React's own tracking), reading as the
// whole card fading out the moment it's tapped. (Same bug, same fix,
// already hit once for the membership cards' tap-to-flip and once more
// for WhoWeAre's own cards.) The inner wrapper carries the "is-active"
// marker instead, and the CSS uses `:has()` to style the outer card
// based on that inner marker, so the outer element's own className never
// needs to change at all.
function SustainabilityCard({ title, body, registerReveal }) {
  const [active, setActive] = useState(false);
  return (
    <article
      className="hp-card"
      ref={registerReveal}
      onClick={() => setActive((a) => !a)}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${title}, tap to show details`}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        setActive((a) => !a);
      }}
    >
      <div className={active ? "is-active" : undefined}>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  );
}

export default function Sustainability({ registerReveal }) {
  return (
    <section className="hp-section" id="sustainability">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Sustainability</p>
          <h2 className="hp-reveal" ref={registerReveal}>Built to last, built responsibly</h2>
          <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
            Insulated metal panels are already one of the more efficient ways to
            enclose a building, here's how we work to keep it that way from
            sourcing through end of life.
          </p>
          <div className="hp-cards">
            {CARDS.map((card) => (
              <SustainabilityCard key={card.title} {...card} registerReveal={registerReveal} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
