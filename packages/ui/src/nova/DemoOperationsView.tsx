import React, { useEffect, useMemo, useRef, useState } from "react";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import type { NovaStationState, NovaTopology } from "./mimic-types";
import { POS_TEXT } from "./nova-mimic";
import { NOVA_ICONS, type NovaIconName } from "../icons/demo-icons";
import type { DemoActiveRun } from "./maneuver-types";
import { durationText, estimateProgram, feederGroups, planTimes, reactivePlan } from "./ops-estimate";

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
  /** Çok bölümlü prosedür (ör. FL-08 synchronous / asynchronous) — `procOnly` ile çizilir. */
  actions?: Record<string, DemoOpSequenceStep[]>;
  /** Yalnız prosedür gösterimi; kontrol butonu yok (off-grid model yok). */
  procOnly?: boolean;
  rules?: string[];
}

export interface DemoOpUnit {
  n: number;
  soc: number;
  available: boolean;
  note: string;
  /** BSC Σ şarj limiti (kW, 30063) — yoksa `.brlim` gizlenir. */
  chgLimitKw?: number;
  /** BSC Σ deşarj limiti (kW, 30065). */
  disLimitKw?: number;
  /** PCS üzerinden kısıtlı toplam (min(PCS max, BSC limit), kW). */
  pcsChgLimitKw?: number;
  pcsDisLimitKw?: number;
  /** Online rafı olan BSC sayısı / toplam BSC. */
  banksOnline?: number;
  banksTotal?: number;
  /** FL-11 tablosu: RMU H02 pozisyonu + topraklama şalteri. */
  rmuH02?: string;
  earthing?: boolean;
  /** Grup durumu (NovaUnitStatus) — bakım/arıza ayrımı için. */
  statusSev?: "alarm" | "warn" | "maint" | "cold" | "info" | null;
  statusText?: string;
  /** Aktif arıza başlıkları (grup bazlı). */
  faults?: string[];
}

/** Operasyon ekranında istasyon grubu (N istasyon desteklenir). */
export interface DemoOpGroup {
  key: string;
  name: string;
  feeders: Record<string, { cell: string; units: number[] }>;
  units: DemoOpUnit[];
  /** İstasyon bazlı hazır permissives (verilmezse `permissivesFor` kullanılır). */
  permissives?: DemoPermission[];
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
  /** N istasyonlu görünüm; verilmezse tek istasyon (units/topology) kullanılır. */
  stations?: DemoOpGroup[];
  permissivesFor: (opts: { dir: "chg" | "dis"; powerKw: number; scope: number[] }) => DemoPermission[];
  /** N istasyonlu görünümde istasyon başına izin listesi (opsiyonel). */
  permissivesForStation?: (
    stationKey: string,
    opts: { dir: "chg" | "dis"; powerKw: number; scope: number[] },
  ) => DemoPermission[];
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
  /** Manevra config'indeki adım açıklaması (varsa). */
  detail?: string;
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
        : `${
            typeof s.command === "string"
              ? s.command
              : typeof s.maneuver === "string"
                ? s.maneuver
                : typeof s.name === "string"
                  ? s.name
                  : `Step ${i + 1}`
          }${dev}`;
    const detail = typeof s.description === "string" ? s.description : undefined;
    return { label, state, ...(detail !== undefined ? { detail } : {}) };
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
  stations,
  activeRun,
  runs,
  station,
  topology,
  permissivesFor,
  permissivesForStation,
  startupChecks,
  targetStatus,
  busy = false,
  message = "",
  onRun,
  onStop,
}) => {
  const [op, setOp] = useState("chgdis");
  const [scope, setScope] = useState<Set<number>>(new Set(units.map((u) => u.n)));
  /**
   * Kullanıcı kapsama ilk kez dokundu mu? Otomatik doldurma YALNIZ ilk açılışta
   * çalışsın — aksi hâlde telemetri her güncellendiğinde (unitsAll yeni referans)
   * kullanıcı tüm seçimleri kaldırsa bile scope geri dolduruluyordu.
   */
  const scopeTouched = useRef(false);
  /** Kullanıcı kaynaklı scope değişikliği (otomatik doldurmayı kapatır). */
  const setScopeByUser = (next: Set<number>): void => {
    scopeTouched.current = true;
    setScope(next);
  };
  const [dir, setDir] = useState<"chg" | "dis">("dis");
  // FL-02 gücü MW cinsinden (istasyon toplamı); PCS başına = MW ÷ istasyon PCS sayısı.
  const [powerMW, setPowerMW] = useState(1);
  // FL-02 form alanları (referans `F` state'i)
  const [startMode, setStartMode] = useState<"now" | "at">("now");
  const [startDay, setStartDay] = useState(0);
  const [startTime, setStartTime] = useState("16:00");
  const [stopMode, setStopMode] = useState<"soc" | "time" | "energy">("soc");
  const [endDay, setEndDay] = useState(0);
  const [endTime, setEndTime] = useState("18:00");
  const [mwh, setMwh] = useState(2);
  const [rq, setRq] = useState<"none" | "q" | "pf">("none");
  const [qMvar, setQMvar] = useState(1);
  const [qSide, setQSide] = useState<"cap" | "ind">("cap");
  const [pf, setPf] = useState(0.98);
  const [pfSide, setPfSide] = useState<"lag" | "lead">("lag");
  const [prio, setPrio] = useState<0 | 1 | 2>(0);
  const [ramp, setRamp] = useState("");
  const powerKw = powerMW * 1000;
  const [target, setTarget] = useState("");
  const [calUnits, setCalUnits] = useState<Set<number>>(new Set());
  const [calWhen, setCalWhen] = useState<"now" | "at">("now");
  const [calTime, setCalTime] = useState("16:00");
  const [unit, setUnit] = useState(units[0]?.n ?? 1);
  const [confirm, setConfirm] = useState(false);
  // FL-05 / FL-11: iki adımlı onay (referans app.js confirm metinleri).
  const [armed, setArmed] = useState<"estop" | "maint" | null>(null);
  // FL-05 · Emergency stop modalı (liste üstündeki kırmızı Stop butonu).
  const [stopOpen, setStopOpen] = useState(false);
  const [stopScope, setStopScope] = useState<Set<number>>(new Set());
  const [stopConfirm, setStopConfirm] = useState(false);
  // FL-11 aktif arıza popup'ı (fixed konum — tablo kırpmasından etkilenmez).
  const [faultTip, setFaultTip] = useState<{ x: number; y: number; list: string[] } | null>(null);

  // FL-05 listede yer almaz — üstteki kırmızı Stop butonu + modal ile işletilir.
  const listedDefs = defs.filter((d) => d.key !== "estop");
  const stopDef = defs.find((d) => d.key === "estop");
  const def = defs.find((d) => d.key === op) ?? listedDefs[0]!;
  const L = topology.limits;
  const scopeList = [...scope].sort((a, b) => a - b);
  const permissives = useMemo(
    () => permissivesFor({ dir, powerKw, scope: scopeList }),
    [permissivesFor, dir, powerKw, scopeList],
  );
  // FL-02: HERHANGİ bir izin başarısızsa gönderim engellenir (sim.js permissives;
  // eskiden yalnız "hard" topraklama izni engelliyordu).
  const failing = permissives.filter((p) => !p.ok);

  // N istasyonlu gruplar: prop verilmezse tek istasyon (units/topology) türetilir.
  const groups: DemoOpGroup[] = useMemo(
    () =>
      stations && stations.length > 0
        ? stations
        : [
            {
              key: "site",
              name: topology.station.name,
              feeders: topology.feeders,
              units,
            },
          ],
    [stations, topology.station.name, topology.feeders, units],
  );
  const unitsAll = useMemo(() => groups.flatMap((g) => g.units), [groups]);
  const unitAt = (n: number): DemoOpUnit | undefined => unitsAll.find((u) => u.n === n);

  // Units can arrive after mount (telemetry gecikmesi): mount'ta boşken scope
  // boş kalır ve Send devre dışı kalırdı. Units geldiğinde (ve kullanıcı seçim
  // yapmadıysa) varsayılan kapsamı ve birimi senkronla — MEVCUT seçimi ezmez.
  useEffect(() => {
    if (scopeTouched.current) return;
    setScope((prev) =>
      prev.size === 0 && unitsAll.length > 0
        ? new Set(unitsAll.map((u) => u.n))
        : prev,
    );
    setUnit((prev) =>
      unitsAll.some((u) => u.n === prev) ? prev : (unitsAll[0]?.n ?? prev),
    );
  }, [unitsAll]);


  // Fider (dal) seçim satırları — referans branchPicker: tüm fideri tek tıkla seç.
  const feeders = useMemo(() => feederGroups(topology.feeders), [topology.feeders]);
  const feederOf = (n: number): string | undefined =>
    groups.flatMap((g) => feederGroups(g.feeders)).find((f) => f.units.includes(n))?.cell;

  // Beklenen sonuç — frontend tahmini (backend sözleşmesi değişmez).
  const est = useMemo(
    () =>
      estimateProgram({
        units: unitsAll
          .filter((u) => scope.has(u.n))
          .map((u) => ({ n: u.n, soc: u.soc, available: u.available })),
        pcsPerUnit: 2,
        powerMW,
        dir,
        ...(target.trim() !== "" ? { targetSoc: Number(target) } : {}),
        socMin: L.socMin,
        socMax: L.socMax,
        unitMWh: topology.unit.containerMWh,
      }),
    [unitsAll, scope, powerMW, dir, target, L.socMin, L.socMax, topology.unit.containerMWh],
  );

  /** Seçili PCS'lere düşen güç (kW) — backend `perPcsKw` bilgi alanı. */
  const perPcsKw = est.pcs > 0 ? (powerMW * 1000) / est.pcs : 0;

  // Zaman planı (scheduled start / bitiş saati) — yalnız gösterim.
  const schedule = useMemo(
    () =>
      planTimes({
        now: Date.now(),
        startMode,
        startDay,
        startTime,
        endMode: stopMode,
        endDay,
        endTime,
      }),
    [startMode, startDay, startTime, stopMode, endDay, endTime],
  );

  // Reaktif plan (Q/PF) — yalnız gösterim (gönderime girmez, A1).
  const rqPlan = useMemo(
    () =>
      reactivePlan({
        eachMW: est.eachMW,
        pcs: est.pcs,
        mode: rq,
        ...(rq === "q" ? { qMvar, qSide } : {}),
        ...(rq === "pf" ? { pf, pfSide } : {}),
        pcsMaxMVA: 1.725,
        connMW: topology.powerMW ?? 30,
        priority: prio,
      }),
    [est.eachMW, est.pcs, rq, qMvar, qSide, pf, pfSide, prio, topology.powerMW],
  );

  // Seçili grupların BSC limitleri (referans `branchLimitsHtml`) — seçim yoksa gizlenir.
  const selUnits = unitsAll.filter((u) => scope.has(u.n) && u.available);
  const limits = useMemo(() => {
    const withLimits = selUnits.filter((u) => u.chgLimitKw !== undefined || u.disLimitKw !== undefined);
    if (scopeList.length === 0 || withLimits.length === 0) return undefined;
    const online = withLimits.filter((u) => (u.banksOnline ?? 0) > 0);
    return {
      count: online.length,
      off: withLimits.length - online.length,
      chg: online.reduce((a, u) => a + (u.chgLimitKw ?? 0), 0),
      dis: online.reduce((a, u) => a + (u.disLimitKw ?? 0), 0),
      viaChg: online.reduce((a, u) => a + (u.pcsChgLimitKw ?? 0), 0),
      viaDis: online.reduce((a, u) => a + (u.pcsDisLimitKw ?? 0), 0),
    };
  }, [selUnits, scopeList.length]);

  // Çalışan program uyarısı (referans fProgWarn): kapsam dışı kalan gruplar Standby'a düşer.
  const runningScope = useMemo(() => {
    const running = runs.find((r) => r.status === "running" && !isStaleRun(r));
    if (!running) return undefined;
    const raw = running.steps as unknown;
    const params = (raw as { params?: { scope?: unknown } } | null)?.params;
    const list = Array.isArray(params?.scope) ? (params.scope as number[]) : [];
    return { name: running.name, scope: list };
  }, [runs]);
  const startupFailing = (startupChecks ?? []).filter((p) => !p.ok);
  const maxMW = (Math.max(1, unitsAll.length * 2) * 1725) / 1000;

  const lastFull = useMemo(() => {
    const pick = (name: string): string | undefined =>
      runs
        .filter((r) => r.name === name && r.status === "completed" && r.finishedAt)
        .map((r) => r.finishedAt as string)
        .sort()
        .pop();
    return { chg: pick("full_charge"), dis: pick("full_discharge") };
  }, [runs]);

  // FL-02 gönderim engelleri (referans `blockers`).
  const permsOf = (g: DemoOpGroup): DemoPermission[] => {
    if (g.permissives !== undefined) return g.permissives;
    if (permissivesForStation !== undefined && groups.length > 1) {
      const scopeOfStation = scopeList.filter((n) => g.units.some((u) => u.n === n));
      return permissivesForStation(g.key, { dir, powerKw, scope: scopeOfStation });
    }
    return permissives;
  };
  const failingAll = groups.flatMap((g) => permsOf(g).filter((p) => !p.ok));
  const blockers: string[] = [
    ...(scopeList.length === 0 ? ["select at least one branch with an available group"] : []),
    ...(powerMW > 0 ? [] : ["enter a power above 0"]),
    ...failingAll.map((p) => p.label),
    ...(startMode === "at" ? ["scheduled start needs backend support (Tur 2)"] : []),
    ...(stopMode === "energy" ? ["energy stop needs backend support (Tur 2)"] : []),
    ...(startMode === "at" && !schedule.startOk ? ["start time is in the past"] : []),
    ...(stopMode === "time" && !schedule.endOk ? ["end time is before the start"] : []),
  ];

  const buildParams = (): Record<string, unknown> => {
    const params: Record<string, unknown> = { powerMW, perPcsKw, dir, scope: scopeList };
    if (stopMode === "soc" && target.trim() !== "") params.target = target;
    if (stopMode === "time") {
      params.timer = { durationSeconds: Math.max(1, Math.round((schedule.endAt - Date.now()) / 1000)) };
    }
    return params;
  };

  // FL-05 stop modalı: seçili gruplar + "tüm saha" durumu.
  const stopList = unitsAll.filter((u) => stopScope.has(u.n) && u.available);
  const stopAvail = unitsAll.filter((u) => u.available);
  const stopWhole = stopAvail.length > 0 && stopList.length === stopAvail.length;

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
        {stopDef !== undefined ? (
          <div className="es-wrap">
            <button
              type="button"
              className="btn es-btn"
              data-testid="ops-stop"
              title="Normal stop – whole site (FL-01 shut-down) or chosen branches / groups"
              onClick={() => {
                setStopScope(new Set(unitsAll.filter((u) => u.available).map((u) => u.n)));
                setStopConfirm(false);
                setStopOpen(true);
              }}
            >
              ■ Stop
            </button>
          </div>
        ) : null}
        <div id="mList">
          {listedDefs.map((d) => {
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

          {def.procOnly ? (
            <>
              <p className="dsub pad-s">Controls are not active in this demo (no off-grid load model yet).</p>
              {Object.entries(def.actions ?? {}).map(([title, list]) => (
                <div key={title} className="fs">
                  <h4>{title}</h4>
                  <SequenceList steps={list} />
                </div>
              ))}
            </>
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
              {/* 1 · Branches — istasyon → fider → grup (N istasyon) */}
              <div className="fs">
                <div className="fh">
                  <h4>1 · Branches</h4>
                  <span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => setScopeByUser(new Set(unitsAll.filter((u) => u.available).map((u) => u.n)))}
                    >
                      All available
                    </button>{" "}
                    ·{" "}
                    <button type="button" className="link" onClick={() => setScopeByUser(new Set())}>
                      Clear
                    </button>
                  </span>
                </div>
                <p className="dsub">
                  Select whole branches (feeders) first — every available group on the feeder joins; single groups can still be
                  added or removed.
                </p>
                <div id="scopeChips">
                  {groups.map((g) => {
                    const gf = feederGroups(g.feeders);
                    const gUnits = g.units;
                    const allOn = gUnits.filter((u) => u.available).every((u) => scope.has(u.n));
                    return (
                      <div key={g.key} data-testid={`ops-station-${g.key}`}>
                        {groups.length > 1 ? (
                          <div className="br-st">
                            <button
                              type="button"
                              className="br-tog"
                              aria-pressed={allOn && gUnits.length > 0 ? "true" : gUnits.some((u) => scope.has(u.n)) ? "mixed" : "false"}
                              onClick={() => {
                                const next = new Set(scope);
                                for (const u of gUnits) {
                                  if (allOn) next.delete(u.n);
                                  else if (u.available) next.add(u.n);
                                }
                                setScopeByUser(next);
                              }}
                            >
                              <i /> {g.name}
                            </button>
                            <small>
                              {gf.length} feeders · {gUnits.filter((u) => u.available).length} groups available
                            </small>
                          </div>
                        ) : null}
                        <div className="br-grid">
                          {gf.map((f) => {
                            const feederUnits = gUnits.filter((u) => f.units.includes(u.n));
                            const avail = feederUnits.filter((u) => u.available);
                            const selected = avail.filter((u) => scope.has(u.n)).length;
                            const state = selected > 0 && selected === avail.length ? "true" : selected > 0 ? "mixed" : "false";
                            const soc = feederUnits.length
                              ? feederUnits.reduce((a, u) => a + u.soc, 0) / feederUnits.length
                              : null;
                            return (
                              <div key={f.key} className={`br ${state !== "false" ? "on" : ""}`} data-testid={`ops-feeder-${g.key}-${f.cell}`}>
                                <button
                                  type="button"
                                  className="br-tog"
                                  aria-pressed={state}
                                  disabled={avail.length === 0}
                                  onClick={() => {
                                    const next = new Set(scope);
                                    const allFeederOn = avail.every((u) => next.has(u.n));
                                    for (const u of avail) {
                                      if (allFeederOn) next.delete(u.n);
                                      else next.add(u.n);
                                    }
                                    setScopeByUser(next);
                                  }}
                                >
                                  <b>
                                    {f.cell} · Feeder {f.key}
                                  </b>
                                  <small>
                                    BESS#{f.units.join(", #")} · {avail.length}/{feederUnits.length} available
                                    {soc !== null ? ` · SOC ${soc.toFixed(0)} %` : ""}
                                  </small>
                                </button>
                                <div className="scope">
                                  {feederUnits.map((u) => (
                                    <button
                                      key={u.n}
                                      type="button"
                                      className={`chipb ${u.available ? "" : "blk"}`}
                                      aria-pressed={scope.has(u.n)}
                                      disabled={!u.available}
                                      onClick={() => toggle(scope, u.n, setScopeByUser)}
                                    >
                                      <b>BESS#{u.n}</b>
                                      <small>{u.available ? `SOC ${u.soc.toFixed(0)} %` : u.note !== "" ? u.note : "unavailable"}</small>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="brlim" data-testid="ops-brlim">
                  {limits === undefined ? null : (
                    <>
                      <div>
                        <small>Selected · BSC online</small>
                        <b className="num">{limits.count}</b>
                        <em>
                          {limits.off > 0
                            ? `${limits.off} BSC without online racks – no limit reported`
                            : "all battery sections online"}
                        </em>
                      </div>
                      <div>
                        <small>Chargeable now · Σ 30063</small>
                        <b className="num">{(limits.chg / 1000).toFixed(2)} MW</b>
                        <em>via the PCS · min(BSC limit, PCS allowable A22): {(limits.viaChg / 1000).toFixed(2)} MW</em>
                      </div>
                      <div>
                        <small>Dischargeable now · Σ 30065</small>
                        <b className="num">{(limits.dis / 1000).toFixed(2)} MW</b>
                        <em>via the PCS · min(BSC limit, PCS allowable A23): {(limits.viaDis / 1000).toFixed(2)} MW</em>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2 · Direction and power */}
              <div className="fs">
                <h4>2 · Direction and power</h4>
                <div className="params ops">
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
                    <span>Total active power · Σ PCS (MW)</span>
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
                      <input
                        type="range"
                        aria-label="Active power"
                        min={0}
                        max={Math.max(1, Math.round(maxMW))}
                        step={0.1}
                        value={powerMW}
                        onChange={(e) => setPowerMW(Number(e.target.value))}
                      />
                    </span>
                    <small data-testid="ops-per-pcs">
                      Available {est.eachMW.toFixed(2)} MW per PCS · {est.pcs} PCS · max {maxMW.toFixed(2)} MW
                    </small>
                  </label>

                  <div className="fld">
                    <span>Start</span>
                    <div className="seg" role="group">
                      <button type="button" aria-pressed={startMode === "now"} onClick={() => setStartMode("now")}>
                        Now
                      </button>
                      <button type="button" aria-pressed={startMode === "at"} onClick={() => setStartMode("at")}>
                        Scheduled
                      </button>
                    </div>
                    {startMode === "at" ? (
                      <span className="inl">
                        <select aria-label="Start day" value={startDay} onChange={(e) => setStartDay(Number(e.target.value))}>
                          <option value={0}>Today</option>
                          <option value={1}>Tomorrow</option>
                          <option value={2}>D+2</option>
                        </select>
                        <input type="time" aria-label="Start time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                      </span>
                    ) : null}
                    <small>{startMode === "at" ? "Scheduling is available after backend support (Tur 2)." : "Site clock · permissives checked again on send"}</small>
                  </div>

                  <div className="fld">
                    <span>Stop when</span>
                    <div className="seg" role="group">
                      <button type="button" aria-pressed={stopMode === "soc"} onClick={() => setStopMode("soc")}>
                        Target SOC
                      </button>
                      <button type="button" aria-pressed={stopMode === "time"} onClick={() => setStopMode("time")}>
                        End time
                      </button>
                      <button type="button" aria-pressed={stopMode === "energy"} onClick={() => setStopMode("energy")}>
                        Energy
                      </button>
                    </div>
                    {stopMode === "soc" ? (
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
                        <em className="u">%</em>
                      </span>
                    ) : stopMode === "time" ? (
                      <span className="inl">
                        <select aria-label="End day" value={endDay} onChange={(e) => setEndDay(Number(e.target.value))}>
                          <option value={0}>Today</option>
                          <option value={1}>Tomorrow</option>
                          <option value={2}>D+2</option>
                        </select>
                        <input type="time" aria-label="End time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                      </span>
                    ) : (
                      <span className="inl">
                        <input type="number" min={0.5} step={0.5} value={mwh} onChange={(e) => setMwh(Number(e.target.value))} />
                        <em className="u">MWh</em>
                      </span>
                    )}
                    <small>
                      {stopMode === "energy"
                        ? "Energy stop requires backend support (Tur 2)."
                        : stopMode === "time"
                          ? `Stops at ${new Date(schedule.endAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} or earlier at the SOC limit`
                          : "Auto Standby when the target SOC is reached (frontend)"}
                    </small>
                  </div>

                  <div className="fld">
                    <span>Reactive power · Wattox S04</span>
                    <div className="seg" role="group">
                      <button type="button" aria-pressed={rq === "none"} onClick={() => setRq("none")}>
                        Q = 0
                      </button>
                      <button type="button" aria-pressed={rq === "q"} onClick={() => setRq("q")}>
                        Constant Q
                      </button>
                      <button type="button" aria-pressed={rq === "pf"} onClick={() => setRq("pf")}>
                        Constant PF
                      </button>
                      <button type="button" disabled title="Curve parameters are not in the Wattox map">
                        Q-U
                      </button>
                    </div>
                    {rq === "q" ? (
                      <span className="inl">
                        <input type="number" min={0} step={0.5} value={qMvar} onChange={(e) => setQMvar(Number(e.target.value))} />
                        <em className="u">MVAr Σ</em>
                        <div className="seg" role="group">
                          <button type="button" aria-pressed={qSide === "cap"} onClick={() => setQSide("cap")}>
                            Capacitive
                          </button>
                          <button type="button" aria-pressed={qSide === "ind"} onClick={() => setQSide("ind")}>
                            Inductive
                          </button>
                        </div>
                      </span>
                    ) : rq === "pf" ? (
                      <span className="inl">
                        <input type="number" min={0.8} max={1} step={0.01} value={pf} onChange={(e) => setPf(Number(e.target.value))} />
                        <select aria-label="PF side" value={pfSide} onChange={(e) => setPfSide(e.target.value as "lag" | "lead")}>
                          <option value="lag">Capacitive · Q delivered</option>
                          <option value="lead">Inductive · Q absorbed</option>
                        </select>
                      </span>
                    ) : (
                      <small>S04 = 0 constant Q, S07 = 0</small>
                    )}
                    <small>Applied to the plan below only (backend support in Tur 2).</small>
                  </div>

                  {rq !== "none" ? (
                    <div className="fld">
                      <span>Priority at the kVA limit · S05</span>
                      <div className="seg" role="group">
                        <button type="button" aria-pressed={prio === 0} onClick={() => setPrio(0)}>
                          Proportional
                        </button>
                        <button type="button" aria-pressed={prio === 1} onClick={() => setPrio(1)}>
                          P first
                        </button>
                        <button type="button" aria-pressed={prio === 2} onClick={() => setPrio(2)}>
                          Q first
                        </button>
                      </div>
                      <small>Applies when P² + Q² exceeds 1.725 MVA per PCS</small>
                    </div>
                  ) : null}

                  <label className="fld">
                    <span>Ramp · S11 (optional)</span>
                    <span className="inl">
                      <input type="number" min={10} max={30000} step={10} value={ramp} placeholder="10000" onChange={(e) => setRamp(e.target.value)} />
                    </span>
                    <small>Raw 10–30000, default 10000 (backend support in Tur 2)</small>
                  </label>
                </div>

                {/* Beklenen sonuç */}
                <div className="expect" data-testid="ops-expect">
                  {est.pcs === 0 ? (
                    <p className="dsub">Select at least one branch with an available group.</p>
                  ) : (
                    <>
                      <div className="ex-h">
                        <b>Expected result</b>
                        <small>
                          {startMode === "now" ? "starting now" : `starting ${new Date(schedule.startAt).toLocaleString("tr-TR")}`} ·
                          equal Σ PCS split · η 0.975 each way
                        </small>
                      </div>
                      <div className="ex-g">
                        <div>
                          <small>SOC now → after</small>
                          <b className="num">
                            {est.socNow.toFixed(0)} % → {est.socAfter.toFixed(0)} %
                          </b>
                          <em>target {est.target.toFixed(1)} %</em>
                        </div>
                        <div>
                          <small>Duration</small>
                          <b className="num">{durationText(est.durationH)}</b>
                          <em>
                            {est.pcs} PCS × {est.eachMW.toFixed(3)} MW
                          </em>
                        </div>
                        <div>
                          <small>Apparent power Σ S</small>
                          <b className="num">{rqPlan.sTotMVA.toFixed(2)} MVA</b>
                          <em>
                            P {rqPlan.pTotMW.toFixed(2)} MW · Q {Math.abs(rqPlan.qTotMvar).toFixed(1)} MVAr · PF{" "}
                            {rqPlan.pf.toFixed(3)}
                          </em>
                        </div>
                        <div>
                          <small>Energy Σ PCS</small>
                          <b className="num">{est.energyMWh.toFixed(1)} MWh</b>
                          <em>
                            {stopMode === "energy" ? `requested ${mwh.toFixed(1)} MWh` : `${powerMW} MW × ${durationText(est.durationH)}`}
                          </em>
                        </div>
                      </div>
                      {est.limitHit ? (
                        <p className="c-warn">
                          Some groups reach the SOC limit ({dir === "chg" ? L.socMax : L.socMin} %) before the target — they stop
                          early, so less energy is moved.
                        </p>
                      ) : null}
                      {est.durationH === 0 ? (
                        <p className="c-warn">
                          Groups are already at the {dir === "chg" ? "upper" : "lower"} SOC limit ({est.socNow.toFixed(0)} %) —
                          nothing to move in this direction.
                        </p>
                      ) : null}
                      {!schedule.startOk ? <p className="c-alarm">Start time is in the past.</p> : null}
                      {!schedule.endOk ? <p className="c-alarm">End time must be after the start time.</p> : null}
                    </>
                  )}
                </div>

                {/* Dispatch tablosu */}
                {est.pcs > 0 ? (
                  <p className="dsub">
                    <b>
                      {powerMW} MW ÷ {est.pcs} PCS = {est.eachMW.toFixed(3)} MW per PCS (S06 {dir === "chg" ? "−" : ""}
                      {(est.eachMW * 1000).toFixed(0)} kW each).
                    </b>
                    <div className="tblwrap">
                      <table className="dt brsplit" data-testid="ops-branch-table">
                        <thead>
                          <tr>
                            <th className="tl">Branch</th>
                            <th className="tl">Groups</th>
                            <th>PCS</th>
                            <th>MW / PCS</th>
                            <th>Branch MW</th>
                            <th>SOC now → after</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.flatMap((g) =>
                            feederGroups(g.feeders).map((f) => {
                              const sel = g.units.filter((u) => f.units.includes(u.n) && scope.has(u.n) && u.available);
                              if (sel.length === 0) return null;
                              const pcs = sel.length * 2;
                              return (
                                <tr key={`${g.key}-${f.key}`}>
                                  <td className="txt">
                                    <b>{f.cell}</b> · Feeder {f.key}
                                    {groups.length > 1 ? <small>{g.name}</small> : null}
                                  </td>
                                  <td className="txt">BESS#{sel.map((u) => u.n).join(", #")}</td>
                                  <td>{pcs}</td>
                                  <td>{est.eachMW.toFixed(3)}</td>
                                  <td>
                                    <b>{(est.eachMW * pcs).toFixed(2)}</b>
                                  </td>
                                  <td>
                                    {(sel.reduce((a, u) => a + u.soc, 0) / sel.length).toFixed(0)} →{" "}
                                    <b>{est.socAfter.toFixed(0)}</b> %
                                  </td>
                                </tr>
                              );
                            }),
                          )}
                          <tr className="sum">
                            <td>Total</td>
                            <td />
                            <td>{est.pcs}</td>
                            <td />
                            <td>
                              <b>{powerMW}</b>
                            </td>
                            <td>
                              {est.socNow.toFixed(0)} → <b>{est.socAfter.toFixed(0)}</b> %
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {rq !== "none" ? (
                      <div className="rqbox" data-testid="ops-rqbox">
                        <div>
                          <b>Reactive power</b>
                          <table className="dt">
                            <tbody>
                              <tr>
                                <td className="txt">Per PCS · requested</td>
                                <td>
                                  P {est.eachMW.toFixed(3)} MW · S {Math.hypot(est.eachMW, rqPlan.qEachMvar).toFixed(3)} MVA
                                </td>
                              </tr>
                              <tr>
                                <td className="txt">Per PCS · applied (S05 {["proportional", "P first", "Q first"][prio]})</td>
                                <td className={rqPlan.limited ? "c-warn" : ""}>
                                  P {rqPlan.pEachMW.toFixed(3)} MW · Q {Math.abs(rqPlan.qEachMvar).toFixed(3)} MVAr · S{" "}
                                  {rqPlan.sEachMVA.toFixed(3)} / 1.725 MVA{rqPlan.limited ? " · limited" : ""}
                                </td>
                              </tr>
                              <tr>
                                <td className="txt">Σ at the PCS ({est.pcs} PCS)</td>
                                <td>
                                  P {rqPlan.pTotMW.toFixed(2)} MW · Q {Math.abs(rqPlan.qTotMvar).toFixed(2)} MVAr ·{" "}
                                  <b>S {rqPlan.sTotMVA.toFixed(2)} MVA</b> · PF {rqPlan.pf.toFixed(3)}
                                </td>
                              </tr>
                              <tr>
                                <td className="txt">TEİAŞ P–Q (BU Art. 11)</td>
                                <td className={rqPlan.teiasOk ? "" : "c-alarm"}>
                                  P {rqPlan.pPpu.toFixed(2)} pu · Q {rqPlan.qPpu.toFixed(2)} pu ·{" "}
                                  {rqPlan.teiasOk ? "inside" : "OUTSIDE"} the capability area
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <small>Frontend plan; Wattox S04/S07/S08 writes ship with backend support (Tur 2).</small>
                        </div>
                        <div />
                      </div>
                    ) : null}
                    <small>
                      Σ PCS basis: the setpoint is written to the PCS as is; losses and AUX are not added (the POI reading is lower
                      in discharge and higher in charge by the losses + AUX).
                    </small>
                  </p>
                ) : null}
              </div>

              {/* 3 · Permissives (istasyon bazlı) */}
              <div className="fs">
                <h4>3 · Permissives</h4>
                {groups.map((g) => {
                  const list = permsOf(g);
                  if (groups.length === 1) {
                    return (
                      <ul key={g.key} className="perm">
                        {list.map((p) => (
                          <li key={p.label} className={p.ok ? "ok" : p.hard ? "hard" : "bad"}>
                            <PermIcon ok={p.ok} />
                            <span>{p.label}</span>
                            <em>{p.detail}</em>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <div key={g.key} data-testid={`ops-perm-${g.key}`}>
                      <b className="dsub">{g.name}</b>
                      <ul className="perm">
                        {list.map((p) => (
                          <li key={p.label} className={p.ok ? "ok" : p.hard ? "hard" : "bad"}>
                            <PermIcon ok={p.ok} />
                            <span>{p.label}</span>
                            <em>{p.detail}</em>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Gönderim */}
              <div className="fs send">
                <p className="summary">
                  {startMode === "at" ? <span className="tag c-info">scheduled</span> : null}{" "}
                  <b>
                    {dir === "chg" ? "Charge" : "Discharge"} {powerMW} MW Σ PCS
                    {rq === "q" ? ` · Q ${Math.abs(qMvar).toFixed(1)} MVAr ${qSide === "ind" ? "inductive" : "capacitive"}` : null}
                    {rq === "pf" ? ` · PF ${pf.toFixed(2)} ${pfSide === "lag" ? "capacitive" : "inductive"}` : null} · S{" "}
                    {rqPlan.sTotMVA.toFixed(2)} MVA
                  </b>{" "}
                  {stopMode === "soc"
                    ? `→ SOC ${est.target.toFixed(1)} %`
                    : stopMode === "time"
                      ? `until ${new Date(schedule.endAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
                      : `for ${mwh.toFixed(1)} MWh`}{" "}
                  · expected SOC {est.pcs ? `${est.socAfter.toFixed(0)} %` : "—"} ·{" "}
                  {scopeList.length ? `BESS#${scopeList.join(", #")}` : <span className="c-alarm">no branch selected</span>}
                  {scopeList.length ? ` · ${est.pcs} PCS × ${est.eachMW.toFixed(3)} MW` : null}
                </p>

                {runningScope ? (
                  <p className="prog-warn" data-testid="ops-running-warn">
                    <b>A program is running:</b> {runLabel(runningScope.name, defs)} on BESS#{runningScope.scope.join(", #")}.
                    Sending replaces it
                    {runningScope.scope.some((n) => !scope.has(n))
                      ? ` – groups not in the new selection (BESS#${runningScope.scope.filter((n) => !scope.has(n)).join(", #")}) go to Standby`
                      : ""}
                    .
                  </p>
                ) : null}

                {confirm ? (
                  <div className="confirm">
                    <b>
                      {dir === "chg" ? "Charge" : "Discharge"} {powerMW} MW ({est.eachMW.toFixed(3)} MW per PCS × {est.pcs} PCS) on
                      BESS#{scopeList.join(", #")}?
                    </b>
                    <div className="row">
                      <button
                        type="button"
                        data-testid="ops-confirm"
                        className="btn btn-primary"
                        disabled={busy || blockers.length > 0}
                        onClick={() => {
                          setConfirm(false);
                          onRun("chgdis", buildParams());
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
                    disabled={busy || blockers.length > 0}
                    title={blockers.length ? `Not possible yet: ${blockers.join(" · ")}` : undefined}
                    onClick={() => setConfirm(true)}
                  >
                    {startMode === "at" ? "Schedule command" : runningScope ? "Replace running program" : "Send command"}
                  </button>
                )}

                {blockers.length ? (
                  <p className="okmsg" data-testid="ops-blocked" style={{ color: "var(--nm-alarm, #c0392b)" }}>
                    Blocked — {blockers.join(" · ")}
                  </p>
                ) : null}
                {targetStatus ? <p className="okmsg">{targetStatus}</p> : null}
                {message ? <p className="okmsg">{message}</p> : null}
              </div>
            </>
          ) : null}

          {op === "standby" && !def.pending ? (
            <>
              <div className="fs">
                <div className="fh">
                  <h4>Branches</h4>
                  <span>
                    <button type="button" className="link" onClick={() => setScopeByUser(new Set())}>
                      Whole site
                    </button>
                  </span>
                </div>
                <p className="dsub">No group selected = the whole site goes to Idle / Standby. PCS stay energised.</p>
                <div className="br-grid">
                  {groups.flatMap((g) =>
                    feederGroups(g.feeders).map((f) => {
                      const feederUnits = g.units.filter((u) => f.units.includes(u.n));
                      const avail = feederUnits.filter((u) => u.available);
                      const selected = avail.filter((u) => scope.has(u.n)).length;
                      const state = selected > 0 && selected === avail.length ? "true" : selected > 0 ? "mixed" : "false";
                      return (
                        <div key={`${g.key}-${f.key}`} className={`br ${state !== "false" ? "on" : ""}`} data-testid={`ops-standby-feeder-${g.key}-${f.cell}`}>
                          <button
                            type="button"
                            className="br-tog"
                            aria-pressed={state}
                            disabled={avail.length === 0}
                            onClick={() => {
                              const next = new Set(scope);
                              const allFeederOn = avail.every((u) => next.has(u.n));
                              for (const u of avail) {
                                if (allFeederOn) next.delete(u.n);
                                else next.add(u.n);
                              }
                              setScopeByUser(next);
                            }}
                          >
                            <b>
                              {f.cell} · Feeder {f.key}
                            </b>
                            <small>
                              BESS#{f.units.join(", #")} · {avail.length}/{feederUnits.length} available
                            </small>
                          </button>
                          <div className="scope">
                            {feederUnits.map((u) => (
                              <button
                                key={u.n}
                                type="button"
                                className={`chipb ${u.available ? "" : "blk"}`}
                                aria-pressed={scope.has(u.n)}
                                disabled={!u.available}
                                onClick={() => toggle(scope, u.n, setScopeByUser)}
                              >
                                <b>BESS#{u.n}</b>
                                <small>SOC {u.soc.toFixed(0)} %</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
              </div>
              <div className="fs send">
                <p className="summary">
                  <b>Standby</b> · {scopeList.length ? `BESS#${scopeList.join(", #")}` : "whole site"}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => onRun("standby", scopeList.length ? { scope: scopeList } : {})}
                >
                  Go to Standby
                </button>
                <p className="okmsg">{message}</p>
              </div>
            </>
          ) : null}

          {op === "calib" && !def.pending ? (
            <>
              <div className="fs">
                <h4>Calibration status per group</h4>
                <table className="dt cal">
                  <thead>
                    <tr>
                      <th className="tl">Group</th>
                      <th>Last</th>
                      <th>Due in</th>
                      <th className="tl">Request</th>
                      <th className="tl">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitsAll.map((u) => (
                      <tr key={u.n} className={calUnits.has(u.n) ? "selrow" : ""}>
                        <td className="txt">
                          <label>
                            <input
                              type="checkbox"
                              checked={calUnits.has(u.n)}
                              onChange={() => toggle(calUnits, u.n, setCalUnits)}
                            />{" "}
                            BESS#{u.n}
                          </label>
                        </td>
                        <td>—</td>
                        <td>—</td>
                        <td className="txt">—</td>
                        <td className="txt">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small>Calibration lifecycle data (last/due/request) arrives with backend support (Tur 2).</small>
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
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || calUnits.size === 0}
                    onClick={() => onRun("calib", { when: calWhen, at: calTime, units: [...calUnits].sort((a, b) => a - b) })}
                  >
                    {calWhen === "now" ? "Start calibration" : "Schedule calibration"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled
                    title="Cancel scheduled calibration needs backend support (Tur 2)"
                  >
                    Cancel scheduled
                  </button>
                </div>
                <p className="okmsg">{message}</p>
              </div>
            </>
          ) : null}

          {op === "estop" && !def.pending ? (
            <div className="fs send">
              <label className="fld">
                <span>Group</span>
                <select value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
                  {unitsAll.map((u) => (
                    <option key={u.n} value={u.n}>
                      BESS#{u.n}
                    </option>
                  ))}
                </select>
                <p className="dsub">
                  Selected · SOC {unitAt(unit)?.soc.toFixed(0) ?? "—"} % · {unitAt(unit)?.available ? "available" : "unavailable"}
                  {unitAt(unit)?.note ? ` · ${unitAt(unit)!.note}` : ""}
                </p>
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
                  {unitsAll.map((u) => (
                    <option key={u.n} value={u.n}>
                      BESS#{u.n}
                    </option>
                  ))}
                </select>
                <p className="dsub">
                  Selected · SOC {unitAt(unit)?.soc.toFixed(0) ?? "—"} % · {unitAt(unit)?.available ? "available" : "unavailable"}
                  {unitAt(unit)?.note ? ` · ${unitAt(unit)!.note}` : ""}
                </p>
              </label>
              {/* Grup durumu tablosu (referans `maintTable`) — mevcut istasyonun BESS'leri */}
              <div className="mt-sum">
                <span className="tag c-maint">
                  {unitsAll.filter((u) => u.statusSev === "maint").length} in maintenance
                </span>
                <span className="tag c-alarm">
                  {unitsAll.filter((u) => u.statusSev === "alarm").length} faulted / isolated
                </span>
                <span className="tag c-ok">
                  {unitsAll.filter((u) => u.statusSev === null || u.statusSev === undefined).length} in service
                </span>
              </div>
              <div className="tblwrap maintwrap">
                <table className="dt mtbl" data-testid="ops-maint-table">
                  <thead>
                    <tr>
                      <th className="tl">Group</th>
                      <th className="tl">State</th>
                      <th>RMU H02</th>
                      <th>Earthing switch</th>
                      <th>Since</th>
                      <th className="tl">Active faults</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {unitsAll.map((u) => (
                      <tr
                        key={u.n}
                        className={`${u.statusSev === "maint" ? "r-maint" : u.statusSev === "alarm" ? "r-fault" : ""} ${u.n === unit ? "selrow" : ""}`}
                      >
                        <td className="txt">
                          <b>BESS#{u.n}</b>
                        </td>
                        <td className="txt">
                          <span className={`tag ${u.statusSev === "maint" ? "c-maint" : u.statusSev === "alarm" ? "c-alarm" : "c-ok"}`}>
                            {u.statusText ?? (u.available ? "in service" : "unavailable")}
                          </span>
                        </td>
                        <td className={u.rmuH02 !== undefined && u.rmuH02 !== "closed" ? "sev-warn" : ""}>
                          {u.rmuH02 ?? "—"}
                        </td>
                        <td className={u.earthing ? "sev-maint" : ""}>{u.earthing ? "Closed (earthed)" : "Open"}</td>
                        <td>—</td>
                        <td className="txt">
                          {u.faults !== undefined && u.faults.length > 0 ? (
                            <span
                              className="fault-badge"
                              tabIndex={0}
                              aria-label={`${u.faults.length} active faults`}
                              data-testid={`ops-maint-faults-${u.n}`}
                              onMouseEnter={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setFaultTip({ x: r.left, y: r.bottom + 6, list: u.faults ?? [] });
                              }}
                              onFocus={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setFaultTip({ x: r.left, y: r.bottom + 6, list: u.faults ?? [] });
                              }}
                              onMouseLeave={() => setFaultTip(null)}
                              onBlur={() => setFaultTip(null)}
                            >
                              {u.faults.length}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <button type="button" className="btn sm" onClick={() => setUnit(u.n)}>
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                        <span>
                          {s.label}
                          {s.detail ? <small className="dsub"> — {s.detail}</small> : null}
                        </span>
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
              {topology.station.name}<small>breakers, earthing, metering</small>
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

      {faultTip !== null && faultTip.list.length > 0 ? (
        <div
          className="fault-pop-fixed"
          role="tooltip"
          data-testid="ops-fault-pop"
          style={{ left: Math.min(faultTip.x, Math.max(8, window.innerWidth - 400)), top: faultTip.y }}
        >
          <b>Active faults</b>
          <ul>
            {faultTip.list.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {stopOpen && stopDef !== undefined ? (
        <div className="esdlg-overlay" role="dialog" aria-modal="true" aria-label="Emergency stop">
          <div className="esdlg" data-testid="ops-stop-modal">
            <header>
              <h2>
                ■ Emergency stop<small>FL-05</small>
              </h2>
              <button type="button" className="btn sm" onClick={() => setStopOpen(false)}>
                Close
              </button>
            </header>
            <div className="esdlg-body">
              <p className="dsub">
                Whole site = every available group (PCS stop, setpoint 0). Chosen groups = power to zero and PCS stop on
                those groups only.
              </p>
              <div className="fh">
                <h4>Scope</h4>
                <span>
                  <button
                    type="button"
                    className="link"
                    onClick={() => setStopScope(new Set(stopAvail.map((u) => u.n)))}
                  >
                    Whole site
                  </button>{" "}
                  ·{" "}
                  <button type="button" className="link" onClick={() => setStopScope(new Set())}>
                    Clear
                  </button>
                </span>
              </div>
              <div className="br-grid">
                {groups.flatMap((g) =>
                  feederGroups(g.feeders).map((f) => {
                    const feederUnits = g.units.filter((u) => f.units.includes(u.n));
                    const avail = feederUnits.filter((u) => u.available);
                    const selected = avail.filter((u) => stopScope.has(u.n)).length;
                    const state = selected > 0 && selected === avail.length ? "true" : selected > 0 ? "mixed" : "false";
                    return (
                      <div key={`stop-${g.key}-${f.key}`} className={`br ${state !== "false" ? "on" : ""}`} data-testid={`ops-stop-feeder-${g.key}-${f.cell}`}>
                        <button
                          type="button"
                          className="br-tog"
                          aria-pressed={state}
                          disabled={avail.length === 0}
                          onClick={() => {
                            const next = new Set(stopScope);
                            const allOn = avail.every((u) => next.has(u.n));
                            for (const u of avail) {
                              if (allOn) next.delete(u.n);
                              else next.add(u.n);
                            }
                            setStopScope(next);
                          }}
                        >
                          <b>
                            {f.cell} · Feeder {f.key}
                          </b>
                          <small>
                            BESS#{f.units.join(", #")} · {avail.length}/{feederUnits.length} available
                          </small>
                        </button>
                        <div className="scope">
                          {feederUnits.map((u) => (
                            <button
                              key={u.n}
                              type="button"
                              className={`chipb ${u.available ? "" : "blk"}`}
                              aria-pressed={stopScope.has(u.n)}
                              disabled={!u.available}
                              onClick={() => toggle(stopScope, u.n, setStopScope)}
                            >
                              <b>BESS#{u.n}</b>
                              <small>SOC {u.soc.toFixed(0)} %</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>

              <h4>Sequence</h4>
              <SequenceList steps={stopDef.sequence} />
              {stopDef.monitor?.length ? (
                <div data-testid="ops-stop-monitored">
                  <h4>Monitored</h4>
                  <ul className="mon">
                    {stopDef.monitor.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="es-send">
                {stopConfirm ? (
                  <div className="confirm">
                    <b>
                      Stop{" "}
                      {stopWhole
                        ? "the WHOLE SITE (all available groups)"
                        : `${stopList.length} group${stopList.length === 1 ? "" : "s"} (BESS#${stopList.map((u) => u.n).join(", #")})`}
                      ? Power to zero and PCS stop.
                    </b>
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn-danger"
                        data-testid="ops-stop-confirm"
                        disabled={busy || stopList.length === 0}
                        onClick={() => {
                          setStopConfirm(false);
                          setStopOpen(false);
                          onRun("estop", { scope: stopList.map((u) => u.n) });
                        }}
                      >
                        Confirm stop
                      </button>
                      <button type="button" className="btn" onClick={() => setStopConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger big"
                    data-testid="ops-stop-go"
                    disabled={busy || stopList.length === 0}
                    onClick={() => setStopConfirm(true)}
                  >
                    ■ Stop · {stopWhole ? "whole site" : `${stopList.length} group${stopList.length === 1 ? "" : "s"}`}
                  </button>
                )}
                <p className="okmsg">{message}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
