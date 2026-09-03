import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * ModbusTcpClient sözleşmesi (2026-08-30 — T3 karakterizasyonu):
 * - connect: socket "connect" → bağlı; "error" → hata; timeout (varsayılan
 *   3000 ms) dolunca socket yok edilir + "Modbus connection timeout" hatası.
 * - Bağlı değilken TÜM read/write "Not connected" fırlatır.
 * - jsmodbus hatası sarılır ("Read holding registers failed: ...").
 * - Socket "close"/"error" lifecycle eventleri bağlantıyı düşürür.
 * - reconnect: cleanup sonrası jitter'li üstel bekleme → connect.
 */

const sockets = vi.hoisted(() => [] as Array<{
  destroyed: boolean;
  connect: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  emit: (event: string, ...args: unknown[]) => boolean;
}>);

vi.mock("jsmodbus", () => ({
  ModbusTCPClient: class {
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

vi.mock("net", () => {
  const { EventEmitter: EE } = require("node:events") as typeof import("node:events");
  class FakeSocket extends EE {
    destroyed = false;
    connect = vi.fn();
    destroy = vi.fn(() => {
      this.destroyed = true;
    });
    override removeAllListeners = vi.fn();
    override once = vi.fn();
  }
  const mod = {
    Socket: class {
      constructor() {
        const fake = new FakeSocket();
        sockets.push(fake);
        return fake;
      }
    },
  };
  // client.ts `import net from "net"` (default import) kullanır.
  return { default: mod, ...mod };
});

import { ModbusTcpClient } from "./client";

function lastSocket(): (typeof sockets)[number] {
  return sockets[sockets.length - 1]!;
}

function fireConnect(): void {
  const call = lastSocket().once.mock.calls.find((c) => c[0] === "connect");
  call?.[1]();
}

beforeEach(() => {
  sockets.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ModbusTcpClient (T3)", () => {
  it("connect başarılı: bağlı durum + reconnect sayacı sıfırlanır", async () => {
    const client = new ModbusTcpClient({ host: "127.0.0.1", port: 502 });
    const pending = client.connect();

    fireConnect();
    await pending;

    expect(client.isConnected()).toBe(true);
    expect(lastSocket().connect).toHaveBeenCalledWith(502, "127.0.0.1");
  });

  it("connect error eventi → 'Modbus connection failed' hatası", async () => {
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    const pending = client.connect();

    const call = lastSocket().once.mock.calls.find((c) => c[0] === "error");
    call?.[1](new Error("ECONNREFUSED"));

    await expect(pending).rejects.toThrow(
      "Modbus connection failed: ECONNREFUSED",
    );
  });

  it("connect timeout (varsayılan 3000 ms) → socket destroy + hata", async () => {
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    const pending = client.connect();

    vi.advanceTimersByTime(3000);

    expect(lastSocket().destroy).toHaveBeenCalled();
    await expect(pending).rejects.toThrow("Modbus connection timeout: 3000ms");
  });

  it("bağlı değilken read/write 'Not connected' fırlatır", async () => {
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    await expect(client.readHoldingRegisters(0, 1)).rejects.toThrow("Not connected");
    await expect(client.writeSingleRegister(0, 1)).rejects.toThrow("Not connected");
    await expect(client.readCoils(0, 1)).rejects.toThrow("Not connected");
    await expect(client.writeSingleCoil(0, true)).rejects.toThrow("Not connected");
    await expect(client.readDiscreteInputs(0, 1)).rejects.toThrow("Not connected");
  });

  it("readHoldingRegisters jsmodbus sonucunu döner; hata sarılır", async () => {
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    const pending = client.connect();
    fireConnect();
    await pending;

    const jsClient = (client as unknown as {
      client: { readHoldingRegisters: ReturnType<typeof vi.fn> };
    }).client;
    jsClient.readHoldingRegisters.mockResolvedValue({
      response: { body: { valuesAsArray: [1, 2, 3] } },
    });
    expect(await client.readHoldingRegisters(0, 3)).toEqual([1, 2, 3]);

    jsClient.readHoldingRegisters.mockRejectedValue(new Error("timeout"));
    await expect(client.readHoldingRegisters(0, 3)).rejects.toThrow(
      "Read holding registers failed",
    );
  });

  it("socket close eventi bağlantıyı düşürür", async () => {
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    const pending = client.connect();
    fireConnect();
    await pending;
    expect(client.isConnected()).toBe(true);

    lastSocket().emit("close");
    expect(client.isConnected()).toBe(false);
  });

  it("bağlıyken socket error eventi bağlantıyı düşürür", async () => {
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    const pending = client.connect();
    fireConnect();
    await pending;
    expect(client.isConnected()).toBe(true);

    lastSocket().emit("error", new Error("ECONNRESET"));
    expect(client.isConnected()).toBe(false);
  });

  it("reconnect: cleanup + bekleme sonrası yeniden connect", async () => {
    vi.useRealTimers();
    const client = new ModbusTcpClient({ host: "x", port: 502 });
    const pending = client.connect();
    fireConnect();
    await pending;

    const first = lastSocket();
    const reconnectPending = client.reconnect();
    // Gerçek zaman: ilk deneme gecikmesi 1 sn + jitter (%30) — 1.6 sn yeterli.
    await new Promise((r) => setTimeout(r, 1600));
    const second = lastSocket();
    const connectCall = second.once.mock.calls.find((c) => c[0] === "connect");
    connectCall?.[1]();
    await reconnectPending;

    expect(first.destroyed).toBe(true);
    expect(client.isConnected()).toBe(true);
  }, 10000);
});
