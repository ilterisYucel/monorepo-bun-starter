import { describe, it, expect, afterEach } from "vitest";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { ModbusServerBridge } from "../server";
import { TcpSourceReader, combineWords } from "./source-reader";

/**
 * TcpSourceReader — kaynak BSC'yi gerçek Modbus TCP ile okur (UC-4/T-7, FR-4.1).
 */

class FakeSource implements IModbusSimulatorAdapter {
  readonly input = new Map<number, number>();

  async readInputRegister(address: number): Promise<number> {
    const value = this.input.get(address);
    if (value === undefined) throw new Error(`adres yok: ${address}`);
    return value;
  }
  async readInputRegisters(address: number, count: number): Promise<number[]> {
    const values: number[] = [];
    for (let i = 0; i < count; i++) values.push(await this.readInputRegister(address + i));
    return values;
  }
  async readHoldingRegister(): Promise<number> { return 0; }
  async readHoldingRegisters(_a: number, count: number): Promise<number[]> { return new Array<number>(count).fill(0); }
  async writeHoldingRegister(): Promise<void> {}
  async writeHoldingRegisters(): Promise<void> {}
  async readCoil(): Promise<boolean> { return false; }
  async readCoils(): Promise<boolean[]> { return []; }
  async writeCoil(): Promise<void> {}
  async writeMultipleCoils(): Promise<void> {}
  async readDiscreteInput(): Promise<boolean> { return false; }
  async readDiscreteInputs(): Promise<boolean[]> { return []; }
}

let bridge: ModbusServerBridge | undefined;
let reader: TcpSourceReader | undefined;

afterEach(async () => {
  await reader?.close();
  reader = undefined;
  await bridge?.stop();
  bridge = undefined;
});

const startSource = async (): Promise<{ source: FakeSource; port: number }> => {
  const source = new FakeSource();
  source.input.set(30055, 5500);
  source.input.set(30059, 0xabcd);
  source.input.set(30060, 0x1234);
  bridge = new ModbusServerBridge({ adapter: source, host: "127.0.0.1", port: 0 });
  await bridge.start();
  return { source, port: bridge.port() };
};

describe("TcpSourceReader", () => {
  it("tek register'ı TCP'den okur", async () => {
    const { port } = await startSource();
    reader = new TcpSourceReader(new Map([["BSC-1", { host: "127.0.0.1", port }]]));

    const value = await reader.read({ deviceId: "BSC-1", table: "input", address: 30055 });

    expect(value).toBe(5500);
  });

  it("size>1 kelimeleri big-endian birleştirir", async () => {
    const { port } = await startSource();
    reader = new TcpSourceReader(new Map([["BSC-1", { host: "127.0.0.1", port }]]));

    const value = await reader.read({
      deviceId: "BSC-1",
      table: "input",
      address: 30059,
      size: 2,
    });

    expect(value).toBe(0xabcd1234);
  });

  it("bilinmeyen deviceId → throw", async () => {
    const { port } = await startSource();
    reader = new TcpSourceReader(new Map([["BSC-1", { host: "127.0.0.1", port }]]));

    await expect(
      reader.read({ deviceId: "YOK", table: "input", address: 1 }),
    ).rejects.toThrow();
  });

  it("combineWords signed işaretleme", () => {
    expect(combineWords([0xffff, 0xffff], 2, false)).toBe(0xffffffff);
    expect(combineWords([0xffff, 0xffff], 2, true)).toBe(-1);
  });
});
