import { describe, it, expect, afterEach } from "vitest";
import { DeviceFactory } from "./device-factory";
import { DcMeterSimulator } from "@gd-monorepo/simulators";
import type { DeviceConfigFile, ModbusTelemetryData } from "@gd-monorepo/shared-types";

function makeConfig(overrides: Partial<DeviceConfigFile>): DeviceConfigFile {
  const telemetry = [
    {
      protocol: "MODBUS",
      name: "Reg",
      registerAddress: 0,
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

let sim: DcMeterSimulator | undefined;

afterEach(async () => {
  await sim?.stop();
  sim = undefined;
});

describe("DeviceFactory — transport seçimi (yalnız TCP/RTU)", () => {
  it("transport olmayan config varsayılan TCP ile çalışır", () => {
    const device = new DeviceFactory().create(makeConfig({ deviceId: "BSC-1" }));
    expect(device.id).toBe("BSC-1");
  });

  it("rtu transport'lu config cihaz üretir (bağlantı kurmaz)", () => {
    const device = new DeviceFactory().create(
      makeConfig({
        deviceId: "PM-1",
        transport: { kind: "rtu" },
        connection: { path: "/dev/ttyUSB0", baudRate: 19200, slaveId: 1 },
      }),
    );
    expect(device.id).toBe("PM-1");
  });

  it("kind:'simulator' config yine TCP cihaz üretir (simulator dalı YOK)", () => {
    const device = new DeviceFactory().create(
      makeConfig({ deviceId: "PCS-1", transport: { kind: "simulator", type: "imd" } }),
    );
    expect(device.id).toBe("PCS-1");
  });

  it("canonical alanı tags.canonical olarak taşınır (AGENTS MANDATORY sözleşmesi)", async () => {
    sim = new DcMeterSimulator({ network: { host: "127.0.0.1", port: 0 } });
    await sim.start();

    const config = makeConfig({
      deviceId: "METER-CANON",
      connection: { host: "127.0.0.1", port: sim.port(), slaveId: 1 },
      telemetry: [
        {
          protocol: "MODBUS",
          name: "SocVoltaj",
          canonical: "voltage",
          registerAddress: 0,
          registerTableType: "INPUT_REGISTER",
          registerDataType: "UINT16",
          scale: 1,
          offset: 0,
          byteOrder: "BIG_ENDIAN",
          priority: 0,
        },
      ] as DeviceConfigFile["telemetry"],
    });

    const device = new DeviceFactory().create(config);
    await device.connect();
    try {
      const results = await device.read();
      const canonicalRow = results.find((t) => t.name === "SocVoltaj");
      expect(canonicalRow?.tags?.canonical).toBe("voltage");
    } finally {
      await device.disconnect();
    }
  });

  it("canonical verilmeyen telemetride tags.canonical YOKTUR", async () => {
    sim = new DcMeterSimulator({ network: { host: "127.0.0.1", port: 0 } });
    await sim.start();

    const config = makeConfig({
      deviceId: "METER-NOCANON",
      connection: { host: "127.0.0.1", port: sim.port(), slaveId: 1 },
    });

    const device = new DeviceFactory().create(config);
    await device.connect();
    try {
      const results = await device.read();
      const row = results.find((t) => t.name === "Reg");
      expect(row?.tags?.canonical).toBeUndefined();
    } finally {
      await device.disconnect();
    }
  });
});

describe("DeviceFactory — connector device-subset türetimi", () => {
  it("connector bölümü varsa 2. MODBUS cihazı üretir", () => {
    const config = makeConfig({
      deviceId: "BSC-1",
      connector: {
        device: {
          deviceId: "BSC-PCS-CONNECTOR-1",
          name: "Connector",
          type: "bsc-pcs-connector",
          connection: { host: "127.0.0.1", port: 15505, slaveId: 1 },
          telemetry: [
            {
              protocol: "MODBUS",
              name: "Connector Link Status",
              registerAddress: 0,
              registerTableType: "INPUT_REGISTER",
              registerDataType: "UINT16",
              scale: 1,
              offset: 0,
              byteOrder: "BIG_ENDIAN",
              priority: 0,
            },
          ] as DeviceConfigFile["telemetry"],
        },
      },
    });

    const device = new DeviceFactory().createConnector(config);

    expect(device?.id).toBe("BSC-PCS-CONNECTOR-1");
  });

  it("connector bölümü yoksa undefined döner", () => {
    expect(new DeviceFactory().createConnector(makeConfig({}))).toBeUndefined();
  });
});
