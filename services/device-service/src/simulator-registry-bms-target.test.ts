import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SimulatorRegistry } from "./simulator-registry";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";

/**
 * SimulatorRegistry — BSC→PCS connector BMS hedef override sözleşmesi
 * (BSC-PCS-CONNECTOR-MIMARISI.md §6 + deployment-bazlı hedef):
 *
 * - `bmsTarget` verilmezse mapping dosyasındaki sabit hedef AYNEN geçer.
 * - `bmsTarget.host/port` verilirse YALNIZCA verilen alanlar ezilir; mapping
 *   diğer alanları (intervalMs, mappings) korunur.
 */

const mapping = {
  target: { host: "127.0.0.1", port: 15502 },
  intervalMs: 5000,
  mappings: [
    {
      kind: "register",
      from: { deviceId: "BSC-1", table: "input", address: 30036 },
      to: 768,
      ratio: 1,
      offset: 0,
    },
  ],
};

function connectorConfig(dir: string): DeviceConfigFile {
  const mapPath = join(dir, "bsc-pcs-mapping.json");
  writeFileSync(mapPath, JSON.stringify(mapping));
  return {
    deviceId: "CONNECTOR-1",
    name: "connector",
    manufacturer: "GD-PMS",
    model: "x",
    protocol: "MODBUS",
    type: "bsc-pcs-connector",
    connection: {},
    telemetry: [
      {
        name: "Link",
        protocol: "MODBUS",
        registerAddress: 0,
        registerTableType: "INPUT_REGISTER",
        registerDataType: "UINT16",
      },
    ],
    transport: { kind: "simulator", type: "bsc-pcs-connector", registerMap: mapPath },
  } as unknown as DeviceConfigFile;
}

vi.mock("@gd-monorepo/simulators", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gd-monorepo/simulators")>();
  return {
    ...actual,
    BscPcsConnectorAdapter: vi.fn(
      (config: { mapping: unknown }) => new actual.BscPcsConnectorAdapter(config),
    ),
  };
});

import { BscPcsConnectorAdapter } from "@gd-monorepo/simulators";

const adapterMock = vi.mocked(BscPcsConnectorAdapter);

describe("SimulatorRegistry — bmsTarget override", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "conn-reg-XXXXXX"));
    adapterMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bmsTarget verilmezse mapping hedefi AYNEN geçer", () => {
    const registry = new SimulatorRegistry();
    registry.createFromConfigs([connectorConfig(dir)]);
    expect(registry.transportFor("CONNECTOR-1")).toBeDefined();
    const mappingArg = adapterMock.mock.calls[0]![0].mapping as typeof mapping;
    expect(mappingArg.target).toEqual({ host: "127.0.0.1", port: 15502 });
  });

  it("bmsTarget.host verilirse yalnızca host ezilir; port + mappings korunur", () => {
    const registry = new SimulatorRegistry({
      bmsTarget: { host: "field-device-service" },
    });
    registry.createFromConfigs([connectorConfig(dir)]);
    const mappingArg = adapterMock.mock.calls[0]![0].mapping as typeof mapping;
    expect(mappingArg.target).toEqual({ host: "field-device-service", port: 15502 });
    expect(mappingArg.intervalMs).toBe(5000);
  });

  it("bmsTarget.port verilirse yalnızca port ezilir", () => {
    const registry = new SimulatorRegistry({ bmsTarget: { port: 9999 } });
    registry.createFromConfigs([connectorConfig(dir)]);
    const mappingArg = adapterMock.mock.calls[0]![0].mapping as typeof mapping;
    expect(mappingArg.target).toEqual({ host: "127.0.0.1", port: 9999 });
  });

  it("diğer simülatör tipleri override'tan ETKİLENMEZ", () => {
    const registry = new SimulatorRegistry({ bmsTarget: { host: "x" } });
    const config = connectorConfig(dir) as unknown as {
      type: string;
      transport: { kind: string; type: string };
      deviceId: string;
    };
    config.type = "aux-analyser";
    config.transport = { kind: "simulator", type: "aux-analyser" };
    registry.createFromConfigs([config as unknown as DeviceConfigFile]);
    expect(registry.transportFor("CONNECTOR-1")).toBeDefined();
    expect(adapterMock).not.toHaveBeenCalled();
  });
});
