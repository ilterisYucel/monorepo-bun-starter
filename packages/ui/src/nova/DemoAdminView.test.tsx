import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DemoAdminView, type DemoAdminActions, type DemoAdminStateShape } from "./DemoAdminView";
import { DEMO_DEVICES, DEMO_MAPPING } from "./demo-registers";
import type { NovaMimicState, NovaTopology } from "./mimic-types";

const topology = {
  limits: { socMin: 3.5, socMax: 97, tempMin: 19, tempMax: 25, derateC: 28, derateReleaseC: 24, dTdtWarn: 2, dvWarn: 50, sohInfo: 95 },
  unit: { banks: ["A", "B"], cellsSeries: 408, racksPerBank: 8, pcsMaxMW: 1.725 },
} as unknown as NovaTopology;

const state = {
  station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz: 50, es: {}, iA: {} },
  poiMW: 0,
  feederMW: { A: 0, B: 0 },
  units: [
    {
      n: 1,
      rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
      banks: [
        { id: "A", soc: 61.5, soh: 98, vdc: 1300, tmax: 24, tmin: 21, dvmV: 40, racks: [24], rackSoc: [61], dcb: "closed" },
        { id: "B", soc: 60, soh: 98, vdc: 1290, tmax: 23, tmin: 21, dvmV: 30, racks: [23], dcb: "closed" },
      ],
      pcs: [
        { id: "A", state: "dis", pMW: 0.1, igbtC: 45, limited: false, idc: 80, vac: 690, freq: 50, reactiveKvar: 30, chgLimitKw: 1725, disLimitKw: 1725, acCb: "closed", dcCb: "closed", estop: false, faultWords: [0, 0] },
        { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false },
      ],
      hvac: [{ id: 1, on: true, mode: "cool", comp: true, heater: false, supplyT: 21, returnT: 23, outsideT: 30, acV: 400, alarms: [] }],
    },
  ],
} as unknown as NovaMimicState;

const admin: DemoAdminStateShape = {
  mapping: Object.fromEntries(DEMO_MAPPING.map((m) => [m.key, m.register])),
  devices: DEMO_DEVICES.map((d) => ({ ...d })),
  params: { restH: 0.5, ambMode: "fixed", ambC: 22, ambSwing: 8, solar: true, qGenMaxKW: 60, coolKW: 80, genExp: 2 },
  mapDev: "bsc",
  prevUnit: 1,
  prevBank: "A",
};

const actions: DemoAdminActions = {
  setMapping: () => {},
  resetMapping: () => {},
  setDevice: () => {},
  setParams: () => {},
  setMapDev: () => {},
  setPrev: () => {},
  copyMapping: () => {},
};

describe("DemoAdminView (UC-8)", () => {
  it("5 sekme + mapping tablosu + canlı değer gösterir", () => {
    render(<DemoAdminView topology={topology} state={state} runs={[]} logs={[]} admin={admin} actions={actions} />);
    expect(screen.getByText("Data mapping")).toBeTruthy();
    expect(screen.getByText("Site parameters")).toBeTruthy();
    expect(screen.getByText("Modbus trace")).toBeTruthy();
    // ilk mapping satırı (Bank SOC) canlı değer
    expect(screen.getByText("61.50 %")).toBeTruthy();
  });

  it("Register catalogue araması + poll planları", () => {
    render(<DemoAdminView topology={topology} state={state} runs={[]} logs={[]} admin={admin} actions={actions} />);
    fireEvent.click(screen.getByText("Register catalogue"));
    expect(screen.getByPlaceholderText("name or address")).toBeTruthy();
    expect(screen.getByText("Flex BSC poll plan")).toBeTruthy();
  });

  it("Modbus trace sekmesi gerçek yazma izi notunu gösterir", () => {
    render(<DemoAdminView topology={topology} state={state} runs={[]} logs={[]} admin={admin} actions={actions} />);
    fireEvent.click(screen.getByText("Modbus trace"));
    expect(screen.getByText(/real register address/)).toBeTruthy();
  });

  it("gerçek yazma izi verilirse adresli satırları gösterir", () => {
    render(
      <DemoAdminView
        topology={topology}
        state={state}
        runs={[]}
        logs={[]}
        writes={[
          { ts: "2026-10-08T10:00:00.000Z", deviceId: "PCS-1", command: "standby", label: "Bekleme", name: "Standby Command", registerAddress: 3607, registerTableType: "HOLDING_REGISTER", value: "1", success: true },
        ]}
        admin={admin}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByText("Modbus trace"));
    expect(screen.getByText("3607")).toBeTruthy();
    expect(screen.getByText("PCS-1")).toBeTruthy();
  });
});
