import { vi } from "vitest";

// ponytail: stub pg Pool — expand when integration tests need it
export const Pool = vi.fn().mockImplementation(() => ({
  connect: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  end: vi.fn().mockResolvedValue(undefined),
}));
