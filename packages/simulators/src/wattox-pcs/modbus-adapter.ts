// WattoxPcsAdapter — IModbusSimulatorAdapter sözleşmesine sarmalar (EMS yüzü).
// SimulatorTransport ile device-service'e bağlanır; BMS bloğu EMS yüzünde RO'dur.

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import type { WattoxPcsSimulator } from "./simulator";

export class WattoxPcsAdapter implements IModbusSimulatorAdapter {
  constructor(private readonly simulator: WattoxPcsSimulator) {}

  async readHoldingRegister(address: number): Promise<number> {
    return this.simulator.readSetting(address);
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      values.push(this.simulator.readSetting(address + i));
    }
    return values;
  }

  async writeHoldingRegister(address: number, value: number): Promise<void> {
    this.simulator.writeSetting(address, value);
  }

  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    values.forEach((value, i) => {
      this.simulator.writeSetting(address + i, value);
    });
  }

  async readInputRegister(address: number): Promise<number> {
    return this.simulator.readRegister(address);
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      values.push(this.simulator.readRegister(address + i));
    }
    return values;
  }

  async readCoil(_address: number): Promise<boolean> {
    return false;
  }

  async readCoils(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }

  async writeCoil(_address: number, _value: boolean): Promise<void> {
    // coil alanı yok
  }

  async writeMultipleCoils(_address: number, _values: boolean[]): Promise<void> {
    // coil alanı yok
  }

  async readDiscreteInput(_address: number): Promise<boolean> {
    return false;
  }

  async readDiscreteInputs(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }
}
