import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import {
  DemoAssetTable,
  DemoMarketView,
  DemoPortfolioMap,
  DemoProjectCard,
  DemoPtfCard,
  NOVA_ICONS,
  buildMarketDay,
  type DemoAssetRow,
  type DemoPortfolioSite,
  type DemoPortfolioSiteStatus,
} from "@gd-monorepo/ui";
import { demoMarketApi } from "../features/demo-data/demoMarketApi";
import {
  DEMO_PORTFOLIO,
  type DemoPortfolioProject,
} from "../features/demo-data/demo-portfolio";
import { DEMO_TOPOLOGY } from "../features/demo-data/demo-topology";
import { useDemoFieldData } from "../features/demo-data/useDemoFieldData";
import { useDemoFieldTelemetry } from "../features/demo-data/useDemoFieldTelemetry";
import { mapFieldToMimicState } from "../features/demo-data/mapFieldToMimicState";
import { deriveKpis } from "../features/demo-data/deriveKpis";
import { siteFieldId } from "../lib/site-field";
import { isTunnelMode } from "../lib/api-base";

/**
 * DemoProjectsPage (Projeler / portföy, SPEC UC-11): gdems home sayfasının
 * canlı saha uyarlaması. Portföy haritası + proje kartları + EPİAŞ PTF mini
 * kartı + Asset management tablosu + Market · EPİAŞ paneli. Login sonrası
 * iniş noktasıdır; canlı proje seçimi `/field/:fieldId` konsolunu açar.
 */

const MARKET_SERIES = [
  { key: "ptf", label: "PTF · GÖP" },
  { key: "gip_wap", label: "GİP AOF" },
  { key: "smf", label: "SMF" },
] as const;

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

/** Asset management portföy tablosu — illüstratif demo değerleri (K14). */
const DEMO_ASSET_ROWS: DemoAssetRow[] = [
  {
    key: "GDE-202030",
    name: "ÜNSAL DGES",
    location: "Polatlı, Ankara",
    source: "Standalone",
    connMW: 30,
    energyMWh: 32.112,
    mode: "Discharging",
    poiMW: 12.4,
    sourceMWh: null,
    exportedMWh: 84.2,
    importedMWh: 21.6,
    revenueTL: 412500,
    arbitrageTL: 98000,
    availableGroups: 8,
    totalGroups: 9,
    live: true,
  },
  {
    key: "GDE-202050",
    name: "N DGES",
    location: "Antalya",
    source: "Solar 60 MWp",
    connMW: 50,
    energyMWh: 64.224,
    mode: "Demo snapshot",
    poiMW: 41.2,
    sourceMWh: 246.8,
    exportedMWh: 240.1,
    importedMWh: 60.3,
    revenueTL: 1180000,
    arbitrageTL: 210000,
    availableGroups: 18,
    totalGroups: 18,
    live: false,
  },
];

const liveModeLabel = (mode: "chg" | "dis" | "rest" | "stby"): string =>
  mode === "chg"
    ? "Charging"
    : mode === "dis"
      ? "Discharging"
      : mode === "rest"
        ? "Rest"
        : "Standby";

const siteStatusOf = (
  poiMW: number,
  faults: number,
): DemoPortfolioSiteStatus =>
  faults > 0 ? "alarm" : poiMW > 0.05 ? "dis" : poiMW < -0.05 ? "chg" : "idle";

export const DemoProjectsPage: React.FC = () => {
  const fieldId = siteFieldId();
  const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
  const navigate = useNavigate();

  const market = useQuery({
    queryKey: ["demo-market"],
    queryFn: ({ signal }) =>
      Promise.all(
        MARKET_SERIES.map(async (s) => ({
          key: s.key,
          label: s.label,
          points: await demoMarketApi.external(
            "epias",
            s.key,
            { limit: 48 },
            signal,
          ),
        })),
      ),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });
  const series = market.data ?? [];
  const hours = useMemo(
    () => buildMarketDay(series.map((s) => ({ key: s.key, points: s.points }))),
    [series],
  );

  const containers = useDemoFieldData();
  const telemetry = useDemoFieldTelemetry();
  const state = useMemo(
    () =>
      mapFieldToMimicState(containers.data ?? [], DEMO_TOPOLOGY, {
        extraTelemetry: telemetry.data ?? [],
      }),
    [containers.data, telemetry.data],
  );
  const kpis = useMemo(() => deriveKpis(state, DEMO_TOPOLOGY), [state]);

  const availableMWh = useMemo(() => {
    const perBank = DEMO_TOPOLOGY.unit.containerMWh / 2;
    const banks = state.units.flatMap((u) => u.banks);
    const avD = banks.reduce(
      (a, b) => a + (Math.max(0, b.soc - 5) / 100) * perBank,
      0,
    );
    const avC = banks.reduce(
      (a, b) => a + (Math.max(0, 95 - b.soc) / 100) * perBank,
      0,
    );
    return { dis: avD, chg: avC, both: Math.min(avD, avC) };
  }, [state]);

  const reactiveMvar = useMemo(
    () =>
      state.units
        .flatMap((u) => u.pcs)
        .reduce((a, p) => a + (p.reactiveKvar ?? 0), 0) / 1000,
    [state],
  );

  const faults = kpis.alarms + kpis.warns + kpis.colds + kpis.maints;

  const sites = useMemo<DemoPortfolioSite[]>(
    () =>
      DEMO_PORTFOLIO.map((p, i) => {
        if (p.live) {
          return {
            i,
            id: p.id,
            name: p.name,
            lat: p.lat,
            lon: p.lon,
            live: true,
            status: siteStatusOf(kpis.poiMW, faults),
            tip: {
              subtitle: p.location,
              rows: [
                { label: "Rated", value: `${p.connMW} MWe` },
                {
                  label: "Power at POI",
                  value: `${f(Math.abs(kpis.poiMW), 2)} MW ${kpis.poiMW >= 0 ? "export" : "import"}`,
                  cls:
                    kpis.poiMW > 0.05
                      ? "c-dis"
                      : kpis.poiMW < -0.05
                        ? "c-chg"
                        : "",
                },
                { label: "SOC", value: `${f(kpis.avgSoc)} %` },
                { label: "SOH", value: `${f(kpis.avgSoh)} %` },
                {
                  label: "Faults",
                  value: faults > 0 ? `${faults} active` : "none",
                  cls: kpis.alarms > 0 ? "c-alarm" : "c-ok",
                },
              ],
              footer: "Click to open the project",
            },
          };
        }
        const s = p.snapshot;
        return {
          i,
          id: p.id,
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          live: false,
          status: siteStatusOf(s?.poiMW ?? 0, s?.faults ?? 0),
          tip: {
            subtitle: p.location,
            rows: [
              {
                label: "Rated",
                value:
                  p.source === "solar"
                    ? `${p.connMW} MWe · ${p.sourceCapMWp} MWp solar`
                    : `${p.connMW} MWe`,
              },
              {
                label: "Power at POI",
                value: `${f(s?.poiMW ?? 0, 2)} MW export`,
                cls: "c-dis",
              },
              { label: "SOC", value: `${f(s?.soc ?? 0)} %` },
              { label: "SOH", value: `${f(s?.soh ?? 0)} %` },
              {
                label: "Faults",
                value: s?.faults ? `${s.faults} active` : "none",
                cls: s?.faults ? "c-alarm" : "c-ok",
              },
            ],
            footer: "Demo project — not live",
          },
        };
      }),
    [kpis, faults],
  );

  if (fieldId.length === 0) {
    return <Navigate to="/login" replace />;
  }

  const openLive = (): void => {
    void navigate(base);
  };

  const cardKpis = (p: DemoPortfolioProject) =>
    p.live
      ? [
          { label: "POI", value: `${f(Math.abs(kpis.poiMW), 2)} MW`, sub: liveModeLabel(kpis.mode).toLowerCase() },
          { label: "SOC · SOH", value: `${f(kpis.avgSoc)} %`, sub: `SOH ${f(kpis.avgSoh)} %` },
          { label: "Availability", value: `${kpis.availUnits} / ${kpis.totalUnits}`, sub: "groups online" },
        ]
      : [
          { label: "POI", value: `${f(p.snapshot?.poiMW ?? 0, 2)} MW`, sub: "export · demo" },
          { label: "SOC · SOH", value: `${f(p.snapshot?.soc ?? 0)} %`, sub: `SOH ${f(p.snapshot?.soh ?? 0)} %` },
          { label: "Capacity", value: `${f(p.energyMWh)} MWh`, sub: "demo snapshot" },
        ];

  return (
    <div className="nova-console" style={{ padding: 10 }}>
      <div className="home">
        <div className="home-head">
          <h1>Projects</h1>
          <p>Select a project on the map or in the list to open its control console.</p>
        </div>

        <div className="home-grid">
          <section className="card mapcard" aria-label="Portfolio map">
            <header>
              <h2>
                Portfolio map
                <small>Türkiye &amp; Europe · hover a site for live data</small>
              </h2>
              <span className="map-leg">
                <i className="dis" />
                discharging <i className="chg" />
                charging <i className="idle" />
                standby <i className="alarm" />
                fault
              </span>
            </header>
            <DemoPortfolioMap
              sites={sites}
              onOpen={(i) => {
                if (sites[i]?.live) openLive();
              }}
              height={560}
            />
          </section>

          <div className="home-side">
            <div className="projects">
              {DEMO_PORTFOLIO.map((p) => (
                <DemoProjectCard
                  key={p.id}
                  name={p.name}
                  status={p.live ? liveModeLabel(kpis.mode) : "Demo"}
                  faultCount={p.live ? kpis.alarms : (p.snapshot?.faults ?? 0)}
                  subtitle={`${p.location} · ${p.connMW} MWe${
                    p.source === "solar" ? ` · Solar ${p.sourceCapMWp} MWp` : ""
                  } · ${f(p.energyMWh)} MWh · ${p.id}`}
                  kpis={cardKpis(p)}
                  live={p.live}
                  onOpen={p.live ? openLive : undefined}
                />
              ))}
            </div>
            <DemoPtfCard hours={hours} />
            <button type="button" className="pnew-sm" disabled>
              <span className="ki">
                <NOVA_ICONS.plus />
              </span>
              <span>
                <b>New project</b>
                <small>Set up a new site (coming later)</small>
              </span>
            </button>
          </div>
        </div>

        <section className="card amcard" aria-label="Asset management">
          <header>
            <h2>
              Asset management
              <small>
                portfolio revenue and energy · market data EPİAŞ
              </small>
            </h2>
          </header>
          <DemoAssetTable
            rows={DEMO_ASSET_ROWS}
            onOpen={(key) => {
              if (DEMO_PORTFOLIO.some((p) => p.id === key && p.live)) openLive();
            }}
          />
          {market.isError ? (
            <p className="empty">Market data unavailable: {market.error.message}</p>
          ) : (
            <DemoMarketView
              series={series}
              reserveMW={10}
              availableMWh={availableMWh.both}
              availableChargeMWh={availableMWh.chg}
              frequencyHz={state.station.hz || 50}
              powerMW={state.poiMW}
              reactiveMvar={reactiveMvar}
              kv={state.station.kV}
            />
          )}
        </section>
      </div>
    </div>
  );
};
