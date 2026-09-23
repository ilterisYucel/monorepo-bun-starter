import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { DcMeterSimulator } from "./dc-meter-simulator";

/** DcMeterSimulator → IModbusSimulatorAdapter (yalnızca input register'ları). */
export class DcMeterAdapter implements IModbusSimulatorAdapter {
  constructor(private readonly simulator: DcMeterSimulator) {}

  async readHoldingRegister(_address: number): Promise<number> {
    return 0;
  }

  async readHoldingRegisters(_address: number, _count: number): Promise<number[]> {
    return [];
  }

  async writeHoldingRegister(_address: number, _value: number): Promise<void> {
    // DC metre holding register taşımaz
  }

  async writeHoldingRegisters(_address: number, _values: number[]): Promise<void> {
    // DC metre holding register taşımaz
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

  async readCoil(_address: number): Promise<boolean> {
    return false;
  }

  async readCoils(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }

  async writeCoil(_address: number, _value: boolean): Promise<void> {
    // DC metre coil taşımaz
  }

  async writeMultipleCoils(_address: number, _values: boolean[]): Promise<void> {
    // DC metre coil taşımaz
  }

  async readDiscreteInput(_address: number): Promise<boolean> {
    return false;
  }

  async readDiscreteInputs(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }
}
