import { apiClient } from "../../../lib/api-client";
import type {
  ManeuverRecord,
  OperationRecord,
  OperationRunRecord,
  OperationRunResult,
} from "@gd-monorepo/shared-types";

/**
 * Field manevra/operasyon API istemcisi — sunucu kataloğu (Faz D2: field UI
 * kataloğu TANIMLAMAZ; GET /api/maneuvers + /api/operations'tan okur;
 * yürütme POST /api/{maneuvers|operations}/:name/execute'ya devreder).
 */

export const fieldManeuverApi = {
  /** Sorgu — saha manevra kataloğu (PCS adımları deviceTypes seçicili). */
  listManeuvers: async (signal?: AbortSignal): Promise<ManeuverRecord[]> => {
    const response = await apiClient.get<{ maneuvers: ManeuverRecord[] }>(
      "/maneuvers",
      { signal },
    );
    return response.data.maneuvers ?? [];
  },

  /** Sorgu — saha operasyon kataloğu (FL-02/FL-11 çapraz sistem akışları). */
  listOperations: async (signal?: AbortSignal): Promise<OperationRecord[]> => {
    const response = await apiClient.get<{ operations: OperationRecord[] }>(
      "/operations",
      { signal },
    );
    return response.data.operations ?? [];
  },

  /** Komut — manevra çalıştır (params + grup kısıtı + timer). */
  executeManeuver: async (
    name: string,
    body: {
      params?: Record<string, unknown>;
      deviceIds?: string[];
      timer?: { durationSeconds: number };
    } = {},
  ): Promise<OperationRunResult> => {
    const response = await apiClient.post<OperationRunResult>(
      `/maneuvers/${name}/execute`,
      {
        params: body.params ?? {},
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
      },
    );
    return response.data;
  },

  /** Komut — operasyon çalıştır. */
  executeOperation: async (
    name: string,
    body: {
      params?: Record<string, unknown>;
      deviceIds?: string[];
      timer?: { durationSeconds: number };
    } = {},
  ): Promise<OperationRunResult> => {
    const response = await apiClient.post<OperationRunResult>(
      `/operations/${name}/execute`,
      {
        params: body.params ?? {},
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
      },
    );
    return response.data;
  },

  // ── Tanım YÖNETİMİ (yalnız admin — §11.2) ────────────────────────────────

  /** Komut — yeni operasyon tanımı (admin; mükerrer → 409). */
  createOperation: async (
    definition: OperationRecord,
  ): Promise<{ name: string }> => {
    const response = await apiClient.post<{ name: string }>(
      "/operations",
      definition,
    );
    return response.data;
  },

  /** Komut — operasyon tanımını günceller (upsert — PUT ek kısıt getirmez). */
  updateOperation: async (
    name: string,
    definition: OperationRecord,
  ): Promise<{ name: string }> => {
    const response = await apiClient.put<{ name: string }>(
      `/operations/${name}`,
      definition,
    );
    return response.data;
  },

  /** Komut — yumuşak silme (enabled=false; audit zinciri korunur). */
  deleteOperation: async (name: string): Promise<{ name: string }> => {
    const response = await apiClient.delete<{ name: string }>(
      `/operations/${name}`,
    );
    return response.data;
  },

  /** Sorgu — çalıştırma geçmişi (son N koşu). */
  listRuns: async (signal?: AbortSignal): Promise<OperationRunRecord[]> => {
    const response = await apiClient.get<{ runs: OperationRunRecord[] }>(
      "/operations/runs",
      { signal },
    );
    return response.data.runs ?? [];
  },
};
