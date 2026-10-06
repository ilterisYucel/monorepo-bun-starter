---
status: active
space: architecture
tags: [mimari, simulator, modbus-server, jsmodbus, self-host, spec]
review_date: 2026-12-01
---

# Simülatör Altyapısı — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 Doğrulanmış (2026-10-05) — T-1…T-9 tamam, doğrulama SIMULATOR-KAPANIS.md'de.
> **REV.01 (2026-10-05):** UC-1 köprü mekanizması jsmodbus **event modeline** çevrildi
> (hook modeli yazma reddini/exception 0x02'yi desteklemiyor); `writeProtected` holding/coil
> **aralık listesi** olarak netleştirildi; AK-1.2 buna göre yeniden yazıldı. Gerekçe: jsmodbus
> server yanıtı hook'tan üretmeden önce yazar ve `postWrite` yazma uygulandıktan sonra çalışır.
> **REV.02 (2026-10-05):** Okuma koruması `readProtected` olarak eklendi (BMS bloğu dışı okuma
> 0x02 — eski `BmsPortServer` davranışı korunur); Wattox PCS için K2'ye **iki-bridge istisnası**
> (EMS `connection.port` + BMS `bmsPort`) tanımlandı.
> **İlişkili:** [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md) (bağımlı değişiklikler — K8/UC-5), [SANAL-IO-CIHAZ-AILESI-MIMARISI.md](./SANAL-IO-CIHAZ-AILESI-MIMARISI.md) (simülatör aile deseni), [PCS-WATTOX-MIMARISI.md](./PCS-WATTOX-MIMARISI.md) (`BmsPortServer` kaynağı — bu SPEC'te genel köprüye dönüşür).

---

## 1. Amaç ve Bağlam

**Sorun:** Simülatörler device-service'e in-process adapter (`SimulatorTransport` → `IModbusSimulatorAdapter`) üzerinden bağlanıyor; gerçek TCP/RTU kod yolu hiç kullanılmıyor. Sonuç: (a) üretim ve simülasyon arasında iki ayrı cihaz yolu, (b) simülatör karmaşası device-service'e sızmış (registry, transport dallanması), (c) gerçekçi olmayan test ortamı.

**Çözüm:** Her simülatör config'teki `connection.host/port`'a bind olan **gerçek bir Modbus server** olur (1 simülatör = 1 server, gerçek cihaz gibi). device-service saf TCP görür; simülatör bilgisi `packages/simulators`'ta kalır.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| packages/simulators | `ModbusServerBridge` (jsmodbus ↔ adapter), self-host yaşam döngüsü, host eşlemesi, connector master dönüşümü | — |
| device-service | Config port düzeltmeleri (15501-15504) | Simulator dalı çekimi (DEVICE-SERVICE-MIMARISI K8/UC-5 — bağımlı SPEC eklemesi) |
| shared-types | — | Schema değişikliği YOK (`kind:"simulator"` kalır) |
| RTU server simülasyonu | — | A1 (pty/socat altyapısı — cihaz ihtiyacında) |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-09-24)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **jsmodbus** server tarafı kullanılır (TCP şimdi, RTU aynı kütüphaneyle — A1). `packages/simulators`'a `jsmodbus` dep'i eklenir; yeni kütüphane YOK (core'da zaten client olarak var) | UC-1 |
| K2 | **1 simülatör = 1 self-host server:** örneklenen simülatör config'in `connection.host/port`'una bind eder; `start()` server+tick birlikte açar, `stop()` kapatır (`BmsPortServer` deseni tüm aileye genellenir). **İstisna — Wattox PCS (REV.02):** iki mantıksal yüz → `connection.port` (EMS) + `bmsPort` (BMS); her yüz kendi `ModbusServerBridge`'i (EMS adapter / BMS-yüzü adapter) | UC-2 |
| K3 | **`ModbusServerBridge` (REV.01 — event modeli):** jsmodbus server **buffer'sız** kurulur; `readCoils/readDiscreteInputs/readHoldingRegisters/readInputRegisters` + `writeSingleCoil/writeSingleRegister/writeMultipleCoils/writeMultipleRegisters` event'leri ↔ `IModbusSimulatorAdapter`; yanıt `ModbusTCPResponse.fromRequest` + `responses.*` ile üretilir; `writeProtected` **aralık listesi** dışındaki holding/coil yazımı `ExceptionResponseBody(fc, 0x02)` ile reddedilir; **REV.02:** `readProtected` aralık listesi dışındaki okuma da aynı biçimde 0x02 ile reddedilir | UC-1 |
| K4 | **Host eşlemesi:** config listesi → `kind === "simulator"` olanlar örneklenir; deviceId→port indeksi connector kaynak çözümü için kurulur; "yeni simülatör = modül + host'a 1 kayıt satırı" | UC-3 |
| K5 | **Tick simülatörün kendisine taşınır** (`start()` içinde setInterval; opsiyonel `tickIntervalMs`, default 1000 ms) | UC-2 |
| K6 | **Connector sim-stack master'ı olur:** TCP master (kaynak BSC server'ına + hedef PCS BMS'ye) + kendi server portu; `from.deviceId` host port indeksinden çözülür; `PCS_BMS_TARGET_*` env'i host option'ı; master jsmodbus client API'si kullanır (core sarmalayıcısı DEĞİL — simulators core'a bağımlı OLMAZ) | UC-4 |
| K7 | **Config biçimi DEĞİŞMEZ:** `kind:"simulator"` KALIR (host'un tek sinyali); `connection.host/port` = server bind adresi (127.0.0.1 + benzersiz statik port); çakışan 4 port düzeltilir (15501-15504) | UC-3 |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | In-process `SimulatorTransport` deseni — gerçek TCP yolu bypass ediliyor (iki ayrı cihaz yolu) | `packages/simulators/src/simulator-transport.ts#SimulatorTransport` |
| B2 | `BmsPortServer` kısıtlı FC seti (yalnız 03/06/10) — genel köprüye dönüşmesi gerek | `packages/simulators/src/wattox-pcs/bms-port-server.ts#BmsPortServer` |
| B3 | `bmsTarget` deployment env'i registry'ye sızıyor | `services/device-service/src/simulator-registry.ts#SimulatorRegistry` |
| B4 | Config'lerde `connection.port` bugün bypass — 502 çakışması (bsc-1, bsc-2, ep203, pm5340) | `services/device-service/config/bsc-1.json` |

---

## 4. Mimari

### 4.1 Akış

```
config dosyaları (ortak configDir)
   │
   ├──► Host (packages/simulators) — kind === "simulator" olanlar:
   │      1 config = 1 simülatör örneği (self-host)
   │         ├── ModbusServerBridge ← jsmodbus TCP server ← IModbusSimulatorAdapter
   │         ├── tick (fizik evrimi — simülatörün kendi içinde)
   │         └── deviceId→port indeksi (connector kaynak çözümü)
   │      connector (BSC config'inin connector bölümü):
   │         ├── TCP master → BSC server (indeksten) + PCS BMS (mapping/env hedef)
   │         └── kendi server portu (izleme register'ları)
   │
   └──► device-service (DEVICE-SERVICE-MIMARISI K8):
          her cihaz = ModbusDevice → ModbusTcpClient(connection.host/port)
          (simulator kelimesi/dallanması YOK)
```

### 4.2 Sözleşmeler (JSDoc aşaması girdisi)

```ts
// packages/simulators/src/server/modbus-server-bridge.ts
interface ModbusServerBridgeConfig {
  adapter: IModbusSimulatorAdapter;      // veri kaynağı — mevcut sözleşme korunur
  host?: string;                          // bind adresi (default 127.0.0.1)
  port: number;                           // config connection.port
  writeProtected?: { table: "holding" | "coil"; ranges?: [number, number][] }; // ranges yoksa tüm tablo korunur
  readProtected?: { table: "holding" | "coil" | "discrete" | "input"; ranges?: [number, number][] }; // REV.02
}

class ModbusServerBridge {
  constructor(config: ModbusServerBridgeConfig)   // birincil constructor (doğrulama: port>0)
  start(): Promise<void>                          // net server + ModbusTCPServer (buffer'sız) + event handler'lar
  stop(): Promise<void>                           // server kapatma (idempotent)
}

// packages/simulators/src/host.ts
interface RunningSimulator { deviceId: string; port: number; stop(): Promise<void> }

class SimulatorHost {
  constructor(configs: DeviceConfigFile[], options?: { bmsTarget?: { host?: string; port?: number } })
  start(): Promise<RunningSimulator[]>            // kind==="simulator" olanlar örneklenir
  stopAll(): Promise<void>
}
```

- **Okuma (event modeli):** `readCoils` / `readDiscreteInputs` / `readHoldingRegisters` / `readInputRegisters` event'i yayılır (server buffer'ı YOK) → adapter'dan **anlık** değerler alınıp `responses.*` + `ModbusTCPResponse.fromRequest` ile yanıt üretilir (register-accurate).
- **Yazma (event modeli):** `writeSingleCoil` / `writeSingleRegister` / `writeMultipleCoils` / `writeMultipleRegisters` event'i → `writeProtected` aralık kontrolü; izinliyse adapter'a yazılır + normal yanıt, korunuyorsa `ExceptionResponseBody(fc, 0x02)` döner (adapter'a yazım GİTMEZ).
- **Okuma koruması (REV.02):** `readProtected` eşleşen aralık → `ExceptionResponseBody(fc, 0x02)` döner (adapter'a okuma GİTMEZ); eşleşmiyorsa normal akış.

### 4.3 Simülatör deseni (self-host)

Her simülatör sınıfı: `constructor(config)` + `start(): Promise<void>` (köprü + tick açar) + `stop(): Promise<void>` — `SimulatorTransport`'ın tick/sunucu rolleri sınıfın içine geçer; `IModbusSimulatorAdapter` sözleşmesi DEĞİŞMEZ (register portu olarak kalır, artık köprünün veri kaynağıdır).

---

## 5. Purity Kuralları (ZORUNLU)

1. Simülatör bilgisi YALNIZ `packages/simulators`'ta yaşar — device-service'e simulator kavramı/dallanması SIZMAZ (bağımlı SPEC kapısı: DEVICE-SERVICE-MIMARISI K8/SC).
2. `packages/core`'a DEĞİŞİKLİK YOK — connector master jsmodbus client API'sini doğrudan kullanır; simulators core'a bağımlı OLMAZ.
3. `IModbusSimulatorAdapter` sözleşmesi korunur — simülatör domain davranışı (register-accurate algoritmalar) DEĞİŞMEZ, yalnızca erişim yolu TCP'ye döner.
4. `SimulatorTransport` sınıfı SİLİNİR — tick/sunucu rolleri simülatöre taşınır (K5).
5. shared-types schema'sı DEĞİŞMEZ (`kind:"simulator"` host sinyali olarak kalır).

---

## 6. Use Case'ler

### 6.1 UC-1 — ModbusServerBridge

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: jsmodbus TCP server sarmalayıcı, tam FC seti, adapter sarımı, yazma koruması, exception 0x02
- hariç: RTU transport (A1), simülatör domain davranışı

**Akış:**
1. `new ModbusServerBridge({ adapter, port, writeProtected? })` — doğrulama
2. `start()` → net server + `ModbusTCPServer` (buffer'sız) + event handler'lar (tam FC seti)
3. Okuma event'i → adapter'dan (async) anlık register değerleri → `responses.*` + `ModbusTCPResponse` ile yanıt
4. Yazma event'i → `writeProtected` aralık kontrolü → adapter'a uygula VEYA `ExceptionResponseBody(0x02)`

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | FC 01/02/03/04/05/06/0F/10 desteklenir; okumalar adapter'dan ANLIK değer döner (event modeli — server buffer'ı yok) | AK-1.1 |
| FR-1.2 | Yazımlar adapter'a iletilir; `writeProtected` (holding/coil aralık) yazımı `ExceptionResponseBody` 0x02 ile reddedilir — adapter'a GİTMEZ | AK-1.2 |
| FR-1.3 | Adres dışı/geçersiz istek bridge'i KIRMAZ — exception döner, server ayakta kalır | AK-1.3 |
| FR-1.4 | `readProtected` aralığındaki okuma `ExceptionResponseBody` 0x02 ile reddedilir — adapter'a okuma GİTMEZ (REV.02) | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** köprü start'lı ve adapter'da değer set'li **WHEN** istemci FC 03/04/01/02 ile okur **THEN** anlık register değerleri doğru döner
2. **AK-1.2 — GIVEN** `writeProtected: { table:"holding", ranges:[[0,99]] }` **WHEN** istemci 5. holding register'a yazar **THEN** exception 0x02 döner, adapter'a yazım GİTMEZ
3. **AK-1.3 — GIVEN** aralık dışı adres isteği **WHEN** gelir **THEN** exception döner, sonraki geçerli istek normal yanıtlanır
4. **AK-1.4 — GIVEN** `readProtected: { table:"holding", ranges:[[100,199]] }` **WHEN** istemci 150. holding register'ı okur **THEN** exception 0x02 döner; korunmayan adres normal okunur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Tam FC seti + anlık değer (gerçek `ModbusTcpClient` ile) | unit | ⬜ |
| AK-1.2 | Yazma koruması + 0x02 | unit | ⬜ |
| AK-1.3 | Hata izolasyonu | unit | ⬜ |
| AK-1.4 | Okuma koruması + 0x02 (REV.02) | unit | ⬜ |

**T Görev Listesi:**
- [x] T-1: `jsmodbus` dep'i + bridge JSDoc/tipler (`server/modbus-server-bridge.ts`)
- [x] T-2: Kırmızı testler — FC seti, yazma/okuma koruması, 0x02 (`modbus-server-bridge.test.ts`)
- [x] T-3: Bridge implementasyonu

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Port dolu | `start()` reddeder (fail-fast — açılış hatası) |
| İstemci kopması | jsmodbus per-connection — diğer bağlantılar etkilenmez |
| `stop()` start'sız çağrı | No-op (idempotent) |
| Adapter okuma/yazma hatası | `ExceptionResponseBody(fc, 0x04 SLAVE DEVICE FAILURE)` döner, server ayakta kalır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/server/modbus-server-bridge.ts` | YENİ — köprü |
| `packages/simulators/src/server/modbus-server-bridge.test.ts` | YENİ — UC-1 testleri |
| `packages/simulators/package.json` | jsmodbus dep eklenir |

### 6.2 UC-2 — Self-Host Yaşam Döngüsü

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: simülatör sınıflarının `start()`/`stop()` kazanması (köprü + tick), `BmsPortServer`'ın genel köprüye migrasyonu
- hariç: host eşlemesi (UC-3), connector (UC-4)

**Akış:**
1. `new BscSimulator({ ...params, host, port, tickIntervalMs? })` — self-host config
2. `start()` → `ModbusServerBridge.start()` + tick setInterval
3. `stop()` → tick durur + köprü kapanır
4. `SimulatorTransport` silinir — rolleri sınıfa taşınır

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Örneklenen simülatör config'in `connection.host/port`'una bind eder; `start()` server+tick açar | AK-2.1 |
| FR-2.2 | `stop()` server+tick kapatır; tekrar `start()` güvenlidir | AK-2.2 |
| FR-2.3 | Wattox PCS iki bridge'e ayrılır (EMS `connection.port` + BMS `bmsPort`); `BmsPortServer` → BMS-yüzü `ModbusServerBridge` + BMS adapter — davranış aynı kalır | AK-2.3 |
| FR-2.4 | BMS bloğu dışı okuma `readProtected` ile 0x02 reddedilir (eski `BmsPortServer` davranışı) | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** BSC simülatörü `{host:"127.0.0.1", port:15501}` ile örneklenir **WHEN** `start()` çağrılır **THEN** istemci 127.0.0.1:15501'den register okur
2. **AK-2.2 — GIVEN** simülatör start'lı **WHEN** `stop()` sonra tekrar `start()` **THEN** server aynı portta yeniden açılır
3. **AK-2.3 — GIVEN** Wattox PCS start'lı **WHEN** BMS bloğu dışına yazım gelir **THEN** exception 0x02 — eski `BmsPortServer` davranışı korunur
4. **AK-2.4 — GIVEN** Wattox BMS bridge start'lı **WHEN** istemci BMS bloğu dışı holding okur **THEN** exception 0x02

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Self-host bind + okuma | unit (gerçek TCP) | ⬜ |
| AK-2.2 | stop/start döngüsü | unit | ⬜ |
| AK-2.3 | BmsPortServer migrasyonu — davranış eşitliği | unit | ⬜ |
| AK-2.4 | BMS dışı okuma 0x02 (readProtected) | unit | ⬜ |

**T Görev Listesi:**
- [x] T-4: `BmsPortServer` migrasyonu — Wattox PCS genel köprüye geçer, eski sınıf silinir
- [x] T-5: Tüm simülatör ailesine self-host entegrasyonu (bsc, xrack, hvac, cb, dc-output, dc-meter, energy-analyzer, control-panel-io, imd, wattox-pcs) + `SimulatorTransport` silinir

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Port dolu | `start()` reddeder — host açılışta fail-fast |
| Tick hatası | Yakalanır — server çalışmaya devam eder (izolasyon) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/<tip>/<tip>-simulator.ts` | start/stop + tick taşınması |
| `packages/simulators/src/wattox-pcs/bms-port-server.ts` | SİLİNİR (BMS-yüzü bridge'e dönüşür) |
| `packages/simulators/src/wattox-pcs/bms-face-adapter.ts` | YENİ — `IModbusSimulatorAdapter` BMS yüzü (holding→BMS read/setBms) |
| `packages/simulators/src/simulator-transport.ts` | SİLİNİR |

### 6.3 UC-3 — Host Eşlemesi

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: config listesi → örnekleme (`kind` sinyali), deviceId→port indeksi, 1 kayıt kuralı, config port düzeltmeleri
- hariç: device-service tarafı değişiklikleri (DEVICE-SERVICE-MIMARISI eklemesi)

**Akış:**
1. `new SimulatorHost(configs, options)` — config listesi (DeviceConfigLoader çıktısı)
2. `start()` → `kind === "simulator"` olan config'ler örneklenir (type → sınıf eşlemesi — 1 kayıt)
3. deviceId→port indeksi kurulur (connector kaynak çözümü)
4. `stopAll()` → tüm örnekler kapatılır

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `kind === "simulator"` config'ler örneklenir; diğerleri ATLANIR | AK-3.1 |
| FR-3.2 | deviceId→port indeksi kurulur (connector kaynak çözümü için) | AK-3.2 |
| FR-3.3 | Yeni simülatör tipi = host'a 1 kayıt satırı (başka kod değişikliği YOK) | AK-3.3 |
| FR-3.4 | Config portları benzersizdir — 502 çakışmaları 15501-15504'e düzeltilir | AK-3.4 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** config listesi simulator + gerçek cihaz karışık **WHEN** `start()` çalışır **THEN** yalnız simulator config'ler için server açılır
2. **AK-3.2 — GIVEN** connector config'i `from.deviceId: "BSC-1"` **WHEN** indeks sorgulanır **THEN** BSC-1'in portu döner
3. **AK-3.3 — GIVEN** yeni sim tipi eklenir **WHEN** host güncellenir **THEN** yalnız 1 kayıt satırı değişir (kod inceleme)
4. **AK-3.4 — GIVEN** config dizini yüklenir **WHEN** portlar denetlenir **THEN** iki config aynı portta DEĞİLDİR

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | kind sinyali filtreleme | unit | ⬜ |
| AK-3.2 | Port indeksi | unit | ⬜ |
| AK-3.3 | 1 kayıt kuralı | kod inceleme | ⬜ |
| AK-3.4 | Benzersiz portlar | unit (config denetim testi) | ⬜ |

**T Görev Listesi:**
- [x] T-6: `SimulatorHost` — örnekleme + port indeksi + `stopAll()` (+testler)
- [x] T-8: Config port düzeltmeleri — bsc-1:15501, bsc-2:15502, ep203:15503, pm5340:15504 (`config/` + `deployment/config-docker/` kopyaları)
- [x] T-9: E2E harness — `maneuver-command.spec.ts` config dizininden server'ları kaldırır (host.start → test → stopAll)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bilinmeyen sim tipi | Fail-fast (açılış hatası — eski uyarı+atla davranışına karşı: bilinmeyen tip config hatasıdır) |
| İki config aynı port | `start()` reddeder (fail-fast) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/host.ts` | YENİ — SimulatorHost |
| `packages/simulators/src/host.test.ts` | YENİ — UC-3 testleri |
| `services/device-service/config/*.json` + `deployment/config-docker/*.json` | Port düzeltmeleri |
| `services/device-service/src/maneuver-command.spec.ts` | E2E harness güncellemesi |

### 6.4 UC-4 — Connector Sim (TCP Master)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: BSC-PCS connector'ın sim-stack master'ına dönüşümü — TCP master (kaynak BSC + hedef PCS BMS) + kendi server portu
- hariç: connector device girişinin device-service'te türetilmesi (DEVICE-SERVICE-MIMARISI §4.5)

**Akış:**
1. Host, BSC config'inin `connector` bölümünden connector sim'ini örnekler
2. `from.deviceId` → host port indeksinden kaynak port çözülür → TCP master kurulur
3. Hedef = `bmsTarget` override (env) varsa o, yoksa mapping'teki `target`
4. Tick: kaynak oku → dönüştür (ratio/offset/bit) → hedefe yaz → izleme register'ları güncelle
5. Kendi server portunda izleme telemetrisi yayınlanır (device-service bu porttan okur)

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Kaynak BSC register'ları TCP üzerinden okunur (in-process adapter YOK) | AK-4.1 |
| FR-4.2 | Hedef PCS BMS'ye TCP yazılır; `bmsTarget` verilmezse mapping hedefi korunur | AK-4.2 |
| FR-4.3 | İzleme register'ları (link/sayaçlar/son yazım) kendi server portunda yayınlanır | AK-4.3 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** BSC server'ı start'lı **WHEN** connector tick'lenir **THEN** kaynak değer TCP'den okunur, dönüştürülür
2. **AK-4.2 — GIVEN** `bmsTarget: {port:9999}` verilir **WHEN** connector kurulur **THEN** hedef yazımlar 9999'a gider; verilmezse mapping hedefi
3. **AK-4.3 — GIVEN** connector start'lı **WHEN** istemci kendi portundan okur **THEN** izleme register'ları döner

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | TCP master okuma + dönüşüm | unit (iki gerçek server) | ⬜ |
| AK-4.2 | Hedef seçimi (override/mapping) | unit | ⬜ |
| AK-4.3 | İzleme register yayını | unit | ⬜ |

**T Görev Listesi:**
- [x] T-7: `BscPcsConnectorAdapter` → sim-stack master dönüşümü (jsmodbus client; adapters map ölür; kaynak portlar host indeksinden)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Kaynak server kapalı | Kaynak durumu=2, o mapping satırı atlanır (kademeli bozulma — mevcut davranış) |
| Hedef BMS kopuk | link=0, her tick'te yeniden bağlanma (mevcut davranış) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/bsc-pcs-connector/connector.ts` | TCP master dönüşümü |
| `packages/simulators/src/bsc-pcs-connector/connector.test.ts` | Gerçek server'lı testler |

---

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| `start()` — port dolu/çakışma | Fail-fast — host açılış hatası (config hatası) |
| `start()` — bilinmeyen sim tipi | Fail-fast (açılış hatası) |
| Tick hatası (fizik evrimi) | Yakalanır — server çalışmaya devam eder |
| Yazma — korunan aralık | Exception 0x02 — adapter'a uygulanmaz |
| İstemci kopması | Per-connection — server/hat ayakta |
| `stop()` | Tick + server kapanır (idempotent); `stopAll()` host geneli |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Gerçek `ModbusTcpClient` ile register-accurate okuma/yazma (E2E — in-process adapter YOK) | unit/entegrasyon |
| SC-2 | device-service'te simulator dallanması/import'u grep=0 (bağımlı SPEC kapısı — DEVICE-SERVICE SC) | kod inceleme |
| SC-3 | Bridge/host/connector coverage ≥%90 (güvenlik-kritik protokol yolu) | `nx run simulators:test` + coverage |
| SC-4 | `spec:check` temiz | `bun run spec:check` |
| SC-5 | `maneuver-command.spec.ts` E2E yeşil — config dizininden server'lar kalkar, DeviceService TCP'den okur | test |
| SC-6 | `SimulatorTransport`/`BmsPortServer` sınıfları YOK (silindi) | grep |

---

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-1 köprü sözleşmesi |
| 3. TEST | T-2 (kırmızı) |
| 4. IMPL | T-3..T-9 |
| 5. KAPANIŞ | `SIMULATOR-KAPANIS.md` |

---

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | RTU server simülasyonu — jsmodbus RTU server hazır; pty/socat serial altyapısı gerekir (dev: pty çifti, docker: socat) | Cihaz ihtiyacında (§11) |
| A2 | `tickIntervalMs` per-config — K5 opsiyonel alan; bugün tüm simülatörler 1000 ms | Varsayılan yeterli |
| A3 | Connector çoklu kaynak (çift BSC — mapping'te birden fazla deviceId) | Faz 2 (agregasyon) |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. RTU server simülasyonu (pty/socat) — A1
2. Replay/scripted server (kayıtlı frame oynatma) — `ModbusServerBridge` üzerine komut dosyası kaynağı
3. Arıza senaryo enjeksiyonu (kayıp frame, timeout, yanlış CRC) — E2E sağlamlaştırma
4. Connector çoklu kaynak agregasyonu — A3

---

## 12. T Görev Özeti

| T | Görev | UC |
|:--|:------|:---|
| T-1 | `jsmodbus` dep'i + bridge JSDoc/tipler | UC-1 |
| T-2 | Kırmızı testler — FC seti, yazma/okuma koruması, 0x02 | UC-1 |
| T-3 | Bridge implementasyonu | UC-1 |
| T-4 | BmsPortServer migrasyonu (genel köprüye) | UC-2 |
| T-5 | Tüm simülatör ailesine self-host entegrasyonu + SimulatorTransport silinir | UC-2 |
| T-6 | SimulatorHost — örnekleme + port indeksi + stopAll | UC-3 |
| T-7 | Connector → sim-stack TCP master dönüşümü | UC-4 |
| T-8 | Config port düzeltmeleri (15501-15504, config + config-docker) | UC-3 |
| T-9 | E2E harness — maneuver-command.spec host entegrasyonu | UC-3 |
