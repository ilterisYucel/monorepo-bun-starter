import React, { useState, useCallback } from "react";
import { ManeuverCard } from "@gd-monorepo/ui";
import type { StepResult } from "@gd-monorepo/ui";
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
    async (name: string, values?: Record<string, number>) => {
      const m = MANEUVERS[name];
      if (!m) return;

      const ctrl = MANEUVER_CONTROLS[name];
      const stepParams = ctrl?.transform
        ? ctrl.transform(values ?? {}, m.steps)
        : m.steps.map(() => values ?? {});
      const hasParams = stepParams.some((p: Record<string, number>) => Object.keys(p).length > 0);

      setStates((prev) => ({ ...prev, [name]: { status: "running", stepResults: [] } }));

      try {
        const { results } = await controlApi.executeMulti(
          m.steps.map((s, i) => ({
            deviceId: s.deviceId,
            command: s.command ?? "",
            params: hasParams ? stepParams[i] : s.params ?? {},
          })),
          m.mode,
          m.onFailure,
        );

        const stepResults = buildStepResults(name, results);
        const allOk = results.every((r) => r.success);

        setStates((prev) => ({
          ...prev,
          [name]: { status: allOk ? "success" : "failed", stepResults },
        }));

        if (allOk) {
          toast.success(`${m.label}: ${results.length} adım ✅`);
          addLog({ type: "success", source: "user", message: `${m.label}: ${results.length} adım ✅` });
        } else {
          for (const r of stepResults) {
            if (!r.success) {
              toast.error(`${r.deviceId}: ${r.command} ❌`);
              addLog({ type: "error", source: "user", message: `${r.deviceId}: ${r.command} başarısız — ${r.reason ?? ""}` });
            }
          }
        }
      } catch {
        setStates((prev) => ({ ...prev, [name]: { status: "failed", stepResults: [] } }));
        toast.error(`${m.label} gönderilemedi!`);
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
          toast.success(`${m.label}: Geri alındı ✅`);
          addLog({ type: "success", source: "user", message: `${m.label}: Geri alındı ✅` });
        } else {
          toast.error(`${m.label}: Geri alma başarısız ❌`);
        }
      } catch {
        toast.error(`${m.label}: Geri alma gönderilemedi!`);
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
            maneuver={m}
            state={s?.status ?? "idle"}
            stepResults={s?.stepResults}
            inputs={ctrl?.inputs}
            timerConfig={ctrl?.timerConfig}
            onRun={(values: Record<string, number>) => execute(name, values)}
            onTimerExpired={ctrl?.timerConfig ? () => execute("fl_idle") : undefined}
            onRetry={() => execute(name)}
            onRollback={m.rollbackSteps ? () => rollback(name) : undefined}
          />
          </S.ManeuverCardWrapper>
        );
      })}
    </S.ManeuverGrid>
  );
};
