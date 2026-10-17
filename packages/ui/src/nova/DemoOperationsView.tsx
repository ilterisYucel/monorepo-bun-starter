import React, { useEffect, useMemo, useState } from "react";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import type { NovaStationState, NovaTopology } from "./mimic-types";
import { POS_TEXT } from "./nova-mimic";
import { NOVA_ICONS, type NovaIconName } from "../icons/demo-icons";
import type { DemoActiveRun } from "./maneuver-types";

/**
 * DemoOperationsView — Operations (manevra) ekranı (SPEC UC-5): sol FL listesi,
 * ortada kind-bazlı form (gruplar/yön/güç/hedef SOC/permissives/onay), sağda
 * aktif program + adım adım sekanslar + MV Station. Referans konsol düzeni.
 */

export interface DemoOpSequenceStep {
  dev: string;
  addr?: string;
  text: string;
}

export interface DemoOpDef {
  key: string;
  id: string;
  title: string;
  summary: string;
  icon: NovaIconName;
  pending?: boolean;
  monitor?: string[];
  sequence?: DemoOpSequenceStep[];
  rules?: string[];
}

export interface DemoOpUnit {
  n: number;
  soc: number;
  available: boolean;
  note: string;
}

export interface DemoPermission {
  ok: boolean;
  hard: boolean;
  label: string;
  detail: string;
}

export interface DemoOperationsViewProps {
  defs: DemoOpDef[];
  units: DemoOpUnit[];
  activeRun?: DemoActiveRun;
  runs: OperationRunRecord[];
  station: NovaStationState;
  topology: NovaTopology;
  permissivesFor: (opts: { dir: "chg" | "dis"; powerKw: number; scope: number[] }) => DemoPermission[];
  /** FL-01 site availability kontrolleri (referans `suCheck`). */
  startupChecks?: DemoPermission[];
  targetStatus?: string;
  busy?: boolean;
  message?: string;
  onRun: (key: string, params: Record<string, unknown>) => void;
  onStop: () => void;
}

type StepState = "done" | "active" | "await" | "failed" | "pending";

export interface ParsedStep {
  label: string;
  state: StepState;
}

const stepStateFor = (status: OperationRunRecord["status"]): StepState => {
  if (status === "completed") return "done";
  if (status === "running") return "active";
  if (status === "failed" || status === "rolled_back") return "failed";
  return "pending";
};

/**
 * UC-13 zombie-run koruması: yanıtı kaybolan uzak adım run'ları `running`
 * kalabilir (bkz. KAPANIŞ Ek). Bu yaştan eski "running" koşular "bayat" sayılır —
 * Active program'ı kilitlemez, Sequences'te STALE etiketiyle gösterilir.
 */
export const STALE_RUN_MS = 90_000;

export function isStaleRun(run: OperationRunRecord, now: number = Date.now()): boolean {
  if (run.status !== "running") return false;
  const started = Date.parse(run.startedAt);
  return Number.isFinite(started) && now - started > STALE_RUN_MS;
}

/**
 * Run kaydından adım listesi. Backend `steps` alanı çalıştırılan sonuçları
 * DEĞİL tanımı taşır (`steps.definition.steps: [{command, deviceTypes}]`);
 * legacy dizi şekli de desteklenir. Adım durumu run durumundan türetilir.
 */
export function parseRunSteps(run: OperationRunRecord): ParsedStep[] {
  const raw = run.steps as unknown;
  let arr: Array<Record<string, unknown>> = [];
  if (Array.isArray(raw)) arr = raw as Array<Record<string, unknown>>;
  else {
    const def = (raw as { definition?: { steps?: unknown } } | null)?.definition;
    if (def && Array.isArray(def.steps)) arr = def.steps as Array<Record<string, unknown>>;
  }
  const state = stepStateFor(run.status);
  return arr.map((s, i) => {
    const dev = Array.isArray(s.deviceTypes) && s.deviceTypes.length ? ` · ${(s.deviceTypes as string[]).join("/")}` : "";
    const label =
      typeof s.label === "string"
        ? s.label
        : `${typeof s.command === "string" ? s.command : typeof s.name === "string" ? s.name : `Step ${i + 1}`}${dev}`;
    return { label, state };
  });
}

/** Run adını manevra kataloğu etiketine çevirir (FL-02 · Charge / Discharge). */
const RUN_KEY: Record<string, string> = {
  charge: "chgdis",
  discharge: "chgdis",
  full_charge: "chgdis",
  full_discharge: "chgdis",
  standby: "standby",
  fl03_idle: "standby",
  calibration: "calib",
  fl04_calibration: "calib",
  fl01_startup: "startup",
  fl01_shutdown: "startup",
  fl05_emergency_stop: "estop",
  field_maintenance: "maint",
};

export function runLabel(name: string, defs: DemoOpDef[]): string {
  const d = defs.find((x) => x.key === RUN_KEY[name]);
  return d ? `${d.id} · ${d.title}` : name;
}

const RUN_TAG: Record<string, string> = {
  completed: "c-ok",
  running: "c-info",
  failed: "c-alarm",
  rolled_back: "c-warn",
};
const RUN_TAG_TXT: Record<string, string> = {
  completed: "DONE",
  running: "RUNNING",
  failed: "FAILED",
  rolled_back: "ROLLED BACK",
};

const hhmm = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const DemoOperationsView: React.FC<DemoOperationsViewProps> = ({
  defs,
  units,
  activeRun,
  runs,
  station,
  topology,
  permissivesFor,
  startupChecks,
  targetStatus,
  busy = false,
  message = "",
  onRun,
  onStop,
}) => {
  const [op, setOp] = useState("chgdis");
  const [scope, setScope] = useState<Set<number>>(new Set(units.map((u) => u.n)));
  const [dir, setDir] = useState<"chg" | "dis">("dis");
  // FL-02 gücü MW cinsinden (istasyon toplamı); PCS başına = MW ÷ istasyon PCS sayısı.
  const [powerMW, setPowerMW] = useState(1);
  const stationPcs = Math.max(1, units.length * 2);
  const perPcsKw = (powerMW * 1000) / stationPcs;
  const powerKw = powerMW * 1000;
  const [target, setTarget] = useState("");
  const [calUnits, setCalUnits] = useState<Set<number>>(new Set());
  const [calWhen, setCalWhen] = useState<"now" | "at">("now");
  const [calTime, setCalTime] = useState("16:00");
  const [unit, setUnit] = useState(units[0]?.n ?? 1);
  const [confirm, setConfirm] = useState(false);
  // FL-05 / FL-11: iki adımlı onay (referans app.js confirm metinleri).
  const [armed, setArmed] = useState<"estop" | "maint" | null>(null);

  // Units can arrive after mount (telemetry gecikmesi): mount'ta boşken scope
  // boş kalır ve Send devre dışı kalırdı. Units geldiğinde (ve kullanıcı seçim
  // yapmadıysa) varsayılan kapsamı ve birimi senkronla — MEVCUT seçimi ezmez.
  useEffect(() => {
    setScope((prev) =>
      prev.size === 0 && units.length > 0
        ? new Set(units.map((u) => u.n))
        : prev,
    );
    setUnit((prev) =>
      units.some((u) => u.n === prev) ? prev : (units[0]?.n ?? prev),
    );
  }, [units]);

  const def = defs.find((d) => d.key === op) ?? defs[0];
  const L = topology.limits;
  const scopeList = [...scope].sort((a, b) => a - b);
  const permissives = useMemo(
    () => permissivesFor({ dir, powerKw, scope: scopeList }),
    [permissivesFor, dir, powerKw, scopeList],
  );
  // FL-02: HERHANGİ bir izin başarısızsa gönderim engellenir (sim.js permissives;
  // eskiden yalnız "hard" topraklama izni engelliyordu).
  const failing = permissives.filter((p) => !p.ok);
  const startupFailing = (startupChecks ?? []).filter((p) => !p.ok);
  const maxMW = (stationPcs * 1725) / 1000;

  const lastFull = useMemo(() => {
    const pick = (name: string): string | undefined =>
      runs
        .filter((r) => r.name === name && r.status === "completed" && r.finishedAt)
        .map((r) => r.finishedAt as string)
        .sort()
        .pop();
    return { chg: pick("full_charge"), dis: pick("full_discharge") };
  }, [runs]);

  const toggle = (set: Set<number>, n: number, setter: (s: Set<number>) => void): void => {
    const next = new Set(set);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setter(next);
  };

  return (
    <div className="ops">
      <nav className="card mlist" aria-label="Maneuvers">
        <header>
          <h2>
            Maneuvers<small>GD-PMS REV.01</small>
          </h2>
        </header>
        <div id="mList">
          {defs.map((d) => {
            const Icon = NOVA_ICONS[d.icon];
            return (
              <button
                key={d.key}
                type="button"
                data-testid={`ops-item-${d.key}`}
                className={`mv ${d.pending ? "pending" : ""}`}
                aria-pressed={op === d.key}
                onClick={() => {
                  setOp(d.key);
                  setConfirm(false);
                }}
              >
                <Icon size={22} />
                <span>
                  <b>
                    {d.id} · {d.title}
                  </b>
                  <small>{d.pending ? "Procedure pending in REV.01" : d.summary}</small>
                </span>
              </button>
            );
          })}
        </div>
        <p className="note">
          Recovery, communication loss and islanding run automatically in the backend and are not shown here.
        </p>
      </nav>

      <section className="card mform">
        <header className="fh2">
          <span className="ki">{React.createElement(NOVA_ICONS[def.icon], { size: 22 })}</span>
          <div>
            <h2>
              {def.id} · {def.title}
            </h2>
            <p>{def.summary}</p>
          </div>
        </header>
        <div className="fbody">
          {def.pending ? (
            <div className="pend">
              <b>Procedure pending</b>
              <p>{def.title} is listed in GD-PMS REV.01 without a defined sequence yet.</p>
            </div>
          ) : null}

          {op === "startup" && !def.pending ? (
            <div className="fs">
              <h4>Site availability</h4>
              <ul className="perm">
                {(startupChecks ?? permissives).map((p) => (
                  <li key={p.label} className={p.ok ? "ok" : p.hard ? "hard" : "bad"}>
                    <PermIcon ok={p.ok} />
                    <span>{p.label}</span>
                    <em>{p.detail}</em>
                  </li>
                ))}
              </ul>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || startupFailing.length > 0}
                  title={startupFailing.length ? `Blocked: ${startupFailing.map((p) => p.label).join(" · ")}` : undefined}
                  onClick={() => onRun("startup", {})}
                >
                  Start-up
                </button>
                <button type="button" className="btn btn-warn" disabled={busy} onClick={() => onRun("shutdown", {})}>
                  Shut-down
                </button>
              </div>
              {startupFailing.length ? (
                <p className="okmsg" style={{ color: "var(--nm-alarm, #c0392b)" }}>
                  Start-up blocked — {startupFailing.length} check(s) not passed.
                </p>
              ) : null}
              <p className="okmsg">{message}</p>
            </div>
          ) : null}

          {op === "chgdis" && !def.pending ? (
            <>
              <div className="fs">
                <div className="fh">
                  <h4>1 · Groups</h4>
                  <span>
                    <button type="button" className="link" onClick={() => setScope(new Set(units.map((u) => u.n)))}>
                      All available
                    </button>{" "}
                    ·{" "}
                    <button type="button" className="link" onClick={() => setScope(new Set())}>
                      Clear
                    </button>
                  </span>
                </div>
                <div className="scope">
                  {units.map((u) => (
                    <button key={u.n} type="button" className="chipb" aria-pressed={scope.has(u.n)} disabled={!u.available} onClick={() => toggle(scope, u.n, setScope)}>
                      <b>BESS#{u.n}</b>
                      <small>SOC {u.soc.toFixed(0)} %</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="fs">
                <h4>2 · Direction and power</h4>
                <div className="params">
                  <div className="fld">
                    <span>Direction</span>
                    <div className="seg" role="group">
                      <button type="button" data-testid="ops-dir-chg" aria-pressed={dir === "chg"} onClick={() => setDir("chg")}>
                        Charge
                      </button>
                      <button type="button" data-testid="ops-dir-dis" aria-pressed={dir === "dis"} onClick={() => setDir("dis")}>
                        Discharge
                      </button>
                    </div>
                  </div>
                  <label className="fld">
                    <span>Active power (MW)</span>
                    <span className="inl">
                      <input
                        type="number"
                        data-testid="ops-power"
                        min={0}
                        max={maxMW}
                        step={0.1}
                        value={powerMW}
                        onChange={(e) => setPowerMW(Math.max(0, Math.min(maxMW, Number(e.target.value))))}
                      />
                    </span>
                    <small data-testid="ops-per-pcs">
                      Station total · per PCS {perPcsKw.toFixed(1)} kW = {powerMW} MW ÷ {stationPcs} PCS in the station (max{" "}
                      {maxMW.toFixed(2)} MW = {stationPcs} × 1725 kW; POI availability is checked in permissive 8).
                    </small>
                  </label>
                  <label className="fld">
                    <span>Target SOC (%)</span>
                    <span className="inl">
                      <input
                        type="number"
                        data-testid="ops-target"
                        min={L.socMin}
                        max={L.socMax}
                        step={0.5}
                        value={target}
                        placeholder={dir === "chg" ? String(L.socMax) : String(L.socMin)}
                        onChange={(e) => setTarget(e.target.value)}
                      />
                    </span>
                    <small>Empty = plain {dir === "chg" ? "charge" : "discharge"}. Filled = auto Standby at target (frontend).</small>
                  </label>
                  <div className="fld">
                    <span>Control mode</span>
                    <div className="seg" role="group" aria-label="Control mode">
                      <button type="button" aria-pressed="true">
                        Active power
                      </button>
                      <button type="button" disabled title="Defined after final PCS control documentation">
                        P/Q
                      </button>
                      <button type="button" disabled title="Defined after final PCS control documentation">
                        PF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="fs">
                <h4>3 · Permissives</h4>
                <ul className="perm">
                  {permissives.map((p) => (
                    <li key={p.label} className={p.ok ? "ok" : p.hard ? "hard" : "bad"}>
                      <PermIcon ok={p.ok} />
                      <span>{p.label}</span>
                      <em>{p.detail}</em>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="fs send">
                <p className="summary">
                  <b>
                    {dir === "chg" ? "Charge" : "Discharge"} {powerMW} MW
                  </b>{" "}
                  · {perPcsKw.toFixed(1)} kW / PCS{" "}
                  · {scopeList.length ? `BESS#${scopeList.join(", #")}` : "no group selected"}
                  {target !== "" && target.trim() !== "" ? ` · target ${target} %` : ""}
                </p>
                {confirm ? (
                  <div className="confirm">
                    <b>
                      {dir === "chg" ? "Charge" : "Discharge"} {powerMW} MW ({perPcsKw.toFixed(1)} kW per PCS × {stationPcs} PCS) on BESS#{scopeList.join(", #")}?
                    </b>
                    <div className="row">
                      <button
                        type="button"
                        data-testid="ops-confirm"
                        className="btn btn-primary"
                        disabled={busy || scopeList.length === 0 || failing.length > 0}
                        onClick={() => {
                          setConfirm(false);
                          onRun("chgdis", { powerMW, perPcsKw, dir, target, scope: scopeList });
                        }}
                      >
                        Confirm and execute
                      </button>
                      <button type="button" className="btn" onClick={() => setConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="ops-send"
                    className="btn btn-primary"
                    disabled={scopeList.length === 0 || busy || failing.length > 0}
                    onClick={() => setConfirm(true)}
                  >
                    Send command
                  </button>
                )}
                {failing.length ? (
                  <p className="okmsg" data-testid="ops-blocked" style={{ color: "var(--nm-alarm, #c0392b)" }}>
                    Blocked — {failing.length} permissive(s) not met: {failing.map((p) => p.label).join(" · ")}
                  </p>
                ) : null}
                {targetStatus ? (
                  <p className="okmsg" data-testid="ops-target-status" style={{ color: "var(--nm-info)" }}>
                    {targetStatus}
                  </p>
                ) : null}
                <p className="okmsg">{message}</p>
              </div>
            </>
          ) : null}

          {op === "standby" && !def.pending ? (
            <div className="fs send">
              <p className="summary">
                <b>Standby</b> · whole site (BESS#1–{units.length})
              </p>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onRun("standby", {})}>
                Go to Standby
              </button>
              <p className="okmsg">{message}</p>
            </div>
          ) : null}

          {op === "calib" && !def.pending ? (
            <>
              <div className="fs">
                <h4>Groups to calibrate</h4>
                <div className="scope">
                  {units.map((u) => (
                    <button key={u.n} type="button" className="chipb" aria-pressed={calUnits.has(u.n)} onClick={() => toggle(calUnits, u.n, setCalUnits)}>
                      <b>BESS#{u.n}</b>
                      <small>SOC {u.soc.toFixed(0)} %</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="fs">
                <h4>Schedule</h4>
                <div className="params">
                  <div className="fld">
                    <span>When</span>
                    <div className="seg" role="group">
                      <button type="button" aria-pressed={calWhen === "now"} onClick={() => setCalWhen("now")}>
                        Start now
                      </button>
                      <button type="button" aria-pressed={calWhen === "at"} onClick={() => setCalWhen("at")}>
                        At time
                      </button>
                    </div>
                  </div>
                  {calWhen === "at" ? (
                    <label className="fld">
                      <span>Start time (site clock)</span>
                      <span className="inl">
                        <input type="time" value={calTime} onChange={(e) => setCalTime(e.target.value)} />
                      </span>
                      <small>Scheduling needs backend `scheduleAt` support (B-1).</small>
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="fs send">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || calUnits.size === 0}
                  onClick={() => onRun("calib", { when: calWhen, at: calTime, units: [...calUnits].sort((a, b) => a - b) })}
                >
                  {calWhen === "now" ? "Start calibration" : "Schedule calibration"}
                </button>
                <p className="okmsg">{message}</p>
              </div>
            </>
          ) : null}

          {op === "estop" && !def.pending ? (
            <div className="fs send">
              <label className="fld">
                <span>Group</span>
                <select value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
                  {units.map((u) => (
                    <option key={u.n} value={u.n}>
                      BESS#{u.n}
                    </option>
                  ))}
                </select>
              </label>
              <SequenceList steps={def.sequence} />
              {armed === "estop" ? (
                <div className="confirm">
                  <b>Emergency stop BESS#{unit}? BSC Emergency (0x0001) + PCS stop — not reversible without FL-06 recovery.</b>
                  <div className="row">
                    <button
                      type="button"
                      data-testid="ops-estop-confirm"
                      className="btn btn-danger"
                      disabled={busy}
                      onClick={() => {
                        setArmed(null);
                        onRun("estop", { unit });
                      }}
                    >
                      Confirm emergency stop
                    </button>
                    <button type="button" className="btn" onClick={() => setArmed(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-danger big" disabled={busy} onClick={() => setArmed("estop")}>
                  Emergency stop
                </button>
              )}
              <p className="okmsg">{message}</p>
            </div>
          ) : null}

          {op === "maint" && !def.pending ? (
            <div className="fs send">
              <label className="fld">
                <span>Group</span>
                <select value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
                  {units.map((u) => (
                    <option key={u.n} value={u.n}>
                      BESS#{u.n}
                    </option>
                  ))}
                </select>
              </label>
              <SequenceList steps={def.sequence} />
              {armed === "maint" ? (
                <div className="confirm">
                  <b>Put BESS#{unit} into maintenance? The group is isolated and removed from dispatch.</b>
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => {
                        setArmed(null);
                        onRun("maint", { unit });
                      }}
                    >
                      Confirm
                    </button>
                    <button type="button" className="btn" onClick={() => setArmed(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setArmed("maint")}>
                    Enter maintenance
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled
                    title="Exit maintenance sequence not defined in the backend yet (no maintenance operation in operations.json)"
                  >
                    Exit maintenance
                  </button>
                </div>
              )}
              <p className="okmsg">{message}</p>
            </div>
          ) : null}

          {!def.pending && op !== "estop" && op !== "maint" && def.sequence?.length ? (
            <div className="fs">
              <h4>Sequence</h4>
              <SequenceList steps={def.sequence} />
            </div>
          ) : null}

          {op === "chgdis" && !def.pending && def.rules?.length ? (
            <div className="fs">
              <h4>Rules</h4>
              <ul className="mon">
                {def.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {!def.pending && def.monitor?.length ? (
            <div className="fs" data-testid="ops-monitored">
              <h4>Monitored</h4>
              <ul className="mon">
                {def.monitor.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <div className="side">
        <section className="card">
          <header>
            <h2>Active program</h2>
            <button type="button" className="btn btn-warn sm" disabled={!activeRun || busy} onClick={onStop}>
              Stop · Standby
            </button>
          </header>
          <div className="active">
            {activeRun ? (
              <div className={`big ${activeRun.status === "running" ? "chg" : ""}`}>
                <div>
                  <small>{activeRun.status}</small>
                  <b>{activeRun.label}</b>
                  <em>
                    {activeRun.steps.filter((s) => s.status === "completed" || s.status === "done").length}/{activeRun.steps.length} steps
                  </em>
                </div>
              </div>
            ) : (
              <div className="idle">
                <b>No active program</b>
              </div>
            )}
            <p className="dsub">
              Last full charge {lastFull.chg ? hhmm(lastFull.chg) : "—"} · last full discharge {lastFull.dis ? hhmm(lastFull.dis) : "—"}
            </p>
          </div>
        </section>

        <section className="card">
          <header>
            <h2>
              Sequences<small>step by step</small>
            </h2>
          </header>
          <ol className="seqs">
            {runs.slice(0, 6).map((r) => {
              const stale = isStaleRun(r);
              const steps = parseRunSteps(stale ? { ...r, status: "failed" } : r);
              return (
                <li key={r.id} className={`seq ${r.status === "completed" ? "done" : ""}`}>
                  <div className="sh">
                    <b>{runLabel(r.name, defs)}</b>
                    <span className={`tag ${stale ? "c-warn" : RUN_TAG[r.status] ?? "c-muted"}`}>
                      {stale ? "STALE" : RUN_TAG_TXT[r.status] ?? r.status.toUpperCase()}
                    </span>
                    <time>{hhmm(r.startedAt)}</time>
                  </div>
                  <ol>
                    {steps.map((s, i) => (
                      <li key={i} className={s.state}>
                        <span className="sn">{s.state === "done" ? "✓" : s.state === "await" ? "✋" : s.state === "failed" ? "×" : ""}</span>
                        {s.label}
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
            {runs.length === 0 ? <li className="empty">No sequences yet.</li> : null}
          </ol>
        </section>

        <section className="card">
          <header>
            <h2>
              MV Station #1<small>breakers, earthing, metering</small>
            </h2>
          </header>
          <div className="station">
            {topology.station.cells.map((c) => {
              const pos = station[c.id as "H01" | "H02" | "H04" | "H05"];
              return (
                <div key={c.id} className="cellrow">
                  <span className="ki">{React.createElement(NOVA_ICONS.breaker, { size: 16 })}</span>
                  <span>
                    <b>
                      {c.id} · {c.label}
                    </b>
                    <small>{c.ct ?? ""}</small>
                  </span>
                  <span className={`pill ${pos && pos !== "closed" ? "p-open" : ""}`}>{pos ? `CB ${POS_TEXT[pos].toLowerCase()}` : "—"}</span>
                  <span className={`pill ${station.es[c.id] ? "p-earth" : ""}`}>ES {station.es[c.id] ? "closed" : "open"}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

const SequenceList: React.FC<{ steps?: DemoOpSequenceStep[] }> = ({ steps }) =>
  steps && steps.length ? (
    <ol className="mseq">
      {steps.map((a, i) => (
        <li key={i}>
          <code>
            {a.dev}
            {a.addr ? ` ${a.addr}` : ""}
          </code>{" "}
          {a.text}
        </li>
      ))}
    </ol>
  ) : null;

const PermIcon: React.FC<{ ok: boolean }> = ({ ok }) =>
  ok ? <NOVA_ICONS.check size={15} /> : <NOVA_ICONS.x size={15} />;
