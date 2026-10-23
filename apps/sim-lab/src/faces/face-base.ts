// Kelime/bit bazlı yüz tabanı — modelden adres → değer üreten fonksiyonlarla
// DeviceFace sözleşmesini (lab-server) karşılar.

/** Konsol/izleme amaçlı süreç-içi okumalar (EMS isteği sayılmaz). */
export const internalRead = { active: false };

import { ModbusError, type BitTable, type DeviceFace, type WordTable } from "../modbus/lab-server";

export interface SimpleFaceSpec {
  /** Kelime okuma; undefined → adres tanımsız. */
  word(table: WordTable, addr: number): number | undefined;
  bit?(table: BitTable, addr: number): boolean | undefined;
  /** Kelime yazımı; dönen sayı ≠ 0 ise Modbus exception kodu. */
  writeWord?(addr: number, value: number, fc: 6 | 16): number | void;
  writeBit?(addr: number, value: boolean, fc: 5 | 15): number | void;
  /** Tanımsız adres: true → 0x02, false → 0 döndür. */
  strictAddress: () => boolean;
  /** Yanıt öncesi çağrılır (ör. modelin "son okunma" zamanı). */
  onRequest?: () => void;
}

export function simpleFace(spec: SimpleFaceSpec): DeviceFace {
  return {
    readWords(table, addr, count) {
      spec.onRequest?.();
      const out: number[] = [];
      for (let i = 0; i < count; i++) {
        const v = spec.word(table, addr + i);
        if (v === undefined) {
          if (spec.strictAddress()) throw new ModbusError(2);
          out.push(0);
        } else out.push(v & 0xffff);
      }
      return out;
    },
    readBits(table, addr, count) {
      spec.onRequest?.();
      const out: boolean[] = [];
      for (let i = 0; i < count; i++) {
        const v = spec.bit?.(table, addr + i);
        if (v === undefined) {
          if (spec.strictAddress()) throw new ModbusError(2);
          out.push(false);
        } else out.push(v);
      }
      return out;
    },
    writeWords(addr, values, fc) {
      spec.onRequest?.();
      if (!spec.writeWord) throw new ModbusError(1);
      for (let i = 0; i < values.length; i++) {
        const r = spec.writeWord(addr + i, values[i]! & 0xffff, fc);
        if (typeof r === "number" && r !== 0) throw new ModbusError(r as 1 | 2 | 3 | 4);
      }
    },
    writeBits(addr, values, fc) {
      spec.onRequest?.();
      if (!spec.writeBit) throw new ModbusError(1);
      for (let i = 0; i < values.length; i++) {
        const r = spec.writeBit(addr + i, values[i]!, fc);
        if (typeof r === "number" && r !== 0) throw new ModbusError(r as 1 | 2 | 3 | 4);
      }
    },
  };
}
