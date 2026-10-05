import { useEffect, useRef } from "react";
import "./PanelAnatomy.css";

// Copy is limited to facts already published elsewhere on the site
// (specs.js gauges/profiles/coatings, FOAM_INFO, the R-29 FAQ answer).
const LAYERS = [
  {
    name: "Exterior steel facing",
    desc: "22 to 26 gauge steel sheet, in your choice of face profile and coating.",
  },
  {
    name: "PIR foam core",
    desc: "Rigid, closed-cell polyisocyanurate that insulates and stiffens the panel: R-29 at 4\". PUR and mineral wool cores are also available.",
  },
  {
    name: "Interior steel facing",
    desc: "A second steel skin bonded to the core, so the panel arrives finished on both sides.",
  },
];

// Isometric projection: x runs right-down, y (depth) runs left-down, z is up.
const A = 300; // panel length (x)
const D = 170; // panel depth (y)
const OX = 200;
const OY = 170;
const project = (x, y, z) => [OX + 0.866 * (x - y), OY + 0.5 * (x + y) - z];
const pts = (corners) => corners.map((c) => project(...c).map((n) => n.toFixed(1)).join(",")).join(" ");

function slab(bottom, top) {
  return {
    top: pts([[0, 0, top], [A, 0, top], [A, D, top], [0, D, top]]),
    left: pts([[0, D, top], [A, D, top], [A, D, bottom], [0, D, bottom]]),
    right: pts([[A, 0, top], [A, D, top], [A, D, bottom], [A, 0, bottom]]),
  };
}

const SKIN = 7;
const CORE = 64;
const SHAPES = [
  slab(SKIN + CORE, SKIN * 2 + CORE), // exterior facing (top)
  slab(SKIN, SKIN + CORE),            // core
  slab(0, SKIN),                      // interior facing (bottom)
];
// Box-profile ribs pressed into the exterior facing, running the panel's length.
const RIBS = [0.2, 0.4, 0.6, 0.8].map((f) => {
  const z = SKIN * 2 + CORE;
  const [x1, y1] = project(0, D * f, z);
  const [x2, y2] = project(A, D * f, z);
  return { x1, y1, x2, y2 };
});
// Where each layer's numbered marker sits: middle of its right-hand face.
const MARKERS = [SKIN * 1.5 + CORE, SKIN + CORE / 2, SKIN / 2].map((z) => project(A, D * 0.5, z));

// Scroll-driven: the section is several screens tall and its stage is
// sticky, so the diagram stays put while scroll progress through the
// section opens it up. Progress lands in a CSS custom property, written
// from a rAF-throttled listener so React never re-renders on scroll.
export default function PanelAnatomy() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.style.setProperty("--explode", "1");
      section.classList.add("is-static");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? -rect.top / travel : 1;
      // Hold closed for the first 15%, open over the next 55%, then hold open.
      const p = Math.min(1, Math.max(0, (raw - 0.15) / 0.55));
      section.style.setProperty("--explode", p.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="hp-anatomy" id="anatomy" ref={sectionRef} aria-labelledby="hp-anatomy-heading">
      <div className="hp-anatomy__stage">
        <div className="hp-section__inner">
          <div className="hp-anatomy__card">
            <div className="hp-anatomy__intro">
              <p className="hp-anatomy__eyebrow">Inside the panel</p>
              <h2 id="hp-anatomy-heading">Three layers, one install</h2>
            </div>
            <div className="hp-anatomy__body">
              <svg className="hp-anatomy__svg" viewBox="0 0 520 500" role="img" aria-label="Exploded view of an insulated metal panel: exterior steel facing, PIR foam core, and interior steel facing">
                <defs>
                  <pattern id="hp-foam" width="9" height="9" patternUnits="userSpaceOnUse">
                    <circle cx="2.5" cy="2.5" r="1.3" fill="rgba(120,70,0,0.22)" />
                    <circle cx="7" cy="6.5" r="0.9" fill="rgba(120,70,0,0.16)" />
                  </pattern>
                </defs>
                {/* Painted bottom-up so each layer sits over the one beneath it. */}
                <g className="hp-anatomy__layer hp-anatomy__layer--bottom">
                  <polygon className="hp-anatomy__steel-top" points={SHAPES[2].top} />
                  <polygon className="hp-anatomy__steel-left hp-anatomy__steel--inner" points={SHAPES[2].left} />
                  <polygon className="hp-anatomy__steel-right hp-anatomy__steel--inner" points={SHAPES[2].right} />
                  <Marker n={3} at={MARKERS[2]} />
                </g>
                <g className="hp-anatomy__layer hp-anatomy__layer--core">
                  <polygon className="hp-anatomy__foam-top" points={SHAPES[1].top} />
                  <polygon className="hp-anatomy__foam-left" points={SHAPES[1].left} />
                  <polygon className="hp-anatomy__foam-right" points={SHAPES[1].right} />
                  <polygon fill="url(#hp-foam)" points={SHAPES[1].left} />
                  <polygon fill="url(#hp-foam)" points={SHAPES[1].right} />
                  <Marker n={2} at={MARKERS[1]} />
                </g>
                <g className="hp-anatomy__layer hp-anatomy__layer--top">
                  <polygon className="hp-anatomy__steel-top" points={SHAPES[0].top} />
                  <polygon className="hp-anatomy__steel-left" points={SHAPES[0].left} />
                  <polygon className="hp-anatomy__steel-right" points={SHAPES[0].right} />
                  {RIBS.map((r, i) => <line key={i} className="hp-anatomy__rib" {...r} />)}
                  <Marker n={1} at={MARKERS[0]} />
                </g>
              </svg>
              <ol className="hp-anatomy__list">
                {LAYERS.map((layer, i) => (
                  <li className="hp-anatomy__item" key={layer.name} style={{ "--i": i }}>
                    <span className="hp-anatomy__num" aria-hidden="true">{i + 1}</span>
                    <div>
                      <h3>{layer.name}</h3>
                      <p>{layer.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marker({ n, at: [x, y] }) {
  return (
    <g className="hp-anatomy__marker" transform={`translate(${(x + 22).toFixed(1)} ${y.toFixed(1)})`}>
      <circle r="13" />
      <text dy="4.5">{n}</text>
    </g>
  );
}

