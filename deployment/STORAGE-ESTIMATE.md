# TimescaleDB Depolama Tahmini

## Cihaz Profili

| Cihaz Tipi | Adet | Poll Aralığı | Register/Cihaz | Veri Noktası/sn |
|-----------|------|-------------|----------------|-----------------|
| BSC | 6 | 1 saniye | 424 | 2.544 |
| HVAC | 8 | 2 saniye | 56 | 224 |
| **Toplam (mevcut)** | **14** | | | **2.768/sn** |
| BSC | 2 | 1 saniye | 424 | 848 |
| HVAC | 6 | 2 saniye | 56 | 168 |
| **Toplam (alternatif)** | **8** | | | **1.016/sn** |

```
Mevcut:     2.768/sn × 86.400 sn/gün × 365 gün = 87,3 milyar satır/yıl
Alternatif: 1.016/sn × 86.400 sn/gün × 365 gün = 32,0 milyar satır/yıl
```

Satır başına ~270 byte (timestamp, value, name, unit, tags JSONB, description).

---

## 1. Ham Veri (hiçbir optimizasyon olmadan)

```
87,3 milyar satır × 270 byte = 23,6 TB
```
~24 TB disk. Materialized view'lar ve indekslerle birlikte **~26 TB**.

---

## 2. Varsayılan Konfigürasyon (mevcut ayarlar)

| Ayar | Değer |
|------|-------|
| `chunk_interval` | 1 gün |
| `compress_after` | 7 gün |
| `retention_after` | yok (sonsuz) |
| BSC poll | 1 saniye |

Sıkıştırma (segmentby: `name`, ~10x numerik, ~4x JSONB):

```
İlk 7 gün (ham) :     23,6 ×   7/365        =   0,45 TB
Kalan 358 gün (sıkıştırılmış) : 23,6 × 358/365 ÷ 10 =   2,32 TB
MV'ler + indeksler + sistem :                         0,30 TB
─────────────────────────────────────────────────────────────
TOPLAM                                            ~  3,1 TB
```

---

## 3. Modifikasyonlar (kümülatif)

### 3.1 — `chunk_interval`: 1 gün → 6 saat

Depolamaya etkisi yok. Sorgu performansı artar, chunk başına daha az satır. **~3,1 TB** (aynı).

### 3.2 — `compress_after`: 7 gün → 1 gün

```
İlk 1 gün (ham) :       23,6 ×   1/365        =   0,06 TB
Kalan 364 gün (sıkıştırılmış) : 23,6 × 364/365 ÷ 10 =   2,35 TB
MV'ler + indeksler + sistem :                           0,30 TB
─────────────────────────────────────────────────────────────
TOPLAM                                            ~  2,7 TB │ -0,4 TB
```

### 3.3 — `retention_after`: 90 gün (raw data silinir, MV'ler kalır)

```
Son 90 gün raw (sıkıştırılmış) : 23,6 ×  90/365 ÷ 10 =   0,58 TB
İlk 1 gün ham :                  23,6 ×   1/365       =   0,06 TB
MV'ler (tüm zamanlar, düşük çözünürlük) :               0,25 TB
İndeksler + sistem :                                     0,15 TB
─────────────────────────────────────────────────────────────
TOPLAM                                               ~  1,0 TB │ -1,7 TB
```

> Not: 90 günden eski raw veri silinir ama 5sn, 1dk, 15dk, 1sa, 1gün agregasyonları
> (materialized views) tüm zamanlar için saklanmaya devam eder. EMS için yeterli.

### 3.4 — BSC poll: 1 saniye → 2 saniye

```
Yeni veri noktası: (6×424/2 + 8×56/2) = 1.496/sn
Yıllık satır: 1.496 × 86.400 × 365 = 47,2 milyar

Son 90 gün raw (sıkıştırılmış) : 12,7 ×  90/365 ÷ 10 =   0,31 TB
İlk 1 gün ham :                  12,7 ×   1/365       =   0,03 TB
MV'ler + indeksler + sistem :                           0,30 TB
─────────────────────────────────────────────────────────────
TOPLAM                                               ~  0,6 TB │ -0,4 TB
```

### 3.5 — BSC poll: 1 saniye → 5 saniye

```
Yeni veri noktası: (6×424/5 + 8×56/2) = 733/sn
Yıllık satır: 733 × 86.400 × 365 = 23,1 milyar

Son 90 gün raw (sıkıştırılmış) :   6,2 ×  90/365 ÷ 10 =   0,15 TB
İlk 1 gün ham :                     6,2 ×   1/365       =   0,02 TB
MV'ler + indeksler + sistem :                              0,25 TB
─────────────────────────────────────────────────────────────
TOPLAM                                                  ~  0,4 TB │ -0,2 TB
```

---

## 4. Özet Tablo

| Senaryo | Ayar | Yıllık |
|---------|------|--------|
| **Ham (hiçbir şey yok)** | — | **~26 TB** |
| **Varsayılan (mevcut)** | chunk=1g, compress=7g, ∞, poll=1s | **~3,1 TB** |
| + chunk 6saat | chunk=6sa, compress=7g, ∞, poll=1s | ~3,1 TB |
| + sıkıştırma 1gün | chunk=6sa, compress=1g, ∞, poll=1s | ~2,7 TB |
| + retention 90gün | chunk=6sa, compress=1g, 90gün, poll=1s | **~1,0 TB** |
| + BSC poll 2sn | chunk=6sa, compress=1g, 90gün, poll=2s | **~0,6 TB** |
| + BSC poll 5sn | chunk=6sa, compress=1g, 90gün, poll=5s | **~0,4 TB** |
| | | |
| **Alternatif (2 BSC + 6 HVAC)** | | |
| Ham | — | **~9,5 TB** |
| Varsayılan | chunk=1g, compress=7g, ∞, poll=1s | **~1,3 TB** |
| + retention 90gün | chunk=6sa, compress=1g, 90gün, poll=1s | **~0,6 TB** |
| + poll 2sn | chunk=6sa, compress=1g, 90gün, poll=2s | **~0,4 TB** |
| + poll 5sn | chunk=6sa, compress=1g, 90gün, poll=5s | **~0,3 TB** |

---

## 5. Nasıl Uygulanır

```sql
-- chunk interval (her hypertable için)
SELECT set_chunk_time_interval('device_bsc-1', INTERVAL '6 hours');
SELECT set_chunk_time_interval('device_bsc-2', INTERVAL '6 hours');
-- ... tüm device_* tabloları için tekrarla

-- sıkıştırma politikası (her hypertable için)
SELECT add_compression_policy('device_bsc-1', INTERVAL '1 day');
-- ... tüm device_* tabloları için tekrarla

-- retention (her hypertable için, dikkat: raw veriyi siler)
SELECT add_retention_policy('device_bsc-1', INTERVAL '90 days');
-- ... tüm device_* tabloları için tekrarla
```

BSC poll aralığı: `deployment/config-docker/bsc-1.json` ve `bsc-2.json` içinde `pollIntervalMs: 2000` yap.

---

## 6. Tavsiye Edilen AWS EBS Boyutu

| Senaryo | 1 Yıl | 2 Yıl | 3 Yıl |
|---------|-------|-------|-------|
| Varsayılan | 3,1 TB | 6,2 TB | 9,3 TB |
| **Tüm optimizasyonlarla (poll=2s)** | **0,6 TB** | **1,2 TB** | **1,8 TB** |
| Tüm optimizasyonlarla (poll=5s) | 0,4 TB | 0,8 TB | 1,2 TB |
| Alternatif, tüm opt. (poll=2s) | 0,4 TB | 0,8 TB | 1,2 TB |
| Alternatif, tüm opt. (poll=5s) | 0,3 TB | 0,6 TB | 0,9 TB |

1 yıllık production için: **gp3 1 TB** başlangıç için yeterli. Büyüme izlenip genişletilebilir.

---

## 7. AWS Maliyet Tahmini (US East, N. Virginia)

### 7.1 Depolama Stratejisi

```
Son 1 yıl → EBS gp3 (EC2'ya bağlı SSD)
1 yıldan eski → S3 Glacier Instant Retrieval (otomatik lifecycle policy)
```

Aynı AWS region içinde EBS → S3 veri transferi **ücretsizdir**. S3'e yazma (PUT) ve lifecycle transition request maliyeti depolamaya kıyasla ihmal edilebilir seviyededir.

### 7.2 AWS Fiyat Referansı (Temmuz 2026)

| Servis | $/GB-month | Açıklama |
|--------|------------|----------|
| EBS gp3 | $0.08 | EC2'ya bağlı SSD, 3000 IOPS + 125 MB/s baseline dahil |
| S3 Glacier Instant Retrieval | $0.004 | Milisaniye erişim, min 90 gün depolama, retrieval $0.03/GB |

> **Not:** EC2 instance maliyeti **hariçtir**. Bu hesaplama yalnızca storage (EBS + S3) maliyetini kapsar.

### 7.3 Aylık Depolama Maliyeti

| Senaryo | Yıllık Büyüme | Yıl 1 | Yıl 5 | Yıl 10 | Yıl 15 | Yıl 20 |
|---------|:------------:|------:|------:|-------:|-------:|-------:|
| Varsayılan | 3.1 TB | $248 | $298 | $360 | $422 | $484 |
| +retention=90g, poll=1s | 1.0 TB | $80 | $96 | $116 | $136 | $156 |
| **Tüm opt. poll=2s** | **0.6 TB** | **$48** | **$58** | **$70** | **$82** | **$94** |
| Tüm opt. poll=5s | 0.4 TB | $32 | $38 | $46 | $54 | $62 |
| Alternatif, retention=90g, poll=1s | 0.6 TB | $48 | $58 | $70 | $82 | $94 |
| Alternatif, tüm opt. poll=2s | 0.4 TB | $32 | $38 | $46 | $54 | $62 |
| Alternatif, tüm opt. poll=5s | 0.3 TB | $24 | $29 | $35 | $41 | $47 |

> Yıl 2'den itibaren S3 maliyeti eklenir. Yıl 1 verisi S3'e taşınır, her yıl 1 yıllık yeni veri EBS'te kalır. Formül: `EBS: G × $0.08 sabit`, `S3/ay: (Yıl−1) × G × $0.004`.

**Detaylı hesap (tüm opt. poll=2s):**

| Yıl | EBS (0.6 TB) | S3 birikim | EBS/ay | S3/ay | Toplam/ay |
|-----|:------------:|:----------:|-------:|------:|----------:|
| 1 | 0.6 TB | — | $48.00 | $0.00 | $48.00 |
| 5 | 0.6 TB | 2.4 TB | $48.00 | $9.60 | $57.60 |
| 10 | 0.6 TB | 5.4 TB | $48.00 | $21.60 | $69.60 |
| 15 | 0.6 TB | 8.4 TB | $48.00 | $33.60 | $81.60 |
| 20 | 0.6 TB | 11.4 TB | $48.00 | $45.60 | $93.60 |

**Detaylı hesap (Alternatif: 2 BSC + 6 HVAC, tüm opt. poll=2s):**

| Yıl | EBS (0.4 TB) | S3 birikim | EBS/ay | S3/ay | Toplam/ay |
|-----|:------------:|:----------:|-------:|------:|----------:|
| 1 | 0.4 TB | — | $32.00 | $0.00 | $32.00 |
| 5 | 0.4 TB | 1.6 TB | $32.00 | $6.40 | $38.40 |
| 10 | 0.4 TB | 3.6 TB | $32.00 | $14.40 | $46.40 |
| 15 | 0.4 TB | 5.6 TB | $32.00 | $22.40 | $54.40 |
| 20 | 0.4 TB | 7.6 TB | $32.00 | $30.40 | $62.40 |

**Detaylı hesap (Alternatif: 2 BSC + 6 HVAC, tüm opt. poll=5s):**

| Yıl | EBS (0.3 TB) | S3 birikim | EBS/ay | S3/ay | Toplam/ay |
|-----|:------------:|:----------:|-------:|------:|----------:|
| 1 | 0.3 TB | — | $24.00 | $0.00 | $24.00 |
| 5 | 0.3 TB | 1.2 TB | $24.00 | $4.80 | $28.80 |
| 10 | 0.3 TB | 2.7 TB | $24.00 | $10.80 | $34.80 |
| 15 | 0.3 TB | 4.2 TB | $24.00 | $16.80 | $40.80 |
| 20 | 0.3 TB | 5.7 TB | $24.00 | $22.80 | $46.80 |

### 7.4 Yıllık ve Kümülatif Maliyet

| Senaryo | 1 Yıl | 5 Yıl | 10 Yıl | 15 Yıl | 20 Yıl |
|---------|------:|------:|-------:|-------:|-------:|
| Varsayılan | $2,976 | $16,368 | $36,456 | $60,264 | **$87,792** |
| +retention=90g, poll=1s | $960 | $5,280 | $11,760 | $19,440 | **$28,320** |
| **Tüm opt. poll=2s** | **$576** | **$3,168** | **$7,056** | **$11,664** | **$16,992** |
| Tüm opt. poll=5s | $384 | $2,112 | $4,704 | $7,776 | **$11,328** |
| Alternatif, retention=90g, poll=1s | $576 | $3,168 | $7,056 | $11,664 | **$16,992** |
| Alternatif, tüm opt. poll=2s | $384 | $2,112 | $4,704 | $7,776 | **$11,328** |
| Alternatif, tüm opt. poll=5s | $288 | $1,584 | $3,528 | $5,832 | **$8,496** |

> Kümülatif formül: `G × [0.96N + 0.024N(N−1)]` — N yıl sonundaki toplam EBS + S3 maliyeti. G = yıllık büyüme (GB).

### 7.5 S3 Lifecycle Policy (örnek konfigürasyon)

```json
{
  "Rules": [
    {
      "Id": "archive-older-than-1-year",
      "Status": "Enabled",
      "Filter": { "Prefix": "chunks/" },
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER_IR"
        }
      ]
    }
  ]
}
```

TimescaleDB chunk'ları S3'e doğrudan yazılmaz; önce bir export mekanizması (örn. `pg_dump` parquet veya CSV) ile chunk'lar S3 bucket'a aktarılır, ardından TimescaleDB'den `drop_chunks()` ile silinir. Bu işlem otomatize edilmelidir (cron job veya pg_cron).

Alternatif olarak, TimescaleDB'nin tiered storage (data tiering) özelliği kullanılabilir ancak bu özellik TimescaleDB Cloud/Enterprise lisansı gerektirir. Community edition için manuel export + drop yaklaşımı önerilir.
