// apps/field/src/features/pcs/components/PcsSection.tsx
import React, { useMemo, useState } from "react";
import {
  COLORS,
  SCADA_ICONS,
  SingleTelemetryChart,
  SummaryCard,
  useTranslation,
} from "@gd-monorepo/ui";
import type { TelemetryChartLabels } from "@gd-monorepo/ui";
import type { PcsSummary } from "../../containers/components/PcsCard";
import { PcsCard } from "../../containers/components/PcsCard";
import { PcsDetailModal } from "../../containers/components/PcsDetailModal";
import { PcsConfigModal } from "../../containers/components/PcsConfigModal";
import {
  pcsState,
  pcsTelemetryValue,
  pcsConfigInfo,
} from "../../containers/hooks/pcsDerivation";
import { usePcsTelemetryProvider } from "../hooks/usePcsTelemetryProvider";

const PCS_CHART_NAMES = [
  "AC Active Power",
  "DC Power",
  "DC Voltage",
  "DC Current",
  "IGBT Temperature",
];

const STATE_VARIANT: Record<string, "ok" | "dc" | "info" | "alarm"> = {
  charging: "ok",
  discharging: "dc",
  idle: "info",
  offline: "alarm",
};

interface PcsSectionProps {
  fieldId: string;
  pcs: PcsSummary;
}

/**
 * 2026-09-02 — PCS sayfası bölümü (PCS başına):
 * 1. satır: temel veri summary kartları (Durum + güç/voltaj/akım/sıcaklık).
 * 2. satır: PcsCard %50 + SingleTelemetryChart %50 (tarihsel PCS serisi).
 * Hook kuralı: grafik provider'ı bölüm başına bir kez çağrılır.
 */
export const PcsSection: React.FC<PcsSectionProps> = ({ fieldId, pcs }) => {
  const { t, locale } = useTranslation();
  const loc = locale();
  const [detailOpen, setDetailOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const provider = usePcsTelemetryProvider(fieldId, pcs.containerId, pcs.pcsId);

  const activePower = pcsTelemetryValue(pcs.latestTelemetry, "AC Active Power");
  const state = pcsState(pcs.connected, activePower);

  const chartLabels: TelemetryChartLabels = useMemo(() => ({
    range1m: t("chart.range.1m"), range1h: t("chart.range.1h"), range1d: t("chart.range.1d"),
    range1w: t("chart.range.1w"), range1M: t("chart.range.1M"), range3M: t("chart.range.3M"),
    range6M: t("chart.range.6M"), range1y: t("chart.range.1y"),
    rangeCustom: t("chart.range.custom"), rangeFrom: t("chart.range.from"), rangeTo: t("chart.range.to"),
    pointsLow: t("chart.control.points.low"), pointsStandard: t("chart.control.points.standard"),
    pointsHigh: t("chart.control.points.high"), pointsMax: t("chart.control.points.max"),
    timeRange: t("chart.control.timeRange"), points: t("chart.control.points"), metric: t("chart.control.metric"),
    all: t("common.all"), none: t("common.none"), selected: t("common.selected"),
    systemEvents: t("chart.control.systemEvents"), userActions: t("chart.control.userActions"),
    correctedEvents: t("chart.control.correctedEvents"),
    loadFailed: t("error.loadFailed"), loading: t("common.loading"), noData: t("common.noData"),
    pointsUnit: t("chart.subtitle.points"), intervalPrefix: "~",
    seconds: t("chart.unit.seconds"), minutes: t("chart.unit.minutes"),
    hours: t("chart.unit.hours"), days: t("chart.unit.days"),
    onlyEssential: t("chart.control.onlyEssential"), onlyDetail: t("chart.control.onlyDetail"),
    categoryEssential: t("chart.control.categoryEssential"), categoryDetail: t("chart.control.categoryDetail"),
    searchPlaceholder: t("chart.control.searchPlaceholder"), noResults: t("chart.control.noResults"),
  }), [t]);

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* ==================== Segment Ayracı (device id) ==================== */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span
          style={{
            width: "4px",
            height: "16px",
            borderRadius: "2px",
            background: COLORS.info,
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textPrimary }}>
          {pcs.pcsId}
        </span>
      </div>

      {/* ==================== Satır 1: Summary Kartlar ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <SummaryCard
          icon={<SCADA_ICONS.powerPlug size={28} />}
          value={t(state.statusKey)}
          label={t("pcs.state")}
          variant={STATE_VARIANT[state.kind]}
        />
        <SummaryCard
          icon={<SCADA_ICONS.batteryCharge size={28} />}
          value={`${activePower.toFixed(1)} kW`}
          label={t("pcs.activePower")}
          variant="info"
        />
        <SummaryCard
          icon={<SCADA_ICONS.batteryDischarge size={28} />}
          value={`${pcsTelemetryValue(pcs.latestTelemetry, "DC Power").toFixed(1)} kW`}
          label={t("pcs.dcPower")}
          variant="info"
        />
        <SummaryCard
          icon={<SCADA_ICONS.battery size={28} />}
          value={`${pcsTelemetryValue(pcs.latestTelemetry, "DC Voltage").toFixed(0)} V`}
          label={t("pcs.dcVoltage")}
          variant="info"
        />
        <SummaryCard
          icon={<SCADA_ICONS.powerPlug size={28} />}
          value={`${pcsTelemetryValue(pcs.latestTelemetry, "DC Current").toFixed(1)} A`}
          label={t("pcs.dcCurrent")}
          variant="info"
        />
        <SummaryCard
          icon={<SCADA_ICONS.temperature size={28} />}
          value={`${pcsTelemetryValue(pcs.latestTelemetry, "IGBT Temperature").toFixed(1)} °C`}
          label={t("pcs.igbtTemp")}
          variant="info"
        />
      </div>

      {/* ==================== Satır 2: PcsCard + Grafik ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "12px",
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <PcsCard
            pcs={pcs}
            onDetailClick={() => setDetailOpen(true)}
            onConfigClick={() => setConfigOpen(true)}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <SingleTelemetryChart
            provider={provider}
            telemetryNames={PCS_CHART_NAMES}
            title={pcs.pcsId}
            yAxisLabel={t("chart.yAxisLabel")}
            height={400}
            labels={chartLabels}
            locale={loc}
          />
        </div>
      </div>

      <PcsDetailModal
        pcs={detailOpen ? pcs : null}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
      <PcsConfigModal
        info={configOpen ? pcsConfigInfo(pcs) : null}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
};

PcsSection.displayName = "PcsSection";
