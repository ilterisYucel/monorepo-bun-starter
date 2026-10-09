import { z } from "zod";

const byteOrderSchema = z.enum([
  "BIG_ENDIAN",
  "LITTLE_ENDIAN",
  "BIG_ENDIAN_SWAP",
  "LITTLE_ENDIAN_SWAP",
]);

/** Ham değeri tam sayı olan MODBUS register türleri — `deadband: "auto"` (scale) bunlarda geçerli. */
const INTEGER_MODBUS_TYPES = new Set(["UINT16", "INT16", "UINT32", "INT32", "BOOL"]);

/**
 * Telemetri girdisi şeması.
 *
 * Yazma politikası (opt-in):
 * - `deadband`: mutlak değişim eşiği. Sayı ise **> 0**; `"auto"` yalnız ham değeri tam sayı olan
 *   girdilerde (MODBUS integer register türleri, CANBUS) geçerli — scale'dan türetilir.
 * - `maxStaleMs`: bayatlama sınırı (TTL). `deadband` tanımlıysa **zorunlu** (change-only'nin
 *   doğal-retry boşluğunu kapatır).
 */
const telemetryEntrySchema = z
  .object({
    protocol: z.enum(["MODBUS", "CANBUS", "MQTT"]),
    name: z.string().min(1),
    canonical: z.string().optional(),
    deadband: z.union([z.number().positive(), z.literal("auto")]).optional(),
    maxStaleMs: z.number().int().positive().optional(),
  })
  .catchall(z.unknown())
  .superRefine((data, ctx) => {
    if (data.deadband !== undefined && data.maxStaleMs === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "deadband tanımlıysa maxStaleMs zorunludur",
      });
    }
    if (data.deadband === "auto") {
      const dt = data.registerDataType;
      const ok =
        data.protocol === "CANBUS" ||
        (data.protocol === "MODBUS" &&
          typeof dt === "string" &&
          INTEGER_MODBUS_TYPES.has(dt));
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'deadband "auto" yalnız MODBUS integer register türlerinde (UINT16/INT16/UINT32/INT32/BOOL) ve CANBUS girdilerinde geçerlidir',
        });
      }
    }
  });

/** Telemetri listesi — name'ler cihaz içinde tekil olmalı (kimlik = name, K8). */
const telemetryListSchema = z
  .array(telemetryEntrySchema)
  .min(1)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    for (const [i, t] of list.entries()) {
      if (seen.has(t.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `telemetry name tekrarı: ${t.name}`,
          path: [i, "name"],
        });
      }
      seen.add(t.name);
    }
  });

const simulatorConfigSchema = z.object({
  type: z.enum(["bsc", "hvac", "xrack", "cb", "dc-output", "dc-meter", "energy-analyzer", "wattox-pcs"]),
  rackCount: z.number().int().positive().optional(),
  registerMap: z.string().optional(),
  pcsCount: z.number().int().positive().optional(),
});

const deviceTransportConfigSchema = z.object({
  kind: z.enum(["tcp", "rtu", "simulator"]),
  type: z.string().min(1).optional(),
  registerMap: z.string().optional(),
  pcsCount: z.number().int().positive().optional(),
  // Wattox PCS simülatörü BMS port sunucu portu (BSC-PCS-CONNECTOR-MIMARISI.md T-C2)
  bmsPort: z.number().int().positive().optional(),
});

const connectorDeviceSubsetSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  pollIntervalMs: z.number().int().positive().optional(),
  connection: z.record(z.unknown()),
  telemetry: telemetryListSchema,
});

const connectorSimSubsetSchema = z.object({
  registerMap: z.string().min(1),
  target: z
    .object({
      host: z.string().optional(),
      port: z.number().int().positive().optional(),
    })
    .optional(),
  intervalMs: z.number().int().positive().optional(),
});

const connectorConfigSchema = z.object({
  device: connectorDeviceSubsetSchema,
  sim: connectorSimSubsetSchema.optional(),
});

export const bitfieldFieldSchema = z.object({
  bitStart: z.number().int().min(0).max(15),
  bitEnd: z.number().int().min(0).max(15),
  name: z.string().min(1),
  description: z.string(),
  label0: z.string().optional(),
  label1: z.string().optional(),
  unit: z.string(),
  scale: z.number().optional(),
  offset: z.number().optional(),
  tags: z.record(z.string()).optional(),
  canonical: z.string().optional(),
}).refine((f) => f.bitStart <= f.bitEnd, {
  message: "bitStart bitEnd'den küçük veya eşit olmalı",
});

/** Cihaz alarm kuralı — telemetri adı referanslı, cihaz tipinden bağımsız. */
export const deviceAlarmRuleSchema = z.object({
  telemetry: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  description: z.string().optional(),
  activeLow: z.boolean().optional(),
});

export const bitfieldConfigSchema = z.object({
  registerAddress: z.number().int().positive(),
  registerType: z.enum(["INPUT_REGISTER", "HOLDING_REGISTER"]),
  fields: z.array(bitfieldFieldSchema).min(1),
  tags: z.record(z.string()).optional(),
});

export const deviceConfigFileSchema = z
  .object({
    deviceId: z.string().min(1),
    name: z.string().min(1),
    manufacturer: z.string(),
    model: z.string(),
    protocol: z.enum(["MODBUS", "CANBUS", "MQTT"]),
    type: z.string().min(1).optional(),
    details: z.record(z.unknown()).optional(),
    connection: z.record(z.unknown()),
    telemetry: telemetryListSchema,
    bitfieldConfigs: z.array(bitfieldConfigSchema).optional(),
    alarms: z.array(deviceAlarmRuleSchema).optional(),
    pollIntervalMs: z.number().int().positive().optional(),
    transport: deviceTransportConfigSchema.optional(),
    connector: connectorConfigSchema.optional(),
  })
  .superRefine((cfg, ctx) => {
    // Kimlik çakışması (K4, jenerik): ayrım tag'i OLMAYAN bitfield alanı register telemetri
    // adıyla çakışamaz (yalnız isme göre gruplanınca birleşirdi). Ayrım tag'i olan bloklar
    // çağıranın `tag` parametresiyle ayrılır — şema cihaza özgü tag adı BİLMEZ.
    const registerNames = new Set(cfg.telemetry.map((t) => t.name));
    const bitfields = cfg.bitfieldConfigs ?? [];
    for (const [bi, block] of bitfields.entries()) {
      const hasDiscriminator =
        block.tags !== undefined && Object.keys(block.tags).length > 0;
      if (hasDiscriminator) continue;
      for (const [fi, field] of block.fields.entries()) {
        if (registerNames.has(field.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `bitfield alanı register telemetri adıyla çakışıyor: ${field.name}`,
            path: ["bitfieldConfigs", bi, "fields", fi, "name"],
          });
        }
      }
    }
  });
