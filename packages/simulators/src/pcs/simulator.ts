// PCS Simülatörü — EMU Modbus TCP V0.0.2 PCS bloğu (n=1, adresler 5000-5299)
// Ayrıntılar: docs/BSC-VERI-ANALIZI.md (PCS bölümü)

import { PCS_BASE, INPUT, HOLDING, COIL_ON_OFF } from "./register-map";

const u32hi = (v: number): number => (v >>> 16) & 0xffff;
const u32lo = (v: number): number => v & 0xffff;
const toInt16 = (v: number): number => (v >= 0x8000 ? v - 0x10000 : v);
const toInt32 = (v: number): number => (v >= 0x80000000 ? v - 0x100000000 : v);

export class PcsSimulator {
  // Raw durum (register değerleri, mühendislik birimleri × scale)
  private coilOnOff = 1; // 0: ON, 1: OFF
  private setpointRaw = 0; // a.c. active power, int16, ×0.1 kW (+ deşarj, − şarj)
  private activePowerRaw = 0; // güncel a.c. active power, ×0.1 kW
  private voltageRaw = 4000; // 400.0 V ×10
  private frequencyRaw = 50000; // 50.000 Hz ×1000
  private dcVoltageRaw = 7500; // 750.0 V ×10
  private igbtTempRaw = 450; // 45.0°C ×10
  private cabinTempRaw = 300; // 30.0°C ×10
  private pfRaw = 990; // 0.990 ×1000
  private energyChargeAcc = 0; // kWh (kesirli, raw'a yuvarlanır)
  private energyDischargeAcc = 0;
  private totalChargeRaw = 0; // kWh ×10
  private totalDischargeRaw = 0;
  private dailyChargeRaw = 0;
  private dailyDischargeRaw = 0;
  private availableChargeRaw = 2400; // 240.0 kW ×10
  private availableDischargeRaw = 2400;

  private holding: Map<number, number> = new Map();

  tick(elapsedSeconds: number): void {
    const on = this.coilOnOff === 0;
    const setpointKw = toInt16(this.setpointRaw) / 10;

    if (!on) {
      this.activePowerRaw = 0;
      return;
    }

    if (setpointKw !== 0) {
      this.activePowerRaw += Math.round((this.setpointRaw - this.activePowerRaw) * 0.4 * elapsedSeconds);
      const pKw = this.activePowerRaw / 10;
      if (this.activePowerRaw < 0) {
        this.energyChargeAcc += (Math.abs(pKw) * elapsedSeconds) / 3600;
      } else {
        this.energyDischargeAcc += (Math.abs(pKw) * elapsedSeconds) / 3600;
      }
      this.totalChargeRaw = Math.round(this.energyChargeAcc * 10);
      this.totalDischargeRaw = Math.round(this.energyDischargeAcc * 10);
      this.dailyChargeRaw = this.totalChargeRaw;
      this.dailyDischargeRaw = this.totalDischargeRaw;
      this.pfRaw = this.activePowerRaw < 0 ? -990 : 990;
      this.availableChargeRaw = Math.max(0, 2400 - (this.activePowerRaw < 0 ? -this.activePowerRaw : 0));
      this.availableDischargeRaw = Math.max(0, 2400 - (this.activePowerRaw > 0 ? this.activePowerRaw : 0));
    } else {
      this.activePowerRaw += Math.round((0 - this.activePowerRaw) * 0.6 * elapsedSeconds);
      this.availableChargeRaw = 2400;
      this.availableDischargeRaw = 2400;
    }

    // IGBT/kabin sıcaklığı güce göre hafif hareket eder
    const load = Math.abs(this.activePowerRaw) / 2400;
    this.igbtTempRaw = Math.round(450 + load * 250 + (Math.sin(Date.now() / 5000) * 10));
    this.cabinTempRaw = Math.round(300 + load * 80 + (Math.sin(Date.now() / 9000) * 5));
  }

  private statusWord1(): number {
    const on = this.coilOnOff === 0;
    const running = on && this.activePowerRaw !== 0;
    const charging = on && this.activePowerRaw < 0;
    const discharging = on && this.activePowerRaw > 0;
    const hotStandby = on && this.activePowerRaw === 0;
    const standby = !on;

    return (
      (running ? 1 << 1 : 0) |
      (standby ? 1 << 5 : 0) |
      (hotStandby ? 1 << 6 : 0) |
      (charging ? 1 << 7 : 0) |
      (discharging ? 1 << 8 : 0)
    );
  }

  readInputRegister(address: number): number {
    const off = address - PCS_BASE;
    const dcCurrentRaw = this.dcVoltageRaw > 0
      ? Math.round((this.activePowerRaw * 1000) / (this.dcVoltageRaw / 10))
      : 0;
    const phaseCurrentRaw = Math.round((Math.abs(this.activePowerRaw / 10) * 1000) / (400 * Math.sqrt(3)) * 10);
    const reactiveRaw = Math.round(this.activePowerRaw * 0.15);
    const apparentRaw = Math.round(Math.abs(this.activePowerRaw));

    switch (off) {
      case INPUT.AC_VOLTAGE_AB: return this.voltageRaw;
      case INPUT.AC_VOLTAGE_BC: return this.voltageRaw;
      case INPUT.AC_VOLTAGE_CA: return this.voltageRaw;
      case INPUT.AC_FREQUENCY: return u32hi(this.frequencyRaw);
      case INPUT.AC_FREQUENCY + 1: return u32lo(this.frequencyRaw);
      case INPUT.PHASE_CURRENT_A: return phaseCurrentRaw;
      case INPUT.PHASE_CURRENT_B: return phaseCurrentRaw;
      case INPUT.PHASE_CURRENT_C: return phaseCurrentRaw;
      case INPUT.AC_ACTIVE_POWER: return u32hi(toInt32(this.activePowerRaw));
      case INPUT.AC_ACTIVE_POWER + 1: return u32lo(toInt32(this.activePowerRaw));
      case INPUT.AC_REACTIVE_POWER: return u32hi(toInt32(reactiveRaw));
      case INPUT.AC_REACTIVE_POWER + 1: return u32lo(toInt32(reactiveRaw));
      case INPUT.AC_APPARENT_POWER: return u32hi(toInt32(apparentRaw));
      case INPUT.AC_APPARENT_POWER + 1: return u32lo(toInt32(apparentRaw));
      case INPUT.POWER_FACTOR: return toInt16(this.pfRaw) & 0xffff;
      case INPUT.DC_VOLTAGE: return this.dcVoltageRaw;
      case INPUT.DC_CURRENT: return toInt16(dcCurrentRaw) & 0xffff;
      case INPUT.DC_POWER: return u32hi(toInt32(this.activePowerRaw));
      case INPUT.DC_POWER + 1: return u32lo(toInt32(this.activePowerRaw));
      case INPUT.IGBT_TEMPERATURE: return toInt16(this.igbtTempRaw) & 0xffff;
      case INPUT.CABIN_TEMPERATURE: return toInt16(this.cabinTempRaw) & 0xffff;
      case INPUT.AVAILABLE_CHARGE_POWER: return this.availableChargeRaw;
      case INPUT.AVAILABLE_DISCHARGE_POWER: return this.availableDischargeRaw;
      case INPUT.AVAILABLE_INDUCTIVE_REACTIVE: return 2400;
      case INPUT.AVAILABLE_CAPACITIVE_REACTIVE: return 2400;
      case INPUT.TOTAL_CHARGE_ENERGY: return u32hi(this.totalChargeRaw);
      case INPUT.TOTAL_CHARGE_ENERGY + 1: return u32lo(this.totalChargeRaw);
      case INPUT.TOTAL_DISCHARGE_ENERGY: return u32hi(this.totalDischargeRaw);
      case INPUT.TOTAL_DISCHARGE_ENERGY + 1: return u32lo(this.totalDischargeRaw);
      case INPUT.DAILY_CHARGE_ENERGY: return u32hi(this.dailyChargeRaw);
      case INPUT.DAILY_CHARGE_ENERGY + 1: return u32lo(this.dailyChargeRaw);
      case INPUT.DAILY_DISCHARGE_ENERGY: return u32hi(this.dailyDischargeRaw);
      case INPUT.DAILY_DISCHARGE_ENERGY + 1: return u32lo(this.dailyDischargeRaw);
      case INPUT.SHUTDOWN_CODE: return 0;
      case INPUT.POWER_ON_BLOCKING_CODE: return 0;
      case INPUT.STATUS_WORD_1: return this.statusWord1();
      default:
        if (off >= INPUT.ALARM_WORD_1 && off <= INPUT.ALARM_WORD_1 + 29) return 0;
        return 0;
    }
  }

  readHoldingRegister(address: number): number {
    return this.holding.get(address - PCS_BASE) ?? 0;
  }

  writeHoldingRegister(address: number, value: number): void {
    const off = address - PCS_BASE;
    if (off === HOLDING.AC_ACTIVE_POWER_SETPOINT) {
      this.setpointRaw = toInt16(value);
      return;
    }
    this.holding.set(off, value & 0xffff);
  }

  readCoil(address: number): boolean {
    if (address === COIL_ON_OFF) return this.coilOnOff === 1;
    return false;
  }

  writeCoil(address: number, value: boolean): void {
    if (address === COIL_ON_OFF) {
      this.coilOnOff = value ? 1 : 0;
      if (this.coilOnOff === 1) {
        this.activePowerRaw = 0;
      }
    }
  }

  readDiscreteInput(_address: number): boolean {
    return false;
  }
}
