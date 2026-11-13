import { describe, it, expect, afterEach } from "vitest";
import { createServer } from "node:net";
import type { Server, Socket } from "node:net";
import { DeviceFactory } from "./device-factory";
import type { DeviceConfigFile, ModbusTelemetryData } from "@gd-monorepo/shared-types";

/** Config girdisi (runtime value/timestamp/deviceId hariç) — literal'ların
 *  bağlamsal tiplemesi için concrete Modbus tipi. */
type ModbusConfigEntry = Omit<ModbusTelemetryData, "value" | "timestamp" | "deviceId">;

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

/**
 * Minimal Modbus TCP sunucusu (yalnız FC03/FC04) — device-service testlerinin
 * simülatör paketine bağımlı olmaması için (SPEC DEVICE-SERVICE-SADELESTIRME K1).
 */
class FakeModbusServer {
  private server: Server | undefined;
  private readonly registers: number[];

  constructor(registers: number[]) {
    this.registers = registers;
  }

  async start(): Promise<number> {
    this.server = createServer((socket: Socket) => {
      socket.on("data", (buf: Buffer) => {
        const fc = buf[7] ?? 0;
        if (fc !== 3 && fc !== 4) return;
        const unitId = buf[6] ?? 0;
        const start = buf.readUInt16BE(8);
        const qty = buf.readUInt16BE(10);
        const values = Array.from({ length: qty }, (_, i) => this.registers[start + i] ?? 0);
        const response = Buffer.alloc(9 + values.length * 2);
        buf.copy(response, 0, 0, 2); // transaction id
        response.writeUInt16BE(0, 2); // protocol id
        response.writeUInt16BE(3 + values.length * 2, 4); // length
        response[6] = unitId;
        response[7] = fc;
        response[8] = values.length * 2;
        values.forEach((value, i) => response.writeUInt16BE(value, 9 + i * 2));
        socket.write(response);
      });
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });
    return (this.server!.address() as { port: number }).port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (server === undefined) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

let sim: FakeModbusServer | undefined;

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

  it("canonical alanı tags.canonical olarak taşınır (AGENTS MANDATORY sözleşmesi)", async () => {
    sim = new FakeModbusServer([42]);
    const port = await sim.start();

    const config = makeConfig({
      deviceId: "METER-CANON",
      connection: { host: "127.0.0.1", port, slaveId: 1 },
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
      ] as Array<ModbusConfigEntry & { canonical?: string }>,
    });

    const device = new DeviceFactory().create(config);
    await device.connect();
    try {
      const results = await device.read();
      const canonicalRow = results.find((t) => t.name === "SocVoltaj");
      expect(canonicalRow?.tags?.canonical).toBe("voltage");
      expect(Number(canonicalRow?.value)).toBe(42);
    } finally {
      await device.disconnect();
    }
  });

  it("canonical verilmeyen telemetride tags.canonical YOKTUR", async () => {
    sim = new FakeModbusServer([1]);
    const port = await sim.start();

    const config = makeConfig({
      deviceId: "METER-NOCANON",
      connection: { host: "127.0.0.1", port, slaveId: 1 },
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
          ] as ModbusConfigEntry[],
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
