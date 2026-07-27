import { describe, it, expect } from "vitest";

// ponytail: verify device-library exports work
describe("device-library", () => {
  it("exports device types", async () => {
    const lib = await import("@gd-monorepo/device-library");
    expect(lib).toBeDefined();
  });
});
