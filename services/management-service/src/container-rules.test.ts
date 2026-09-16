import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { RuleConfigLoader } from "./rule-config-loader";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import { RuleEvaluator } from "./rule-evaluator";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Konteyner tier kural seti sözleşmesi (OTOMASYON-KURALLARI-MIMARISI.md §3 + WS5):
 *
 * - deployment/config/rules.json zod-valid ve STRICT şemadan geçer.
 * - tms_temp_diff_protect: global 30264/30265 telemetrileri (BSC-1/BSC-2,
 *   any-device) — rack farkı ≥10 VEYA pack farkı ≥5 → blok kalıbı TAM:
 *   PCS forbid_charge + forbid_discharge + BSC-1/BSC-2 stop + warn log +
 *   notify. Şarj/deşarj setpoint ASLA yazılmaz (interlock).
 * - Senkron davranış: snapshot eşik altındayken kural ATEŞLEMEZ; eşik üstü
 *   tek snapshot → tek ateşleme (kenar-tetik); cooldown dönüşü yeniden.
 */

const RULES_PATH = fileURLToPath(
  new URL("../deployment/config/rules.json", import.meta.url),
);
const DEVICE_CONFIG_DIR = fileURLToPath(
  new URL("../../device-service/config", import.meta.url),
);

function telemetry(
  deviceId: string,
  name: string,
  value: number,
): TelemetryData {
  return {
    deviceId,
    name,
    value,
    unit: "°C",
    timestamp: new Date().toISOString(),
  };
}

describe("konteyner rules.json (WS5)", () => {
  it("zod-valid + fail-fast yüklenir", () => {
    const loader = new RuleConfigLoader({
      rulesPath: RULES_PATH,
      deviceConfigDir: DEVICE_CONFIG_DIR,
    });
    const file = loader.loadRules();
    expect(file.rules.length).toBeGreaterThan(0);
    expect(file.rules[0]!.name).toBe("tms_temp_diff_protect");
  });

  it("blok aksiyon seti TAM (K-A2) ve şarj/deşarj setpoint YOK", () => {
    const loader = new RuleConfigLoader({
      rulesPath: RULES_PATH,
      deviceConfigDir: DEVICE_CONFIG_DIR,
    });
    const rule = loader.loadRules().rules[0]!;

    const commands = rule.then.filter(
      (a) => a.action === "command",
    ) as Array<{ action: "command"; deviceId: string; command: string }>;
    const byDevice = new Map<string, string[]>();
    for (const c of commands) {
      byDevice.set(c.deviceId, [...(byDevice.get(c.deviceId) ?? []), c.command]);
    }
    expect(byDevice.get("PCS-1")).toEqual(["forbid_charge", "forbid_discharge"]);
    expect(byDevice.get("BSC-1")).toEqual(["stop"]);
    expect(byDevice.get("BSC-2")).toEqual(["stop"]);

    // Interlock: şarj/deşarj BAŞLATAN komut YOK (forbid/stop dışı komut yasak).
    for (const c of commands) {
      expect(["forbid_charge", "forbid_discharge", "stop"]).toContain(c.command);
    }
    expect(rule.then.some((a) => a.action === "log")).toBe(true);
    expect(rule.then.some((a) => a.action === "notify")).toBe(true);
  });

  it("eşik altı snapshot → ATEŞLEMEZ", () => {
    const loader = new RuleConfigLoader({
      rulesPath: RULES_PATH,
      deviceConfigDir: DEVICE_CONFIG_DIR,
    });
    const catalog = loader.loadCatalog();
    const rules = loader.loadRules().rules;
    const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
    store.record("BSC-1", [
      telemetry("BSC-1", "Rack Max Diff Temp (Global)", 4),
      telemetry("BSC-1", "Rack Max Diff Temp Pack (Global)", 2),
    ]);
    const evaluator = new RuleEvaluator(catalog);
    expect(evaluator.evaluate(rules, store.snapshot())).toHaveLength(0);
  });

  it("eşik üstü (rack ≥10) → tek ateşleme; aynı snapshot tekrarı boş", () => {
    const loader = new RuleConfigLoader({
      rulesPath: RULES_PATH,
      deviceConfigDir: DEVICE_CONFIG_DIR,
    });
    const catalog = loader.loadCatalog();
    const rules = loader.loadRules().rules;
    const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
    store.record("BSC-1", [
      telemetry("BSC-1", "Rack Max Diff Temp (Global)", 10.5),
      telemetry("BSC-1", "Rack Max Diff Temp Pack (Global)", 2),
    ]);
    const snapshot = store.snapshot();
    const evaluator = new RuleEvaluator(catalog);
    const fired = evaluator.evaluate(rules, snapshot);
    expect(fired.map((r) => r.name)).toContain("tms_temp_diff_protect");
    expect(evaluator.evaluate(rules, snapshot)).toHaveLength(0);
  });

  it("pack eşiği (≥5) de tetikler", () => {
    const loader = new RuleConfigLoader({
      rulesPath: RULES_PATH,
      deviceConfigDir: DEVICE_CONFIG_DIR,
    });
    const catalog = loader.loadCatalog();
    const rules = loader.loadRules().rules;
    const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
    store.record("BSC-2", [
      telemetry("BSC-2", "Rack Max Diff Temp (Global)", 3),
      telemetry("BSC-2", "Rack Max Diff Temp Pack (Global)", 5.2),
    ]);
    const evaluator = new RuleEvaluator(catalog);
    expect(evaluator.evaluate(rules, store.snapshot())).toHaveLength(1);
  });
});
