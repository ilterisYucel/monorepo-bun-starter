import React, { useState } from "react";

/**
 * Fault listesi + resolve (SPEC UC-6/T-13, FR-6.1..FR-6.2). Aktif/çözülmüş
 * filtresi; aktif alarm için notlu çözme. Veri props'tan gelir (IO yok).
 */

/** UI görünüm tipi — `DeviceAlarmState` ile yapısal uyumlu (shared-types bağımlılığı yok). */
export interface DemoFault {
  deviceId: string;
  alarmName: string;
  severity: string;
  description?: string;
  active: boolean;
  startedAt?: string;
  endedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  lastChangedAt?: string;
}

export type DemoFaultFilter = "active" | "resolved" | "all";

export interface DemoFaultListProps {
  alarms: DemoFault[];
  filter: DemoFaultFilter;
  onFilterChange: (f: DemoFaultFilter) => void;
  onResolve: (alarm: DemoFault) => void;
}

const SEV_COLOR: Record<string, string> = {
  error: "var(--nm-alarm)",
  warning: "var(--nm-warn)",
  info: "var(--nm-info)",
};

const fmtTime = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("tr-TR");
};

export const DemoFaultList: React.FC<DemoFaultListProps> = ({
  alarms,
  filter,
  onFilterChange,
  onResolve,
}) => {
  const shown = alarms.filter((a) => {
    if (filter === "active") return a.active && !a.resolved;
    if (filter === "resolved") return a.resolved || !a.active;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: `1px solid ${"var(--nm-line2)"}` }}>
        {(
          [
            ["active", "Aktif"],
            ["resolved", "Çözülmüş"],
            ["all", "Tümü"],
          ] as Array<[DemoFaultFilter, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`fault-filter-${id}`}
            onClick={() => onFilterChange(id)}
            style={{
              border: `1px solid ${"var(--nm-line)"}`,
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: filter === id ? "var(--nm-panel2)" : "none",
              color: filter === id ? "var(--nm-fg)" : "var(--nm-muted)",
              boxShadow: filter === id ? `inset 0 -2px 0 ${"var(--nm-sel)"}` : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ padding: 24, textAlign: "center", color: "var(--nm-muted)" }}>
          Kayıt yok.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {["Cihaz", "Alarm", "Seviye", "Durum", "Zaman", ""].map((h, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: i === 0 ? "left" : i === 5 ? "right" : "left",
                    color: "var(--nm-muted)",
                    fontWeight: 600,
                    fontSize: 11.5,
                    padding: "6px 12px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const resolvable = a.active && !a.resolved;
              return (
                <tr key={`${a.deviceId}:${a.alarmName}`}>
                  <td style={td}>{a.deviceId}</td>
                  <td style={td}>{a.alarmName}</td>
                  <td style={{ ...td, color: SEV_COLOR[a.severity] ?? "var(--nm-fg)", fontWeight: 700 }}>
                    {a.severity}
                  </td>
                  <td style={td}>
                    {resolvable ? "Aktif" : a.resolved ? `Çözüldü${a.resolvedBy ? ` · ${a.resolvedBy}` : ""}` : "Kapandı"}
                  </td>
                  <td style={td}>{fmtTime(a.startedAt ?? a.endedAt)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {resolvable ? (
                      <button
                        type="button"
                        data-testid={`fault-resolve-${a.deviceId}-${a.alarmName}`}
                        onClick={() => onResolve(a)}
                        style={{
                          border: `1px solid ${"var(--nm-line)"}`,
                          borderRadius: 4,
                          background: "none",
                          color: "var(--nm-sel)",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "3px 9px",
                          cursor: "pointer",
                        }}
                      >
                        Çöz
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export interface DemoFaultResolveProps {
  alarm: DemoFault;
  busy?: boolean;
  message?: string;
  onConfirm: (deviceId: string, alarmName: string, note: string) => void;
  onClose: () => void;
}

/** Notlu alarm çözme diyaloğu (admin/teknik). */
export const DemoFaultResolve: React.FC<DemoFaultResolveProps> = ({
  alarm,
  busy,
  message,
  onConfirm,
  onClose,
}) => {
  const [note, setNote] = useState("");
  return (
    <div
      role="dialog"
      aria-label="Alarm çöz"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,33,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "var(--nm-panel)",
          border: `1px solid ${"var(--nm-line)"}`,
          borderRadius: 6,
          width: 380,
          padding: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--nm-fg)" }}>
          Alarmı çöz · {alarm.alarmName}
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--nm-muted)" }}>
          {alarm.deviceId} · {alarm.severity}
          {alarm.description ? ` · ${alarm.description}` : ""}
        </p>
        <label style={{ fontSize: 12, color: "var(--nm-muted)" }}>
          Not
          <textarea
            data-testid="fault-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              border: `1px solid ${"var(--nm-line)"}`,
              borderRadius: 4,
              padding: 6,
              fontFamily: "inherit",
              fontSize: 13,
            }}
          />
        </label>
        {message ? (
          <p style={{ fontSize: 12.5, color: "var(--nm-alarm)" }}>{message}</p>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={btnGhost}>
            Vazgeç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(alarm.deviceId, alarm.alarmName, note)}
            style={btnPrimary}
          >
            {busy ? "Gönderiliyor…" : "Çözüldü işaretle"}
          </button>
        </div>
      </div>
    </div>
  );
};

const td: React.CSSProperties = {
  padding: "6px 12px",
  borderTop: `1px solid ${"var(--nm-line2)"}`,
  color: "var(--nm-fg)",
};
const btnGhost: React.CSSProperties = {
  border: `1px solid ${"var(--nm-line)"}`,
  borderRadius: 5,
  background: "none",
  color: "var(--nm-muted)",
  padding: "5px 12px",
  cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  border: `1px solid ${"var(--nm-sel)"}`,
  borderRadius: 5,
  background: "var(--nm-sel)",
  color: "var(--nm-sym)",
  padding: "5px 12px",
  fontWeight: 600,
  cursor: "pointer",
};
