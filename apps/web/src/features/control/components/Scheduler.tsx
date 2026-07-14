import React, { useCallback, useState } from "react";
import { SCADA_ICONS } from "@gd-monorepo/ui";
import { useLogProvider } from "../../../hooks/useLogProvider";
import type { OperationMode } from "../types/control";
import * as S from "./Scheduler.styles";

interface ScheduledCommand {
  id: string;
  datetime: string;
  type: "Charge" | "Discharge";
  powerKw: number;
  operationMode: OperationMode;
  durationSeconds: number;
}

const TimerIcon = SCADA_ICONS.timer;
const ChargeIcon = SCADA_ICONS.batteryCharge;
const DischargeIcon = SCADA_ICONS.batteryDischarge;
const RepeatIcon = SCADA_ICONS.continuous;
const AddIcon = SCADA_ICONS.add;
const TrashIcon = SCADA_ICONS.trash;
const InfoIcon = SCADA_ICONS.logInfo;

export const Scheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [selectedType, setSelectedType] = useState<"Charge" | "Discharge">(
    "Charge",
  );
  const [operationMode, setOperationMode] =
    useState<OperationMode>("CONTINUOUS");
  const [powerKw, setPowerKw] = useState<number>(50);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [scheduledList, setScheduledList] = useState<ScheduledCommand[]>([]);
  const { addLog } = useLogProvider();

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}sn`;
    if (secs === 0) return `${mins}dk`;
    return `${mins}dk ${secs}sn`;
  };

  const handleAddCommand = useCallback(() => {
    if (!selectedDate) return;
    const newCommand: ScheduledCommand = {
      id: Date.now().toString(),
      datetime: new Date(selectedDate).toISOString(),
      type: selectedType,
      powerKw: powerKw,
      operationMode,
      durationSeconds,
    };
    setScheduledList((prev) => {
      const updated = [...prev, newCommand];
      return updated.slice(-200);
    });
    addLog({
      type: "success",
      source: "user",
      message: `Zamanlanmış komut eklendi: ${selectedType === "Charge" ? "Şarj" : "Deşarj"} ${powerKw} kW, Tarih: ${formatDateTime(newCommand.datetime)}${operationMode === "TIMER" ? `, Süre: ${formatDuration(durationSeconds)}` : " (Sürekli)"}`,
    });
  }, [selectedDate, selectedType, powerKw, operationMode, durationSeconds, scheduledList, addLog]);

  const handleDeleteCommand = useCallback((id: string) => {
    setScheduledList(scheduledList.filter((cmd) => cmd.id !== id));
    addLog({
      type: "info",
      source: "user",
      message: `Zamanlanmış komut silindi`,
    });
  }, [scheduledList, addLog]);

  return (
    <S.SchedulerContainer>
      <h4><TimerIcon size={18} /> Komut Zamanlayıcı</h4>

      <S.SchedulerForm>
        <S.FormRow>
          <label>Tarih & Saat:</label>
          <S.DateTimeInput
            type="datetime-local"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </S.FormRow>
        <S.FormRow>
          <label>Komut:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
          >
            <option value="Charge">Şarj Et</option>
            <option value="Discharge">Deşarj Et</option>
          </select>
        </S.FormRow>
        <S.FormRow>
          <label>Güç (kW):</label>
          <input
            type="number"
            value={powerKw}
            onChange={(e) => setPowerKw(Number(e.target.value))}
            min={0}
            max={500}
          />
        </S.FormRow>

        <S.FormGroup>
          <label>Çalışma Modu</label>
          <S.ModeButtons>
            <S.ModeBtn
              active={operationMode === "TIMER"}
              onClick={() => setOperationMode("TIMER")}
            >
              <TimerIcon size={14} /> Timer Modu
            </S.ModeBtn>
            <S.ModeBtn
              active={operationMode === "CONTINUOUS"}
              onClick={() => setOperationMode("CONTINUOUS")}
            >
              <RepeatIcon size={14} /> Sürekli Mod
            </S.ModeBtn>
          </S.ModeButtons>
        </S.FormGroup>

        {operationMode === "TIMER" && (
          <S.FormRow>
            <label>Süre (sn):</label>
            <input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              min={1}
              max={28800}
              step={30}
            />
          </S.FormRow>
        )}

        <S.AddBtn onClick={handleAddCommand}>
          <AddIcon size={14} /> Zamanla
        </S.AddBtn>
      </S.SchedulerForm>

      <S.ScheduledList>
        <h5><InfoIcon size={16} /> Planlanmış Komutlar</h5>
        {scheduledList.length === 0 ? (
          <S.EmptyText>Henüz planlanmış bir komut yok.</S.EmptyText>
        ) : (
          <ul>
            {scheduledList.map((cmd) => (
              <li key={cmd.id}>
                <S.CmdDate>{formatDateTime(cmd.datetime)}</S.CmdDate>
                <S.CmdType
                  variant={cmd.type === "Charge" ? "charge" : "discharge"}
                >
                  {cmd.type === "Charge" ? <><ChargeIcon size={12} /> ŞARJ</> : <><DischargeIcon size={12} /> DEŞARJ</>}
                </S.CmdType>
                <S.CmdPower>{cmd.powerKw} kW</S.CmdPower>
                {cmd.operationMode === "TIMER" && (
                  <S.CmdTimer>{formatDuration(cmd.durationSeconds)}</S.CmdTimer>
                )}
                <S.DeleteBtn onClick={() => handleDeleteCommand(cmd.id)}>
                  <TrashIcon size={14} />
                </S.DeleteBtn>
              </li>
            ))}
          </ul>
        )}
      </S.ScheduledList>
    </S.SchedulerContainer>
  );
};