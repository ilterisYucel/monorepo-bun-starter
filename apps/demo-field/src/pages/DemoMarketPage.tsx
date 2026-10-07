import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { COLORS_LIGHT, DemoMarketView } from "@gd-monorepo/ui";
import { demoMarketApi } from "../features/demo-data/demoMarketApi";
import { useDemoFieldData } from "../features/demo-data/useDemoFieldData";
import { useDemoFieldTelemetry } from "../features/demo-data/useDemoFieldTelemetry";
import { mapFieldToMimicState } from "../features/demo-data/mapFieldToMimicState";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";

/**
 * DemoMarketPage (Grid & Market) — UC-9: EPİAŞ PTF/GİP/SMF saatlik grafikler +
 * TEİAŞ P–f/P–Q/enerji özetleri. Veri yoksa "veri yok" (uydurma YOK). Seri
 * anahtarları integration-service config'iyle aynıdır (epias/*).
 */
const MARKET_SERIES = [
  { key: "ptf", label: "PTF · GÖP (gün öncesi)" },
  { key: "gip_wap", label: "GİP AOF (gün içi)" },
  { key: "smf", label: "SMF · DGP (dengeleme)" },
] as const;

export const DemoMarketPage: React.FC = () => {
  const { data } = useDemoFieldData();
  const fieldTelemetry = useDemoFieldTelemetry();

  const market = useQuery({
    queryKey: ["demo-market"],
    queryFn: ({ signal }) =>
      Promise.all(
        MARKET_SERIES.map(async (s) => ({
          label: s.label,
          points: await demoMarketApi.external("epias", s.key, { limit: 24 }, signal),
        })),
      ),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const state = useMemo(
    () =>
      mapFieldToMimicState(data ?? [], DEMO_TOPOLOGY, {
        extraTelemetry: fieldTelemetry.data ?? [],
      }),
    [data, fieldTelemetry.data],
  );

  // İki yönlü kullanılabilir enerji (gdems formülü; SOC 5–95 %).
  const availableMWh = useMemo(() => {
    const perBank = DEMO_TOPOLOGY.unit.containerMWh / 2;
    const banks = state.units.flatMap((u) => u.banks);
    const avD = banks.reduce((a, b) => a + (Math.max(0, b.soc - 5) / 100) * perBank, 0);
    const avC = banks.reduce((a, b) => a + (Math.max(0, 95 - b.soc) / 100) * perBank, 0);
    return Math.min(avD, avC);
  }, [state]);

  return (
    <div style={{ background: COLORS_LIGHT.bg, padding: 10, minHeight: "100%" }}>
      <section
        style={{
          background: COLORS_LIGHT.panel,
          border: `1px solid ${COLORS_LIGHT.line}`,
          borderRadius: 6,
          padding: "12px 14px 14px",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS_LIGHT.fg, margin: "0 0 10px" }}>
          Grid &amp; Market
        </h2>
        {market.isError ? (
          <p style={{ color: COLORS_LIGHT.alarm }}>
            Piyasa verisi alınamadı: {market.error.message}
          </p>
        ) : (
          <DemoMarketView
            series={market.data ?? []}
            reserveMW={10}
            availableMWh={availableMWh}
            frequencyHz={state.station.hz || 50}
          />
        )}
      </section>
    </div>
  );
};
