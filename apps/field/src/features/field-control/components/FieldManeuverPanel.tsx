import React, { useState, useCallback, useMemo } from "react";
import { ManeuverCard, useTranslation } from "@gd-monorepo/ui";
import type { StepResult, ManeuverCardLabels } from "@gd-monorepo/ui";
import type { CommandStep } from "@gd-monorepo/shared-types";
import {
  buildFieldManeuvers,
  buildFieldManeuverControls,
  resolveSteps,
  FIELD_HIDDEN_MANEUVER_NAMES,
} from "../maneuvers";
import { fieldControlApi } from "../services/fieldControlApi";
import { useContainerData } from "../../containers/hooks/useContainerData";
import { siteFieldId } from "../../../lib/site-field";

interface CardState {
  status: "idle" | "running" | "timer" | "success" | "failed";
  stepResults: StepResult[];
}

/**
 * Konteyner başına TEK PCS (REV.01 — FIELD-MANEVRA-KATALOGU): hedef PCS
 * listesi field API'sinin konteyner snapshot'larından türetilir — sabit
 * liste YOKTUR. Yürütme GERÇEKTİR: PCS adımları field web-service
 * /commands/execute-multi'ye gider (field device-service read-back doğrular;
 * konteyner bağlantısı kopsa bile PCS komutu device-service tarafından
 * yürütülür — PPC koptuysa komut reddedilir kuralı management-service'te).
 */
function pcsIdsFromContainers(
  containers: Array<{ latestTelemetry: Array<{ deviceId: string }> }>,
): string[] {
  return [
    ...new Set(
      containers.flatMap((c) =>
        c.latestTelemetry
          .filter((x) => x.deviceId.startsWith("PCS-"))
          .map((x) => x.deviceId),
      ),
    ),
  ].sort();
}

export const FieldManeuverPanel: React.FC = () => {
  const [states, setStates] = useState<Record<string, CardState>>({});
  const { t } = useTranslation();

  const fieldId = siteFieldId();
  const { containers } = useContainerData(fieldId);
  const pcsIds = useMemo(() => pcsIdsFromContainers(containers), [containers]);
  const maneuvers = useMemo(() => buildFieldManeuvers(pcsIds), [pcsIds]);
  const controls = useMemo(() => buildFieldManeuverControls(pcsIds), [pcsIds]);

  const labels: ManeuverCardLabels = useMemo(
    () => ({
      inputs: t("maneuver.inputs"),
      steps: t("maneuver.steps"),
      timed: t("maneuver.timed"),
      duration: t("maneuver.duration"),
      seconds: t("maneuver.seconds"),
      remaining: t("maneuver.remaining"),
      cancel: t("maneuver.cancel"),
      schedule: t("maneuver.schedule"),
      rollback: t("maneuver.rollback"),
      retry: t("maneuver.retry"),
      run: t("maneuver.run"),
      now: t("maneuver.now"),
      scheduled: t("maneuver.scheduled"),
      running: t("maneuver.running"),
    }),
    [t],
  );

  const execute = useCallback(
    async (name: string, values: Record<string, number>) => {
      const m = maneuvers[name];
      if (!m) return;

      const steps = resolveSteps(m, values, controls[name]?.transform, pcsIds);
      const commandSteps = steps.filter((s) => s.command);
      if (commandSteps.length === 0) {
        setStates((prev) => ({
          ...prev,
          [name]: {
            status: "failed",
            stepResults: [
              {
                deviceId: "-",
                command: "",
                success: false,
                reason: t("container.noPcs"),
              },
            ],
          },
        }));
        return;
      }

      setStates((prev) => ({
        ...prev,
        [name]: { status: "running", stepResults: [] },
      }));

      try {
        const results = await fieldControlApi.executeMulti({
          commands: commandSteps.map((s: CommandStep) => ({
            deviceId: s.deviceId,
            command: s.command ?? "",
            params: s.params,
          })),
          mode: m.mode,
          onFailure: m.onFailure ?? "stop",
        });
        const stepResults: StepResult[] = results.map((r) => ({
          deviceId: r.deviceId,
          command: r.command,
          success: r.success,
          reason: r.reason,
        }));
        const allOk = stepResults.every((r) => r.success);
        setStates((prev) => ({
          ...prev,
          [name]: { status: allOk ? "success" : "failed", stepResults },
        }));
      } catch (err) {
        setStates((prev) => ({
          ...prev,
          [name]: {
            status: "failed",
            stepResults: [
              {
                deviceId: "-",
                command: "",
                success: false,
                reason: String(err),
              },
            ],
          },
        }));
      }
    },
    [maneuvers, controls, pcsIds, t],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "12px",
        alignItems: "start",
      }}
    >
      {Object.entries(maneuvers)
        .filter(([name]) => !FIELD_HIDDEN_MANEUVER_NAMES.has(name))
        .map(([name, m]) => {
          const s = states[name];
          const c = controls[name];
          return (
            <ManeuverCard
              key={name}
              maneuver={{ ...m, label: t(m.label), description: t(m.description ?? "") }}
              state={s?.status ?? "idle"}
              stepResults={s?.stepResults}
              inputs={c?.inputs}
              timerConfig={c?.timerConfig}
              labels={labels}
              onRun={(values) => execute(name, values)}
              onRetry={() => execute(name, { group: -1, powerKw: 500 })}
            />
          );
        })}
    </div>
  );
};
