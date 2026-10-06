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
    desc: "Rigid, closed-cell polyisocyanurate that insulates and stiffens the panel: R-29 at 4\". Tongue-and-groove edges lock each panel to the next. PUR and mineral wool cores are also available.",
  },
  {
    name: "Interior steel facing",
    desc: "A second steel skin bonded to the core, so the panel arrives finished on both sides.",
  },
];

// ---- Geometry ---------------------------------------------------------
// Real panels are a constant cross-section extruded along their length, so
// each layer is defined as a 2D profile in the (y, z) plane (y = across the
// panel's width, z = up) and swept along x. The cut end at x = A shows the
// true profile: box ribs in the exterior skin (with foam filling them), and
// the tongue-and-groove joint on the core's long edges.
//
// Isometric projection: x runs right-down, y runs left-down, z is up, so
// the viewer looks from +x/+y/+z and any face whose normal points that way
// is visible.
const A = 300; // panel length drawn (x)
const D = 190; // panel width (y)
const OX = 212;
const OY = 172;
const project = (x, y, z) => [OX + 0.866 * (x - y), OY + 0.5 * (x + y) - z];
const toPoints = (pts3) => pts3.map((p) => project(...p).map((n) => n.toFixed(1)).join(",")).join(" ");

const SKIN = 3;   // steel sheet thickness (exaggerated so it reads)
const CORE = 56;  // foam thickness
const RIB_H = 6;  // box-rib height
const TONGUE = 10;

// Box-rib profile across the width: flat with four trapezoidal ribs.
const RIB_CENTERS = [0.2, 0.4, 0.6, 0.8].map((f) => f * D);
function ribProfile() {
  const pts = [[0, 0]];
  for (const c of RIB_CENTERS) pts.push([c - 10, 0], [c - 4, RIB_H], [c + 4, RIB_H], [c + 10, 0]);
  pts.push([D, 0]);
  return pts;
}
const RIB = ribProfile();

const CORE_BOTTOM = SKIN;
const CORE_TOP = SKIN + CORE;
const tz = (f) => CORE_BOTTOM + CORE * f;

// Profiles are counter-clockwise in (y, z).
const PROFILES = {
  bottom: [[0, 0], [D, 0], [D, SKIN], [0, SKIN]],
  core: [
    [0, CORE_BOTTOM], [D, CORE_BOTTOM],
    // tongue on the near long edge
    [D, tz(0.34)], [D + TONGUE, tz(0.4)], [D + TONGUE, tz(0.6)], [D, tz(0.66)],
    // top follows the ribs, so the foam fills them (right to left)
    ...RIB.slice().reverse().map(([y, h]) => [y, CORE_TOP + h]),
    // groove on the far long edge
    [0, tz(0.66)], [TONGUE, tz(0.6)], [TONGUE, tz(0.4)], [0, tz(0.34)],
  ],
  top: [
    ...RIB.map(([y, h]) => [y, CORE_TOP + h]),
    ...RIB.slice().reverse().map(([y, h]) => [y, CORE_TOP + h + SKIN]),
  ],
};

const LIGHT = (() => { const l = [0.35, 0.45, 0.82]; const m = Math.hypot(...l); return l.map((v) => v / m); })();
const shade = ([r, g, b], n) => {
  const k = 0.58 + 0.5 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  const c = (v) => Math.min(255, Math.round(v * k));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
};

// Sweep a profile along x and return its visible faces, back to front.
function extrude(profile, base) {
  const faces = [];
  for (let i = 0; i < profile.length; i++) {
    const [y1, z1] = profile[i];
    const [y2, z2] = profile[(i + 1) % profile.length];
    const len = Math.hypot(y2 - y1, z2 - z1);
    if (!len) continue;
    const n = [0, (z2 - z1) / len, -(y2 - y1) / len]; // outward for CCW
    if (n[1] + n[2] <= 0.001) continue;
    faces.push({
      depth: (y1 + y2) / 2 + (z1 + z2) / 2,
      points: toPoints([[0, y1, z1], [A, y1, z1], [A, y2, z2], [0, y2, z2]]),
      fill: shade(base, n),
      up: n[2] > 0.9,
    });
  }
  faces.sort((a, b) => a.depth - b.depth);
  faces.push({ points: toPoints(profile.map(([y, z]) => [A, y, z])), fill: shade(base, [1, 0, 0]), cap: true });
  return faces;
}

const STEEL = [232, 236, 240];
const STEEL_INNER = [218, 224, 230];
const FOAM = [240, 196, 92];
const FACES = {
  bottom: extrude(PROFILES.bottom, STEEL_INNER),
  core: extrude(PROFILES.core, FOAM),
  top: extrude(PROFILES.top, STEEL),
};
const SHADOW = toPoints([[-6, -6, -10], [A + 10, -6, -10], [A + 10, D + 14, -10], [-6, D + 14, -10]]);

// Closed-cell foam speckle: a fixed pseudo-random tile, so the texture is
// identical on every render without a filter recomputing per frame.
const FOAM_DOTS = (() => {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: 46 }, () => ({
    cx: (rand() * 36).toFixed(1),
    cy: (rand() * 36).toFixed(1),
    r: (0.5 + rand() * 1.3).toFixed(2),
    o: (0.1 + rand() * 0.22).toFixed(2),
  }));
})();

// Numbered marker beside each layer's cut end.
const MARKERS = [
  project(A, D * 0.55, CORE_TOP + SKIN + RIB_H / 2),
  project(A, D * 0.55, tz(0.5)),
  project(A, D * 0.55, SKIN / 2),
];

function Layer({ faces, className, foam, marker, n }) {
  return (
    <g className={`hp-anatomy__layer ${className}`}>
      {faces.map((f, i) => (
        <g key={i}>
          <polygon points={f.points} fill={f.fill} />
          {foam && <polygon points={f.points} fill="url(#hp-foam)" />}
          {!foam && f.up && <polygon points={f.points} fill="url(#hp-steel-sheen)" />}
          {f.cap && <polygon points={f.points} fill="none" className="hp-anatomy__edge" />}
        </g>
      ))}
      <Marker n={n} at={marker} />
    </g>
  );
}

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
              <svg className="hp-anatomy__svg" viewBox="0 0 520 510" role="img" aria-label="Exploded view of an insulated metal panel: ribbed exterior steel facing, PIR foam core with tongue-and-groove edges, and interior steel facing">
                <defs>
                  <pattern id="hp-foam" width="36" height="36" patternUnits="userSpaceOnUse">
                    {FOAM_DOTS.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={`rgba(120,72,0,${d.o})`} />)}
                  </pattern>
                  <linearGradient id="hp-steel-sheen" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                    <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
                    <stop offset="0.6" stopColor="#fff" stopOpacity="0.18" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                  <filter id="hp-anatomy-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="9" />
                  </filter>
                </defs>
                {/* Painted bottom-up so each layer sits over the one beneath it. */}
                <g className="hp-anatomy__layer hp-anatomy__layer--bottom">
                  <polygon points={SHADOW} className="hp-anatomy__shadow" filter="url(#hp-anatomy-shadow)" />
                </g>
                <Layer faces={FACES.bottom} className="hp-anatomy__layer--bottom" marker={MARKERS[2]} n={3} />
                <Layer faces={FACES.core} className="hp-anatomy__layer--core" marker={MARKERS[1]} n={2} foam />
                <Layer faces={FACES.top} className="hp-anatomy__layer--top" marker={MARKERS[0]} n={1} />
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

