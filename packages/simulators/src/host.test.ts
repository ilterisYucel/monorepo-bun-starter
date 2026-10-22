import { describe, it, expect, afterEach } from "vitest";
import { connect as netConnect } from "node:net";
import type { Socket } from "node:net";
import { ModbusTCPClient } from "jsmodbus";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";
import { SimulatorHost } from "./host";
import { COILS } from "./demo-mv-station/register-map";
import { REG_GRID_V_AB } from "./wattox-pcs/register-map";

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

  it("AK-10.3 — fss builder kaydedilir, diğer builder'lar etkilenmez", async () => {
    host = new SimulatorHost([cfg("fss-1", "fss", 0), cfg("hvac-1", "hvac", 0)]);
    const running = await host.start();
    expect(running.map((r) => r.deviceId).sort()).toEqual(["fss-1", "hvac-1"]);
    const fss = running.find((r) => r.deviceId === "fss-1")!;
    const client = await connectClient(fss.port);
    const res = await client.readInputRegisters(0, 1);
    expect(res.response.body.valuesAsArray[0]).toBe(0);
  });
});

describe("SimulatorHost — şebeke yolu eşleşmesi (SEBEKE-YOLU-ESLESMESI UC-3)", () => {
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  it("AK-3.3: fider kesici açılınca bağlı PCS de-enerjili olur", async () => {
    const pcs: DeviceConfigFile = {
      ...cfg("PCS-1", "wattox-pcs", 0),
      details: { gridLink: { deviceId: "MV-1", feeder: "H04" } },
    };
    host = new SimulatorHost([cfg("MV-1", "demo-mv-station", 0), pcs]);
    await host.start();
    const pcsPort = host.portFor("PCS-1");
    const mvPort = host.portFor("MV-1");
    expect(pcsPort).toBeGreaterThan(0);
    expect(mvPort).toBeGreaterThan(0);

    const pcsClient = await connectClient(pcsPort!);
    const mvSocket = netConnect({ host: "127.0.0.1", port: mvPort! });
    const mvClient = new ModbusTCPClient(mvSocket, 1);
    await new Promise<void>((resolve, reject) => {
      mvSocket.once("connect", resolve);
      mvSocket.once("error", reject);
    });
    const readVac = async (): Promise<number> =>
      ((await pcsClient.readInputRegisters(REG_GRID_V_AB, 1)).response.body
        .valuesAsArray as number[])[0]!;

    try {
      expect(await readVac()).toBe(4000);
      await mvClient.writeSingleCoil(COILS.H04_OPEN, true);
      await sleep(1300);
      expect(await readVac()).toBe(0);
      await mvClient.writeSingleCoil(COILS.H04_CLOSE, true);
      await sleep(1300);
      expect(await readVac()).toBe(4000);
    } finally {
      mvSocket.destroy();
    }
  }, 10000);
});

describe("SimulatorHost — istasyon başına 1 MV (2 fider)", () => {
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  it("her MV kendi bus'ına yayınlar; fider kesicisi yalnız bağlı PCS'i düşürür", async () => {
    const pcs = (id: string, mv: string, feeder: string): DeviceConfigFile => ({
      ...cfg(id, "wattox-pcs", 0),
      details: { gridLink: { deviceId: mv, feeder } },
    });
    host = new SimulatorHost([
      cfg("DEMO-MV-1", "demo-mv-station", 0),
      cfg("DEMO-MV-2", "demo-mv-station", 0),
      pcs("PCS-1", "DEMO-MV-1", "H04"),
      pcs("PCS-3", "DEMO-MV-2", "H04"),
    ]);
    await host.start();
    const pcs1Port = host.portFor("PCS-1")!;
    const pcs3Port = host.portFor("PCS-3")!;
    const mv2Port = host.portFor("DEMO-MV-2")!;

    const open = async (port: number): Promise<{ client: ModbusTCPClient; sock: Socket }> => {
      const sock = netConnect({ host: "127.0.0.1", port });
      const client = new ModbusTCPClient(sock, 1);
      await new Promise<void>((resolve, reject) => {
        sock.once("connect", resolve);
        sock.once("error", reject);
      });
      return { client, sock };
    };
    const p1 = await open(pcs1Port);
    const p3 = await open(pcs3Port);
    const m2 = await open(mv2Port);
    const pcs1 = p1.client;
    const pcs3 = p3.client;
    const mv2 = m2.client;
    const vac = async (client: ModbusTCPClient): Promise<number> =>
      ((await client.readInputRegisters(REG_GRID_V_AB, 1)).response.body.valuesAsArray as number[])[0]!;

    try {
      expect(await vac(pcs1)).toBe(4000);
      expect(await vac(pcs3)).toBe(4000);
      // Yalnız istasyon 2'nin MV panosunda H04 açılır.
      await mv2.writeSingleCoil(COILS.H04_OPEN, true);
      await sleep(1300);
      expect(await vac(pcs1)).toBe(4000);
      expect(await vac(pcs3)).toBe(0);
    } finally {
      p1.sock.destroy();
      p3.sock.destroy();
      m2.sock.destroy();
    }
  }, 20000);
});
