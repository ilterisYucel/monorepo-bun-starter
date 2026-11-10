import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ManeuverCard, useTranslation } from "@gd-monorepo/ui";
import type { StepResult, ManeuverCardLabels, InputField } from "@gd-monorepo/ui";
import type { ManeuverRecord, OperationRecord, OperationRunResult } from "@gd-monorepo/shared-types";
import { fieldManeuverApi } from "../services/fieldManeuverApi";
import { useContainerData } from "../../containers/hooks/useContainerData";
import { siteFieldId } from "../../../lib/site-field";

interface CardState {
  status: "idle" | "running" | "timer" | "success" | "failed";
  stepResults: StepResult[];
}

interface CatalogCard {
  kind: "maneuver" | "operation";
  name: string;
  label: string;
  description?: string;
  mode: "parallel" | "sequential";
  stepSummary: Array<{ deviceId: string; command: string }>;
  ui?: { inputs?: InputField[]; timer?: boolean; hidden?: boolean };
}

const ALL_GROUPS = -1;

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

function toCard(m: ManeuverRecord): CatalogCard {
  return {
    kind: "maneuver",
    name: m.name,
    label: m.label,
    description: m.description,
    mode: m.mode,
    stepSummary: m.steps.map((s) => ({
      deviceId:
        s.deviceId ?? s.deviceIds?.join(", ") ?? s.deviceTypes?.join(", ") ?? "—",
      command: s.command ?? "",
    })),
    ...(m.ui ? { ui: { ...(m.ui.inputs ? { inputs: m.ui.inputs as InputField[] } : {}), ...(m.ui.timer !== undefined ? { timer: m.ui.timer } : {}), ...(m.ui.hidden !== undefined ? { hidden: m.ui.hidden } : {}) } } : {}),
  };
}

function toOperationCard(o: OperationRecord): CatalogCard {
  return {
    kind: "operation",
    name: o.name,
    label: o.label,
    description: o.description,
    mode: o.mode,
    stepSummary: o.steps.map((s) =>
      "system" in s
        ? { deviceId: s.system, command: s.maneuver }
        : "maneuver" in s
          ? { deviceId: "local", command: s.maneuver }
          : { deviceId: "local", command: `${s.commands.length} komut` },
    ),
    ...(o.ui ? { ui: { ...(o.ui.inputs ? { inputs: o.ui.inputs as InputField[] } : {}), ...(o.ui.timer !== undefined ? { timer: o.ui.timer } : {}), ...(o.ui.hidden !== undefined ? { hidden: o.ui.hidden } : {}) } } : {}),
  };
}

/**
 * FieldManeuverPanel — sunucu kataloğu tabanlı (Faz D2): saha kartları
 * GET /api/maneuvers + /api/operations'tan gelir (UI TANIMLAMAZ — REV.01 §7
 * migrasyonu); FL-02/FL-11 operasyon kartlarıdır. Grup seçimi yürütme
 * isteğindeki `deviceIds` kısıtına iner (§5.1); güç dağıtımı sunucuda
 * (`divideTotal` transform).
 */
export const FieldManeuverPanel: React.FC = () => {
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [group, setGroup] = useState<number>(ALL_GROUPS);
  const { t } = useTranslation();

  const fieldId = siteFieldId();
  const { containers } = useContainerData(fieldId);
  const pcsIds = useMemo(() => pcsIdsFromContainers(containers), [containers]);

  const { data: maneuvers = [] } = useQuery({
    queryKey: ["field-maneuvers"],
    queryFn: ({ signal }) => fieldManeuverApi.listManeuvers(signal),
  });
  const { data: operations = [] } = useQuery({
    queryKey: ["field-operations"],
    queryFn: ({ signal }) => fieldManeuverApi.listOperations(signal),
  });

  const cards: CatalogCard[] = useMemo(
    () => [
      ...maneuvers.map(toCard),
      ...operations.map(toOperationCard),
    ].filter((c) => c.ui?.hidden !== true),
    [maneuvers, operations],
  );

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
    async (
      card: CatalogCard,
      values: Record<string, number>,
      timer?: { durationSeconds: number },
    ) => {
      setStates((prev) => ({
        ...prev,
        [card.name]: { status: "running", stepResults: [] },
      }));

      const deviceIds =
        group !== ALL_GROUPS && pcsIds[group] ? [pcsIds[group]!] : undefined;

      try {
        const result: OperationRunResult =
          card.kind === "maneuver"
            ? await fieldManeuverApi.executeManeuver(card.name, {
                ...(Object.keys(values).length > 0 ? { params: values } : {}),
                ...(deviceIds !== undefined ? { deviceIds } : {}),
                ...(timer && timer.durationSeconds > 0
                  ? { timer: { durationSeconds: timer.durationSeconds } }
                  : {}),
              })
            : await fieldManeuverApi.executeOperation(card.name, {
                ...(Object.keys(values).length > 0 ? { params: values } : {}),
                ...(deviceIds !== undefined ? { deviceIds } : {}),
                ...(timer && timer.durationSeconds > 0
                  ? { timer: { durationSeconds: timer.durationSeconds } }
                  : {}),
              });

        const stepResults: StepResult[] = result.outcomes.map((o) => ({
          deviceId: o.deviceId ?? o.system ?? o.maneuver ?? "—",
          command: o.command ?? o.maneuver ?? "",
          success: o.success,
          ...(o.reason !== undefined ? { reason: o.reason } : {}),
        }));
        const ok = result.status === "completed" || result.status === "rolled_back";

        setStates((prev) => ({
          ...prev,
          [card.name]: {
            status: ok ? "success" : "failed",
            stepResults,
          },
        }));
      } catch (err) {
        setStates((prev) => ({
          ...prev,
          [card.name]: {
            status: "failed",
            stepResults: [
              { deviceId: "-", command: "", success: false, reason: String(err) },
            ],
          },
        }));
      }
    },
    [group, pcsIds],
  );

  return (
    <div>
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <label htmlFor="field-group">{t("maneuver.group")}</label>
        <select
          id="field-group"
          value={group}
          onChange={(e) => setGroup(Number(e.target.value))}
        >
          <option value={ALL_GROUPS}>{t("maneuver.groupAll")}</option>
          {pcsIds.map((id, index) => (
            <option key={id} value={index}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "12px",
          alignItems: "start",
        }}
      >
        {cards.map((c) => {
          const s = states[c.name];
          return (
            <div
              key={`${c.kind}:${c.name}`}
              data-card-name={c.name}
              data-card-kind={c.kind}
            >
              <ManeuverCard
                maneuver={{
                  name: c.name,
                  label: c.label,
                  description: c.description,
                  mode: c.mode,
                  steps: [],
                }}
                stepSummary={c.stepSummary}
                state={s?.status ?? "idle"}
                stepResults={s?.stepResults}
                inputs={c.ui?.inputs}
                timerConfig={c.ui?.timer === true}
                labels={labels}
                onRun={(values, timer) => execute(c, values, timer)}
                onRetry={() => execute(c, {})}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
