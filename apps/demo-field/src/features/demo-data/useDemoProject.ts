import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DeviceAlarmState,
  LogEntry,
  OperationRunRecord,
} from "@gd-monorepo/shared-types";
import {
  DEMO_REST_MINUTES,
  deriveRestState,
  lastFullRunFinishedAt,
  restPhasesForRuns,
  thermalReady,
  type DemoReadyUnit,
  type NovaMimicState,
  type RestPhase,
  type RestState,
} from "@gd-monorepo/ui";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import { useDemoFieldData } from "./useDemoFieldData";
import { useDemoFieldTelemetry } from "./useDemoFieldTelemetry";
import { demoApi } from "./demoApi";
import { demoLogApi } from "./demoLogApi";
import { demoAlarmApi } from "./demoAlarmApi";
import { mapFieldToMimicState } from "./mapFieldToMimicState";
import { buildTrendSeries, TREND_SOURCE_NAMES } from "./buildTrendSeries";
import type { DemoTrendData } from "./buildTrendSeries";
import { deriveKpis, type NovaKpis } from "./deriveKpis";
import { deriveAlerts, type NovaAlert } from "./deriveAlerts";
import { DEMO_TOPOLOGY, FIELD_DEVICE_IDS } from "./demo-topology";

/**
 * Proje ekranları ortak veri katmanı (SPEC UC-2, K-4). Tek hook tüm proje
 * sekmelerinin ihtiyaç duyduğu veriyi çeker ve saf türevleri üretir:
 * containers + field telemetrisi → mimic state → KPI/uyarı/ready/trend/rest.
 */

export interface DemoProjectData {
  state: NovaMimicState;
  kpis: NovaKpis;
  alerts: NovaAlert[];
  trendData: DemoTrendData;
  restPhases: RestPhase[];
  rest: RestState;
  readyUnits: DemoReadyUnit[];
  runs: OperationRunRecord[];
  logs: LogEntry[];
  alarms: DeviceAlarmState[];
  loading: boolean;
  error: string | undefined;
}

export function useDemoProject(fieldId: string): DemoProjectData {
  const containers = useDemoFieldData();
  const telemetry = useDemoFieldTelemetry();

  const state = useMemo(
    () =>
      mapFieldToMimicState(containers.data ?? [], DEMO_TOPOLOGY, {
        extraTelemetry: telemetry.data ?? [],
      }),
    [containers.data, telemetry.data],
  );
  const kpis = useMemo(() => deriveKpis(state, DEMO_TOPOLOGY), [state]);
  const alerts = useMemo(() => deriveAlerts(state, DEMO_TOPOLOGY), [state]);

  const trends = useQuery({
    queryKey: ["demo-trends", fieldId],
    queryFn: () =>
      demoApi.unifiedDownsampled(FIELD_DEVICE_IDS, {
        from: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        to: new Date().toISOString(),
        points: 200,
        names: [...TREND_SOURCE_NAMES],
      }),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
  const trendData = useMemo(() => buildTrendSeries(trends.data ?? []), [trends.data]);

  const runsQuery = useQuery({
    queryKey: ["demo-runs", fieldId],
    queryFn: () => demoApi.listRuns(),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
  const logsQuery = useQuery({
    queryKey: ["demo-logs", fieldId],
    queryFn: ({ signal }) => demoLogApi.list({ limit: 100 }, signal),
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
  const alarmsQuery = useQuery({
    queryKey: ["demo-alarms", fieldId],
    queryFn: ({ signal }) => demoAlarmApi.list(signal),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);

  const rest = useMemo(
    () => deriveRestState(lastFullRunFinishedAt(runs), Date.now(), DEMO_REST_MINUTES),
    [runs],
  );
  const restPhases = useMemo(() => restPhasesForRuns(runs, DEMO_REST_MINUTES), [runs]);

  const readyUnits = useMemo<DemoReadyUnit[]>(
    () =>
      state.units.map((u) => {
        const tmin = Math.min(...u.banks.map((b) => b.tmin ?? b.tmax));
        const tmax = Math.max(...u.banks.map((b) => b.tmax));
        const ready = thermalReady(u.banks, DEMO_TOPOLOGY.limits);
        return {
          n: u.n,
          tmin,
          tmax,
          ready,
          note: ready
            ? `in band ${DEMO_TOPOLOGY.limits.tempMin}–${DEMO_TOPOLOGY.limits.tempMax} °C`
            : tmax > DEMO_TOPOLOGY.limits.tempMax
              ? `${tmax.toFixed(1)} °C > ${DEMO_TOPOLOGY.limits.tempMax} °C`
              : `${tmin.toFixed(1)} °C < ${DEMO_TOPOLOGY.limits.tempMin} °C`,
        };
      }),
    [state.units],
  );

  const error =
    containers.error ?? telemetry.error
      ? String(containers.error ?? telemetry.error)
      : undefined;

  return {
    state,
    kpis,
    alerts,
    trendData,
    restPhases,
    rest,
    readyUnits,
    runs,
    logs: logsQuery.data ?? [],
    alarms: alarmsQuery.data ?? [],
    loading: containers.isLoading,
    error,
  };
}

/** Proje sekmeleri yenileme yardımcısı (komut sonrası). Saf değil — hook. */
export function useDemoProjectRefresh(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["demo-field-containers"] });
    void qc.invalidateQueries({ queryKey: ["demo-runs"] });
    void qc.invalidateQueries({ queryKey: ["demo-alarms"] });
  };
}
