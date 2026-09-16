import { describe, it, expect } from "vitest";
import {
  RELATION_EXPECTS,
  isRelationExpect,
  expectHolds,
} from "./validate-expect";

/**
 * validate.expect ilişki sözleşmesi (PCS-WATTOX-MIMARISI T-P3):
 *
 * - `expect` alanı (CommandConfig.validate.reads[].expect) string|number|boolean
 *   kalır (geriye uyumlu). String değerler ilişki sözcüğüyse SAYISAL ilişki,
 *   değilse birebir eşitlik anlamındadır.
 * - İlişki sözcükleri: "negative" (<0), "positive" (>0), "zero" (===0),
 *   "nonzero" (!==0).
 * - Sayısal ilişkiler YALNIZCA number değerlerde tutar — string/boolean
 *   değerlerde her zaman FALSE (karşılaştırma yapılmaz).
 * - Birebir eşitlik değişmez: `actual === expect` (===, gevşek değil).
 * - `isRelationExpect`: sorgu — değer ilişki sözcüğü mü.
 * - Yan etki: YOK (saf fonksiyonlar).
 */

describe("isRelationExpect", () => {
  it("ilişki sözcüklerini tanır", () => {
    for (const word of RELATION_EXPECTS) {
      expect(isRelationExpect(word)).toBe(true);
    }
  });

  it("diğer string/sayı/boolean değerleri tanımaz", () => {
    expect(isRelationExpect("2")).toBe(false);
    expect(isRelationExpect("")).toBe(false);
    expect(isRelationExpect(2)).toBe(false);
    expect(isRelationExpect(true)).toBe(false);
    expect(isRelationExpect(undefined)).toBe(false);
  });
});

describe("expectHolds", () => {
  it("negative: yalnızca negatif sayılar tutar", () => {
    expect(expectHolds(-100, "negative")).toBe(true);
    expect(expectHolds(-0.5, "negative")).toBe(true);
    expect(expectHolds(0, "negative")).toBe(false);
    expect(expectHolds(5, "negative")).toBe(false);
    expect(expectHolds("-5", "negative")).toBe(false);
    expect(expectHolds(true, "negative")).toBe(false);
  });

  it("positive: yalnızca pozitif sayılar tutar", () => {
    expect(expectHolds(100, "positive")).toBe(true);
    expect(expectHolds(0, "positive")).toBe(false);
    expect(expectHolds(-1, "positive")).toBe(false);
    expect(expectHolds("5", "positive")).toBe(false);
  });

  it("zero: yalnızca 0 tutar", () => {
    expect(expectHolds(0, "zero")).toBe(true);
    expect(expectHolds(1, "zero")).toBe(false);
    expect(expectHolds(false, "zero")).toBe(false);
  });

  it("nonzero: 0 dışı sayılar tutar", () => {
    expect(expectHolds(1, "nonzero")).toBe(true);
    expect(expectHolds(-1, "nonzero")).toBe(true);
    expect(expectHolds(0, "nonzero")).toBe(false);
    expect(expectHolds("x", "nonzero")).toBe(false);
  });

  it("birebir eşitlik değişmez (sayı/string/boolean)", () => {
    expect(expectHolds(2, 2)).toBe(true);
    expect(expectHolds(2, 3)).toBe(false);
    expect(expectHolds("open", "open")).toBe(true);
    expect(expectHolds("open", "closed")).toBe(false);
    expect(expectHolds(true, true)).toBe(true);
    expect(expectHolds(true, false)).toBe(false);
    // kesin eşitlik: "2" !== 2
    expect(expectHolds(2, "2")).toBe(false);
  });
});
