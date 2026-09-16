---
status: active
space: architecture
tags: [test-kapsami, simulatör, sanal-cihaz, ws1, ws2]
review_date: 2026-09-16
---

# Sanal IO Cihaz Ailesi — TEST KAPSAMI

> **İş akışı aşaması:** 6/6 — KAPSAM (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **SPEC:** [SANAL-IO-CIHAZ-AILESI-MIMARISI.md](./SANAL-IO-CIHAZ-AILESI-MIMARISI.md). **SONUÇ:** [SANAL-IO-CIHAZ-AILESI-DOGRULAMA.md](./SANAL-IO-CIHAZ-AILESI-DOGRULAMA.md).

## Senaryo Matrisi

### `packages/simulators/src/aux-analyser/aux-analyser.test.ts` (9 test)

| Durum | Koşul | Beklenen | Test |
|:------|:------|:---------|:-----|
| Başlangıç | tick(1) sonrası | Energy Status bit0=1, bit1=0 | "başlangıçta AUX OK" |
| Nominal voltaj | tick(1) | 2280-2320 (0.1 ölçek) | "nominal voltaj 230.0V civarı" |
| Nominal frekans | tick(1) | 4990-5010 (0.01 ölçek) | "nominal frekans 50.00Hz civarı" |
| Akım | tick(1) | > 0 | "akım pozitif değer okur" |
| Energy loss enjeksiyonu | setEnergyLoss(true) + tick | bit1=2 | "setEnergyLoss(true) → bit1 set" |
| Geri dönüş | setEnergyLoss(false) + tick | bit0=1, bit1=0 | "setEnergyLoss(false) → AUX OK geri döner" |
| Kayıpta voltaj | setEnergyLoss(true) + tick | 0 | "enerji kaybında voltaj 0'a düşer" |
| Jitter bandı | 50×tick | bant dışı yok | "jitter nominal bant içinde kalır" |
| Bilinmeyen adres | read(99) | 0 | "bilinmeyen adres 0 döner" |

### `packages/simulators/src/fss/fss.test.ts` (6 test)

| Durum | Koşul | Beklenen | Test |
|:------|:------|:---------|:-----|
| Başlangıç | yeni örnek | OK=true, Fault=false, Discharged=false | "başlangıçta sağlıklı" |
| Fault | setFault(true) | Fault=true, OK=false | "setFault(true) → Fault true" |
| Fault kalkış | setFault(false) | OK=true | "setFault(false) → sağlığa döner" |
| Discharged | setDischarged(true) | Discharged=true | "setDischarged(true)" |
| Tick | tick(1) | durum korunur | "tick durumu bozmaz" |
| Bilinmeyen adres | read(99) | false | "bilinmeyen adres false döner" |

### `packages/simulators/src/control-panel-io/control-panel-io.test.ts` (8 test)

| Durum | Koşul | Beklenen | Test |
|:------|:------|:---------|:-----|
| Başlangıç | yeni örnek | kapılar kapalı, ışıklar sönük | "kapılar kapalı, ışıklar sönük başlar" |
| Kapı (batarya) | setDoorState | yalnızca batarya DI true | "setDoorState batarya kapısını açar" |
| Kapı (panel) | setDoorState | panel DI true | "setDoorState panel kapısını açar" |
| Işık AÇ | writeCoil(true) | readCoil true | "battery light AÇ" |
| Işık KAPAT | writeCoil(false) | readCoil false | "battery light KAPAT" |
| Bağımsızlık | iki ışık birlikte | birbirini etkilemez | "panel light bağımsız yönetilir" |
| Bilinmeyen DI | read(99) | false | "bilinmeyen DI adresi false döner" |
| Bilinmeyen COIL | write(99, true) | yazılmaz | "bilinmeyen coil adresi yazılmaz" |

### `packages/simulators/src/imd/imd.test.ts` (6 test)

| Durum | Koşul | Beklenen | Test |
|:------|:------|:---------|:-----|
| Başlangıç | tick(1) | Status bit0=1 | "başlangıçta sağlıklı" |
| Direnç | tick(1) | 950-1050 kΩ | "izolasyon direnci 1000 kΩ civarı" |
| Fault | setFault(true) + tick | bit1=2, bit0=0 | "setFault(true) → Status bit1" |
| Geri dönüş | setFault(false) + tick | bit0=1 | "setFault(false) → OK geri döner" |
| Direnç düşüşü | fault + tick | < 500 | "fault'ta direnç düşer" |
| Bilinmeyen adres | read(99) | 0 | "bilinmeyen adres 0 döner" |

### `services/device-service/src/simulator-registry.test.ts` (3 test — YENİ dosya)

| Durum | Koşul | Beklenen | Test |
|:------|:------|:---------|:-----|
| 4 yeni tip | createFromConfigs | transport üretilir | `it.each` 4 tip |
| Bilinmeyen tip | createFromConfigs | count 0 | "kayıtlı olmayan tip transport üretmez" |
| simulator dışı transport | kind=tcp | yok sayılır | "simulator olmayan transport config'i yok sayılır" |

### `services/device-service/src/config-loader.test.ts` (+WS1/WS2 assert'leri)

| Durum | Beklenen | Test |
|:------|:---------|:-----|
| Sanal cihaz config'leri | AUX-ANALYSER-1/FSS-1/CONTROL-PANEL-IO-1/IMD-1 yüklenir | "tüm cihaz config'lerini doğrular" |
| BSC global register'lar | 30264/30265 adresleri | "BSC global 30264/30265 config'te (WS2)" |

### `packages/platform/commands/src/command-job-builder.test.ts` (+3 test)

| Durum | Beklenen | Test |
|:------|:---------|:-----|
| allow job üretimi | Charge/Discharge Forbidden value 0 | "PCS allow komutları" |
| Gerçek config yükleme | pcs allow + bsc global + builder birlikte | "gerçek config" |

## KAPSANMAYAN boşluklar

| # | Boşluk | Not |
|:--|:-------|:----|
| B1 | Modbus adapter sınıflarının AYRI birim testleri yok (aux/fss/io/imd) | simülatör testleri adapter'ın delege ettiği davranışı kapsar; adapter şablonu (range okuma döngüleri) cb deseninden birebir kopyadır — simulators paketinin genel adapter boşluğu (envanter "kapsam dışı" listesi) |
| B2 | Gerçek gateway bağlantısı (tcp transport) testi | gerçek register map'ler gelince config testleri genişler (B-gerçek-map) |
| B3 | io-panel kapı→ışık OTOMATİK kuralı (FL-07) | doküman bekliyor — OTOMASYON §4.2 |
| B4 | Bitfield genişlemesinin cihaz servisi uçtan uca doğrulaması | mevcut bitfield kontratı pcs/wattox testleriyle sabit; yeni config'lerin bitfield alanları şemadan geçiyor (loader testi) |
