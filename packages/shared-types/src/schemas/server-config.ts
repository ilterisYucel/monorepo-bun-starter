import { z } from "zod";

export const authConfigSchema = z.object({
  jwtSecret: z.string().min(16),
  accessTokenExpirySeconds: z.number().int().positive(),
  refreshTokenExpirySeconds: z.number().int().positive(),
});

export const serverConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().min(1),
});
