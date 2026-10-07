import { apiClient } from "../../lib/api-client";
import type {
  TelemetryData,
  ManeuverRecord,
  OperationRecord,
  OperationRunRecord,
  OperationRunResult,
} from "@gd-monorepo/shared-types";

/**
 * Demo-field backend istemcisi — mevcut field/web-service uçlarını tüketir
 * (SPEC §4.1). Yeni endpoint AÇILMAZ (K12/Open-Closed).
 */

/** GET /api/fields/:id/containers yanıtı (field app ile aynı sözleşme). */
export interface FieldContainer {
  containerId: string;
  layout?: { x: number; y: number; z: number };
  connectionStatus: "idle" | "connected" | "stale" | "error";
  lastSeenAt?: string;
  latestTelemetry: TelemetryData[];
}

export interface ExecuteBody {
  params?: Record<string, unknown>;
  deviceIds?: string[];
  timer?: { durationSeconds: number };
}

export const demoApi = {
  containers: async (fieldId: string): Promise<FieldContainer[]> => {
    const { data } = await apiClient.get<FieldContainer[]>(
      `/fields/${fieldId}/containers`,
    );
    return data;
  },

  downsampled: async (
    fieldId: string,
    opts: { from: string; to: string; points: number; containerIds?: string[] },
  ): Promise<Record<string, TelemetryData[]>> => {
    const { data } = await apiClient.get<Record<string, TelemetryData[]>>(
      `/fields/${fieldId}/telemetry/downsampled`,
      {
        params: {
          from: opts.from,
          to: opts.to,
          points: opts.points,
          ...(opts.containerIds ? { containerIds: opts.containerIds.join(",") } : {}),
        },
      },
    );
    return data;
  },

  /** Field-tier cihazların son telemetrisi (PCS/MV — konteyner payload'ında yok). */
  unifiedLatest: async (
    deviceIds: string[],
    signal?: AbortSignal,
  ): Promise<TelemetryData[]> => {
    const { data } = await apiClient.get<{ telemetries: TelemetryData[] }>(
      "/unified/telemetry/latest",
      { params: { deviceIds: deviceIds.join(",") }, signal },
    );
    return data.telemetries ?? [];
  },

  /** Field-tier cihazların tarihsel (downsampled) telemetrisi — trend kaynağı. */
  unifiedDownsampled: async (
    deviceIds: string[],
    opts: { from: string; to: string; points: number; names?: string[] },
    signal?: AbortSignal,
  ): Promise<TelemetryData[]> => {
    const { data } = await apiClient.get<{ telemetries: TelemetryData[] }>(
      "/unified/telemetry/downsampled",
      {
        params: {
          deviceIds: deviceIds.join(","),
          from: opts.from,
          to: opts.to,
          points: opts.points,
          ...(opts.names && opts.names.length > 0 ? { names: opts.names.join(",") } : {}),
        },
        signal,
      },
    );
    return data.telemetries ?? [];
  },

  listManeuvers: async (signal?: AbortSignal): Promise<ManeuverRecord[]> => {
    const { data } = await apiClient.get<{ maneuvers: ManeuverRecord[] }>(
      "/maneuvers",
      { signal },
    );
    return data.maneuvers ?? [];
  },

  listOperations: async (signal?: AbortSignal): Promise<OperationRecord[]> => {
    const { data } = await apiClient.get<{ operations: OperationRecord[] }>(
      "/operations",
      { signal },
    );
    return data.operations ?? [];
  },

  executeManeuver: async (
    name: string,
    body: ExecuteBody = {},
  ): Promise<OperationRunResult> => {
    const { data } = await apiClient.post<OperationRunResult>(
      `/maneuvers/${name}/execute`,
      {
        params: body.params ?? {},
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
      },
    );
    return data;
  },

  executeOperation: async (
    name: string,
    body: ExecuteBody = {},
  ): Promise<OperationRunResult> => {
    const { data } = await apiClient.post<OperationRunResult>(
      `/operations/${name}/execute`,
      {
        params: body.params ?? {},
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
      },
    );
    return data;
  },

  listRuns: async (signal?: AbortSignal): Promise<OperationRunRecord[]> => {
    const { data } = await apiClient.get<{ runs: OperationRunRecord[] }>(
      "/operations/runs",
      { signal },
    );
    return data.runs ?? [];
  },

  /** MV kesici/toprak komutu (mevcut POST /api/commands/execute). */
  executeCommand: async (
    deviceId: string,
    command: string,
    params?: Record<string, unknown>,
  ): Promise<{ success?: boolean; reason?: string }> => {
    const { data } = await apiClient.post<{ success?: boolean; reason?: string }>(
      "/commands/execute",
      { deviceId, command, ...(params !== undefined ? { params } : {}) },
    );
    return data;
  },
};
