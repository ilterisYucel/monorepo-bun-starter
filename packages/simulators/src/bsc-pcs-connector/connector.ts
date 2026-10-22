// BscPcsConnectorAdapter — sanal gateway cihaz (BSC-PCS-CONNECTOR-MIMARISI.md).
// Konteyner device-service'inde simülatör tipi olarak çalışır:
// - in-process: BSC/EMU adapter'larından register okur (adapters haritası),
// - dönüştürür (ratio/offset/bit) ve PCS BMS portuna Modbus TCP ile yazar,
// - kendi izleme register'larını (link/sayaçlar) device-service'e sunar.

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import type { BscPcsMapping } from "./mapping";
import { TcpBmsTarget } from "./tcp-target";
import type { IBmsTarget } from "./tcp-target";
import type { ISourceReader } from "./source-reader";
import { SimulatorServer } from "../server";
import type { SimulatorNetworkConfig } from "../server";
import type { IBatteryPowerInput } from "../bsc/power-input";
import type { IPowerReader } from "./pcs-power-reader";
import { requireDeviceId } from "../contracts";
import type { ISimulator } from "../contracts";

/** BscPcsConnectorAdapter yapılandırması — tek obje (DI kuralı 3). */
export interface BscPcsConnectorAdapterConfig {
  readonly deviceId: string;
  mapping: BscPcsMapping;
  /** Kaynak okuma kanalı — üretimde `TcpSourceReader` (gerçek Modbus TCP). */
  source: ISourceReader;
  /** Test enjeksiyonu — verilmezse mapping.target üzerinden TcpBmsTarget kurulur. */
  target?: IBmsTarget;
  now?: () => number;
  /** Verilirse connector kendi izleme register'larını self-host sunucuda yayınlar. */
  network?: SimulatorNetworkConfig;
  /** Ters kanal (PCS→BSC): S16 okuyucu + BSC güç girdisi (opsiyonel). */
  powerLink?: { reader: IPowerReader; input: IBatteryPowerInput; scale?: number };
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
const REG_POWER_SOURCE = 0x0008; // 0 ok / 1 kısmi / 2 yok

/**
 * BscPcsConnectorAdapter — sözleşme (test: connector.test.ts):
 * - tick: kaynakları okur → dönüşüm → DEĞİŞEN adresleri (intervalMs
 *   kısıtıyla) BMS portuna yazar; kaynak hatası kademeli (diğer eşleşmeler
 *   devam); yazım hatası → link=0 + fail sayacı, sonraki tick yeniden bağlanır.
 * - Bit eşlemeleri hedef register MIRROR'ı üzerinde çalışır (hedef kelimenin
 *   diğer bitleri bozulmaz; bilinmeyen bitler 0).
 * - İzleme register'ları readInputRegister ile okunur; yazma girişimi yok sayılır.
 */
export class BscPcsConnectorAdapter implements IModbusSimulatorAdapter, ISimulator {
  readonly deviceId: string;
  private readonly mapping: BscPcsMapping;
  private readonly source: ISourceReader;
  private readonly target: IBmsTarget;
  private readonly now: () => number;
  private readonly network: SimulatorNetworkConfig | undefined;
  private server: SimulatorServer | undefined;

  private readonly mirror = new Map<number, number>(); // to → son bilinen kelime
  private readonly lastWritten = new Map<number, number>(); // to → son yazılan değer
  private link = 0;
  private sourceStatus = 0;
  private lastWriteAt = 0;
  private writeCount = 0;
  private failCount = 0;
  private powerSourceStatus = 0;
  private readonly powerLink:
    | { reader: IPowerReader; input: IBatteryPowerInput; scale?: number }
    | undefined;
  private connected = false;

  constructor(config: BscPcsConnectorAdapterConfig) {
    this.deviceId = requireDeviceId(config.deviceId);
    this.mapping = config.mapping;
    this.source = config.source;
    this.now = config.now ?? (() => Date.now());
    this.network = config.network;
    this.powerLink = config.powerLink;
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
    // 0. Ters kanal: PCS gücü → BSC (K4); BSC→PCS yazımından bağımsız.
    await this.syncPowerLink();

    // 1. Kaynak okumaları + ayna güncelleme (kademeli bozulma)
    let readFailures = 0;
    for (const entry of this.mapping.mappings) {
      if (entry.kind === "constant") {
        this.applyMirror(entry.to, entry.value);
        continue;
      }
      try {
        if (entry.kind === "computed") {
          // C8: akım limiti = güç limiti ÷ DC gerilim (LGES'te limit register'ı yok).
          const numRaw = await this.source.read(entry.numerator.from);
          let denRaw = await this.source.read(entry.denominator.from);
          if (denRaw === 0 && entry.denominator.from.fallbackAddress !== undefined) {
            denRaw = await this.source.read({
              ...entry.denominator.from,
              address: entry.denominator.from.fallbackAddress,
              fallbackAddress: undefined,
            });
          }
          const denPhysical = denRaw * entry.denominator.scale;
          if (denPhysical !== 0) {
            const physical = (numRaw * entry.numerator.scale) / denPhysical;
            this.applyMirror(entry.to, Math.round(physical * entry.ratio + entry.offset));
          }
          continue;
        }
        if (entry.kind === "socEnergy") {
          // PCS15: B19/B20 = SOC × anma enerji (charge: 1−SOC).
          const socRaw = await this.source.read(entry.soc.from);
          const fraction = Math.min(Math.max(socRaw * entry.soc.scale, 0), 1);
          const energyKwh =
            entry.mode === "charge"
              ? (1 - fraction) * entry.ratedKwh
              : fraction * entry.ratedKwh;
          this.applyMirror(entry.to, Math.round(energyKwh * entry.ratio + entry.offset));
          continue;
        }
        let raw = await this.source.read(entry.from);
        if (entry.kind === "register") {
          // M12: birincil 0 ise (ör. onlayn rack yokken 30059=0) yedek adrese düş.
          if (raw === 0 && entry.from.fallbackAddress !== undefined) {
            raw = await this.source.read({
              ...entry.from,
              address: entry.from.fallbackAddress,
              fallbackAddress: undefined,
            });
          }
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

    // PCS14: BSC kaynağı tümüyle okunamıyorsa (sourceStatus=2) kayıp bitini set et
    // (ör. BMS Status Word bit0 = "BMS no communication"); sağlıklıyken temizle.
    if (this.mapping.lossBit !== undefined) {
      const { to, bit } = this.mapping.lossBit;
      const current = this.mirror.get(to) ?? 0;
      const next = this.sourceStatus === 2 ? current | (1 << bit) : current & ~(1 << bit);
      this.applyMirror(to, next);
    }

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

  /** Komut — hedef + kaynak bağlantılarını kapatır (SimulatorTransport onDisconnect). */
  async closeTarget(): Promise<void> {
    this.connected = false;
    await this.target.close();
    await this.source.close?.();
    await this.powerLink?.reader.close();
  }

  /**
   * Ters kanal senkronizasyonu: PCS toplam gücü BSC girdisine yazılır.
   * Power link yoksa no-op (geriye uyum — FR-2.4).
   */
  private async syncPowerLink(): Promise<void> {
    if (this.powerLink === undefined) return;
    const reading = await this.powerLink.reader.readTotal();
    this.powerSourceStatus =
      reading.available === 0 ? 2 : reading.available < reading.total ? 1 : 0;
    // Demo ölçeği: 2 gerçek PCS, N sanal grubun temsilcisidir (ör. ×9).
    this.powerLink.input.applyPowerKw(reading.totalKw * (this.powerLink.scale ?? 1));
  }

  /** Komut — kendi izleme sunucusunu + tick açar (network yoksa no-op). Idempotent. */
  async start(): Promise<void> {
    if (this.server || this.network === undefined) return;
    this.server = new SimulatorServer({
      adapter: this,
      network: this.network,
      tick: (seconds) => void this.tick(seconds),
    });
    await this.server.start();
  }

  /** Komut — izleme sunucusunu durdurur + kaynak/hedef bağlantılarını kapatır (idempotent). */
  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
    await this.closeTarget();
  }

  /** Sorgu — izleme sunucusu dinlenen port. */
  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
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
      case REG_POWER_SOURCE: return this.powerSourceStatus;
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
