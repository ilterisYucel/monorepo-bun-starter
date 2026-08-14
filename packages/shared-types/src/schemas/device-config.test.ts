import { describe, it, expect } from "vitest";
import {
  bitfieldFieldSchema,
  bitfieldConfigSchema,
  deviceConfigFileSchema,
} from "./device-config";

describe("bitfieldFieldSchema", () => {
  const validField = {
    bitStart: 0,
    bitEnd: 3,
    name: "status",
    dataTag: "status_tag",
    description: "Status bits",
    unit: "",
  };

  it("accepts valid input", () => {
    expect(() => bitfieldFieldSchema.parse(validField)).not.toThrow();
  });

  it("rejects bitStart > bitEnd", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, bitStart: 5, bitEnd: 2 });
    expect(r.success).toBe(false);
  });

  it("rejects bitStart > 15", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, bitStart: 16, bitEnd: 16 });
    expect(r.success).toBe(false);
  });

  it("rejects empty name", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, name: "" });
    expect(r.success).toBe(false);
  });

  it("accepts optional fields omitted", () => {
    const r = bitfieldFieldSchema.safeParse(validField);
    expect(r.success).toBe(true);
  });

  it("accepts with all optional fields", () => {
    const r = bitfieldFieldSchema.safeParse({
      ...validField,
      label0: "Off",
      label1: "On",
      scale: 0.5,
      offset: 10,
      logType: "warning",
      tags: { area: "rack1" },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.label0).toBe("Off");
      expect(r.data.tags).toEqual({ area: "rack1" });
    }
  });

  it("rejects invalid logType", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, logType: "fatal" });
    expect(r.success).toBe(false);
  });
});

describe("bitfieldConfigSchema", () => {
  it("accepts valid config", () => {
    const r = bitfieldConfigSchema.safeParse({
      registerAddress: 30050,
      registerType: "INPUT_REGISTER",
      fields: [
        {
          bitStart: 0,
          bitEnd: 7,
          name: "errors",
          dataTag: "err",
          description: "Error flags",
          unit: "",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty fields array", () => {
    const r = bitfieldConfigSchema.safeParse({
      registerAddress: 1,
      registerType: "HOLDING_REGISTER",
      fields: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid registerType", () => {
    const r = bitfieldConfigSchema.safeParse({
      registerAddress: 1,
      registerType: "COIL",
      fields: [
        {
          bitStart: 0,
          bitEnd: 1,
          name: "x",
          dataTag: "x",
          description: "x",
          unit: "",
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("deviceConfigFileSchema", () => {
  const validDevice = {
    deviceId: "bsc-1",
    name: "BSC Rack 1",
    manufacturer: "Tesla",
    model: "Megapack",
    protocol: "MODBUS",
    connection: { host: "10.0.0.1", port: 502 },
    telemetry: [
      {
        name: "Voltage",
        protocol: "MODBUS",
        registerAddress: 30001,
        registerTableType: "INPUT_REGISTER",
        registerDataType: "UINT16",
        scale: 0.1,
        offset: 0,
        byteOrder: "BIG_ENDIAN",
        priority: 1,
        description: "Battery voltage",
        unit: "V",
      },
    ],
  };

  it("accepts valid device config without optional fields", () => {
    expect(() => deviceConfigFileSchema.parse(validDevice)).not.toThrow();
  });

  it("accepts config with optional fields", () => {
    const withOpt = {
      ...validDevice,
      pollIntervalMs: 5000,
      simulator: { type: "bsc" },
      bitfieldConfigs: [
        {
          registerAddress: 30050,
          registerType: "INPUT_REGISTER",
          fields: [
            {
              bitStart: 0,
              bitEnd: 7,
              name: "status",
              dataTag: "status",
              description: "Status bits",
              unit: "",
            },
          ],
        },
      ],
    };
    expect(() => deviceConfigFileSchema.parse(withOpt)).not.toThrow();
  });

  it("rejects empty deviceId", () => {
    const r = deviceConfigFileSchema.safeParse({ ...validDevice, deviceId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty telemetry array", () => {
    const r = deviceConfigFileSchema.safeParse({ ...validDevice, telemetry: [] });
    expect(r.success).toBe(false);
  });

  it("rejects invalid protocol", () => {
    const r = deviceConfigFileSchema.safeParse({
      ...validDevice,
      protocol: "HTTP",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid transport kind", () => {
    const r = deviceConfigFileSchema.safeParse({
      ...validDevice,
      transport: { kind: "teleport" },
    });
    expect(r.success).toBe(false);
  });

  it("accepts simulator transport (tip açık string — kayıt defteri çalışma zamanında doğrular)", () => {
    for (const t of ["bsc", "hvac", "xrack", "cb", "dc-output", "pcs", "emu", "gelecekteki-tip"]) {
      const r = deviceConfigFileSchema.safeParse({
        ...validDevice,
        transport: { kind: "simulator", type: t },
      });
      expect(r.success).toBe(true);
    }
  });

  it("accepts tcp and rtu transport kinds", () => {
    for (const kind of ["tcp", "rtu"]) {
      const r = deviceConfigFileSchema.safeParse({
        ...validDevice,
        transport: { kind },
      });
      expect(r.success).toBe(true);
    }
  });
});
