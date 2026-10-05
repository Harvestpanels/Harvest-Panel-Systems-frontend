import { useEffect, useRef } from "react";
import "./StatsStrip.css";

// Every figure here is one the site already states elsewhere (hero/meta
// description for shipping, faqs.js for R-value, install time and panel
// lengths) — keep them in sync if those change.
const STATS = [
  { value: 48, suffix: " hr", label: "Nationwide shipping from stock" },
  { value: 29, prefix: "R-", label: "Insulation value of a 4\" panel" },
  { value: 80, prefix: "Up to ", suffix: "%", label: "Less build time than traditional construction" },
  { value: 30, suffix: " ft", label: "Maximum panel length" },
];

const COUNT_MS = 1600;

function format({ prefix = "", suffix = "" }, n) {
  return `${prefix}${n}${suffix}`;
}

// Numbers tick up from zero the first time the strip scrolls into view.
// The final values are what React renders, so they're what crawlers, no-JS
// visitors and reduced-motion visitors see; the effect only rewinds them to
// zero when it's actually going to animate. Writes go straight to
// textContent from rAF rather than through state, so the count-up never
// re-renders the component.
export default function StatsStrip({ registerReveal }) {
  const gridRef = useRef(null);
  const numberRefs = useRef([]);

  useEffect(() => {
    const grid = gridRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!grid || reduceMotion || !("IntersectionObserver" in window)) return;

    // Copied, not aliased: React nulls the callback-ref slots on unmount,
    // before this effect's cleanup runs.
    const nodes = numberRefs.current.filter(Boolean);
    if (nodes.length !== STATS.length) return;
    nodes.forEach((node, i) => { node.textContent = format(STATS[i], 0); });

    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / COUNT_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        nodes.forEach((node, i) => {
          node.textContent = format(STATS[i], Math.round(STATS[i].value * eased));
        });
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(grid);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      nodes.forEach((node, i) => { node.textContent = format(STATS[i], STATS[i].value); });
    };
  }, []);

  return (
    <section className="hp-section hp-stats" aria-label="Harvest Panel Systems at a glance">
      <div className="hp-section__inner">
        <div className="hp-stats__grid" ref={gridRef}>
          {STATS.map((stat, i) => (
            <div className="hp-stats__item hp-reveal" key={stat.label} ref={registerReveal}>
              <p className="hp-stats__number">
                <span ref={(el) => { numberRefs.current[i] = el; }}>{format(stat, stat.value)}</span>
              </p>
              <p className="hp-stats__label">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
