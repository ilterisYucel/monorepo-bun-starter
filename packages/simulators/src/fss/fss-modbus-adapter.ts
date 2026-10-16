import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { FssSimulator } from "./fss-simulator";

/** FssSimulator → IModbusSimulatorAdapter (input register + coil + DI). */
export class FssAdapter implements IModbusSimulatorAdapter {
  constructor(private readonly simulator: FssSimulator) {}

  async readHoldingRegister(_address: number): Promise<number> {
    return 0;
  }

  async readHoldingRegisters(_address: number, _count: number): Promise<number[]> {
    return [];
  }

  async writeHoldingRegister(_address: number, _value: number): Promise<void> {
    // FSS holding register taşımaz
  }

  async writeHoldingRegisters(_address: number, _values: number[]): Promise<void> {
    // FSS holding register taşımaz
  }

  async readInputRegister(address: number): Promise<number> {
    return this.simulator.readInputRegister(address);
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.simulator.readInputRegister(address + i));
    }
    return result;
  }

  async readCoil(address: number): Promise<boolean> {
    return this.simulator.readCoil(address);
  }

  async readCoils(address: number, count: number): Promise<boolean[]> {
    const result: boolean[] = [];
    for (let i = 0; i < count; i++) result.push(this.simulator.readCoil(address + i));
    return result;
  }

  async writeCoil(address: number, value: boolean): Promise<void> {
    this.simulator.writeCoil(address, value);
  }

  async writeMultipleCoils(address: number, values: boolean[]): Promise<void> {
    for (let i = 0; i < values.length; i++) {
      this.simulator.writeCoil(address + i, values[i] ?? false);
    }
  }

  async readDiscreteInput(address: number): Promise<boolean> {
    return this.simulator.readDiscreteInput(address);
  }

  async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    const result: boolean[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.simulator.readDiscreteInput(address + i));
    }
    return result;
  }
}
