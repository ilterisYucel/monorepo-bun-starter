// apps/field/src/features/devices/components/DeviceDetailModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { COLORS, useTranslation } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { containersApi } from "../../containers/services/containersApi";
import * as S from "./DeviceDetailModal.styles";

interface DeviceDetailModalProps {
  fieldId: string;
  containerId: string;
  deviceId: string | null;
  open: boolean;
  onClose: () => void;
  /** Seçili konteynerin snapshot'ı — "Mevcut Değer" sütunu (ek istek yok). */
  latestTelemetry: TelemetryData[];
}

const TABLE_TYPE_LABEL: Record<string, string> = {
  INPUT_REGISTER: "Input",
  HOLDING_REGISTER: "Holding",
  COIL: "Coil",
  DISCRETE_INPUT: "Discrete",
};

/**
 * DeviceDetailModal — konteyner app kopyası (2026-09-02, field uyarlaması):
 *
 * Genel Bilgiler + Telemetri Konfigürasyonu sekmeleri. Config MEVCUT HTTP
 * tünelinden gelir (`/containers/:cid/ui/api/unified/devices/:id/
 * telemetry-config` — Path-scoped session cookie'si); canlı değerler
 * snapshot'tan beslenir. Konteyner offline/config yoksa hata durumu gösterilir
 * (kademeli bozulma — modal açık kalır).
 */
export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  fieldId,
  containerId,
  deviceId,
  open,
  onClose,
  latestTelemetry,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"general" | "telemetry">("general");

  const { data: config, isLoading: configLoading, isError: configError } = useQuery({
    queryKey: ["deviceConfig", fieldId, containerId, deviceId],
    queryFn: () => containersApi.deviceConfig(fieldId, containerId, deviceId!),
    enabled: open && !!deviceId,
    staleTime: 60 * 60 * 1000,
  });

  const latestMap = useMemo(() => {
    const map = new Map<string, { value: unknown; unit: string }>();
    for (const point of latestTelemetry) {
      if (point.deviceId === deviceId) {
        map.set(point.name, { value: point.value, unit: point.unit ?? "" });
      }
    }
    return map;
  }, [latestTelemetry, deviceId]);

  useEffect(() => {
    if (open && deviceId) {
      setTab("general");
    }
  }, [open, deviceId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // NOT: tüm hook'lar erken return'ün ÜSTÜNDE çağrılmalıdır (hooks kuralı) —
  // aksi halde open=true render'ı "daha fazla hook" hatası verir.
  const tagKeys = useMemo(() => {
    if (!config) return [];
    const keys = new Set<string>();
    for (const entry of config.telemetry) {
      if (entry.tags) {
        for (const k of Object.keys(entry.tags)) {
          keys.add(k);
        }
      }
    }
    return Array.from(keys);
  }, [config]);

  if (!open) return null;

  const overlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const formatCurrentValue = (name: string): string => {
    const entry = latestMap.get(name);
    if (!entry) return "—";
    const v = entry.value;
    if (typeof v === "number") return `${v}${entry.unit ? " " + entry.unit : ""}`;
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v ?? "—");
  };

  const formatConnKey = (key: string): string =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase());

  const renderConnValue = (v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  return createPortal(
    <S.Overlay onClick={overlayClick}>
      <S.Modal>
        <S.Header>
          <S.HeaderTitle>
            <S.DeviceName>{config?.name ?? deviceId}</S.DeviceName>
            <S.DeviceId>{deviceId}</S.DeviceId>
          </S.HeaderTitle>
          <S.CloseButton onClick={onClose}>&times;</S.CloseButton>
        </S.Header>

        <S.Tabs>
          <S.Tab $active={tab === "general"} onClick={() => setTab("general")}>
            {t("devices.generalInfo")}
          </S.Tab>
          <S.Tab $active={tab === "telemetry"} onClick={() => setTab("telemetry")}>
            {t("devices.telemetryConfig")}
          </S.Tab>
        </S.Tabs>

        <S.Body>
          {configLoading && <S.Spinner>{t("common.loading")}</S.Spinner>}
          {configError && <S.ErrorBox>{t("devices.configLoadFailed")}</S.ErrorBox>}
          {!configLoading && !configError && !config && (
            <S.ErrorBox>{t("devices.configNotFound")}</S.ErrorBox>
          )}

          {config && tab === "general" && (
            <S.InfoGrid>
              <S.InfoField>
                <S.InfoLabel>{t("devices.deviceId")}</S.InfoLabel>
                <S.InfoValue>{config.deviceId}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>{t("devices.name")}</S.InfoLabel>
                <S.InfoValue>{config.name}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>{t("devices.manufacturer")}</S.InfoLabel>
                <S.InfoValue>{config.manufacturer}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>{t("devices.model")}</S.InfoLabel>
                <S.InfoValue>{config.model}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>{t("devices.protocol")}</S.InfoLabel>
                <S.InfoValue>{config.protocol}</S.InfoValue>
              </S.InfoField>
              {config.connection && Object.keys(config.connection).length > 0 && (
                <>
                  {Object.entries(config.connection).map(([key, value]) => (
                    <S.InfoField key={key}>
                      <S.InfoLabel>{formatConnKey(key)}</S.InfoLabel>
                      <S.InfoValue>{renderConnValue(value)}</S.InfoValue>
                    </S.InfoField>
                  ))}
                </>
              )}
              <S.InfoField>
                <S.InfoLabel>{t("devices.telemetryCount")}</S.InfoLabel>
                <S.InfoValue>{config.telemetry.length}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>{t("devices.commandCount")}</S.InfoLabel>
                <S.InfoValue>{config.commands.length}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>{t("devices.commands")}</S.InfoLabel>
                <S.InfoValue>{config.commands.join(", ") || "—"}</S.InfoValue>
              </S.InfoField>
            </S.InfoGrid>
          )}

          {config && tab === "telemetry" && (
            <div style={{ overflowX: "auto" }}>
              <S.ConfigTable>
                <thead>
                  <tr>
                    <S.Th>{t("devices.name")}</S.Th>
                    <S.Th>{t("devices.currentValue")}</S.Th>
                    <S.Th>{t("devices.description")}</S.Th>
                    <S.Th>{t("devices.unit")}</S.Th>
                    <S.Th>{t("devices.register")}</S.Th>
                    <S.Th>{t("devices.tableType")}</S.Th>
                    <S.Th>{t("devices.dataType")}</S.Th>
                    <S.Th>{t("devices.scale")}</S.Th>
                    <S.Th>{t("devices.offset")}</S.Th>
                    <S.Th>{t("devices.priority")}</S.Th>
                    <S.Th>{t("devices.byteOrder")}</S.Th>
                    {tagKeys.map((key) => (
                      <S.Th key={key}>{key}</S.Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.telemetry.map((entry, i) => (
                    <tr key={`${entry.name}-${entry.registerAddress}-${i}`}>
                      <S.Td style={{ color: COLORS.info, fontWeight: 600 }}>
                        {entry.name}
                      </S.Td>
                      <S.Td style={{ fontSize: "13px", fontWeight: 600, color: COLORS.success }}>
                        {formatCurrentValue(entry.name)}
                      </S.Td>
                      <S.Td style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.description}
                      </S.Td>
                      <S.Td>{entry.unit}</S.Td>
                      <S.Td style={{ color: COLORS.info }}>{entry.registerAddress}</S.Td>
                      <S.Td>
                        <S.TypeBadge $type={entry.registerTableType}>
                          {TABLE_TYPE_LABEL[entry.registerTableType] ?? entry.registerTableType}
                        </S.TypeBadge>
                      </S.Td>
                      <S.Td style={{ color: COLORS.textVoltage }}>{entry.registerDataType}</S.Td>
                      <S.Td>{entry.scale ?? "—"}</S.Td>
                      <S.Td>{entry.offset ?? "—"}</S.Td>
                      <S.Td>{entry.priority ?? "—"}</S.Td>
                      <S.Td>{entry.byteOrder ?? "—"}</S.Td>
                      {tagKeys.map((key) => (
                        <S.Td key={key}>
                          <S.TagBadge>{entry.tags?.[key] ?? "—"}</S.TagBadge>
                        </S.Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </S.ConfigTable>
            </div>
          )}
        </S.Body>
      </S.Modal>
    </S.Overlay>,
    document.body,
  );
};

DeviceDetailModal.displayName = "DeviceDetailModal";
