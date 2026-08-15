// Sprite asset manifest: element -> texture meta.
// Frame'ler tools/capture-sprite-refs.mjs'in yakaladığı 2x PNG'lerdeki
// (scale=2) kaynak dikdörtgenlerdir. Yerleşim hesabı her elementin
// kendi layout matematiği ile yapılır; frame yalnızca texture kaynağını işaret eder.
export interface SpriteAssetMeta {
  key: string;
  url: string;
  scale: number;
  frame: { x: number; y: number; width: number; height: number };
}

import rackcellUrl from "../assets/sprites/rackcell/base.png";
import circuitbreakerCloseUrl from "../assets/sprites/circuitbreaker/base-close.png";
import circuitbreakerOpenUrl from "../assets/sprites/circuitbreaker/base-open.png";
import dcoutputUrl from "../assets/sprites/dcoutput/base.png";
import roomcardUrl from "../assets/sprites/roomcard/base.png";
import hvacunitUrl from "../assets/sprites/hvacunit/base.png";
import panelcardUrl from "../assets/sprites/panelcard/base.png";
import firepanelUrl from "../assets/sprites/firepanel/base.png";
import energyanalyzerUrl from "../assets/sprites/energyanalyzergraphic/base.png";
import cableUrl from "../assets/sprites/cable/base.png";
import gridUrl from "../assets/sprites/grid/base.png";

export const SPRITE_ASSETS: Readonly<Record<string, SpriteAssetMeta>> = {
  rackcell: {
    key: "rackcell",
    url: rackcellUrl,
    scale: 2,
    // Canvas 160x420 @2x, gövde (0,0,120,380) + nub (14) + gölge (8)
    frame: { x: 40, y: 12, width: 256, height: 816 },
  },
  "circuitbreaker-close": {
    key: "circuitbreaker-close",
    url: circuitbreakerCloseUrl,
    scale: 2,
    // Canvas 104x45 @2x; chassis (12,12,80,21) + ekran yuvası — frame tam canvas
    frame: { x: 0, y: 0, width: 208, height: 90 },
  },
  "circuitbreaker-open": {
    key: "circuitbreaker-open",
    url: circuitbreakerOpenUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 208, height: 90 },
  },
  dcoutput: {
    key: "dcoutput",
    url: dcoutputUrl,
    scale: 2,
    // Canvas 100x112 @2x; daire (50,46,r30) + altta ekran yuvası (22,84,56,16)
    frame: { x: 0, y: 0, width: 200, height: 224 },
  },
  roomcard: {
    key: "roomcard",
    url: roomcardUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 260, height: 380 },
  },
  hvacunit: {
    key: "hvacunit",
    url: hvacunitUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 180, height: 300 },
  },
  panelcard: {
    key: "panelcard",
    url: panelcardUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 144, height: 224 },
  },
  firepanel: {
    key: "firepanel",
    url: firepanelUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 776, height: 576 },
  },
  energyanalyzergraphic: {
    key: "energyanalyzergraphic",
    url: energyanalyzerUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 616, height: 776 },
  },
  cable: {
    key: "cable",
    url: cableUrl,
    scale: 2,
    // Normalizasyon içeriği 6 tex'lik banda sıkıştırır -> ince hat
    frame: { x: 0, y: 0, width: 424, height: 6 },
  },
  grid: {
    key: "grid",
    url: gridUrl,
    scale: 2,
    frame: { x: 0, y: 0, width: 168, height: 120 },
  },
};
