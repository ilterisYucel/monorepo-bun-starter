import { describe, it, expect } from "vitest";
import { detailsNumber, rackCountOf, DEFAULT_RACK_COUNT } from "./rackHelpers";

/**
 * details accessor sözleşmesi (DEVICE-SERVICE-MIMARISI REV.01):
 * cihaz-spesifik nitelikler opak `details` objesinden okunur; yorum tüketicide.
 */
describe("rackHelpers — details accessor", () => {
  it("rackCountOf details.rackCount okur", () => {
    expect(rackCountOf({ details: { rackCount: 12 } })).toBe(12);
  });

  it("rackCountOf details yoksa DEFAULT_RACK_COUNT döner", () => {
    expect(rackCountOf({ details: null })).toBe(DEFAULT_RACK_COUNT);
    expect(rackCountOf({})).toBe(DEFAULT_RACK_COUNT);
  });

  it("detailsNumber string sayıyı çözer, geçersizse undefined", () => {
    expect(detailsNumber({ details: { rackCount: "6" } }, "rackCount")).toBe(6);
    expect(detailsNumber({ details: { rackCount: "abc" } }, "rackCount")).toBeUndefined();
    expect(detailsNumber({ details: {} }, "rackCount")).toBeUndefined();
  });
});
