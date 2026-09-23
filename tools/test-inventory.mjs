#!/usr/bin/env bun
/**
 * test-inventory — test dosyalarından otomatik envanter üretimi.
 *
 * `docs/roadmap/test-envanteri.md`'nin it-by-it envanter bölümleri bu araçla
 * ÜRETİLİR — elle kopya YAPILMAZ (SPEC-SABLONU.md kural 10). Boşluk notları
 * (KAPSANMAYAN) modülün `<MODUL>-KAPANIS.md` §B.2'sinde yaşar.
 *
 * Kullanım:
 *   bun tools/test-inventory.mjs [--out <dosya>] [<test-dosyası veya dizin>...]
 *     — argüman yoksa apps/services/packages altındaki tüm *.test.ts(x) taranır
 *     — --out yoksa markdown stdout'a yazılır
 *
 * Ayrıştırma: describe/it/test başlıklarının satır-bazlı regex çıkarımı
 * (koşum GEREKMEZ — hızlı statik tarama). describe bloğu adı it maddesine
 * önek olarak işlenir (hangi senaryonun nerede olduğu ilk bakışta görülür).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const TITLE_RE = /^\s*(describe|it|test)(?:\.\w+)?(?:\.skip|\.only|\.todo)?\(\s*(["'`])((?:(?!\2).)+)\2/;
const KIND_IDX = 1;

function extractTitles(file, text) {
  const entries = [];
  const lines = text.split("\n");
  const describeStack = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = TITLE_RE.exec(line);
    if (!m) continue;
    const kind = m[KIND_IDX];
    const title = m[3];
    if (kind === "describe") {
      describeStack.push(title);
      entries.push({ type: "describe", title, depth: describeStack.length });
    } else {
      entries.push({
        type: "it",
        title,
        context: [...describeStack],
      });
    }
  }
  return entries;
}

function collectFiles(paths) {
  const files = [];
  const walk = (p) => {
    if (statSync(p).isDirectory()) {
      if (p.includes("node_modules") || p.includes("/dist")) return;
      for (const entry of readdirSync(p)) {
        if (entry.startsWith(".")) continue;
        walk(join(p, entry));
      }
      return;
    }
    if (/\.(test|spec)\.(ts|tsx|mjs|js)$/.test(p)) files.push(p);
  };
  for (const p of paths) walk(p);
  return [...new Set(files)].sort();
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
let outFile = null;
if (outIdx !== -1) {
  outFile = args[outIdx + 1];
  args.splice(outIdx, 2);
}

const paths = args.length > 0 ? args : ["apps", "services", "packages"];
const files = collectFiles(paths);

const lines = [];
lines.push("<!-- OTOMATIK — bun run test:inventory ile üretilir; elle DÜZENLENMEZ -->");
lines.push("");

let totalTests = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const entries = extractTitles(file, text);
  const its = entries.filter((e) => e.type === "it");
  if (its.length === 0) continue;
  totalTests += its.length;
  lines.push(`### \`${file}\` (${its.length} test)`);
  lines.push("");
  its.forEach((it, idx) => {
    const ctx = it.context.length > 0 ? `(${it.context.join(" > ")}) ` : "";
    lines.push(`${idx + 1}. ${ctx}**"${it.title}"**`);
  });
  lines.push("");
  lines.push("[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>");
  lines.push("");
}

const header = `# Test Envanteri (otomatik)\n\n> Üretim: \`bun run test:inventory\` — ${new Date().toISOString().slice(0, 10)}\n> Tarandı: ${files.length} test dosyası, ${totalTests} test bloğu.\n\n`;
const output = header + lines.join("\n") + "\n";

if (outFile) {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const dir = join(outFile, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(outFile, output);
  console.log(`test-inventory: ${files.length} dosya, ${totalTests} test → ${outFile}`);
} else {
  process.stdout.write(output);
}
