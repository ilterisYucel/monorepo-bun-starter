// Sprite üretim spesifikasyonları (capture/generate/check script'leri ortak kullanır)
// - canvas: Base story canvas boyutları (2x DPR ile yakalanır)
// - frame:  canvas içindeki sprite kaynak dikdörtgeni (2x piksel)
// - margin: normalizasyonda içerik bbox'a eklenen boşluk (2x piksel)
export const SPRITE_SPECS = {
  rackcell: {
    canvas: { width: 320, height: 840 },
    frame: { x: 40, y: 12, width: 256, height: 816 },
    margin: 10,
  },
  circuitbreaker: {
    canvas: { width: 208, height: 90 },
    frame: { x: 0, y: 0, width: 208, height: 90 },
    margin: 8,
    variants: ["close", "open"],
  },
  dcoutput: {
    canvas: { width: 200, height: 224 },
    frame: { x: 0, y: 0, width: 200, height: 224 },
    margin: 8,
  },
  roomcard: {
    canvas: { width: 260, height: 380 },
    frame: { x: 0, y: 0, width: 260, height: 380 },
    margin: 8,
  },
  hvacunit: {
    canvas: { width: 180, height: 300 },
    frame: { x: 0, y: 0, width: 180, height: 300 },
    margin: 8,
  },
  panelcard: {
    canvas: { width: 144, height: 224 },
    frame: { x: 0, y: 0, width: 144, height: 224 },
    margin: 8,
  },
  firepanel: {
    canvas: { width: 776, height: 576 },
    frame: { x: 0, y: 0, width: 776, height: 576 },
    margin: 10,
  },
  energyanalyzergraphic: {
    canvas: { width: 616, height: 776 },
    frame: { x: 0, y: 0, width: 616, height: 776 },
    margin: 10,
  },
  cable: {
    canvas: { width: 424, height: 96 },
    // AI ne kadar kalın çizerse çizsin: normalizasyon içeriği 6 tex'lik
    // (3 logical) banda sıkıştırır -> kablo her zaman ince çıkar
    frame: { x: 0, y: 0, width: 424, height: 6 },
    margin: 2,
  },
  grid: {
    titleId: "gridsymbol",
    canvas: { width: 168, height: 120 },
    frame: { x: 0, y: 0, width: 168, height: 120 },
    margin: 8,
  },
};

export const ELEMENT_KEYS = Object.keys(SPRITE_SPECS);
