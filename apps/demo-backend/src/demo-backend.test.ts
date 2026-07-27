import { describe, it, expect } from "vitest";

describe("demo-backend", () => {
  it("exports application modules", async () => {
    // ponytail: verify app source compiles and exports
    const mod = await import("./application/device-job-handler");
    expect(mod.DeviceJobHandler).toBeDefined();
  });
});
