import { z } from "zod";

export const redisConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  password: z.string().optional(),
  db: z.number().int().min(0).optional(),
});

export const postgresConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  ssl: z.boolean().optional(),
  maxConnections: z.number().int().positive().optional(),
});

export const serviceConfigFileSchema = z.object({
  redis: redisConfigSchema,
  postgresql: postgresConfigSchema.optional(),
  servicePollIntervalMs: z.number().int().positive().optional(),
  workerConcurrency: z.number().int().positive().optional(),
  managementIntervalMs: z.number().int().positive().optional(),
});
