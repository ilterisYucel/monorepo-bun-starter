// Register kataloğu — bir cihazın EMS config'indeki (telemetry + bitfieldConfigs)
// her noktayı Modbus konumu ve kodlamasıyla tanımlar. Arayüzdeki "cihaz penceresi",
// toplu değişiklik ve zaman serisi oynatıcı bu katalog üzerinden çalışır; böylece
// kullanıcı register'ı EMS'in gördüğü isim/birim/ölçekle değiştirir, sim ise ham
// kelimeyi doğru byte sırasıyla üretir (packages/core decoder ile birebir).

import type { DeviceConfig, TelemetryEntry } from "../config/device-configs";

export type PointTable = "holding" | "input" | "coil" | "discrete";

export interface RegisterPoint {
  /** Katalog içi benzersiz ad (telemetri adı; bitfield alanı için alan adı). */
  name: string;
  description?: string;
  table: PointTable;
  address: number;
  /** Kapladığı kelime sayısı (bit tablolarında 1). */
  words: number;
  dataType: string;
  scale: number;
  offset: number;
  unit: string;
  byteOrder: string;
  /** Bitfield alanıysa: kelime içindeki bit aralığı. */
  bits?: { start: number; end: number };
  /** EMS bu noktaya yazabilir mi (holding/coil). */
  writable: boolean;
  /** Arayüz gruplaması (ör. "Raf 3", "Fault word", "Ayar"). */
  group: string;
  canonical?: string;
}

const TABLE: Record<string, PointTable> = {
  INPUT_REGISTER: "input",
  HOLDING_REGISTER: "holding",
  COIL: "coil",
  DISCRETE_INPUT: "discrete",
};

export function wordsOfType(dt: string): number {
  const t = dt.toUpperCase();
  if (t.includes("64")) return 4;
  if (t.includes("32") || t === "FLOAT") return 2;
  return 1;
}

function groupOf(name: string, table: PointTable): string {
  const rk = /\bR(\d{1,2})\b/.exec(name) ?? /Rack ?(\d{1,2})\b/i.exec(name);
  if (rk) return `Raf ${rk[1]}`;
  if (/^(Fault|Alarm) W\d|Fault Status Word|Alarm Status Word/i.test(name)) return "Arıza / alarm word";
  if (table === "discrete" || table === "coil") return "Bit tabloları";
  if (table === "holding") return "Holding (4x)";
  return "Input (3x)";
}

export class RegisterCatalog {
  readonly points: RegisterPoint[] = [];
  private readonly byName = new Map<string, RegisterPoint>();

  constructor(cfg: Pick<DeviceConfig, "telemetry" | "bitfieldConfigs">) {
    for (const t of cfg.telemetry) this.add(this.fromTelemetry(t));
    for (const bf of cfg.bitfieldConfigs ?? []) {
      const table = TABLE[bf.registerType] ?? "holding";
      for (const f of bf.fields) {
        this.add({
          name: f.name,
          table,
          address: bf.registerAddress,
          words: 1,
          dataType: "UINT16",
          scale: 1,
          offset: 0,
          unit: "-",
          byteOrder: "BIG_ENDIAN",
          bits: { start: f.bitStart, end: f.bitEnd },
          writable: false,
          group: groupOf(f.name, table) === "Holding (4x)" || groupOf(f.name, table) === "Input (3x)" ? "Bitfield" : groupOf(f.name, table),
        });
      }
    }
  }

  private fromTelemetry(t: TelemetryEntry): RegisterPoint {
    const table = TABLE[t.registerTableType] ?? "holding";
    const isBit = table === "coil" || table === "discrete";
    return {
      name: t.name,
      ...((t as { description?: string }).description ? { description: (t as { description?: string }).description } : {}),
      table,
      address: t.registerAddress,
      words: isBit ? 1 : wordsOfType(t.registerDataType),
      dataType: isBit ? "BOOLEAN" : t.registerDataType.toUpperCase(),
      scale: t.scale ?? 1,
      offset: t.offset ?? 0,
      unit: t.unit ?? "",
      byteOrder: t.byteOrder ?? "BIG_ENDIAN",
      writable: table === "holding" || table === "coil",
      group: groupOf(t.name, table),
      ...(t.canonical ? { canonical: t.canonical } : {}),
    };
  }

  private add(p: RegisterPoint): void {
    let name = p.name;
    for (let i = 2; this.byName.has(name); i++) name = `${p.name} #${i}`;
    const q = { ...p, name };
    this.points.push(q);
    this.byName.set(name, q);
  }

  point(name: string): RegisterPoint | undefined {
    return this.byName.get(name);
  }

  /** Ad, "table:adres" ("holding:3609", "input:30055") veya yalnız sayı (ilk eşleşen). */
  resolve(ref: string | number): RegisterPoint | undefined {
    if (typeof ref === "number") return this.points.find((p) => p.address === ref && !p.bits);
    const byName = this.byName.get(ref);
    if (byName) return byName;
    const m = /^(holding|input|coil|discrete):(0x[0-9a-f]+|\d+)$/i.exec(ref.trim());
    if (m) {
      const addr = Number(m[2]);
      const table = m[1]!.toLowerCase() as PointTable;
      return this.points.find((p) => p.table === table && p.address === addr && !p.bits) ?? adHoc(table, addr);
    }
    if (/^(0x[0-9a-f]+|\d+)$/i.test(ref.trim())) return this.resolve(Number(ref.trim()));
    return undefined;
  }
}

/** Katalogda olmayan adres için ham (UINT16, ölçeksiz) nokta. */
export function adHoc(table: PointTable, address: number): RegisterPoint {
  const isBit = table === "coil" || table === "discrete";
  return { name: `${table}:${address}`, table, address, words: 1, dataType: isBit ? "BOOLEAN" : "UINT16", scale: 1, offset: 0, unit: "", byteOrder: "BIG_ENDIAN", writable: table === "holding" || table === "coil", group: "Ham adres" };
}

// ───────────────────────── kodlama ─────────────────────────

/** Kelime dizisini packages/core decoder'ının byte sırası kurallarına göre düzenler (simetrik). */
function reorder(buf: Buffer, byteOrder: string): void {
  switch (byteOrder) {
    case "LITTLE_ENDIAN":
      buf.reverse();
      break;
    case "BIG_ENDIAN_SWAP":
      for (let i = 0; i + 3 < buf.length; i += 4) {
        const w1 = buf.readUInt16BE(i);
        const w2 = buf.readUInt16BE(i + 2);
        buf.writeUInt16BE(w2, i);
        buf.writeUInt16BE(w1, i + 2);
      }
      break;
    case "LITTLE_ENDIAN_SWAP":
      for (let i = 0; i + 3 < buf.length; i += 4) {
        const b0 = buf[i]!, b1 = buf[i + 1]!, b2 = buf[i + 2]!, b3 = buf[i + 3]!;
        buf[i] = b2;
        buf[i + 1] = b3;
        buf[i + 2] = b0;
        buf[i + 3] = b1;
      }
      break;
    default:
      break;
  }
}

/** Mühendislik değeri → ham kelimeler (EMS decoder'ı aynı değeri okur). */
export function encodePoint(p: RegisterPoint, value: number): number[] {
  const raw = (value - p.offset) / (p.scale || 1);
  const n = p.words;
  const buf = Buffer.alloc(n * 2);
  const t = p.dataType;
  const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  if (t === "INT16") buf.writeInt16BE(clampInt(raw, -32768, 32767), 0);
  else if (t === "UINT32") buf.writeUInt32BE(clampInt(raw, 0, 0xffffffff), 0);
  else if (t === "INT32") buf.writeInt32BE(clampInt(raw, -0x80000000, 0x7fffffff), 0);
  else if (t === "FLOAT32" || t === "FLOAT") buf.writeFloatBE(raw, 0);
  else if (t === "FLOAT64") buf.writeDoubleBE(raw, 0);
  else if (n === 1) buf.writeUInt16BE(clampInt(raw, 0, 0xffff), 0);
  else buf.writeUInt32BE(clampInt(raw, 0, 0xffffffff), 0);
  reorder(buf, p.byteOrder);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(buf.readUInt16BE(i * 2));
  return out;
}

/** Ham kelimeler → mühendislik değeri (bitfield ise alan değeri). */
export function decodePoint(p: RegisterPoint, words: number[]): number {
  if (p.bits) {
    const w = words[0] ?? 0;
    const width = p.bits.end - p.bits.start + 1;
    return (w >> p.bits.start) & ((1 << width) - 1);
  }
  const buf = Buffer.alloc(p.words * 2);
  for (let i = 0; i < p.words; i++) buf.writeUInt16BE((words[i] ?? 0) & 0xffff, i * 2);
  reorder(buf, p.byteOrder);
  const t = p.dataType;
  let raw: number;
  if (t === "INT16") raw = buf.readInt16BE(0);
  else if (t === "UINT32") raw = buf.readUInt32BE(0);
  else if (t === "INT32") raw = buf.readInt32BE(0);
  else if (t === "FLOAT32" || t === "FLOAT") raw = buf.readFloatBE(0);
  else if (t === "FLOAT64") raw = buf.readDoubleBE(0);
  else if (p.words === 2) raw = buf.readUInt32BE(0);
  else raw = buf.readUInt16BE(0);
  return raw * p.scale + p.offset;
}
