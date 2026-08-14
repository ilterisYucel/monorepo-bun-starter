import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  IModbusSimulatorAdapter,
  ModbusTelemetryData,
  TelemetryData,
} from "@gd-monorepo/shared-types";
import { ModbusDevice } from "./device";
import type { ModbusDeviceConfig } from "./device";
import type { IModbusTransport } from "./transport/interface";

function mockTransport(adapter: IModbusSimulatorAdapter): IModbusTransport {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    reconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: () => true,
    readHoldingRegisters: (a, c) => adapter.readHoldingRegisters(a, c),
    writeHoldingRegisters: (a, v) => adapter.writeHoldingRegisters(a, v),
    readInputRegisters: (a, c) => adapter.readInputRegisters(a, c),
    readCoils: (a, c) => adapter.readCoils(a, c),
    writeCoils: (a, v) => adapter.writeMultipleCoils(a, v),
    readDiscreteInputs: (a, c) => adapter.readDiscreteInputs(a, c),
  };
}

function mockHoldingRegs(regs: Record<number, number>): IModbusSimulatorAdapter {
  return {
    readHoldingRegisters: vi.fn().mockImplementation(
      async (start: number, count: number) => {
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
          result.push(regs[start + i] ?? 0);
        }
        return result;
      },
    ),
    writeHoldingRegister: vi.fn().mockImplementation(
      async (address: number, value: number) => {
        regs[address] = value;
      },
    ),
    writeHoldingRegisters: vi.fn().mockImplementation(
      async (address: number, values: number[]) => {
        for (let i = 0; i < values.length; i++) {
          regs[address + i] = values[i] as number;
        }
      },
    ),
    readInputRegisters: vi.fn().mockImplementation(
      async (start: number, count: number) => {
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
          result.push(regs[start + i] ?? 0);
        }
        return result;
      },
    ),
    readInputRegister: vi.fn().mockImplementation(
      async (address: number) => regs[address] ?? 0,
    ),
    readHoldingRegister: vi.fn().mockImplementation(
      async (address: number) => regs[address] ?? 0,
    ),
    readCoil: vi.fn().mockResolvedValue(false),
    readCoils: vi.fn().mockResolvedValue([]),
    writeCoil: vi.fn().mockResolvedValue(undefined),
    writeMultipleCoils: vi.fn().mockResolvedValue(undefined),
    readDiscreteInput: vi.fn().mockResolvedValue(false),
    readDiscreteInputs: vi.fn().mockResolvedValue([]),
  };
}

function makeTelemetry(
  overrides: Partial<ModbusTelemetryData> & { name: string },
): ModbusTelemetryData {
  return {
    protocol: "MODBUS",
    name: overrides.name,
    description: overrides.description ?? `Description for ${overrides.name}`,
    unit: overrides.unit ?? "",
    value: overrides.value ?? 0,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    deviceId: overrides.deviceId ?? "test-device",
    registerAddress: overrides.registerAddress ?? 30001,
    registerTableType: overrides.registerTableType ?? "INPUT_REGISTER",
    registerDataType: overrides.registerDataType ?? "UINT16",
    scale: overrides.scale ?? 1,
    offset: overrides.offset ?? 0,
    byteOrder: overrides.byteOrder ?? "BIG_ENDIAN",
    priority: overrides.priority ?? 1,
  };
}

function makeConfig(
  overrides: Partial<ModbusDeviceConfig>,
): ModbusDeviceConfig {
  return {
    id: overrides.id ?? "test",
    name: overrides.name ?? "Test Device",
    manufacturer: overrides.manufacturer ?? "TestCorp",
    model: overrides.model ?? "Test-100",
    connection: overrides.connection ?? { host: "127.0.0.1", port: 502 },
    telemetryList: overrides.telemetryList ?? [],
  };
}

describe("ModbusDevice (with mock adapter)", () => {
  let regs: Record<number, number>;
  let adapter: IModbusSimulatorAdapter;

  beforeEach(() => {
    regs = {};
    adapter = mockHoldingRegs(regs);
  });

  describe("read()", () => {
    it("reads single UINT16 from input register", async () => {
      regs[30001] = 2305;
      const config = makeConfig({
        id: "bsc-1",
        telemetryList: [
          makeTelemetry({
            name: "Voltage",
            registerAddress: 30001,
            registerTableType: "INPUT_REGISTER",
            registerDataType: "UINT16",
            scale: 0.1,
            unit: "V",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      const results = await device.read();
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("Voltage");
      expect(results[0]?.value).toBeCloseTo(230.5, 1);
      expect(results[0]?.unit).toBe("V");
    });

    it("reads multiple telemetry values", async () => {
      regs[30001] = 2305; // voltage: 230.5V
      regs[30002] = 150; // current: 1.50A
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Voltage",
            registerAddress: 30001,
            registerTableType: "INPUT_REGISTER",
            registerDataType: "UINT16",
            scale: 0.1,
            unit: "V",
            priority: 1,
          }),
          makeTelemetry({
            name: "Current",
            registerAddress: 30002,
            registerTableType: "INPUT_REGISTER",
            registerDataType: "UINT16",
            scale: 0.01,
            unit: "A",
            priority: 1,
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      const results = await device.read();
      expect(results).toHaveLength(2);
      const names = results.map((r) => r.name);
      expect(names).toContain("Voltage");
      expect(names).toContain("Current");
    });

    it("reads INT32 across two registers with scale", async () => {
      // Power: 50000W represented as INT32 = 50000 decimal
      // Two registers: high bits
      // 50000 = 0x0000C350, so reg[40001]=0x0000, reg[40002]=0xC350
      regs[40001] = 0x0000;
      regs[40002] = 0xC350;
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Power",
            registerAddress: 40001,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "INT32",
            scale: 1,
            unit: "W",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      const results = await device.read();
      expect(results).toHaveLength(1);
      expect(results[0]?.value).toBe(50000);
    });

    it("reads FLOAT32 from two holding registers", async () => {
      // 230.5V as FLOAT32 = 0x43668000
      regs[40001] = 0x4366;
      regs[40002] = 0x8000;
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Voltage",
            registerAddress: 40001,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "FLOAT32",
            scale: 1,
            unit: "V",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      const results = await device.read();
      expect(results).toHaveLength(1);
      expect((results[0]?.value as number)).toBeCloseTo(230.5, 1);
    });

    it("reads from specific telemetry names only", async () => {
      regs[30001] = 2305;
      regs[30002] = 150;
      const voltageEntry = makeTelemetry({
        name: "Voltage",
        registerAddress: 30001,
        registerTableType: "INPUT_REGISTER",
        registerDataType: "UINT16",
        scale: 0.1,
        unit: "V",
        priority: 1,
      });
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          voltageEntry,
          makeTelemetry({
            name: "Current",
            registerAddress: 30002,
            registerTableType: "INPUT_REGISTER",
            registerDataType: "UINT16",
            scale: 0.01,
            unit: "A",
            priority: 1,
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      const results = await device.read([
        {
          ...voltageEntry,
          deviceId: "dev-1",
          description: "",
          value: 0,
          timestamp: new Date().toISOString(),
        },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("Voltage");
    });
  });

  describe("write()", () => {
    it("writes single UINT16 to holding register", async () => {
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Setpoint",
            registerAddress: 40010,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "UINT16",
            scale: 1,
            unit: "",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      await device.write([
        {
          ...makeTelemetry({ name: "Setpoint" }),
          value: 100,
          deviceId: "dev-1",
        },
      ]);
      expect(regs[40010]).toBe(100);
    });

    it("writes UINT32 across two registers", async () => {
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Energy",
            registerAddress: 40050,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "UINT32",
            scale: 1,
            unit: "kWh",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      await device.write([
        {
          ...makeTelemetry({ name: "Energy" }),
          value: 1234567,
          deviceId: "dev-1",
        },
      ]);
      // UINT32 = 1234567 = 0x0012D687
      expect(regs[40050]).toBe(0x0012);
      expect(regs[40051]).toBe(0xD687);
    });

    it("writes with scaled value (reverse scale)", async () => {
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Setpoint",
            registerAddress: 40010,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "UINT16",
            scale: 0.1,
            unit: "V",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      await device.write([
        {
          ...makeTelemetry({ name: "Setpoint" }),
          value: 230.5,
          deviceId: "dev-1",
        },
      ]);
      expect(regs[40010]).toBe(2305);
    });
  });

  describe("writeAtomic()", () => {
    it("writes values atomically (read-backup then write)", async () => {
      regs[40010] = 50; // existing value
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Setpoint",
            registerAddress: 40010,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "UINT16",
            scale: 1,
            unit: "",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      await device.writeAtomic([
        {
          ...makeTelemetry({ name: "Setpoint" }),
          value: 100,
          deviceId: "dev-1",
        },
      ]);
      expect(regs[40010]).toBe(100);
    });

    it("rolls back on write failure", async () => {
      regs[40010] = 50;
      const config = makeConfig({
        id: "dev-1",
        telemetryList: [
          makeTelemetry({
            name: "Setpoint",
            registerAddress: 40010,
            registerTableType: "HOLDING_REGISTER",
            registerDataType: "UINT16",
            scale: 1,
            unit: "",
          }),
        ],
      });
      const device = new ModbusDevice(config, mockTransport(adapter));
      // Make write fail after the first call
      (adapter.writeHoldingRegisters as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Write failed"));

      await expect(
        device.writeAtomic([
          {
            ...makeTelemetry({ name: "Setpoint" }),
            value: 100,
            deviceId: "dev-1",
          },
        ]),
      ).rejects.toThrow("Write failed");
      // Value should be rolled back to 50
      expect(regs[40010]).toBe(50);
    });
  });

  describe("id", () => {
    it("returns the configured device id", () => {
      const config = makeConfig({ id: "bsc-rack-3" });
      const device = new ModbusDevice(config, mockTransport(adapter));
      expect(device.id).toBe("bsc-rack-3");
    });
  });

  describe("simulator mode", () => {
    it("uses adapter when provided (no real client)", () => {
      const config = makeConfig({ id: "sim-1" });
      const device = new ModbusDevice(config, mockTransport(adapter));
      expect(device.id).toBe("sim-1");
    });

    it("does not throw on connect in simulator mode", async () => {
      const device = new ModbusDevice(makeConfig({}), mockTransport(adapter));
      await expect(device.connect()).resolves.toBeUndefined();
    });
  });
});
