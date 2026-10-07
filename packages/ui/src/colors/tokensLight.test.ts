import { describe, it, expect } from "vitest";
import { COLORS_LIGHT, COLOR_LIGHT, hexToRgbTriple } from "./tokensLight";

describe("light tokens (nova paleti)", () => {
  it("alarm token'ı nova light değerini taşır", () => {
    expect(COLORS_LIGHT.alarm).toBe("#c4321d");
    expect(COLOR_LIGHT.alarm).toBe(0xc4321d);
  });

  it("tüm token'lar için sayısal karşılık üretilir", () => {
    for (const [key, hex] of Object.entries(COLORS_LIGHT)) {
      expect(COLOR_LIGHT[key as keyof typeof COLORS_LIGHT]).toBe(
        Number.parseInt(hex.slice(1), 16),
      );
    }
  });
});

describe("hexToRgbTriple", () => {
  it("hex'i CSS üçlüsüne çevirir", () => {
    expect(hexToRgbTriple("#ce2e1c")).toBe("206,46,28");
  });

  it("geçersiz hex'te hata fırlatır", () => {
    expect(() => hexToRgbTriple("#xyz")).toThrow();
    expect(() => hexToRgbTriple("nothex")).toThrow();
  });
});
