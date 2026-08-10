import React from "react";
import type { DeviceTableProps } from "./DeviceTable.types";
import * as S from "./DeviceTable.styles";

const typeLabel = (type: string): string => {
  const map: Record<string, string> = { bsc: "BSC", cb: "CB", "dc-output": "DC-Çıkış", hvac: "HVAC" };
  return map[type] ?? type;
};

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  isLoading,
  headerSlot,
  renderActions,
  getDeviceId,
}) => {
  if (isLoading) {
    return <S.Loading>Yükleniyor...</S.Loading>;
  }

  return (
    <S.Container>
      <S.Header>
        {headerSlot}
      </S.Header>
      <S.Table>
        <thead>
          <tr>
            <S.Th>ID</S.Th>
            <S.Th>Ad</S.Th>
            <S.Th>Tip</S.Th>
            <S.Th>Protokol</S.Th>
            <S.Th>Rack</S.Th>
            <S.Th>Model</S.Th>
            <S.Th>Durum</S.Th>
            <S.Th>Poll (ms)</S.Th>
            <S.Th>Son Görülme</S.Th>
            {renderActions && <S.Th></S.Th>}
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <S.Td>
                {getDeviceId ? (
                  getDeviceId(device)
                ) : (
                  <S.DeviceId>{device.id}</S.DeviceId>
                )}
              </S.Td>
              <S.Td>{device.name}</S.Td>
              <S.Td>
                <S.TypeBadge>{typeLabel(device.type)}</S.TypeBadge>
              </S.Td>
              <S.Td>{device.protocol}</S.Td>
              <S.Td>{device.rack_count ?? "-"}</S.Td>
              <S.Td>{device.model ?? "-"}</S.Td>
              <S.Td>
                <S.StatusBadge $online={device.status === "online"}>
                  {device.status}
                </S.StatusBadge>
              </S.Td>
              <S.Td>{device.poll_interval_ms ?? "-"}</S.Td>
              <S.Td>
                {device.last_seen
                  ? new Date(device.last_seen).toLocaleString("tr-TR")
                  : "-"}
              </S.Td>
              {renderActions && <S.Td>{renderActions(device)}</S.Td>}
            </tr>
          ))}
        </tbody>
      </S.Table>
    </S.Container>
  );
};
