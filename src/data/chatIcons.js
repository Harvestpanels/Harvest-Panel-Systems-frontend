// The chat widget's three mascot poses, in their own module rather than
// inside ChatWidget.jsx so the page loader can import the list without
// pulling in a component (and without tripping react-refresh's
// only-export-components rule).
//
// WebP, not PNG — same 240x180 artwork, but ~4-5x smaller (WebP's
// compression beats PNG considerably even at a high, visually-lossless
// quality setting), which matters most on mobile/slower connections since
// this loads as part of the main bundle on every page.
import mascotIconDefault from "../assets/images/Harvest Panels Mascot Sticker/Harvest Panels Mascot Sticker 1.webp";
import mascotIconOpened from "../assets/images/Harvest Panels Mascot Sticker/Harvest Panels Mascot Sticker 3.webp";
import mascotIconNewMessage from "../assets/images/Harvest Panels Mascot Sticker/Harvest Panels Mascot Sticker 2.webp";

export { mascotIconDefault, mascotIconOpened, mascotIconNewMessage };
