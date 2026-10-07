import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DemoAlertList,
  DemoCellDialog,
  DemoContainerScada,
  DemoEventLog,
  DemoKpiStrip,
  DemoMimic,
  DemoTrendChart,
  DemoUnitDetail,
  COLORS_LIGHT,
  NOVA_ICONS,
  type DemoTile,
  type DemoAlertItem,
  type DemoCellAction,
  type OverlayMode,
} from "@gd-monorepo/ui";
import { useDemoFieldData } from "../features/demo-data/useDemoFieldData";
import { useDemoFieldTelemetry } from "../features/demo-data/useDemoFieldTelemetry";
import { demoApi } from "../features/demo-data/demoApi";
import { demoLogApi } from "../features/demo-data/demoLogApi";
import { mapFieldToMimicState } from "../features/demo-data/mapFieldToMimicState";
import { buildTrendSeries } from "../features/demo-data/buildTrendSeries";
import { DEMO_MV_DEVICE_ID, DEMO_TOPOLOGY, FIELD_DEVICE_IDS, cellCommandName } from "../features/demo-data/demo-topology";
import { deriveKpis } from "../features/demo-data/deriveKpis";
import { deriveAlerts } from "../features/demo-data/deriveAlerts";
import { siteFieldId } from "../lib/site-field";
import { isTunnelMode } from "../lib/api-base";

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

const OVERLAYS: Array<{ id: OverlayMode; label: string }> = [
  { id: "status", label: "Durum" },
  { id: "soc", label: "SOC" },
  { id: "soh", label: "SOH" },
  { id: "temp", label: "Sıcaklık" },
];

/**
 * DemoFieldPage (Saha) — UC-3/UC-4: canlı veri → mimic state → SVG saha
 * yerleşimi + KPI şeridi + uyarı listesi. Işık tema (nova).
 */
export const DemoFieldPage: React.FC = () => {
  const fieldId = siteFieldId();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useDemoFieldData();
  const fieldTelemetry = useDemoFieldTelemetry();
  const [overlay, setOverlay] = useState<OverlayMode>("status");
  const [selected, setSelected] = useState<number | null>(null);
  const [cellId, setCellId] = useState<string | null>(null);
  const [cellMsg, setCellMsg] = useState("");
  const [cellBusy, setCellBusy] = useState(false);
  const queryClient = useQueryClient();

  const state = useMemo(
    () =>
      mapFieldToMimicState(data ?? [], DEMO_TOPOLOGY, {
        extraTelemetry: fieldTelemetry.data ?? [],
      }),
    [data, fieldTelemetry.data],
  );
  const kpis = useMemo(
    () => deriveKpis(state, DEMO_TOPOLOGY),
    [state],
  );
  const alerts: DemoAlertItem[] = useMemo(
    () => deriveAlerts(state, DEMO_TOPOLOGY),
    [state],
  );
  const selectedUnit = useMemo(
    () => state.units.find((u) => u.n === selected),
    [state, selected],
  );
  const openCell = useMemo(
    () => DEMO_TOPOLOGY.station.cells.find((c) => c.id === cellId),
    [cellId],
  );

  const openDevices = (n: number) => {
    const base = isTunnelMode() ? `/fields/${fieldId}/ui` : `/field/${fieldId}`;
    navigate(`${base}/cihazlar?tab=battery&unit=${n}`);
  };

  const trends = useQuery({
    queryKey: ["demo-trends", fieldId],
    queryFn: () =>
      demoApi.unifiedDownsampled(FIELD_DEVICE_IDS, {
        from: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        to: new Date().toISOString(),
        points: 200,
      }),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
  const trendData = useMemo(
    () => buildTrendSeries(trends.data ?? []),
    [trends.data],
  );

  const logs = useQuery({
    queryKey: ["demo-logs", fieldId],
    queryFn: ({ signal }) => demoLogApi.list({ limit: 50 }, signal),
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });

  const handleCellCommand = async (id: string, action: DemoCellAction) => {
    setCellBusy(true);
    setCellMsg("");
    try {
      const r = await demoApi.executeCommand(
        DEMO_MV_DEVICE_ID,
        cellCommandName(id, action),
      );
      setCellMsg(r.success === false ? `Kilitli: ${r.reason ?? "reddedildi"}` : "Komut uygulandı.");
      await queryClient.invalidateQueries({ queryKey: ["demo-field-containers"] });
    } catch (e) {
      setCellMsg(`Hata: ${(e as Error).message}`);
    } finally {
      setCellBusy(false);
    }
  };

  if (fieldId.length === 0) {
    return <Notice tone="error" text="Saha kimliği tanımsız (VITE_FIELD_ID)." />;
  }
  if (isLoading) return <Notice tone="muted" text="Yükleniyor…" />;
  if (isError) {
    return (
      <Notice
        tone="error"
        text={`Saha verisi alınamadı: ${error?.message ?? "bilinmeyen hata"}`}
      />
    );
  }

  const tiles: DemoTile[] = [
    {
      icon: <ModeIcon mode={kpis.mode} />,
      label: "Çalışma modu",
      value: kpis.modeLabel,
      sub: kpis.runPcs > 0 ? `${kpis.runPcs}/${kpis.totalPcs} PCS çalışıyor` : "Aktif manevra yok",
      sev: kpis.mode === "rest" ? "rest" : null,
    },
    {
      icon: <NOVA_ICONS.bolt />,
      label: "Saha gücü · POI",
      value: `${f(Math.abs(kpis.poiMW))} MW`,
      sub: kpis.poiDir,
    },
    {
      icon: <NOVA_ICONS.battery level={kpis.avgSoc / 100} />,
      label: "Ortalama SOC",
      value: `${f(kpis.avgSoc)} %`,
      sub: `${f(DEMO_TOPOLOGY.limits.socMin)}–${f(DEMO_TOPOLOGY.limits.socMax, 0)} %`,
    },
    {
      icon: <NOVA_ICONS.health />,
      label: "SOH",
      value: `${f(kpis.avgSoh)} %`,
      sub: `Min ${f(kpis.sohMin)} %`,
    },
    {
      icon: <NOVA_ICONS.thermo />,
      label: "Hücre sıcaklığı",
      value: `${f(kpis.tmax)} °C`,
      sub: `${DEMO_TOPOLOGY.limits.tempMin}–${DEMO_TOPOLOGY.limits.tempMax} °C`,
      sev: kpis.tmax > DEMO_TOPOLOGY.limits.tempMax ? "alarm" : kpis.tmin < DEMO_TOPOLOGY.limits.tempMin ? "cold" : null,
    },
    {
      icon: <NOVA_ICONS.units />,
      label: "Kullanılabilirlik",
      value: `${kpis.availUnits} / ${kpis.totalUnits}`,
      sub: `${kpis.runPcs} / ${kpis.totalPcs} PCS çalışıyor`,
    },
    {
      icon: <NOVA_ICONS.bell />,
      label: "Aktif alarm",
      value: `${kpis.alarms} kritik`,
      sub: `${kpis.warns} uyarı · ${kpis.colds} soğuk · ${kpis.maints} bakım`,
      sev: kpis.alarms > 0 ? "alarm" : null,
    },
  ];

  return (
    <div style={{ background: COLORS_LIGHT.bg, padding: 10, minHeight: "100%" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <DemoKpiStrip tiles={tiles} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 360px",
            gap: 10,
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: COLORS_LIGHT.panel,
              border: `1px solid ${COLORS_LIGHT.line}`,
              borderRadius: 6,
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 14px",
                borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS_LIGHT.fg }}>
                Saha yerleşimi
              </h2>
              <div style={{ display: "inline-flex", border: `1px solid ${COLORS_LIGHT.line}`, borderRadius: 5, overflow: "hidden" }}>
                {OVERLAYS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOverlay(o.id)}
                    style={{
                      background: overlay === o.id ? COLORS_LIGHT.panel2 : "none",
                      border: 0,
                      padding: "5px 11px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: overlay === o.id ? COLORS_LIGHT.fg : COLORS_LIGHT.muted,
                      cursor: "pointer",
                      boxShadow: overlay === o.id ? `inset 0 -2px 0 ${COLORS_LIGHT.sel}` : "none",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </header>
            <div style={{ overflowX: "auto", padding: "4px 6px 0" }}>
              <div style={{ minWidth: 960 }}>
                <DemoMimic
                  topology={DEMO_TOPOLOGY}
                  state={state}
                  overlay={overlay}
                  selected={selected}
                  onSelect={setSelected}
                  onCellSelect={(id) => {
                    setCellId(id);
                    setCellMsg("");
                  }}
                />
              </div>
            </div>
          </section>

          <aside style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <section
              style={{
                background: COLORS_LIGHT.panel,
                border: `1px solid ${COLORS_LIGHT.line}`,
                borderRadius: 6,
              }}
            >
              <header
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
                  fontWeight: 700,
                  fontSize: 15,
                  color: COLORS_LIGHT.fg,
                }}
              >
                Dikkat gerektirenler
                <small style={{ marginLeft: 8, fontWeight: 500, color: COLORS_LIGHT.muted }}>
                  {alerts.length} kayıt
                </small>
              </header>
              <DemoAlertList
                alerts={alerts}
                onSelect={(a) => {
                  if (a.unitNo !== undefined) setSelected(a.unitNo);
                  if (a.cell) {
                    setCellId(a.cell);
                    setCellMsg("");
                  }
                }}
              />
            </section>

            <section
              style={{
                background: COLORS_LIGHT.panel,
                border: `1px solid ${COLORS_LIGHT.line}`,
                borderRadius: 6,
              }}
            >
              {selectedUnit ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "8px 12px 0",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openDevices(selectedUnit.n)}
                    style={{
                      border: `1px solid ${COLORS_LIGHT.line}`,
                      borderRadius: 4,
                      background: "none",
                      color: COLORS_LIGHT.sel,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 9px",
                      cursor: "pointer",
                    }}
                  >
                    Cihazlar › Batarya
                  </button>
                </div>
              ) : null}
              <DemoUnitDetail unit={selectedUnit} topology={DEMO_TOPOLOGY} />
            </section>

            {selectedUnit ? (
              <section
                style={{
                  background: COLORS_LIGHT.panel,
                  border: `1px solid ${COLORS_LIGHT.line}`,
                  borderRadius: 6,
                }}
              >
                <DemoContainerScada
                  unit={selectedUnit}
                  topology={DEMO_TOPOLOGY}
                />
              </section>
            ) : null}
          </aside>
        </div>

        <section
          style={{
            background: COLORS_LIGHT.panel,
            border: `1px solid ${COLORS_LIGHT.line}`,
            borderRadius: 6,
          }}
        >
          <header
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
              fontWeight: 700,
              fontSize: 15,
              color: COLORS_LIGHT.fg,
            }}
          >
            Trendler
            <small style={{ marginLeft: 8, fontWeight: 500, color: COLORS_LIGHT.muted }}>
              Son 4 saat
            </small>
          </header>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: "10px 18px",
              padding: "10px 14px 14px",
            }}
          >
            <DemoTrendChart
              title="SOC · saha"
              unit="%"
              yMin={0}
              yMax={100}
              series={[{ label: "Ortalama", points: trendData.soc, color: COLORS_LIGHT.cSoc }]}
              limits={[
                { value: DEMO_TOPOLOGY.limits.socMax, label: `Üst %${DEMO_TOPOLOGY.limits.socMax}` },
                { value: DEMO_TOPOLOGY.limits.socMin, label: `Alt %${DEMO_TOPOLOGY.limits.socMin}` },
              ]}
            />
            <DemoTrendChart
              title="Güç · POI"
              unit="MW"
              series={[{ label: "Ölçülen", points: trendData.power, color: COLORS_LIGHT.cPow, area: true }]}
            />
            <DemoTrendChart
              title="Hücre sıcaklığı"
              unit="°C"
              series={[{ label: "En yüksek", points: trendData.temp, color: COLORS_LIGHT.cHot }]}
              limits={[
                { value: DEMO_TOPOLOGY.limits.tempMax, label: `Üst ${DEMO_TOPOLOGY.limits.tempMax} °C`, cls: "hot" },
                { value: DEMO_TOPOLOGY.limits.tempMin, label: `Alt ${DEMO_TOPOLOGY.limits.tempMin} °C`, cls: "cold" },
              ]}
            />
          </div>
        </section>

        <section
          style={{
            background: COLORS_LIGHT.panel,
            border: `1px solid ${COLORS_LIGHT.line}`,
            borderRadius: 6,
          }}
        >
          <header
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${COLORS_LIGHT.line2}`,
              fontWeight: 700,
              fontSize: 15,
              color: COLORS_LIGHT.fg,
            }}
          >
            Olay kaydı
            <small style={{ marginLeft: 8, fontWeight: 500, color: COLORS_LIGHT.muted }}>
              log_events ∪ system_logs
            </small>
          </header>
          <DemoEventLog events={logs.data ?? []} />
        </section>
      </div>

      {openCell ? (
        <DemoCellDialog
          cell={openCell}
          station={state.station}
          busy={cellBusy}
          message={cellMsg}
          onCommand={handleCellCommand}
          onClose={() => setCellId(null)}
        />
      ) : null}
    </div>
  );
};

const ModeIcon: React.FC<{ mode: "chg" | "dis" | "rest" | "stby" }> = ({ mode }) => {
  if (mode === "chg") return <NOVA_ICONS.chg />;
  if (mode === "dis") return <NOVA_ICONS.dis />;
  if (mode === "rest") return <NOVA_ICONS.rest />;
  return <NOVA_ICONS.stby />;
};

const Notice: React.FC<{ tone: "error" | "muted"; text: string }> = ({ tone, text }) => (
  <div
    style={{
      padding: 32,
      textAlign: "center",
      background: COLORS_LIGHT.bg,
      color: tone === "error" ? COLORS_LIGHT.alarm : COLORS_LIGHT.muted,
    }}
  >
    {text}
  </div>
);
