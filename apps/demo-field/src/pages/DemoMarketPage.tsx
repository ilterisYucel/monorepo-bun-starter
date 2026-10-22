import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DemoMarketView } from "@gd-monorepo/ui";
import { demoMarketApi } from "../features/demo-data/demoMarketApi";
import { useDemoProjectContext } from "../layouts/DemoProjectLayout";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { teiasCommandRows, teiasTelemetryRows } from "../features/demo-data/demo-teias";

const MARKET_SERIES = [
  { key: "ptf", label: "PTF · GÖP" },
  { key: "gip_wap", label: "GİP AOF" },
  { key: "smf", label: "SMF" },
] as const;

/** DemoMarketPage (Grid & Market) — UC-6: EPİAŞ fiyat + TEİAŞ panelleri. */
export const DemoMarketPage: React.FC = () => {
  const { state } = useDemoProjectContext();

  const market = useQuery({
    queryKey: ["demo-market"],
    queryFn: ({ signal }) =>
      Promise.all(
        MARKET_SERIES.map(async (s) => ({
          key: s.key,
          label: s.label,
          points: await demoMarketApi.external("epias", s.key, { limit: 48 }, signal),
        })),
      ),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const availableMWh = useMemo(() => {
    const perBank = DEMO_TOPOLOGY.unit.containerMWh / 2;
    const banks = state.units.flatMap((u) => u.banks);
    const avD = banks.reduce((a, b) => a + (Math.max(0, b.soc - 5) / 100) * perBank, 0);
    const avC = banks.reduce((a, b) => a + (Math.max(0, 95 - b.soc) / 100) * perBank, 0);
    return { dis: avD, chg: avC, both: Math.min(avD, avC) };
  }, [state]);

  const reactiveMvar = useMemo(
    () => state.units.flatMap((u) => u.pcs).reduce((a, p) => a + (p.reactiveKvar ?? 0), 0) / 1000,
    [state],
  );

  const telemetryRows = useMemo(() => teiasTelemetryRows(state, DEMO_TOPOLOGY), [state]);
  const commandRows = useMemo(() => teiasCommandRows(state, DEMO_TOPOLOGY), [state]);

  if (market.isError) {
    return (
      <section className="card">
        <header>
          <h2>Grid &amp; Market</h2>
        </header>
        <p className="empty">Market data unavailable: {market.error.message}</p>
      </section>
    );
  }

  return (
    <DemoMarketView
      series={market.data ?? []}
      reserveMW={10}
      availableMWh={availableMWh.both}
      availableChargeMWh={availableMWh.chg}
      frequencyHz={state.station.hz || 50}
      powerMW={state.poiMW}
      reactiveMvar={reactiveMvar}
      kv={state.station.kV}
      telemetryRows={telemetryRows}
      commandRows={commandRows}
    />
  );
};
