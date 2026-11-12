import { describe, expect, it } from "vitest";
import { COLORS } from "./tokens";
import { COLORS_DARK } from "./tokensDark";

describe("renk token'ları", () => {
  it("açık tema değerleri design guide ile birebir", () => {
    expect(COLORS.textPrimary).toBe("#10151C");
    expect(COLORS.textSecondary).toBe("#5F6A82");
    expect(COLORS.textTertiary).toBe("#8A93A8");
    expect(COLORS.textOnDark).toBe("#FFFFFF");
    expect(COLORS.textOnSolid).toBe("#FFFFFF");
    expect(COLORS.bgPage).toBe("#F4F7FC");
    expect(COLORS.surface).toBe("#FFFFFF");
    expect(COLORS.border).toBe("#E4E9F4");
    expect(COLORS.borderStrong).toBe("#B9C1D3");
    expect(COLORS.lineDiagram).toBe("#2F3A4F");
    expect(COLORS.inverse).toBe("#10151C");
  });

  it("status üçlüleri doğru", () => {
    expect([COLORS.success, COLORS.successText, COLORS.successTint]).toEqual([
      "#17B589",
      "#0B7A5A",
      "#E8F6F1",
    ]);
    expect([COLORS.warning, COLORS.warningText, COLORS.warningTint]).toEqual([
      "#F57818",
      "#A85200",
      "#FDEEDF",
    ]);
    expect([COLORS.critical, COLORS.criticalText, COLORS.criticalTint]).toEqual([
      "#E11D53",
      "#E11D53",
      "#FCE7ED",
    ]);
    expect([COLORS.info, COLORS.infoText, COLORS.infoTint]).toEqual([
      "#455DDC",
      "#455DDC",
      "#E8EBFB",
    ]);
    expect([COLORS.maintText, COLORS.maintTint]).toEqual(["#7C3AED", "#F0E9FD"]);
  });

  it("koyu tema anahtar kümesi açık temayla aynı", () => {
    expect(Object.keys(COLORS_DARK).sort()).toEqual(Object.keys(COLORS).sort());
  });

  it("koyu tema çekirdek değerleri Dark theme frame'i ile aynı", () => {
    expect(COLORS_DARK.bgPage).toBe("#0B0F17");
    expect(COLORS_DARK.surface).toBe("#141B27");
    expect(COLORS_DARK.border).toBe("#263041");
    expect(COLORS_DARK.textPrimary).toBe("#E8EDF6");
    expect(COLORS_DARK.successTint).toBe("#10332A");
    expect(COLORS_DARK.successText).toBe("#3FD3A2");
    expect(COLORS_DARK.warningTint).toBe("#3B2716");
    expect(COLORS_DARK.warningText).toBe("#FFAB5E");
    expect(COLORS_DARK.criticalTint).toBe("#3F1624");
    expect(COLORS_DARK.criticalText).toBe("#FF6F91");
    expect(COLORS_DARK.infoTint).toBe("#1F2A52");
    expect(COLORS_DARK.infoText).toBe("#93A4FF");
  });
});
