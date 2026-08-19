import { useEffect, useState } from "react";
import "./BlogSlideshow.css";

const AUTOPLAY_MS = 3000;

// A single full-bleed slide at a time (not a multi-column carousel like
// Gallery/useGalleryCarousel) — text sits over the photo on a gradient
// scrim, advanced by dots and an autoplay timer, matching uspanels.com's
// Latest Posts section exactly.
export default function BlogSlideshow({ posts, registerReveal }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % posts.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [posts.length]);

  return (
    <div className="hp-blog-slideshow hp-reveal" ref={registerReveal}>
      <div className="hp-blog-slideshow__viewport">
        <div
          className="hp-blog-slideshow__track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {posts.map((post) => (
            <article className="hp-blog-slide" key={post.title}>
              <img
                src={post.img}
                alt={post.title}
                className="hp-blog-slide__img"
                loading="lazy"
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
        </div>
      </div>
    </div>
  );
}
