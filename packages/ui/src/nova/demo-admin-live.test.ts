import { describe, it, expect } from "vitest";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import { adminLiveValue, commandTraceRows, thermalRow } from "./demo-admin-live";
import {
  ALL_DEMO_REGISTERS,
  DEMO_DEVICES,
  DEMO_HVAC,
  DEMO_MAPPING,
  DEMO_PCS,
  addrText,
} from "./demo-registers";
import type { NovaMimicState, NovaTopology } from "./mimic-types";

const topo = {
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
        { id: "A", soc: 61.5, soh: 98.1, vdc: 1300, tmax: 24, tmin: 21, dvmV: 40, racks: [24], rackSoc: [61], dcb: "closed" },
        { id: "B", soc: 60, soh: 98, vdc: 1290, tmax: 23, tmin: 21, dvmV: 30, racks: [23], dcb: "closed" },
      ],
      pcs: [
        { id: "A", state: "dis", pMW: 0.1, igbtC: 45, limited: false, idc: 80, vac: 690, freq: 50, reactiveKvar: 30, chgLimitKw: 1725, disLimitKw: 1725, acCb: "closed", dcCb: "closed", estop: false, faultWords: [0, 0] },
        { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false, chgLimitKw: 1725, disLimitKw: 1725 },
      ],
      hvac: [
        { id: 1, on: true, mode: "cool", comp: true, heater: false, supplyT: 21, returnT: 23, outsideT: 30, acV: 400, alarms: [] },
      ],
    },
  ],
} as unknown as NovaMimicState;

describe("demo-registers (UC-8 veri bütünlüğü)", () => {
  it("her mapping register'ı katalogda var", () => {
    const missing = DEMO_MAPPING.filter((m) => !ALL_DEMO_REGISTERS[m.register]).map((m) => m.register);
    expect(missing).toEqual([]);
  });

  it("mapping 49 · cihaz 54 · poll planları dolu", () => {
    expect(DEMO_MAPPING).toHaveLength(49);
    expect(DEMO_DEVICES).toHaveLength(54);
    expect(DEMO_PCS.pollPlan.length).toBeGreaterThan(0);
    expect(DEMO_HVAC.alarms.length).toBe(22);
  });

  it("addrText rack ve PCS adreslerini doğru yazar", () => {
    expect(addrText(ALL_DEMO_REGISTERS["rack.state"])).toContain("+ 150·(rack−1)");
    expect(addrText(ALL_DEMO_REGISTERS["pcs.cmdSource"])).toBe("0x0E00");
    expect(addrText(ALL_DEMO_REGISTERS["bsc.soc"])).toBe(String(ALL_DEMO_REGISTERS["bsc.soc"].addr));
  });

  it("faultBits kelime 2'de IGBT over-temperature taşır", () => {
    expect(DEMO_PCS.faultBits["2"]["3"]).toContain("IGBT over-temperature");
  });
});

describe("adminLiveValue (referans liveValue)", () => {
  it("bank/pcs/hvac canlı değerleri üretir", () => {
    expect(adminLiveValue(state, topo, 1, "A", "bsc.soc")).toBe("61.50 %");
    expect(adminLiveValue(state, topo, 1, "A", "pcs.opStatus")).toBe("3 · Discharging");
    expect(adminLiveValue(state, topo, 1, "A", "pcs.p")).toBe("100 kW");
    expect(adminLiveValue(state, topo, 1, "A", "hvac.supplyT")).toBe("HVAC-1.1: 21.0 °C");
    expect(adminLiveValue(state, topo, 1, "A", "pcs.faultWord2")).toBe("0x0000");
  });

  it("bilinmeyen register → —", () => {
    expect(adminLiveValue(state, topo, 1, "A", "nope.reg")).toBe("—");
    expect(adminLiveValue(state, topo, 9, "A", "bsc.soc")).toBe("—");
  });
});

describe("commandTraceRows (B-2 türetim)", () => {
  const run = (over: Partial<OperationRunRecord>): OperationRunRecord =>
    ({
      id: "r1", kind: "operation", name: "charge", trigger: "manual", status: "completed",
      steps: { params: { powerKw: 200 }, definition: { steps: [{ command: "set_charge_power", deviceTypes: ["bsc"] }] } },
      startedAt: "2026-10-08T09:00:00.000Z", finishedAt: null, createdBy: "admin", traceId: null,
      ...over,
    }) as OperationRunRecord;

  it("BSC komutunu register/adres ile satırlaştırır", () => {
    const rows = commandTraceRows([run({ name: "bsc_charge" })], []);
    expect(rows[0].device).toBe("BSC");
    expect(rows[0].addr).toBe("40030");
    expect(rows[0].value).toBe("200 kW");
  });

  it("PCS komutunu adresle eşler + log satırlarını ekler", () => {
    const rows = commandTraceRows(
      [run({ name: "charge", steps: { params: {}, definition: { steps: [{ command: "charge", deviceTypes: ["pcs"] }] } } as never })],
      [{ id: "l1", timestamp: "2026-10-08T09:01:00.000Z", type: "info", source: "system", message: "operation_completed" }],
    );
    expect(rows[0].addr).toBe("0x0E19");
    expect(rows.some((r) => r.meaning === "operation_completed")).toBe(true);
  });

  it("operasyon adımlarındaki maneuver adını da eşler (pcs_standby)", () => {
    const rows = commandTraceRows(
      [run({ name: "standby", kind: "operation", steps: { params: {}, definition: { steps: [{ maneuver: "pcs_standby" }, { system: "container-1", maneuver: "bsc_stop" }] } } as never })],
      [],
    );
    expect(rows[0].addr).toBe("0x0E17");
    expect(rows[0].meaning).toBe("S19 Standby");
    expect(rows[1].device).toBe("BSC");
    expect(rows[1].addr).toBe("40010");
  });
});

describe("thermalRow", () => {
  it("Qgen P² ile ölçeklenir, soğutma kompresör sayısından", () => {
    const r = thermalRow(1.725, 2, 0, 24, 30);
    expect(r.qGen).toBeCloseTo(15, 1); // 60·(1.725/3.45)² = 15
    expect(r.qCool).toBeCloseTo(20.4, 1);
    expect(r.tBatt).toBeCloseTo(22.8, 1);
  });
});
