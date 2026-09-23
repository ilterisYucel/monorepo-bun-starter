import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { RuleConfigLoader } from "./rule-config-loader";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import { RuleEvaluator } from "./rule-evaluator";
import type { AutomationRule, TelemetryData } from "@gd-monorepo/shared-types";

/**
 * Konteyner tier kural seti sözleşmesi — KONTEYNER-MANEVRA-KATALOGU-REV03 §3.1:
 *
 * - deployment/config/rules.json zod-valid ve STRICT şemadan geçer (fail-fast).
 * - FL-05 normal kontrol: 8 HVAC × 4 = 32 kural (hysteresis eşikleri birebir).
 * - FL-05 korumalar: 3 kademeli debounce (aşırı sıcak/soğuk) + nem + sıcaklık
 *   farkı (per-rack R1..R8 — S9); blok seti: HVAC force + BSC stop + log +
 *   notify. Konteyner tier'da PCS YOKTUR (K10/K-A8).
 * - FL-02 (PM5340), FL-07 (kapı DI), FL-08 (DC-METER), FL-11 (IMD) kuralları
 *   eşik/debounce/cooldown birebir.
 * - K-A4 fail-safe: FL-06/09/12 kuralları YOKTUR; hiçbir kural BSC
 *   charge/discharge yazmaz (K-A9).
 */

const RULES_PATH = fileURLToPath(
  new URL("../deployment/config/rules.json", import.meta.url),
);
const DEVICE_CONFIG_DIR = fileURLToPath(
  new URL("../../device-service/deployment/config-docker", import.meta.url),
);

function loader(): RuleConfigLoader {
  return new RuleConfigLoader({
    rulesPath: RULES_PATH,
    deviceConfigDir: DEVICE_CONFIG_DIR,
  });
}

function rules(): AutomationRule[] {
  return loader().loadRules().rules;
}

function telemetry(
  deviceId: string,
  name: string,
  value: number,
): TelemetryData {
  return {
    deviceId,
    name,
    value,
    unit: "",
    timestamp: new Date().toISOString(),
  };
}

function commandOf(
  rule: AutomationRule,
  deviceId: string,
): string[] {
  return rule.then
    .filter((a) => a.action === "command")
    .filter((a) => (a as { deviceId: string }).deviceId === deviceId)
    .map((a) => (a as { command: string }).command);
}

describe("konteyner rules.json — kural envanteri", () => {
  it("zod-valid + fail-fast yüklenir; 43 kural", () => {
    const file = loader().loadRules();
    expect(file.rules.length).toBe(43);
  });

  it("K-A4: FL-06/09/12 kural adı YOKTUR (fail-safe)", () => {
    const names = rules().map((r) => r.name);
    expect(names.some((n) => n.includes("fl06"))).toBe(false);
    expect(names.some((n) => n.includes("fl09"))).toBe(false);
    expect(names.some((n) => n.includes("fl12"))).toBe(false);
  });

  it("K-A8/K-A9: hiçbir aksiyon PCS'e veya BSC charge/discharge'a gitmez", () => {
    for (const rule of rules()) {
      for (const action of rule.then) {
        if (action.action === "command") {
          expect(action.deviceId.startsWith("PCS")).toBe(false);
          expect(action.command).not.toBe("charge");
          expect(action.command).not.toBe("discharge");
        }
      }
    }
  });
});

describe("FL-05 normal kontrol (32 kural — hysteresis)", () => {
  it("tms_cool_on_h1: Current Temp ≥ 25 → force_cool + log; cooldown 60 sn", () => {
    const rule = rules().find((r) => r.name === "tms_cool_on_h1")!;
    const cond = rule.when.all![0]!;
    expect(cond.device?.ids).toEqual(["HVAC-1"]);
    expect(cond.telemetry).toBe("Current Temp");
    expect(cond.op).toBe("gte");
    expect(cond.threshold).toBe(25);
    expect(commandOf(rule, "HVAC-1")).toEqual(["force_cool"]);
    expect(rule.cooldownMs).toBe(60000);
  });

  it("tms_cool_off_h1: < 23 → on", () => {
    const rule = rules().find((r) => r.name === "tms_cool_off_h1")!;
    const cond = rule.when.all![0]!;
    expect(cond.op).toBe("lt");
    expect(cond.threshold).toBe(23);
    expect(commandOf(rule, "HVAC-1")).toEqual(["on"]);
  });

  it("tms_heat_on_h1: ≤ 17 → force_heat", () => {
    const rule = rules().find((r) => r.name === "tms_heat_on_h1")!;
    expect(rule.when.all![0]!.op).toBe("lte");
    expect(rule.when.all![0]!.threshold).toBe(17);
    expect(commandOf(rule, "HVAC-1")).toEqual(["force_heat"]);
  });

  it("tms_heat_off_h1: ≥ 20 → on", () => {
    const rule = rules().find((r) => r.name === "tms_heat_off_h1")!;
    expect(rule.when.all![0]!.op).toBe("gte");
    expect(rule.when.all![0]!.threshold).toBe(20);
    expect(commandOf(rule, "HVAC-1")).toEqual(["on"]);
  });

  it("HVAC-1..8 için dörtlü tamam (32 kural)", () => {
    const names = rules().map((r) => r.name);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const kind of ["tms_cool_on", "tms_cool_off", "tms_heat_on", "tms_heat_off"]) {
        expect(names, `${kind}_h${n}`).toContain(`${kind}_h${n}`);
      }
    }
  });
});

describe("FL-05 korumalar (blok seti — K10: PCS YOK)", () => {
  it("tms_overheat_protect: 3 kademeli debounce + HVAC force + BSC stop", () => {
    const rule = rules().find((r) => r.name === "tms_overheat_protect")!;
    const conds = rule.when.any!;
    expect(conds).toHaveLength(3);
    expect(conds[0]).toMatchObject({
      device: { types: ["hvac"] },
      telemetry: "Current Temp",
      op: "gt",
      threshold: 29,
      debounceMs: 900000,
    });
    expect(conds[1]).toMatchObject({
      device: { types: ["bsc"] },
      telemetry: "Max Pack Temp",
      op: "gt",
      threshold: 50,
      debounceMs: 300000,
    });
    expect(conds[2]).toMatchObject({
      device: { types: ["bsc"] },
      telemetry: "Max Pack Temp",
      op: "gt",
      threshold: 75,
      debounceMs: 45000,
    });
    const forceCount = rule.then.filter(
      (a) => a.action === "command" && a.command === "force_cool",
    ).length;
    expect(forceCount).toBe(8);
    expect(commandOf(rule, "BSC-1")).toEqual(["stop"]);
    expect(commandOf(rule, "BSC-2")).toEqual(["stop"]);
    expect(rule.then.some((a) => a.action === "log")).toBe(true);
    expect(rule.then.some((a) => a.action === "notify")).toBe(true);
    expect(rule.cooldownMs).toBe(900000);
  });

  it("tms_overcold_protect: 3 kademeli + force_heat + BSC stop", () => {
    const rule = rules().find((r) => r.name === "tms_overcold_protect")!;
    const conds = rule.when.any!;
    expect(conds[0]).toMatchObject({ op: "lt", threshold: 10, debounceMs: 900000 });
    expect(conds[1]).toMatchObject({
      telemetry: "Min Pack Temp",
      op: "lt",
      threshold: 15,
      debounceMs: 300000,
    });
    expect(conds[2]).toMatchObject({
      telemetry: "Min Pack Temp",
      op: "lt",
      threshold: 5,
      debounceMs: 45000,
    });
    expect(
      rule.then.filter(
        (a) => a.action === "command" && a.command === "force_heat",
      ).length,
    ).toBe(8);
  });

  it("tms_humidity_alarm: Return Humidity ≥ 85 → BSC stop + log + notify", () => {
    const rule = rules().find((r) => r.name === "tms_humidity_alarm")!;
    const cond = rule.when.any![0]!;
    expect(cond.device?.types).toEqual(["hvac"]);
    expect(cond.telemetry).toBe("Return Humidity");
    expect(cond.op).toBe("gte");
    expect(cond.threshold).toBe(85);
    expect(commandOf(rule, "BSC-1")).toEqual(["stop"]);
    expect(commandOf(rule, "BSC-2")).toEqual(["stop"]);
  });

  it("tms_temp_diff_protect: per-rack R1..R8 (≥10 rack / ≥5 pack) → BSC stop", () => {
    const rule = rules().find((r) => r.name === "tms_temp_diff_protect")!;
    const conds = rule.when.any!;
    expect(conds).toHaveLength(16);
    const rack = conds.filter((c) => c.telemetry.startsWith("Rack Max Diff Temp R"));
    const pack = conds.filter((c) => c.telemetry.startsWith("Rack Max Diff Temp Pack R"));
    expect(rack).toHaveLength(8);
    expect(pack).toHaveLength(8);
    for (const c of rack) {
      expect(c.op).toBe("gte");
      expect(c.threshold).toBe(10);
      expect(c.device?.ids).toEqual(["BSC-1", "BSC-2"]);
    }
    for (const c of pack) {
      expect(c.op).toBe("gte");
      expect(c.threshold).toBe(5);
    }
    expect(commandOf(rule, "BSC-1")).toEqual(["stop"]);
  });
});

describe("FL-02 AUX kaybı (PM5340)", () => {
  it("eşik 180 V + debounce 5 sn; CB open ×2 + BSC open_contactors ×2", () => {
    const rule = rules().find((r) => r.name === "fl02_aux_loss")!;
    const cond = rule.when.all![0]!;
    expect(cond.device?.ids).toEqual(["PM5340-1"]);
    expect(cond.telemetry).toBe("Voltage L-N Avg");
    expect(cond.op).toBe("lt");
    expect(cond.threshold).toBe(180);
    expect(cond.debounceMs).toBe(5000);
    expect(commandOf(rule, "CB-1")).toEqual(["open"]);
    expect(commandOf(rule, "CB-2")).toEqual(["open"]);
    expect(commandOf(rule, "BSC-1")).toEqual(["open_contactors"]);
    expect(commandOf(rule, "BSC-2")).toEqual(["open_contactors"]);
    expect(rule.cooldownMs).toBe(300000);
  });
});

describe("FL-07 kapı kuralları (control-panel-io DI)", () => {
  it("batarya kapısı AÇIK → ışık + BSC stop; KAPALI → ışık söndür", () => {
    const open = rules().find((r) => r.name === "fl07_battery_door_open")!;
    const close = rules().find((r) => r.name === "fl07_battery_door_close")!;
    expect(open.when.all![0]).toMatchObject({
      telemetry: "Battery Door Open",
      op: "eq",
      threshold: 1,
    });
    expect(commandOf(open, "CONTROL-PANEL-IO-1")).toEqual(["battery_light_on"]);
    expect(commandOf(open, "BSC-1")).toEqual(["stop"]);
    expect(commandOf(open, "BSC-2")).toEqual(["stop"]);
    expect(close.when.all![0]!.threshold).toBe(0);
    expect(commandOf(close, "CONTROL-PANEL-IO-1")).toEqual(["battery_light_off"]);
  });

  it("panel kapısı kuralları aynı desen (panel_light_on/off)", () => {
    const open = rules().find((r) => r.name === "fl07_panel_door_open")!;
    const close = rules().find((r) => r.name === "fl07_panel_door_close")!;
    expect(open.when.all![0]!.telemetry).toBe("Panel Door Open");
    expect(commandOf(open, "CONTROL-PANEL-IO-1")).toEqual(["panel_light_on"]);
    expect(commandOf(close, "CONTROL-PANEL-IO-1")).toEqual(["panel_light_off"]);
  });
});

describe("FL-08 DC kısa devre (DC-METER-1)", () => {
  it("V>1500 / I>1680 / P>1784 (debounce 1 sn) → şalter AÇ + kontaktör AÇ", () => {
    const rule = rules().find((r) => r.name === "fl08_scf_trip")!;
    const conds = rule.when.any!;
    expect(conds).toHaveLength(3);
    expect(conds[0]).toMatchObject({
      telemetry: "DC Voltage",
      op: "gt",
      threshold: 1500,
      debounceMs: 1000,
    });
    expect(conds[1]).toMatchObject({
      telemetry: "DC Current",
      op: "gt",
      threshold: 1680,
      debounceMs: 1000,
    });
    expect(conds[2]).toMatchObject({
      telemetry: "DC Power",
      op: "gt",
      threshold: 1784,
      debounceMs: 1000,
    });
    expect(commandOf(rule, "CB-1")).toEqual(["open"]);
    expect(commandOf(rule, "CB-2")).toEqual(["open"]);
    expect(commandOf(rule, "BSC-1")).toEqual(["open_contactors"]);
    expect(commandOf(rule, "BSC-2")).toEqual(["open_contactors"]);
    expect(rule.cooldownMs).toBe(3600000);
  });
});

describe("FL-11 toprak direnci (IMD-1 — K4 gerçek map)", () => {
  it("Insulation Alarm / Device Error aktif (≠0, debounce 2 sn) → koruma", () => {
    const rule = rules().find((r) => r.name === "fl11_ground_fault")!;
    const conds = rule.when.any!;
    expect(conds).toHaveLength(2);
    expect(conds[0]).toMatchObject({
      telemetry: "Insulation Alarm",
      op: "neq",
      threshold: 0,
      debounceMs: 2000,
    });
    expect(conds[1]).toMatchObject({
      telemetry: "Device Error",
      op: "neq",
      threshold: 0,
      debounceMs: 2000,
    });
    expect(commandOf(rule, "CB-1")).toEqual(["open"]);
    expect(commandOf(rule, "BSC-1")).toEqual(["open_contactors"]);
  });
});

describe("kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)", () => {
  let clockMs = 1_000_000;

  function evaluator() {
    const catalog = loader().loadCatalog();
    return new RuleEvaluator(catalog, { now: () => clockMs });
  }

  it("FL-08: eşik altı ATEŞLEMEZ; eşik üstü + debounce → tek ateşleme", () => {
    const ev = evaluator();
    const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
    store.record("DC-METER-1", [
      telemetry("DC-METER-1", "DC Voltage", 1400),
      telemetry("DC-METER-1", "DC Current", 100),
      telemetry("DC-METER-1", "DC Power", 75),
    ]);
    const rs = rules();
    const fl08 = rs.filter((r) => r.name === "fl08_scf_trip");
    expect(ev.evaluate(fl08, store.snapshot())).toHaveLength(0);

    store.record("DC-METER-1", [
      telemetry("DC-METER-1", "DC Voltage", 1600),
      telemetry("DC-METER-1", "DC Current", 100),
      telemetry("DC-METER-1", "DC Power", 75),
    ]);
    const snapshot = store.snapshot();
    expect(ev.evaluate(fl08, snapshot)).toHaveLength(0);
    clockMs += 1000;
    expect(ev.evaluate(fl08, snapshot).map((r) => r.name)).toContain(
      "fl08_scf_trip",
    );
    expect(ev.evaluate(fl08, snapshot)).toHaveLength(0);
  });

  it("FL-05 normal: HVAC-1 25.1°C → tms_cool_on_h1 tek ateşleme", () => {
    const ev = evaluator();
    const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
    store.record("HVAC-1", [telemetry("HVAC-1", "Current Temp", 25.1)]);
    const rs = rules();
    const coolOn = rs.filter((r) => r.name === "tms_cool_on_h1");
    const snapshot = store.snapshot();
    expect(ev.evaluate(coolOn, snapshot).map((r) => r.name)).toContain(
      "tms_cool_on_h1",
    );
    expect(ev.evaluate(coolOn, snapshot)).toHaveLength(0);
  });

  it("FL-07: kapı DI 1 → fl07_battery_door_open ateşler", () => {
    const ev = evaluator();
    const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
    store.record("CONTROL-PANEL-IO-1", [
      telemetry("CONTROL-PANEL-IO-1", "Battery Door Open", 1),
    ]);
    const rs = rules();
    const doorOpen = rs.filter((r) => r.name === "fl07_battery_door_open");
    expect(ev.evaluate(doorOpen, store.snapshot()).map((r) => r.name)).toContain(
      "fl07_battery_door_open",
    );
  });
});
