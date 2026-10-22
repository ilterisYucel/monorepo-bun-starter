import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

/**
 * ModbusRtuClient sözleşmesi (2026-08-30 — T3 karakterizasyonu):
 * - config varsayılanları: slaveId 1, dataBits 8, stopBits 1, parity none,
 *   timeout 3000.
 * - connect: port "open" → bağlı; "error" → hata; timeout → port kapatılır +
 *   "Modbus RTU connection timeout" hatası (path bağlamında).
 * - Bağlı değilken read/write "Not connected".
 * - "close"/"error" lifecycle eventleri bağlantıyı düşürür.
 * - Port üretimi enjekte edilir (varsayılan: connect anında `bun-serialport`).
 */

class FakePort extends EventEmitter {
  closed = false;
  isOpen = false;
  close = vi.fn(async () => {
    this.closed = true;
    this.isOpen = false;
  });
  // Testler 'open' olayını elle tetikler (fireOpen) — burada emit YOK.
  open = vi.fn(async () => {
    this.isOpen = true;
  });
  write = vi.fn(async (_data: Uint8Array) => undefined);
}

const ports: FakePort[] = [];
const portConfigs: unknown[] = [];

import { ModbusRtuClient } from "./client-rtu";
import type { ModbusRtuConfig } from "./client-rtu";

function makeClient(config: ModbusRtuConfig) {
  const port = new FakePort();
  ports.push(port);
  return new ModbusRtuClient(config, async (resolved) => {
    portConfigs.push(resolved);
    return port;
  });
}

function lastPort(): FakePort {
  return ports[ports.length - 1]!;
}

function fireOpen(): void {
  lastPort().isOpen = true;
  lastPort().emit("open");
}

beforeEach(() => {
  ports.length = 0;
  portConfigs.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ModbusRtuClient (T3)", () => {
  it("config varsayılanlarıyla port kurulur (connect anında)", async () => {
    const client = new ModbusRtuClient(
      { path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 3 },
      async (resolved) => {
        portConfigs.push(resolved);
        const port = new FakePort();
        ports.push(port);
        return port;
      },
    );
    const pending = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(portConfigs[0]).toMatchObject({
      path: "/dev/ttyUSB0",
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });
    fireOpen();
    await pending;
  });

  it("connect open eventi ile bağlanır", async () => {
    const client = makeClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    fireOpen();
    await pending;
    expect(client.isConnected()).toBe(true);
  });

  it("connect error eventi → 'Modbus RTU connection failed'", async () => {
    const client = makeClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    lastPort().emit("error", new Error("ENOENT"));
    await expect(pending).rejects.toThrow("Modbus RTU connection failed: ENOENT");
  });

  it("connect timeout → port kapatılır + path bağlamlı hata", async () => {
    const client = makeClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    const expectation = expect(pending).rejects.toThrow(
      "Modbus RTU connection timeout: 3000ms (/dev/ttyUSB0)",
    );
    await vi.advanceTimersByTimeAsync(3000);
    expect(lastPort().closed).toBe(true);
    await expectation;
  });

  it("bağlı değilken okuma 'Not connected' fırlatır", async () => {
    const client = makeClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    await expect(client.readHoldingRegisters(0, 1)).rejects.toThrow("Not connected");
    await expect(client.writeSingleCoil(0, true)).rejects.toThrow("Not connected");
  });

  it("close eventi bağlantıyı düşürür", async () => {
    const client = makeClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    fireOpen();
    await pending;
    lastPort().emit("close");
    expect(client.isConnected()).toBe(false);
  });

  it("bağlıyken port error eventi bağlantıyı düşürür", async () => {
    const client = makeClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    fireOpen();
    await pending;
    expect(client.isConnected()).toBe(true);

    lastPort().emit("error", new Error("EIO"));
    expect(client.isConnected()).toBe(false);
  });
});
