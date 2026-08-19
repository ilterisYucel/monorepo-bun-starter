// Sprite üretim teması: ELECTRICAL (tek hat şeması / elektrik devre elemanı sembol stili)
// tools/generate-sprite.mjs varsayılan temasıdır; --theme legacy ile eski stile dönülür.
// Amaç: One-Line şeması, sayısal tasarım programlarındaki (EPLAN, AutoCAD Electrical,
// ETAP) standart elektrik sembol estetiğine benzemeli.
// Layout-lock: referans (nötr Base story) yapısı korunur — yalnızca yüzey/üslup değişir.
// Stil kuralları: docs/SPRITE-STYLE-KIT.md (nötrlük, şeffaflık, düz 2D) aynen geçerlidir.

export const BASE_PROMPT =
  "Repaint this flat technical drawing into a polished electrical single-line diagram (tek hat şeması) schematic symbol sprite, " +
  "in the clean technical drafting style of digital power-system design programs such as EPLAN, AutoCAD Electrical and ETAP. " +
  "Style it as a light flat icon set: minimal schematic symbol aesthetics, crisp thin dark outlines, precise mechanical edges, " +
  "strictly flat 2D front-facing view, NO perspective, NO isometric depth, NO 3D. " +
  "The sprite consists of THIN OUTLINE STROKES ONLY — absolutely NO filled bodies, NO panels, NO background plates, NO box bodies. " +
  "Keep the exact shape, size, position, silhouette and bounding box of the drawn object — do not resize, do not move, do not add extra objects. " +
  "dark industrial HMI panel color scheme compatible with a #0f0f1a background. " +
  "Monochrome neutral color body: dark-gray/silver metal and dark panels only — " +
  "absolutely NO green, NO orange, NO red, NO blue lights, NO colored glow, NO colored LEDs, NO status lights. " +
  "No text, no letters, no labels, no icons, no logos inside the sprite. " +
  "Keep the background fully transparent black-and-white alpha only. Crisp vector-like edges, high detail.";

export const NEGATIVE =
  "photorealistic, isometric, 3D, perspective, depth, text, letters, watermark, logo, background, floor, drop shadow outside the object, " +
  "perspective distortion, warped layout, resized object, green light, red light, orange light, blue light, " +
  "colored glow, status LEDs, energy bar, filling indicator, cartoon, fantasy game UI, " +
  "water tank, liquid container, aquarium, organic shapes, plastic toy, " +
  "lit screen, glowing display, white light, screen content, bright window, backlight, " +
  "solid body, filled panel, box body, background panel, plate background, filled rectangle";

// Element -> (img2img referans story, prompt açıklaması)
// Referans: nötr Base story yakalaması (refs/<element>/base.png) — durum renkleri içermez.
export const ELEMENTS = {
  rackcell: {
    ref: "base",
    describe:
      "a classic battery schematic symbol: a central vertical conductor line with six pairs of horizontal battery cell plates in the upper part (alternating LONG and SHORT dark plates), a small terminal stud at the very top and at the very bottom of the conductor line. There is NO panel, NO body box, NO background — only the bare symbol strokes. Repaint ONLY the surfaces — do NOT redesign, do NOT rearrange, do NOT resize, do NOT move any element. " +
      "Keep the plates as separate dark horizontal bars with the SAME alternating long/short widths as the reference, keep the central conductor line, do NOT add a panel or background box, do NOT turn the plates into one solid block. Only upgrade the material look (dark metal, thin dark outline, electrical equipment detailing).",
    removeBg: true,
  },
  cable: {
    ref: "base",
    describe:
      "a THIN straight horizontal electrical conductor line for a single-line diagram, thickness only about 6 percent of the image height, uniform thin width along its whole length, flat 2D front view. NO connectors, NO lugs, NO fittings, NO conduit, NO pipe — just a thin plain conductor line.",
    removeBg: true,
  },
  "circuitbreaker-close": {
    ref: "base-close",
    specKey: "circuitbreaker",
    out: "circuitbreaker/base-close.png",
    describe:
      "a standard electrical circuit breaker schematic symbol drawn as PURE LINE ART: TWO NESTED square outlines — a larger outer square and a smaller inner square centered inside it — with a small terminal dot at the left and right ends on a horizontal line. BOTH squares MUST be present and clearly visible, do NOT remove them, do NOT fill them. A neutral diagonal blade line crosses through the middle connecting the left and right terminals in the CLOSED position — keep the blade exactly in the closed diagonal position of the reference. Interiors completely EMPTY and transparent — NO fills, NO panel, NO background. Only outline strokes on a fully transparent background.",
    removeBg: true,
  },
  "circuitbreaker-open": {
    ref: "base-open",
    specKey: "circuitbreaker",
    out: "circuitbreaker/base-open.png",
    describe:
      "a standard electrical circuit breaker schematic symbol drawn as PURE LINE ART: TWO NESTED square outlines — a larger outer square and a smaller inner square centered inside it — with a small terminal dot at the left and right ends on a horizontal line. BOTH squares MUST be present and clearly visible, do NOT remove them, do NOT fill them. The middle blade is lifted to the OPEN position — a single THIN short vertical blade line in the middle, disconnected from the horizontal line — keep the blade exactly in the open vertical position of the reference, it is ONE thin line, do NOT fill the middle, do NOT draw a solid block. Interiors completely EMPTY and transparent — NO fills, NO panel, NO background. Only outline strokes on a fully transparent background.",
    removeBg: true,
  },
  dcoutput: {
    ref: "base",
    describe:
      "a standard DC terminal schematic symbol: a single thin circle outline only — NO fill, NO body, NO display window. Empty inside, clean thin dark circular stroke, flat 2D front view, standardized electrical schematic device style.",
    removeBg: true,
  },
  roomcard: {
    ref: "base",
    describe:
      "a room schematic symbol drawn as PURE LINE ART: ONE thin rectangular outline ONLY — the interior is completely EMPTY and transparent, with NO slots, NO lines, NO content inside. NO filled body, NO panel, NO background, NO shading — only the single thin dark outline stroke on a fully transparent background. Keep the exact structure of the reference. Do not add objects.",
    removeBg: true,
  },
  hvacunit: {
    ref: "base",
    describe:
      "an HVAC schematic symbol drawn as PURE LINE ART: one thin rectangular outline with a small thin circle outline centered inside — the interior is completely EMPTY and transparent. NO filled body, NO panel, NO background, NO shading — only thin dark outline strokes on a fully transparent background. Keep the exact structure of the reference. Do not add objects.",
    removeBg: true,
  },
  panelcard: {
    ref: "base",
    describe:
      "a panel schematic symbol drawn as PURE LINE ART: ONE thin rectangular outline ONLY — the interior is completely EMPTY and transparent, with NO slots, NO rectangles, NO content inside. NO filled body, NO panel, NO background, NO shading — only the single thin dark outline stroke on a fully transparent background. Keep the exact structure of the reference. Do not add objects.",
    removeBg: true,
  },
  firepanel: {
    ref: "base",
    describe:
      "a fire alarm panel schematic symbol: a thin rectangular outline (empty interior), SIX small round empty lamp socket outlines arranged in TWO ROWS OF THREE in the upper-middle area — each socket a thin dark circular outline, evenly spaced, do not remove them — plus four small rectangular key socket outlines in one row below them. Thin stroke lines only, NO filled body, NO panel, NO background. Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  energyanalyzergraphic: {
    ref: "base",
    describe:
      "a power meter schematic symbol drawn as PURE LINE ART: TWO NESTED rectangular box outlines — a large outer box and a smaller inner box centered inside it — plus a small solid terminal stud directly above and below the inner box. The boxes are the PRIMARY frame of the symbol — BOTH boxes MUST be present and clearly visible, do NOT remove them, do NOT replace them with a circle, do NOT add a circle. The interiors are completely EMPTY and transparent — NO fills, NO disc, NO panel, NO background, NO screen. Only outline strokes on a fully transparent background. Keep the exact structure of the reference.",
    removeBg: true,
  },
  grid: {
    ref: "base",
    describe:
      "a compact electrical grid connection symbol for a single-line diagram: dark neutral panel with a smooth sine wave power line inside and two terminal studs, standardized utility grid / transformer connection symbol, clean technical drafting, thin dark outlines, no text",
    removeBg: true,
  },
};
