import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import { DemoOperationsView, parseRunSteps, runLabel, type DemoOpDef } from "./DemoOperationsView";
import type { NovaStationState, NovaTopology } from "./mimic-types";

const defs: DemoOpDef[] = [
  { key: "chgdis", id: "FL-02", title: "Charge / Discharge", summary: "s", icon: "bolt" },
  { key: "calib", id: "FL-04", title: "Calibration", summary: "s", icon: "calib" },
];

const run = (over: Partial<OperationRunRecord>): OperationRunRecord =>
  ({
    id: "r1",
    kind: "maneuver",
    name: "fl04_calibration",
    trigger: "manual",
    status: "completed",
    steps: { params: {}, definition: { label: "FL-04: Kalibrasyon", steps: [{ command: "standby", deviceTypes: ["pcs"] }] } },
    startedAt: "2026-10-08T09:23:01.178Z",
    finishedAt: "2026-10-08T09:23:02.000Z",
    createdBy: "admin",
    traceId: null,
    ...over,
  }) as OperationRunRecord;

const station: NovaStationState = {
  H01: "closed",
  H02: "closed",
  H04: "closed",
  H05: "closed",
  kV: 34.5,
  hz: 50,
  es: {},
  iA: {},
};

const topo = { limits: { tempMin: 19, tempMax: 25, socMin: 3.5, socMax: 97 }, unit: {}, station: { nominalKV: 34.5, cells: [] }, feeders: {} } as unknown as NovaTopology;

describe("parseRunSteps / runLabel (UC-5 — sequences veri modeli)", () => {
  it("steps.definition.steps dizisini okur ve run durumundan adım durumu türetir", () => {
    const steps = parseRunSteps(run({ status: "completed" }));
    expect(steps).toHaveLength(1);
    expect(steps[0].label).toBe("standby · pcs");
    expect(steps[0].state).toBe("done");
  });

  it("legacy dizi şeklini de destekler", () => {
    const steps = parseRunSteps(run({ steps: [{ label: "PCS start", status: "completed" }] as unknown as OperationRunRecord["steps"] }));
    expect(steps[0].label).toBe("PCS start");
  });

  it("run adını FL etiketine çevirir", () => {
    expect(runLabel("fl04_calibration", defs)).toBe("FL-04 · Calibration");
    expect(runLabel("charge", defs)).toBe("FL-02 · Charge / Discharge");
    expect(runLabel("unknown_op", defs)).toBe("unknown_op");
  });
});

describe("DemoOperationsView render (UC-5)", () => {
  const base = {
    defs,
    units: [{ n: 1, soc: 50, available: true, note: "" }],
    runs: [run({})],
    station,
    topology: topo,
    permissivesFor: () => [],
  };

  it("sekansı FL etiketi + DONE + adım satırıyla gösterir", () => {
    render(<DemoOperationsView {...base} />);
    // hem manevra listesinde hem sequenz başlığında görünür
    expect(screen.getAllByText("FL-04 · Calibration").length).toBeGreaterThan(1);
    expect(screen.getAllByText("DONE").length).toBeGreaterThan(0);
    expect(screen.getByText("standby · pcs")).toBeTruthy();
  });

  it("FL-02 formunda Control mode seg'i vardır (Active power / P-Q / PF)", () => {
    render(<DemoOperationsView {...base} />);
    expect(screen.getByText("Control mode")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Active power" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "P/Q" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PF" })).toBeTruthy();
  });
});
