import { describe, expect, it } from "vitest";
import { RADIUS } from "./radius";
import { ELEVATION } from "./elevation";
import { SPACING } from "./spacing";

describe("sistem token'ları", () => {
  it("radius beş değer: 6/8/12/16/pill", () => {
    expect(RADIUS).toEqual({ sm: 6, md: 8, lg: 12, xl: 16, pill: 999 });
  });

  it("spacing 2/4/8/12/16/24/32", () => {
    expect(SPACING).toEqual({ xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });
  });

  it("gölgeler #0F1A33 tabanlı ve beş kademeli", () => {
    expect(Object.values(ELEVATION)).toHaveLength(5);
    for (const shadow of Object.values(ELEVATION)) {
      expect(shadow).toContain("rgba(15, 26, 51");
    }
    expect(ELEVATION.small).toBe("0 1px 3px rgba(15, 26, 51, 0.10)");
    expect(ELEVATION.drawer).toBe("-12px 0 40px rgba(15, 26, 51, 0.20)");
  });
});
