import { describe, it, expect } from "vitest";
import type { NovaMimicState } from "@gd-monorepo/ui";
import { socOf, targetReached, matchingRunStarted } from "./useTargetSocWatcher";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";

const state = {
  station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {} },
  poiMW: 0,
  feederMW: { A: 0, B: 0 },
  units: [
    {
      n: 1,
      rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
      banks: [
        { id: "A", soc: 60, soh: 98, vdc: 1300, tmax: 23, dvmV: 10, racks: [23], dcb: "closed" as const },
        { id: "B", soc: 70, soh: 98, vdc: 1300, tmax: 23, dvmV: 10, racks: [23], dcb: "closed" as const },
      ],
      pcs: [],
    },
    {
      n: 2,
      rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
      banks: [{ id: "A", soc: 80, soh: 98, vdc: 1300, tmax: 23, dvmV: 10, racks: [23], dcb: "closed" as const }],
      pcs: [],
    },
  ],
} as unknown as NovaMimicState;

describe("useTargetSocWatcher saf türevleri (UC-5)", () => {
  it("socOf scope ortalamasını verir", () => {
    expect(socOf(state, [1])).toBeCloseTo(65, 6);
    expect(socOf(state, [])).toBeCloseTo((60 + 70 + 80) / 3, 6);
    expect(socOf(state, [99])).toBeUndefined();
  });

  it("targetReached yönü doğru uygular", () => {
    expect(targetReached(60, 60, "chg")).toBe(true);
    expect(targetReached(59.9, 60, "chg")).toBe(false);
    expect(targetReached(60, 60, "dis")).toBe(true);
    expect(targetReached(60.1, 60, "dis")).toBe(false);
  });

  it("matchingRunStarted setAt'ten sonra başlayan yön run'ını arar (yarış koruması)", () => {
    const t0 = Date.parse("2026-10-08T10:00:00Z");
    const runs = [
      { name: "standby", startedAt: "2026-10-08T09:59:59Z" },
      { name: "charge", startedAt: "2026-10-08T09:59:00Z" },
    ] as unknown as OperationRunRecord[];
    expect(matchingRunStarted(runs, "chg", t0)).toBe(false);
    const runs2 = [
      { name: "charge", startedAt: "2026-10-08T10:00:01Z" },
    ] as unknown as OperationRunRecord[];
    expect(matchingRunStarted(runs2, "chg", t0)).toBe(true);
    expect(matchingRunStarted(runs2, "dis", t0)).toBe(false);
  });
});
