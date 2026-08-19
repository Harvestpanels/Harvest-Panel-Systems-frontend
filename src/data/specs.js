import flatProfileImg from "../assets/images/Panel Profiles/Flat.webp";
import boxProfileImg from "../assets/images/Panel Profiles/Box.webp";
import trapezoidalProfileImg from "../assets/images/Panel Profiles/Trapezoidal.webp";
import embossedProfileImg from "../assets/images/Panel Profiles/Embossed.webp";
import colzaYellowImg from "../assets/images/Color Palette/Colza Yellow.webp";
import flameRedImg from "../assets/images/Color Palette/Flame Red.webp";
import gentianBlueImg from "../assets/images/Color Palette/Gentian Blue.webp";
import greyWhiteImg from "../assets/images/Color Palette/Grey White.webp";
import ivoryImg from "../assets/images/Color Palette/Ivory.webp";
import lightBlueImg from "../assets/images/Color Palette/Light Blue.webp";
import pureOrangeImg from "../assets/images/Color Palette/Pure Orange.webp";
import signalGreenImg from "../assets/images/Color Palette/Signal Green.webp";
import whiteAluminumImg from "../assets/images/Color Palette/White Aluminum.webp";
import whiteImg from "../assets/images/Color Palette/White.webp";

// Each swatch's `hex` is only the small chip color — `img` is the real
// panel photo in that finish (see the Color Palette folder), shown full
// size in the section's preview pane when that swatch is selected.
// `inStock` drives the availability badge on each swatch — Grey White is
// the only finish kept on hand, every other color is made to order.
export const COLOR_PALETTE = [
  { name: "Grey White", hex: "#e4e2d8", img: greyWhiteImg, inStock: true },
  { name: "White", hex: "#faf9f5", img: whiteImg },
  { name: "White Aluminum", hex: "#c7cbce", img: whiteAluminumImg },
  { name: "Ivory", hex: "#e3cba0", img: ivoryImg },
  { name: "Light Blue", hex: "#86b9db", img: lightBlueImg },
  { name: "Gentian Blue", hex: "#1e56a0", img: gentianBlueImg },
  { name: "Signal Green", hex: "#12a66e", img: signalGreenImg },
  { name: "Colza Yellow", hex: "#f2c81d", img: colzaYellowImg },
  { name: "Pure Orange", hex: "#e8600c", img: pureOrangeImg },
  { name: "Flame Red", hex: "#cc2229", img: flameRedImg },
];

// "Save time, save money" — the construction-efficiency pitch from the
// reference Harvest Panels page (harvestpanels.com/pir-panels): insulated
// metal panels collapse a typical multi-trade wall/roof buildup into one
// installed layer.
export const CONSTRUCTION_EFFICIENCY = {
  intro: "Insulated metal panels compress a typical seven-step wall or roof buildup into a single installed layer, replacing:",
  replaces: [
    "Framing",
    "Insulation",
    "Weather wrap",
    "Drywall / sheathing",
    "Exterior facade",
    "Finishing materials",
  ],
  note: "The result is a tighter building envelope that substantially reduces HVAC load and electricity consumption compared to built-up construction.",
};

export const FOAM_INFO = {
  title: "PIR core, engineered for performance",
  intro: "Our panels use PIR (polyisocyanurate) foam, sometimes called \"Class 1\" foam, a mixture of polyol, isocyanate, and cyclopentane engineered specifically for insulated building envelopes.",
  traits: [
    {
      name: "High structural strength",
      desc: "A rigid, closed-cell core that adds real mechanical strength to the panel, not just insulation value.",
    },
    {
      name: "High fire resistance",
      desc: "PIR chemistry is formulated to resist ignition and limit how quickly fire spreads across the core.",
    },
    {
      name: "Low smoke emission",
      desc: "Produces meaningfully less smoke than standard PUR foam when exposed to fire.",
    },
    {
      name: "Stable thermal performance",
      desc: "Maintains its insulating value under sustained heat exposure, instead of degrading early in a fire event.",
    },
  ],
  alternatives: "PUR and mineral wool (rock wool) cores are also available for projects with different fire, cost, or performance requirements.",
};

export const PERFORMANCE_HIGHLIGHTS = [
  "High insulation R-value",
  "High mechanical strength",
  "High puncture resistance",
  "High thermal resistance",
];

export const CERTIFICATIONS = [
  {
    code: "UL",
    name: "Underwriters Laboratories",
    desc: "Our insulated metal panels are tested and listed by Underwriters Laboratories, an independent safety science organization, verifying that panel and door assemblies meet recognized fire, life-safety, and performance standards.",
  },
  {
    code: "ISO 9001",
    name: "Quality Management",
    desc: "Our insulated metal panels and insulated metal doors are manufactured under an ISO 9001-certified quality management system.",
  },
  {
    code: "FM 4880",
    name: "Class 1 Fire Rating",
    desc: "Sets fire performance requirements for Class 1-rated panels, including height and installation specifications and combustibility ratings.",
    standards: [
      { section: "4.1", name: "Room Test" },
      { section: "4.2", name: "Flammability Characterization" },
      { section: "4.3", name: "16ft High Parallel Panel Test" },
      { section: "4.6", name: "Density of Insulating Cores" },
      { section: "4.9", name: "Ignition Properties" },
      { section: "4.10", name: "Heat Content" },
      { section: "4.11", name: "Ash Content" },
    ],
  },
  {
    code: "FM 4881",
    name: "Exterior Wall Systems",
    desc: "Covers exterior wall panel systems exposed to wind, hail, and windborne debris.",
    standards: [
      { section: "4.1", name: "Wind Pressure Rating" },
      { section: "4.3", name: "Hail Resistance Rating" },
    ],
  },
  {
    code: "FM 4471",
    name: "Roof Assemblies",
    desc: "Sets performance requirements for panel roof assemblies, low fire spread, wind uplift resistance, and structural durability.",
    standards: [
      { section: "4.1", name: "Combustibility Below the Roof Deck" },
      { section: "4.2", name: "Combustibility Above the Roof Deck" },
      { section: "4.3", name: "Wind Uplift Resistance" },
    ],
  },
];

export const STRUCTURAL_SPECS = [
  { label: "Maximum thickness", value: "8\"" },
  { label: "Standard width", value: "39\"" },
  { label: "Widest width", value: "45¼\"" },
  { label: "Longest length", value: "36'" },
  { label: "Insulation types", value: "3 options (PIR, PUR, mineral wool)" },
  { label: "Metal thicknesses", value: "5 options" },
  { label: "Finishes", value: "3 options" },
  { label: "Coating options", value: "4 options" },
];

export const PANEL_FEATURES = [
  "Food-grade finishing",
  "Non-toxic",
  "Chemical-free",
  "Washable",
  "Anti-static",
  "Environmentally friendly",
];

export const TRIM_ACCESSORIES = [
  "Trim",
  "Flashings",
  "Screws",
  "Nuts",
  "Washers",
  "T-Bars",
  "Butyl",
];

// Preview image + description for each standard face profile, shown with
// the same select-a-pill/live-preview UI the Color Palette section uses
// (see COLOR_PALETTE above and the "profiles" section in SpecsPage.jsx).
export const PANEL_PROFILES = [
  { name: "Flat", desc: "A smooth, unribbed face for the most minimal, monolithic appearance.", img: flatProfileImg },
  { name: "Box", desc: "Flat pans separated by narrow ribs, the cleanest, most contemporary look.", img: boxProfileImg },
  { name: "Trapezoidal", desc: "Repeating angular ribs for a bold, structured profile with added rigidity, common on exterior wall and roof panels.", img: trapezoidalProfileImg },
  { name: "Embossed", desc: "A subtle textured stucco finish that hides minor surface imperfections and reduces the appearance of oil-canning.", img: embossedProfileImg },
];

// A separate, smaller set of face profiles shown inline in the Engineering
// Data table (Box/Wave/Flat) — distinct from PANEL_PROFILES' own live-preview
// section above (Flat/Box/Trapezoidal/Embossed), matching the reference
// site's own Engineering Data layout.
export const EXTERNAL_FACE_PROFILES = [
  { name: "Box", desc: "Flat pans separated by narrow ribs, the cleanest, most contemporary look." },
  { name: "Wave", desc: "Continuous rounded corrugations for added stiffness and a classic industrial profile." },
  { name: "Flat", desc: "A smooth, unribbed face for the most minimal, monolithic appearance." },
];

// Every column these engineering tables share — panel nominal thickness,
// steel sheets 24/26 gauge, 4⅝" bearing — transcribed from the reference
// Harvest Panels spec sheet (harvestpanels.com/pir-panels).
export const PANEL_THICKNESS_COLUMNS = ["1⅝\"", "2\"", "2½\"", "3\"", "4\"", "5\"", "6\"", "8\""];

export const PANEL_WEIGHT = {
  columns: PANEL_THICKNESS_COLUMNS,
  rows: [
    { steel: "26/26", values: [2.07, 2.14, 2.24, 2.33, 2.52, 2.70, 2.89, 3.27] },
    { steel: "24/26", values: [2.44, 2.51, 2.61, 2.70, 2.85, 3.04, 3.26, 3.64] },
    { steel: "24/24", values: [2.78, 2.85, 2.94, 3.04, 3.22, 3.41, 3.60, 3.97] },
    { steel: "22/26", values: [2.72, 2.70, 2.88, 2.98, 3.16, 3.35, 3.54, 3.91] },
  ],
  unit: "PSF",
};

export const THERMAL_INSULATION = {
  columns: PANEL_THICKNESS_COLUMNS,
  conditions: [
    {
      label: "75°F Mean Temp (23.9°C)",
      rows: [
        { unit: "mK/W", values: [2.01, 2.48, 3.10, 3.72, 4.96, 6.20, 7.44, 9.92] },
        { unit: "H·ft·F/Btu", values: [11.44, 14.08, 17.61, 21.13, 28.17, 35.21, 42.25, 56.34] },
      ],
    },
    {
      label: "35°F Mean Temp (1.67°C)",
      rows: [
        { unit: "mK/W", values: [2.25, 2.77, 3.46, 4.16, 5.54, 6.93, 8.32, 11.09] },
        { unit: "H·ft·F/Btu", values: [12.81, 15.75, 19.69, 23.62, 31.50, 39.37, 47.24, 62.99] },
      ],
    },
  ],
  rLabel: "R-value shown for reference; exact figures depend on core type and thickness.",
};

export const DIMENSIONAL_TOLERANCE = [
  { label: "Length", value: "L ≤ 9'10\" ± ⅛\" · L > 9'10\" ± ⅜\"" },
  { label: "Working length", value: "± 2 mm" },
  { label: "Thickness", value: "D ≤ 4\" ± 1/16\" · D > 4\" ± 2%" },
  { label: "Perpendicularity deviation", value: "¼\"" },
  { label: "Misalignment of internal metal surfaces", value: "± ⅛\"" },
  { label: "Bottom sheet coupling", value: "F = 1 + ⅛\"" },
];

export const DIMENSIONAL_TOLERANCE_NOTE = "L = working length, D = panel thickness, F = sheet coupling.";

// Two support conditions for the same PSF/thickness grid — "Single span"
// (support at each end only) and "Double span" (an added intermediate
// support), each changing how far a panel can run before it needs
// another purlin/girt. Steel sheets 24/26 gauge, 4⅝" bearing throughout.
export const OVERLOAD_WHEELBASE_TABLES = [
  {
    label: "Single span",
    columns: PANEL_THICKNESS_COLUMNS,
    rows: [
      { psf: 10.24, values: ["10'5⅝\"", "12'5⅝\"", "14'5⅝\"", "18'⅝\"", "19'8¼\"", "22'1¾\"", "25'7⅝\"", "29'1⅝\""] },
      { psf: 12.29, values: ["9'9⅝\"", "11'5¾\"", "13'5⅝\"", "16'4¾\"", "18'4⅝\"", "20'10\"", "22'7⅝\"", "26'1⅝\""] },
      { psf: 16.38, values: ["8'6¼\"", "10'2\"", "11'5¾\"", "14'5⅛\"", "16'⅞\"", "18'3⅝\"", "20'8\"", "24'2\""] },
      { psf: 20.48, values: ["7'6½\"", "9'¼\"", "10'5⅝\"", "12'11½\"", "14'9⅛\"", "16'10¾\"", "18'8⅝\"", "22'2⅝\""] },
      { psf: 24.57, values: ["6'10⅝\"", "8'2⅝\"", "9'6⅛\"", "11'9⅝\"", "13'7⅜\"", "15'7\"", "17'2⅝\"", "20'8⅝\""] },
      { psf: 28.67, values: ["6'2¾\"", "7'6½\"", "8'8¼\"", "10'9⅞\"", "12'7½\"", "14'7⅛\"", "15'8⅞\"", "19'2⅞\""] },
      { psf: 32.77, values: ["5'8⅞\"", "6'10⅝\"", "8'⅜\"", "10'2\"", "11'11⅝\"", "13'7⅜\"", "15'1\"", "18'7\""] },
      { psf: 36.86, values: ["5'4⅞\"", "6'4¾\"", "7'6½\"", "9'6⅛\"", "11'3¾\"", "12'11½\"", "13'11¼\"", "17'5¼\""] },
      { psf: 40.96, values: ["5'1\"", "6'¾\"", "7'⅝\"", "8'10¼\"", "10'7⅞\"", "12'3⅝\"", "13'5⅜\"", "16'11⅜\""] },
    ],
  },
  {
    label: "Double span",
    columns: PANEL_THICKNESS_COLUMNS,
    rows: [
      { psf: 10.24, values: ["12'5⅝\"", "14'9⅝\"", "17'⅝\"", "20'3⅞\"", "22'11½\"", "24'7⅝\"", "27'2¾\"", "29'⅜\""] },
      { psf: 12.29, values: ["11'1¾\"", "13'5⅝\"", "15'5\"", "19'4¼\"", "20'8\"", "21'11¾\"", "26'4⅞\"", "27'⅝\""] },
      { psf: 16.38, values: ["9'6⅛\"", "11'5¾\"", "13'5⅝\"", "16'4¾\"", "17'2⅝\"", "18'8⅜\"", "24'3¼\"", "26'⅞\""] },
      { psf: 20.48, values: ["8'6¼\"", "10'2\"", "11'9⅝\"", "14'5⅛\"", "15'5\"", "16'⅞\"", "20'11⅞\"", "22'5⅝\""] },
      { psf: 24.57, values: ["7'6½\"", "9'2⅛\"", "10'5⅝\"", "12'9½\"", "13'7⅜\"", "14'7⅛\"", "18'2⅛\"", "19'4¼\""] },
      { psf: 28.67, values: ["6'6⅝\"", "8'2⅜\"", "9'8⅛\"", "11'9⅝\"", "12'5½\"", "13'5⅜\"", "16'6¾\"", "17'4⅝\""] },
      { psf: 32.77, values: ["6'¾\"", "7'2½\"", "8'8¼\"", "10'9⅞\"", "11'7¾\"", "12'3⅝\"", "15'1\"", "16'7\""] },
      { psf: 36.86, values: ["5'2⅞\"", "6'6⅝\"", "7'10⅝\"", "10\"", "11'1¾\"", "11'7¾\"", "13'9¼\"", "15'3¼\""] },
      { psf: 40.96, values: ["4'9\"", "5'10¾\"", "7'5⅝\"", "8'8¼\"", "10'4\"", "10'11⅞\"", "13'1⅜\"", "14'7⅞\""] },
    ],
  },
];

export const ENGINEERING_NOTE = "These span & load charts were converted from metric to imperial units. The performance criteria was developed from years of product testing. Actual load calculation requirements are project-specific and must be determined by the design team and/or the structural engineer of record. Contact your representative for assistance determining the best system for your specific project design requirements. These charts are for base reference use only.";

export const FM_CERTIFICATION = {
  title: "What is FM certification?",
  body: "Factory Mutual (FM) Global is similar to Underwriters Laboratories (UL) in that both are focused on safety. FM Approvals is the independent testing division of FM Global, and it focuses on researching and testing products to ensure they meet only the highest standards for property loss prevention and safety. Only products that bear an FM Approved mark conform to these standards and have met the ongoing requirements of the FM certification process.",
};

