import { describe, it, expect } from "vitest";
import { DeviceFactory } from "./device-factory";
import { SimulatorRegistry } from "./simulator-registry";
import type { DeviceConfigFile, ModbusTelemetryData } from "@gd-monorepo/shared-types";

function makeConfig(overrides: Partial<DeviceConfigFile>): DeviceConfigFile {
  const telemetry = [
    {
      protocol: "MODBUS",
      name: "Reg",
      registerAddress: 1,
      registerTableType: "INPUT_REGISTER",
      registerDataType: "UINT16",
      scale: 1,
      offset: 0,
      byteOrder: "BIG_ENDIAN",
      priority: 0,
    } as ModbusTelemetryData,
  ];

  return {
    deviceId: "TEST-1",
    name: "Test",
    manufacturer: "Test",
    model: "Test",
    protocol: "MODBUS",
    type: "test",
    connection: { host: "127.0.0.1", port: 5599, slaveId: 1 },
    telemetry: telemetry as DeviceConfigFile["telemetry"],
    ...overrides,
  };
}

describe("DeviceFactory — transport seçimi (Strategy)", () => {
  it("simulator transport'lu config, kayıtlı simülatör transport'uyla cihaz üretir", () => {
    const registry = new SimulatorRegistry();
    const config = makeConfig({
      deviceId: "PCS-1",
      transport: { kind: "simulator", type: "pcs" },
    });
    registry.createFromConfigs([config]);

    const factory = new DeviceFactory(registry);
    const device = factory.create(config);

    expect(device.id).toBe("PCS-1");
  });

  it("bilinmeyen simulator tipi cihaz üretimini engellemez (varsayılan TCP)", () => {
    const registry = new SimulatorRegistry();
    const config = makeConfig({
      deviceId: "X-1",
      transport: { kind: "simulator", type: "bilinmeyen-tip" },
    });
    registry.createFromConfigs([config]);

    const factory = new DeviceFactory(registry);
    const device = factory.create(config);

    expect(device.id).toBe("X-1");
  });

  it("transport olmayan config varsayılan TCP ile çalışır", () => {
    const factory = new DeviceFactory(new SimulatorRegistry());
    const device = factory.create(makeConfig({ deviceId: "BSC-1" }));
    expect(device.id).toBe("BSC-1");
  });

  it("rtu transport'lu config cihaz üretir (bağlantı kurmaz)", () => {
    const factory = new DeviceFactory(new SimulatorRegistry());
    const device = factory.create(
      makeConfig({
        deviceId: "PM-1",
        transport: { kind: "rtu" },
        connection: { path: "/dev/ttyUSB0", baudRate: 19200, slaveId: 1 },
      }),
    );
    expect(device.id).toBe("PM-1");
  });

  it("canonical alanı tags.canonical olarak taşınır (AGENTS MANDATORY sözleşmesi)", async () => {
    const registry = new SimulatorRegistry();
    const config = makeConfig({
      deviceId: "BSC-CANON",
      transport: { kind: "simulator", type: "pcs" },
      telemetry: [
        {
          protocol: "MODBUS",
          name: "SocVoltaj",
          canonical: "voltage",
          registerAddress: 1,
          registerTableType: "INPUT_REGISTER",
          registerDataType: "UINT16",
          scale: 1,
          offset: 0,
          byteOrder: "BIG_ENDIAN",
          priority: 0,
        },
      ] as DeviceConfigFile["telemetry"],
    });
    registry.createFromConfigs([config]);
    const factory = new DeviceFactory(registry);
    const device = factory.create(config);

    // Simulator transport'lu cihaz read() edilebilir — config telemetrileri
    // tags.canonical ile döner (canonical'sız satırda alan YOKTUR).
    const results = await device.read();
    const canonicalRow = results.find((t) => t.name === "SocVoltaj");
    expect(canonicalRow?.tags?.canonical).toBe("voltage");
  });

  it("canonical verilmeyen telemetride tags.canonical YOKTUR", async () => {
    const registry = new SimulatorRegistry();
    const config = makeConfig({
      deviceId: "BSC-NOCANON",
      transport: { kind: "simulator", type: "pcs" },
    });
    registry.createFromConfigs([config]);
    const factory = new DeviceFactory(registry);
    const device = factory.create(config);

    const results = await device.read();
    const row = results.find((t) => t.name === "Reg");
    expect(row?.tags?.canonical).toBeUndefined();
  });
});
