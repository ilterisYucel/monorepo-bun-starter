import { describe, expect, it } from "vitest";
import { FONT_FAMILY, TYPE } from "./scale";

describe("tipografi ölçeği", () => {
  it("IBM Plex Sans tek font ailesi", () => {
    expect(FONT_FAMILY).toContain("IBM Plex Sans");
  });

  it("display/kpi/title değerleri guide ile birebir", () => {
    expect(TYPE.display).toEqual({ fontSize: 26, lineHeight: 32, fontWeight: 600 });
    expect(TYPE.kpiL).toEqual({ fontSize: 24, lineHeight: 32, fontWeight: 600 });
    expect(TYPE.kpiM).toEqual({ fontSize: 22, lineHeight: 28, fontWeight: 600 });
    expect(TYPE.title).toEqual({ fontSize: 18, lineHeight: 24, fontWeight: 600 });
    expect(TYPE.heading).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: 600 });
  });

  it("gövde ve mikro adımlar doğru", () => {
    expect(TYPE.body).toEqual({ fontSize: 12, lineHeight: 16, fontWeight: 500 });
    expect(TYPE.label).toEqual({ fontSize: 12, lineHeight: 16, fontWeight: 600 });
    expect(TYPE.caption).toEqual({ fontSize: 10, lineHeight: 14, fontWeight: 500 });
    expect(TYPE.badge).toEqual({
      fontSize: 10,
      lineHeight: 12,
      fontWeight: 600,
      letterSpacing: 0.4,
    });
    expect(TYPE.micro).toEqual({
      fontSize: 8,
      lineHeight: 12,
      fontWeight: 700,
      letterSpacing: 0.48,
    });
  });

  it("tüm boyut ve line-height değerleri çift sayı", () => {
    for (const step of Object.values(TYPE)) {
      expect(step.fontSize % 2).toBe(0);
      expect(step.lineHeight % 2).toBe(0);
    }
  });
});
