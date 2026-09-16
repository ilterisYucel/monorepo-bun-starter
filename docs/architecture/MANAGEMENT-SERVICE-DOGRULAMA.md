---
status: active
space: architecture
tags: [dogrulama, otomasyon, kural-motoru, management, test, izlenebilirlik]
review_date: 2026-09-15
---

# Management Service — Doğrulama Dokümanı (Aşama 5/6)

Bağlı olduğu tasarım (SPEC): [MANAGEMENT-SERVICE-MIMARISI.md](./MANAGEMENT-SERVICE-MIMARISI.md)

**Kural (AGENTS.md 6 aşamalı iş akışı):** Modül kapanışında bu doküman + TEST-KAPSAMI dokümanı güncel olmalıdır. Değişiklik kaydı satır referanslıdır; test kanıtları, kabul kriteri kanıtları, sapmalar ve gözle kontrol maddeleri aşağıdadır.

## 1. Genel Durum Özeti

| Görev | Durum | Kanıt |
|:------|:------|:------|
| T1 — `automation-rule.ts` tipler + zod + JSDoc | ✅ KAPANDI | shared-types 24/24 test yeşil |
| T2 — `platform/commands` + web-service refactor | ✅ KAPANDI | platform-commands 15/15; web-service 487/487 (K9) |
| T3 — CycleSnapshotStore | ✅ KAPANDI | 10/10 test; %97.3 satır / %96.2 branch |
| T4 — RuleEvaluator | ✅ KAPANDI | 16/16 test; %100 satır / %95.2 branch |
| T5 — ActionExecutor | ✅ KAPANDI | 16/16 test; %100 satır / %95.3 branch |
| T6 — RuleConfigLoader + DeviceCatalog | ✅ KAPANDI | 16/16 test; %100 satır / %100 branch |
| T7 — ManagementService + run.ts + Dockerfile | ✅ KAPANDI | 5/5 test; canlı docker gözle kanıtı (K7) |
| T8 — Compose + env + rules.example.json | ✅ KAPANDI | `docker compose config` dev+prod geçerli |

**Toplam:** management-service 63/63 test, %98.2 satır / %95.3 branch (kapılar: ≥%70 satır, güvenlik-kritik ≥%90 branch — İKİSİ DE AŞILDI). Monorepo: **1702/1702 test yeşil**, `bun run build` 25 proje başarılı.

## 2. Değişiklik Matrisi (satır referanslı)

| Görev | Değiştirilen dosyalar | Nedeni | Testler | Geçme | Sisteme etkisi |
|:------|:----------------------|:-------|:--------|:------|:---------------|
| T1 | `packages/shared-types/src/automation-rule.ts` (YENİ, 1-260) — `RuleOperator`/`RuleDeviceSelector`/`RuleCondition`/`AutomationRuleWhen`/`RuleAction`/`AutomationRule`/`AutomationRulesFile` + `automationRulesSchema` (STRICT); `src/index.ts:19` barrel satırı | SPEC §5 — kural modeli tek kaynağı; strict = operatör hatası fail-fast (§8) | `automation-rule.test.ts` (24 test: geçerli varyantlar, op/level enum, boş diziler, negatif süreler, bilinmeyen anahtar reddi, çıktı tipi) | ✅ 24/24 | Yeni kural dosyası sözleşmesi; mevcut tiplere dokunulmadı (geriye uyumlu) |
| T2 | `packages/platform/commands/src/device-config-source.ts` (YENİ) — `IDeviceConfigSource` + `DeviceConfigFileSource`; `src/command-job-builder.ts` (YENİ) — `CommandResolutionError` (reason+context) + `CommandJobBuilder.build()`; `src/index.ts`; `package.json`/`project.json`/`tsconfig.json` | SPEC §7 — komut çözümlemenin iki tüketici arasında paylaşımı (web-service + management-service) | `command-job-builder.test.ts` (15 test: çözümleme hataları, `{{param}}`/`-{{param}}`, atomic, validate eşlemesi, jobId, dosya kaynağı) | ✅ 15/15 | Yeni platform paketi; core'e dokunulmadı |
| T2 (refactor) | `services/web-service/src/presentation/routes/command-routes.ts` (1-291) — `resolveTelemetries`+`buildJob`+`loadDeviceConfig` çıkarıldı; `CommandJobBuilder` + enjekte `IDeviceConfigSource` (`configSource` opsiyonu, satır 44-51); `src/infrastructure/config-loader.ts` — `DeviceConfigFileSource` ince sarmalayıcı; `command-routes.test.ts` — modül mock'u yerine gerçek kaynak enjeksiyonu; `package.json`/`project.json`/`tsconfig.json` — `platform-commands` bağımlılığı | K9 — davranış BİREBİR korunur: 404/400 mesajları, timeout hesabı, job şekli | web-service 487/487 (command-routes 12/12) + `unified-routes` testleri (config-loader sarmalayıcı) | ✅ | Komut çözümleme tek yerde; internal paket mock'u kalktı (AGENTS mock kuralı) |
| T3 | `services/management-service/src/cycle-snapshot-store.ts` (YENİ) — `CycleSnapshotStore.record/snapshot` + `CycleSnapshot` (derin kopya, TTL temizlik, canonical indeks) | SPEC §4 — cycle veri toplama; kontrat değişikliği YOK (mevcut MANAGEMENT job akışı) | `cycle-snapshot-store.test.ts` (10 test) | ✅ | Yeni snapshot deposu; device-service'a DOKUNULMADI |
| T4 | `src/rule-evaluator.ts` (YENİ) — kenar-tetik + debounce + cooldown dedup durum makinesi | SPEC §6 — değerlendirme semantiği | `rule-evaluator.test.ts` (16 test) | ✅ | — |
| T5 | `src/action-executor.ts` (YENİ) — command/log/notify; sıralı + kademeli bozulma; `auto_rule_*` eventCode'ları | SPEC §7 — aksiyonlar | `action-executor.test.ts` (16 test) | ✅ | — |
| T6 | `src/device-catalog.ts` + `src/rule-config-loader.ts` (YENİ) | SPEC §5 — ids∪types çözümü + fail-fast yükleme | `device-catalog.test.ts` (7) + `rule-config-loader.test.ts` (9) | ✅ | — |
| T7 | `src/management-service.ts` (YENİ) — worker + tick döngüsü + start/stop/health/runCycle; `src/index.ts`; `run.ts` (YENİ) — env bazlı bootstrap, `isRuleEventCode` validator (sözlük + `auto_rule_` öneki), TamperLogger `alertRules` wiring; `package.json`/`project.json`/`tsconfig.json`/`vitest.config.ts`; `deployment/Dockerfile` + `Dockerfile.dev` | SPEC §3, §9 | `management-service.test.ts` (5 test) | ✅ | queue_management'ın İLK tüketicisi canlı |
| T8 | `deployment/docker-compose.container.{yml,dev.yml}` — `management-service` servisi (redis+device-service bağımlılığı, config mount'ları); `deployment/.env.container.example` — `MANAGEMENT_EVALUATION_INTERVAL_MS`, `LOG_LEVEL`; `services/management-service/deployment/config/rules.example.json` | SPEC §9 — container tier wiring | `docker compose config` dev ✅ prod ✅; K7 canlı demo (aşağıda) | ✅ | Container stack'e yeni servis; field/boss etkilenmedi |
| T8 (sözlük) | `packages/platform/logging/src/event-codes.ts:45-52` — `auto_rule_fired`/`auto_rule_action_ok`/`auto_rule_action_failed` eklendi + test satırları | Fail-closed sözlük — otomasyon olayları kayıtlı olmalı | `event-codes.test.ts` ✅ | ✅ | Yeni eventCode'lar denetlenebilir |
| İş akışı | `AGENTS.md` TDD bölümü + `TESTING.md` §8.1/§8.7 — 6 aşamalı zorunlu iş akışı + hibrit test dokümantasyonu kuralı | Kullanıcı kararı (2026-09-15) — gözlemlenebilir geliştirme kapıları | — | ✅ | Yeni/dokunulan modüller 6 aşama ile geliştirilir |
| Workspace | `vitest.workspace.ts` — `platform/commands` + `management-service` eklendi | Root test script'lerinin yeni paketleri koşması | `bun run test` | ✅ | — |

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Kanıt | Sonuç |
|:----|:-------|:------|:------|
| K1 | MANAGEMENT job'ları snapshot'a kaydedilir; TTL bayat girişler değerlendirmeye girmez | `cycle-snapshot-store.test.ts` — "maxAgeMs aşan giriş snapshot'a girmez", "bayat giriş depodan temizlenir" | ✅ |
| K2 | Kenar-tetik: aksiyonlar BİR kez çalışır; aktifken tekrarlanmaz | `rule-evaluator.test.ts` — "yükselen kenarda bir kez döner; aktifken tekrarlamaz", "aynı snapshot ile ikinci çağrı boş döner" | ✅ |
| K3 | Cooldown içinde yeni kenar bastırılır; sonrası tetikler | `rule-evaluator.test.ts` — "cooldown içinde yeni kenar bastırılır; sonrası ateşler" | ✅ |
| K4 | command → COMMAND_DEVICE job + başarı/başarısızlık ayrı eventCode | `action-executor.test.ts` — "command aksiyonu başarı → executeAndWait + auto_rule_action_ok", "job başarısız → auto_rule_action_failed" + canlı demo logları (§5) | ✅ |
| K5 | notify → AlertNotifier, kural bazlı eventCode | TamperLogger `alertRules.eventCodes` (`run.ts:64-68`) + canlı `auto_rule_demo-soc-stop` bildirim satırı (§5) | ✅ |
| K6 | Geçersiz rules.json → fail-fast; bilinmeyen anahtar reddi | `rule-config-loader.test.ts` (4 yükleme testi) + `automation-rule.test.ts` strict testleri | ✅ |
| K7 | Örnek kural container dev stack'te gözle çalışır | §5 canlı demo — gerçek docker stack + simülatör cihazlar | ✅ |
| K8 | Kapılar: ≥%70 satır; RuleEvaluator/ActionExecutor/CommandJobBuilder ≥%90 branch | coverage: %98.2 satır / %95.3 branch; RuleEvaluator %95.2, ActionExecutor %95.3, CommandJobBuilder (platform-commands) %100 satır | ✅ |
| K9 | web-service davranış değişmez | web-service 487/487; tip kontrolünde yeni hata YOK (kalan hatalar dokunulmamış dosyalarda, önceden mevcut) | ✅ |

## 4. Doküman Sapmaları (onaylı)

| Kod | Sapma | Neden | Etki |
|:----|:------|:------|:-----|
| S1 | `notify` aksiyonu AlertNotifier'ı DOĞRUDAN çağırmaz — `auto_rule_<name>` eventCode'u ile TamperLogger'a loglanır; bildirim yönlendirmesi TamperLogger `alertRules.eventCodes` üzerinden AlertNotifier'a yapılır (cooldown dahil) | TamperLogger'ın Faz 6 T6.7 deseni: AlertNotifier, `consider(LogEvent)` bekler — tam LogEvent'i (seq/signature) yalnızca pipeline üretir. Doğrudan çağrı imzalı zinciri baypas ederdi | ActionExecutor notifier bağımlılığından kurtuldu (tek log kanalı); SPEC §7 güncellendi |
| S2 | `command` aksiyonu executeAndWait timeout'u: `job.validate.timeoutMs ?? 3000 + 2000` tampon — validate BLOĞU OLMAYAN komutta config `timeoutMs` kullanılmaz | `CommandDeviceJob` yalnızca validate içinde timeout taşır; validate'siz komuta ek alan eklemek device-service kontratını değiştirirdi. Kapak 5000 ms'dir (executeAndWait tamamlanınca döner — timeout yalnızca tavan) | validate'siz komutlarda bekleme tavanı 5 sn; SPEC §7 güncellendi |
| S3 | MVP tier kapsamı: yalnızca container compose'a eklendi (field/boss compose değişmedi) | SPEC §9 zaten yalnızca container öngörüyor | — |
| S4 | Bildirim sink'i MVP'de console (`alertRules.sinks = [ConsoleSink]`) | SMTP/SMS sink'leri env bazlı wiring Faz 1'de (Faz 6 adapter deseni hazır) | Canlı demo'da bildirim satırı console'da İKİ KEZ görünür (normal sink + alert sink ikisi de console) — kozmetik |

## 5. Gözle Kontrol (K7 — canlı docker demo, 2026-09-15)

**Kurulum:** `docker compose -f deployment/docker-compose.container.dev.yml -f <ports-override> up -d redis timescaledb device-service management-service` (redis host-port çakışması nedeniyle override: `ports: !reset []`). Demo kuralı: `bsc` tipi, `soc >= 0`, debounce 5 sn, cooldown 120 sn → `BSC-1 stop` + log + notify.

**Gözlenen log satırları (`docker logs container-management-service-dev`):**
1. `[run] 1 kural, 17 cihaz kayitli` — kural + katalog yüklendi (fail-fast geçti).
2. `eventCode: "auto_rule_fired"` (seq 1, HMAC imzalı) — kenar-tetik ateşleme.
3. `eventCode: "auto_rule_action_ok"` — `deviceId: BSC-1, command: stop, jobId: BSC-1-stop-...` — device-service komutu GERÇEKTEN yürüttü (executeAndWait başarılı).
4. `eventCode: "auto_rule_demo"` — config'ten gelen log aksiyonu (warn).
5. `eventCode: "auto_rule_demo-soc-stop"` — notify → AlertNotifier console sink bildirimi.
6. İkinci cycle'da tekrar ateşleme YOK (kenar-tetik + cooldown dedup çalışıyor).

**İlk deneme hatası (düzeltici kanıt):** demo kuralında `deviceId: "bsc-1"` (küçük harf) yazıldığında device-service `Bilinmeyen cihaz: bsc-1` döndü ve servis `auto_rule_action_failed` bastı — fail path'i de canlı doğrulandı. `rules.example.json` gerçek deviceId (`BSC-1`) ile düzeltildi.

**Temizlik:** demo stack `docker compose down` ile kaldırıldı; demo `rules.json` silindi (yalnızca `rules.example.json` commit'lenir).

## 6. Sonuç

T1-T8 tamamlandı; K1-K9 kanıtlı; sapmalar S1-S4 onaylı ve SPEC'e işlendi. Management-service Faz 0 MVP kapanmıştır. Faz 1 açık işleri: manevra kataloğunun backend'e taşınması (`maneuver` aksiyonu), kuralların DB + CRUD API + editör UI'a taşınması, SMTP/SMS bildirim sink'lerinin env ile bağlanması, field/boss tier değerlendirmesi.

`review_date: 2026-09-15`
