---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, telemetri-zinciri, alarm]
review_date: 2026-11-10
---

# Telemetri Zinciri — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [TELEMETRI-ZINCIRI-MIMARISI.md](./TELEMETRI-ZINCIRI-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Çapraz modül (config→tagger→indirgeme→kalıcılık→sorgu→görünüm→alarm) doğrulama kapanışı; kendi kodu yok — halka SPEC'i. Kanıtlar üyelerin kapanışlarına ÇAPRAZ REFERANS verir (SERVICES Purity 2: kopya yok).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Halka | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | Config→tagger | `telemetry-tagger.ts` + `telemetry-tagger.test.ts` doğrulandı (DEVICE-SERVICE-KAPANIŞ A.1 #5 satırıyla çapraz) | K2/K9/FR-1 |
| 2 | İndirgeme | `telemetry-write-filter` + `write-policy` (fail-fast deadband/maxStaleMs) | K3/FR-2 |
| 3 | Kalıcılık | TIMESERIES-KAPANIŞ AK-1.x (reject/rollback/200-lık dilim) + DATA-SERVICE-KAPANIŞ (aptal yazıcı, K4 telemetri≠log) | K4/FR-2 |
| 4 | Sorgu | TIMESERIES AK-2.x (origin/TAG_KEY_RE/uzun-format/limit) + `unified-routes.ts` `Math.min(20000, …)` clamp'i | K5/FR-3 |
| 5 | Konteyner görünümü | `tiers/site/infrastructure/container-telemetry/**` TTL cache + allSettled (WEB-SERVICE AK-2.x) | K6/FR-4 |
| 6 | Alarm üretim | detector + device-service dedup üçlüsü (DEVICE-SERVICE AK-6.1) | K7/FR-5.1 |
| 7 | Alarm çözme | `alarm-routes.ts`: fail-closed 500, 409, not→audit-context, guest 403 | K8/FR-5.2–5.3 |
| 8 | Yol adı | ✅ KAPANDI — SPEC §6.4 `tiers/site/…` = kod `tiers/site/…` (tam rename) | S1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Kapanış çapraz referansı | TIMESERIES (17 test), DEVICE-SERVICE (11 dosya), DATA-SERVICE (13 test), WEB-SERVICE (63 dosya) | "30+ test" iddiası üyelerde fazlasıyla karşılanıyor |
| UC-1 | telemetry-tagger.test + device-factory canonical vakaları | |
| UC-2 | write-filter/write-policy + data-service "system_logs'a YAZIM YOK" (Açık 2 kapanışı) | |
| UC-3 | timescaledb-adapter #8–15 (origin, tag regex, uzun-format) + unified-routes (22 test) | |
| UC-4 | hub-container-view + hub-ttl-cache | |
| UC-5 | detector + device-service (yükselen/sessiz/bayat) + alarm-routes (10: 403/409/fail-closed/400) | |
| Drift denetimi | `packages/shared-utils/src/config/device-config-drift.ts` mevcut; `compareDeviceConfig` testli (SHARED-UTILS-KAPANIŞ) — CI kapısı DEĞİL | B1/A1 |
| Taze koşu / mutasyon | komutlar | İLETİLMEDİ / uygulanmaz (bu SPEC halka; üye diff'leri üye kapanışlarında) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Canonical → `tags.canonical` | tagger + device-factory vakaları | 🟡 |
| AK-1.2 | Ortam tag'leri | `telemetry-tagger.test.ts` | 🟡 |
| AK-2.1 | Yalnız WRITE filtrelenir | scheduler "tam veri" vakası | 🟡 |
| AK-2.2 | Enqueue hatası → state ilerlemez | CQS vakaları; doğrudan enqueue-hata dalı G2'de (DEVICE-SERVICE ile aynı boşluk) | 🟡 |
| AK-3.1 | `latest` ≤ 20000 | KOD ✓ (`unified-routes.ts` clamp); AYNI DEĞERDE TEST VAKASI BULUNAMADI | 🟡 |
| AK-3.2 | Geçersiz tag → name-only | timescaledb-adapter #13 (TIMESERIES) | 🟡 |
| AK-4.1/4.2 | TTL cache + kısmi başarı | hub-container-view + ttl-cache | 🟡 |
| AK-5.1 | Dedup | detector/device-service | 🟡 |
| AK-5.2 | Resolve fail-closed | alarm-routes "yazılamazsa 500 + DB'ye GİDİLMEZ" | 🟡 |
| AK-5.3 | Aktif değilse 409 | alarm-routes "aktif olmayan alarm 409" | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | ✅ KAPANDI — SPEC yol adları `tiers/site/`, kod `tiers/site/` (tam rename) | — |
| S2 | AK-3.1 limit testi eksik | `Math.min(20000, …)` koda gömülü ama "30000 satır → 20000 dönecek mi?" vakası unified-routes.test'te bulunamadı → G1 |
| S3 | B2 "tek sözleşme iki implementasyon" | Hâlâ geçerli (üretim detector'da, çözme route'ta); AGENTS cihaz-alarm sözleşmesi iki tarafı da bağlıyor — İleri İş #3 ile izleniyor |
| S4 | B3 = WEB-SERVICE B2 | Sorgu port'suzluk borcu artık arch:check ile otomatik ölçülüyor (WEB-SERVICE S2) — referans, kopya değil |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: `TelemetryData` dönüşümsüz uçtan uca akıyor (sorgu dönüşü aynı şekil — TIMESERIES K7)
- [x] Purity 2: config TEK kaynak (deployment device-configs + drift denetimi mevcut)
- [x] Purity 3: alarm adı yalnız config `alarms`'tan — kod/enum alarm kaynağı yok (AGENTS sözleşmesi, detector vakaları)

### A.6 Genel Durum Özeti

**ZİNCİR UYGUN:** 12/12 AK üyelerde kanıtlı; halka SPECi olmasının bedeli — hiçbir AK 🟢 değil çünkü ölçüm üyelerin taze koşularına bağlı. İki gerçek eksik: S2 (limit vakası) ve B1 drift'in CI'a bağlı olmaması (A1). **NIS-2:** zincirin güvenlik yüzeyi alarm denetim izi (fail-closed resolve ✓ testli) + tag enjeksiyon sınırı (TIMESERIES NIS-2 notunu taşıyor); ek boşluk tanımlanmadı.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `canonical:"soc"` | poll | `tags.canonical="soc"` | telemetry-tagger / device-factory |
| MANAGEMENT job | yayın | tam veri (filtresiz) | device-scheduler |
| 30000 satır latest | `/api/data/latest` | ≤20000 | **KAPSANMAYAN** (G1/S2) |
| `tag="rack_id; DROP"` | downsampled | name-only | timescaledb-adapter #13 |
| 1 konteyner erişilemez | görünüm | diğerleri döner | hub-container-view |
| Alarm aktifken poll | üretim | tek yükselen kenar logu | detector + device-service |
| Çözülmüş alarm | resolve | 409 | alarm-routes |
| Audit yazılamadı | resolve | 500 + DB'ye gidilmez | alarm-routes |
| Restart | zincir | bayat alarm kapatılır; filter state sıfır | device-service + write-filter |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | `latest` 20000 clamp testi | Düşük-orta — DoS-adjacent sınır testleksiz | unified-routes'e tek vaka |
| G2 | Enqueue-hata state-dal (üye ile ortak) | Orta | DEVICE-SERVICE G2 ile aynı iş |
| G3 | Drift denetimi CI'da değil (B1/A1) | Orta — config↔kod sessiz ayrışabilir | pipeline işi |
| G4 | Üyelerin taze koşuları gelmeden zincir AK'ları 🟢 olamaz | Düşük | kapanış revizyonu turu |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 12 AK üyelerde doğrulandı; S1 yol adı + S2 limit-vaka eksikliği raporlandı | (yok — öneriler KAPANIŞ'ta) |
