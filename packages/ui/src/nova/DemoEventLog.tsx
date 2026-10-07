import React, { useState } from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";

/**
 * Event log paneli (SPEC UC-8/T-20, FR-8.1): son olaylar, severity filtresi.
 * Veri props'tan gelir (IO yok). `Demo` prefix, named export.
 */

export interface DemoEvent {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  message: string;
  details?: string;
}

export type DemoEventFilter = "all" | "error" | "warning" | "info" | "success";

export interface DemoEventLogProps {
  events: DemoEvent[];
}

const TYPE_COLOR: Record<string, string> = {
  error: COLORS_LIGHT.alarm,
  warning: COLORS_LIGHT.warn,
  info: COLORS_LIGHT.info,
  success: COLORS_LIGHT.ok,
};

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("tr-TR");
};

export const DemoEventLog: React.FC<DemoEventLogProps> = ({ events }) => {
  const [filter, setFilter] = useState<DemoEventFilter>("all");
  const shown = events.filter((e) => filter === "all" || e.type === filter);

  const filters: Array<[DemoEventFilter, string]> = [
    ["all", "Tümü"],
    ["error", "Hata"],
    ["warning", "Uyarı"],
    ["info", "Bilgi"],
    ["success", "Başarılı"],
  ];

  return (
    <div data-testid="demo-event-log">
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 14px",
          borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
        }}
      >
        {filters.map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`event-filter-${id}`}
            onClick={() => setFilter(id)}
            style={{
              border: `1px solid ${COLORS_LIGHT.line}`,
              borderRadius: 4,
              padding: "3px 9px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: filter === id ? COLORS_LIGHT.panel2 : "none",
              color: filter === id ? COLORS_LIGHT.fg : COLORS_LIGHT.muted,
              boxShadow: filter === id ? `inset 0 -2px 0 ${COLORS_LIGHT.sel}` : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ padding: 20, textAlign: "center", color: COLORS_LIGHT.muted }}>
          Kayıt yok.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: "6px 14px 12px", listStyle: "none", display: "grid", gap: 3 }}>
          {shown.map((e) => (
            <li
              key={e.id}
              data-testid="event-row"
              style={{
                display: "grid",
                gridTemplateColumns: "150px 80px 70px 1fr",
                gap: 8,
                fontSize: 12.5,
                alignItems: "baseline",
                borderTop: `1px solid ${COLORS_LIGHT.line2}`,
                padding: "3px 0",
              }}
            >
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: COLORS_LIGHT.muted }}>
                {fmtTime(e.timestamp)}
              </span>
              <span style={{ fontWeight: 700, color: TYPE_COLOR[e.type] ?? COLORS_LIGHT.fg }}>
                {e.type}
              </span>
              <span style={{ color: COLORS_LIGHT.dim }}>{e.source}</span>
              <span style={{ color: COLORS_LIGHT.fg }}>{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
