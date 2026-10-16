import React from "react";
import { NOVA_ICONS } from "../icons/demo-icons";
import { DemoSequence } from "./DemoSequence";
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
        <span style={{ color: "var(--nm-muted)" }}>
          {run ? <NOVA_ICONS.chg /> : <NOVA_ICONS.stby />}
        </span>
        <div>
          <b style={{ display: "block", fontSize: 16, color: "var(--nm-fg)" }}>
            {run ? run.label : "Aktif manevra yok"}
          </b>
          <small style={{ fontSize: 12, color: "var(--nm-muted)" }}>
            {run ? `Durum: ${run.status}` : "Saha bekleme modunda"}
          </small>
        </div>
      </div>
      <DemoStopButton onStop={onStop} disabled={!run || busy} />
    </div>

    {run ? <DemoSequence steps={run.steps} /> : null}
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
      border: `1px solid ${"var(--nm-warn)"}`,
      color: "var(--nm-warn)",
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
