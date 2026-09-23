// RuleEvaluator — snapshot üzerinde kuralları kenar-tetikli değerlendiren
// dedup durum makinesi. Kaynak tasarım: MANAGEMENT-SERVICE-MIMARISI.md §6.

import type {
  AutomationRule,
  RuleCondition,
  RuleOperator,
} from "@gd-monorepo/shared-types";
import type { CycleSnapshot } from "./cycle-snapshot-store";
import { DeviceCatalog } from "./device-catalog";

/** RuleEvaluator yapılandırması — tek obje (DI kuralı 3). */
export interface RuleEvaluatorConfig {
  /** Zaman kaynağı — deterministik test için enjekte edilir. */
  now?: () => number;
}

/** Kural başına kenar/dedup durumu. */
interface RuleState {
  /** Aktif dönem içinde kenar tüketildi mi? */
  fired: boolean;
  /** Son ateşleme zamanı (cooldown hesabı). */
  lastFiredAt: number | undefined;
  /** Koşul başına kesintisiz-TRUE başlangıcı (per-condition debounce). */
  conditionHeldSince: Array<number | undefined>;
}

/**
 * RuleEvaluator — kenar-tetikli + debounce + cooldown dedup.
 *
 * Davranış sözleşmesi (test: rule-evaluator.test.ts, MIMARISI §6):
 * - Koşul TRUE = hedef sette EN AZ BİR cihazda değer mevcut ve `op` sağlanıyor
 *   (bayat değer snapshot garantisiyle zaten yok).
 * - Sayısal op'lar yalnızca number değerlerde; string/boolean → FALSE.
 * - Kural yalnızca inactive→active kenarında döner; aktifken TEKRARLAMAZ.
 * - `debounceMs` KOŞUL BAŞINA değerlendirilir (2026-09-22 REV03 K-A1):
 *   her koşul kendi kesintisiz-TRUE süresini tutar — 3 kademeli koruma
 *   kurallarında (örn. 15 dk / 5 dk / 45 sn) hızlı kademe yavaş kademeyi
 *   BEKLEMEZ. Düşüş o koşulun sayacını sıfırlar.
 * - `cooldownMs` içindeki yeni kenar BASTIRILIR (kenar tüketilir); sonrası
 *   ateşler.
 * - Yan etki: kendi state'i dışında YOK; aynı snapshot ile ikinci çağrı boş.
 */
export class RuleEvaluator {
  private readonly catalog: DeviceCatalog;
  private readonly now: () => number;
  private readonly states = new Map<string, RuleState>();

  constructor(catalog: DeviceCatalog, config: RuleEvaluatorConfig = {}) {
    this.catalog = catalog;
    this.now = config.now ?? (() => Date.now());
  }

  /**
   * Sorgu — yalnızca BU çağrıda aktifleşen (yükselen kenar) kuralları döner.
   * Aynı snapshot ile tekrar çağrı boş döner (tekrarlı tick güvenliği).
   */
  evaluate(rules: AutomationRule[], snapshot: CycleSnapshot): AutomationRule[] {
    const now = this.now();
    const fired: AutomationRule[] = [];

    for (const rule of rules) {
      if (rule.enabled === false) continue;
      const state = this.stateFor(rule.name);
      const conditions = rule.when.all ?? rule.when.any ?? [];
      const conditionTruths = conditions.map((c) =>
        this.conditionTrue(c, snapshot),
      );

      // Per-condition debounce (REV03 K-A1): her koşul kendi heldSince'ini
      // tutar; debounceMs dolan koşul "debounced-TRUE" sayılır.
      const debouncedTruths = conditions.map((c, i) => {
        const held = state.conditionHeldSince[i];
        if (!conditionTruths[i]) {
          state.conditionHeldSince[i] = undefined;
          return false;
        }
        if (held === undefined) {
          state.conditionHeldSince[i] = now;
        }
        return now - (state.conditionHeldSince[i] ?? now) >= (c.debounceMs ?? 0);
      });

      const ruleTrue = rule.when.all
        ? debouncedTruths.every(Boolean)
        : debouncedTruths.some(Boolean);

      if (!ruleTrue) {
        state.fired = false;
        continue;
      }

      if (state.fired) continue;
      state.fired = true;

      const cooldownMs = rule.cooldownMs ?? 0;
      if (
        state.lastFiredAt !== undefined &&
        now - state.lastFiredAt < cooldownMs
      ) {
        continue;
      }

      state.lastFiredAt = now;
      fired.push(rule);
    }
    return fired;
  }

  private stateFor(name: string): RuleState {
    let state = this.states.get(name);
    if (!state) {
      state = {
        fired: false,
        lastFiredAt: undefined,
        conditionHeldSince: [],
      };
      this.states.set(name, state);
    }
    return state;
  }

  private conditionTrue(
    condition: RuleCondition,
    snapshot: CycleSnapshot,
  ): boolean {
    const targets = this.catalog.resolveTargets(condition.device);
    for (const deviceId of targets) {
      const value = snapshot.value(deviceId, condition.telemetry);
      if (value !== undefined && this.compare(value.value, condition.op, condition.threshold)) {
        return true;
      }
    }
    return false;
  }

  private compare(
    value: number | boolean | string,
    op: RuleOperator,
    threshold: number,
  ): boolean {
    switch (op) {
      case "eq":
        return value === threshold;
      case "neq":
        return value !== threshold;
      case "gt":
        return typeof value === "number" && value > threshold;
      case "gte":
        return typeof value === "number" && value >= threshold;
      case "lt":
        return typeof value === "number" && value < threshold;
      case "lte":
        return typeof value === "number" && value <= threshold;
    }
  }
}
