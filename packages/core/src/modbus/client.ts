// packages/core/src/modbus/client.ts

import net from "net";
import { ModbusTCPClient as JSModbusClient } from "jsmodbus";

const randomFloat = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0xFFFFFFFF;
};

export interface ModbusClientConfig {
  host: string;
  port: number;
  slaveId?: number;
  timeout?: number;
}

export class ModbusTcpClient {
  private socket: net.Socket | null = null;
  private client: JSModbusClient | null = null;
  private config: ModbusClientConfig;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectBaseDelayMs: number = 1000;

  constructor(config: ModbusClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.socket = new net.Socket();
    this.client = new JSModbusClient(this.socket);

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        this.socket!.destroy();
        reject(
          new Error(
            `Modbus connection timeout: ${this.config.timeout ?? 3000}ms`,
          ),
        );
      }, this.config.timeout ?? 3000);

      this.socket!.once("connect", () => {
        clearTimeout(connectTimeout);
        this.connected = true;
        this.reconnectAttempts = 0;
        this.installLifecycleListeners();
        resolve();
      });

      this.socket!.once("error", (err) => {
        clearTimeout(connectTimeout);
        reject(new Error(`Modbus connection failed: ${err.message}`));
      });

      this.socket!.connect(this.config.port, this.config.host);
    });
  }

  private installLifecycleListeners(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners("close");
    this.socket.removeAllListeners("error");
    this.socket.on("close", () => {
      this.connected = false;
    });
    this.socket.on("error", () => {
      this.connected = false;
    });
  }

  async reconnect(): Promise<void> {
    await this.cleanupSocket();
    const delay = Math.min(
      this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempts),
      30000
    );
    this.reconnectAttempts++;
    const jitter = randomFloat() * delay * 0.3;
    await new Promise((r) => setTimeout(r, delay + jitter));
    await this.connect();
  }

  private async cleanupSocket(): Promise<void> {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch { /* yoksay */ }
      this.socket = null;
      this.client = null;
    }
    this.connected = false;
  }

  async disconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    await this.cleanupSocket();
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
      const result = await this.client!.readHoldingRegisters(address, count);
      const data = result.response.body.valuesAsArray;
      return data as number[];
    } catch (error) {
      throw new Error(`Read holding registers failed: ${error}`);
    }
  }

  async writeSingleRegister(address: number, value: number): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client!.writeSingleRegister(address, value);
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
      await this.client!.writeMultipleRegisters(address, values);
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
      const result = await this.client!.readInputRegisters(address, count);
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
      const result = await this.client!.readCoils(address, count);
      const data = result.response.body.valuesAsArray;
      return data as boolean[];
    } catch (error) {
      throw new Error(`Read coils failed: ${error}`);
    }
  }

  async writeSingleCoil(address: number, value: boolean): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client!.writeSingleCoil(address, value);
    } catch (error) {
      throw new Error(`Write single coil failed: ${error}`);
    }
  }

  async writeMultipleCoils(address: number, values: boolean[]): Promise<void> {
    if (!this.connected) throw new Error("Not connected");
    try {
      await this.client!.writeMultipleCoils(address, values);
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
      const result = await this.client!.readDiscreteInputs(address, count);
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
