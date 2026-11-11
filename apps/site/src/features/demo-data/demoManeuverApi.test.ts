import { describe, it, expect } from "vitest";
import { DEMO_CATALOG_NAMES, scopeToDeviceIds } from "./demoManeuverApi";

describe("demoManeuverApi (UC-7, FR-7.1)", () => {
  it("FL-01…FL-05 kayıtları demo kataloğunda listelenir", () => {
    for (const name of [
      "fl01_startup",
      "fl01_shutdown",
      "fl03_idle",
      "fl04_calibration",
      "fl05_emergency_stop",
    ]) {
      expect(DEMO_CATALOG_NAMES).toContain(name);
    }
  });

  it("kapsam gerçek PCS cihaz setine indirgenir", () => {
    expect(scopeToDeviceIds([1, 2, 3])).toEqual(["PCS-1", "PCS-2"]);
  });
});
