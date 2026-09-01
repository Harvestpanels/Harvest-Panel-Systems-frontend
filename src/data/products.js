import fortisWallImg from "../assets/images/Products/Insulated Wall & Roofs Panels/HP Fortis Wall Panel.webp";
import boxWallImg from "../assets/images/Products/Insulated Wall & Roofs Panels/HP Box Wall Panel.webp";
import copRoofImg from "../assets/images/Products/Insulated Wall & Roofs Panels/HP Cop Roof Panel.webp";
import grecataRoofImg from "../assets/images/Products/Insulated Wall & Roofs Panels/HP Grecata Roof Panel.webp";
import coldboxTpoPvcImg from "../assets/images/Products/Cold Storage Panels/HP Coldbox TPOPVC Panel.webp";
import boxVinylImg from "../assets/images/Products/Cold Storage Panels/HP Box Vinyl Panel.webp";
import wallVinylImg from "../assets/images/Products/Cold Storage Panels/HP Wall Vinyl Panel.webp";
import fireguardWallExposedImg from "../assets/images/Products/Mineral Wool Fire-Rated Panels/HPS Fireguard Wall Panel - Exposed Fastening.webp";
import fireguardWallHiddenImg from "../assets/images/Products/Mineral Wool Fire-Rated Panels/HPS Fireguard Wall Panel - Hidden Fastening.webp";
import fireguardWallAcousticImg from "../assets/images/Products/Mineral Wool Fire-Rated Panels/HPS Fireguard Wall Panel - Acoustic.webp";
import fireguardRoofImg from "../assets/images/Products/Mineral Wool Fire-Rated Panels/HPS Fireguard Roof Panel.webp";
import fireguardRoofAcousticImg from "../assets/images/Products/Mineral Wool Fire-Rated Panels/HPS Fireguard Roof Panel - Acoustic.webp";
import cornerAnglesImg from "../assets/images/Products/Trim & Hardware/Corner Angles.webp";
import tBarImg from "../assets/images/Products/Trim & Hardware/HPS - T Bar.webp";
import miscToolsImg from "../assets/images/Products/Trim & Hardware/Miscellaneous Tools.webp";
import hingeCoolerDoorImg from "../assets/images/Products/Insulated Doors/Hinge Cooler Doors.webp";
import slidingCoolerDoorImg from "../assets/images/Products/Insulated Doors/Sliding Cooler Doors.webp";
import metalDoorImg from "../assets/images/Products/Insulated Doors/Metal Doors.webp";

export const PRODUCT_CATEGORIES = [
  {
    id: "cold-storage-panels",
    name: "Cold Storage Panels",
    blurb:
      "Hygienic-finish panels engineered to hold a tight, consistent thermal envelope for refrigerated and frozen storage, clean rooms, and food-processing spaces.",
    products: [
      {
        name: "HPS Coldbox TPO/PVC Panel",
        spec: "PIR core · hygienic TPO or PVC finish",
        desc: "An insulated panel with a hygienic TPO or PVC finish, ideal for cold storage rooms, clean rooms, and processing areas needing moisture resistance and easy maintenance.",
        img: coldboxTpoPvcImg,
      },
      {
        name: "HPS Box Vinyl Panel",
        spec: "PIR/PUR core · monolayer vinyl finish",
        desc: "A monolayer wall panel with a rigid PIR/PUR foam core and a durable vinyl finish suited for wash-down and sanitation-sensitive environments.",
        img: boxVinylImg,
      },
      {
        name: "HPS Wall Vinyl Panel",
        spec: "PIR/PUR core · monolayer vinyl finish",
        desc: "A monolayer wall panel companion to the Box Vinyl line, insulated with rigid PIR/PUR foam for consistent cold-storage wall performance.",
        img: wallVinylImg,
      },
    ],
  },
  {
    id: "foam-panels",
    name: "Insulated Wall & Roof Panels",
    blurb:
      "Double-steel-sheet panels insulated with rigid polyurethane (PUR) or polyisocyanurate (PIR) foam core, our highest-volume product line for industrial, commercial, and residential building envelopes.",
    products: [
      {
        name: "HPS Fortis Wall Panel",
        spec: "PIR/PUR core · concealed double-joint",
        desc: "A flagship wall panel with an advanced concealed double-joint system and reinforced mechanical seals for high load capacity and a clean exterior finish.",
        img: fortisWallImg,
      },
      {
        name: "HPS Box Wall Panel",
        spec: "PIR core · through-fastened, saddle washer",
        desc: "A through-fastened wall panel secured with saddle washers for a steady, durable finish, available in ribbed, boxed, or smooth steel profiles.",
        img: boxWallImg,
      },
      {
        name: "HPS Cop Roof Panel",
        spec: "PIR core · double-steel roof profile",
        desc: "A double-steel roof panel insulated with rigid polyurethane foam, built for general construction and cold storage roofing alike.",
        img: copRoofImg,
      },
      {
        name: "HPS Grecata Roof Panel",
        spec: "PIR core · U-rib corrugated profile",
        desc: "A corrugated roofing sandwich panel with a U-rib profile and internal aluminum support, engineered for long-span roof runs.",
        img: grecataRoofImg,
      },
    ],
  },
  {
    id: "mineral-wool-panels",
    name: "Mineral Wool Fire-Rated Panels",
    blurb:
      "Panels insulated with mineral rockwool instead of foam, built for projects where fire rating and acoustic performance matter as much as thermal performance.",
    products: [
      {
        name: "HPS Fireguard Wall Panel | Exposed Fastening",
        spec: "Mineral wool core · through-fastened, saddle washer",
        desc: "A self-supporting wall panel with a tongue-and-groove joint, insulated with mineral rockwool and secured with a visible through-fastened, saddle-washer system.",
        img: fireguardWallExposedImg,
      },
      {
        name: "HPS Fireguard Wall Panel | Hidden Fastening",
        spec: "Mineral wool core · concealed fastening",
        desc: "The same self-supporting mineral wool wall panel with a concealed fastening system on each side for a smooth, uninterrupted finish.",
        img: fireguardWallHiddenImg,
      },
      {
        name: "HPS Fireguard Wall Panel | Acoustic",
        spec: "Mineral wool core · micro-perforated liner",
        desc: "A mineral wool wall panel with a micro-perforated internal steel liner and visible fastening, tuned for sound absorption alongside fire resistance.",
        img: fireguardWallAcousticImg,
      },
      {
        name: "HPS Fireguard Roof Panel",
        spec: "Mineral wool core · self-supporting, low slope",
        desc: "A self-supporting mineral wool roof panel rated for low-slope roofing, with an external ribbed steel sheet for added static and dynamic strength.",
        img: fireguardRoofImg,
      },
      {
        name: "HPS Fireguard Roof Panel | Acoustic",
        spec: "Mineral wool core · micro-perforated liner",
        desc: "A self-supporting mineral wool roof panel with a micro-perforated interior liner and tongue-and-groove joint for added sound-dampening performance.",
        img: fireguardRoofAcousticImg,
      },
    ],
  },
  {
    // "-panels" suffix (also on trim-hardware-panels below) avoids
    // colliding with the *home page's* own #doors/#trim-hardware section
    // ids — App.css has a home-specific rule (`#doors h2, #trim-hardware
    // h2 { font-size: clamp(20px, 2.5vw, 26px) }`) that unintentionally
    // matched these same-named ids here too, shrinking just these two
    // category headings relative to the other three on this page.
    id: "doors-panels",
    name: "Insulated Doors",
    blurb:
      "Insulated doors built to match the thermal performance of the panel envelope around them, for fast, secure, and efficient access.",
    products: [
      {
        name: "Hinge Cooler Doors",
        spec: "Insulated · hinged, cold storage",
        desc: "Hinged insulated doors built for cold storage and cooler entries, sealing tight against the surrounding panel envelope.",
        img: hingeCoolerDoorImg,
      },
      {
        name: "Sliding Cooler Doors",
        spec: "Insulated · heavy-duty track",
        desc: "Heavy-duty insulated sliding doors built for consistent temperature control and secure cooler access.",
        img: slidingCoolerDoorImg,
      },
      {
        name: "Metal Doors",
        spec: "Insulated · metal construction",
        desc: "Durable insulated metal doors matched to the thermal performance of the surrounding panel envelope.",
        img: metalDoorImg,
      },
    ],
  },
  {
    id: "trim-hardware-panels",
    name: "Trim & Hardware",
    blurb:
      "Trim, fasteners, and sealants engineered specifically for insulated panel systems, keeping every seam clean and weather-tight.",
    products: [
      {
        name: "Corner Angles",
        spec: "Formed trim · color-matched",
        desc: "Formed corner trim finished to match your panel color for a clean, weather-sealed edge at every outside and inside corner.",
        img: cornerAnglesImg,
      },
      {
        name: "T-Bar",
        spec: "Seam trim · panel-to-panel",
        desc: "T-bar trim for clean, supported seams between panels, keeping every joint aligned and finished.",
        img: tBarImg,
      },
      {
        name: "Miscellaneous",
        spec: "All-thread · unistrut · fasteners · butyl sealant",
        desc: "All-thread, unistrut, fasteners, and butyl sealant, the hardware that holds every panel system together.",
        img: miscToolsImg,
      },
    ],
  },
];
