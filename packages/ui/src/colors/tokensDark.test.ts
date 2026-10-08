import { describe, it, expect } from "vitest";
import { COLORS_DARK, COLOR_DARK } from "./tokensDark";

describe("dark tokens (referans paleti, K-2)", () => {
  it("dark alarm + yüzey değerlerini taşır", () => {
    expect(COLORS_DARK.alarm).toBe("#ff6a4d");
    expect(COLORS_DARK.bg).toBe("#0e1215");
    expect(COLORS_DARK.discharge).toBe("#f2a24a");
    expect(COLORS_DARK.charge).toBe("#3fd3bf");
  });

  it("light ile aynı anahtar kümesine sahiptir", async () => {
    const { COLORS_LIGHT } = await import("./tokensLight");
    expect(Object.keys(COLORS_DARK).sort()).toEqual(Object.keys(COLORS_LIGHT).sort());
  });

  it("tüm token'lar için sayısal karşılık üretilir", () => {
    for (const [key, hex] of Object.entries(COLORS_DARK)) {
      expect(COLOR_DARK[key as keyof typeof COLORS_DARK]).toBe(
        Number.parseInt(hex.slice(1), 16),
      );
    }
  });
});
