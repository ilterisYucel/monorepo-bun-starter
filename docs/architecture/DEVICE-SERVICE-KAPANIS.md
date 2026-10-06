---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, device-service, simulator, connector, alarm, log, refactor]
review_date: 2026-12-01
---

# Device Service — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md) (onaylı — AK/FR/SC kaynağı).
> **Bağımlı:** [SIMULATOR-KAPANIS.md](./SIMULATOR-KAPANIS.md) (self-host server + host — bu SPEC'in eki).
> **Doğrulama tarihi:** 2026-12-01 — T-1…T-20 tamam.
> **REV.01 (2026-10-05):** `details` objesi — `rackCount` top-level → `DeviceConfigFile.details` (opak) taşındı; `devices.rack_count` kolonu DROP (migrasyon ALTER). Kanıtlar A.1/A.3/A.4 + B.1/B.2'ye işlendi.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/device-service/src/simulator-registry.ts` (+ 2 test) | SİLİNDİ | K1 / UC-5 / T-8 |
| 2 | `services/device-service/src/types.ts` | SİLİNDİ (boş — `DeviceEntry` adlandırılmış tipe taşındı) | T-1 |
| 3 | `services/device-service/src/device-factory.ts#DeviceFactory` | Simulator dalı çekildi (yalnız TCP/RTU); `createConnector` eklendi | K8 / UC-5 / T-8/T-11 |
| 4 | `services/device-service/src/device-service.ts#DeviceService` | `simulators` param kalktı; `DeviceEntry` adlandırılmış tip; `this.sql!` hoist; `ops` log kanalı; `validateReadBack` metod çıkarımı | K1/K4 / UC-1/3/5/6 / T-1/T-2/T-6/T-15 |
| 5 | `services/device-service/src/ops-log.ts#createOpsLog` | YENİ — operasyonel log kanalı (logger varsa `child`, yoksa console fallback) | K4 / UC-6 / FR-6.3 |
| 6 | `services/device-service/src/config-loader.ts#DeviceConfigLoader` | ops logger enjeksiyonu (`createOpsLog`) | T-16 / UC-6 |
| 7 | `services/device-service/src/device-scheduler.ts#DeviceScheduler` | ops logger enjeksiyonu (publishTelemetry uyarısı) | T-16 / UC-6 |
| 8 | `services/device-service/src/index.ts` | `SimulatorRegistry` export kaldırıldı | UC-5 / T-8 |
| 9 | `services/device-service/run.ts#main` | SimulatorHost wiring + ops Logger wiring + `buildLogger` timescale dalı | K3/K4 / UC-4/5/6 / T-7/T-9/T-14 |
| 10 | `services/device-service/package.json` | `@gd-monorepo/logger` + `@gd-monorepo/tamper-logger` dep | K4 / UC-6 |
| 11 | `packages/shared-types/src/config/device-config.ts` + `schemas/device-config.ts` | `ConnectorConfig`/`connector?` eklendi; `DeviceTransportConfig.rackCount` kaldırıldı | K5 / UC-5 / T-10 |
| 12 | `services/device-service/config/bsc-1.json` + `deployment/config-docker/bsc-1.json` | `connector` bölümü gömüldü; `transport.rackCount` silindi; port/host normalize | K2/K5 / T-12 |
| 13 | `services/device-service/deployment/config-docker/bsc-pcs-connector-1.json` | SİLİNDİ | K2 / T-12 |
| 14 | `services/device-service/config/*.json` + `deployment/config-docker/*.json` | `transport.rackCount` girişleri silindi; port/host düzeltmeleri | K5/K7 / T-3 (+ SIMULATOR T-8) |
| 15 | `services/device-service/config/mappings/bsc-pcs-mapping.json` | YENİ dizin — kanonik mapping (target 15502 + mappings) | K2 / UC-5 / T-12 |
| 16 | `services/web-service/src/infrastructure/persistence/device-registry.ts#DeviceRegistry` | ölü `rack_count` SELECT + `rackCount` alanı çıkarıldı | K6 / UC-1 / T-4 |
| 17 | `apps/container-web/src/features/racks/utils/rackHelpers.ts` + `pages/*.tsx` | `DEFAULT_RACK_COUNT` sabiti (`?? 8` magic yerine) | K6 / UC-1 / T-5 |
| 18 | `services/device-service/src/maneuver-command.spec.ts` | E2E harness — `SimulatorHost.start()` → test → `stopAll()` | T-13 (SIMULATOR T-9) |
| 19 | `packages/shared-types/src/config/device-config.ts` + `schemas/device-config.ts` | top-level `rackCount` + `DeviceTransportConfig.rackCount` kaldırıldı → `details?: Record<string, unknown>` + zod `z.record(z.unknown()).optional()` | K5 / UC-1 / T-3 |
| 20 | `packages/shared-types/src/schemas/device-config.test.ts` | YENİ — details passthrough + top-level `rackCount` strip + details opsiyonel | T-3 / AK-1.3 |
| 21 | `services/device-service/src/device-service.ts#DeviceService` | `DeviceEntry.details` passthrough; DDL `details JSONB DEFAULT '{}'` + `ALTER ADD COLUMN IF NOT EXISTS details` + `DROP COLUMN IF EXISTS rack_count`; UPSERT `details` (JSON.stringify) | K5/K6 / UC-1 / T-3 |
| 22 | `services/web-service/src/presentation/routes/device-routes.ts` + `infrastructure/persistence/device-registry.ts` | SELECT `details` (`rack_count` yerine); `DeviceInfo.rackCount` kaldırıldı | K6 / UC-1 / T-4 |
| 23 | `apps/container-web/src/features/racks/utils/rackHelpers.ts` | `deviceDetails`/`detailsNumber`/`rackCountOf` accessor + `DEFAULT_RACK_COUNT` (magic `?? 8` yerine tek kaynak) | K6 / UC-1 / T-5 |
| 24 | `apps/container-web/src/features/racks/utils/rackHelpers.test.ts` | YENİ — `detailsNumber`/`rackCountOf`/fallback sözleşmesi | T-5 / AK-1.3 |
| 25 | `apps/container-web/src/features/devices/types/device.ts` + `bscHelpers.ts` + `stores/devicesStore.ts` + `pages/DashBoardPage.tsx` + `pages/ScadaDashboardPage.tsx` | `rack_count ?? 0/8` → accessor; `DeviceInfo.details` | K6 / UC-1 / T-5 |
| 26 | `apps/field/src/features/field-devices/types/device.ts` + `hooks/useFieldDevices.ts` + `hooks/useContainerDevices.test.tsx` | `rack_count` → `details` | K6 / T-5 |
| 27 | `packages/ui/src/components/DeviceTable/DeviceTable.tsx` + `DeviceTable.types.ts` + `DeviceTable.stories.tsx` | `rack_count` → `details` (rackCount hücresi `details?.rackCount`) | K6 / T-5 |
| 28 | `packages/simulators/src/host.ts#detailNumber` | BSC builder `config.details?.rackCount` (default 8) — `transport.rackCount` referansı kaldırıldı | K6 / UC-1 |
| 29 | `services/device-service/config/bsc-{1,2}.json` + `deployment/config-docker/bsc-{1,2}.json` | `transport.rackCount` + top-level `rackCount` → `details: { rackCount: 8 }` | K5 / UC-1 / T-3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| device-service (birim + E2E) | `bun run test services/device-service` | 10 dosya / 85 test yeşil; `maneuver-command.spec.ts` 6/6 (gerçek TCP self-host) |
| simulators (bağımlı) | `bun run test packages/simulators` | 15 dosya / 136 test yeşil |
| shared-types/core/web-service/container-web | `bun run test` (ilgili paketler) | yeşil |
| device-service tip denetimi | `tsc --noEmit` | test-tipleri ÖNCEDEN VAR OLAN borç (sapma A.4/9) |
| lint kapısı | `bun run spec:check docs/architecture/DEVICE-SERVICE-KAPANIS.md docs/architecture/SIMULATOR-KAPANIS.md` | temiz |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | `createAll` connector bölümünden 2. entry üretir | `device-factory.test.ts` (connector device-subset) | 🟢 |
| AK-1.2 | `start()` connect allSettled — kısmi başarısızlık kesmez | `device-service.test.ts` | 🟢 |
| AK-1.3 | UPSERT `details` passthrough (opak JSONB); top-level `rackCount` şemada YOK (REV.01) | `device-config.test.ts` (passthrough + strip) + `rackHelpers.test.ts` (accessor); DB DDL/UPSERT gözle — B.2/G9 | 🟢 |
| AK-1.4 | offline↔online durum geçişleri | `device-service.test.ts` | 🟢 |
| AK-2.1 | Poll saniye grid'ine hizalama (regresyon) | `device-scheduler.test.ts` | 🟢 |
| AK-2.2 | Başarılı okuma 3 downstream job üretir (regresyon) | `device-scheduler.test.ts` | 🟢 |
| AK-2.3 | Offline spam önleme + döngü devamı (regresyon) | `device-service.test.ts` | 🟢 |
| AK-2.4 | Bilinmeyen cihaz `request_rejected` reddi (regresyon) | `device-service.test.ts` | 🟢 |
| AK-3.1 | Atomic/fallback seçimi (regresyon) | `device-service.test.ts` | 🟢 |
| AK-3.2 | `command_rejected` audit fail-closed (regresyon) | `device-service.test.ts` | 🟢 |
| AK-3.3 | `command_executed` audit (regresyon) | `device-service.test.ts` | 🟢 |
| AK-3.4 | Validate timeout + `validateReadBack` metod ayrışması | `device-service.test.ts` | 🟢 |
| AK-4.1 | Alarm kaynağı yalnız config `alarms[]` (regresyon) | `alarm-transition-detector.test.ts` | 🟢 |
| AK-4.2 | Kenar dedup — aktif poll'lar sessiz (regresyon) | `alarm-transition-detector.test.ts` | 🟢 |
| AK-4.3 | `run.ts#buildLogger` timescale dalı + sink wiring (B1 kapanır) | `run.ts#buildLogger` (unit + gözle) | 🟢 |
| AK-4.4 | Restart reset — bayat aktifler kapanır (regresyon) | `alarm-state-repository.test.ts` + `device-service.test.ts` | 🟢 |
| AK-4.5 | Alarm SQL/log hatası best-effort (regresyon) | `device-service.test.ts` | 🟢 |
| AK-5.1 | TCP/RTU tek yol — `kind:"simulator"` config yine TCP cihaz | `device-factory.test.ts` | 🟢 |
| AK-5.2 | Registry + dal yok (dosya silindi, import yok) | kod inceleme (`simulator-registry.ts` SİLİNDİ) | 🟢 |
| AK-5.3 | Connector device-subset türetimi + `ConnectorConfig` zod | `device-factory.test.ts` + `config-connector.test.ts` | 🟢 |
| AK-5.4 | Simulator referansı grep=0 (K8) | kod inceleme (`device-factory.ts`/`device-service.ts`) | 🟢 |
| AK-6.1 | Audit fail-closed (regresyon) | `device-service.test.ts` | 🟢 |
| AK-6.2 | `request_rejected` → TamperLogger `security` kategorisi | `device-service.ts#logOrWarn` (kod); kategori assert GAP — B.2/G2 | 🟡 |
| AK-6.3 | Operasyonel logger kanalı + console fallback | `ops-log.ts#createOpsLog` (kod); fallback testi GAP — B.2/G1 | 🟡 |
| AK-6.4 | `LOG_EVENT_CODES` ekleri + validator | kod inceleme (yeni eventCode YOK — hepsi mevcut) | 🟢 |
| AK-6.5 | Operasyonel log TamperLogger zincirinde yok + koşulsuz console yok | kod inceleme (`ops-log.ts` imzasız; TamperLogger yalnız audit/security/alarm) | 🟢 |
| SC-1 | `SimulatorRegistry` yok — transport yalnız TCP/RTU | kod inceleme (grep = 0) | 🟢 |
| SC-2 | Field tier alarm geçişleri `log_events`'e (B1 kapalı) | `run.ts#buildLogger` timescale dalı + gözle (dev stack) | 🟢 |
| SC-3 | Test süitleri yeşil | device-service 85 + simulators 136 yeşil | 🟢 |
| SC-4 | `spec:check` temiz + envanter güncel | `bun run spec:check` temiz; `test:inventory` ayrıca koşulmalı — B.2/G3 | 🟡 |
| SC-5 | Koşulsuz `console.*` yalnız logger-yok fallback | kod inceleme (sapma A.4/3 — 3 bootstrap console bilinçli) | 🟢 |
| SC-6 | Coverage kapıları (≥%70 genel; ≥%90 branch güvenlik-kritik) | rapor ayrı koşulur — B.2/G4 | 🟡 |
| SC-7 | `device-factory.ts`/`device-service.ts` simulator referansı YOK | kod inceleme (grep = 0) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | UC-6 iki log kanalı kararı | Operasyonel/bilgi logları `@gd-monorepo/logger` (imzasız, `ops-log.ts`); audit/security/alarm geçişleri TamperLogger'da kalır. K4/K7 bu kararla revize edildi (LOGGER-MIMARISI Faz 0 UC-6 iki-kanal kararı — LOGGER-KAPANIS.md). |
| 2 | T0.7 `DomainError`/`Result<T,E>` geçişi YAPILMADI (B8) | device-service hata yolları ham catch kalır; SPEC A5 açık kararında — sapma kaydı bu KAPANIŞ'ta. İleri İş §11. |
| 3 | `run.ts` 3 bootstrap `console.*` bilinçli fallback | `console.log("[run] Device Service baslatiliyor...")` + `console.log("[run] Konfigürasyon:...")` (config öncesi) + `main().catch` kritik hata — `opsLogger` config'ten SONRA kurulur; açılış öncesi/catastrophic yol logger öncesi olduğundan console kalır. |
| 4 | Önceden var olan `tsc -b`/composite borcu | `shared-types` `maneuver.ts` + stale dist borcu device-service test-tipleri `tsc --noEmit`'i kırar; bu SPEC kapsamı DIŞI (İleri İş §11). |
| 5 | Connector `adapters` (in-process) → `ISourceReader`/`TcpSourceReader` (UC-4/T-7) | device-service tarafında registry kaldırıldı (K1); connector sim davranışı SIMULATOR-MIMARISI'nde `TcpSourceReader` ile TCP'ye döndü. Çapraz referans: SIMULATOR-KAPANIS A.4/6. |
| 6 | Port reassignment + `ep203` + `bsc-2` + `pm5340` (config tarafı) | device-service config'leri SIMULATOR port reassignment'ından etkilendi (A.4/1-4 çapraz) — `ep203` gerçek panel (değişmedi), `bsc-2` 15510, `pm5340` 127.0.0.1, tüm sim portları ayrıcalıksız aralığa. |
| 7 | `rackCount` top-level → `details`; `devices.rack_count` kolonu DROP (migrasyon ALTER) — decoupled passthrough | REV.01: cihaz-spesifik opsiyonel nitelikler opak `DeviceConfigFile.details` altına taşındı (K5/K6). `devices` DDL'i `rack_count INTEGER` → `details JSONB`; açılışta `ALTER ... ADD COLUMN IF NOT EXISTS details` + `DROP COLUMN IF EXISTS rack_count` mevcut tabloları migre eder. device-service/web-service `details`'i yorumlamaz, yalnız taşır — yorum tüketicide (ön yüz `rackCountOf` + simülatör BSC builder). |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — `packages/core` jenerik; simulator/connector kavramı girmedi
- [x] Purity 2 — device-service simulator kelimesini bilmez; yalnız `run.ts` SimulatorHost'u başlatır/durdurur
- [x] Purity 3 — `IDevice`'tan başka cihaz kontratı yok; protocol farkı DeviceFactory'de kapanır
- [x] Purity 4 — alarm kaynağı yalnız config `alarms[]`; dedup geçiş-odaklı
- [x] Purity 5 — telemetri tag sahibi `TelemetryTagger`; config device/container/field_id taşımaz
- [x] Purity 6 — event yayılımı device-service'te değil (log_events + relay zinciri değişmez)
- [x] Purity 7 — connector/tünel protokolleri genişlemedi
- [x] Purity 8 — `kind === "simulator"` dallanması + simulator import YOK (grep = 0)
- [x] DI — `opsLogger` constructor/`fromConfigDir` enjeksiyonu (plain, dekoratör YOK); config obje kuralı
- [x] Elegant Object — `validateReadBack` command/query ayrımı (command → `void`, read-back döngüsü içeride); no static methods
- [x] Async loop — `start`/`stop`/upsert `Promise.allSettled` (for...of await YOK)

### A.6 Genel Durum Özeti

device-service simulator dalından tamamen arındı: `SimulatorRegistry` (2 testiyle) silindi, `DeviceFactory` yalnız TCP/RTU üretiyor, `kind:"simulator"` config'ler bile saf TCP cihazı olarak bağlanıyor (K8/SC-7). Connector ayrı config cihazı olmaktan çıkıp BSC config'inin `connector` bölümüne gömüldü; türetilmiş 2. MODBUS cihazı (`createConnector`) diğer cihazlardan farksız. `rackCount` top-level alandan çıkarılıp opak `details.rackCount` altına taşındı (REV.01 — decoupled passthrough; web-service SELECT `details`, ön yüz `rackCountOf` accessor + `DEFAULT_RACK_COUNT`). Log sözleşmesi iki kanala ayrıldı: operasyonel → `@gd-monorepo/logger` (`ops-log.ts`), audit/security/alarm → TamperLogger; `run.ts#buildLogger` timescale dalıyla field tier alarm geçişleri `log_events`'e yazılıyor (B1 kapanır). T-1…T-20 tamam; 85 test (6/6 E2E) + bağımlı 136 simulator testi yeşil. Açık kalan koşullu kanıtlar: coverage raporu, `test:inventory` güncellemesi, `request_rejected` kategori assert'i ve `createOpsLog` fallback testi (B.2). **review_date:** 2026-12-01.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `fromConfigDir` — config/şema hatası | geçersiz config | fail-fast (ValidationError) | `config-loader.test.ts` |
| `start()` — kısmi connect hatası | bazı cihaz connect throw | servis açılır; uyarı + diğer cihazlar bağlanır | `device-service.test.ts` |
| `start()` — scheduler/upsert hatası | kısmi reject | uyarı; kalan cihazlar sürer | `device-service.test.ts` |
| Poll — okuma hatası (ilk) | read throw | `modbus_read_failed` error + `status='offline'` | `device-service.test.ts` |
| Poll — okuma hatası (sürekli) | 60 sn içinde tekrar | 1 debug hatırlatma (spam önleme) | `device-service.test.ts` |
| Poll — offline→online | sonraki başarılı okuma | `device_online` info + `status='online'` | `device-service.test.ts` |
| Poll — başarılı okuma | read OK | 3 job (WRITE_TELEMETRY, MANAGEMENT, WS_BROADCAST) | `device-scheduler.test.ts` |
| Komut — yazım hatası | write throw | `command_rejected` audit (fail-closed) + `modbus_write_failed` | `device-service.test.ts` |
| Komut — bilinmeyen cihaz | deviceId yok | `request_rejected` + `{success:false}` | `device-service.test.ts` |
| Komut — validate read-back | timeout'ta eşleşme yok | `{success:true, validated:false}` | `device-service.test.ts` |
| Alarm — geçiş | kenar tespiti | `device_alarm`/`device_alarm_cleared` + tablo UPSERT | `alarm-transition-detector.test.ts` + `alarm-state-repository.test.ts` |
| Alarm — SQL/log hatası | sink hata | best-effort — poll kesilmez | `device-service.test.ts` |
| Transport — `kind:"simulator"` | MODBUS config | yine TCP cihaz (dal YOK) | `device-factory.test.ts` |
| Transport — `rtu` | rtu kind | `ModbusClientTransport(ModbusRtuClient)` | `device-factory.test.ts` |
| Connector — device-subset | `connector.device` varsa | 2. MODBUS entry kendi `connection`'ı ile | `device-factory.test.ts` + `config-connector.test.ts` |
| `stop()` | shutdown | tüm cihazlar offline + disconnect + scheduler/mq kapanır | `device-service.test.ts` |
| `details` schema — opak passthrough | config'te `details: { rackCount: 8, vendor }` | `data.details` birebir korunur | `device-config.test.ts` |
| `details` schema — top-level `rackCount` | config'te `rackCount: 8` | strip edilir; `data.details` undefined | `device-config.test.ts` |
| `details` schema — opsiyonel | config'te `details` yok | parse OK; `data.details` undefined | `device-config.test.ts` |
| `rackCountOf` accessor — details var | `details: { rackCount: 12 }` | 12 döner | `rackHelpers.test.ts` |
| `rackCountOf` accessor — fallback | `details: null` / yok | `DEFAULT_RACK_COUNT` döner | `rackHelpers.test.ts` |
| `detailsNumber` accessor — string/geçersiz | `"6"` / `"abc"` / yok | `6` / `undefined` / `undefined` | `rackHelpers.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | `ops-log.ts#createOpsLog` console fallback davranışı (AK-6.3) otomatik testle sabitlenmedi | düşük | `ops-log.test.ts` — logger yoksa birebir console mesajı; logger varsa `child` çağrısı |
| G2 | `request_rejected` kategori=`security` (AK-6.2) testte assert edilmedi (yalnız `eventCode` doğrulanıyor) | düşük | `device-service.test.ts` bilinmeyen cihaz testine `category==="security"` assert'i ekle |
| G3 | `test:inventory` envanteri bu oturumda koşulmadı (SC-4) | düşük | `bun run test:inventory` |
| G4 | Coverage raporu (SC-6) koşulmadı | düşük | `bun run test:coverage` — alarm/log ≥%90 branch doğrula |
| G5 | `run.ts#buildLogger` TimescaleSink gerçek `log_events` yazımı yalnız gözle (dev stack) | orta | field tier e2e: alarm geçişi → `log_events` satırı + relay whitelist |
| G6 | T0.7 `DomainError`/`Result<T,E>` geçişi yapılmadı (B8) | orta | İleri İş §11 — hata yollarında Result geçişi |
| G7 | CANBus/MQTT gerçek transport'ları (stub'lar throw) | orta | İleri İş §11 — A3 |
| G8 | `IDevice.read(telemetries?)` parametresi (B7) cross-package temizlik | düşük | İleri İş §11 — A2 |
| G9 | `details` DB migrasyonu (`ALTER ADD COLUMN IF NOT EXISTS details` + `DROP COLUMN IF EXISTS rack_count`) ve UPSERT `details` yazımı otomatik test edilmiyor — yalnız gözle | düşük | entegrasyon: gerçek Postgres'e karşı migrasyon + `devices.details` passthrough doğrula |

**review_date:** 2026-12-01
