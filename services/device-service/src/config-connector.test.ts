import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deviceConfigFileSchema } from "@gd-monorepo/shared-types";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";
import { parseBscPcsMapping } from "@gd-monorepo/simulators";

/**
 * BSC-PCS connector config sözleşmesi (BSC-PCS-CONNECTOR-MIMARISI T-C3):
 * - `bsc-pcs-connector-1.json` şemadan geçer; transport tipi bsc-pcs-connector.
 * - `bsc-pcs-mapping.json` strict parse edilir; tüm `to` adresleri BMS bloğunda.
 * - Mapping kaynak deviceId'leri config-docker'da mevcuttur (BSC-1; B19/B20
 *   sabittir — KONTEYNER-MANEVRA-KATALOGU-REV03 4.15, A7 kararı).
 */

function loadConnectorConfig(): DeviceConfigFile {
  return JSON.parse(
    readFileSync(
      join(__dirname, "../deployment/config-docker/bsc-pcs-connector-1.json"),
      "utf-8",
    ),
  ) as DeviceConfigFile;
}

function loadMapping() {
  const raw = readFileSync(
    join(__dirname, "../deployment/config-docker/mappings/bsc-pcs-mapping.json"),
    "utf-8",
  );
  return parseBscPcsMapping(raw);
}

describe("BSC-PCS connector config'leri", () => {
  it("connector cihaz config'i şemadan geçer", () => {
    const raw = loadConnectorConfig();
    const parsed = deviceConfigFileSchema.parse(raw);
    expect(parsed.deviceId).toBe("BSC-PCS-CONNECTOR-1");
    expect(raw.transport?.kind).toBe("simulator");
    expect(raw.transport?.type).toBe("bsc-pcs-connector");
  });

  it("mapping strict parse edilir; hedef adresler BMS bloğunda (768-790)", () => {
    const mapping = loadMapping();
    expect(mapping.mappings.length).toBe(24);
    for (const entry of mapping.mappings) {
      expect(entry.to).toBeGreaterThanOrEqual(768);
      expect(entry.to).toBeLessThanOrEqual(790);
    }
  });

  it("mapping B01-B23 tam kapsam: hedef adresler 768-790 aralığını doldurur", () => {
    const mapping = loadMapping();
    const addresses = new Set(mapping.mappings.map((m) => m.to));
    for (let addr = 768; addr <= 790; addr++) {
      expect(addresses.has(addr)).toBe(true);
    }
  });

  it("kaynak cihazlar config-docker'da mevcuttur (BSC-1; B19/B20 sabit)", () => {
    const mapping = loadMapping();
    const sources = new Set(
      mapping.mappings.flatMap((m) => (m.kind === "constant" ? [] : [m.from.deviceId])),
    );
    const bscExists = readFileSync(
      join(__dirname, "../deployment/config-docker/bsc-1.json"),
      "utf-8",
    ).includes("BSC-1");
    expect([...sources].every((s) => s === "BSC-1")).toBe(true);
    expect(bscExists).toBe(true);

    // B19/B20 (786/787) sabit nominal değerler (A7): 3500.0 kWh → 35000 (0.1 kWh)
    const b19 = mapping.mappings.find((m) => m.to === 786);
    const b20 = mapping.mappings.find((m) => m.to === 787);
    expect(b19?.kind).toBe("constant");
    expect(b20?.kind).toBe("constant");
  });

  it("connector telemetri adları benzersiz", () => {
    const config = loadConnectorConfig();
    const names = config.telemetry.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
