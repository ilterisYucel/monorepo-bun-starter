import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import type { IGridLink } from "../grid-link/bus";
import { EventLog } from "../physical/core/events";
import { profileDefaults, timings, type ProfileName } from "../physical/core/profile";
import { wattoxBmsFace, wattoxEmsFace } from "../physical/faces/wattox-face";
import { BMS_BASE, WattoxPcs } from "../physical/models/pcs-wattox";
import type { DeviceFace } from "../physical/modbus/lab-server";
import { ModbusServerBridge, type SimulatorNetworkConfig } from "../server";
import { SimulatorServer } from "../server";
import { OUTSIDE_BMS_RANGES } from "./bms-face-adapter";

/**
 * Legacy PCS adaptörü — SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.3 (UC-3).
 *
 * **Davranış tek kaynağı fiziksel `WattoxPcs` modelidir**; adaptör yalnız:
 * - config → model kurulumu (anma değerleri, DC bara gerilimi),
 * - legacy EMS yüzü (`readHoldingRegister` / `writeHoldingRegister`) ile
 *   `wattoxEmsFace` arasında köprü,
 * - BMS yüzü (`readBmsRegister` / `writeBmsRegister`) — connector'ın yazdığı blok,
 * - `tick` (model adımı) sağlar.
 *
 * Purity (SPEC §5.1): durum makinesi, işaret konvansiyonu, korumalar modelde.
 *
 * Sözleşme:
 * - EMS yüzü protokol V1.0: okuma FC03 (holding), yazma FC06. Adres yoksa `0`.
 * - `tick(seconds)` 1 sn'lik adımlara böler; **bağımsız ünitede** BMS linki
 *   adaptör tarafından tazelenir (`feedBmsLink: true`) — Plant'ta connector besler.
 * - İşaret konvansiyonu korunur: şarj setpoint'i negatif (ham 16-bit).
 */
export interface PcsLegacyAdaptorConfig {
  deviceId: string;
  ratedKw?: number;
  ratedV?: number;
  ratedA?: number;
  dcMaxA?: number;
  altitudeM?: number;
  /** Barada sabit DC gerilim (V) — bağımsız ünitede BSC yok. */
  dcVoltage?: number;
  /** Bağımsız ünitede BMS linkini adaptör tazeler (Plant'ta false). */
  feedBmsLink?: boolean;
  profile?: ProfileName;
  /** Verilirse EMS yüzü self-host modbus sunucusu açılır. */
  network?: SimulatorNetworkConfig;
  /** Verilirse BMS yüzü (connector hedefi) sunucusu açılır. */
  bmsNetwork?: SimulatorNetworkConfig;
  /** Şebeke yolu bağlantısı — fider enerjisi PCS grid durumuna yansır. */
  gridLink?: IGridLink;
  gridFeeder?: string;
}

export interface IPcsLegacyAdaptor {
  readonly deviceId: string;
  readHoldingRegister(address: number): number;
  writeHoldingRegister(address: number, value: number): void;
  readBmsRegister(address: number): number;
  writeBmsRegister(address: number, value: number): void;
  tick(elapsedSeconds: number): void;
}

export class PcsLegacyAdaptor implements IPcsLegacyAdaptor {
  readonly deviceId: string;

  private readonly pcs: WattoxPcs;
  private readonly ems: DeviceFace;
  private readonly bms: DeviceFace;
  private readonly dcVoltage: number;
  private readonly feedBmsLink: boolean;
  private readonly network: SimulatorNetworkConfig | undefined;
  private readonly bmsNetwork: SimulatorNetworkConfig | undefined;
  private readonly gridLink: IGridLink | undefined;
  private readonly gridFeeder: string | undefined;
  private server: SimulatorServer | undefined;
  private bmsServer: ModbusServerBridge | undefined;

  constructor(config: PcsLegacyAdaptorConfig) {
    if (config.deviceId.trim().length === 0) throw new Error("PcsLegacyAdaptor: deviceId zorunlu");
    this.deviceId = config.deviceId;
    this.dcVoltage = config.dcVoltage ?? 1360;
    this.feedBmsLink = config.feedBmsLink ?? true;
    this.network = config.network;
    this.bmsNetwork = config.bmsNetwork;
    this.gridLink = config.gridLink;
    this.gridFeeder = config.gridFeeder;
    const events = new EventLog();
    const realism = profileDefaults(config.profile ?? "uyumlu");
    const R = () => realism;
    const T = () => timings(realism.timing);
    this.pcs = new WattoxPcs(
      {
        id: config.deviceId,
        ratedKw: config.ratedKw ?? 1725,
        ratedV: config.ratedV ?? 690,
        ratedA: config.ratedA ?? 1443,
        dcMaxA: config.dcMaxA ?? 1807,
        altitudeM: config.altitudeM ?? 0,
      },
      events,
      R,
      T,
    );
    this.ems = wattoxEmsFace(this.pcs, R, events);
    this.bms = wattoxBmsFace(this.pcs);
  }

  readHoldingRegister(address: number): number {
    return this.word(this.ems, "holding", address);
  }

  writeHoldingRegister(address: number, value: number): void {
    try {
      this.ems.writeWords(address, [value], 6);
    } catch {
      /* legacy davranışı: geçersiz yazım sessizce yutulur */
    }
  }

  readBmsRegister(address: number): number {
    return this.word(this.bms, "holding", address);
  }

  writeBmsRegister(address: number, value: number): void {
    if (address < BMS_BASE || address >= BMS_BASE + 0x17) return;
    this.pcs.writeBms(address, value);
  }

  /** Komut — self-host EMS (+BMS) sunucularını açar. Idempotent, ağ yoksa no-op. */
  async start(): Promise<void> {
    if (this.server === undefined && this.network !== undefined) {
      this.server = new SimulatorServer({
        adapter: {
          readHoldingRegister: async (a) => this.readHoldingRegister(a),
          readHoldingRegisters: async (a, n) => Array.from({ length: n }, (_, i) => this.readHoldingRegister(a + i)),
          writeHoldingRegister: async (a, v) => this.writeHoldingRegister(a, v),
          writeHoldingRegisters: async (a, values) => values.forEach((v, i) => this.writeHoldingRegister(a + i, v)),
          readInputRegister: async (a) => this.readHoldingRegister(a),
          readInputRegisters: async (a, n) => Array.from({ length: n }, (_, i) => this.readHoldingRegister(a + i)),
          readCoil: async () => false,
          readCoils: async () => [],
          writeCoil: async () => undefined,
          writeMultipleCoils: async () => undefined,
          readDiscreteInput: async () => false,
          readDiscreteInputs: async () => [],
        } satisfies IModbusSimulatorAdapter,
        network: this.network,
        tick: (seconds) => this.tick(seconds),
      });
      await this.server.start();
    }
    if (this.bmsServer === undefined && this.bmsNetwork !== undefined) {
      const adapter: IModbusSimulatorAdapter = {
        readHoldingRegister: async (a) => this.readBmsRegister(a),
        readHoldingRegisters: async (a, n) => Array.from({ length: n }, (_, i) => this.readBmsRegister(a + i)),
        writeHoldingRegister: async (a, v) => this.writeBmsRegister(a, v),
        writeHoldingRegisters: async (a, values) => values.forEach((v, i) => this.writeBmsRegister(a + i, v)),
        readInputRegister: async (a) => this.readBmsRegister(a),
        readInputRegisters: async (a, n) => Array.from({ length: n }, (_, i) => this.readBmsRegister(a + i)),
        readCoil: async () => false,
        readCoils: async () => [],
        writeCoil: async () => undefined,
        writeMultipleCoils: async () => undefined,
        readDiscreteInput: async () => false,
        readDiscreteInputs: async () => [],
      };
      this.bmsServer = new ModbusServerBridge({
        adapter,
        host: this.bmsNetwork.host ?? "0.0.0.0",
        port: this.bmsNetwork.port,
        writeProtected: { table: "holding", ranges: OUTSIDE_BMS_RANGES },
        readProtected: { table: "holding", ranges: OUTSIDE_BMS_RANGES },
      });
      await this.bmsServer.start();
    }
  }

  /** Komut — sunucuları kapatır (idempotent). */
  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
    await this.bmsServer?.stop();
    this.bmsServer = undefined;
  }

  /** Sorgu — EMS yüzü portu (start öncesi config portu). */
  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
  }

  /** Sorgu — BMS yüzü portu (connector hedefi). */
  bmsPort(): number {
    return this.bmsNetwork?.port ?? 0;
  }

  tick(elapsedSeconds: number): void {
    this.syncGrid();
    const steps = Math.max(0, Math.round(elapsedSeconds));
    for (let i = 0; i < steps; i++) {
      if (this.feedBmsLink) {
        // Connector rolü (bağımsız ünite): şarj/deşarj izinli güç = anma gücü.
        this.pcs.writeBms(BMS_BASE + 0x08, this.pcs.cfg.ratedKw * 10);
        this.pcs.writeBms(BMS_BASE + 0x09, this.pcs.cfg.ratedKw * 10);
      }
      this.pcs.step(1, this.dcVoltage, 0);
    }
  }

  /** Fider enerjisi → PCS şebeke durumu (legacy `syncGridState` karşılığı). */
  private syncGrid(): void {
    if (this.gridLink === undefined || this.gridFeeder === undefined) return;
    const present = this.gridLink.isEnergized(this.gridFeeder);
    this.pcs.grid = { present, vLL: present ? 690 : 0, hz: present ? 50 : 0 };
  }

  private word(face: DeviceFace, table: "holding" | "input", address: number): number {
    try {
      const words = face.readWords(table, address, 1) as number[];
      return words[0] ?? 0;
    } catch {
      return 0;
    }
  }
}

/** Adaptörü kurar. */
export function createPcsLegacyAdaptor(config: PcsLegacyAdaptorConfig): PcsLegacyAdaptor {
  return new PcsLegacyAdaptor(config);
}
