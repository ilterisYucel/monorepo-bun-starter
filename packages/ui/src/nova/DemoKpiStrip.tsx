import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";

/**
 * KPI şeridi + kutusu (SPEC UC-4/T-16). Veri props ile gelir (ui paketi hook
 * import etmez). Renkler COLORS_LIGHT token'larından.
 */

export type DemoTileSeverity = "alarm" | "warn" | "cold" | "rest" | null;

export interface DemoTile {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  sev?: DemoTileSeverity;
}

const sevColor: Record<Exclude<DemoTileSeverity, null>, string> = {
  alarm: COLORS_LIGHT.alarm,
  warn: COLORS_LIGHT.warn,
  cold: COLORS_LIGHT.cold,
  rest: COLORS_LIGHT.info,
};

export const DemoKpiTile: React.FC<DemoTile> = ({
  icon,
  label,
  value,
  sub,
  sev = null,
}) => {
  const accent = sev ? sevColor[sev] : undefined;
  return (
    <div
      style={{
        background: COLORS_LIGHT.panel,
        padding: "10px 12px",
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <span
        style={{
          flex: "0 0 auto",
          width: 36,
          height: 36,
          borderRadius: 7,
          display: "grid",
          placeItems: "center",
          background: COLORS_LIGHT.panel2,
          border: `1px solid ${COLORS_LIGHT.line2}`,
          color: accent ?? COLORS_LIGHT.fg,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <small
          style={{
            display: "block",
            fontSize: 11,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: COLORS_LIGHT.muted,
          }}
        >
          {label}
        </small>
        <b
          style={{
            display: "block",
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontWeight: 500,
            fontSize: 19,
            marginTop: 1,
            whiteSpace: "nowrap",
            color: accent ?? COLORS_LIGHT.fg,
          }}
        >
          {value}
        </b>
        {sub ? (
          <em
            style={{
              display: "block",
              fontStyle: "normal",
              fontSize: 12,
              color: COLORS_LIGHT.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sub}
          </em>
        ) : null}
      </div>
    </div>
  );
};

export interface DemoKpiStripProps {
  tiles: DemoTile[];
}

export const DemoKpiStrip: React.FC<DemoKpiStripProps> = ({ tiles }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${Math.max(1, tiles.length)}, minmax(0, 1fr))`,
      gap: 1,
      background: COLORS_LIGHT.line,
      border: `1px solid ${COLORS_LIGHT.line}`,
      borderRadius: 6,
      overflow: "hidden",
    }}
  >
    {tiles.map((tile, i) => (
      <DemoKpiTile key={i} {...tile} />
    ))}
  </div>
);
