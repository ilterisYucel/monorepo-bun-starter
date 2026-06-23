import React, { useEffect, useRef, useState } from "react";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import * as S from "./SystemHeader.styles";

interface SystemHeaderProps {
  containerId?: string;
  flowDirection?: "Charge" | "Discharge" | "Idle";
  ppcConnected?: boolean;
  powerConsumption?: number;
}

const ChargeIcon = SCADA_ICONS.batteryCharge;
const DischargeIcon = SCADA_ICONS.batteryDischarge;
const IdleIcon = SCADA_ICONS.statusIdle;
const ContainerIcon = SCADA_ICONS.container;
const OnlineIcon = SCADA_ICONS.statusOnline;
const OfflineIcon = SCADA_ICONS.statusOffline;
const ClockIcon = SCADA_ICONS.timer;
const PowerIcon = SCADA_ICONS.batteryDischarge;
const MenuIcon = SCADA_ICONS.menu;

const powerColor = (kw: number): string => {
  if (kw > 300) return "#ef4444";
  if (kw > 100) return "#f59e0b";
  return "#10b981";
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
  flowDirection: "Charge" | "Discharge" | "Idle";
  ppcConnected: boolean;
  powerConsumption: number;
  now: Date;
}> = ({ containerId, flowDirection, ppcConnected, powerConsumption, now }) => {
  const chargeLabel =
    flowDirection === "Charge" ? "Şarj Oluyor"
    : flowDirection === "Discharge" ? "Deşarj Oluyor"
    : "Beklemede";

  const ChargeStatusIcon =
    flowDirection === "Charge" ? ChargeIcon
    : flowDirection === "Discharge" ? DischargeIcon
    : IdleIcon;

  const chargeColor =
    flowDirection === "Charge" ? "#10b981"
    : flowDirection === "Discharge" ? "#f59e0b"
    : "#6b7280";

  const PPCIcon = ppcConnected ? OnlineIcon : OfflineIcon;
  const ppcColor = ppcConnected ? "#10b981" : "#ef4444";
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
        <S.Label style={{ color: kwColor }}>Güç Tüketimi: {powerConsumption} kW</S.Label>
      </S.Box>
    </>
  );
};

export const SystemHeader: React.FC<SystemHeaderProps> = ({
  containerId = "EMS",
  flowDirection = "Idle",
  ppcConnected = false,
  powerConsumption = 0,
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
            />
          </S.Popup>
        )}
      </S.Hamburger>
    </S.Bar>
  );
};