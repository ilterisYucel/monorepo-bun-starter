---
status: active
space: architecture
tags: [mimari, simulatör, sanal-cihaz, modbus, gateway, aux, fss, io, imd, spec]
review_date: 2026-09-16
---

# Sanal IO Cihaz Ailesi — Mimari Tasarım (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Kaynak:** [KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md](./KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md) §4 eksikler envanteri (4.1, 4.2, 4.7, FL-11) + [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md) §6 veri boşlukları (G-2, G-6).
> **Karar (2026-09-16):** Eksik cihazların TÜMÜ sahada analog/dijital I/O üzerinden Modbus gateway ile bağlanacak. Kod tarafında her fiziksel cihaza **ayrı sanal config + ayrı simülatör** üretilir (tek config + device_id tag yaklaşımı REDDEDİLDİ — downstream boru hattı üst seviye `TelemetryData.deviceId` kullanır). Demo register map'leri bu dokümandadır; gerçek Modbus map'leri geldiğinde YALNIZCA config/register-map güncellenir, kod değişmez.
> **Kapsam dışı:** HVAC dehumid komutu (enerji mühendislerine soru — NOT düşüldü), TelemetryTagger değişikliği (ayrı iş).

---

## 1. Mimari Konum

```
saha cihazları (AUX panel, FSS paneli, kapı kontaktı, ışık DO, IMD)
        │  analog/dijital I/O kablolama
        │
MODBUS GATEWAY (tek ünite; her cihaz ayrı register aralığı/unit)
        │  TCP Modbus
        │
device-service (konteyner tier)
   ├── aux-analyser-1.json      (transport: simulator — demo)
   ├── fss-1.json
   ├── control-panel-io-1.json
   └── imd-1.json
        │
  telemetri/komut/alarım — standart boru hattı (TelemetryTagger → BullMQ →
  data-service → TimescaleDB; komutlar COMMAND_DEVICE job → ModbusDevice.write)
```

- **Katman:** Konteyner app cihazlarıdır (FL-02/07/11 + FL-01/06 önkoşulları konteyner manevralarında kullanılır); simülatörler `packages/simulators/`'da (jenerik), config'ler `services/device-service/config/` + `deployment/config-docker/`'da (product).
- **Ayrı config gerekçesi:** Cihaz listesi, alarm dedup (`device_id, alarm_name` PK), RealtimeSnapshotSource, DB yazımı — hepsi üst seviye `deviceId` ile çalışır. Her fiziksel cihaz kendi `deviceId`'sine sahip olmalı.
- **Demo → üretim geçişi:** Config'te `transport.kind` değişir (`simulator` → `tcp`), `connection.host/port/slaveId` gerçek gateway'e, register adresleri gerçek map'e güncellenir. `SimulatorRegistry` kayıtları üretimde pasif kalır (yalnızca `transport.kind === "simulator"` config'leri etkiler).

## 2. Cihaz Sözleşmeleri (demo register map)

### 2.1 AUX Analyser (`aux-analyser`) — FL-02 AUX Kaybı

Enerji durumu okuması (matrix: "Energy Status"). Yalnızca telemetri — komut YOK.

| Tür | Adres | İsim | Veri tipi | Ölçek | Anlam |
|:----|:------|:-----|:----------|:------|:------|
| INPUT | 0 | Aux Voltage | UINT16 | 0.1 | 230.0 V civarı |
| INPUT | 1 | Aux Current | UINT16 | 0.1 | A |
| INPUT | 2 | Aux Frequency | UINT16 | 0.01 | 50.00 Hz civarı |
| INPUT | 3 | Energy Status | UINT16 bitfield | — | bit0: AUX OK · bit1: AUX Loss (aktif=1) |

Simülatör davranışı: başlangıç AUX OK (status=1); normal çalışmada voltaj/frekans küçük jitter ile nominal. Alarm senaryosu (demo): `energyLossMs` konfig edilebilir mi? → HAYIR — YAGNI; demo'da durum sabittir, gerçek cihaz verisi sahada üretir. `alarms` config'i: `Energy Status` bit1 aktif → error (gerçek cihazda).

### 2.2 FSS (`fss`) — Yangın Söndürme Sistemi (FL-01/FL-06 önkoşulu)

Availability/durum sinyalleri (kuru kontak → DI). Komut YOK.

| Tür | Adres | İsim | Veri tipi | Anlam |
|:----|:------|:-----|:----------|:------|
| DISCRETE | 0 | System OK | BOOLEAN | true = sağlıklı |
| DISCRETE | 1 | Fault | BOOLEAN | true = arıza |
| DISCRETE | 2 | Discharged | BOOLEAN | true = söndürme aktive edildi |

Simülatör: başlangıç OK; FL-01/FL-06 önkoşulu `System OK === true` olarak okunur. `alarms`: `Fault` → error.

### 2.3 Control Panel IO (`control-panel-io`) — FL-07 Kapı + Işık

Kapı kontaktları (DI → telemetri) + ışık röleleri (DO/COIL → komut).

| Tür | Adres | İsim | Anlam |
|:----|:------|:-----|:------|
| DISCRETE | 0 | Battery Door Open | true = açık |
| DISCRETE | 1 | Panel Door Open | true = açık |
| COIL | 0 | Battery Room Light | write true = ışık AÇ |
| COIL | 1 | Panel Room Light | write true = ışık AÇ |

Komutlar (config `commands` — COIL yazımı + DISCRETE read-back doğrulama):

| Komut | Yazım | validate.reads |
|:------|:------|:---------------|
| `battery_light_on` | Battery Room Light = true | — |
| `battery_light_off` | Battery Room Light = false | — |
| `panel_light_on` | Panel Room Light = true | — |
| `panel_light_off` | Panel Room Light = false | — |

Simülatör: kapı state'leri constructor'da kapalı; COIL write → state tutulur (read back edilir); kapı state'i demo'da sabittir (kapı açma simülasyonu dışarıdan `setDoorState` ile test edilebilir — test API'si, üretim API'si değil). `alarms`: kapı açık → warning (`activeLow` yok; DOOR OPEN telemetrisi true iken aktif).

### 2.4 IMD (`imd`) — İzolasyon İzleme (FL-11)

| Tür | Adres | İsim | Veri tipi | Ölçek | Anlam |
|:----|:------|:-----|:----------|:------|:------|
| INPUT | 0 | Insulation Resistance | UINT16 | 1 | kΩ (demo: 1000) |
| INPUT | 1 | IMD Status | UINT16 bitfield | — | bit0: OK · bit1: Fault · bit2: Comm Lost |

Komut YOK. `alarms`: `IMD Status` bit1/bit2 → error.

## 3. Simülatör Modül Deseni (4 modül, aynı şablon)

Her cihaz `packages/simulators/src/<tip>/` altında:

```
<tip>/
  register-map.ts          # adres sabitleri (COILS/DISCRETE/INPUT/HOLDING)
  <tip>-simulator.ts       # saf durum makinesi (tick/read/write)
  <tip>-modbus-adapter.ts  # IModbusSimulatorAdapter implementasyonu
  index.ts                 # barrel
  <tip>.test.ts            # register doğruluk + tick + komut testleri
```

Kurallar:
- Simülatör sınıfı cb/dc-output deseni: `tick(elapsedSeconds)` + register okuyucu/yazıcı metodlar; adapter birebir delege.
- `SimulatorRegistry.registerDefaults()`'a 4 kayıt eklenir (simulator-registry.ts) — config `transport.type` ile eşleşir.
- Elegant Object: komutlar `void`, sorgular isim; constructor argüman doğrulaması; state `private`.
- Jenerik paket: GD-PMS'ye özgü davranış YOK (yalnızca register sözleşmeleri — gerçek cihaz dokümanlarından türetilen map'ler config'te yaşar).

## 4. Config Deseni (ayrı config per cihaz)

- `services/device-service/config/{aux-analyser-1,fss-1,control-panel-io-1,imd-1}.json` + `deployment/config-docker/` kopyaları (compose zaten config-docker'ı mount eder — compose değişikliği YOK).
- `transport: { kind: "simulator", type: "<tip>" }` (demo); `connection` gerçek gateway parametreleri için hazır.
- `alarms` bölümleri §2'deki gibi (Faz 0 alarm sözleşmesi: tek kaynak config).
- deviceId'ler: `AUX-ANALYSER-1`, `FSS-1`, `CONTROL-PANEL-IO-1`, `IMD-1` (büyük harf — mevcut konvansiyon).

## 5. Kabul Kriterleri

| Kod | Kriter |
|:----|:-------|
| K-S1 | 4 config `nx run device-service:test` kapsamında zod-valid; config-loader yükler |
| K-S2 | 4 simülatör `SimulatorRegistry` üzerinden transport üretir (device-service testi) |
| K-S3 | Register doğruluk testleri: her adres → beklenen değer; yazma → okuma yansıması |
| K-S4 | io-panel komutları COIL yazıp read-back doğrular (ModbusDevice.write üzerinden) |
| K-S5 | Alarm konfigleri: dedup geçiş-odaklı (yalnızca kenar loglar) |
| K-S6 | Kapılar: yeni kod ≥%70 satır; io-panel komut yolu ≥%90 branch; monorepo test yeşil |

## 6. Görev Listesi

| Görev | İçerik |
|:------|:-------|
| T-S1 | JSDoc + register-map arayüzleri (4 modül) |
| T-S2 | TEST (kırmızı): 4 simülatör + adapter + registry kayıt testleri |
| T-S3 | IMPL: 4 simülatör modülü + SimulatorRegistry kayıtları |
| T-S4 | IMPL: 4 config (dev + config-docker) |
| T-S5 | DOGRULAMA + TEST-KAPSAMI + test-envanteri |

## 7. Aşama Eşlemesi

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-S1 |
| 3. TEST | T-S2 (kırmızı) |
| 4. IMPL | T-S3, T-S4 |
| 5. SONUÇ | `SANAL-IO-CIHAZ-AILESI-DOGRULAMA.md` |
| 6. KAPSAM | `SANAL-IO-CIHAZ-AILESI-TEST-KAPSAMI.md` + `docs/roadmap/test-envanteri.md` |

## 8. Açık Sorular (mühendis ekibi)

| # | Soru | Etki |
|:--|:-----|:-----|
| V1 | AUX Analyser gerçek register map (Energy Status bit düzeni) | FL-02 kuralı |
| V2 | FSS panel sinyal listesi (OK/fault/discharged yeterli mi?) | FL-01/06 önkoşulu |
| V3 | Control Panel IO: kapı kontakt adresleri + ışık DO adresleri; başka DO var mı? | FL-07 |
| V4 | IMD register map + eşik değeri ("ideal izolasyon değeri") | FL-11 |
| V5 | HVAC dehumid komut register'ı (NOT — ayrı soru) | FL-05 nem kontrolü |
