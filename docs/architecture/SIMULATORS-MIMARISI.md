---
status: active
space: architecture
tags: [mimari, simulators, modbus, sim-lab, spec]
review_date: 2026-11-10
---

# Simulators — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `MODBUS-MIMARISI.md` (cihaz kontratı), `DEVICE-SERVICE-MIMARISI.md` (tüketici), `DEPLOYMENT-MIMARISI.md` (sim-lab/EMS export).

## 1. Amaç ve Bağlam

`packages/simulators` paketinin sözleşmesi: kolaylık simülatörleri (self-host Modbus TCP), BSC-PCS connector, fiziksel saha simülatörü ve sim-lab servisi. Amaç: device-service'in gerçek cihazdan ayırt edemediği Modbus TCP sunucuları üretmek; fiziksel model tarafı ayrı evrilir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | `ISimulator`/`SimulatorHost`, self-host Modbus sunucu, cihaz aileleri, BSC-PCS güç linki, şebeke yolu, fiziksel model + sim-lab, EMS config export |
| hariç | Gerçek cihaz sürücüleri (`MODBUS`), device-service polling (`DEVICE-SERVICE`), UI (sim-lab arayüzü hariç) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | 1 simülatör = 1 self-host Modbus TCP sunucu; device-service saf TCP görür | "Simülatör" kavramı servise sızmaz |
| K2 | `jsmodbus` event modeli, buffer'sız; `writeProtected`/`readProtected` aralık dışı → exception `0x02` | Adapter'a geçersiz erişim gitmez |
| K3 | Wattox iki-bridge istisnası: `connection.port` (EMS) + `bmsPort` (BMS), her yüz kendi köprüsü | PCS BMS yüzü ayrı sunucu |
| K4 | Tick simülatörün içinde; ortak yaşam döngüsü `SimulatorServer` kompozisyonu, base class YOK | Yeni simülatör bağımsız modül |
| K5 | Config biçimi değişmez (`kind: "simulator"`); benzersiz statik portlar 15501-15504 | device-service config'i aynen çalışır |
| K6 | Connector sim-stack master'ıdır: TCP master (kaynak BSC + hedef PCS BMS); simülatörler `core`'a bağımlı OLMAZ | Katman ayrımı korunur |
| K7 | Yeni simülatör = modül + host'a 1 builder satırı + checklist | Genişleme noktası tek |
| K8 | Sanal IO ailesi: her fiziksel cihaz ayrı config + ayrı simülatör | Downstream `TelemetryData.deviceId` kullanır |
| K9 | PCS işaret konvansiyonu: şarj = negatif, deşarj = pozitif güç; canonical `charge_power_limit`/`discharge_power_limit` limit | Fiziksel işaret tutarlılığı |
| K10 | PCS→BSC güç linki: BSC'nin güç setpoint'i yoktur; dış güç girdisi (`IBatteryPowerInput`) ile SOC entegre edilir; SIM_ONLY register/setpoint silinir | Gerçek BSC semantiği |
| K11 | Şebeke yolu: `GridLinkBus` MV şalter pozisyonunu yayınlar; PCS de-enerjili davranır (istasyon başına 1 MV) | Şebeke senaryoları |
| K12 | Fiziksel saha simülatörü ayrı modeldir; kolaylık simülatörlerine dokunmaz ("anında uygula" sözleşmesi korunur) | Demo entegrasyon testleri bozulmaz |
| K13 | Site JSON'dan N Modbus sunucusu: tek süreçte yüzlerce sunucu (GD-1: 226), her cihaz ayrı port | Ölçek |
| K14 | Sim-Lab ayrı servistir (god mode): EMS yalnız Modbus TCP görür; Sim-Lab REST'i EMS'i çağırmaz; ortak `gd-simnet` ağı | Test müdahalesi izole |
| K15 | EMS export: `deployment/simlab/<site>/` config + compose overlay üretir; host/port değişir, `deviceId` korunur | Demo stack kurulumu |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `apps/sim-lab` içinde paket `physical` ile kopya modeller var; `main.ts` paket sürümünü kullanıyor, kopyalar `plant.test.ts` zincirinde | `apps/sim-lab/src/{models,faces,link,faults,scenarios,modbus}` |
| B2 | `SIMULATOR-SERVISI-MIMARISI` ✏️ Specified iken sim-lab uygulaması mevcut — onay/uygulama sapması | `docs/architecture/SIMULATOR-SERVISI-MIMARISI.md` |
| B3 | Fiziksel saha yalnız 3 test dosyasıyla kanıtlı | `packages/simulators/src/physical/` |

## 4. Mimari

```text
SimulatorHost ──► SimulatorServer (self-host Modbus TCP)
                    ├ cihaz aileleri (BSC, HVAC, CB, DC, IMD, FSS, ...)
                    ├ ModbusServerBridge (FC seti + koruma)
                    └ connector (BSC→PCS BMS güç linki)

Fiziksel saha ──► Plant (site JSON) ──► LabServer (N sunucu) ──► sim-lab (god mode)
                     └ EMS export (deployment/simlab/<site>/)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/simulators/src/contracts.ts#ISimulator` | Simülatör kontratı |
| `packages/simulators/src/host.ts#SimulatorHost` | Host kompozisyonu |
| `packages/simulators/src/server/simulator-server.ts#SimulatorServer` | Modbus TCP sunucu |
| `packages/simulators/src/server/modbus-server-bridge.ts#ModbusServerBridge` | FC köprüsü + koruma |
| `packages/simulators/src/bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter` | Güç linki |
| `packages/simulators/src/grid-link/bus.ts#GridLinkBus` | MV şalter yayını |
| `packages/simulators/src/physical/site/plant.ts#Plant` | Fiziksel model |
| `packages/simulators/src/physical/modbus/lab-server.ts#LabServer` | N sunucu |

## 5. Purity Kuralları (ZORUNLU)

1. Simülatörler `core`'a bağımlı olmaz; `shared-types` + `jsmodbus` + `result` yeterli (K6).
2. "Simülatör" kavramı device-service'e sızmaz — config `kind: "simulator"` dışında iz yok (K1/K5).
3. Fiziksel model kolaylık simülatörlerine dokunmaz (K12).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Simülatör Host + Self-Host Modbus

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `SimulatorHost` kompozisyonu, port yönetimi, Modbus FC seti + koruma
- hariç: cihaz ailelerinin iç modelleri (UC-2)

**Akış:**
1. Config'ten simülatör listesi çözülür.
2. Her simülatör `SimulatorServer` ile kendi portunda açılır.
3. Koruma dışı erişim `0x02` ile reddedilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Her simülatör tek portta self-host Modbus TCP sunar | AK-1.1 |
| FR-1.2 | Koruma dışı okuma/yazma `0x02` exception döner | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** iki simülatör config'i **WHEN** host başlar **THEN** her biri ayrı portta dinler
2. **AK-1.2 — GIVEN** koruma dışı register **WHEN** istemci yazar **THEN** `0x02` döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Port izolasyonu | unit (`host.test.ts`) | ⬜ |
| AK-1.2 | Koruma | unit (`modbus-server-bridge.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Port çakışması | Host hata verir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/simulators/src/host.ts` | Host |
| `packages/simulators/src/server/**` | Sunucu |

### 6.2 UC-2 — Kolaylık Simülatörleri (Cihaz Aileleri)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: BSC/HVAC/CB/DC/IMD/FSS/Wattox/Xrack aileleri, register map + adapter, sanal IO
- hariç: fiziksel model (UC-4)

**Akış:**
1. Cihaz tipi builder'a çözülür.
2. Register map + adapter yüklenir.
3. Tick iç modeli günceller; Modbus okuması yansıtır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Her cihaz ailesi kendi register map + adapter ile temsil edilir | AK-2.1 |
| FR-2.2 | Yeni simülatör yalnız modül + builder satırıyla eklenir | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** BSC simülatörü **WHEN** register okunur **THEN** adapter modeli doğru değeri döner
2. **AK-2.2 — GIVEN** yeni cihaz ailesi **WHEN** eklenir **THEN** mevcut aileler değişmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Aile sözleşmesi | unit (`bsc-simulator.test.ts` vb.) | ⬜ |
| AK-2.2 | Genişleme | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen cihaz tipi | Builder yok → hata |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/simulators/src/{bsc,hvac,cb,dc-*,energy-analyzer,wattox-pcs,xrack,imd,fss,control-panel-io}/**` | Aileler |

### 6.3 UC-3 — BSC-PCS Connector + Güç Linki

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: TCP master, kaynak BSC okuma, hedef PCS BMS yazma, güç linki, şebeke yolu
- hariç: BSC iç modeli (UC-2)

**Akış:**
1. Connector kaynak BSC'den güç okur.
2. Hedef PCS BMS'e yazar.
3. `GridLinkBus` MV şalter pozisyonunu yayınlar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Connector kaynak→hedef akışını yönetir; simülatörler core'a bağımlı olmaz | AK-3.1 |
| FR-3.2 | PCS işaret konvansiyonu (şarj negatif) korunur | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** connector config **WHEN** çalışır **THEN** kaynak BSC gücü hedef PCS'e yazılır
2. **AK-3.2 — GIVEN** şarj durumu **WHEN** güç raporlanır **THEN** değer negatiftir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Connector akışı | unit (`bsc-pcs-connector/*`) | ⬜ |
| AK-3.2 | İşaret | unit (`wattox-pcs`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Hedef erişilemez | Connector yeniden dener |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/simulators/src/bsc-pcs-connector/**` | Connector |
| `packages/simulators/src/grid-link/**` | Şebeke yolu |

### 6.4 UC-4 — Fiziksel Saha Simülatörü + Sim-Lab

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `Plant` modeli, arıza/senaryo motoru, N sunucu, sim-lab REST/god mode
- hariç: kolaylık simülatörleri (UC-2)

**Akış:**
1. Site JSON `Plant`'a genişletilir.
2. `LabServer` cihaz başına port açar.
3. sim-lab REST ile arıza/senaryo enjekte edilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Site JSON'dan N Modbus sunucusu tek süreçte açılır | AK-4.1 |
| FR-4.2 | Fiziksel model kolaylık simülatörlerini etkilemez | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** 10 cihazlı site **WHEN** lab başlar **THEN** 10 port açılır
2. **AK-4.2 — GIVEN** fiziksel model değişikliği **WHEN** kolaylık simülatörü koşar **THEN** davranışı aynıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | N sunucu | unit (`plant.test.ts`) | ⬜ |
| AK-4.2 | İzolasyon | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| sim-lab kopya modelleri (B1) | A1 kararı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/simulators/src/physical/**` | Fiziksel model |
| `apps/sim-lab/**` | God mode servisi |

### 6.5 UC-5 — EMS Config Export

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `exportEmsConfigs`, deployment/simlab çıktısı, compose overlay
- hariç: deployment orkestrasyonu (DEPLOYMENT)

**Akış:**
1. Site spec'ten EMS config'leri üretilir.
2. `deployment/simlab/<site>/` altına yazılır; `deviceId` korunur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Export host/port'u değiştirir, `deviceId`'yi korur | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** site spec **WHEN** export koşar **THEN** config'ler doğru portlarla yazılır, `deviceId` sabit kalır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Export | unit (`plant.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Hedef dizin yok | Oluşturulur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/simulators/src/physical/site/ems-export.ts` | Export |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Port çakışması | Host hatası |
| Koruma dışı erişim | `0x02` |
| Hedef PCS erişilemez | Connector retry |
| Fiziksel model hatası | Kolaylık simülatörlerini etkilemez |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Host/port izolasyonu testli | komut |
| SC-2 | Fiziksel model izolasyonu korunur | kod inceleme |
| SC-3 | EMS export çalışır | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 25 test dosyası kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `SIMULATORS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | sim-lab yerel kopya modellerin kaldırılması (B1) | İleri İş (legacy temizliği) |
| A2 | `SIMULATOR-SERVISI-MIMARISI` onay/uygulama sapmasının kapatılması (B2) | Bu SPEC ile kapanır |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. sim-lab kopya modellerin pakete delege edilmesi (A1).
2. Fiziksel saha test kapsamının genişletilmesi (B3).

## 12. T Görev Özeti

| T-1 | UC-1 (host/Modbus) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (cihaz aileleri) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (connector/güç linki) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (fiziksel saha/sim-lab) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (EMS export) kanıt testinin eşleştirilmesi |
