// Photoreal WebGL render of an insulated metal panel for PanelAnatomy.
// Loaded with a dynamic import() so three.js only ships to visitors who
// reach the Specs page, and only when their browser has WebGL.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Scene units are roughly metres. Skin thickness is exaggerated (real sheet
// is ~0.5 mm) so the facings still read as distinct layers at this size.
const L = 1.7;     // length shown
const W = 1.0;     // panel width
const T = 0.17;    // foam core thickness
const SKIN = 0.012;
const TONGUE = 0.035;
const GAP = 0.2;   // how far each facing travels from the core when fully apart

// Pale PIR foam: soft cream-yellow base with fine closed-cell pores and a
// little mottling. Drawn once to a canvas and used as both the colour map
// and the bump map, so the pores catch the light.
function foamTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#eadb9a";
  ctx.fillRect(0, 0, size, size);

  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  for (let i = 0; i < 70; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const tone = rand() > 0.5 ? "214,192,120" : "246,236,190";
    g.addColorStop(0, `rgba(${tone},0.35)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.save();
    ctx.translate(rand() * size, rand() * size);
    ctx.scale(20 + rand() * 60, 20 + rand() * 60);
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  for (let i = 0; i < 9000; i++) {
    const r = 0.4 + Math.pow(rand(), 3) * 2.2;
    ctx.fillStyle = `rgba(140,112,48,${0.18 + rand() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(rand() * size, rand() * size, r, r * (0.7 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(255,252,236,${0.2 + rand() * 0.4})`;
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 8;
  return tex;
}

// Four shallow grooves pressed into the exterior facing, running the full
// length. RoundedBoxGeometry maps the top face's u to length and v to width,
// so each groove is a horizontal band in texture space. Used as a bump map
// (the groove's depth) and a colour map (a faint shadow line in each), so
// they catch the light the way a pressed line in painted steel does.
function grooveTextures() {
  const size = 1024;
  const make = (draw) => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d"));
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    return tex;
  };
  const centers = [0.2, 0.4, 0.6, 0.8].map((f) => f * size);
  const bump = make((ctx) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    for (const y of centers) {
      const g = ctx.createLinearGradient(0, y - 7, 0, y + 7);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.5, "#000");
      g.addColorStop(1, "#fff");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 7, size, 14);
    }
  });
  const color = make((ctx) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    for (const y of centers) {
      ctx.fillStyle = "rgba(110,122,136,0.55)";
      ctx.fillRect(0, y - 1.5, size, 3);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(0, y + 2, size, 1.5);
    }
  });
  color.colorSpace = THREE.SRGBColorSpace;
  return { bump, color };
}

// Core cross-section (width along x, thickness along y) with a tongue on one
// long edge and the matching groove on the other, extruded along the length.
function coreGeometry() {
  const h = W / 2;
  const a = T * 0.34, b = T * 0.4, c = T * 0.6, d = T * 0.66;
  const s = new THREE.Shape();
  s.moveTo(-h, 0);
  s.lineTo(h, 0);
  s.lineTo(h, a); s.lineTo(h + TONGUE, b); s.lineTo(h + TONGUE, c); s.lineTo(h, d);
  s.lineTo(h, T);
  s.lineTo(-h, T);
  s.lineTo(-h, d); s.lineTo(-h + TONGUE, c); s.lineTo(-h + TONGUE, b); s.lineTo(-h, a);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: L,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -L / 2);
  geo.rotateY(Math.PI / 2); // extrusion axis -> x
  return geo;
}

export async function createPanelScene(container, markerEls) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.75;

  // Three-quarter view from the cut end, so the layer stack reads clearly.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(3.0, 2.05, 2.25);
  camera.lookAt(0.1, 0.0, 0.05);

  // Key light with soft shadows, plus a cool fill from the other side.
  const key = new THREE.DirectionalLight(0xfff6ea, 2.4);
  key.position.set(-0.8, 6, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2;
  key.shadow.camera.top = 2; key.shadow.camera.bottom = -2;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe3ff, 0.45);
  fill.position.set(4, 1.5, -1.5);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2a40, 0.25));

  // Factory-painted white steel: slight metallic response, satin finish and
  // a thin clearcoat so the environment reflects softly along the surface.
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0xdde2e6,
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
  });
  const steelInner = steel.clone();
  steelInner.color.set(0xd2d8dd);
  const grooves = grooveTextures();
  steel.map = grooves.color;
  steel.bumpMap = grooves.bump;
  steel.bumpScale = 1.5;

  const foamMap = foamTexture();
  const foam = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: foamMap,
    bumpMap: foamMap,
    bumpScale: 2.5,
    roughness: 0.95,
    metalness: 0,
  });
  foamMap.colorSpace = THREE.SRGBColorSpace;

  const skinGeo = new RoundedBoxGeometry(L, SKIN, W, 2, 0.004);
  const top = new THREE.Mesh(skinGeo, steel);
  const core = new THREE.Mesh(coreGeometry(), foam);
  const bottom = new THREE.Mesh(skinGeo, steelInner);
  for (const m of [top, core, bottom]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -GAP - 0.12;
  ground.receiveShadow = true;
  scene.add(ground);

  // Anchor points for the numbered HTML markers: each layer's cut end.
  const anchors = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const tmp = new THREE.Vector3();

  let explode = 0;
  let width = 0, height = 0;

  function layout() {
    top.position.set(0, T + SKIN / 2 + explode * GAP, 0);
    core.position.set(0, 0, 0);
    bottom.position.set(0, -SKIN / 2 - explode * GAP, 0);
    anchors[0].set(L / 2, top.position.y, W * 0.15);
    anchors[1].set(L / 2, T / 2, W * 0.15);
    anchors[2].set(L / 2, bottom.position.y, W * 0.15);
  }

  function render() {
    layout();
    renderer.render(scene, camera);
    anchors.forEach((a, i) => {
      const el = markerEls[i];
      if (!el) return;
      tmp.copy(a).project(camera);
      el.style.left = `${((tmp.x + 1) / 2) * width + 18}px`;
      el.style.top = `${((1 - tmp.y) / 2) * height}px`;
    });
  }

  function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  // Compile shaders off the main thread where the browser supports
  // KHR_parallel_shader_compile; done synchronously on first render it
  // stalled the page for seconds on software GL.
  layout();
  await renderer.compileAsync(scene, camera);

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  return {
    setExplode(p) {
      if (p === explode) return;
      explode = p;
      render();
    },
    dispose() {
      ro.disconnect();
      renderer.dispose();
      pmrem.dispose();
      envTex.dispose();
      foamMap.dispose();
      grooves.bump.dispose(); grooves.color.dispose();
      skinGeo.dispose();
      core.geometry.dispose();
      steel.dispose(); steelInner.dispose(); foam.dispose();
      renderer.domElement.remove();
    },
  };
}
