import { FAQS } from "./faqs";
import { CONTACT } from "./site";

// Supplemental assistant intents that go BEYOND the on-page FAQ list —
// greetings, contact details, "take me to X" navigation, and topic
// summaries that don't map cleanly to a single FAQ question. Each intent
// carries its own explicit `keywords` (the matcher weights these heavily),
// an `answer`, and optional `links` rendered as buttons under the reply.
//
// The FAQS array is folded into the same knowledge base at load time (see
// buildKnowledgeBase in utils/chatbot.js) — its questions are auto-tokenized
// into keywords — so anything already answered there is covered without
// being duplicated here.
export const BOT_INTENTS = [
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "howdy", "greetings", "good morning", "good afternoon", "good evening", "yo", "sup"],
    // Picked at random each time (see resolveAnswer in utils/chatbot.js) so
    // a visitor who re-opens the chat, or says hi again mid-conversation,
    // doesn't hear the exact same opening line twice in a row.
    answer: [
      "Hi! I'm the Harvest Panel Systems assistant. I can answer questions about our insulated metal panels and doors, products, specs, pricing, certifications, delivery, and more. What would you like to know?",
      "Hey there! Happy to help with anything about our panels or doors, products, pricing, specs, certifications, colors, delivery, you name it. What can I help with?",
      "Hello! I'm here to help with questions about Harvest Panel Systems, products, pricing, specs, certifications, delivery, and more. What are you working on?",
    ],
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "thx", "appreciate it", "cheers", "ty"],
    answer: [
      "You're welcome! Anything else I can help you with about our panels or doors?",
      "Anytime! Let me know if anything else comes up.",
      "Happy to help. Feel free to ask if anything else comes to mind.",
    ],
  },
  {
    id: "bot-identity",
    keywords: ["who are you", "what are you", "are you a bot", "are you human", "are you real", "what is this", "chatbot", "assistant"],
    answer: "I'm the Harvest Panel Systems virtual assistant, an automated helper for common questions about our insulated metal panels and doors. For anything I can't answer, I'll point you to our team.",
  },
  {
    id: "small-talk",
    keywords: ["how are you", "how are you doing", "how's it going", "hows it going", "what's up", "whats up", "how have you been"],
    answer: [
      "Doing great, thanks for asking! Ready to help with anything about our panels or doors, what can I do for you?",
      "Can't complain, always happy to talk panels! What's on your mind?",
    ],
  },
  {
    id: "compliment",
    keywords: ["good bot", "great bot", "you're helpful", "youre helpful", "nice bot", "you're the best", "youre the best", "you're great", "youre great", "good job"],
    answer: "That's kind of you to say, thank you! Let me know if there's anything else I can help you track down.",
  },
  {
    id: "frustration",
    keywords: [
      "this isn't working", "this is not working", "not helpful", "useless", "stupid bot", "you're useless", "youre useless",
      "not working", "you don't understand", "you dont understand", "this is frustrating", "i'm frustrated", "im frustrated",
      "you're not helping", "youre not helping", "waste of time",
    ],
    answer: "Sorry about that, I know that's frustrating. Let's get you to someone who can help directly.",
    links: [{ label: "Contact our team", href: "/#contact" }],
  },
  {
    id: "human",
    keywords: ["talk to a human", "speak to someone", "real person", "sales rep", "representative", "agent", "call someone", "contact sales", "speak to sales"],
    answer: `Happy to connect you with our team. Call ${CONTACT.phone} or email ${CONTACT.email}, or use the contact form and we'll get right back to you.`,
    links: [{ label: "Contact us", href: "/#contact" }],
  },
  {
    id: "contact",
    keywords: ["contact", "phone", "phone number", "call", "email", "address", "location", "where are you", "reach you", "get in touch", "hours", "office"],
    answer: `You can reach Harvest Panel Systems at:\n\nPhone: ${CONTACT.phone}\nEmail: ${CONTACT.email}\nAddress: ${CONTACT.address}`,
    links: [{ label: "Open contact form", href: "/#contact" }],
  },
  {
    id: "quote",
    keywords: ["quote", "get a quote", "estimate", "free estimate", "pricing", "price", "how much", "cost", "budget", "request pricing"],
    answer: "Every project is priced to spec, so the fastest way to get an accurate number is a free estimate. As a rough guide, panels typically run $4–$8 per square foot depending on length and thickness, and we back that with a Best Price Guarantee against any competitor's written quote. Send us your specs and we'll put together a no-cost estimate.",
    links: [{ label: "Request a free estimate", href: "/#contact" }],
  },
  {
    id: "order",
    // Deliberately no "buy panels"/"purchase panels"/"how to buy" style
    // phrasing here — tokenizing those left the bare, generic word "panel"
    // as one of THIS intent's own matchable tokens, and since virtually
    // every query on this site mentions "panel" somewhere, that alone was
    // enough to win by default against completely unrelated questions
    // ("how you panel looks like?" was answering with order info). "buy"/
    // "purchase" already reach this intent through the existing buy -> order
    // synonym expansion (see SYNONYMS in utils/chatbot.js), so coverage
    // doesn't need the word "panel" spelled out here at all.
    keywords: [
      "order", "place an order", "make an order", "put in an order", "how do i order", "how to order",
      "start an order", "ordering process", "minimum order", "can i order",
    ],
    answer: "You bet. We don't sell directly through the website, our team specs every order to your project (panel type, thickness, finish, quantities) so it's cut and priced right the first time. Send us your project details or floor plan and we'll turn around a free estimate, then get your order moving.",
    links: [{ label: "Start your order", href: "/#contact" }],
  },
  {
    id: "products-overview",
    keywords: ["products", "what do you sell", "what do you offer", "product line", "catalog", "panel types", "types of panels", "what panels", "browse products", "your products"],
    answer: "We supply insulated metal panels in PIR, EPS, PVC, mineral wool, and HarvestBoxx cores, insulated metal doors (hinged, sliding, roll-up), and the mounting hardware and trim to finish an install. You can browse the full catalog on our Products page.",
    links: [{ label: "Browse products", href: "/products" }],
  },
  {
    id: "specs-page",
    keywords: ["specs", "specifications", "technical data", "spec sheet", "data sheet", "engineering data", "tolerances", "load", "span", "weight", "thickness", "dimensions", "sizes chart"],
    answer: "Full technical details, core material, color options, certifications & fire ratings, structural sizing, panel weight, thermal insulation, and load/span charts, live on our Specs page.",
    links: [{ label: "View full specs", href: "/specs" }],
  },
  {
    id: "certifications",
    keywords: ["certification", "certified", "certifications", "fire rating", "fire rated", "fm approved", "factory mutual", "iso", "iso 9001", "ul", "fm 4880", "fm 4881", "fm 4471", "class 1", "standards", "compliance"],
    answer: "Our panels are manufactured under an ISO 9001 quality system and tested to FM's Class 1 fire performance standards, FM 4880 (fire rating), FM 4881 (exterior wall systems), and FM 4471 (roof assemblies). Full details and the individual test standards are on the Specs page.",
    links: [{ label: "See certifications", href: "/specs#certifications" }],
  },
  {
    id: "colors",
    keywords: ["color", "colors", "colours", "finish", "finishes", "paint", "palette", "swatches", "custom color", "what colors"],
    answer: "We offer standard finishes including Grey White, White, White Aluminum, Ivory, Light Blue, Gentian Blue, Signal Green, Colza Yellow, Pure Orange, and Flame Red, and custom colors on request. You can preview each finish on an actual panel on the Specs page.",
    links: [{ label: "View color palette", href: "/specs#colors" }],
  },
  {
    id: "insulation",
    keywords: ["rvalue", "r value", "insulation", "insulating", "insulated", "thermal", "r8", "energy efficiency", "energy efficient", "how insulated", "thermal performance"],
    answer: "Our panels deliver about R-8 per inch of thickness. Exact insulation values (R-values) depend on panel thickness and core material, thicker panels and PIR cores give the highest values. Our team can recommend the right spec for your climate and use case.",
    links: [{ label: "See thermal specs", href: "/specs#engineering" }],
  },
  {
    id: "doors",
    keywords: ["door", "doors", "hinged door", "sliding door", "roll up", "rollup", "cooler door", "freezer door", "entry", "metal door", "insulated door"],
    answer: "Yes, we supply and install insulated metal doors to match the thermal performance of the panels around them: hinged cooler doors, sliding cooler doors, and metal doors for cold storage, clean rooms, and general access.",
    links: [{ label: "Browse doors", href: "/products" }],
  },
  {
    id: "core-materials",
    keywords: ["pir", "pur", "eps", "pvc", "harvestboxx", "harvest boxx", "mineral wool", "rockwool", "rock wool", "foam", "core", "core material", "insulation type", "polyisocyanurate", "polyurethane", "what foam"],
    answer: "We offer five core options: PIR (polyisocyanurate) as our standard, a rigid, closed-cell \"Class 1\" foam with high structural strength, fire resistance, and low smoke emission; EPS (expanded polystyrene) for a lightweight, cost-effective option; PVC interlocking panels for hygienic, wash-down interiors; mineral wool for the highest fire and acoustic performance; and our HarvestBoxx line. Our team can recommend the right core for your fire, cost, or performance needs.",
    links: [{ label: "Learn about panel foam", href: "/specs#foam-core" }],
  },
  {
    // Placed before `delivery` and given country-name keywords as its own
    // primary terms specifically so it outscores that intent for a
    // region-specific question — without this, "do you ship to Canada?"
    // matched the plain `delivery` intent and answered with the domestic
    // 48-hour U.S. timeline as if it directly answered the question, no
    // caveat that it doesn't actually cover international shipping at all.
    id: "international-shipping",
    keywords: [
      "canada", "mexico", "international shipping", "ship internationally", "international delivery",
      "overseas", "export", "outside the us", "other countries", "ship abroad", "ship outside the us",
      "worldwide shipping", "global shipping",
    ],
    answer: "Our stocked delivery timelines (48-hour U.S. shipping) are for domestic delivery only. For shipments outside the U.S., reach out to our team directly, they can confirm what's feasible for your location.",
    links: [{ label: "Ask about international shipping", href: "/#contact" }],
  },
  {
    id: "delivery",
    keywords: ["delivery", "deliver", "shipping", "ship", "how fast", "lead time", "lead times", "how long to get", "when can i get", "availability", "in stock", "stock"],
    answer: "We keep consistent stock in pre-cut lengths and ship from our centrally located Oklahoma distribution center, delivery anywhere in the U.S. within 48 hours of departure. Custom orders can typically be fulfilled within 30 days. Let me know your timeline and I can point you the right direction.",
  },
  {
    id: "warranty",
    keywords: ["warranty", "guarantee", "guaranteed", "how long do panels last", "lifespan", "durability"],
    answer: "Insulated metal panels are built to hold up over decades of use, low-maintenance, moisture-resistant, and durable. For specific warranty terms on your product and project, our team can walk you through the exact coverage.",
    links: [{ label: "Ask about warranty", href: "/#contact" }],
  },
  {
    id: "sustainability",
    keywords: [
      "sustainability", "sustainable", "eco friendly", "environmentally friendly", "green building",
      "recycled", "recyclable", "carbon", "environmental impact", "leed",
    ],
    answer: "Sustainability shows up in the panels themselves: recycled steel content and responsibly sourced materials, high R-value insulation that cuts a building's energy use for its whole life, and steel cores that are fully recyclable at end of life, with take-back options to keep panels out of landfills.",
    links: [{ label: "See our sustainability approach", href: "/#sustainability" }],
  },
  {
    id: "memberships",
    keywords: [
      "memberships", "membership", "affiliations", "associations", "industry association", "trade association",
      "bbb", "better business bureau", "gcca", "global cold chain alliance", "ceba",
      "mbcea", "metal building contractors", "accredited", "member of",
    ],
    answer: "We're proud members of several industry organizations: MBCEA (Metal Building Contractors & Erectors Association), GCCA (Global Cold Chain Alliance), BBB (Better Business Bureau), and CEBA (Controlled Environment Building Association), reflecting our commitment to industry standards and ethical business practices.",
    links: [{ label: "See our memberships", href: "/#memberships" }],
  },
  {
    id: "gallery",
    // Deliberately no "see panels"/"what do panels look like" phrasing —
    // same trap as the order intent above: tokenizing those would leave
    // the bare, generic word "panel" as one of this intent's own matchable
    // tokens, and since nearly every query on this site mentions "panel",
    // that alone would win by default against unrelated questions.
    keywords: [
      "photo gallery", "photos", "pictures", "images", "gallery", "see examples", "past projects",
      "project photos", "show me pictures", "what does it look like",
      "visual examples", "portfolio",
    ],
    answer: "You can see real installs, panels, doors, and finished interiors from projects we've shipped nationwide, in our Photo Gallery. There's also a live preview on the Specs page where you can see any color finish rendered on an actual panel.",
    links: [{ label: "View photo gallery", href: "/#gallery" }, { label: "Preview color finishes", href: "/specs#colors" }],
  },
  {
    id: "market-segments",
    keywords: [
      "data center", "data centers", "cold storage", "cold room", "refrigeration", "freezer",
      "pre engineered", "pre-engineered", "pemb", "metal building", "clean room", "cleanroom",
      "industrial building", "commercial building", "residential", "what industries",
      "cultivation", "cannabis", "grow room", "indoor agriculture", "walk in cooler", "walk-in cooler",
      "pharmaceutical", "pharma", "gmp", "gmp compliant", "drug manufacturing",
    ],
    answer: "We work across a wide range of building types: indoor cultivation & cannabis facilities, data centers, cold storage & refrigeration, walk-in freezers and coolers, clean rooms, pharmaceutical manufacturing facilities, pre-engineered metal buildings, and industrial, commercial, and residential construction. Each has its own recommended panel specs (fire rating, insulation, and finish), our team can match one to your project.",
    links: [{ label: "See building types", href: "/#indoor-agriculture" }],
  },
  {
    id: "trim-hardware",
    keywords: [
      "trim", "hardware", "trim and hardware", "accessories", "flashing", "flashings", "screws",
      "nuts", "washers", "t bar", "t-bar", "butyl", "corner angle", "corner angles",
    ],
    answer: "We also supply the trim & hardware to finish out an installation: flashings, screws, nuts, washers, T-bars, butyl sealant, and corner angles, so everything comes from one source instead of piecing it together separately.",
    links: [{ label: "Browse trim & hardware", href: "/products" }],
  },
];

// Shown as tappable starter chips when the chat first opens (only there —
// a fallback reply already lists these same topics in its own prose, so
// repeating them as chips too read as redundant) — chosen to steer visitors
// toward the highest-value, best-covered topics.
export const SUGGESTED_QUESTIONS = [
  "What products do you offer?",
  "How much do panels cost?",
  "What certifications do you have?",
  "How fast is delivery?",
  "What's the R-value?",
  "How do I contact you?",
];

export { FAQS };
