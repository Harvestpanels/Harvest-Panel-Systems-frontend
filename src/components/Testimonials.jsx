import "./Testimonials.css";

// NOTE: TESTIMONIALS (see data/blog.js) is placeholder content, not real
// customer quotes — swap in real feedback before this ships in front of
// real visitors.
export default function Testimonials({ testimonials, registerReveal }) {
  return (
    <section className="hp-section" id="testimonials">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Customer testimonials</p>
          <h2 className="hp-reveal" ref={registerReveal}>What our customers are saying</h2>
          <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>
            Real feedback from the contractors, builders, and facility teams we've worked with.
          </p>
          <div className="hp-testimonial-grid">
            {testimonials.map((t) => (
              <article className="hp-testimonial hp-reveal" key={t.name} ref={registerReveal}>
                <span className="hp-testimonial__mark" aria-hidden="true">&ldquo;</span>
                <p className="hp-testimonial__quote">{t.quote}</p>
                <p className="hp-testimonial__name">{t.name}</p>
                <p className="hp-testimonial__role">{t.role}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
