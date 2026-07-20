import React, { useState, useCallback, useEffect, useRef } from "react";
import { TelemetryInput, SCADA_ICONS } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { controlApi } from "../services/controlApi";
import { useLogProvider } from "../../../hooks/useLogProvider";
import { MANEUVERS } from "../maneuvers";
import type { OperationMode } from "../types/control";
import type { ChargeStatus, ManeuverConfig } from "@gd-monorepo/shared-types";
import * as S from "./ControlPanel.styles";

interface ControlPanelProps {
  currentChargeStatus: ChargeStatus;
  onCommandSent?: () => void;
}

const ControlIcon = SCADA_ICONS.control;
const TimerIcon = SCADA_ICONS.timer;
const RepeatIcon = SCADA_ICONS.continuous;
const ChargeIcon = SCADA_ICONS.batteryCharge;
const DischargeIcon = SCADA_ICONS.batteryDischarge;
const StopIcon = SCADA_ICONS.stop;

const executeManeuver = async (m: ManeuverConfig, params?: Record<string, unknown>) => {
  const steps = m.steps.map((s) => ({
    deviceId: s.deviceId,
    command: s.command ?? "",
    params: params ?? s.params ?? {},
  }));
  return controlApi.executeMulti(steps, m.mode);
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentChargeStatus,
  onCommandSent,
}) => {
  const [operationMode, setOperationMode] =
    useState<OperationMode>("CONTINUOUS");
  const [powerKw, setPowerKw] = useState<number>(50);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCommand, setActiveCommand] = useState<{
    isActive: boolean;
    remainingSeconds?: number;
  } | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addLog } = useLogProvider();

  const isCharging = currentChargeStatus === "Charge";
  const isDischarging = currentChargeStatus === "Discharge";
  const isIdle = currentChargeStatus === "Idle";

  const isChargeDisabled = isLoading || isCharging;
  const isDischargeDisabled = isLoading || isDischarging;
  const isIdleDisabled = isLoading || isIdle;

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setActiveCommand(null);
  }, []);

  const sendIdleCommand = useCallback(async () => {
    setIsLoading(true);
    const m = MANEUVERS.fl_idle;
    if (!m) return;
    try {
      const { results } = await executeManeuver(m);
      const allOk = results.every((r) => r.success);
      if (allOk) {
        toast.success(`${m.label}: ${results.length} cihaz ✅`);
        addLog({ type: "success", source: "user", message: `${m.label}: ${results.length} cihaz ✅` });
      } else {
        for (const r of results) {
          if (!r.success) {
            toast.error(`${r.deviceId}: ${m.label} başarısız ❌ — ${r.reason}`);
            addLog({ type: "error", source: "user", message: `${r.deviceId}: ${m.label} başarısız — ${r.reason}` });
          }
        }
      }
      setActiveCommand(null);
      onCommandSent?.();
    } catch {
      toast.error(`${m.label} gönderilemedi!`);
    } finally {
      setIsLoading(false);
    }
  }, [onCommandSent, addLog]);

  const startTimer = useCallback(
    (seconds: number) => {
      clearTimer();
      setActiveCommand({ isActive: true, remainingSeconds: seconds });

      const interval = setInterval(() => {
        setActiveCommand((prev) => {
          if (!prev || prev.remainingSeconds === undefined) return null;
          const newRemaining = prev.remainingSeconds - 1;
          if (newRemaining <= 0) {
            clearInterval(interval);
            sendIdleCommand();
            return null;
          }
          return { ...prev, remainingSeconds: newRemaining };
        });
      }, 1000);
      timerIntervalRef.current = interval;
    },
    [clearTimer, sendIdleCommand],
  );

  const sendPowerCommand = useCallback(
    async (command: "charge" | "discharge") => {
      setIsLoading(true);
      const m = MANEUVERS[command === "charge" ? "fl_charge" : "fl_discharge"];
      if (!m) return;

      try {
        const { results } = await executeManeuver(m, { powerKw });
        const allOk = results.every((r) => r.success);

        if (allOk) {
          toast.success(`${m.label}: ${results.length} cihaz ✅ (${powerKw} kW)`);
          addLog({ type: "success", source: "user", message: `${m.label}: ${results.length} cihaz ✅ (${powerKw} kW)` });
        } else {
          for (const r of results) {
            if (!r.success) {
              toast.error(`${r.deviceId}: ${m.label} başarısız ❌ — ${r.reason}`);
              addLog({ type: "error", source: "user", message: `${r.deviceId}: ${m.label} başarısız — ${r.reason}` });
            }
          }
        }

        if (operationMode === "TIMER" && allOk) {
          startTimer(durationSeconds);
        } else if (allOk) {
          setActiveCommand({ isActive: true });
        }

        onCommandSent?.();
      } catch {
        toast.error(`${m.label} gönderilemedi!`);
      } finally {
        setIsLoading(false);
      }
    },
    [operationMode, durationSeconds, powerKw, startTimer, onCommandSent, addLog],
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <S.ControlPanelContainer>
      <S.PanelTitle>
        <ControlIcon size={20} /> Kontrol Paneli
      </S.PanelTitle>

      <S.FormGroup>
        <label>Çalışma Modu</label>
        <S.ModeButtons>
          <S.ModeBtn
            active={operationMode === "TIMER"}
            onClick={() => !isLoading && setOperationMode("TIMER")}
            disabled={isLoading}
          >
            <TimerIcon size={14} /> Timer Modu
          </S.ModeBtn>
          <S.ModeBtn
            active={operationMode === "CONTINUOUS"}
            onClick={() => !isLoading && setOperationMode("CONTINUOUS")}
            disabled={isLoading}
          >
            <RepeatIcon size={14} /> Sürekli Mod
          </S.ModeBtn>
        </S.ModeButtons>
      </S.FormGroup>

      <S.InputsGroup>
        {operationMode === "TIMER" && (
          <TelemetryInput
            name="Süre"
            description="Süre dolduğunda otomatik Idle'a geçer."
            value={durationSeconds}
            onChange={setDurationSeconds}
            unit="sn"
            min={1}
            max={28800}
            step={30}
            size="small"
            disabled={isLoading}
          />
        )}

        <TelemetryInput
          name="Güç"
          value={powerKw}
          onChange={setPowerKw}
          unit="kW"
          min={0}
          max={500}
          step={10}
          size="small"
          disabled={isLoading}
        />
      </S.InputsGroup>

      <S.FormGroup>
        <label>Kontrol</label>
        <S.ControlButtons>
          <S.BtnCharge
            onClick={() => sendPowerCommand("charge")}
            disabled={isChargeDisabled}
          >
            <ChargeIcon size={14} /> ŞARJ
          </S.BtnCharge>
          <S.BtnDischarge
            onClick={() => sendPowerCommand("discharge")}
            disabled={isDischargeDisabled}
          >
            <DischargeIcon size={14} /> DEŞARJ
          </S.BtnDischarge>
          <S.BtnStop
            onClick={sendIdleCommand}
            disabled={isIdleDisabled}
          >
            <StopIcon size={14} /> DURDUR
          </S.BtnStop>
        </S.ControlButtons>
      </S.FormGroup>

      {activeCommand?.isActive &&
        activeCommand.remainingSeconds !== undefined && (
          <S.TimerDisplay>
            <S.TimerRing>
              <S.TimerTime>
                {formatTime(activeCommand.remainingSeconds)}
              </S.TimerTime>
              <S.TimerLabel>Kalan Süre</S.TimerLabel>
            </S.TimerRing>
          </S.TimerDisplay>
        )}
    </S.ControlPanelContainer>
  );
};
