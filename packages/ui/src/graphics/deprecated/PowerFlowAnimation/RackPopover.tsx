// packages/ui/src/components/PowerFlowAnimation/RackPopover.tsx
import React from "react";
import { SCADA_ICONS } from "../../../icons";
import * as S from "./PowerFlowAnimation.styles";
import type { Rack } from "../../../types";

const BatteryIcon = SCADA_ICONS.batteryCharge;
const SoCIcon = SCADA_ICONS.charts;
const SoHIcon = SCADA_ICONS.health;
const VoltageIcon = SCADA_ICONS.batteryDischarge;
const CurrentIcon = SCADA_ICONS.powerPlug;
const PowerIcon = SCADA_ICONS.batteryDischarge;
const TempIcon = SCADA_ICONS.temperature;

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
    <S.Popover style={{ left: x + 20, top: y - 10 }}>
      <S.PopoverContent>
        <S.PopoverHeader>
          <S.PopoverHeaderStrong>{rack.name}</S.PopoverHeaderStrong>
          <StatusBadgeComponent>{rack.status}</StatusBadgeComponent>
        </S.PopoverHeader>
        <S.PopoverBody>
          <S.PopoverRow>
            <span><BatteryIcon size={14} /> Charge Status:</span>
            <ChargeStatusComponent>{rack.charge_status}</ChargeStatusComponent>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><SoCIcon size={14} /> SoC:</span>
            <S.PopoverRowStrong>
              {rack.soc?.toFixed(1) || "N/A"}%
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><SoHIcon size={14} /> SoH:</span>
            <S.PopoverRowStrong>
              {rack.soh?.toFixed(1) || "N/A"}%
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><VoltageIcon size={14} /> Voltage:</span>
            <S.PopoverRowStrong>
              {rack.voltage?.toFixed(1) || "N/A"} V
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><CurrentIcon size={14} /> Current:</span>
            <S.PopoverRowStrong>
              {rack.current?.toFixed(1) || "N/A"} A
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><PowerIcon size={14} /> Power:</span>
            <S.PopoverRowStrong>
              {rack.power_kw?.toFixed(1) || "N/A"} kW
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><TempIcon size={14} /> Temperature:</span>
            <S.PopoverRowStrong>
              {rack.temperature?.toFixed(1) || "N/A"} °C
            </S.PopoverRowStrong>
          </S.PopoverRow>
        </S.PopoverBody>
      </S.PopoverContent>
    </S.Popover>
  );
};