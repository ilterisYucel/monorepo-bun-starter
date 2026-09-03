import { describe, it, expect } from "vitest";
import {
  deriveEmuMetrics,
  derivePcsRows,
  deriveSocSohAverages,
  derivePowerLimits,
} from "./deriveDashboard";
import type { FieldContainer } from "../containers/services/containersApi";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Faz 5.1 B4 — saha PANO sözleşmesi: mock veri YOKTUR.
 * Topoloji konteyner snapshot'ından türetilir:
 * - EMU sütunu: EMU-* deviceId'li satırlar (isim başına en yeni değer).
 * - PCS sütunu: PCS-* deviceId'li cihazlar (snapshot'ta varsa bağlı).
 * - Ort. SoC/SoH: canonical "soc"/"soh" + rack_id "system" satırları (BSC).
 * - Şarj/deşarj limitleri: canonical "charge_power"/"discharge_power" (system).
 */

const point = (
  deviceId: string,
  name: string,
  value: unknown,
  timestamp = "2026-08-25T12:00:00.000Z",
  tags?: Record<string, string>,
): TelemetryData =>
  ({
    deviceId,
    name,
    value,
    description: "",
    unit: "",
    timestamp,
    ...(tags ? { tags } : {}),
  }) as TelemetryData;

const container = (telemetry: TelemetryData[]): FieldContainer => ({
  containerId: "c-1",
  layout: { x: 0, y: 0, z: 0 },
  connectionStatus: "connected",
  latestTelemetry: telemetry,
});

describe("deriveEmuMetrics (B4)", () => {
  it("EMU-* satırlarını isim→değer eşler; aynı isimde en yeni kazanır", () => {
    const metrics = deriveEmuMetrics([
      container([
        point("EMU-1", "System SOC", 85),
        point("EMU-1", "Active Power", 120, "2026-08-25T11:00:00.000Z"),
        point("EMU-1", "Active Power", 140, "2026-08-25T12:00:00.000Z"),
        point("BSC-1", "SOC", 90),
      ]),
    ]);
    expect(metrics["System SOC"]).toBe(85);
    expect(metrics["Active Power"]).toBe(140);
    expect(metrics["SOC"]).toBeUndefined();
  });

  it("EMU yoksa boş eşleme", () => {
    expect(deriveEmuMetrics([container([point("BSC-1", "SOC", 90)])])).toEqual(
      {},
    );
  });
});

describe("derivePcsRows (B4)", () => {
  it("benzersiz PCS-* cihazları, snapshot'ta varsa bağlı", () => {
    const rows = derivePcsRows([
      container([
        point("PCS-1", "AC Active Power", -50),
        point("PCS-1", "DC Voltage", 800),
        point("PCS-2", "AC Active Power", 30),
        point("BSC-1", "SOC", 90),
      ]),
    ]);
    expect(rows.map((r) => r.pcsId)).toEqual(["PCS-1", "PCS-2"]);
    expect(rows.every((r) => r.connected)).toBe(true);
    expect(rows[0].activePower).toBe(-50);
    expect(rows[1].activePower).toBe(30);
  });

  it("PCS yoksa boş liste", () => {
    expect(derivePcsRows([container([])])).toEqual([]);
  });
});

describe("deriveSocSohAverages (2026-09-02)", () => {
  it("canonical soc/soh + rack_id system satırlarının ortalamasını alır", () => {
    const result = deriveSocSohAverages([
      container([
        point("BSC-1", "BSC SOC", 50, undefined, {
          canonical: "soc",
          rack_id: "system",
        }),
        point("BSC-2", "BSC SOC", 40, undefined, {
          canonical: "soc",
          rack_id: "system",
        }),
        point("BSC-1", "BSC SOH", 99, undefined, {
          canonical: "soh",
          rack_id: "system",
        }),
        point("BSC-2", "BSC SOH", 97, undefined, {
          canonical: "soh",
          rack_id: "system",
        }),
      ]),
    ]);
    expect(result.avgSoc).toBe(45);
    expect(result.avgSoh).toBe(98);
  });

  it("rack_id system olmayan (rack seviyesi) satırlar dahil edilmez", () => {
    const result = deriveSocSohAverages([
      container([
        point("BSC-1", "BSC SOC", 50, undefined, {
          canonical: "soc",
          rack_id: "1",
        }),
      ]),
    ]);
    expect(result.avgSoc).toBeNull();
    expect(result.avgSoh).toBeNull();
  });

  it("canonical etiketi olmayan name eşleşmeleri sayılmaz", () => {
    const result = deriveSocSohAverages([
      container([point("BSC-1", "BSC SOC", 50, undefined, { rack_id: "system" })]),
    ]);
    expect(result.avgSoc).toBeNull();
  });

  it("sayısal olmayan değerler atlanır; boş giriş → null", () => {
    expect(
      deriveSocSohAverages([
        container([
          point("BSC-1", "BSC SOC", "n/a", undefined, {
            canonical: "soc",
            rack_id: "system",
          }),
        ]),
      ]),
    ).toEqual({ avgSoc: null, avgSoh: null });
    expect(deriveSocSohAverages([])).toEqual({ avgSoc: null, avgSoh: null });
  });

  it("çok konteynerli saha ortalaması (konteyner sınırı yok)", () => {
    const c2: FieldContainer = {
      containerId: "c-2",
      layout: { x: 0, y: 0, z: 0 },
      connectionStatus: "connected",
      latestTelemetry: [
        point("BSC-3", "BSC SOC", 60, undefined, {
          canonical: "soc",
          rack_id: "system",
        }),
      ],
    };
    const result = deriveSocSohAverages([
      container([
        point("BSC-1", "BSC SOC", 50, undefined, {
          canonical: "soc",
          rack_id: "system",
        }),
      ]),
      c2,
    ]);
    expect(result.avgSoc).toBe(55);
  });
});

describe("derivePowerLimits (2026-09-02)", () => {
  it("canonical charge_power/discharge_power (system) toplamını üretir", () => {
    const result = derivePowerLimits([
      container([
        point("BSC-1", "Charge Power Limit", 500, undefined, {
          canonical: "charge_power",
          rack_id: "system",
        }),
        point("BSC-2", "Charge Power Limit", 500, undefined, {
          canonical: "charge_power",
          rack_id: "system",
        }),
        point("BSC-1", "Discharge Power Limit", 500, undefined, {
          canonical: "discharge_power",
          rack_id: "system",
        }),
        point("BSC-2", "Discharge Power Limit", 500, undefined, {
          canonical: "discharge_power",
          rack_id: "system",
        }),
      ]),
    ]);
    expect(result.chargeKw).toBe(1000);
    expect(result.dischargeKw).toBe(1000);
  });

  it("eksik kayıt → 0", () => {
    const result = derivePowerLimits([
      container([point("BSC-1", "BSC SOC", 50)]),
    ]);
    expect(result).toEqual({ chargeKw: 0, dischargeKw: 0 });
    expect(derivePowerLimits([])).toEqual({ chargeKw: 0, dischargeKw: 0 });
  });

  it("çok konteynerli saha toplamı", () => {
    const c2: FieldContainer = {
      containerId: "c-2",
      layout: { x: 0, y: 0, z: 0 },
      connectionStatus: "connected",
      latestTelemetry: [
        point("BSC-3", "Charge Power Limit", 500, undefined, {
          canonical: "charge_power",
          rack_id: "system",
        }),
      ],
    };
    const result = derivePowerLimits([
      container([
        point("BSC-1", "Charge Power Limit", 500, undefined, {
          canonical: "charge_power",
          rack_id: "system",
        }),
        point("BSC-1", "Discharge Power Limit", 500, undefined, {
          canonical: "discharge_power",
          rack_id: "system",
        }),
      ]),
      c2,
    ]);
    expect(result.chargeKw).toBe(1000);
    expect(result.dischargeKw).toBe(500);
  });

  it("sayısal olmayan değerler atlanır", () => {
    const result = derivePowerLimits([
      container([
        point("BSC-1", "Charge Power Limit", "n/a", undefined, {
          canonical: "charge_power",
          rack_id: "system",
        }),
      ]),
    ]);
    expect(result).toEqual({ chargeKw: 0, dischargeKw: 0 });
  });
});
