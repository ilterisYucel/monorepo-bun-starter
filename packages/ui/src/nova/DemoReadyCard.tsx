import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import {
  DEMO_REST_MINUTES,
  deriveRestState,
  lastFullRunFinishedAt,
  thermalReady,
} from "./demo-readiness";

/**
 * Ready/Rest kartı (SPEC UC-7/T-18, FR-7.3, K7). Dinlenme süresi son tam
 * şarj/deşarj run bitişinden; termal hazırlık raf sıcaklıklarından türetilir
 * (saf fonksiyonlar). `now` test için dışarıdan verilebilir.
 */
export interface DemoReadyCardProps {
  runs: Array<{ name: string; finishedAt: string | null }>;
  banks: Array<{ tmax: number; tmin?: number }>;
  limits: { tempMin: number; tempMax: number };
  restMinutes?: number;
  now?: Date;
}

export const DemoReadyCard: React.FC<DemoReadyCardProps> = ({
  runs,
  banks,
  limits,
  restMinutes = DEMO_REST_MINUTES,
  now,
}) => {
  const nowMs = (now ?? new Date()).getTime();
  const rest = deriveRestState(lastFullRunFinishedAt(runs), nowMs, restMinutes);
  const ready = thermalReady(banks, limits);
  const overall = rest.complete && ready;

  return (
    <div
      data-testid="ready-card"
      style={{ padding: "12px 14px", display: "grid", gap: 8 }}
    >
      <h4 style={{ fontSize: 12, letterSpacing: "0.09em", textTransform: "uppercase", color: COLORS_LIGHT.muted, margin: 0 }}>
        Ready / Rest
      </h4>
      <Row
        label="Dinlenme"
        value={rest.complete ? "tamam" : "sürüyor"}
        testid="ready-rest"
        tone={rest.complete ? COLORS_LIGHT.ok : COLORS_LIGHT.warn}
        sub={
          rest.elapsedMinutes !== undefined
            ? `${Math.round(rest.elapsedMinutes)} / ${rest.requiredMinutes} dk`
            : `— / ${rest.requiredMinutes} dk`
        }
      />
      <Row
        label="Termal hazırlık"
        value={ready ? "hazır" : "bant dışı"}
        testid="ready-thermal"
        tone={ready ? COLORS_LIGHT.ok : COLORS_LIGHT.warn}
        sub={`${limits.tempMin}–${limits.tempMax} °C`}
      />
      <b
        data-testid="ready-overall"
        style={{
          fontSize: 14,
          color: overall ? COLORS_LIGHT.ok : COLORS_LIGHT.alarm,
        }}
      >
        {overall ? "Saha hazır" : "Saha hazır değil"}
      </b>
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  sub: string;
  testid: string;
  tone: string;
}> = ({ label, value, sub, testid, tone }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
    <span style={{ fontSize: 13, color: COLORS_LIGHT.muted }}>{label}</span>
    <span style={{ fontSize: 13 }}>
      <b data-testid={testid} style={{ color: tone }}>
        {value}
      </b>
      <small style={{ marginLeft: 6, color: COLORS_LIGHT.dim }}>{sub}</small>
    </span>
  </div>
);
