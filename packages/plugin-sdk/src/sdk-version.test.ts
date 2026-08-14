import { describe, expect, it } from "vitest";
import { SemVerRange } from "./sdk-version";

describe("SemVerRange", () => {
  it("aralik icindeki versiyonlari kabul eder", () => {
    const range = new SemVerRange(">=1.0.0 <2.0.0");
    expect(range.includes("1.0.0")).toBe(true);
    expect(range.includes("1.5.3")).toBe(true);
    expect(range.includes("1.99.99")).toBe(true);
  });

  it("aralik disindaki versiyonlari reddeder", () => {
    const range = new SemVerRange(">=1.0.0 <2.0.0");
    expect(range.includes("0.9.9")).toBe(false);
    expect(range.includes("2.0.0")).toBe(false);
  });

  it("tek kosullu araliklari destekler", () => {
    const minOnly = new SemVerRange(">=2.1.0");
    expect(minOnly.includes("2.1.0")).toBe(true);
    expect(minOnly.includes("3.0.0")).toBe(true);
    expect(minOnly.includes("2.0.9")).toBe(false);
  });

  it("gecersiz ifadelerde firlatir", () => {
    expect(() => new SemVerRange("")).toThrow(/bos|Bos/i);
    expect(() => new SemVerRange("=1.0.0")).toThrow(/operator/i);
    expect(() => new SemVerRange(">=x.y.z")).toThrow(/versiyon/i);
  });
});
