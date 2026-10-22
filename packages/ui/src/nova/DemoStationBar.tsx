import React from "react";
import { NOVA_ICONS } from "../icons/demo-icons";

/**
 * İstasyon barı (stBar) — referans `app.js#renderStBar` portu (SPEC UC-11, K-14).
 * KPI kartlarının üstünde; sol: aktif BESS MV istasyonu adı + grup aralığı,
 * sağ: istasyon seçici seg (arıza sayılı). `activeStation` context'ten gelir.
 */

export interface DemoStationBarStation {
  index: number;
  name: string;
  /** Seçili istasyonun grup aralığı (BESS#first–last). */
  first: number;
  last: number;
  /** İstasyondaki aktif arıza sayısı (seg alt yazısı). */
  faults?: number;
}

export interface DemoStationBarProps {
  stations: DemoStationBarStation[];
  active: number;
  onSelect: (index: number) => void;
}

export const DemoStationBar: React.FC<DemoStationBarProps> = ({ stations, active, onSelect }) => {
  if (stations.length <= 1) return null;
  const cur = stations.find((s) => s.index === active) ?? stations[0];
  return (
    <div className="stbar" role="group" aria-label="BESS MV station">
      <span className="stb-l">
        <NOVA_ICONS.units size={16} />
        <b>{cur.name}</b>
        <small>
          {`BESS#${cur.first}–${cur.last} · Site layout, Devices, Operations, Faults and Admin show this station`}
        </small>
      </span>
      <div className="seg" role="group" aria-label="BESS MV station">
        {stations.map((s) => (
          <button key={s.index} type="button" aria-pressed={s.index === active} onClick={() => onSelect(s.index)}>
            {s.name.replace("BESS MV STATION", "BESS MV St.")}
            {s.faults ? <small>{` · ${s.faults} fault${s.faults > 1 ? "s" : ""}`}</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
};
