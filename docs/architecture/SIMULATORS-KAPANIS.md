---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, simulators, modbus, sim-lab]
review_date: 2026-11-10
---

# Simulators — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [SIMULATORS-MIMARISI.md](./SIMULATORS-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — tek diff `lab-server.ts` içinde lint gerekçe yorumu (davranış yok).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/simulators/src/physical/modbus/lab-server.ts` | (değişiklik) `energy/no-math-random` için gerekçeli disable — "simülatör paket kaybı" test iskelesi, güvenlik değeri değil (`lossy` dalı) | lint turu — S4 |
| 2 | `packages/simulators/src/host.ts#SimulatorHost` | (doğrulama) simülatör başına ayrı port, kompozisyon base-class'sız | K1/K4/FR-1.1 |
| 3 | `packages/simulators/src/server/modbus-server-bridge.ts#ModbusServerBridge` | (doğrulama) `writeProtected/readProtected` dışı → exception `0x02`; jsmodbus event, buffersız | K2/FR-1.2 |
| 4 | `packages/simulators/src/wattox-pcs/**` | (doğrulama) iki-bridge istisnası (EMS + bmsPort); şarj=negatif/deşarj=pozitif işaret konvansiyonu | K3/K9/FR-3.2 |
| 5 | `packages/simulators/src/bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter` | (doğrulama) TCP master: kaynak BSC oku → hedef PCS BMS yaz; retry dalı | K6/FR-3.1 |
| 6 | `packages/simulators/src/grid-link/bus.ts#GridLinkBus` | (doğrulama) MV şalter pozisyonu yayını; PCS de-enerjili davranış testleri (`pcs-deenergized.test.ts`) | K11 |
| 7 | `packages/simulators/src/physical/site/plant.ts#Plant` + `lab-server.ts#LabServer` | (doğrulama) site JSON→N Modbus sunucusu tek süreç; fiziksel kolaylığa dokunmuyor | K12/K13/FR-4 |
| 8 | `packages/simulators/src/physical/site/ems-export.ts#exportEmsConfigs` | (doğrulama) host/port değişir, `deviceId` korunur; `deployment/simlab/` üretimi KODDA hazır (diskte çıktı yok — DEPLOYMENT-KAPANIŞ S2) | K15/FR-5.1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob packages/simulators | **25 test dosyası** — SPEC ile birebir (+ `apps/sim-lab/src/plant.test.ts` kopya zinciri = B1) |
| UC-1 | host.test (port izolasyonu), modbus-server-bridge.test (`0x02`), simulator-server.test | |
| UC-2 | bsc/hvac/cb/dc-meter/dc-output/imd/fss/control-panel-io/energy aile testleri + contracts.test + injection.test | |
| UC-3 | connector/tcp-target/source-reader/pcs-power-reader 4 dosya + wattox-pcs + bms-face | |
| UC-4 | physical: `site/plant.test.ts`, `conformance/ems-read-path.test.ts`, grid-link 2 dosya — B3 "fiziksel 3 dosya" ile uyumlu | |
| UC-5 | export kanıtı `plant.test.ts` zinciri | |
| Taze koşu / mutasyon | komutlar | **İLETİLMEDİ / verisi yok** (tek diff yorum satırı) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter | Kanıt | Durum |
|:----|:---------|:------|:------|
| AK-1.1 | Port izolasyonu | host.test — envanter | 🟡 |
| AK-1.2 | Koruma `0x02` | modbus-server-bridge.test | 🟡 |
| AK-2.1 | Aile sözleşmesi | aile testleri (9+ dosya) | 🟡 |
| AK-2.2 | Genişleme tek noktadan | kod inceleme (builder + host satırı) | 🟡 |
| AK-3.1 | Connector akışı | bsc-pcs-connector 4 test dosyası | 🟡 |
| AK-3.2 | İşaret konvansiyonu | wattox-pcs + bms-face | 🟡 |
| AK-4.1 | N sunucu | plant.test | 🟡 |
| AK-4.2 | İzolasyon | kod inceleme — kolaylık dosyaları fiziksele import'suz | 🟡 |
| AK-5.1 | Export deviceId korumu | plant.test / ems-export | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | B1 kopya modeller (sim-lab yerel) | Değişmedi — A1 İleri İş; kopya `plant.test.ts` zinciri çift doğruluk riski taşıyor (kaydet: sim-lab `main.ts` paket sürümünü kullanıyor, kopyalar testte) |
| S2 | B2 onay/uygulama sapması (`SIMULATOR-SERVISI-MIMARISI` ✏️ iken sim-lab var) | A2 "bu SPEC ile kapanır" diyor — kapanış bu notu veriyor; eski SPEC `deprecated/` altında ✓ |
| S3 | B3 fiziksel test darlığı | Değişmedi — İleri İş #2 |
| S4 | lint-disable (`Math.random`) | `no-math-random` ASVS kuralı simülatör dalına uygulandı; gerekçe satırda — EPIAS-CLIENT'teki gerçek güvenlik yüzeyiyle karıştırılmamalı |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: simülatörler `core`'a bağımlı değil (import taraması: shared-types/jsmodbus/result)
- [x] Purity 2: device-service config'inde `kind:"simulator"` dışında simülasyon izi yok
- [x] K5 statik port bandı 15501-15504 — config örnekleriyle tutarlı

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 9/9 AK envanterle karşılanıyor (25 dosya); turda davranış değişikliği yok (lint yorumu hariç). **NIS-2:** simülasyon — üretim güvenlik yüzeyi değil; `Math.random` kullanımı belgeli istisna. Mutasyon: uygulanmaz.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| 2 simülatör | host başlat | 2 ayrı port | host.test |
| Koruma dışı yazma | bridge FC16 | `0x02` | modbus-server-bridge.test |
| BSC register | okuma | adapter modeli döner | bsc-simulator.test |
| Şarj | güç raporu | negatif | wattox-pcs / bms-face |
| Connector | BSC→PCS | hedef BMS'e yazılır | connector.test + source-reader |
| MV açık/bozuk | GridLinkBus | PCS de-enerjili | pcs-deenergized.test |
| 10 cihazlı site | LabServer başlar | 10 port | plant.test |
| EMS export | koşar | host/port değişir, deviceId sabit | plant.test (export) |
| lossy mod | `f.mode==="lossy"` | paket düşer (rand) | **KAPSANMAYAN** (G2) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze koşu iletilmedi | Düşük | `nx run simulators:test` |
| G2 | `lossy` dalı (dropRatio) test edilmedi — bu turun diff'i tam o satırın üstü | Düşük-orta | tek sahte-random test |
| G3 | sim-lab kopya modeli regresyonu (B1) | Orta | A1 delegasyon |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 25/25 dosya; B1-B3 borçları güncel teyit; lint-disable gerekçesi notu | (yok — SPEC değişmedi) |
