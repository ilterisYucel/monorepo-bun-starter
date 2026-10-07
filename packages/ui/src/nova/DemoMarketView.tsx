import React from "react";
import { COLORS_LIGHT } from "../colors/tokensLight";
import { DemoTrendChart } from "./DemoTrendChart";
import {
  NOMINAL_HZ,
  freqRangeOf,
  pfEnergyCheck,
  pfResponseMW,
} from "./demo-market";

/**
 * Grid & Market görünümü (SPEC UC-9/T-24, FR-9.3..FR-9.4): EPİAŞ PTF saatlik
 * çizgi + TEİAŞ P–f/P–Q/enerji özetleri. Veri props'tan gelir; seri boşsa
 * "veri yok" (uydurma YOK).
 */
export interface DemoMarketPoint {
  timestamp: string;
  value: number;
  unit: string;
}

/** Market grafik serisi — başlık + TL/MWh noktaları. */
export interface DemoMarketSeries {
  label: string;
  points: DemoMarketPoint[];
}

export interface DemoMarketViewProps {
  /** 3 grafik (ör. PTF · GÖP / GİP AOF / SMF · DGP). */
  series: DemoMarketSeries[];
  maxPrice?: number;
  reserveMW?: number;
  availableMWh?: number;
  frequencyHz?: number;
}

const f = (v: number, d = 2): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export const DemoMarketView: React.FC<DemoMarketViewProps> = ({
  series,
  maxPrice = 4500,
  reserveMW = 10,
  availableMWh = 0,
  frequencyHz = NOMINAL_HZ,
}) => {
  const response = pfResponseMW(frequencyHz, reserveMW);
  const energy = pfEnergyCheck(availableMWh, reserveMW);
  const range = freqRangeOf(frequencyHz);
  const hasAnyData = series.some((s) => s.points.length > 0);

  return (
    <div data-testid="demo-market" style={{ display: "grid", gap: 12 }}>
      {hasAnyData ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: "10px 18px",
          }}
        >
          {series.map((s) => (
            <DemoTrendChart
              key={s.label}
              title={s.label}
              unit="TL/MWh"
              padLeft={46}
              yMax={maxPrice * 1.06}
              series={[
                {
                  label: s.label,
                  points: s.points.map((p) => ({ t: Date.parse(p.timestamp), value: p.value })),
                  color: COLORS_LIGHT.cPow,
                  area: true,
                },
              ]}
              limits={[{ value: maxPrice, label: `Tavan ${maxPrice} TL/MWh`, cls: "hot" }]}
            />
          ))}
        </section>
      ) : (
        <section>
          <p style={{ padding: 16, color: COLORS_LIGHT.muted }}>
            veri yok — EPİAŞ serisi boş (kimlik/plugin).
          </p>
        </section>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        <Card label="PFK beklenen tepki" value={`${f(response)} MW`} sub={`R = ${f(reserveMW, 1)} MW · f = ${f(frequencyHz, 3)} Hz`} />
        <Card
          label="Enerji kontrolü (≥1,25 h)"
          value={energy.ok ? "OK" : "Yetersiz"}
          sub={`mevcut ${f(availableMWh, 1)} MWh · gereken ${f(energy.requiredMWh, 1)} MWh`}
          tone={energy.ok ? COLORS_LIGHT.ok : COLORS_LIGHT.alarm}
        />
        <Card
          label="Frekans aralığı"
          value={range ? range.duration : "—"}
          sub={range ? `${range.min} ≤ f < ${range.max} Hz` : "aralık dışı"}
        />
      </section>
    </div>
  );
};

const Card: React.FC<{ label: string; value: string; sub: string; tone?: string }> = ({
  label,
  value,
  sub,
  tone,
}) => (
  <div
    style={{
      border: `1px solid ${COLORS_LIGHT.line}`,
      borderRadius: 4,
      padding: "6px 8px",
    }}
  >
    <small style={{ display: "block", fontSize: 11, color: COLORS_LIGHT.muted }}>{label}</small>
    <b style={{ display: "block", fontSize: 15, color: tone ?? COLORS_LIGHT.fg }}>{value}</b>
    <small style={{ fontSize: 11, color: COLORS_LIGHT.dim }}>{sub}</small>
  </div>
);
