// EMU Simülatörü — istasyon seviyesi (EMU Modbus TCP V0.0.2)

import { INPUT, HOLDING, COIL_STATION_ON_OFF } from "./register-map";

const u32hi = (v: number): number => (v >>> 16) & 0xffff;
const u32lo = (v: number): number => v & 0xffff;
const toInt32 = (v: number): number => (v >= 0x80000000 ? v - 0x100000000 : v);

export class EmuSimulator {
  private readonly pcsCount: number;

  private coilOnOff = 0; // 0: ON, 1: OFF
  private setpointRaw = 0; // a.c. active power int32 ×0.1 kW (+ deşarj, − şarj)
  private activePowerRaw = 0; // ×0.1 kW
  private socRaw = 800; // 80.0% ×10
  private sohRaw = 950; // 95.0% ×10
  private pfRaw = 990; // 0.990 ×1000
  private dcVoltageRaw = 7500; // 750.0V ×10
  private energyChargeAcc = 0; // kWh (kesirli)
  private energyDischargeAcc = 0;
  private totalChargedRaw = 0; // kWh ×10
  private totalDischargedRaw = 0;
  private dailyChargedRaw = 0;
  private dailyDischargedRaw = 0;
  private holding: Map<number, number> = new Map();
  private setpointHi = 0;
  private setpointLo = 0;

  constructor(pcsCount = 3) {
    this.pcsCount = pcsCount;
  }

  tick(elapsedSeconds: number): void {
    const on = this.coilOnOff === 0;
    const setpointKw = toInt32(this.setpointRaw) / 10;

    if (!on) {
      this.activePowerRaw = 0;
      return;
    }

    if (setpointKw !== 0) {
      this.activePowerRaw += Math.round((this.setpointRaw - this.activePowerRaw) * 0.4 * elapsedSeconds);
      const pKw = this.activePowerRaw / 10;
      if (this.activePowerRaw < 0) {
        this.energyChargeAcc += (Math.abs(pKw) * elapsedSeconds) / 3600;
        this.socRaw += Math.round(((Math.abs(pKw) * elapsedSeconds) / 3600) * 10 * 0.01);
      } else {
        this.energyDischargeAcc += (Math.abs(pKw) * elapsedSeconds) / 3600;
        this.socRaw -= Math.round(((Math.abs(pKw) * elapsedSeconds) / 3600) * 10 * 0.01);
      }
      this.totalChargedRaw = Math.round(this.energyChargeAcc * 10);
      this.totalDischargedRaw = Math.round(this.energyDischargeAcc * 10);
      this.dailyChargedRaw = this.totalChargedRaw;
      this.dailyDischargedRaw = this.totalDischargedRaw;
      this.pfRaw = this.activePowerRaw < 0 ? -990 : 990;
      this.socRaw = Math.min(1000, Math.max(100, this.socRaw));
    } else {
      this.activePowerRaw += Math.round((0 - this.activePowerRaw) * 0.6 * elapsedSeconds);
    }
  }

  private stationState(): number {
    if (this.coilOnOff === 1) return 1; // Shutdown
    if (this.activePowerRaw < 0) return 4; // Charging
    if (this.activePowerRaw > 0) return 5; // Discharging
    return 3; // Hot standby
  }

  readInputRegister(address: number): number {
    const running = this.coilOnOff === 0 && this.activePowerRaw !== 0;
    const reactiveRaw = Math.round(this.activePowerRaw * 0.15);
    const apparentRaw = Math.round(Math.abs(this.activePowerRaw));
    const dcCurrentRaw = this.dcVoltageRaw > 0
      ? Math.round((this.activePowerRaw * 1000) / (this.dcVoltageRaw / 10))
      : 0;
    const availChargeRaw = Math.max(0, 7200 - (this.activePowerRaw < 0 ? -this.activePowerRaw : 0));
    const availDischargeRaw = Math.max(0, 7200 - (this.activePowerRaw > 0 ? this.activePowerRaw : 0));

    switch (address) {
      case INPUT.NOMINAL_CAPACITY: return u32hi(7500); // 750 kVA ×10
      case INPUT.NOMINAL_CAPACITY + 1: return u32lo(7500);
      case INPUT.NOMINAL_ENERGY: return u32hi(7410);
      case INPUT.NOMINAL_ENERGY + 1: return u32lo(7410);
      case INPUT.SYSTEM_SOC: return this.socRaw;
      case INPUT.SYSTEM_SOH: return this.sohRaw;
      case INPUT.AVAILABLE_CHARGE_ENERGY: return u32hi(Math.round(this.socRaw * 7.41));
      case INPUT.AVAILABLE_CHARGE_ENERGY + 1: return u32lo(Math.round(this.socRaw * 7.41));
      case INPUT.AVAILABLE_DISCHARGE_ENERGY: return u32hi(Math.round(this.socRaw * 7.41));
      case INPUT.AVAILABLE_DISCHARGE_ENERGY + 1: return u32lo(Math.round(this.socRaw * 7.41));
      case INPUT.AVAILABLE_CHARGE_POWER: return u32hi(availChargeRaw);
      case INPUT.AVAILABLE_CHARGE_POWER + 1: return u32lo(availChargeRaw);
      case INPUT.AVAILABLE_DISCHARGE_POWER: return u32hi(availDischargeRaw);
      case INPUT.AVAILABLE_DISCHARGE_POWER + 1: return u32lo(availDischargeRaw);
      case INPUT.AVAILABLE_INDUCTIVE_REACTIVE: return u32hi(7200);
      case INPUT.AVAILABLE_INDUCTIVE_REACTIVE + 1: return u32lo(7200);
      case INPUT.AVAILABLE_CAPACITIVE_REACTIVE: return u32hi(7200);
      case INPUT.AVAILABLE_CAPACITIVE_REACTIVE + 1: return u32lo(7200);
      case INPUT.STATION_STATE: return this.stationState();
      case INPUT.POWER_FACTOR: return toInt32(this.pfRaw) & 0xffff;
      case INPUT.APPARENT_POWER: return u32hi(toInt32(apparentRaw));
      case INPUT.APPARENT_POWER + 1: return u32lo(toInt32(apparentRaw));
      case INPUT.ACTIVE_POWER: return u32hi(toInt32(this.activePowerRaw));
      case INPUT.ACTIVE_POWER + 1: return u32lo(toInt32(this.activePowerRaw));
      case INPUT.REACTIVE_POWER: return u32hi(toInt32(reactiveRaw));
      case INPUT.REACTIVE_POWER + 1: return u32lo(toInt32(reactiveRaw));
      case INPUT.AC_FREQUENCY: return u32hi(50000);
      case INPUT.AC_FREQUENCY + 1: return u32lo(50000);
      case INPUT.DC_POWER: return u32hi(toInt32(this.activePowerRaw));
      case INPUT.DC_POWER + 1: return u32lo(toInt32(this.activePowerRaw));
      case INPUT.DC_CURRENT: return u32hi(toInt32(dcCurrentRaw));
      case INPUT.DC_CURRENT + 1: return u32lo(toInt32(dcCurrentRaw));
      case INPUT.DC_AVERAGE_VOLTAGE: return u32hi(this.dcVoltageRaw);
      case INPUT.DC_AVERAGE_VOLTAGE + 1: return u32lo(this.dcVoltageRaw);
      case INPUT.DAILY_CHARGED: return u32hi(this.dailyChargedRaw);
      case INPUT.DAILY_CHARGED + 1: return u32lo(this.dailyChargedRaw);
      case INPUT.DAILY_DISCHARGED: return u32hi(this.dailyDischargedRaw);
      case INPUT.DAILY_DISCHARGED + 1: return u32lo(this.dailyDischargedRaw);
      case INPUT.MONTHLY_CHARGED: return u32hi(this.dailyChargedRaw * 30);
      case INPUT.MONTHLY_CHARGED + 1: return u32lo(this.dailyChargedRaw * 30);
      case INPUT.MONTHLY_DISCHARGED: return u32hi(this.dailyDischargedRaw * 30);
      case INPUT.MONTHLY_DISCHARGED + 1: return u32lo(this.dailyDischargedRaw * 30);
      case INPUT.ANNUAL_CHARGED: return u32hi(this.dailyChargedRaw * 365);
      case INPUT.ANNUAL_CHARGED + 1: return u32lo(this.dailyChargedRaw * 365);
      case INPUT.ANNUAL_DISCHARGED: return u32hi(this.dailyDischargedRaw * 365);
      case INPUT.ANNUAL_DISCHARGED + 1: return u32lo(this.dailyDischargedRaw * 365);
      case INPUT.TOTAL_CHARGED: return u32hi(this.totalChargedRaw);
      case INPUT.TOTAL_CHARGED + 1: return u32lo(this.totalChargedRaw);
      case INPUT.TOTAL_DISCHARGED: return u32hi(this.totalDischargedRaw);
      case INPUT.TOTAL_DISCHARGED + 1: return u32lo(this.totalDischargedRaw);
      case INPUT.PCS_COUNT: return this.pcsCount;
      case INPUT.RUNNING_PCS_COUNT: return running ? this.pcsCount : 0;
      case INPUT.WARNING_PCS_COUNT: return 0;
      case INPUT.FAULT_PCS_COUNT: return 0;
      case INPUT.STATUS_WORD_1: return 0b110; // startup allowed, ACB1+ACB2 connected
      case INPUT.STATUS_WORD_1 + 2: return (1 << this.pcsCount) - 1; // PCS1..N RS485 comm
      case INPUT.STATUS_WORD_1 + 4: return (1 << this.pcsCount) - 1; // PCS1..N CAN comm
      default:
        if (address >= INPUT.ALARM_WORD_1 && address <= INPUT.ALARM_WORD_1 + 9) return 0;
        return 0;
    }
  }

  readHoldingRegister(address: number): number {
    return this.holding.get(address) ?? 0;
  }

  writeHoldingRegister(address: number, value: number): void {
    if (address === HOLDING.AC_ACTIVE_POWER_SETPOINT) {
      this.setpointHi = value & 0xffff;
      this.setpointRaw = toInt32((this.setpointHi << 16) | this.setpointLo);
      return;
    }
    if (address === HOLDING.AC_ACTIVE_POWER_SETPOINT + 1) {
      this.setpointLo = value & 0xffff;
      this.setpointRaw = toInt32((this.setpointHi << 16) | this.setpointLo);
      return;
    }
    this.holding.set(address, value & 0xffff);
  }

  readCoil(address: number): boolean {
    if (address === COIL_STATION_ON_OFF) return this.coilOnOff === 1;
    if (address === 2 || address === 3) return true; // ACB'ler bağlı
    return false;
  }

  writeCoil(address: number, value: boolean): void {
    if (address === COIL_STATION_ON_OFF) {
      this.coilOnOff = value ? 1 : 0;
      if (this.coilOnOff === 1) this.activePowerRaw = 0;
    }
  }

  readDiscreteInput(_address: number): boolean {
    return false;
  }
}
