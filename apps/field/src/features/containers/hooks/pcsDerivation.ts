// apps/field/src/features/containers/hooks/pcsDerivation.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { PcsSummary } from "../components/PcsCard";

/** PCS config modal'ı girdisi — kayıt/bağlantı meta bilgileri + envanter. */
export interface PcsConfigInfo {
  pcsId: string;
  containerId: string;
  containerName: string;
  connected: boolean;
  lastSeenAt?: string;
  layout?: { x: number; y: number; z: number };
  telemetryNames: string[];
}

/** PCS durum kategorisi + i18n anahtarı. */
export interface PcsState {
  kind: "offline" | "charging" | "discharging" | "idle";
  statusKey: string;
}

const isNumber = (v: unknown): v is number => typeof v === "number";

/**
 * Konteyner başına TEK PCS sözleşmesi (2026-08-30):
 *
 * Snapshot'taki PCS- önekli benzersiz cihaz kimlikleri sıralanır ve İLKİ
 * kazanır — bir konteynere yalnızca bir PCS bağlıdır; snapshot'ta istisnai
 * olarak birden fazla PCS satırı varsa deterministik ilk kimlik seçilir.
 * PCS cihazı yoksa `undefined` döner (kart render edilmez).
 * Dönüşün `latestTelemetry` alanı yalnızca o cihazın satırlarını taşır.
 */
export function derivePcsSummary(
  containerId: string,
  containerName: string,
  connected: boolean,
  latestTelemetry: TelemetryData[],
): PcsSummary | undefined {
  const pcsIds = [
    ...new Set(
      latestTelemetry
        .filter((x) => x.deviceId.startsWith("PCS"))
        .map((x) => x.deviceId),
    ),
  ].sort();
  const pcsId = pcsIds[0];
  if (!pcsId) return undefined;
  return {
    pcsId,
    containerId,
    containerName,
    connected,
    latestTelemetry: latestTelemetry.filter((x) => x.deviceId === pcsId),
  };
}

/**
 * PCS durum kategorisi — bağlantı + işaretli AC aktif güç sözleşmesi:
 * bağlantı yoksa `offline`; güç negatifse şarj, pozitifse deşarj, sıfırsa
 * bekleme. `statusKey` UI katmanındaki i18n anahtarıdır.
 */
export function pcsState(connected: boolean, activePower: number): PcsState {
  if (!connected) return { kind: "offline", statusKey: "common.offline" };
  if (activePower < 0) return { kind: "charging", statusKey: "status.charging" };
  if (activePower > 0) return { kind: "discharging", statusKey: "status.discharging" };
  return { kind: "idle", statusKey: "status.idleMode" };
}

/**
 * PCS telemetrisinden name ile ilk sayısal değeri okur; satır yoksa veya
 * sayısal değilse 0 döner (gauge/kart beslemesi).
 */
export function pcsTelemetryValue(
  telemetry: TelemetryData[],
  name: string,
): number {
  const value = telemetry.find((x) => x.name === name)?.value;
  return isNumber(value) ? value : 0;
}

/**
 * Config modal'ı girdisi — kayıt/bağlantı meta bilgileri + akan telemetri
 * envanteri (unique isimler, alfabetik sıralı). Gerçek device config akışı
 * (container→field push) ayrı backend fazının konusudur.
 */
export function pcsConfigInfo(
  pcs: PcsSummary,
  lastSeenAt?: string,
  layout?: { x: number; y: number; z: number },
): PcsConfigInfo {
  return {
    pcsId: pcs.pcsId,
    containerId: pcs.containerId,
    containerName: pcs.containerName,
    connected: pcs.connected,
    ...(lastSeenAt ? { lastSeenAt } : {}),
    ...(layout ? { layout } : {}),
    telemetryNames: [...new Set(pcs.latestTelemetry.map((x) => x.name))].sort(),
  };
}
