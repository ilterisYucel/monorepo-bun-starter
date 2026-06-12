// apps/web/src/features/control/components/ControlPanel.tsx
import React, { useState, useCallback, useEffect } from "react";
import { TelemetryInput } from "@gd-monorepo/ui";
import { controlApi } from "../services/controlApi";
import { useLogProvider } from "../../../hooks/useLogProvider";
import type { OperationMode } from "../types/control";
import "./ControlPanel.css";

interface ControlPanelProps {
  currentChargeStatus: "Charge" | "Discharge" | "Idle";
  onCommandSent?: () => void;
}

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
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const { addLog } = useLogProvider();

  const isCharging = currentChargeStatus === "Charge";
  const isDischarging = currentChargeStatus === "Discharge";
  const isIdle = currentChargeStatus === "Idle";

  const isChargeDisabled = isLoading || isCharging;
  const isDischargeDisabled = isLoading || isDischarging;
  const isIdleDisabled = isLoading || isIdle;

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const clearTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setActiveCommand(null);
  }, [timerInterval]);

  const sendIdleCommand = useCallback(async () => {
    setIsLoading(true);
    try {
      await controlApi.setPower("Idle", 0, 0);
      addLog({
        type: "success",
        source: "command",
        message: "DURDUR komutu gönderildi. Tüm rack'ler durduruldu.",
      });
      setActiveCommand(null);
      onCommandSent?.();
    } catch (error) {
      addLog({
        type: "error",
        source: "command",
        message: "DURDUR komutu gönderilemedi!",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addLog, onCommandSent]);

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
      setTimerInterval(interval);
    },
    [clearTimer, sendIdleCommand],
  );

  const sendPowerCommand = useCallback(
    async (chargeStatus: "Charge" | "Discharge") => {
      setIsLoading(true);
      const finalDurationSeconds =
        operationMode === "TIMER" ? durationSeconds : 31536000;

      try {
        await controlApi.setPower(chargeStatus, powerKw, finalDurationSeconds);

        addLog({
          type: "success",
          source: "command",
          message: `${chargeStatus === "Charge" ? "ŞARJ" : "DEŞARJ"} komutu gönderildi. Güç: ${powerKw} kW${operationMode === "TIMER" ? `, Süre: ${durationSeconds} sn` : " (Sürekli mod)"}`,
        });

        if (operationMode === "TIMER") {
          startTimer(durationSeconds);
        } else {
          setActiveCommand({ isActive: true });
        }

        onCommandSent?.();
      } catch (error) {
        addLog({
          type: "error",
          source: "command",
          message: `${chargeStatus === "Charge" ? "ŞARJ" : "DEŞARJ"} komutu gönderilemedi! Güç: ${powerKw} kW`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      operationMode,
      durationSeconds,
      powerKw,
      startTimer,
      onCommandSent,
      addLog,
    ],
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="control-panel">
      <h3 className="panel-title">🎮 Kontrol Paneli</h3>

      {/* Çalışma Modu */}
      <div className="form-group">
        <label>🎯 Çalışma Modu</label>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${operationMode === "TIMER" ? "active" : ""}`}
            onClick={() => !isLoading && setOperationMode("TIMER")}
            disabled={isLoading}
          >
            ⏱️ Timer Modu
          </button>
          <button
            className={`mode-btn ${operationMode === "CONTINUOUS" ? "active" : ""}`}
            onClick={() => !isLoading && setOperationMode("CONTINUOUS")}
            disabled={isLoading}
          >
            🔄 Sürekli Mod
          </button>
        </div>
      </div>

      {/* Timer Süresi (sadece Timer modunda) */}
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

      {/* Güç Ayarı */}
      <TelemetryInput
        name="Güç"
        value={powerKw}
        onChange={setPowerKw}
        unit="kW"
        min={0}
        max={500}
        step={10}
        size="small"
        deviceId="x-rack-simulator"
        disabled={isLoading}
      />

      {/* Kontrol Butonları */}
      <div className="form-group">
        <label>🔘 Kontrol</label>
        <div className="control-buttons">
          <button
            className="btn-charge"
            onClick={() => sendPowerCommand("Charge")}
            disabled={isChargeDisabled}
          >
            🔋 ŞARJ
          </button>
          <button
            className="btn-discharge"
            onClick={() => sendPowerCommand("Discharge")}
            disabled={isDischargeDisabled}
          >
            ⚡ DEŞARJ
          </button>
          <button
            className="btn-stop"
            onClick={sendIdleCommand}
            disabled={isIdleDisabled}
          >
            🛑 DURDUR
          </button>
        </div>
      </div>

      {/* Timer Display */}
      {activeCommand?.isActive &&
        activeCommand.remainingSeconds !== undefined && (
          <div className="timer-display">
            <div className="timer-ring">
              <div className="timer-time">
                {formatTime(activeCommand.remainingSeconds)}
              </div>
              <div className="timer-label">Kalan Süre</div>
            </div>
          </div>
        )}
    </div>
  );
};
