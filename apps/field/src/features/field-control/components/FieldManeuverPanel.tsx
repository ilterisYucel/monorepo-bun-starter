import React, { useState, useCallback, useMemo } from "react";
import { ManeuverCard, useTranslation } from "@gd-monorepo/ui";
import type { StepResult, ManeuverCardLabels } from "@gd-monorepo/ui";
import type { CommandStep } from "@gd-monorepo/shared-types";
import { FIELD_MANEUVERS } from "../maneuvers";
import { mockContainers } from "../../containers/services/mockDataGenerator";

interface CardState {
  status: "idle" | "running" | "timer" | "success" | "failed";
  stepResults: StepResult[];
}

// PCS-N ↔ container-N (mock). Komut PCS'e gider, PCS konteyneri kontrol eder.
function containerForPcs(pcsId: string) {
  const n = Number(pcsId.replace("PCS-", ""));
  return Number.isNaN(n) ? undefined : mockContainers()[n - 1];
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
    async (name: string) => {
      const m = FIELD_MANEUVERS[name];
      if (!m) return;

      setStates((prev) => ({ ...prev, [name]: { status: "running", stepResults: [] } }));

      const results = await mockExecute(m.steps, t("container.disconnected"));
      const allOk = results.every((r) => r.success);

      setStates((prev) => ({
        ...prev,
        [name]: { status: allOk ? "success" : "failed", stepResults: results },
      }));
    },
    [t],
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
      {Object.entries(FIELD_MANEUVERS).map(([name, m]) => {
        const s = states[name];
        return (
          <ManeuverCard
            key={name}
            maneuver={{ ...m, label: t(m.label), description: t(m.description ?? "") }}
            state={s?.status ?? "idle"}
            stepResults={s?.stepResults}
            labels={labels}
            onRun={() => execute(name)}
            onRetry={() => execute(name)}
          />
        );
      })}
    </div>
  );
};
