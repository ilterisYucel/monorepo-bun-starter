import { describe, it, expect, afterEach } from "vitest";
import { connect as netConnect } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";
import { DcMeterSimulator } from "../dc-meter/dc-meter-simulator";

/**
 * UC-2 self-host yaşam döngüsü (SimulatorServer üzerinden):
 * - AK-2.1: `{host, port}` ile örneklenen simülatör `start()` sonrası TCP'den okunur.
 * - AK-2.2: `stop()` sonrası `start()` aynı simülatörü yeniden açar (idempotent).
 */

let sim: DcMeterSimulator | undefined;
let socket: Socket | undefined;

afterEach(async () => {
  socket?.destroy();
  socket = undefined;
  await sim?.stop();
  sim = undefined;
});

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

describe("SimulatorServer — UC-2 self-host", () => {
  it("AK-2.1 — network config ile start() sonrası TCP'den okuma", async () => {
    sim = new DcMeterSimulator({ network: { host: "127.0.0.1", port: 0 } });
    await sim.start();

    const port = sim.port();
    expect(port).toBeGreaterThan(0);

    const client = await connectClient(port);
    const res = await client.readInputRegisters(0, 1);
    expect(Array.isArray(res.response.body.valuesAsArray)).toBe(true);
  });

  it("AK-2.2 — stop idempotent; start sonrası yeniden açılır", async () => {
    sim = new DcMeterSimulator({ network: { host: "127.0.0.1", port: 0 } });
    await sim.start();
    await sim.stop();
    await sim.stop();

    await sim.start();
    expect(sim.port()).toBeGreaterThan(0);
    const client = await connectClient(sim.port());
    const res = await client.readInputRegisters(0, 1);
    expect(Array.isArray(res.response.body.valuesAsArray)).toBe(true);
  });

  it("network yoksa start() no-op'tur", async () => {
    sim = new DcMeterSimulator();
    await expect(sim.start()).resolves.toBeUndefined();
    expect(sim.port()).toBe(0);
  });
});
