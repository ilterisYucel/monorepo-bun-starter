import React, { useEffect, useRef } from "react";
import { SCADA_ICONS } from "../../icons";
import type { Rack } from "../../types";
import * as S from "./RackInfoPopover.styles";

const BatteryIcon = SCADA_ICONS.batteryCharge;
const SoCIcon = SCADA_ICONS.charts;
const SoHIcon = SCADA_ICONS.health;
const VoltageIcon = SCADA_ICONS.batteryDischarge;
const CurrentIcon = SCADA_ICONS.powerPlug;
const PowerIcon = SCADA_ICONS.batteryDischarge;
const TempIcon = SCADA_ICONS.temperature;

export interface RackInfoPopoverProps {
  rack: Rack;
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
}

export const RackInfoPopover: React.FC<RackInfoPopoverProps> = ({
  rack,
  x,
  y,
  visible,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, onClose]);

  if (!visible || !rack) return null;

  const isOnline = rack.status === "online";

  let chargeLabel: string;
  let ChargeBadge: React.FC<{ children: React.ReactNode }>;
  if (rack.charge_status === "Charge") {
    chargeLabel = "CHARGE";
    ChargeBadge = ({ children }) => <S.ChargeStatusCharge>{children}</S.ChargeStatusCharge>;
  } else if (rack.charge_status === "Discharge") {
    chargeLabel = "DISCHARGE";
    ChargeBadge = ({ children }) => <S.ChargeStatusDischarge>{children}</S.ChargeStatusDischarge>;
  } else {
    chargeLabel = "IDLE";
    ChargeBadge = ({ children }) => <S.ChargeStatusIdle>{children}</S.ChargeStatusIdle>;
  }

  return (
    <S.Popover ref={ref} style={{ left: x + 16, top: y - 8 }}>
      <S.PopoverContent>
        <S.PopoverHeader>
          <S.PopoverHeaderStrong>{rack.name}</S.PopoverHeaderStrong>
          {isOnline ? (
            <S.StatusBadgeOnline>Online</S.StatusBadgeOnline>
          ) : (
            <S.StatusBadgeOffline>Offline</S.StatusBadgeOffline>
          )}
        </S.PopoverHeader>

        <S.PopoverBody>
          <S.PopoverRow>
            <span><BatteryIcon size={14} /> Charge Status:</span>
            <ChargeBadge>{chargeLabel}</ChargeBadge>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><SoCIcon size={14} /> SoC:</span>
            <S.PopoverRowStrong>
              {rack.soc?.toFixed(1) ?? "N/A"}%
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><SoHIcon size={14} /> SoH:</span>
            <S.PopoverRowStrong>
              {rack.soh?.toFixed(1) ?? "N/A"}%
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><VoltageIcon size={14} /> Voltage:</span>
            <S.PopoverRowStrong>
              {rack.voltage?.toFixed(1) ?? "N/A"} V
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><CurrentIcon size={14} /> Current:</span>
            <S.PopoverRowStrong>
              {rack.current?.toFixed(1) ?? "N/A"} A
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><PowerIcon size={14} /> Power:</span>
            <S.PopoverRowStrong>
              {rack.power_kw?.toFixed(1) ?? "N/A"} kW
            </S.PopoverRowStrong>
          </S.PopoverRow>
          <S.PopoverRow>
            <span><TempIcon size={14} /> Temperature:</span>
            <S.PopoverRowStrong>
              {rack.temperature?.toFixed(1) ?? "N/A"} °C
            </S.PopoverRowStrong>
          </S.PopoverRow>
        </S.PopoverBody>
      </S.PopoverContent>
    </S.Popover>
  );
};

RackInfoPopover.displayName = "RackInfoPopover";
