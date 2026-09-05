import "./PanelSection.css";

// Shared card-grid layout used by the Indoor Agriculture, Cold Storage,
// Laboratories, Modular IMP Housing, Doors, Trim & Hardware, and Flooring
// sections.
export default function PanelSection({ id, eyebrow, heading, description, panels, registerReveal }) {
  return (
    <section className="hp-section" id={id}>
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>{eyebrow}</p>
          <h2 className="hp-reveal" ref={registerReveal}>{heading}</h2>
          {description && (
            <p className="hp-panel-section__desc hp-reveal" ref={registerReveal}>{description}</p>
          )}
          <div className="hp-panel-grid">
            {panels.map((panel) => (
              <article className="hp-panel-card hp-reveal" key={panel.name} ref={registerReveal}>
                <div className="hp-panel-card__img">
                  <img
                    src={panel.img}
                    alt={panel.name}
                    className="hp-panel-card__img-el"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="hp-panel-card__label">
                  <span className="hp-panel-card__use">{panel.category}</span>
                  <h3>{panel.name}</h3>
                  <p><span>{panel.desc}</span></p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
