---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, shared-types]
review_date: 2026-11-10
---

# Shared Types — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer, GLM-5.3).
> **SPEC:** [SHARED-TYPES-MIMARISI.md](./SHARED-TYPES-MIMARISI.md) (onaylı — AK/FR kaynağı).
> **Kapsam:** SPEC↔kod doğrulaması — bu turda kaynak değişikliği YOK (modül kodu dokunulmadı); kanıtlar kod incelemesi + otomatik test envanteridir.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

> Bu kapanış bir doğrulama kapanışıdır: onaylı SPEC, mevcut implementasyonla karşılaştırıldı. Kaynak dosya değişmedi.

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/shared-types/src/telemetry/telemetry-data.ts#TelemetryData` | (doğrulama) `BaseTelemetryData` = sistem tek şekli; protokol alanları `ModbusTelemetryData` vb. ayrı interface'lerde | K1/FR-1.1 |
| 2 | `packages/shared-types/src/telemetry/telemetry-data.ts#ModbusTelemetryData` | (doğrulama) `protocol: "MODBUS"` sabiti ile daraltma; register/bitfield alanları | K1/FR-1.2 |
| 3 | `packages/shared-types/src/schemas/device-config.ts#telemetryEntrySchema` | (doğrulama) `deadband` varsa `maxStaleMs` ZORUNLU + `"auto"` yalnız MODBUS integer/CANBUS — `superRefine` | K3/FR-2.1 |
| 4 | `packages/shared-types/src/schemas/device-config.ts#deviceConfigFileSchema` | (doğrulama) telemetri adı tekilliği + bitfield çakışması `superRefine` | K4/FR-2.2 |
| 5 | `packages/shared-types/src/alarm.ts#DeviceAlarmRule` | (doğrulama) alarm tek kaynağı config `alarms`; ad = telemetri adı | K5/FR-3.1 |
| 6 | `packages/shared-types/src/commands/maneuver.ts#ManeuverRecord` | (doğrulama) strict zod; hedef seçici tam-biri; rollback zorunluluğu | K7/FR-4.1, FR-4.2 |
| 7 | `packages/shared-types/src/device-interface.ts#IDevice` | (doğrulama) ISP: yalnız `connect/disconnect/read/write` + opsiyonel `writeAtomic`; alarm API YOK | K6/FR-5.1 |
| 8 | `packages/shared-types/src/integration-plugin.ts` | (doğrulama) `@gd-monorepo/plugin-sdk` importu — ters bağımlılık (SPEC B1/A1) | B1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri (otomatik) | `bun run test:inventory` → `docs/roadmap/test-envanteri.otomatik.md` | shared-types: **8 dosya / 127 test** envanterde 🟡 |
| Config şema testleri | `packages/shared-types/src/schemas/device-config.test.ts` (envanter: 31 test) | deadband/maxStaleMs, ad tekilliği, bitfield sınırları kapsıyor 🟡 |
| Alarm şema | `schemas/alarm.test.ts` (8 test) | severity/strip kapsıyor 🟡 |
| Komut şemaları | `commands/maneuver-record.test.ts` (23) + `validate-expect.test.ts` (9) | seçici/strict/rollback/expect kapsıyor 🟡 |
| Otomasyon kuralı | `automation-rule.test.ts` (26) | strict şema matrisi 🟡 |
| Servis config şemaları | `schemas/{server,service,validate}.test.ts` (11+15+4) | yardımcı şemalar 🟡 |
| Taze test koşusu | `vitest run` (packages/shared-types) | **İLETİLMEDİ** — reviewer turu salt-okuma; ana agent sonraki turda koşmalı (bkz. B.2/G1) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Tek şekil — tüm katmanlar `TelemetryData` | kod inceleme: `telemetry-data.ts#TelemetryData` | 🟢 |
| AK-1.2 | `protocol` daraltma → `ModbusTelemetryData` | kod inceleme: `telemetry-data.ts#ModbusTelemetryData` | 🟢 |
| AK-2.1 | deadband → maxStaleMs zorunlu; "auto" tür kısıtı | kod inceleme: `device-config.ts#telemetryEntrySchema` superRefine + envanter 31 test | 🟡 |
| AK-2.2 | Ad tekilliği + bitfield çakışması reddi | aynı dosya `superRefine` (satır 59/181) + envanter | 🟡 |
| AK-3.1 | Alarm tek kaynak config'te; ad = telemetri adı | kod inceleme: `alarm.ts#DeviceAlarmRule` | 🟢 |
| AK-3.2 | Şema severity doğrulaması | `schemas/alarm.test.ts` (8 test — envanter) | 🟡 |
| AK-4.1 | Strict şema; bilinmeyen anahtar red | `maneuver-record.test.ts` (23 test — envanter) | 🟡 |
| AK-4.2 | Seçici tam-biri; rollback adımı zorunlu | aynı test dosyası | 🟡 |
| AK-5.1 | `IDevice` alarm API taşımaz | kod inceleme: `device-interface.ts#IDevice` (4 metot + opsiyonel) | 🟢 |
| AK-5.2 | `ITelemetryTransport` çok-abone opsiyonları | kod inceleme mevcut; **test yok** (SPEC B2) | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `integration-plugin.ts` plugin-sdk ters bağımlılığı (SPEC B1) | shared-types'ın tek dış paket bağımlılığı; katman ayrımı İleri İş (SPEC A1) — kod bu turda değişmedi |
| S2 | `IDevice`/`ITelemetryTransport`/`ByteOrder` testsiz (SPEC B2) | Tip sözleşmeleri; test borcu B.2'de izleniyor |
| S3 | `commands/maneuver-config.ts` geçici frontend tipi (SPEC B3) | Katalog migrasyonunda kalkacak — dokunulmadı |
| S4 | Taze test koşusu iletilmedi | Reviewer salt-okuma; envanter + kod inceleme kanıtı kullanıldı |

### A.5 Gözle Kontrol Maddeleri

- [x] `TelemetryData` tek şekil; protokol alanları ayrı interface'lerde (K1)
- [x] Config tipleri distributive union (`Omit<..., "value"|"timestamp"|"deviceId">` semantiği — config/runtime ayrımı, K2)
- [x] `deadband`/`maxStaleMs`/`"auto"` kısıtları superRefine'da fail-fast (K3)
- [x] Telemetri adı tekilliği + bitfield çakışması şemada (K4)
- [x] Alarm tek kaynağı config; ad = telemetri adı (K5)
- [x] `IDevice` ISP — alarm API yok (K6)
- [x] Komut/kural şemaları strict (K7/K8)
- [x] Alt dosyalar ayrı SPEC açmıyor — tek doküman sahipliği

### A.6 Genel Durum Özeti

**MODÜL UYGUN — onay önerisi:** Onaylı SPEC, mevcut implementasyonla tam uyumlu; 10 AK'dan 4'ü kod incelemesiyle tam 🟢, 6'sı envanter+inceleme kanıtıyla 🟡 (taze koşu iletilmedi). Davranış sapması YOK. Bilinen borçlar (plugin-sdk ters bağımlılığı, testsiz port tipleri, geçici frontend tipi) SPEC'te kayıtlı ve İleri İş'te. SPEC'in `⬜` durum kolonları ve `✏️ Specified` satırları ana agent tarafından `🟢 Doğrulanmış`'a güncellenmeli (reviewer SPEC'e dokunmaz). **review_date: 2026-11-10**

**NIS-2 uyumluluk kontrolü:** Config şemaları (zod strict + fail-fast) bir girdi doğrulama sınırıdır → güvenlik ilgili değişiklik sayılabilir. SPEC'te tehdit modeli/güvenlik AK'sı TANIMLI DEĞİLDİR — **uyumluluk boşluğu olarak işaretlendi**. Öneri (SPEC revizyon önerisi DEĞİL, ileri iş): şema katmanı için kısa tehdit modeli (bozuk/elenen girdi, enjeksiyona karşı strict red) eklenir; kararı developer.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| deadband'sız maxStaleMs | config doğrulanır | red (superRefine) | `schemas/device-config.test.ts` (`device-config.ts#telemetryEntrySchema`) |
| `deadband:"auto"` + FLOAT32 | config doğrulanır | red | aynı dosya |
| Aynı isim iki telemetri | config doğrulanır | red | `deviceConfigFileSchema` superRefine — envanter |
| Geçersiz severity | alarm şeması | red | `schemas/alarm.test.ts` |
| Bilinmeyen anahtar (kayıt) | katalog yüklenir | red (strict) | `maneuver-record.test.ts` |
| `onFailure:"rollback"` + adım yok | katalog yüklenir | red | aynı dosya |
| Geçersiz kural anahtarı | rules.json yüklenir | red | `automation-rule.test.ts` |
| `IDevice` arayüzü | kontrol | alarm API yok | **KAPSANMAYAN** (B2 — tip sözleşmesi) |
| `ITelemetryTransport` | kontrol | multipleks opsiyonları | **KAPSANMAYAN** (B2) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze test koşusu iletilmedi (127 test envanterde; koşu kanıtı yok) | Düşük — envanter otomatik üretim | Ana agent bir sonraki turda `nx run shared-types:test` koşar |
| G2 | `IDevice`/`ITelemetryTransport`/`ByteOrder` tip sözleşme testleri yok | Orta — kontrat regresyonu tip düzeyinde yakalanır ama CI değil | Derleme zamanı uyum testi (SPEC İleri İş 3) |
| G3 | `integration-plugin.ts` plugin-sdk bağımlılığı — katman ayrımı | Düşük | SHARED-TYPES A1 + PLUGIN-SDK A1 (aynı karar) |
| G4 | `maneuver-config.ts` geçici tip | Düşük | Katalog migrasyonu (SPEC A2) |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: SPEC↔kod doğrulaması (kaynak değişikliği yok); NIS-2 boşluğu işaretlendi | (yok — SPEC değişmedi) |
