import { BOT_INTENTS, FAQS } from "../data/botKnowledge";

// Words carrying no matching signal — stripped from both the query and the
// knowledge base so scoring is driven by meaningful terms only.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "am", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "i", "you", "we", "they", "he", "she", "it", "me", "my", "your", "our", "us", "of", "to", "in", "on",
  "for", "with", "and", "or", "but", "if", "so", "at", "by", "from", "about", "as", "can", "could", "would",
  "should", "will", "what", "which", "who", "how", "when", "where", "why", "this", "that", "these", "those",
  "there", "here", "please", "tell", "give", "want", "need", "get", "any", "some", "more", "much", "many",
  "kind", "sort", "type",
  // Apostrophe-free contractions ("whats", "hows", ...) of stopwords already
  // above — normalize() only strips punctuation, it doesn't rejoin "what's"
  // into "what", so a query/keyword typed without the apostrophe ("whats
  // the price") left "whats" surviving as its own token instead of being
  // filtered like its apostrophized twin. An unfiltered "whats"/"hows" is
  // pure noise (matches nothing meaningful) but was still a real shared
  // token wherever a keyword phrase happened to use the same spelling —
  // enough to occasionally outscore the actually-relevant intent.
  "whats", "hows", "whos", "wheres", "whens", "whys", "thats", "theres",
]);

// Query-side synonym expansion: when a token on the left appears in the
// user's message, the terms on the right are added to the token set too, so
// "price"/"cost"/"quote" all reach the same pricing intent even though a
// given knowledge entry only lists one of them. Deliberately one-directional
// (expand the QUERY, not the knowledge base) to keep it predictable.
const SYNONYMS = {
  cost: ["price", "pricing", "quote", "estimate", "expensive", "afford", "budget"],
  price: ["cost", "pricing", "quote", "estimate"],
  quote: ["cost", "price", "estimate", "pricing"],
  buy: ["purchase", "order", "cost", "price"],
  color: ["colour", "finish", "paint", "palette"],
  colour: ["color", "finish"],
  delivery: ["deliver", "ship", "shipping", "freight", "lead"],
  ship: ["shipping", "deliver", "delivery"],
  fast: ["quick", "speed", "soon", "lead"],
  insulation: ["rvalue", "r8", "thermal", "energy"],
  rvalue: ["insulation", "thermal", "r8"],
  contact: ["phone", "email", "call", "reach", "number"],
  phone: ["call", "number", "contact"],
  email: ["mail", "contact"],
  location: ["address", "where", "located", "office"],
  address: ["location", "where", "located"],
  spec: ["specs", "specification", "specifications", "technical", "datasheet"],
  cert: ["certification", "certifications", "certified", "certificate"],
  fire: ["fireproof", "flame", "burn", "fm", "class1"],
  door: ["doors", "entry"],
  panel: ["panels"],
  foam: ["core", "pir", "pur", "eps", "insulation"],
  mineral: ["rockwool", "wool"],
  install: ["installation", "installing", "fit", "fitting", "mount"],
  size: ["sizes", "dimension", "dimensions", "length", "lengths", "width", "thickness"],
  warranty: ["guarantee", "guaranteed", "lifespan"],
  product: ["products", "sell", "offer", "catalog", "catalogue"],
  human: ["person", "representative", "rep", "agent", "someone"],
};

// Short, low-signal replies that only make sense in light of whatever the
// bot just said ("yes", "ok", "how", "tell me more") — these carry no
// matchable keywords of their own, so without special-casing they always
// fell through to the generic "I'm not sure I have an answer" fallback even
// though the visitor was clearly still engaged with the previous topic,
// not asking something new and off-topic.
const CONTINUATION_PHRASES = new Set([
  "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "please", "please do",
  "go on", "go ahead", "sounds good", "great", "cool", "nice", "awesome",
  "tell me more", "more info", "more information", "how", "how so", "why",
  "really", "interesting", "and", "then what", "what else", "anything else",
]);

// Distance-1 Levenshtein check (one insertion/deletion/substitution away) —
// deliberately not a full edit-distance implementation since we only ever
// care about "off by one typo", not degree of difference. Lets a common
// typo ("insullation", "certifcate", "delivry") still land on the right
// intent instead of silently scoring 0 and falling back, without the cost
// or false-positive risk of a looser fuzzy match.
function isOneEditAway(a, b) {
  if (a === b) return false;
  const lenDiff = a.length - b.length;
  if (lenDiff < -1 || lenDiff > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    edits++;
    if (edits > 1) return false;
    if (a.length === b.length) { i++; j++; } // substitution
    else if (a.length > b.length) i++; // extra char in a (deletion)
    else j++; // extra char in b (insertion)
  }
  edits += (a.length - i) + (b.length - j);
  return edits <= 1;
}

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // punctuation → spaces (keeps digits, e.g. "r8", "9001")
    .replace(/\s+/g, " ")
    .trim()
    // Collapse the many ways people write R-value into one strong token —
    // otherwise "r" gets dropped as a 1-char word and only the useless
    // "value" survives, so "what's the r value" matched nothing.
    .replace(/\br value\b/g, "rvalue")
    .replace(/\br8\b/g, "rvalue")
    .replace(/\br 8\b/g, "rvalue");
}

// Used only for indexing the knowledge base itself (see buildKnowledgeBase
// below), NOT for scoring a query — an entry is static content, so it's
// harmless for its own token set to carry both "panels" and "panel" as
// separate entries; the singularization only becomes a problem when it's
// the QUERY side effectively saying the same one word twice (see
// tokenizeQuery below, which exists specifically to avoid that).
function tokenizeForIndex(text) {
  const words = normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  // Light singularization: also emit the singular of any plural so
  // "doors"/"panels"/"colors" match a knowledge entry that only lists the
  // singular (and vice-versa via the synonym map). Skips "ss" endings
  // ("class" shouldn't become "clas") and very short words.
  const out = [];
  for (const w of words) {
    out.push(w);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) out.push(w.slice(0, -1));
  }
  return out;
}

// The distinct, meaningful words in a query — deduped, and deliberately
// WITHOUT tokenizeForIndex's singular-duplication. That distinction matters:
// scoring below counts at most one point per distinct word the visitor
// actually typed (see wordVariants/scoreEntry). If the query side also
// emitted "panels" AND "panel" as two separate entries, or dumped every
// synonym of a word straight into one flat bag alongside it, one real word
// could silently rack up several points against an entry that happens to
// list multiple of its variants — enough, in practice, to outscore a much
// more specific match elsewhere (confirmed: "are you human" was answering
// as the wrong intent because "human" alone expands to 5 synonyms that are
// ALL literal keywords of one particular intent, inflating its score to
// 6.9 against a more relevant intent's 3.65).
function tokenizeQuery(text) {
  return Array.from(new Set(
    normalize(text).split(" ").filter((w) => w.length > 1 && !STOPWORDS.has(w))
  ));
}

// Every form a single query word could plausibly match under: itself, its
// singular (if it's a plural), its declared synonyms, and — only as a last
// resort — a one-typo-away vocabulary correction. All of these represent
// the SAME one thing the visitor said, so the caller (scoreEntry) counts a
// hit via any of them as exactly 1 point, never more.
//
// The typo correction specifically only runs when `word` isn't already a
// real, recognized vocabulary word (see VOCAB_SET below) — without that
// guard, a correctly-spelled word like "estimate" could still get
// "corrected" into a coincidentally-similar-but-unrelated real word (its
// own plural "estimates", as indexed from a completely different FAQ's
// question text) purely because they're one edit apart, handing that
// unrelated entry extra, undeserved points even though nothing was
// actually misspelled.
function wordVariants(word) {
  const variants = new Set([word]);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) variants.add(word.slice(0, -1));
  const syns = SYNONYMS[word];
  if (syns) syns.forEach((s) => variants.add(s));
  else if (word.length >= 5 && !VOCAB_SET.has(word)) {
    const corrected = VOCAB.find((v) => isOneEditAway(word, v));
    if (corrected) variants.add(corrected);
  }
  return variants;
}

// Turns the raw knowledge sources into a uniform scored-lookup shape. Each
// entry keeps: a Set of significant tokens (drawn from its explicit keywords
// AND, for FAQs, the question text), the multi-word keyword phrases (for a
// phrase-contains bonus), the answer, and any links. Built once at import.
// Words so generic to this domain (this is a company that sells nothing
// but panels) that treating them as ordinary bag-of-words tokens let
// whichever intent happened to mention them win ties against much more
// specific, correct answers — confirmed: "are your panels fire resistant?"
// was answering with the generic product list instead of fire/certification
// info, purely because "panels" was one of products-overview's own tokens
// (from keyword phrases like "panel types"). Excluded here from the TOKEN
// set only — an exact keyword PHRASE containing one of these ("panel
// types", "what panels") still gets its full phrase-bonus if a visitor
// types that phrase verbatim (see the `phrases` array below, built
// independently of this filter).
const WEAK_TOKENS = new Set(["panel", "panels"]);

function buildKnowledgeBase() {
  const kb = [];

  for (const intent of BOT_INTENTS) {
    const tokenSet = new Set();
    const phrases = [];
    // Single bare-word keywords ("contact", "phone", "foam"), as opposed to
    // multi-word phrases — these are the intent's own deliberately curated
    // primary terms, so a query that IS exactly one of them (see the
    // primaryTerms bonus below) is the strongest possible signal short of a
    // full phrase match. Without distinguishing these from a token that
    // only showed up as a byproduct of tokenizing some unrelated longer
    // phrase (e.g. "contact" is also a stray token of the `human` intent's
    // "contact sales" keyword), a single-word query like "contact" or
    // "phone" tied 1-for-1 against whichever intent happened to pick up
    // that same incidental token, instead of clearly favoring the intent
    // that word actually belongs to.
    const primaryTerms = new Set();
    for (const kw of intent.keywords) {
      tokenizeForIndex(kw).forEach((t) => { if (!WEAK_TOKENS.has(t)) tokenSet.add(t); });
      if (kw.includes(" ")) phrases.push(normalize(kw));
      else primaryTerms.add(normalize(kw));
    }
    kb.push({ id: intent.id, tokens: tokenSet, phrases, primaryTerms, answer: intent.answer, links: intent.links || null, weight: 1.15 });
  }

  FAQS.forEach((faq, i) => {
    const tokenSet = new Set(tokenizeForIndex(faq.question).filter((t) => !WEAK_TOKENS.has(t)));
    kb.push({ id: `faq-${i}`, tokens: tokenSet, phrases: [normalize(faq.question)], primaryTerms: new Set(), answer: faq.answer, links: null, weight: 1 });
  });

  return kb;
}

// An entry's `answer` is either a single string or, for intents that come
// up often enough in one session that repeating the exact same line would
// read as scripted (greetings, thanks, small talk), an array of equally
// valid phrasings — picked randomly here so the caller never has to care
// which shape a given entry uses.
function resolveAnswer(answer) {
  return Array.isArray(answer) ? answer[Math.floor(Math.random() * answer.length)] : answer;
}

const KNOWLEDGE_BASE = buildKnowledgeBase();

// Every significant token any knowledge entry actually listens for — used
// to correct a query token that doesn't match anything outright but is one
// typo away from a real one (see isOneEditAway and its use in wordVariants
// above). Only words of length >= 5 are worth candidates for: short words
// ("fit", "load") have too many one-edit neighbors to fuzzy-match safely.
const VOCAB = Array.from(new Set(KNOWLEDGE_BASE.flatMap((e) => Array.from(e.tokens)))).filter((w) => w.length >= 5);
// Same set, for an O(1) "is this already a real word, not a typo" check —
// see wordVariants' guard before it ever attempts a fuzzy correction.
const VOCAB_SET = new Set(VOCAB);

// Minimum score an entry must reach to be treated as a confident answer.
// Below this we return a graceful fallback instead of a weak guess. Set to
// 1.0 so a single solid topic keyword ("doors", "install", "rvalue") is
// enough to answer — for a support bot, answering a clearly on-topic
// one-word-signal question beats over-refusing. Genuinely off-topic input
// ("how do banana boats work") still scores 0 and falls back cleanly.
const MATCH_THRESHOLD = 1.0;

// Several phrasings for the same "couldn't find a match" situation, picked
// at random, so a visitor who trips it more than once in a session (easy to
// do — a couple of off-topic tries in a row) doesn't see the exact same
// canned sentence twice in a row, which is one of the fastest ways a bot
// reads as a script instead of something actually listening.
const FALLBACK_REPLIES = [
  "I'm not sure I have an answer for that one. I can help with our products, pricing, specs, certifications, colors, delivery, and contact info, ask me about any of those, or reach our team directly.",
  "Hmm, that one's outside what I can help with directly. I know our products, pricing, specs, certifications, colors, and delivery well though, ask me about any of those, or I can point you to our team.",
  "I don't have a good answer for that. Happy to help with panels, doors, pricing, specs, certifications, or delivery though, or I can connect you with someone on our team who can dig deeper.",
];

// Short "still with you" replies for a continuation message (see
// CONTINUATION_PHRASES) that follows a real, already-answered topic —
// varied for the same reason as FALLBACK_REPLIES above, and phrased as a
// natural follow-up rather than restating the whole previous answer.
const CONTINUATION_REPLIES = [
  "Happy to help further, here's the best next step:",
  "Sure thing, this should get you there:",
  "Great, here's where to take that further:",
];

// Scores the query against every knowledge entry and returns the best answer,
// or a fallback flagged with `fallback: true`. Scoring: each shared
// significant token is worth 1 (weighted by the entry's own weight so curated
// intents edge out auto-derived FAQ tokens on ties), plus a bonus when the
// raw query text contains one of the entry's multi-word key phrases outright.
//
// `context.lastId` (the KB entry id from the previous turn, tracked by the
// caller) lets a short, topic-free follow-up like "yes" or "tell me more"
// stay anchored to whatever was just discussed instead of reading as a
// brand-new, unmatched question every time — a real person keeps track of
// what "that" refers to; a stateless keyword matcher otherwise can't.
export function getBotResponse(rawInput, context = {}) {
  const queryWords = tokenizeQuery(rawInput);
  const normalizedQuery = normalize(rawInput);

  // Checked before the empty-words fallback below: phrases like "tell me
  // more" or "go ahead" are made entirely of stopwords ("tell", "me",
  // "more"), so tokenizeQuery() strips them down to nothing — without this
  // ordering they'd hit that generic empty-input fallback before ever
  // getting a chance to be read as a continuation of the last topic.
  if (context.lastId && CONTINUATION_PHRASES.has(normalizedQuery)) {
    const lastEntry = KNOWLEDGE_BASE.find((e) => e.id === context.lastId);
    if (lastEntry) {
      const intro = CONTINUATION_REPLIES[Math.floor(Math.random() * CONTINUATION_REPLIES.length)];
      return {
        id: lastEntry.id,
        text: lastEntry.links ? intro : `${intro} feel free to ask me anything else, or reach our team directly.`,
        links: lastEntry.links || [{ label: "Contact our team", href: "/#contact" }],
        fallback: false,
      };
    }
  }

  // Checked against the normalized string itself, not queryWords — a
  // phrase like "how are you" is made entirely of stopwords ("how", "are",
  // "you"), so it tokenizes down to nothing even though it's a perfectly
  // meaningful message. Bailing out here only for genuinely blank/
  // punctuation-only input lets an all-stopword phrase keep going below
  // and still get credit for a whole-phrase match (e.g. against the
  // small-talk intent's own "how are you" keyword).
  if (!normalizedQuery) {
    return {
      id: null,
      text: "Ask me anything about Harvest Panel Systems, our products, pricing, specs, certifications, or delivery.",
      links: null,
      fallback: true,
    };
  }

  const scored = [];

  for (const entry of KNOWLEDGE_BASE) {
    // Each distinct word the visitor typed contributes at most 1 point to
    // this entry, no matter how many of its synonyms/variants happen to
    // match (see wordVariants) — a query only ever said one thing, and
    // scoring it as more than that is what let a single word like "human"
    // (5 synonyms, all coincidentally keywords of one particular intent)
    // outscore a far more specific match elsewhere.
    let overlap = 0;
    const matchedWords = new Set();
    for (const word of queryWords) {
      const variants = wordVariants(word);
      for (const v of variants) {
        if (entry.tokens.has(v)) {
          overlap += 1;
          matchedWords.add(word);
          break;
        }
      }
    }

    let score = overlap * entry.weight;
    // The visitor's entire message IS one of this entry's own deliberately
    // curated single-word keywords ("contact", "phone", "foam") — the
    // strongest signal short of a full phrase match, and specifically what
    // keeps a short query from tying against some other entry that only
    // picked up that same word as an incidental token of an unrelated
    // longer phrase (see primaryTerms in buildKnowledgeBase above).
    if (entry.primaryTerms.has(normalizedQuery)) score += 2.0;
    // Whole-phrase hit (e.g. the user typed "how much do panels cost" and the
    // FAQ question is literally that) is a strong signal on its own — worth
    // checking even with zero token overlap, since an all-stopword phrase
    // like "how are you" only ever has this to go on.
    for (const phrase of entry.phrases) {
      if (phrase.length > 4 && normalizedQuery.includes(phrase)) {
        score += 2.5;
        break;
      }
    }
    if (score === 0) continue;
    scored.push({ entry, score, matchedWords });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.entry ?? null;
  const bestScore = scored[0]?.score ?? 0;

  if (best && bestScore >= MATCH_THRESHOLD) {
    // A single-best-match answer silently drops the rest of a multi-topic
    // question ("what colors do you have AND how much do panels cost"
    // used to only ever answer pricing, with no sign the colors half was
    // even noticed). A genuinely separate second topic gets a short
    // follow-on mention instead of being dropped entirely — but ONLY when
    // it's actually driven by a different word than the top match. Score
    // alone isn't enough to tell "second topic" apart from "a different KB
    // entry about the very same topic": this site auto-folds each FAQ in
    // as its own entry, so a query like "how much do panels cost" matches
    // both the curated `quote` intent AND FAQ "How much do Panels Cost?"
    // — both driven by the exact same word ("cost"), not two different
    // things the visitor asked about. Requiring the second entry to have
    // matched via a word the top entry did NOT is what tells those two
    // situations apart.
    const secondCandidate = scored[1]?.score >= MATCH_THRESHOLD * 2 ? scored[1] : null;
    const second = secondCandidate && [...secondCandidate.matchedWords].some((w) => !scored[0].matchedWords.has(w))
      ? secondCandidate.entry
      : null;
    const text = second
      ? `${resolveAnswer(best.answer)}\n\nYou also asked about that: ${resolveAnswer(second.answer)}`
      : resolveAnswer(best.answer);
    const links = second ? [...(best.links || []), ...(second.links || [])] : best.links;
    return { id: best.id, text, links: links?.length ? links : null, fallback: false };
  }

  // Nothing else matched, but the visitor did say "panel(s)" somewhere —
  // WEAK_TOKENS deliberately keeps that word from tipping scoring in favor
  // of whichever entry incidentally mentions it (see WEAK_TOKENS above),
  // but that shouldn't mean a plain "panels?" gets the same blank shrug as
  // genuinely unrelated input: products-overview is a perfectly sensible
  // default for a company whose entire business is panels.
  if (queryWords.some((w) => w === "panel" || w === "panels")) {
    const productsEntry = KNOWLEDGE_BASE.find((e) => e.id === "products-overview");
    if (productsEntry) {
      return { id: productsEntry.id, text: resolveAnswer(productsEntry.answer), links: productsEntry.links, fallback: false };
    }
  }

  return {
    id: null,
    text: FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)],
    links: [{ label: "Contact our team", href: "/#contact" }],
    fallback: true,
  };
}
