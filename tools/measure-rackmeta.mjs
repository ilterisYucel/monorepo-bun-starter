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

// Pencere adayları: genişlik 80-160, yükseklik 50-110, x 70-230 (gövde sol-orta bandı)
const winCandidates = components
  .filter((c) => c.w >= 80 && c.w <= 160 && c.h >= 50 && c.h <= 110 && c.x >= 70 && c.x <= 230)
  .sort((a, b) => a.y - b.y);

// Üst üste binen adayları tekilleştir
const unique = [];
for (const c of winCandidates) {
  const near = unique.find((u) => Math.abs(u.y - c.y) < 40 && Math.abs(u.x - c.x) < 40);
  if (near) {
    near.x = Math.min(near.x, c.x);
    near.y = Math.min(near.y, c.y);
    near.w = Math.max(near.w, c.w);
    near.h = Math.max(near.h, c.h);
  } else {
    unique.push({ ...c });
  }
}

// Satır yürüyüşü: ilk aday referans sütunu kurar (x ±25, pitch 30-80);
// boşluk varsa ekstrapole edilir, kalan satırlar son pitch ile uzatılır.
const rows = [];
let pitch = null;
for (const c of unique) {
  if (rows.length === 0) {
    rows.push(c);
    continue;
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (Math.abs(c.x - first.x) > 25) continue;
  const gap = c.y - last.y;
  if (gap >= 30 && gap <= 110) {
    rows.push(c);
    if (pitch === null || rows.length === 2) pitch = gap;
    else pitch = Math.round((pitch + gap) / 2);
  }
}
while (rows.length < 6 && pitch !== null) {
  const last = rows[rows.length - 1];
  rows.push({ x: last.x, y: last.y + pitch, w: last.w, h: last.h });
}

const detectedWindows = [];
const refW = rows.length ? rows[Math.floor(rows.length / 2)] : null;
for (let row = 0; row < 6; row++) {
  const c = rows[row];
  if (!c) break;
  detectedWindows.push({
    x: (c.x - FRAME.x) / SCALE,
    y: (c.y - FRAME.y) / SCALE,
    width: c.w / SCALE,
    height: c.h / SCALE,
  });
}

// Hücre kolonu: sağ banttaki (x>=195) küçük-orta boyutlu recessed bileşenlerin
// union bbox'ı (hücre yuvaları). AI hücreleri koyu VEYA parlak çizebilir —
// iki kutup da denenir, en az 4 hücre bulunan kazanır.
const cellCandidatesDark = components
  .filter((c) => c.x >= 195 && c.w >= 20 && c.w <= 70 && c.h >= 15 && c.h <= 90)
  .sort((a, b) => a.y - b.y);

// Parlak kutuplu hücre tespiti (sağ bant, luma - local > +18):
// persentil bbox (hücreler ayrı bileşen üretmese de sütunu kaplar)
const lightCellBbox = await page.evaluate(async ({ data, w, h }) => {
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
  const xs = [];
  const ys = [];
  for (let y = 12; y < 828 && y < h; y++) {
    for (let x = 195; x < 296 && x < w; x++) {
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
      if (lum[y * w + x] - local > 18) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length < 400) return null;
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  return {
    x: xs[Math.floor(xs.length * 0.12)],
    y: ys[Math.floor(ys.length * 0.12)],
    w: xs[Math.floor(xs.length * 0.88)] - xs[Math.floor(xs.length * 0.12)],
    h: ys[Math.floor(ys.length * 0.88)] - ys[Math.floor(ys.length * 0.12)],
    px: xs.length,
  };
}, { data: ai.data, w: ai.w, h: ai.h });

const cellCandidatesLight = lightCellBbox ? [lightCellBbox] : [];

function columnFromCandidates(cands) {
  if (cands.length < 4) return null;
  const top = cands[0].y;
  const bottom = cands[cands.length - 1].y + cands[cands.length - 1].h;
  const left = Math.min(...cands.map((c) => c.x));
  const right = Math.max(...cands.map((c) => c.x + c.w));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

// Parlak bbox'ı tasarım kolonuna ±%25 kırp (aykırı parlak bölgeleri dışlar)
function clampLightBbox(b) {
  if (!b) return null;
  const dx = 40 + 220; // tasarım kolon x başlangıcı (tex): FRAME.x + 90*2
  const dy = 12 + 37 * 2; // FRAME.y + 37*2
  const dw = 40; // 20*2
  const dh = 612; // 306*2
  const cw = Math.min(Math.max(b.w, dw * 0.75), dw * 1.25);
  const ch = Math.min(Math.max(b.h, dh * 0.75), dh * 1.25);
  const cx = Math.min(Math.max(b.x, dx - dw * 0.3), dx + dw * 0.3);
  const cy = Math.min(Math.max(b.y, dy - dh * 0.2), dy + dh * 0.2);
  return { x: cx, y: cy, w: cw, h: ch };
}

let columnComp = columnFromCandidates(cellCandidatesDark) ?? clampLightBbox(lightCellBbox);

const columnOk = columnComp && columnComp.h > 500;
const windowsOk = detectedWindows.length >= 3;

const columnMeta = columnOk
  ? {
      x: (columnComp.x - FRAME.x) / SCALE,
      y: (columnComp.y - FRAME.y) / SCALE,
      width: columnComp.w / SCALE,
      height: columnComp.h / SCALE,
    }
  : DESIGN_COLUMN;

const winMeta = windowsOk ? detectedWindows : DESIGN_WINDOWS;
const measured = windowsOk && columnOk;

console.log(`[measure] pencere tespit: ${detectedWindows.length}/6, hücre kolonu: ${columnOk ? "OK" : "yok"}`);
if (windowsOk) {
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
// tools/measure-rackmeta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına (120x380 referans) ORAN olarak saklanır.
// measured=${measured} (false ise tasarım fallback geometrisi)
export interface RackCellWindowMeta {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RackCellMeta {
  measured: boolean;
  windows: RackCellWindowMeta[];
  tube: RackCellWindowMeta;
}

export const RACKCELL_META: RackCellMeta = {
  measured: ${measured},
  windows: [
${winFrac.map((r) => `    { x: ${r.x.toFixed(5)}, y: ${r.y.toFixed(5)}, width: ${r.width.toFixed(5)}, height: ${r.height.toFixed(5)} },`).join("\n")}
  ],
  tube: { x: ${columnFrac.x.toFixed(5)}, y: ${columnFrac.y.toFixed(5)}, width: ${columnFrac.width.toFixed(5)}, height: ${columnFrac.height.toFixed(5)} },
};
`;

await writeFile(META_TS, source);
console.log(`[measure] ${measured ? "ölçüm başarılı" : "tespit yetersiz — tasarım fallback'i"} -> ${path.relative(REPO_ROOT, META_TS)}`);
await browser.close();
process.exit(measured ? 0 : 1);
