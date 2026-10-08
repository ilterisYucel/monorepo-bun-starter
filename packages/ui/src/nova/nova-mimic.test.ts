import { describe, it, expect } from "vitest";
import type { NovaMimicState, NovaTopology, NovaUnitState } from "./mimic-types";
import {
  bankSeverity,
  computeEnergization,
  createNovaMimic,
  defaultUnitStatus,
  tempFill,
} from "./nova-mimic";
import { applyNovaLightVars, novaVarMap } from "./apply-nova-vars";

const topo: NovaTopology = {
  id: "t",
  name: "T",
  location: "",
  powerMW: 1,
  energyMWh: 1,
  station: {
    name: "OG",
    rating: "",
    busLabel: "BARA",
    nominalKV: 34.5,
    poiLabel: "POI",
    poiCable: "c",
    cells: [
      { id: "H01", label: "Gelen", kind: "cb", role: "incomer", es: true, ct: "750/5" },
      { id: "H02", label: "Aux", kind: "lbs", role: "aux" },
      { id: "H03", label: "Ölçü", kind: "vt", role: "measurement", ct: "750/5" },
      { id: "H04", label: "Fider B", kind: "cb", role: "feeder", feeder: "B", motor: true, es: true, ct: "400/5" },
      { id: "H05", label: "Fider A", kind: "cb", role: "feeder", feeder: "A", es: true, ct: "300/5" },
    ],
  },
  feeders: {
    A: { cell: "H05", side: "L", units: [1, 2, 3] },
    B: { cell: "H04", side: "R", units: [4, 5, 6] },
  },
  unit: {
    container: "c",
    containerMWh: 1,
    banks: ["A", "B"],
    racksPerBank: 2,
    cellsSeries: 416,
    dcRangeV: [1000, 1500],
    pcsAcV: 690,
    pcsKVA: 1725,
    pcsMaxMW: 1.7,
    trKVA: 3750,
    trRatio: "",
    trVector: "",
    lvLabel: "690 V",
    rmu: [
      { id: "H01", label: "", kind: "lbs" },
      { id: "H02", label: "", kind: "cb" },
      { id: "H03", label: "", kind: "lbs" },
    ],
  },
  limits: {
    socMin: 3.5,
    socMax: 97,
    tempMin: 19,
    tempMax: 25,
    derateC: 28,
    derateReleaseC: 24,
    dTdtWarn: 2,
    dvWarn: 50,
    sohInfo: 95,
  },
};

function makeUnit(n: number): NovaUnitState {
  return {
    n,
    rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
    banks: [
      { id: "A", soc: 50, soh: 99, vdc: 1300, tmax: 22, dvmV: 0, racks: [22, 22], dcb: "closed" },
      { id: "B", soc: 51, soh: 98, vdc: 1300, tmax: 23, dvmV: 0, racks: [23, 23], dcb: "closed" },
    ],
    pcs: [
      { id: "A", state: "dis", pMW: 0.2, igbtC: 40, limited: false },
      { id: "B", state: "stby", pMW: 0, igbtC: 38, limited: false },
    ],
  };
}

const state: NovaMimicState = {
  station: {
    H01: "closed",
    H02: "closed",
    H04: "closed",
    H05: "closed",
    kV: 34.5,
    hz: 50,
    es: { H01: false, H04: false, H05: false },
    iA: { H01: 10, H03: 10, H04: 5, H05: 5 },
  },
  poiMW: 1.2,
  feederMW: { A: 0.6, B: 0.6 },
  units: [1, 2, 3, 4, 5, 6].map(makeUnit),
};

describe("nova-mimic saf yardımcılar (T-14)", () => {
  it("computeEnergization fiderleri anahtarlardan hesaplar", () => {
    const e = computeEnergization(topo, state);
    expect(e.bus).toBe(true);
    expect(e.feeders.A).toBe(true);
    expect(e.units[1].inLive).toBe(true);
  });

  it("bankSeverity eşiklerini uygular", () => {
    const L = topo.limits;
    expect(bankSeverity({ tmax: 30, tmin: 25, dvmV: 0 }, L)).toBe("alarm");
    expect(bankSeverity({ tmax: 22, tmin: 10, dvmV: 0 }, L)).toBe("cold");
    expect(bankSeverity({ tmax: 22, tmin: 20, dvmV: 60 }, L)).toBe("warn");
    expect(bankSeverity({ tmax: 22, tmin: 20, dvmV: 0 }, L)).toBeNull();
  });

  it("tempFill sıcak/soğuk renk üretir", () => {
    expect(tempFill(30, topo.limits)).toContain("--nm-hot-rgb");
    expect(tempFill(10, topo.limits)).toContain("--nm-cold-rgb");
    expect(tempFill(22, topo.limits)).toContain("--nm-mid-rgb");
  });

  it("defaultUnitStatus arıza durumunu bildirir", () => {
    const u = makeUnit(1);
    u.pcs[0] = { ...u.pcs[0], state: "fault" };
    expect(defaultUnitStatus(u, topo.limits).sev).toBe("alarm");
  });
});

describe("applyNovaLightVars", () => {
  it("token'lardan CSS değişkeni üretir", () => {
    const map = novaVarMap();
    expect(map["--nm-fg"]).toBe("#18212a");
    expect(map["--nm-hot-rgb"]).toBe("206,46,28");
  });

  it("bir elemana uygular", () => {
    const el = document.createElement("div");
    applyNovaLightVars(el);
    expect(el.style.getPropertyValue("--nm-fg")).toBe("#18212a");
  });
});

describe("createNovaMimic (AK-3.1)", () => {
  it("6 ünite çizer ve destroy temizler", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    const mimic = createNovaMimic(svg, topo);
    mimic.update(state);
    expect(svg.querySelectorAll(".demo-unit")).toHaveLength(6);
    mimic.setOverlay("temp");
    mimic.setSelected(2);
    expect(mimic.getOverlay()).toBe("temp");
    mimic.destroy();
    expect(svg.innerHTML).toBe("");
    svg.remove();
  });

  it("AUX hücresi: AUX TR + L iletken + AUX PANEL kutusu çizilir", () => {
    const auxTopo: NovaTopology = {
      ...topo,
      aux: { trKVA: 400, trRatio: "34.5/0.4 kV", trVector: "Dyn11", lvV: 400, station: "s" },
      station: {
        ...topo.station,
        cells: topo.station.cells.map((c) => (c.id === "H02" ? { ...c, auxTr: true } : c)),
      },
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    const mimic = createNovaMimic(svg, auxTopo);
    mimic.update(state);
    const labels = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    expect(labels).toContain("AUX TR 400 kVA");
    expect(labels).toContain("AUX PANEL 400 V");
    expect(svg.querySelector('[data-target="aux"]')).not.toBeNull();
    expect(svg.querySelector('[id$="atr1"]')).not.toBeNull();
    expect(svg.querySelector('[id$="atr2"]')).not.toBeNull();
    mimic.destroy();
    svg.remove();
  });
});

describe("nova-mimic akış/motor/ES (UC-2, AK-2.1..2.3)", () => {
  function mount() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    return svg;
  }

  it("AK-2.1: deşarjda (poiMW>0) akış flow-discharge, şarjda (poiMW<0) flow-charge sınıfı taşır", () => {
    const svg = mount();
    const mimic = createNovaMimic(svg, topo);
    mimic.update({ ...state, poiMW: 1.2 });
    expect(svg.querySelector(".flow-discharge")).not.toBeNull();
    expect(svg.querySelector(".flow-charge")).toBeNull();
    mimic.update({ ...state, poiMW: -1.2 });
    expect(svg.querySelector(".flow-charge")).not.toBeNull();
    expect(svg.querySelector(".flow-discharge")).toBeNull();
    mimic.update({ ...state, poiMW: 0 });
    expect(svg.querySelector(".flowline.nm-on")).toBeNull();
    mimic.destroy();
    svg.remove();
  });

  it("AK-2.2: motorlu hücrede M işareti render edilir", () => {
    const svg = mount();
    createNovaMimic(svg, topo);
    expect(svg.querySelector(".nm-motor")).not.toBeNull();
    expect(svg.querySelector(".nm-motor text")?.textContent).toBe("M");
    svg.remove();
  });

  it("AK-2.3: RMU toprak ayırıcısı kapalıyken görünür", () => {
    const svg = mount();
    const mimic = createNovaMimic(svg, topo);
    mimic.update({ ...state, units: state.units.map((u) => ({ ...u, rmu: { ...u.rmu, es: true } })) });
    const es = svg.querySelector(".nm-es") as HTMLElement;
    expect(es.style.display).not.toBe("none");
    mimic.destroy();
    svg.remove();
  });
});
