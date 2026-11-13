import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { EventLog } from "../physical/core/events";
import { profileDefaults, timings, type ProfileName } from "../physical/core/profile";
import { hvacFace } from "../physical/faces/misc-faces";
import { Mc90Hvac } from "../physical/models/hvac-mc90";
import type { DeviceFace } from "../physical/modbus/lab-server";
import { SimulatorServer } from "../server";
import type { SimulatorNetworkConfig } from "../server";

/**
 * Legacy HVAC adaptörü — SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.4 (UC-4).
 *
 * **Davranış tek kaynağı fiziksel `Mc90Hvac` modelidir**; adaptör yalnız:
 * - config → model kurulumu (anma soğutma/ısıtma kapasitesi),
 * - legacy yüz (`readHoldingRegister` / `readInputRegister` / `writeHoldingRegister`)
 *   ile `hvacFace` arasında köprü,
 * - `tick(seconds)` → model adımı (zon/dış ortam sıcaklığı) sağlar.
 *
 * Purity (SPEC §5.1): kompresör durumu, histerezis, setpoint doğrulaması modelde.
 *
 * Sözleşme:
 * - Protokol MC90HDNC1R-L: FC03 okuma / FC06-10 yazma; adres yoksa `0`.
 * - `tick` 1 sn'lik adımlara böler; zon ve dış ortam sıcaklığı config'ten gelir
 *   (Plant'ta termal zon bağlantısı aux sinyalleriyle beslenir — K4).
 */
export interface HvacLegacyAdaptorConfig {
  deviceId: string;
  coolingKw?: number;
  heaterKw?: number;
  /** Zon (kabin) hava sıcaklığı (°C) — dönüş havası. */
  zoneTempC?: number;
  /** Dış ortam sıcaklığı (°C). */
  outdoorTempC?: number;
  profile?: ProfileName;
  /** Verilirse self-host modbus sunucusu açılır. */
  network?: SimulatorNetworkConfig;
}

export interface IHvacLegacyAdaptor {
  readonly deviceId: string;
  readHoldingRegister(address: number): number;
  readInputRegister(address: number): number;
  writeHoldingRegister(address: number, value: number): void;
  tick(elapsedSeconds: number): void;
}

export class HvacLegacyAdaptor implements IHvacLegacyAdaptor {
  readonly deviceId: string;

  private readonly hvac: Mc90Hvac;
  private readonly face: DeviceFace;
  private readonly zoneTempC: number;
  private readonly outdoorTempC: number;
  private readonly network: SimulatorNetworkConfig | undefined;
  private simT = 0;
  private server: SimulatorServer | undefined;

  constructor(config: HvacLegacyAdaptorConfig) {
    if (config.deviceId.trim().length === 0) throw new Error("HvacLegacyAdaptor: deviceId zorunlu");
    this.deviceId = config.deviceId;
    this.zoneTempC = config.zoneTempC ?? 25;
    this.outdoorTempC = config.outdoorTempC ?? 20;
    this.network = config.network;
    const events = new EventLog();
    const realism = profileDefaults(config.profile ?? "uyumlu");
    const R = () => realism;
    const T = () => timings(realism.timing);
    this.hvac = new Mc90Hvac(
      {
        id: config.deviceId,
        coolingKw: config.coolingKw ?? 90,
        heaterKw: config.heaterKw ?? 12,
      },
      events,
      R,
      T,
    );
    this.face = hvacFace(this.hvac, R);
  }

  readHoldingRegister(address: number): number {
    return this.word("holding", address);
  }

  readInputRegister(address: number): number {
    return this.word("input", address);
  }

  writeHoldingRegister(address: number, value: number): void {
    try {
      this.face.writeWords(address, [value], 6);
    } catch {
      /* legacy davranışı: geçersiz yazım sessizce yutulur */
    }
  }

  /** Komut — self-host modbus sunucusunu açar (ağ yoksa no-op). Idempotent. */
  async start(): Promise<void> {
    if (this.server !== undefined || this.network === undefined) return;
    const adapter: IModbusSimulatorAdapter = {
      readHoldingRegister: async (a) => this.readHoldingRegister(a),
      readHoldingRegisters: async (a, n) => Array.from({ length: n }, (_, i) => this.readHoldingRegister(a + i)),
      writeHoldingRegister: async (a, v) => this.writeHoldingRegister(a, v),
      writeHoldingRegisters: async (a, values) => values.forEach((v, i) => this.writeHoldingRegister(a + i, v)),
      readInputRegister: async (a) => this.readInputRegister(a),
      readInputRegisters: async (a, n) => Array.from({ length: n }, (_, i) => this.readInputRegister(a + i)),
      readCoil: async () => false,
      readCoils: async () => [],
      writeCoil: async () => undefined,
      writeMultipleCoils: async () => undefined,
      readDiscreteInput: async () => false,
      readDiscreteInputs: async () => [],
    };
    this.server = new SimulatorServer({
      adapter,
      network: this.network,
      tick: (seconds) => this.tick(seconds),
    });
    await this.server.start();
  }

  /** Komut — sunucuyu kapatır (idempotent). */
  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
  }

  /** Sorgu — dinlenen port (start öncesi config portu). */
  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
  }

  tick(elapsedSeconds: number): void {
    const steps = Math.max(0, Math.round(elapsedSeconds));
    for (let i = 0; i < steps; i++) {
      this.simT += 1;
      this.hvac.step(1, this.simT, this.zoneTempC, this.outdoorTempC);
    }
  }

  private word(table: "holding" | "input", address: number): number {
    try {
      // hvacFace tablo ayrımı yapmaz (tek adres uzayı) — tablo yalnız arayüz uyumu.
      const words = this.face.readWords(table, address, 1) as number[];
      return words[0] ?? 0;
    } catch {
      return 0;
    }
  }
}

/** Adaptörü kurar. */
export function createHvacLegacyAdaptor(config: HvacLegacyAdaptorConfig): HvacLegacyAdaptor {
  return new HvacLegacyAdaptor(config);
}
