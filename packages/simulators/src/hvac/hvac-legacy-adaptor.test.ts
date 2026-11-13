import { describe, expect, it } from "vitest";
import { HVAC_SEQUENCE, runEquivalence } from "../physical/conformance/equivalence";
import { hvacPhysicalSide } from "../physical/conformance/hvac-sides";
import { createHvacLegacyAdaptor } from "./hvac-legacy-adaptor";

/**
 * `HvacLegacyAdaptor` testleri (UC-4 / T-8).
 *
 * SPEC: `SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` §6.4
 * - AK-4.1: adaptör + fiziksel yüz `uyumlu` profilde fark 0
 * - Remote On/Off okunabilir (legacy'de write-only idi — adaptörle düzelir)
 * - Purity (SC-1): kompresör/histerezis mantığı adaptörde değil
 */

const config = { deviceId: "HVAC-1" };

describe("HvacLegacyAdaptor — UC-4", () => {
  it("config'ten kurulur, geçersiz deviceId reddedilir", () => {
    expect(createHvacLegacyAdaptor(config).deviceId).toBe("HVAC-1");
    expect(() => createHvacLegacyAdaptor({ deviceId: "" })).toThrow("deviceId zorunlu");
  });

  it("Remote On/Off: 2 = kapalı (varsayılan), 1 yazınca açık okunur", () => {
    const adaptor = createHvacLegacyAdaptor(config);
    expect(adaptor.readHoldingRegister(0x202)).toBe(2);
    adaptor.writeHoldingRegister(0x202, 1);
    expect(adaptor.readHoldingRegister(0x202)).toBe(1);
    adaptor.writeHoldingRegister(0x202, 2);
    expect(adaptor.readHoldingRegister(0x202)).toBe(2);
  });

  it("AK-4.1 — adaptör ile fiziksel yüz `uyumlu` profilde fark 0", () => {
    const adaptor = createHvacLegacyAdaptor(config);
    const legacy = {
      read: (address: number, table?: "input" | "holding") =>
        table === "input"
          ? adaptor.readInputRegister(address)
          : adaptor.readHoldingRegister(address),
      write: (address: number, value: number) => adaptor.writeHoldingRegister(address, value),
      advance: (seconds: number) => adaptor.tick(seconds),
    };
    const rows = runEquivalence(legacy, hvacPhysicalSide(config), HVAC_SEQUENCE);
    expect(rows.filter((r) => r.diff)).toEqual([]);
  });

  it("setpoint doğrulaması modelden gelir: aralık dışı yazım reddedilir", () => {
    const adaptor = createHvacLegacyAdaptor(config);
    // Cooling Setpoint 0x0A: ham değer ×10; geçerli aralık 70–500 (7–50 °C).
    adaptor.writeHoldingRegister(0x0a, 1000); // 100 °C — aralık dışı
    const raw = adaptor.readHoldingRegister(0x0a);
    expect(raw).toBeGreaterThanOrEqual(70);
    expect(raw).toBeLessThanOrEqual(500);
  });

  it("varsayılanlar: soğutma setpoint 23,0 °C; bilinmeyen adres 0", () => {
    const adaptor = createHvacLegacyAdaptor(config);
    expect(adaptor.readHoldingRegister(0x0a)).toBe(230); // 23,0 °C (×10)
    // MC90 sözleşmesi: kullanılmayan adresler 0xFFFF döner (envanter §1.2).
    expect(adaptor.readHoldingRegister(0x9999)).toBe(0xffff);
    expect(adaptor.readInputRegister(0x9999)).toBe(0xffff);
    adaptor.tick(0);
    adaptor.tick(1.4); // yuvarlama → 1 sn
    expect(adaptor.readHoldingRegister(0x202)).toBe(2);
  });

  it("tick modeli ilerletir: uzaktan açık + sunucu sıcak → kompresör çalışır", () => {
    const adaptor = createHvacLegacyAdaptor({ ...config, zoneTempC: 35, outdoorTempC: 35 });
    adaptor.writeHoldingRegister(0x202, 1);
    adaptor.writeHoldingRegister(0x2000, 320); // Server Temp Max 32,0 °C
    adaptor.writeHoldingRegister(0x2001, 250); // Server Temp Min 25,0 °C
    adaptor.tick(120);
    expect(adaptor.readHoldingRegister(0x202)).toBe(1);
  });

  it("purity (SC-1): adaptör kompresör durum makinesi taşımaz", () => {
    const adaptor = createHvacLegacyAdaptor(config) as unknown as Record<string, unknown>;
    expect("state" in adaptor).toBe(false);
    expect("compressorOn" in adaptor).toBe(false);
  });
});
