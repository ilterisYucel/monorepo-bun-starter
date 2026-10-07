import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import type { NovaTopology, NovaUnitState } from "./mimic-types";
import { PCS_TEXT, POS_TEXT, defaultUnitStatus, rackSeverity, tempFill } from "./nova-mimic";

/**
 * Ünite detay paneli (SPEC UC-4/T-18, FR-4.3): RMU pozisyonları, PCS ve banka
 * tabloları, raf sıcaklıkları. Veri props ile gelir.
 */

export interface DemoUnitDetailProps {
  unit: NovaUnitState | undefined;
  topology: NovaTopology;
}

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export const DemoUnitDetail: React.FC<DemoUnitDetailProps> = ({
  unit,
  topology,
}) => {
  if (!unit) {
    return (
      <div style={{ padding: 14, color: COLORS_LIGHT.muted, fontSize: 13 }}>
        Bir ünite seçin.
      </div>
    );
  }
  const status = unit.status ?? defaultUnitStatus(unit, topology.limits);
  const L = topology.limits;
  const tsv = (t: number): string =>
    t > L.tempMax ? COLORS_LIGHT.alarm : t < L.tempMin ? COLORS_LIGHT.cold : COLORS_LIGHT.fg;

  return (
    <div style={{ padding: "12px 14px 14px", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: COLORS_LIGHT.fg }}>
          BESS#{unit.n}
        </h3>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS_LIGHT.muted }}>
          {status.text}
        </span>
      </div>

      <Section title="OG hücre pozisyonları · RMU">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
          {(["H01", "H02", "H03"] as const).map((k) => {
            const pos = unit.rmu[k];
            return (
              <Field key={k} label={k} value={pos ? POS_TEXT[pos] : "Yok"} />
            );
          })}
          <Field label="ES · Toprak" value={unit.rmu.es ? "Kapalı" : "Açık"} />
        </div>
      </Section>

      <Section title="PCS">
        <Table
          head={["", "Durum", "P MW", "IGBT °C"]}
          rows={unit.pcs.map((p) => [
            `PCS-${unit.n}${p.id}`,
            p.limited && (p.state === "chg" || p.state === "dis")
              ? `Sınırlı · ${PCS_TEXT[p.state]}`
              : PCS_TEXT[p.state],
            p.state === "chg" || p.state === "dis" ? f(p.pMW, 2) : "0,00",
            f(p.igbtC, 0),
          ])}
        />
      </Section>

      <Section title="Batarya bankaları">
        <Table
          head={["", ...topology.unit.banks.map((b) => `Banka ${b}`)]}
          rows={[
            ["DC kesici", ...unit.banks.map((b) => POS_TEXT[b.dcb])],
            ["SOC", ...unit.banks.map((b) => `${f(b.soc)} %`)],
            ["SOH", ...unit.banks.map((b) => `${f(b.soh)} %`)],
            ["DC gerilim", ...unit.banks.map((b) => `${f(b.vdc, 0)} V`)],
            ["Hücre ΔV", ...unit.banks.map((b) => `${f(b.dvmV, 0)} mV`)],
            ["Sıcaklık mak", ...unit.banks.map((b) => `${f(b.tmax)} °C`)],
            ["Sıcaklık min", ...unit.banks.map((b) => `${f(b.tmin ?? b.tmax)} °C`)],
          ]}
        />
      </Section>

      <Section title="Raf sıcaklıkları · maks hücre °C">
        <div style={{ display: "grid", gap: 4 }}>
          {unit.banks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, fontSize: 12, color: COLORS_LIGHT.muted, fontWeight: 600 }}>
                {b.id}
              </span>
              {b.racks.map((t, r) => {
                const sev = rackSeverity(t, L);
                return (
                  <span
                    key={r}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 11,
                      padding: "5px 0",
                      borderRadius: 3,
                      border: `1px solid ${sev ? (sev === "alarm" ? COLORS_LIGHT.alarm : COLORS_LIGHT.cold) : COLORS_LIGHT.line}`,
                      background: tempFill(t, L),
                      color: tsv(t),
                    }}
                  >
                    {f(t)}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4
      style={{
        fontSize: 11.5,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: COLORS_LIGHT.muted,
        fontWeight: 600,
        margin: "0 0 6px",
      }}
    >
      {title}
    </h4>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ border: `1px solid ${COLORS_LIGHT.line}`, borderRadius: 4, padding: "5px 7px", minWidth: 0 }}>
    <small style={{ display: "block", fontSize: 11, color: COLORS_LIGHT.muted }}>{label}</small>
    <b style={{ display: "block", fontSize: 13, color: COLORS_LIGHT.fg }}>{value}</b>
  </div>
);

const Table: React.FC<{ head: string[]; rows: string[][] }> = ({ head, rows }) => (
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
        <tr key={ri}>
          {row.map((c, ci) => (
            <td
              key={ci}
              style={{
                padding: "3px 0",
                borderTop: `1px solid ${COLORS_LIGHT.line2}`,
                textAlign: ci === 0 ? "left" : "right",
                color: COLORS_LIGHT.fg,
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
