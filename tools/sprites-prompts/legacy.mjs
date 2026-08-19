// Sprite üretim teması: LEGACY (mevcut oyun-UI stili)
// tools/generate-sprite.mjs --theme legacy ile kullanılır.
// Bu dosya orijinal gömülü promptların birebir kopyasıdır — DEĞİŞTİRMEYİN.
// Üretim zincirini eski stile döndürmek için: --theme legacy

export const BASE_PROMPT =
  "Repaint this flat technical drawing into a polished flat 2D game-UI sprite. " +
  "Keep the exact shape, size, position, silhouette and bounding box of the drawn object — do not resize, do not move, do not add extra objects. " +
  "Style: clean industrial battery energy storage system HMI panel, strictly flat 2D front-facing view, " +
  "NO perspective, NO isometric depth, NO 3D. Soft bevel edges, subtle vertical gradients, dark glass display windows, " +
  "thin dark outline, single light source from top-left, " +
  "dark UI color scheme compatible with a #0f0f1a background. " +
  "Monochrome neutral color body: dark-gray/silver metal and dark panels only — " +
  "absolutely NO green, NO orange, NO red, NO blue lights, NO colored glow, NO colored LEDs, NO status lights. " +
  "No text, no letters, no labels, no icons, no logos inside the sprite. " +
  "Keep the background fully transparent black-and-white alpha only. Crisp vector-like edges, high detail.";

export const NEGATIVE =
  "photorealistic, isometric, 3D, perspective, depth, text, letters, watermark, logo, background, floor, drop shadow outside the object, " +
  "perspective distortion, warped layout, resized object, green light, red light, orange light, blue light, " +
  "colored glow, status LEDs, energy bar, filling indicator";

// Element -> (img2img referans story, prompt açıklaması)
// Referans: nötr Base story yakalaması (refs/<element>/base.png) — durum renkleri içermez.
export const ELEMENTS = {
  rackcell: {
    ref: "base",
    describe:
      "a vertical battery storage rack unit. Repaint ONLY the surfaces — do NOT redesign, do NOT rearrange, do NOT resize, do NOT move any element. " +
      "Keep the exact structure of the reference: the rounded flat body outline, the two terminal nubs at top and bottom, the six identical rectangular display windows in the left-center column at their exact positions and sizes with the same gaps (empty BLACK glass, clearly darker than the body panel), and the column of eight NARROW BLACK rectangular battery cell sockets stacked vertically on the right side at its exact position — each socket width only 17 percent of the body width, with clear visible gaps between the sockets. " +
      "Do not add water tanks, do not add liquid tubes, do not add extra panels, do not merge the sockets into one wide column. Style it as stacked battery modules. Only upgrade the material look (dark metal, polished plastic, thin dark outline).",
    removeBg: true,
  },
  cable: {
    ref: "base",
    describe:
      "a THIN straight horizontal insulated power cable line, thickness only about 6 percent of the image height, uniform thin width along its whole length, flat 2D front view. NO connectors, NO lugs, NO fittings, NO conduit, NO pipe — just a thin plain cable line.",
    removeBg: true,
  },
  "circuitbreaker-close": {
    ref: "base-close",
    specKey: "circuitbreaker",
    out: "circuitbreaker/base-close.png",
    describe:
      "a front-facing flat 2D industrial DC circuit breaker module with a closed horizontal rotary lever in the middle-left and a small rectangular dark glass display window in the middle-right, compact electrical panel unit. Keep the lever exactly in the closed horizontal position of the reference.",
    removeBg: true,
  },
  "circuitbreaker-open": {
    ref: "base-open",
    specKey: "circuitbreaker",
    out: "circuitbreaker/base-open.png",
    describe:
      "a front-facing flat 2D industrial DC circuit breaker module with an open vertical rotary lever in the middle-left and a small rectangular dark glass display window in the middle-right, compact electrical panel unit. Keep the lever exactly in the open vertical position of the reference.",
    removeBg: true,
  },
  dcoutput: {
    ref: "base",
    describe:
      "a round industrial DC output power connector head with insulated housing and terminal studs, flat 2D front view",
    removeBg: true,
  },
  roomcard: {
    ref: "base",
    describe:
      "a rectangular equipment room cabinet card. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline, the narrow vertical recessed slot on the left edge (empty dark glass) and the wide recessed slot at the bottom (empty dark glass). Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  hvacunit: {
    ref: "base",
    describe:
      "a compact flat 2D front-facing industrial HVAC unit with fan grille and small control panel, wall-mount form factor",
    removeBg: true,
  },
  panelcard: {
    ref: "base",
    describe:
      "a slim flat 2D front-facing wall-mount electrical panel enclosure. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline and the large recessed rectangular slot in the lower area (empty dark glass). Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  firepanel: {
    ref: "base",
    describe:
      "a flat 2D front-facing industrial fire alarm control panel. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline, six small round empty lamp sockets arranged in two rows of three near the upper-middle, four small rectangular key sockets in one row below them, and the blank label strip at the top. Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  energyanalyzergraphic: {
    ref: "base",
    describe:
      "a flat 2D front-facing industrial energy analyzer unit. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline and the large recessed rectangular LCD screen socket in the middle (empty dark glass). Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  grid: {
    ref: "base",
    describe:
      "a compact grid connection symbol card: dark panel with a smooth sine wave power line inside and two terminal blocks, electrical grid icon",
    removeBg: true,
  },
};
