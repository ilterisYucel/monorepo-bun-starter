// Sprite tema takası: aktif sprite seti ile archive/legacy seti arasında geçiş.
// Kullanım:
//   bun tools/swap-sprite-theme.mjs backup    # aktif sprite'lar + meta dosyaları -> archive/legacy
//   bun tools/swap-sprite-theme.mjs restore   # archive/legacy -> aktif (eski görünüme dönüş)
//   bun tools/swap-sprite-theme.mjs status    # hangi setler mevcut, listeler
//
// Aktif sprite'lar: packages/ui/src/assets/sprites/<element>/  (uygulamanın yüklediği)
// Legacy yedek:     packages/ui/assets/sprites/archive/legacy/  (commit'lenir)
// Meta dosyaları (ölçülen yuva oranları) sprite'larla birlikte taşınır:
//   packages/ui/src/graphics/elements/<Element>/<element>-meta.ts  <->  archive/legacy/meta/<Element>/
// AI her üretimde yuvaları ±10-30px kaydırabildiği için meta seti de temaya özgüdür.
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ACTIVE_DIR = path.join(REPO_ROOT, "packages/ui/src/assets/sprites");
const LEGACY_DIR = path.join(REPO_ROOT, "packages/ui/assets/sprites/archive/legacy");
const ELEMENTS_DIR = path.join(REPO_ROOT, "packages/ui/src/graphics/elements");

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

const copyDir = async (src, dst) => {
  await rm(dst, { recursive: true, force: true });
  await cp(src, dst, { recursive: true });
  console.log(`  ${path.relative(REPO_ROOT, src)} -> ${path.relative(REPO_ROOT, dst)}`);
};

async function copyMetas(srcRoot, dstRoot) {
  let count = 0;
  const entries = await readdir(srcRoot);
  for (const entry of entries) {
    const dir = path.join(srcRoot, entry);
    if (!(await exists(dir))) continue;
    try {
      const files = (await readdir(dir)).filter((f) => f.endsWith("-meta.ts"));
      if (files.length === 0) continue;
      for (const f of files) {
        await cp(path.join(dir, f), path.join(dstRoot, entry, f), { recursive: true, force: true });
        count++;
      }
    } catch {
      // eleman dizini değilse atla
    }
  }
  if (count > 0) console.log(`  ${count} meta dosyası ${path.relative(REPO_ROOT, dstRoot)}`);
}

async function backup() {
  console.log("[theme] Backup: aktif -> archive/legacy");
  const spriteDirs = (await readdir(ACTIVE_DIR)).filter((d) => d !== ".");
  let copied = 0;
  for (const dir of spriteDirs) {
    const src = path.join(ACTIVE_DIR, dir);
    const dst = path.join(LEGACY_DIR, dir);
    if (await exists(dst)) {
      console.log(`  atla: ${path.relative(REPO_ROOT, dst)} zaten dolu (--force için önce silin)`);
      continue;
    }
    await copyDir(src, dst);
    copied++;
  }
  if (copied === 0) {
    console.error("[theme] backup yapılmadı: archive/legacy zaten dolu. Ezmek istiyorsanız önce silin.");
    process.exit(1);
  }
  await copyMetas(ELEMENTS_DIR, path.join(LEGACY_DIR, "meta"));
  console.log("[theme] backup tamamlandı.");
}

async function restore() {
  console.log("[theme] Restore: archive/legacy -> aktif");
  if (!(await exists(LEGACY_DIR))) {
    console.error("[theme] archive/legacy bulunamadı — önce backup yapılmış olmalı.");
    process.exit(1);
  }
  const entries = (await readdir(LEGACY_DIR)).filter((e) => e !== "meta");
  if (entries.length === 0) {
    console.error("[theme] archive/legacy boş.");
    process.exit(1);
  }
  for (const dir of entries) {
    await copyDir(path.join(LEGACY_DIR, dir), path.join(ACTIVE_DIR, dir));
  }
  const metaRoot = path.join(LEGACY_DIR, "meta");
  if (await exists(metaRoot)) {
    let count = 0;
    for (const dir of await readdir(metaRoot)) {
      const files = (await readdir(path.join(metaRoot, dir))).filter((f) => f.endsWith("-meta.ts"));
      for (const f of files) {
        await cp(path.join(metaRoot, dir, f), path.join(ELEMENTS_DIR, dir, f), { force: true });
        count++;
      }
    }
    if (count > 0) console.log(`  ${count} meta dosyası geri yüklendi`);
  }
  console.log("[theme] restore tamamlandı.");
}

async function status() {
  const legacyExists = await exists(LEGACY_DIR);
  console.log("[theme] durum:");
  console.log(`  aktif sprite'lar: ${path.relative(REPO_ROOT, ACTIVE_DIR)}`);
  for (const dir of await readdir(ACTIVE_DIR)) {
    const files = await readdir(path.join(ACTIVE_DIR, dir));
    console.log(`    - ${dir}: ${files.join(", ")}`);
  }
  console.log(`  legacy yedek: ${legacyExists ? path.relative(REPO_ROOT, LEGACY_DIR) : "YOK"}`);
  if (legacyExists) {
    for (const dir of (await readdir(LEGACY_DIR)).filter((e) => e !== "meta")) {
      const files = await readdir(path.join(LEGACY_DIR, dir));
      console.log(`    - ${dir}: ${files.join(", ")}`);
    }
    const metaRoot = path.join(LEGACY_DIR, "meta");
    if (await exists(metaRoot)) console.log(`    - meta: ${(await readdir(metaRoot)).join(", ")}`);
  }
}

const command = process.argv[2];
switch (command) {
  case "backup":
    await backup();
    break;
  case "restore":
    await restore();
    break;
  case "status":
    await status();
    break;
  default:
    console.error("Kullanım: bun tools/swap-sprite-theme.mjs <backup|restore|status>");
    process.exit(1);
}
