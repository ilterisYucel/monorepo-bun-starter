import type { FieldContainer } from "../containers/services/containersApi";

/** Snapshot taşıyan en küçük şekil — FieldContainer ve ContainerSummary ikisi de uyar. */
export type SnapshotCarrier = Pick<FieldContainer, "latestTelemetry">;

/** PCS satırı — saha PANO topoloji sütunu (B4). */
export interface PcsRow {
  pcsId: string;
  connected: boolean;
  activePower: number;
}

/** Ortalama SoC/SoH sonucu — kayıt yoksa null (UI "—" gösterir). */
export interface SocSohAverages {
  avgSoc: number | null;
  avgSoh: number | null;
}

/** Saha geneli şarj/deşarj limit toplamları (kW). */
export interface PowerLimits {
  chargeKw: number;
  dischargeKw: number;
}

const isNumber = (v: unknown): v is number => typeof v === "number";

/**
 * Faz 5.1 B4 — EMU sütunu: EMU-* cihazlarının sistem seviyesi metrikleri.
 *
 * Tüm konteyner snapshot'larından deviceId'si "EMU-" ile başlayan satırlar
 * toplanır; isim başına en yeni timestamp'li satır kazanır (dedup). Dönüş:
 * metrik adı → sayısal değer (sayısal olmayanlar atlanır).
 */
export function deriveEmuMetrics(
  containers: SnapshotCarrier[],
): Record<string, number> {
  const byName = new Map<string, { value: number; timestamp: string }>();
  for (const container of containers) {
    for (const item of container.latestTelemetry) {
      if (!item.deviceId.startsWith("EMU-") || !isNumber(item.value)) continue;
      const existing = byName.get(item.name);
      if (!existing || (item.timestamp ?? "") >= existing.timestamp) {
        byName.set(item.name, { value: item.value, timestamp: item.timestamp ?? "" });
      }
    }
  }
  const metrics: Record<string, number> = {};
  for (const [name, entry] of byName) {
    metrics[name] = entry.value;
  }
  return metrics;
}

/**
 * Faz 5.1 B4 — PCS sütunu: snapshot'taki PCS-* cihazları.
 *
 * Snapshot yalnızca online cihazları taşıdığından (RealtimeSnapshotSource
 * `status='online'`), listede yer almak = bağlı. `activePower` = o cihazın
 * "AC Active Power" satırı (yoksa 0).
 */
export function derivePcsRows(containers: SnapshotCarrier[]): PcsRow[] {
  const byId = new Map<string, PcsRow>();
  for (const container of containers) {
    for (const item of container.latestTelemetry) {
      if (!item.deviceId.startsWith("PCS-")) continue;
      const existing = byId.get(item.deviceId);
      if (item.name === "AC Active Power" && isNumber(item.value)) {
        if (existing) existing.activePower = item.value;
        else byId.set(item.deviceId, { pcsId: item.deviceId, connected: true, activePower: item.value });
      } else if (!existing) {
        byId.set(item.deviceId, { pcsId: item.deviceId, connected: true, activePower: 0 });
      }
    }
  }
  return [...byId.values()];
}

/**
 * 2026-09-02 — Ort. SoC/SoH: BSC sistem seviyesi metrikleri.
 *
 * Snapshot'ta `tags.canonical === "soc"` / `"soh"` VE `tags.rack_id ===
 * "system"` olan satırlar sayılır (rack seviyesi hariç — AGENTS.md
 * canonical sözleşmesi). Tüm konteyner/BSC değerlerinin aritmetik
 * ortalaması; sayısal olmayanlar elenir. Kayıt yoksa ilgili alan `null`
 * döner (UI "—" gösterir). canonical tek yetkili yoldur — name fallback
 * YOKTUR ("BSC SOC" isimleri eşleşmez; device-service tags.canonical taşır).
 */
export function deriveSocSohAverages(
  containers: SnapshotCarrier[],
): SocSohAverages {
  let socSum = 0;
  let socCount = 0;
  let sohSum = 0;
  let sohCount = 0;
  for (const container of containers) {
    for (const item of container.latestTelemetry) {
      if (item.tags?.rack_id !== "system" || !isNumber(item.value)) continue;
      if (item.tags.canonical === "soc") {
        socSum += item.value;
        socCount++;
      } else if (item.tags.canonical === "soh") {
        sohSum += item.value;
        sohCount++;
      }
    }
  }
  return {
    avgSoc: socCount > 0 ? socSum / socCount : null,
    avgSoh: sohCount > 0 ? sohSum / sohCount : null,
  };
}

/**
 * 2026-09-02 — Şarj/deşarj limit toplamları (kW).
 *
 * Snapshot'ta `tags.canonical === "charge_power"` / `"discharge_power"` VE
 * `tags.rack_id === "system"` satırları konteyner başına toplanır; saha
 * geneli bu toplamların toplamıdır. Eksik kayıt → 0 (kart 0.0 kW gösterir).
 * 1 konteyner + 2 BSC × 500 kW → 1000 kW görünür.
 */
export function derivePowerLimits(containers: SnapshotCarrier[]): PowerLimits {
  let chargeKw = 0;
  let dischargeKw = 0;
  for (const container of containers) {
    for (const item of container.latestTelemetry) {
      if (item.tags?.rack_id !== "system" || !isNumber(item.value)) continue;
      if (item.tags.canonical === "charge_power") chargeKw += item.value;
      else if (item.tags.canonical === "discharge_power") dischargeKw += item.value;
    }
  }
  return { chargeKw, dischargeKw };
}
