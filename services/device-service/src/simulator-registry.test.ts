import { describe, it, expect } from "vitest";
import { SimulatorRegistry } from "./simulator-registry";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";

/**
 * SimulatorRegistry — sanal IO cihaz ailesi kayıtları (SANAL-IO-CIHAZ-AILESI-MIMARISI.md):
 * aux-analyser, fss, control-panel-io, imd config'de transport.kind === "simulator"
 * iken transport üretir; kayıtlı olmayan tip sessizce atlanır.
 */

function configWith(type: string): DeviceConfigFile {
  return {
    deviceId: `TEST-${type.toUpperCase()}-1`,
    name: "test",
    manufacturer: "Generic",
    model: "test",
    protocol: "MODBUS",
    type,
    connection: { host: "127.0.0.1", port: 502, slaveId: 1 },
    telemetry: [
      {
        name: "Status",
        protocol: "MODBUS",
        registerAddress: 0,
        registerTableType: "INPUT_REGISTER",
        registerDataType: "UINT16",
      },
    ],
    transport: { kind: "simulator", type },
  } as unknown as DeviceConfigFile;
}

describe("SimulatorRegistry — sanal IO cihaz ailesi", () => {
  it.each(["aux-analyser", "fss", "control-panel-io", "imd"])(
    "%s kayıtlıdır ve transport üretir",
    (type) => {
      const registry = new SimulatorRegistry();
      registry.createFromConfigs([configWith(type)]);
      expect(registry.transportFor(`TEST-${type.toUpperCase()}-1`)).toBeDefined();
    },
  );

  it("kayıtlı olmayan tip transport üretmez", () => {
    const registry = new SimulatorRegistry();
    registry.createFromConfigs([configWith("bilinmeyen-tip")]);
    expect(registry.count()).toBe(0);
  });

  it("simulator olmayan transport config'i yok sayılır", () => {
    const registry = new SimulatorRegistry();
    const config = configWith("aux-analyser");
    (config.transport as { kind: string }).kind = "tcp";
    registry.createFromConfigs([config]);
    expect(registry.count()).toBe(0);
  });
});
