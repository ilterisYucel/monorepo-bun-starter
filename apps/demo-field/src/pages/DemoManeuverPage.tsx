import React, { useMemo, useState } from "react";
import { DemoOperationsView, isStaleRun, type DemoActiveRun, type DemoOpDef, type DemoOpUnit } from "@gd-monorepo/ui";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DemoReadySection } from "../components/DemoReadySection";
import { DemoTrendsSection } from "../components/DemoTrendsSection";
import { demoManeuverApi } from "../features/demo-data/demoManeuverApi";
import { DEMO_STATIONS, pcsIdsForStation } from "../features/demo-data/demo-stations";
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
  // UC-13: operasyonlar seçili istasyona göre — units/scope/permissives/startup
  // `stationState` + `stationTopology`'den (stBar seçimiyle senkron).
  const { stationState: state, stationTopology, stationSystems, activeStation, runs, readyUnits } =
    useDemoProjectContext();
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

  // Aktif istasyon (gdems `A.k`): komutlar o istasyonun konteyneri + PCS çifti
  // ile sürülür; kapsam aktif istasyonun üniteleridir.
  const activeKey = DEMO_STATIONS[activeStation]?.key;
  const feedersFor = (scope: number[]) =>
    DEMO_STATIONS.filter((s) => scope.length === 0 || s.units.some((n) => scope.includes(n)));
  const systemsOf = (key: string): string[] | undefined => {
    const id = stationSystems[key];
    return id ? [id] : undefined;
  };
  const stationRuns = runs;

  const activeRun = useMemo(
    () =>
      activeFromRun(
        stationRuns.find((r) => r.status === "running" && !isStaleRun(r)) ?? stationRuns[0],
      ),
    [stationRuns],
  );

  const targetStatus = useMemo(() => {
    if (!tActive || target === null || tDir === null) return undefined;
    const soc = socOf(state, tScope);
    if (soc === undefined) return undefined;
    return `Target ${target} % · SOC ${soc.toFixed(1)} % · ${tDir === "chg" ? "charge" : "discharge"} → auto Standby on reach`;
  }, [tActive, target, tDir, tScope, state]);

  const startupChecks = useMemo(() => deriveStartupChecks(state, stationTopology), [state]);

  const lastCalibrationAt = useMemo(() => {
    const times = runs
      .filter((r) => (r.name === "calibration" || r.name === "fl04_calibration") && r.status === "completed" && r.finishedAt)
      .map((r) => Date.parse(r.finishedAt as string))
      .filter((t) => Number.isFinite(t));
    return times.length ? Math.max(...times) : undefined;
  }, [runs]);

  const auxKw = state.units[0]?.aux?.kW ?? 0;

  /**
   * Komutu kapsamdaki HER fidere ayrı gönderir: o fiderin konteyneri (systems) +
   * PCS çifti (deviceIds) + o fiderin kapsam üniteleri. `params` fider başına
   * hesaplanabilir (FL-02 gücü fiderin gerçek PCS sayısıyla çarpılır).
   */
  const execute = async (
    name: string,
    kind: "maneuver" | "operation",
    params: Record<string, unknown> | ((key: string) => Record<string, unknown>),
    scope: number[] = state.units.map((u) => u.n),
  ): Promise<void> => {
    setBusy(true);
    setMessage("");
    const feeders = feedersFor(scope);
    const res = await Promise.allSettled(
      feeders.map((st) => {
        const systems = systemsOf(st.key);
        return demoManeuverApi.execute({
          name,
          kind,
          params: typeof params === "function" ? params(st.key) : params,
          scope: st.units.filter((n) => scope.length === 0 || scope.includes(n)),
          deviceIds: [...pcsIdsForStation(st.key)],
          ...(systems ? { systems } : {}),
        });
      }),
    );
    const failed = res
      .map((r, i) => (r.status === "rejected" ? `${feeders[i]?.cell}: ${(r.reason as Error).message}` : null))
      .filter(Boolean);
    setMessage(
      failed.length
        ? `Rejected: ${failed.join(" · ")}`
        : `Command accepted (${name}) · ${feeders.map((s) => s.name).join(" + ")}.`,
    );
    setBusy(false);
  };

  const handleRun = (key: string, params: Record<string, unknown>): void => {
    setMessage("");
    if (key === "chgdis") {
      const dir = params.dir === "chg" ? "chg" : "dis";
      const tRaw = String(params.target ?? "").trim();
      const scope = Array.isArray(params.scope) ? (params.scope as number[]) : state.units.map((u) => u.n);
      if (scope.length === 0) {
        setMessage("Rejected: no BESS unit selected in scope.");
        return;
      }
      const name = dir === "chg" ? "charge" : "discharge";
      if (tRaw !== "") {
        const t = Number(tRaw);
        const { socMin, socMax } = stationTopology.limits;
        if (!Number.isFinite(t) || t < socMin || t > socMax) {
          setMessage(`Rejected: target SOC must be within ${socMin}–${socMax} %.`);
          return;
        }
        const soc = socOf(state, scope);
        if (soc !== undefined && (dir === "chg" ? t <= soc : t >= soc)) {
          setMessage(`Rejected: target ${t} % is not ${dir === "chg" ? "above" : "below"} current SOC ${soc.toFixed(1)} %.`);
          return;
        }
        setTarget(t, dir, scope, activeKey);
      } else {
        clearTarget();
      }
      // 2026-10-15 dağıtım: girilen MW istasyon PCS sayısına bölünür → her PCS
      // aynı setpoint'i alır. Backend `{{divideTotal}}` toplamı gerçek PCS
      // çiftine (deviceIds) böldüğünden, toplam = PCS başı × gerçek PCS sayısı.
      const powerMW = Number(params.powerMW ?? 0);
      const stationPcsCount = state.units.length * 2;
      if (!(powerMW > 0) || stationPcsCount === 0) {
        setMessage("Rejected: enter a power above 0 MW.");
        return;
      }
      const perPcsKw = Math.round((powerMW * 1000) / stationPcsCount);
      // Fider başına: PCS başı kW × o fiderin gerçek PCS sayısı (backend divideTotal böler).
      void execute(
        name,
        "operation",
        (key) => ({ powerKw: perPcsKw * pcsIdsForStation(key).length, powerMW, perPcsKw }),
        scope,
      );
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
      // FL-04 / FL-05 / FL-11: seçilen grup(lar) kapsam olarak gider (eskiden düşürülüyordu).
      const units = Array.isArray(params.units) ? (params.units as number[]) : [];
      if (units.length === 0) {
        setMessage("Rejected: select at least one group to calibrate.");
        return;
      }
      void execute("calibration", "operation", { powerKw: 200 }, units);
    } else if (key === "estop") void execute("fl05_emergency_stop", "maneuver", { unit: params.unit }, [Number(params.unit)]);
    else if (key === "maint") void execute("field_maintenance", "operation", { unit: params.unit }, [Number(params.unit)]);
  };

  const handleStop = async (): Promise<void> => {
    clearTarget();
    setBusy(true);
    setMessage("");
    try {
      const key = DEMO_STATIONS[activeStation]?.key;
      await demoManeuverApi.stop(key ? systemsOf(key) : undefined);
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
        key={activeStation}
        defs={DEFS}
        units={units}
        activeRun={activeRun}
        runs={stationRuns}
        station={state.station}
        topology={stationTopology}
        permissivesFor={(o) => derivePermissives(state, stationTopology, { ...o, lastCalibrationAt, auxKw })}
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
