/**
 * Eşdeğerlik harness'i — SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.1 UC-1 / FR-1.1.
 *
 * Amaç: **aynı** komut/okuma sekansını iki yüzde (legacy sınıf ↔ fiziksel model yüzü)
 * koşturup register düzeyindeki farkları satır satır listelemek. Harness davranış
 * bilmez: yalnız `read` / `write` / `advance` çağırır ve sonuçları karşılaştırır
 * (purity: SPEC §5.1 — adaptörde/harness'te durum geçişi mantığı yoktur).
 *
 * Sözleşme:
 * - `read` adres desteklenmiyorsa `undefined` döner; fark satırı yine üretilir,
 *   harness DURMAZ (UC-1 Edge Cases).
 * - `advance(seconds)` sanal zamanı ilerletir; tick büyüklüğü tarafa aittir.
 * - Karşılaştırma tam eşitliktir (yuvarlama/tolerans YOK — `uyumlu` profil baz).
 * - Yan etki: yalnız verilen tarafların kendi durumları değişir; dış dünya yok.
 */

/** Modbus kelime tablosu — yüzler aynı adres uzayını farklı tablolarda tutabilir. */
export type EquivalenceTable = "input" | "holding";

/** Karşılaştırılacak yüz — legacy sınıf ya da fiziksel model yüzü. */
export interface EquivalenceSide {
  read(address: number, table?: EquivalenceTable): number | undefined;
  write(address: number, value: number): void;
  advance(seconds: number): void;
}

/** Sekans adımı — saf veri (JSON'a yazılabilir). */
export type SequenceStep =
  | { op: "read"; address: number; table?: EquivalenceTable; note?: string }
  | { op: "write"; address: number; value: number; note?: string }
  | { op: "advance"; seconds: number; note?: string };

/** Tek karşılaştırma satırı. `undefined` → `"-"` olarak raporlanır. */
export interface EquivalenceRow {
  /** Sekans adımı (1 tabanlı). */
  step: number;
  op: SequenceStep["op"];
  address?: number;
  table?: EquivalenceTable;
  legacy: number | "-";
  physical: number | "-";
  diff: boolean;
  note?: string;
}

const show = (v: number | undefined): number | "-" => (v === undefined ? "-" : v);

/**
 * Sekansı iki tarafta koşturur ve adım başına karşılaştırma satırları döner.
 *
 * @param legacy Legacy yüz (ör. `BSCSimulator`)
 * @param physical Fiziksel yüz (ör. `bscFace(...)` sarmalayıcısı)
 * @param steps Sırayla uygulanacak adımlar
 */
export function runEquivalence(
  legacy: EquivalenceSide,
  physical: EquivalenceSide,
  steps: readonly SequenceStep[],
): EquivalenceRow[] {
  const rows: EquivalenceRow[] = [];
  steps.forEach((step, index) => {
    const base = { step: index + 1, op: step.op, note: step.note };
    if (step.op === "advance") {
      legacy.advance(step.seconds);
      physical.advance(step.seconds);
      rows.push({ ...base, legacy: "-", physical: "-", diff: false });
      return;
    }
    if (step.op === "write") {
      legacy.write(step.address, step.value);
      physical.write(step.address, step.value);
      rows.push({ ...base, address: step.address, legacy: "-", physical: "-", diff: false });
      return;
    }
    const table: EquivalenceTable = step.table ?? "holding";
    const l = show(legacy.read(step.address, table));
    const p = show(physical.read(step.address, table));
    rows.push({ ...base, address: step.address, table, legacy: l, physical: p, diff: l !== p });
  });
  return rows;
}

/** Farklı satır sayısı — `uyumlu` profilde beklenen değer 0'dır (SC-2). */
export function diffCount(rows: readonly EquivalenceRow[]): number {
  return rows.filter((r) => r.diff).length;
}

/** KAPANIŞ kanıtı için markdown tablo (yalnız farklar + başlık satırı). */
export function formatReport(rows: readonly EquivalenceRow[], onlyDiff = true): string {
  const body = (onlyDiff ? rows.filter((r) => r.diff) : rows).map(
    (r) =>
      `| ${r.step} | ${r.op} | ${r.address ?? "-"} | ${r.legacy} | ${r.physical} | ${r.diff ? "FARK" : "="} |`,
  );
  return ["| # | op | adres | legacy | fiziksel | |", "| --- | --- | --- | --- | --- | --- |", ...body].join(
    "\n",
  );
}

// ─── sekanslar (saf veri — cihaz modeli import etmez) ───────────────────────

/** BSC — başlat → kontaktör → durdur; ack/durum/raf sayısı/SOC okumaları. */
export const BSC_SEQUENCE: readonly SequenceStep[] = [
  { op: "read", address: 30036, note: "BSC State (başlangıç)" },
  { op: "write", address: 40010, value: 2, note: "START" },
  { op: "advance", seconds: 10 },
  { op: "read", address: 30030, note: "Request Acknowledge" },
  { op: "read", address: 30036, note: "BSC State (Normal)" },
  { op: "write", address: 40010, value: 5, note: "CLOSE CONTACTORS" },
  { op: "advance", seconds: 8 },
  { op: "read", address: 30038, note: "Online rack sayısı" },
  { op: "read", address: 30055, note: "BSC SOC (×100)" },
  { op: "write", address: 40010, value: 3, note: "STOP" },
  { op: "advance", seconds: 2 },
  { op: "read", address: 30036, note: "BSC State (durdurulmuş)" },
];

/** PCS — start → setpoint (şarj negatif) → standby; güç/durum okumaları. */
export const PCS_SEQUENCE: readonly SequenceStep[] = [
  { op: "write", address: 0x0e00, value: 1, note: "Command Source = EMS (S01)" },
  { op: "read", address: 0x2f7d, note: "Operation Status (başlangıç)" },
  { op: "write", address: 0x0e14, value: 1, note: "START" },
  { op: "advance", seconds: 6 },
  { op: "write", address: 0x0e19, value: -50, note: "Active Power Setpoint −50 kW (şarj)" },
  { op: "advance", seconds: 4 },
  { op: "read", address: 0x2f7d, note: "Operation Status (çalışıyor)" },
  { op: "read", address: 0x2f7e, note: "Grid Active Power" },
  { op: "write", address: 0x0e17, value: 1, note: "STANDBY" },
  { op: "advance", seconds: 4 },
  { op: "read", address: 0x2f7d, note: "Operation Status (standby)" },
];

/** HVAC — uzaktan aç → sunucu sıcaklığı yaz → kapat; durum/alarm okumaları. */
export const HVAC_SEQUENCE: readonly SequenceStep[] = [
  { op: "read", address: 0x202, note: "Remote On/Off (başlangıç)" },
  { op: "write", address: 0x202, value: 1, note: "AÇ" },
  { op: "write", address: 0x2000, value: 320, note: "Server Temp Max 32.0 °C" },
  { op: "write", address: 0x2001, value: 250, note: "Server Temp Min 25.0 °C" },
  { op: "advance", seconds: 20 },
  { op: "read", address: 0x202, note: "Remote On/Off (açık)" },
  { op: "read", address: 0x300, table: "input", note: "High Temp alarm" },
  { op: "write", address: 0x202, value: 2, note: "KAPAT" },
  { op: "advance", seconds: 4 },
  { op: "read", address: 0x202, note: "Remote On/Off (kapalı)" },
];
