---
status: active
space: architecture
tags: [mimari, platform, komut, kuyruk, log, spec]
review_date: 2026-11-10
---

# Platform — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** 🟢 Doğrulanmış (2026-11-10) — KAPANIŞ: [`PLATFORM-KAPANIS.md`](./PLATFORM-KAPANIS.md).
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `MESAJLASMA-MIMARISI.md` (core port), `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` (uçtan uca akış), `LOGGER-MIMARISI.md`.

## 1. Amaç ve Bağlam

`packages/platform` grubunun sözleşmesi: `commands` (komut çözümleme + manevra/operasyon kaydı ve yürütücüsü), `messaging` (JobType sahibi kuyruk katmanı), `logging` (olay sözlüğü + tier varsayılanları), `container-access` (port). Platform, "sistem bilgisini" (JobType, eventCode, tier) taşıyan tek katmandır; core jenerik kalır.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Komut çözümleme, manevra kaydı, operasyon yürütücüsü, kuyruk politikası, log sözlüğü, container portu |
| hariç | HTTP yüzeyleri (WEB-SERVICE), kural motoru (MANAGEMENT-SERVICE), uçtan uca manevra akışı (KOMUT-MANEVRA SPEC) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `PlatformMessageQueue` JobType'ı bilen TEK yerdir; retry politikası sistem varsayılanıdır: `READ_DEVICE`/`WRITE_TELEMETRY`/`COMMAND_DEVICE` **attempts 1** (retry `moveToDelayed` → AWS missing-key sarmalı üretiyordu), `FETCH_EXTERNAL` 3 | Komut güvenliği; kuyruklar LAZY açılır, tip başına tek örnek |
| K2 | `CommandJobBuilder`: `device_not_found`/`command_not_found`/`missing_param` → `Result` (throw YOK); `{{param}}` tam eşleşme, `-{{param}}` sayısal negatif; `atomic` yoksa `true`; `timeoutMs` 3000; `jobId = deviceId-command-timestamp` | Çözümleme hatası akışı düşürmez |
| K3 | `ManeuverRegistry`: DB kaydı > dosya kaydı; devre dışı DB kaydı dosyaya DÜŞMEZ; `resolve` throw etmez (`not_found`/`disabled`); manevra ve operasyon AYRI ad uzayları; mükerrer dosya ismi kurulumda THROW; tanımlar tier-LOCAL | Gölgeleme kuralı net |
| K4 | `OperationExecutor`: `runs.begin` yazılamazsa yürütme REDDEDİLİR (fail-closed); `runs.finish` best-effort; `onFailure` = stop/continue/rollback (yalnız BAŞARILI adımlar, ters sıra, best-effort); seçici yürütme anında çözülür; `{{divideTotal}}` yürütücüde; timer `stopCommand` delay ile; uzak adım `remoteTimeoutMs` (120 sn) ile kilitlenmez; precondition hook yoksa davranış birebir | Fiziksel manevra güvenliği |
| K5 | `platform/logging`: kapalı eventCode kümesi `TamperLoggerConfig.eventCodeValidator` olarak enjekte edilir (fail-closed); tier varsayılanları platform bilgisidir (core'a KONMAZ); `signingKeyPath` materyal değil YOL | Audit sözlüğü zorunlu |
| K6 | `container-access`: yalnız tip sözleşmesi (`IContainerProxy`); hub'ın ihtiyaç duymadığı WS metotları taşır — ISP borcu M2'de port ayrımıyla çözülür | Davranış yok, test yok |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `IContainerProxy` ISP borcu: WS metotları hub'a anlamsız; 0 test | `packages/platform/container-access/src/container-proxy/interface.ts` |
| B2 | `maneuver-migration.test.ts` gerçek `deployment/v2/dev/*/maneuvers/*.json` dosyalarını okur — birim testi deployment'a sert bağlı | `packages/platform/commands/src/maneuver-migration.test.ts` |
| B3 | `platform/logging` davranışsız veri (sözlük + tier varsayılanları) | `packages/platform/logging/src/` |

## 4. Mimari

```text
WEB-SERVICE ──► CommandJobBuilder (commands) ──► PlatformMessageQueue (messaging)
                     │                                  └ JobType + retry politikası
                     ├ ManeuverRegistry (DB > dosya)
                     └ OperationExecutor (fail-closed + rollback)
WEB-SERVICE ──► platform/logging (eventCode + tier varsayılanı) ──► TamperLogger
WEB-SERVICE ──► IContainerProxy (container-access, port)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/platform/commands/src/command-job-builder.ts#CommandJobBuilder` | Komut çözümleme |
| `packages/platform/commands/src/maneuver-registry.ts#ManeuverRegistry` | Hibrit kayıt |
| `packages/platform/commands/src/operation-executor.ts#OperationExecutor` | Yürütücü |
| `packages/platform/commands/src/operation-executor-contracts.ts#ICommandChannel` | Komut kanalı portu |
| `packages/platform/messaging/src/platform-message-queue.ts#PlatformMessageQueue` | Kuyruk politikası |
| `packages/platform/logging/src/event-codes.ts#LOG_EVENT_CODES` | Olay sözlüğü |
| `packages/platform/logging/src/logger-config.ts#TIER_LOGGER_DEFAULTS` | Tier varsayılanları |
| `packages/platform/container-access/src/container-proxy/interface.ts#IContainerProxy` | Port |

## 5. Purity Kuralları (ZORUNLU)

1. JobType/eventCode/tier bilgisi yalnız platform'da; core jenerik kalır (K1/K5).
2. Yürütücü HTTP/BullMQ bilmez; portlar enjekte edilir (K4).
3. `container-access` davranışsız porttur; yeni davranış başka katmana (K6).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Komut Çözümleme

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: param şablonları, hata kodları, atomic/timeout varsayılanları, config dosya çözümü
- hariç: komut yürütme (UC-3), HTTP (WEB-SERVICE)

**Akış:**
1. Cihaz + komut config'ten çözülür.
2. Parametreler şablona işlenir.
3. `Result` ile job üretilir (hata → `Result.err`).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Çözümleme hataları throw etmez, `Result` döner | AK-1.1 |
| FR-1.2 | `-{{param}}` negatif işareti ve varsayılanlar uygulanır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** bilinmeyen komut **WHEN** `build` çağrılır **THEN** `Result.err("command_not_found")` döner
2. **AK-1.2 — GIVEN** `-{{power}}` şablonu **WHEN** 5 verilir **THEN** job değeri -5 olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Result dönüşü | unit (`command-job-builder.test.ts`) | ⬜ |
| AK-1.2 | Şablon | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Kanonik ad ≠ dosya adı | İçerik taramasıyla bulunur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/commands/src/command-job-builder.ts` | Çözümleme |
| `packages/platform/commands/src/device-config-source.ts` | Config kaynağı |

### 6.2 UC-2 — Manevra/Operasyon Kaydı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: DB>dosya gölgeleme, ad uzayları, list/resolve semantiği
- hariç: yürütme (UC-3)

**Akış:**
1. DB kayıtları yüklenir.
2. Dosya kayıtları gölgelenmeyenlerle eklenir.
3. `resolve`/`list` sonuç döner (throw yok).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | DB kaydı dosyayı gölgeler; devre dışı DB kaydı dosyaya düşmez | AK-2.1 |
| FR-2.2 | Mükerrer dosya ismi kurulumda throw eder | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** aynı isimde DB + dosya kaydı **WHEN** resolve **THEN** DB kaydı döner
2. **AK-2.2 — GIVEN** iki dosyada aynı manevra adı **WHEN** kurulum yapılır **THEN** throw eder

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Gölgeleme | unit (`maneuver-registry.test.ts`) | ⬜ |
| AK-2.2 | Fail-fast | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Deployment bağımlı migrasyon testi (B2) | A1 kararı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/commands/src/maneuver-registry.ts` | Kayıt |

### 6.3 UC-3 — Operasyon Yürütme

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: fail-closed begin, onFailure politikaları, seçici çözümü, timer, uzak adım, precondition
- hariç: HTTP yanıtları (WEB-SERVICE)

**Akış:**
1. `runs.begin` yazılır (yazılamazsa red).
2. Adımlar sırayla yürütülür; seçiciler o anda çözülür.
3. `onFailure` politikası uygulanır; `runs.finish` best-effort.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `runs.begin` yazılamazsa yürütme reddedilir | AK-3.1 |
| FR-3.2 | `rollback` yalnız başarılı adımları ters sırada geri alır (best-effort) | AK-3.2 |
| FR-3.3 | Uzak adım `remoteTimeoutMs` ile sınırlanır | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** run store yazamıyor **WHEN** execute çağrılır **THEN** `run_persist_failed` döner
2. **AK-3.2 — GIVEN** 3 adımdan 2. hata verdi **WHEN** rollback koşar **THEN** yalnız 1. adım geri alınır
3. **AK-3.3 — GIVEN** uzak kanal yanıt vermiyor **WHEN** süre dolar **THEN** `remote_timeout` ile döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Fail-closed | unit (`operation-executor.test.ts`) | ⬜ |
| AK-3.2 | Rollback | unit | ⬜ |
| AK-3.3 | Uzak timeout | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Çözüm boş | Adım başarısız (kademeli bozulma) |
| Precondition yok | Davranış birebir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/commands/src/operation-executor.ts` | Yürütücü |

### 6.4 UC-4 — Kuyruk Politikası

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: JobType→retry haritası, lazy kuyruklar, config override
- hariç: core kuyruk semantiği (MESAJLASMA)

**Akış:**
1. JobType çözülür.
2. Politika uygulanır (attempts).
3. Kuyruk lazy açılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | READ/WRITE/COMMAND job'ları attempts 1 ile çalışır | AK-4.1 |
| FR-4.2 | `FETCH_EXTERNAL` attempts 3 (exponential) | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** COMMAND_DEVICE job'u **WHEN** kuyruğa eklenir **THEN** retry yapılmaz
2. **AK-4.2 — GIVEN** FETCH_EXTERNAL job'u **WHEN** hata verir **THEN** 3 deneme yapılır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Attempts 1 | unit (`platform-message-queue.test.ts`) | ⬜ |
| AK-4.2 | Exponential | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen config anahtarı | Yok sayılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/messaging/src/platform-message-queue.ts` | Politika |

### 6.5 UC-5 — Log Sözlüğü + Tier Varsayılanları

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: kapalı eventCode kümesi, tier sink varsayılanları
- hariç: TamperLogger çekirdeği (TAMPER-LOGGER)

**Akış:**
1. eventCode doğrulayıcı olarak enjekte edilir.
2. Tier'a göre logger config üretilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Sözlükte olmayan eventCode log yazımını reddeder (fail-closed) | AK-5.1 |
| FR-5.2 | Tier varsayılanları platform'da tanımlıdır | AK-5.2 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** bilinmeyen eventCode **WHEN** audit log yazılır **THEN** reddedilir
2. **AK-5.2 — GIVEN** field tier **WHEN** logger config üretilir **THEN** timescale sink dahildir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Fail-closed | unit (`event-codes`) | ⬜ |
| AK-5.2 | Tier varsayılanı | unit (`logger-config`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik tier | Varsayılan set |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/logging/src/event-codes.ts` | Sözlük |
| `packages/platform/logging/src/logger-config.ts` | Tier varsayılanları |

### 6.6 UC-6 — Container Erişim Portu (referans)

**Status:** ⛔ Defer

**Kapsam:**
- dahil: `IContainerProxy` port kaydı, ISP borcu
- hariç: davranış (yok)

**Akış:**
1. Port M2'de ayrıştırılacak.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Port ayrımı M2 kapsamına ertelenir | AK-6.1 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** port **WHEN** envanter okunur **THEN** defer kaydı ve ISP borcu görünür

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Defer kaydı | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-6: Defer kaydını KAPANIŞ'a işle

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Port kullanımı | Mevcut tüketiciler değişmez |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/container-access/src/container-proxy/interface.ts` | Port |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Çözümleme hatası | `Result.err` |
| Begin yazılamadı | Yürütme reddi |
| Rollback | Best-effort, ters sıra |
| Bilinmeyen eventCode | Fail-closed |
| Container portu | Defer |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Komut/manevra/yürütücü semantiği testli | komut |
| SC-2 | JobType yalnız platform'da | kod inceleme |
| SC-3 | Audit sözlüğü fail-closed | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 100+ test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-6 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `PLATFORM-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Migrasyon testinin deployment dosyalarına bağının çözülmesi (B2) | İleri İş |
| A2 | `IContainerProxy` port ayrımı (B1) | M2 |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Migrasyon testi fixture'larının repo'ya alınması (A1).
2. Container port ayrımı (A2).
3. Yeni JobType'ların retry haritasına eklenmesi.

## 12. T Görev Özeti

| T-1 | UC-1 (komut çözümleme) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (manevra kaydı) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (operasyon yürütme) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (kuyruk politikası) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (log sözlüğü/tier) kanıt testlerinin eşleştirilmesi |
| T-6 | UC-6 (container portu) defer kaydının KAPANIŞ'a işlenmesi |
