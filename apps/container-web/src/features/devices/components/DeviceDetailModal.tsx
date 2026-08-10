import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "@gd-monorepo/ui";
import { devicesApi } from "../services/devicesApi";
import { apiClient } from "../../../lib/api-client";
import type { TelemetryConfigResponse } from "../types/telemetry-config";
import * as S from "./DeviceDetailModal.styles";

interface DeviceDetailModalProps {
  deviceId: string | null;
  open: boolean;
  onClose: () => void;
}

const TABLE_TYPE_LABEL: Record<string, string> = {
  INPUT_REGISTER: "Input",
  HOLDING_REGISTER: "Holding",
  COIL: "Coil",
  DISCRETE_INPUT: "Discrete",
};

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  deviceId,
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<"general" | "telemetry">("general");
  const [config, setConfig] = useState<TelemetryConfigResponse | null>(null);
  const [latestMap, setLatestMap] = useState<Map<string, { value: unknown; unit: string }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const configData = await devicesApi.getTelemetryConfig(deviceId);
      setConfig(configData);

      try {
        const latestData = await apiClient.get(
          `/unified/telemetry/latest?deviceIds=${deviceId}`,
        );
        const map = new Map<string, { value: unknown; unit: string }>();
        const telemetries = (latestData.data?.telemetries as any[]) ?? [];
        for (const t of telemetries) {
          map.set(t.name, { value: t.value, unit: t.unit ?? "" });
        }
        setLatestMap(map);
      } catch {
        setLatestMap(new Map());
      }
    } catch {
      setError("Konfigürasyon yüklenemedi");
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    if (open && deviceId) {
      setTab("general");
      fetchData();
    }
  }, [open, deviceId, fetchData]);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
            Genel Bilgiler
          </S.Tab>
          <S.Tab $active={tab === "telemetry"} onClick={() => setTab("telemetry")}>
            Telemetri Konfigürasyonu
          </S.Tab>
        </S.Tabs>

        <S.Body>
          {loading && <S.Spinner>Yükleniyor...</S.Spinner>}
          {error && <S.ErrorBox>{error}</S.ErrorBox>}

          {config && tab === "general" && (
            <S.InfoGrid>
              <S.InfoField>
                <S.InfoLabel>Cihaz ID</S.InfoLabel>
                <S.InfoValue>{config.deviceId}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>Ad</S.InfoLabel>
                <S.InfoValue>{config.name}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>Üretici</S.InfoLabel>
                <S.InfoValue>{config.manufacturer}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>Model</S.InfoLabel>
                <S.InfoValue>{config.model}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>Protokol</S.InfoLabel>
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
                <S.InfoLabel>Telemetri Sayısı</S.InfoLabel>
                <S.InfoValue>{config.telemetry.length}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>Komut Sayısı</S.InfoLabel>
                <S.InfoValue>{config.commands.length}</S.InfoValue>
              </S.InfoField>
              <S.InfoField>
                <S.InfoLabel>Komutlar</S.InfoLabel>
                <S.InfoValue>{config.commands.join(", ") || "—"}</S.InfoValue>
              </S.InfoField>
            </S.InfoGrid>
          )}

          {config && tab === "telemetry" && (
            <div style={{ overflowX: "auto" }}>
              <S.ConfigTable>
                <thead>
                  <tr>
                    <S.Th>Name</S.Th>
                    <S.Th>Mevcut Değer</S.Th>
                    <S.Th>Açıklama</S.Th>
                    <S.Th>Unit</S.Th>
                    <S.Th>Register</S.Th>
                    <S.Th>Tablo Tipi</S.Th>
                    <S.Th>Veri Tipi</S.Th>
                    <S.Th>Scale</S.Th>
                    <S.Th>Offset</S.Th>
                    <S.Th>Öncelik</S.Th>
                    <S.Th>Byte Sırası</S.Th>
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
