// packages/ui/src/components/PowerFlowAnimation/RackPopover.tsx
import React from "react";
import * as S from "./PowerFlowAnimation.styles";
import type { Rack } from "../../types";

interface RackPopoverProps {
  rack: Rack | null;
  x: number;
  y: number;
  visible: boolean;
}

export const RackPopover: React.FC<RackPopoverProps> = ({
  rack,
  x,
  y,
  visible,
}) => {
  if (!visible || !rack) return null;

  const StatusBadgeComponent =
    rack.status === "online" ? S.StatusBadgeOnline : S.StatusBadgeOffline;
  const ChargeStatusComponent =
    rack.charge_status === "Charge"
      ? S.ChargeStatusCharge
      : rack.charge_status === "Discharge"
        ? S.ChargeStatusDischarge
        : S.ChargeStatusIdle;

  return (
    <S.Popover
      style={{ position: "fixed", left: x + 20, top: y - 10, zIndex: 1000 }}
    >
      <S.PopoverContent>
        <S.PopoverHeader>
          <S.PopoverHeaderStrong>{rack.name}</S.PopoverHeaderStrong>
          <StatusBadgeComponent>{rack.status}</StatusBadgeComponent>
        </S.PopoverHeader>
        <S.PopoverBody>
          <S.PopoverRow>
            <span>🔋 Charge Status:</span>
            <ChargeStatusComponent>{rack.charge_status}</ChargeStatusComponent>
          </S.PopoverRow>
          <S.PopoverRow>
            <span>📊 SoC:</span>
            <S.PopoverRowStrong>
              {rack.soc?.toFixed(1) || "N/A"}%
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span>💪 SoH:</span>
            <S.PopoverRowStrong>
              {rack.soh?.toFixed(1) || "N/A"}%
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span>⚡ Voltage:</span>
            <S.PopoverRowStrong>
              {rack.voltage?.toFixed(1) || "N/A"} V
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span>🔌 Current:</span>
            <S.PopoverRowStrong>
              {rack.current?.toFixed(1) || "N/A"} A
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span>💪 Power:</span>
            <S.PopoverRowStrong>
              {rack.power_kw?.toFixed(1) || "N/A"} kW
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span>🌡️ Temperature:</span>
            <S.PopoverRowStrong>
              {rack.temperature?.toFixed(1) || "N/A"} °C
            </S.PopoverRowStrong>
          </S.PopoverRow>
        </S.PopoverBody>
      </S.PopoverContent>
    </S.Popover>
  );
};
