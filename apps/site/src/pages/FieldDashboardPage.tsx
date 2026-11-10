import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  SCADA_ICONS,
  SummaryCard,
  useTranslation,
} from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { deriveSocSohAverages, derivePowerLimits } from "../features/dashboard/deriveDashboard";

export const FieldDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers } = useContainerData(fieldId ?? "");

  // 2026-09-02: üst kartlar BSC sistem seviyesi canonical metriklerinden
  // türetilir — mock veri YOKTUR.
  // 2026-09-22 (K1): EMU-1 kaldırıldı → İstasyon Durumu kartı çıkarıldı;
  // sistem agregatı BSC canonical kaynaklarından gelir.
  const socSoh = useMemo(() => deriveSocSohAverages(containers), [containers]);
  const limits = useMemo(() => derivePowerLimits(containers), [containers]);

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
      </div>
    </div>
  );
};
