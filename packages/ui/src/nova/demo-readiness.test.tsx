import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DEMO_REST_MINUTES,
  deriveRestState,
  lastFullRunFinishedAt,
  restPhasesForRuns,
  thermalReady,
  deriveGroupChecks,
  derivePlantChecks,
} from "./demo-readiness";
import { DemoReadyCard } from "./DemoReadyCard";
import { DemoSequence } from "./DemoSequence";
import { POS_TEXT } from "./nova-mimic";

const NOW = Date.parse("2026-10-07T12:00:00.000Z");
const MIN = 60_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("demo-readiness (UC-7, FR-7.3, K7)", () => {
  it("DEMO_REST_MINUTES 120 dk'dır (LGES: 2 saat dinlenme)", () => {
    expect(DEMO_REST_MINUTES).toBe(120);
  });

  it("lastFullRunFinishedAt en yeni tam şarj/deşarj bitişini seçer", () => {
    const runs = [
      { name: "full_charge", finishedAt: iso(90 * MIN) },
      { name: "standby", finishedAt: iso(5 * MIN) },
      { name: "full_discharge", finishedAt: iso(10 * MIN) },
    ];
    expect(lastFullRunFinishedAt(runs)).toBe(iso(10 * MIN));
    expect(lastFullRunFinishedAt([])).toBeUndefined();
  });

  it("deriveRestState eşik dolunca complete olur", () => {
    expect(deriveRestState(iso(120 * MIN), NOW).complete).toBe(true);
    expect(deriveRestState(iso(119 * MIN), NOW).complete).toBe(false);
    expect(deriveRestState(undefined, NOW).complete).toBe(false);
  });

  it("thermalReady tüm bankalar bantta ise true", () => {
    const L = { tempMin: 19, tempMax: 25 };
    expect(thermalReady([{ tmax: 24, tmin: 20 }, { tmax: 23, tmin: 21 }], L)).toBe(true);
    expect(thermalReady([{ tmax: 27, tmin: 21 }], L)).toBe(false);
    expect(thermalReady([], L)).toBe(false);
  });

  it("AK-7.3: 120 dk önce biten full_charge + bant içi raflar → dinlenme tamam + hazır", () => {
    const rest = deriveRestState(iso(120 * MIN), NOW);
    const ready = thermalReady([{ tmax: 24, tmin: 20 }], { tempMin: 19, tempMax: 25 });
    expect(rest.complete).toBe(true);
    expect(ready).toBe(true);
  });
});

describe("DemoReadyCard / DemoSequence (UC-7)", () => {
  it("AK-2.3: kart 'REST TIME COMPLETE' + grup READY gösterir", () => {
    const rest = deriveRestState(iso(120 * MIN), NOW);
    render(
      <DemoReadyCard
        units={[{ n: 1, tmin: 20, tmax: 24, ready: true, note: "in band 19–25 °C" }]}
        rest={rest}
        tempMin={19}
        tempMax={25}
      />,
    );
    expect(screen.getByText(/REST TIME COMPLETE/)).toBeTruthy();
    expect(screen.getByText("READY")).toBeTruthy();
  });

  it("restPhasesForRuns tam şarj bitişinden rest fazı üretir", () => {
    const phases = restPhasesForRuns([
      { name: "full_charge", finishedAt: iso(10 * MIN) },
      { name: "standby", finishedAt: iso(5 * MIN) },
    ]);
    expect(phases).toHaveLength(1);
    expect(phases[0].kind).toBe("rest");
    expect(phases[0].t1 - phases[0].t0).toBe(120 * MIN);
  });

  it("AK-7.2: DemoSequence adımları durumlarıyla listeler", () => {
    render(
      <DemoSequence
        steps={[
          { label: "PCS start", status: "done" },
          { label: "PCS standby", status: "active" },
        ]}
      />,
    );
    expect(screen.getByTestId("demo-sequence")).toBeTruthy();
    expect(screen.getByText("PCS start")).toBeTruthy();
    expect(screen.getByText("PCS standby")).toBeTruthy();
  });
});

describe("deriveGroupChecks — 7 eksenli grup hazırlığı", () => {
  const limits = { tempMin: 19, tempMax: 25 };
  const bank = (online = 8, bscState = 3, tmax = 22, tmin = 21) => ({
    id: "A",
    soc: 50,
    soh: 100,
    vdc: 1300,
    tmax,
    tmin,
    dvmV: 0,
    racks: [tmax],
    online,
    bscState,
    dcb: "closed" as const,
  });
  const unit = (over: Record<string, unknown> = {}) =>
    ({
      n: 1,
      rmu: { H02: "closed", es: false },
      banks: [bank()],
      pcs: [{ id: "1", state: "standby" }],
      status: null,
      ...over,
    }) as unknown as Parameters<typeof deriveGroupChecks>[0]["unit"];

  const base = { limits, earthingOk: true, restApplied: true, restComplete: true };

  it("tüm eksenler uygun → READY, cal pending", () => {
    const g = deriveGroupChecks({ ...base, unit: unit() });
    expect(g.ok).toBe(true);
    expect(g.reduced).toBe(false);
    expect(g.axes.cal.pending).toBe(true);
    expect(g.axes.temp.ok).toBe(true);
  });

  it("topraklama kapalı → MV ekseni düşer ve ilk engel MV olur", () => {
    const g = deriveGroupChecks({ ...base, earthingOk: false, unit: unit() });
    expect(g.ok).toBe(false);
    expect(g.axes.mv.ok).toBe(false);
    expect(g.first).toMatch(/MV path|earthing/);
  });

  it("BSC Normal değilse BSC ekseni düşer", () => {
    const g = deriveGroupChecks({ ...base, unit: unit({ banks: [bank(8, 1)] }) });
    expect(g.axes.bsc.ok).toBe(false);
  });

  it("bazı PCS arızalı → READY · REDUCED (ok + reduced)", () => {
    const g = deriveGroupChecks({
      ...base,
      unit: unit({ pcs: [{ id: "1", state: "standby" }, { id: "2", state: "fault" }], banks: [bank(), bank()] }),
    });
    expect(g.ok).toBe(true);
    expect(g.reduced).toBe(true);
    expect(g.axes.pcs.warn).toBe(true);
    expect(g.first).toMatch(/PCS ready/);
  });

  it("sıcaklık bandı dışında → Temp ekseni düşer", () => {
    const g = deriveGroupChecks({ ...base, unit: unit({ banks: [bank(8, 3, 31, 30)] }) });
    expect(g.axes.temp.ok).toBe(false);
    expect(g.first).toContain("31");
  });

  it("dinlenme bitmemiş → Rest ekseni düşer, sıcaklık uygunsa ok=false", () => {
    const g = deriveGroupChecks({ ...base, restComplete: false, unit: unit() });
    expect(g.axes.rest.ok).toBe(false);
    expect(g.ok).toBe(false);
  });

  it("bakım durumu → muted", () => {
    const g = deriveGroupChecks({
      ...base,
      unit: unit({ status: { text: "maintenance", sev: "maint" } }),
    });
    expect(g.axes.safe.ok).toBe(false);
    expect(g.muted).toBe(true);
  });
});

describe("DemoReadyCard — plant kartı + 7 eksen noktaları", () => {
  const rest = { finishedAt: undefined, requiredMinutes: 120, complete: false };
  const checks = {
    axes: {
      mv: { ok: true, text: "ok" },
      bsc: { ok: true, text: "ok" },
      pcs: { ok: true, text: "2/2 PCS ready" },
      temp: { ok: false, text: "31.0 °C > 25 °C" },
      rest: { ok: true, text: "rest time complete" },
      safe: { ok: true, text: "ok" },
      cal: { ok: true, pending: true, text: "no data" },
    },
    ok: false,
    reduced: false,
    first: "31.0 °C > 25 °C",
    muted: false,
  };

  it("PLANT READY kartı + site kontrolleri + eksen noktaları çizilir", () => {
    render(
      <DemoReadyCard
        units={[{ n: 1, tmin: 30, tmax: 31, ready: false, note: "hot", checks }]}
        rest={rest}
        tempMin={19}
        tempMax={25}
        plant={{
          title: "PLANT READY · 0 / 1 groups available",
          detail: "up to 0.0 MW discharge · 0.0 MW charge at POI",
          level: "part",
          checks: [{ ok: true, label: "Site status", detail: "Ready" }],
        }}
      />,
    );
    expect(screen.getByTestId("plant-ready")).toBeTruthy();
    expect(screen.getByText(/PLANT READY/)).toBeTruthy();
    expect(screen.getByText("Site status")).toBeTruthy();
    expect(screen.getByText(/Group readiness/)).toBeTruthy();
    // 7 eksen etiketi
    for (const label of ["MV", "BSC", "PCS", "Temp", "Rest", "Safety", "Cal."]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("NOT READY")).toBeTruthy();
  });
});

describe("derivePlantChecks — saha kartı (referans plant-ready)", () => {
  const st = (over: Partial<Record<string, unknown>> = {}) =>
    ({ H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {}, ...over }) as never;

  it("beş satırı canlı ölçümlerle döner", () => {
    const rows = derivePlantChecks({ station: st(), auxVoltage: 401.7 });
    expect(rows.map((r) => r.label)).toEqual([
      "Site status (FL-01)",
      "Grid at H03",
      "Incomer H01",
      "AUX supply",
      "Plant mode",
    ]);
    expect(rows[0]!.detail).toBe("Ready");
    expect(rows[1]!.detail).toBe("34.50 kV · 50.00 Hz");
    expect(rows[2]!.detail).toBe(POS_TEXT.closed);
    expect(rows[3]!.detail).toBe("402 V");
    expect(rows[4]!.detail).toBe("Manual");
    expect(rows.every((r) => r.ok)).toBe(true);
  });

  it("grid ve AUX dışındaysa satırlar işaretlenir", () => {
    const rows = derivePlantChecks({ station: st({ kV: 30, hz: 50.4 }), auxVoltage: 0 });
    expect(rows[1]!.ok).toBe(false);
    expect(rows[3]!.ok).toBe(false);
    expect(rows[3]!.detail).toBe("no supply");
  });

  it("kritik arıza varsa site status Not Ready", () => {
    const rows = derivePlantChecks({ station: st(), auxVoltage: 400, criticalFaults: 1 });
    expect(rows[0]!.ok).toBe(false);
    expect(rows[0]!.detail).toBe("Not Ready");
  });
});
