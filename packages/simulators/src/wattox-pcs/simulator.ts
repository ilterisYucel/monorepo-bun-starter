// WattoxPcsSimulator — MPCS serisi register-accurate simülatör.
// Kaynak: docs/architecture/PCS-WATTOX-MIMARISI.md §5 + Wattox Modbus V1.0.

import { BmsPortServer } from "./bms-port-server";
import {
  REG_RATED_POWER,
  REG_RATED_VOLTAGE,
  REG_RATED_CURRENT,
  REG_MAX_CHARGE_POWER,
  REG_MAX_DISCHARGE_POWER,
  REG_Q_UPPER,
  REG_Q_LOWER,
  REG_MAX_CHARGE_CURRENT,
  REG_MAX_DISCHARGE_CURRENT,
  REG_OFFGRID_V_UPPER,
  REG_OFFGRID_V_LOWER,
  REG_CONSTV_UPPER,
  REG_CONSTV_LOWER,
  REG_ALLOWABLE_DISCHARGE,
  REG_ALLOWABLE_CHARGE,
  REG_OP_STATUS,
  REG_OP_STATUS_BITS,
  REG_FAULT_STATUS,
  REG_ALARM_STATUS,
  REG_CHARGING_STATUS,
  REG_DISCHARGING_STATUS,
  REG_ASSEMBLY_OPERATING,
  REG_BATTERY_VOLTAGE,
  REG_DC_CURRENT,
  REG_GRID_FREQUENCY,
  REG_DC_POWER,
  REG_POWER_FACTOR,
  REG_UPPER_BUS_V,
  REG_LOWER_BUS_V,
  REG_GRID_ACTIVE_POWER,
  REG_GRID_REACTIVE_POWER,
  REG_APPARENT_POWER,
  REG_GRID_V_AB,
  REG_GRID_V_BC,
  REG_GRID_V_CA,
  REG_PHASE_A_CURRENT,
  REG_PHASE_B_CURRENT,
  REG_PHASE_C_CURRENT,
  REG_INVERTER_V_AB,
  REG_INVERTER_V_BC,
  REG_INVERTER_V_CA,
  REG_DERATED,
  REG_AC_BREAKER,
  REG_AC_PRECHARGE,
  REG_DC_BREAKER_1,
  REG_DC_PRECHARGE_1,
  REG_DC_BREAKER_2,
  REG_DC_PRECHARGE_2,
  REG_ESTOP_BUTTON,
  REG_IGBT_TEMP_A1,
  REG_IGBT_TEMP_B1,
  REG_IGBT_TEMP_C1,
  REG_IGBT_TEMP_A2,
  REG_IGBT_TEMP_B2,
  REG_IGBT_TEMP_C2,
  REG_REACTOR_TEMP_1,
  REG_REACTOR_TEMP_2,
  REG_FILTER_CAP_TEMP,
  REG_CAVITY_TEMP,
  REG_AMBIENT_HUMIDITY,
  REG_AMBIENT_TEMP,
  REG_FUSE_1,
  REG_FUSE_2,
  REG_INSULATION_1,
  REG_INSULATION_2,
  REG_WATER_PUMP,
  REG_FAN_3PH,
  REG_FAN_DC,
  REG_DI_STATUS_1,
  REG_DI_STATUS_2,
  REG_ACC_DISCHARGE_LOW,
  REG_ACC_DISCHARGE_HIGH,
  REG_ACC_CHARGE_LOW,
  REG_ACC_CHARGE_HIGH,
  REG_DAILY_DISCHARGE,
  REG_DAILY_CHARGE,
  BMS_BASE,
  BMS_SIZE,
  FAULT_WORD_1,
  FAULT_WORD_COUNT,
  ALARM_WORD_1,
  ALARM_WORD_COUNT,
  SET_ACTIVE_POWER,
  SET_START,
  SET_STOP,
  SET_STANDBY,
  SET_FAULT_RESET,
  OP_STOP,
  OP_STANDBY,
  OP_CHARGING,
  OP_DISCHARGING,
  OP_FAULT,
} from "./register-map";

/** WattoxPcsSimulator yapılandırması — tek obje (DI kuralı 3). */
export interface WattoxPcsSimulatorConfig {
  ratedPowerKw?: number;
  ratedVoltageV?: number;
  ratedCurrentA?: number;
  /** BMS port sunucu portu (BmsPortServer — Faz 2); verilmezse port açılmaz. */
  bmsPort?: number;
}

const toUint16 = (v: number): number => v & 0xffff;
/** raw 16-bit word → işaretli mühendislik değeri */
const toInt16 = (v: number): number => (v >= 0x8000 ? v - 0x10000 : v);
/** işaretli mühendislik değeri → raw 16-bit word (register arayüzü raw döner) */
const raw16 = (v: number): number => (v < 0 ? v + 0x10000 : v) & 0xffff;

/**
 * WattoxPcsSimulator — durum makinesi:
 * Stop(0) → start → Standby(1) → setpoint (neg=şarj/poz=deşarj) → Charge(2)/
 * Discharge(3); stop → Stop + setpoint 0; standby → Standby; fault word ≠ 0 →
 * Fault(6); fault reset → Standby.
 *
 * Komut yazımları ANINDA uygulanır (validate read-back tick beklemez —
 * AGENTS simülatör kuralı): setpoint yazılınca grid aktif güç birebir
 * setpoint olur.
 *
 * EMS yüzü BMS bloğunu DEĞİŞTİREMEZ (RO); BMS port tarafı (BmsPortServer)
 * `setBmsRegister` ile yazar — gerçek donanımın EMS/BMS link ayrımı.
 */
export class WattoxPcsSimulator {
  private readonly ratedPowerKw: number;
  private readonly ratedVoltageV: number;
  private readonly ratedCurrentA: number;
  readonly bmsPort: number | undefined;

  private opStatus = OP_STOP;
  private setpointRaw = 0; // S16 kW — şarj negatif
  private gridActivePowerRaw = 0; // S16 kW
  private dcCurrentRaw = 0; // S16 A
  private dcPowerRaw = 0; // S16 kW
  private pfRaw = 0; // S16 ×0.001

  private readonly faultWords = new Array<number>(FAULT_WORD_COUNT).fill(0);
  private readonly alarmWords = new Array<number>(ALARM_WORD_COUNT).fill(0);
  private estopBits = 0; // bit0 local, bit1 remote, bit2 BMS
  private doorOpen = false; // DI status 1 bit0

  private readonly bms = new Array<number>(BMS_SIZE).fill(0);
  private readonly settings = new Map<number, number>();

  private chargeEnergyKwh = 0;
  private dischargeEnergyKwh = 0;

  constructor(config: WattoxPcsSimulatorConfig = {}) {
    this.ratedPowerKw = config.ratedPowerKw ?? 1725;
    this.ratedVoltageV = config.ratedVoltageV ?? 1500;
    this.ratedCurrentA = config.ratedCurrentA ?? 1900;
    this.bmsPort = config.bmsPort;
    this.initBms();
    this.initSettings();
  }

  private initBms(): void {
    this.setBms(0x0300, 0); // B01 running status
    this.setBms(0x0301, 0); // B02 status word
    this.setBms(0x0302, 15000); // B03 1500.0 V
    this.setBms(0x0303, 0); // B04 akım
    this.setBms(0x0304, 500); // B05 SOC %50.0
    this.setBms(0x0305, 980); // B06 SOH %98.0
    this.setBms(0x0306, 1200); // B07 120.0 A
    this.setBms(0x0307, 1200); // B08
    this.setBms(0x0308, 17250); // B09 1725.0 kW
    this.setBms(0x0309, 17250); // B10
    this.setBms(0x030a, 550); // B11 %55.0
    this.setBms(0x030b, 480); // B12 %48.0
    this.setBms(0x030c, 250); // B13 25.0°C
    this.setBms(0x030d, 220); // B14 22.0°C
    this.setBms(0x030e, 3650); // B15 3.650 V
    this.setBms(0x030f, 3600); // B16 3.600 V
    this.setBms(0x0310, 15400); // B17 1540.0 V
    this.setBms(0x0311, 13500); // B18 1350.0 V
    this.setBms(0x0312, 35000); // B19 3500.0 kWh
    this.setBms(0x0313, 35000); // B20
    this.setBms(0x0314, 5018); // B21 5.018 MWh
    this.setBms(0x0315, 17250); // B22 SOP 1725.0 kW
    this.setBms(0x0316, 0); // B23 DC sistem durumu
  }

  private initSettings(): void {
    this.settings.set(0x0e00, 0); // S01 komut kaynağı: HMI
    this.settings.set(0x0e01, 0); // S02 on-grid
    this.settings.set(0x0e02, 0); // S03 P-Q
    this.settings.set(0x0e04, 0); // S04 sabit Q
    this.settings.set(0x0e06, 0); // S05
    this.settings.set(0x0e1e, 10000); // S11 güç değişim hızı
    this.settings.set(0x0e20, 50); // S13 off-grid ivme ×0.01 pu/s
    this.settings.set(0x0e23, 4000); // S14 off-grid 400.0 V
    this.settings.set(0x0539, 1); // S28 sıfır güç standby
    this.settings.set(0x1200, 0); // S32 grid-forming kapalı
    this.settings.set(0x1208, 0); // S33
    this.settings.set(0x120a, 3); // S34 0.03 Hz dead zone
    this.settings.set(0x1209, 50); // S35
    this.settings.set(0x120c, 0); // S36
    this.settings.set(0x120e, 0); // S37
    this.settings.set(0x120d, 50); // S38
    this.settings.set(0x1203, 100); // S39
    this.settings.set(0x1204, 200); // S40
    this.settings.set(0x1205, 1200); // S41
  }

  private setBms(address: number, value: number): void {
    this.bms[address - BMS_BASE] = toUint16(value);
  }

  /** BMS port yazımı — yalnızca BMS bloğu aralığında geçerlidir. */
  setBmsRegister(address: number, value: number): void {
    if (address < BMS_BASE || address >= BMS_BASE + BMS_SIZE) {
      throw new Error(
        `[WattoxPcs] BMS blogu disi adres: ${address} (0x${address.toString(16)})`,
      );
    }
    this.setBms(address, value);
  }

  /** Senaryo API'si — fault word bitleri (1-10). */
  setFaultWord(index: number, bits: number): void {
    if (index < 1 || index > FAULT_WORD_COUNT) {
      throw new Error(`[WattoxPcs] fault word indeksi 1-${FAULT_WORD_COUNT}: ${index}`);
    }
    this.faultWords[index - 1] = toUint16(bits);
    if (bits !== 0) this.opStatus = OP_FAULT;
  }

  /** Senaryo API'si — alarm word bitleri (1-8). */
  setAlarmWord(index: number, bits: number): void {
    if (index < 1 || index > ALARM_WORD_COUNT) {
      throw new Error(`[WattoxPcs] alarm word indeksi 1-${ALARM_WORD_COUNT}: ${index}`);
    }
    this.alarmWords[index - 1] = toUint16(bits);
  }

  /** Senaryo API'si — E-stop buton bitleri. */
  setEstop(state: { local: boolean; remote: boolean; bms: boolean }): void {
    this.estopBits =
      (state.local ? 1 << 0 : 0) |
      (state.remote ? 1 << 1 : 0) |
      (state.bms ? 1 << 2 : 0);
  }

  /** Senaryo API'si — kapı durumu (DI status 1 bit0). */
  setDoorOpen(open: boolean): void {
    this.doorOpen = open;
  }

  private bmsServer: import("./bms-port-server").BmsPortServer | undefined;

  /**
   * Komut — BMS port sunucusunu tembel başlatır (bmsPort config'liyse).
   * tick() içinden çağrılır — idempotent.
   */
  ensureBmsServer(): void {
    if (this.bmsPort === undefined || this.bmsServer) return;
    this.bmsServer = new BmsPortServer({ simulator: this, port: this.bmsPort });
    this.bmsServer.start().catch((err: unknown) => {
      console.warn(`[WattoxPcs] BMS port acilamadi: ${String(err)}`);
    });
  }

  /** Komut — BMS port sunucusunu durdurur (device-service shutdown). */
  async stopBmsServer(): Promise<void> {
    await this.bmsServer?.stop();
    this.bmsServer = undefined;
  }

  tick(_elapsedSeconds: number): void {
    this.ensureBmsServer();
    // Kararlı durum: güç setpoint'e yazım anında eşitlendi; tick yalnızca
    // türevsel ölçümleri korur (enerji sayaçları işletim sırasında artar).
    if (this.opStatus === OP_CHARGING) {
      this.chargeEnergyKwh += Math.abs(this.setpointRaw) * (_elapsedSeconds / 3600);
    } else if (this.opStatus === OP_DISCHARGING) {
      this.dischargeEnergyKwh += Math.abs(this.setpointRaw) * (_elapsedSeconds / 3600);
    }
  }

  /** Sorgu — input register değeri (A/B/D uzayı + türevsel hesaplar). */
  readRegister(address: number): number {
    // B — BMS bloğu
    if (address >= BMS_BASE && address < BMS_BASE + BMS_SIZE) {
      return this.bms[address - BMS_BASE]!;
    }
    // D — fault/alarm sözcükleri
    if (address >= FAULT_WORD_1 && address < FAULT_WORD_1 + FAULT_WORD_COUNT) {
      return this.faultWords[address - FAULT_WORD_1]!;
    }
    if (address >= ALARM_WORD_1 && address < ALARM_WORD_1 + ALARM_WORD_COUNT) {
      return this.alarmWords[address - ALARM_WORD_1]!;
    }
    // A — türevsel/hesaplanan register'lar
    switch (address) {
      case REG_RATED_POWER: return this.ratedPowerKw;
      case REG_RATED_VOLTAGE: return this.ratedVoltageV;
      case REG_RATED_CURRENT: return this.ratedCurrentA;
      case REG_MAX_CHARGE_POWER: return raw16(-this.ratedPowerKw);
      case REG_MAX_DISCHARGE_POWER: return this.ratedPowerKw;
      case REG_Q_UPPER: return this.ratedPowerKw;
      case REG_Q_LOWER: return raw16(-this.ratedPowerKw);
      case REG_MAX_CHARGE_CURRENT: return raw16(-this.ratedCurrentA);
      case REG_MAX_DISCHARGE_CURRENT: return this.ratedCurrentA;
      case REG_OFFGRID_V_UPPER: return 11500; // 1150.0 V
      case REG_OFFGRID_V_LOWER: return 9500; // 950.0 V
      case REG_CONSTV_UPPER: return 16000; // 1600.0 V
      case REG_CONSTV_LOWER: return 13000; // 1300.0 V
      case REG_ALLOWABLE_DISCHARGE: return this.ratedPowerKw;
      case REG_ALLOWABLE_CHARGE: return this.ratedPowerKw;
      case REG_OP_STATUS: return this.opStatus;
      case REG_OP_STATUS_BITS: return this.opStatus < 6 ? 1 << this.opStatus : 1 << 6;
      case REG_FAULT_STATUS: return this.faultWords.some((w) => w !== 0) ? 1 : 0;
      case REG_ALARM_STATUS: return this.alarmWords.some((w) => w !== 0) ? 1 : 0;
      case REG_CHARGING_STATUS: return this.opStatus === OP_CHARGING ? 1 : 0;
      case REG_DISCHARGING_STATUS: return this.opStatus === OP_DISCHARGING ? 1 : 0;
      case REG_ASSEMBLY_OPERATING: return this.opStatus !== OP_STOP ? 1 : 0;
      case REG_BATTERY_VOLTAGE: return 15000; // 1500.0 V
      case REG_DC_CURRENT: return raw16(this.dcCurrentRaw);
      case REG_GRID_FREQUENCY: return 5000; // 50.00 Hz
      case REG_DC_POWER: return raw16(this.dcPowerRaw);
      case REG_POWER_FACTOR: return raw16(this.pfRaw);
      case REG_UPPER_BUS_V: return 7500; // 750.0 V
      case REG_LOWER_BUS_V: return 7500;
      case REG_GRID_ACTIVE_POWER: return raw16(this.gridActivePowerRaw);
      case REG_GRID_REACTIVE_POWER: return 0;
      case REG_APPARENT_POWER: return raw16(Math.abs(this.gridActivePowerRaw));
      case REG_GRID_V_AB: return 4000; // 400.0 V
      case REG_GRID_V_BC: return 4000;
      case REG_GRID_V_CA: return 4000;
      case REG_PHASE_A_CURRENT:
      case REG_PHASE_B_CURRENT:
      case REG_PHASE_C_CURRENT:
        return Math.abs(this.gridActivePowerRaw);
      case REG_INVERTER_V_AB: return 4000;
      case REG_INVERTER_V_BC: return 4000;
      case REG_INVERTER_V_CA: return 4000;
      case REG_DERATED: return 0;
      case REG_AC_BREAKER: return this.opStatus === OP_STOP ? 1 : 0;
      case REG_AC_PRECHARGE: return 0;
      case REG_DC_BREAKER_1: return this.opStatus === OP_STOP ? 1 : 0;
      case REG_DC_PRECHARGE_1: return 0;
      case REG_DC_BREAKER_2: return 1;
      case REG_DC_PRECHARGE_2: return 1;
      case REG_ESTOP_BUTTON: return this.estopBits;
      case REG_IGBT_TEMP_A1:
      case REG_IGBT_TEMP_B1:
      case REG_IGBT_TEMP_C1:
      case REG_IGBT_TEMP_A2:
      case REG_IGBT_TEMP_B2:
      case REG_IGBT_TEMP_C2:
        return 450; // 45.0°C
      case REG_REACTOR_TEMP_1:
      case REG_REACTOR_TEMP_2:
        return 500; // 50.0°C
      case REG_FILTER_CAP_TEMP: return 400; // 40.0°C
      case REG_CAVITY_TEMP: return 300; // 30.0°C
      case REG_AMBIENT_HUMIDITY: return 450; // 45.0% RH
      case REG_AMBIENT_TEMP: return 250; // 25.0°C
      case REG_FUSE_1:
      case REG_FUSE_2:
        return 0; // ON
      case REG_INSULATION_1:
      case REG_INSULATION_2:
        return 1000; // 1000 kΩ
      case REG_WATER_PUMP: return 0; // çalışıyor
      case REG_FAN_3PH: return 0; // normal
      case REG_FAN_DC: return 0;
      case REG_DI_STATUS_1:
      case REG_DI_STATUS_2:
        return this.doorOpen ? 1 << 0 : 0;
      case REG_ACC_DISCHARGE_LOW: return Math.round(this.dischargeEnergyKwh) & 0xffff;
      case REG_ACC_DISCHARGE_HIGH: return Math.round(this.dischargeEnergyKwh) >>> 16;
      case REG_ACC_CHARGE_LOW: return Math.round(this.chargeEnergyKwh) & 0xffff;
      case REG_ACC_CHARGE_HIGH: return Math.round(this.chargeEnergyKwh) >>> 16;
      case REG_DAILY_DISCHARGE: return Math.round(this.dischargeEnergyKwh) & 0xffff;
      case REG_DAILY_CHARGE: return Math.round(this.chargeEnergyKwh) & 0xffff;
      default:
        return 0;
    }
  }

  /** Sorgu — holding register (S-setting'leri). */
  readSetting(address: number): number {
    return this.settings.get(address) ?? 0;
  }

  /**
   * Komut — holding register yazımı (EMS yüzü).
   * Komut register'ları ANINDA uygulanır; BMS bloğuna yazım yok sayılır (RO).
   */
  writeSetting(address: number, value: number): void {
    const raw = toUint16(value);

    switch (address) {
      case SET_ACTIVE_POWER: {
        this.setpointRaw = toInt16(raw);
        this.gridActivePowerRaw = this.setpointRaw;
        this.dcPowerRaw = this.setpointRaw;
        this.dcCurrentRaw = this.setpointRaw; // yaklaşım: 1 kW ≈ 1 A (1500 V bus)
        this.pfRaw = this.setpointRaw === 0 ? 0 : this.setpointRaw < 0 ? -990 : 990;
        if (this.opStatus === OP_STANDBY || this.opStatus === OP_CHARGING || this.opStatus === OP_DISCHARGING) {
          if (this.setpointRaw < 0) this.opStatus = OP_CHARGING;
          else if (this.setpointRaw > 0) this.opStatus = OP_DISCHARGING;
          else this.opStatus = OP_STANDBY;
        }
        break;
      }
      case SET_START:
        if (raw === 1 && this.opStatus === OP_STOP) {
          this.opStatus = OP_STANDBY;
        }
        break;
      case SET_STOP:
        if (raw === 1) {
          this.opStatus = OP_STOP;
          this.setpointRaw = 0;
          this.gridActivePowerRaw = 0;
          this.dcPowerRaw = 0;
          this.dcCurrentRaw = 0;
          this.pfRaw = 0;
        }
        break;
      case SET_STANDBY:
        if (raw === 1 && this.opStatus !== OP_FAULT) {
          this.opStatus = OP_STANDBY;
          this.setpointRaw = 0;
          this.gridActivePowerRaw = 0;
          this.dcPowerRaw = 0;
          this.dcCurrentRaw = 0;
          this.pfRaw = 0;
        }
        break;
      case SET_FAULT_RESET:
        if (raw === 1) {
          this.faultWords.fill(0);
          this.alarmWords.fill(0);
          if (this.opStatus === OP_FAULT) this.opStatus = OP_STANDBY;
        }
        break;
      default:
        // BMS bloğu (EMS yüzü) ve bilinmeyen adresler: yazım yok sayılır
        if (address >= BMS_BASE && address < BMS_BASE + BMS_SIZE) return;
        break;
    }

    this.settings.set(address, raw);
  }
}
