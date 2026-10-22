// packages/core/src/modbus/client-rtu.ts

import { ModbusRTUClient as JSModbusRTUClient } from "jsmodbus";
import { SerialSocketAdapter } from "./serial-socket-adapter";
import type { SerialPortLike } from "./serial-socket-adapter";
import type { IModbusClient } from "./interface";
import { randomFloat } from "./utils";

export interface ModbusRtuConfig {
  path: string;
  baudRate: number;
  slaveId: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  /** bun-serialport yalnız none/even/odd destekler. */
  parity?: "none" | "even" | "odd";
  timeout?: number;
}

/** Port üreticisi — varsayılanı `bun-serialport`'u yalnız connect anında yükler. */
export type ModbusRtuPortFactory = (
  config: Required<ModbusRtuConfig>,
) => Promise<SerialPortLike>;

const defaultRtuPortFactory: ModbusRtuPortFactory = async (config) => {
  // Dinamik import: `bun:ffi` yalnız gerçek RTU bağlantısında yüklenir
  // (Node tabanlı test/araçlar bu modülü hiç çözmez).
  const { SerialPort } = await import("bun-serialport");
  return new SerialPort({
    path: config.path,
    baudRate: config.baudRate,
    dataBits: config.dataBits,
    stopBits: config.stopBits,
    parity: config.parity,
    autoOpen: false,
  });
};

export class ModbusRtuClient implements IModbusClient {
  private socket: SerialSocketAdapter | null = null;
  private client: JSModbusRTUClient | null = null;
  private readonly config: Required<ModbusRtuConfig>;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly reconnectBaseDelayMs: number = 1000;

  constructor(
    config: ModbusRtuConfig,
    private readonly portFactory: ModbusRtuPortFactory = defaultRtuPortFactory,
  ) {
    const rawParity = config.parity as string | undefined;
    if (
      rawParity !== undefined &&
      rawParity !== "none" &&
      rawParity !== "even" &&
      rawParity !== "odd"
    ) {
      throw new Error(
        "ModbusRtuClient: parity yalniz none/even/odd olabilir (bun-serialport)",
      );
    }
    this.config = {
      path: config.path,
      baudRate: config.baudRate,
      slaveId: config.slaveId ?? 1,
      dataBits: config.dataBits ?? 8,
      stopBits: config.stopBits ?? 1,
      parity: config.parity ?? "none",
      timeout: config.timeout ?? 3000,
    };
  }

  async connect(): Promise<void> {
    this.socket = new SerialSocketAdapter(await this.portFactory(this.config));

    this.client = new JSModbusRTUClient(this.socket, this.config.slaveId);

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        this.socket!.close();
        reject(
          new Error(
            `Modbus RTU connection timeout: ${this.config.timeout}ms (${this.config.path})`,
          ),
        );
      }, this.config.timeout);

      this.socket!.once("open", () => {
        clearTimeout(connectTimeout);
        this.connected = true;
        this.reconnectAttempts = 0;
        this.installLifecycleListeners();
        resolve();
      });

      this.socket!.once("error", (err: Error) => {
        clearTimeout(connectTimeout);
        reject(new Error(`Modbus RTU connection failed: ${err.message}`));
      });

      // Dinleyiciler hazır → portu aç ('open' olayı kaçmaz).
      this.socket!.open();
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
      30000,
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
        this.socket.close();
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

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    if (!this.connected) throw new Error("Not connected");
    try {
      const result = await this.client!.readHoldingRegisters(address, count);
      return result.response.body.valuesAsArray as number[];
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

  async writeMultipleRegisters(address: number, values: number[]): Promise<void> {
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
      return result.response.body.valuesAsArray as number[];
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
