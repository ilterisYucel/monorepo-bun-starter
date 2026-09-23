import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ManeuverCard, useTranslation } from "@gd-monorepo/ui";
import type { StepResult, ManeuverCardLabels, InputField } from "@gd-monorepo/ui";
import toast from "react-hot-toast";
import { maneuverApi } from "../services/maneuverApi";
import { useLogProvider } from "../../../hooks/useLogProvider";
import * as S from "./ManeuverPanel.styles";

interface CardState {
  status: "idle" | "running" | "success" | "failed";
  stepResults: StepResult[];
}

export const MANEUVERS_QUERY_KEY = ["maneuvers"];

/**
 * ManeuverPanel — sunucu kataloğu tabanlı (Faz D2): UI kendi kataloğunu
 * TANIMLAMAZ — GET /api/maneuvers'ten okur (DB > dosya hibrit listesi);
 * yürütme POST /api/maneuvers/:name/execute'ya devreder (rollback yürütücüde
 * OTOMATİKTİR — manuel "Geri Al" yoktur). Kart girişleri kayıt `ui` meta
 * alanından gelir (inputs/timer/hidden).
 */
export const ManeuverPanel: React.FC = () => {
  const [states, setStates] = useState<Record<string, CardState>>({});
  const { addLog } = useLogProvider();
  const { t } = useTranslation();

  const { data: maneuvers = [], isLoading, isError } = useQuery({
    queryKey: MANEUVERS_QUERY_KEY,
    queryFn: ({ signal }) => maneuverApi.list(signal),
  });

  const visible = useMemo(
    () => maneuvers.filter((m) => m.ui?.hidden !== true),
    [maneuvers],
  );

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

  const execute = useCallback(
    async (
      name: string,
      values?: Record<string, number>,
      timer?: { durationSeconds: number },
    ) => {
      setStates((prev) => ({ ...prev, [name]: { status: "running", stepResults: [] } }));

      try {
        const result = await maneuverApi.execute(name, {
          ...(values && Object.keys(values).length > 0 ? { params: values } : {}),
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
          [name]: {
            status: ok ? (timer ? "timer" : "success") : "failed",
            stepResults,
          },
        }));

        if (ok) {
          const note = result.status === "rolled_back" ? ` (${t("maneuver.rolledBack")})` : "";
          toast.success(`${name}: ${result.status}${note} ✅`);
          addLog({
            type: "success",
            source: "user",
            message: `${name}: ${result.status}${note}`,
          });
        } else {
          const reason = result.reason ? ` — ${result.reason}` : "";
          toast.error(`${name}: ${result.status}${reason} ❌`);
          addLog({
            type: "error",
            source: "user",
            message: `${name}: ${result.status}${reason}`,
          });
        }
      } catch (err) {
        console.error("[ManeuverPanel] execute failed:", err);
        setStates((prev) => ({ ...prev, [name]: { status: "failed", stepResults: [] } }));
        toast.error(`${name} gönderilemedi!`);
      }
    },
    [addLog, t],
  );

  if (isLoading) {
    return <S.ManeuverGrid>{t("maneuver.loading")}</S.ManeuverGrid>;
  }
  if (isError) {
    return <S.ManeuverGrid>{t("maneuver.loadError")}</S.ManeuverGrid>;
  }

  return (
    <S.ManeuverGrid>
      {visible.map((m) => {
        const s = states[m.name];
        return (
          <S.ManeuverCardWrapper key={m.name} data-maneuver-name={m.name}>
            <ManeuverCard
              key={m.name}
              maneuver={m}
              state={s?.status ?? "idle"}
              stepResults={s?.stepResults}
              inputs={(m.ui?.inputs as InputField[] | undefined) ?? undefined}
              timerConfig={m.ui?.timer === true}
              labels={cardLabels}
              onRun={(values: Record<string, number>, timer?: { durationSeconds: number }) =>
                execute(m.name, values, timer)
              }
              onTimerExpired={m.ui?.timer === true
                ? () => setStates((prev) => ({
                    ...prev,
                    [m.name]: {
                      ...(prev[m.name] ?? { status: "idle", stepResults: [] }),
                      status: "success",
                    },
                  }))
                : undefined}
              onRetry={() => execute(m.name)}
            />
          </S.ManeuverCardWrapper>
        );
      })}
    </S.ManeuverGrid>
  );
};
