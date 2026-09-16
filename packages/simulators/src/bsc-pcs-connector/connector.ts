// BscPcsConnectorAdapter — sanal gateway cihaz (BSC-PCS-CONNECTOR-MIMARISI.md).
// Konteyner device-service'inde simülatör tipi olarak çalışır:
// - in-process: BSC/EMU adapter'larından register okur (adapters haritası),
// - dönüştürür (ratio/offset/bit) ve PCS BMS portuna Modbus TCP ile yazar,
// - kendi izleme register'larını (link/sayaçlar) device-service'e sunar.

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import type { BscPcsMapping, BscPcsSourceRef } from "./mapping";
import { TcpBmsTarget } from "./tcp-target";
import type { IBmsTarget } from "./tcp-target";

/** BscPcsConnectorAdapter yapılandırması — tek obje (DI kuralı 3). */
export interface BscPcsConnectorAdapterConfig {
  mapping: BscPcsMapping;
  /** deviceId → kaynak simülatör adapter'ı (SimulatorRegistry'den). */
  adapters: ReadonlyMap<string, IModbusSimulatorAdapter>;
  /** Test enjeksiyonu — verilmezse mapping.target üzerinden TcpBmsTarget kurulur. */
  target?: IBmsTarget;
  now?: () => number;
}

/** İzleme register'ları (kendi config telemetrisi bunları okur). */
const REG_LINK = 0x0000; // 0 kopuk / 1 bağlı
const REG_SOURCE = 0x0001; // 0 ok / 1 kısmi / 2 yok
const REG_LAST_WRITE_LOW = 0x0002;
const REG_LAST_WRITE_HIGH = 0x0003;
const REG_WRITE_COUNT_LOW = 0x0004;
const REG_WRITE_COUNT_HIGH = 0x0005;
const REG_FAIL_COUNT_LOW = 0x0006;
const REG_FAIL_COUNT_HIGH = 0x0007;

/**
 * BscPcsConnectorAdapter — sözleşme (test: connector.test.ts):
 * - tick: kaynakları okur → dönüşüm → DEĞİŞEN adresleri (intervalMs
 *   kısıtıyla) BMS portuna yazar; kaynak hatası kademeli (diğer eşleşmeler
 *   devam); yazım hatası → link=0 + fail sayacı, sonraki tick yeniden bağlanır.
 * - Bit eşlemeleri hedef register MIRROR'ı üzerinde çalışır (hedef kelimenin
 *   diğer bitleri bozulmaz; bilinmeyen bitler 0).
 * - İzleme register'ları readInputRegister ile okunur; yazma girişimi yok sayılır.
 */
export class BscPcsConnectorAdapter implements IModbusSimulatorAdapter {
  private readonly mapping: BscPcsMapping;
  private readonly adapters: ReadonlyMap<string, IModbusSimulatorAdapter>;
  private readonly target: IBmsTarget;
  private readonly now: () => number;

  private readonly mirror = new Map<number, number>(); // to → son bilinen kelime
  private readonly lastWritten = new Map<number, number>(); // to → son yazılan değer
  private link = 0;
  private sourceStatus = 0;
  private lastWriteAt = 0;
  private writeCount = 0;
  private failCount = 0;
  private connected = false;

  constructor(config: BscPcsConnectorAdapterConfig) {
    this.mapping = config.mapping;
    this.adapters = config.adapters;
    this.now = config.now ?? (() => Date.now());
    if (config.target) {
      this.target = config.target;
    } else {
      this.target = new TcpBmsTarget(
        config.mapping.target.host,
        config.mapping.target.port,
      );
    }
  }

  /** Komut — kaynakları okur, dönüştürür, değişenleri BMS portuna yazar. */
  async tick(_elapsedSeconds: number): Promise<void> {
    // 1. Kaynak okumaları + ayna güncelleme (kademeli bozulma)
    let readFailures = 0;
    for (const entry of this.mapping.mappings) {
      if (entry.kind === "constant") {
        this.applyMirror(entry.to, entry.value);
        continue;
      }
      const adapter = this.adapters.get(entry.from.deviceId);
      if (!adapter) {
        readFailures++;
        continue;
      }
      try {
        const raw = await this.readSource(entry.from);
        if (entry.kind === "register") {
          const transformed = Math.round(raw * entry.ratio + entry.offset);
          this.applyMirror(entry.to, transformed);
        } else {
          const sourceBit = (raw >> entry.from.bit) & 1;
          const current = this.mirror.get(entry.to) ?? 0;
          const next =
            sourceBit === 1
              ? current | (1 << entry.bit)
              : current & ~(1 << entry.bit);
          this.applyMirror(entry.to, next);
        }
      } catch {
        readFailures++;
      }
    }
    this.sourceStatus =
      readFailures === this.mapping.mappings.length ? 2 : readFailures > 0 ? 1 : 0;

    // 2. Değişen adresleri topla
    const dirty: Array<{ address: number; value: number }> = [];
    for (const [address, value] of this.mirror) {
      if (this.lastWritten.get(address) !== value) {
        dirty.push({ address, value });
      }
    }
    if (dirty.length === 0) return;

    // 3. intervalMs kısıtı
    const now = this.now();
    if (now - this.lastWriteAt < this.mapping.intervalMs) return;

    // 4. Yazım — kirli adresler BİTİŞİK KOŞULARA bölünür (aralıklı adresler
    //    tek FC 0x10'da kayma üretir).
    try {
      if (!this.connected) {
        await this.target.connect();
        this.connected = true;
      }
      const sorted = dirty.sort((a, b) => a.address - b.address);
      const runs: Array<{ start: number; values: number[] }> = [];
      for (const d of sorted) {
        const last = runs[runs.length - 1];
        if (last && last.start + last.values.length === d.address) {
          last.values.push(d.value & 0xffff);
        } else {
          runs.push({ start: d.address, values: [d.value & 0xffff] });
        }
      }
      for (const run of runs) {
        await this.target.writeRegisters(run.start, run.values);
      }
      for (const d of sorted) {
        this.lastWritten.set(d.address, d.value);
      }
      this.link = 1;
      this.lastWriteAt = now;
      this.writeCount++;
    } catch {
      this.link = 0;
      this.connected = false;
      this.failCount++;
    }
  }

  /** Komut — hedef bağlantısını kapatır (SimulatorTransport onDisconnect). */
  async closeTarget(): Promise<void> {
    this.connected = false;
    await this.target.close();
  }

  /** Kaynak register değerini okur — size>1 ise big-endian kelime birleştirir. */
  private async readSource(from: BscPcsSourceRef): Promise<number> {
    const adapter = this.adapters.get(from.deviceId);
    if (!adapter) {
      throw new Error(`Kaynak adapter yok: ${from.deviceId}`);
    }
    const size = from.size ?? 1;
    if (size === 1) {
      return from.table === "input"
        ? adapter.readInputRegister(from.address)
        : adapter.readHoldingRegister(from.address);
    }
    const words =
      from.table === "input"
        ? await adapter.readInputRegisters(from.address, size)
        : await adapter.readHoldingRegisters(from.address, size);
    let value = 0;
    for (const word of words) {
      value = value * 0x10000 + (word & 0xffff);
    }
    if (from.signed && value >= 2 ** (16 * size - 1)) {
      value -= 2 ** (16 * size);
    }
    return value;
  }

  private applyMirror(address: number, value: number): void {
    this.mirror.set(address, value & 0xffff);
  }

  async readInputRegister(address: number): Promise<number> {
    switch (address) {
      case REG_LINK: return this.link;
      case REG_SOURCE: return this.sourceStatus;
      case REG_LAST_WRITE_LOW: return this.lastWriteAt & 0xffff;
      case REG_LAST_WRITE_HIGH: return this.lastWriteAt >>> 16;
      case REG_WRITE_COUNT_LOW: return this.writeCount & 0xffff;
      case REG_WRITE_COUNT_HIGH: return this.writeCount >>> 16;
      case REG_FAIL_COUNT_LOW: return this.failCount & 0xffff;
      case REG_FAIL_COUNT_HIGH: return this.failCount >>> 16;
      default: return 0;
    }
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.readInputRegister(address + i));
    }
    return values;
  }

  async readHoldingRegister(_address: number): Promise<number> {
    return 0;
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    return new Array<number>(count).fill(0);
  }

  async writeHoldingRegister(_address: number, _value: number): Promise<void> {
    // connector komut kabul etmez
  }

  async writeHoldingRegisters(_address: number, _values: number[]): Promise<void> {
    // connector komut kabul etmez
  }

  async readCoil(_address: number): Promise<boolean> {
    return false;
  }

  async readCoils(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }

  async writeCoil(_address: number, _value: boolean): Promise<void> {
    // coil yok
  }

  async writeMultipleCoils(_address: number, _values: boolean[]): Promise<void> {
    // coil yok
  }

  async readDiscreteInput(_address: number): Promise<boolean> {
    return false;
  }

  async readDiscreteInputs(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }
}
