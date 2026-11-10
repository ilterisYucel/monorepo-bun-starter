---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, device-service, modbus, alarm]
review_date: 2026-11-10
---

# Device Service — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — tek diff `ops-log.ts` başlık lint yorumu; davranış envanterden.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/device-service/src/ops-log.ts` | (değişiklik) `energy/no-raw-console-log` dosya-kapsamlı disable — "logger yoksa console fallback BİLİNÇLİ" gerekçesi (K4) | lint turu; davranış yok |
| 2 | `device-factory.ts#DeviceFactory` | (doğrulama) connector → 2. MODBUS cihazı; `canonical` → `tags.canonical`; MQTT stub dalı | K2/FR-1 |
| 3 | `device-scheduler.ts` | (doğrulama) WRITE filtreli alt küme, MANAGEMENT/WS_BROADCAST tam veri; boş alt kümede WRITE atlanır, diğerleri devam | K4/FR-2.1 |
| 4 | `device-service.ts` | (doğrulama) online→offline 1× error + `status='offline'`; offline→online info; komut: read-back poll timeout→`success:false`; `command_rejected` audit fail-closed | K5/K6/FR-2.2, FR-3 |
| 5 | `telemetry-write-filter.ts` + `write-policy.ts` | (doğrulama) deadband+maxStaleMs zorunlu fail-fast; `"auto"`=scale; state cihaz-izole; restart'ta ilk görüş yazılır | K7/FR-4 |
| 6 | `heartbeat-writer.ts` | (doğrulama) sayaç 0–255 dönüşü; hata onError'a | K8/FR-5.1 |
| 7 | `alarm-transition-detector.ts` + `alarm-state-repository.ts` | (doğrulama) yükselen kenar tek set/log; aktifken sessiz; restart bayat kapatma | K9/FR-6.1 |
| 8 | `debug-injector.ts` + `run.ts` | (doğrulama) prod guard `NODE_ENV!=="production" && DEBUG_INJECT_ENABLED`; run.ts host `0.0.0.0` | K10/FR-7.1 — B1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob device-service | **11 test dosyası** — SPEC ile birebir |
| UC-1 | device-factory: connector üretir/üretmez, canonical VAR/YOK vakaları; config-loader (canonical şema geçişi) | |
| UC-2 | device-scheduler: "WRITE alt kümeyi, MANAGEMENT/WS tam veriyi taşır" + boş alt küme; device-service: log geçişleri, "read hatası processor'ı REJECT ETMEZ" | |
| UC-3 | device-service komut bloğu: "positive sağlanıyorsa validated:true", "ilişki sağlanmıyorsa timeout → success:false", "audit fail-closed: command_rejected başarısızsa job düşer" | |
| UC-4 | telemetry-write-filter (markWritten/izolasyon/ilk görüş), write-policy fail-fast vakaları | |
| UC-5 | heartbeat-writer (255→0, hata kanalı) | |
| UC-6 | device-service dedup üçlüsü (yükselen/tekrar/bayat) + alarm-transition-detector DOĞRUDAN testler | |
| UC-7 | debug-injector: health/404/stop idempotent | |
| Taze koşu / mutasyon | komutlar | **İLETİLMEDİ / verisi yok** (ops-log diff'i yorum) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Connector türetimi | device-factory "connector bölümü varsa 2. MODBUS cihazı" | 🟡 |
| AK-1.2 | Canonical → tags | device-factory ×2 vaka — NOT: SPEC kanıt hücresi `config-loader.test.ts` diyor, fiili kanıt `device-factory.test.ts` (G1) | 🟡 |
| AK-2.1 | 3 downstream job | device-scheduler vakaları | 🟡 |
| AK-2.2 | Log politikası | device-service offline/online geçiş vakaları | 🟡 |
| AK-3.1 | Read-back timeout = başarısız | device-service "timeout sonuna kadar poll → success:false" | 🟡 |
| AK-3.2 | Audit fail-closed | device-service "command_rejected logu başarısızsa job düşer" | 🟡 |
| AK-4.1 | Filtre yalnız WRITE yolunda | scheduler + filter vakaları | 🟡 |
| AK-4.2 | Enqueue hatasında state ilerlemez | filter CQS vakaları; ENQUEUE-HATA dalı ayrı test edilmedi (G2) | 🟡 |
| AK-5.1 | Heartbeat dayanıklılığı | heartbeat-writer dosya envanteri | 🟡 |
| AK-6.1 | Alarm dedup | device-service ×3 + detector ×2 | 🟡 |
| AK-7.1 | Prod guard | kod inceleme `run.ts` (env çift-kontrolü); guard'ın KENDİ testi yok — debug-injector testi akışı değil (G3) | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | **B1 yaşıyor:** debug injector etkinleştirildiğinde `host: "0.0.0.0"` | Guard çift-env şartına bağlı (prod'da kapalı) ama dev/lab ağında enjeksiyon ucu tüm arayüzlere açık — A1 (`127.0.0.1`) kararı bekliyor. **NIS-2 notu:** test aracı ağ yüzeyi; NIS-2 kapsamındaki saha ağlarında dev devreyi kapatma kararı developer'da |
| S2 | **B2 artık büyük ölçüde GEÇERSİZ:** `applyTransition` doğrudan testli | `alarm-transition-detector.test.ts` yükselen/tekrar/birden-fazla vakalarını DOĞRUDAN koşuyor; SPEC B2 "yalnız dolaylı" diyor — belge gerçekliği geriden izliyor (güncelleme önerisi) |
| S3 | B3 güncel | `@gd-monorepo/logger` yalnız device-service'te (ops-log) — İleri İş #3 |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: simülatör kavramı yalnız `run.ts` wiring'inde (config `kind`), servis çekirdeği bilmiyor
- [x] Purity 2: transport yüzeyi `IModbusTransport` üzerinden (MODBUS-KAPANIŞ ile çapraz)
- [x] Purity 3: komut audit'i fail-closed — AGENTS "alarm/audit bu kanaldan geçmez" ops-log başlığıyla tutarlı
- [x] AGENTS async-loop kuralı: poll/yayın yollarında `Promise.all/allSettled` (device-scheduler vakaları)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 11/11 AK kanıt yüzeyi mevcut; tek gerçek bulgu S1 (ağ bağlama — SPEC'in bildiği, A1'e bağlanmış borç) ve S2 (belge geriliği, pozitif yönde). **NIS-2:** komut hattı fiziksel yazma riski — fail-closed audit + read-back testli (güvenlik AK'sı var ✓). Mutasyon: uygulanmaz (davranış diff'siz tur).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| connector.device | config yükle | 2. cihaz üretilir | `device-factory.test.ts` |
| canonical:"soc" | telemetri | `tags.canonical` | aynı (+YOK vakası) |
| başarılı poll | yayın | 3 job; WRITE filtreli | `device-scheduler.test.ts` |
| boş filtre alt kümesi | poll | WRITE yok; MGMT/WS devam | aynı |
| art arda okuma hatası | poll | 1× error, offline, REJECT yok | `device-service.test.ts` |
| read-back uyuşmaz | timeout dolana dek poll | `success:false` | aynı |
| audit yazılamadı | komut | job düşer (fail-closed) | aynı |
| deadband altı değişim | markWritten sonrası | haric tutulur | `telemetry-write-filter.test.ts` |
| maxStaleMs aşımı | eşik içi | yazılır | `write-policy.test.ts` |
| sayaç 255 | beat | 0'a döner | `heartbeat-writer.test.ts` |
| aktif alarm + poll | tekrar | sessiz (dedup) | device-service + detector |
| restart | bayat aktifler | kapatılır + state sıfır | device-service |
| enqueue hatası | sonraki poll | satır yeniden değerlendirilir | **KAPSANMAYAN** (G2) |
| NODE_ENV=production | debug ucu | kapalı (404/yok) | **KAPSANMAYAN** (G3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | AK-1.2 kanıt hücresi yanlış dosya adı taşıyor | Düşük | SPEC kanıt satırı düzeltmesi |
| G2 | "enqueue başarısız → state ilerlemez" doğrudan vaka yok | Orta — CQS iddiasının zayıf karnı | device-service.test'e tek vaka (addJob reject) |
| G3 | Prod-guard (K10) kendi testi yok; run.ts wiring'de | Düşük-orta | guard'ı küçültüp unit'lenebilir fonksiyona taşıma kararı |
| G4 | Taze koşu iletilmedi | Düşük | `nx run device-service:test` |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 11/11 dosya; B1 canlı (S1), B2 geçersizleşmiş (S2), ops-log lint diff'siz | (yok — B2/B1 için güncelleme önerisi KAPANIŞ'ta) |
