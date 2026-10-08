import React from "react";
import { NOVA_ICONS } from "../icons/demo-icons";
import type { NovaCellConfig, NovaStationState } from "./mimic-types";
import { POS_TEXT } from "./nova-mimic";

/**
 * OG hücre diyaloğu (SPEC UC-4/T-19, FR-4.4/FR-4.5). Ölçü hücresinde (vt)
 * V/Hz/I gösterir; kesici hücresinde kesici/toprak kumandası sunar. İnterlock
 * asıl simülatördedir; burada kullanıcıya önden kilit gerekçesi gösterilir.
 */

export type DemoCellAction = "cb_open" | "cb_close" | "es_open" | "es_close";

export interface DemoCellDialogProps {
  cell: NovaCellConfig;
  station: NovaStationState;
  onCommand?: (cellId: string, action: DemoCellAction) => void;
  onClose?: () => void;
  busy?: boolean;
  message?: string;
}

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export const DemoCellDialog: React.FC<DemoCellDialogProps> = ({
  cell,
  station,
  onCommand,
  onClose,
  busy = false,
  message,
}) => {
  const esClosed = !!station.es?.[cell.id];
  const cbPos = station[cell.id as "H01" | "H02" | "H04" | "H05"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${cell.id} ${cell.label}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,14,18,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          background: "var(--nm-panel)",
          border: `1px solid ${"var(--nm-line)"}`,
          borderRadius: 8,
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 40px)",
          overflow: "auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${"var(--nm-line2)"}`,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--nm-fg)", margin: 0 }}>
            {cell.id} · {cell.label}
          </h2>
          <button type="button" onClick={onClose} style={btnStyle()}>
            Kapat
          </button>
        </header>

        <div style={{ padding: "14px 16px 16px", display: "grid", gap: 12 }}>
          {cell.kind === "vt" ? (
            <MeasurementCell cell={cell} station={station} />
          ) : (
            <BreakerCell
              cell={cell}
              cbPos={cbPos}
              esClosed={esClosed}
              current={station.iA[cell.id] ?? 0}
              onCommand={onCommand}
              busy={busy}
            />
          )}
          {message ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--nm-info)" }}>{message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const MeasurementCell: React.FC<{ cell: NovaCellConfig; station: NovaStationState }> = ({
  cell,
  station,
}) => (
  <>
    <p style={{ margin: 0, fontSize: 12, color: "var(--nm-muted)" }}>
      Ölçü hücresi · CT {cell.ct}
      {cell.vt ? ` · VT ${cell.vt}` : ""}
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
      <Metric label="Faz-faz gerilim" value={`${f(station.kV, 2)} kV`} />
      <Metric label="Frekans" value={`${f(station.hz, 2)} Hz`} />
      <Metric label="Akım (CT)" value={`${f(station.iA[cell.id] ?? 0, 0)} A`} />
    </div>
  </>
);

const BreakerCell: React.FC<{
  cell: NovaCellConfig;
  cbPos: string | undefined;
  esClosed: boolean;
  current: number;
  onCommand?: (cellId: string, action: DemoCellAction) => void;
  busy: boolean;
}> = ({ cell, cbPos, esClosed, current, onCommand, busy }) => {
  const closed = cbPos === "closed";
  const actions: Array<{ id: DemoCellAction; label: string; icon: React.ReactNode; ok: boolean; reason?: string }> = [
    { id: "cb_open", label: "Kesiciyi aç", icon: <NOVA_ICONS.breaker size={18} />, ok: closed, reason: "Kesici zaten açık" },
    { id: "cb_close", label: "Kesiciyi kapat", icon: <NOVA_ICONS.breaker size={18} />, ok: !closed && !esClosed, reason: esClosed ? "Toprak kapalıyken kesici kapanmaz" : undefined },
    { id: "es_close", label: "Toprağı kapat", icon: <NOVA_ICONS.earth size={18} />, ok: !closed && !esClosed, reason: closed ? "Kesici kapalıyken toprak kapanmaz" : undefined },
    { id: "es_open", label: "Toprağı aç", icon: <NOVA_ICONS.earth size={18} />, ok: esClosed, reason: "Toprak zaten açık" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        <Metric label="Kesici" value={cbPos ? POS_TEXT[cbPos as "closed"] : "—"} />
        <Metric label="Toprak ayırıcısı" value={esClosed ? "Kapalı" : "Açık"} />
        <Metric label="Akım (CT)" value={`${f(current, 0)} A`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
        {actions.map((a) => (
          <div key={a.id} style={{ display: "grid", gap: 3 }}>
            <button
              type="button"
              disabled={busy || !a.ok}
              onClick={() => onCommand?.(cell.id, a.id)}
              style={{ ...btnStyle(a.id === "cb_open"), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: a.ok && !busy ? 1 : 0.45 }}
            >
              {a.icon}
              {a.label}
            </button>
            {!a.ok && a.reason ? (
              <small style={{ fontSize: 11, color: "var(--nm-muted)" }}>{a.reason}</small>
            ) : null}
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: "var(--nm-muted)" }}>
        Kilitleme: toprak kapalıyken kesici kapanmaz · kesici kapalıyken toprak kapanmaz · H01 gelen kablosu POI'den enerjilidir.
      </p>
    </>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ border: `1px solid ${"var(--nm-line2)"}`, borderRadius: 5, padding: "7px 9px", minWidth: 0 }}>
    <small style={{ display: "block", fontSize: 11, color: "var(--nm-muted)" }}>{label}</small>
    <b style={{ display: "block", fontSize: 16, fontWeight: 600, color: "var(--nm-fg)" }}>{value}</b>
  </div>
);

function btnStyle(warn = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    border: `1px solid ${warn ? "var(--nm-warn)" : "var(--nm-line)"}`,
    background: "var(--nm-panel2)",
    color: warn ? "var(--nm-warn)" : "var(--nm-fg)",
    borderRadius: 5,
    padding: "7px 13px",
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
  };
}
