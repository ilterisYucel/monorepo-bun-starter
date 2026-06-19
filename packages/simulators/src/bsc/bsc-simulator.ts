import {
  capacityToSocVoltage,
  socToCapacity,
  SYSTEM_CAPACITY_KWH,
  MAX_SOC_PERCENT,
  MIN_SOC_PERCENT,
} from "./bsc-math";

interface RackState {
  id: number;
  storedCapacityKwh: number;
  status: boolean;
}

interface RegisterDef {
  address: number;
  type: "uint16" | "uint32" | "int16" | "sint32" | "float32" | "uint128" | "bit16" | "enum";
  name: string;
  dataTag: string;
  unit: string;
  scale: number;
  offset: number;
  registerType: "IR" | "HR" | "DI";
  bitFields?: { bitStart: number; bitEnd: number; name: string; }[];
}

export interface BSCSimulatorConfig {
  rackCount: number;
  registers: RegisterDef[];
  initialSocPercent?: number;
}

export class BSCSimulator {
  private rackCount: number;
  private config: BSCSimulatorConfig;
  private registers: RegisterDef[];
  private holdingRegisters: Map<number, number> = new Map();
  private inputRegisters: Map<number, number> = new Map();
  private discreteInputs: Map<number, boolean> = new Map();
  private rackStates: Map<number, RackState> = new Map();
  private globalChargeStatus: number = 0;
  private globalPowerKw: number = 0;
  private tickCount: number = 0;

  constructor(config: BSCSimulatorConfig) {
    this.config = config;
    this.rackCount = config.rackCount;
    this.registers = config.registers;
    this.initRegisters();
    this.initRackStates(config.initialSocPercent ?? 50);
  }

  private initRegisters(): void {
    for (const r of this.registers) {
      const map = r.registerType === "HR" ? this.holdingRegisters : this.inputRegisters;
      const regCount = this.registerSize(r.type);
      for (let i = 0; i < regCount; i++) {
        map.set(r.address + i, 0);
      }
    }
  }

  private registerSize(type: string): number {
    switch (type) {
      case "uint16": case "int16": case "bit16": case "enum": return 1;
      case "uint32": case "sint32": case "float32": return 2;
      case "uint128": return 8;
      default: return 1;
    }
  }

  private initRackStates(initialSoc: number): void {
    for (let i = 1; i <= this.rackCount; i++) {
      this.rackStates.set(i, {
        id: i,
        storedCapacityKwh: socToCapacity(initialSoc),
        status: true,
      });
    }
  }

  tick(elapsedSeconds: number): void {
    this.tickCount++;

    if (this.globalChargeStatus === 0) {
      this.updateIdleRacks();
    } else {
      const isCharging = this.globalChargeStatus === 1;
      const power = isCharging ? this.globalPowerKw : -this.globalPowerKw;
      const deltaEnergy = power * (elapsedSeconds / 3600);

      for (const [, state] of this.rackStates) {
        if (!state.status) continue;
        let newCapacity = state.storedCapacityKwh + (deltaEnergy / this.rackCount);

        if (isCharging) {
          newCapacity = Math.min(newCapacity, socToCapacity(MAX_SOC_PERCENT));
        } else {
          newCapacity = Math.max(newCapacity, socToCapacity(MIN_SOC_PERCENT));
        }
        state.storedCapacityKwh = newCapacity;
      }

      const avgSoc = this.computeAverageSoc();
      if ((avgSoc >= MAX_SOC_PERCENT && isCharging) || (avgSoc <= MIN_SOC_PERCENT && !isCharging)) {
        this.globalChargeStatus = 0;
        this.globalPowerKw = 0;
      }
    }

    this.updateSystemRegisters();
    this.updateRackRegisters();
  }

  private updateIdleRacks(): void {
    for (const [, state] of this.rackStates) {
      if (!state.status) continue;
      const selfDischarge = 0.0001 * state.storedCapacityKwh;
      state.storedCapacityKwh = Math.max(
        state.storedCapacityKwh - selfDischarge,
        socToCapacity(MIN_SOC_PERCENT),
      );
    }
  }

  private computeAverageSoc(): number {
    let total = 0;
    let count = 0;
    for (const [, s] of this.rackStates) {
      if (s.status) { total += capacityToSocVoltage(s.storedCapacityKwh).soc; count++; }
    }
    return count > 0 ? total / count : 0;
  }

  private onlineRacks(): number {
    let n = 0;
    for (const [, s] of this.rackStates) { if (s.status) n++; }
    return n;
  }

  private updateSystemRegisters(): void {
    const voltage = 1300 + this.computeAverageSoc() * 2;
    this.setRegister("IR", 30000, this.tickCount);                          // SW version (placeholder)
    this.setRegister("IR", 30005, this.rackCount);                          // Total rack count
    this.setRegister("IR", 30030, 0);                                       // Acknowledge: None
    this.setRegister("IR", 30035, this.tickCount % 65536);                  // Heartbeat
    this.setRegister("IR", 30036, this.globalChargeStatus === 1 ? 1 : this.globalChargeStatus === 2 ? 2 : 0); // BSC State

    const alarmBits = this.globalChargeStatus === 0 ? 0 : 0;
    this.setRegister("IR", 30037, alarmBits);                               // BSC Information
    this.setRegister("IR", 30038, this.onlineRacks());                      // Online racks
    this.setRegister("IR", 30043, 0);                                       // Controller LOC
    this.setRegister("IR", 30055, Math.round(this.computeAverageSoc() * 100)); // System SOC
    this.setRegister("IR", 30056, Math.round(99 * 100));                    // System SOH
    this.setRegister("IR", 30059, Math.round(voltage * 100));               // DC Voltage (x100)

    const avgSoc = this.computeAverageSoc();
    const current = this.globalChargeStatus === 1 ? this.globalPowerKw * 1000 / voltage
      : this.globalChargeStatus === 2 ? -this.globalPowerKw * 1000 / voltage : 0;
    this.setRegister("IR", 30061, Math.round(current * 100));               // DC Current (x100)
    this.setRegister("IR", 30063, 50000);                                   // Charge Power Limit
    this.setRegister("IR", 30065, 50000);                                   // Discharge Power Limit

    this.setRegister("IR", 30100, Math.round(avgSoc * 100));                // Max SOC
    this.setRegister("IR", 30101, Math.round(avgSoc * 100));                // Avg SOC
    this.setRegister("IR", 30102, Math.round(avgSoc * 100));                // Min SOC
    this.setRegister("IR", 30149, 230);                                     // Max Pack Temp (23.0°C x10)
    this.setRegister("IR", 30150, 230);                                     // Avg Pack Temp
    this.setRegister("IR", 30151, 230);                                     // Min Pack Temp
  }

  private updateRackRegisters(): void {
    const base = 30170;
    let idx = 0;
    for (const [, state] of this.rackStates) {
      const { soc, voltage } = capacityToSocVoltage(state.storedCapacityKwh);
      const rackBase = base + idx * 30;
      if (!state.status) { idx++; continue; }

      this.setRegister("IR", rackBase + 0, 0);                              // SW Version placeholder
      this.setRegister("IR", rackBase + 54, Math.round(soc * 100));         // SOC (x100)
      this.setRegister("IR", rackBase + 55, Math.round(99 * 100));          // SOH (x100)
      this.setRegister("IR", rackBase + 60, Math.round(voltage * 100));     // Cell Sum Voltage (x100)
      this.setRegister("IR", rackBase + 62, Math.round((this.globalPowerKw / this.rackCount) * 100)); // Current (x100)
      this.setRegister("IR", rackBase + 85, 230);                           // Max Cell Voltage (x10mV)
      this.setRegister("IR", rackBase + 86, 228);                           // Min Cell Voltage
      this.setRegister("IR", rackBase + 90, 230);                           // Max Pack Temp
      this.setRegister("IR", rackBase + 91, 210);                           // Min Pack Temp
      idx++;
    }
  }

  private setRegister(table: "IR" | "HR", address: number, value: number): void {
    const map = table === "HR" ? this.holdingRegisters : this.inputRegisters;
    const reg = this.registers.find(r => r.address === address);
    if (!reg) return;

    const size = this.registerSize(reg.type);
    if (size === 1) {
      map.set(address, value & 0xFFFF);
    } else if (size === 2) {
      map.set(address, (value >>> 16) & 0xFFFF);
      map.set(address + 1, value & 0xFFFF);
    }
  }

  writeHoldingRegister(address: number, value: number): void {
    this.holdingRegisters.set(address, value);

    if (address === 40000) { /* Heartbeat — no action */ }
    if (address === 40010) {
      // Command Request
      if (value === 0x0002) this.globalChargeStatus = 1;       // Start
      if (value === 0x0003) { this.globalChargeStatus = 0; this.globalPowerKw = 0; } // Stop
      if (value === 0x000A) { this.globalChargeStatus = 0; this.globalPowerKw = 0; } // Reset
    }
  }

  readHoldingRegister(address: number): number {
    return this.holdingRegisters.get(address) ?? 0;
  }

  readInputRegister(address: number): number {
    return this.inputRegisters.get(address) ?? 0;
  }

  readCoil(_address: number): boolean { return false; }
  readDiscreteInput(address: number): boolean {
    return this.discreteInputs.get(address) ?? false;
  }

  writeCoil(_address: number, _value: boolean): void {}
}
