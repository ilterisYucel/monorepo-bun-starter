// AI sprite üretim pipeline (Faz 1)
// Kullanım:
//   FAL_KEY=... bun tools/generate-sprite.mjs rackcell
//   FAL_KEY=... bun tools/generate-sprite.mjs --all
//   FAL_KEY=... bun tools/generate-sprite.mjs cable --skip-removal
//
// Akış: referans PNG -> fal.ai storage upload -> nano-banana/edit (img2img,
// giriş çözünürlüğünü korur) -> BiRefNet arka plan temizleme
// -> src/assets/sprites/<element>/base.png
// Çıktı doğrudan uygulamanın yüklediği dosyanın üzerine yazılır:
// mevcut çizim referanslı placeholder yerine AI sprite'ı devreye girer.
import { fal } from "@fal-ai/client";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITE_SPECS } from "./sprites-spec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const REFS_DIR = path.join(REPO_ROOT, "packages/ui/assets/sprites/refs");
const OUT_DIR = path.join(REPO_ROOT, "packages/ui/src/assets/sprites");

// Element -> (img2img referans story, prompt açıklaması)
// Referans: nötr Base story yakalaması (refs/<element>/base.png) — durum renkleri içermez.
// Prompt'lar docs/SPRITE-STYLE-KIT.md bölüm 3 ile birebir tutulur.
const ELEMENTS = {
  rackcell: {
    ref: "base",
    describe:
      "a vertical battery storage rack unit. Repaint ONLY the surfaces — do NOT redesign, do NOT rearrange, do NOT resize, do NOT move any element. " +
      "Keep the exact structure of the reference: the rounded body outline, the two terminal nubs at top and bottom, the six identical rectangular display windows in the left-center column at their exact positions and sizes with the same gaps, and the narrow vertical fill tube on the right at its exact position. " +
      "Do not add battery module grids, do not add extra panels, do not add objects. Only upgrade the material look (dark metal, polished plastic, thin dark outline).",
    removeBg: true,
  },
  cable: {
    ref: "base",
    describe:
      "a short straight horizontal industrial power cable segment with an insulated metallic conduit and round terminal lugs at both ends",
    removeBg: true,
  },
  circuitbreaker: {
    ref: "base",
    describe:
      "an industrial DC circuit breaker module with a rotary lever socket, compact electrical panel unit",
    removeBg: true,
  },
  dcoutput: {
    ref: "base",
    describe:
      "a round industrial DC output power connector head with insulated housing and terminal studs",
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
      "a compact industrial HVAC cooling unit with fan grille and control panel, wall-mount form factor",
    removeBg: true,
  },
  panelcard: {
    ref: "base",
    describe:
      "a slim wall-mount electrical panel enclosure. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline and the large recessed rectangular slot in the lower area (empty dark glass). Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  firepanel: {
    ref: "base",
    describe:
      "an industrial fire alarm control panel. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline, six small round empty lamp sockets arranged in two rows of three near the upper-middle, four small rectangular key sockets in one row below them, and the blank label strip at the top. Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  energyanalyzergraphic: {
    ref: "base",
    describe:
      "an industrial energy analyzer unit. Repaint ONLY the surfaces — do NOT redesign, do NOT move any element. Keep the exact structure of the reference: the body outline and the large recessed rectangular LCD screen socket in the middle (empty dark glass). Do not add objects. Only upgrade the material look.",
    removeBg: true,
  },
  grid: {
    ref: "base",
    describe:
      "a compact grid connection symbol card: dark panel with a smooth sine wave power line inside and two terminal blocks, electrical grid icon",
    removeBg: true,
  },
};

const BASE_PROMPT =
  "Repaint this flat technical drawing into a polished 2.5D isometric game-UI sprite. " +
  "Keep the exact shape, size, position, silhouette and bounding box of the drawn object — do not resize, do not move, do not add extra objects. " +
  "Style: clean industrial battery energy storage system interface, soft plastic-metal hybrid body, " +
  "thin dark outline, smooth bevel highlights, single light source from top-left, " +
  "dark UI color scheme compatible with a #0f0f1a background. " +
  "Monochrome neutral color body: dark-gray/silver metal and dark panels only — " +
  "absolutely NO green, NO orange, NO red, NO blue lights, NO colored glow, NO colored LEDs, NO status lights. " +
  "No text, no letters, no labels, no icons, no logos inside the sprite. " +
  "Keep the background fully transparent black-and-white alpha only. Crisp vector-like edges, high detail.";

const NEGATIVE =
  "photorealistic, text, letters, watermark, logo, background, floor, drop shadow outside the object, " +
  "perspective distortion, warped layout, resized object, green light, red light, orange light, blue light, " +
  "colored glow, status LEDs, energy bar, filling indicator";

const args = process.argv.slice(2);
const skipRemoval = args.includes("--skip-removal");
const names = args.includes("--all")
  ? Object.keys(ELEMENTS)
  : args.filter((a) => !a.startsWith("--"));

if (names.length === 0) {
  console.error("Kullanım: bun tools/generate-sprite.mjs <element> [--all] [--skip-removal]");
  console.error(`Elementler: ${Object.keys(ELEMENTS).join(", ")}`);
  process.exit(1);
}

if (!process.env.FAL_KEY) {
  console.error("FAL_KEY ortam değişkeni gerekli. https://fal.ai/dashboard/keys adresinden alın.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Normalizasyon: AI çıktısı (model çözünürlüğü/aspect'i değiştirebilir)
// -> içerik bbox (+margin) kırp -> frame boyutuna yeniden boyutlandır
// -> beklenen canvas'a frame konumuna yapıştır.
// Böylece SPRITE_ASSETS frame metaları model çıktısından bağımsız geçerli kalır.
async function normalize(buffer, element, page) {
  const spec = SPRITE_SPECS[element];
  if (!spec) return buffer;

  const outB64 = await page.evaluate(async ({ b64, cw, ch, fx, fy, fw, fh, margin }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();

    const src = document.createElement("canvas");
    src.width = img.naturalWidth;
    src.height = img.naturalHeight;
    const sctx = src.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(img, 0, 0);
    const d = sctx.getImageData(0, 0, src.width, src.height).data;

    let minX = src.width, maxX = 0, minY = src.height, maxY = 0;
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        if (d[(y * src.width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;

    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(src.width - 1, maxX + margin);
    maxY = Math.min(src.height - 1, maxY + margin);

    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(src, minX, minY, maxX - minX + 1, maxY - minY + 1, fx, fy, fw, fh);
    return out.toDataURL("image/png");
  }, {
    b64: buffer.toString("base64"),
    cw: spec.canvas.width,
    ch: spec.canvas.height,
    fx: spec.frame.x,
    fy: spec.frame.y,
    fw: spec.frame.width,
    fh: spec.frame.height,
    margin: spec.margin,
  });

  if (!outB64) {
    console.error(`[gen] ${element}: normalizasyon başarısız (içerik bulunamadı)`);
    return buffer;
  }
  return Buffer.from(outB64.split(",")[1], "base64");
}

async function generateOne(element, page) {
  const spec = ELEMENTS[element];
  if (!spec) {
    console.error(`[gen] bilinmeyen element: ${element}`);
    return false;
  }
  const refPath = path.join(REFS_DIR, element, `${spec.ref}.png`);
  const outDir = path.join(OUT_DIR, element);
  const outPath = path.join(outDir, "base.png");

  let refSize;
  try {
    refSize = (await stat(refPath)).size;
  } catch {
    console.error(`[gen] referans bulunamadı: ${refPath} — önce bun tools/capture-sprite-refs.mjs çalıştırın`);
    return false;
  }

  console.log(`[gen] ${element}: referans yükleniyor (${(refSize / 1024).toFixed(1)} KB)...`);
  const refBuffer = await readFile(refPath);
  const refUrl = await fal.storage.upload(new Blob([refBuffer], { type: "image/png" }));

  const prompt = `${BASE_PROMPT} The element is ${spec.describe}. ${NEGATIVE}`;

  console.log(`[gen] ${element}: nano-banana img2img üretiliyor...`);
  const gen = await fal.subscribe("fal-ai/nano-banana/edit", {
    input: {
      prompt,
      image_urls: [refUrl],
      num_images: 1,
      output_format: "png",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs?.map((log) => log.message).forEach((m) => console.log(`  [fal] ${m}`));
      }
    },
  });

  let imageUrl = gen.data?.images?.[0]?.url;
  if (!imageUrl) {
    console.error(`[gen] ${element}: üretim yanıtında görsel yok`);
    return false;
  }

  if (spec.removeBg && !skipRemoval) {
    console.log(`[gen] ${element}: BiRefNet arka plan temizliği...`);
    const rem = await fal.subscribe("fal-ai/birefnet/v2", {
      input: { image_url: imageUrl, output_format: "png", refine_foreground: true },
      logs: true,
    });
    imageUrl = rem.data?.image?.url ?? imageUrl;
  }

  console.log(`[gen] ${element}: indiriliyor...`);
  const res = await fetch(imageUrl);
  let buffer = Buffer.from(await res.arrayBuffer());

  const normalized = await normalize(buffer, element, page);
  buffer = normalized;

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, buffer);
  console.log(`[gen] ${element}: kaydedildi -> ${path.relative(REPO_ROOT, outPath)} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return true;
}

const browser = await chromium.launch();
const page = await browser.newPage();
let failed = 0;
for (const name of names) {
  const ok = await generateOne(name, page);
  if (!ok) failed++;
  await sleep(1500);
}
await browser.close();

if (failed > 0) {
  console.error(`[gen] ${failed}/${names.length} element başarısız`);
  process.exit(1);
}
console.log(`[gen] tamamlandı -> ${path.relative(REPO_ROOT, OUT_DIR)}`);
