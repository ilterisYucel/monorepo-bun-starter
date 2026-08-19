// Sprite üretim spesifikasyonları (capture/generate/check script'leri ortak kullanır)
// - canvas: Base story canvas boyutları (2x DPR ile yakalanır)
// - frame:  canvas içindeki sprite kaynak dikdörtgeni (2x piksel)
// - margin: normalizasyonda içerik bbox'a eklenen boşluk (2x piksel)
export const SPRITE_SPECS = {
  rackcell: {
    canvas: { width: 320, height: 840 },
    // PANELSIZ batarya sembolü: nublar + iletken + plakalar (logical 16..104 x -14..394)
    frame: { x: 72, y: 12, width: 154, height: 816 },
    margin: 10,
  },
  circuitbreaker: {
    canvas: { width: 240, height: 220 },
    // Sembol içerik kutusu: canvas (40,20,60,70) @2 — iç içe kareler + terminaller
    frame: { x: 80, y: 40, width: 120, height: 140 },
    margin: 8,
    variants: ["close", "open"],
  },
  dcoutput: {
    canvas: { width: 200, height: 224 },
    // Yalnız daire outline: canvas (20,16,60,60) @2
    frame: { x: 40, y: 32, width: 120, height: 120 },
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
    canvas: { width: 616, height: 428 },
    // Kutu sembolü: canvas (4,4,300,206) @2 — kutu + çember + polarite nubları
    frame: { x: 8, y: 8, width: 600, height: 412 },
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
