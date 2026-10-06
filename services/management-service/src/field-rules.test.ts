import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RuleConfigLoader } from "./rule-config-loader";
import type { RuleAction } from "@gd-monorepo/shared-types";

/**
 * Field tier kural seti sözleşmesi (FIELD-MANEVRA-KATALOGU-REV01-MIMARISI §5,
 * K-M4 + KURAL-MOTORU-V2 D3):
 * - R-06 Recovery: E-stop düşen kenar (bit 0) + fault temiz → fl06_recovery
 *   MANEVRASI (delegasyon — KURAL-MOTORU-V2 §3.1) + log + notify.
 * - SOC dengeleme ÖRNEĞİ (soc_discharge_example — enabled: false): operation
 *   aksiyon delegasyonu (field_discharge).
 * - Şarj/deşarj ASLA otomatik geri yüklenmez — K-M4: hiçbir kural doğrudan
 *   setpoint/charge/discharge KOMUT aksiyonu içermez.
 */

function loadFieldRules() {
  const loader = new RuleConfigLoader({
    rulesPath: join(__dirname, "../../../deployment/dev/field/rules/rules.json"),
    deviceConfigDir: join(__dirname, "../../../configs"),
  });
  return loader.loadRules();
}

describe("field rules.json (R-06 + SOC örneği)", () => {
  it("geçerli: r06_recovery + soc_discharge_example (disabled)", () => {
    const file = loadFieldRules();
    expect(file.rules.map((r) => r.name)).toEqual([
      "r06_recovery",
      "soc_discharge_example",
    ]);
    expect(file.rules[1]!.enabled).toBe(false);
  });

  it("tetikleyici: E-stop 0 + fault 0 (all)", () => {
    const rule = loadFieldRules().rules[0]!;
    const conds = rule.when.all ?? [];
    expect(conds).toHaveLength(2);
    expect(conds[0]!.telemetry).toBe("Emergency Stop Button Status");
    expect(conds[0]!.op).toBe("eq");
    expect(conds[0]!.threshold).toBe(0);
    expect(conds[1]!.telemetry).toBe("PCS Fault Status");
  });

  it("aksiyonlar: maneuver(fl06_recovery) + log + notify — KOMUT aksiyonu YOK (KURAL-MOTORU-V2)", () => {
    const rule = loadFieldRules().rules[0]!;
    const maneuvers = rule.then.filter(
      (a): a is Extract<RuleAction, { action: "maneuver" }> =>
        a.action === "maneuver",
    );
    expect(maneuvers).toHaveLength(1);
    expect(maneuvers[0]!.name).toBe("fl06_recovery");
    const commands = rule.then.filter((a) => a.action === "command");
    expect(commands).toHaveLength(0);
    expect(rule.then.some((a) => a.action === "notify")).toBe(true);
  });

  it("debounce: E-stop düşen kenarı 2 sn doğrulanır", () => {
    const rule = loadFieldRules().rules[0]!;
    const estop = (rule.when.all ?? [])[0]!;
    expect(estop.debounceMs).toBe(2000);
  });

  it("SOC örneği: operation(field_discharge) + params delegasyonu", () => {
    const rule = loadFieldRules().rules[1]!;
    const operations = rule.then.filter(
      (a): a is Extract<RuleAction, { action: "operation" }> =>
        a.action === "operation",
    );
    expect(operations).toHaveLength(1);
    expect(operations[0]!.name).toBe("field_discharge");
    expect(operations[0]!.params).toEqual({ powerKw: 200 });
  });
});
