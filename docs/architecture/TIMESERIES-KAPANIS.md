---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, timeseries]
review_date: 2026-11-10
---

# Timeseries — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [TIMESERIES-MIMARISI.md](./TIMESERIES-MIMARISI.md) (onaylı — AK/FR kaynağı).
> **Kapsam:** SPEC↔kod doğrulaması — bu turda kaynak değişikliği YOK; kanıtlar kod incelemesi + otomatik test envanteridir.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

> Doğrulama kapanışı: onaylı SPEC, mevcut implementasyonla karşılaştırıldı. Kaynak dosya değişmedi (adaptördeki tek değişiklik: lint disable gerekçe yorumları — PLATFORM kapanışı turunda eklendi, davranış değişikliği yok).

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#write` | (doğrulama) commit hatası reject eder (`failures.length > 0 → throw`; `#write` içindeki K10 yorumu) | K1/FR-1.1 |
| 2 | `timescaledb-adapter.ts#write` (tablo hazırlık bloğu) | (doğrulama) tablo hazırlığı başarısız cihazın batch'i atlanır, throw yok; uyarı loglanır | K2/FR-1.2 |
| 3 | `timescaledb-adapter.ts#ensureTableExists` | (doğrulama) tablo başına tek promise (`tableLocks`) + `tableCache`; DDL pool üzerinde, transaction DIŞINDA | K3/FR-4.1 |
| 4 | `timescaledb-adapter.ts#write` (cihaz-transaction bloğu) | (doğrulama) cihaz başına tek `PoolClient` + `BEGIN/COMMIT`; ROLLBACK hata yolunda; aynı client'ta paralel query yok | K4/FR-1.3 |
| 5 | `timescaledb-adapter.ts#writeBatch` | (doğrulama) `BATCH_SIZE = 200` INSERT dilimleri | K4/FR-1.3 |
| 6 | `timescaledb-adapter.ts#aggregate` + `#getDownsampledData` | (doğrulama) `time_bucket(..., origin)` / `time_bucket_gapfill(..., isoFrom)` | K5/FR-2.1 |
| 7 | `timescaledb-adapter.ts#TAG_KEY_RE` + `seriesCache` | (doğrulama) tag anahtarı `^[a-zA-Z_][a-zA-Z0-9_]*$` ile doğrulanır; seri kimliği name + çağıranın tag'i; metadata `seriesCache`'ten | K6/FR-2.2 |
| 8 | `timescaledb-adapter.ts#getDownsampledData` | (doğrulama) uzun-format `GROUP BY bucket, name[, tags->>'<tag>']`; `unit`/`tags` meta'dan yapıştırılır; dönüş `TelemetryData[]` | K7/FR-2.3 |
| 9 | `timescaledb-adapter.ts#getDownsampledData` (gapfill bloğu) | (doğrulama) gapfill/locf yalnız `locfCarryMs > 0`; taşıma sınırı JS'te seri-bazlı | K8/FR-2.3 |
| 10 | `timescaledb-adapter.ts#getLatestPerName` | (doğrulama) `DISTINCT ON (name)` + `windowMs ?? 30_000` varsayılanı | K9/FR-3.1 |
| 11 | `timescaledb-adapter.ts#deleteDevice` | (doğrulama) concrete sınıfta; `ITimeseriesDatabase`'de YOK — kontrat sızıntısı (SPEC B1/A1) | B1 |
| 12 | `materialized-view-manager.ts#MaterializedViewManager` | (doğrulama) Faz-3 defer; web-service'te kurulu; **0 test** (SPEC B2/A2) | K10 |
| 13 | `packages/core/src/timeseries/implementations/influxdb/index.ts` | (doğrulama) YAGNI placeholder (yalnız kontrat notu) | K10/B3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri (otomatik) | `bun run test:inventory` | timeseries: **17 test / 1 dosya** (`timescaledb-adapter.test.ts`), it-by-it listeli |
| Yazma yolu | test #1 (multi-row INSERT + BEGIN/COMMIT, `device_` önek), #3 (boş girdi no-op), #4 (tablo hazırlık hatası → atlama), #5 (INSERT hatası → ROLLBACK + reject — K10), #16 (>200 satır → dilim), #17 (çok-cihaz reject) | |
| DDL/politika | #6 (tek DDL — cache), #7 (retention kurulumu) | |
| Sorgu | #8-9 (bucket origin), #10 (uzun-format + meta yapıştırma), #11 (rack filtresi parametreli), #12 (name-only), #13 (geçersiz tag yok sayılır — enjeksiyon yok) | |
| Gapfill | #14 (locfCarryMs=0 → gapfill yok), #15 (>0 → gapfill+locf; sınır dışı düşer) | |
| Latest | #2 (DISTINCT ON + pencere) | |
| `MaterializedViewManager` | **0 test** — B2/A2 boşluğu | **KAPSANMAYAN** |
| Taze test koşusu | `vitest run` (core) | **İLETİLMEDİ** — reviewer salt-okuma (B.2/G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — bu turda davranış değişikliği 0 (yalnız lint yorumları) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | INSERT hatası → ROLLBACK + reject | `timescaledb-adapter.test.ts` #5 — envanter | 🟡 |
| AK-1.2 | Tablo hazırlığı başarısız → batch atlanır, throw yok | #4 — envanter | 🟡 |
| AK-1.3 | Tek tx + 200'lük dilim | #1, #16 — envanter | 🟡 |
| AK-2.1 | Bucket'lar `from`'a hizalanır (origin) | #8-9 — envanter | 🟡 |
| AK-2.2 | Geçersiz tag → name-only (enjeksiyon yok) | #13 — envanter | 🟡 |
| AK-2.3 | Dönüş `TelemetryData[]` şekli korunur | #10 (unit/tags yapıştırma) — envanter | 🟡 |
| AK-3.1 | latest-per-name pencere + DISTINCT | #2 — envanter | 🟡 |
| AK-4.1 | Paralel ensure → tek DDL | #6 (tablo önbelleği) + kod inceleme (`tableLocks`) | 🟡 |
| AK-4.2 | Compression/retention idempotent | kod inceleme: `if_not_exists => true` + `isCompressionEnabled` catalog kontrolü + #7 | 🟡 |
| AK-4.3 | deleteDevice tablo + cache temizler | kod inceleme (`#deleteDevice`; cache silme) — doğrudan test YOK → B.2/G3 | 🟡 |
| AK-5.1 | MV defer kaydı + test borcu | bu KAPANIŞ (B.2/G2) + SPEC K10 | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `deleteDevice` kontrat sızıntısı (SPEC B1) | `ITimeseriesDatabase`'de yok; tüketici interface üzerinden silemez — İleri İş A1 |
| S2 | `MaterializedViewManager` 0 test (SPEC B2) | Web-service container'ında canlı; Faz-3 kapsamı — İleri İş A2 |
| S3 | InfluxDB placeholder (SPEC B3) | YAGNI kabul — İleri İş A3 |
| S4 | Lint disable yorumları (PLATFORM turundan) | `setupCompression`/`runRetention`'daki identifier interpolasyonları için gerekçeli disable — davranış değişikliği değil |
| S5 | Taze test koşusu iletilmedi | Reviewer salt-okuma; envanter + inceleme kanıtı |

### A.5 Gözle Kontrol Maddeleri

- [x] Core cihaza özgü tag adı bilmez — tag çağırandan (K6, Purity 1)
- [x] Downsampling dönüş şekli `TelemetryData[]` (Purity 2)
- [x] DDL transaction dışında; yazma transaction içinde (Purity 3)
- [x] `pg` importu yalnız adaptörde (Purity 4)
- [x] Kademeli bozulma: tablo hazırlık hatası batch atlar, servisi düşürmez (K2)
- [x] K10 retry ön koşulu: `#write` reject + K10 yorumu

### A.6 Genel Durum Özeti

**MODÜL UYGUN — onay önerisi:** Onaylı SPEC'in 10 kararı implementasyonla birebir doğrulandı; 11 AK'dan 1'i 🟢 (MV defer kaydı), 10'u envanter (17 test) + kod incelemesiyle 🟡 — davranış sapması YOK. Yazma kalıcılık semantiği (K10 reject → BullMQ retry zinciri) ve enjeksiyon sınırı (`TAG_KEY_RE`) testle sabit. Bilinen borçlar (deleteDevice kontrat sızıntısı, MV test borcu, Influx placeholder) SPEC'te kayıtlı İleri İş. SPEC'in `⬜` kolonları ve `✏️ Specified` satırları ana agent tarafından `🟢 Doğrulanmış`'a güncellenmeli. **review_date: 2026-11-10**

**NIS-2 uyumluluk kontrolü:** `TAG_KEY_RE` bir SQL enjeksiyon savunmasıdır → güvenlik ilgili. SPEC'te bu sınır için tehdit modeli/güvenlik AK'sı TANIMLI DEĞİLDİR (yalnız davranış kuralı) — **uyumluluk boşluğu olarak işaretlendi**. Öneri: tag/identifier interpolasyon yüzeyi için kısa tehdit modeli (girdi kaynağı, izin verilen biçim, reddedilen girdinin akıbeti) SPEC'e eklenir; kararı developer.

**Mutasyon öldürme oranı:** verisi yok (bu turda davranış değişikliği 0). Enjeksiyon yüzeyi (`TAG_KEY_RE`) güvenlik-kritik — bir sonraki değişiklikte `--break 90` ile koşmalı.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| INSERT hatası | `write()` | ROLLBACK + reject | `timescaledb-adapter.test.ts` #5 |
| Tablo hazırlığı hatası | `write()` | batch atlanır, throw yok | #4 |
| Boş girdi | `write()` | havuz işlemi yok | #3 |
| 250 satır | `writeBatch` | 200'lük dilimler + tek COMMIT | #16 |
| Çok-cihaz, biri hata | `write()` | reject (ilk hata) | #17 |
| Eşzamanlı ensure | `ensureTableExists` | tek DDL | #6 + `tableLocks` |
| Restart (compression açık) | `setupCompression` | hata/uyarı yok (`if_not_exists`) | #7 + kod inceleme |
| `from` ortada zaman | aggregate/downsampled | bucket `from`'a hizalı | #8-9 |
| Geçersiz tag anahtarı | downsampled | name-only sonuç | #13 |
| Aynı isim farklı rack | downsampled | ayrı seriler + meta yapıştırma | #10 |
| `locfCarryMs=0` | downsampled | gapfill yok | #14 |
| `locfCarryMs>0` + uzak boşluk | downsampled | sınır dışı boşluk düşer | #15 |
| latest pencere | `getLatestPerName` | DISTINCT ON + pencere içi en yeni | #2 |
| `deleteDevice` | çağrı | tablo düşer + cache temizlenir | **KAPSANMAYAN** (G3) |
| MV manager | herhangi | — | **KAPSANMAYAN** (G2 — 0 test) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze test koşusu iletilmedi (17 test envanterde) | Düşük | Ana agent `nx run core:test` koşar |
| G2 | `MaterializedViewManager` 0 test (canlıda kurulu) | Orta — Faz-3 öncesi bilinçli defer | Faz-3 / İleri İş A2 |
| G3 | `deleteDevice` doğrudan test yok | Orta — veri silme yolu | Küçük unit test (fake pool) |
| G4 | Tag enjeksiyon yüzeyi fuzz'lanmamış (yalnız #13 tek vaka) | Orta — güvenlik-kritik | `TAG_KEY_RE` için fuzz test |
| G5 | `seriesCache` invalidasyon yolları (deleteDevice ile) test değil | Düşük | G3 ile birlikte |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: SPEC↔kod doğrulaması (davranış değişikliği yok; lint yorumları PLATFORM turundan); NIS-2 boşluğu işaretlendi | (yok — SPEC değişmedi) |
| 2026-11-10 | Kapanış tamamlama turu: draft doğrulandı (diff + 17 test + SPEC ID'leri teyit); yasak satır-numarası referansları `#sembol` çapalarına çevrildi; `spec:check` temiz → final | (yok — SPEC değişmedi) |
