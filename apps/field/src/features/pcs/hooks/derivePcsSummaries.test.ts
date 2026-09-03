import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { deriveAllPcsSummaries } from "./derivePcsSummaries";
import type { PcsSummaryCarrier } from "./derivePcsSummaries";

/**
 * deriveAllPcsSummaries sözleşmesi (2026-09-02 — PCS sayfası):
 * - Her konteynerin snapshot'ından derivePcsSummary ile TEK PCS türetilir
 *   (1 konteyner = 1 PCS sözleşmesi).
 * - PCS'si olmayan konteyner listede yer almaz (PcsCard render edilmez).
 * - `connected` taşıyıcıdan gelir; `latestTelemetry` yalnızca o PCS'in
 *   satırlarına iner.
 */

const point = (deviceId: string, name: string, value: unknown): TelemetryData => ({
  deviceId,
  name,
  value,
  description: "",
  unit: "",
  timestamp: "2026-09-02T12:00:00.000Z",
});

const carrier = (
  containerId: string,
  connected: boolean,
  telemetry: TelemetryData[],
): PcsSummaryCarrier => ({
  containerId,
  name: containerId,
  connected,
  latestTelemetry: telemetry,
});

describe("deriveAllPcsSummaries (2026-09-02)", () => {
  it("konteyner başına bir PCS özeti üretir; PCS'siz konteyner atlanır", () => {
    const list = deriveAllPcsSummaries([
      carrier("c-1", true, [
        point("PCS-1", "AC Active Power", -50),
        point("BSC-1", "BSC SOC", 90),
      ]),
      carrier("c-2", true, [point("BSC-2", "BSC SOC", 80)]),
    ]);

    expect(list).toHaveLength(1);
    expect(list[0].pcsId).toBe("PCS-1");
    expect(list[0].containerId).toBe("c-1");
    expect(list[0].connected).toBe(true);
    expect(list[0].latestTelemetry.every((t) => t.deviceId === "PCS-1")).toBe(true);
  });

  it("boş giriş → boş liste", () => {
    expect(deriveAllPcsSummaries([])).toEqual([]);
  });
});
