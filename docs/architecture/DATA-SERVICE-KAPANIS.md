---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, data-service, bullmq]
review_date: 2026-11-10
---

# Data Service — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [DATA-SERVICE-MIMARISI.md](./DATA-SERVICE-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — `services/data-service` bu turda değişmedi; ANCAK kuyruk politikası (bağımlı `platform-messaging`) bu diff turunda değişti ve SPEC K3 ile çelişiyor (S1).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/data-service/src/data-service.ts#DataService` | (doğrulama) `WRITE_TELEMETRY` workeri; `timescale.write` çağrısı; hata → `TransientError` (jobId + deviceIds context); `onFailed` tek log noktası `telemetry_write_failed`; başarılı yazım sessiz | K3/K4/FR-1.1, FR-1.2 |
| 2 | `data-service.ts#start` (stalledInterval) | (doğrulama) `stalledInterval: 120_000` mevcut | K3 |
| 3 | `packages/platform/messaging/src/platform-message-queue.ts` (diff'li) | (SAPMA) `WRITE_TELEMETRY: attempts: 1` — "telemetri 1 sn'de eskir, sonraki poll taze" politikası; SPEC K3 "attempts 5" diyor | K3 — S1 |
| 4 | `data-service.ts#start` (iç yorum) | (SAPMA) kod yorumu hâlâ "WRITE_TELEMETRY attempts:5" diyor — messaging politikasıyla çelişen bayat yorum | S1'in taşeronu |
| 5 | `services/data-service/run.ts` | (doğrulama) `system_logs` DDL açılışta kurulur; retention `DELETE ... 30 days` **yalnız açılışta bir kez** — SPEC Akış "periyodik çalışır" diyor | K5/FR-2.1 — S2 |
| 6 | telemetri→log ayrımı | (doğrulama) worker'dan `system_logs`'a yazım yolu YOK (test #3 ile sabit) | K2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob + grep `data-service.test.ts` | **13 test / 1 dosya** — SPEC "mevcut 13 test" iddiası DOĞRULANDI |
| Worker/hata | #1 (worker kaydı + onFailed sınırı), #2 (job → timescale.write), #4 (write hatası → TransientError), #6 (denemeler tükenince jobId+deviceId'lerle log) | |
| Sessizlik | #3 (system_logs'a YAZIM YOK — Açık 2 kapanışı), #7 (logger yoksa onFailed sessiz) | |
| Yaşam döngüsü | #5 (stopped → atlama), #8 (close tümü), #9–13 (health dalları) | |
| Retention (AK-2.1) | — | **KAPSANMAYAN** (G3 — wiring kod incelemesi) |
| Taze test koşusu | `nx run data-service:test` | **İLETİLMEDİ** — reviewer salt-okuma (B.2/G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — bu modülde değişen dosya yok; değişen bağımlılık (`platform-message-queue.ts`) MESAJLASMA turunun mutasyon kapsamı |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Yazma hatası → retry zinciri; tükenince dead-letter log | #2/#4/#6 — worker tarafı tam; kuyruk-side `attempts` politikası S1 nedeniyle SPEC'ten FARKLI (1) | 🟡 |
| AK-1.2 | Başarılı yazım log üretmez | #3 (+ #7 Logger-yok yolu) — envanter | 🟡 |
| AK-2.1 | 30+ günlük `system_logs` kaydı silinir | kod inceleme `run.ts` (açılış-tek-koşum); test yok | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | **K3 retry politikası uyuşmuyor:** SPEC "attempts 5", canlı politika `attempts 1` (messaging diff'i, gerekçeli: taze-telemetri doğal-retry) | `TransientError` → BullMQ yine `onFailed`'e düşer ama tek denemede; "retry zinciri" K3'ün iddiası artık doğru değil. TIMESERIES-KAPANIŞ A.6'daki "K10 reject → BullMQ retry zinciri" anlatısı da bu karara bağlı — messaging kapanışında netleşir. **SPEC Revizyon Önerisi** aşağıda; kod yorumu (A.1 #4) da revizyonla senkronlanmalı |
| S2 | Retention "periyodik" değil, açılış-tek-koşum | Uzun ömürlü process'te 30+ gün log birikir (restart'a kadar). Edge-case tablosunda "periyodik" iddiası var — ya periyot eklenir (setInterval) ya SPEC "açılışta"ya düzeltilir; karar developer |
| S3 | Taze test + mutasyon kanıtları iletilmedi | Reviewer salt-okuma; envanter + inceleme kanıtı |

### A.5 Gözle Kontrol Maddeleri

- [x] "Aptal yazıcı": filtre/indirgeme YOK, ham job payload'ı write'a gider (K1)
- [x] Telemetri ≠ log: yazım yolu `system_logs`'a dokunmuyor (K2, test #3)
- [x] Tek log noktası `onFailed` (K4) — start/stop console satırları yaşam döngüsü, veri yolu değil
- [x] DI: ctor manuel enjeksiyon, `logger?` opsiyonel null-object yerine sessiz dal (geriye uyumluluk test #7)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — tek gerçek sapma S1 (retry politikası):** Worker semantiği 13 testle sabit; sapma servis kodunda değil, SPEC'in kuyruk karar kaydında (K3) ve bayat yorumda. S2 retention sınırlı etki (restart döngülü deployment'larda kendiliğinden periyodik). **NIS-2:** telemetri kalıcılık yolu — SPEC güvenlik AK'sı taşımıyor; log bütünlüğü TamperLogger zincirine devredilmiş (onFailed imzalı log) → ek boşluk değerlendirilmesine gerek yok, not: dead-letter içeriği deviceId + jobId (PII yok). Mutasyon: bu modül için uygulanmaz; messaging değişeni MESAJLASMA turunda.

### SPEC Revizyon Önerisi

1. **K3 →** "Yazma hatası `TransientError` üretir; `WRITE_TELEMETRY` kuyruk politikası `attempts: 1` (telemetri 1 sn'de eskir — sonraki poll doğal retry; bkz. MESAJLASMA/PLATFORM kararı); tükenme = ilk hata → `onFailed` dead-letter logu; `stalledInterval: 120_000`." (Gerekçe: kod davranışı bilinçli ve yorumda belgeli; SPEC'i koda uydurmak en ucuz yol. Alternatif: 5 denemeye dönmek — telemetry staleness açısından tartışmalı, developer kararı.)
2. **UC-2 Akış →** "Periyodik retention" yerine "açılışta retention" (veya periyot implementasyonu iş açılır — S2).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Worker kaydı | `start()` | WRITE_TELEMETRY + onFailed sınırı | `data-service.test.ts` #1 |
| Mutlu yol | job geliri | `timescale.write` çağrılır | #2 |
| system_logs izolasyonu | telemetri akışı | log tablosuna yazım yok | #3 |
| Write hatası | throw | `TransientError` (retry tetiği) | #4 |
| Stopped servis | job geliri | atlama | #5 |
| Deneme tükenmesi | onFailed | `telemetry_write_failed` + jobId/deviceIds | #6 |
| Logger yok | onFailed | sessiz, patlamaz | #7 |
| close/health | yaşam döngüsü | bağlantılar kapanır; 4 health dalı | #8–#13 |
| Retention 31 günlük kayıt | run.ts | silinir (yalnız açılışta) | **KAPSANMAYAN** (G3) |
| Boş batch | job boş dizi | no-op | **KAPSANMAYAN** (G4) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run data-service:test` iletilmedi | Düşük | Ana agent koşar |
| G2 | attempts-1 politikası ile worker testleri arasındaki uç: "tek hata = dead-letter" entegrasyon davranışı test edilmedi (BullMQ mock'u sınırda) | Orta — S1 ile birlikte messaging kapanışında ele alınmalı | messaging entegrasyon testi (MESAJLASMA turu) |
| G3 | run.ts DDL/retention wiring testi yok (kod inceleme kanıtı) | Düşük — restart'ta kendini tekrar eder | wiring testi veya S2 kararı sonrası periyot testi |
| G4 | Boş batch edge-case'i (SPEC tablosu) ayrı test değil | Düşük | tek `it()` |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 13 test doğrulandı; S1 (K3 attempts 5↔1) + S2 (retention periyodu) raporlandı; 2 SPEC revizyon önerisi | (yok — öneri aşamasında) |
