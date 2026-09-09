import React from "react";
import { COLORS, SCADA_ICONS, SummaryCard, MultiLineChartV2, useTranslation } from "@gd-monorepo/ui";
import type { ChartDataPoint } from "@gd-monorepo/ui";
import { useMarket } from "../features/market/hooks/useMarket";

const CoinIcon = SCADA_ICONS.market;
const ChartIcon = SCADA_ICONS.charts;
const PowerIcon = SCADA_ICONS.powerPlug;

const formatPrice = (value?: number | null) =>
  value === undefined || value === null ? "—" : `${value.toFixed(0)} ₺`;

const toChartPoints = (
  points: Array<{ timestamp: string; value: number; unit: string }>,
  key: string,
): ChartDataPoint[] =>
  points.map((p) => ({
    timestamp: new Date(p.timestamp).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    [key]: p.value,
  }));

const formatLastUpdated = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Piyasa (BOSS-UYGULAMA-MIMARISI.md §4.5) — EPİAŞ gün öncesi PTF + GİP.
 * Kaynak: boss web-service `/api/market/*` (external_series).
 */
export const MarketPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useMarket();

  const ptf = data?.ptf;
  const gip = data?.gipWeightedAverage;
  const summary = data?.summary;

  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "11px", color: COLORS.textMuted }}>
          {t("boss.lastSeen")}: {formatLastUpdated(summary?.lastUpdatedAt ?? null)}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        <SummaryCard
          icon={<CoinIcon size={16} />}
          label="PTF (GÖP)"
          value={formatPrice(summary?.ptf?.value)}
          variant="info"
        />
        <SummaryCard
          icon={<ChartIcon size={16} />}
          label="GİP WAP"
          value={formatPrice(summary?.gipWeightedAverage?.value)}
          variant="bsc"
        />
        <SummaryCard
          icon={<PowerIcon size={16} />}
          label={t("boss.market.avg48h")}
          value={formatPrice(summary?.ptfDayAverage)}
          variant="ok"
        />
      </div>

      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "12px",
          padding: "12px",
        }}
      >
        <MultiLineChartV2
          data={ptf ? toChartPoints(ptf.points, "ptf") : []}
          title="PTF — Gün Öncesi"
          subtitle={`${ptf?.points[0]?.unit ?? "TL/MWh"}`}
          yAxisLabel="₺/MWh"
          height={320}
          colors={[COLORS.success]}
          isLoading={isLoading}
          locale="tr"
        />
      </div>

      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "12px",
          padding: "12px",
        }}
      >
        <MultiLineChartV2
          data={gip ? toChartPoints(gip.points, "gip") : []}
          title="GİP — Ağırlıklı Ortalama"
          subtitle={`${gip?.points[0]?.unit ?? "TL/MWh"}`}
          yAxisLabel="₺/MWh"
          height={280}
          colors={[COLORS.info]}
          isLoading={isLoading}
          locale="tr"
        />
      </div>
    </div>
  );
};
