---
status: active
space: architecture
tags: [mimari, telemetri, alarm, config, spec]
review_date: 2026-11-10
---

# Telemetri Zinciri — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `SHARED-TYPES-MIMARISI.md` (veri şekli), `TIMESERIES-MIMARISI.md` (kalıcılık), `DEVICE-SERVICE-MIMARISI.md`, `WEB-SERVICE-MIMARISI.md`.

## 1. Amaç ve Bağlam

Telemetri zinciri (multi-modül): cihaz config → tagger/canonical → yazma indirgeme (deadband) → kalıcılık → sorgu → konteyner görünümü → alarm (üretim + çözme). Tek `TelemetryData` şekli uçtan uca akar.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Config→tag/canonical, indirgeme, yazma tüketimi, sorgu sözleşmesi, konteyner görünümü, alarm üretim/çözme |
| hariç | Protokol okuma (MODBUS), kalıcılık adaptörü (TIMESERIES), UI bileşenleri (UI) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Tek veri şekli (`TelemetryData`) uçtan uca; protokol alanları `protocol` ile daraltılır | Katmanlar arası dönüşüm yok |
| K2 | Cihaz config TEK kaynağı (deployment device-configs / root configs); `canonical` → `tags.canonical` | Saha konfigürasyonu tek yerde |
| K3 | Yazma indirgeme opt-in: `deadband` (+`"auto"`=scale) ve `maxStaleMs` zorunlu; yalnız `WRITE_TELEMETRY` filtrelenir | Veri hacmi kontrollü |
| K4 | Telemetri ≠ log: `system_logs`'a telemetri yazılmaz; data-service aptal yazıcı | Tablo ayrımı |
| K5 | Sorgu: seri kimliği `name`+çağıran tag; `TAG_KEY_RE` doğrulaması; bucket origin; uzun-format downsampling; `latest` limit 20000 | Sorgu sözleşmesi |
| K6 | Konteyner görünümü: push YOK, talep-üzeri + TTL cache; kısmi başarı `allSettled`; presence 15 sn | Field dayanıklılığı |
| K7 | Alarm tek kaynağı config `alarms`; ad = telemetri adı; geçiş-odaklı dedup; 3 katman (durum tablosu + imzalı log + metadata yok); restart temizliği | Log gürültüsü yok |
| K8 | Resolve: admin/teknik; audit **fail-closed**; aktif değilse 409; teknisyen işareti log basmaz | Denetim izi |
| K9 | `canonical` ikincil indeks (ör. `soc` → `BSC SOC`) | Semantik eşleme |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Device-config drift denetimi var (`compareDeviceConfig`) ama CI'a bağlı değil | `packages/shared-utils/src/config/device-config-drift.ts` |
| B2 | Alarm üretimi device-service'te, çözme web-service'te — tek sözleşme iki implementasyon | `alarm-transition-detector.ts` + `alarm-routes.ts` |
| B3 | Telemetri sorgu route'ları port'suz (route→timescale) | WEB-SERVICE B2 |

## 4. Mimari

```text
device-configs ──► TelemetryTagger (canonical/tags)
                        │
DEVICE-SERVICE ──► deadband (select/markWritten) ──► WRITE_TELEMETRY
                        │
DATA-SERVICE ──► TimescaleDB (TIMESERIES portu)
                        │
WEB-SERVICE ──► sorgu (latest/range/downsampled) + konteyner görünümü (hub + TTL cache)
                        │
Alarm: üretim (device-service, geçiş dedup) + çözme (web-service, audit fail-closed)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/shared-types/src/telemetry/telemetry-data.ts#TelemetryData` | Veri şekli |
| `packages/shared-types/src/config/device-config.ts#DeviceConfigFile` | Config |
| `services/device-service/src/telemetry-tagger.ts#TelemetryTagger` | Tag/canonical |
| `services/device-service/src/telemetry-write-filter.ts#TelemetryWriteFilter` | İndirgeme |
| `packages/core/src/timeseries/interface.ts#ITimeseriesDatabase` | Kalıcılık portu |
| `services/web-service/src/domain/ports/container-telemetry.ts#IContainerTelemetryPort` | Konteyner görünümü |
| `services/device-service/src/alarm-transition-detector.ts#AlarmTransitionDetector` | Alarm üretimi |
| `services/web-service/src/presentation/routes/alarm-routes.ts` | Alarm çözme |

## 5. Purity Kuralları (ZORUNLU)

1. Tek veri şekli; katmanlar arası dönüşüm yok (K1).
2. Config tek kaynağı (K2).
3. Alarm yalnız config'ten türetilir; kod/enum/tag'de kaynak yok (K7).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Config / Tag / Canonical

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: config yükleme, canonical tag, ortam tag'leri (device/container/field)
- hariç: config şeması (SHARED-TYPES)

**Akış:**
1. Config zod'dan geçer.
2. Tagger `canonical` ve ortam tag'lerini ekler.
3. Telemetri üretime hazır olur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `canonical` alanı `tags.canonical` olarak taşınır | AK-1.1 |
| FR-1.2 | Ortam tag'leri (device/container/field) doğru eklenir | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `canonical: "soc"` **WHEN** telemetri üretilir **THEN** `tags.canonical="soc"` olur
2. **AK-1.2 — GIVEN** site tier **WHEN** tag eklenir **THEN** `field_id` bulunur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Canonical | unit (`telemetry-tagger.test.ts`) | ⬜ |
| AK-1.2 | Ortam tag'i | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik env | Tag eklenmez |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/telemetry-tagger.ts` | Tag |

### 6.2 UC-2 — Yazma İndirgeme + Kalıcılık

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: deadband politikası, CQS, WRITE_TELEMETRY, data-service yazımı
- hariç: sorgu (UC-3)

**Akış:**
1. `select` politika uygular.
2. Başarılı enqueue sonrası `markWritten`.
3. data-service Timescale'e yazar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Yalnız `WRITE_TELEMETRY` filtrelenir | AK-2.1 |
| FR-2.2 | Enqueue hatasında state ilerlemez | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** MANAGEMENT job **WHEN** yayın **THEN** tam veri gider
2. **AK-2.2 — GIVEN** enqueue hatası **WHEN** sonraki poll **THEN** satır yeniden değerlendirilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Filtre kapsamı | unit (`telemetry-write-filter.test.ts`) | ⬜ |
| AK-2.2 | CQS | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| `maxStaleMs` aşımı | Yazılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/{telemetry-write-filter,write-policy}.ts` | İndirgeme |
| `services/data-service/src/data-service.ts` | Yazıcı |

### 6.3 UC-3 — Sorgu + Latest

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: latest/range/downsampled, latest-per-name, tag doğrulama, limit
- hariç: UI (UI SPEC)

**Akış:**
1. Sorgu parametreleri doğrulanır.
2. Timeseries portundan veri alınır.
3. Sonuç `TelemetryData[]` döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `latest` 20000 satırla sınırlıdır | AK-3.1 |
| FR-3.2 | Geçersiz tag anahtarı reddedilir/name-only | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** 30000 satır **WHEN** latest **THEN** 20000 döner
2. **AK-3.2 — GIVEN** geçersiz tag **WHEN** sorgu **THEN** name-only sonuç

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Limit | unit (`unified-routes.test.ts`) | ⬜ |
| AK-3.2 | Tag | unit (`timescaledb-adapter.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş aralık | Boş dizi |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/presentation/routes/{data,unified}-routes.ts` | Sorgu |

### 6.4 UC-4 — Konteyner Görünümü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: talep-üzeri okuma, TTL cache, presence, kısmi başarı
- hariç: konteyner UI'ı (CONTAINER)

**Akış:**
1. Field, hub üzerinden konteyner telemetrisini ister.
2. Sonuç cache'lenir; erişim hatasında bayat cache kullanılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Push yok; talep-üzeri + TTL cache | AK-4.1 |
| FR-4.2 | Bir konteyner hatası diğerlerini engellemez | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** 3 konteyner **WHEN** görünüm **THEN** cache/talep-üzeri döner
2. **AK-4.2 — GIVEN** 1 konteyner hata **WHEN** görünüm **THEN** diğerleri döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Cache | unit (`hub-container-view.test.ts`) | ⬜ |
| AK-4.2 | Kısmi | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bayat cache | `peek` fallback |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/tiers/site/infrastructure/container-telemetry/**` | Görünüm |

### 6.5 UC-5 — Alarm Üretim/Çözme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: geçiş dedup, 3 katman, restart temizliği, resolve fail-closed, 409
- hariç: alarm UI (APPS)

**Akış:**
1. device-service standart `TelemetryData[]` üzerinden kuralları değerlendirir.
2. Yükselen/düşen kenarda durum + imzalı log.
3. Web-service resolve eder (audit fail-closed).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Aktifken tekrar log basılmaz | AK-5.1 |
| FR-5.2 | Resolve audit'i yazılamazsa reddedilir | AK-5.2 |
| FR-5.3 | Aktif olmayan alarm resolve'da 409 döner | AK-5.3 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** alarm aktif **WHEN** poll **THEN** yalnız ilk kenarda log
2. **AK-5.2 — GIVEN** audit hatası **WHEN** resolve **THEN** red
3. **AK-5.3 — GIVEN** çözülmüş alarm **WHEN** resolve **THEN** 409

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Dedup | unit (`alarm-transition-detector.test.ts`) | ⬜ |
| AK-5.2 | Fail-closed | unit (`alarm-routes.test.ts`) | ⬜ |
| AK-5.3 | 409 | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Restart | Bayat satırlar kapatılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/alarm-transition-detector.ts` | Üretim |
| `services/web-service/src/presentation/routes/alarm-routes.ts` | Çözme |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Enqueue hatası | State ilerlemez |
| Konteyner hatası | Kısmi sonuç |
| Audit hatası | Resolve reddi |
| Restart | Dedup sıfırlanır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Uçtan uca akış testli | komut |
| SC-2 | Alarm dedup kanıtlı | komut |
| SC-3 | Config tek kaynağı (drift denetimi) | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 30+ test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `TELEMETRI-ZINCIRI-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Drift denetiminin CI'a bağlanması (B1) | İleri İş |
| A2 | Alarm resolve tarafının porta çekilmesi (B2/B3) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Drift CI kapısı (A1).
2. Sorgu portu (A2).
3. Alarm çoklu kaynak senaryoları.

## 12. T Görev Özeti

| T-1 | UC-1 (config/tag) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (indirgeme/yazma) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (sorgu) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (konteyner görünümü) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (alarm) kanıt testlerinin eşleştirilmesi |
