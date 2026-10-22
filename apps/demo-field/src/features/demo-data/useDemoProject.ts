import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DeviceAlarmState,
  LogEntry,
  OperationRunRecord,
} from "@gd-monorepo/shared-types";
import {
  DEMO_REST_ENABLED,
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
import { demoApi, type FieldContainer } from "./demoApi";
import { demoLogApi } from "./demoLogApi";
import { demoAlarmApi } from "./demoAlarmApi";
import { mapFieldToMimicState } from "./mapFieldToMimicState";
import { buildTrendSeries, TREND_SOURCE_NAMES } from "./buildTrendSeries";
import type { DemoTrendData } from "./buildTrendSeries";
import { deriveKpis, type NovaKpis } from "./deriveKpis";
import { alertKey, deriveAlerts, deriveAlertsRaw, type NovaAlert } from "./deriveAlerts";
import { DEMO_TOPOLOGY, FIELD_DEVICE_IDS } from "./demo-topology";
import { stationsFromTopology, type DemoStation } from "./demo-stations";
import { applyRmuControl, useRmuStore } from "./stores/RmuStore";
import { useFaultClearStore } from "./stores/FaultClearStore";

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
  /** Ham konteyner kayıtları. */
  containers: FieldContainer[];
  /** EMS topolojisinden gelen istasyonlar (yoksa statik fallback). */
  stations: DemoStation[];
  runs: OperationRunRecord[];
  logs: LogEntry[];
  alarms: DeviceAlarmState[];
  loading: boolean;
  error: string | undefined;
}

export function useDemoProject(fieldId: string): DemoProjectData {
  const containers = useDemoFieldData();
  const telemetry = useDemoFieldTelemetry();

  // Admin › arıza temizleme: `cleared` değişince state YENİ nesne olur → tüm
  // türevler (KPI, istasyon KPI'ları, izinler) yeniden hesaplanır.
  const cleared = useFaultClearStore((s) => s.cleared);
  const prune = useFaultClearStore((s) => s.prune);
  const h02Open = useRmuStore((s) => s.h02Open);
  const earthed = useRmuStore((s) => s.earthed);
  // EMS domain topolojisi (istasyon/fider/ünite + konteyner eşlemesi). Endpoint
  // yoksa statik DEMO_STATIONS'a düşer (standalone/test).
  const topology = useQuery({
    queryKey: ["demo-topology", fieldId],
    queryFn: ({ signal }) => demoApi.topology(fieldId, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
  const stations = useMemo(() => stationsFromTopology(topology.data), [topology.data]);

  const state = useMemo(
    () => ({
      ...applyRmuControl(
        mapFieldToMimicState(containers.data ?? [], DEMO_TOPOLOGY, {
          extraTelemetry: telemetry.data ?? [],
          stations,
        }),
        h02Open,
        earthed,
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleared: yeniden türetme tetikleyicisi
    [containers.data, telemetry.data, h02Open, earthed, cleared, stations],
  );
  const kpis = useMemo(() => deriveKpis(state, DEMO_TOPOLOGY), [state]);
  const alerts = useMemo(() => deriveAlerts(state, DEMO_TOPOLOGY), [state]);
  useEffect(() => {
    if (cleared.length > 0) prune(deriveAlertsRaw(state, DEMO_TOPOLOGY).map(alertKey));
  }, [state, cleared, prune]);

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
    refetchInterval: 2000,
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

  // Dinlenme kapalıyken (DEMO_REST_ENABLED=false) hiç dinlenme fazı/beklemesi üretilmez.
  const rest = useMemo<RestState>(
    () =>
      DEMO_REST_ENABLED
        ? deriveRestState(lastFullRunFinishedAt(runs), Date.now(), DEMO_REST_MINUTES)
        : { requiredMinutes: 0, complete: true },
    [runs],
  );
  const restPhases = useMemo(
    () => (DEMO_REST_ENABLED ? restPhasesForRuns(runs, DEMO_REST_MINUTES) : []),
    [runs],
  );

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
    containers: containers.data ?? [],
    stations,
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
