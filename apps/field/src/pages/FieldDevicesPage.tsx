import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DeviceTable, COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import type { DeviceTableRow } from "@gd-monorepo/ui";
import { useContainerData } from "../features/containers/hooks/useContainerData";
import { useContainerDevices } from "../features/field-devices/hooks/useContainerDevices";
import { DeviceDetailModal } from "../features/devices/components/DeviceDetailModal";

const DevicesIcon = SCADA_ICONS.container;

/**
 * 2026-09-02 — Devices sayfası (konteyner kapsamlı, tünel beslemeli):
 *
 * Birleşik panel: üst araç çubuğu (başlık + cihaz sayacı + Konteyner
 * combobox'ı) ve altında DeviceTable — PcsCard/PCS seçimi kaldırıldı.
 * Cihaz listesi MEVCUT HTTP tünelinden gelir (openSession → /unified/devices);
 * tünel başarısızsa snapshot'tan türetilir (kademeli bozulma). "Detay"
 * butonu DeviceDetailModal'ı açar (config + canlı değerler).
 */
export const FieldDevicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { fieldId } = useParams<{ fieldId: string }>();
  const { containers, isLoading: containersLoading } = useContainerData(fieldId ?? "");
  const [containerId, setContainerId] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const connectedIds = useMemo(
    () => containers.filter((c) => c.connected).map((c) => c.containerId),
    [containers],
  );

  // Sabit varsayım YOKTUR — seçim bağlı konteynerlerden türetilir
  // (ilk bağlı; yoksa ilk kayıt).
  useEffect(() => {
    if (containerId === "" && containers.length > 0) {
      setContainerId(connectedIds[0] ?? containers[0].containerId);
    }
  }, [containers, containerId, connectedIds]);

  const { devices, latestTelemetry, isLoading } = useContainerDevices(
    fieldId ?? "",
    containerId,
  );

  if (containersLoading) {
    return <div style={{ padding: "20px", color: COLORS.textMuted }}>{t("common.loading")}</div>;
  }

  if (containers.length === 0) {
    return (
      <div style={{ padding: "20px", color: COLORS.textMuted }}>
        {t("devices.noContainers")}
      </div>
    );
  }

  return (
    <div
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* ==================== Araç Çubuğu ==================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 16px",
          borderBottom: `1px solid ${COLORS.borderDefault}`,
        }}
      >
        <DevicesIcon size={16} color={COLORS.info} />
        <span style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textPrimary }}>
          {t("nav.devices")}
        </span>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "10px",
            fontSize: "10px",
            fontWeight: 600,
            background: COLORS.infoAlpha12,
            color: COLORS.info,
          }}
        >
          {devices.length}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: COLORS.textMuted }}>
            {t("container.title")}:
          </span>
          <select
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            style={{
              padding: "6px 10px",
              background: COLORS.bgInput,
              border: `1px solid ${COLORS.borderDefault}`,
              borderRadius: "8px",
              color: COLORS.textPrimary,
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {containers.map((c) => (
              <option key={c.containerId} value={c.containerId}>
                {c.containerId}
                {c.connected ? "" : ` (${t("common.offline")})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==================== Cihaz Tablosu ==================== */}
      <DeviceTable
        devices={devices as DeviceTableRow[]}
        isLoading={isLoading}
        renderActions={(device) => (
          <button
            onClick={() => setSelectedDeviceId(device.id)}
            style={{
              padding: "4px 12px",
              background: COLORS.infoAlpha12,
              border: `1px solid ${COLORS.info}`,
              borderRadius: "8px",
              color: COLORS.info,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("devices.detail")}
          </button>
        )}
      />

      <DeviceDetailModal
        fieldId={fieldId ?? ""}
        containerId={containerId}
        deviceId={selectedDeviceId}
        open={selectedDeviceId !== null}
        onClose={() => setSelectedDeviceId(null)}
        latestTelemetry={latestTelemetry}
      />
    </div>
  );
};
