import { describe, it, expect } from "vitest";
import type { NovaMimicState, NovaTopology } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY } from "./demo-topology";
import { teiasCommandRows, teiasTelemetryRows } from "./demo-teias";

const topo = DEMO_TOPOLOGY as NovaTopology;

function state(hz = 50, poiMW = 0): NovaMimicState {
  return {
    station: { H01: "closed", H02: "closed", H04: "closed", H05: "closed", kV: 34.5, hz, es: {}, iA: {} },
    poiMW,
    feederMW: { A: 0, B: 0 },
    units: [
      {
        n: 1,
        rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
        banks: [
          { id: "A", soc: 60, soh: 98, vdc: 1300, tmax: 23, tmin: 21, dvmV: 10, racks: [23], dcb: "closed" },
          { id: "B", soc: 50, soh: 97, vdc: 1290, tmax: 23, tmin: 21, dvmV: 10, racks: [23], dcb: "closed" },
        ],
        pcs: [
          { id: "A", state: "dis", pMW: 0.2, igbtC: 40, limited: false, disLimitKw: 500, chgLimitKw: 500, reactiveKvar: 30 },
          { id: "B", state: "dis", pMW: 0.2, igbtC: 40, limited: false, disLimitKw: 500, chgLimitKw: 500, reactiveKvar: 30 },
        ],
      },
    ],
  } as NovaMimicState;
}

describe("demo-teias (UC-6, FR-6.3)", () => {
  it("telemetri 20 satır + komut 8 satır", () => {
    expect(teiasTelemetryRows(state(), topo)).toHaveLength(20);
    expect(teiasCommandRows(state(), topo)).toHaveLength(8);
  });

  it("SoH enerji + anlık SOC + reaktif türetir", () => {
    const rows = teiasTelemetryRows(state(), topo);
    const get = (l: string): string => rows.find((r) => r.label === l)?.value ?? "";
    expect(get("SOC (instantaneous)")).toBe("55.0 %");
    expect(get("Reactive power")).toBe("0.06 MVAr");
    expect(get("Active power")).toBe("0.00 MW");
  });

  it("available power PCS limitlerinden (MW)", () => {
    const rows = teiasTelemetryRows(state(), topo);
    const dis = rows.find((r) => r.label.includes("discharge to grid"))?.value;
    expect(dis).toBe("1.0 MW"); // 2 × 0.5 MW
  });

  it("LFSM-U/O frekansa göre", () => {
    expect(teiasTelemetryRows(state(49.7), topo).find((r) => r.label.includes("LFSM-U"))?.value).toBe("YES");
    expect(teiasTelemetryRows(state(50.3), topo).find((r) => r.label.includes("LFSM-O"))?.value).toBe("YES");
    expect(teiasTelemetryRows(state(50), topo).find((r) => r.label.includes("LFSM-U"))?.value).toBe("No");
  });

  it("charging/discharging durumu P işaretinden", () => {
    expect(teiasTelemetryRows(state(50, 1.5), topo).find((r) => r.label.includes("Charging / discharging"))?.value).toBe("Discharging");
    expect(teiasTelemetryRows(state(50, -1.5), topo).find((r) => r.label.includes("Charging / discharging"))?.value).toBe("Charging");
  });
});
