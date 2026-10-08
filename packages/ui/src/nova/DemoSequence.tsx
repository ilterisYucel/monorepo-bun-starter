import React from "react";

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
      <p style={{ fontSize: 12.5, color: "var(--nm-muted)" }}>Adım yok.</p>
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
              color: done || active ? "var(--nm-fg)" : "var(--nm-muted)",
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
                border: `1px solid ${active ? "var(--nm-sel)" : "var(--nm-line)"}`,
                background: done ? "var(--nm-live)" : "none",
                color: done
                  ? "var(--nm-panel)"
                  : active
                    ? "var(--nm-sel)"
                    : "var(--nm-muted)",
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
