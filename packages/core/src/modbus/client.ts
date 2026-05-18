// packages/core/src/modbus/client.ts

import net from "net";
import { ModbusTCPClient as JSModbusClient } from "jsmodbus";

export interface ModbusClientConfig {
  host: string;
  port: number;
  slaveId?: number;
  timeout?: number;
}

export class ModbusTcpClient {
  private socket: net.Socket;
  private client: JSModbusClient;
  private config: ModbusClientConfig;
  private connected: boolean = false;

  constructor(config: ModbusClientConfig) {
    this.config = config;
    this.socket = new net.Socket();
    this.client = new JSModbusClient(this.socket);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket.destroy();
        reject(
          new Error(
            `Modbus connection timeout: ${this.config.timeout ?? 3000}ms`,
          ),
        );
      }, this.config.timeout ?? 3000);

      this.socket.on("connect", () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });

      this.socket.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Modbus connection failed: ${err.message}`));
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      this.socket.end();
      this.connected = false;
    }
  }

  // ============================================
  // HOLDING REGISTERS (4x) - Okuma/Yazma
  // ============================================

  async readHoldingRegisters(
    address: number,
    count: number,
  ): Promise<number[]> {
    if (!this.connected) throw new Error("Not connected");
    try {
      const result = await this.client.readHoldingRegisters(address, count);
      const data = result.response.body.valuesAsArray;
      return data as number[];
    } catch (error) {
      throw new Error(`Read holding registers failed: ${error}`);
    }
  }

  async writeSingleRegister(address: number, value: number): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client.writeSingleRegister(address, value);
    } catch (error) {
      throw new Error(`Write single register failed: ${error}`);
    }
  }

  async writeMultipleRegisters(
    address: number,
    values: number[],
  ): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client.writeMultipleRegisters(address, values);
    } catch (error) {
      throw new Error(`Write multiple registers failed: ${error}`);
    }
  }

  // ============================================
  // INPUT REGISTERS (3x) - Sadece Okuma
  // ============================================

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    if (!this.connected) throw new Error("Not connected");
    try {
      const result = await this.client.readInputRegisters(address, count);
      const data = result.response.body.valuesAsArray;
      return data as number[];
    } catch (error) {
      throw new Error(`Read input registers failed: ${error}`);
    }
  }

  // ============================================
  // COILS (0x) - Okuma/Yazma
  // ============================================

  async readCoils(address: number, count: number): Promise<boolean[]> {
    if (!this.connected) throw new Error("Not connected");
    try {
      const result = await this.client.readCoils(address, count);
      const data = result.response.body.valuesAsArray;
      return data as boolean[];
    } catch (error) {
      throw new Error(`Read coils failed: ${error}`);
    }
  }

  async writeSingleCoil(address: number, value: boolean): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client.writeSingleCoil(address, value);
    } catch (error) {
      throw new Error(`Write single coil failed: ${error}`);
    }
  }

  async writeMultipleCoils(address: number, values: boolean[]): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client.writeMultipleCoils(address, values);
    } catch (error) {
      throw new Error(`Write multiple coils failed: ${error}`);
    }
  }

  // ============================================
  // DISCRETE INPUTS (1x) - Sadece Okuma
  // ============================================

  async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    if (!this.connected) throw new Error("Not connected");
    try {
      const result = await this.client.readDiscreteInputs(address, count);
      const data = result.response.body.valuesAsArray;
      return data as boolean[];
    } catch (error) {
      throw new Error(`Read discrete inputs failed: ${error}`);
    }
  }

  // ============================================
  // UTILITY
  // ============================================

  isConnected(): boolean {
    return this.connected;
  }
}
