import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import type { NovaTopology, NovaUnitState } from "./mimic-types";
import { PCS_TEXT, POS_TEXT, rackSeverity, tempFill } from "./nova-mimic";

/**
 * DemoContainerScada (SPEC UC-4/T-7, FR-4.1..FR-4.3): konteyner iç tek hat —
 * 3-sargılı TR → 2 PCS → DC kesici → DC BUS#1/#2 (2000 A, IMD) → raf sıcaklık
 * haritası → 4 HVAC bölümü → FSS. Veri props'tan gelir; IO yoktur (purity).
 */
export interface DemoContainerScadaProps {
  unit: NovaUnitState | undefined;
  topology: NovaTopology;
  /** Konteyner uygulamasına geçiş — şimdilik dummy (verilmezse no-op). */
  onOpen?: () => void;
}

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export const DemoContainerScada: React.FC<DemoContainerScadaProps> = ({
  unit,
  topology,
  onOpen,
}) => {
  if (!unit) return null;
  const U = topology.unit;
  const L = topology.limits;
  const bus = U.bus;
  const sections = U.sections ?? [];

  return (
    <div
      data-testid="container-scada"
      style={{ padding: "12px 14px 14px", display: "grid", gap: 12 }}
    >
      <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS_LIGHT.fg }}>
        Konteyner SCADA · BESS#{unit.n}
      </h3>

      <Section title="Güç trafosu · 3 sargılı">
        <Chips items={[`${U.trKVA} kVA`, U.trVector, U.trRatio, U.lvLabel]} />
      </Section>

      <Section title="PCS">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {unit.pcs.map((p) => {
            const run = p.state === "chg" || p.state === "dis";
            return (
              <div
                key={p.id}
                data-testid="scada-pcs"
                style={{
                  border: `1px solid ${COLORS_LIGHT.line}`,
                  borderRadius: 4,
                  padding: "6px 8px",
                }}
              >
                <b style={{ color: COLORS_LIGHT.fg }}>PCS-{p.id}</b>
                <div style={{ fontSize: 11.5, color: COLORS_LIGHT.muted }}>
                  {PCS_TEXT[p.state]}
                </div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 }}>
                  {run ? `${f(p.pMW, 2)} MW` : "— MW"} · IGBT {f(p.igbtC, 0)} °C
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="DC kesiciler">
        <div style={{ display: "grid", gap: 3, fontSize: 12.5 }}>
          {unit.banks.map((b, i) => (
            <div key={b.id}>
              DC CB {i + 1} · {POS_TEXT[b.dcb]}
              {bus ? ` · ${bus.dcCB}` : ""}
            </div>
          ))}
        </div>
      </Section>

      {unit.banks.map((b, i) => (
        <Section
          key={b.id}
          title={`DC BUS#${i + 1}${bus ? ` · ${bus.ratingA} A · sigorta ${bus.rackFuseA} A` : ""}`}
        >
          {bus ? (
            <div style={{ fontSize: 11.5, color: COLORS_LIGHT.muted, marginBottom: 5 }}>
              IMD · {bus.imd}
            </div>
          ) : null}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${U.racksPerBank}, minmax(0,1fr))`,
              gap: 3,
            }}
          >
            {Array.from({ length: U.racksPerBank }).map((_, r) => {
              const t = b.racks[r];
              const sev = t !== undefined ? rackSeverity(t, L) : null;
              const border = sev === "alarm" ? COLORS_LIGHT.alarm : sev === "cold" ? COLORS_LIGHT.cold : COLORS_LIGHT.line;
              return (
                <span
                  key={r}
                  data-testid="scada-rack"
                  style={{
                    textAlign: "center",
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10.5,
                    padding: "4px 0",
                    borderRadius: 3,
                    border: `1px solid ${border}`,
                    background: t !== undefined ? tempFill(t, L) : "none",
                    color: COLORS_LIGHT.fg,
                  }}
                >
                  {t !== undefined ? f(t) : "—"}
                </span>
              );
            })}
          </div>
        </Section>
      ))}

      <Section title="HVAC bölümleri">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {sections.map((s) => (
            <div
              key={s.id}
              data-testid="scada-section"
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
      </Section>

      <Section title="Yangın söndürme (FSS)">
        <div style={{ fontSize: 12.5, color: COLORS_LIGHT.fg }}>
          {U.fss?.panel ?? "—"}
        </div>
      </Section>

      <button
        type="button"
        data-testid="scada-open-container"
        onClick={() => onOpen?.()}
        style={{
          width: "100%",
          border: `1px solid ${COLORS_LIGHT.sel}`,
          borderRadius: 5,
          background: COLORS_LIGHT.panel2,
          color: COLORS_LIGHT.sel,
          fontWeight: 600,
          fontSize: 13,
          padding: "9px 12px",
          cursor: "pointer",
        }}
      >
        Konteyner ekranını aç
      </button>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
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

const Chips: React.FC<{ items: string[] }> = ({ items }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
    {items.map((it) => (
      <span
        key={it}
        style={{
          border: `1px solid ${COLORS_LIGHT.line}`,
          borderRadius: 4,
          padding: "3px 7px",
          fontSize: 12,
          color: COLORS_LIGHT.fg,
        }}
      >
        {it}
      </span>
    ))}
  </div>
);
