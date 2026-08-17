import { useState } from "react";
import "./WhoWeAre.css";

const CARDS = [
  {
    title: "Who we are",
    body: "A global distributor of Insulated Metal Panels and Doors, offering products and installation services to the cultivation, cold storage, data center, industrial, commercial, and residential markets, a modern, energy-efficient alternative to traditional construction.",
  },
  {
    title: "How we work",
    body: "Design assistance, budgeting, and free estimates on every project, backed by an in-house installation crew and nationwide contractor partnerships, so a project can go from floor plan to finished envelope with one point of contact.",
  },
  {
    title: "Product availability",
    body: "Consistent stock in pre-cut lengths, with custom orders typically fulfilled within 3-8 weeks. Our Piedmont, Oklahoma distribution center ships anywhere in the U.S. within 48 hours of departure.",
  },
];

// Desktop gets the navy-fill hover effect (see #why .hp-card:hover in
// WhoWeAre.css) for free via :hover. Touch devices have no hover, so tap
// drives the same effect instead — via a class on an *inner* wrapper, not
// on this card itself. This card is also where registerReveal's ref and
// .hp-reveal live for the scroll-in animation; toggling a class directly
// on it would change its own className string on every tap, and React
// fully replaces an element's className on any string change — silently
// wiping the "is-visible" class registerReveal's IntersectionObserver had
// added *imperatively* (via classList.add, outside React's own
// tracking), reading as the whole card fading out the moment it's
// tapped. (Exactly the bug already hit and fixed once for the membership
// cards' tap-to-flip — same root cause, same fix.) The inner wrapper
// carries the "is-active" marker instead, and the CSS uses `:has()` to
// style the outer card based on that inner marker, so the outer
// element's own className never needs to change at all.
function WhoWeAreCard({ title, body, registerReveal }) {
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

export default function WhoWeAre({ registerReveal }) {
  return (
    <section className="hp-section" id="why">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>About us</p>
          <h2 className="hp-reveal" ref={registerReveal}>Insulated Panels, Doors, and Buildings from One Source</h2>
          <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
            A global distributor of interior and exterior insulated metal panels and doors,
            built to make every project faster, more efficient, and easier to manage
            from first estimate to final delivery.
          </p>
          <div className="hp-cards">
            {CARDS.map((card) => (
              <WhoWeAreCard key={card.title} {...card} registerReveal={registerReveal} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
