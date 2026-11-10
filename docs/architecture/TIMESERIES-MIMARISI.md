---
status: active
space: architecture
tags: [mimari, core, timeseries, timescaledb, spec]
review_date: 2026-11-10
---

# Timeseries — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `TELEMETRI-ZINCIRI-MIMARISI.md` (tüketici akış), `SHARED-TYPES-MIMARISI.md` (TelemetryData), `DOKUMAN-YAPISI-MIMARISI.md` (K16 istisnası).

## 1. Amaç ve Bağlam

`packages/core/src/timeseries` klasörünün sözleşmesi: `ITimeseriesDatabase` portu ve TimescaleDB adaptörü (yazma, sorgu, downsampling, latest-per-name, tablo yaşam döngüsü, materialized view). Telemetri kalıcılığının ve sorgu doğruluğunun tek sahibi. InfluxDB yalnız kontrat notu (YAGNI).

| Katman | Kapsam |
|:-------|:-------|
| dahil | Yazma yolu (batch/tx/retry semantiği), sorgu şekilleri, seri kimliği, tag doğrulama, tablo DDL/compression/retention, latest-per-name, MV (Faz-3) |
| hariç | Tüketici worker (`DATA-SERVICE`), HTTP sorgu uçları (`WEB-SERVICE`), cihaz config (`SHARED-TYPES`) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Commit hatası YUTULMAZ: `write()` tek-cihaz batch'inde reject eder | `DATA-SERVICE` `TransientError` → BullMQ retry/`onFailed` zinciri gerçekten çalışır |
| K2 | Tablo hazırlığı başarısız cihazın batch'i atlanır, throw YOK | Kademeli bozulma; tablo yokken INSERT fail edip retry zincirini bozmaz |
| K3 | DDL yarışı: tablo başına tek promise (`tableLocks`) + `tableCache`; DDL pool üzerinde, transaction DIŞINDA | Paralel ensure yarışı yok; compression/retention idempotent (`if_not_exists`) |
| K4 | Yazma şekli: cihaz başına tek `PoolClient` + tek transaction; 200 satırlık INSERT dilimleri; aynı client'ta paralel query YASAK | Atomik cihaz batch'i; bağlantı tükenmesi yok |
| K5 | Bucket hizalaması: `time_bucket(..., origin=$1)` | Bucket ızgarası sorgunun `from`'una hizalanır (Grafana datasource kuralı) |
| K6 | Seri kimliği: `name` + **çağıranın verdiği** grup tag'i; tag anahtarı `TAG_KEY_RE` (`^[a-zA-Z_][a-zA-Z0-9_]*$`) ile doğrulanır, geçersizse name-only'e düşer | SQL interpolasyon enjeksiyon sınırı; core cihaza özgü tag adı BİLMEZ |
| K7 | Uzun-format downsampling: `GROUP BY bucket, name[, tags->>'<tag>']` | JSONB kombinasyon patlaması yok; `unit`/`tags` seri haritasından yapıştırılır; dönüş `TelemetryData[]` şekli DEĞİŞMEZ |
| K8 | Gapfill/locf yalnız `locfCarryMs > 0`; taşıma sınırı JS'te seri-bazlı; varsayılan KAPALI | Uydurma veri yok (TEİAŞ kanıt zinciri) |
| K9 | `getLatestPerName`: `DISTINCT ON (name)` + `windowMs` (varsayılan 30 sn) | "latest" modu talep-üzeri taze snapshot; bayat veri sızmaz |
| K10 | Materialized view hibrit yaklaşımı Faz-3'e ertelendi; InfluxDB implementasyonu YAGNI (yalnız kontrat notu) | MV manager kurulu ama testi yok (B2); Influx yalnız bucket origin kuralı taşır |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `TimescaleDBAdapter#deleteDevice` `ITimeseriesDatabase`'de YOK — yalnız concrete sınıfta | Kontrat sızıntısı; interface'e bağlanan tüketici silemez |
| B2 | `MaterializedViewManager` 0 test; web-service container'ında canlı | `packages/core/src/timeseries/implementations/timescaledb/materialized-view-manager.ts` |
| B3 | `influxdb/index.ts` yorum-only placeholder | YAGNI notu |
| B4 | `TAG_KEY_RE` doğrulaması güvenlik sınırı (SQL interpolasyonu) | `timescaledb-adapter.ts` + test |

## 4. Mimari

```text
DATA-SERVICE (WRITE_TELEMETRY worker) ──► ITimeseriesDatabase#write
WEB-SERVICE (data/unified routes)     ──► ITimeseriesDatabase#query/downsample/latestPerName
                                                │
                                                ▼
                                        TimescaleDBAdapter
                                        ├ tableLocks/tableCache (DDL)
                                        ├ tek PoolClient + tx (write)
                                        ├ time_bucket origin (query)
                                        └ MaterializedViewManager (Faz-3, defer)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/core/src/timeseries/interface.ts#ITimeseriesDatabase` | Port (write/query/downsample/latestPerName) |
| `packages/core/src/timeseries/interface.ts#TimeSeriesQuery` | Sorgu girdisi |
| `packages/core/src/timeseries/interface.ts#AggregateQuery` | Aggregate girdisi |
| `packages/core/src/timeseries/interface.ts#DownsampleOptions` | Downsampling seçenekleri (tag, locf) |
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#TimescaleDBAdapter` | Adaptör |
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-config.ts#buildTimescaleDBConfig` | Config üretimi |
| `packages/core/src/timeseries/implementations/timescaledb/materialized-view-manager.ts#MaterializedViewManager` | Faz-3 (defer) |

## 5. Purity Kuralları (ZORUNLU)

1. Core cihaza özgü tag adı bilmez; grup tag'i çağıran tarafından verilir (K6).
2. Sorgu dönüş şekli `TelemetryData[]`'dir — downsampling şekli değiştirmez (K7).
3. DDL transaction dışında; yazma transaction içinde (K3/K4).
4. `pg` importu yalnız adaptörde; port tüketicileri concrete sınıfı görmez.
5. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Toplu Yazma (write)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: cihaz başına tek tx, 200 satır dilim, commit hatası reject, tablo hazırlığı başarısızsa atlama
- hariç: worker/retry politikası (DATA-SERVICE), deadband (TELEMETRI-ZINCIRI)

**Akış:**
1. Cihaz başına telemetri batch'i alınır; tablo hazırlanır (K3).
2. Tablo hazırsa tek `PoolClient` + `BEGIN`; 200 satırlık INSERT dilimleri.
3. `COMMIT`; hata olursa `ROLLBACK` + reject (K1).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Commit/INSERT hatası reject edilir (yutulmaz) | AK-1.1 |
| FR-1.2 | Tablo hazırlığı başarısız cihaz atlanır, throw yok | AK-1.2 |
| FR-1.3 | Aynı cihaz batch'i tek transaction'da yazılır | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** INSERT hatası **WHEN** `write()` koşar **THEN** ROLLBACK + reject döner
2. **AK-1.2 — GIVEN** tablo oluşturulamıyor **WHEN** `write()` koşar **THEN** batch atlanır, hata fırlatılmaz
3. **AK-1.3 — GIVEN** 250 satırlık batch **WHEN** yazılır **THEN** 200'lük dilimler + tek COMMIT olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Reject + rollback | unit (`timescaledb-adapter.test.ts`) | ⬜ |
| AK-1.2 | Kademeli bozulma | unit | ⬜ |
| AK-1.3 | Tek tx + dilim | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş batch | No-op |
| Çok-cihaz girdisi | Her cihaz ayrı tx; biri hata verirse yalnız o cihaz reject |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` | Yazma yolu |

### 6.2 UC-2 — Sorgu (range / aggregate / downsampled)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: bucket origin hizası, uzun-format downsampling, tag doğrulama, gapfill/locf
- hariç: HTTP uçları (WEB-SERVICE)

**Akış:**
1. Sorgu aralığı + tag filtresi alınır; tag anahtarı `TAG_KEY_RE` ile doğrulanır (K6).
2. `time_bucket` origin ile bucket'lanır.
3. Uzun-format gruplama; `unit`/`tags` seri haritasından eklenir.
4. `locfCarryMs > 0` ise taşıma sınırı JS'te uygulanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Bucket'lar sorgunun `from` değerine hizalanır | AK-2.1 |
| FR-2.2 | Geçersiz tag anahtarı reddedilir / name-only'e düşer | AK-2.2 |
| FR-2.3 | Downsampling dönüşü `TelemetryData[]` şeklini korur | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `from` ortada bir zaman **WHEN** downsampled sorgu koşar **THEN** ilk bucket `from`'a hizalıdır
2. **AK-2.2 — GIVEN** `tag="rack_id; DROP"` **WHEN** sorgu hazırlanır **THEN** tag uygulanmaz, name-only sonuç döner
3. **AK-2.3 — GIVEN** iki seri **WHEN** downsampled sorgu koşar **THEN** her satır `name/value/timestamp` (+unit/tags) taşır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Origin hizası | unit | ⬜ |
| AK-2.2 | Enjeksiyon sınırı | unit | ⬜ |
| AK-2.3 | Dönüş şekli | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş aralık | Boş dizi |
| Gapfill kapalı (varsayılan) | Boşluklar doldurulmaz |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` | Sorgu yolu |

### 6.3 UC-3 — Latest Per Name

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `DISTINCT ON (name)` + pencere, pencere dışı satırların süzülmesi
- hariç: frontend özet ekranı (UI)

**Akış:**
1. `windowMs` (varsayılan 30 sn) ile sorgu kurulur.
2. `DISTINCT ON (name)` en son satırı seçer.
3. Sonuç `TelemetryData[]` döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Her isim için yalnız pencere içindeki en son satır döner | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** iki farklı zamanlı satır **WHEN** latest-per-name koşar **THEN** yalnız en yeni satır döner; pencereden eski satır dönmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Pencere + DISTINCT | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Pencere içinde veri yok | Boş dizi |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getLatestPerName` | Latest sorgusu |

### 6.4 UC-4 — Tablo Yaşam Döngüsü (ensure / compression / retention / delete)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `ensureTableExists` kilit/cache, compression/retention idempotent, `deleteDevice`
- hariç: migration'lar (deployment)

**Akış:**
1. `ensureTableExists` tablo başına tek promise + cache.
2. Compression/retention `if_not_exists` ile kurulur.
3. `deleteDevice` tabloyu düşürür + cache temizler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Paralel `ensureTableExists` tek DDL üretir | AK-4.1 |
| FR-4.2 | Compression/retention tekrar kurulumda hata üretmez | AK-4.2 |
| FR-4.3 | `deleteDevice` tabloyu ve cache kayıtlarını temizler | AK-4.3 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** eşzamanlı iki yazma **WHEN** tablo yok **THEN** tek DDL koşar
2. **AK-4.2 — GIVEN** compression zaten açık **WHEN** restart **THEN** hata/uyarı üretilmez
3. **AK-4.3 — GIVEN** cihaz silinir **WHEN** `deleteDevice` koşar **THEN** tablo düşer, cache temizlenir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | DDL tek kez | unit | ⬜ |
| AK-4.2 | İdempotent politika | unit | ⬜ |
| AK-4.3 | Silme + cache | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| `deleteDevice` interface'te yok (B1) | A1'de kontrat kararı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` | DDL/politika |

### 6.5 UC-5 — Materialized Views (Faz-3, defer)

**Status:** ⛔ Defer

**Kapsam:**
- dahil: mevcut MV manager'ın kaydı, defer kararı, test borcu
- hariç: MV hibrit yaklaşımının uygulanması

**Akış:**
1. Faz-3 kapsamında yeniden değerlendirilir.
2. O zamana kadar manager kurulu kalır (web-service container'ında).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | MV manager defer olarak işaretlenir; testi Faz-3'te yazılır | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** MV manager **WHEN** envanter okunur **THEN** durum `⛔ Defer` ve test borcu kayıtlıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Defer kaydı + test borcu | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-5: Defer kaydını ve test borcunu KAPANIŞ'a işle

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| MV canlıda hata verirse | Faz-3 kapsamında ele alınır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/timeseries/implementations/timescaledb/materialized-view-manager.ts` | Defer |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| INSERT/COMMIT hatası | ROLLBACK + reject (K1) |
| Tablo hazırlanamadı | Batch atlanır (K2) |
| Geçersiz tag | Name-only'e düşer (K6) |
| Pencere dışı latest | Dönmez (K9) |
| MV | Defer (K10) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Yazma/retry semantiği kanıtlı | komut (`vitest`) |
| SC-2 | Tag enjeksiyon sınırı testli | komut |
| SC-3 | Sorgu şekli `TelemetryData[]` korunur | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut testler kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `TIMESERIES-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `deleteDevice`'ın `ITimeseriesDatabase`'e taşınması (B1 kontrat sızıntısı) | İleri İş (kontrat kararı) |
| A2 | MV manager test borcu (B2) | Faz-3 |
| A3 | InfluxDB implementasyonu (B3) | YAGNI — talep gelirse |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `deleteDevice` port kararı (A1).
2. MV hibrit yaklaşımı ve testleri (A2).
3. Sorgu performans benchmark'ının CI'a bağlanması.

## 12. T Görev Özeti

| T-1 | UC-1 (yazma) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (sorgu) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (latest-per-name) kanıt testinin eşleştirilmesi |
| T-4 | UC-4 (tablo yaşam döngüsü) kanıtlarının eşleştirilmesi |
| T-5 | UC-5 (MV defer) kaydının KAPANIŞ'a işlenmesi |
