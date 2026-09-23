#!/usr/bin/env bun
/**
 * spec-check — SPEC/KAPANIŞ doküman lint'i (AGENTS.md dokümantasyon kapısı).
 *
 * Kullanım:
 *   bun tools/spec-check.mjs docs/architecture/<MODUL>-MIMARISI.md [<daha fazla>]
 *
 * Kontroller (SPEC):
 *   - Zorunlu bölümler (§1 Amaç, §2 Kararlar, §5 Purity, §6 Use Case'ler,
 *     §7 Yaşam Döngüsü, §8 Başarı Kriterleri, §9 Aşama Eşlemesi, §12 T Görev)
 *   - ID benzersizliği (K/B/FR/SC/AK/T/A/UC-x)
 *   - Status enum'u (✏️ Specified · ✅ Approved · 🟡 Geliştirmede ·
 *     🟢 Doğrulanmış · ⛔ Defer)
 *   - AK↔GWT eşleşmesi: AK tablosundaki her kodun GWT bloğunda senaryosu var
 *   - FR→AK eşleşmesi: FR satırlarının Eşleşme hücresinde AK kodu var
 *   - Satır-numarası referans yasağı (`dosya.ts:123` → uyarı)
 * Kontroller (KAPANIŞ):
 *   - Bölümler A.1-A.6 + B.1-B.2 + review_date
 *
 * Legacy doküman (yeni şablonda değil) → uyarı verir, HATA üretmez.
 * Çıkış kodu: hata varsa 1.
 */

import { readFileSync } from "node:fs";

const ALLOWED_STATUS = [
  "✏️ Specified",
  "✅ Approved",
  "🟡 Geliştirmede",
  "🟢 Doğrulanmış",
  "⛔ Defer",
];

const SPEC_REQUIRED_SECTIONS = [
  "## 1. Amaç",
  "## 2. Kararlar",
  "## 5. Purity",
  "## 6. Use Case'ler",
  "## 7. Yaşam",
  "## 8. Başarı Kriterleri",
  "## 9. Aşama Eşlemesi",
  "## 12. T Görev",
];

const KAPANIS_REQUIRED_SECTIONS = [
  "## A. DOĞRULAMA",
  "### A.1 Değişiklik Matrisi",
  "### A.2 Test Kanıtları",
  "### A.3 Kabul Kriteri Kanıtları",
  "### A.4 Sapmalar",
  "### A.5 Gözle Kontrol",
  "### A.6 Genel Durum",
  "## B. TEST KAPSAMI",
  "### B.1 Kapsam Matrisi",
  "### B.2 KAPSANMAYAN",
  "review_date",
];

function uniqueIds(text) {
  const ids = text.match(/\b(?:K|B|FR|SC|AK|T|A|UC)-\d+(?:\.\d+)?\b/g) ?? [];
  const seen = new Map();
  for (const id of ids) {
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

/**
 * ID'lerin TANIM konumları — benzersizlik yalnızca burada aranır
 * (referanslar/çapraz eşleşmeler tekrar sayılmaz).
 * - K/B/SC/AK/FR: tablo satırının ilk hücresinde
 * - T: görev listesi maddesi veya özet tablo satırında
 * - UC: başlıkta
 */
function definedIds(text) {
  const ids = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    const uc = t.match(/^###\s+\d+\.\d+\s+(UC-\d+)\b/);
    if (uc) {
      ids.push(uc[1]);
      continue;
    }
    const tableId = t.match(/^\|\s*\*{0,2}(K|B|SC|AK|FR)-\d+(?:\.\d+)?\*{0,2}\s*\|/);
    if (tableId) {
      const m = t.match(/(K|B|SC|AK|FR)-\d+(?:\.\d+)?/);
      if (m) ids.push(m[0]);
      continue;
    }
    // T kanonik tanımı: §12 T Görev Özeti tablo satırı (UC listeleri referanstır)
    const summary = t.match(/^\|\s*\*{0,2}(T-\d+)\*{0,2}\s*\|/);
    if (summary) ids.push(summary[1]);
  }
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

function tableRowCodes(text, pattern) {
  const rows = text.split("\n").filter((l) => l.trim().startsWith("|") && pattern.test(l));
  const codes = new Set();
  for (const row of rows) {
    const m = row.match(/(AK|FR)-\d+\.\d+/g);
    if (m) for (const c of m) codes.add(c);
  }
  return codes;
}

function checkSpec(file, text, report) {
  const isSpec = /# .+Mimarisi \(SPEC\)/.test(text);
  const isKapanis = /# .+Kapanış/.test(text) || /Kapanış \(Doğrulama/.test(text);

  if (!isSpec && !isKapanis) {
    report.push(["warn", file, "Legacy/şablon dışı doküman — yeni-şablon kontrolleri atlandı"]);
    return;
  }

  const sections = isSpec ? SPEC_REQUIRED_SECTIONS : KAPANIS_REQUIRED_SECTIONS;
  const kind = isSpec ? "SPEC" : "KAPANIŞ";
  for (const s of sections) {
    if (!text.includes(s)) {
      report.push(["error", file, `${kind}: zorunlu bölüm eksik — "${s}"`]);
    }
  }

  for (const id of definedIds(text)) {
    report.push(["error", file, `ID çakışması (tanım): "${id}" birden fazla kez tanımlı`]);
  }

  if (isSpec) {
    const statuses = [...text.matchAll(/\*\*Status:\*\*\s*([^*\n]+)/g)].map((m) => m[1].trim());
    if (statuses.length === 0) {
      report.push(["error", file, "Status satırı yok (UC bloklarında **Status:** zorunlu)"]);
    }
    for (const st of statuses) {
      if (!ALLOWED_STATUS.some((s) => st.startsWith(s))) {
        report.push(["error", file, `Status enum dışı: "${st}"`]);
      }
    }
  }

  if (isSpec) {
    const akCodes = tableRowCodes(text, /^\|\s*AK-\d+\.\d+\s*\|/);
    const gwtCodes = new Set(
      [...text.matchAll(/\*\*(AK-\d+\.\d+)\s*—\s*GIVEN/g)].map((m) => m[1]),
    );
    for (const ak of akCodes) {
      if (!gwtCodes.has(ak)) {
        report.push(["error", file, `GWT senaryosu eksik: "${ak}" (her AK için en az 1 Given/When/Then)`]);
      }
    }

    const frRows = text
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && /FR-\d+\.\d+/.test(l));
    for (const row of frRows) {
      if (!/AK-\d+\.\d+/.test(row)) {
        report.push(["error", file, `FR satırında AK eşleşmesi yok: ${row.trim().slice(0, 80)}…`]);
      }
    }

    // T kapsama: UC görev listelerindeki her T, §12 özetinde tanımlı olmalı
    const summaryTasks = new Set(
      [...text.matchAll(/^\|\s*\*{0,2}(T-\d+)\*{0,2}\s*\|/gm)].map((m) => m[1]),
    );
    const checklistTasks = new Set(
      [...text.matchAll(/^-\s*\[[ xX]\]\s+(T-\d+)\s*:/gm)].map((m) => m[1]),
    );
    for (const tsk of checklistTasks) {
      if (!summaryTasks.has(tsk)) {
        report.push(["error", file, `Görev "${tsk}" UC listesinde var ama §12 T Görev Özeti'nde YOK`]);
      }
    }
  }

  const lineRefs = text.match(/[\w./-]+\.(?:tsx?|jsx?|mjs|md|json):\d+/g) ?? [];
  for (const ref of lineRefs) {
    report.push(["warn", file, `Satır-numarası referansı (bayatlar): "${ref}" → #sembol çapasına çevir`]);
  }
}

const files = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (files.length === 0) {
  console.error("Kullanım: bun tools/spec-check.mjs <dosya...>");
  process.exit(2);
}

const report = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    report.push(["error", file, "Dosya okunamadı"]);
    continue;
  }
  checkSpec(file, text, report);
}

const errors = report.filter(([k]) => k === "error");
const warnings = report.filter(([k]) => k === "warn");

for (const [k, file, msg] of report) {
  console.log(`${k === "error" ? "HATA " : "UYARI"} ${file} — ${msg}`);
}

console.log(`\nspec-check: ${errors.length} hata, ${warnings.length} uyarı (${files.length} dosya)`);
process.exit(errors.length > 0 ? 1 : 0);
