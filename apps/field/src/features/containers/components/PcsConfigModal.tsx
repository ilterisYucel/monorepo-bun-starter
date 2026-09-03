// apps/field/src/features/containers/components/PcsConfigModal.tsx
import React from "react";
import { COLORS, useTranslation } from "@gd-monorepo/ui";
import { Modal } from "../../ui";
import type { PcsConfigInfo } from "../hooks/pcsDerivation";

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "8px 10px",
      background: COLORS.bgInput,
      borderRadius: "8px",
      marginBottom: "6px",
    }}
  >
    <span style={{ fontSize: "11px", color: COLORS.textMuted }}>{label}</span>
    <span style={{ fontSize: "12px", fontWeight: 600, color: COLORS.textWhite, textAlign: "right" }}>
      {value}
    </span>
  </div>
);

const Chip: React.FC<{ name: string }> = ({ name }) => (
  <span
    style={{
      fontSize: "10px",
      background: COLORS.bgTag,
      color: COLORS.textTagGray,
      borderRadius: "10px",
      padding: "3px 8px",
      display: "inline-block",
      margin: "2px",
    }}
  >
    {name}
  </span>
);

/**
 * PcsConfigModal — PCS kayıt/bağlantı meta bilgileri (2026-08-30):
 *
 * Konteyner, bağlantı durumu, son görülme, yerleşim koordinatları ve akan
 * telemetri envanteri. Field tier'da cihaz config tablosu yoktur; gerçek
 * device config akışı (container→field push) ayrı backend fazının konusudur —
 * bu modal snapshot + kayıt bilgisinden türetilen görünümdür.
 */
export const PcsConfigModal: React.FC<{
  info: PcsConfigInfo | null;
  open: boolean;
  onClose: () => void;
}> = ({ info, open, onClose }) => {
  const { t } = useTranslation();
  if (!info) return null;

  return (
    <Modal open={open} title={`${info.pcsId} — ${t("pcs.configTitle")}`} onClose={onClose}>
      <Row label={t("pcs.containerLabel")} value={info.containerId} />
      <Row
        label={t("pcs.connectionStatus")}
        value={
          <span style={{ color: info.connected ? COLORS.success : COLORS.error }}>
            {info.connected ? t("common.online") : t("common.offline")}
          </span>
        }
      />
      {info.lastSeenAt && (
        <Row label={t("container.lastSeen")} value={new Date(info.lastSeenAt).toLocaleString()} />
      )}
      {info.layout && (
        <Row
          label={t("pcs.layout")}
          value={`x:${info.layout.x} / y:${info.layout.y} / z:${info.layout.z}`}
        />
      )}

      <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.textMuted, margin: "12px 0 6px" }}>
        {t("pcs.telemetryInventory")}
      </div>
      <div style={{ background: COLORS.bgInput, borderRadius: "8px", padding: "8px" }}>
        {info.telemetryNames.length === 0 ? (
          <span style={{ fontSize: "11px", color: COLORS.textDisabled }}>
            {t("common.noData")}
          </span>
        ) : (
          info.telemetryNames.map((name) => <Chip key={name} name={name} />)
        )}
      </div>
    </Modal>
  );
};
