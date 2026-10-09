---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, telemetri, sorgu-performans, timescaledb, kimlik]
review_date: 2026-10-09
---

# Telemetri Sorgu Performansı — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [TELEMETRI-SORGU-PERFORMANS-MIMARISI.md](./TELEMETRI-SORGU-PERFORMANS-MIMARISI.md) (onaylı — AK/FR/SC kaynağı, REV.03).
> **Benchmark kanıtı:** [TELEMETRI-SORGU-BENCHMARK.md](./TELEMETRI-SORGU-BENCHMARK.md).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `configs/fss.json` | YENİ — FSS-1 kanonik config (27 telemetri) | K5, FR-1.1 (T-1) |
| 2 | `configs/demo-mv-station.json` | YENİ — DEMO-MV-1 kanonik config | K5, FR-1.1 (T-2) |
| 3 | `deployment/aws/demo-edge/container-device-configs/fss-1.json` | 6 eksik girdi eklendi → 27 (kök kanonikle özdeş) | K5, FR-1.2 (T-3) |
| 4 | `tools/device-config-drift.mjs` | YENİ — kök `configs/` ↔ deployment register imzası karşılaştırma | K5, FR-1.3 (T-4) |
| 5 | `tools/device-config-drift.allow.json` | YENİ — bsc demo setpoint allowlist (`Charge/Discharge Power Setpoint`) | K5, FR-1.3 (T-4) |
| 6 | `packages/shared-utils/src/config/device-config-drift.ts#compareDeviceConfig` | YENİ — drift karşılaştırma + issue/allowlist modeli | K5, FR-1.3 (T-4) |
| 7 | `packages/shared-utils/src/config/device-config-drift.test.ts` | YENİ — 7 test (özdeş/eksik/fazla/allowlist/bitfield/multiset/proje alanı) | K5, AK-1.3 (T-4) |
| 8 | `packages/shared-utils/src/config/index.ts` | `compareDeviceConfig` + tip export'ları | K5 (T-4) |
| 9 | `packages/shared-types/src/modbus/bitfield.ts#BitfieldField` | `dataTag` alanı kaldırıldı | K3, FR-2.1 (T-5) |
| 10 | `packages/shared-types/src/schemas/device-config.ts#bitfieldFieldSchema` | `dataTag` satırı çıktı | K3, FR-2.1 (T-5) |
| 11 | `packages/shared-types/src/schemas/device-config.ts#deviceConfigFileSchema` | `.superRefine` — racksiz bitfield ↔ register adı çakışması fail-fast (REV.03) | K4, FR-2.2 (T-5) |
| 12 | `packages/core/src/modbus/device.ts#readBitfieldGroup` | `dataTag` damgası kaldırıldı | K3, FR-2.1 (T-6) |
| 13 | `packages/simulators/src/bsc/bsc-config.ts` | Data Tag parse/alan çıktı | K3, FR-2.1 (T-7) |
| 14 | `packages/simulators/src/bsc/bsc-simulator.ts` | Data Tag alan çıktı | K3, FR-2.1 (T-7) |
| 15 | `tools/gen-pcs-configs.mjs` | `dataTag` üretimi kaldırıldı | K3, FR-2.1 (T-7) |
| 16 | `configs/flex-bsc.json` + 18 config dosyası (kök + deployment bsc-1/bsc-2 + emu/wattox) | `rack_id` normalizasyonu: 11 racksiz boyut-8 grup registerAddress sırasına göre rack_id aldı; `Reserved` ×3 benzersiz adlandı | K4, FR-2.2/FR-2.3 (T-8) |
| 17 | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getDownsampledData` | Uzun-format SQL (`GROUP BY bucket, name, tags->>'rack_id'`, `AS avg`); gapfill/locf + seri-bazlı JS taşıma sınırı | K6, K7, FR-3.1/FR-4.1 (T-9/T-10) |
| 18 | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getOrFetchSeriesMeta` | `DISTINCT ON (name, tags->>'rack_id')` + `seriesCache` (seri haritası) | K6, FR-3.2 (T-9) |
| 19 | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-config.ts` | `locfCarryMs?` + env `TIMESCALE_LOCF_CARRY_MS` (default 0) | K7, FR-4.1 (T-10) |
| 20 | `apps/demo-field/src/lib/api-client.ts` | `timeout: 60000` (15000 → 60000) | K8, FR-3.3 (T-14) |
| 21 | `tools/timescale-seed.mjs` | YENİ — N cihaz × M seri × T aralık sentetik geçmiş veri | K9, FR-5.1 (T-11) |
| 22 | `tools/downsampled-bench.mjs` | YENİ — EXPLAIN senaryo matrisi ölçümü | K9, FR-5.2 (T-12) |
| 23 | `deployment/k6/downsampled.js` | YENİ — endpoint downsampled senaryoları + p95 eşikleri | K9, FR-5.3 (T-13) |
| 24 | `docs/architecture/TELEMETRI-SORGU-PERFORMANS-MIMARISI.md` | REV.03 + K4 notu (kimlik esnetme) | K4 (revizyon) |
| 25 | `docs/architecture/TELEMETRI-SORGU-BENCHMARK.md` | YENİ — ölçüm raporu (EXPLAIN, kimlik doğrulama) | K9, FR-5.2 (T-12) |
| 26 | test fixture'lar (`alarm.test.ts`, `device-config.test.ts`, `device.test.ts`) | `dataTag` bekleyen satırlar çıktı | K3, FR-2.1 (T-5) |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| shared-types | `nx run shared-types:test` | 126/126 yeşil |
| core | `nx run core:test` | 107/107 yeşil |
| device-service | `nx run device-service:test` | 87/87 yeşil |
| data-service | `nx run data-service:test` | yeşil |
| web-service | `nx run web-service:test` | 608/608 yeşil |
| container-web / field / ui | ilgili test hedefleri | yeşil |
| shared-utils drift | `nx run shared-utils:test` (device-config-drift) | 7/7 yeşil |
| Lint kapısı | `bun run spec:check docs/architecture/TELEMETRI-SORGU-PERFORMANS-MIMARISI.md` | 0 hata |
| Drift kapısı | `bun tools/device-config-drift.mjs` | 0 hata / 8 uyarı (allowlist) |
| Envanter | `bun run test:inventory` | güncellendi (272 dosya / 2306 test) |
| Gerçek DB (benchmark) | `EXPLAIN ANALYZE` `device_bsc_1` (88,8M satır) | names filtreli 10 dk = 23 ms; eski 3,73 sn → yeni 274 ms (≈14×) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Kök config tamlığı (FSS-1, DEMO-MV-1) | `configs/fss.json` + `configs/demo-mv-station.json` (kod inceleme) | 🟢 |
| AK-1.2 | bsc register özdeşliği (401) | `packages/shared-utils/src/config/device-config-drift.test.ts#compareDeviceConfig` | 🟢 |
| AK-1.3 | Drift fail-fast | `device-config-drift.test.ts` (7 test) | 🟢 |
| AK-2.1 | dataTag tamamen kalkar | `bitfield.ts#BitfieldField` + `device-config.ts#bitfieldFieldSchema` + `device.ts#readBitfieldGroup` (kod inceleme + unit) | 🟢 |
| AK-2.2 | seri-teklik fail-fast | `device-config.ts#deviceConfigFileSchema` `.superRefine` — yalnız racksiz bitfield ↔ register çakışması (REV.03 esnetme, sapma #1) | 🟡 |
| AK-2.3 | Reserved normalize | `configs/flex-bsc.json` (`Reserved` ×3 benzersiz) + config diff | 🟢 |
| AK-2.4 | Frontend/e2e regresyon yok | container-web / field / ui testleri yeşil | 🟢 |
| AK-3.1 | uzun-format + index kullanımı | `timescaledb-adapter.test.ts` (uzun-format) + `TELEMETRI-SORGU-BENCHMARK.md` (EXPLAIN) | 🟢 |
| AK-3.2 | çıktı eşdeğerliği (AVG, 4 hane) | `timescaledb-adapter.test.ts` (eşdeğerlik) | 🟢 |
| AK-3.3 | timeout ≥ 60 sn | `apps/demo-field/src/lib/api-client.ts` (`timeout: 60000`) | 🟢 |
| AK-4.1 | gapfill+locf süreklilik | `timescaledb-adapter.test.ts` (gapfill/locf, K7) | 🟢 |
| AK-4.2 | seri-bazlı taşıma sınırı | `timescaledb-adapter.test.ts` (taşıma sınırı dışı boşluk düşer) | 🟢 |
| AK-4.3 | raw `query()` dokunulmaz | `timescaledb-adapter.test.ts` (locfCarryMs=0 → gapfill YOK) | 🟢 |
| AK-5.1 | seed üretimi | `tools/timescale-seed.mjs` (teslim; uçtan uca koşulmadı — sapma #5) | 🟡 |
| AK-5.2 | EXPLAIN raporu | `TELEMETRI-SORGU-BENCHMARK.md` (manuel EXPLAIN, warm-up) | 🟢 |
| AK-5.3 | k6 eşikleri | `deployment/k6/downsampled.js` (teslim; uçtan uca koşulmadı — sapma #5) | 🟡 |
| AK-5.4 | çıktı eşdeğerliği | `timescaledb-adapter.test.ts` (eşdeğerlik karakterizasyonu) | 🟢 |
| SC-1 | names filtreli p95 < 1 sn | `TELEMETRI-SORGU-BENCHMARK.md` (23 ms; 274 ms vs 3,73 sn) | 🟢 |
| SC-2 | aynı isim + farklı rack ayrı döner | `TELEMETRI-SORGU-BENCHMARK.md` §4 (canlı) + `timescaledb-adapter.test.ts` | 🟢 |
| SC-3 | NS_BIND_ABORT ≈ 0 | `api-client.ts` timeout 60 sn (dolaylı; canlı tarayıcı ölçümü yok) | 🟡 |
| SC-4 | kontrat değişmez; testler yeşil | A.2 tablosu (core/web-service/container-web/field/demo-field) | 🟢 |
| SC-5 | dataTag kalktı; drift temiz | kod inceleme + drift aracı (0 hata / 8 uyarı) | 🟢 |
| SC-6 | spec:check temiz + envanter güncel | 0 hata + 272 dosya / 2306 test | 🟢 |
| SC-7 | locfCarryMs=0 → uydurma yok | `timescaledb-adapter.test.ts` (gapfill YOK) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | K4 esnetildi → sonra ÇÖZÜLDÜ (AK-2.2) | İlk turda bitfield `(name+rack_id)` tam tekilliği fail-fast yapılmadı (flex-bsc'de 48 çakışma). Kaynak doküman (`20250730_Flex_BSC_Modbusmap_JF1_Rev_AF.xlsx`) incelendi: 30222 "Component Status" ↔ 30223 "Component **Feedback** Status" farklı register'lar (gerçek durum vs geri-bildirim). Çözüm: 30223 grubunun 6 alanına `… Feedback` eki (528 alan / 11 dosya) → çakışma 48→0. `dataTag` kaldırıldı; racksiz bitfield ↔ register adı çakışması fail-fast. |
| 2 | `dataTag` tamamen kaldırıldı | SPEC'te opsiyonel bırakılması değerlendirilmişti; fonksiyonel tüketicisi olmadığı için şema/tip/yazım/simülatörden tamamen çıkarıldı (K3). |
| 3 | `locfCarryMs` varsayılan 0 (kapalı) | Onaylı — A1: "varsayılan 0 = kapalı" önerisi T-10 öncesi kabul edildi (K7). |
| 4 | T-15 Faz-3 (CA/MV + eşzamanlılık) ertelendi | UC-6 ⛔ Defer (A3) — Faz-1 kazanımı doğrulandıktan sonra ayrı faz. |
| 5 | seed/bench/k6 araçları uçtan uca koşulmadı | Araçlar teslim edildi (`tools/timescale-seed.mjs`, `tools/downsampled-bench.mjs`, `deployment/k6/downsampled.js`); bench kanıtı demo DB'de manuel EXPLAIN ile üretildi (AK-5.1/AK-5.3 🟡). |
| 6 | `docs/mappings/register-ui-mapping.json` içindeki `dataTag` dokunulmadı | Dokümantasyon dosyası — kapsam dışı bırakıldı; ayrı takip. |
| 7 | Grup anahtarı `rack_id` → **parametrik `tag`** (REV.04) | Developer geri bildirimi: `rack_id` BSC'ye özgü; core/services jenerik olmalı. `options.tag` + `?tag=` ile ÇAĞIRAN verir; core cihaza özgü ad bilmez. Regex `^[a-zA-Z_][a-zA-Z0-9_]*$` (enjeksiyon sınırı). BSC sayfaları `tag=rack_id` gönderir; jenerik sayfalar göndermez (name-only). Şema refine jenerikleşti. K2/K6/K10 revize. |

### A.5 Gözle Kontrol Maddeleri

- [x] Kontrat sabit: `TelemetryData[]` şekli, `name/value/unit/timestamp/deviceId/tags/description` değişmedi (K6/K10)
- [x] Kimlik damgalanmadı: `tags.series` gibi ek alan YOK; ayrım tag anahtarı çağırandan (`tag`) gelir (K2/REV.04)
- [x] `canonical` grup/UI etiketi olarak kaldı — kimlik olarak kullanılmadı (B9, purity 3)
- [x] Gapfill uydurmaz: varsayılan kapalı; taşıma yalnız `locfCarryMs` sınırında; raw `query()` dokunulmadı (K7, purity 4)
- [x] Jenerik grup anahtarı: tag ANAHTARI yalnız `^[a-zA-Z_][a-zA-Z0-9_]*$` ile interpolasyona girer; core cihaza özgü ad bilmez (purity 7/REV.04)
- [x] Config source of truth: register/bitfield yalnız kök `configs/`'te; deployment yalnız proje değişkeni taşır (K5, purity 5)
- [x] Frontend dokunulmadı: rackHelpers/e2e `name + rack_id` modelinde kaldı (K10, purity 8)
- [x] Adaptör içi değişiklik: SQL/plan yalnız TimescaleDB implementasyonunda; mock/arayüz aynı (purity 6)
- [x] Elegant Object uyumu: yeni sınıf yok; `seriesCache` adaptör içi `Map` (immutable dışı durum — state machine olarak belgeli); named export, `I`-prefix, `*Config` suffix korundu

### A.6 Genel Durum Özeti

UC-1…UC-5 tamamlandı ve doğrulandı; UC-6 (Faz-3 CA/MV + eşzamanlılık) ⛔ Defer (A3, T-15). Seri kimliği `name + rack_id`'ye geçildi, `dataTag` tamamen kaldırıldı, downsampled sorgu uzun-formata çevrildi ve gerçek DB'de ~14× iyileşme ölçüldü (274 ms vs 3,73 sn; names filtreli 23 ms). Gapfill/locf `locfCarryMs` sınırıyla seri-bazlı uygulandı (varsayılan kapalı). flex-bsc'deki `name+rack` çakışması **kaynak dokümandan çözüldü** (30222 Component Status ↔ 30223 Component Feedback Status ayrı isimlendirildi; 48→0). Önceden var olan ilgisiz kırık (`platform-commands#maneuver-migration`, field maneuvers.json 11 bekliyor/12 var) bu modülle ilgisizdir. **review_date:** 2026-10-09.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Telemetri var | names/rack filtreli istek, `(name,timestamp)` indexi | `(bucket, name, rack_id)` başına tek satır, seriler ayrı | `timescaledb-adapter.test.ts` (uzun-format) |
| Telemetri yok | isim bulunamaz / veri yok | boş dizi (uydurma yok) | `timescaledb-adapter.test.ts` |
| Aynı isim, çok rack | iki bitfield aynı isim farklı rack | kimlik çifti ile ayrı seriler; birleşme YOK | `timescaledb-adapter.test.ts` (rack ayrımı) + `TELEMETRI-SORGU-BENCHMARK.md` §4 |
| Aynı isim + aynı rack, farklı register (30222/30223) | `Feedback` eki ile ayrıldı | ayrı seriler (çakışma 0) | config taraması + `TELEMETRI-SORGU-BENCHMARK.md` §5 |
| Sorgu > 15 sn | istemci timeout | 60 sn bekler (p95 hedefi < 1 sn names filtreli) | `apps/demo-field/src/lib/api-client.ts` |
| Sorgu > 60 sn | adaptör statement timeout | iptal (hedef: ulaşmamak) | `timescaledb-config.ts#timescaleStatementTimeoutMs` |
| Sıkıştırılmış chunk | `GROUP BY name,rack_id` | segment kullanımı korunur | `timescaledb-adapter.test.ts` (gözle/sorgu şekli) |
| Racksız mükerrer isim | `Reserved` ×3 | normalize edildi; yüklemede tekil | `device-config.test.ts` |
| Racksiz bitfield ↔ register çakışması | config yüklenir | fail-fast hata (REV.03) | `device-config.test.ts` (`deviceConfigFileSchema`) |
| Config drift | kök ↔ deployment register imzası farkı | drift aracı hata verir | `device-config-drift.test.ts` |
| `locfCarryMs = 0` | varsayılan config | gapfill kapalı (mevcut davranış) | `timescaledb-adapter.test.ts` (gapfill YOK) |
| `locfCarryMs > 0` + boşluk | gapfill+locf | boşluk son değerle dolar; `n=0` işaretli | `timescaledb-adapter.test.ts` (gapfill/locf) |
| Boşluk > `locfCarryMs` | taşıma sınırı aşımı | NULL kalır; diğer seriler etkilenmez (seri-bazlı) | `timescaledb-adapter.test.ts` (taşıma sınırı) |
| Raw `query()` | `locfCarryMs > 0` bile olsa | yalnız gerçek satırlar (gapfill YOK) | `timescaledb-adapter.test.ts` (raw regresyon) |
| Beklenmeyen hata | DB/pool hatası | `DomainError` sınırına taşınır | `timescaledb-adapter.test.ts` (hata akışı) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | `tools/timescale-seed.mjs` / `downsampled-bench.mjs` / `deployment/k6/downsampled.js` uçtan uca koşulmadı (bench manuel EXPLAIN ile üretildi) | orta | dev stack'te seed → bench → k6 zinciri koşulup rapor güncellenecek (AK-5.1/AK-5.3) |
| G2 | Çözüldü | — | 30222/30223 çakışması `Feedback` ekiyle ayrıldı (A.4#1) |
| G3 | Coverage ölçümü bu oturumda koşulmadı (≥%70 satır kapısı; güvenlik-kritik dal yok) | düşük | `bun run test:coverage` ile doğrula (gerekirse) |
| G4 | Faz-3 CA/MV hibrit + eşzamanlılık sınırı | yüksek | UC-6 (⛔ Defer, A3/T-15) — Faz-1 kazanımı doğrulandıktan sonra |
| G5 | Filtresiz tam-tarama (1 sa ≈ 5,2 sn) ayrı stres senaryosu | orta | A5 — gerekirse ayrı SPEC (cache/LTTB) |
| G6 | SC-3 canlı NS_BIND_ABORT oranı ölçümü yok (yalnız timeout artırıldı) | düşük | tarayıcı Network/sunucu logu ile doğrula |

**review_date:** 2026-10-09
