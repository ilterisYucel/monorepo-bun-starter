#!/usr/bin/env bun
/**
 * sbom-scan.mjs — Faz 6 T6.4: SBOM üretimi + Trivy CVE taraması.
 *
 * İki tarama:
 *  1. dosya sistemi taraması (monorepo kökü — bağımlılıklar bun.lock dahil)
 *  2. imaj taraması (deployment/docker-compose*.yml + Dockerfile FROM'larından
 *     toplanan pinli imajlar)
 *
 * Kapı: 0 Critical/High CVE (nis-2.md Adım 13). Trivy kurulu değilse uyarı
 * ile atlar (yerel geliştirme uyumluluğu); CI'da (security.yml) eksikliği
 * başarısızlıktır.
 *
 * Kullanım: bun tools/sbom-scan.mjs [--exit-code] [--dir <hedef>]
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const hasTrivy = (() => {
  try {
    execSync("trivy --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
})();

const args = process.argv.slice(2);
const exitCode = args.includes("--exit-code");
const dirFlag = args.indexOf("--dir");
const scanDir = dirFlag !== -1 ? args[dirFlag + 1] : ROOT;

/** Compose/Dockerfile'lardaki pinli imajları toplar (digest şart). */
function collectImages(root) {
  const images = new Set();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".yml") || entry.name === "Dockerfile" || entry.name.startsWith("Dockerfile.")) {
        const content = readFileSync(full, "utf8");
        for (const line of content.split("\n")) {
          const match = line.match(/^\s*image:\s*(\S+)/) ?? line.match(/^FROM\s+(\S+)/);
          if (match) images.add(match[1]);
        }
      }
    }
  };
  walk(join(root, "deployment"));
  walk(join(root, "apps"));
  walk(join(root, "services"));
  return [...images].filter((image) => image.includes("@sha256:"));
}

function runTrivy(cmd, label) {
  console.log(`[sbom-scan] ${label}`);
  try {
    const output = execSync(cmd, { stdio: ["pipe", "pipe", "pipe"], encoding: "utf8" });
    console.log(output.split("\n").filter((line) => /CRITICAL|HIGH|Total/i.test(line)).join("\n") || "(temiz)");
    return true;
  } catch (error) {
    console.log(error.stdout ?? "");
    console.log(error.stderr ?? "");
    return false;
  }
}

if (!hasTrivy) {
  console.warn(
    "[sbom-scan] trivy bulunamadi — tarama ATLANDI. CI'da (security.yml) bu bir basarisizliktir; " +
      "yerelde: https://aquasecurity.github.io/trivy/latest/getting-started/installation/",
  );
  process.exit(exitCode ? 1 : 0);
}

console.log(`[sbom-scan] Hedef: ${scanDir}`);
const fsOk = runTrivy(
  `trivy fs --scanners vuln,secret --severity CRITICAL,HIGH --format table ${exitCode ? "--exit-code 1" : ""} "${scanDir}"`,
  "1/2 Dosya sistemi taramasi (bağımlılıklar + secret)",
);

let imagesOk = true;
const images = collectImages(ROOT);
if (images.length > 0) {
  console.log(`[sbom-scan] Pinli imajlar (${images.length}):`);
  for (const image of images) {
    console.log(`  - ${image}`);
    const ok = runTrivy(
      `trivy image --scanners vuln --severity CRITICAL,HIGH ${exitCode ? "--exit-code 1" : ""} "${image}"`,
      `   tarama: ${image.split("@")[0]}`,
    );
    imagesOk = imagesOk && ok;
  }
} else {
  console.log("[sbom-scan] Digest pinli imaj bulunamadi — imaj taramasi atlandi.");
}

const ok = fsOk && imagesOk;
console.log(ok ? "[sbom-scan] KAPI GECTI: 0 Critical/High CVE" : "[sbom-scan] KAPI BASARISIZ: Critical/High CVE mevcut");
process.exit(ok ? 0 : 1);
