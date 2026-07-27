import React, { useEffect, useRef, useState } from "react";
import { SCADA_ICONS, COLORS } from "@gd-monorepo/ui";
import type { ChargeStatus } from "@gd-monorepo/shared-types";
import * as S from "./SystemHeader.styles";

interface SystemHeaderProps {
  containerId?: string;
  flowDirection?: ChargeStatus;
  ppcConnected?: boolean;
  powerConsumption?: number;
  ambientTemp?: number;
  ambientHumidity?: number;
}

const ChargeIcon = SCADA_ICONS.batteryCharge;
const DischargeIcon = SCADA_ICONS.batteryDischarge;
const IdleIcon = SCADA_ICONS.statusIdle;
const ContainerIcon = SCADA_ICONS.container;
const OnlineIcon = SCADA_ICONS.statusOnline;
const OfflineIcon = SCADA_ICONS.statusOffline;
const ClockIcon = SCADA_ICONS.timer;
const PowerIcon = SCADA_ICONS.batteryDischarge;
const TempIcon = SCADA_ICONS.temperature;
const MenuIcon = SCADA_ICONS.menu;

const powerColor = (kw: number): string => {
  if (kw > 300) return COLORS.error;
  if (kw > 100) return COLORS.warning;
  return COLORS.success;
};

const formatClock = (d: Date): string =>
  d.toLocaleString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const Boxes: React.FC<{
  containerId: string;
  flowDirection: ChargeStatus;
  ppcConnected: boolean;
  powerConsumption: number;
  now: Date;
  ambientTemp?: number;
  ambientHumidity?: number;
}> = ({ containerId, flowDirection, ppcConnected, powerConsumption, now, ambientTemp, ambientHumidity }) => {
  const chargeLabel =
    flowDirection === "Charge" ? "Şarj Oluyor"
    : flowDirection === "Discharge" ? "Deşarj Oluyor"
    : "Beklemede";

  const ChargeStatusIcon =
    flowDirection === "Charge" ? ChargeIcon
    : flowDirection === "Discharge" ? DischargeIcon
    : IdleIcon;

  const chargeColor =
    flowDirection === "Charge" ? COLORS.success
    : flowDirection === "Discharge" ? COLORS.warning
    : COLORS.idle;

  const PPCIcon = ppcConnected ? OnlineIcon : OfflineIcon;
  const ppcColor = ppcConnected ? COLORS.success : COLORS.error;
  const ppcLabel = ppcConnected ? "PPC: Bağlı" : "PPC: Bağlantı Yok";

  const kwColor = powerColor(powerConsumption);

  return (
    <>
      <S.Box>
        <ChargeStatusIcon size={16} color={chargeColor} />
        <S.Label style={{ color: chargeColor }}>{chargeLabel}</S.Label>
      </S.Box>
      <S.Box>
        <ContainerIcon size={16} />
        <S.Label>Container: {containerId}</S.Label>
      </S.Box>
      <S.Box>
        <PPCIcon size={16} color={ppcColor} />
        <S.Label style={{ color: ppcColor }}>{ppcLabel}</S.Label>
      </S.Box>
      <S.Box>
        <ClockIcon size={16} />
        <S.Mono>{formatClock(now)}</S.Mono>
      </S.Box>
      <S.Box>
        <PowerIcon size={16} color={kwColor} />
        <S.Label style={{ color: kwColor }}>Guc Tuketimi: {powerConsumption} kW</S.Label>
      </S.Box>
      {ambientTemp !== undefined && (
        <S.Box>
          <TempIcon size={16} />
          <S.Label>Ortam: {ambientTemp.toFixed(1)}°C</S.Label>
        </S.Box>
      )}
      {ambientHumidity !== undefined && (
        <S.Box>
          <TempIcon size={16} />
          <S.Label>Nem: {ambientHumidity.toFixed(0)}%</S.Label>
        </S.Box>
      )}
    </>
  );
};

export const SystemHeader: React.FC<SystemHeaderProps> = ({
  containerId = "EMS",
  flowDirection = "Idle",
  ppcConnected = false,
  powerConsumption = 0,
  ambientTemp,
  ambientHumidity,
}) => {
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <S.Bar>
      <S.Grid>
        <Boxes
          containerId={containerId}
          flowDirection={flowDirection}
          ppcConnected={ppcConnected}
          powerConsumption={powerConsumption}
          now={now}
          ambientTemp={ambientTemp}
          ambientHumidity={ambientHumidity}
        />
      </S.Grid>
      <S.Hamburger ref={menuRef}>
        <S.HamburgerBtn onClick={() => setMenuOpen((v) => !v)}>
          <MenuIcon size={18} />
        </S.HamburgerBtn>
        {menuOpen && (
          <S.Popup>
            <Boxes
              containerId={containerId}
              flowDirection={flowDirection}
              ppcConnected={ppcConnected}
              powerConsumption={powerConsumption}
              now={now}
              ambientTemp={ambientTemp}
              ambientHumidity={ambientHumidity}
            />
          </S.Popup>
        )}
      </S.Hamburger>
    </S.Bar>
  );
};