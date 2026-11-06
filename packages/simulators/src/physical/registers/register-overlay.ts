// Register üstyazımı (override) katmanı — cihaz modelinin ürettiği değerin üzerine,
// arayüzden/seriden verilen değeri Modbus yanıtına basar. Model çalışmaya devam eder;
// yalnız EMS'in gördüğü kelime değişir ("sensör yanlış okuyor / cihaz bu değeri
// raporluyor" senaryosu). Bitfield noktaları maskeli yazılır (aynı kelimedeki diğer
// bitler modelden gelmeye devam eder).
//
// Mutable by design: arayüz/seri oynatıcı tarafından sürülen durum makinesi.

import { ModbusError, type BitTable, type DeviceFace, type WordTable } from "../modbus/lab-server";
import { encodePoint, type RegisterPoint } from "./register-catalog";

export interface OverrideInfo {
  point: string;
  table: RegisterPoint["table"];
  address: number;
  value: number;
  /** Simülasyon saniyesi — bu andan sonra kendiliğinden kalkar (yoksa kalıcı). */
  untilSimT?: number;
  source: string;
  since: number;
}

interface WordMask {
  mask: number;
  bits: number;
}

export class RegisterOverlay {
  private readonly words = new Map<string, WordMask>(); // "holding:123"
  private readonly bitVals = new Map<string, boolean>(); // "discrete:5"
  private readonly infos = new Map<string, { info: OverrideInfo; keys: string[] }>();

  /** Noktaya kalıcı/süreli değer bas. */
  hold(p: RegisterPoint, value: number, source: string, simT: number, durationS?: number): void {
    this.release(p.name);
    const keys: string[] = [];
    if (p.table === "coil" || p.table === "discrete") {
      const k = `${p.table}:${p.address}`;
      this.bitVals.set(k, value !== 0);
      keys.push(k);
    } else if (p.bits) {
      const k = `${p.table}:${p.address}`;
      const width = p.bits.end - p.bits.start + 1;
      const fmask = ((1 << width) - 1) << p.bits.start;
      const cur = this.words.get(k) ?? { mask: 0, bits: 0 };
      cur.mask |= fmask;
      cur.bits = (cur.bits & ~fmask) | ((Math.round(value) << p.bits.start) & fmask);
      this.words.set(k, cur);
      keys.push(`${k}#${fmask}`);
    } else {
      const ws = encodePoint(p, value);
      ws.forEach((w, i) => {
        const k = `${p.table}:${p.address + i}`;
        this.words.set(k, { mask: 0xffff, bits: w });
        keys.push(k);
      });
    }
    const info: OverrideInfo = {
      point: p.name,
      table: p.table,
      address: p.address,
      value,
      source,
      since: simT,
      ...(durationS !== undefined && durationS > 0 ? { untilSimT: simT + durationS } : {}),
    };
    this.infos.set(p.name, { info, keys });
  }

  release(pointName: string): boolean {
    const x = this.infos.get(pointName);
    if (!x) return false;
    for (const k of x.keys) {
      const [base, maskStr] = k.split("#");
      if (base!.startsWith("coil:") || base!.startsWith("discrete:")) this.bitVals.delete(base!);
      else if (maskStr) {
        const cur = this.words.get(base!);
        if (cur) {
          const m = Number(maskStr);
          cur.mask &= ~m;
          cur.bits &= ~m;
          if (cur.mask === 0) this.words.delete(base!);
        }
      } else this.words.delete(base!);
    }
    this.infos.delete(pointName);
    return true;
  }

  releaseAll(): void {
    this.words.clear();
    this.bitVals.clear();
    this.infos.clear();
  }

  /** Süresi dolanları kaldırır. */
  expire(simT: number): string[] {
    const gone: string[] = [];
    for (const [n, x] of this.infos) if (x.info.untilSimT !== undefined && simT >= x.info.untilSimT) gone.push(n);
    for (const n of gone) this.release(n);
    return gone;
  }

  list(): OverrideInfo[] {
    return [...this.infos.values()].map((x) => x.info);
  }

  size(): number {
    return this.infos.size;
  }

  applyWord(table: WordTable, addr: number, v: number): number {
    const m = this.words.get(`${table}:${addr}`);
    return m ? ((v & ~m.mask) | (m.bits & m.mask)) & 0xffff : v;
  }

  /** Model yüzünü sarar: okumalar üstyazımdan geçer, yazmalar modele aynen gider. */
  wrap(face: DeviceFace): DeviceFace {
    const self = this;
    const words = async (table: WordTable, addr: number, count: number): Promise<number[]> => {
      const base = await face.readWords(table, addr, count);
      if (self.infos.size === 0) return base;
      return base.map((v, i) => self.applyWord(table, addr + i, v));
    };
    const bits = async (table: BitTable, addr: number, count: number): Promise<boolean[]> => {
      const base = await face.readBits(table, addr, count);
      if (self.bitVals.size === 0) return base;
      return base.map((v, i) => self.bitVals.get(`${table}:${addr + i}`) ?? v);
    };
    return {
      readWords: (t, a, c) => (self.infos.size === 0 ? face.readWords(t, a, c) : words(t, a, c)),
      readBits: (t, a, c) => (self.bitVals.size === 0 ? face.readBits(t, a, c) : bits(t, a, c)),
      writeWords: (a, v, fc) => face.writeWords(a, v, fc),
      writeBits: (a, v, fc) => face.writeBits(a, v, fc),
    };
  }
}

/** Yazma yolu (EMS gibi): holding/coil noktasına değer yazar — cihaz mantığı tepki verir. */
export async function writeThroughFace(face: DeviceFace, p: RegisterPoint, value: number, currentWord?: number): Promise<void> {
  if (p.table === "coil") return face.writeBits(p.address, [value !== 0], 5);
  if (p.table !== "holding") throw new ModbusError(2, `${p.name} salt okunur (${p.table}) — 'hold' kullanın`);
  if (p.bits) {
    const width = p.bits.end - p.bits.start + 1;
    const m = ((1 << width) - 1) << p.bits.start;
    const w = ((currentWord ?? 0) & ~m) | ((Math.round(value) << p.bits.start) & m);
    return face.writeWords(p.address, [w & 0xffff], 6);
  }
  const ws = encodePoint(p, value);
  return face.writeWords(p.address, ws, ws.length === 1 ? 6 : 16);
}
