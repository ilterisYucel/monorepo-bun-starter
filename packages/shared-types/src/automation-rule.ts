// Otomasyon kuralı sözleşmesi — management-service'in konfigürasyon modeli.
// Kaynak tasarım: docs/architecture/MANAGEMENT-SERVICE-MIMARISI.md §5.
// Yalnızca tip + zod şeması — davranış (değerlendirme semantiği) RuleEvaluator'dadır.

import { z } from "zod";

/**
 * Kural koşul operatörü.
 * Değerlendirme sırası: "eq" eşitlik, "neq" eşitsizlik, "gt"/"gte"/"lt"/"lte"
 * sayısal sıralama — karşılaştırma RuleEvaluator'da yapılır.
 */
export type RuleOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export const ruleOperatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]);

/**
 * Cihaz seçicisi.
 * - `ids`: doğrudan cihaz kimlikleri.
 * - `types`: cihaz tipleri — device config üst seviye `type` alanından
 *   (DeviceCatalog) çözümlenir.
 * İkisi birlikte verilirse hedef set BİRLEŞİM'dir (ids ∪ types çözümü).
 * Boş dizi anlamsızdır → şema reddeder. Seçici hiç verilmezse tüm cihazlar.
 */
export interface RuleDeviceSelector {
  ids?: string[];
  types?: string[];
}

export const ruleDeviceSelectorSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).optional(),
    types: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict()
  .refine((d) => d.ids !== undefined || d.types !== undefined, {
    message: "device seçicisi en az bir ids veya types içermeli",
  });

/**
 * Tek koşul.
 *
 * - `device`: opsiyonel seçici — yoksa tüm cihazlar hedeftir.
 * - `telemetry`: değer adı (ör. "soc") — snapshot'tan okunur.
 * - `op` + `threshold`: karşılaştırma.
 * - `debounceMs`: koşulun kesintisiz TRUE kalması gereken süre; 0 = anında
 *   kenar (varsayılan 0).
 *
 * Sınır: koşul TRUE ise, hedef setteki EN AZ BİR cihazın değeri op'u
 * sağlıyor demektir (MIMARISI §6.2). AND semantiği `when.all` altında ayrı
 * koşullarla kurulur.
 */
export interface RuleCondition {
  device?: RuleDeviceSelector;
  telemetry: string;
  op: RuleOperator;
  threshold: number;
  debounceMs?: number;
}

export const ruleConditionSchema = z
  .object({
    device: ruleDeviceSelectorSchema.optional(),
    telemetry: z.string().min(1),
    op: ruleOperatorSchema,
    threshold: z.number(),
    debounceMs: z.number().min(0).optional(),
  })
  .strict();

/**
 * Koşul birleşimi — en az biri tanımlı ve boş olmayan `all`/`any` gerekir.
 * `all`: tüm koşullar aynı anda TRUE; `any`: en az biri TRUE.
 */
export interface AutomationRuleWhen {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

export const automationRuleWhenSchema = z
  .object({
    all: z.array(ruleConditionSchema).min(1).optional(),
    any: z.array(ruleConditionSchema).min(1).optional(),
  })
  .strict()
  .refine((w) => w.all !== undefined || w.any !== undefined, {
    message: "when en az bir all veya any koşul grubu içermeli",
  });

/**
 * Kural aksiyonu — discriminant union.
 *
 * - `command`: cihaz komutu çalıştır (device config'ten çözümlenir;
 *   CommandJobBuilder). `params` komut şablonlarına (`{{param}}`) verilir.
 * - `log`: TamperLogger'a imzalı olay yaz (kategori app). `eventCode`
 *   verilmezse "auto_rule_fired".
 * - `notify`: AlertNotifier bildirimi — eventCode kural adından türetilir
 *   (`auto_rule_<name>`), AlertNotifier'ın kendi cooldown'u uygulanır.
 *
 * Aksiyonlar sırayla çalışır; biri başarısız olursa sonrakiler devam eder
 * (kademeli bozulma — MIMARISI §7).
 */
export type RuleAction =
  | {
      action: "command";
      deviceId: string;
      command: string;
      params?: Record<string, unknown>;
    }
  | {
      action: "log";
      level: "info" | "warn" | "error";
      eventCode?: string;
      message?: string;
    }
  | { action: "notify" };

export const ruleActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("command"),
      deviceId: z.string().min(1),
      command: z.string().min(1),
      params: z.record(z.unknown()).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("log"),
      level: z.enum(["info", "warn", "error"]),
      eventCode: z.string().min(1).optional(),
      message: z.string().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("notify"),
    })
    .strict(),
]);

/**
 * Otomasyon kuralı.
 *
 * - `name`: benzersiz — log/notify eventCode türetiminde kimlik.
 * - `enabled`: varsayılan true (tüketici çözümler).
 * - `cooldownMs`: aksiyon seti çalıştıktan sonra yeni yükselen kenarın
 *   bastırıldığı süre (varsayılan 0 = her kenar tetikler).
 * - `when` + `then`: bkz. ilgili tipler.
 *
 * Değerlendirme kenar-tetikli ve dedup'ludur — RuleEvaluator sözleşmesi
 * (MIMARISI §6): inactive→active geçişinde aksiyonlar BİR kez çalışır.
 */
export interface AutomationRule {
  name: string;
  enabled?: boolean;
  cooldownMs?: number;
  when: AutomationRuleWhen;
  then: RuleAction[];
}

export const automationRuleSchema = z
  .object({
    name: z.string().min(1),
    enabled: z.boolean().optional(),
    cooldownMs: z.number().min(0).optional(),
    when: automationRuleWhenSchema,
    then: z.array(ruleActionSchema).min(1),
  })
  .strict();

/** Kural dosyasının kök yapısı — `rules.json` (MIMARISI §5). */
export interface AutomationRulesFile {
  rules: AutomationRule[];
}

/**
 * Kural dosyası şeması — STRICT: bilinmeyen anahtar her seviyede REDDEDİLİR
 * (strip yok). Gerekçe: kural dosyası operatör/geliştirici el yazımıdır;
 * yazım hatası sessizce düşürülmemeli, açılışta fail-fast yakalanmalıdır
 * (MIMARISI §5, §8).
 */
export const automationRulesSchema = z
  .object({
    rules: z.array(automationRuleSchema).min(1),
  })
  .strict();
