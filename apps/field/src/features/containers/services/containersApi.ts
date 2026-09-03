// apps/field/src/features/containers/services/containersApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { TelemetryConfigResponse } from "../../devices/types/telemetry-config";
import type { DeviceInfo } from "../../field-devices/types/device";

/** Field API'sinin `/fields/:id/containers` yanıt satırı (Faz 2 T2.4 şekli). */
export interface FieldContainer {
  containerId: string;
  layout: {
    x: number;
    y: number;
    z: number;
  };
  connectionStatus: "idle" | "connected" | "stale" | "error";
  lastSeenAt?: string;
  latestTelemetry: TelemetryData[];
}

/** Tünel oturum açılışı sonucu — Set-Cookie tarayıcı tarafından saklanır. */
export interface OpenSessionOutcome {
  ok: boolean;
  status: number;
}

/**
 * Kayıt girdisi — POST /fields/:fieldId/containers/:containerId/register (T1.2).
 * 2026-08-30: containerUrl ALANI KALDIRILDI — field konteynere URL ile
 * bağlanmaz; bağlantı konteynerden field'a outbound WSS'tir (FieldConnector).
 */
export interface RegisterContainerPayload {
  containerId: string;
  token: string;
}

/**
 * containersApi — konteyner listeleme/telemetri/oturum uçları (Faz 5 T5.1/T5.3).
 * Tüm uçlar field web-service'te yaşar; telemetri snapshot'ları FieldConnector
 * push'undan (RealtimeSnapshotSource) gelir.
 */
export const containersApi = {
  list: async (fieldId: string): Promise<FieldContainer[]> => {
    const { data } = await apiClient.get(`/fields/${fieldId}/containers`);
    return data;
  },

  /**
   * Tarihsel downsampled seri — field API'si ContainerProxy üzerinden konteynere
   * `telemetry-query` kontrol frame'iyle sorar (Faz 5.1 B2 — outbound-only).
   * `from`/`to` ISO-8601'dir; verilmezse field tarafı son 24 saati seçer.
   */
  timeSeries: async (
    fieldId: string,
    containerId: string,
    points = 120,
    from?: string,
    to?: string,
  ): Promise<TelemetryData[]> => {
    const { data } = await apiClient.get(
      `/fields/${fieldId}/telemetry/${containerId}`,
      { params: { points, from, to } },
    );
    return data;
  },

  /**
   * Tünel oturumu açar — 302 + Path-scoped Set-Cookie; tarayıcı 302'yi izler
   * VE cookie'yi otomatik uygular (redirect'ten gelen Set-Cookie dahil).
   * Takip sonucu tünelden SPA HTML'dir (200). `redirect:"manual"` dev Vite
   * proxy'sinde opaque-redirect (status 0) üretiyordu — kullanılmaz.
   */
  openSession: async (
    fieldId: string,
    containerId: string,
  ): Promise<OpenSessionOutcome> => {
    const token = localStorage.getItem("auth-token");
    const res = await fetch(`/api/fields/${fieldId}/containers/${containerId}/session`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return { ok: res.ok, status: res.status };
  },

  /** Tünel oturumunu kapatır — session-end yayını + audit kapanışı (T5.3). */
  endSession: async (
    fieldId: string,
    containerId: string,
  ): Promise<{ closed: boolean }> => {
    const { data } = await apiClient.delete(
      `/fields/${fieldId}/containers/${containerId}/session`,
    );
    return data;
  },

  /**
   * 2026-09-02 — konteynerin cihaz listesi (MEVCUT HTTP tüneli üzerinden).
   *
   * Oturum AÇMAZ — çağıran önce openSession'ı başarıyla tamamlamış olmalı;
   * `container_session` cookie'si Path-scoped `/containers/<cid>/ui` olduğundan
   * tarayıcı bu fetch'te cookie'yi otomatik taşır → field wildcard proxy'si
   * isteği konteynerin `/api/unified/devices` ucuna akıtır. Hata → throw
   * (çağıran snapshot fallback'ine düşer).
   */
  listDevices: async (fieldId: string, containerId: string): Promise<DeviceInfo[]> => {
    const res = await fetch(`/containers/${containerId}/ui/api/unified/devices`);
    if (!res.ok) {
      throw new Error(`cihaz listesi alinamadi (${res.status})`);
    }
    const data = (await res.json()) as { devices?: DeviceInfo[] };
    return data.devices ?? [];
  },

  /**
   * 2026-09-02 — cihaz konfigürasyonu (register tablosu vb.) tünelden.
   * 404 → null (konteyner tarafında config dosyası yok); diğer hatalar
   * throw (modal hata durumu gösterir).
   */
  deviceConfig: async (
    fieldId: string,
    containerId: string,
    deviceId: string,
  ): Promise<TelemetryConfigResponse | null> => {
    const res = await fetch(
      `/containers/${containerId}/ui/api/unified/devices/${encodeURIComponent(deviceId)}/telemetry-config`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`config alinamadi (${res.status})`);
    }
    return (await res.json()) as TelemetryConfigResponse;
  },

  /**
   * Konteyner kaydı (T1.2 + 2026-08-28 UI) — kurulum adımı:
   * token'ın yalnızca SHA-256 hash'i field DB'sine yazılır (düz metin yok).
   * Aynı (fieldId, containerId) yeniden gönderilirse hash güncellenir
   * (UPSERT). Uç admin/boss yetkisi ister.
   */
  register: async (
    fieldId: string,
    payload: RegisterContainerPayload,
  ): Promise<{ registered: boolean; containerId: string }> => {
    const { data } = await apiClient.post(
      `/fields/${fieldId}/containers/${payload.containerId}/register`,
      { token: payload.token },
    );
    return data;
  },
};
