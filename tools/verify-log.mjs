#!/usr/bin/env bun
/**
 * verify-log.mjs — TamperLogger dosya zinciri doğrulama aracı (T0.9).
 *
 * FileSink çıktısını okur (satır başına JSON LogEvent) ve HMAC + prevHash
 * zincirini doğrular. NIS-2 denetimlerinde tamper kanıtı aracıdır.
 *
 * Kullanım:
 *   bun tools/verify-log.mjs <dosya> [--key <anahtar>] [--key-file <yol>]
 *
 * Anahtar önceliği: --key > --key-file > LOG_SIGNING_KEY > hata (çıkış 2).
 * Çıkış kodu: 0 = zincir geçerli, 1 = ihlal/tamper, 2 = kullanım/anahtar hatası.
 */

import { readFile } from "node:fs/promises";
import { verifyChain } from "../packages/core/src/logging/verify-chain.ts";
import { loadSigningKey } from "../packages/core/src/logging/config.ts";

function usage() {
  console.error(
    "Kullanim: bun tools/verify-log.mjs <dosya> [--key <anahtar>] [--key-file <yol>]",
  );
}

async function resolveKey(args) {
  const keyIdx = args.indexOf("--key");
  if (keyIdx >= 0 && args[keyIdx + 1]) return args[keyIdx + 1];

  const fileIdx = args.indexOf("--key-file");
  if (fileIdx >= 0 && args[fileIdx + 1]) {
    return await loadSigningKey(args[fileIdx + 1]);
  }

  const envKey = process.env.LOG_SIGNING_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  return undefined;
}

const fileArg = process.argv.find(
  (a, i) => i >= 2 && !a.startsWith("--") && process.argv[i - 1] !== "--key" && process.argv[i - 1] !== "--key-file",
);

async function main() {
  if (!fileArg) {
    usage();
    process.exit(2);
  }

  const key = await resolveKey(process.argv.slice(2));
  if (key === undefined) {
    console.error(
      "Imza anahtari yok — --key, --key-file veya LOG_SIGNING_KEY gerekli.",
    );
    usage();
    process.exit(2);
  }

  let raw;
  try {
    raw = await readFile(fileArg, "utf8");
  } catch (err) {
    console.error(`Dosya okunamadi: ${fileArg} (${String(err)})`);
    process.exit(2);
  }

  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const events = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      events.push(JSON.parse(lines[i]));
    } catch {
      console.error(`Satir ${i + 1} gecerli JSON degil — dosya bozuk.`);
      process.exit(1);
    }
  }

  const result = verifyChain(events, key);
  if (result.valid) {
    console.log(
      `[OK] ${fileArg}: ${result.events} olay, ${result.segments} segment — zincir gecerli.`,
    );
    process.exit(0);
  }

  console.error(
    `[TAMPERED] ${fileArg}: ${result.violations.length} ihlal bulundu:`,
  );
  for (const v of result.violations) {
    console.error(`  seq=${v.seq} reason=${v.reason}`);
  }
  process.exit(1);
}

await main();
