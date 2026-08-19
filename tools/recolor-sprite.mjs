// Sprite yeniden renklendirme: sprite piksellerini hedef renge taşır.
// Kullanım: bun tools/recolor-sprite.mjs <element> <hex>
// - alpha > 0 pikseller: hedef rengin luma'sı merkez alınır,
//   pikselin kendi luma oranıyla ölçeklenir (ton = hedef, parlaklık varyasyonu korunur)
// Amaç: sprite çizgilerini kablo rengiyle (COLOR.cable #5a5a7a) eşleştirmek.
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITE_SPECS } from "./sprites-spec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SPRITES_DIR = path.join(REPO_ROOT, "packages/ui/src/assets/sprites");

const args = process.argv.slice(2);
const element = args[0];
const hex = args[1];
if (!element || !hex) {
  console.error("Kullanım: bun tools/recolor-sprite.mjs <element> <hex>");
  process.exit(1);
}
const spec = SPRITE_SPECS[element];
if (!spec) {
  console.error(`[recolor] bilinmeyen element: ${element}`);
  process.exit(1);
}

const tr = parseInt(hex.replace("#", "").slice(0, 2), 16);
const tg = parseInt(hex.replace("#", "").slice(2, 4), 16);
const tb = parseInt(hex.replace("#", "").slice(4, 6), 16);
const targetLuma = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;

const files = spec.variants ? spec.variants.map((v) => `base-${v}.png`) : ["base.png"];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const file of files) {
  const p = path.join(SPRITES_DIR, element, file);
  const b64 = (await readFile(p)).toString("base64");

  const out = await page.evaluate(async ({ b64, tr, tg, tb, targetLuma }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const data = d.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= 0) continue;
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const k = targetLuma > 0 ? luma / targetLuma : 0;
      data[i] = Math.max(0, Math.min(255, Math.round(tr * k)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(tg * k)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(tb * k)));
    }
    ctx.putImageData(d, 0, 0);
    return c.toDataURL("image/png");
  }, { b64, tr, tg, tb, targetLuma });

  const buf = Buffer.from(out.split(",")[1], "base64");
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, buf);
  console.log(`[recolor] ${element}/${file} -> #${hex} (${(buf.length / 1024).toFixed(1)} KB)`);
}

await browser.close();
console.log("[recolor] tamamlandı");
