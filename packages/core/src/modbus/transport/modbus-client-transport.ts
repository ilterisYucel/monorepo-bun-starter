// Gerçek Modbus istemcilerini (TCP/RTU) IModbusTransport sözleşmesine saran adapter.
// IModbusClient implement eden herhangi bir istemciyle çalışır.

import type { IModbusClient } from "../interface";
import type { IModbusTransport } from "./interface";

export class ModbusClientTransport implements IModbusTransport {
  constructor(private readonly client: IModbusClient) {}

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async reconnect(): Promise<void> {
    await this.client.reconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    return this.client.readHoldingRegisters(address, count);
  }

  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    if (values.length === 1) {
      await this.client.writeSingleRegister(address, values[0]!);
    } else {
      await this.client.writeMultipleRegisters(address, values);
    }
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    return this.client.readInputRegisters(address, count);
  }

  async readCoils(address: number, count: number): Promise<boolean[]> {
    return this.client.readCoils(address, count);
  }

  async writeCoils(address: number, values: boolean[]): Promise<void> {
    if (values.length === 1) {
      await this.client.writeSingleCoil(address, values[0]!);
    } else {
      await this.client.writeMultipleCoils(address, values);
    }
  }

  async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    return this.client.readDiscreteInputs(address, count);
  }
}
