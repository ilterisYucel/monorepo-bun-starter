import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  SCADA_ICONS,
  SummaryCard,
  useTranslation,
} from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { deriveEmuMetrics, deriveSocSohAverages, derivePowerLimits } from "../features/dashboard/deriveDashboard";

const STATION_STATE_KEY: Record<number, string> = {
  0: "status.initialState",
  1: "status.shutdown",
  2: "status.standby",
  3: "status.hotStandby",
  4: "status.charging",
  5: "status.discharging",
};

export const FieldDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers } = useContainerData(fieldId ?? "");

  // 2026-09-02: üst kartlar BSC sistem seviyesi canonical metriklerinden
  // türetilir; EMU yalnızca İstasyon Durumu sağlar — mock veri YOKTUR.
  const emuMetrics = useMemo(() => deriveEmuMetrics(containers), [containers]);
  const socSoh = useMemo(() => deriveSocSohAverages(containers), [containers]);
  const limits = useMemo(() => derivePowerLimits(containers), [containers]);

  const emuVal = (name: string): number => emuMetrics[name] ?? 0;
  const stationState = emuVal("Station State");

  const stationVariant = stationState === 4 ? "ok" : stationState === 5 ? "dc" : "info";

  return (
    <div>
      {/* ==================== Özet Kartları ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <SummaryCard
          icon={<SCADA_ICONS.battery size={28} />}
          value={socSoh.avgSoc !== null ? `%${socSoh.avgSoc.toFixed(1)}` : "—"}
          label={t("dashboard.avgSoc")}
          variant="bsc"
        />
        <SummaryCard
          icon={<SCADA_ICONS.health size={28} />}
          value={socSoh.avgSoh !== null ? `%${socSoh.avgSoh.toFixed(1)}` : "—"}
          label={t("dashboard.avgSoh")}
          variant="bsc"
        />
        <SummaryCard
          icon={<SCADA_ICONS.batteryCharge size={28} />}
          value={`${limits.chargeKw.toFixed(1)} kW`}
          label={t("dashboard.chargeLimit")}
          variant="info"
        />
        <SummaryCard
          icon={<SCADA_ICONS.batteryDischarge size={28} />}
          value={`${limits.dischargeKw.toFixed(1)} kW`}
          label={t("dashboard.dischargeLimit")}
          variant="dc"
        />
        <SummaryCard
          icon={<SCADA_ICONS.dashboard size={28} />}
          value={t(STATION_STATE_KEY[stationState] ?? "common.offline")}
          label={t("emu.stationState")}
          variant={stationVariant}
        />
      </div>
    </div>
  );
};
