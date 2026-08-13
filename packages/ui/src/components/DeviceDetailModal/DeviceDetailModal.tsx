import React, { useEffect, useState, useCallback } from "react";
import { SCADA_ICONS } from "../../icons";
import type { ReactNode } from "react";
import type { IDeviceDetailProvider } from "../../interfaces/device-detail-provider";
import * as S from "./DeviceDetailModal.styles";

export interface DeviceDetailModalProps {
  deviceId: string;
  provider: IDeviceDetailProvider;
  open: boolean;
  onClose: () => void;
  children?: (devices: Array<{ id: string; type: string; status: string; lastSeen: string }>) => ReactNode;
}

const CloseIcon = SCADA_ICONS.close;

interface DeviceRecord {
  id: string;
  type: string;
  status: string;
  lastSeen: string;
}

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  deviceId,
  provider,
  open,
  onClose,
  children,
}) => {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const result = await provider.devices(deviceId);
      setDevices(result);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [open, deviceId, provider]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <S.Overlay onClick={onClose}>
      <S.ModalContainer onClick={(e) => e.stopPropagation()}>
        <S.Header>
          <S.Title>{deviceId} — Cihaz Detayları</S.Title>
          <S.CloseButton onClick={onClose} aria-label="Kapat">
            <CloseIcon size={20} />
          </S.CloseButton>
        </S.Header>
        <S.Body>
          {loading ? (
            <S.LoadingContainer>Yükleniyor...</S.LoadingContainer>
          ) : devices.length === 0 ? (
            <S.EmptyContainer>Cihaz bulunamadı</S.EmptyContainer>
          ) : children ? (
            children(devices)
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>ID</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Tip</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Durum</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Son Veri</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td style={{ padding: "8px 12px" }}>{d.id}</td>
                    <td style={{ padding: "8px 12px" }}>{d.type}</td>
                    <td style={{ padding: "8px 12px" }}>{d.status}</td>
                    <td style={{ padding: "8px 12px" }}>{d.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </S.Body>
      </S.ModalContainer>
    </S.Overlay>
  );
};

DeviceDetailModal.displayName = "DeviceDetailModal";
