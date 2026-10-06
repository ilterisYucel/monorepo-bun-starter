import { describe, it, expect, afterEach } from "vitest";
import { connect as netConnect } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";
import { SimulatorHost } from "./host";

/**
 * SimulatorHost sözleşmesi (UC-3):
 * - AK-3.1: `kind === "simulator"` config'ler örneklenir; diğerleri atlanır.
 * - AK-3.2: deviceId→port indeksi kurulur.
 * - AK-3.4/edge: bilinmeyen tip ve port çakışması fail-fast.
 */

let host: SimulatorHost | undefined;
let socket: Socket | undefined;

afterEach(async () => {
  socket?.destroy();
  socket = undefined;
  await host?.stopAll();
  host = undefined;
});

const cfg = (deviceId: string, type: string, port: number, kind: "simulator" | "tcp" = "simulator"): DeviceConfigFile =>
  ({
    deviceId,
    name: deviceId,
    manufacturer: "test",
    model: "test",
    protocol: "MODBUS",
    type,
    connection: { host: "127.0.0.1", port },
    telemetry: [],
    transport: { kind, type },
  }) as DeviceConfigFile;

const connectClient = async (port: number): Promise<ModbusTCPClient> => {
  const s = netConnect({ host: "127.0.0.1", port });
  const client = new ModbusTCPClient(s, 1);
  await new Promise<void>((resolve, reject) => {
    s.once("connect", resolve);
    s.once("error", reject);
  });
  socket = s;
  return client;
};

describe("SimulatorHost — UC-3", () => {
  it("AK-3.1 — yalnız simulator config'ler için sunucu açar; TCP okunur", async () => {
    host = new SimulatorHost([
      cfg("hvac-1", "hvac", 0),
      cfg("real-1", "x", 0, "tcp"),
    ]);

    const running = await host.start();
    expect(running.map((r) => r.deviceId)).toEqual(["hvac-1"]);

    const client = await connectClient(running[0]!.port);
    const res = await client.readInputRegisters(0, 1);
    expect(Array.isArray(res.response.body.valuesAsArray)).toBe(true);
  });

  it("AK-3.2 — deviceId→port indeksi kurulur", async () => {
    host = new SimulatorHost([cfg("cb-1", "cb", 0), cfg("dc-1", "dc-output", 0)]);
    const running = await host.start();

    for (const entry of running) {
      expect(host.portFor(entry.deviceId)).toBe(entry.port);
      expect(entry.port).toBeGreaterThan(0);
    }
  });

  it("edge — bilinmeyen simülatör tipi fail-fast", async () => {
    host = new SimulatorHost([cfg("x-1", "unknown-type", 0)]);
    await expect(host.start()).rejects.toThrow(/Bilinmeyen simulator tipi/);
  });

  it("edge — port çakışması fail-fast (kısmen açılanlar kapanır)", async () => {
    host = new SimulatorHost([cfg("hvac-1", "hvac", 15599), cfg("cb-1", "cb", 15599)]);
    await expect(host.start()).rejects.toThrow(/port cakismasi/);
  });

  it("edge — stopAll idempotent", async () => {
    host = new SimulatorHost([cfg("hvac-1", "hvac", 0)]);
    await host.start();
    await host.stopAll();
    await expect(host.stopAll()).resolves.toBeUndefined();
    expect(host.portFor("hvac-1")).toBeUndefined();
  });
});
