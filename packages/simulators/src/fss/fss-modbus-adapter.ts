import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { FssSimulator } from "./fss-simulator";

/** FssSimulator → IModbusSimulatorAdapter (yalnızca discrete input'ları). */
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

  async readInputRegister(_address: number): Promise<number> {
    return 0;
  }

  async readInputRegisters(_address: number, _count: number): Promise<number[]> {
    return [];
  }

  async readCoil(_address: number): Promise<boolean> {
    return false;
  }

  async readCoils(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }

  async writeCoil(_address: number, _value: boolean): Promise<void> {
    // FSS coil taşımaz
  }

  async writeMultipleCoils(_address: number, _values: boolean[]): Promise<void> {
    // FSS coil taşımaz
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
