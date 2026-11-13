import type { ProfileName } from "../physical/core/profile";
import { EventLog } from "../physical/core/events";
import { profileDefaults, timings } from "../physical/core/profile";
import { bscFace } from "../physical/faces/bsc-face";
import { Bsc } from "../physical/models/bsc";
import type { SimulatorNetworkConfig } from "../server";
import { SimulatorServer } from "../server";
import { BSCSimulatorAdapter } from "./bsc-modbus-adapter";

/**
 * Legacy BSC adaptörü — SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.2
 * (A1 kararı: legacy sınıfın içinde fiziksel modeli sarmalama).
 *
 * **Davranış tek kaynağı fiziksel `Bsc` modelidir**; adaptör yalnız:
 * - config → model kurulumu (raf sayısı, başlangıç SOC/sıcaklık),
 * - legacy modbus yüzü (`readInputRegister` / `writeHoldingRegister` / `tick`) ile
 *   `bscFace` register yüzü arasında köprü,
 * - sanal zaman sayacı (`tick`) ve (isteğe bağlı) kendi modbus sunucusunu sağlar.
 *
 * Purity (SPEC §5.1): burada durum geçişi / komut yorumu YOKTUR — `state`, `ack`,
 * teşhis ve raf mantığı modelde yaşar. `simT` yalnız zaman sayacıdır.
 *
 * Sözleşme:
 * - `readInputRegister`/`readHoldingRegister` her zaman sayı döner; adres yüzde
 *   tanımsızsa `0` (legacy sözleşmesi — istisna fırlatmaz).
 * - `writeHoldingRegister` yüzün `writeWords` yolunu kullanır; geçersiz yazım
 *   legacy davranışıyla sessizce yutulur.
 * - `tick(seconds)` ondalık saniyeyi 1 sn'lik adımlara böler (model `step` 1 sn).
 * - `start()`/`stop()`: yalnız `network` verildiyse kendi Modbus TCP sunucusunu
 *   açar/kapatır (bağımsız ünite); ağ yoksa no-op.
 */
export interface BscLegacyAdaptorConfig {
  deviceId: string;
  rackCount: number;
  initialSocPercent?: number;
  initialTempC?: number;
  /** Kontaktör kapatmada izin verilen raf gerilim sapması (V). */
  closeDeviationV?: number;
  /** Davranış profili — eşdeğerlik bazı `uyumlu` (SPEC A2). */
  profile?: ProfileName;
  /** Verilirse self-host modbus sunucusu açılır. */
  network?: SimulatorNetworkConfig;
}

/** Legacy BSC modbus yüzü (adaptörün sağladığı sözleşme). */
export interface IBscLegacyAdaptor {
  readonly deviceId: string;
  readInputRegister(address: number): number;
  readHoldingRegister(address: number): number;
  writeHoldingRegister(address: number, value: number): void;
  readDiscreteInput(address: number): boolean;
  tick(elapsedSeconds: number): void;
}

export class BscLegacyAdaptor implements IBscLegacyAdaptor {
  readonly deviceId: string;

  private readonly bsc: Bsc;
  private readonly face: ReturnType<typeof bscFace>;
  private readonly network: SimulatorNetworkConfig | undefined;
  private simT = 0;
  private server: SimulatorServer | undefined;
  /** Dış güç girdisi (kW, legacy işareti: negatif = şarj). */
  private powerKw = 0;

  constructor(config: BscLegacyAdaptorConfig) {
    if (config.deviceId.trim().length === 0) throw new Error("BscLegacyAdaptor: deviceId zorunlu");
    if (!Number.isInteger(config.rackCount) || config.rackCount < 1) {
      throw new Error(`BscLegacyAdaptor(${config.deviceId}): rackCount ≥ 1 olmalı`);
    }
    this.deviceId = config.deviceId;
    this.network = config.network;
    const events = new EventLog();
    const realism = profileDefaults(config.profile ?? "uyumlu");
    const R = () => realism;
    const T = () => timings(realism.timing);
    this.bsc = new Bsc(
      {
        id: config.deviceId,
        rackCount: config.rackCount,
        seed: 1,
        initialSoc: config.initialSocPercent ?? 50,
        initialTemp: config.initialTempC ?? 25,
        closeDeviationV: config.closeDeviationV ?? 20,
      },
      events,
      R,
      T,
    );
    this.face = bscFace(this.bsc, R, () => 200, events);
  }

  readInputRegister(address: number): number {
    return this.word("input", address);
  }

  readHoldingRegister(address: number): number {
    return this.word("holding", address);
  }

  writeHoldingRegister(address: number, value: number): void {
    try {
      this.face.writeWords(address, [value], 6);
    } catch {
      /* legacy davranışı: geçersiz yazım sessizce yutulur */
    }
  }

  readDiscreteInput(address: number): boolean {
    try {
      const bits = this.face.readBits("discrete", address, 1) as boolean[];
      return bits[0] ?? false;
    } catch {
      return false;
    }
  }

  /** BSC'de coil yoktur (legacy sözleşmesi). */
  readCoil(_address: number): boolean {
    return false;
  }

  /** BSC'de coil yazımı yoktur — sessiz no-op (legacy sözleşmesi). */
  writeCoil(_address: number, _value: boolean): void {
    /* no-op */
  }

  /**
   * Komut — dış güç girdisi (connector/PCS-BSC linki).
   *
   * Legacy sözleşmesi: **negatif = şarj**, pozitif = deşarj. Fiziksel model
   * DC akım bekler (+ = bataryayı şarj) → işaret çevrilir, akım bara
   * geriliminden türetilir (bara yoksa anma 1320 V).
   */
  applyPowerKw(kw: number): void {
    this.powerKw = Number.isFinite(kw) ? kw : 0;
  }

  /**
   * Senaryo enjeksiyonu (dev/debug) — fiziksel modele **yaklaşık** eşleme:
   * - `soc:<pct>`: tüm rafların SOC'si ayarlanır
   * - `overheat`: R1 paket sensörü 80 °C okur (legacy 80,0 °C hedefi)
   * - `diff_temp`: R1 paket sensörü 127 °C (açık devre — sıcaklık sapması)
   * - `fault` / `nominal`: teşhis zorlama / temizleme
   * Bilinmeyen senaryo → `false`.
   */
  inject(scenario: string): boolean {
    if (scenario.startsWith("soc:")) {
      const pct = Number(scenario.slice(4));
      if (!Number.isFinite(pct)) return false;
      for (const rack of this.bsc.racks) rack.setSoc(Math.min(Math.max(pct, 0), 100));
      return true;
    }
    switch (scenario) {
      case "overheat":
        this.bsc.racks[0]!.inj.tempSensorFault = { pack: 1, value: 80 };
        return true;
      case "diff_temp":
        this.bsc.racks[0]!.inj.tempSensorFault = { pack: 1, value: 127 };
        return true;
      case "fault":
        this.bsc.diag.forced.add("SOCPF");
        return true;
      case "nominal":
        for (const rack of this.bsc.racks) rack.inj.tempSensorFault = null;
        this.bsc.diag.forced.clear();
        return true;
      default:
        return false;
    }
  }

  tick(elapsedSeconds: number): void {
    const steps = Math.max(0, Math.round(elapsedSeconds));
    const voltage = this.bsc.busVoltage > 100 ? this.bsc.busVoltage : 1320;
    const dcCurrent = -(this.powerKw * 1000) / voltage;
    for (let i = 0; i < steps; i++) {
      this.simT += 1;
      this.bsc.step(1, this.simT, dcCurrent);
    }
  }

  /** Komut — self-host sunucu + tick açar (network yoksa no-op). Idempotent. */
  async start(): Promise<void> {
    if (this.server !== undefined || this.network === undefined) return;
    this.server = new SimulatorServer({
      adapter: new BSCSimulatorAdapter(this),
      network: this.network,
      tick: (seconds) => this.tick(seconds),
    });
    await this.server.start();
  }

  /** Komut — sunucu + tick'i durdurur (idempotent). */
  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
  }

  /** Sorgu — dinlenen port (start öncesi config portu). */
  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
  }

  private word(table: "input" | "holding", address: number): number {
    try {
      // bscFace senkron yüz (simpleFace) — sözleşme tipi Promise'a da izin verir.
      const words = this.face.readWords(table, address, 1) as number[];
      return words[0] ?? 0;
    } catch {
      return 0;
    }
  }
}

/** Adaptörü kurar. */
export function createBscLegacyAdaptor(config: BscLegacyAdaptorConfig): BscLegacyAdaptor {
  return new BscLegacyAdaptor(config);
}
