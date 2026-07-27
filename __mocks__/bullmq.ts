import { vi } from "vitest";

// ponytail: stub BullMQ Queue and Worker — expand when integration tests need them
export const Queue = vi.fn().mockImplementation(() => ({
  add: vi.fn().mockResolvedValue({ id: "mock-job-1" }),
  close: vi.fn().mockResolvedValue(undefined),
  getJob: vi.fn().mockResolvedValue(null),
}));

export const Worker = vi.fn().mockImplementation(() => ({
  close: vi.fn().mockResolvedValue(undefined),
}));

export const QueueEvents = vi.fn().mockImplementation(() => ({
  close: vi.fn().mockResolvedValue(undefined),
}));
