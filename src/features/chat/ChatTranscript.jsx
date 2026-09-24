import { Link } from "react-router-dom";
import { SUGGESTED_QUESTIONS } from "../../data/botKnowledge";

// Knowledge-base links to "/#contact" are written generically (the intent
// doesn't know what page it'll be answered from), but every page (Home,
// Products, Specs) renders its own Contact section at the same #contact
// anchor. Swapping in the visitor's current path here sends them to the
// contact form on *this* page instead of always bouncing to Home's.
function resolveLink(href, pathname) {
  return href === "/#contact" ? `${pathname}#contact` : href;
}

export default function ChatTranscript({ messages, typing, pathname, send, onLinkClick }) {
  return (
    <>
      {messages.map((msg, i) => (
        <div key={i} className={`hp-chat__msg hp-chat__msg--${msg.role}`}>
          <div className="hp-chat__bubble">
            {msg.text.split("\n").map((line, j) => (
              <span key={j} className="hp-chat__line">{line}</span>
            ))}
            {msg.links && (
              <div className="hp-chat__links">
                {msg.links.map((link) => (
                  <Link
                    key={link.href}
                    to={resolveLink(link.href, pathname)}
                    className="hp-chat__link"
                    onClick={onLinkClick}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {/* Only the most recent bot message ever shows its suggestion
              chips — without this, every past fallback ("I'm not sure
              I have an answer...") kept its own chip row forever, so a
              conversation with a few unanswered questions stacked the
              exact same "What products do you offer?" / "How much do
              panels cost?" chips over and over down the transcript. */}
          {msg.showSuggestions && i === messages.length - 1 && !typing && (
            <div className="hp-chat__suggestions">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="hp-chat__chip"
                  onClick={() => send(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {typing && (
        <div className="hp-chat__msg hp-chat__msg--bot">
          <div className="hp-chat__bubble hp-chat__bubble--typing" aria-label="Assistant is typing">
            <span /><span /><span />
          </div>
        </div>
      )}
    </>
  );
}
