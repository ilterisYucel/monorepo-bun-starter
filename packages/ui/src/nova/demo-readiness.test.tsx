import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DEMO_REST_MINUTES,
  deriveRestState,
  lastFullRunFinishedAt,
  restPhasesForRuns,
  thermalReady,
} from "./demo-readiness";
import { DemoReadyCard } from "./DemoReadyCard";
import { DemoSequence } from "./DemoSequence";

const NOW = Date.parse("2026-10-07T12:00:00.000Z");
const MIN = 60_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("demo-readiness (UC-7, FR-7.3, K7)", () => {
  it("DEMO_REST_MINUTES 30 dk'dır (2026-10-07 kararı)", () => {
    expect(DEMO_REST_MINUTES).toBe(30);
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
    expect(deriveRestState(iso(30 * MIN), NOW).complete).toBe(true);
    expect(deriveRestState(iso(29 * MIN), NOW).complete).toBe(false);
    expect(deriveRestState(undefined, NOW).complete).toBe(false);
  });

  it("thermalReady tüm bankalar bantta ise true", () => {
    const L = { tempMin: 19, tempMax: 25 };
    expect(thermalReady([{ tmax: 24, tmin: 20 }, { tmax: 23, tmin: 21 }], L)).toBe(true);
    expect(thermalReady([{ tmax: 27, tmin: 21 }], L)).toBe(false);
    expect(thermalReady([], L)).toBe(false);
  });

  it("AK-7.3: 30 dk önce biten full_charge + bant içi raflar → dinlenme tamam + hazır", () => {
    const rest = deriveRestState(iso(30 * MIN), NOW);
    const ready = thermalReady([{ tmax: 24, tmin: 20 }], { tempMin: 19, tempMax: 25 });
    expect(rest.complete).toBe(true);
    expect(ready).toBe(true);
  });
});

describe("DemoReadyCard / DemoSequence (UC-7)", () => {
  it("AK-2.3: kart 'REST TIME COMPLETE' + grup READY gösterir", () => {
    const rest = deriveRestState(iso(30 * MIN), NOW);
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
    expect(phases[0].t1 - phases[0].t0).toBe(30 * MIN);
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
