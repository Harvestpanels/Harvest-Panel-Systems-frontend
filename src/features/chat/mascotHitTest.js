// Reused for every click on the closed-state mascot image (see
// isPointOnVisiblePixel below) — one shared offscreen canvas rather than
// allocating a new one per click.
const hitTestCanvas = document.createElement("canvas");

// The mascot PNGs are supplied with a transparent background around an
// irregularly-shaped character, but an <img>/<button> is always a plain
// rectangle to the browser — clicking, hovering, or showing a pointer
// cursor over the transparent padding around the character would
// otherwise still read/act as if it were part of the button. This checks
// the actual pixel at a given point: draws the already-loaded <img> onto a
// canvas and reads that one pixel's alpha, so only genuinely visible
// artwork counts, for every interaction (click, hover-lift, cursor).
export function isPointOnVisiblePixel(imgEl, clientX, clientY) {
  if (!imgEl.naturalWidth) return true; // image not loaded yet — don't block the click
  const rect = imgEl.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) * (imgEl.naturalWidth / rect.width));
  const y = Math.floor((clientY - rect.top) * (imgEl.naturalHeight / rect.height));
  if (x < 0 || y < 0 || x >= imgEl.naturalWidth || y >= imgEl.naturalHeight) return false;
  hitTestCanvas.width = imgEl.naturalWidth;
  hitTestCanvas.height = imgEl.naturalHeight;
  const ctx = hitTestCanvas.getContext("2d");
  ctx.clearRect(0, 0, hitTestCanvas.width, hitTestCanvas.height);
  ctx.drawImage(imgEl, 0, 0);
  return ctx.getImageData(x, y, 1, 1).data[3] > 10;
}

