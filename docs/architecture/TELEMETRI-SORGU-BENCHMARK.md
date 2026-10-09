---
status: active
space: architecture
tags: [benchmark, performans, timescaledb, telemetri, kanit]
review_date: 2026-10-09
---

# Telemetri Sorgu Performansı — Benchmark Kanıtı

> **İlişkili:** [TELEMETRI-SORGU-PERFORMANS-MIMARISI.md](./TELEMETRI-SORGU-PERFORMANS-MIMARISI.md) (UC-5).
> **Ortam:** `demo-container-timescaledb` (dev stack, simülatör verisi). Gerçek ölçüm — varsayım değil.
> **Tarih:** 2026-10-09.

## 1. Veri hacmi (baseline)

| Cihaz | Satır | İsim | Aralık |
|:------|------:|-----:|:-------|
| `device_bsc_1` | **88,8M** | 496 | ~26 saat (403 register + 542 bitfield, 1 sn poll) |

`count(*)` (device_bsc_1) tek başına **111 sn** sürdü — hacim sorunu canlı.

## 2. Sorgu şekli karşılaştırması (10 dk pencere, `device_bsc_1`)

| Şekil | Grup sayısı | Süre |
|:------|------------:|-----:|
| Mevcut `GROUP BY bucket, tags` | 3.113 | **3,73 sn** |
| Önerilen `GROUP BY bucket, name, tags->>'rack_id'` | 6.754 | **274 ms (≈14×)** |

Not: Adaptörün gerçek sorgusu bunun üzerine ~500 `AVG(CASE…)` sütunu ekler → 3,73 sn **alt sınırdır**.

## 3. Yeni şekil — gerçek DB doğrulaması

`names` filtreli (ön yüzün gerçek davranışı: `Fault`,`Warning`) + `tag=rack_id` (REV.04 jenerik grup anahtarı), 10 dk, 30 sn bucket:

```
SELECT time_bucket('30 seconds', timestamp, ...) AS bucket, name,
       tags->>'rack_id' AS tag_value, AVG(value) AS avg    -- <tag> çağırandan (rack_id)
FROM device_bsc_1
WHERE timestamp >= now() - interval '10 minutes' AND name = ANY(ARRAY['Fault','Warning'])
GROUP BY bucket, name, tags->>'rack_id' ORDER BY bucket ASC;
-- Time: 23.198 ms  (raflar ayrı: Fault/Warning @ rack 1..8)
```

`names` filtresiz 1 saat (19.034 grup) ≈ **5,2 sn** — filtresiz tam-tarama ayrı stres senaryosudur (K12).

## 4. Kimlik doğrulaması (canlı)

Aynı isim, farklı rack ayrı döndü:
```
Fault   | rack 1 | 0     Warning | rack 7 | 0
Fault   | rack 8 | 0     Warning | rack 1 | 0
```
16 bitfield ismi ×8 rack + `Reserved` ×3 (racksız) canlıda doğrulandı.

## 5. Kimlik çakışması — ÇÖZÜLDÜ

flex-bsc'de aynı `name+rack_id` iki register'da tekrar ediyordu. Kaynak doküman
(`20250730_Flex_BSC_Modbusmap_JF1_Rev_AF.xlsx`) incelendi: **30222 "Component Status"** ↔
**30223 "Component Feedback Status"** — farklı register'lar (gerçek durum vs geri-bildirim).
İkisi de gerçek; dedup yanlış olurdu. Çözüm: 30223 grubunun 6 alanına `… Feedback` eki
(528 alan / 11 config dosyası) → `name+rack` çakışması **48 → 0**. UI (`rackHelpers`
"Bileşen Durumu") 30222 isimlerini kullandığından dokunulmadı.

## 6. Tekrar üretim

```
# Sentetik geçmiş veri (uzun menzil):
bun tools/timescale-seed.mjs --device BSC-1 --names SOC,SOH --days 7 --interval 60

# Sorgu şekli karşılaştırması (EXPLAIN ANALYZE):
bun tools/downsampled-bench.mjs --device BSC-1 --names Fault,Warning --range-min 60 --points 120

# Endpoint yük testi (dev stack):
BASE_URL=http://localhost:5001 k6 run deployment/k6/downsampled.js
```

**review_date:** 2026-10-09
