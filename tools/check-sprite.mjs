// Sprite kalite kontrolü (Faz 4): boyut, şeffaflık, nötr renk, içerik bbox
// Kullanım: bun tools/check-sprite.mjs [element...]  (boşsa hepsi)
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITE_SPECS } from "./sprites-spec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SPRITES_DIR = path.join(REPO_ROOT, "packages/ui/src/assets/sprites");

const EXPECTED = Object.fromEntries(
  Object.entries(SPRITE_SPECS).map(([k, s]) => [k, [s.canvas.width, s.canvas.height]]),
);

// Nötr baz kuralı: sprite içinde bulunmaması gereken durum renkleri
const FORBIDDEN = {
  success: [16, 185, 129],
  successGlow: [52, 211, 153],
  warning: [245, 158, 11],
  warningGlow: [251, 191, 36],
  error: [239, 68, 68],
  errorStroke: [248, 113, 113],
  info: [59, 130, 246],
};

const names = process.argv.slice(2).filter((a) => a in EXPECTED);
const targets = names.length ? names : Object.keys(EXPECTED);

const browser = await chromium.launch();
const page = await browser.newPage();
let failed = 0;

for (const element of targets) {
  const file = path.join(SPRITES_DIR, element, "base.png");
  const dataUrl = "data:image/png;base64," + (await readFile(file)).toString("base64");
  const stats = await page.evaluate(async ([el, f, forb]) => {
    const img = new Image();
    img.src = f;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let opaque = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    const hits = {};
    for (const k of Object.keys(forb)) hits[k] = 0;
    const near = (px, t, tol = 40) =>
      Math.abs(px[0] - t[0]) <= tol && Math.abs(px[1] - t[1]) <= tol && Math.abs(px[2] - t[2]) <= tol;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = data[i + 3];
        if (a > 16) {
          opaque++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          for (const [k, t] of Object.entries(forb)) {
            if (near([data[i], data[i + 1], data[i + 2]], t)) hits[k]++;
          }
        }
      }
    }
    const corners = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    ].map(([x, y]) => data[(y * width + x) * 4 + 3]);
    return { width, height, opaque, opaqueRatio: opaque / (width * height), minX, maxX, minY, maxY, corners, hits };
  }, [element, dataUrl, FORBIDDEN]);

  const [ew, eh] = EXPECTED[element];
  const issues = [];
  if (stats.width !== ew || stats.height !== eh) issues.push(`boyut ${stats.width}x${stats.height} != beklenen ${ew}x${eh}`);
  if (stats.corners.some((a) => a > 16)) issues.push(`köşe pikselleri şeffaf değil: ${stats.corners.join(",")}`);
  if (stats.opaqueRatio < 0.02) issues.push("sprite neredeyse boş (opak oran < 2%)");
  if (stats.opaqueRatio > 0.97) issues.push("sprite tamamen dolu — arka plan temizliği çalışmamış olabilir");
  const sigForbidden = Object.entries(stats.hits).filter(([, n]) => n > stats.opaque * 0.03);
  if (sigForbidden.length) issues.push(`durum renkleri mevcut: ${sigForbidden.map(([k, n]) => `${k}=${n}px`).join(", ")}`);

  console.log(`[check] ${element}: ${stats.width}x${stats.height}, opak=%${(stats.opaqueRatio * 100).toFixed(1)}, bbox=(${stats.minX},${stats.minY})-(${stats.maxX},${stats.maxY}), köşeA=${stats.corners.join(",")}`);
  if (issues.length) {
    failed++;
    for (const issue of issues) console.log(`  ! ${issue}`);
  } else {
    console.log(`  OK`);
  }
}

await browser.close();
if (failed) process.exit(1);
