import { useEffect, useRef } from "react";
import "./PanelSection.css";

// Apple-style scroll zoom: writes --zoom (0 when a card's top edge is at the
// bottom of the viewport, 1 when its bottom edge reaches the top) onto each
// card, and PanelSection.css maps that to the photo's scale. Only listens
// while the grid is on screen, and writes from rAF so React never
// re-renders on scroll. Reduced-motion visitors get no zoom at all.
function useScrollZoom(gridRef) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = Array.from(grid.querySelectorAll(".hp-panel-card"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        const p = (vh - r.top) / (vh + r.height);
        card.style.setProperty("--zoom", Math.min(1, Math.max(0, p)).toFixed(3));
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    let listening = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !listening) {
        listening = true;
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
      } else if (!entry.isIntersecting && listening) {
        listening = false;
        window.removeEventListener("scroll", onScroll);
      }
    });
    observer.observe(grid);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [gridRef]);
}

// Shared card-grid layout used by the Indoor Agriculture, Cold Storage,
// Laboratories, Modular IMP Housing, Doors, Trim & Hardware, and Flooring
// sections.
export default function PanelSection({ id, eyebrow, heading, description, panels, registerReveal }) {
  const gridRef = useRef(null);
  useScrollZoom(gridRef);
  return (
    <section className="hp-section" id={id}>
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>{eyebrow}</p>
          <h2 className="hp-reveal" ref={registerReveal}>{heading}</h2>
          {description && (
            <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>{description}</p>
          )}
          <div className="hp-panel-grid" ref={gridRef}>
            {panels.map((panel) => (
              <article className="hp-panel-card hp-reveal" key={panel.name} ref={registerReveal}>
                <div className="hp-panel-card__img">
                  <img
                    src={panel.img}
                    alt={panel.name}
                    className="hp-panel-card__img-el"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="hp-panel-card__label">
                  <span className="hp-panel-card__use">{panel.category}</span>
                  <h3>{panel.name}</h3>
                  <p><span>{panel.desc}</span></p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
