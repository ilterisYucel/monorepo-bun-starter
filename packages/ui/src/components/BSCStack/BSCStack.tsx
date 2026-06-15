import React, { useState, useCallback, useMemo } from "react";
import { BSCGraphic } from "../BSCGraphic";
import type { BSCStackProps } from "./BSCStack.types";
import * as S from "./BSCStack.styles";

export const BSCStack: React.FC<BSCStackProps> = ({
  deviceId,
  bscCount,
  racks,
  width,
  flowDirection,
  breakerStatuses = [],
  breakerPositions = [],
  dcOutputs = [],
  onRackClick,
  onBreakerToggle,
}) => {
  const [redrawKey, setRedrawKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRedrawKey((prev) => prev + 1);
  }, []);

  const rackChunks = useMemo(
    () =>
      Array.from({ length: bscCount }, (_, i) =>
        racks.slice(i * 8, (i + 1) * 8).map((rack, j) => ({
          ...rack,
          id: i * 8 + j + 1,
        })),
      ),
    [racks, bscCount],
  );

  const statusLabel =
    flowDirection === "Charge"
      ? "CHARGE"
      : flowDirection === "Discharge"
        ? "DISCHARGE"
        : "IDLE";

  return (
    <S.Container
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    >
      <S.Header>
        <S.HeaderLeft>
          <S.DeviceLabel>{deviceId}</S.DeviceLabel>
          <S.FlowBadge $status={flowDirection}>{statusLabel}</S.FlowBadge>
        </S.HeaderLeft>
        <S.HeaderRight>
          {bscCount > 1 && (
            <S.BSCLabel>{bscCount}× BSC</S.BSCLabel>
          )}
          <S.RefreshButton onClick={handleRefresh} title="Yeniden çiz">
            ↻
          </S.RefreshButton>
        </S.HeaderRight>
      </S.Header>
      {Array.from({ length: bscCount }, (_, i) => (
        <BSCGraphic
          key={i}
          deviceId={`${deviceId}-${i + 1}`}
          racks={rackChunks[i]!}
          flowDirection={flowDirection}
          breakerStatus={breakerStatuses[i] ?? "online"}
          breakerPosition={breakerPositions[i] ?? "close"}
          dcOutput={dcOutputs[i]}
          onRackClick={onRackClick}
          onBreakerToggle={(pos) => onBreakerToggle?.(i, pos)}
          showRefresh={false}
          showFlowDirection={false}
          bordered={false}
          refreshCounter={redrawKey}
        />
      ))}
    </S.Container>
  );
};

BSCStack.displayName = "BSCStack";
