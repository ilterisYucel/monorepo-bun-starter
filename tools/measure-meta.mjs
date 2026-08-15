// Sprite yuva/ekran konumu ölçümü (genel): AI çıktısındaki recessed yuvaların
// rect'lerini tasarım bölgesi + yerel kontrast maskesi + persentil bbox ile bulur.
// Kullanım: bun tools/measure-meta.mjs <element>  (panelcard|roomcard|energyanalyzergraphic|firepanel|circuitbreaker|dcoutput)
// Çıktı: elementin *-meta.ts dosyası (gövdeye ORAN, measured bayrağı)
// Cluster `files` destekler: varyant başına ayrı dosya -> ayrı meta anahtarı.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITE_SPECS } from "./sprites-spec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SPRITES_DIR = path.join(REPO_ROOT, "packages/ui/src/assets/sprites");

const ELEMENTS = {
  panelcard: {
    metaOut: "packages/ui/src/graphics/elements/PanelCard/panelcard-meta.ts",
    exportName: "PANELCARD_META",
    interfaceName: "PanelCardMeta",
    margin: 6,
    bodyW: 60,
    bodyH: 100,
    clusters: [
      { key: "barSlot", design: { x: 0.05, y: 0.33, w: 0.9, h: 0.52 }, minPx: 150, polarity: "dark", absDark: 45 },
    ],
  },
  roomcard: {
    metaOut: "packages/ui/src/graphics/elements/RoomCard/roomcard-meta.ts",
    exportName: "ROOMCARD_META",
    interfaceName: "RoomCardMeta",
    margin: 5,
    bodyW: 120,
    bodyH: 180,
    clusters: [
      { key: "tempSlot", design: { x: 0.015, y: 0.0167, w: 0.1125, h: 0.5167 }, minPx: 120, polarity: "dark", absDark: 45 },
    ],
  },
  energyanalyzergraphic: {
    metaOut: "packages/ui/src/graphics/elements/EnergyAnalyzerGraphic/energyanalyzer-meta.ts",
    exportName: "ENERGYANALYZER_META",
    interfaceName: "EnergyAnalyzerMeta",
    margin: 4,
    bodyW: 300,
    bodyH: 380,
    clusters: [
      { key: "lcd", design: { x: 0.01, y: 0.0263, w: 0.98, h: 0.52 }, minPx: 400, polarity: "light" },
    ],
  },
  firepanel: {
    metaOut: "packages/ui/src/graphics/elements/FirePanel/firepanel-meta.ts",
    exportName: "FIREPANEL_META",
    interfaceName: "FirePanelMeta",
    margin: 4,
    bodyW: 380,
    bodyH: 280,
    clusters: [
      { key: "lampCluster", design: { x: 0.4389, y: 0.1343, w: 0.1221, h: 0.1814 }, minPx: 30, polarity: "light" },
      { key: "keyCluster", design: { x: 0.35, y: 0.46, w: 0.3, h: 0.0571 }, minPx: 30, polarity: "light" },
    ],
  },
  circuitbreaker: {
    metaOut: "packages/ui/src/graphics/elements/CircuitBreaker/circuitbreaker-meta.ts",
    exportName: "CIRCUITBREAKER_META",
    interfaceName: "CircuitBreakerMeta",
    margin: 12,
    bodyW: 80,
    bodyH: 21,
    clusters: [
      {
        key: "display",
        design: { x: 0.25, y: 0.2143, w: 0.5, h: 0.5714 },
        minPx: 20,
        polarity: "light",
        relLight: 12,
        files: [
          { file: "base-close.png", key: "displayClosed" },
          { file: "base-open.png", key: "displayOpen" },
        ],
      },
    ],
  },
  dcoutput: {
    metaOut: "packages/ui/src/graphics/elements/DCOutput/dcoutput-meta.ts",
    exportName: "DCOUTPUT_META",
    interfaceName: "DCOutputMeta",
    margin: 0,
    bodyW: 100,
    bodyH: 112,
    clusters: [
      { key: "display", design: { x: 0.22, y: 0.75, w: 0.56, h: 0.1429 }, minPx: 60, polarity: "dark", absDark: 45 },
    ],
  },
};

const name = process.argv[2];
const cfg = ELEMENTS[name];
if (!cfg) {
  console.error("Kullanım: bun tools/measure-meta.mjs <element>");
  console.error(`Elementler: ${Object.keys(ELEMENTS).join(", ")}`);
  process.exit(1);
}
const spec = SPRITE_SPECS[name];
if (!spec) {
  console.error(`[measure] sprites-spec'te ${name} yok`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

// Ölçüm listesi: (cluster, dosya, meta anahtarı)
const measurements = [];
for (const cluster of cfg.clusters) {
  if (cluster.files) {
    for (const f of cluster.files) measurements.push({ cluster, file: f.file, key: f.key });
  } else {
    measurements.push({ cluster, file: "base.png", key: cluster.key });
  }
}

async function loadImage(file) {
  return await page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = "data:image/png;base64," + dataUrl;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    return { data: Array.from(d.data), w: d.width, h: d.height };
  }, (await readFile(path.join(SPRITES_DIR, name, file))).toString("base64"));
}

const imageCache = new Map();
async function getImage(file) {
  if (!imageCache.has(file)) imageCache.set(file, await loadImage(file));
  return imageCache.get(file);
}

const SCALE = 2;
const bodyOriginX = cfg.margin * SCALE;
const bodyOriginY = cfg.margin * SCALE;

const results = {};
let allOk = true;

for (const { cluster, file, key } of measurements) {
  const ai = await getImage(file);
  const d = cluster.design;
  const rx = bodyOriginX + d.x * cfg.bodyW * SCALE;
  const ry = bodyOriginY + d.y * cfg.bodyH * SCALE;
  const rw = d.w * cfg.bodyW * SCALE;
  const rh = d.h * cfg.bodyH * SCALE;
  // arama bölgesi: %35 şişirme (en az 8px), gövde içine kırp
  const inflate = Math.max(8, Math.round(Math.min(rw, rh) * 0.35));
  const interiorInset = 12;
  const bodyX0 = bodyOriginX + interiorInset;
  const bodyY0 = bodyOriginY + interiorInset;
  const bodyX1 = bodyOriginX + cfg.bodyW * SCALE - interiorInset;
  const bodyY1 = bodyOriginY + cfg.bodyH * SCALE - interiorInset;
  const x0 = Math.max(bodyX0, Math.round(rx - inflate));
  const y0 = Math.max(bodyY0, Math.round(ry - inflate));
  const x1 = Math.min(bodyX1, Math.round(rx + rw + inflate));
  const y1 = Math.min(bodyY1, Math.round(ry + rh + inflate));

  const polarity = cluster.polarity ?? "dark";
  const absDark = cluster.absDark ?? null;
  const relLight = cluster.relLight ?? 20;
  const mask = await page.evaluate(async ({ data, w, x0, y0, x1, y1, R, polarity, absDark, relLight }) => {
    const lum = new Float32Array(w * (y1 - y0));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        lum[(y - y0) * w + (x - x0)] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
    }
    const integral = new Float32Array((w + 1) * ((y1 - y0) + 1));
    for (let y = 1; y <= y1 - y0; y++) {
      for (let x = 1; x <= w; x++) {
        integral[y * (w + 1) + x] =
          lum[(y - 1) * w + (x - 1)] +
          integral[(y - 1) * (w + 1) + x] +
          integral[y * (w + 1) + x - 1] -
          integral[(y - 1) * (w + 1) + x - 1];
      }
    }
    const out = new Uint8Array(w * (y1 - y0));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] <= 40) continue;
        const X1 = Math.max(0, x - R), X2 = Math.min(w - 1, x + R);
        const Y1 = Math.max(y0, y - R), Y2 = Math.min(y1 - 1, y + R);
        const area = (X2 - X1 + 1) * (Y2 - Y1 + 1);
        const sum =
          integral[(Y2 - y0 + 1) * (w + 1) + X2 + 1] -
          integral[(Y1 - y0) * (w + 1) + X2 + 1] -
          integral[(Y2 - y0 + 1) * (w + 1) + X1] +
          integral[(Y1 - y0) * (w + 1) + X1];
        const local = sum / area;
        const lumaVal = lum[(y - y0) * w + (x - x0)];
        const contrast = lumaVal - local;
        let hit;
        if (polarity === "dark") {
          hit = contrast < -22 || (absDark !== null && lumaVal < absDark);
        } else {
          hit = contrast > relLight;
        }
        if (hit) out[(y - y0) * w + (x - x0)] = 1;
      }
    }
    return out;
  }, { data: ai.data, w: ai.w, x0, y0, x1, y1, R: 10, polarity, absDark, relLight });

  // persentil bbox (%5-%95)
  const xs = [];
  const ys = [];
  for (let y = 0; y < y1 - y0; y++) {
    for (let x = 0; x < x1 - x0; x++) {
      if (mask[y * ai.w + x]) {
        xs.push(x0 + x);
        ys.push(y0 + y);
      }
    }
  }

  let measuredRect = null;
  if (xs.length >= cluster.minPx) {
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    const p5x = xs[Math.floor(xs.length * 0.05)];
    const p95x = xs[Math.floor(xs.length * 0.95)];
    const p5y = ys[Math.floor(ys.length * 0.05)];
    const p95y = ys[Math.floor(ys.length * 0.95)];
    measuredRect = {
      x: (p5x - bodyOriginX) / SCALE / cfg.bodyW,
      y: (p5y - bodyOriginY) / SCALE / cfg.bodyH,
      width: (p95x - p5x) / SCALE / cfg.bodyW,
      height: (p95y - p5y) / SCALE / cfg.bodyH,
    };
    if (
      measuredRect.width <= 0 || measuredRect.height <= 0 ||
      measuredRect.width > d.w * 2.2 || measuredRect.height > d.h * 2.2
    ) {
      measuredRect = null;
    }
  }

  if (measuredRect) {
    results[key] = measuredRect;
    console.log(
      `[measure] ${name}/${key}: px=${xs.length} -> (${measuredRect.x.toFixed(4)}, ${measuredRect.y.toFixed(4)}, ${measuredRect.width.toFixed(4)}, ${measuredRect.height.toFixed(4)}) OK`,
    );
  } else {
    results[key] = d;
    allOk = false;
    console.log(`[measure] ${name}/${key}: tespit edilemedi (px=${xs.length}) — tasarım fallback`);
  }
}

const measured = allOk;
const fmt = (r) => `{ x: ${r.x.toFixed(5)}, y: ${r.y.toFixed(5)}, width: ${r.width.toFixed(5)}, height: ${r.height.toFixed(5)} }`;

let source = `// ${cfg.interfaceName} sprite meta: AI çıktısındaki yuva konumları.\n`;
source += `// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).\n`;
source += `// Değerler gövde boyutlarına ORAN olarak saklanır.\n`;
source += `export interface ${cfg.interfaceName} {\n  measured: boolean;\n`;
for (const key of Object.keys(results)) {
  source += `  ${key}: { x: number; y: number; width: number; height: number };\n`;
}
source += `}\n\nexport const ${cfg.exportName}: ${cfg.interfaceName} = {\n  measured: ${measured},\n`;
for (const [key, value] of Object.entries(results)) {
  source += `  ${key}: ${fmt(value)},\n`;
}
source += `};\n`;

await writeFile(path.join(REPO_ROOT, cfg.metaOut), source);
console.log(`[measure] ${name}: ${measured ? "ölçüm başarılı" : "kısmi — fallback"} -> ${cfg.metaOut}`);
await browser.close();
process.exit(measured ? 0 : 1);
