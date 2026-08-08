import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TelemetryInput } from "../../core/TelemetryInput";
import { SCADA_ICONS } from "../../icons";
import type { ManeuverCardProps, ManeuverCardLabels } from "./ManeuverCard.types";
import * as S from "./ManeuverCard.styles";

const ControlIcon = SCADA_ICONS.control;
const CheckIcon = SCADA_ICONS.logSuccess;
const FailIcon = SCADA_ICONS.logError;

const DEFAULT_TR: ManeuverCardLabels = {
  inputs: "Girdiler",
  steps: "Adımlar",
  timed: "Zamanlı (süre dolunca otomatik durur)",
  duration: "Süre",
  seconds: "sn",
  remaining: "kaldı",
  cancel: "İptal",
  schedule: "Zamanla",
  rollback: "Geri Al",
  retry: "Tekrar Dene",
  run: "▶ Çalıştır",
  now: "Şimdi",
  scheduled: "📅 Zamanla...",
  running: "Çalışıyor...",
};

interface StepRowData {
  deviceId: string;
  command: string;
  status: "pending" | "success" | "failed";
}

const StepRow: React.FC<{ step: StepRowData }> = ({ step }) => (
  <S.StepRow $status={step.status}>
    <S.StepDevice>{step.deviceId}</S.StepDevice>
    <S.StepCommand>{step.command}</S.StepCommand>
    <S.StepStatus>
      {step.status === "success" ? <CheckIcon size={14} /> : null}
      {step.status === "failed" ? <FailIcon size={14} /> : null}
      {step.status === "pending" ? <S.PendingDot /> : null}
    </S.StepStatus>
  </S.StepRow>
);

export const ManeuverCard: React.FC<ManeuverCardProps> = ({
  maneuver,
  state,
  stepResults,
  inputs,
  timerConfig,
  onRun,
  onTimerExpired,
  onRetry,
  onRollback,
  labels: rawLabels,
}) => {
  const L = rawLabels ?? DEFAULT_TR;
  const defaults = useRef(
    Object.fromEntries((inputs ?? []).map((i) => [i.name, i.default])),
  ).current;

  const [values, setValues] = useState<Record<string, number>>(defaults);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleInput, setScheduleInput] = useState("");
  const [scheduleCountdown, setScheduleCountdown] = useState("");
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearSchedule = useCallback(() => {
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    clearCountdown();
    setScheduleCountdown("");
  }, [clearCountdown]);

  const handleSchedule = useCallback(() => {
    if (!scheduleInput) return;
    const target = new Date(scheduleInput);
    const delay = target.getTime() - Date.now();
    if (delay <= 0) {
      handleRunNow();
      return;
    }

    setScheduleOpen(false);
    scheduleTimerRef.current = setTimeout(() => {
      handleRunNow();
      clearSchedule();
    }, delay);

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        clearCountdown();
        setScheduleCountdown("");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setScheduleCountdown(`${mins} dk ${secs} ${L.seconds}`);
    };
    tick();
    countdownIntervalRef.current = setInterval(tick, 1000);
  }, [scheduleInput, clearSchedule, clearCountdown]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      clearSchedule();
    };
  }, [clearTimer, clearSchedule]);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimerRemaining(durationSeconds);

    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          intervalRef.current = null;
          onTimerExpired?.();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = interval;
  }, [durationSeconds, onTimerExpired, clearTimer]);

  const handleRunNow = useCallback(() => {
    setDropdownOpen(false);
    const timer = timerEnabled ? { durationSeconds } : undefined;
    onRun(values, timer);
    if (timerEnabled) {
      startTimer();
    }
  }, [values, timerEnabled, durationSeconds, onRun, startTimer]);

  const handleScheduleClick = useCallback(() => {
    setDropdownOpen(false);
    setScheduleOpen(true);
  }, []);

  const canRollback = maneuver.rollbackSteps && maneuver.rollbackSteps.length > 0;
  const isExecuting = state === "running" || state === "timer";

  const steps: StepRowData[] = useMemo(() => {
    return maneuver.steps.map((s) => {
      const result = stepResults?.find(
        (r) => r.deviceId === s.deviceId && r.command === (s.command ?? ""),
      );
      return {
        deviceId: s.deviceId,
        command: s.command ?? "",
        status: result ? (result.success ? "success" : "failed") : "pending",
      };
    });
  }, [maneuver.steps, stepResults]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const metaBadge = `${maneuver.steps.length} · ${maneuver.mode === "parallel" ? "∥" : "→"}`;

  return (
    <S.CardContainer>
      <S.CardHeader>
        <S.CardIcon>
          <ControlIcon size={18} />
        </S.CardIcon>
        <S.CardTitle>{maneuver.label}</S.CardTitle>
        <S.MetaBadge>{metaBadge}</S.MetaBadge>
      </S.CardHeader>

      {maneuver.description && (
        <S.CardDescription>{maneuver.description}</S.CardDescription>
      )}

      {(inputs && inputs.length > 0 || timerConfig) && (
        <>
          <S.SectionLabel>{L.inputs}</S.SectionLabel>
          {inputs?.map((input) => (
            <TelemetryInput
              key={input.name}
              name={input.label}
              description={input.description}
              deviceId={input.deviceId}
              value={values[input.name] ?? input.default}
              onChange={(v) => setValues((prev) => ({ ...prev, [input.name]: v }))}
              unit={input.unit}
              min={input.min}
              max={input.max}
              step={input.step}
              size="small"
              disabled={isExecuting}
              type={input.type}
              options={input.options}
            />
          ))}
          {timerConfig && (
            <>
              <S.TimerCheckbox>
                <S.Checkbox
                  type="checkbox"
                  id={`timer-${maneuver.name}`}
                  checked={timerEnabled}
                  onChange={(e) => setTimerEnabled(e.target.checked)}
                  disabled={isExecuting}
                />
                <S.CheckboxLabel htmlFor={`timer-${maneuver.name}`}>{L.timed}</S.CheckboxLabel>
              </S.TimerCheckbox>
              {timerEnabled && (
                <TelemetryInput
                  name={L.duration}
                  value={durationSeconds}
                  onChange={setDurationSeconds}
                  unit={L.seconds}
                  min={1}
                  max={28800}
                  step={30}
                  size="small"
                  disabled={isExecuting}
                />
              )}
            </>
          )}
        </>
      )}

      <S.SectionLabel>{L.steps}</S.SectionLabel>
      <S.StepList>
        {steps.map((s, i) => (
          <StepRow key={i} step={s} />
        ))}
      </S.StepList>

      {timerRemaining !== null && (
        <S.TimerDisplay>
          <S.TimerTime>{formatTime(timerRemaining)}</S.TimerTime>
          <S.TimerLabel>{L.remaining}</S.TimerLabel>
        </S.TimerDisplay>
      )}

      {scheduleCountdown && (
        <S.CountdownRow>
          <S.CountdownText>⏳ {scheduleCountdown} {L.remaining}</S.CountdownText>
          <S.CancelBtn onClick={clearSchedule}>{L.cancel}</S.CancelBtn>
        </S.CountdownRow>
      )}

      {scheduleOpen && !scheduleCountdown && (
        <S.ScheduleRow>
          <S.ScheduleInput
            type="datetime-local"
            value={scheduleInput}
            onChange={(e) => setScheduleInput(e.target.value)}
          />
          <S.ScheduleBtn
            onClick={handleSchedule}
            disabled={!scheduleInput}
          >
            {L.schedule}
          </S.ScheduleBtn>
          <S.CancelBtn onClick={() => { setScheduleOpen(false); setScheduleInput(""); }}>
            {L.cancel}
          </S.CancelBtn>
        </S.ScheduleRow>
      )}

      <S.CardFooter>
        <S.ButtonGroup ref={dropdownRef}>
          {state === "failed" && canRollback && (
            <S.RollbackBtn onClick={onRollback}>{L.rollback}</S.RollbackBtn>
          )}
          {state === "failed" && onRetry && (
            <S.RetryBtn onClick={onRetry}>{L.retry}</S.RetryBtn>
          )}
          {(state === "idle" || state === "success") && (
            <S.SplitButton disabled={isExecuting}>
              <S.RunBtn onClick={handleRunNow} disabled={isExecuting}>
                {L.run}
              </S.RunBtn>
              <S.DropdownToggle
                disabled={isExecuting}
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v); }}
              />
              {dropdownOpen && (
                <S.Dropdown>
                  <S.DropdownItem onClick={handleRunNow}>{L.now}</S.DropdownItem>
                  <S.DropdownItem onClick={handleScheduleClick}>{L.scheduled}</S.DropdownItem>
                </S.Dropdown>
              )}
            </S.SplitButton>
          )}
          {state === "running" && (
            <S.RunBtn disabled>{L.running}</S.RunBtn>
          )}
          {state === "timer" && (
            <S.RunBtn disabled>{L.running}</S.RunBtn>
          )}
        </S.ButtonGroup>
      </S.CardFooter>
    </S.CardContainer>
  );
};

ManeuverCard.displayName = "ManeuverCard";
