import { describe, it, expect } from "vitest";
import { GridLinkBus } from "./bus";

/**
 * GridLinkBus sözleşmesi (SEBEKE-YOLU-ESLESMESI UC-1):
 * enerji = H01 ∧ fider ∧ H02; yayın gelmeyen hücre kapalı varsayılır.
 */
describe("GridLinkBus", () => {
  it("AK-1.1: kapalı hücrelerde fider enerjilidir", () => {
    const bus = new GridLinkBus();
    expect(bus.isEnergized("H04")).toBe(true);
    bus.setBreaker("H04", false);
    expect(bus.isEnergized("H04")).toBe(false);
  });

  it("H01 veya H02 açıkken fider enerjisizdir (zincir)", () => {
    const bus = new GridLinkBus();
    bus.setBreaker("H01", false);
    expect(bus.isEnergized("H04")).toBe(false);
    bus.setBreaker("H01", true);
    bus.setBreaker("H02", false);
    expect(bus.isEnergized("H04")).toBe(false);
  });

  it("fiderler birbirinden bağımsızdır", () => {
    const bus = new GridLinkBus();
    bus.setBreaker("H04", false);
    expect(bus.isEnergized("H04")).toBe(false);
    expect(bus.isEnergized("H05")).toBe(true);
  });
});
