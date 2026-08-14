import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import type { FirePanelCardProps, FirePanelCardLabels } from "./FirePanelCard.types";
import * as S from "./FirePanelCard.styles";

const DEFAULT_TR: FirePanelCardLabels = {
  online: "Çevrimiçi",
  normal: "Normal",
  warning: "Uyarı",
  alarm: "Alarm",
  fireDetected: "Yangın Var",
  fireNone: "Yangın Yok",
  faultExists: "Arıza Var",
  faultNone: "Arıza Yok",
  firstStage: "1. Kademe",
  secondStage: "2. Kademe",
  discharged: "Deşarj",
  extract: "Extract",
  hold: "Hold",
  abort: "İptal",
  modeAuto: "Otomatik",
  localFire: "Yerel Yangın",
  reset: "Reset",
  detail: "Detay Göster",
};

const Relay: React.FC<{ label: string; active: boolean; inverted?: boolean; activeLabel: string; inactiveLabel: string }> = ({
  label, active, inverted, activeLabel, inactiveLabel,
}) => (
  <S.RelayItem>
    <S.RelayDot $active={active} $inverted={inverted} />
    <S.RelayLabel>{label}</S.RelayLabel>
    <S.RelayValue $active={active}>{active ? activeLabel : inactiveLabel}</S.RelayValue>
  </S.RelayItem>
);

export const FirePanelCard: React.FC<FirePanelCardProps> = ({
  deviceId, state, onDetailClick, labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const systemOk = !state.fault && !state.fire && !state.firstStage && !state.secondStage;

  return (
    <S.Card>
      <S.Header>
        <S.Name>{deviceId}</S.Name>
        <S.Badges>
          {systemOk ? (
            <S.BadgeOk><SCADA_ICONS.statusOnline size={14} color={COLORS.success} /> {L.normal}</S.BadgeOk>
          ) : (
            <S.BadgeAlarm><SCADA_ICONS.logWarning size={14} /> {L.warning}</S.BadgeAlarm>
          )}
        </S.Badges>
      </S.Header>

      <S.RelayGrid>
        <Relay label={L.firstStage} active={state.firstStage} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.secondStage} active={state.secondStage} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.discharged} active={state.discharged} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.extract} active={state.extract} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.hold} active={state.hold} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.abort} active={state.abort} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.modeAuto} active={state.modeAuto} inverted activeLabel={L.normal} inactiveLabel={L.faultExists} />
        <Relay label={L.localFire} active={state.localFire} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.reset} active={state.reset} activeLabel={L.alarm} inactiveLabel={L.normal} />
        <Relay label={L.faultExists} active={state.fault} inverted activeLabel={L.normal} inactiveLabel={L.faultExists} />
        <Relay label={L.fireDetected} active={state.fire} activeLabel={L.alarm} inactiveLabel={L.normal} />
      </S.RelayGrid>

      {onDetailClick && (
        <S.DetailButton onClick={onDetailClick}>{L.detail}</S.DetailButton>
      )}
    </S.Card>
  );
};

FirePanelCard.displayName = "FirePanelCard";
