import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import type { NovaTopology, NovaUnitState } from "./mimic-types";
import { POS_TEXT, PCS_TEXT, rackSeverity } from "./nova-mimic";

/**
 * Demo cihaz panelleri (SPEC UC-5, FR-5.1..FR-5.2): MV · Battery · PCS · HVAC ·
 * RMU&TR · AUX. Veri props'tan gelir; IO yoktur. Bileşenler `Demo` prefix,
 * named export (K12).
 */

export type DemoDeviceSection =
  | "mv"
  | "battery"
  | "pcs"
  | "hvac"
  | "rmutr"
  | "aux";

/** Devices sayfası bölüm sekmeleri (FR-5.1 — 6 bölüm). */
export const DEMO_DEVICE_TABS: Array<{
  id: DemoDeviceSection;
  label: string;
}> = [
  { id: "mv", label: "MV hücreleri" },
  { id: "battery", label: "Batarya" },
  { id: "pcs", label: "PCS" },
  { id: "hvac", label: "HVAC" },
  { id: "rmutr", label: "RMU & Trafo" },
  { id: "aux", label: "AUX" },
];

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export interface DemoDevicePanelProps {
  unit: NovaUnitState | undefined;
  topology: NovaTopology;
}

/** MV hücreleri — station hücre tablosu (motor/toprak işaretleri). */
export const DemoMvPanel: React.FC<DemoDevicePanelProps> = ({ topology }) => (
  <DataTable
    head={["Hücre", "Etiket", "Tip", "Motor", "Toprak"]}
    rows={topology.station.cells.map((c) => [
      c.id,
      c.label,
      c.kind.toUpperCase(),
      c.motor ? "Var" : "—",
      c.es ? (c.esMotor ? "Motorlu" : "Manuel") : "—",
    ])}
  />
);

/** Batarya — bara başına raf SOC/V/I/sıcaklık haritası (FR-5.2). */
export const DemoBatteryPanel: React.FC<DemoDevicePanelProps> = ({
  unit,
  topology,
}) => {
  if (!unit) return <Empty />;
  const L = topology.limits;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {unit.banks.map((b) => (
        <div key={b.id}>
          <h5 style={h5}>
            DC BUS {b.id} · SOC {f(b.soc)} % · SOH {f(b.soh)} % · {f(b.vdc, 0)} V
          </h5>
          <DataTable
            head={["Raf", "SOC %", "V", "A", "°C"]}
            rows={Array.from({ length: topology.unit.racksPerBank }).map(
              (_, r) => {
                const t = b.racks[r];
                return [
                  `R${r + 1}`,
                  b.rackSoc?.[r] !== undefined ? f(b.rackSoc[r]!) : "—",
                  b.rackV?.[r] !== undefined ? f(b.rackV[r]!, 0) : "—",
                  b.rackI?.[r] !== undefined ? f(b.rackI[r]!, 0) : "—",
                  t !== undefined ? f(t) : "—",
                ];
              },
            )}
            rowStyle={(ri) => {
              const t = b.racks[ri];
              const sev = t !== undefined ? rackSeverity(t, L) : null;
              return sev === "alarm"
                ? { color: COLORS_LIGHT.alarm }
                : sev === "cold"
                  ? { color: COLORS_LIGHT.cold }
                  : undefined;
            }}
          />
        </div>
      ))}
    </div>
  );
};

/** PCS — ünite PCS tablosu. */
export const DemoPcsPanel: React.FC<DemoDevicePanelProps> = ({ unit }) => {
  if (!unit) return <Empty />;
  return (
    <DataTable
      head={["PCS", "Durum", "P MW", "IGBT °C", "Sınırlı"]}
      rows={unit.pcs.map((p) => {
        const run = p.state === "chg" || p.state === "dis";
        return [
          `PCS-${p.id}`,
          PCS_TEXT[p.state],
          run ? f(p.pMW, 2) : "0,00",
          f(p.igbtC, 0),
          p.limited ? "Evet" : "—",
        ];
      })}
    />
  );
};

/** HVAC — 4 bölüm × 2 ünite (8 HVAC) özeti. */
export const DemoHvacPanel: React.FC<DemoDevicePanelProps> = ({ topology }) => {
  const hvac = topology.unit.auxLoads?.find((a) => a.key === "hvac");
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {(topology.unit.sections ?? []).map((s) => (
          <div
            key={s.id}
            data-testid="hvac-section"
            style={{
              border: `1px solid ${COLORS_LIGHT.line}`,
              borderRadius: 4,
              padding: "5px 7px",
              fontSize: 12,
            }}
          >
            Bölüm {s.id} · HVAC {s.hvac.join(", ")} · raf {s.racks[0]}–
            {s.racks[s.racks.length - 1]}
          </div>
        ))}
      </div>
      {hvac ? (
        <p style={{ fontSize: 12, color: COLORS_LIGHT.muted }}>
          {hvac.label} · {f(hvac.kVA)} kVA (tepe {f(hvac.peakKVA ?? hvac.kVA)} kVA)
        </p>
      ) : null}
    </div>
  );
};

/** RMU & Trafo — ünite RMU pozisyonları + güç trafosu künyesi. */
export const DemoRmuTrPanel: React.FC<DemoDevicePanelProps> = ({
  unit,
  topology,
}) => (
  <div style={{ display: "grid", gap: 12 }}>
    <DataTable
      head={["RMU", "Etiket", "Tip", "Pozisyon"]}
      rows={topology.unit.rmu.map((c) => [
        c.id,
        c.label,
        c.kind.toUpperCase(),
        c.kind === "es"
          ? unit
            ? unit.rmu.es
              ? "Kapalı"
              : "Açık"
            : "—"
          : unit && c.id in unit.rmu
            ? POS_TEXT[unit.rmu[c.id as "H01" | "H02" | "H03"] ?? "open"]
            : "—",
      ])}
    />
    <DataTable
      head={["Trafo", "Değer"]}
      rows={[
        ["Güç", `${f(topology.unit.trKVA, 0)} kVA`],
        ["Oran", topology.unit.trRatio],
        ["Vektör", topology.unit.trVector],
        ["Sargı", "3 sargılı (her PCS için bir LV)"],
      ]}
    />
  </div>
);

/** AUX — konteyner iç ihtiyaç yükleri + AUX trafosu. */
export const DemoAuxPanel: React.FC<DemoDevicePanelProps> = ({ topology }) => (
  <div style={{ display: "grid", gap: 12 }}>
    <DataTable
      head={["Yük", "kVA", "Tepe kVA", "UPS"]}
      rows={(topology.unit.auxLoads ?? []).map((a) => [
        a.label,
        f(a.kVA, 2),
        a.peakKVA !== undefined ? f(a.peakKVA, 2) : "—",
        a.ups ? "Var" : "—",
      ])}
    />
    {topology.aux ? (
      <p style={{ fontSize: 12, color: COLORS_LIGHT.muted }}>
        AUX trafo · {f(topology.aux.trKVA, 0)} kVA · {topology.aux.trRatio} ·{" "}
        {topology.aux.trVector} · {topology.aux.lvV} V
      </p>
    ) : null}
  </div>
);

const h5: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: COLORS_LIGHT.fg,
  margin: "0 0 5px",
};

const Empty: React.FC = () => (
  <p style={{ color: COLORS_LIGHT.muted, fontSize: 13 }}>Ünite verisi yok.</p>
);

const DataTable: React.FC<{
  head: string[];
  rows: string[][];
  rowStyle?: (ri: number) => React.CSSProperties | undefined;
}> = ({ head, rows, rowStyle }) => (
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
    <thead>
      <tr>
        {head.map((h, i) => (
          <th
            key={i}
            style={{
              fontWeight: 600,
              color: COLORS_LIGHT.muted,
              textAlign: i === 0 ? "left" : "right",
              padding: "3px 0",
              fontSize: 11.5,
            }}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, ri) => (
        <tr key={ri} style={rowStyle?.(ri)}>
          {row.map((c, ci) => (
            <td
              key={ci}
              style={{
                padding: "3px 0",
                borderTop: `1px solid ${COLORS_LIGHT.line2}`,
                textAlign: ci === 0 ? "left" : "right",
                color: "inherit",
                fontFamily: ci === 0 ? undefined : '"IBM Plex Mono", monospace',
              }}
            >
              {c}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
