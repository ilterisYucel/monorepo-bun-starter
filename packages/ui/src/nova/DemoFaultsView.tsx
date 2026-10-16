import React, { useMemo, useState } from "react";
import type { AlarmSeverity, DeviceAlarmState } from "@gd-monorepo/shared-types";

/**
 * DemoFaultsView — Faults ekranı (SPEC UC-7, FR-7.1..7.3): liste (Active/
 * Resolved/All) + detay (izolasyon, temizleme adımları, notlu çözme) +
 * fault-injection paneli (demo; backend enjeksiyon ucu yok → D-4 no-op uyarısı).
 * Veri props'tan gelir (IO yok).
 */

export type DemoFaultFilter = "active" | "resolved" | "all";

export interface DemoFaultsViewProps {
  alarms: DeviceAlarmState[];
  onResolve: (deviceId: string, alarmName: string, note: string) => void;
  busy?: boolean;
  message?: string;
}

const SEV_CLASS: Record<string, string> = {
  error: "alarm",
  warning: "warn",
  info: "info",
  critical: "alarm",
};

const SEV_RANK: Record<string, number> = { error: 0, critical: 0, warning: 1, info: 2 };

const hhmm = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const CLEAR_STEPS: Record<string, string[]> = {
  error: [
    "Read the device fault words and the HMI fault log",
    "Inspect cooling / connections for the reported device",
    "Rectify the cause and confirm the value is back to normal",
    "Mark resolved → the PMS recovers the group to Standby",
  ],
  warning: [
    "Check the device trend and thresholds",
    "Rectify the cause if persistent",
    "Mark resolved when the value is back inside limits",
  ],
  info: ["Informational — no action required.", "Mark resolved to close."],
};

export const DemoFaultsView: React.FC<DemoFaultsViewProps> = ({
  alarms,
  onResolve,
  busy = false,
  message,
}) => {
  const [filter, setFilter] = useState<DemoFaultFilter>("active");
  const [selected, setSelected] = useState<{ deviceId: string; alarmName: string } | null>(null);
  const [note, setNote] = useState("");
  const [injUnit, setInjUnit] = useState("BESS#1");
  const [injMsg, setInjMsg] = useState("");

  const list = useMemo(() => {
    const filtered = alarms.filter((a) => {
      if (filter === "active") return a.active && !a.resolved;
      if (filter === "resolved") return a.resolved;
      return true;
    });
    return filtered.sort((a, b) => (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3));
  }, [alarms, filter]);

  const current =
    selected &&
    alarms.find((a) => a.deviceId === selected.deviceId && a.alarmName === selected.alarmName);

  const filters: Array<[DemoFaultFilter, string]> = [
    ["active", "Active"],
    ["resolved", "Resolved"],
    ["all", "All"],
  ];

  return (
    <div className="faults">
      <section className="card">
        <header>
          <h2>Faults</h2>
          <div className="seg sm" role="group" aria-label="Fault filter">
            {filters.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                data-testid={`fault-filter-${id}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <ol className="flist">
          {list.length === 0 ? (
            <li className="empty">No {filter === "all" ? "" : filter} faults.</li>
          ) : (
            list.map((a) => {
              const sev = SEV_CLASS[a.severity] ?? "info";
              const on = current && current.deviceId === a.deviceId && current.alarmName === a.alarmName;
              return (
                <li key={`${a.deviceId}.${a.alarmName}`}>
                  <button
                    type="button"
                    aria-pressed={Boolean(on)}
                    data-testid={`fault-row-${a.deviceId}-${a.alarmName}`}
                    onClick={() => {
                      setSelected({ deviceId: a.deviceId, alarmName: a.alarmName });
                      setNote("");
                    }}
                  >
                    <span className={`bar b-${a.active && !a.resolved ? sev : "info"}`} />
                    <span className="ttl">
                      <span className={`tag c-${a.active && !a.resolved ? sev : "info"}`}>
                        {a.active && !a.resolved ? "ACTIVE" : "RESOLVED"}
                      </span>
                      {a.deviceId} · {a.alarmName}
                    </span>
                    <time>{hhmm(a.startedAt ?? a.lastChangedAt)}</time>
                    <span className="dsc">
                      {a.severity} · {a.description ?? ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ol>

        <div className="inject">
          <h4>Test · inject a fault (demo only)</h4>
          <div className="row">
            <select value={injUnit} onChange={(e) => setInjUnit(e.target.value)} aria-label="Group">
              {Array.from({ length: 9 }, (_, i) => `BESS#${i + 1}`).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select aria-label="Fault type" defaultValue="pcs">
              <option value="pcs">PCS IGBT over-temperature</option>
              <option value="rack-ot">Rack over-temperature</option>
              <option value="estop">Container emergency stop</option>
              <option value="bsc">Battery section fault</option>
              <option value="fss">FSS fire (Sigma XT)</option>
              <option value="gas">H₂ gas alarm (VIGI-DT1)</option>
            </select>
            <button
              type="button"
              className="btn sm"
              onClick={() => setInjMsg(`Fault injection ${injUnit} — backend endpoint pending (B-3).`)}
            >
              Inject
            </button>
          </div>
          <p className="okmsg">{injMsg}</p>
        </div>
      </section>

      <section className="card">
        {!current ? (
          <p className="empty" style={{ padding: 14 }}>
            Select a fault.
          </p>
        ) : (
          <div className="fdetail">
            <div className="dh">
              <h3>{current.alarmName}</h3>
              <span className={`tag c-${current.active && !current.resolved ? SEV_CLASS[current.severity] ?? "info" : "info"}`}>
                {current.active && !current.resolved ? "ACTIVE" : "RESOLVED"}
              </span>
            </div>
            <dl className="kv">
              <dt>Device</dt>
              <dd>{current.deviceId}</dd>
              <dt>Severity</dt>
              <dd>{current.severity}</dd>
              <dt>Raised</dt>
              <dd className="num">{hhmm(current.startedAt)}</dd>
              <dt>Last change</dt>
              <dd className="num">{hhmm(current.lastChangedAt)}</dd>
              {current.resolved ? (
                <>
                  <dt>Resolved</dt>
                  <dd className="num">
                    {hhmm(current.resolvedAt)} {current.resolvedBy ? `· ${current.resolvedBy}` : ""}
                  </dd>
                </>
              ) : null}
            </dl>
            {current.description ? <p>{current.description}</p> : null}
            <div>
              <h4>Steps to clear</h4>
              <ol className="clear">
                {(CLEAR_STEPS[current.severity] ?? CLEAR_STEPS.info).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
            {current.active && !current.resolved ? (
              <div className="resolve">
                <label className="fld">
                  <span>Resolution note</span>
                  <textarea
                    rows={2}
                    data-testid="fault-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What was done (e.g. IGBT fan replaced)"
                  />
                </label>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => onResolve(current.deviceId, current.alarmName, note)}
                  >
                    Mark resolved
                  </button>
                </div>
                <p className="okmsg">{message ?? ""}</p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};
