import "./Faq.css";
import { useState } from "react";
import { FAQS } from "../data/faqs";
import { CONTACT } from "../data/site";

export default function Faq({ registerReveal }) {
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);

  return (
    <section className="hp-section" id="faq">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>FAQ</p>
          <h2 className="hp-reveal" ref={registerReveal}>Frequently asked questions</h2>
          <p className="hp-faq__intro hp-reveal" ref={registerReveal}>
            Please reach us at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> if you cannot find an answer to your question.
          </p>
          <div className="hp-faq-list">
            {FAQS.map((item, i) => {
              const isOpen = activeFaqIndex === i;
              const answerId = `faq-answer-${i}`;
              return (
                <div className="hp-faq-item" key={item.question}>
                  <button
                    type="button"
                    className="hp-faq-item__q"
                    onClick={() => setActiveFaqIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                  >
                    {item.question}
                    <span className="hp-faq-item__icon" aria-hidden="true">+</span>
                  </button>
                  <div id={answerId} className={`hp-faq-item__a${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
