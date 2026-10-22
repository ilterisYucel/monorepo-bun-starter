---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, simulator, modbus-server, self-host, jsmodbus, contract]
review_date: 2026-10-21
---

# Simülatör Altyapısı — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [SIMULATOR-MIMARISI.md](./SIMULATOR-MIMARISI.md) (onaylı — AK/FR/SC kaynağı; REV.01/REV.02 dahil).
> **Doğrulama tarihi:** 2026-12-01 — T-1…T-9 tamam.
> **REV notu (2026-10-05):** `SimulatorHost` BSC builder artık `config.details?.rackCount` okur (default 8); `transport.rackCount` referansı kaldırıldı (DEVICE-SERVICE-MIMARISI REV.01 K6).
> **REV.03 (2026-10-21):** Simülatör sözleşmesi `ISimulator` formalize edildi (UC-5) — bkz. §C (aşağıda).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/simulators/src/server/modbus-server-bridge.ts#ModbusServerBridge` | YENİ — jsmodbus event modeli köprü (buffer'sız; FC 01/02/03/04/05/06/0F/10; `writeProtected`/`readProtected` aralık → 0x02; adapter hatası → 0x04) | K3 / UC-1 (REV.01, REV.02) |
| 2 | `packages/simulators/src/server/modbus-server-bridge.test.ts` | YENİ — 13 test (FC seti, koruma, 0x02, hata izolasyonu, edge) | T-2 / UC-1 |
| 3 | `packages/simulators/src/server/simulator-server.ts#SimulatorServer` | YENİ — self-host yaşam döngüsü (köprü + tick setInterval) | K5 / UC-2 |
| 4 | `packages/simulators/src/server/simulator-server.test.ts` | YENİ — 3 test (bind/okuma, stop/start, network yoksa no-op) | UC-2 |
| 5 | `packages/simulators/src/server/index.ts` | YENİ — barrel export | K1/UC-1 |
| 6 | `packages/simulators/src/host.ts#SimulatorHost` | YENİ — `kind==="simulator"` örnekleme + `portFor` indeksi + connector sim kurulumu + fail-fast | K4 / UC-3 / UC-4 |
| 7 | `packages/simulators/src/host.test.ts` | YENİ — 5 test (filtreleme, indeks, bilinmeyen tip, port çakışması, stopAll) | T-6 / UC-3 |
| 8 | `packages/simulators/src/wattox-pcs/bms-face-adapter.ts#WattoxBmsFaceAdapter` | YENİ — BMS-yüzü `IModbusSimulatorAdapter` + `createWattoxBmsBridge` (BMS bloğu dışı 0x02) | K2 istisna / UC-2 (REV.02) |
| 9 | `packages/simulators/src/wattox-pcs/bms-face.test.ts` | YENİ — 5 test (BMS okuma/yazma + dışı 0x02) | UC-2 |
| 10 | `packages/simulators/src/wattox-pcs/bms-port-server.ts` | SİLİNDİ | T-4 / purity 4 |
| 11 | `packages/simulators/src/simulator-transport.ts` (+ `.test.ts`) | SİLİNDİ | K5 / UC-2 / purity 4 |
| 12 | `packages/simulators/src/bsc-pcs-connector/source-reader.ts#TcpSourceReader` | YENİ — `ISourceReader` + `TcpSourceReader` (gerçek TCP) + `AdapterSourceReader` (geçiş shim'i) + `combineWords` | K6 / UC-4 / T-7 |
| 13 | `packages/simulators/src/bsc-pcs-connector/source-reader.test.ts` | YENİ — 4 test | UC-4 |
| 14 | `packages/simulators/src/bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter` | `adapters` map kalktı → `source: ISourceReader`; `network` + `start()/stop()/port()` self-host izleme | UC-4 / T-7 |
| 15 | `packages/simulators/src/bsc-pcs-connector/index.ts` | `ISourceReader`/`TcpSourceReader`/`AdapterSourceReader` export | UC-4 |
| 16 | `packages/simulators/src/{bsc,hvac,cb,dc-output,dc-meter,energy-analyzer,control-panel-io,imd}/…` | Tüm sim sınıflarına `network` config + `start()/stop()/port()` | K5 / UC-2 / T-5 |
| 17 | `packages/simulators/src/wattox-pcs/simulator.ts#WattoxPcsSimulator` | İki-bridge: EMS `network` + BMS `bmsPort`; `ensureBmsServer` → `createWattoxBmsBridge` | K2 istisna / UC-2 |
| 18 | `packages/simulators/src/index.ts` | `SimulatorTransport`/`BmsPortServer` export kaldırıldı; `ModbusServerBridge`/`SimulatorServer`/`SimulatorHost`/`WattoxBmsFaceAdapter`/source-reader export'ları eklendi | purity 4 / UC-1..4 |
| 19 | `packages/simulators/package.json` | `jsmodbus@^4.0.10` dep eklendi | K1 |
| 20 | `services/device-service/deployment/sample-config/*.json` + `deployment/dev/container/device-configs/*.json` | Portlar ayrıcalıksız aralığa taşındı + `connection.host` 127.0.0.1 normalize | K7 / UC-3 / T-8 (sapmalar A.4) |
| 21 | `services/device-service/src/maneuver-command.spec.ts` | E2E harness — `SimulatorHost.start()` → test → `stopAll()` | T-9 / SC-5 |
| 22 | `packages/simulators/src/host.ts#detailNumber` | BSC builder `config.details?.rackCount` (default 8) — `transport.rackCount` referansı kaldırıldı | DEVICE-SERVICE-MIMARISI REV.01 K6 |
| 23 | `packages/simulators/src/bsc/bsc-simulator.ts#BSCSimulator` | SIM-1: kabul edilen komut `activeCommand` alanına latch'lenir; çalışma modu (şarj/deşarj) holding `40010`'dan değil latch'ten türetilir (finalize komutu yürütmeyi durdurmaz). Ayrıca red yollarında (NOT_INITIALIZED/EMERGENCY) 30030 yazımı (M9) | DENETIM-ESLEME-v2 (C3/SIM-1/M9) |
| 24 | `packages/simulators/src/bsc/bsc-simulator.ts#updateSystemRegisters` | H7: sistem hücre gerilimi 35288→3528 (config ölçeği 0.001 V → 3.528 V) | DENETIM-ESLEME-v2 (H7) |
| 25 | `packages/simulators/src/bsc/bsc-simulator.test.ts` | SIM-1 latch birim testi (komut kutusu 0'a yazılsa da şarj sürer) | DENETIM-ESLEME-v2 (SIM-1) |
| 26 | `packages/simulators/src/bsc-pcs-connector/mapping.ts#BscPcsComputedMapping` | YENİ `computed` türü: `to = round(((num×numScale)/(den×denScale))×ratio+offset)`; payda 0 → fallback adres | DENETIM-ESLEME-v2 (C8/PCS4) |
| 27 | `packages/simulators/src/bsc-pcs-connector/connector.ts#tick` | `computed` değerlendirme dalı (güç limiti ÷ DC gerilim → PCS akım limiti) | DENETIM-ESLEME-v2 (C8/PCS4) |
| 28 | `packages/simulators/src/bsc-pcs-connector/connector.test.ts` | YENİ 3 test (computed hesap, payda-0 fallback, eksik denominator parse hatası) | C8/PCS4 |
| 29 | `packages/simulators/src/bsc/bsc-simulator.ts#isCurrentFlowing` + `#handleCommand` | C1/C2: akım akarken Stop/Open All → `Current Flows (0x000A)` reddi; Emergency (0x0001) en yüksek öncelik | DENETIM-ESLEME-v2 (C1/C2/M9) |
| 30 | `packages/simulators/src/bsc/bsc-simulator.test.ts` | YENİ 3 test (Stop reddi, setpoint-0 sonrası Stop kabul, Open All reddi + Emergency) | C1/C2 |
| 31 | `deployment/v2/dev/container/maneuvers/maneuvers.json#bsc_stop` | Demo `bsc_stop` doküman-doğru: setpoint 0 → setpoint 0 → stop (sıralı) | C1 |
| 32 | `packages/simulators/src/bsc/bsc-simulator.ts#inject` | M2: `fault` senaryosu (BSC_INFO b2) — device alarm testi | DENETIM-ESLEME-v2 (M2) |
| 33 | `packages/simulators/src/control-panel-io/{register-map,control-panel-io-simulator}.ts` | F1: Fire (DI 6) + First Stage (DI 7) + `fire`/`first_stage` enjeksiyonu | DENETIM-ESLEME-v2 (F1) |
| 34 | `packages/simulators/src/bsc-pcs-connector/mapping.ts#BscPcsMapping` | PCS14: kök `lossBit` ({to,bit}) — kaynak tümüyle okunamazsa hedef bit set | DENETIM-ESLEME-v2 (PCS14) |
| 35 | `packages/simulators/src/bsc-pcs-connector/connector.ts#tick` | PCS14: `sourceStatus=2` → lossBit set; sağlıklıyken temizle | PCS14 |
| 36 | `packages/simulators/src/bsc-pcs-connector/connector.test.ts` | YENİ 2 test (lossBit set/temizle) | PCS14 |
| 37 | `packages/simulators/src/wattox-pcs/simulator.ts#writeSetting` | PCS12: S01 komut kaynağı kapısı (yerel modda EMS komutları yok sayılır) + `commandSource` config | DENETIM-ESLEME-v2 (PCS12) |
| 38 | `packages/simulators/src/wattox-pcs/wattox-pcs.test.ts` | YENİ 1 test (S01=0 yok say, S01=1 kabul) | PCS12 |
| 39 | `deployment/v2/dev/field/maneuvers/maneuvers.json` | PCS manevralarına `set_command_source` ön adımı (S01=1, sıralı) | PCS12 |
| 40 | `packages/simulators/src/bsc-pcs-connector/mapping.ts#BscPcsSocEnergyMapping` | PCS15: `socEnergy` türü (soc scaled-source, ratedKwh, mode charge/discharge) | DENETIM-ESLEME-v2 (PCS15) |
| 41 | `packages/simulators/src/bsc-pcs-connector/connector.ts#tick` | PCS15: SOC×rated (charge: 1−SOC) değerlendirmesi | PCS15 |
| 42 | `packages/simulators/src/bsc-pcs-connector/connector.test.ts` | YENİ 3 test (discharge/charge hesap + parse hatası) | PCS15 |
| 43 | `packages/simulators/src/bsc/bsc-simulator.ts#handleCommand` | Request-ack tablosu: Start yalnız NotInitialized (0x06), Stop Emergency'den çıkarır (0x0E #16), Event Clear 30 s cooldown (0x12), Open All/Close already-ack (0x08/0x09), Reset akım akarken (0x0A), Initializing (0x07) | FRONTEND-REGISTER (F2.1) |
| 44 | `packages/simulators/src/bsc/bsc-simulator.ts#initRackRegisters` | Rack nameplate: 17 pack, 2 BMIC, 4 sıcaklık, 2 PCB, 24 hücre, 210 A relay, akım sensör tipi | F2.5 |
| 45 | `packages/simulators/src/hvac/{register-map,hvac-simulator}.ts` | HVAC `Server Humidity` (0x2003) + `Compressor Action Count` (0x1028, geçişte artan) | Faz 1 |
| 46 | `packages/simulators/src/bsc/bsc-simulator.test.ts` | +7 request-ack tablosu testi + nameplate testi | F2.1/F2.5 |
| 47 | `packages/simulators/src/imd/imd-simulator.ts` | LGES eşikleri: dirençten uyarı (225 kΩ) / arıza (150 kΩ) türetimi; `warning` enjeksiyonu | F2.6 |
| 48 | `packages/simulators/src/imd/imd.test.ts` | +3 eşik testi (uyarı/arıza/healthy) | F2.6 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| simulators (birim) | `bun run test packages/simulators` | 19 dosya / 194 test yeşil |
| v2/dev entegrasyon (BSC latch/H7) | `bun run test:demo-integration` | 6 dosya / 64 test yeşil (demo-maneuver SIM-1 + device-telemetry H7 dahil) |
| device-service (bağımlı — regresyon) | `bun run test services/device-service` | 10 dosya / 85 test yeşil; `maneuver-command.spec.ts` 6/6 (gerçek TCP self-host E2E) |
| simulators tip denetimi | `tsc --noEmit` | temiz |
| device-service tip denetimi | `tsc --noEmit` | test-tipleri ÖNCEDEN VAR OLAN borç (sapma A.4/9) |
| lint kapısı | `bun run spec:check docs/architecture/SIMULATOR-KAPANIS.md docs/architecture/DEVICE-SERVICE-KAPANIS.md` | temiz |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Tam FC seti + anlık değer (gerçek `ModbusTcpClient`) | `modbus-server-bridge.test.ts` (FC 03/04/01/02) | 🟢 |
| AK-1.2 | Yazma koruması + 0x02 (adapter'a GİTMEZ) | `modbus-server-bridge.test.ts` (tek/çoklu/coil/kesişim) | 🟢 |
| AK-1.3 | Hata izolasyonu — exception döner, server ayakta | `modbus-server-bridge.test.ts` (adapter hatası) | 🟢 |
| AK-1.4 | Okuma koruması + 0x02 (REV.02) | `modbus-server-bridge.test.ts` (ranges yoksa tüm tablo, coil) | 🟢 |
| AK-2.1 | Self-host bind + okuma | `simulator-server.test.ts` + `host.test.ts` | 🟢 |
| AK-2.2 | stop/start döngüsü (idempotent) | `simulator-server.test.ts` | 🟢 |
| AK-2.3 | BmsPortServer migrasyonu — davranış eşitliği | `bms-face.test.ts` (BMS dışı yazım 0x02) | 🟢 |
| AK-2.4 | BMS dışı okuma 0x02 (readProtected) | `bms-face.test.ts` | 🟢 |
| AK-3.1 | `kind` sinyali filtreleme | `host.test.ts` | 🟢 |
| AK-3.2 | Port indeksi (`portFor`) | `host.test.ts` | 🟢 |
| AK-3.3 | 1 kayıt kuralı (yeni tip = 1 satır) | kod inceleme `host.ts#registerDefaults` | 🟢 |
| AK-3.4 | Benzersiz portlar (çakışma fail-fast) | `host.test.ts` (port çakışması edge) | 🟢 |
| AK-4.1 | TCP master okuma + dönüşüm | `source-reader.test.ts` + `connector.test.ts` | 🟢 |
| AK-4.2 | Hedef seçimi (override/mapping) | `connector.test.ts` + `tcp-target.test.ts` | 🟢 |
| AK-4.3 | İzleme register yayını | `connector.test.ts` (readInputRegister 8 reg) | 🟢 |
| SC-1 | Gerçek `ModbusTcpClient` ile register-accurate (E2E) | `maneuver-command.spec.ts` (device-service — 6/6) | 🟢 |
| SC-2 | device-service'te simulator dallanması grep=0 | DEVICE-SERVICE-KAPANIS.md SC-7 (çapraz kapı) | 🟢 |
| SC-3 | Bridge/host/connector coverage ≥%90 | coverage raporu ayrı koşulur — B.2/G1 | 🟡 |
| SC-4 | `spec:check` temiz | `bun run spec:check` | 🟢 |
| SC-5 | `maneuver-command.spec.ts` E2E yeşil | 6/6 geçti | 🟢 |
| SC-6 | `SimulatorTransport`/`BmsPortServer` sınıfları YOK | grep — dosyalar silindi (A.1/10,11) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `ep203:15503` uygulanmadı | `ep203` simülatör DEĞİL — gerçek panel (config `kind` simulator taşımaz, port 502 kalır). SPEC T-8'in `ep203:15503` maddesi geçerli değil; ep203 config'i değişmedi. |
| 2 | Port reassignment SPEC 4-port kapsamını aştı | SPEC T-8 yalnız 4 çakışan portu (502) hedefliyordu; gerçekte TÜM simülatör portları ayrıcalıksız (>1024) aralığa taşındı. Gerekçe: self-host bind <1024 root yetkisi ister → EACCES. Etkilenen: bsc-1/2, pm5340, hvac-1..8, cb-1/2, dc-output-1/2, control-panel-io, imd + connector izleme portu. |
| 3 | `bsc-2` 15502 DEĞİL 15510 | Mapping `target.port` 15502 (PCS BMS — `bsc-pcs-mapping.json`) ile çakışmayı önlemek için bsc-2 15510'a taşındı. 15502 yalnız PCS BMS bridge'ine ait. |
| 4 | `pm5340` host 192.168.1.100 → 127.0.0.1 | Gerçek panel IP'si bind edilebilir değil (self-host simülatör artık localhost'ta açılır); normalize `connection.host` 127.0.0.1'e çekildi. |
| 5 | SIMULATOR §4.2 hook modeli → event modeli (REV.01) + `readProtected` + Wattox iki-bridge (REV.02) | jsmodbus hook modeli yazma reddini/0x02'yi desteklemiyor (`postWrite` yazmadan sonra çalışır). Event modeli + `readProtected` (BMS bloğu dışı okuma 0x02) + Wattox PCS için iki-bridge istisnası SPEC'e REV.01/REV.02 ile işlendi. |
| 6 | Connector `adapters` (in-process) → `ISourceReader`/`TcpSourceReader` | UC-4/T-7 — kaynak okuma soyutlaması netleştirildi: üretim `TcpSourceReader` (gerçek TCP); `AdapterSourceReader` geçiş shim'i olarak tutuldu (host devreye girip registry silinince kaldırılır). |
| 7 | Connector izleme portu 15505 (yeni) | Eski `bsc-pcs-connector-1.json` `connection: {}` (in-process) idi; türetilen connector cihazı artık gerçek TCP cihaz — `bsc-1.json` `connector.device.connection.port` 15505 olarak gömüldü. |
| 8 | `dc-meter` port 5030 değişmedi | Zaten ayrıcalıksız (>1024) — reassignment kapsamına girmedi. |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — simülatör bilgisi yalnız `packages/simulators`'ta; device-service import yok (SC-2/SC-7 çapraz kapı)
- [x] Purity 2 — `packages/core`'a değişiklik YOK; connector master jsmodbus client API'sini doğrudan kullanır (`source-reader.ts#TcpSourceReader`)
- [x] Purity 3 — `IModbusSimulatorAdapter` sözleşmesi korundu; simülatör domain davranışı değişmedi (yalnız erişim yolu TCP'ye döndü)
- [x] Purity 4 — `SimulatorTransport`/`BmsPortServer` silindi (grep = 0)
- [x] Purity 5 — shared-types schema `kind:"simulator"` değişmedi (host sinyali kalır)
- [x] DI — tüm sınıflar birincil constructor + config obje (`ModbusServerBridgeConfig`, `SimulatorServerConfig`, `SimulatorHostOptions`, `BscPcsConnectorAdapterConfig`)
- [x] Yaşam döngüsü — `start()/stop()/port()` idempotent; port dolu/çakışma/bilinmeyen tip fail-fast
- [x] Async loop — `host.ts#start`/`#stopAll` `Promise.allSettled` kullanır (sıralı for...of await YOK)
- [x] Named export — `index.ts` barrel'ları güncel (default export YOK)

### A.6 Genel Durum Özeti

Simülatör altyapısı in-process adapter (`SimulatorTransport`) deseninden self-host Modbus TCP server desenine geçti: her simülatör config'teki `connection.host/port`'a bind olan gerçek bir `ModbusServerBridge` olur (jsmodbus event modeli), device-service artık saf TCP görür. T-1…T-9 tamamlandı; 15 test dosyası / 136 test yeşil, bağımlı device-service regresyonu (85 test + 6/6 E2E) yeşil, tip denetimi simulators'ta temiz. `SimulatorTransport` ve `BmsPortServer` silindi; Wattox PCS iki-bridge'e (EMS + BMS) ayrıldı, BMS bloğu dışı erişim `readProtected`/`writeProtected` ile 0x02 reddediliyor. Port reassignment'ı SPEC'in 4-port kapsamını aşarak tüm simülatörleri ayrıcalıksız aralığa taşıdı (A.4/2) — bu genişleme self-host bind'in root gerektiren <1024 sınırlamasından kaynaklanıyor. Açık kalan tek koşullu kanıt coverage ≥%90 raporu (SC-3) — ayrıca koşulmalı. **review_date:** 2026-10-13.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `start()` — port dolu/çakışma | yinelenen port | fail-fast (açılış reddi; kısmen açılanlar kapanır) | `host.test.ts` (port çakışması) |
| `start()` — bilinmeyen sim tipi | `builders` haritasında yok | fail-fast (`Bilinmeyen simulator tipi`) | `host.test.ts` (bilinmeyen tip) |
| Okuma — FC 01/02/03/04 | adapter'da değer set'li | anlık register değeri döner (buffer'sız) | `modbus-server-bridge.test.ts` |
| Yazma — korunan aralık | `writeProtected` eşleşmesi | `ExceptionResponseBody(fc, 0x02)`, adapter'a GİTMEZ | `modbus-server-bridge.test.ts` + `bms-face.test.ts` |
| Okuma — korunan aralık (REV.02) | `readProtected` eşleşmesi | 0x02, adapter'a okuma GİTMEZ | `modbus-server-bridge.test.ts` + `bms-face.test.ts` |
| Adapter okuma/yazma hatası | aralık dışı/throw | `ExceptionResponseBody(fc, 0x04)`, server ayakta | `modbus-server-bridge.test.ts` |
| Tick hatası (fizik evrimi) | `tick` throw | yakalanır, server çalışmaya devam | gözle (izolasyon — `simulator-server.ts#start` setInterval) |
| İstemci kopması | per-connection | diğer bağlantılar etkilenmez | gözle (jsmodbus per-connection) |
| `stop()` | start'sız/tekrar | no-op (idempotent) | `modbus-server-bridge.test.ts` + `simulator-server.test.ts` |
| `stopAll()` | host geneli | tüm sunucular kapanır (idempotent) | `host.test.ts` |
| Connector — kaynak server kapalı | okuma throw | kademeli bozulma (sourceStatus=2, satır atlanır) | `connector.test.ts` |
| Connector — BMS kopuk | yazım throw | link=0 + fail sayacı, her tick retry | `connector.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Coverage ≥%90 raporu (SC-3) bu oturumda koşulmadı | düşük | `nx run simulators:test --coverage` ile doğrula |
| G2 | RTU server simülasyonu (pty/socat) | düşük | SPEC A1 — cihaz ihtiyacında (İleri İş §11) |
| G3 | Replay/scripted server (kayıtlı frame oynatma) | düşük | İleri İş §11 |
| G4 | Arıza enjeksiyonu (kayıp frame, timeout, yanlış CRC) | orta | E2E sağlamlaştırma — İleri İş §11 |
| G5 | Connector çoklu kaynak (çift BSC agregasyonu) | orta | SPEC A3 — Faz 2 |
| G6 | `AdapterSourceReader` geçiş shim'i üretimde kullanılmıyor | düşük | registry silinmesiyle kaldırılır (`host.ts` yalnız `TcpSourceReader` kullanır) |
| G7 | Tick hatası izolasyonu otomatik testle sabitlenmedi (yalnız gözle) | düşük | `simulator-server.test.ts`'e throw eden tick senaryosu eklenebilir |

## C. REV.03 — Simülatör Sözleşmesi (UC-5)

> REV.03 kapanışı: `ISimulator` interface'i tek kaynak olarak `contracts.ts`'te; host ve tüm simülatörler bu sözleşmeye bağlandı (SPEC K8/UC-5). REV.02'ye kadar olan kapsam (A/B bölümleri) değişmedi.

### C.1 Değişiklik Matrisi (REV.03)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/simulators/src/contracts.ts#ISimulator` | YENİ — `deviceId` (readonly) + `start()` + `stop()` + opsiyonel `inject(scenario)` | K8 / FR-5.1 / FR-5.2 |
| 2 | `packages/simulators/src/contracts.ts#requireDeviceId` | YENİ — boş `deviceId` fail-fast (`IllegalArgumentException` eşdeğeri) | K8 / edge |
| 3 | `packages/simulators/src/host.ts#SelfHostedSimulator` | `ISimulator`'ü genişletir (self-host ek olarak port açar) | K8 / FR-5.3 |
| 4 | `packages/simulators/src/host.ts#SimulatorBuilder` | `ISimulator` döner (duck-typing dallanması kalktı) | K8 / FR-5.3 |
| 5 | `packages/simulators/src/host.ts#SimulatorHost` | `ISimulator` üzerinden yönetim + `inject` interface üzerinden sorgulanır | FR-5.2 / FR-5.3 |
| 6 | `packages/simulators/src/*/*-simulator.ts` | Tüm simülatörlere `deviceId` readonly alanı (config'ten) | FR-5.1 |
| 7 | `packages/simulators/src/contracts.test.ts` | YENİ — interface uyumu + opsiyonel inject testleri | T-11 / FR-5.1..5.3 |
| 8 | `packages/simulators/src/index.ts` | Barrel export (`ISimulator`, `requireDeviceId`) | T-13 / FR-5.4 |
| 9 | `docs/architecture/SIMULATOR-MIMARISI.md` §4.4 | Yeni simülatör üretim checklist'i yayınlandı | K8 / FR-5.4 |

### C.2 Test Kanıtları (REV.03)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tam test paketi | `bun run test` | 294 dosya / 2558 test yeşil |
| Simülatörler (birim) | `nx run simulators:test` | yeşil (`contracts.test.ts` dahil) |
| Tip denetimi | `tsc --noEmit` (simulators) | temiz (tüm simülatörler `ISimulator` karşılar) |
| Lint kapısı | `bun run spec:check docs/architecture/SIMULATOR-MIMARISI.md` | 0 hata |

### C.3 Kabul Kriteri Kanıtları (REV.03)

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-5.1 | Sözleşme uyumu (deviceId/start/stop) | `contracts.test.ts` + typecheck | 🟢 |
| AK-5.2 | Opsiyonel inject (desteklemeyen → false) | `contracts.test.ts` | 🟢 |
| AK-5.3 | Host interface kullanımı | `contracts.test.ts` + kod inceleme `host.ts#SimulatorBuilder` | 🟢 |
| AK-5.4 | Checklist dokümanı | `SIMULATOR-MIMARISI.md` §4.4 gözle kontrol | 🟢 |
| SC-7 | Tüm simülatörler `ISimulator`'ü karşılar | typecheck + `nx run simulators:test` | 🟢 |
| SC-8 | Checklist SPEC §4.4'te yayınlı | gözle kontrol | 🟢 |

### C.4 Sapmalar (REV.03)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `inject` desteklemeyen simülatör `false` döner, hata fırlatmaz | SPEC K8 `inject` opsiyonel; `CbSimulator` gibi senaryo desteği olmayanlar interface'i uygulamaz — `host.inject` `false` döner (mevcut davranış korunur). |
| 2 | Base class YOK — yaşam döngüsü `SimulatorServer` kompozisyonu | SPEC K8 kararı; kalıtım yerine kompozisyon (Elegant Object). |

### C.5 Kapsam Matrisi (REV.03)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `inject` desteklemeyen simülatör | `host.inject(deviceId, scenario)` | `false` döner, hata fırlatmaz | `contracts.test.ts` |
| Bilinmeyen simülatör tipi | `builders` haritasında yok | fail-fast (mevcut K4 davranışı) | `host.test.ts` |
| `deviceId` boş | config'te boş/whitespace | constructor fail-fast | `contracts.test.ts` (`requireDeviceId`) |
| `start()`/`stop()` ikinci çağrı | idempotent | no-op | `simulator-server.test.ts` (REV.02 kapsamı) |

### C.6 KAPSANMAYAN Boşluklar (REV.03)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Coverage ≥%90 raporu (SC-3) bu oturumda koşulmadı | düşük | `nx run simulators:test --coverage` |
| G2 | Yeni simülatör checklist'i bir sonraki gerçek üretimde sınanmadı (yalnız dokümante) | düşük | İlk yeni simülatörde checklist izlenir |

**review_date:** 2026-10-21
