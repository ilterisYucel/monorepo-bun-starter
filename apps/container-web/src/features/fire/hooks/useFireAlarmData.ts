import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fireAlarmApi } from "../services/fireAlarmApi";
import type { FireAlarmState } from "../types/fire-alarm";

function extractBoolean(telemetries: any[], name: string): boolean {
  const entry = telemetries.find((t) => t.name === name);
  if (!entry) return false;
  return entry.value === true || entry.value === 1 || entry.value === "1";
}

export function useFireAlarmData() {
  const queryClient = useQueryClient();

  const { data: telemetries = [], isLoading } = useQuery({
    queryKey: ["fire-alarm", "latest"],
    queryFn: () => fireAlarmApi.latest(),
    refetchInterval: 3000,
  });

  const state: FireAlarmState = useMemo(
    () => ({
      fault: extractBoolean(telemetries, "Fault"),
      fire: extractBoolean(telemetries, "Fire"),
      firstStage: extractBoolean(telemetries, "1st Stage Alarm"),
      secondStage: extractBoolean(telemetries, "2nd Stage Alarm"),
      discharged: extractBoolean(telemetries, "Discharged"),
      extract: extractBoolean(telemetries, "Extract"),
      modeAuto: extractBoolean(telemetries, "Mode Auto"),
      hold: extractBoolean(telemetries, "Hold"),
      abort: extractBoolean(telemetries, "Abort"),
      reset: extractBoolean(telemetries, "Reset"),
      localFire: extractBoolean(telemetries, "Local Fire"),
      lastUpdated: new Date().toISOString(),
    }),
    [telemetries],
  );

  const executeMutation = useMutation({
    mutationFn: (command: string) => fireAlarmApi.execute(command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fire-alarm"] });
    },
  });

  return { state, isLoading, sendCommand: executeMutation.mutate };
}
