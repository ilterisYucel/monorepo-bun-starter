---
status: active
space: architecture
tags: [mimari, komut, manevra, operasyon, spec]
review_date: 2026-11-10
---

# Komut / Manevra / Operasyon — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `PLATFORM-MIMARISI.md` (çözümleme/kayıt/yürütme), `SHARED-TYPES-MIMARISI.md` (şemalar), `AUTH-MIMARISI.md` (yetki), `zero-trust-application-channel` (repo-dışı, uzak kanal).

## 1. Amaç ve Bağlam

Uçtan uca komut/manevra/operasyon akışı: katalog dosyaları (`maneuvers.json`, `operations.json`) → şema → kayıt → yürütme → uzak kanal → sonuç. Fiziksel yazma riski taşıdığı için en yüksek güvenlik kapısına sahiptir (K12: güç komutu yasağı).

| Katman | Kapsam |
|:-------|:-------|
| dahil | Katalog sözleşmesi, çözümleme, kayıt/gölgeleme, yürütme+rollback, boss→field ve field→container uzak kanalları, interlock |
| hariç | Komut job'u taşıma (PLATFORM), cihaz yazma (MODBUS/DEVICE-SERVICE), UI panelleri (APPS) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Kayıtlar DAVRANIŞ taşımaz; `mode`/`onFailure`/`rollbackSteps` yürütücünün girdisidir | Veri/semantik ayrımı |
| K2 | STRICT zod: bilinmeyen anahtar RED; bozuk dosya servis açılışını reddeder (fail-fast) | Bozuk katalog yüklenmez |
| K3 | Hedef seçici TAM BİRİ (`deviceId`\|`deviceIds`\|`deviceTypes`); `command`\|`telemetries` en az biri | Belirsiz hedef yok |
| K4 | `onFailure:"rollback"` → `rollbackSteps`/`rollback` ZORUNLU | Rollback'siz rollback yok |
| K5 | `validate.expect`: ilişki sözcükleri (`negative/positive/zero/nonzero`) + `accept` benign ack listesi + MODBUS 0/1 ↔ boolean eşlemesi | Canlı koşumda yakalanan sözleşme uyuşmazlığı sabitlendi |
| K6 | DB kaydı > dosya kaydı; devre dışı DB kaydı dosyaya DÜŞMEZ; manevra/operasyon AYRI ad uzayları; tanımlar tier-LOCAL | Gölgeleme kuralı |
| K7 | Fail-closed başlangıç: `runs.begin` yazılamazsa yürütme REDDEDİLİR; `runs.finish` best-effort; rollback yalnız BAŞARILI adımları ters sırada geri alır (best-effort) | Fiziksel güvenlik |
| K8 | Seçici yürütme anında çözülür; `{{divideTotal}}` yürütücüde; timer `stopCommand` delay ile; uzak adım `remoteTimeoutMs` (120 sn) | Kilitlenme yok |
| K9 | Boss→field: `x-gd-operation-id`, `trigger=boss:<id>`, `createdBy=boss`; 202 → `failed/still_running` (terminal-only `operation-result`) | Kanal sözleşmesi |
| K10 | Field→container uzak adım: hub access + system kimliği; erişilemezse `system_unreachable` | Kademeli bozulma |
| K11 | Interlock: `charge`/`discharge` adlarında toprak kapalıysa `interlock_earthed`; telemetri okunamazsa nötr (fail-open izin) | Demo interlock |
| K12 | Katalog dosyaları eklemelidir (`maneuvers.json` + `demo-maneuvers.json`); K12 güç komutu yasağı migrasyon testiyle sabit | Üretim kayıtları korunur |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Doküman borcu: eski §9 operasyon kanalını WS frame olarak anlatıyor; uygulama hub-access HTTP | `deprecated` KOMUT-MANEVRA-OPERASYON-MIMARISI.md §9 ↔ `services/web-service/src/tiers/boss/infrastructure/operation-requester.ts` |
| B2 | Migrasyon testi gerçek `deployment/v2/dev/*/maneuvers/*.json` dosyalarına sert bağlı (12 kayıt sayısı) | `packages/platform/commands/src/maneuver-migration.test.ts` |
| B3 | Eski doküman "komut katmanı tamamdır" deyip `CommandJobBuilder` için FR/AK vermiyor | aynı doküman |

## 4. Mimari

```text
deployment katalogları (maneuvers/operations.json)
        │ zod (strict)
        ▼
ManeuverRegistry (DB > dosya) ──► OperationExecutor ──► ICommandChannel ──► CommandJobBuilder ──► kuyruk
                                        │                    └──► IRemoteCommandChannel ──► hub access ──► field ──► container
                                        ├ runs.begin (fail-closed) / runs.finish (best-effort)
                                        └ rollback (ters sıra, best-effort)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/shared-types/src/commands/maneuver.ts#ManeuverRecord` | Kayıt şeması |
| `packages/shared-types/src/commands/maneuver.ts#OperationRecord` | Operasyon şeması |
| `packages/shared-types/src/commands/validate-expect.ts#expectHolds` | Doğrulama |
| `packages/platform/commands/src/command-job-builder.ts#CommandJobBuilder` | Çözümleme |
| `packages/platform/commands/src/maneuver-registry.ts#ManeuverRegistry` | Kayıt |
| `packages/platform/commands/src/operation-executor.ts#OperationExecutor` | Yürütme |
| `packages/platform/commands/src/operation-executor-contracts.ts#IRemoteCommandChannel` | Uzak kanal |
| `services/web-service/src/presentation/routes/operation-boss-routes.ts#operationBossRoutes` | Boss yüzeyi |
| `services/web-service/src/tiers/site/infrastructure/hub-maneuver-channel.ts#HubManeuverChannel` | Site uzak kanal |

## 5. Purity Kuralları (ZORUNLU)

1. Kayıtlar davranış taşımaz (K1).
2. Yürütücü HTTP/BullMQ bilmez; portlar enjekte edilir (K7).
3. Katalog dosyaları yalnız eklemeli değişir (K12).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Komut Çözümleme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: param şablonları, hata kodları, atomic/timeout varsayılanları
- hariç: kuyruk (PLATFORM)

**Akış:**
1. Cihaz + komut config'ten çözülür.
2. Parametreler işlenir; `Result` döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Çözümleme hataları `Result.err` ile döner (throw yok) | AK-1.1 |
| FR-1.2 | `-{{param}}` negatif işareti uygulanır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** bilinmeyen cihaz **WHEN** build **THEN** `device_not_found` döner
2. **AK-1.2 — GIVEN** `-{{power}}` **WHEN** 5 **THEN** -5

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Result | unit (`command-job-builder.test.ts`) | ⬜ |
| AK-1.2 | Şablon | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Kanonik ad ≠ dosya | İçerik taraması |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/commands/src/command-job-builder.ts` | Çözümleme |

### 6.2 UC-2 — Katalog Yükleme/Çözümleme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: strict yükleme, DB>dosya gölgeleme, ad uzayları, list/resolve
- hariç: yürütme (UC-3)

**Akış:**
1. Dosyalar strict doğrulanır.
2. DB kayıtları yüklenir; gölgeleme uygulanır.
3. `resolve`/`list` throw etmez.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Bozuk dosya açılışı reddeder | AK-2.1 |
| FR-2.2 | Disabled DB kaydı dosyaya düşmez | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** bilinmeyen anahtar **WHEN** yükleme **THEN** throw
2. **AK-2.2 — GIVEN** disabled DB kaydı + aynı adlı dosya **WHEN** resolve **THEN** `disabled` döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Fail-fast | unit (`maneuver-registry.test.ts`) | ⬜ |
| AK-2.2 | Gölgeleme | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Mükerrer dosya adı | Kurulumda throw |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/commands/src/maneuver-registry.ts` | Kayıt |

### 6.3 UC-3 — Yürütme + Rollback

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: fail-closed begin, onFailure politikaları, timer, interlock, divideTotal
- hariç: uzak kanal (UC-4)

**Akış:**
1. `runs.begin` yazılır (fail-closed).
2. Adımlar yürütülür; precondition hook uygulanır.
3. `onFailure` politikası + rollback.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `runs.begin` yazılamazsa yürütme reddedilir | AK-3.1 |
| FR-3.2 | Rollback yalnız başarılı adımları ters sırada geri alır | AK-3.2 |
| FR-3.3 | Interlock toprak kapalıysa `interlock_earthed` döner | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** run store hatası **WHEN** execute **THEN** `run_persist_failed`
2. **AK-3.2 — GIVEN** 3 adım, 2. hata **WHEN** rollback **THEN** yalnız 1. geri alınır
3. **AK-3.3 — GIVEN** charge + toprak kapalı **WHEN** execute **THEN** interlock reddi

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Fail-closed | unit (`operation-executor.test.ts`) | ⬜ |
| AK-3.2 | Rollback | unit | ⬜ |
| AK-3.3 | Interlock | unit (`demo-earthing-interlock.spec`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Timer | `stopCommand` delay |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/platform/commands/src/operation-executor.ts` | Yürütme |
| `services/web-service/src/infrastructure/interlock/demo-earthing-interlock.ts` | Interlock |

### 6.4 UC-4 — Uzak Kanal (Boss→Field, Field→Container)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: operation requester, hub access, system kimliği, 202 semantiği, timeout
- hariç: tunnel çekirdeği (zero-trust)

**Akış:**
1. Boss, site'ye `x-gd-operation-id` ile istek atar.
2. Site, konteynere hub access + system kimliğiyle ulaşır.
3. Sonuç terminal-only döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | 202 → `failed/still_running` (terminal-only) | AK-4.1 |
| FR-4.2 | Ulaşılamayan hedef `system_unreachable` döner | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** 202 **WHEN** sonuç beklenir **THEN** `still_running` döner
2. **AK-4.2 — GIVEN** konteyner erişilemez **WHEN** uzak adım **THEN** `system_unreachable`

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | 202 | unit (`operation-requester.test.ts`) | ⬜ |
| AK-4.2 | Kademeli | unit (`hub-maneuver-channel.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| remoteTimeoutMs | Kilitlenme yok |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/tiers/boss/infrastructure/operation-requester.ts` | Boss kanalı |
| `services/web-service/src/tiers/site/infrastructure/hub-maneuver-channel.ts` | Site kanalı |

### 6.5 UC-5 — Katalog Dosya Sözleşmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: dosya yerleşimi, eklemeli demo katalogları, K12 güç yasağı
- hariç: katalog CRUD UI (APPS)

**Akış:**
1. `maneuvers.json`/`operations.json` deployment tier'ında yaşar.
2. Demo katalogları eklemeli yüklenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Demo katalogları üretim kayıtlarını değiştirmez | AK-5.1 |
| FR-5.2 | K12 güç komutu katalogda bulunmaz | AK-5.2 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** demo katalogları **WHEN** kök okunur **THEN** üretim aynı kalır
2. **AK-5.2 — GIVEN** migrasyon testi **WHEN** katalog taranır **THEN** güç komutu yok

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Eklemeli | unit (`maneuver-migration.test.ts`) | ⬜ |
| AK-5.2 | K12 | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Deployment bağı (B2) | A1 kararı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `deployment/v2/dev/*/maneuvers/*.json` | Katalog |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bozuk katalog | Açılış reddi |
| Begin hatası | Yürütme reddi |
| Uzak hedef yok | `system_unreachable` |
| Interlock | Red |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Yürütme/rollback testli | komut |
| SC-2 | Katalog fail-fast | komut |
| SC-3 | K12 güç yasağı kanıtlı | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 70+ test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `KOMUT-MANEVRA-OPERASYON-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Migrasyon testinin deployment bağının çözülmesi (B2) | İleri İş |
| A2 | Doküman borcu: WS-frame anlatımının temizlenmesi (B1) | Bu SPEC ile kapandı |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Migrasyon fixture'larının repo'ya alınması (A1).
2. Yeni manevra/operasyon tipleri.

## 12. T Görev Özeti

| T-1 | UC-1 (çözümleme) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (katalog) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (yürütme/rollback) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (uzak kanal) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (katalog sözleşmesi) kanıt testlerinin eşleştirilmesi |
