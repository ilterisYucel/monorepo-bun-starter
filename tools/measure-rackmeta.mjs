// RackCell sprite meta ölçümü: AI çıktısındaki batarya plaka bantlarını tespit eder.
// Kullanım: bun tools/measure-rackmeta.mjs
// Çıktı: packages/ui/src/graphics/elements/RackCell/rackcell-meta.ts
// (gövde boyutlarına ORAN; tespit yetersizse tasarım fallback'i)
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const AI_PNG = path.join(REPO_ROOT, "packages/ui/src/assets/sprites/rackcell/base.png");
const META_TS = path.join(REPO_ROOT, "packages/ui/src/graphics/elements/RackCell/rackcell-meta.ts");

// Tasarım geometrisi (logical, step=100 referansı; 120x380 gövde)
const BODY_H = 380;
const SCALE = 2;
const FRAME_Y = 12; // sprites-spec rackcell frame y (texture px)

const browser = await chromium.launch();
const page = await browser.newPage();

const ai = await page.evaluate(async (dataUrl) => {
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
}, (await readFile(AI_PNG)).toString("base64"));

// Plaka bant tespiti (KUTUPTAN BAĞIMSIZ): iç bantta (x 130..200 tex) satır
// ortalama luma'sı — koyu plaka (<45) VEYA parlak plaka (>120) koşuları banttır.
// Bu aralık hem uzun hem kısa plakaların ortak kesişimidir. En az 10 bant
// beklenir (12 tasarım).
const plateStack = await page.evaluate(async ({ data, w, h }) => {
  const luma = (x, y) => { const i = (y * w + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  const runs = [];
  let start = -1;
  let polarity = null;
  for (let y = 40; y <= 520; y++) {
    let sum = 0, n = 0;
    for (let x = 130; x <= 200; x += 2) {
      const a = data[(y * w + x) * 4 + 3];
      if (a < 40) continue;
      sum += luma(x, y);
      n++;
    }
    const avg = n ? sum / n : -1;
    const isDark = n >= 10 && avg < 45;
    const isBright = n >= 10 && avg > 120;
    if (runs.length === 0 && start < 0) {
      if (isDark) polarity = "dark";
      else if (isBright) polarity = "bright";
    }
    const isBand = polarity === "dark" ? isDark : polarity === "bright" ? isBright : false;
    if (isBand && start < 0) start = y;
    if (!isBand && start >= 0) {
      if (y - start >= 3) runs.push({ y: start, h: y - start });
      start = -1;
    }
  }
  if (start >= 0 && 520 - start >= 3) runs.push({ y: start, h: 520 - start });

  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r.y - (last.y + last.h) <= 4) last.h = r.y + r.h - last.y;
    else merged.push({ ...r });
  }
  if (merged.length < 10) return null;

  const first = merged[0];
  const last = merged[merged.length - 1];
  return {
    top: first.y,
    bottom: last.y + last.h,
    count: merged.length,
    runs: merged,
    polarity,
  };
}, { data: ai.data, w: ai.w, h: ai.h });

const platesMeasured = Boolean(plateStack && plateStack.count >= 10);

const plateStackFrac = platesMeasured
  ? {
      top: (plateStack.top - FRAME_Y) / SCALE / BODY_H,
      bottom: (plateStack.bottom - FRAME_Y) / SCALE / BODY_H,
      count: plateStack.count,
    }
  : null;

console.log(`[measure] plaka bantları: ${plateStack ? plateStack.count : 0} (${platesMeasured ? "OK" : "yetersiz"})`);
if (platesMeasured) {
  console.log(`  stack: top=${plateStackFrac.top.toFixed(4)} bottom=${plateStackFrac.bottom.toFixed(4)} count=${plateStackFrac.count}`);
  console.log(`  bantlar: ${plateStack.runs.map((r) => r.y).join(",")}`);
}

const source = `// RackCell sprite meta: AI çıktısındaki batarya plaka stack'i.
// tools/measure-rackmeta.mjs tarafından üretilir.
// Değerler gövde yüksekliğine (380 referans) ORAN olarak saklanır.
// platesMeasured=${platesMeasured}
export interface RackCellPlateStackMeta {
  top: number;
  bottom: number;
  count: number;
}

export interface RackCellMeta {
  platesMeasured: boolean;
  plateStack: RackCellPlateStackMeta;
}

export const RACKCELL_META: RackCellMeta = {
  platesMeasured: ${platesMeasured},
  plateStack: ${plateStackFrac
    ? `{ top: ${plateStackFrac.top.toFixed(5)}, bottom: ${plateStackFrac.bottom.toFixed(5)}, count: ${plateStackFrac.count} }`
    : `{ top: 0.09474, bottom: 0.57895, count: 12 }`},
};
`;

await writeFile(META_TS, source);
console.log(`[measure] plaka=${platesMeasured ? "ölçüldü" : "tasarım"} -> ${path.relative(REPO_ROOT, META_TS)}`);
await browser.close();
process.exit(platesMeasured ? 0 : 1);
