import { useEffect, useState } from "react";
import "./BlogSlideshow.css";

const AUTOPLAY_MS = 3000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A single full-bleed slide at a time (not a multi-column carousel like
// Gallery/useGalleryCarousel) — text sits over the photo on a gradient
// scrim, advanced by dots and an autoplay timer, matching uspanels.com's
// Latest Posts section exactly.
export default function BlogSlideshow({ posts, registerReveal }) {
  const [index, setIndex] = useState(0);
  // `playing` is the user's explicit choice (pause/play button); `held` is a
  // transient pause while the pointer or keyboard focus is inside the slideshow
  // (WCAG 2.2.2). Reduced-motion users start paused.
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Also paused while the tab is in the background, so the visitor doesn't
  // come back to a slideshow that silently skipped ahead.
  const [pageHidden, setPageHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const running = playing && !hovered && !focused && !pageHidden;

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % posts.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [posts.length, running]);

  return (
    <div
      className="hp-blog-slideshow hp-reveal"
      ref={registerReveal}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div className="hp-blog-slideshow__viewport">
        <div
          className="hp-blog-slideshow__track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {posts.map((post, i) => (
            <article
              className="hp-blog-slide"
              key={post.title}
              aria-hidden={i !== index}
              inert={i !== index}
            >
              {/* Decorative: the post title is the h3 directly below. */}
              <img
                src={post.img}
                alt=""
                className="hp-blog-slide__img"
                loading={i === 0 ? undefined : "lazy"}
                decoding="async"
              />
              <span className="hp-blog-post__category hp-blog-slide__category">{post.category}</span>
              <div className="hp-blog-slide__label">
                <h3>{post.title}</h3>
                <p>{post.desc}</p>
                <time className="hp-blog-post__date" dateTime={post.date}>{post.dateText}</time>
              </div>
            </article>
          ))}
        </div>
        <div className="hp-blog-slideshow__dots">
          {posts.map((post, i) => (
            <button
              key={post.title}
              type="button"
              className={`hp-blog-slideshow__dot${i === index ? " is-active" : ""}`}
              aria-label={`Go to post: ${post.title}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
          <button
            type="button"
            className="hp-blog-slideshow__toggle"
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            aria-pressed={!playing}
            onClick={() => setPlaying((p) => !p)}
          >
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
