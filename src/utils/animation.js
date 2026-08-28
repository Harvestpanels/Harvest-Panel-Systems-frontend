// Once the entrance animation finishes, swap it for a plain "done" class
// that holds the final opacity. Just removing the animation class would
// revert the element to .hp-anim-item's base (opacity: 0) since nothing
// else would be left declaring opacity: 1 — and leaving the animation
// class in place isn't an option either: a held (fill-mode: both)
// animation outranks normal author rules in the cascade, including
// :hover, which would otherwise permanently block hover/tilt effects on
// cards after their entrance plays. Shared by ProductsPage.jsx and
// SpecsPage.jsx, which both drive the same ".hp-anim-item"/"hp-filter-pop"
// cascade.
export function clearAnimOnEnd(e) {
  if (e.animationName !== "hp-filter-pop") return;
  e.currentTarget.classList.remove("hp-filter-anim");
  e.currentTarget.classList.add("hp-anim-done");
}
