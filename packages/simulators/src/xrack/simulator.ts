import { HOLDING_REGISTERS, INPUT_REGISTERS, COILS } from "./register-map";
import {
  capacityToSocVoltage,
  socToCapacity,
  MAX_USABLE_CAPACITY_KWH,
  SYSTEM_CAPACITY_KWH,
  MAX_SOC_PERCENT,
  MIN_SOC_PERCENT,
} from "./math";

export interface TickData {
  timestamp: number;
  holdingRegisters: Map<number, number>;
  inputRegisters: Map<number, number>;
  coils: Map<number, boolean>;
}

export class XRackSimulator {
  private rackCount: number;
  private holdingRegisters: Map<number, number> = new Map();
  private inputRegisters: Map<number, number> = new Map();
  private coils: Map<number, boolean> = new Map();

  private history: TickData[] = [];
  private maxHistorySize: number = 5;

  private rackStates: Map<
    number,
    {
      storedCapacityKwh: number;
      status: boolean;
      id: number;
    }
  > = new Map();

  private globalChargeStatus: number = 0;

  constructor(rackCount: number = 16) {
    this.rackCount = rackCount;
    this.initRegisters();
    this.initRackStates();
  }

  private initRegisters(): void {
    // Holding Register'lar
    for (let i = 0; i < this.rackCount; i++) {
      // Voltage
      this.holdingRegisters.set(HOLDING_REGISTERS.VOLTAGE_START + i * 2, 0);
      this.holdingRegisters.set(HOLDING_REGISTERS.VOLTAGE_START + i * 2 + 1, 0);

      // Current
      this.holdingRegisters.set(HOLDING_REGISTERS.CURRENT_START + i * 2, 0);
      this.holdingRegisters.set(HOLDING_REGISTERS.CURRENT_START + i * 2 + 1, 0);

      // SoC
      this.holdingRegisters.set(HOLDING_REGISTERS.SOC_START + i * 2, 0);
      this.holdingRegisters.set(HOLDING_REGISTERS.SOC_START + i * 2 + 1, 0);

      // Status (1 register)
      this.holdingRegisters.set(HOLDING_REGISTERS.STATUS_START + i, 1);

      // Power
      this.holdingRegisters.set(HOLDING_REGISTERS.POWER_START + i * 2, 5000); // 50 kW
      this.holdingRegisters.set(HOLDING_REGISTERS.POWER_START + i * 2 + 1, 0);
    }

    this.holdingRegisters.set(HOLDING_REGISTERS.CHARGE_STATUS, 0);

    // 🔥 Input Register'lar (FLOAT32 = 2 register)
    for (let i = 0; i < this.rackCount; i++) {
      // Temperature (23.0°C * 10 = 230, scale 0.1)
      const tempValue = 23.0 * 10; // 230
      const tempBuffer = Buffer.alloc(4);
      tempBuffer.writeFloatBE(tempValue, 0);
      this.inputRegisters.set(
        INPUT_REGISTERS.TEMPERATURE_START + i * 2,
        tempBuffer.readUInt16BE(0),
      );
      this.inputRegisters.set(
        INPUT_REGISTERS.TEMPERATURE_START + i * 2 + 1,
        tempBuffer.readUInt16BE(2),
      );

      // SoH (99.0% * 100 = 9900, scale 0.01? Config'te scale 0.1)
      // Config'te scale: 0.1 olduğu için register'da 10 ile çarp: 99 * 10 = 990
      const sohValue = 99.0 * 10; // 990
      const sohBuffer = Buffer.alloc(4);
      sohBuffer.writeFloatBE(sohValue, 0);
      this.inputRegisters.set(
        INPUT_REGISTERS.SOH_START + i * 2,
        sohBuffer.readUInt16BE(0),
      );
      this.inputRegisters.set(
        INPUT_REGISTERS.SOH_START + i * 2 + 1,
        sohBuffer.readUInt16BE(2),
      );
    }

    this.coils.set(COILS.RESET, false);
    this.coils.set(COILS.EMERGENCY_STOP, false);

    this.holdingRegisters.set(HOLDING_REGISTERS.GLOBAL_POWER_START, 0);
    this.holdingRegisters.set(HOLDING_REGISTERS.GLOBAL_POWER_START + 1, 0);
  }

  private getGlobalPowerKw(): number {
    const highWord =
      this.holdingRegisters.get(HOLDING_REGISTERS.GLOBAL_POWER_START) ?? 0;
    const lowWord =
      this.holdingRegisters.get(HOLDING_REGISTERS.GLOBAL_POWER_START + 1) ?? 0;

    // İki 16-bit register'ı birleştirerek 32-bit float yap
    const buffer = Buffer.alloc(4);
    buffer.writeUInt16BE(highWord, 0);
    buffer.writeUInt16BE(lowWord, 2);

    const floatValue = buffer.readFloatBE(0);
    return floatValue / 100; // scale 0.01
  }

  private setGlobalPowerRegister(powerKw: number): void {
    const scaledValue = Math.round(powerKw * 100); // Örn: 50 * 100 = 5000
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(scaledValue, 0); // 5000'i FLOAT32 olarak yaz

    const highWord = buffer.readUInt16BE(0);
    const lowWord = buffer.readUInt16BE(2);

    this.holdingRegisters.set(HOLDING_REGISTERS.GLOBAL_POWER_START, highWord);
    this.holdingRegisters.set(
      HOLDING_REGISTERS.GLOBAL_POWER_START + 1,
      lowWord,
    );
  }

  private initRackStates(): void {
    for (let i = 1; i <= this.rackCount; i++) {
      const initialCapacity = socToCapacity(MIN_SOC_PERCENT);
      this.rackStates.set(i, {
        id: i,
        storedCapacityKwh: initialCapacity,
        status: true,
      });
    }
  }

  tick(elapsedSeconds: number): TickData {
    this.processCoils();

    // console.log(`[TICK] globalChargeStatus = ${this.globalChargeStatus}`);

    const globalPowerKw = this.getGlobalPowerKw();

    for (let i = 1; i <= this.rackCount; i++) {
      const state = this.rackStates.get(i)!;
      this.updateRackState(
        state,
        this.globalChargeStatus,
        globalPowerKw,
        elapsedSeconds,
      );
      this.updateRegistersFromState(i, state);
      this.setPowerRegister(i, globalPowerKw);
    }

    const tickData: TickData = {
      timestamp: Date.now(),
      holdingRegisters: new Map(this.holdingRegisters),
      inputRegisters: new Map(this.inputRegisters),
      coils: new Map(this.coils),
    };

    this.history.push(tickData);
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    return tickData;
  }

  private updateRackState(
    state: any,
    chargeStatus: number,
    powerKw: number,
    elapsedSeconds: number,
  ): void {
    if (!state.status) return;
    if (chargeStatus === 0) return;

    const isCharging = chargeStatus === 1;
    const power = isCharging ? powerKw : -powerKw;
    const deltaEnergy = power * (elapsedSeconds / 60.0);

    let newCapacity = state.storedCapacityKwh + deltaEnergy;

    if (isCharging) {
      newCapacity = Math.min(
        newCapacity,
        MAX_USABLE_CAPACITY_KWH,
        SYSTEM_CAPACITY_KWH,
      );
    } else {
      const minCapacity = socToCapacity(MIN_SOC_PERCENT);
      newCapacity = Math.max(newCapacity, minCapacity);
    }

    state.storedCapacityKwh = newCapacity;

    const { soc: currentSoc } = capacityToSocVoltage(newCapacity);

    if (
      (currentSoc >= MAX_SOC_PERCENT && isCharging) ||
      (currentSoc <= MIN_SOC_PERCENT && !isCharging)
    ) {
      this.globalChargeStatus = 0;
      this.holdingRegisters.set(HOLDING_REGISTERS.CHARGE_STATUS, 0);
      this.setGlobalPowerRegister(0);
    }
  }
  private updateRegistersFromState(rackId: number, state: any): void {
    const { soc, voltage } = capacityToSocVoltage(state.storedCapacityKwh);
    const powerKw = this.getGlobalPowerKw();

    let current = 0;
    if (this.globalChargeStatus === 1 && voltage > 0) {
      current = (powerKw * 1000) / voltage;
    } else if (this.globalChargeStatus === 2 && voltage > 0) {
      current = -(powerKw * 1000) / voltage;
    }

    const addrOffset = (rackId - 1) * 2;

    // 🔥 Voltage (FLOAT32) - scale: 0.1, register'da 10 ile çarp
    const voltageValue = voltage * 10;
    const voltageBuffer = Buffer.alloc(4);
    voltageBuffer.writeFloatBE(voltageValue, 0);
    this.holdingRegisters.set(
      HOLDING_REGISTERS.VOLTAGE_START + addrOffset,
      voltageBuffer.readUInt16BE(0),
    );
    this.holdingRegisters.set(
      HOLDING_REGISTERS.VOLTAGE_START + addrOffset + 1,
      voltageBuffer.readUInt16BE(2),
    );

    // 🔥 Current (FLOAT32) - scale: 0.01, register'da 100 ile çarp
    const currentValue = Math.abs(current) * 100;
    const currentBuffer = Buffer.alloc(4);
    currentBuffer.writeFloatBE(currentValue, 0);
    this.holdingRegisters.set(
      HOLDING_REGISTERS.CURRENT_START + addrOffset,
      currentBuffer.readUInt16BE(0),
    );
    this.holdingRegisters.set(
      HOLDING_REGISTERS.CURRENT_START + addrOffset + 1,
      currentBuffer.readUInt16BE(2),
    );

    // 🔥 SoC (FLOAT32) - scale: 0.1, register'da 10 ile çarp
    const socValue = Math.round(soc * 10);
    const socBuffer = Buffer.alloc(4);
    socBuffer.writeFloatBE(socValue, 0);
    this.holdingRegisters.set(
      HOLDING_REGISTERS.SOC_START + addrOffset,
      socBuffer.readUInt16BE(0),
    );
    this.holdingRegisters.set(
      HOLDING_REGISTERS.SOC_START + addrOffset + 1,
      socBuffer.readUInt16BE(2),
    );

    // Status (UINT16 - scale: 1)
    this.holdingRegisters.set(
      HOLDING_REGISTERS.STATUS_START + rackId - 1,
      state.status ? 1 : 0,
    );
  }

  private getPowerKwFromRegister(rackId: number): number {
    const rawPower =
      this.holdingRegisters.get(
        HOLDING_REGISTERS.POWER_START + (rackId - 1) * 2,
      ) ?? 5000;
    return rawPower / 100;
  }

  private setPowerRegister(rackId: number, valueKw: number): void {
    const addrOffset = (rackId - 1) * 2;
    const value = Math.round(valueKw * 100);
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0);
    this.holdingRegisters.set(
      HOLDING_REGISTERS.POWER_START + addrOffset,
      buffer.readUInt16BE(0),
    );
    this.holdingRegisters.set(
      HOLDING_REGISTERS.POWER_START + addrOffset + 1,
      buffer.readUInt16BE(2),
    );
  }

  private processCoils(): void {
    const reset = this.coils.get(COILS.RESET);
    if (reset) {
      this.resetSimulator();
      this.coils.set(COILS.RESET, false);
    }

    const emergencyStop = this.coils.get(COILS.EMERGENCY_STOP);
    if (emergencyStop) {
      this.emergencyStop();
      this.coils.set(COILS.EMERGENCY_STOP, false);
    }
  }

  private resetSimulator(): void {
    this.initRegisters();
    this.initRackStates();
    this.globalChargeStatus = 0;
  }

  private emergencyStop(): void {
    this.globalChargeStatus = 0;
    this.holdingRegisters.set(HOLDING_REGISTERS.CHARGE_STATUS, 0);
    this.setGlobalPowerRegister(0);
  }

  readHoldingRegister(address: number): number {
    return this.holdingRegisters.get(address) ?? 0;
  }

  writeHoldingRegister(address: number, value: number): void {
    console.log(`[WRITE] address=${address}, value=${value}`);
    this.holdingRegisters.set(address, value);
    if (address === HOLDING_REGISTERS.CHARGE_STATUS) {
      console.log(
        `[WRITE] CHARGE_STATUS changing from ${this.globalChargeStatus} to ${value}`,
      );
      this.globalChargeStatus = value;
      if (value === 0) {
        this.setGlobalPowerRegister(0);
      }
    }
    if (
      address === HOLDING_REGISTERS.GLOBAL_POWER_START ||
      address === HOLDING_REGISTERS.GLOBAL_POWER_START + 1
    ) {
      const powerKw = this.getGlobalPowerKw();
      console.log(`[SIMULATOR] GLOBAL_POWER changed to ${powerKw} kW`);
    }
  }

  readInputRegister(address: number): number {
    return this.inputRegisters.get(address) ?? 0;
  }

  readCoil(address: number): boolean {
    return this.coils.get(address) ?? false;
  }

  readDiscreteInput(address: number): boolean {
    return false;
  }

  writeCoil(address: number, value: boolean): void {
    this.coils.set(address, value);
  }

  getLastTick(): TickData | undefined {
    return this.history[this.history.length - 1];
  }

  getTickHistory(): TickData[] {
    return [...this.history];
  }

  debugRack(rackId: number): void {
    const state = this.rackStates.get(rackId);
    if (state) {
      const { soc, voltage } = capacityToSocVoltage(state.storedCapacityKwh);
      console.log(
        `[DEBUG] Rack ${rackId}: capacity=${state.storedCapacityKwh}, soc=${soc}, voltage=${voltage}`,
      );
    }
  }
}
