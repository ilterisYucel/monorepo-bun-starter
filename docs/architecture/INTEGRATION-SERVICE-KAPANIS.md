---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, integration-service, plugin-host]
review_date: 2026-11-10
---

# Integration Service — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [INTEGRATION-SERVICE-MIMARISI.md](./INTEGRATION-SERVICE-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama + T-18 kapaniş turu: config'teki düz metin sır `{env:}` referansına taşındı (B2 kapandı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/integration-service/config/plugins/epias-market-prices.json` | (değişiklik) `username/password` düz metin → `{env:EPIAS_USERNAME}/{env:EPIAS_PASSWORD}` | K6/B2 (T-18) |
| 2 | `services/integration-service/src/external-series-writer.ts#ExternalSeriesWriter` | (değişiklik) YALNIZ lint gerekçe yorumu (`require-parameterized-query` disable — VALUES tuple listesi dinamik, değerler `$n`) | Purity — davranış yok |
| 3 | `services/integration-service/src/integration-service.ts#IntegrationService` | (doğrulama) statik+dizin kaynakları; `kind!=="integration"` atlanır; `schedule()`→repeatable (`integration-fetch:<name>`), interval/cron/manual; FETCH worker concurrency 2; activate hatası → atlanır servis sürer | K1/K2/K3/FR-1 |
| 4 | `services/integration-service/src/external-series-writer.ts#init` | (doğrulama) hypertable+index; upsert `(source,series,timestamp)`; Timescale yoksa uyarı+devam; boş liste no-op | K4/FR-2.1 |
| 5 | Compose env hattı | (değişiklik) `EPIAS_*` `${...:-}` plumbing — DEPLOYMENT-KAPANIŞ #2 ile aynı diff | K6 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob integration-service/src | **2 test dosyası** (SPEC ile birebir): `integration-service.test.ts` 13 + `external-series-writer.test.ts` 5 = **18 test** |
| Kind filtresi | service "integration olmayan pluginleri atlar" | ✓ |
| Zamanlama | "interval job planlar", "cron mode", "manual mode'da zamanlama yok" | ✓ |
| Upsert | writer "write upsert SQL üretir + parametreler sıralı", "boş listede SQL yok" | ✓ |
| Worker akışları | fetch+yazma, runPlugin, stop, T3 zinciri (bilinmeyen plugin yok sayılır; fetch hatası düşürür; boş fetch no-op yazım) | ✓ |
| Sır hijyeni | AK-3.1 — config'te sır YOK (diff) + `{env}` çözümü PLUGIN-SDK context #5 testli | ✓ (zincir kanıt) |
| Taze koşu | `nx run integration-service:test` | **İLETİLMEDİ** (G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — writer diff'i yorum; config json kapsam dışı |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Kind filtresi | service #2 — envanter | 🟡 |
| AK-1.2 | schedule→repeatable | service #1,#3,#4 | 🟡 |
| AK-2.1 | Upsert tek satır günceller | writer #2 | 🟡 |
| AK-3.1 | Sır yok, env referansı | diff + PLUGIN-SDK zincir testi; gözle ✓ | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | **Eski parola git geçmişinde yaşıyor** | B2 düzeltmesi çalışan kopyayı temizler; geçmiş commit'ler okunabilir. **EPİAŞ hesabı parolası ROTASYONU zorunlu** — EPIAS-CLIENT-KAPANIŞ S2 ile aynı aksiyon, tek iş |
| S2 | Env eksik → sessiz `""` (compose `${:-}` + SDK `?? ""`) | SPEC edge "Env eksik → activate hatası → atlanır" diyor; gerçek akış boş credential ile aktive olup CAS'te patlar. Fail-fast tercihi tek kararda (PLUGIN-SDK S3 ile düğüm) |
| S3 | K5 TGT state-dir paylaşımı | run.ts wiring'inde state dir `INTEGRATION_STATE_DIR` → store dosyası orada; test #6 EPIAS'ta ("dosyada kalıcı — yeni store örneği aynı bilet") ✓ |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: servis plugin mantığı bilmez (fetch→write hattı kontrat üzerinden)
- [x] Purity 2: zamanlama plugin'de değil — `schedule()` bildirim, repeatable host'ta
- [x] Purity 3: config'te sır yok (bu turda sağlandı)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — T-18 kapandı, iki kuyruk aksiyonuyla:** 4/4 AK (AK-3.1 🟢: sır yüzeyi bu turda temizlendi ve zincir testi var). **NIS-2:** K6 güvenlik kararının kendisi bu turun değişikliğidir — kapatma kanıtlı; KALAN RİSK S1 (geçmiş sır) rotasyon gerektirir; S2 fail-fast kararı bekliyor. Mutasyon: uygulanmaz (davranış diff'i yok).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| kind uyumsuz | host.start | atlanır | `integration-service.test.ts` #2 |
| interval | activate biter | `integration-fetch:<name>` planlanır | #1 |
| cron / manual | schedule modları | cron job / planlama yok | #3–4 |
| worker | job geldi | fetch→write; hata→düşür; boş→no-op | #5, T3×3 |
| runPlugin | manuel | sayı döner; bilinmeyen throw | #6–7, T3 |
| stop | kapanış | deactivate + kaynaklar | #8 |
| upsert | aynı anahtar | tek satır UPDATE | `external-series-writer.test.ts` #2 |
| init | ilk açılış | tablo+hypertable+index | #1 |
| Timescale yok | init | uyarı+devam (edge) | kod yolu; ayrı vaka **KAPSANMAYAN** (G2) |
| `{env}` eksik | config yükleme | "" → geç hata (S2) | **KAPSANMAYAN** (G3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run integration-service:test` | Düşük | Ana agent |
| G2 | Timescale-absent uyarı dalı ayrı test değil | Düşük | writer'a tek vaka |
| G3 | Eksik-env semantiği (S2) testlenmiyor | Orta — canlı sır davranışı | PLUGIN-SDK G3 ile TEK karar+test |
| G4 | Parola rotasyonu (S1) — test değil, operasyon | **Yüksek** (geçmiş sır) | hemen: EPİAŞ şifre değişimi |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: T-18 ile B2 kapandı (AK-3.1 🟢); S1 rotasyon + S2 fail-fast kararları raporlandı | (yok — SPEC değişmedi) |
