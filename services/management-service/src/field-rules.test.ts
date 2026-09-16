import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RuleConfigLoader } from "./rule-config-loader";
import type { RuleAction } from "@gd-monorepo/shared-types";

/**
 * Field tier kural seti sözleşmesi (FIELD-MANEVRA-KATALOGU-REV01-MIMARISI §5,
 * K-M4):
 * - R-06 Recovery: E-stop düşen kenar (bit 0) + fault temiz → fault_reset +
 *   standby + log + notify.
 * - Şarj/deşarj ASLA otomatik geri yüklenmez — kurallar hiçbir setpoint/charge/
 *   discharge aksiyonu İÇERMEZ.
 */

function loadFieldRules() {
  const loader = new RuleConfigLoader({
    rulesPath: join(__dirname, "../deployment/config-field/rules.json"),
    deviceConfigDir: join(__dirname, "../deployment/config-field"),
  });
  return loader.loadRules();
}

describe("field rules.json (R-06)", () => {
  it("geçerli ve r06_recovery içeriyor", () => {
    const file = loadFieldRules();
    expect(file.rules).toHaveLength(1);
    expect(file.rules[0]!.name).toBe("r06_recovery");
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

  it("aksiyonlar: fault_reset + standby + log + notify — şarj/deşarj YOK", () => {
    const rule = loadFieldRules().rules[0]!;
    const commands = rule.then.filter(
      (a): a is Extract<RuleAction, { action: "command" }> => a.action === "command",
    );
    expect(commands.map((c) => c.command)).toEqual(["fault_reset", "standby"]);
    // K-M4: setpoint/charge/discharge ASLA otomatik yazılmaz
    for (const c of commands) {
      expect(c.command).not.toMatch(/charge|discharge|set_power|power/i);
    }
    expect(rule.then.some((a) => a.action === "notify")).toBe(true);
  });

  it("debounce: E-stop düşen kenarı 2 sn doğrulanır", () => {
    const rule = loadFieldRules().rules[0]!;
    const estop = (rule.when.all ?? [])[0]!;
    expect(estop.debounceMs).toBe(2000);
  });
});
