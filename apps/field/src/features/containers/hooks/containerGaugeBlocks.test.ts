import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { buildDeviceGaugeBlocks } from "./containerGaugeBlocks";

/**
 * containerGaugeBlocks sözleşmesi (2026-09-02 — konteyner Panel V2 formatı):
 *
 * Bloklar DashBoardPageV2 ile aynı yapıdadır; veri snapshot'tan gelir
 * (gerçek isimler + canonical tag'ler):
 * - BSC (cihaz başına): SoC/SoH (canonical soc/soh, rack system),
 *   Güç (charge_power→+, discharge_power→− işaretli), Voltaj (canonical voltage).
 * - HVAC (ünite başına): Sıcaklık (Supply Temp), Nem (Return Humidity),
 *   Çalışıyor (Equipment Status===2→1), Alarm (0 — snapshot'ta agregat yok).
 * - CB (tekleşik blok): CB1/CB2 Kapalı+Atmış.
 * - DC (tekleşik blok): DC1/DC2 Voltaj+Akım.
 * - PM5340: Voltaj/Akım/Güç/Enerji (Voltage L-L Avg / Current Avg /
 *   Active Power Total / Active Energy Delivered).
 * - EP203: Yangın/Arıza/1.Kademe/Deşarj — telemetri yoksa 0 (dummy).
 * - PCS blok ÜRETMEZ (PcsCard'ın alanı — 2026-09-02 PCS sayfası).
 * - Temalar: BSC=success, HVAC=temp, CB=warning, DC=info, PM5340/EP203=info.
 */

function point(
  deviceId: string,
  name: string,
  value: unknown,
  tags?: Record<string, string>,
): TelemetryData {
  return {
    deviceId,
    name,
    value,
    description: "",
    unit: "",
    timestamp: "2026-09-02T12:00:00.000Z",
    ...(tags ? { tags } : {}),
  };
}

const sys = (canonical: string): Record<string, string> => ({
  canonical,
  rack_id: "system",
});

const t = (key: string): string => key;

describe("buildDeviceGaugeBlocks — BSC (V2 formatı)", () => {
  it("cihaz başına success temalı 4 gauge üretir (canonical eşleme)", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("BSC-1", "BSC SOC", 50, sys("soc")),
        point("BSC-1", "BSC SOH", 99, sys("soh")),
        point("BSC-1", "Charge Power Limit", 500, sys("charge_power")),
        point("BSC-1", "BSC DC Voltage", 748, sys("voltage")),
        point("BSC-2", "BSC SOC", 60, sys("soc")),
        point("BSC-2", "BSC SOH", 97, sys("soh")),
        point("BSC-2", "Discharge Power Limit", 400, sys("discharge_power")),
        point("BSC-2", "BSC DC Voltage", 720, sys("voltage")),
      ],
      t,
    );

    const bsc1 = blocks.find((b) => b.deviceId === "BSC-1");
    const bsc2 = blocks.find((b) => b.deviceId === "BSC-2");
    expect(bsc1?.theme).toBe("success");
    expect(bsc1?.gauges).toHaveLength(4);
    expect(bsc1?.gauges[0]).toMatchObject({ value: 50, label: "SoC", unit: "%", max: 100 });
    expect(bsc1?.gauges[1]).toMatchObject({ value: 99, label: "SoH", unit: "%", max: 100 });
    expect(bsc1?.gauges[2]).toMatchObject({ value: 500, label: t("device.power"), min: -500, max: 500 });
    expect(bsc1?.gauges[3]).toMatchObject({ value: 748, label: t("device.voltage"), unit: "V", max: 5000 });
    expect(bsc2?.gauges[2].value).toBe(-400);
  });

  it("eksik canonical kayıt → 0; rack seviyesi satırlar sayılmaz", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("BSC-1", "BSC SOC", 88, { canonical: "soc", rack_id: "1" }),
      ],
      t,
    );
    const bsc = blocks.find((b) => b.deviceId === "BSC-1")!;
    expect(bsc.gauges.every((g) => g.value === 0)).toBe(true);
  });
});

describe("buildDeviceGaugeBlocks — HVAC (V2 formatı)", () => {
  it("ünite başına temp temalı 4 gauge üretir", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("HVAC-1", "Supply Temp", 21.5),
        point("HVAC-1", "Return Humidity", 55),
        point("HVAC-1", "Equipment Status", 2),
        point("HVAC-2", "Supply Temp", 24.5),
        point("HVAC-2", "Return Humidity", 48),
        point("HVAC-2", "Equipment Status", 1),
      ],
      t,
    );

    expect(blocks.filter((b) => b.deviceId.startsWith("HVAC"))).toHaveLength(2);
    const h1 = blocks.find((b) => b.deviceId === "HVAC-1");
    expect(h1?.theme).toBe("temp");
    expect(h1?.gauges).toHaveLength(4);
    expect(h1?.gauges[0]).toMatchObject({ value: 21.5, label: t("device.temperature"), unit: "°C", max: 50 });
    expect(h1?.gauges[1]).toMatchObject({ value: 55, label: t("device.humidity"), unit: "%", max: 100 });
    expect(h1?.gauges[2].value).toBe(1);
    expect(h1?.gauges[3].value).toBe(0);
    const h2 = blocks.find((b) => b.deviceId === "HVAC-2");
    expect(h2?.gauges[2].value).toBe(0);
  });

  it("eksik telemetri → 0 (4 gauge yine üretilir)", () => {
    const blocks = buildDeviceGaugeBlocks([point("HVAC-1", "Supply Temp", 20)], t);
    const h1 = blocks.find((b) => b.deviceId === "HVAC-1")!;
    expect(h1.gauges).toHaveLength(4);
    expect(h1.gauges[0].value).toBe(20);
    expect(h1.gauges.slice(1).every((g) => g.value === 0)).toBe(true);
  });
});

describe("buildDeviceGaugeBlocks — CB + DC (V2 formatı)", () => {
  it("CB tekleşik warning bloğu: CB1/CB2 Kapalı+Atmış", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("CB-1", "Is Closed", true),
        point("CB-1", "Is Tripped", false),
        point("CB-2", "Is Closed", false),
        point("CB-2", "Is Tripped", true),
      ],
      t,
    );
    const cb = blocks.find((b) => b.deviceId.startsWith("CB"))!;
    expect(cb.deviceId).toBe("CB-1, CB-2");
    expect(cb.theme).toBe("warning");
    expect(cb.gauges).toHaveLength(4);
    expect(cb.gauges[0]).toMatchObject({ value: 1, label: `CB-1 ${t("status.closed")}` });
    expect(cb.gauges[1]).toMatchObject({ value: 0, label: `CB-1 ${t("status.tripped")}` });
    expect(cb.gauges[2]).toMatchObject({ value: 0, label: `CB-2 ${t("status.closed")}` });
    expect(cb.gauges[3]).toMatchObject({ value: 1, label: `CB-2 ${t("status.tripped")}` });
  });

  it("DC tekleşik info bloğu: DC1/DC2 Voltaj+Akım", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("DC-1", "Actual Voltage", 512),
        point("DC-1", "Actual Current", 41),
        point("DC-2", "Actual Voltage", 505),
        point("DC-2", "Actual Current", 38),
      ],
      t,
    );
    const dc = blocks.find((b) => b.deviceId.startsWith("DC"))!;
    expect(dc.deviceId).toBe("DC-1, DC-2");
    expect(dc.theme).toBe("info");
    expect(dc.gauges).toHaveLength(4);
    expect(dc.gauges[0]).toMatchObject({ value: 512, label: `DC-1 ${t("device.voltage")}`, max: 5000 });
    expect(dc.gauges[1]).toMatchObject({ value: 41, label: `DC-1 ${t("device.current")}`, max: 200 });
  });

  it("CB/DC telemetrisi yoksa blok üretilmez", () => {
    const blocks = buildDeviceGaugeBlocks([point("BSC-1", "BSC SOC", 50, sys("soc"))], t);
    expect(blocks.some((b) => b.deviceId.startsWith("CB"))).toBe(false);
    expect(blocks.some((b) => b.deviceId.startsWith("DC"))).toBe(false);
  });
});

describe("buildDeviceGaugeBlocks — PM5340 + EP203 (V2 formatı)", () => {
  it("PM5340 info bloğu: Voltaj/Akım/Güç/Enerji", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("PM5340-1", "Voltage L-L Avg", 398),
        point("PM5340-1", "Current Avg", 120),
        point("PM5340-1", "Active Power Total", 82.4),
        point("PM5340-1", "Active Energy Delivered", 1520),
      ],
      t,
    );
    const ea = blocks.find((b) => b.deviceId === "PM5340-1");
    expect(ea?.theme).toBe("info");
    expect(ea?.gauges).toHaveLength(4);
    expect(ea?.gauges[0]).toMatchObject({ value: 398, label: t("device.voltage"), unit: "V", max: 500 });
    expect(ea?.gauges[1]).toMatchObject({ value: 120, label: t("device.current"), unit: "A", max: 200 });
    expect(ea?.gauges[2]).toMatchObject({ value: 82.4, label: t("device.power"), unit: "kW", max: 500 });
    expect(ea?.gauges[3]).toMatchObject({ value: 1520, label: t("device.energy"), unit: "kWh", max: 10000 });
  });

  it("EP203 her zaman render edilir; telemetri yoksa 0 (dummy)", () => {
    const blocks = buildDeviceGaugeBlocks([], t);
    const fp = blocks.find((b) => b.deviceId === "EP203");
    expect(fp?.theme).toBe("info");
    expect(fp?.gauges).toHaveLength(4);
    expect(fp?.gauges.every((g) => g.value === 0)).toBe(true);
  });

  it("EP203 telemetrisi varsa gerçek değerler gelir", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("EP203", "Fire", true),
        point("EP203", "Fault", false),
        point("EP203", "1st Stage Alarm", true),
        point("EP203", "Discharged", false),
      ],
      t,
    );
    const fp = blocks.find((b) => b.deviceId === "EP203");
    expect(fp?.gauges.map((g) => g.value)).toEqual([1, 0, 1, 0]);
    expect(fp?.gauges.map((g) => g.label)).toEqual([
      t("fire.fire"),
      t("fire.fault"),
      t("fire.firstStage"),
      t("fire.discharged"),
    ]);
  });

  it("PCS cihazları blok üretmez (PcsCard'ın alanı)", () => {
    const blocks = buildDeviceGaugeBlocks(
      [
        point("PCS-1", "Active Power", 50),
        point("BSC-1", "BSC SOC", 50, sys("soc")),
      ],
      t,
    );
    expect(blocks.map((b) => b.deviceId)).toContain("BSC-1");
    expect(blocks.some((b) => b.deviceId.startsWith("PCS"))).toBe(false);
  });
});
