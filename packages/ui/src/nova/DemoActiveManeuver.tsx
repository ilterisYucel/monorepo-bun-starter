import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import { NOVA_ICONS } from "../icons/demo-icons";
import type { DemoActiveRun } from "./maneuver-types";

/**
 * Aktif manevra paneli + Durdur düğmesi (SPEC UC-5/T-24, FR-5.5/FR-5.6).
 * Run verisi `GET /api/operations/runs`'tan gelir; "Durdur" stop manevrası
 * gönderir (çalışan run iptal edilemez — backend v1).
 */

export interface DemoActiveManeuverProps {
  run?: DemoActiveRun;
  onStop?: () => void;
  busy?: boolean;
}

export const DemoActiveManeuver: React.FC<DemoActiveManeuverProps> = ({
  run,
  onStop,
  busy = false,
}) => (
  <div style={{ padding: "12px 14px 14px", display: "grid", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ color: COLORS_LIGHT.muted }}>
          {run ? <NOVA_ICONS.chg /> : <NOVA_ICONS.stby />}
        </span>
        <div>
          <b style={{ display: "block", fontSize: 16, color: COLORS_LIGHT.fg }}>
            {run ? run.label : "Aktif manevra yok"}
          </b>
          <small style={{ fontSize: 12, color: COLORS_LIGHT.muted }}>
            {run ? `Durum: ${run.status}` : "Saha bekleme modunda"}
          </small>
        </div>
      </div>
      <DemoStopButton onStop={onStop} disabled={!run || busy} />
    </div>

    {run ? (
      <ol style={{ display: "grid", gap: 4, margin: 0, padding: 0, listStyle: "none" }}>
        {run.steps.map((s, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: s.status === "done" || s.status === "active" ? COLORS_LIGHT.fg : COLORS_LIGHT.muted, fontWeight: s.status === "active" ? 600 : 400 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                border: `1px solid ${s.status === "active" ? COLORS_LIGHT.sel : COLORS_LIGHT.line}`,
                background: s.status === "done" ? COLORS_LIGHT.live : "none",
                color: s.status === "done" ? COLORS_LIGHT.panel : s.status === "active" ? COLORS_LIGHT.sel : COLORS_LIGHT.muted,
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              {s.status === "done" ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
    ) : null}
  </div>
);

export interface DemoStopButtonProps {
  onStop?: () => void;
  disabled?: boolean;
}

export const DemoStopButton: React.FC<DemoStopButtonProps> = ({ onStop, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onStop}
    style={{
      border: `1px solid ${COLORS_LIGHT.warn}`,
      color: COLORS_LIGHT.warn,
      background: "none",
      borderRadius: 5,
      padding: "6px 12px",
      fontWeight: 600,
      fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
    }}
  >
    Durdur
  </button>
);
