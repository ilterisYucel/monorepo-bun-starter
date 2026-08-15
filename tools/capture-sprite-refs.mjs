// Sprite üretim referans görsel yakalama scripti (Faz 0)
// Kullanım: bun tools/capture-sprite-refs.mjs
// Storybook static build eder, yerel sunucuda servis eder ve
// her element story'sinin iframe'ini ekran görüntüsü olarak kaydeder.
import { chromium } from "@playwright/test";
import { mkdir, rm, access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const UI_DIR = path.join(REPO_ROOT, "packages/ui");
const STATIC_DIR = path.join(UI_DIR, "storybook-static");
const OUT_DIR = path.join(UI_DIR, "assets/sprites/refs");

const STORY_MANIFEST = {
  rackcell: ["online-charging", "online-discharging", "offline", "idle", "full"],
  cable: ["idle", "charging", "discharging"],
  cablebus: ["idle", "charging", "discharging"],
  circuitbreaker: ["online-closed", "online-open", "offline"],
  dcoutput: ["active", "idle", "no-dc-output"],
  hvacunit: ["online-cooling", "online-warming", "offline", "idle"],
  panelcard: ["cold", "normal", "hot"],
  roomcard: ["room-o-1", "room-o-2"],
  firepanel: ["normal", "fire-alarm"],
  energyanalyzergraphic: ["normal"],
};

// Nötr baz sprite yakalamaları (Base story, omitBackground ile)
// -> packages/ui/assets/sprites/refs/<element>/base.png  (AI üretim referansı)
// -> packages/ui/src/assets/sprites/<element>/base.png  (uygulamanın yüklediği placeholder)
import { SPRITE_SPECS } from "./sprites-spec.mjs";
const SPRITE_BASES = Object.keys(SPRITE_SPECS);
const SPRITES_DIR = path.join(UI_DIR, "src/assets/sprites");

const run = (cmd, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} başarısız (exit ${code})`)),
    );
  });

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(path.join(STATIC_DIR, "index.html")))) {
    console.log("[capture] storybook-static bulunamadı, build ediliyor...");
    await run("bun", ["nx", "run", "ui:build-storybook"], REPO_ROOT);
  } else {
    console.log("[capture] mevcut storybook-static kullanılıyor");
  }

  await rm(OUT_DIR, { recursive: true, force: true });

  const MIME = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".map": "application/json",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const rel = urlPath === "/" ? "index.html" : urlPath.slice(1);
      const file = path.join(STATIC_DIR, rel);
      const data = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(6007, resolve));
  const base = "http://localhost:6007";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });

  await page.waitForTimeout(2000);

  for (const [element, stories] of Object.entries(STORY_MANIFEST)) {
    const dir = path.join(OUT_DIR, element);
    await mkdir(dir, { recursive: true });
    for (const story of stories) {
      const id = `graphics-${element}--${story}`;
      const url = `${base}/iframe.html?id=${id}&viewMode=story`;
      console.log(`[capture] ${element}/${story} <- ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const canvas = page.locator("canvas").first();
      await canvas.screenshot({ path: path.join(dir, `${story}.png`) });
    }
  }

  for (const element of SPRITE_BASES) {
    const titleId = SPRITE_SPECS[element].titleId ?? element;
    const url = `${base}/iframe.html?id=graphics-${titleId}--base&viewMode=story`;
    console.log(`[capture] sprite base: ${element} <- ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const canvas = page.locator("canvas").first();
    const buf = await canvas.screenshot({ omitBackground: true });
    // refs her zaman tazelenir (AI üretim girdisi)
    await mkdir(path.join(OUT_DIR, element), { recursive: true });
    await writeFile(path.join(OUT_DIR, element, "base.png"), buf);
    // src/assets yalnızca dosya yoksa yazılır — AI sprite'ları ezmez.
    // Zorla placeholder'a dönmek için: --reset-sprites
    const dst = path.join(SPRITES_DIR, element, "base.png");
    const exists = await access(dst).then(() => true).catch(() => false);
    if (!exists || process.argv.includes("--reset-sprites")) {
      await mkdir(path.join(SPRITES_DIR, element), { recursive: true });
      await writeFile(dst, buf);
    }
  }

  await browser.close();
  server.close();
  console.log(`[capture] tamamlandı -> ${path.relative(REPO_ROOT, OUT_DIR)} + ${path.relative(REPO_ROOT, SPRITES_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
