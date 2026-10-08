---
status: active
space: architecture
tags: [mimari, telemetri, sorgu-performans, timescaledb, downsampled, spec]
review_date: 2026-10-08
---

# TELEMETRİ SORGU PERFORMANSI — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** [TESTING.md](../../TESTING.md), [AGENTS-INFRA.md](../../AGENTS-INFRA.md),
> [DEMO-FIELD-KONSOL-KAPANIS.md](./DEMO-FIELD-KONSOL-KAPANIS.md) (A.4#15 / G13 tetikleyicisi).
> **Not:** Bu SPEC yalnızca **kayıt** amaçlıdır; implementasyon ayrı bir oturumda başlatılacaktır.

## 1. Amaç ve Bağlam

Saha telemetrisi büyüdükçe (cihaz başına ~150 isim / 5 sn) tarihsel (downsampled)
sorgular yavaşlıyor ve ön yüzde istek iptalleri (NS_BIND_ABORT) oluşuyor. AWS
demo-edge'de gözlemlenen zincir: sorgu > 15 sn → `axios` timeout → istek iptali;
sorgu > 60 sn → `statementTimeoutMs` → sunucu iptali. Amaç: **kontratları
bozmadan** sorgu maliyetini ve saklama hacmini kalıcı biçimde düşürmek —
her zaman çok veriyle çalışacak bir taktik vermek.

Tetikleyici bulgular: `DEMO-FIELD-KONSOL-KAPANIS.md` A.4#15 (trend abort) ve
G13 (adaptör `GROUP BY tags` patlaması).

| Katman | Kapsam |
|:-------|:-------|
| **Dahil** | Adaptör sorgu şekli (Faz-1), devir timeout'ları (Faz-1), yazım indirgeme + gapfill (Faz-2), eşzamanlılık/CA-MV (Faz-3) |
| **Hariç** | Farklı TSDB'ye geçiş (InfluxDB/ClickHouse); sensör örnekleme hızını düşürme; `external_series` (EPİAŞ) yolu; ön yüz transport kontratı değişikliği |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **Kontrat sabit kalır** | `ITimeseriesDatabase.getDownsampledData(DownsampleOptions): Promise<TelemetryData[]>` ve HTTP ucu/parametreleri DEĞİŞMEZ; yalnız adaptör iç SQL şekli değişir |
| K2 | **Faz-1 anlık rahatlama** | Downsampled SQL `GROUP BY bucket, name`; `axios` timeout 15 sn → 60 sn (yalnız demo-field istemcisi) |
| K3 | **Response cache ertelenir** | Uç paylaşımlı (container-web + demo-field); tazelik/tutarlılık riski nedeniyle bu SPEC kapsamında eklenmez |
| K4 | **Yazım indirgeme (Faz-2)** | Değişmeyen değer yazılmaz (deadband); okuma `time_bucket_gapfill` + `locf` ile taşır — davranış değişikliği, ayrı onay/SPEC eki |
| K5 | **CA/MV hibrit (Faz-3)** | Uzun menzil için sürekli aggregate + mevcut `mvManager`; 4 saatlik trendde ilk bölüm MV, son bölüm raw |
| K6 | **Adaptör bağımsızlığı korunur** | Değişiklikler DB adaptörü içinde; mock'lar/arayüzler/frontend transport aynı kalır; her tüketici aynı `TelemetryData[]` şeklini alır |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | İstemci timeout'u 15 sn; >15 sn süren sorgu isteği iptal eder | `apps/demo-field/src/lib/api-client.ts#apiClient` |
| B2 | Downsampled SQL ~150 adet `AVG(CASE …)` sütunu + `GROUP BY bucket, tags` üretir (tags JSONB kombinasyon patlaması) | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getDownsampledData` |
| B3 | Adaptör statement timeout 60 sn; ağır sorgu normal yanıt yerine iptal üretir | `packages/shared-utils/src/config/definitions.ts#timescale.statementTimeoutMs` |
| B4 | Uç paylaşımlı: farklı ön yüzler aynı sorguyu bağımsız tetikler | `apps/container-web/src/hooks/useTelemetryProvider.ts`, `apps/demo-field/src/features/demo-data/demoApi.ts#unifiedDownsampled` |
| B5 | MV altyapısı mevcut ama downsampled rotasında kullanılmıyor | `services/web-service/src/presentation/routes/unified-routes.ts` (`mvManager.selectView`) |
| B6 | 1 günlük sıkıştırma politikası; `tags` `segmentby` değil — sıkıştırılmış chunk'ta `GROUP BY tags` ağırlaşır | `timescaledb-adapter.ts#setupCompression` |

## 4. Mimari

### 4.1 İstek yolu (değişmez kontrat)
```
Ön yüz (demo-field/container-web) → HTTP /api/unified/telemetry/downsampled
  → web-service unified-routes → timescale.getDownsampledData(DownsampleOptions)
  → TimescaleDB (device_<id> hypertable) → TelemetryData[] (aynı şekil)
```

### 4.2 Faz-1 SQL şekli
```
SELECT time_bucket('<bucket>', timestamp) AS bucket, name,
       AVG(value) AS avg, MAX(value) AS max
FROM device_<id>
WHERE timestamp BETWEEN $from AND $to [AND name = ANY($names)] [AND tags->>'k' = $v]
GROUP BY bucket, name
ORDER BY bucket ASC
```
- `tags` ve `unit` **isim haritasından** (mevcut `getOrFetchNamesAndUnits` + tags) yapıştırılır.
- CASE sütun listesi ve `GROUP BY tags` kalkar; `(name, timestamp DESC)` indexi kullanılır.

### 4.3 Faz-2 yazım/okuma
- Yazım: cihaz+isim başına son değer bellekte; |Δ| < deadband ise satır yazılmaz.
- Okuma: `time_bucket_gapfill(...)` + `locf(avg)` ile taşıma; seri sürekliliği korunur.

### 4.4 Faz-3 CA/MV
- 5 dk'lık `timescaledb.continuous` (veya mevcut MV) + son pencerede raw hibrit.

## 5. Purity Kuralları (ZORUNLU)

1. **Kontrat değişmez:** arayüz tipleri, HTTP parametreleri, `TelemetryData` şekli, birimler (`unit`), `description` kalıbı ve `value` yuvarlaması (4 hane) korunur.
2. **Adaptör içi değişiklik:** SQL/plan değişikliği yalnız TimescaleDB implementasyonunda; mock ve diğer adaptörler etkilenmez.
3. **Saf yardımcılar:** deadband/gapfill kararı gibi türevler IO'suz saf fonksiyonlarla ifade edilir.
4. **Kimlik filtreleri parametreli:** `name`/`tags` filtreleri parametreli sorgu; isim interpolasyonu yalnız doğrulanmış kimlik listesinde.
5. **Uydurma veri yok:** veri yoksa boş dizi; gapfill yalnız Faz-2 semantiği onaylandığında ve locf ile.

## 6. Use Case'ler

### 6.1 UC-1 — Adaptör downsampled sorgu şekli (Faz-1)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `getDownsampledData` SQL şekli, tags/unit isim haritası, dönüş eşitliği
- hariç: yazım yolu değişikliği (Faz-2), CA/MV (Faz-3)

**Akış:**
1. İstenen isimler ve birimler/tag'ler çözülür.
2. Tek `GROUP BY bucket, name` sorgusu çalışır.
3. Sonuçlar aynı `TelemetryData[]` şekline eşlenir (tags/unit haritadan).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Sistem MUST downsampled sorguyu `GROUP BY bucket, name` ile üretmelidir. | AK-1.1 |
| FR-1.2 | Sistem MUST `tags` ve `unit` değerlerini isim haritasından yapıştırmalıdır. | AK-1.2 |
| FR-1.3 | Sistem MUST çıktıyı aynı `TelemetryData[]` şeklinde ve aynı AVG semantiğiyle döndürmelidir. | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** tek cihaz ve `names` filtresi **WHEN** downsampled çalışır **THEN** sonuç `(bucket, name)` başına tek satırdır ve sorgu `(name, timestamp)` indexini kullanır
2. **AK-1.2 — GIVEN** `canonical` tag'li isim **WHEN** sonuç satırı okunur **THEN** satırın `tags.canonical` ve `unit` alanları korunur
3. **AK-1.3 — GIVEN** aynı girdi **WHEN** eski ve yeni şekil karşılaştırılır **THEN** `name/value/unit/timestamp/tags/description` birebir eşdeğerdir (AVG)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | tek satır/(bucket,name) + index kullanımı | unit | ⬜ |
| AK-1.2 | tags.canonical + unit korunur | unit | ⬜ |
| AK-1.3 | eski↔yeni çıktı eşdeğerliği | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `timescaledb-adapter.ts#getDownsampledData` SQL şekli
- [ ] T-2: karakterizasyon testleri (eski çıktı = yeni çıktı)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| İsim bulunamaz | Boş dizi (uydurma yok) |
| Aynı isme birden çok tags varyantı | İlk varyant yapıştırılır (canonical sabit varsayımı) |
| Veri aralığı boş | Boş dizi |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` #getDownsampledData | SQL şekli + tags/unit haritası |
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.test.ts` | çıktı eşdeğerliği testleri |

### 6.2 UC-2 — İstemci/sunucu timeout ve yük (Faz-1)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: demo-field `axios` timeout, trend refetch, statement timeout gözden geçirme
- hariç: response cache (K3), diğer ön yüz istemcileri

**Akış:**
1. demo-field istemci timeout'u yükseltilir.
2. Trend polling aralığı sadeleştirilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Sistem, demo-field istemci timeout'unu ≥60 sn yapmalıdır. | AK-2.1 |
| FR-2.2 | Sistem, ağır uçlarda istek sıklığını performans hedefiyle uyumlu tutmalıdır. | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** demo-field api istemcisi **WHEN** yapılandırma okunur **THEN** timeout ≥ 60000 ms'dir
2. **AK-2.2 — GIVEN** trend sorgusu **WHEN** poll aralığı okunur **THEN** aralık performans hedefiyle (SC-2) uyumludur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | timeout ≥ 60 sn | unit | ⬜ |
| AK-2.2 | poll aralığı hedefle uyumlu | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-3: `api-client.ts` timeout 15 sn → 60 sn
- [ ] T-4: trend refetch aralığı + test/lint

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Sunucu yine yavaş | İstek bekler (abort yok); statement timeout üst sınır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/lib/api-client.ts` #apiClient | timeout değeri |
| `apps/demo-field/src/pages/DemoFieldPage.tsx` #DemoFieldPage | trend sorgu aralığı |

### 6.3 UC-3 — Yazım indirgeme + gapfill okuma (Faz-2)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: değişmeyen değerin yazılmaması (deadband), okumada `gapfill`+`locf`
- hariç: alarm/olay logları, komut kayıtları (yalnız telemetri ölçümleri)

**Akış:**
1. Yazım sırasında cihaz+isim için son değer karşılaştırılır.
2. Eşik altı değişimde satır yazılmaz.
3. Okuma, `time_bucket_gapfill` + `locf` ile son değeri taşır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Sistem MUST değişmeyen telemetri değerini (deadband altında) yazmamalıdır. | AK-3.1 |
| FR-3.2 | Sistem MUST okumada değişmeyen değeri `gapfill`+`locf` ile taşımalıdır. | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** ardışık iki örnek aynı değer **WHEN** yazım çalışır **THEN** ikinci satır yazılmaz
2. **AK-3.2 — GIVEN** seyrek yazılmış seri **WHEN** okuma çalışır **THEN** boşluklar son değerle doldurulur (`locf`)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | değişmeyen değer yazılmaz | unit | ⬜ |
| AK-3.2 | gapfill+locf süreklilik | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-5: telemetri yazımında change-only/deadband
- [ ] T-6: okuma `time_bucket_gapfill`+`locf`
- [ ] T-7: yazım/okuma testleri (tablo küçülme oranı dahil)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Değer aralık dışına çıkarsa | Değişim sayılır, satır yazılır |
| Uzun sabit seri | Tek satır + okuma taşıması |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/data-service/src` (yazım yolu) | change-only/deadband filtresi (konum onaya tabi) |
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` | okuma `gapfill`/`locf` |

### 6.4 UC-4 — Sürekli aggregate / MV hibrit (Faz-3)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: uzun menzil için CA/MV, kısa pencere raw hibrit
- hariç: şema yeniden tasarımı, farklı TSDB

**Akış:**
1. Menzil eşiğine göre CA/MV veya raw seçilir.
2. Son pencere raw ile birleştirilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Sistem MUST uzun menzilde önceden toplanmış seriden okumalıdır. | AK-4.1 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** uzun menzil (ör. ≥24 sa) **WHEN** downsampled çalışır **THEN** sonuç CA/MV'den üretilir ve raw tam tarama yapılmaz

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | uzun menzil CA/MV'den | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-8: CA/MV hibrit rotası + test

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| MV güncel değil | Son pencere raw ile tamamlanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/unified-routes.ts` #telemetry/downsampled | hibrit seçim |
| `packages/core/src` (MV/CA) | sürekli aggregate tanımı |

### 6.5 UC-5 — Eşzamanlılık sınırlama (Faz-3)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: çok cihazlı downsampled'ta eşzamanlılık sınırı
- hariç: kuyruk altyapısı değişikliği

**Akış:**
1. Cihaz sorguları sınırlı eşzamanlılıkla koşar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Sistem MUST çok cihazlı downsampled'ta eşzamanlılığı sınırlamalıdır. | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** N cihaz isteği **WHEN** downsampled çalışır **THEN** aynı anda en çok K sorgu koşar

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | eşzamanlılık ≤ K | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-9: eşzamanlılık semaforu + test

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Tek cihaz | Davranış değişmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/unified-routes.ts` #telemetry/downsampled | eşzamanlılık sınırı |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Telemetri var | Sorgu index üzerinden döner; seri dolu |
| Telemetri yok | Boş dizi (uydurma yok) |
| Sorgu yavaş (>15 sn) | Faz-1'de istemci bekler (timeout 60 sn); hedef p95 < 1 sn |
| Sorgu > 60 sn | Adaptör statement timeout → istek iptali (hedef: hiç ulaşmamak) |
| Sıkıştırılmış chunk | `GROUP BY bucket,name` ile index/segment kullanımı korunur |
| Değişmeyen değer (Faz-2) | Yazılmaz; okuma `locf` ile taşır |
| Aynı isim/çok tags (Faz-1) | İlk tags varyantı yapıştırılır |
| Beklenmeyen hata | `DomainError` (sınıra taşınır) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Trend downsampled sorgusu p95 < 1 sn (names filtreli, 4 sa menzil) | canlı ölçüm + unit |
| SC-2 | Ön yüzde istek iptali (NS_BIND_ABORT) oranı ≈ 0 | tarayıcı Network / sunucu logu |
| SC-3 | Faz-2 sonrası tablo hacmi ≥10× azalır (change-only) | tablo boyutu ölçümü |
| SC-4 | Kontrat değişmez; etkilenen tüketici projelerin mevcut testleri yeşil | `core`, `web-service`, `demo-field`, `demo-backend`, `container-web` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-1, T-5, T-6, T-8, T-9 sözleşmeleri |
| 3. TEST | T-2, T-4, T-7, T-8, T-9 kırmızı testleri |
| 4. IMPL | T-1..T-9 |
| 5. KAPANIŞ | `TELEMETRI-SORGU-PERFORMANS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Response cache (uç seviyesinde TTL) | ⛔ Defer — K3; paylaşımlı rota tazelik riski |
| A2 | Faz-2 change-only semantiği (deadband eşiği, hangi cihaz/isimler) | ⏳ Açık — ayrı SPEC eki/onay (T-5 öncesi) |
| A3 | CA/MV granularitesi (5 dk/1 sa) ve hibrit eşiği | ⏳ Açık — Faz-3 (T-8 öncesi) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Farklı TSDB değerlendirmesi (InfluxDB/ClickHouse) — yalnız gerekirse; kontrat korunur.
2. Ön yüzde LTTB/istemci-taraflı seyrekleştirme — veri hacmi kontrollü kalırsa gerekmez.
3. Çok-saha (boss) toplama katmanında önceden toplanmış seri federasyonu.

## 12. T Görev Özeti

| Kod | Görev | UC | Aşama |
|:----|:------|:---|:------|
| T-1 | `getDownsampledData` SQL şekli | UC-1 | IMPL |
| T-2 | adaptör karakterizasyon testleri | UC-1 | TEST |
| T-3 | `api-client` timeout 60 sn | UC-2 | IMPL |
| T-4 | trend refetch aralığı + test | UC-2 | TEST |
| T-5 | yazımda change-only/deadband | UC-3 | IMPL |
| T-6 | okumada `gapfill`/`locf` | UC-3 | IMPL |
| T-7 | yazım/okuma + hacim testleri | UC-3 | TEST |
| T-8 | CA/MV hibrit rotası | UC-4 | IMPL |
| T-9 | eşzamanlılık semaforu | UC-5 | IMPL |
