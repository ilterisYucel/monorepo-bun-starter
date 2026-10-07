import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";

/**
 * Operasyon adım dizisi görünümü (SPEC UC-7/T-17, FR-7.2). `operation_runs`
 * adımları (label + status) durumlarıyla listelenir. IO yoktur.
 */
export interface DemoSequenceStep {
  label: string;
  status: string;
}

export interface DemoSequenceProps {
  steps: DemoSequenceStep[];
}

export const DemoSequence: React.FC<DemoSequenceProps> = ({ steps }) => {
  if (steps.length === 0) {
    return (
      <p style={{ fontSize: 12.5, color: COLORS_LIGHT.muted }}>Adım yok.</p>
    );
  }
  return (
    <ol
      data-testid="demo-sequence"
      style={{ display: "grid", gap: 4, margin: 0, padding: 0, listStyle: "none" }}
    >
      {steps.map((s, i) => {
        const done = s.status === "done" || s.status === "completed";
        const active = s.status === "active" || s.status === "running";
        return (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: done || active ? COLORS_LIGHT.fg : COLORS_LIGHT.muted,
              fontWeight: active ? 600 : 400,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                border: `1px solid ${active ? COLORS_LIGHT.sel : COLORS_LIGHT.line}`,
                background: done ? COLORS_LIGHT.live : "none",
                color: done
                  ? COLORS_LIGHT.panel
                  : active
                    ? COLORS_LIGHT.sel
                    : COLORS_LIGHT.muted,
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
};
