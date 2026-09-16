import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deviceConfigFileSchema } from "@gd-monorepo/shared-types";


/**
 * Wattox PCS config sözleşmesi (PCS-WATTOX-MIMARISI.md T-P2):
 * - `config-field/pcs-1.json` deviceConfigFileSchema'dan geçer.
 * - Komut telemetrileri ve validate read-back'leri telemetri listesindeki
 *   ADLARA referans verir (isim çözümü device-service'te name bazlıdır).
 * - Bitfield register'ları telemetri listesinde kayıtlı adreslere karşılık
 *   gelir.
 * - İşaret konvansiyonu: charge komutu "-{{powerKw}}" (şarj NEGATİF).
 */

interface PcsConfigRaw {
  deviceId: string;
  transport?: { kind?: string; type?: string };
  telemetry: Array<{
    name: string;
    registerAddress?: number;
    registerTableType?: string;
    registerDataType?: string;
  }>;
  bitfieldConfigs?: Array<{ registerAddress: number; fields: unknown[] }>;
  commands?: Record<string, {
    telemetries: Array<{ name: string; value: unknown }>;
    validate?: { reads: Array<{ name: string; expect: string | number | boolean }> };
  }>;
}

function loadRaw(): PcsConfigRaw {
  return JSON.parse(
    readFileSync(join(__dirname, "../deployment/config-field/pcs-1.json"), "utf-8"),
  ) as PcsConfigRaw;
}

describe("config-field/pcs-1.json (Wattox PCS)", () => {
  it("şemadan geçer", () => {
    const raw = loadRaw();
    const parsed = deviceConfigFileSchema.parse(raw);
    expect(parsed.deviceId).toBe("PCS-1");
    expect(raw.transport?.kind).toBe("simulator");
    expect(raw.transport?.type).toBe("wattox-pcs");
  });

  it("komut telemetri adları telemetri listesinde mevcuttur", () => {
    const config = loadRaw();
    const names = new Set(config.telemetry.map((t) => t.name));
    for (const command of Object.values(config.commands ?? {})) {
      for (const t of command.telemetries) {
        expect(names.has(t.name)).toBe(true);
      }
      for (const read of command.validate?.reads ?? []) {
        expect(names.has(read.name)).toBe(true);
      }
    }
  });

  it("charge komutu şarj NEGATİF konvansiyonunu taşır", () => {
    const config = loadRaw();
    const charge = config.commands?.["charge"];
    expect(charge?.telemetries).toContainEqual({
      name: "Active Power Setpoint",
      value: "-{{powerKw}}",
    });
    const discharge = config.commands?.["discharge"];
    expect(discharge?.telemetries).toContainEqual({
      name: "Active Power Setpoint",
      value: "{{powerKw}}",
    });
  });

  it("validate ilişki sözcükleri: negative/positive/zero", () => {
    const config = loadRaw();
    const reads = Object.values(config.commands ?? {}).flatMap(
      (c) => c.validate?.reads ?? [],
    );
    const relationReads = reads.filter(
      (r) =>
        r.expect === "negative" ||
        r.expect === "positive" ||
        r.expect === "zero",
    );
    expect(relationReads.length).toBeGreaterThanOrEqual(3);
  });

  it("bitfield register'ları telemetri adreslerinde kayıtlı", () => {
    const config = loadRaw();
    const addresses = new Set(
      config.telemetry.map((t) => t.registerAddress as number),
    );
    for (const bf of config.bitfieldConfigs ?? []) {
      expect(addresses.has(bf.registerAddress)).toBe(true);
    }
  });

  it("BMS bloğu B01-B23 tam kapsamda (768-790)", () => {
    const config = loadRaw();
    const bmsAddresses = config.telemetry
      .filter((t) => (t.registerAddress as number) >= 768 && (t.registerAddress as number) <= 790)
      .map((t) => t.registerAddress as number);
    expect(bmsAddresses.length).toBe(23);
  });

  it("alarm sözcükleri Appendix 3 bitfield'larına bölünmüş", () => {
    const config = loadRaw();
    const alarmBitfields = (config.bitfieldConfigs ?? []).filter(
      (b) => b.registerAddress >= 12223 && b.registerAddress <= 12230,
    );
    expect(alarmBitfields.length).toBe(8);
    expect(alarmBitfields.flatMap((b) => b.fields).length).toBeGreaterThan(10);
  });

  it("S-register'ları HOLDING_REGISTER olarak kayıtlı", () => {
    const config = loadRaw();
    const setting = config.telemetry.find((t) => t.name === "Active Power Setpoint");
    expect(setting?.registerTableType).toBe("HOLDING_REGISTER");
    expect(setting?.registerDataType).toBe("INT16");
  });
});
