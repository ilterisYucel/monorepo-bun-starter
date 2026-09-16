---
status: active
space: architecture
tags: [mimari, otomasyon, kural-motoru, management, manevra, spec]
review_date: 2026-09-15
---

# Management Service — Mimari Tasarım (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Hedef Kitle:** Geliştirici + saha mühendisi.
> **Amaç:** "Şu koşul sağlandığında şu komutu otomatik çalıştır, sonucu imzalı log'a bas, gerekirse alarm bildirimi gönder" otomasyonunu konfigüre edilebilir bir servisle sağlamak. Bugün kuralları biz (geliştirici) yazıyoruz; yarın aynı şema son kullanıcı arayüzünden (editör) üretilecek — mevcut manevra/komut konfigürasyon felsefesiyle aynı evrim.

---

## İçindekiler

1. [Kapsam ve Hedef](#1-kapsam-ve-hedef)
2. [Mevcut Altyapı ile İlişki](#2-mevcut-altyapı-ile-ilişki)
3. [Bileşenler](#3-bileşenler)
4. [Cycle Veri Toplama](#4-cycle-veri-toplama)
5. [Kural Modeli (Konfigürasyon Sözleşmesi)](#5-kural-modeli-konfigürasyon-sözleşmesi)
6. [Değerlendirme Semantiği (Davranış Sözleşmesi)](#6-değerlendirme-semantiği-davranış-sözleşmesi)
7. [Aksiyonlar](#7-aksiyonlar)
8. [Hata Kategorileri](#8-hata-kategorileri)
9. [Dağıtım ve Tier Wiring](#9-dağıtım-ve-tier-wiring)
10. [Kabul Kriterleri](#10-kabul-kriterleri)
11. [Görev Listesi (T1-T9)](#11-görev-listesi-t1-t9)
12. [Aşama Eşlemesi (6 aşamalı iş akışı)](#12-aşama-eşlemesi-6-aşamalı-iş-akışı)

---

## 1. Kapsam ve Hedef

**Problem:** Sistemde komutlar (tek cihaz, register yazma) ve manevralar (çok cihazlı komut zincirleri) mevcuttur ama hepsi **insan tetikli** çalışır. "BSC SoC %95'i geçerse şarjı durdur" gibi **veri tetikli** otomasyon yoktur.

**Kapsam (MVP):**
- Cihaz telemetrisi üzerinde **kural tabanlı** koşul değerlendirme.
- Koşul sağlandığında **aksiiyonlar**: cihaz komutu çalıştırma, imzalı log, alarm bildirimi.
- Kurallar **JSON konfigürasyon dosyasından** okunur (bugün biz yazarız).
- `queue_management` kuyruğunun **ilk tüketicisi** olma.

**Kapsam dışı (Faz 1 — bilinçli erteleme):**
- Tam manevra zinciri aksiyonu (manevra kataloğu backend'e taşınınca).
- Kuralların DB + CRUD API + editör UI ile yönetimi.
- Expression engine (hesaplanmış metrikler, formül — v2-gap F1).
- Otomatik zaman senkronizasyonu (TEİAŞ #19) — management job'ına planlı, ayrı görev.

## 2. Mevcut Altyapı ile İlişki

| Mevcut yapı | Kullanım |
|:------------|:---------|
| `MANAGEMENT` job tipi + `queue_management` (`shared-types/src/job.ts:60`, `platform/messaging`) | Veri kaynağı — device-service her okuma cycle'ında cihaz başına `MANAGEMENT` job yayınlar (`device-scheduler.ts:44-82`). Tüketici bugüne kadar yoktu. |
| `AlarmTransitionDetector` (device-service) | Desen kaynağı — kenar-tetikli dedup, yalnızca geçişlerde log. RuleEvaluator aynı felsefeyi kullanır. |
| `AlertNotifier` (`tamper-logger/src/sinks/alert-notifier.ts`) | Bildirim aksiyonu — eventCode başına cooldown (5 dk varsayılan). |
| `TamperLogger` | Aksiyon sonuç logları — imzalı zincir (`auto_rule_*` eventCode'ları). |
| `command-routes.ts` komut çözümleme (`web-service`, satır 32-85) | `CommandJobBuilder` olarak `packages/platform/commands`'a çıkarılır; iki servis paylaşır. |
| `ISnapshotSource` deseni (`ws-tunnel/src/snapshot/interface.ts`) | CycleSnapshotStore aynı "en güncel değer" desenini kullanır. |
| Device config `type` alanı (üst seviye, zorunlu) | `deviceTypes` koşul filtresinin çözümlenmesi. |

## 3. Bileşenler

```
┌────────────────────────────────────────────────────────────────────┐
│                    services/management-service                     │
│                                                                    │
│  queue_management (BullMQ) ──► CycleSnapshotStore                  │
│        (MANAGEMENT job)        │ (deviceId,name) → en yeni değer   │
│                                │ + TTL bayatlama                   │
│                                ▼                                   │
│  tick (evaluationIntervalMs) → RuleEvaluator                       │
│                                │ kenar-tetik + debounce + cooldown │
│                                │ aktifleşen kural listesi          │
│                                ▼                                   │
│                              ActionExecutor                        │
│                                ├─► command → CommandJobBuilder     │
│                                │      → COMMAND_DEVICE job         │
│                                │      → sonuç → TamperLogger        │
│                                ├─► log → TamperLogger               │
│                                └─► notify → AlertNotifier           │
│                                                                    │
│  RuleConfigLoader (rules.json + device kataloğu) ──► kurallar      │
└────────────────────────────────────────────────────────────────────┘

packages/platform/commands
  ├── IDeviceConfigSource      (device config okuma sözleşmesi)
  ├── DeviceConfigFileSource   (dosya tabanlı implementasyon)
  └── CommandJobBuilder        (config komutu → COMMAND_DEVICE job; Result)
```

| Bileşen | Sorumluluk | Bağımlılık (constructor) |
|:--------|:-----------|:-------------------------|
| `CycleSnapshotStore` | `MANAGEMENT` job'larını kaydet; (deviceId, name) başına en yeni değeri tut; TTL geçmişi bayat say | `maxAgeMs`, `now()` |
| `RuleEvaluator` | Snapshot üzerinde kuralları değerlendir; kenar-tetik + debounce + cooldown dedup; yalnızca aktifleşen kuralları döner | `now()` |
| `ActionExecutor` | Aksiyonları sırayla çalıştır; her aksiyon sonucunu logla; hata kademeli bozulma (aksiyon hatası kuralı değil, sonraki aksiyonları etkilemez — `allSettled` benzeri) | `CommandJobBuilder`, `IMessageQueue`, `TamperLogger`?, `AlertNotifier`? |
| `RuleConfigLoader` | `rules.json` yükle + zod doğrula + device katalogu kur (deviceId → type) | `configDir` |
| `DeviceCatalog` | Device config dosyalarından (deviceId → type) haritası; `types` filtresini cihaz setine çözümler | `IDeviceConfigSource` |
| `ManagementService` | Wiring + yaşam döngüsü: worker kaydı, tick zamanlayıcı, start/stop/health | tüm yukarıdakiler + `ManagementServiceConfig` |
| `CommandJobBuilder` (platform/commands) | `{deviceId, command, params}` → `Result<CommandDeviceJob, CommandResolutionError>` — `{{param}}` çözümü + zorunlu param kontrolü + validate/atomic eşleme | `IDeviceConfigSource` |

**DI kuralları:** Tamamı constructor injection; config obje (`ManagementServiceConfig`, `AlertNotifierConfig`); arayüz `I` ön ekli; logger/notifier opsiyonel (yoksa console fallback + notify atlanır — device-service deseni).

## 4. Cycle Veri Toplama

**Sorun:** Cihazlar farklı poll aralıklarında okunur (1 sn / 5 sn, saniye ızgarasına hizalı — `device-service.ts:204-209`). Tek cycle'da tüm cihazların verisi **aynı an** üretilmez.

**Çözüm — snapshot birleştirme (kontrat değişikliği YOK):**
1. device-service her okumada zaten cihaz başına `MANAGEMENT` job yayınlar (değişmez).
2. `CycleSnapshotStore.record(deviceId, telemetries)` her job'ı kaydeder — (deviceId, name) → `{ value, recordedAt }`.
3. Değerlendirme tick'inde `snapshot()` **tüm cihazların en güncel değerlerini** döner; `recordedAt > now - maxAgeMs` olmayan girişler bayat sayılır ve döndürülmez (kademeli bozulma — cihaz sessizse kural onu yok sayar, değerlendirmeyi durdurmaz).
4. `maxAgeMs` varsayılanı: `evaluationIntervalMs`'in 3 katı (5 sn poll'lu cihaz 10 sn tick'te en fazla 1 tick bayat kalır; 3x tolerans).

**Neden yeni kuyruk/kontrat yok:** `queue_management` + mevcut job akışı yeterli; snapshot deseni `RealtimeSnapshotSource` ile aynı mantık.

## 5. Kural Modeli (Konfigürasyon Sözleşmesi)

Dosya: `services/management-service/deployment/config/rules.json` (mount: `/app/config/rules.json`).

```json
{
  "rules": [
    {
      "name": "high-soc-stop",
      "enabled": true,
      "cooldownMs": 300000,
      "when": {
        "all": [
          {
            "device": { "types": ["bsc"] },
            "telemetry": "soc",
            "op": "gte",
            "threshold": 95,
            "debounceMs": 10000
          }
        ]
      },
      "then": [
        { "action": "command", "deviceId": "bsc-1", "command": "stop" },
        { "action": "log", "level": "warning", "eventCode": "auto_rule_high_soc", "message": "BSC yüksek SoC — otomatik durdurma" },
        { "action": "notify" }
      ]
    }
  ]
}
```

### Tipler (`packages/shared-types/src/automation-rule.ts`)

```ts
export type RuleOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export interface RuleDeviceSelector {
  ids?: string[];    // doğrudan cihaz kimlikleri
  types?: string[];  // cihaz tipleri (device config "type" alanından çözümlenir)
}

export interface RuleCondition {
  device?: RuleDeviceSelector;  // verilmezse: tüm cihazlar
  telemetry: string;            // değer adı (ör. "soc")
  op: RuleOperator;
  threshold: number;
  debounceMs?: number;          // koşulun kesintisiz sağlanması gereken süre (varsayılan 0)
}

export interface AutomationRuleWhen {
  all?: RuleCondition[];        // tümü aynı anda (en az 1 koşul — all veya any zorunlu)
  any?: RuleCondition[];        // en az biri
}

export type RuleAction =
  | { action: "command"; deviceId: string; command: string; params?: Record<string, unknown> }
  | { action: "log"; level: "info" | "warn" | "error"; eventCode?: string; message?: string }
  | { action: "notify" };

export interface AutomationRule {
  name: string;                 // benzersiz; loglarda kural kimliği
  enabled?: boolean;            // varsayılan true
  cooldownMs?: number;          // aksiyon seti sonrası bastırma süresi (varsayılan 0)
  when: AutomationRuleWhen;
  then: RuleAction[];           // en az 1
}

export interface AutomationRulesFile {
  rules: AutomationRule[];
}
```

Zod: `automationRulesSchema` — bilinmeyen anahtarlar **strip** edilmez, reddedilir mi? Karar: tunnel operational config strip ediyordu; ama kural dosyası operatör hatası yakalamalı → **bilinmeyen anahtar hata** (`strict()`); geçersiz dosya = açılış reddi (fail-fast, §8).

## 6. Değerlendirme Semantiği (Davranış Sözleşmesi)

Her tick'te, her kural için:

1. **Hedef set çözümle:** koşul başına hedef cihazlar = `ids` ∪ `types` çözümlenmiş set (`DeviceCatalog`); selector verilmemişse snapshot'taki tüm cihazlar.
2. **Koşul doğruluğu:** Bir koşul, hedef setteki **en az bir** cihazın ilgili `telemetry` değeri snapshot'ta mevcut + bayat değil + `op`'u sağlıyorsa TRUE. (Çok cihazda AND isteniyorsa iki ayrı koşul `when.all` altına yazılır — kompozisyon yeterli.)
3. **when birleşimi:** `all` → tüm koşullar TRUE; `any` → en az biri TRUE.
4. **Debounce:** Koşul `debounceMs` boyunca **kesintisiz** TRUE kalmalı — state: kural başına `heldSince` zamanı. `heldSince` set edildikten sonra her tick'te TRUE kalırsa, `now - heldSince >= debounceMs` olduğu anda koşul "aktif" sayılır.
5. **Kenar-tetik:** Kural yalnızca **inactive → active** geçişinde aksiyonları çalıştırır; aktif kaldığı sürece her tick'te TEKRARLAMAZ (AlarmTransitionDetector deseni — `device_alarm` yalnızca yükselen kenarda).
6. **Düşen kenar:** Koşul FALSE'a düşünce kural inactive'a döner ve `heldSince` sıfırlanır; yeniden yükselirse yeni oluşum sayılır.
7. **Cooldown:** Aksiyonlar çalıştıktan sonra `cooldownMs` dolmadan yeni yükselen kenar aksiyon tetiklemez. Cooldown `now()` enjeksiyonuyla deterministik test edilir.
8. **Tekrarlı tick güvenliği:** Değerlendirme saf sorgudur (state dışında yan etki yok); aynı snapshot ile iki kez çağrılırsa ikinci çağrı boş döner.

## 7. Aksiyonlar

| Aksiyon | Davranış | Başarı logu | Başarısızlık logu |
|:--------|:---------|:------------|:------------------|
| `command` | `CommandJobBuilder.build()` → hata = `Result.err` → aksiyon başarısız; job → `mq.executeAndWait(job, commandTimeoutMs)` (timeout = komut timeoutMs + 2000 — command-routes deseni) | `auto_rule_action_ok` (info, context: rule/deviceId/command/jobId) | `auto_rule_action_failed` (error, context: rule/deviceId/command/reason) |
| `log` | `TamperLogger.log(level, eventCode ?? "auto_rule_fired", message, context)` — kategori `app` | — | log hatası yutulmaz mı? Karar: app kategorisi fail-closed değildir; hata konsola düşer, aksiyon akışı durmaz |
| `notify` | `AlertNotifier.consider({ eventCode: "auto_rule_<name>", ... })` — notify sink hatası **yukarı fırlar** (AlertNotifier sözleşmesi) → aksiyon başarısız sayılır, `auto_rule_action_failed` basılır | `auto_rule_action_ok` | `auto_rule_action_failed` |

- Aksiyonlar sırayla çalışır; biri başarısız olursa **sonrakiler çalışmaya devam eder** (kademeli bozulma — tüm sonuçlar loglanır).
- `command` aksiyonunun hedefi koşuldaki cihazdan **bağımsız** yazılabilir (ör. bsc-1 koşulu → cb-1'e komut); mantıksal bağ kural yazarının sorumluluğu.
- Logger/notifier enjekte edilmemişse: log aksiyonu console.warn'a düşer, notify aksiyonu atlanır (sonuç yine loglanır).

## 8. Hata Kategorileri

| Durum | Kategori | Davranış |
|:------|:---------|:---------|
| `rules.json` okunamaz/geçersiz (zod) | Beklenen — açılış | **Fail-fast**: `start()` reddedilir (servis yanlış kural dosyasıyla çalışmaz). |
| Cihaz config'i yok / komut tanımsız / zorunlu param eksik | Beklenen — çalışma zamanı | `CommandResolutionError` (`Result.err`) → aksiyon başarısız logu; kural akışı durmaz. |
| `executeAndWait` timeout / job başarısız | Beklenen — çalışma zamanı | `JobResult.success=false` → `auto_rule_action_failed`. |
| Snapshot'ta veri yok / bayat | Beklenen — veri durumu | Koşul FALSE sayılır (bayat veriyle komut ÇALIŞTIRILMAZ — güvenlik). |
| Aksiyon listesi boş / when boş | Beklenen — config | zod reddeder (açılış fail-fast). |
| TamperLogger/AlertNotifier hatası | Kademeli | Aksiyon sonucu `auto_rule_action_failed`; sonraki aksiyonlar devam eder. |

## 9. Dağıtım ve Tier Wiring

- **Tier:** yalnızca **container** (cihazların poll edildiği stack). Field/boss MVP dışı.
- **Compose:** `docker-compose.container.dev.yml` + `docker-compose.container.yml`'e `management-service` eklenir.
- **Env (`deployment/.env.container.example`):**
  - `REDIS_HOST` / `REDIS_PORT` (ortak)
  - `DEVICE_CONFIG_DIR=/app/config-docker` (device-service ile aynı mount, `:ro`)
  - `MANAGEMENT_RULES_PATH=/app/config/rules.json` (kendi config mount'u, `:ro`)
  - `MANAGEMENT_EVALUATION_INTERVAL_MS` (varsayılan 10000)
- **Dockerfile:** `services/management-service/deployment/Dockerfile` + `Dockerfile.dev` (device-service deseni).
- **Nx:** `services/management-service/project.json` — `dev`/`test`/`typecheck`; implicitDependencies: core, shared-types, platform-messaging, platform-commands, tamper-logger.
- **Kuyruk kontratı:** `MANAGEMENT` job'ları **üretim tarafında değişmez** — device-service'a dokunulmaz.

## 10. Kabul Kriterleri

| Kod | Kriter | Kanıt türü |
|:----|:-------|:-----------|
| K1 | `MANAGEMENT` job'ları snapshot'a kaydedilir; TTL bayat girişler değerlendirmeye girmez | unit (CycleSnapshotStore) |
| K2 | Koşul inactive→active kenarında (debounce sonrası) aksiyonlar BİR kez çalışır; aktifken tekrarlanmaz | unit (RuleEvaluator, fake timers) |
| K3 | Cooldown içinde yeni yükselen kenar aksiyon tetiklemez; cooldown sonrası tetikler | unit (RuleEvaluator) |
| K4 | `command` aksiyonu `COMMAND_DEVICE` job üretir (config çözümleme + `{{param}}` + zorunlu param kontrolü) ve başarı/başarısızlığı ayrı eventCode'la loglar | unit (CommandJobBuilder + ActionExecutor) |
| K5 | `notify` aksiyonu `AlertNotifier` üzerinden kural bazlı eventCode ile bildirim üretir | unit (ActionExecutor) |
| K6 | Geçersiz `rules.json` → açılış reddi (fail-fast); bilinmeyen anahtar reddedilir | unit (RuleConfigLoader) |
| K7 | Örnek kural (bsc `soc >= 95` → `stop` + log + notify) container dev stack'te gözle çalışır | gözle (compose) |
| K8 | Kapılar: yeni kod ≥%70 satır; `RuleEvaluator`/`ActionExecutor`/`CommandJobBuilder` ≥%90 branch | coverage raporu |
| K9 | web-service komut akışı refactor sonrası mevcut testlerle yeşil kalır (davranış değişmez) | `nx run web-service:test` |

## 11. Görev Listesi (T1-T9)

| Görev | İçerik |
|:------|:-------|
| T1 | `packages/shared-types/src/automation-rule.ts` — tipler + zod `automationRulesSchema` + JSDoc kontratı (Aşama 2) |
| T2 | `packages/platform/commands` — `IDeviceConfigSource`, `DeviceConfigFileSource`, `CommandJobBuilder`, `CommandResolutionError`; `command-routes.ts` refactor (Aşama 2-4) |
| T3 | `services/management-service/src/cycle-snapshot-store.ts` |
| T4 | `services/management-service/src/rule-evaluator.ts` |
| T5 | `services/management-service/src/action-executor.ts` |
| T6 | `services/management-service/src/rule-config-loader.ts` + `device-catalog.ts` |
| T7 | `management-service.ts` (wiring/yaşam döngüsü) + `run.ts` + `package.json`/`project.json`/`vitest.config.ts` + Dockerfile'lar |
| T8 | Compose (container dev+prod) + `.env.container.example` + `config/rules.example.json` |
| T9 | Aşama 5-6 dokümanları: `MANAGEMENT-SERVICE-DOGRULAMA.md`, `MANAGEMENT-SERVICE-TEST-KAPSAMI.md` + `test-envanteri.md` güncelleme |

## 12. Aşama Eşlemesi (6 aşamalı iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | `automation-rule.ts`, `commands` paketi, servis sınıfları (her T görevinde) |
| 3. TEST (kırmızı) | `cycle-snapshot-store.test.ts`, `rule-evaluator.test.ts`, `action-executor.test.ts`, `rule-config-loader.test.ts`, `device-catalog.test.ts`, `command-job-builder.test.ts` + web-service karakterizasyon koruması |
| 4. IMPL (yeşil) | T1-T8 |
| 5. SONUÇ | `MANAGEMENT-SERVICE-DOGRULAMA.md` |
| 6. KAPSAM | `MANAGEMENT-SERVICE-TEST-KAPSAMI.md` + `test-envanteri.md` |
