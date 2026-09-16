import { describe, it, expect, expectTypeOf } from "vitest";
import { automationRulesSchema } from "./automation-rule";
import type {
  AutomationRule,
  AutomationRulesFile,
  RuleAction,
  RuleCondition,
  RuleOperator,
} from "./automation-rule";

/**
 * Automation rule şeması sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §5-§8):
 *
 * State'ler:
 * - `AutomationRule` — name (benzersiz), when (all|any), then (≥1 aksiyon),
 *   opsiyonel enabled (varsayılan true — tüketici çözümler), cooldownMs.
 * - `RuleCondition` — telemetry adı + op + threshold + opsiyonel debounceMs +
 *   opsiyonel device seçicisi (ids ∪ types; verilmezse tüm cihazlar).
 *
 * Edge-case'ler:
 * - when hem boş hem eksik → RED (değerlendirilecek hiçbir koşul yok).
 * - all/any dizisi boş → RED; then boş → RED.
 * - op enum dışı → RED; threshold sayı değil → RED.
 * - device.ids/device.types ikisi de boş dizi → RED (seçici anlamsız).
 * - cooldownMs/debounceMs negatif → RED.
 * - Bilinmeyen anahtar (her seviyede) → RED — strict (operatör hatası
 *   fail-fast yakalanır; strip YOK — kural dosyası tunnel operational
 *   config'den farklıdır).
 *
 * Hata kategorisi: şema reddi BEKLENEN hatadır — `safeParse` success=false
 * taşır; servis açılışta fail-fast reddeder (RuleConfigLoader).
 *
 * Yan etkiler: YOK (saf doğrulama).
 * Limitler: rules dizisi ≥1; aksiyon sayısı ≥1.
 */

const validCondition: RuleCondition = {
  telemetry: "soc",
  op: "gte",
  threshold: 95,
  debounceMs: 10000,
};

const validRule: AutomationRule = {
  name: "high-soc-stop",
  cooldownMs: 300000,
  when: { all: [validCondition] },
  then: [
    { action: "command", deviceId: "bsc-1", command: "stop" },
    { action: "log", level: "warn", eventCode: "auto_rule_high_soc" },
    { action: "notify" },
  ],
};

const validFile: AutomationRulesFile = { rules: [validRule] };

describe("automationRulesSchema", () => {
  it("geçerli kural dosyasını kabul eder (command + log + notify)", () => {
    const r = automationRulesSchema.safeParse(validFile);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.rules).toHaveLength(1);
      expect(r.data.rules[0]!.name).toBe("high-soc-stop");
    }
  });

  it("when.all ile çoklu koşul kabul eder", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [
              validCondition,
              { telemetry: "temperature", op: "lt", threshold: 40 },
            ],
          },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("when.any kabul eder", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, when: { any: [validCondition] } }],
    });
    expect(r.success).toBe(true);
  });

  it("device seçicisi ids + types birlikte kabul eder", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [
              {
                telemetry: "soc",
                op: "gt",
                threshold: 10,
                device: { ids: ["bsc-1"], types: ["bsc"] },
              },
            ],
          },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("device seçicisi olmadan koşul kabul eder (tüm cihazlar)", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: { all: [{ telemetry: "soc", op: "eq", threshold: 50 }] },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("enabled/cooldownMs/debounceMs opsiyoneldir", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          enabled: undefined,
          cooldownMs: undefined,
          when: {
            all: [
              { telemetry: "soc", op: "gt", threshold: 0, debounceMs: 0 },
            ],
          },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("debounceMs 0 kabul eder (anında kenar)", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [{ telemetry: "soc", op: "gt", threshold: 0, debounceMs: 0 }],
          },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("when hem eksik hem boş → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, when: {} }],
    });
    expect(r.success).toBe(false);
  });

  it("all boş dizi → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, when: { all: [] } }],
    });
    expect(r.success).toBe(false);
  });

  it("op enum dışı değer → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: { all: [{ ...validCondition, op: "less_than" }] },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("threshold sayı değilse → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: { all: [{ ...validCondition, threshold: "95" }] },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("device.ids boş dizi → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [{ ...validCondition, device: { ids: [] } }],
          },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("device.types boş dizi → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [{ ...validCondition, device: { types: [] } }],
          },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("then boş → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, then: [] }],
    });
    expect(r.success).toBe(false);
  });

  it("bilinmeyen aksiyon tipi → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          then: [{ action: "maneuver", name: "x" }],
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("command aksiyonu command adı zorunlu, params opsiyonel", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          then: [
            { action: "command", deviceId: "bsc-1", command: "charge" },
            {
              action: "command",
              deviceId: "bsc-2",
              command: "charge",
              params: { powerKw: 100 },
            },
          ],
        },
      ],
    });
    expect(r.success).toBe(true);
    const missingCommand = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          then: [{ action: "command", deviceId: "bsc-1" }],
        },
      ],
    });
    expect(missingCommand.success).toBe(false);
  });

  it("log aksiyonu level enum zorunlu, eventCode/message opsiyonel", () => {
    const ok = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, then: [{ action: "log", level: "info" }] }],
    });
    expect(ok.success).toBe(true);
    const badLevel = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, then: [{ action: "log", level: "verbose" }] }],
    });
    expect(badLevel.success).toBe(false);
  });

  it("notify aksiyonu boş obje olarak kabul eder", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, then: [{ action: "notify" }] }],
    });
    expect(r.success).toBe(true);
  });

  it("cooldownMs negatif → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [{ ...validRule, cooldownMs: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("debounceMs negatif → red", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [{ ...validCondition, debounceMs: -5 }],
          },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("bilinmeyen üst seviye anahtar → red (strict)", () => {
    const r = automationRulesSchema.safeParse({
      rules: [validRule],
      version: 2,
    });
    expect(r.success).toBe(false);
  });

  it("bilinmeyen koşul anahtarı → red (strict)", () => {
    const r = automationRulesSchema.safeParse({
      ...validFile,
      rules: [
        {
          ...validRule,
          when: {
            all: [{ ...validCondition, hysteresis: 1 }],
          },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rules boş dizi → red", () => {
    const r = automationRulesSchema.safeParse({ rules: [] });
    expect(r.success).toBe(false);
  });

  it("çıktı tipi sözleşmeyi taşır (derleme kontratı)", () => {
    const r = automationRulesSchema.safeParse(validFile);
    if (r.success) {
      expectTypeOf(r.data.rules[0]!.name).toEqualTypeOf<string>();
      expectTypeOf(r.data.rules[0]!.when.all?.[0]?.op).toEqualTypeOf<
        RuleOperator | undefined
      >();
      expectTypeOf(r.data.rules[0]!.then).toEqualTypeOf<RuleAction[]>();
      expectTypeOf(r.data.rules[0]).not.toHaveProperty("version");
    }
  });
});
