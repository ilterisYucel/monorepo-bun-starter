import React, { useState } from "react";
import { COLORS, SCADA_ICONS } from "@gd-monorepo/ui";
import { useFireAlarmData } from "../features/fire/hooks/useFireAlarmData";
import * as S from "./FirePanelPage.styles";

const FireIcon = SCADA_ICONS.fireAlarm;
const StatusOk = SCADA_ICONS.statusOnline;
const StatusFault = SCADA_ICONS.statusOffline;
const WarningIcon = SCADA_ICONS.logWarning;
const StopIcon = SCADA_ICONS.stop;
const PauseIcon = SCADA_ICONS.statusIdle;
const RefreshIcon = SCADA_ICONS.refresh;

export const FirePanelPage: React.FC = () => {
  const { state, isLoading, sendCommand } = useFireAlarmData();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (isLoading) {
    return <S.Loading>Yukleniyor...</S.Loading>;
  }

  const systemOk = !state.fault && !state.fire && !state.firstStage && !state.secondStage;
  const systemFire = state.fire || state.localFire;
  const systemFault = state.fault;

  const handleCommand = (cmd: string, dangerous?: boolean): void => {
    if (dangerous && confirming !== cmd) {
      setConfirming(cmd);
      return;
    }
    sendCommand(cmd);
    setConfirming(null);
  };

  return (
    <S.Container>
      <S.TopCards>
        <S.StatusCard $variant={systemOk ? "ok" : "alarm"}>
          <S.CardIcon><StatusOk size={32} /></S.CardIcon>
          <S.CardValue $variant={systemOk ? "ok" : "alarm"}>
            {systemOk ? "Normal" : "IKAZ"}
          </S.CardValue>
          <S.CardLabel $variant={systemOk ? "ok" : "alarm"}>
            Sistem Durumu
          </S.CardLabel>
        </S.StatusCard>

        <S.StatusCard $variant={systemFire ? "alarm" : "ok"}>
          <S.CardIcon><WarningIcon size={32} /></S.CardIcon>
          <S.CardValue $variant={systemFire ? "alarm" : "ok"}>
            {systemFire ? "YANGIN" : "Yok"}
          </S.CardValue>
          <S.CardLabel $variant={systemFire ? "alarm" : "ok"}>
            Yangın Durumu
          </S.CardLabel>
        </S.StatusCard>

        <S.StatusCard $variant={systemFault ? "fault" : "ok"}>
          <S.CardIcon><StatusFault size={32} /></S.CardIcon>
          <S.CardValue $variant={systemFault ? "fault" : "ok"}>
            {systemFault ? "VAR" : "Yok"}
          </S.CardValue>
          <S.CardLabel $variant={systemFault ? "fault" : "ok"}>
            Arıza Durumu
          </S.CardLabel>
        </S.StatusCard>
      </S.TopCards>

      <S.RelayGrid>
        <RelayItem label="1. Kademe" active={state.firstStage} />
        <RelayItem label="2. Kademe" active={state.secondStage} />
        <RelayItem label="Salım" active={state.discharged} />
        <RelayItem label="Tahliye" active={state.extract} />
        <RelayItem label="Beklet" active={state.hold} />
        <RelayItem label="İptal" active={state.abort} />
        <RelayItem label="Mod Oto" active={state.modeAuto} inverted />
        <RelayItem label="Yerel Yangın" active={state.localFire} />
        <RelayItem label="Sıfırlama" active={state.reset} />
        <RelayItem label="Arıza" active={state.fault} inverted />
        <RelayItem label="Yangın" active={state.fire} />
      </S.RelayGrid>

      {confirming === "manual_release" && (
        <S.ConfirmText>
          &#9888; Manuel salım başlatılacak! Bu işlem yangın söndürme sistemini
          tetikler. Emin misiniz?
        </S.ConfirmText>
      )}

      <S.ControlsRow>
        {confirming === "manual_release" ? (
          <>
            <S.CmdButton $dangerous onClick={() => handleCommand("manual_release")}>
              <StopIcon size={16} /> Salımı Onayla
            </S.CmdButton>
            <S.CmdButton onClick={() => setConfirming(null)}>
              Vazgeç
            </S.CmdButton>
          </>
        ) : (
          <S.CmdButton $dangerous onClick={() => handleCommand("manual_release", true)}>
            <StopIcon size={16} /> Manuel Salım
          </S.CmdButton>
        )}
        <S.CmdButton onClick={() => handleCommand("hold")}>
          <PauseIcon size={16} /> Beklet
        </S.CmdButton>
        <S.CmdButton onClick={() => handleCommand("abort")}>
          <StopIcon size={16} /> İptal
        </S.CmdButton>
        <S.CmdButton onClick={() => handleCommand("mode_toggle")}>
          <RefreshIcon size={16} /> Mod Değiştir
        </S.CmdButton>
      </S.ControlsRow>
    </S.Container>
  );
};

const RelayItem: React.FC<{ label: string; active: boolean; inverted?: boolean }> = ({
  label,
  active,
  inverted,
}) => (
  <S.RelayRow>
    <S.RelayDot $active={active} $inverted={inverted} />
    <S.RelayLabel>{label}</S.RelayLabel>
    <S.RelayValue $active={active}>
      {inverted
        ? active
          ? "Normal"
          : "Arıza"
        : active
          ? "Aktif"
          : "Pasif"}
    </S.RelayValue>
  </S.RelayRow>
);
