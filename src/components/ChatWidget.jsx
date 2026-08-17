import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./ChatWidget.css";
import { getBotResponse } from "../utils/chatbot";
import { SUGGESTED_QUESTIONS } from "../data/botKnowledge";
import { announcePanelOpened, onOtherPanelOpened } from "../utils/floatingPanels";
// WebP, not PNG — same 240x180 artwork, but ~4-5x smaller (WebP's
// compression beats PNG considerably even at a high, visually-lossless
// quality setting), which matters most on mobile/slower connections since
// this loads as part of the main bundle on every page.
import mascotIconDefault from "../assets/images/Harvest Panels Mascot Sticker/Harvest Panels Mascot Sticker 1.webp";
import mascotIconOpened from "../assets/images/Harvest Panels Mascot Sticker/Harvest Panels Mascot Sticker 3.webp";
import mascotIconNewMessage from "../assets/images/Harvest Panels Mascot Sticker/Harvest Panels Mascot Sticker 2.webp";

// A small, natural "thinking" delay before the bot's reply lands — an
// instant answer reads as canned/robotic, a brief pause reads as a real
// assistant composing a response. Purely cosmetic; the answer is already
// computed synchronously.
const REPLY_DELAY_MS = 3000;

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
function isPointOnVisiblePixel(imgEl, clientX, clientY) {
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

// The resting "online" pill (shown once the visitor has read/dismissed the
// unread nudge) cycles through these rather than sitting on one static
// line forever — reads as a little more alive/attentive while idle,
// looping back to the start once it reaches the end.
const RESTING_MESSAGES = ["Ask me anything!", "Let me know your concerns.", "Feel free to reach out!"];
const RESTING_MESSAGE_INTERVAL_MS = 4000;

// Knowledge-base links to "/#contact" are written generically (the intent
// doesn't know what page it'll be answered from), but every page (Home,
// Products, Specs) renders its own Contact section at the same #contact
// anchor. Swapping in the visitor's current path here sends them to the
// contact form on *this* page instead of always bouncing to Home's.
function resolveLink(href, pathname) {
  return href === "/#contact" ? `${pathname}#contact` : href;
}

const GREETING = {
  role: "bot",
  text: "Hi! I'm the Harvest Panel Systems assistant. Ask me about our insulated metal panels & doors, products, pricing, specs, certifications, or delivery.",
  links: null,
  showSuggestions: true,
};

// Proactive check-ins once a visitor has started a real conversation — a
// mix of plain "still there?" nudges and small, genuinely useful company
// tidbits, so it reads as attentive hospitality rather than a repeating
// timer. Kept short and conversational (no exclamation-point spam, no
// "AS AN AI" stiffness) to match how the rest of the bot's copy talks.
// ENGAGEMENT_INTERVAL_MS below governs how long the visitor has to go
// quiet before one of these fires.
const ENGAGEMENT_MESSAGES = [
  { text: "Still there? Happy to help if you've got more questions about panels or doors.", links: null },
  { text: "Just checking in. Let me know if you'd like pricing, specs, or delivery info for any of our panels.", links: null },
  {
    text: "Quick fact while you think it over: our insulated metal panels come in PIR, PUR, and EPS core options, so there's usually a fit for whatever you're building.",
    links: null,
  },
  {
    text: "By the way, most of our panels ship with immediate availability, so there's no long lead time to plan around.",
    links: null,
  },
  {
    text: "If it's easier, you can always reach a real person directly.",
    links: [{ label: "Contact us", href: "/#contact" }],
  },
  { text: "No rush. I'll be right here whenever you're ready to keep going.", links: null },
];

const ENGAGEMENT_INTERVAL_MS = 2 * 60 * 1000;

// Once this many messages have piled up unread while the visitor isn't
// looking, further proactive check-ins stop scheduling themselves — past
// this point they've clearly stepped away, and a check-in every 2 minutes
// forever would just be piling up noise (and unread-count inflation) for
// no one. Real replies to something the visitor actually typed are never
// capped this way, only the unsolicited engagement nudges are.
const MAX_UNREAD_ENGAGEMENT_MESSAGES = 5;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  // The "new message" nudge: every fresh page load starts a fresh
  // conversation (the greeting message resets too), so it should always
  // greet the visitor again on refresh, not just once ever per browser.
  const [unread, setUnread] = useState(true);
  // Separate from `unread` (which is a one-time "you've never opened this"
  // flag): re-triggers the nudge whenever a bot reply lands while the panel
  // is folded, e.g. the visitor closed it mid-typing-indicator. Cleared the
  // next time they open the panel.
  const [hasNewReply, setHasNewReply] = useState(false);
  // How many bot messages (real replies + proactive engagement check-ins)
  // have landed since the panel was last opened — drives the nudge text
  // switching from "New reply from the assistant!" to "You have N unread
  // messages!" once more than one has piled up unseen. Reset to 0 the
  // moment the visitor opens the panel (they're about to see all of them).
  const [unreadCount, setUnreadCount] = useState(0);
  // Launcher shows the "sticker 1" pose fresh on every page load; once the
  // visitor has opened the panel at least once, it switches to "sticker 3"
  // for the rest of the session (persists across navigation/close, resets
  // only on a real refresh since this is plain useState).
  const [hasOpened, setHasOpened] = useState(false);
  // Which line of RESTING_MESSAGES the "online" pill is currently showing.
  const [restingMsgIndex, setRestingMsgIndex] = useState(0);
  // Whether the cursor is currently over a genuinely visible pixel of the
  // closed-state mascot image (not the transparent padding around/inside
  // it) — drives the hover-lift class in ChatWidget.css for both the icon
  // itself and its popup message, which must ONLY ever lift by hovering an
  // actual visible pixel of the icon (never by hovering the popup
  // directly, which stays pointer-events:none, or any other trigger).
  const [iconHovered, setIconHovered] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const launcherIconRef = useRef(null);
  const replyTimer = useRef(null);
  // Idle-since-last-user-message clock for the proactive engagement
  // check-ins (see ENGAGEMENT_MESSAGES) — reset every time the visitor
  // actually sends something, so it always measures quiet time from their
  // last activity rather than firing on a fixed wall-clock cadence
  // regardless of whether they're mid-conversation.
  const engagementTimer = useRef(null);
  // Avoids repeating the exact same check-in twice in a row.
  const lastEngagementIndex = useRef(-1);
  // The knowledge-base id the bot last answered from (null after a
  // fallback) — passed back into getBotResponse so a short, topic-free
  // follow-up ("yes", "tell me more") can be read as a continuation of that
  // same topic instead of an unmatched new question. See CONTINUATION_
  // PHRASES in utils/chatbot.js.
  const lastIntentId = useRef(null);
  // Read inside the reply timeout to check the *current* open state, since
  // the closure captures whatever `open` was when send() was called, not
  // whatever it is by the time the delayed reply actually arrives.
  const openRef = useRef(open);
  // Mirrors `unreadCount` for the same reason — scheduleEngagement's
  // setTimeout closure needs the CURRENT unread count when it fires, not
  // whatever it was back when that timeout was scheduled.
  const unreadCountRef = useRef(unreadCount);
  // Tracks whether the panel has actually been open, so focus only returns
  // to the launcher on a real close (open → closed transition) — never on
  // the initial page load. Keyed on the state transition rather than a
  // "first run" flag so it's robust to React StrictMode's double-invoked
  // effects in dev (which defeated the first-run approach). Without this,
  // the launcher grabbed focus on load, showing its focus ring — and the
  // global button:focus-visible rule in App.css squared off its circle.
  const wasOpen = useRef(false);

  // Closes the panel on every route change — otherwise it's mounted once
  // outside the routed pages (see App.jsx) and never unmounts, so it just
  // stayed open, floating over whatever page you navigated to, which read
  // as a leftover artifact rather than a deliberate part of that page. The
  // conversation itself (messages/input) is left alone — only open/closed
  // resets, so context isn't lost by clicking a link.
  //
  // React-Compiler-compliant "adjust state during render" pattern (see
  // react-hooks/set-state-in-effect) rather than a useEffect keyed on the
  // pathname — Nav.jsx's own NavDropdown already uses this exact idiom for
  // the same reason: the state change needs to happen the instant the
  // pathname changes, not after an effect pass, and setState-in-an-effect
  // is what that lint rule (correctly) flags as likely to cascade renders.
  // Same idea as Nav.jsx's own per-mount entrance (its collapsed pill
  // replays its pop-in on every page navigation, since each page mounts a
  // fresh <Nav>) — the launcher and its nudge should read the same way,
  // greeting the visitor again each time they land on a new page, not
  // just once for the whole session. ChatWidget itself is mounted once
  // outside the routed pages (see App.jsx) specifically so the
  // conversation isn't lost on navigation, so it can't just remount like
  // Nav does; `unread` re-arming here plus keying the launcher/nudge
  // below (see the JSX) is what replays the same effect without losing
  // any chat state.
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setOpen(false);
    setUnread(true);
    setHasNewReply(false);
    setUnreadCount(0);
    setHasOpened(false);
  }

  // Clears wasOpen in its own effect (mutating a ref during render is
  // disallowed too, same as calling setState there) rather than inline in
  // the render-time block above — declared *before* the focus-management
  // effect below so it runs first within the same commit, clearing the
  // ref before that effect reads it. Without this, closing the panel via
  // navigation would still be treated as a "real" close by that effect
  // and yank focus back to the launcher, away from the new page.
  useEffect(() => {
    wasOpen.current = false;
  }, [location.pathname]);

  // Opening the panel swaps the button's content from the mascot image to
  // the plain X circle — clears any "default" cursor the closed-state
  // hover handler left behind (see onMouseMove below), since that handler
  // stops running once open and would otherwise leave the X looking
  // non-interactive until the next mouse movement re-sets it. (A stale
  // iconHovered=true is harmless on its own — see where it's read below,
  // gated on `!open` there instead of reset here, to avoid a setState
  // call inside this effect.)
  useEffect(() => {
    if (open && buttonRef.current) buttonRef.current.style.cursor = "";
  }, [open]);

  // Keep the transcript pinned to the newest message / typing indicator.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, typing, open]);

  // Focus the input when the panel opens; return focus to the launcher when
  // it closes, so keyboard users aren't stranded.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    // Panel is closed: only pull focus back to the launcher if it was
    // genuinely open before (a real close), never on the initial load.
    if (wasOpen.current) {
      wasOpen.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  // Escape closes the panel while it's open.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Mutually exclusive with the mobile nav dropdown (see Nav.jsx's own
  // matching pair of effects) — the two are unrelated fixed-position
  // overlays that would otherwise both be able to stay open at once,
  // stacking awkwardly on a small screen.
  useEffect(() => {
    if (open) announcePanelOpened("chat");
  }, [open]);

  useEffect(() => onOtherPanelOpened("chat", () => setOpen(false)), []);

  useEffect(() => () => {
    clearTimeout(replyTimer.current);
    clearTimeout(engagementTimer.current);
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Cycles the resting "online" pill's message on a loop, only while it's
  // actually the thing showing (panel closed, unread already dismissed,
  // no fresher reply waiting) — no point ticking a hidden timer the rest
  // of the time.
  const restingPillShowing = !open && !unread && !hasNewReply;
  useEffect(() => {
    if (!restingPillShowing) return;
    const interval = setInterval(() => {
      setRestingMsgIndex((i) => (i + 1) % RESTING_MESSAGES.length);
    }, RESTING_MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [restingPillShowing]);

  // Resets the "how long has the visitor gone quiet" clock and reschedules
  // the next proactive check-in — called both after every message the
  // visitor sends (so it always counts from their last activity) and again
  // at the end of each check-in itself, so the hospitality keeps going for
  // as long as the conversation stays open, not just once.
  function scheduleEngagement() {
    clearTimeout(engagementTimer.current);
    engagementTimer.current = setTimeout(() => {
      // The visitor hasn't looked back at the chat in a while and unread
      // messages have already piled up past the cap — stop scheduling
      // further check-ins rather than continuing to nudge every 2 minutes
      // forever. Left unopened, this loop starts right back up the next
      // time they open the panel (see the launcher's onClick below) or send
      // a new message, both of which reset `unreadCount` to 0 first.
      if (!openRef.current && unreadCountRef.current >= MAX_UNREAD_ENGAGEMENT_MESSAGES) return;

      let idx = lastEngagementIndex.current;
      if (ENGAGEMENT_MESSAGES.length > 1) {
        while (idx === lastEngagementIndex.current) {
          idx = Math.floor(Math.random() * ENGAGEMENT_MESSAGES.length);
        }
      } else {
        idx = 0;
      }
      lastEngagementIndex.current = idx;
      const msg = ENGAGEMENT_MESSAGES[idx];
      setMessages((m) => [...m, { role: "bot", text: msg.text, links: msg.links, showSuggestions: false }]);
      if (!openRef.current) {
        setHasNewReply(true);
        setUnreadCount((n) => n + 1);
      }
      scheduleEngagement();
    }, ENGAGEMENT_INTERVAL_MS);
  }

  function send(rawText) {
    const text = rawText.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);
    clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      const res = getBotResponse(text, { lastId: lastIntentId.current });
      lastIntentId.current = res.id;
      setTyping(false);
      setMessages((m) => [
        // Suggestion chips only ever appear on the initial GREETING now, not
        // on every fallback — a fallback's own reply text already lists the
        // same topics in prose ("I can help with our products, pricing,
        // specs..."), so repeating that exact list again as tappable chips
        // right underneath just read as redundant, not helpful.
        ...m,
        { role: "bot", text: res.text, links: res.links, showSuggestions: false },
      ]);
      if (!openRef.current) {
        setHasNewReply(true);
        setUnreadCount((n) => n + 1);
      }
    }, REPLY_DELAY_MS);
    // Only starts once the visitor has actually said something — a silent
    // visitor who never engages shouldn't get unsolicited check-ins, just
    // someone who started a real back-and-forth and then went quiet.
    scheduleEngagement();
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="hp-chat">
      {open && (
        <div className="hp-chat__panel" role="dialog" aria-label="Harvest Panel Systems assistant" aria-modal="false">
          <header className="hp-chat__header">
            <div className="hp-chat__header-title">
              <span className="hp-chat__status-dot" aria-hidden="true" />
              <div>
                <p className="hp-chat__title">Harvest Panel Systems Assistant</p>
                <p className="hp-chat__subtitle">Typically replies instantly</p>
              </div>
            </div>
            <button type="button" className="hp-chat__close" onClick={() => setOpen(false)} aria-label="Close chat">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="hp-chat__messages" ref={listRef}>
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
                          to={resolveLink(link.href, location.pathname)}
                          className="hp-chat__link"
                          onClick={() => setOpen(false)}
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
          </div>

          <form className="hp-chat__input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="hp-chat__input"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Type your question"
            />
            <button type="submit" className="hp-chat__send" disabled={!input.trim() || typing} aria-label="Send message">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M4 12l16-8-6 16-3-6-7-2z" fill="currentColor" />
              </svg>
            </button>
          </form>

          <p className="hp-chat__disclaimer">I'm here to help, ask me anything!</p>
        </div>
      )}

      {/* Keyed on the route — forces React to tear down and recreate this
          subtree on every navigation (rather than just re-rendering the
          same nodes), which is what actually makes the CSS entrance
          animations on .hp-chat__launcher / .hp-chat__nudge replay: a CSS
          `animation` only plays once per element per browser paint,
          fresh DOM nodes from a fresh mount are what re-triggers it,
          simply changing a class on the same nodes wouldn't. */}
      <div
        className={`hp-chat__launcher-wrap${!open && iconHovered ? " hp-chat__launcher-wrap--icon-hover" : ""}`}
        key={location.pathname}
      >
        {!open && (unread || hasNewReply) && (
          <div className={`hp-chat__nudge${hasNewReply ? " hp-chat__nudge--instant" : ""}`} role="status">
            <span className="hp-chat__nudge-dot" aria-hidden="true" />
            {hasNewReply
              ? unreadCount >= 2
                ? `You have ${unreadCount} unread messages!`
                : "New reply from the assistant!"
              : "You have a new message!"}
          </div>
        )}

        {/* Once the visitor has read/dismissed the unread nudge above, the
            launcher settles into a permanent status pill instead of going
            bare — reassures a visitor who's already seen the chat that
            it's ready for another question, not just decoration on their
            first ever visit. */}
        {restingPillShowing && (
          <div className="hp-chat__nudge hp-chat__nudge--online" role="status">
            <span className="hp-chat__nudge-dot hp-chat__nudge-dot--online" aria-hidden="true" />
            {/* Keyed on the message index so each change is a fresh DOM
                node — same trick as the launcher/nudge entrance elsewhere
                in this file, since a CSS `animation` only plays once per
                element per paint and simply swapping the text on the same
                node wouldn't replay it. */}
            <span className="hp-chat__nudge-text" key={restingMsgIndex}>
              {RESTING_MESSAGES[restingMsgIndex]}
            </span>
          </div>
        )}

        <button
          ref={buttonRef}
          type="button"
          className="hp-chat__launcher"
          onClick={(e) => {
            // Closed state: the mascot photo has a transparent background
            // around an irregular shape, so ignore clicks that land on
            // that invisible padding rather than the actual artwork.
            // Keyboard/screen-reader activation (Enter/Space on the
            // focused button) fires a synthetic click with detail === 0
            // and no real coordinates — always let those through, since
            // there's no "pixel" to test in that case.
            if (
              !open &&
              e.detail !== 0 &&
              launcherIconRef.current &&
              !isPointOnVisiblePixel(launcherIconRef.current, e.clientX, e.clientY)
            ) {
              return;
            }
            const next = !open;
            setOpen(next);
            if (next) {
              // If unread messages had piled up to the cap, scheduleEngagement's
              // own timeout already stopped rescheduling itself (see there) —
              // opening the panel is what should bring the hospitality back,
              // same as it would for a visitor who just replied.
              if (unreadCountRef.current >= MAX_UNREAD_ENGAGEMENT_MESSAGES) scheduleEngagement();
              setHasNewReply(false);
              setUnreadCount(0);
              setUnread(false);
              setHasOpened(true);
            }
          }}
          onMouseMove={(e) => {
            // Mirrors the click gate above for the cursor AND the hover
            // lift — without this, both the pointer cursor and the lift
            // animation would trigger over the transparent gaps
            // around/inside the mascot too (e.g. the gap under a raised
            // arm), reading as "this is clickable" right up until the
            // click silently does nothing. Cursor is set imperatively
            // (not via React state) since this can fire dozens of times a
            // second; iconHovered only actually re-renders on the (much
            // rarer) true/false transitions themselves, guarded below.
            if (open || !launcherIconRef.current) return;
            const visible = isPointOnVisiblePixel(launcherIconRef.current, e.clientX, e.clientY);
            e.currentTarget.style.cursor = visible ? "pointer" : "default";
            setIconHovered((prev) => (prev === visible ? prev : visible));
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.cursor = "";
            setIconHovered(false);
          }}
          aria-label={open ? "Close chat assistant" : "Open chat assistant"}
          aria-expanded={open}
        >
          {open ? (
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          ) : (
            <img
              ref={launcherIconRef}
              // Keyed so the icon remounts (replaying its pop-in animation,
              // see .hp-chat__launcher-icon's own `animation` in
              // ChatWidget.css) specifically when the "2+ unread" nudge
              // text appears — the mascot should visibly react in step
              // with that notification, not just sit there while only the
              // popup bubble animates.
              key={hasNewReply && unreadCount >= 2 ? `unread-${unreadCount}` : "base"}
              src={
                hasNewReply
                  ? mascotIconNewMessage
                  : hasOpened
                  ? mascotIconOpened
                  : mascotIconDefault
              }
              alt=""
              className="hp-chat__launcher-icon"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </div>
  );
}
