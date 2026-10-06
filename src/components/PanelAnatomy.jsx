import { useEffect, useRef, useState } from "react";
import "./PanelAnatomy.css";

// Copy is limited to facts already published elsewhere on the site
// (specs.js gauges/profiles/coatings, FOAM_INFO, the R-29 FAQ answer,
// the tongue-and-groove joints in products.js).
const LAYERS = [
  {
    name: "Exterior steel facing",
    desc: "22 to 26 gauge steel sheet, in your choice of face profile and coating.",
  },
  {
    name: "PIR foam core",
    desc: "Rigid, closed-cell polyisocyanurate that insulates and stiffens the panel: R-29 at 4\". Tongue-and-groove edges lock each panel to the next. PUR and mineral wool cores are also available.",
  },
  {
    name: "Interior steel facing",
    desc: "A second steel skin bonded to the core, so the panel arrives finished on both sides.",
  },
];

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Scroll-driven: the section is several screens tall and its stage is
// sticky, so the panel stays put while scroll progress through the section
// pulls its layers apart. Progress goes to a CSS custom property (for the
// legend) and to the WebGL scene, which only re-renders when it changes —
// React never re-renders on scroll.
export default function PanelAnatomy() {
  const sectionRef = useRef(null);
  const viewRef = useRef(null);
  const markerRefs = useRef([]);
  // Checked once up front; also flipped off if the 3D module fails to load.
  const [webgl, setWebgl] = useState(hasWebGL);

  useEffect(() => {
    const section = sectionRef.current;
    const view = viewRef.current;
    if (!section) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene = null;
    let disposed = false;
    let progress = reduceMotion ? 1 : 0;
    section.style.setProperty("--explode", String(progress));
    if (reduceMotion) section.classList.add("is-static");

    if (view) {
      import("./panelScene.js").then(({ createPanelScene }) => {
        if (disposed) return;
        scene = createPanelScene(view, markerRefs.current);
        scene.setExplode(progress);
        section.classList.add("is-ready");
      }).catch(() => { if (!disposed) setWebgl(false); });
    }

    if (reduceMotion) {
      return () => { disposed = true; scene?.dispose(); };
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? -rect.top / travel : 1;
      // Hold closed for the first 15%, open over the next 55%, then hold open.
      progress = Math.min(1, Math.max(0, (raw - 0.15) / 0.55));
      section.style.setProperty("--explode", progress.toFixed(3));
      scene?.setExplode(progress);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      scene?.dispose();
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
            <div className={`hp-anatomy__body${webgl ? "" : " is-text-only"}`}>
              {webgl && (
                <div
                  className="hp-anatomy__view"
                  ref={viewRef}
                  role="img"
                  aria-label="3D view of an insulated metal panel separating into its exterior steel facing, PIR foam core with tongue-and-groove edges, and interior steel facing"
                >
                  {[1, 2, 3].map((n, i) => (
                    <span
                      key={n}
                      className="hp-anatomy__marker"
                      aria-hidden="true"
                      ref={(el) => { markerRefs.current[i] = el; }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
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
