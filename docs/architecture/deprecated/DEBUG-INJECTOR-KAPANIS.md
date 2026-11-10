---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, debug-injector, simulators, device-service]
review_date: 2026-10-12
---

# DEBUG-INJECTOR — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEBUG-INJECTOR-MIMARISI.md](./DEBUG-INJECTOR-MIMARISI.md) (onaylı — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/device-service/src/debug-injector.ts#DebugInjector` | Yeni modül: `DebugInjector` sınıfı + `InjectionTarget` arayüzü + `DebugInjectorConfig`/`DebugInjectorLog`. `GET /health` → 200 `{ok:true}`; `POST /inject` → 200/404/400; 16 KiB gövde limiti; bozuk JSON → 400. | T-1, K-1, FR-1.1..FR-1.4 |
| 2 | `services/device-service/src/debug-injector.ts#InjectionTarget` | Enjeksiyon hedefi sözleşmesi (`inject(deviceId, scenario): boolean`) — `SimulatorHost` bu sözleşmeyi karşılar. | T-1, K-3 |
| 3 | `services/device-service/src/debug-injector.test.ts` | Yeni unit test: gerçek loopback soketi üzerinde `/health` 200, `/inject` 200/404/400, `start()`/`stop()` idempotent. | T-4, AK-1.1..AK-1.4 |
| 4 | `services/device-service/run.ts#main` | dev-guard wiring: `NODE_ENV !== "production" && DEBUG_INJECT_ENABLED === "true"` koşuluyla `DebugInjector` kurulumu; `DEBUG_INJECT_PORT` (varsayılan 15590); `debugInjector?.start()`/`?.stop()` shutdown zincirine bağlandı. | T-5, K-2, SC-1 |
| 5 | `packages/simulators/src/host.ts#SelfHostedSimulator` | `inject?(scenario): boolean` opsiyonel metot sözleşmesi (desteklemeyen simülatörde tanımsız). | T-2, K-3 |
| 6 | `packages/simulators/src/host.ts#SimulatorHost.inject` | `deviceId` → instance → `inject(scenario)` delegasyonu; bilinmeyen cihaz/desteksiz → `false`. | T-2, K-3, K-4 |
| 7 | `packages/simulators/src/host.ts#bindNetwork` | `SIMULATOR_BIND_HOST` (ör. `0.0.0.0`) ile bind override — konteyner içi `127.0.0.1` host'tan erişilemez. | T-5, K-5 |
| 8 | `packages/simulators/src/imd/imd-simulator.ts#inject` | `fault`/`healthy`/`device_error` senaryo enjeksiyonu (FL-11 tetikleyicisi). | T-3, K-3, K-4 |
| 9 | `packages/simulators/src/control-panel-io/control-panel-io-simulator.ts#inject` | Kapı kontakt senaryoları: `battery_door_open/close`, `panel_door_open/close`, `nominal` (FL-07). | T-3, K-3, K-4 |
| 10 | `packages/simulators/src/dc-meter/dc-meter-simulator.ts#inject` | `overcurrent`/`overvoltage`/`nominal` ölçüm override (FL-08). | T-3, K-3, K-4 |
| 11 | `packages/simulators/src/hvac/hvac-simulator.ts#inject` | `hot`/`cold`/`humid`/`nominal` override alanları (`injectedCurrentTemp`/`injectedHumidity`; tick drift'i ezmez). | T-3, K-3, K-4 |
| 12 | `packages/simulators/src/bsc/bsc-simulator.ts#inject` | `overheat`/`diff_temp`/`nominal` override alanları (`injectedMaxPackTemp`/`injectedRack1DiffTemp`). | T-3, K-3, K-4 |
| 13 | `packages/simulators/src/energy-analyzer/simulator.ts#inject` | `aux_loss`/`nominal` override alanı (`injectedLineVoltage`; FL-02). | T-3, K-3, K-4 |
| 14 | `packages/simulators/src/injection.test.ts` | Yeni test: 6 simülatörün `inject` sözleşmesi (bilinen senaryo `true`, bilinmeyen `false`). | T-4, AK-1.2, AK-1.3 |
| 15 | `deployment/v2/dev/container/docker-compose.yml` | `DEBUG_INJECT_ENABLED`/`DEBUG_INJECT_PORT=15590`, `SIMULATOR_BIND_HOST=0.0.0.0`, `127.0.0.1:15590` loopback yayını; build context off-by-one düzeltmesi (`../../../../../` → `../../../../`). | T-5, K-5 |
| 16 | `deployment/v2/dev/field/docker-compose.yml` | `DEBUG_INJECT_ENABLED`/`DEBUG_INJECT_PORT=15591`, `SIMULATOR_BIND_HOST=0.0.0.0`, `127.0.0.1:15591` loopback yayını; build context off-by-one düzeltmesi. | T-5, K-5 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| packages/simulators (unit) | `bunx vitest run` | 19 dosya / 168 test geçti (`injection.test.ts` dahil) |
| services/device-service (unit) | `bunx vitest run` | 11 dosya / 92 test geçti (`debug-injector.test.ts` dahil) |
| demo entegrasyon (v2/dev canlı stack) | `bun run test:demo-integration` | 6 dosya / 64 test geçti; rule-protection paketi DebugInjector ile FL-02/05/07/08/11 zincirini doğruladı |
| e2e koruma zinciri | `e2e/demo-protection.spec.ts` | 2/2 geçti (inject → kural → fiziksel etki) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Eksik gövde 400 döner | `services/device-service/src/debug-injector.test.ts` (eksik `scenario` → 400) | 🟢 |
| AK-1.2 | Bilinen senaryo 200 + uygulanır | `debug-injector.test.ts` (unit) + rule-protection integration (`FL-02/05/07/08/11` zinciri) | 🟢 |
| AK-1.3 | Bilinmeyen senaryo 404 | `debug-injector.test.ts` (unit) + `injection.test.ts` (bilinmeyen → `false`) | 🟢 |
| AK-1.4 | Sağlık ucu 200 | `debug-injector.test.ts` (`GET /health` → 200) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | SPEC onayı plan onayı ("Go") ile alındı | Ayrı yazılı onay belgesi yok; v2/dev denetim test paketi planının developer onayıyla birlikte verildi. SPEC §6 Status `✅ Approved`. Etki: izleme zinciri için dokümantasyon onayı plan onayına bağlandı. |
| 2 | Prod kimlik doğrulaması bilinçli olarak yok | `DebugInjector` yalnız dev/loopback akışında açılır (K-2); prod'da `NODE_ENV` guard'ıyla hiç başlatılmaz. Kimlik doğrulamalı enjeksiyon SPEC §11 "İleri İş" olarak işaretli. |
| 3 | `SelfHostedSimulator.inject` opsiyonel metot | Host'ta opsiyonel-yetenek kontrolü (`simulator.inject === undefined`) `ELEGANT-EXCEPTION` olarak işaretlendi (Elegant #4 istisnası — `instanceof`/tip denetimi yerine opsiyonel metot polimorfizmi). |

### A.5 Gözle Kontrol

- [x] Statik metot yok — `DebugInjector` örnek nesnesi (`services/device-service/src/debug-injector.ts#DebugInjector`).
- [x] `null` dönmez — başarı `boolean`/HTTP durumu ile ifade edilir.
- [x] Alanlar `private readonly`; durum `server` yaşam döngüsüyle sınırlı.
- [x] `instanceof`/`typeof` ile davranış seçimi yok — `inject` opsiyonel metodu üzerinden polimorfik çağrı (`ELEGANT-EXCEPTION`).
- [x] Command/query ayrımı: `start()`/`stop()` komut; `port()` sorgu.
- [x] Constructor injection — `DebugInjector(target: InjectionTarget, config, log)` tek birincil ctor.
- [x] Prod guard doğru: `NODE_ENV !== "production" && DEBUG_INJECT_ENABLED === "true"` (`run.ts#main`).
- [x] Named export'lar kullanılıyor (default export yok).
- [x] Kod referansları `#sembol` çapası; satır-numarası referansı yok.

### A.6 Genel Durum

`DebugInjector` modülü SPEC'teki tüm görevleri (T-1..T-5) ve kabul kriterlerini (AK-1.1..AK-1.4) karşılıyor. Unit, entegrasyon ve e2e katmanlarında kanıtlandı; FL-02/05/07/08/11 koruma zinciri stack seviyesinde fiziksel etki üretiyor (SC-2). Prod saldırı yüzeyi açılmıyor (K-2, SC-1). Modül **🟢 Doğrulanmış** durumundadır.

**review_date:** 2026-10-12

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `start()` → sağlık ucu | `GET /health` | 200 `{ok:true}` | `debug-injector.test.ts` (`services/device-service/src/debug-injector.test.ts`) |
| `POST /inject` geçerli gövde + bilinen senaryo | `BSC-1/overheat` | 200 `{applied:true}`; `seen` kaydına hedef çağrısı düşer | `debug-injector.test.ts` |
| `POST /inject` bilinmeyen cihaz/senaryo | `BSC-1/bilinmeyen` | 404 `{applied:false}` | `debug-injector.test.ts` |
| `POST /inject` eksik gövde | `{deviceId}` (scenario yok) | 400 | `debug-injector.test.ts` |
| Simülatör `inject` bilinen senaryo | IMD/CPIO/DC-METER/HVAC/BSC/PM5340 | `true` + durum/ölçüm değişir | `injection.test.ts` (6 vaka) |
| Simülatör `inject` bilinmeyen senaryo | `"yok"` | `false` | `injection.test.ts` |
| `SimulatorHost.inject` desteksiz cihaz | `inject` metodu tanımsız | `false` | `host.ts#inject` (gözle — opsiyonel metot) |
| `start()`/`stop()` idempotent | çift `stop()` | hata yok, sessiz no-op | `debug-injector.test.ts` |
| Port 0 (ephemeral) | `{port: 0}` | `port()` > 0 okunur | `debug-injector.test.ts` |
| Prod guard | `NODE_ENV=production` | injector `undefined`, hiç başlatılmaz | `run.ts#main` (gözle — SC-1) |

### B.2 KAPSANMAYAN

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | PCS E-stop / BMS-bridge enjeksiyonu | orta | A-1 — Faz 5; PCS/BMS-bridge simülatörlerine `inject` senaryoları eklenir |
| G2 | Enjeksiyon senaryo sözlüğünün genişletilmesi (PCS E-stop, BSC latch testi) | orta | A-1 — SPEC §10 açık kararı |
| G3 | Çok-tier eşzamanlı enjeksiyon (container + field aynı testte) | orta | Dev stack'te iki ucun (`15590`/`15591`) koordinasyonu; gelecek e2e paketi |
| G4 | `>16 KiB` gövde ve bozuk JSON için explicit test yok | düşük | Implementasyon 400 döndürüyor (`readJsonBody`), davranış testle sabitlenmedi — edge test eklenir |
| G5 | Bilinmeyen URL yolu → 404 | düşük | Test adında belirtiliyor ama assertion yok; `handle` içindeki fallback 404 dalı sabitlenmeli |

**review_date:** 2026-10-12
