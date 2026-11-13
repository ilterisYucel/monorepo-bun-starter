import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";

/**
 * Modbus TCP köprüsünün ihtiyaç duyduğu BSC yüzü.
 *
 * Hem legacy `BSCSimulator` hem `BscLegacyAdaptor` bu yüzü karşılar — köprü
 * davranış bilmez, yalnız okuma/yazma iletir (birleştirme SPEC §5.1).
 */
export interface IBscSimulatorSurface {
  readHoldingRegister(address: number): number;
  writeHoldingRegister(address: number, value: number): void;
  readInputRegister(address: number): number;
  readCoil(address: number): boolean;
  writeCoil(address: number, value: boolean): void;
  readDiscreteInput(address: number): boolean;
}

export class BSCSimulatorAdapter implements IModbusSimulatorAdapter {
  constructor(private simulator: IBscSimulatorSurface) {}

  async readHoldingRegister(address: number): Promise<number> {
    return this.simulator.readHoldingRegister(address);
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.simulator.readHoldingRegister(address + i));
    }
    return result;
  }

  async writeHoldingRegister(address: number, value: number): Promise<void> {
    this.simulator.writeHoldingRegister(address, value);
  }

  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    for (let i = 0; i < values.length; i++) {
      this.simulator.writeHoldingRegister(address + i, values[i] ?? 0);
    }
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
