// Shared mock utilities for package tests
// ponytail: minimal mocks — expand per-package when needed

export function mockConsole() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  } as unknown as Console;
}

export function createMockConfig<T extends Record<string, unknown>>(
  overrides?: Partial<T>,
): T {
  return { ...overrides } as T;
}
