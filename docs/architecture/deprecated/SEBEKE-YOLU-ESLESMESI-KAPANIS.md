---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, simulator, pcs, mv-station, breaker, energization]
review_date: 2026-10-21
---

# Şebeke Yolu Eşleşmesi — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [SEBEKE-YOLU-ESLESMESI-MIMARISI.md](./SEBEKE-YOLU-ESLESMESI-MIMARISI.md) (onaylı — AK/FR/SC kaynağı; UC-1/UC-2/UC-3).
> **Doğrulama tarihi:** 2026-10-21 — T-1…T-7 tamam.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/simulators/src/grid-link/bus.ts#IGridLink` + `#GridLinkBus` | YENİ — şebeke yolu sorgu sözleşmesi + bus (`setBreaker`, `isEnergized` = H01 ∧ fider ∧ H02) | K1/K3 / FR-1.1 |
| 2 | `packages/simulators/src/demo-mv-station/demo-mv-simulator.ts#DemoMvStationSimulator` | `publish` — her şalter değişiminde `bus.setBreaker` (bus yoksa no-op) | K3 / FR-1.2 |
| 3 | `packages/simulators/src/wattox-pcs/simulator.ts#WattoxPcsSimulator` | `isGridEnergized` + `syncGridState` — kopuk zincirde standby/P=0/Vac=0; yeniden enerjide oto güç YOK | K1/K4 / FR-2.1..2.3 |
| 4 | `packages/simulators/src/host.ts#createGridLink` + `#SimulatorHost` | Field tier'da bus'ı koşullu oluşturur (MV + `details.gridLink` varsa) ve MV/PCS'e enjekte eder | K3 / FR-1.3 |
| 5 | `packages/shared-types/src/config/device-config.ts` + `schemas/device-config.ts` | `details.gridLink` şeması (`deviceId`/`breaker`/`feeder`) | K2 / FR-3.1 |
| 6 | `configs/sim/wattox-pcs-sim.json` | `details.gridLink` şeması (sim türevi) | FR-3.1 |
| 7 | `deployment/v2/{dev,aws}/field/device-configs/pcs-{1,2,3,4}.json` | PCS↔kesici eşleşmesi (PCS-1/2→H04, PCS-3/4→H05) | FR-3.2 |
| 8 | `packages/simulators/src/grid-link/bus.test.ts` | YENİ — bus durum/yayın testleri | T-2 / FR-1.1..1.3 |
| 9 | `packages/simulators/src/grid-link/pcs-deenergized.test.ts` | YENİ — PCS de-enerjili davranış (standby/Vac=0/yeniden enerji) | T-4 / FR-2.1..2.3 |
| 10 | `packages/simulators/src/host.test.ts` | YENİ host gridLink oluşturma testleri | T-3 / FR-1.3 |
| 11 | `apps/demo-field/integration/*.integration.test.ts` | Uçtan uca — kesici açılınca bağlı PCS transferi durur | T-7 / FR-3.3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tam test paketi | `bun run test` | 317 dosya / 2602 test yeşil (hub merge sonrası) |
| Demo entegrasyon (docker, gerçek stack) | `bun run test:demo-integration` | **108/108 yeşil** (host gridLink wiring dahil) |
| Simülatörler (birim) | `nx run simulators:test` | yeşil (grid-link bus + pcs-deenergized + host dahil) |
| Lint kapısı (SPEC) | `bun run spec:check docs/architecture/SEBEKE-YOLU-ESLESMESI-MIMARISI.md` | 0 hata |
| Şema ayrımı | production kök config'te `gridLink` grep | 0 sonuç (`configs/wattox-pcs.json` temiz) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Bus durum tutar ve sorgulanabilir | `grid-link/bus.test.ts` | 🟢 |
| AK-1.2 | MV her şalter değişimini yayınlar | `grid-link/bus.test.ts` + `demo-mv-simulator.ts#publish` | 🟢 |
| AK-1.3 | Bus koşullu oluşturulur (gridLink'siz → yok) | `host.test.ts` | 🟢 |
| AK-2.1 | Kopuk zincirde standby + P=0 | `grid-link/pcs-deenergized.test.ts` | 🟢 |
| AK-2.2 | Kopuk zincirde `REG_GRID_V_AB`=0 | `grid-link/pcs-deenergized.test.ts` | 🟢 |
| AK-2.3 | Yeniden enerjide oto güç yok | `grid-link/pcs-deenergized.test.ts` | 🟢 |
| AK-3.1 | Şema ayrımı (sim türevi evet, kök hayır) | config denetimi + `wattox-pcs-sim.json` | 🟢 |
| AK-3.2 | Field PCS↔kesici eşleşmesi dolu | `deployment/v2/**/field/device-configs/pcs-*.json` denetimi | 🟢 |
| AK-3.3 | Uçtan uca kesici→PCS | `apps/demo-field/integration/*.integration.test.ts` | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | PCS-1/2→H04, PCS-3/4→H05 | SPEC K2 `gridLink.breaker` alanıyla genel bırakmıştı; deployment değerleri fider kesicilerine (H04/H05) sabitlendi — gdems topolojisiyle hizalı. |
| 2 | `gridLink` alanı `deviceId`+`breaker`+`feeder` içerir | SPEC K2 yalnız `deviceId`/`breaker` öngörüyordu; PCS'in kendi fiderini bilmesi için `feeder` eklendi (PCS-1/2→H04, PCS-3/4→H05 eşleşmesinin taşıyıcısı). |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — bus yalnız simülatör katmanında (`packages/simulators/src/grid-link/`); device-service'e sızmadı
- [x] Purity 2 — PCS simülatörü MV sınıfına bağımlı DEĞİL; yalnız `IGridLink` tüketir (`wattox-pcs/simulator.ts#WattoxPcsSimulator`)
- [x] Purity 3 — production kök config'lerde `gridLink` YOK (sim türevi + deployment taşır)
- [x] Purity 4 — frontend `computeEnergization` DEĞİŞMEDİ (ayrı hesap katmanı)
- [x] Purity 5 — interlock kuralları MV simülatöründe kaldı
- [x] DI — `IGridLink` interface; `GridLinkBus` constructor'sız (immutable Map state) — Elegant Object uyumlu
- [x] Yaşam döngüsü — `isEnergized` saf sorgu; `setBreaker` saf komut (yan etki yalnız bus state)

### A.6 Genel Durum Özeti

Field tier'a in-process `GridLinkBus` eklendi: MV simülatörü şalter pozisyonlarını yayınlar, PCS simülatörü bağlı kesicisini sorgular. Zincir kopukken (H01 ∧ fider ∧ H02 bozuksa) PCS de-enerjili davranır — standby, güç 0, AC gerilim 0; yeniden enerjide otomatik güç uygulanmaz. Host bus'ı yalnız gerekli cihazlar varsa kurar; `gridLink` yoksa PCS enerjili varsayılır (geriye uyum). PCS-1/2→H04, PCS-3/4→H05 eşleşmesi deployment config'inde. Tam test paketi 294 dosya / 2559 test yeşil; demo entegrasyon suite'i gerçek docker stack üzerinde **108/108** geçti (MV kesici → PCS de-enerjili davranış host wiring ile doğrulandı). DC kesici eşleşmesi ve Playwright demo spec'lerinin kalan state/harness hataları açık (B.2). **review_date:** 2026-10-21.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Bus yok / gridLink yok | `gridLink` config'te yok | PCS enerjili (geriye uyum) | `grid-link/pcs-deenergized.test.ts` + `host.test.ts` |
| Kesici açık | `isEnergized(feeder)` false | standby, P=0, Vac=0 | `grid-link/pcs-deenergized.test.ts` |
| Kesici kapanır | yeniden enerjili | standby'dan başlar; otomatik güç yok | `grid-link/pcs-deenergized.test.ts` |
| Bilinmeyen kesici adı | config hatası | enerjili varsayılan + log | `grid-link/bus.test.ts` (bilinmeyen hücre = kapalı) |
| MV simülatör yok | host gridLink kurmaz | bus oluşmaz; PCS enerjili | `host.test.ts` |
| Aynı kesiciye çoklu PCS | hepsi aynı `feeder` | hepsi aynı durumu izler | `grid-link/bus.test.ts` (paylaşımlı bus) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Playwright demo spec'leri state taşıyor (fault enjeksiyonu sonrası BSC emergency kilidi) ve firefox/webkit kurulu değil | orta | Spec'lere afterEach temizliği + `bunx playwright install firefox webkit` |
| G2 | DC kesici eşleşmesi (container tier, süreçler arası) | orta | SPEC K6/A-1 — MVP dışı |
| G3 | Ada modu (islanding) ve şebeke frekansı senaryoları | düşük | SPEC §11 ileri iş |
| G4 | Topoloji grafiğinden otomatik eşleşme | düşük | SPEC A-2 — MVP açık config |

**review_date:** 2026-10-21

### REV.01 — İstasyon başına MV (2026-10-22)

- **Değişiklik:** Tek paylaşımlı MV yerine **istasyon başına 1 MV simülatörü** (`DEMO-MV-1` = bess1, `DEMO-MV-2` = bess2). Host artık MV cihazı başına `GridLinkBus` kuruyor; PCS `details.gridLink.deviceId` ile kendi istasyonunun bus'ını seçiyor, `feeder` H04/H05 o panonun iki fideri. Config: PCS-1/2→MV-1, PCS-3/4→MV-2.
- **Kanıt:** `host.test.ts` "her MV kendi bus'ına yayınlar; fider kesicisi yalnız bağlı PCS'i düşürür" (iki MV + iki PCS, canlı Modbus); stack'te `DEMO-MV-2` H04 açılınca yalnız PCS-3 de-enerjili (Vab 0), kapatınca 4000.
- **Test:** `bun run test` 2602 yeşil; `bun run test:demo-integration` **108/108** (hub mimarisi).
