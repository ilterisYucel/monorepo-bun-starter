import React, { useMemo, useState } from "react";
import { DemoOperationsView, type DemoActiveRun, type DemoOpDef, type DemoOpUnit } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DemoReadySection } from "../components/DemoReadySection";
import { DemoTrendsSection } from "../components/DemoTrendsSection";
import { demoManeuverApi } from "../features/demo-data/demoManeuverApi";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { derivePermissives, deriveStartupChecks } from "../features/demo-data/demo-permissives";
import { socOf } from "../features/demo-data/useTargetSocWatcher";
import { useTargetSocStore } from "../features/demo-data/stores/TargetSocStore";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";

const def = (
  key: string,
  id: string,
  title: string,
  summary: string,
  icon: DemoOpDef["icon"],
  extra: Partial<DemoOpDef> = {},
): DemoOpDef => ({ key, id, title, summary, icon, ...extra });

const RULES = [
  "Charge / discharge is never accepted while any breaker or disconnector in the path is in the earthed position.",
  "MV equipment without a motor operator: the operator is asked to switch it manually and confirm the position.",
  "FL-06 Recovery, FL-07 Communication Loss and FL-10 Islanding are not shown in the front-end.",
  "The BSC charge / discharge power limit registers cap every PCS setpoint while charging or discharging.",
];

const DEFS: DemoOpDef[] = [
  def("startup", "FL-01", "Start-Up / Shut-Down", "Site-wide availability check → Ready.", "power", {
    sequence: [
      { dev: "BSC", addr: "40010", text: "Start (0x0002)" },
      { dev: "BSC", addr: "40010", text: "Close Contactors (0x0005)" },
      { dev: "PCS", addr: "0x0E00", text: "S01 Command source = EMS" },
      { dev: "PCS", addr: "0x0E02", text: "S03 On-grid control = P-Q" },
      { dev: "PCS", addr: "0x0E17", text: "S19 Standby" },
    ],
    monitor: [
      "All devices online (BSC 30035 heartbeat, PCS comm.)",
      "AUX transformer energy analyzer within thresholds",
      "MV metering cell (H03) voltage / frequency / phase within thresholds",
    ],
  }),
  def("chgdis", "FL-02", "Charge / Discharge", "Active power split over the online PCS.", "bolt", {
    sequence: [
      { dev: "PCS", addr: "0x0E19", text: "S06 Active power (+dis / −chg)" },
      { dev: "PCS", addr: "0x0E14", text: "S16 Start" },
    ],
    monitor: [
      "MV metering cell P vs request",
      "BSC 30063 / 30065 power limits",
      "PCS 0x2F7D status",
      "MV breaker positions",
      "Earthing switches (never closed)",
    ],
    rules: RULES,
  }),
  def("standby", "FL-03", "Idle / Standby", "Power to zero, PCS stay energised.", "stby", {
    sequence: [
      { dev: "PCS", addr: "0x0E19", text: "S06 Active power = 0" },
      { dev: "PCS", addr: "0x0E17", text: "S19 Standby" },
    ],
    monitor: ["MV metering P < threshold", "Group availability"],
  }),
  def("calib", "FL-04", "Calibration", "Trigger → schedule → monitor → complete.", "calib", {
    sequence: [{ dev: "DC block", text: "Calibration start request (register TBD by GD DC-block map)" }],
    monitor: [
      "BSC 30107 No. of recalibration racks",
      "Rack 30271 calibration information",
      'DC block "Calibration complete" status',
    ],
  }),
  def("estop", "FL-05", "Emergency Stop", "PCS stop, contactors open, group earthed.", "stop", {
    sequence: [
      { dev: "PCS", addr: "0x0E19", text: "S06 Active power = 0" },
      { dev: "PCS", addr: "0x0E15", text: "S17 Stop" },
      { dev: "BSC", addr: "40010", text: "Emergency (0x0001)" },
      { dev: "MV", text: "RMU H02 OPEN" },
      { dev: "MV", text: "RMU earthing switch CLOSE (manual)" },
    ],
    monitor: [
      "PCS 0x2F60 E-stop bits",
      "PCS 0x2F5B AC breaker = Open",
      "BSC 30038 online racks = 0",
      "RMU H02 / ES position",
    ],
  }),
  def("blackstart", "FL-08", "Black Start", "Procedure pending in REV.01.", "grid", { pending: true }),
  def("microgrid", "FL-09", "Microgrid", "Procedure pending in REV.01.", "units", { pending: true }),
  def("maint", "FL-11", "Maintenance Mode", "Isolate a group (DC block to maintenance).", "earth", {
    sequence: [
      { dev: "PCS", addr: "0x0E19", text: "S06 Active power = 0" },
      { dev: "PCS", addr: "0x0E15", text: "S17 Stop" },
      { dev: "BSC", addr: "40010", text: "Open All Contactors (0x0004)" },
      { dev: "BSC", addr: "40010", text: "Enter Manual Mode (0x0006)" },
      { dev: "MV", text: "RMU H02 OPEN · ES CLOSE (manual)" },
    ],
    monitor: ["BSC 30036 state = Manual", "PCS stopped, AC breaker open", "RMU H02 open, ES closed"],
  }),
];

function activeFromRun(run: OperationRunRecord | undefined): DemoActiveRun | undefined {
  if (!run) return undefined;
  const steps = Array.isArray(run.steps)
    ? (run.steps as Array<Record<string, unknown>>).map((s, i) => ({
        label: typeof s.label === "string" ? s.label : typeof s.name === "string" ? s.name : `Step ${i + 1}`,
        status: typeof s.status === "string" ? s.status : "pending",
      }))
    : [];
  return { name: run.name, label: run.name, status: run.status, steps };
}

/** DemoManeuverPage (Operations) — UC-5: FL listesi + formlar + canlı sağ sütun. */
export const DemoManeuverPage: React.FC = () => {
  const { state, runs, readyUnits } = useDemoProjectContext();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const target = useTargetSocStore((s) => s.target);
  const tDir = useTargetSocStore((s) => s.dir);
  const tScope = useTargetSocStore((s) => s.scope);
  const tActive = useTargetSocStore((s) => s.active);
  const setTarget = useTargetSocStore((s) => s.setTarget);
  const clearTarget = useTargetSocStore((s) => s.clear);

  const units: DemoOpUnit[] = useMemo(
    () =>
      state.units.map((u) => ({
        n: u.n,
        soc: u.banks.length ? (u.banks[0].soc + (u.banks[1]?.soc ?? u.banks[0].soc)) / 2 : 0,
        available: u.rmu.H02 === "closed",
        note: readyUnits.find((r) => r.n === u.n)?.note ?? "",
      })),
    [state.units, readyUnits],
  );

  const activeRun = useMemo(
    () => activeFromRun(runs.find((r) => r.status === "running") ?? runs[0]),
    [runs],
  );

  const targetStatus = useMemo(() => {
    if (!tActive || target === null || tDir === null) return undefined;
    const soc = socOf(state, tScope);
    if (soc === undefined) return undefined;
    return `Target ${target} % · SOC ${soc.toFixed(1)} % · ${tDir === "chg" ? "charge" : "discharge"} → auto Standby on reach`;
  }, [tActive, target, tDir, tScope, state]);

  const startupChecks = useMemo(() => deriveStartupChecks(state, DEMO_TOPOLOGY), [state]);

  const lastCalibrationAt = useMemo(() => {
    const times = runs
      .filter((r) => (r.name === "calibration" || r.name === "fl04_calibration") && r.status === "completed" && r.finishedAt)
      .map((r) => Date.parse(r.finishedAt as string))
      .filter((t) => Number.isFinite(t));
    return times.length ? Math.max(...times) : undefined;
  }, [runs]);

  const auxKw = state.units[0]?.aux?.kW ?? 0;

  const execute = async (name: string, kind: "maneuver" | "operation", params: Record<string, unknown>): Promise<void> => {
    setBusy(true);
    setMessage("");
    try {
      await demoManeuverApi.execute({ name, kind, params, scope: state.units.map((u) => u.n) });
      setMessage(`Command accepted (${name}).`);
    } catch (e) {
      setMessage(`Rejected: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRun = (key: string, params: Record<string, unknown>): void => {
    setMessage("");
    if (key === "chgdis") {
      const dir = params.dir === "chg" ? "chg" : "dis";
      const tRaw = String(params.target ?? "").trim();
      const scope = Array.isArray(params.scope) ? (params.scope as number[]) : state.units.map((u) => u.n);
      const name = dir === "chg" ? "charge" : "discharge";
      if (tRaw !== "") {
        const t = Number(tRaw);
        if (Number.isFinite(t)) setTarget(t, dir, scope);
      } else {
        clearTarget();
      }
      void execute(name, "operation", { powerKw: Number(params.powerKw ?? 200) });
      return;
    }
    clearTarget();
    if (key === "startup") void execute("fl01_startup", "maneuver", {});
    else if (key === "shutdown") void execute("fl01_shutdown", "maneuver", {});
    else if (key === "standby") void execute("standby", "operation", {});
    else if (key === "calib") {
      if (params.when === "at") {
        setMessage(`Scheduling at ${String(params.at)} — backend scheduleAt pending (B-1).`);
        return;
      }
      void execute("calibration", "operation", { powerKw: 200 });
    } else if (key === "estop") void execute("fl05_emergency_stop", "maneuver", {});
    else if (key === "maint") void execute("field_maintenance", "operation", {});
  };

  const handleStop = async (): Promise<void> => {
    clearTarget();
    setBusy(true);
    setMessage("");
    try {
      await demoManeuverApi.stop();
      setMessage("Standby command sent.");
    } catch (e) {
      setMessage(`Stop failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DemoReadySection />
      <DemoTrendsSection />
      <DemoOperationsView
        defs={DEFS}
        units={units}
        activeRun={activeRun}
        runs={runs}
        station={state.station}
        topology={DEMO_TOPOLOGY}
        permissivesFor={(o) => derivePermissives(state, DEMO_TOPOLOGY, { ...o, lastCalibrationAt, auxKw })}
        startupChecks={startupChecks}
        targetStatus={targetStatus}
        busy={busy}
        message={message}
        onRun={handleRun}
        onStop={handleStop}
      />
    </>
  );
};
