import React, { useState } from "react";
import type { LogEntry } from "@gd-monorepo/shared-types";
import type { NovaTopology } from "./mimic-types";
import { ADMIN_DEVICES, ADMIN_MAPPING } from "./demo-admin";
import { DEMO_REGISTERS } from "./demo-registers";

/**
 * DemoAdminView — Master admin (read-only, SPEC UC-8): Data mapping · Site
 * parameters · Devices · Register catalogue · Modbus trace. Backend yazma/
 * mapping API'si yok (D-6); trace komut/log satırlarından (B-2 gap).
 */

export type DemoAdminTab = "map" | "par" | "dev" | "cat" | "trace";

export interface DemoAdminViewProps {
  topology: NovaTopology;
  logs: LogEntry[];
  /** Canlı komut geçmişi satırları (B-2 gelene dek log'lardan türetilir). */
  trace?: Array<{ time: string; device: string; text: string }>;
}

const TABS: Array<{ id: DemoAdminTab; label: string }> = [
  { id: "map", label: "Data mapping" },
  { id: "par", label: "Site parameters" },
  { id: "dev", label: "Devices" },
  { id: "cat", label: "Register catalogue" },
  { id: "trace", label: "Modbus trace" },
];

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

export const DemoAdminView: React.FC<DemoAdminViewProps> = ({ topology, logs, trace = [] }) => {
  const [tab, setTab] = useState<DemoAdminTab>("map");
  const L = topology.limits;

  return (
    <div className="card" data-testid="demo-admin">
      <header>
        <h2>Master admin</h2>
        <div className="seg" role="group" aria-label="Admin section">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div style={{ padding: "12px 14px 16px", display: "grid", gap: 10 }}>
        {tab === "map" ? (
          <table className="dt">
            <thead>
              <tr>
                <th>Screen element</th>
                <th>Device</th>
                <th>Register</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_MAPPING.map((r) => (
                <tr key={r.element}>
                  <td className="txt">{r.element}</td>
                  <td className="txt">{r.device}</td>
                  <td className="txt">{r.register}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "par" ? (
          <table className="dt">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="txt">SOC lower / upper</td>
                <td>
                  {L.socMin} / {L.socMax} %
                </td>
                <td className="txt">Hard limits</td>
              </tr>
              <tr>
                <td className="txt">Temperature band</td>
                <td>
                  {L.tempMin}–{L.tempMax} °C
                </td>
                <td className="txt">Battery normal band</td>
              </tr>
              <tr>
                <td className="txt">PCS derate</td>
                <td>{L.derateC} °C</td>
                <td className="txt">Release below {L.derateReleaseC} °C</td>
              </tr>
              <tr>
                <td className="txt">Cell ΔV warning</td>
                <td>{L.dvWarn} mV</td>
                <td className="txt">Calibration request</td>
              </tr>
              <tr>
                <td className="txt">Rest time</td>
                <td>30 min</td>
                <td className="txt">After full charge/discharge (demo)</td>
              </tr>
              <tr>
                <td className="txt">Calibration interval</td>
                <td>{L.calibrationIntervalDays ?? 30} days</td>
                <td className="txt">Periodic</td>
              </tr>
              <tr>
                <td className="txt">POI efficiency</td>
                <td>0.985</td>
                <td className="txt">TR + cable</td>
              </tr>
            </tbody>
          </table>
        ) : null}

        {tab === "dev" ? (
          <table className="dt">
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Protocol</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_DEVICES.map((d) => (
                <tr key={d.id}>
                  <td className="txt">{d.id}</td>
                  <td className="txt">{d.type}</td>
                  <td className="txt">{d.protocol}</td>
                  <td className="txt">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "cat" ? (
          <table className="dt">
            <thead>
              <tr>
                <th>Group</th>
                <th>Register</th>
                <th>Address</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_REGISTERS.map((r) => (
                <tr key={`${r.group}-${r.name}`}>
                  <td className="txt">{r.group}</td>
                  <td className="txt">{r.name}</td>
                  <td className="txt">
                    <code>{r.address}</code>
                  </td>
                  <td className="txt">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "trace" ? (
          <table className="dt">
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>Trace</th>
              </tr>
            </thead>
            <tbody>
              {trace.length > 0 ? (
                trace.map((t, i) => (
                  <tr key={i}>
                    <td className="txt">{t.time}</td>
                    <td className="txt">{t.device}</td>
                    <td className="txt">{t.text}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="txt" colSpan={3}>
                    No trace — raw register trace pending (B-2). Showing recent command/log events below.
                  </td>
                </tr>
              )}
              {trace.length === 0
                ? logs
                    .filter((e) => /command|komut|manevra|operation/i.test(`${e.type} ${e.source} ${e.message}`))
                    .slice(0, 50)
                    .map((e) => (
                      <tr key={e.id}>
                        <td className="txt">{e.timestamp}</td>
                        <td className="txt">{e.source}</td>
                        <td className="txt">{e.message}</td>
                      </tr>
                    ))
                : null}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
};
