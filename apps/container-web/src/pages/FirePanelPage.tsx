import React, { useState } from "react";
import { SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";
import { useFireAlarmData } from "../features/fire/hooks/useFireAlarmData";
import * as S from "./FirePanelPage.styles";

const StatusOk = SCADA_ICONS.statusOnline;
const StatusFault = SCADA_ICONS.statusOffline;
const WarningIcon = SCADA_ICONS.logWarning;
const StopIcon = SCADA_ICONS.stop;
const PauseIcon = SCADA_ICONS.statusIdle;
const RefreshIcon = SCADA_ICONS.refresh;

interface RelayItemProps {
  label: string;
  active: boolean;
  inverted?: boolean;
  activeLabel: string;
  inactiveLabel: string;
}

const RelayItem: React.FC<RelayItemProps> = ({
  label,
  active,
  inverted,
  activeLabel,
  inactiveLabel,
}) => (
  <S.RelayRow>
    <S.RelayDot $active={active} $inverted={inverted} />
    <S.RelayLabel>{label}</S.RelayLabel>
    <S.RelayValue $active={active}>
      {active ? activeLabel : inactiveLabel}
    </S.RelayValue>
  </S.RelayRow>
);

export const FirePanelPage: React.FC = () => {
  const { state, isLoading, sendCommand } = useFireAlarmData();
  const [confirming, setConfirming] = useState<string | null>(null);
  const { t } = useTranslation();

  if (isLoading) {
    return <S.Loading>{t("common.loading")}</S.Loading>;
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

  const activeLabel = t("status.active");
  const inactiveLabel = t("status.inactive");
  const normalLabel = t("status.normal");
  const faultLabel = t("status.error");

  return (
    <S.Container>
      <S.TopCards>
        <S.StatusCard $variant={systemOk ? "ok" : "alarm"}>
          <S.CardIcon><StatusOk size={32} /></S.CardIcon>
          <S.CardValue $variant={systemOk ? "ok" : "alarm"}>
            {systemOk ? t("status.normal") : t("status.warning")}
          </S.CardValue>
          <S.CardLabel $variant={systemOk ? "ok" : "alarm"}>
            {t("fire.systemStatus")}
          </S.CardLabel>
        </S.StatusCard>

        <S.StatusCard $variant={systemFire ? "alarm" : "ok"}>
          <S.CardIcon><WarningIcon size={32} /></S.CardIcon>
          <S.CardValue $variant={systemFire ? "alarm" : "ok"}>
            {systemFire ? t("fire.status.fire") : t("fire.status.none")}
          </S.CardValue>
          <S.CardLabel $variant={systemFire ? "alarm" : "ok"}>
            {t("fire.status.fireCondition")}
          </S.CardLabel>
        </S.StatusCard>

        <S.StatusCard $variant={systemFault ? "fault" : "ok"}>
          <S.CardIcon><StatusFault size={32} /></S.CardIcon>
          <S.CardValue $variant={systemFault ? "fault" : "ok"}>
            {systemFault ? t("fire.status.exists") : t("fire.status.none")}
          </S.CardValue>
          <S.CardLabel $variant={systemFault ? "fault" : "ok"}>
            {t("fire.status.error")}
          </S.CardLabel>
        </S.StatusCard>
      </S.TopCards>

      <S.RelayGrid>
        <RelayItem label={t("fire.relay.firstStage")} active={state.firstStage} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.secondStage")} active={state.secondStage} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.discharged")} active={state.discharged} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.extract")} active={state.extract} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.hold")} active={state.hold} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.cancel")} active={state.abort} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.modeAuto")} active={state.modeAuto} inverted activeLabel={normalLabel} inactiveLabel={faultLabel} />
        <RelayItem label={t("fire.relay.localFire")} active={state.localFire} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.reset")} active={state.reset} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
        <RelayItem label={t("fire.relay.fault")} active={state.fault} inverted activeLabel={normalLabel} inactiveLabel={faultLabel} />
        <RelayItem label={t("fire.relay.fire")} active={state.fire} activeLabel={activeLabel} inactiveLabel={inactiveLabel} />
      </S.RelayGrid>

      {confirming === "manual_release" && (
        <S.ConfirmText>
          &#9888; {t("fire.confirmReleaseFull")}
        </S.ConfirmText>
      )}

      <S.ControlsRow>
        {confirming === "manual_release" ? (
          <>
            <S.CmdButton $dangerous onClick={() => handleCommand("manual_release")}>
              <StopIcon size={16} /> {t("fire.confirmButton")}
            </S.CmdButton>
            <S.CmdButton onClick={() => setConfirming(null)}>
              {t("fire.cancelButton")}
            </S.CmdButton>
          </>
        ) : (
          <S.CmdButton $dangerous onClick={() => handleCommand("manual_release", true)}>
            <StopIcon size={16} /> {t("fire.manualRelease")}
          </S.CmdButton>
        )}
        <S.CmdButton onClick={() => handleCommand("hold")}>
          <PauseIcon size={16} /> {t("fire.button.hold")}
        </S.CmdButton>
        <S.CmdButton onClick={() => handleCommand("abort")}>
          <StopIcon size={16} /> {t("fire.cancel")}
        </S.CmdButton>
        <S.CmdButton onClick={() => handleCommand("mode_toggle")}>
          <RefreshIcon size={16} /> {t("fire.button.modeToggle")}
        </S.CmdButton>
      </S.ControlsRow>
    </S.Container>
  );
};
