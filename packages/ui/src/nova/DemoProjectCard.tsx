import React from "react";
import { NOVA_ICONS } from "../icons/demo-icons";

/**
 * Portföy proje kartı (SPEC UC-11, FR-11.2/FR-11.3/FR-11.5). gdems
 * `home-view.js` `pcard` düzeni: durum, ad, alt başlık, 3 KPI ve açma
 * bağlantısı. Canlı proje butondur (konsol açar); statik/demo proje
 * "demo" işaretli, tıklanamaz (`pcard-demo`).
 */

export interface DemoProjectCardKpi {
  label: string;
  value: string;
  sub?: string;
}

export interface DemoProjectCardProps {
  name: string;
  status: string;
  faultCount?: number;
  subtitle: string;
  kpis: DemoProjectCardKpi[];
  live: boolean;
  onOpen?: () => void;
}

export const DemoProjectCard: React.FC<DemoProjectCardProps> = ({
  name,
  status,
  faultCount = 0,
  subtitle,
  kpis,
  live,
  onOpen,
}) => {
  const body = (
    <>
      <span className="pc-top">
        <span className="ki">
          <NOVA_ICONS.folder />
        </span>
        <span className={`pc-st ${faultCount > 0 ? "c-alarm" : "c-ok"}`}>
          <i />
          {status}
          {faultCount > 0
            ? ` · ${faultCount} active fault${faultCount > 1 ? "s" : ""}`
            : ""}
        </span>
      </span>
      <b className="pc-name">{name}</b>
      <span className="pc-sub">
        {subtitle}
        {live ? "" : " · demo"}
      </span>
      <span className="pc-kpis">
        {kpis.map((k) => (
          <span key={k.label}>
            <small>{k.label}</small>
            <b className="num">{k.value}</b>
            {k.sub ? <em>{k.sub}</em> : null}
          </span>
        ))}
      </span>
      <span className="pc-open">
        {live ? "Open project →" : "Demo project — not live"}
      </span>
    </>
  );

  if (!live) {
    return (
      <div className="pcard pcard-demo" aria-label={`${name} — demo project`}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="pcard"
      onClick={onOpen}
      aria-label={`${name} — open project`}
    >
      {body}
    </button>
  );
};
