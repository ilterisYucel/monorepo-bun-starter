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
      tags: { area: "rack1" },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.label0).toBe("Off");
      expect(r.data.tags).toEqual({ area: "rack1" });
    }
  });

  it("logType artık şemada yok (T0.11) — bilinmeyen anahtar strip edilir", () => {
    const r = bitfieldFieldSchema.safeParse({ ...validField, logType: "warning" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("logType" in r.data).toBe(false);
    }
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
    for (const t of ["bsc", "hvac", "xrack", "cb", "dc-output", "dc-meter", "pcs", "gelecekteki-tip"]) {
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

describe("deviceConfigFileSchema — details (REV.01)", () => {
  const base = {
    deviceId: "bsc-1",
    name: "BSC",
    manufacturer: "X",
    model: "Y",
    protocol: "MODBUS" as const,
    connection: { host: "127.0.0.1", port: 15501 },
    telemetry: [{ name: "Voltage", protocol: "MODBUS" as const }],
  };

  it("accepts and preserves opaque details", () => {
    const r = deviceConfigFileSchema.safeParse({
      ...base,
      details: { rackCount: 8, vendor: "acme" },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.details).toEqual({ rackCount: 8, vendor: "acme" });
  });

  it("top-level rackCount artık şemada yok — strip edilir", () => {
    const r = deviceConfigFileSchema.safeParse({ ...base, rackCount: 8 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("rackCount" in r.data).toBe(false);
      expect(r.data.details).toBeUndefined();
    }
  });

  it("details opsiyoneldir", () => {
    const r = deviceConfigFileSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.details).toBeUndefined();
  });
});

describe("deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)", () => {
  const baseDevice = (telemetry: unknown[]) => ({
    deviceId: "bsc-1",
    name: "BSC",
    manufacturer: "X",
    model: "Y",
    protocol: "MODBUS" as const,
    connection: { host: "127.0.0.1", port: 15501 },
    telemetry,
  });

  const intEntry = (extra: Record<string, unknown> = {}) => ({
    protocol: "MODBUS",
    name: "SOC",
    registerAddress: 30055,
    registerTableType: "INPUT_REGISTER",
    registerDataType: "UINT16",
    scale: 0.01,
    offset: 0,
    byteOrder: "BIG_ENDIAN",
    priority: 0,
    description: "SOC",
    unit: "%",
    ...extra,
  });

  it("deadband (pozitif) + maxStaleMs kabul edilir", () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([intEntry({ deadband: 0.5, maxStaleMs: 60000 })]),
    );
    expect(r.success).toBe(true);
  });

  it("deadband: 0 reddedilir (pozitif zorunlu)", () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([intEntry({ deadband: 0, maxStaleMs: 60000 })]),
    );
    expect(r.success).toBe(false);
  });

  it("negatif deadband reddedilir", () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([intEntry({ deadband: -1, maxStaleMs: 60000 })]),
    );
    expect(r.success).toBe(false);
  });

  it("deadband tanımlı ama maxStaleMs yok → fail-fast", () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([intEntry({ deadband: 0.5 })]),
    );
    expect(r.success).toBe(false);
  });

  it("maxStaleMs tek başına kabul edilir (deadband yok — no-op)", () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([intEntry({ maxStaleMs: 60000 })]),
    );
    expect(r.success).toBe(true);
  });

  it('"auto" integer register türünde kabul edilir', () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([intEntry({ deadband: "auto", maxStaleMs: 60000 })]),
    );
    expect(r.success).toBe(true);
  });

  it('"auto" FLOAT32 türünde reddedilir', () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([
        intEntry({
          registerDataType: "FLOAT32",
          deadband: "auto",
          maxStaleMs: 60000,
        }),
      ]),
    );
    expect(r.success).toBe(false);
  });

  it('"auto" MQTT protokolünde reddedilir', () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([
        { protocol: "MQTT", name: "x", deadband: "auto", maxStaleMs: 60000 },
      ]),
    );
    expect(r.success).toBe(false);
  });

  it("politika alanları yoksa kabul edilir (always-write)", () => {
    const r = deviceConfigFileSchema.safeParse(baseDevice([intEntry()]));
    expect(r.success).toBe(true);
  });

  it("aynı name iki kez → fail-fast", () => {
    const r = deviceConfigFileSchema.safeParse(
      baseDevice([
        intEntry({ name: "SOC" }),
        intEntry({ name: "SOC", registerAddress: 30056 }),
      ]),
    );
    expect(r.success).toBe(false);
  });
});
