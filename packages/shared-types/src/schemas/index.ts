import { z } from "zod";

export {
  deviceConfigFileSchema,
  bitfieldConfigSchema,
  bitfieldFieldSchema,
} from "./device-config";

export {
  serviceConfigFileSchema,
  redisConfigSchema,
  postgresConfigSchema,
} from "./service-config";

export {
  serverConfigSchema,
  authConfigSchema,
} from "./server-config";

export function validateOrThrow<T>(
  schema: z.ZodSchema,
  data: unknown,
  label: string,
): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data as unknown as T;
  const formatted = result.error.flatten();
  throw new Error(
    `[Validation] ${label} gecersiz:\n${JSON.stringify(formatted, null, 2)}`,
  );
}
