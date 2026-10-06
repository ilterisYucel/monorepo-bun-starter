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
      // CONTROL-PANEL-IO (EP203 kuru kontak) telemetri adları:
      fault: extractBoolean(telemetries, "Fault"),
      secondStage: extractBoolean(telemetries, "2nd Stage"),
      discharged: extractBoolean(telemetries, "Discharged"),
      // Kuru kontakta karşılığı olmayan relay'ler read-only kartta pasif kalır.
      fire: false,
      firstStage: false,
      extract: false,
      modeAuto: false,
      hold: false,
      abort: false,
      reset: false,
      localFire: false,
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
