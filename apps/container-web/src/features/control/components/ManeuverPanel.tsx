import React, { useState, useCallback, useMemo } from "react";
import { ManeuverCard, useTranslation } from "@gd-monorepo/ui";
import type { StepResult, ManeuverCardLabels } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { controlApi } from "../services/controlApi";
import { useLogProvider } from "../../../hooks/useLogProvider";
import { MANEUVERS, MANEUVER_CONTROLS } from "../maneuvers";
import * as S from "./ManeuverPanel.styles";

interface CardState {
  status: "idle" | "running" | "success" | "failed";
  stepResults: StepResult[];
}

export const ManeuverPanel: React.FC = () => {
  const [states, setStates] = useState<Record<string, CardState>>({});
  const { addLog } = useLogProvider();
  const { t } = useTranslation();

  const cardLabels: ManeuverCardLabels = useMemo(() => ({
    inputs: t("maneuver.inputs"),
    steps: t("maneuver.steps"),
    timed: t("maneuver.timed"),
    duration: t("maneuver.duration"),
    seconds: t("maneuver.seconds"),
    remaining: t("maneuver.remaining"),
    cancel: t("common.cancel"),
    schedule: t("maneuver.schedule"),
    rollback: t("maneuver.rollback"),
    retry: t("maneuver.retry"),
    run: t("maneuver.run"),
    now: t("maneuver.now"),
    scheduled: t("maneuver.scheduled"),
    running: t("maneuver.running"),
  }), [t]);

  const buildStepResults = (name: string, results: { deviceId: string; command: string; success: boolean; reason?: string }[]): StepResult[] => {
    return results.map((r) => {
      const step = MANEUVERS[name]?.steps.find(
        (s) => s.deviceId === r.deviceId && s.command === r.command,
      );
      return {
        deviceId: r.deviceId,
        command: step?.command ?? r.command,
        success: r.success,
        reason: r.reason,
      };
    });
  };

  const execute = useCallback(
    async (name: string, values?: Record<string, number>, timer?: { durationSeconds: number }) => {
      const m = MANEUVERS[name];
      if (!m) return;

      const ctrl = MANEUVER_CONTROLS[name];
      const stepParams = ctrl?.transform
        ? ctrl.transform(values ?? {}, m.steps)
        : m.steps.map(() => values ?? {});
      const hasParams = stepParams.some((p: Record<string, number>) => Object.keys(p).length > 0);

      // Timer varsa backend'e ilet
      if (timer && timer.durationSeconds > 0) {
        for (let i = 0; i < stepParams.length; i++) {
          stepParams[i] = { ...stepParams[i], _durationSeconds: timer.durationSeconds };
        }
      }

      setStates((prev) => ({ ...prev, [name]: { status: "running", stepResults: [] } }));

      try {
        const { results } = await controlApi.executeMulti(
          m.steps.map((s, i) => {
            const p = hasParams ? { ...stepParams[i] } : (s.params ?? {});
            delete p.command;
            delete p.mode;
            return {
              deviceId: s.deviceId,
              command: (stepParams[i] as any)?.command || s.command || "",
              params: p,
            };
          }),
          m.mode,
          m.onFailure,
        );

        const stepResults = buildStepResults(name, results);
        const allOk = results.every((r) => r.success);

        setStates((prev) => ({
          ...prev,
          [name]: { status: allOk ? (timer ? "timer" : "success") : "failed", stepResults },
        }));

        if (allOk) {
          toast.success(`${m.label}: ${results.length} ${t("maneuver.steps").toLowerCase()} ✅`);
          addLog({ type: "success", source: "user", message: `${m.label}: ${results.length} ${t("maneuver.steps").toLowerCase()} ✅` });
        } else {
          for (const r of stepResults) {
            if (!r.success) {
              toast.error(`${r.deviceId}: ${r.command} ❌`);
              addLog({ type: "error", source: "user", message: `${r.deviceId}: ${r.command} başarısız — ${r.reason ?? ""}` });
            }
          }
        }
      } catch (err: any) {
        console.error("[ManeuverPanel] execute failed:", err);
        const responseData = err?.response?.data;

        if (responseData?.results) {
          const results = responseData.results as Array<{
            deviceId: string; command?: string; success: boolean; reason?: string;
          }>;
          const stepResults = buildStepResults(name, results);
          setStates((prev) => ({
            ...prev,
            [name]: { status: "failed", stepResults },
          }));

          for (const r of results) {
            if (!r.success) {
              const reason = r.reason ? ` — ${r.reason}` : "";
              toast.error(`${r.deviceId}: ${r.command}${reason} ❌`);
              addLog({ type: "error", source: "user", message: `${r.deviceId}: ${r.command}${reason}` });
            }
          }
        } else {
          setStates((prev) => ({ ...prev, [name]: { status: "failed", stepResults: [] } }));
          toast.error(`${m.label} gönderilemedi!`);
        }
      }
    },
    [addLog],
  );

  const rollback = useCallback(
    async (name: string) => {
      const m = MANEUVERS[name];
      if (!m?.rollbackSteps) return;

      setStates((prev) => ({ ...prev, [name]: { status: "running", stepResults: prev[name]?.stepResults ?? [] } }));

      try {
        const { results } = await controlApi.executeMulti(
          m.rollbackSteps.map((s) => ({
            deviceId: s.deviceId,
            command: s.command ?? "",
            params: s.params ?? {},
          })),
          m.mode,
        );

        const allOk = results.every((r) => r.success);
        setStates((prev) => ({
          ...prev,
          [name]: { status: allOk ? "success" : "failed", stepResults: prev[name]?.stepResults ?? [] },
        }));

        if (allOk) {
          toast.success(`${m.label}: ${t("maneuver.rollbackSuccess")} ✅`);
          addLog({ type: "success", source: "user", message: `${m.label}: ${t("maneuver.rollbackSuccess")} ✅` });
        } else {
          toast.error(`${m.label}: ${t("maneuver.rollbackFailed")} ❌`);
        }
      } catch {
        toast.error(`${m.label}: ${t("maneuver.rollbackSendFailed")}!`);
        setStates((prev) => ({ ...prev, [name]: { status: "failed", stepResults: prev[name]?.stepResults ?? [] } }));
      }
    },
    [addLog],
  );

  return (
    <S.ManeuverGrid>
      {Object.entries(MANEUVERS).map(([name, m]) => {
        const s = states[name];
        const ctrl = MANEUVER_CONTROLS[name];
        return (
          <S.ManeuverCardWrapper key={name}>
            <ManeuverCard
            key={name}
            maneuver={{ ...m, description: m.description ? t(m.description) : undefined }}
            state={s?.status ?? "idle"}
            stepResults={s?.stepResults}
            inputs={ctrl?.inputs}
            timerConfig={ctrl?.timerConfig}
            labels={cardLabels}
            onRun={(values: Record<string, number>, timer?: { durationSeconds: number }) => execute(name, values, timer)}
            onTimerExpired={ctrl?.timerConfig ? () => setStates((prev) => ({ ...prev, [name]: { ...(prev[name] ?? { status: "idle", stepResults: [] }), status: "success" } })) : undefined}
            onRetry={() => execute(name)}
            onRollback={m.rollbackSteps ? () => rollback(name) : undefined}
          />
          </S.ManeuverCardWrapper>
        );
      })}
    </S.ManeuverGrid>
  );
};
