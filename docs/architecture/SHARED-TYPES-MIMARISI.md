---
status: active
space: architecture
tags: [mimari, shared-types, telemetri, sozlesme, spec]
review_date: 2026-11-10
---

# Shared Types — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `TELEMETRI-ZINCIRI-MIMARISI.md`, `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`, `PLUGIN-SDK-MIMARISI.md`.

## 1. Amaç ve Bağlam

`packages/shared-types` paketinin sözleşmesi: tüm sistemin ortak veri şekilleri — telemetri, cihaz config + zod şemaları, alarm, DTO'lar, komut/manevra kayıtları, otomasyon kuralı, transport/IDevice portları. Frontend ↔ backend ↔ driver arasında tek şekil ilkesi. Alt dosyalar ayrı SPEC OLMAZ; bu dokümanın bölümleridir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Veri şekilleri, fail-fast şemalar, kimlik kuralları, port tipleri |
| hariç | Davranış (alarm değerlendirme, kural motoru, komut yürütme — kendi SPEC'lerinde) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `TelemetryData` sistemin ortak veri sözleşmesidir; protokol alanları ayrı interface'lerde, `protocol` ile daraltılır | FE↔BE↔driver tek şekil; `TelemetryDataWithProtocol` ayrımı |
| K2 | Config tipleri çalışma zamanı alanları çıkarılmış **distributive union** (`Omit<..., "value"\|"timestamp"\|"deviceId">`) + `canonical`/`deadband`/`maxStaleMs` | Config ile runtime telemetri karışmaz |
| K3 | `deadband` varsa `maxStaleMs` ZORUNLU; `deadband:"auto"` yalnız MODBUS integer türleri + CANBUS | Şema fail-fast; geçersiz kombinasyon yüklenmez |
| K4 | Kimlik: telemetri `name` cihaz içinde tekil; ayrım tag'i olmayan bitfield alanı register telemetri adıyla çakışamaz | `superRefine` ile kurulum reddi |
| K5 | Alarm tek kaynağı config `alarms`; alarm adı = telemetri adı; cihaz tipinden bağımsız | Kod/enum/tag'de alarm kaynağı yok |
| K6 | `IDevice` ISP: yalnız `connect/disconnect/read/write` (+opsiyonel `writeAtomic`); alarm API'si taşımaz | Cihaz tipinden bağımsız kontrat |
| K7 | Komut/manevra/operasyon kayıtları DAVRANIŞ taşımaz; strict zod; hedef seçici tam-biri; `onFailure:"rollback"` → rollback adımları zorunlu | Yürütme semantiği KOMUT-MANEVRA SPEC'inde |
| K8 | `AutomationRule` yalnız tip + şema; değerlendirme semantiği RuleEvaluator'da | Strict şema; delegasyon (`maneuver`/`operation`) kayıt yüklemez |
| K9 | `ITelemetryTransport` opsiyonel `addDevices/removeDevices` (çok-abone multipleks, referans sayımı) | UI transport stratejisiyle uyumlu |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `integration-plugin.ts` `@gd-monorepo/plugin-sdk`'ya bağımlı — shared-types'ın tek dış paket bağımlılığı (ters katman kokusu) | `packages/shared-types/src/integration-plugin.ts` |
| B2 | `IDevice`/`ITelemetryTransport`/`ByteOrder` testsiz (tip sözleşmesi) | kod incelemesi |
| B3 | `commands/maneuver-config.ts` geçici frontend tipi — katalog migrasyonunda kalkacak | dosya başlığı |

## 4. Mimari

```text
Frontend (ui) ──┐
Servisler ──────┼──► shared-types (tek şekil)
Simülatörler ───┘     ├ telemetry (TelemetryData + protocol)
                      ├ config (DeviceConfigFile + zod şemaları)
                      ├ alarm (DeviceAlarmRule/State)
                      ├ commands (CommandStep/ManeuverRecord/OperationRecord)
                      ├ automation-rule (AutomationRule + şema)
                      └ ports (IDevice, ITelemetryTransport, IModbusSimulatorAdapter)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/shared-types/src/telemetry/telemetry-data.ts#TelemetryData` | Ortak veri şekli |
| `packages/shared-types/src/telemetry/transport.ts#ITelemetryTransport` | Transport portu |
| `packages/shared-types/src/config/device-config.ts#DeviceConfigFile` | Cihaz config tipi |
| `packages/shared-types/src/schemas/device-config.ts#deviceConfigFileSchema` | Fail-fast şema |
| `packages/shared-types/src/alarm.ts#DeviceAlarmRule` | Alarm kuralı |
| `packages/shared-types/src/device-interface.ts#IDevice` | Cihaz kontratı |
| `packages/shared-types/src/commands/maneuver.ts#ManeuverRecord` | Manevra kaydı |
| `packages/shared-types/src/automation-rule.ts#AutomationRule` | Kural şeması |

## 5. Purity Kuralları (ZORUNLU)

1. Paket yalnız tip + şema taşır; I/O ve davranış YOK.
2. Alt dosyalar ayrı SPEC açmaz — bu dokümanın bölümleridir.
3. Şemalar strict'tir: bilinmeyen anahtar reddedilir (fail-fast).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Telemetri Veri Sözleşmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `TelemetryData` şekli, protokol daraltma, batch
- hariç: üretim (device-service), taşıma (ui transport)

**Akış:**
1. Üretici `TelemetryData` üretir.
2. Protokole özgü alanlar `protocol` ile daraltılır.
3. Batch gerekiyorsa `BatchTelemetryData` kullanılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Tüm katmanlar aynı `TelemetryData` şeklini kullanır | AK-1.1 |
| FR-1.2 | Protokol alanları `protocol` ile daraltılır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** cihaz telemetrisi **WHEN** backend'e ulaşır **THEN** alan seti `TelemetryData` ile birebir uyumludur
2. **AK-1.2 — GIVEN** MODBUS telemetrisi **WHEN** `protocol` daraltılır **THEN** `ModbusTelemetryData` alanları görünür

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Tek şekil | kod inceleme | ⬜ |
| AK-1.2 | Daraltma | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-1: Telemetri sözleşmesi kanıtlarını (test/şema) eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen protokol | Tip sistemi reddeder |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-types/src/telemetry/*` | Veri şekli |

### 6.2 UC-2 — Cihaz Config Şeması

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: config tipi, fail-fast şema, deadband/maxStaleMs, kimlik kuralları
- hariç: config yükleme (DEVICE-SERVICE), drift (SHARED-UTILS)

**Akış:**
1. Config dosyası zod şemasından geçer.
2. `deadband` varsa `maxStaleMs` kontrol edilir.
3. Telemetri adları + bitfield çakışması doğrulanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Geçersiz config (deadband/maxStaleMs, "auto" türü) yüklenmez | AK-2.1 |
| FR-2.2 | Telemetri adı tekilliği ve bitfield çakışması reddedilir | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `deadband` var, `maxStaleMs` yok **WHEN** şema doğrular **THEN** config reddedilir
2. **AK-2.2 — GIVEN** aynı isim iki telemetri **WHEN** şema doğrular **THEN** config reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Fail-fast | unit (`schemas/device-config.test.ts`) | ⬜ |
| AK-2.2 | Kimlik kuralları | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: Config şeması kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen anahtar | Reddedilir (strict) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-types/src/config/device-config.ts` | Tip |
| `packages/shared-types/src/schemas/device-config.ts` | Şema |

### 6.3 UC-3 — Alarm Sözleşmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `DeviceAlarmRule`, ad = telemetri adı, severity, aktif/durum tipi
- hariç: değerlendirme (TELEMETRI-ZINCIRI), çözme (WEB-SERVICE)

**Akış:**
1. Config `alarms[]` yüklenir.
2. Alarm adı telemetri adına bağlanır.
3. Durum tablosu tipi (`DeviceAlarmState`) tüketilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Alarm tanımı yalnız config'te yaşar; ad = telemetri adı | AK-3.1 |
| FR-3.2 | Şema severity'yi doğrular, bilinmeyen alanları eler | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** alarm tanımı **WHEN** değerlendirici okur **THEN** hedef telemetri adıyla eşleşir
2. **AK-3.2 — GIVEN** geçersiz severity **WHEN** şema doğrular **THEN** config reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Tek kaynak | kod inceleme | ⬜ |
| AK-3.2 | Şema | unit (`schemas/alarm.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: Alarm sözleşmesi kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Aynı isimli çoklu telemetri | OR ile birleşir (değerlendirici) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-types/src/alarm.ts` | Alarm tipleri |

### 6.4 UC-4 — Komut/Manevra ve Otomasyon Şemaları (referans)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `CommandStep`/`ManeuverRecord`/`OperationRecord` strict şemaları, `AutomationRule` şeması
- hariç: yürütme (KOMUT-MANEVRA-OPERASYON), değerlendirme (MANAGEMENT-SERVICE)

**Akış:**
1. Katalog dosyaları (`maneuvers.json`, `operations.json`, `rules.json`) şemadan geçer.
2. Bozuk dosya servis açılışını reddeder.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Kayıtlar strict doğrulanır; bilinmeyen anahtar reddedilir | AK-4.1 |
| FR-4.2 | Hedef seçici tam-biri; rollback adımları zorunlu | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** bilinmeyen anahtarlı kayıt **WHEN** yüklenir **THEN** reddedilir
2. **AK-4.2 — GIVEN** `onFailure:"rollback"` ve adım yok **WHEN** yüklenir **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Strict şema | unit (`commands/*.test.ts`) | ⬜ |
| AK-4.2 | Seçici/rollback | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: Komut/otomasyon şeması kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Geçici frontend tipi (`ManeuverConfig`) | Migrasyonda kalkar (B3) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-types/src/commands/*` | Kayıt şemaları |
| `packages/shared-types/src/automation-rule.ts` | Kural şeması |

### 6.5 UC-5 — Port Tipleri (IDevice / ITelemetryTransport)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `IDevice` ISP, `ITelemetryTransport` multipleks opsiyonları
- hariç: implementasyonlar (core, ui)

**Akış:**
1. Cihaz implementasyonları `IDevice` uygular.
2. Transport implementasyonları `ITelemetryTransport` uygular.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | `IDevice` alarm API'si taşımaz | AK-5.1 |
| FR-5.2 | `ITelemetryTransport` çok-abone opsiyonlarını tanımlar | AK-5.2 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** cihaz implementasyonu **WHEN** `IDevice` kontrol edilir **THEN** yalnız connect/disconnect/read/write (+writeAtomic) vardır
2. **AK-5.2 — GIVEN** multipleks transport **WHEN** `ITelemetryTransport` kontrol edilir **THEN** `addDevices/removeDevices` opsiyonel tanımlıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | ISP | kod inceleme | ⬜ |
| AK-5.2 | Multipleks port | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-5: Port tipi kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Port değişikliği | Tüm implementasyonlar aynı PR'da güncellenir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-types/src/device-interface.ts` | IDevice |
| `packages/shared-types/src/telemetry/transport.ts` | ITelemetryTransport |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Geçersiz config | Şema reddeder (fail-fast) |
| Bilinmeyen anahtar | Strict red |
| Protokol daraltma | Tip sistemi |
| Tip değişikliği | Tüm tüketiciler aynı PR'da |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Tüm şemalar strict ve testli | komut |
| SC-2 | Tek şekil ilkesi korunur (kopya tip yok) | kod inceleme |
| SC-3 | Alt dosyalar ayrı SPEC açmaz | gözle |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 71 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `SHARED-TYPES-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `integration-plugin.ts` → plugin-sdk ters bağımlılığının kaldırılması (B1) | İleri İş (katman kararı) |
| A2 | `maneuver-config.ts` geçici tipinin kaldırılması (B3) | Katalog migrasyonu |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `integration-plugin` katman ayrımı (A1).
2. Geçici frontend tipinin kaldırılması (A2).
3. Port tipleri için derleme zamanı uyum testleri.

## 12. T Görev Özeti

| T-1 | UC-1 (telemetri) kanıtlarının eşleştirilmesi |
| T-2 | UC-2 (config şeması) kanıtlarının eşleştirilmesi |
| T-3 | UC-3 (alarm) kanıtlarının eşleştirilmesi |
| T-4 | UC-4 (komut/otomasyon şemaları) kanıtlarının eşleştirilmesi |
| T-5 | UC-5 (port tipleri) kanıtlarının eşleştirilmesi |
