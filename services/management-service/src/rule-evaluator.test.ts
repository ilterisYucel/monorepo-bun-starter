import { describe, it, expect } from "vitest";
import { RuleEvaluator } from "./rule-evaluator";
import { DeviceCatalog } from "./device-catalog";
import type { CycleSnapshot } from "./cycle-snapshot-store";
import type { SnapshotValue } from "./cycle-snapshot-store";
import type { AutomationRule } from "@gd-monorepo/shared-types";

/**
 * RuleEvaluator sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §6, T4):
 *
 * - Kenar-tetik: kural yalnızca inactive→active geçişinde döner; aktif kaldığı
 *   sürece sonraki evaluate çağrılarında TEKRARLAMAZ.
 * - Debounce: `debounceMs` (koşulların maksimumu) boyunca koşul seti kesintisiz
 *   TRUE kalmalı; süre dolmadan aktifleşme olmaz.
 * - Cooldown: ateşleme sonrası `cooldownMs` içinde düşüp yeniden yükselen kenar
 *   BASTIRILIR (kenar tüketilir); cooldown sonrası yeni kenar ateşler.
 * - Koşul TRUE = hedef sette EN AZ BİR cihazda değer mevcut (bayat değil —
 *   snapshot garantisi) ve `op` sağlanıyor. Sayısal op'lar yalnızca number
 *   değerlerde çalışır (string/boolean → false).
 * - when.all → tüm koşullar; when.any → en az biri.
 * - `enabled: false` kural hiç değerlendirilmez.
 * - Yan etki: kendi state'i dışında YOK; aynı snapshot ile iki kez çağrı
 *   ikincide boş döner.
 */

let clock = 1_000_000;

function evaluator(): RuleEvaluator {
  return new RuleEvaluator(
    new DeviceCatalog([
      { deviceId: "bsc-1", type: "bsc" },
      { deviceId: "bsc-2", type: "bsc" },
      { deviceId: "cb-1", type: "cb" },
    ]),
    { now: () => clock },
  );
}

function snapshotValue(
  value: number | boolean | string,
  recordedAt?: number,
): SnapshotValue {
  return { value, unit: "", recordedAt: recordedAt ?? clock };
}

function fakeSnapshot(
  entries: Record<string, Record<string, SnapshotValue>>,
): CycleSnapshot {
  const map = new Map(
    Object.entries(entries).map(([deviceId, values]) => [
      deviceId,
      new Map(Object.entries(values)),
    ]),
  );
  return {
    deviceIds: () => Array.from(map.keys()),
    value: (deviceId: string, key: string) => map.get(deviceId)?.get(key),
  } as unknown as CycleSnapshot;
}

function rule(overrides: Partial<AutomationRule>): AutomationRule {
  return {
    name: "r1",
    when: { all: [{ telemetry: "soc", op: "gt", threshold: 90 }] },
    then: [{ action: "notify" }],
    ...overrides,
  };
}

describe("RuleEvaluator", () => {
  it("yükselen kenarda bir kez döner; aktifken tekrarlamaz", () => {
    const ev = evaluator();
    const rules = [rule({})];
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });

    expect(ev.evaluate(rules, snap)).toEqual([rules[0]]);
    clock += 1000;
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("düşüş sonrası yeniden yükseliş yeni kenardır (cooldown yoksa ateşler)", () => {
    const ev = evaluator();
    const rules = [rule({})];
    const high = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    const low = fakeSnapshot({ "bsc-1": { soc: snapshotValue(80) } });

    ev.evaluate(rules, high);
    ev.evaluate(rules, low);
    clock += 1000;
    expect(ev.evaluate(rules, high)).toEqual([rules[0]]);
  });

  it("debounce: süre dolmadan aktifleşme olmaz; dolunca ateşler", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: {
          all: [{ telemetry: "soc", op: "gt", threshold: 90, debounceMs: 5000 }],
        },
      }),
    ];
    const high = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });

    ev.evaluate(rules, high);
    clock += 4999;
    expect(ev.evaluate(rules, high)).toEqual([]);
    clock += 1;
    expect(ev.evaluate(rules, high)).toEqual([rules[0]]);
  });

  it("debounce sırasında düşüş sayaç sıfırlar — yeniden tam süre gerekir", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: {
          all: [{ telemetry: "soc", op: "gt", threshold: 90, debounceMs: 5000 }],
        },
      }),
    ];
    const high = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    const low = fakeSnapshot({ "bsc-1": { soc: snapshotValue(80) } });

    ev.evaluate(rules, high);
    clock += 3000;
    ev.evaluate(rules, low);
    clock += 1000;
    ev.evaluate(rules, high);
    clock += 4999;
    expect(ev.evaluate(rules, high)).toEqual([]);
    clock += 1;
    expect(ev.evaluate(rules, high)).toEqual([rules[0]]);
  });

  it("cooldown içinde yeni kenar bastırılır; sonrası ateşler", () => {
    const ev = evaluator();
    const rules = [rule({ cooldownMs: 5000 })];
    const high = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    const low = fakeSnapshot({ "bsc-1": { soc: snapshotValue(80) } });

    ev.evaluate(rules, high);
    ev.evaluate(rules, low);
    clock += 1000;
    expect(ev.evaluate(rules, high)).toEqual([]);

    ev.evaluate(rules, low);
    clock += 5000;
    expect(ev.evaluate(rules, high)).toEqual([rules[0]]);
  });

  it("when.any: bir koşul sağlansa yeterli", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: {
          any: [
            { telemetry: "soc", op: "gt", threshold: 90 },
            { telemetry: "temperature", op: "gt", threshold: 50 },
          ],
        },
      }),
    ];
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    expect(ev.evaluate(rules, snap)).toEqual([rules[0]]);
  });

  it("when.all: bir koşul false ise ateşleme yok", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: {
          all: [
            { telemetry: "soc", op: "gt", threshold: 90 },
            { telemetry: "temperature", op: "lt", threshold: 40 },
          ],
        },
      }),
    ];
    const snap = fakeSnapshot({
      "bsc-1": { soc: snapshotValue(95), temperature: snapshotValue(45) },
    });
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("enabled: false kural hiç ateşlemez", () => {
    const ev = evaluator();
    const rules = [rule({ enabled: false })];
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("device seçicisi hedef dışındaki cihaz değerini yok sayar", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: {
          all: [
            {
              device: { ids: ["bsc-2"] },
              telemetry: "soc",
              op: "gt",
              threshold: 90,
            },
          ],
        },
      }),
    ];
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("koşul hedef sette en az bir cihazda sağlanırsa TRUE", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: {
          all: [
            {
              device: { types: ["bsc"] },
              telemetry: "soc",
              op: "gt",
              threshold: 90,
            },
          ],
        },
      }),
    ];
    const snap = fakeSnapshot({ "bsc-2": { soc: snapshotValue(95) } });
    expect(ev.evaluate(rules, snap)).toEqual([rules[0]]);
  });

  it("veri yok → koşul FALSE (bayat veriyle asla tetiklenmez)", () => {
    const ev = evaluator();
    const rules = [rule({})];
    const snap = fakeSnapshot({});
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("sayısal op string değerde false (karşılaştırma yapılmaz)", () => {
    const ev = evaluator();
    const rules = [rule({})];
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue("95") } });
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("eq sayısal eşitlikte çalışır", () => {
    const ev = evaluator();
    const rules = [
      rule({
        when: { all: [{ telemetry: "state", op: "eq", threshold: 1 }] },
      }),
    ];
    const snap = fakeSnapshot({ "cb-1": { state: snapshotValue(1) } });
    expect(ev.evaluate(rules, snap)).toEqual([rules[0]]);
  });

  it("aynı snapshot ile ikinci çağrı boş döner (tekrarlı tick güvenliği)", () => {
    const ev = evaluator();
    const rules = [rule({})];
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    ev.evaluate(rules, snap);
    expect(ev.evaluate(rules, snap)).toEqual([]);
  });

  it("bağımsız kurallar aynı cycle'da birlikte döner", () => {
    const ev = evaluator();
    const r1 = rule({ name: "a" });
    const r2 = rule({ name: "b" });
    const snap = fakeSnapshot({ "bsc-1": { soc: snapshotValue(95) } });
    expect(ev.evaluate([r1, r2], snap)).toEqual([r1, r2]);
  });

  it("gte/lt/lte/neq operatorleri", () => {
    const ev = evaluator();
    const gte = rule({
      name: "gte",
      when: { all: [{ telemetry: "v", op: "gte", threshold: 5 }] },
    });
    const lt = rule({
      name: "lt",
      when: { all: [{ telemetry: "v", op: "lt", threshold: 5 }] },
    });
    const lte = rule({
      name: "lte",
      when: { all: [{ telemetry: "v", op: "lte", threshold: 5 }] },
    });
    const neq = rule({
      name: "neq",
      when: { all: [{ telemetry: "v", op: "neq", threshold: 5 }] },
    });

    const ev2 = evaluator();
    expect(
      ev2.evaluate([gte], fakeSnapshot({ "bsc-1": { v: snapshotValue(5) } })),
    ).toEqual([gte]);

    const ev3 = evaluator();
    expect(
      ev3.evaluate([lt], fakeSnapshot({ "bsc-1": { v: snapshotValue(4) } })),
    ).toEqual([lt]);

    const ev4 = evaluator();
    expect(
      ev4.evaluate([lte], fakeSnapshot({ "bsc-1": { v: snapshotValue(5) } })),
    ).toEqual([lte]);

    const ev5 = evaluator();
    expect(
      ev5.evaluate([neq], fakeSnapshot({ "bsc-1": { v: snapshotValue(4) } })),
    ).toEqual([neq]);
  });
});
