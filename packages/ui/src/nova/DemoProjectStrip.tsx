import React from "react";

/**
 * Proje veri şeridi (SPEC UC-2, FR-2.1) — referans `pinfo` düzeni: proje adı +
 * etiket/değer/alt-açıklama sütunları (rated power/energy, battery, PCS, MV,
 * HVAC, available, dischargeable, AUX, ambient). Değerler app'te türetilir.
 */

export interface DemoProjectStripItem {
  label: string;
  value: string;
  sub?: string;
}

export interface DemoProjectStripProps {
  name: string;
  id: string;
  location: string;
  items: DemoProjectStripItem[];
}

export const DemoProjectStrip: React.FC<DemoProjectStripProps> = ({
  name,
  id,
  location,
  items,
}) => (
  <div className="pinfo" data-testid="project-strip">
    <div className="pi-name">
      <b>{name}</b>
      <small>
        {id} · {location}
      </small>
    </div>
    {items.map((it) => (
      <div key={it.label}>
        <small>{it.label}</small>
        <b>{it.value}</b>
        {it.sub ? <em>{it.sub}</em> : null}
      </div>
    ))}
  </div>
);
