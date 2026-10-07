import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";

/**
 * Uyarı listesi (SPEC UC-4/T-17). Severite sıralı veri props ile gelir.
 * Satır tıklaması `onSelect` ile ünite/hücre seçimini bildirir.
 */

export type DemoAlertSeverity = "alarm" | "warn" | "cold" | "maint" | "info";

export interface DemoAlertItem {
  sev: DemoAlertSeverity;
  title: string;
  desc: string;
  value: string;
  unitNo?: number;
  cell?: string;
}

const sevColor: Record<DemoAlertSeverity, string> = {
  alarm: COLORS_LIGHT.alarm,
  warn: COLORS_LIGHT.warn,
  cold: COLORS_LIGHT.cold,
  maint: COLORS_LIGHT.maint,
  info: COLORS_LIGHT.info,
};

export interface DemoAlertListProps {
  alerts: DemoAlertItem[];
  onSelect?: (item: DemoAlertItem) => void;
}

export const DemoAlertList: React.FC<DemoAlertListProps> = ({
  alerts,
  onSelect,
}) => {
  if (alerts.length === 0) {
    return (
      <div style={{ padding: 14, color: COLORS_LIGHT.muted, fontSize: 13 }}>
        Dikkat gerektiren durum yok.
      </div>
    );
  }
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: 330, overflow: "auto" }}>
      {alerts.map((a, i) => (
        <li key={i} style={{ borderTop: i === 0 ? "none" : `1px solid ${COLORS_LIGHT.line2}` }}>
          <button
            type="button"
            onClick={() => onSelect?.(a)}
            style={{
              display: "grid",
              gridTemplateColumns: "4px 1fr auto",
              gap: "2px 10px",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: 0,
              padding: "9px 14px 9px 0",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                gridRow: "1 / 3",
                background: sevColor[a.sev],
                borderRadius: "0 2px 2px 0",
              }}
            />
            <span style={{ fontWeight: 600, fontSize: 13.5, color: COLORS_LIGHT.fg }}>
              {a.title}
            </span>
            <span
              style={{
                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                fontSize: 12.5,
                textAlign: "right",
                color: COLORS_LIGHT.fg,
              }}
            >
              {a.value}
            </span>
            <span style={{ gridColumn: "2 / 4", fontSize: 12, color: COLORS_LIGHT.muted }}>
              {a.desc}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
};
