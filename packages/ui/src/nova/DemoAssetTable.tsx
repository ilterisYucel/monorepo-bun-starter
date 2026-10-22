import React from "react";

/**
 * Asset management portföy tablosu (SPEC UC-11, FR-11.6). gdems
 * `home-view.js#renderAssets` `am-tbl` portu: proje başına bağlantı,
 * BESS, mod, POI, enerji, gelir, arbitraj potansiyeli ve uygunluk.
 * Değerler sayfada türetilir (canlı saha + statik snapshot); bu bileşen
 * yalnız sunumdur.
 */

export interface DemoAssetRow {
  key: string;
  name: string;
  location: string;
  source: string;
  connMW: number;
  energyMWh: number;
  mode: string;
  poiMW: number;
  sourceMWh: number | null;
  exportedMWh: number;
  importedMWh: number;
  revenueTL: number;
  arbitrageTL: number;
  availableGroups: number;
  totalGroups: number;
  live: boolean;
}

export interface DemoAssetTableProps {
  rows: DemoAssetRow[];
  onOpen?: (key: string) => void;
}

const f = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const tl = (v: number): string => Math.round(v).toLocaleString("en-US");

const poiCls = (v: number): string =>
  v > 0.05 ? "c-dis" : v < -0.05 ? "c-chg" : "";

export const DemoAssetTable: React.FC<DemoAssetTableProps> = ({
  rows,
  onOpen,
}) => {
  const sum = (pick: (r: DemoAssetRow) => number): number =>
    rows.reduce((a, r) => a + pick(r), 0);
  const tot = {
    connMW: sum((r) => r.connMW),
    energyMWh: sum((r) => r.energyMWh),
    poiMW: sum((r) => r.poiMW),
    exportedMWh: sum((r) => r.exportedMWh),
    importedMWh: sum((r) => r.importedMWh),
    revenueTL: sum((r) => r.revenueTL),
    arbitrageTL: sum((r) => r.arbitrageTL),
    availableGroups: sum((r) => r.availableGroups),
    totalGroups: sum((r) => r.totalGroups),
  };

  return (
    <div className="tblwrap" data-testid="demo-asset-table">
      <table className="dt am-tbl">
        <thead>
          <tr>
            <th className="tl">Project</th>
            <th className="tl">Main source</th>
            <th>Connection</th>
            <th>BESS</th>
            <th className="tl">Mode</th>
            <th>POI now</th>
            <th>Source today</th>
            <th>Exported · imported today</th>
            <th>Revenue today at PTF</th>
            <th>Arbitrage potential (1 cycle)</th>
            <th>Availability</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="txt">
                {r.live ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => onOpen?.(r.key)}
                  >
                    <b>{r.name}</b>
                  </button>
                ) : (
                  <b>{r.name}</b>
                )}
                <small>
                  {r.location}
                  {r.live ? "" : " · demo"}
                </small>
              </td>
              <td className="txt">{r.source}</td>
              <td>{`${tl(r.connMW)} MWe`}</td>
              <td>{`${f(r.energyMWh)} MWh`}</td>
              <td className="txt">{r.mode}</td>
              <td className={poiCls(r.poiMW)}>{`${f(r.poiMW)} MW`}</td>
              <td>{r.sourceMWh != null ? `${f(r.sourceMWh)} MWh` : "—"}</td>
              <td>{`${f(r.exportedMWh)} · ${f(r.importedMWh)} MWh`}</td>
              <td className={r.revenueTL < 0 ? "sev-warn" : ""}>
                <b>{`${tl(r.revenueTL / 1000)} k TL`}</b>
              </td>
              <td>{`${tl(r.arbitrageTL / 1000)} k TL`}</td>
              <td>{`${r.availableGroups} / ${r.totalGroups}`}</td>
            </tr>
          ))}
          <tr className="tot">
            <td className="txt">
              <b>Portfolio</b>
            </td>
            <td />
            <td>{`${tl(tot.connMW)} MWe`}</td>
            <td>{`${f(tot.energyMWh)} MWh`}</td>
            <td />
            <td>{`${f(tot.poiMW)} MW`}</td>
            <td />
            <td>{`${f(tot.exportedMWh)} · ${f(tot.importedMWh)} MWh`}</td>
            <td>
              <b>{`${tl(tot.revenueTL / 1000)} k TL`}</b>
            </td>
            <td>{`${tl(tot.arbitrageTL / 1000)} k TL`}</td>
            <td>{`${tot.availableGroups} / ${tot.totalGroups}`}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
