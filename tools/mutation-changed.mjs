#!/usr/bin/env bun
/**
 * mutation-changed — değişen dosyalarda mutasyon testi (Build kapısı, AGENTS.md Aşama 3).
 *
 * git diff (+ yeni/untracked dosyalar) ile değişen üretim dosyalarını bulur, dosyaların
 * ait olduğu paketlerde StrykerJS'i yalnız o dosyalar için çalıştırır. Eşik altındaysa
 * çıkış kodu 1'dir → review aşaması başlamaz (test güçlendirme turu açılır).
 *
 * Kullanım:
 *   bun tools/mutation-changed.mjs [--base <git-ref>] [--break <eşik>]
 *   bun run test:mutation                 # HEAD'e göre değişenler, eşik %80
 *   bun run test:mutation --break 90      # güvenlik-kritik modül koşusu
 *
 * ponytail: paketler sıralı koşar; hız gerekirse Promise.allSettled + paket başına temp dir.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const base = argValue("--base", "HEAD");
const breakThreshold = argValue("--break", "80");
const configFile = join(repoRoot, "stryker.conf.mjs");

const git = (cmd) => execSync(`git -C "${repoRoot}" ${cmd}`, { encoding: "utf8" });
const isSource = (f) =>
  /\.(ts|tsx)$/.test(f) &&
  !/\.(test|spec)\.(ts|tsx)$/.test(f) &&
  !f.endsWith(".d.ts") &&
  !f.startsWith("tools/");

const changed = [
  ...new Set([
    ...git(`diff --name-only --diff-filter=ACMR ${base}`).split("\n"),
    ...git("ls-files --others --exclude-standard").split("\n"),
  ]),
]
  .map((l) => l.trim())
  .filter((f) => f && isSource(f));

if (changed.length === 0) {
  console.log("[mutation] Değişen üretim dosyası yok — kapı atlandı.");
  process.exit(0);
}

const packageRoot = (file) => {
  let dir = dirname(join(repoRoot, file));
  while (dir.startsWith(repoRoot) && dir !== repoRoot) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  return null;
};

const byPackage = new Map();
for (const file of changed) {
  const root = packageRoot(file);
  if (!root) continue;
  const list = byPackage.get(root) ?? [];
  list.push(relative(root, join(repoRoot, file)));
  byPackage.set(root, list);
}

if (byPackage.size === 0) {
  console.log("[mutation] Değişen dosyalar için paket bulunamadı — kapı atlandı.");
  process.exit(0);
}

let failed = false;
for (const [root, files] of byPackage) {
  console.log(`\n[mutation] ${relative(repoRoot, root)}: ${files.join(", ")} (eşik %${breakThreshold})`);
  try {
    execSync(`bunx stryker run "${configFile}" --mutate "${files.join(",")}"`, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, MUTATION_BREAK: breakThreshold },
    });
  } catch {
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
