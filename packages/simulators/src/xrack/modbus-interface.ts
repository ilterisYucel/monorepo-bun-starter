import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { XRackSimulator } from "./simulator";

export class XRackSimulatorAdapter implements IModbusSimulatorAdapter {
  constructor(private simulator: XRackSimulator) {}

  // Holding Registers
  async readHoldingRegister(address: number): Promise<number> {
    return this.simulator.readHoldingRegister(address);
  }

  async readHoldingRegisters(
    address: number,
    count: number,
  ): Promise<number[]> {
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const value = this.simulator.readHoldingRegister(address + i);
      result.push(value);
    }
    return result;
  }

  async writeHoldingRegister(address: number, value: number): Promise<void> {
    this.simulator.writeHoldingRegister(address, value);
  }

  async writeHoldingRegisters(
    address: number,
    values: number[],
  ): Promise<void> {
    for (let i = 0; i < values.length; i++) {
      this.simulator.writeHoldingRegister(address + i, values[i] ?? 0);
    }
  }

  // Input Registers
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

  // Coils
  async readCoil(address: number): Promise<boolean> {
    return this.simulator.readCoil(address);
  }

  async readCoils(address: number, count: number): Promise<boolean[]> {
    const result: boolean[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.simulator.readCoil(address + i));
    }
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

  // Discrete Inputs
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
