// src/modules/control/components/ControlPanel.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useSetPower } from "../hooks/useSetPower";
import { useLogStore } from "../../../stores/LogStore";

export type ControlOperationMode = "TIMER" | "CONTINUOUS";

interface ControlPanelProps {
  /** Şu anki sistem durumu (Charge/Discharge/Idle) - dışarıdan gelecek */
  currentChargeStatus: "Charge" | "Discharge" | "Idle";
  /** Komut gönderildikten sonra çağrılacak callback */
  onCommandSent?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentChargeStatus,
  onCommandSent,
}) => {
  const { mutate: setPower, isPending: isPowerSending } = useSetPower();
  const { addLog } = useLogStore();

  // State'ler
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [operationMode, setOperationMode] =
    useState<ControlOperationMode>("CONTINUOUS");
  const [powerKw, setPowerKw] = useState<number>(50);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [activeCommand, setActiveCommand] = useState<{
    isActive: boolean;
    remainingSeconds?: number;
  } | null>(null);
  const [timerInterval, setTimerInterval] = useState<number | null>(null);

  // Dışarıdan gelen currentChargeStatus'e göre buton durumları
  const isCharging = currentChargeStatus === "Charge";
  const isDischarging = currentChargeStatus === "Discharge";
  const isIdle = currentChargeStatus === "Idle";

  const isChargeDisabled = isPowerSending || isCharging;
  const isDischargeDisabled = isPowerSending || isDischarging;
  const isIdleDisabled = isPowerSending || isIdle;

  // Komut gönderildiğinde timer'ı temizle
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

  const sendIdleCommand = useCallback(() => {
    setPower(
      { chargeStatus: "Idle", powerKw: 0, durationSeconds: 0 },
      {
        onSuccess: () => {
          setActiveCommand(null);
          onCommandSent?.();
        },
      },
    );
  }, [setPower, onCommandSent]);

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
    (chargeStatus: "Charge" | "Discharge") => {
      const finalDurationSeconds =
        operationMode === "TIMER" ? durationSeconds : 31536000;

      setPower(
        { chargeStatus, powerKw, durationSeconds: finalDurationSeconds },
        {
          onSuccess: () => {
            // 🔥 Log ekle
            addLog({
              type: "success",
              source: "command",
              message: `${chargeStatus === "Charge" ? "🔋 ŞARJ" : "⚡ DEŞARJ"} komutu gönderildi. Güç: ${powerKw} kW${operationMode === "TIMER" ? `, Süre: ${durationSeconds} sn` : " (Sürekli mod)"}`,
            });

            setMessage({
              type: "success",
              text:
                operationMode === "TIMER"
                  ? `Tüm rack'ler ${
                      chargeStatus === "Charge" ? "şarja" : "deşarja"
                    } başladı! ${durationSeconds} saniye sonra otomatik duracak.`
                  : `Tüm rack'ler ${
                      chargeStatus === "Charge" ? "şarja" : "deşarja"
                    } başladı! (Sürekli mod)`,
            });

            if (operationMode === "TIMER") {
              startTimer(durationSeconds);
            } else {
              setActiveCommand({ isActive: true });
            }

            setTimeout(() => setMessage(null), 5000);
            onCommandSent?.();
          },
          onError: () => {
            // 🔥 Hata logu ekle
            addLog({
              type: "error",
              source: "command",
              message: `${chargeStatus === "Charge" ? "ŞARJ" : "DEŞARJ"} komutu gönderilemedi! Güç: ${powerKw} kW`,
            });
            setMessage({ type: "error", text: "Komut gönderilemedi!" });
            setTimeout(() => setMessage(null), 3000);
          },
        },
      );
    },
    [
      operationMode,
      durationSeconds,
      powerKw,
      setPower,
      startTimer,
      onCommandSent,
      addLog,
    ],
  );

  const sendStopCommand = useCallback(() => {
    setPower(
      { chargeStatus: "Idle", powerKw: 0, durationSeconds: 0 },
      {
        onSuccess: () => {
          // 🔥 Log ekle
          addLog({
            type: "info",
            source: "command",
            message: "🛑 DURDUR komutu gönderildi. Tüm rack'ler durduruldu.",
          });
          clearTimer();
          setActiveCommand(null);
          setMessage({ type: "info", text: "Tüm rack'ler durduruldu!" });
          setTimeout(() => setMessage(null), 3000);
          onCommandSent?.();
        },
        onError: () => {
          // 🔥 Hata logu ekle
          addLog({
            type: "error",
            source: "command",
            message: "DURDUR komutu gönderilemedi!",
          });
          setMessage({ type: "error", text: "Durdurma başarısız!" });
          setTimeout(() => setMessage(null), 3000);
        },
      },
    );
  }, [setPower, clearTimer, onCommandSent, addLog]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="control-section">
      <h3 className="section-title">🎮 Kontrol Paneli</h3>

      <div className="form-group">
        <label>🎯 Çalışma Modu</label>
        <div className="radio-group">
          <div
            className={`radio-option ${operationMode === "TIMER" ? "active" : ""}`}
            onClick={() => !isPowerSending && setOperationMode("TIMER")}
            style={{
              cursor: isPowerSending ? "not-allowed" : "pointer",
              opacity: isPowerSending ? 0.5 : 1,
            }}
          >
            ⏱️ Timer Modu
          </div>
          <div
            className={`radio-option ${operationMode === "CONTINUOUS" ? "active" : ""}`}
            onClick={() => !isPowerSending && setOperationMode("CONTINUOUS")}
            style={{
              cursor: isPowerSending ? "not-allowed" : "pointer",
              opacity: isPowerSending ? 0.5 : 1,
            }}
          >
            🔄 Sürekli Mod
          </div>
        </div>
      </div>

      {operationMode === "TIMER" && (
        <div className="form-group">
          <label>⏱️ Süre (Saniye)</label>
          <input
            type="number"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            min={1}
            max={28800}
            step={30}
            disabled={isPowerSending}
          />
          <small>Süre dolduğunda otomatik Idle'a geçer.</small>
        </div>
      )}

      <div className="form-group">
        <label>⚡ Güç (kW)</label>
        <input
          type="number"
          value={powerKw}
          onChange={(e) => setPowerKw(Number(e.target.value))}
          min={0}
          max={500}
          step={10}
          disabled={isPowerSending}
        />
      </div>

      <div className="form-group">
        <label>🔘 Kontrol</label>
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={() => sendPowerCommand("Charge")}
            disabled={isChargeDisabled}
          >
            🔋 ŞARJ
          </button>
          <button
            className="btn btn-warning"
            onClick={() => sendPowerCommand("Discharge")}
            disabled={isDischargeDisabled}
          >
            ⚡ DEŞARJ
          </button>
          <button
            className="btn btn-danger"
            onClick={sendStopCommand}
            disabled={isIdleDisabled}
          >
            🛑 DURDUR
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="info-box">
        💡{" "}
        {operationMode === "TIMER"
          ? "Timer modunda süre dolunca otomatik Idle."
          : "Sürekli modda DURDUR butonu ile durdur."}
      </div>

      {activeCommand?.isActive &&
        activeCommand.remainingSeconds !== undefined && (
          <div className="timer-display">
            <div className="time">
              {formatTime(activeCommand.remainingSeconds)}
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>Kalan süre</div>
          </div>
        )}
    </div>
  );
};
