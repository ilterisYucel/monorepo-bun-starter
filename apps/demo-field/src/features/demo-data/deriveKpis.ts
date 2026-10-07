import type { NovaMimicState, NovaTopology } from "@gd-monorepo/ui";
import { deriveAlerts } from "./deriveAlerts";

/**
 * KPI türevi (SPEC UC-4/T-15, FR-4.1). Saf — state + topoloji girer, özet
 * çıkar. Alarm/uyarı sayıları deriveAlerts'ten gelir (tek doğruluk noktası).
 */

export interface NovaKpis {
  mode: "chg" | "dis" | "rest" | "stby";
  modeLabel: string;
  poiMW: number;
  poiDir: "Deşarj" | "Şarj" | "Boşta";
  avgSoc: number;
  avgSoh: number;
  sohMin: number;
  tmax: number;
  tmin: number;
  availUnits: number;
  totalUnits: number;
  runPcs: number;
  totalPcs: number;
  alarms: number;
  warns: number;
  colds: number;
  maints: number;
}

const MODE_LABEL: Record<NovaKpis["mode"], string> = {
  chg: "Şarj",
  dis: "Deşarj",
  rest: "Dinlenme",
  stby: "Bekleme",
};

export function deriveKpis(
  state: NovaMimicState,
  topo: NovaTopology,
): NovaKpis {
  const units = state.units;
  const banks = units.flatMap((u) => u.banks);
  const pcsAll = units.flatMap((u) => u.pcs);
  const alerts = deriveAlerts(state, topo);

  const avg = (xs: number[]): number =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  const runPcs = pcsAll.filter((p) => p.state === "chg" || p.state === "dis").length;
  const availUnits = units.filter(
    (u) => u.rmu.H02 === "closed" && u.pcs.some((p) => p.state !== "fault" && p.state !== "off"),
  ).length;

  const mode: NovaKpis["mode"] = pcsAll.some((p) => p.state === "chg")
    ? "chg"
    : pcsAll.some((p) => p.state === "dis")
      ? "dis"
      : pcsAll.some((p) => p.state === "rest")
        ? "rest"
        : "stby";

  const count = (sev: string): number => alerts.filter((a) => a.sev === sev).length;

  return {
    mode,
    modeLabel: MODE_LABEL[mode],
    poiMW: state.poiMW,
    poiDir: state.poiMW > 0.05 ? "Deşarj" : state.poiMW < -0.05 ? "Şarj" : "Boşta",
    avgSoc: avg(banks.map((b) => b.soc)),
    avgSoh: avg(banks.map((b) => b.soh)),
    sohMin: banks.length ? Math.min(...banks.map((b) => b.soh)) : 0,
    tmax: banks.length ? Math.max(...banks.map((b) => b.tmax)) : 0,
    tmin: banks.length ? Math.min(...banks.map((b) => b.tmin ?? b.tmax)) : 0,
    availUnits,
    totalUnits: units.length,
    runPcs,
    totalPcs: pcsAll.length,
    alarms: count("alarm"),
    warns: count("warn"),
    colds: count("cold"),
    maints: count("maint"),
  };
}
