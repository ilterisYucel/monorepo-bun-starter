---
status: active
space: architecture
tags: [mimari, data-service, bullmq, timescale, spec]
review_date: 2026-11-10
---

# Data Service — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `TIMESERIES-MIMARISI.md` (yazma portu), `DEVICE-SERVICE-MIMARISI.md` (üretici), `TELEMETRI-ZINCIRI-MIMARISI.md`.

## 1. Amaç ve Bağlam

`services/data-service` sözleşmesi: `WRITE_TELEMETRY` kuyruk tüketicisi — BullMQ'dan telemetri alır, TimescaleDB'ye yazar. "Aptal yazıcı"dır: filtreleme/indirgeme device-service'te yapılır.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Worker kaydı, yazma yolu, retry/dead-letter, system_logs bakımı |
| hariç | Filtreleme (DEVICE-SERVICE), sorgu (WEB-SERVICE), kalıcılık adaptörü (TIMESERIES) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Servis "aptal yazıcı": filtreleme/indirgeme device-service'te (TELEMETRI-OKUMA-YAZMA K2) | Tek sorumluluk |
| K2 | Telemetri ≠ log: `system_logs`'a telemetri yazımı YOK (T0.11 kapanışı, karakterizasyon testiyle sabit) | Log tablosu kirlenmez |
| K3 | Yazma hatası `TransientError` → BullMQ retry (attempts 5) + `onFailed` dead-letter logu; `stalledInterval: 120_000` (statement_timeout 30 sn'den büyük) | İş kaybı yok |
| K4 | Başarılı yazım ASLA loglanmaz; tek log noktası `onFailed` (`telemetry_write_failed`, jobId + deviceId'ler) | Log hacmi düşük |
| K5 | `system_logs` DDL + 30 gün retention `run.ts`'te kurulur | Bakım wiring'de |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Tek sınıf + tek worker — servis = birim; ayrı alt birim yok | `services/data-service/src/data-service.ts` |

## 4. Mimari

```text
DEVICE-SERVICE ──► WRITE_TELEMETRY (BullMQ) ──► DataService worker
                                                    └──► ITimeseriesDatabase#write
                                                          └── hata → TransientError → retry/dead-letter
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `services/data-service/src/data-service.ts#DataService` | Servis |
| `packages/core/src/timeseries/interface.ts#ITimeseriesDatabase` | Yazma portu |
| `packages/platform/messaging/src/platform-message-queue.ts#PlatformMessageQueue` | Kuyruk |

## 5. Purity Kuralları (ZORUNLU)

1. Filtreleme yapmaz (K1).
2. Telemetriyi log tablosuna yazmaz (K2).
3. Başarılı yazımı loglamaz (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Telemetri Yazma Tüketicisi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: worker kaydı, batch yazımı, hata→retry, dead-letter
- hariç: kalıcılık semantiği (TIMESERIES)

**Akış:**
1. `WRITE_TELEMETRY` job'u alınır.
2. `timescale.write` çağrılır.
3. Hata → retry; tükendiyse dead-letter logu.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Yazma hatası retry zincirine girer; tükenince dead-letter loglanır | AK-1.1 |
| FR-1.2 | Başarılı yazım log üretmez | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** yazma TransientError **WHEN** job çalışır **THEN** retry planlanır; son denemede `telemetry_write_failed` loglanır
2. **AK-1.2 — GIVEN** başarılı yazım **WHEN** job biter **THEN** hiçbir log satırı yazılmaz

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Retry/dead-letter | unit (`data-service.test.ts`) | ⬜ |
| AK-1.2 | Sessiz başarı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş batch | No-op |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/data-service/src/data-service.ts` | Worker |

### 6.2 UC-2 — System Logs Bakımı (wiring)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: DDL kurulumu, 30 gün retention
- hariç: log yazımı (TAMPER-LOGGER)

**Akış:**
1. Açılışta `system_logs` DDL kurulur.
2. Periyodik retention çalışır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | 30 günden eski `system_logs` temizlenir | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** 31 günlük kayıt **WHEN** retention koşar **THEN** kayıt silinir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Retention | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| DDL hatası | Açılış uyarısı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/data-service/run.ts` | Wiring |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| TransientError | Retry (attempts 5) |
| Tükenen retry | Dead-letter logu |
| Başarı | Sessiz |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Retry/dead-letter testli | komut |
| SC-2 | Telemetri log tablosuna yazılmaz | unit |
| SC-3 | Retention çalışır | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 13 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-2 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `DATA-SERVICE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `system_logs` tablosunun geleceği (log API UNION) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `system_logs` birleşiminin sadeleştirilmesi (A1).

## 12. T Görev Özeti

| T-1 | UC-1 (yazma tüketicisi) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (system_logs bakımı) kanıtının eşleştirilmesi |
