---
status: active
space: architecture
tags: [mimari, device-service, simulator, connector, alarm, log, refactor, spec]
review_date: 2026-12-01
---

# Device Service — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 Doğrulanmış (2026-10-05) — T-1…T-20 tamam, doğrulama DEVICE-SERVICE-KAPANIS.md'de.
> **REV.01 (2026-10-05):** `rackCount` top-level alanı KALDIRILDI — cihaz-spesifik opsiyonel
> nitelikler `DeviceConfigFile.details` (opak `Record<string, unknown>`) altına taşındı.
> device-service/web-service `details`'i YORUMLAMAZ, yalnız taşır (decoupled); yorum tüketicide
> (ön yüz `rackCountOf` + simülatör BSC builder). K5/K6 + UC-1 FR-1.3/AK-1.3/T-3..T-5 revize edildi.
> **İlişkili:** [SIMULATOR-MIMARISI.md](./SIMULATOR-MIMARISI.md) (self-host simülatör sunucuları + host — bu SPEC'in bağımlı eki), [LOGGER-MIMARISI.md](./LOGGER-MIMARISI.md) (operasyonel log kanalı — UC-6 ilk tüketici), [PCS-WATTOX-MIMARISI.md](./PCS-WATTOX-MIMARISI.md) (Wattox register seti), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (T0.11/Faz 0 alarm sözleşmesi + log kategorileri §522), [FAZ5-OZET-VE-BAGLANTI-ANATOMISI.md](./FAZ5-OZET-VE-BAGLANTI-ANATOMISI.md) (event yayılım zinciri), [SANAL-IO-CIHAZ-AILESI-MIMARISI.md](./SANAL-IO-CIHAZ-AILESI-MIMARISI.md) (simülatör aile deseni), [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](./KOMUT-MANEVRA-OPERASYON-MIMARISI.md) (komut kanalı).
> **Yerine geçtiği dokümanlar (silindi — 2026-10-05):** DEVICE-SERVICE-TRANSPORT-MIMARISI.md, BSC-PCS-CONNECTOR-MIMARISI/DOGRULAMA/TEST-KAPSAMI (+PDF) — transport ve connector içerikleri bu dokümana emildi; kanıtlar DEVICE-SERVICE-KAPANIS.md'de özetlendi.

---

## 1. Amaç ve Bağlam

**device-service nedir:** `IDevice` sözleşmesini implemente eden cihaz sınıflarını yöneten **capability** servisidir (3 katman modeli). Cihazları poll eder, gerekli downstream job'ları üretir (`WRITE_TELEMETRY` → data-service, `MANAGEMENT` → management-service, `WS_BROADCAST` → web-service realtime), gelen `COMMAND_DEVICE` job'larını cihazlara iletir, cihaz kayıtlarını `devices` tablosunda tutar ve config kaynaklı alarmları değerlendirip TamperLogger ile imzalı loglar.

**Mevcut sorun (refactor gerekçesi):**

1. **`SimulatorRegistry`** — test için üretilen formasyonun implementasyon katmanına çekilmiş hali: iki fazlı init (`new` → `createFromConfigs`), ölü `register()`/`count()` API'leri, sınıf içi `adapters` map'i, `DeviceService`'e set edilip hiç okunmayan field. Config-based services yaklaşımını perdeliyor.
2. **Connector ayrı config cihazı** — `bsc-pcs-connector-1.json` ayrı duruyor; oysa connector BSC'nin varlığından türeyen bir oluşumdur, BSC config'inin bölümü olmalı.
3. **TimescaleSink gap (BUG)** — `run.ts#buildLogger` field tier defaults'taki `timescale` sink'ini üretmiyor → device-service alarm geçişleri `log_events`'e yazılmıyor → field relay'i (web-service `UplinkEventRelay`) kör → boss bildirimi tetiklenmiyor.
4. **console.log/warn salatası** — TamperLogger varken operasyonel yollar hâlâ `console.*` kullanıyor.
5. **rackCount çift kaynak** — config'te top-level + `transport.rackCount` iki kez yazılı; web-service `DeviceRegistry` taşıdığı halde kullanmıyor.
6. **In-process simulator yolu** — `SimulatorTransport`/adapter deseni üretimden ayrı ikinci bir cihaz yolu üretiyor; simülatörler self-host Modbus server olur (SIMULATOR-MIMARISI K2), device-service saf TCP'ye iner.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| device-service | Registry kaldırma, simulator dalı çekimi (yalnız TCP/RTU), connector device-subset türetimi, log sözleşmesi, TimescaleSink, rackCount tek kaynak | — |
| packages/simulators | — | Self-host Modbus server'lar + host + connector master (SIMULATOR-MIMARISI kapsamı — bu SPEC DIŞI) |
| shared-types | `ConnectorConfig` + `connector?` şeması; top-level `rackCount` kaldırılır, `details` opak alan eklenir | IDevice kontrat değişikliği (İleri İş §11) |
| web-service | `device-routes` SELECT `details` (opak geçir) | Relay, bildirim, alarm resolve akışı |
| container-web | `DEFAULT_RACK_COUNT` sabiti | Rack grafik mantığı |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-09-24)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `SimulatorRegistry` sınıfı KALDIRILIR ve simulator dalı device-service'ten TAMAMEN çekilir — transport üretimi yalnız TCP/RTU; simülatör örnekleme/yaşam döngüsü `packages/simulators`'ta (SIMULATOR-MIMARISI K2/K4) | UC-5; yeni simülatör = modül + SimulatorHost'a 1 kayıt (SIMULATOR-MIMARISI) |
| K2 | Connector config BSC config'inin `connector` bölümüdür; simulator ise ve bölüm varsa connector cihaz entry'si türetilir — 1. sınıf cihaz kalır (kendi telemetrisi + devices kaydı) | UC-5; `bsc-pcs-connector-1.json` silinir |
| K3 | Alarm olay akışı: device-service geçişleri imzalı `LogEvent` olarak kendi TimescaleSink'iyle `log_events`'e yazar; yayılım mevcut zincirde kalır (web-service `UplinkEventRelay` → boss bildirim) | UC-4; MQ event rotası A1 açık kararı |
| K4 | **İki log kanalı:** operasyonel/bilgi logları `@gd-monorepo/logger` (`Logger \| undefined` — yoksa eski console davranışı birebir fallback); audit/alarm/security geçişleri imzalı TamperLogger'da (fail-closed, zorunlu) | UC-6 |
| K5 | Cihaz-spesifik opsiyonel nitelikler (örn. rackCount) top-level DEĞİL — `DeviceConfigFile.details` (opak `Record<string, unknown>`, REV.01) altında; `DeviceTransportConfig.rackCount` ve top-level `rackCount` şemada YOKTUR | UC-1 |
| K6 | `details` DECOUPLED taşınır: device-service/web-service yorumlamaz; web-service SELECT `details`'i opak geçirir, container-web `rackCountOf` accessor + `DEFAULT_RACK_COUNT` fallback, simülatör BSC builder `details?.rackCount` (default 8) | UC-1 |
| K7 | Log kategorileri kanonik (KONTEYNER-UZAKTAN-ERISIM-MIMARISI §522) — **TamperLogger kanalı:** `audit` = komut geçişleri (fail-closed), `security` = geçersiz istek (`request_rejected`), `app` = alarm. Operasyonel/bilgi logları TamperLogger'a GİTMEZ; `@gd-monorepo/logger` kanalına aittir (K4, LOGGER-MIMARISI) | UC-6 |
| K8 | device-service simulator BİLMEZ: `kind` dallanması ve simulator import'u YOK — tüm cihazlar `connection` üzerinden TCP/RTU; `kind:"simulator"` şema alanı KALIR ama yalnız SimulatorHost'un sinyalidir (SIMULATOR-MIMARISI K7) | UC-5 |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | TimescaleSink dalı yok — field tier alarm geçişleri `log_events`'e yazılmıyor (BUG) | `services/device-service/run.ts#buildLogger` (yalnızca console+file; karşılaştır: `services/data-service/run.ts#buildLogger`) |
| B2 | `request_rejected` kategorisi "app" — kanonik §522 "security" der | `services/device-service/src/device-service.ts#logOrWarn` |
| B3 | Koşulsuz `console.*` — TamperLogger varken operasyonel yollar konsolda | `device-service.ts#start`/`#stop`/`#executeCommand`, `device-scheduler.ts#publishTelemetry`, `config-loader.ts#load`, `simulator-registry.ts#createFromConfigs` |
| B4 | `simulators` field'ı set edilip hiç okunmuyor (spekülatif enjeksiyon) | `device-service.ts#DeviceService` |
| B5 | Constructor'a anonim inline tip — `DeviceEntry` ile birebir aynı | `device-service.ts#DeviceService` |
| B6 | İki fazlı init (`new` → `createFromConfigs`) + ölü `register()`/`count()` API'leri (sıfır çağıran) | `simulator-registry.ts#SimulatorRegistry` |
| B7 | `IDevice.read(telemetries?)` parametresi — hiçbir çağıran argüman geçirmiyor | `packages/shared-types/src/device-interface.ts#IDevice` |
| B8 | T0.7 (`DomainError` + `onFailed`) device-service'te yok — hata yolları ham catch | KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md T0.7 (sapma — A5) |
| B9 | rackCount çift yazım — top-level + `transport.rackCount` aynı config'te | `services/device-service/deployment/sample-config/bsc-1.json` (ikisi de 8) |
| B10 | In-process `SimulatorTransport` deseni — gerçek TCP yolu bypass (iki ayrı cihaz yolu) | `packages/simulators/src/simulator-transport.ts#SimulatorTransport` |
| B11 | `bmsTarget` deployment env'i registry'ye sızıyor (deployment-bazlı hedef bilgisi kodda) | `services/device-service/src/simulator-registry.ts#SimulatorRegistry` |

---

## 4. Mimari

### 4.1 Bileşen akışı

```
config dosyaları (configDir)
   │  DeviceConfigLoader (schema + log)
   ▼
DeviceFactory.createAll(config)  ──►  DeviceEntry[]
   │   protocol: MODBUS | CANBUS(stub) | MQTT(stub)
   │   transport: tcp (default) | rtu | simulator (private switch — K1)
   │   config.connector + simulator  →  +1 connector DeviceEntry (K2)
   ▼
DeviceService
   ├── poll (READ_DEVICE repeatable, saniye grid'i) → read() → TelemetryTagger → publish
   ├── COMMAND_DEVICE → write/writeAtomic → validate read-back → audit
   ├── alarm değerlendirmesi → device_alarms tablosu + TamperLogger → TimescaleSink → log_events
   ├── devices tablosu (UPSERT, status, `details` JSONB)
   └── DeviceScheduler (repeatable job'lar, management job)
```

### 4.2 Alarm olay akışı (K3)

```
poll → read → AlarmTransitionDetector (dedup — yalnız kenarlar)
   ├── device_alarms durum tablosu (local PostgresAdapter — resolve web-service'te)
   └── TamperLogger.log (device_alarm / device_alarm_cleared — imzalı)
          └── TimescaleSink → log_events   ← B1 kapatılır (run.ts)
                 └── web-service UplinkEventRelay (whitelist) → tunnel "event" frame
                        └── boss field-event-collector → /api/notifications
```

Yayılım device-service'in işi DEĞİLDİR — üreticidir; relay/bildirim web-service/boss'ta (FAZ5 zinciri değişmez).

### 4.3 Transport sözleşmeleri (emilen içerik)

| Sözleşme | Konum | Sorumluluk |
|:---------|:------|:-----------|
| `IDevice` | `shared-types/src/device-interface.ts` | `connect/disconnect/read/write/writeAtomic?` — device-service'in gördüğü TEK kontrat |
| `IModbusTransport` | `packages/core/src/modbus/transport/` | `connect/disconnect/reconnect/isConnected` + register/coil/discrete okuma-yazma |
| `IModbusClient` | `packages/core/src/modbus/interface.ts` | Gerçek Modbus istemcileri (TCP/RTU) |
| `IModbusSimulatorAdapter` | `shared-types/src/modbus/adapter.ts` | Simülatörün register portu (yaşam döngüsü YOK — `SimulatorTransport` ekler) |

- `ModbusDevice` gerçek/simüle cihaz için **aynı sınıftır**; fark yalnızca enjekte edilen transport'ta. `isSimulator` dallanması YASAKTIR.
- `SimulatorTransport` tick yaşam döngüsünü kendi içinde taşır (`connect` başlatır, `disconnect` durdurur + opsiyonel `onDisconnect` — örn. BMS port kapatma). `forceTick` yoktur; komut yazımları simülatörde anında etkilidir (validate read-back tick beklemez).
- `config.type` üst seviyede zorunludur (üretimde transport "simulator" olmayabilir).

### 4.4 Yeni simülatör ekleme rehberi (K1 sonrası)

1. `packages/simulators/src/<tip>/`: `register-map.ts`, `<tip>-simulator.ts`, `<tip>-modbus-adapter.ts`, `index.ts`, `<tip>.test.ts`
2. `packages/simulators/src/index.ts` export
3. `device-service/src/device-factory.ts` → `buildSimulatorTransport` switch'ine **1 kayıt satırı**
4. Config: `"transport": { "kind": "simulator", "type": "<tip>" }` + üst seviye `"type"`
5. Test: simülatör domain testi + `device-factory.test.ts` transport üretim testi

### 4.5 Connector (K2 — emilen içerik)

- **Ne yapar:** BSC→PCS linkinin simülasyonudur — TCP master olarak kaynak BSC server'ından register okur → dönüşüm (`ratio/offset/bit`) → PCS'in BMS portuna Modbus TCP ile yazar; kendi server portunda izleme register'larını yayınlar. Tüm bu davranış **sim-stack tarafındadır** (SIMULATOR-MIMARISI UC-4); device-service connector'ı diğer cihazlardan FARKSIZ bir MODBUS cihaz olarak görür.
- **Config (`config.connector`) — ikiye bölünür:**
  - **device-subset** (device-service okur): türetilen cihazın `deviceId`/`name`/`type`/`pollIntervalMs`/`telemetry` (8 izleme register'ı: link, kaynak durumu, son yazım lo/hi, yazım sayacı lo/hi, hata sayacı lo/hi) + `connection` (kendi server'ının TCP adresi).
  - **sim-subset** (yalnız SimulatorHost okur — SIMULATOR-MIMARISI K4/K6): `registerMap` (zorunlu), mapping `target`, `intervalMs`.
  - Eski `transport.type: "bsc-pcs-connector"` girdisi ölür.
- **Mapping (`bsc-pcs-mapping.json` — kanonik):** `target` + `intervalMs` + `mappings[]` (`kind: register|constant|bit`). B01-B23 eşlemesi: B01 durum (BSC State), B02 bit türetme, B03-B04 voltaj/akım (1000/100), B05-B06 SOC/SOH (10), B07-B10 limit/akım (100), B11-B16 hücre ekstremleri, B17-B18 voltaj limitleri, B19-B20 enerji, B21 sabit (`constant`), B22 SOP, B23 DC durumu. Tam satır adres/ratio tablosu mapping dosyasındadır.
- **Hedef override:** `bmsTarget` (env `PCS_BMS_TARGET_HOST/PORT`) → SimulatorHost option'ı (SIMULATOR-MIMARISI K6) — device-service'e ULAŞMAZ.
- **Hata davranışı (sim tarafı):** mapping geçersiz → fail-fast; kaynak server kapalı → o mapping satırı atlanır (kademeli bozulma); BMS kopuk → her tick'te retry + link=0; BMS bloğu dışı yazım → exception 0x02 → hata sayacı. Komut yazılmaz (register'lar RO).

---

## 5. Purity Kuralları (ZORUNLU)

1. `packages/core` jeneriktir — simulator/connector kavramı GİRMEZ.
2. Simülatör domain davranışı + sunucu yaşam döngüsü yalnızca `packages/simulators`'ta (SIMULATOR-MIMARISI); device-service simulator KELİMESİNİ bilmez — yalnız `run.ts` SimulatorHost'u başlatır/durdurur (platform import'u).
3. device-service `IDevice`'tan başka cihaz kontratı görmez — Modbus/CAN/MQTT farkı DeviceFactory'de kapanır.
4. Alarm kaynağı YALNIZCA config `alarms[]` (AGENTS cihaz alarm sözleşmesi korunur); telemetri alarm metadata'sı TAŞIMAZ; dedup geçiş-odaklıdır.
5. Telemetri tag'lerinin tek sahibi `TelemetryTagger`'dır — config `device_id/container_id/field_id` taşımaz.
6. Event yayılımı device-service'te değildir — `log_events` + web-service relay zinciri (FAZ5) değişmez.
7. Connector/tünel protokolleri bu özellik için GENİŞLEMEZ.
8. `DeviceFactory`/`DeviceService` kaynak kodunda `kind === "simulator"` dallanması ve simulator import'u YOKTUR (K8).

---

## 6. Use Case'ler

### 6.1 UC-1 — Cihaz Yaşam Döngüsü ve Kayıt

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: config yükleme → entry üretimi → connect/disconnect → `devices` tablosu kaydı (UPSERT, status geçişleri, `details` passthrough)
- hariç: poll içeriği (UC-2), alarm (UC-4), transport üretimi (UC-5)

**Akış:**
1. `fromConfigDir` config'leri yükler (bağıl yol çözümü sim-subset'lerde SimulatorHost'un işidir — SIMULATOR-MIMARISI)
2. `DeviceFactory.createAll` entry'leri üretir (connector device-subset varsa 2 entry)
3. `start()` → tüm cihazlar `connect` (allSettled — kısmi başarı kesmez) → `devices` UPSERT → repeatable okuma planı
4. Okuma başarısı → `status='offline'`; başarı → `status='online'` (geçiş-odaklı)
5. `stop()` → hepsi offline işaretlenir + `disconnect` + scheduler kapatılır

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Config dizininden cihaz entry'leri üretilir; `connector` bölümlü simulator config 2 entry döner | AK-1.1 |
| FR-1.2 | `start()` tüm cihazları connect eder; kısmi başarısızlık başlatmayı KESMEZ | AK-1.2 |
| FR-1.3 | Her cihaz `devices` tablosuna UPSERT edilir; `details` opak JSONB olarak taşınır (device-service yorumlamaz) | AK-1.3 |
| FR-1.4 | `stop()`/okuma hatası `status='offline'`, başarılı okuma `status='online'` işaretler | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** connector bölümlü bir simulator config **WHEN** `fromConfigDir` çalışır **THEN** cihaz listesi BSC + Connector olmak üzere 2 entry içerir
2. **AK-1.2 — GIVEN** bir cihazın connect'i hata döner **WHEN** `start()` çağrılır **THEN** diğer cihazlar bağlanır, uyarı loglanır, servis açılışı tamamlanır
3. **AK-1.3 — GIVEN** config'te `details: { rackCount: 8 }` tanımlı **WHEN** UPSERT çalışır **THEN** `devices.details` bu objeyi alır; top-level `rackCount` alanı şemada YOKTUR
4. **AK-1.4 — GIVEN** cihaz okuma hatası verir **WHEN** sonraki başarılı okuma gelir **THEN** offline→online geçiş logu + `status='online'` güncellemesi olur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | `DeviceFactory.createAll` connector bölümünden 2. entry üretir | unit | ⬜ |
| AK-1.2 | `start()` connect allSettled davranışı korunur | unit | ⬜ |
| AK-1.3 | UPSERT `details` passthrough; top-level `rackCount` şemada yok (REV.01) | unit | 🟢 |
| AK-1.4 | offline↔online durum geçişleri (mevcut sözleşme) | unit | ⬜ |

**T Görev Listesi:**
- [x] T-1: `DeviceEntry` adlandırılmış tip; constructor anonim tipi kaldırılır; boş `types.ts` silinir
- [x] T-2: `start()` içi `this.sql!` non-null assertion'ları hoist ile kaldırılır
- [x] T-3: `DeviceConfigFile.rackCount` kaldırılır; `details` opak alan eklenir; config'lerde `rackCount` → `details`; `DeviceEntry.details` passthrough; DDL `details JSONB` + `rack_count` DROP migrasyonu
- [x] T-4: web-service `device-routes` SELECT `details` (`rack_count` yerine); `details` opak geçirilir
- [x] T-5: container-web `details` tipi + `rackCountOf` accessor (`rackHelpers`); `bscHelpers`/`devicesStore`/`DashBoardPage`/`ScadaDashboardPage` accessor'a geçer; `DEFAULT_RACK_COUNT` fallback

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `service.postgresql` yok | SQL kaydı tamamen atlanır (best-effort) |
| UPSERT/SET_DEVICE_OFFLINE hatası | Loglanır, akış kesilmez |
| Boş config dizini | Fail-fast (mevcut `DeviceConfigLoader` davranışı) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/device-service/src/device-service.ts` | DeviceEntry `details` passthrough, hoist, DDL `details JSONB` + `rack_count` DROP |
| `services/device-service/src/types.ts` | SİLİNİR |
| `packages/shared-types/src/config/device-config.ts` + `schemas/device-config.ts` | top-level `rackCount` kaldırılır; `details` eklenir |
| `services/device-service/deployment/sample-config/*.json` + `deployment/dev/container/device-configs/*.json` | `rackCount` → `details.rackCount` |
| `services/web-service/src/presentation/routes/device-routes.ts` | SELECT `details` |
| `apps/container-web/src/features/devices/types/device.ts` + `features/racks/utils/rackHelpers.ts` + `bscHelpers.ts` + `stores/devicesStore.ts` + `pages/DashBoardPage.tsx` + `pages/ScadaDashboardPage.tsx` | `details` tipi + `rackCountOf` accessor |

### 6.2 UC-2 — Poll ve Job Üretimi

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: READ_DEVICE repeatable job planlama (saniye grid'i hizalı), read → tag → 3 downstream job üretimi, MANAGEMENT job
- hariç: alarm değerlendirmesi (UC-4), komut (UC-3), TelemetryTagger iç mantığı (mevcut — değişmez)

**Akış:**
1. `start()` → her cihaz için `scheduleRead` (interval + `alignedStart` — saniye sınırına hizalı)
2. Worker `READ_DEVICE` alır → `readDevice` → `entry.device.read()` (tüm telemetri — ISP)
3. `publish` → TelemetryTagger.enrich → `DeviceScheduler.publishTelemetry` → 3 job: `WRITE_TELEMETRY`, `MANAGEMENT`, `WS_BROADCAST`
4. Başarı → `markOnline` → `evaluateAlarms` (UC-4); hata → `handleReadFailure` (poll döngüsü devam eder)
5. `scheduleManagement` → periyodik yönetim job'u

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Poll'lar sabit 1000 ms grid'ine hizalanır (çapraz cihaz faz tutarlılığı) | AK-2.1 |
| FR-2.2 | Her başarılı okuma 3 downstream job üretir (WRITE_TELEMETRY, MANAGEMENT, WS_BROADCAST) | AK-2.2 |
| FR-2.3 | Okuma hatası poll döngüsünü KESMEZ — cihaz offline işaretlenir, spam önlemli log | AK-2.3 |
| FR-2.4 | Bilinmeyen cihaz job'ı `request_rejected` ile reddedilir | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** cihaz interval'leri farklı **WHEN** `start()` planlar **THEN** tüm başlangıçlar aynı saniye sınırına hizalanır
2. **AK-2.2 — GIVEN** başarılı bir okuma **WHEN** `publish` çalışır **THEN** üç job da kuyruğa eklenir
3. **AK-2.3 — GIVEN** okuma sürekli hata verir **WHEN** poll tekrarlanır **THEN** ilk hatada 1 error log, 60 sn içinde yeni log yok, döngü sürer
4. **AK-2.4 — GIVEN** kayıtlı olmayan deviceId ile READ_DEVICE gelir **WHEN** worker işler **THEN** request_rejected logu, kuyruk processor'ı reject EDİLMEZ

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Hizalama davranışı (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-2.2 | Üç job üretimi (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-2.3 | Offline spam önleme + döngü devamı (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-2.4 | request_rejected reddi (mevcut sözleşme — regresyon) | unit | ⬜ |

**T Görev Listesi:** (değişiklik yok — davranış korunur; KAPANIŞ'ta regresyon kanıtı)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Boş telemetri dizisi | publish atlanır (`publishTelemetry` erken dönüş) |
| Job kuyruğa eklenemezse | Uyarı logu; kalan job'lar denemeye devam eder |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/device-service/src/device-scheduler.ts` | Değişmez (yalnızca UC-6 logger) |
| `services/device-service/src/device-service.ts` | Değişmez (yalnızca UC-6 loglar) |

### 6.3 UC-3 — Komut Yürütme ve Audit

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: COMMAND_DEVICE → write/writeAtomic → komut sonrası okuma + publish → validate read-back döngüsü → audit (fail-closed)
- hariç: komut üretimi/onayı (web-service/manevra), interlock (management/komut servisi)

**Akış:**
1. `COMMAND_DEVICE` → `executeCommand` — bilinmeyen cihaz → red
2. `job.atomic && device.writeAtomic` → `writeAtomic`; değilse `write`
3. Başarı → okuma + publish → `logCommand(job, true)` (audit fail-closed — audit yazılamazsa job hata verir)
4. Hata → `logCommand(job, false)` + error log → `{ success: false }`
5. `job.validate` varsa read-back döngüsü (minWaitMs + timeoutMs + 50 ms aralık)

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Atomic istek destekleniyorsa `writeAtomic`, değilse `write` kullanılır | AK-3.1 |
| FR-3.2 | Yazım hatası → `command_rejected` audit + `success:false` (audit yazılamazsa job REDDEDİLİR) | AK-3.2 |
| FR-3.3 | Başarı → `command_executed` audit (fail-closed) | AK-3.3 |
| FR-3.4 | `validate.reads` read-back döngüsü timeout'ta `validated:false` döner | AK-3.4 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** cihaz `writeAtomic` destekler ve job atomic **WHEN** komut gelir **THEN** `writeAtomic` çağrılır
2. **AK-3.2 — GIVEN** write hata döner **WHEN** komut işlenir **THEN** `command_rejected` audit loglanır, sonuç `success:false`, poll döngüsü kesilmez
3. **AK-3.3 — GIVEN** write başarılı **WHEN** komut işlenir **THEN** `command_executed` audit loglanır, komut sonrası telemetri publish edilir
4. **AK-3.4 — GIVEN** validate tanımlı ve read-back eşleşmiyor **WHEN** timeout dolmadan eşleşme olmaz **THEN** `{ success: true, validated: false }` döner

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Atomic/fallback seçimi (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-3.2 | command_rejected audit (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-3.3 | command_executed audit (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-3.4 | Validate timeout davranışı + `validateReadBack` metod ayrışması | unit | ⬜ |

**T Görev Listesi:**
- [x] T-6: `executeCommand` içi validate döngüsü özel `validateReadBack` metoduna çıkarılır

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bilinmeyen cihaz | `request_rejected` + `{ success:false, reason }` |
| Validate read-back hatası | Retry (sonraki poll çevriminde) |
| Logger yok (K4) | Audit yazılamaz → fail-closed: komut reddi job hatası verir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/device-service/src/device-service.ts` | validateReadBack çıkarımı |

### 6.4 UC-4 — Alarm Değerlendirme ve Olay Akışı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `alarms[]` → samples → dedup dedektör → `device_alarms` durum tablosu + TamperLogger geçiş logları → TimescaleSink → `log_events`; restart reset
- hariç: resolve akışı (web-service `alarm-routes`), UplinkEventRelay/bildirim (web-service/boss — mevcut zincir)

**Akış:**
1. Okuma sonrası `evaluateAlarms` — `alarms[]` yoksa/örnek boşsa erken dönüş
2. `AlarmTransitionDetector.detect` → yalnız yükselen/düşen kenarlar
3. Yükselen → `alarmRepository.activate` + `device_alarm` log; düşen → `deactivate` + `device_alarm_cleared`
4. Loglar TamperLogger üzerinden TimescaleSink'e → `log_events` → mevcut relay zinciri (K3)
5. Restart → bayat aktifler kapatılır + dedup state sıfırlanır

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Alarm kaynağı YALNIZCA config `alarms[]`; değerlendirme cihaz tipinden bağımsız | AK-4.1 |
| FR-4.2 | Yalnız kenar geçişlerinde log + `device_alarms` UPSERT (dedup — aktif poll'lar sessiz) | AK-4.2 |
| FR-4.3 | Field tier'da geçişler `log_events`'e TimescaleSink ile yazılır (B1 kapanır) | AK-4.3 |
| FR-4.4 | Restart'ta bayat aktif satırlar kapatılır + dedup sıfırlanır | AK-4.4 |
| FR-4.5 | Alarm SQL/log hatası poll'u KESMEZ (best-effort) | AK-4.5 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** config'te `alarms` bölümü tanımlı **WHEN** telemetri akar **THEN** değerlendirme yalnız bu kurallarla çalışır (kod/tag/başka kaynak yok)
2. **AK-4.2 — GIVEN** alarm koşulu aktif ve poll tekrarlanır **WHEN** değer aktif kalır **THEN** yalnız ilk geçişte `device_alarm` logu; sonraki poll'lar sessiz
3. **AK-4.3 — GIVEN** field tier çalışır **WHEN** bir geçiş olur **THEN** imzalı satır `log_events`'te (service=device-service) görünür — relay whitelist'i yakalayabilir
4. **AK-4.4 — GIVEN** aktif alarmlı servis restart olur **WHEN** `start()` çalışır **THEN** bayat aktifler kapanır, yeni gözlem dönemi başlar
5. **AK-4.5 — GIVEN** alarm tablosu yazımı hata döner **WHEN** poll işler **THEN** telemetri akışı kesilmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Config tek kaynak (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-4.2 | Kenar dedup (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-4.3 | `run.ts#buildLogger` timescale dalı + sink wiring | unit + gözle | ⬜ |
| AK-4.4 | Restart reset (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-4.5 | Best-effort izolasyon (mevcut sözleşme — regresyon) | unit | ⬜ |

**T Görev Listesi:**
- [x] T-7: `run.ts#buildLogger` — `timescale` sink dalı (`LOG_EVENTS_DDL` + `TimescaleSink` — data-service deseni)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Aynı isimli birden fazla telemetri satırı | OR birleşimi (tek alarm adı) |
| Severity `warning`/`error` | Log seviyesine eşlenir |
| Alarm aktifken "çözüldü" işareti | Yeni log basılmaz (loglama fiziksel kenara bağlı; resolve meta verisi web-service'te) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/device-service/run.ts` | TimescaleSink dalı |
| `services/device-service/src/device-service.ts` | Değişmez (yalnızca UC-6 loglar) |
| `services/device-service/src/alarm-transition-detector.ts` + `alarm-state-repository.ts` | Değişmez |

### 6.5 UC-5 — Transport Üretimi (TCP/RTU — simulator dalı YOK)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: protocol seçimi (MODBUS/CANBUS-stub/MQTT-stub), transport kind (yalnız tcp/rtu), connector device-subset'ten 2. entry türetimi
- hariç: simülatör sunucuları + host + connector sim davranışı (SIMULATOR-MIMARISI), BmsPortServer (SIMULATOR-MIMARISI T-4)

**Akış:**
1. `createAll(config)` → protocol switch → MODBUS için transport belirleme
2. `transport.kind` → `rtu` ise `ModbusClientTransport(ModbusRtuClient)`; aksi halde `ModbusDevice` varsayılan TCP client'ını `connection.host/port` ile kurar (`kind:"simulator"` dahil HER config TCP'dir — K8)
3. `config.connector` device-subset varsa → 2. MODBUS entry (kendi `connection`'ı ile) türetilir

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Tüm MODBUS cihazlar `connection` üzerinden TCP/RTU ile bağlanır — simulator'a özel transport YOKTUR | AK-5.1 |
| FR-5.2 | `SimulatorRegistry` sınıfı, `transportFor`/`register`/`count`, iki fazlı init ve DeviceFactory'de simulator dallanması YOKTUR | AK-5.2 |
| FR-5.3 | `config.connector` device-subset → türetilmiş 2. MODBUS entry (kendi telemetrisi + devices kaydı) | AK-5.3 |
| FR-5.4 | DeviceFactory/DeviceService kaynak kodunda simulator import'u ve `kind === "simulator"` dallanması YOK (K8) | AK-5.4 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** config `transport.kind:"simulator", connection:{host:"127.0.0.1", port:15501}` **WHEN** `createAll` çalışır **THEN** cihaz o porttan TCP ile bağlanan MODBUS cihazdır (kind'a bakılmaz)
2. **AK-5.2 — GIVEN** refactor sonrası kod **WHEN** incelenir **THEN** simulator-registry.ts yok, transport üretimi yalnız tcp/rtu'dan
3. **AK-5.3 — GIVEN** BSC config'inde `connector` device-subset **WHEN** `createAll` çalışır **THEN** 2. MODBUS entry kendi `connection`'ı ile üretilir
4. **AK-5.4 — GIVEN** `device-factory.ts`/`device-service.ts` **WHEN** taranır **THEN** simulator referansı YOKTUR (grep kapısı — SC-7)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | TCP/RTU tek yol (kind'sız davranış) | unit | ⬜ |
| AK-5.2 | Registry + dal yok (dosya silindi, import yok) | kod inceleme | ⬜ |
| AK-5.3 | Connector device-subset türetimi + schema (ConnectorConfig zod) | unit | ⬜ |
| AK-5.4 | Simulator referansı grep=0 | kod inceleme | ⬜ |

**T Görev Listesi:**
- [x] T-8: `simulator-registry.ts` + 2 testi silinir; DeviceFactory simulator dalı TAMAMEN çekilir (yalnız tcp/rtu — SIMULATOR-MIMARISI T-6 referanslı)
- [x] T-9: `run.ts` wiring — SimulatorHost start/stop entegrasyonu (SIMULATOR-MIMARISI K4/T-6)
- [x] T-10: `ConnectorConfig` + `DeviceConfigFile.connector?` (zod şema + test — shared-types; device/sim subset ayrımı)
- [x] T-11: Connector device-subset türetimi (2. entry — sim-subset SIMULATOR-MIMARISI UC-4'te)
- [x] T-12: Config migrasyonu — `config-docker/bsc-1.json`'a `connector` bölümü; `bsc-pcs-connector-1.json` silinir; port düzeltmeleri SIMULATOR-MIMARISI T-8'de
- [x] T-13: `device-factory.test.ts` + `maneuver-command.spec.ts` regresyon güncellemeleri (TCP E2E — SIMULATOR-MIMARISI T-9 referanslı)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Mapping dosyası geçersiz | Fail-fast — SimulatorHost açılış hatası (sim tarafı — SIMULATOR-MIMARISI §7) |
| Connector device-subset'i simulator OLMAYAN config'te | Bölüm yok sayılır (yalnızca `kind:"simulator"` config'lerinde türetilir) |
| Connector server kapalı | Normal cihaz gibi okuma hatası → offline işaretleme |
| `rtu` transport | `connection.path/baudRate/slaveId` → `ModbusClientTransport` (mevcut) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/device-service/src/simulator-registry.ts` (+2 test) | SİLİNİR |
| `services/device-service/src/device-factory.ts` | Simulator dalı çekilir; connector device-subset türetimi |
| `services/device-service/src/device-service.ts` | `simulators` param kaldırılır (fromConfigDir rewiring) |
| `services/device-service/src/index.ts` | SimulatorRegistry export kaldırılır |
| `packages/shared-types/src/config/device-config.ts` + `schemas/device-config.ts` | ConnectorConfig |
| `deployment/dev/container/device-configs/bsc-1.json` | connector bölümü gömülür |
| `deployment/dev/container/device-configs/bsc-pcs-connector-1.json` | SİLİNİR |
| `services/device-service/run.ts` | SimulatorHost wiring (T-9) |

### 6.6 UC-6 — Log Sözleşmesi (iki kanal)

**Status:** 🟡 Geliştirmede

**Kapsam:**
- dahil: operasyonel `@gd-monorepo/logger` kanalı (imzasız; console/file sink) + console fallback; TamperLogger kanalı kategori tablosu (audit/security/app) + eventCode'lar (`LOG_EVENT_CODES`); bileşenlere logger enjeksiyonu
- hariç: sink konfigürasyonu (tier defaults — platform/logging), relay, bildirim UI, paket içi logger implementasyonu (LOGGER-MIMARISI)

**Akış:**
1. Operasyonel/bilgi logları (bağlantı özeti, upsert, schedule, komut bilgisi) `@gd-monorepo/logger` `Logger` üzerinden yazılır (imzasız zincir; `logger.child("<Bileşen>")`)
2. Audit (komut geçişleri), security (`request_rejected`), alarm geçişleri TamperLogger'a gider (imzalı, fail-closed) — K7 kategori tablosu
3. Operasyonel logger yoksa (K4) → eski console davranışı birebir (fallback)
4. Yeni eventCode'lar önce `LOG_EVENT_CODES`'a eklenir (TamperLogger validator fail-closed)

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Komut geçişleri TamperLogger `audit` kategorisinde, fail-closed (mevcut korunur) | AK-6.1 |
| FR-6.2 | `request_rejected` → TamperLogger `security` kategorisi (K7) | AK-6.2 |
| FR-6.3 | Operasyonel/bilgi logları `@gd-monorepo/logger` ile yazılır (`child` bileşen etiketi); logger yoksa console fallback | AK-6.3 |
| FR-6.4 | TamperLogger kanalında kullanılan her yeni eventCode `LOG_EVENT_CODES`'da tanımlıdır | AK-6.4 |
| FR-6.5 | Operasyonel loglar TamperLogger imzalı zincirine YAZILMAZ (kategori sınırı — LOGGER-MIMARISI B1 kapanır) | AK-6.5 |

**Kabul Senaryoları (GWT):**
1. **AK-6.1 — GIVEN** komut yürütülür **WHEN** audit yazılır **THEN** kategori `audit`, audit hatası komutu fail eder
2. **AK-6.2 — GIVEN** bilinmeyen cihaza istek gelir **WHEN** red loglanır **THEN** TamperLogger kategorisi `security`
3. **AK-6.3 — GIVEN** operasyonel uyarı koşulu oluşur **WHEN** loglanır **THEN** `@gd-monorepo/logger` sink'ine yazılır; logger yoksa eski console mesajı birebir basılır (fallback testi)
4. **AK-6.4 — GIVEN** yeni kod TamperLogger'a loglar **WHEN** eventCode doğrulanır **THEN** sözlükte kayıtlıdır (bilinmeyen kod reddedilir)
5. **AK-6.5 — GIVEN** operasyonel log yazılır **WHEN** TamperLogger `log_events` zinciri incelenir **THEN** operasyonel mesaj zincirde YOKTUR (imzasız kanal)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Audit fail-closed (mevcut sözleşme — regresyon) | unit | ⬜ |
| AK-6.2 | request_rejected kategori değişimi + test | unit | ⬜ |
| AK-6.3 | Operasyonel logger kanalı + console fallback testleri | unit | ⬜ |
| AK-6.4 | LOG_EVENT_CODES ekleri + validator testi | unit | ⬜ |
| AK-6.5 | Operasyonel log TamperLogger zincirinde yok + koşulsuz console.* yok | kod inceleme + unit | ⬜ |

**T Görev Listesi:**
- [x] T-14: `run.ts` operasyonel `Logger` (`@gd-monorepo/logger`) wiring + `LOG_EVENT_CODES` gözden geçirme (TamperLogger yalnız audit/security/alarm)
- [x] T-15: `device-service.ts` koşulsuz console'lar → operasyonel `Logger` (yoksa birebir console fallback); audit/security TamperLogger'da kalır (B3)
- [x] T-16: `config-loader.ts` + `device-scheduler.ts` + fabrika uyarıları → operasyonel `Logger` enjeksiyonu (fromConfigDir zinciri)
- [x] T-17: `request_rejected` kategori düzeltmesi (TamperLogger `security`) + test güncellemesi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Operasyonel logger sink hatası | Fail-open (LOGGER-MIMARISI K5) — akış kesilmez |
| TamperLogger audit kategorisinde throw | Yukarı yayılır (fail-closed) |
| Logger yok + audit gerekli | Komut reddi job hatası verir (mevcut davranış) |
| Logger yok + operasyonel log | Birebir console fallback (K4) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/platform/logging/src/event-codes.ts` | TamperLogger kodları gözden geçirme |
| `services/device-service/src/device-service.ts` | Operasyonel logger geçişi + kategori sınırı |
| `services/device-service/src/device-scheduler.ts` | Operasyonel logger enjeksiyonu |
| `services/device-service/src/config-loader.ts` | Operasyonel logger enjeksiyonu |
| `services/device-service/src/device-factory.ts` | Fabrika uyarıları → operasyonel logger |
| `services/device-service/run.ts` | Operasyonel `@gd-monorepo/logger` wiring (T-7 ile birlikte) |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| `fromConfigDir` — config/şema hatası | Fail-fast (ValidationError) — açılış reddi |
| `start()` — kısmi connect hatası | Servis açılır; başarısız cihaz sayısı `device_connect_summary` logu; poll denemeye devam eder |
| `start()` — scheduler/upsert hatası | Uyarı logu; kalan cihazlar sürer |
| Poll — okuma hatası (ilk) | `modbus_read_failed` error + `devices.status='offline'` (best-effort) |
| Poll — okuma hatası (sürekli) | 60 sn'de 1 debug hatırlatma (spam önleme) |
| Poll — offline→online | `device_online` info + `status='online'` |
| Komut — yazım hatası | `command_rejected` audit (fail-closed) + `modbus_write_failed`; poll döngüsü etkilenmez |
| Alarm — geçiş | `device_alarm`/`device_alarm_cleared` (imzalı, log_events); tablo UPSERT; SQL/log hatası best-effort |
| Connector cihazı (türetilmiş MODBUS) | Diğer cihazlardan FARKSIZ — okuma hatası → offline işaretleme; connector iç davranışı (link/retry) sim tarafında (SIMULATOR-MIMARISI §7) |
| `stop()` | Tüm cihazlar offline işaretlenir + disconnect; scheduler/mq kapatılır |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `SimulatorRegistry` sınıfı/state'i yok — transport üretimi yalnız TCP/RTU | kod inceleme (grep `SimulatorRegistry` = 0) |
| SC-2 | Field tier alarm geçişleri `log_events`'e yazılır (B1 kapalı) | gözle (dev stack) + unit (sink wiring) |
| SC-3 | Test süitleri yeşil: device-service, simulators, shared-types, web-service, container-web | `bun run test` |
| SC-4 | `spec:check` temiz + test envanteri güncel | `bun run spec:check` + `bun run test:inventory` |
| SC-5 | Koşulsuz `console.*` yalnızca logger-yok fallback'inde | kod inceleme (grep) |
| SC-6 | Coverage kapıları: ≥%70 satır genel; alarm/log güvenlik-kritik ≥%90 branch | `bun run test:coverage` |
| SC-7 | `device-factory.ts`/`device-service.ts` içinde simulator referansı/dallanması YOK (K8) | kod inceleme (grep) |

---

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-10 ConnectorConfig şeması; simülatör sözleşmeleri SIMULATOR-MIMARISI T-1 |
| 3. TEST | Kırmızı testler: device-factory (T-8/T-11/T-13), schema (T-10), log (T-15/T-17) |
| 4. IMPL | T-1..T-7, T-12, T-14, T-16 |
| 5. KAPANIŞ | `DEVICE-SERVICE-KAPANIS.md` + doküman silmeleri (T-18/T-19/T-20) |

---

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | MQ event rotası (`NOTIFY_EVENT` job → data-service sink) — management-service alarm-tetikli otomasyon ihtiyacı doğduğunda açılır (K3) | Kapalı değil — §11 |
| A2 | `IDevice.read(telemetries?)` parametresi (B7) — cross-package temizlik | §11 |
| A3 | CANBUS/MQTT gerçek transport'ları (stub'lar throw) | §11 |
| A4 | Connector mapping'te başka deviceId kaynağı (çift BSC, agregasyon) — bugün tek kaynak; degrade davranış mevcut | Faz 2 (SIMULATOR-MIMARISI A3) |
| A5 | T0.7 DomainError/Result geçişi device-service'te YAPILMADI (B8) — sapma kaydı, KAPANIŞ A.4'te | §11 |
| A6 | RTU server simülasyonu + `tickIntervalMs` — SIMULATOR-MIMARISI A1/A2 (bu SPEC DIŞI) | SIMULATOR-MIMARISI |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `IDevice.read()` parametresizleştirme (shared-types + core + implementasyonlar) — A2
2. CANBus/MQTT gerçek transport'ları (kontrat şekli hazır) — A3
3. `NOTIFY_EVENT` MQ rotası + management-service alarm-tetikli otomasyon — A1
4. device-service hata yollarında `Result<T,E>`/DomainError geçişi — A5
5. Replay/scripted transport (kayıtlı Modbus frame oynatma) — `IModbusTransport` implementasyonu
6. Simülatör RTU server (pty/socat) + arıza senaryo enjeksiyonu — SIMULATOR-MIMARISI A1/§11

---

## 12. T Görev Özeti

| T | Görev | UC |
|:--|:------|:---|
| T-1 | `DeviceEntry` adlandırılmış tip + anonim constructor tipi kaldırma + `types.ts` silme | UC-1 |
| T-2 | `this.sql!` hoist | UC-1 |
| T-3 | `DeviceConfigFile.rackCount` kaldır + `details` opak alan + config migrasyonu + `DeviceEntry.details` + DDL `details JSONB`/`rack_count` DROP | UC-1 |
| T-4 | web-service `device-routes` SELECT `details` (opak geçir) | UC-1 |
| T-5 | container-web `details` tipi + `rackCountOf` accessor + `DEFAULT_RACK_COUNT` fallback | UC-1 |
| T-6 | `validateReadBack` metod çıkarımı | UC-3 |
| T-7 | `run.ts#buildLogger` TimescaleSink dalı | UC-4 |
| T-8 | `simulator-registry.ts` silme + DeviceFactory simulator dalı tamamen çekilir (yalnız tcp/rtu) | UC-5 |
| T-9 | `run.ts` SimulatorHost wiring'i (start/stop — SIMULATOR-MIMARISI referanslı) | UC-5 |
| T-10 | `ConnectorConfig` + `connector?` şeması (shared-types; device/sim subset) | UC-5 |
| T-11 | Connector device-subset türetimi (2. entry) | UC-5 |
| T-12 | Config migrasyonu (bsc-1.json connector bölümü; bsc-pcs-connector-1.json silme) | UC-5 |
| T-13 | device-factory/maneuver spec regresyon güncellemeleri (TCP E2E) | UC-5 |
| T-14 | `run.ts` operasyonel `@gd-monorepo/logger` wiring + `LOG_EVENT_CODES` gözden geçirme | UC-6 |
| T-15 | device-service.ts console → operasyonel logger + fallback | UC-6 |
| T-16 | config-loader/scheduler/fabrika operasyonel logger enjeksiyonu | UC-6 |
| T-17 | `request_rejected` → TamperLogger `security` kategorisi | UC-6 |
| T-18 | 6 eski doküman silme + link düzeltmeleri | — (dokümantasyon) |
| T-19 | AGENTS.md güncellemeleri (registry/simulator referansları → SIMULATOR-MIMARISI/SimulatorHost) | — (dokümantasyon) |
| T-20 | `DEVICE-SERVICE-KAPANIS.md` + spec:check + test:inventory | — (kapanış) |
