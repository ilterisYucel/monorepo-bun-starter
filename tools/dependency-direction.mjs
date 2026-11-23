#!/usr/bin/env bun
/**
 * Bağımlılık yönü denetimi — SPEC: `BAGIMLILIK-YONU-VE-TEST-DUZENI-MIMARISI.md` (UC-1 / K1–K5).
 *
 * Kurallar:
 *  - Kök yön: packages(0) → services(1) → apps(2) → deployment(3) → tests(4)
 *    (yüksek katman aşağıyı kullanabilir; yukarı doğru bağımlılık YASAK).
 *  - services birbirini import edemez; apps birbirini import edemez.
 *  - deployment alt klasörleri (proje/tier/app) birbirini okuyamaz.
 *  - packages içi sıra: shared-types(0) → shared-utils(1) → result=logger(2) → core(3) → diğerleri(4);
 *    result/logger kardeştir (birbirini import edemez).
 *  - **Path ile dosya okuma da bağımlılıktır** (readFileSync / new URL / join|resolve(__dirname, …)).
 *
 * Kullanım:
 *   bun tools/dependency-direction.mjs            # insan özeti + ihlal varsa exit 1
 *   bun tools/dependency-direction.mjs --json     # makine-okunur (reviewer/KAPANIŞ)
 *   bun tools/dependency-direction.mjs --self-test
 *
 * Kapsam dışı: node_modules, dist, .stryker-tmp, .nx, coverage, .git, test-results.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", "dist", ".stryker-tmp", ".nx", "coverage", ".git", "test-results", ".turbo"]);
const CODE_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".mts", ".cts"]);

/** Kök yön katmanları (küçük = daha temel). */
const LAYER = { packages: 0, services: 1, apps: 2, deployment: 3, tests: 4 };

/** packages içi sıra (K2) — listede olmayanlar "diğerleri" (4). */
const PACKAGE_RANK = new Map([
  ["shared-types", 0],
  ["shared-utils", 1],
  ["result", 2],
  ["logger", 2],
  ["core", 3],
]);
const PACKAGE_DEFAULT_RANK = 4;
const SIBLINGS = new Set(["result", "logger"]);

const rel = (abs) => relative(ROOT, abs).split(sep).join("/");
const inRepo = (abs) => !abs.startsWith("..") && !abs.includes(`${sep}node_modules${sep}`);

/** Yol → { layer, unit, name } (repo dışı → undefined). */
export function classify(fileAbs) {
  const p = rel(fileAbs);
  if (p.startsWith("..") || p === "") return undefined;
  const parts = p.split("/");
  const top = parts[0];
  if (!(top in LAYER)) return undefined;
  if (top === "packages") {
    // packages/<pkg>/… veya packages/platform/<pkg>/… veya packages/plugins/<pkg>/…
    const nested = parts[1] === "platform" || parts[1] === "plugins";
    const name = nested ? parts[2] : parts[1];
    if (name === undefined) return undefined;
    const unit = nested ? `packages/${parts[1]}/${name}` : `packages/${name}`;
    return { layer: LAYER.packages, unit, name, kind: "package" };
  }
  if (top === "deployment") {
    // deployment/<proje>/<tier>/<app>/… → kapsül birimi
    const unit = parts.slice(0, 4).join("/");
    return { layer: LAYER.deployment, unit, name: parts[1] ?? "", kind: "deployment" };
  }
  const unit = `${top}/${parts[1] ?? ""}`;
  return { layer: LAYER[top], unit, name: parts[1] ?? "", kind: top.slice(0, -1) };
}

/** Kaynak metinden referansları çıkar (import/require + path okuma). */
export function extractRefs(source) {
  const refs = [];
  const push = (kind, spec, index) => {
    if (typeof spec === "string" && spec.length > 0) refs.push({ kind, spec, line: lineOf(source, index) });
  };
  for (const m of source.matchAll(/(?:import|export)[\s\S]{0,200}?from\s*["']([^"']+)["']/g)) push("import", m[1], m.index ?? 0);
  for (const m of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) push("import", m[1], m.index ?? 0);
  for (const m of source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) push("import", m[1], m.index ?? 0);
  for (const m of source.matchAll(/readFileSync\s*\(\s*["'`]([^"'`]+)["'`]/g)) push("read", m[1], m.index ?? 0);
  for (const m of source.matchAll(/new\s+URL\s*\(\s*["']([^"']+)["']/g)) push("read", m[1], m.index ?? 0);
  for (const m of source.matchAll(/\b(?:join|resolve)\s*\(\s*__dirname\s*,\s*["'`]([^"'`]+)["'`]/g)) push("read", m[1], m.index ?? 0);
  return refs;
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === "\n") line++;
  return line;
}

/** Paket/servis/app adı → dizin (tüm katmanlar; çapraz import tespiti için). */
function packageDirs() {
  const map = new Map();
  const scan = (base) => {
    if (!existsSync(base)) return;
    for (const entry of readdirSync(base)) {
      const dir = join(base, entry);
      if (!statSync(dir).isDirectory()) continue;
      const pkgFile = join(dir, "package.json");
      if (existsSync(pkgFile)) {
        try {
          const name = JSON.parse(readFileSync(pkgFile, "utf-8")).name;
          if (typeof name === "string") map.set(name, dir);
        } catch {
          /* bozuk package.json — atla */
        }
      } else if (entry === "platform" || entry === "plugins") {
        scan(dir);
      }
    }
  };
  scan(join(ROOT, "packages"));
  scan(join(ROOT, "services"));
  scan(join(ROOT, "apps"));
  return map;
}

/** Referansı hedef yola çözer (paket adı veya göreli yol). */
function resolveTarget(spec, importerAbs, pkgMap) {
  if (spec.startsWith(".")) return resolve(dirname(importerAbs), spec);
  const pkgName = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
  const dir = pkgMap.get(pkgName);
  return dir ?? undefined;
}

/** Tek referansı kurallara göre değerlendirir; ihlal veya undefined döner. */
export function evaluate(importerAbs, ref, pkgMap) {
  const from = classify(importerAbs);
  const targetAbs = resolveTarget(ref.spec, importerAbs, pkgMap);
  if (targetAbs === undefined || !inRepo(targetAbs)) return undefined;
  const to = classify(targetAbs);
  if (to === undefined) return undefined;
  if (from === undefined) return undefined;
  // Kendi birimi içi her zaman serbest.
  if (from.unit === to.unit) return undefined;

  const base = { file: rel(importerAbs), line: ref.line, kind: ref.kind, target: rel(targetAbs), from: from.unit, to: to.unit };

  if (to.layer > from.layer) {
    return { ...base, rule: "UPWARD", message: `${from.unit} (katman ${from.layer}) → ${to.unit} (katman ${to.layer}) yukarı bağımlılık` };
  }
  if (from.layer === to.layer) {
    if (from.layer === LAYER.services) return { ...base, rule: "SERVICES_ISOLATION", message: "servisler birbirini import edemez" };
    if (from.layer === LAYER.apps) return { ...base, rule: "APPS_ISOLATION", message: "apps birbirini import edemez" };
    if (from.layer === LAYER.deployment) return { ...base, rule: "DEPLOYMENT_ISOLATION", message: "deployment alt klasörleri birbirini okuyamaz" };
    if (from.layer === LAYER.packages) {
      if (SIBLINGS.has(from.name) && SIBLINGS.has(to.name)) {
        return { ...base, rule: "PACKAGE_SIBLING", message: "result/logger kardeştir — birbirini import edemez" };
      }
      const fr = PACKAGE_RANK.get(from.name) ?? PACKAGE_DEFAULT_RANK;
      const tr = PACKAGE_RANK.get(to.name) ?? PACKAGE_DEFAULT_RANK;
      if (fr < tr) {
        return { ...base, rule: "PACKAGE_ORDER", message: `paket sırası ihlali (${from.name} → ${to.name})` };
      }
    }
  }
  return undefined;
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (CODE_EXT.has(entry.slice(entry.lastIndexOf(".")))) out.push(full);
  }
  return out;
}

export function analyze({ files } = {}) {
  const pkgMap = packageDirs();
  const list = files ?? walk(ROOT, []);
  const violations = [];
  for (const file of list) {
    if (!inRepo(file)) continue;
    let source;
    try {
      source = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    for (const ref of extractRefs(source)) {
      const v = evaluate(file, ref, pkgMap);
      if (v !== undefined) violations.push(v);
    }
  }
  return violations;
}

/** Öz-test — araç kurallarının kendi kanıtı (CI + yerel). */
function selfTest() {
  const pkgMap = packageDirs();
  const fixtures = [
    ["services/a/src/x.ts", 'import { y } from "../../../deployment/v2/dev/site/y";', "UPWARD"],
    ["services/a/src/x.ts", 'import { y } from "@gd-monorepo/core";', undefined],
    ["services/a/src/x.ts", 'import { y } from "@gd-monorepo/web-service";', "SERVICES_ISOLATION"],
    ["apps/site/src/x.ts", 'readFileSync("../../../deployment/v2/dev/site/.env", "utf-8");', "UPWARD_READ"],
    ["apps/site/src/x.ts", 'import { y } from "../../../apps/editor/src/y";', "APPS_ISOLATION"],
    ["packages/simulators/src/x.ts", 'import { y } from "@gd-monorepo/shared-types";', undefined],
    ["packages/shared-types/src/x.ts", 'import { y } from "@gd-monorepo/core";', "PACKAGE_ORDER"],
    ["packages/logger/src/x.ts", 'import { y } from "@gd-monorepo/result";', "PACKAGE_SIBLING"],
    ["deployment/v2/dev/site/x.ts", 'import { y } from "../../container/x";', "DEPLOYMENT_ISOLATION"],
    ["tests/integration/x.test.ts", 'import { y } from "../../deployment/v2/dev/site/y";', undefined],
  ];
  let failed = 0;
  for (const [file, source, expected] of fixtures) {
    const abs = resolve(ROOT, file);
    const refs = extractRefs(source).filter((r) => (expected === "UPWARD_READ" ? r.kind === "read" : r.kind === "import"));
    const got = refs.map((r) => evaluate(abs, r, pkgMap)?.rule).filter((r) => r !== undefined);
    const want = expected === "UPWARD_READ" ? ["UPWARD"] : expected === undefined ? [] : [expected];
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} ${file} → beklenen ${JSON.stringify(want)}, gelen ${JSON.stringify(got)}`);
  }
  if (failed > 0) {
    console.error(`\n[self-test] ${failed} vaka başarısız`);
    process.exit(1);
  }
  console.log(`\n[self-test] ${fixtures.length} vaka geçti`);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  selfTest();
} else {
  const violations = analyze();
  if (args.includes("--json")) {
    console.log(JSON.stringify({ total: violations.length, violations }, null, 2));
  } else if (violations.length === 0) {
    console.log("[dependency-direction] ihlal yok ✅");
  } else {
    console.error(`[dependency-direction] ${violations.length} ihlal:`);
    for (const v of violations) {
      console.error(` - ${v.rule} · ${v.file}:${v.line} (${v.kind}) → ${v.target} — ${v.message}`);
    }
  }
  process.exit(violations.length === 0 ? 0 : 1);
}
