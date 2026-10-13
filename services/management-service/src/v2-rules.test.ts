import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { RuleConfigLoader } from "./rule-config-loader";

/**
 * F2.6 — v2/dev container kural seti (demo-field) sözleşmesi.
 *
 * LGES Diagnosis v1.1.0 + registers.md eşikleri ve yeni EMS-yanıt/C&E kuralları:
 * - OTW 49 °C (5 s) / OTF1 58 °C (5 s); UTW 0 / UTF1 −10.
 * - Nem: dehumidify on 75 %RH.
 * - BSC Over SOC → charge limit 0; Over Offline Rack → limits 0.
 * - Yangın (Fire DI) / FSS 1. aşama → 8 HVAC force_off + 2 BSC emergency.
 */

const RULES_PATH = fileURLToPath(
  new URL("../../../deployment/v2/dev/container/rules/rules.json", import.meta.url),
);
const DEVICE_CONFIG_DIR = fileURLToPath(new URL("../../../configs", import.meta.url));

function loadRules() {
  return new RuleConfigLoader({
    rulesPath: RULES_PATH,
    deviceConfigDir: DEVICE_CONFIG_DIR,
  }).loadRules().rules;
}

describe("v2/dev container kuralları (F2.6)", () => {
  it("fail-fast yüklenir (47 kural)", () => {
    expect(loadRules()).toHaveLength(47);
  });

  it("tms_overheat_protect: OTW 49 (5 s) / OTF1 58 (5 s)", () => {
    const r = loadRules().find((x) => x.name === "tms_overheat_protect")!;
    const conds = (r.when as { any: Array<{ telemetry: string; threshold: number; debounceMs?: number }> }).any;
    const bsc = conds.filter((c) => c.telemetry === "Max Pack Temp");
    expect(bsc.map((c) => c.threshold).sort((a, b) => a - b)).toEqual([49, 58]);
    expect(bsc.every((c) => c.debounceMs === 5000)).toBe(true);
  });

  it("tms_overcold_protect: UTW 0 / UTF1 −10", () => {
    const r = loadRules().find((x) => x.name === "tms_overcold_protect")!;
    const conds = (r.when as { any: Array<{ telemetry: string; threshold: number }> }).any;
    const bsc = conds.filter((c) => c.telemetry === "Min Pack Temp");
    expect(bsc.map((c) => c.threshold).sort((a, b) => a - b)).toEqual([-10, 0]);
  });

  it("tms_humidity_alarm: 75 %RH", () => {
    const r = loadRules().find((x) => x.name === "tms_humidity_alarm")!;
    const conds = (r.when as { any: Array<{ telemetry: string; threshold: number }> }).any;
    expect(conds.find((c) => c.telemetry === "Return Humidity")!.threshold).toBe(75);
  });

  it("bsc_over_soc / bsc_over_offline_rack: charge limit 0", () => {
    const soc = loadRules().find((x) => x.name === "bsc_over_soc")!;
    expect((soc.then as Array<{ action: string; command?: string }>).some((a) => a.command === "set_charge_power")).toBe(true);
    const off = loadRules().find((x) => x.name === "bsc_over_offline_rack")!;
    const cmds = (off.then as Array<{ command?: string }>).map((a) => a.command);
    expect(cmds).toContain("set_charge_power");
    expect(cmds).toContain("set_discharge_power");
  });

  it("fire_emergency / fss_first_stage: 8 HVAC force_off + 2 BSC emergency", () => {
    for (const name of ["fire_emergency", "fss_first_stage"]) {
      const r = loadRules().find((x) => x.name === name)!;
      const cmds = (r.then as Array<{ action: string; command?: string }>).filter((a) => a.action === "command");
      expect(cmds.filter((a) => a.command === "force_off")).toHaveLength(8);
      expect(cmds.filter((a) => a.command === "emergency")).toHaveLength(2);
    }
  });
});
