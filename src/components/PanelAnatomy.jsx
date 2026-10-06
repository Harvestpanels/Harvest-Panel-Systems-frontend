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

// Creating a GL context is expensive (seconds on software renderers), so
// this runs only right before the scene would be built, never on mount, and
// releases the probe context immediately.
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

// Scroll-driven: the section is several screens tall and its stage is
// sticky, so the panel stays put while scroll progress through the section
// pulls its layers apart. Progress goes to a CSS custom property (for the
// legend) and to the WebGL scene, which only re-renders when it changes —
// React never re-renders on scroll.
// `ready` is the host page's loaderDone: the 3D scene isn't built until the
// page loader has finished, so its main-thread work never competes with it.
export default function PanelAnatomy({ ready = true }) {
  const sectionRef = useRef(null);
  const viewRef = useRef(null);
  const markerRefs = useRef([]);
  const sceneRef = useRef(null);
  const progressRef = useRef(0);
  // Assumed until proven otherwise when the scene is about to load; flipped
  // off if WebGL is missing or the 3D module fails to load.
  const [webgl, setWebgl] = useState(true);

  // Scroll progress -> --explode (legend) and the scene, if it exists yet.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      progressRef.current = 1;
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
      progressRef.current = p;
      section.style.setProperty("--explode", p.toFixed(3));
      sceneRef.current?.setExplode(p);
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

  // Build the 3D scene once the page has loaded and the section is getting
  // close. Parsing three.js and compiling its shaders is heavy main-thread
  // work; started during page load it pushed the Specs loader past its
  // ceiling on mobile.
  useEffect(() => {
    const section = sectionRef.current;
    const view = viewRef.current;
    if (!ready || !section || !view) return;
    let disposed = false;
    const load = () => {
      if (!hasWebGL()) { setWebgl(false); return; }
      import("./panelScene.js").then(({ createPanelScene }) => {
        if (disposed) return null;
        return createPanelScene(view, markerRefs.current);
      }).then((scene) => {
        if (!scene) return;
        if (disposed) { scene.dispose(); return; }
        scene.setExplode(progressRef.current);
        sceneRef.current = scene;
        section.classList.add("is-ready");
      }).catch(() => { if (!disposed) setWebgl(false); });
    };
    // Start when the section is about to scroll into view, and then only
    // once the browser is idle, so the build never lands mid-interaction.
    let observer = null;
    let idle = 0;
    const schedule = () => {
      if ("requestIdleCallback" in window) idle = requestIdleCallback(load, { timeout: 800 });
      else idle = setTimeout(load, 200);
    };
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        schedule();
      }, { rootMargin: "25% 0px" });
      observer.observe(section);
    } else {
      schedule();
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      if ("cancelIdleCallback" in window) cancelIdleCallback(idle);
      clearTimeout(idle);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      section.classList.remove("is-ready");
    };
  }, [ready]);

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
