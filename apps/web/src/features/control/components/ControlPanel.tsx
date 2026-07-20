import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { TelemetryInput, SCADA_ICONS } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { controlApi } from "../services/controlApi";
import { useLogProvider } from "../../../hooks/useLogProvider";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { OperationMode } from "../types/control";
import type { ChargeStatus } from "@gd-monorepo/shared-types";
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
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack").map((d) => d.id),
    [devices],
  );

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
    try {
      const { results } = await controlApi.executeMulti(
        bscIds.map((id) => ({ deviceId: id, command: "stop" })),
      );
      const allOk = results.every((r) => r.success);
      if (allOk) {
        toast.success(`DURDUR: ${bscIds.length} cihaz ✅`);
        addLog({ type: "success", source: "user", message: `DURDUR: ${bscIds.length} cihaz ✅` });
      } else {
        for (const r of results) {
          if (!r.success) {
            toast.error(`${r.deviceId}: DURDUR başarısız ❌ — ${r.reason}`);
            addLog({ type: "error", source: "user", message: `${r.deviceId}: DURDUR başarısız — ${r.reason}` });
          }
        }
      }
      setActiveCommand(null);
      onCommandSent?.();
    } catch {
      toast.error("DURDUR gönderilemedi!");
    } finally {
      setIsLoading(false);
    }
  }, [onCommandSent, bscIds, addLog]);

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

      try {
        const { results } = await controlApi.executeMulti(
          bscIds.map((id) => ({ deviceId: id, command, params: { powerKw } })),
        );

        const allOk = results.every((r) => r.success);

        if (allOk) {
          toast.success(`${command === "charge" ? "ŞARJ" : "DEŞARJ"}: ${bscIds.length} cihaz ✅ (${powerKw} kW)`);
          addLog({ type: "success", source: "user", message: `${command === "charge" ? "ŞARJ" : "DEŞARJ"}: ${bscIds.length} cihaz ✅ (${powerKw} kW)` });
        } else {
          for (const r of results) {
            if (!r.success) {
              toast.error(`${r.deviceId}: ${command === "charge" ? "ŞARJ" : "DEŞARJ"} başarısız ❌ — ${r.reason}`);
              addLog({ type: "error", source: "user", message: `${r.deviceId}: ${command === "charge" ? "ŞARJ" : "DEŞARJ"} başarısız — ${r.reason}` });
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
        toast.error(`${command === "charge" ? "ŞARJ" : "DEŞARJ"} gönderilemedi!`);
      } finally {
        setIsLoading(false);
      }
    },
    [operationMode, durationSeconds, powerKw, startTimer, onCommandSent, bscIds, addLog],
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
          deviceId={bscIds.length > 0 ? bscIds.join(", ") : undefined}
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