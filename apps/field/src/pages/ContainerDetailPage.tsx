import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  COLORS,
  SCADA_ICONS,
  ContainerConnectionBadge,
  DeviceGauges,
  SummaryCard,
  useTranslation,
} from "@gd-monorepo/ui";
import { useContainerTelemetry } from "../features/containers/hooks/useContainerTelemetry";
import { buildDeviceGaugeBlocks } from "../features/containers/hooks/containerGaugeBlocks";
import {
  deriveSocSohAverages,
  derivePowerLimits,
} from "../features/dashboard/deriveDashboard";
import { ContainerFrame } from "../features/containers/components/ContainerFrame";

const BackIcon = SCADA_ICONS.collapse;

export const ContainerDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId, containerId } = useParams<{ fieldId: string; containerId: string }>();
  const navigate = useNavigate();
  const { container } = useContainerTelemetry(fieldId ?? "", containerId ?? "");
  const [frameOpen, setFrameOpen] = useState(false);

  if (!container) {
    return (
      <div style={{ padding: "20px", color: COLORS.error }}>
        {t("container.notFound")}: {containerId}
      </div>
    );
  }

  const gaugeBlocks = buildDeviceGaugeBlocks(container.latestTelemetry, t);
  const connected = container.connectionStatus === "connected";

  // 2026-09-02: üst kartlar BSC sistem seviyesi canonical metriklerinden
  // türetilir (tek konteyner — saha türeticileriyle aynı sözleşme).
  const socSoh = deriveSocSohAverages([container]);
  const limits = derivePowerLimits([container]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => navigate(`/field/${fieldId}/containers`)}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            padding: "4px",
            transform: "rotate(180deg)",
          }}
        >
          <BackIcon size={18} />
        </button>
        <h2 style={{ flex: 1, fontSize: "16px", color: COLORS.textWhite }}>
          {container.containerId}
        </h2>
        <ContainerConnectionBadge
          connected={connected}
          label={t("container.connected")}
          size="small"
        />
        <button
          onClick={() => setFrameOpen(true)}
          style={{
            background: COLORS.infoAlpha12,
            border: `1px solid ${COLORS.info}`,
            borderRadius: "6px",
            color: COLORS.textWhite,
            padding: "6px 14px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t("container.fullscreen")}
        </button>
      </div>

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
          label={t("common.soc")}
          variant="bsc"
        />
        <SummaryCard
          icon={<SCADA_ICONS.health size={28} />}
          value={socSoh.avgSoh !== null ? `%${socSoh.avgSoh.toFixed(1)}` : "—"}
          label={t("common.soh")}
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

      {/* ==================== Cihaz Satırları (Konteyner Panel V2 kopyası) ==================== */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {gaugeBlocks.map((block) => (
          <div
            key={block.deviceId}
            style={{ flex: "0 0 calc(50% - 8px)", minWidth: 0 }}
          >
            <DeviceGauges
              deviceId={block.deviceId}
              gauges={block.gauges}
              theme={block.theme}
              variant="circular"
              width="100%"
            />
          </div>
        ))}
      </div>

      {frameOpen && (
        <ContainerFrame
          fieldId={fieldId ?? ""}
          containerId={containerId ?? ""}
          onClose={() => setFrameOpen(false)}
        />
      )}
    </div>
  );
};
