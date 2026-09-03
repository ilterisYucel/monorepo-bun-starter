// apps/field/src/features/pcs/hooks/derivePcsSummaries.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { PcsSummary } from "../../containers/components/PcsCard";
import { derivePcsSummary } from "../../containers/hooks/pcsDerivation";

/** PCS özeti taşıyıcısı — ContainerSummary yapısal uyumludur. */
export interface PcsSummaryCarrier {
  containerId: string;
  name: string;
  connected: boolean;
  latestTelemetry: TelemetryData[];
}

/**
 * 2026-09-02 — PCS sayfası veri kaynağı.
 *
 * Her konteynerden `derivePcsSummary` (1 konteyner = 1 PCS sözleşmesi) ile
 * özet türetilir; PCS'i olmayan konteynerler atlanır (kart render edilmez).
 * Sıralama konteyner sırasını korur.
 */
export function deriveAllPcsSummaries(
  containers: PcsSummaryCarrier[],
): PcsSummary[] {
  const list: PcsSummary[] = [];
  for (const container of containers) {
    const pcs = derivePcsSummary(
      container.containerId,
      container.name,
      container.connected,
      container.latestTelemetry,
    );
    if (pcs) list.push(pcs);
  }
  return list;
}
