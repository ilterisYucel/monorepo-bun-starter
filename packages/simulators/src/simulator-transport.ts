// Simülatörü IModbusTransport sözleşmesine saran adapter (Strategy pattern).
// Tick yaşam döngüsü transport'un kendisindedir: connect() başlatır, disconnect() durdurur.
// Böylece ModbusDevice ve DeviceService simülatör detayını hiç görmez.

import type { IModbusTransport } from "@gd-monorepo/core";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";

export class SimulatorTransport implements IModbusTransport {
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly simulator: IModbusSimulatorAdapter,
    private readonly tick: () => void,
    private readonly intervalMs: number = 1000,
    /** Opsiyonel — disconnect'te çağrılır (ör. simülatör içi TCP sunucu kapatma). */
    private readonly onDisconnect?: () => void | Promise<void>,
  ) {}

  async connect(): Promise<void> {
    if (this.timer) return;
    this.timer = setInterval(this.tick, this.intervalMs);
  }

  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.onDisconnect) {
      await Promise.resolve(this.onDisconnect());
    }
  }

  async reconnect(): Promise<void> {
    // Simülatör bağlantı koparmaz — no-op
  }

  isConnected(): boolean {
    return true;
  }

  async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    return this.simulator.readHoldingRegisters(address, count);
  }

  async writeHoldingRegisters(address: number, values: number[]): Promise<void> {
    await this.simulator.writeHoldingRegisters(address, values);
  }

  async readInputRegisters(address: number, count: number): Promise<number[]> {
    return this.simulator.readInputRegisters(address, count);
  }

  async readCoils(address: number, count: number): Promise<boolean[]> {
    return this.simulator.readCoils(address, count);
  }

  async writeCoils(address: number, values: boolean[]): Promise<void> {
    await this.simulator.writeMultipleCoils(address, values);
  }

  async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    return this.simulator.readDiscreteInputs(address, count);
  }
}
