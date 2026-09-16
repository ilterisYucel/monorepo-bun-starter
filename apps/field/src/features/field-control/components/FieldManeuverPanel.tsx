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
import { mockContainers } from "../../containers/services/mockDataGenerator";

interface CardState {
  status: "idle" | "running" | "timer" | "success" | "failed";
  stepResults: StepResult[];
}

/**
 * Konteyner başına TEK PCS (REV.01 — FIELD-MANEVRA-KATALOGU): hedef PCS
 * listesi mock konteyner snapshot'larından türetilir — sabit liste YOKTUR.
 * Gerçek backend geldiğinde saha device-service kayıt defterine bağlanacak.
 * GİZLİ manevralar (FL-06/07/10) kart olarak GÖSTERİLMEZ — otomasyon katmanındadır.
 */
function pcsIdsFromMock(): string[] {
  return [
    ...new Set(
      mockContainers().flatMap((c) =>
        c.latestTelemetry
          .filter((x) => x.deviceId.startsWith("PCS-"))
          .map((x) => x.deviceId),
      ),
    ),
  ].sort();
}

// PCS deviceId → konteyner (mock): PCS'in bağlı olduğu konteyner, snapshot'ında
// o deviceId'nin geçtiği konteynerdir.
function containerForPcs(pcsId: string) {
  return mockContainers().find((c) =>
    c.latestTelemetry.some((x) => x.deviceId === pcsId),
  );
}

// ponytail: backend olmadığı için lokal simülasyon — PCS'in kontrol ettiği
// konteyner ile bağlantı (PPC) kopuksa komut başarısız sayılır. Gerçek field
// device-service geldiğinde bu fonksiyon API çağrısıyla değişecek.
function mockExecute(
  steps: CommandStep[],
  disconnectedReason: string,
): Promise<StepResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        steps.map((s) => {
          const ok = containerForPcs(s.deviceId)?.connected ?? false;
          return {
            deviceId: s.deviceId,
            command: s.command ?? "",
            success: ok,
            reason: ok ? undefined : disconnectedReason,
          };
        }),
      );
    }, 900);
  });
}

export const FieldManeuverPanel: React.FC = () => {
  const [states, setStates] = useState<Record<string, CardState>>({});
  const { t } = useTranslation();

  const pcsIds = useMemo(() => pcsIdsFromMock(), []);
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

      setStates((prev) => ({ ...prev, [name]: { status: "running", stepResults: [] } }));

      const results = await mockExecute(steps, t("container.disconnected"));
      const allOk = results.every((r) => r.success);

      setStates((prev) => ({
        ...prev,
        [name]: { status: allOk ? "success" : "failed", stepResults: results },
      }));
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
