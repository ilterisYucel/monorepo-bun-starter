import React from "react";

/**
 * KPI şeridi + kutusu — referans konsol düzeni (SPEC UC-2, FR-2.2).
 * Sınıflar `nova-console.css` (k-alarm/k-warn/k-cold/k-rest/k-dis/k-chg/
 * k-restno/k-restok). Renkler tema değişkenlerinden gelir.
 */

export type DemoTileSeverity =
  | "alarm"
  | "warn"
  | "cold"
  | "rest"
  | "chg"
  | "dis"
  | "restno"
  | "restok"
  | null;

export interface DemoTile {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  sev?: DemoTileSeverity;
}

export interface DemoKpiStripProps {
  tiles: DemoTile[];
}

export const DemoKpiTile: React.FC<DemoTile> = ({ icon, label, value, sub, sev = null }) => (
  <div className={`kpi ${sev ? `k-${sev}` : ""}`}>
    <span className="ki">{icon}</span>
    <div className="kt">
      <small>{label}</small>
      <b>{value}</b>
      {sub ? <em>{sub}</em> : null}
    </div>
  </div>
);

export const DemoKpiStrip: React.FC<DemoKpiStripProps> = ({ tiles }) => (
  <div className="kpis">
    {tiles.map((tile, i) => (
      <DemoKpiTile key={i} {...tile} />
    ))}
  </div>
);
