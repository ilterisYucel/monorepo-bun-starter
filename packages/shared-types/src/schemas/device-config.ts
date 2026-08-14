import { z } from "zod";

const byteOrderSchema = z.enum([
  "BIG_ENDIAN",
  "LITTLE_ENDIAN",
  "BIG_ENDIAN_SWAP",
  "LITTLE_ENDIAN_SWAP",
]);

const telemetryEntrySchema = z.object({
  protocol: z.enum(["MODBUS", "CANBUS", "MQTT"]),
  name: z.string().min(1),
  canonical: z
    .enum([
      "soc",
      "soh",
      "voltage",
      "current",
      "battery_ready",
      "charge_power",
      "discharge_power",
      "temperature",
    ])
    .optional(),
}).catchall(z.unknown());

const simulatorConfigSchema = z.object({
  type: z.enum(["bsc", "hvac", "xrack", "cb", "dc-output", "energy-analyzer", "pcs", "emu"]),
  rackCount: z.number().int().positive().optional(),
  registerMap: z.string().optional(),
  pcsCount: z.number().int().positive().optional(),
});

const deviceTransportConfigSchema = z.object({
  kind: z.enum(["tcp", "rtu", "simulator"]),
  type: z.string().min(1).optional(),
  rackCount: z.number().int().positive().optional(),
  registerMap: z.string().optional(),
  pcsCount: z.number().int().positive().optional(),
});

export const bitfieldFieldSchema = z.object({
  bitStart: z.number().int().min(0).max(15),
  bitEnd: z.number().int().min(0).max(15),
  name: z.string().min(1),
  dataTag: z.string().min(1),
  description: z.string(),
  label0: z.string().optional(),
  label1: z.string().optional(),
  unit: z.string(),
  scale: z.number().optional(),
  offset: z.number().optional(),
  alarmLimit: z.string().optional(),
  logType: z.enum(["error", "warning", "info"]).optional(),
  tags: z.record(z.string()).optional(),
  canonical: z
    .enum([
      "soc",
      "soh",
      "voltage",
      "current",
      "battery_ready",
      "charge_power",
      "discharge_power",
      "temperature",
    ])
    .optional(),
}).refine((f) => f.bitStart <= f.bitEnd, {
  message: "bitStart bitEnd'den küçük veya eşit olmalı",
});

export const bitfieldConfigSchema = z.object({
  registerAddress: z.number().int().positive(),
  registerType: z.enum(["INPUT_REGISTER", "HOLDING_REGISTER"]),
  fields: z.array(bitfieldFieldSchema).min(1),
  tags: z.record(z.string()).optional(),
});

export const deviceConfigFileSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1),
  manufacturer: z.string(),
  model: z.string(),
  protocol: z.enum(["MODBUS", "CANBUS", "MQTT"]),
  type: z.string().min(1).optional(),
  rackCount: z.number().int().positive().optional(),
  connection: z.record(z.unknown()),
  telemetry: z.array(telemetryEntrySchema).min(1),
  bitfieldConfigs: z.array(bitfieldConfigSchema).optional(),
  pollIntervalMs: z.number().int().positive().optional(),
  transport: deviceTransportConfigSchema.optional(),
});
