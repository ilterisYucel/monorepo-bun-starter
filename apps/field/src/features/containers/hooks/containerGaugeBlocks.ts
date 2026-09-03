// apps/field/src/features/containers/hooks/containerGaugeBlocks.ts
import type { DeviceGaugeItem, GaugeTheme } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/** DeviceGauges bloğu — cihaz başına tema + gauge listesi. */
export interface DeviceGaugeBlock {
  deviceId: string;
  theme: GaugeTheme;
  gauges: DeviceGaugeItem[];
}

/** Cihaz tipi → tema eşlemesi (2026-08-28 kararı + 2026-09-02 V2 genişlemesi). */
const TYPE_THEMES: Record<string, GaugeTheme> = {
  bsc: "success",
  cb: "warning",
  dc: "info",
  hvac: "temp",
};

function num(telemetry: TelemetryData[], deviceId: string, name: string): number {
  const value = telemetry.find(
    (x) => x.deviceId === deviceId && x.name === name,
  )?.value;
  return typeof value === "number" ? value : value === true ? 1 : value === false ? 0 : 0;
}

/** canonical tag + rack_id=system eşlemesi (BSC sistem seviyesi). */
function canonicalNum(
  telemetry: TelemetryData[],
  deviceId: string,
  canonical: string,
): number {
  const value = telemetry.find(
    (x) =>
      x.deviceId === deviceId &&
      x.tags?.canonical === canonical &&
      x.tags?.rack_id === "system",
  )?.value;
  return typeof value === "number" ? value : 0;
}

const sortedIds = (telemetry: TelemetryData[], prefix: string): string[] =>
  [
    ...new Set(
      telemetry
        .filter((x) => x.deviceId.startsWith(prefix))
        .map((x) => x.deviceId),
    ),
  ].sort();

/**
 * 2026-09-02 — Konteyner Panel V2 formatı (DashBoardPageV2 kopyası):
 *
 * - BSC (cihaz başına, success): SoC/SoH (canonical, rack system),
 *   Güç (charge_power→+ / discharge_power→− işaretli), Voltaj (canonical).
 * - HVAC (ünite başına, temp): Sıcaklık/Nem/Çalışıyor (Equipment Status
 *   ===2→1)/Alarm (0 — snapshot'ta alarm agregatı yok).
 * - CB (tekleşik, warning): CB1/CB2 Kapalı+Atmış.
 * - DC (tekleşik, info): DC1/DC2 Voltaj+Akım.
 * - PM5340 (info): Voltaj/Akım/Güç/Enerji.
 * - EP203 (info, her zaman render): Yangın/Arıza/1.Kademe/Deşarj —
 *   telemetri yoksa 0 (dummy — konteyner uygulamasıyla aynı davranış).
 * - PCS blok ÜRETMEZ (PcsCard'ın alanı — PCS sayfası).
 *
 * Sıralama V2 allBlocks düzeniyle aynıdır: BSC, HVAC, CB, DC, PM5340, EP203
 * — %50 genişlikte yan yana dizilince her görsel satır ≥8 gauge olur.
 */
export function buildDeviceGaugeBlocks(
  latestTelemetry: TelemetryData[],
  t: (key: string) => string,
): DeviceGaugeBlock[] {
  const blocks: DeviceGaugeBlock[] = [];

  // ---------- BSC (cihaz başına) ----------
  for (const deviceId of sortedIds(latestTelemetry, "BSC")) {
    const power =
      canonicalNum(latestTelemetry, deviceId, "charge_power") -
      canonicalNum(latestTelemetry, deviceId, "discharge_power");
    blocks.push({
      deviceId,
      theme: TYPE_THEMES.bsc,
      gauges: [
        { value: canonicalNum(latestTelemetry, deviceId, "soc"), label: "SoC", unit: "%", min: 0, max: 100, decimals: 0 },
        { value: canonicalNum(latestTelemetry, deviceId, "soh"), label: "SoH", unit: "%", min: 0, max: 100, decimals: 0 },
        { value: power, label: t("device.power"), unit: "kW", min: -500, max: 500, decimals: 1 },
        { value: canonicalNum(latestTelemetry, deviceId, "voltage"), label: t("device.voltage"), unit: "V", min: 0, max: 5000, decimals: 0 },
      ],
    });
  }

  // ---------- HVAC (ünite başına) ----------
  for (const deviceId of sortedIds(latestTelemetry, "HVAC")) {
    const running = num(latestTelemetry, deviceId, "Equipment Status") === 2 ? 1 : 0;
    blocks.push({
      deviceId,
      theme: TYPE_THEMES.hvac,
      gauges: [
        { value: num(latestTelemetry, deviceId, "Supply Temp"), label: t("device.temperature"), unit: "°C", min: 0, max: 50, decimals: 1 },
        { value: num(latestTelemetry, deviceId, "Return Humidity"), label: t("device.humidity"), unit: "%", min: 0, max: 100, decimals: 0 },
        { value: running, label: t("device.running"), unit: "", min: 0, max: 1, decimals: 0 },
        { value: 0, label: t("device.alarm"), unit: "", min: 0, max: 10, decimals: 0 },
      ],
    });
  }

  // ---------- CB (tekleşik blok) ----------
  const cbIds = sortedIds(latestTelemetry, "CB");
  if (cbIds.length > 0) {
    const gauges: DeviceGaugeItem[] = [];
    for (const deviceId of cbIds.slice(0, 2)) {
      gauges.push(
        { value: num(latestTelemetry, deviceId, "Is Closed"), label: `${deviceId} ${t("status.closed")}`, unit: "", min: 0, max: 1, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "Is Tripped"), label: `${deviceId} ${t("status.tripped")}`, unit: "", min: 0, max: 1, decimals: 0 },
      );
    }
    blocks.push({ deviceId: cbIds.join(", "), theme: TYPE_THEMES.cb, gauges });
  }

  // ---------- DC (tekleşik blok) ----------
  const dcIds = sortedIds(latestTelemetry, "DC");
  if (dcIds.length > 0) {
    const gauges: DeviceGaugeItem[] = [];
    for (const deviceId of dcIds.slice(0, 2)) {
      gauges.push(
        { value: num(latestTelemetry, deviceId, "Actual Voltage"), label: `${deviceId} ${t("device.voltage")}`, unit: "V", min: 0, max: 5000, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "Actual Current"), label: `${deviceId} ${t("device.current")}`, unit: "A", min: 0, max: 200, decimals: 0 },
      );
    }
    blocks.push({ deviceId: dcIds.join(", "), theme: TYPE_THEMES.dc, gauges });
  }

  // ---------- PM5340 (enerji analizörü) ----------
  const eaIds = sortedIds(latestTelemetry, "PM5340");
  for (const deviceId of eaIds.slice(0, 1)) {
    blocks.push({
      deviceId,
      theme: "info",
      gauges: [
        { value: num(latestTelemetry, deviceId, "Voltage L-L Avg"), label: t("device.voltage"), unit: "V", min: 0, max: 500, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "Current Avg"), label: t("device.current"), unit: "A", min: 0, max: 200, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "Active Power Total"), label: t("device.power"), unit: "kW", min: 0, max: 500, decimals: 1 },
        { value: num(latestTelemetry, deviceId, "Active Energy Delivered"), label: t("device.energy"), unit: "kWh", min: 0, max: 10000, decimals: 0 },
      ],
    });
  }

  // ---------- EP203 (yangın paneli — dummy destekli) ----------
  {
    const deviceId = sortedIds(latestTelemetry, "EP203")[0] ?? "EP203";
    blocks.push({
      deviceId,
      theme: "info",
      gauges: [
        { value: num(latestTelemetry, deviceId, "Fire"), label: t("fire.fire"), unit: "", min: 0, max: 1, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "Fault"), label: t("fire.fault"), unit: "", min: 0, max: 1, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "1st Stage Alarm"), label: t("fire.firstStage"), unit: "", min: 0, max: 1, decimals: 0 },
        { value: num(latestTelemetry, deviceId, "Discharged"), label: t("fire.discharged"), unit: "", min: 0, max: 1, decimals: 0 },
      ],
    });
  }

  return blocks;
}
