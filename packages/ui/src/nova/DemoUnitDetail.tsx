import React from "react";
import type { NovaTopology, NovaUnitState } from "./mimic-types";
import { listNovaUnits } from "./mimic-types";
import { PCS_TEXT, POS_TEXT, defaultUnitStatus, rackSeverity, tempFill } from "./nova-mimic";

/**
 * Ünite detay paneli (SPEC UC-4/T-18, FR-4.3): referans `renderDetail` ile
 * eşleşen RMU pozisyonları, PCS ve batarya tabloları, raf sıcaklıkları.
 * Etiketler enerjicilerin çiziminden (gdems) kopya İngilizce. Veri props ile gelir.
 */

export interface DemoUnitDetailProps {
  unit: NovaUnitState | undefined;
  topology: NovaTopology;
  /** Devices hızlı erişimi (Battery / PCS / HVAC). */
  onOpenDevices?: (section: "battery" | "pcs" | "hvac") => void;
}

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

const SEV_COLOR: Record<string, string> = {
  alarm: "var(--nm-alarm)",
  warn: "var(--nm-warn)",
  maint: "var(--nm-maint)",
  cold: "var(--nm-cold)",
  info: "var(--nm-info)",
};

const BSC_STATE_TEXT: Record<number, string> = {
  0: "None",
  1: "Not init.",
  2: "Initializing",
  3: "Normal",
  4: "NPS",
  5: "Manual",
  6: "Emergency",
};

const titleCase = (s: string): string => s.charAt(0) + s.slice(1).toLowerCase();

export const DemoUnitDetail: React.FC<DemoUnitDetailProps> = ({
  unit,
  topology,
  onOpenDevices,
}) => {
  if (!unit) {
    return (
      <div style={{ padding: 14, color: "var(--nm-muted)", fontSize: 13 }}>
        Select a unit.
      </div>
    );
  }
  const status = unit.status ?? defaultUnitStatus(unit, topology.limits);
  const L = topology.limits;
  const U = topology.unit;
  const meta = listNovaUnits(topology).find((u) => u.n === unit.n);
  const tsv = (t: number): string =>
    t > L.tempMax ? "var(--nm-alarm)" : t < L.tempMin ? "var(--nm-cold)" : "var(--nm-fg)";

  const pcsFor = (bankId: string, i: number) =>
    unit.pcs.find((p) => p.id === bankId) ?? unit.pcs[i];
  const limits = (bankId: string, i: number, key: "idc" | "chgLimitKw" | "disLimitKw"): string => {
    const p = pcsFor(bankId, i);
    const v = p?.[key];
    if (v === undefined || v === null) return "—";
    if (key === "idc") return `${f(v, 0)} A`;
    return `${f(v, 0)} kW`;
  };

  return (
    <div style={{ padding: "12px 14px 14px", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--nm-fg)" }}>
          BESS#{unit.n}
        </h3>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: status.sev ? SEV_COLOR[status.sev] ?? "var(--nm-muted)" : "var(--nm-muted)",
          }}
        >
          {status.text}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "var(--nm-muted)" }}>
        {meta ? `Feeder ${meta.feeder} · position ${meta.row + 1} · ` : ""}
        {U.container} {f(U.containerMWh, 3)} MWh · 2 × {f(U.pcsKVA, 0)} kVA PCS · TR{" "}
        {f(U.trKVA, 0)} kVA {U.trRatio}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--nm-muted)" }}>Devices:</span>
        <button type="button" className="btn sm" onClick={() => onOpenDevices?.("battery")}>
          Battery · {U.racksPerBank * U.banks.length} racks
        </button>
        <button type="button" className="btn sm" onClick={() => onOpenDevices?.("pcs")}>
          PCS
        </button>
        <button type="button" className="btn sm" onClick={() => onOpenDevices?.("hvac")}>
          HVAC
          {unit.hvac ? ` · ${unit.hvac.filter((h) => h.comp).length}/${unit.hvac.length} cooling` : ""}
        </button>
      </div>

      <Section title="RMU positions">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
          {U.rmu
            .filter((c) => c.id !== "ES")
            .map((c) => {
              const pos = unit.rmu[c.id as "H01" | "H02" | "H03"];
              const kind = c.kind === "cb" ? "CB" : c.kind === "es" ? "ES" : "LBS";
              return (
                <Field
                  key={c.id}
                  label={`${c.id} · ${kind}${c.motor ? " · M" : ""}`}
                  value={pos ? POS_TEXT[pos] : "None"}
                />
              );
            })}
          <Field label="ES · Earth" value={unit.rmu.es ? "Closed" : "Open"} />
        </div>
      </Section>

      <Section title="PCS · Wattox MPCS-1725-S">
        <Table
          head={["", "State", "P MW", "AC V", "IGBT °C"]}
          rows={unit.pcs.map((p) => {
            const run = p.state === "chg" || p.state === "dis";
            const stateText =
              p.limited && run ? "Limited 50 %" : titleCase(PCS_TEXT[p.state]);
            const pTxt = run ? `${p.state === "chg" ? "−" : ""}${f(p.pMW, 2)}` : "0,00";
            return [
              `PCS-${unit.n}${p.id}`,
              stateText,
              pTxt,
              p.vac !== undefined ? f(p.vac, 0) : "—",
              f(p.igbtC, 0),
            ];
          })}
        />
      </Section>

      <Section title="Battery sections · Flex BSC">
        <Table
          head={["", ...U.banks.map((b) => `Bank ${b}`)]}
          rows={[
            [
              "BSC state (30036)",
              ...unit.banks.map((b) => (b.bscState !== undefined ? BSC_STATE_TEXT[b.bscState] ?? "—" : "—")),
            ],
            [
              "Racks online (30038)",
              ...unit.banks.map((b) => (b.online !== undefined ? `${b.online} / ${U.racksPerBank}` : "—")),
            ],
            ["SOC", ...unit.banks.map((b) => `${f(b.soc)} %`)],
            ["SOH", ...unit.banks.map((b) => `${f(b.soh)} %`)],
            ["DC voltage", ...unit.banks.map((b) => `${f(b.vdc, 0)} V`)],
            [
              "DC current",
              ...unit.banks.map((b, i) => limits(b.id, i, "idc")),
            ],
            [
              "Charge limit (30063)",
              ...unit.banks.map((b, i) => limits(b.id, i, "chgLimitKw")),
            ],
            [
              "Discharge limit (30065)",
              ...unit.banks.map((b, i) => limits(b.id, i, "disLimitKw")),
            ],
            ["Cell ΔV", ...unit.banks.map((b) => `${f(b.dvmV, 0)} mV`)],
            ["Temperature max", ...unit.banks.map((b) => `${f(b.tmax)} °C`)],
            ["Temperature min", ...unit.banks.map((b) => `${f(b.tmin ?? b.tmax)} °C`)],
            ["DC breaker", ...unit.banks.map((b) => POS_TEXT[b.dcb])],
          ]}
        />
      </Section>

      <Section title="Rack temperatures · max pack °C">
        <div style={{ display: "grid", gap: 4 }}>
          {unit.banks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, fontSize: 12, color: "var(--nm-muted)", fontWeight: 600 }}>
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
                      border: `1px solid ${sev ? (sev === "alarm" ? "var(--nm-alarm)" : "var(--nm-cold)") : "var(--nm-line)"}`,
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--nm-muted)",
            }}
          >
            <span>Rack 1</span>
            <span>
              Band {L.tempMin}–{L.tempMax} °C · above red, below blue
            </span>
            <span>Rack {U.racksPerBank}</span>
          </div>
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
        color: "var(--nm-muted)",
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
  <div style={{ border: `1px solid ${"var(--nm-line)"}`, borderRadius: 4, padding: "5px 7px", minWidth: 0 }}>
    <small style={{ display: "block", fontSize: 11, color: "var(--nm-muted)" }}>{label}</small>
    <b style={{ display: "block", fontSize: 13, color: "var(--nm-fg)" }}>{value}</b>
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
              color: "var(--nm-muted)",
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
                borderTop: `1px solid ${"var(--nm-line2)"}`,
                textAlign: ci === 0 ? "left" : "right",
                color: "var(--nm-fg)",
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
