// RackCell sprite meta ölçümü: AI çıktısındaki pencere/tüp konumlarını
// "recessed koyu bölge" (yerel ortalamadan koyu) tespitiyle bulur.
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
const BODY_W = 120;
const BODY_H = 380;
const FRAME = { x: 40, y: 12 }; // sprites-spec rackcell frame (texture px)
const SCALE = 2;
const DESIGN_WINDOWS = [0, 1, 2, 3, 4, 5].map((row) => ({
  x: 0.40 * BODY_W - (0.52 * BODY_W) / 2,
  y: 35 + row * 46,
  width: 0.52 * BODY_W,
  height: 38,
}));
// Batarya hücre kolonu: 8 hücre (0.33s yükseklik, 0.06s aralık)
const DESIGN_COLUMN = { x: 90, y: 37, width: 20, height: 306 };

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

// Recessed maske: luma - yerel ortalama(luma) < -25 ve opak
const components = await page.evaluate(async ({ data, w, h }) => {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
  }
  const R = 12;
  const integral = new Float32Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      integral[y * (w + 1) + x] =
        lum[(y - 1) * w + (x - 1)] +
        integral[(y - 1) * (w + 1) + x] +
        integral[y * (w + 1) + x - 1] -
        integral[(y - 1) * (w + 1) + x - 1];
    }
  }
  const mask = new Uint8Array(w * h);
  for (let y = 12; y < 828 && y < h; y++) {
    for (let x = 40; x < 296 && x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] <= 40) continue;
      const x1 = Math.max(0, x - R), x2 = Math.min(w - 1, x + R);
      const y1 = Math.max(0, y - R), y2 = Math.min(h - 1, y + R);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * (w + 1) + x2 + 1] -
        integral[y1 * (w + 1) + x2 + 1] -
        integral[(y2 + 1) * (w + 1) + x1] +
        integral[y1 * (w + 1) + x1];
      const local = sum / area;
      if (lum[y * w + x] - local < -25) mask[y * w + x] = 1;
    }
  }
  const visited = new Uint8Array(w * h);
  const comps = [];
  const stack = [];
  for (let y0 = 12; y0 < 828 && y0 < h; y0 += 2) {
    for (let x0 = 40; x0 < 296 && x0 < w; x0 += 2) {
      const idx = y0 * w + x0;
      if (!mask[idx] || visited[idx]) continue;
      let minX = w, maxX = 0, minY = h, maxY = 0, count = 0;
      stack.length = 0;
      stack.push(x0, y0);
      visited[idx] = 1;
      while (stack.length) {
        const y = stack.pop(), x = stack.pop();
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 40 || nx >= 296 || ny < 12 || ny >= 828) continue;
          const ni = ny * w + nx;
          if (mask[ni] && !visited[ni]) {
            visited[ni] = 1;
            stack.push(nx, ny);
          }
        }
      }
      if (count > 100) comps.push({ minX, maxX, minY, maxY, count });
    }
  }
  comps.sort((a, b) => b.count - a.count);
  return comps.map((c) => ({ x: c.minX, y: c.minY, w: c.maxX - c.minX, h: c.maxY - c.minY, px: c.count }));
}, { data: ai.data, w: ai.w, h: ai.h });

console.log("[measure] recessed bölgeler:", components.length);

// Pencere tespiti (KUTUPTAN BAĞIMSIZ): her satırda x-profili medyanından
// >25 sapan ardışık aralık = pencere camı (koyu VEYA parlak fark etmez).
const windowRectsTex = await page.evaluate(async ({ data, w, h }) => {
  const luma = (x, y) => { const i = (y * w + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  const rects = [];
  for (let r = 0; r < 6; r++) {
    const y0 = 12 + 2 * (35 + r * 46);
    const y1 = y0 + 76;
    // x profili (60..215, adım 2): satır bandında ortalama luma
    const profile = [];
    for (let x = 60; x <= 215; x += 2) {
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y += 2) {
        const a = data[(y * w + x) * 4 + 3];
        if (a < 40) continue;
        sum += luma(x, y);
        n++;
      }
      profile.push({ x, l: n ? sum / n : -1 });
    }
    const vals = profile.filter((p) => p.l >= 0).map((p) => p.l).sort((a, b) => a - b);
    if (vals.length < 10) continue;
    const median = vals[Math.floor(vals.length / 2)];
    // medyandan >25 sapan en uzun ardışık koşu
    let best = null;
    let runStart = -1;
    for (let i = 0; i <= profile.length; i++) {
      const outlier = i < profile.length && profile[i].l >= 0 && Math.abs(profile[i].l - median) > 25;
      if (outlier && runStart < 0) runStart = profile[i].x;
      if (!outlier && runStart >= 0) {
        const runEnd = profile[i - 1].x;
        const runW = runEnd - runStart;
        if (runW >= 80 && runW <= 170 && (!best || runW > best.w)) best = { x: runStart, w: runW };
        runStart = -1;
      }
    }
    if (best) rects.push({ x: best.x, y: y0 - 6, w: best.w, h: 76 + 12, row: r });
  }
  return rects;
}, { data: ai.data, w: ai.w, h: ai.h });

const detectedWindows = windowRectsTex.map((rect) => ({
  x: (rect.x - FRAME.x) / SCALE,
  y: (rect.y - FRAME.y) / SCALE,
  width: rect.w / SCALE,
  height: rect.h / SCALE,
}));

console.log(`[measure] pencere tespit: ${detectedWindows.length}/6`);

// Hücre kolonu tespiti: sağ bantta (tex x 215..285) mutlak koyu maske
// (luma < 45) ile yuva satırları bulunur — ardışık koyu satır koşuları
// (yükseklik 50-90 tex) yuvalardır. En az 5 yuva gerekir.
const socketColumn = await page.evaluate(async ({ data, w, h }) => {
  const luma = (x, y) => { const i = (y * w + x) * 4; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  // her satır için koyu oran (x 225..270 — yuva kolonu bandı)
  const rowDark = [];
  for (let y = 60; y <= 740; y += 2) {
    let dark = 0, tot = 0;
    for (let x = 225; x <= 270; x += 2) {
      const a = data[(y * w + x) * 4 + 3];
      if (a < 40) continue;
      tot++;
      if (luma(x, y) < 45) dark++;
    }
    rowDark.push({ y, r: tot ? dark / tot : 0 });
  }
  // koyu koşular (r >= 0.8)
  const runs = [];
  let start = -1;
  for (let i = 0; i < rowDark.length; i++) {
    const isDark = rowDark[i].r >= 0.8;
    if (isDark && start < 0) start = rowDark[i].y;
    if (!isDark && start >= 0) {
      const hh = rowDark[i - 1].y - start;
      if (hh >= 50 && hh <= 90) runs.push({ y: start, h: hh });
      start = -1;
    }
  }
  if (start >= 0) {
    const hh = rowDark[rowDark.length - 1].y - start;
    if (hh >= 50 && hh <= 90) runs.push({ y: start, h: hh });
  }
  if (runs.length < 5) return null;
  // her koşunun ORTA satırlarında koyu x aralığı (bezelleri dışlar);
  // yuva genişliği = medyan aralık
  const runRanges = [];
  for (const run of runs) {
    const midY = run.y + Math.floor(run.h / 2);
    let minX = 999, maxX = -1;
    for (let y = midY - 4; y <= midY + 4; y += 2) {
      for (let x = 215; x <= 285; x += 2) {
        const a = data[(y * w + x) * 4 + 3];
        if (a >= 40 && luma(x, y) < 45) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    if (minX < 999) runRanges.push({ minX, maxX });
  }
  const mins = runRanges.map((r) => r.minX).sort((a, b) => a - b);
  const maxs = runRanges.map((r) => r.maxX).sort((a, b) => a - b);
  return {
    x: mins[Math.floor(mins.length / 2)],
    y: runs[0].y,
    w: maxs[Math.floor(maxs.length / 2)] - mins[Math.floor(mins.length / 2)] + 1,
    h: runs[runs.length - 1].y + runs[runs.length - 1].h - runs[0].y,
    runs: runs.length,
  };
}, { data: ai.data, w: ai.w, h: ai.h });

let columnComp = socketColumn;

const columnMeasured = columnComp && columnComp.h > 500;
const windowsMeasured = detectedWindows.length >= 3;

const columnMeta = columnMeasured
  ? {
      x: (columnComp.x - FRAME.x) / SCALE,
      y: (columnComp.y - FRAME.y) / SCALE,
      width: columnComp.w / SCALE,
      height: columnComp.h / SCALE,
    }
  : DESIGN_COLUMN;

const winMeta = windowsMeasured ? detectedWindows : DESIGN_WINDOWS;

console.log(`[measure] pencere tespit: ${detectedWindows.length}/6, hücre kolonu: ${columnMeasured ? "OK" : "yok"}`);
if (windowsMeasured) {
  detectedWindows.forEach((wrect, i) =>
    console.log(`  w${i + 1}: (${wrect.x.toFixed(1)}, ${wrect.y.toFixed(1)}, ${wrect.width.toFixed(1)}, ${wrect.height.toFixed(1)})`),
  );
}
console.log(`  kolon: (${columnMeta.x.toFixed(1)}, ${columnMeta.y.toFixed(1)}, ${columnMeta.width.toFixed(1)}, ${columnMeta.height.toFixed(1)})`);

const frac = (r) => ({
  x: r.x / BODY_W,
  y: r.y / BODY_H,
  width: r.width / BODY_W,
  height: r.height / BODY_H,
});
const winFrac = winMeta.map(frac);
const columnFrac = frac(columnMeta);

const source = `// RackCell sprite meta: AI çıktısındaki pencere/hücre kolonu konumları.
// tools/measure-rackmeta.mjs tarafından üretilir.
// Değerler gövde boyutlarına (120x380 referans) ORAN olarak saklanır.
// windowsMeasured=${windowsMeasured}, columnMeasured=${columnMeasured}
export interface RackCellWindowMeta {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RackCellMeta {
  windowsMeasured: boolean;
  columnMeasured: boolean;
  windows: RackCellWindowMeta[];
  tube: RackCellWindowMeta;
}

export const RACKCELL_META: RackCellMeta = {
  windowsMeasured: ${windowsMeasured},
  columnMeasured: ${columnMeasured},
  windows: [
${winFrac.map((r) => `    { x: ${r.x.toFixed(5)}, y: ${r.y.toFixed(5)}, width: ${r.width.toFixed(5)}, height: ${r.height.toFixed(5)} },`).join("\n")}
  ],
  tube: { x: ${columnFrac.x.toFixed(5)}, y: ${columnFrac.y.toFixed(5)}, width: ${columnFrac.width.toFixed(5)}, height: ${columnFrac.height.toFixed(5)} },
};
`;

await writeFile(META_TS, source);
console.log(`[measure] pencere=${windowsMeasured ? "ölçüldü" : "tasarım"}, kolon=${columnMeasured ? "ölçüldü" : "tasarım"} -> ${path.relative(REPO_ROOT, META_TS)}`);
await browser.close();
process.exit(windowsMeasured && columnMeasured ? 0 : 1);
