import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

/**
 * ModbusRtuClient sözleşmesi (2026-08-30 — T3 karakterizasyonu):
 * - config varsayılanları: slaveId 1, dataBits 8, stopBits 1, parity none,
 *   timeout 3000.
 * - connect: SerialPort "open" → bağlı; "error" → hata; timeout → port
 *   kapatılır + "Modbus RTU connection timeout" hatası (path bağlamında).
 * - Bağlı değilken read/write "Not connected".
 * - "close"/"error" lifecycle eventleri bağlantıyı düşürür.
 */

const ports = vi.hoisted(() => [] as Array<{
  closed: boolean;
  close: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  emit: (event: string, ...args: unknown[]) => boolean;
}>);

const serialportConfigs = vi.hoisted(() => [] as unknown[]);

vi.mock("serialport", () => {
  const { EventEmitter: EE } = require("node:events") as typeof import("node:events");
  class FakePort extends EE {
    closed = false;
    close = vi.fn(() => {
      this.closed = true;
    });
    override removeAllListeners = vi.fn();
    override once = vi.fn();
  }
  return {
    SerialPort: class {
      constructor(config: unknown) {
        serialportConfigs.push(config);
        const fake = new FakePort();
        ports.push(fake);
        return fake;
      }
    },
  };
});

vi.mock("jsmodbus", () => ({
  ModbusRTUClient: class {
    readHoldingRegisters = vi.fn();
    readInputRegisters = vi.fn();
    readCoils = vi.fn();
    writeSingleRegister = vi.fn();
    writeMultipleRegisters = vi.fn();
    writeSingleCoil = vi.fn();
    writeMultipleCoils = vi.fn();
    readDiscreteInputs = vi.fn();
  },
}));

import { ModbusRtuClient } from "./client-rtu";

function lastPort(): (typeof ports)[number] {
  return ports[ports.length - 1]!;
}

function fireOpen(): void {
  const call = lastPort().once.mock.calls.find((c) => c[0] === "open");
  call?.[1]();
}

beforeEach(() => {
  ports.length = 0;
  serialportConfigs.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ModbusRtuClient (T3)", () => {
  it("config varsayılanlarıyla SerialPort kurulur (connect anında)", async () => {
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 3 });
    const pending = client.connect();
    expect(serialportConfigs[0]).toMatchObject({
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
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    fireOpen();
    await pending;
    expect(client.isConnected()).toBe(true);
  });

  it("connect error eventi → 'Modbus RTU connection failed'", async () => {
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    const call = lastPort().once.mock.calls.find((c) => c[0] === "error");
    call?.[1](new Error("ENOENT"));
    await expect(pending).rejects.toThrow("Modbus RTU connection failed: ENOENT");
  });

  it("connect timeout → port kapatılır + path bağlamlı hata", async () => {
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    vi.advanceTimersByTime(3000);
    expect(lastPort().closed).toBe(true);
    await expect(pending).rejects.toThrow(
      "Modbus RTU connection timeout: 3000ms (/dev/ttyUSB0)",
    );
  });

  it("bağlı değilken okuma 'Not connected' fırlatır", async () => {
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    await expect(client.readHoldingRegisters(0, 1)).rejects.toThrow("Not connected");
    await expect(client.writeSingleCoil(0, true)).rejects.toThrow("Not connected");
  });

  it("close eventi bağlantıyı düşürür", async () => {
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    fireOpen();
    await pending;
    lastPort().emit("close");
    expect(client.isConnected()).toBe(false);
  });

  it("bağlıyken port error eventi bağlantıyı düşürür", async () => {
    const client = new ModbusRtuClient({ path: "/dev/ttyUSB0", baudRate: 9600, slaveId: 1 });
    const pending = client.connect();
    fireOpen();
    await pending;
    expect(client.isConnected()).toBe(true);

    lastPort().emit("error", new Error("EIO"));
    expect(client.isConnected()).toBe(false);
  });
});
