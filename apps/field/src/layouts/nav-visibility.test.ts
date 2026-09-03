import { describe, it, expect } from "vitest";
import type { Role } from "@gd-monorepo/shared-types";
import { visibleNavKeys, emergencyVisible, ALL_NAV_KEYS } from "./nav-visibility";

/**
 * nav-visibility sözleşmesi (2026-08-30):
 * - admin/teknik → tüm menü; boss → kontrol hariç; guest/developer → yalnız
 *   Panel. Acil durdurma yalnız admin/teknik.
 */

describe("visibleNavKeys", () => {
  it("admin ve teknik tüm menüyü görür", () => {
    for (const role of ["admin", "teknik"] as Role[]) {
      expect(visibleNavKeys(role)).toEqual(ALL_NAV_KEYS);
    }
  });

  it("boss kontrol hariç tüm menüyü görür", () => {
    const keys = visibleNavKeys("boss");
    expect(keys).not.toContain("nav.control");
    expect(keys).toContain("nav.containers");
    expect(keys).toContain("nav.pcs");
    expect(keys).toContain("nav.devices");
    expect(keys).toHaveLength(ALL_NAV_KEYS.length - 1);
  });

  it("guest ve developer yalnız Panel görür", () => {
    for (const role of ["guest", "developer"] as Role[]) {
      expect(visibleNavKeys(role)).toEqual(["nav.dashboard"]);
    }
  });
});

describe("emergencyVisible", () => {
  it("admin/teknik görür; boss/guest/developer görmez", () => {
    expect(emergencyVisible("admin")).toBe(true);
    expect(emergencyVisible("teknik")).toBe(true);
    expect(emergencyVisible("boss")).toBe(false);
    expect(emergencyVisible("guest")).toBe(false);
    expect(emergencyVisible("developer")).toBe(false);
  });
});
