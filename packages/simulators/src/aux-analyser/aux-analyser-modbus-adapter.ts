import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { AuxAnalyserSimulator } from "./aux-analyser-simulator";

/** AuxAnalyserSimulator → IModbusSimulatorAdapter (yalnızca input register'ları). */
export class AuxAnalyserAdapter implements IModbusSimulatorAdapter {
  constructor(private readonly simulator: AuxAnalyserSimulator) {}

  async readHoldingRegister(_address: number): Promise<number> {
    return 0;
  }

  async readHoldingRegisters(_address: number, _count: number): Promise<number[]> {
    return [];
  }

  async writeHoldingRegister(_address: number, _value: number): Promise<void> {
    // AUX Analyser holding register taşımaz
  }

  async writeHoldingRegisters(_address: number, _values: number[]): Promise<void> {
    // AUX Analyser holding register taşımaz
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
    // AUX Analyser coil taşımaz
  }

  async writeMultipleCoils(_address: number, _values: boolean[]): Promise<void> {
    // AUX Analyser coil taşımaz
  }

  async readDiscreteInput(_address: number): Promise<boolean> {
    return false;
  }

  async readDiscreteInputs(_address: number, _count: number): Promise<boolean[]> {
    return [];
  }
}
