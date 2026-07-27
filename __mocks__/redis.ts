import { vi } from "vitest";

// ponytail: stub Redis client — expand when integration tests need it
export const createRedisClient = vi.fn();
export const Redis = vi.fn().mockImplementation(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
}));
