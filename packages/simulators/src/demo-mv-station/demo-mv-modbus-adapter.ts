import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { DemoMvStationSimulator } from "./demo-mv-simulator";

/** Demo MV istasyon simülatörü Modbus köprüsü (SPEC UC-9). */
export class DemoMvStationAdapter implements IModbusSimulatorAdapter {
  constructor(private simulator: DemoMvStationSimulator) {}

  async readHoldingRegister(address: number): Promise<number> {
    return this.simulator.readHoldingRegister(address);
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(this.simulator.readHoldingRegister(address + i));
    return out;
  }

  async writeHoldingRegister(address: number, value: number): Promise<void> {
    this.simulator.writeHoldingRegister(address, value);
  }

  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    for (let i = 0; i < values.length; i++) this.simulator.writeHoldingRegister(address + i, values[i] ?? 0);
  }

  async readInputRegister(address: number): Promise<number> {
    return this.simulator.readInputRegister(address);
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(this.simulator.readInputRegister(address + i));
    return out;
  }

  async readCoil(address: number): Promise<boolean> {
    return this.simulator.readCoil(address);
  }

  async readCoils(address: number, count: number): Promise<boolean[]> {
    const out: boolean[] = [];
    for (let i = 0; i < count; i++) out.push(this.simulator.readCoil(address + i));
    return out;
  }

  async writeCoil(address: number, value: boolean): Promise<void> {
    this.simulator.writeCoil(address, value);
  }

  async writeMultipleCoils(address: number, values: boolean[]): Promise<void> {
    for (let i = 0; i < values.length; i++) this.simulator.writeCoil(address + i, values[i] ?? false);
  }

  async readDiscreteInput(address: number): Promise<boolean> {
    return this.simulator.readDiscreteInput(address);
  }

  async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    const out: boolean[] = [];
    for (let i = 0; i < count; i++) out.push(this.simulator.readDiscreteInput(address + i));
    return out;
  }
}
