---
status: active
space: decisions
tags: [analiz, karar, backend, go]
review_date: 2026-08-24
---

# Backend Mimari Analizi, Optimizasyonlar ve Go Geçiş Değerlendirmesi

## 1. Mevcut Mimari

### 1.1 Genel Bakış

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                     │
│  apps/container-web (React v19, Vite v8)                             │
│  apps/container-desktop (Electron v39)                                │
│  packages/ui (Paylasimli bilesenler, WebSocket transport)              │
└────────────┬──────────────────────────┬──────────────────────────────┘
             │ REST API (HTTP)           │ WebSocket (wss://)
             ▼                           ▼
┌─────────────────────────┐   ┌────────────────────────────────────────┐
│   web-service            │   │   web-service (RealtimeManager)        │
│   Fastify v5             │   │   - WebSocket subscriber yonetimi     │
│   - Auth (JWT, jose)    │   │   - Redis ring buffer (son 300 veri)   │
│   - REST routes 10 adet  │   │   - Dead socket sweep (60s)            │
│   - awilix DI container  │   │   - Ping/Pong (30s/10s)               │
│   - WS_BROADCAST worker  │◄──│   - WS_BROADCAST -> ring buffer +      │
│                          │   │     broadcast({type:"telemetry",...})  │
└──────────────────────────┘   └──────────────┬─────────────────────────┘
                                              │ BullMQ: WS_BROADCAST
           ┌──────────────────────────────────┼──────────────────────┐
           │ BullMQ: WRITE_TELEMETRY          │ BullMQ: READ_DEVICE  │
           ▼                                  │ (repeatable every    │
┌──────────────────────┐                      │  N ms)               │
│   data-service        │                      │                      │
│   - WRITE_TELEMETRY   │                      ▼                      │
│     consumer          │  ┌─────────────────────────────────────────┐│
│   - TimescaleDB       │  │   device-service                        ││
│     hypertable yazma  │  │   - Modbus polling (repeatable job)     ││
│   - system_logs       │  │   - SimulatorProvider (6 tip)           ││
└──────┬───────────────┘  │   - DeviceFactory -> ModbusDevice         ││
       │                  │   - COMMAND_DEVICE worker                ││
       ▼                  │   - Post-write read + publish            ││
┌──────────────┐          └──────────────┬────────────────────────────┘│
│ TimescaleDB  │                         │ Modbus TCP                  │
│ (PostgreSQL  │                         ▼                             │
│  + extension)│          ┌─────────────────────────────────────────┐ │
└──────────────┘          │   Simulators (in-process)                │ │
                          │   BSC | HVAC | XRack | CB | DC Output    │ │
                          │   + EnergyAnalyzer (EP203/PM5340)        │ │
                          └─────────────────────────────────────────┘ │
┌──────────┐                                                          │
│  Redis   │◄── Tum servisler (BullMQ + ring buffer + cache)          │
└──────────┘

                      Sekil 1: Sistem Mimarisi
```

### 1.2 Paketler ve Sorumluluklari

#### `packages/core` — Backend Logic Kutuphanesi

Tum backend servislerin ortak kullandigi temel kutuphane.

| Alt Modul | Amac | Ana Siniflar |
|-----------|------|-------------|
| `modbus/` | Modbus TCP/RTU client, device facade, binary decoder | `ModbusTcpClient`, `ModbusRtuClient`, `ModbusDevice`, `BinaryPayloadDecoder` |
| `messaging/` | Redis + BullMQ message queue soyutlamasi | `BullMQAdapter`, `RedisConnection`, `IMessageQueue` |
| `timeseries/` | TimescaleDB hypertable adapter, materialized views | `TimescaleDBAdapter`, `MaterializedViewManager`, `ITimeseriesDatabase` |
| `sql/` | PostgreSQL metadata/system tablolari | `PostgresAdapter`, `ISqlDatabase` |
| `container-proxy/` | Field-to-container WebSocket proxy | `IContainerProxy`, `ContainerObserver` |
| `canbus/` | Stub (bos) | — |
| `mqtt/` | Stub (bos) | — |

**`ModbusDevice`** (`modbus/device.ts`) — Cihaz facade'i:
- Register'lari tablo tipine gore gruplama (HOLDING, INPUT, COIL, DISCRETE_INPUT)
- Bitisik adresleri tek okumada birlestirme
- Oncelik bazli siralama, paralel okuma optimizasyonu
- `writeAtomic()` — read-backup + yazma + hata durumunda rollback
- Byte-order encoding/decoding (`BinaryPayloadDecoder`)
- `IModbusSimulatorAdapter` (simulator) veya `IModbusClient` (gercek cihaz) alir

**`TimescaleDBAdapter`** (`timeseries/timescaledb-adapter.ts`):
- Cihaz basina hypertable (`device_<id>`)
- TimescaleDB sikistirma ve retention politikalari (varsayilan: 1 gun compress, 90 gun retention)
- Range query, aggregate, downsample, latest value
- Cihaz basina ayri `PoolClient` + explicit transaction izolasyonu

**`MaterializedViewManager`** (`timeseries/materialized-view-manager.ts`):
- 5s, 1m, 15m, 1h, 1d kova buyuklugunde continuous aggregate'ler
- Zaman araligina gore otomatik view secimi

#### `packages/shared-types` — Pure TypeScript Tip Tanimlari

Frontend ve backend arasindaki ortak tip kontrati. Tum paketler tarafindan import edilir.

| Dosya | Icerik |
|-------|--------|
| `telemetry.ts` | `TelemetryData`, `DeviceConfigFile`, `CommandStep`, `ManeuverConfig`, `BitfieldConfig` |
| `job.ts` | `DeviceJob` union (5 tip), `JobType`, `JobResult` |
| `modbus-adapter.ts` | `IModbusSimulatorAdapter` |
| `device-interface.ts` | `IDevice` |
| `telemetry-transport.ts` | `ITelemetryTransport`, `TelemetryObserver`, `ConnectionState` |
| `auth.ts` | `Role` (`"admin" | "boss" | "guest" | "field"`) |
| `result.ts` | `Result<T>` — Either monad |

#### `packages/simulators` — Cihaz Simulatorleri

Her simulator register-accurate mutable state machine. `tick()` ile state ilerletir.

| Simulator | Dosyalar | Register Tipi |
|-----------|----------|--------------|
| BSC | `bsc-simulator.ts`, `bsc-modbus-adapter.ts`, `bsc-config.ts`, `bsc-math.ts`, `register-map.ts` | HOLDING_REGISTER read/write |
| HVAC | `hvac/` | HOLDING_REGISTER read/write, INPUT_REGISTER read-back |
| XRack | `xrack/` (16 raf) | HOLDING_REGISTER, INPUT_REGISTER |
| CB | `cb/` | COIL write, DISCRETE_INPUT read-back |
| DC Output | `dc-output/` | COIL write, DISCRETE_INPUT read-back |
| Energy Analyzer | `energy-analyzer/` (EP203/PM5340) | INPUT_REGISTER read |

Her simulator'a karsilik gelen `*SimulatorAdapter`, `IModbusSimulatorAdapter` implemente eder ve `ModbusDevice` constructor'ina verilir.

#### `packages/shared-utils` — Konfigurasyon Sistemi

- `ConfigLoader` — oncelik-zincirli config cozucu (ObjectSource > EnvSource > DotenvSource > JsonFileSource)
- `ALL_CONFIG_DEFINITIONS` — tum config key'lerin env var, default, validasyon tanimlari
- Tum backend servisler `ConfigLoader` + `EnvSource` ile 12-factor compliant

### 1.3 Backend Servisler

#### `services/device-service` — Modbus Poller

| Konu | Detay |
|------|-------|
| Giris noktasi | `run.ts` -> `DeviceService.fromConfigDir()` |
| Cihaz config'leri | `config/` altinda 17 JSON dosyasi (service.json + 16 cihaz) |
| Baslatma sirasi | Config yukle -> SimulatorProvider.createFromConfigs() -> DeviceFactory.create() -> DeviceScheduler.scheduleRead() |
| Poll mekanizmasi | Her cihaz icin BullMQ repeatable `READ_DEVICE` job (varsayilan 5000ms) |
| publishTelemetry() | Her okumada 3 job: `WRITE_TELEMETRY` + `MANAGEMENT` + `WS_BROADCAST` |
| Komut calistirma | `COMMAND_DEVICE` job -> write/writeAtomic -> forceTick -> read-back -> publishTelemetry -> validation poll loop |
| SimulatorProvider | 6 simulator tipini register eder, interval ile tick'ler, `forceTick()` destegi |

#### `services/data-service` — TimescaleDB Writer

| Konu | Detay |
|------|-------|
| Giris noktasi | `run.ts` -> `DataService` |
| Worker | `WRITE_TELEMETRY` consumer (concurrency: 10) |
| Yazma | Per-device hypertable (`device_<id>`), auto-create |
| Log | logType iceren telemetriler `system_logs` tablosuna da yazilir |
| Temizlik | Baslangicta 30 gunden eski loglari siler |

#### `services/web-service` — REST API + WebSocket Server

| Konu | Detay |
|------|-------|
| Giris noktasi | `run.ts` -> `main()` -> `buildContainer()` -> `WebServiceServer` |
| Mimari | Clean Architecture (domain / application / infrastructure / presentation) |
| DI | awilix container (`config/container.ts`) — tum bagimliliklar singleton |
| Kimlik dogrulama | JWT (jose v5), `TokenAdapter`, `BunPasswordHasher` |
| Route'lar | auth, data, unified, device, commands, logs, fields, admin (10 modul) |
| WebSocket | `/ws/telemetry` — JWT auth, subscribe/unsubscribe, RealtimeManager |
| WS_BROADCAST worker | Gelen telemetrileri device bazinda gruplar, ring buffer'a yazar, broadcast eder |
| Service tier | `container` (standart), `field` (edge, container proxy), `boss` (aggregator, field poller) |

#### `apps/demo-backend` — Legacy Monolitik Sunucu

Simulator + ModbusDevice + TimescaleDB + REST API tek process'te. 16 rafli XRack simulasyonu. Yeni mimaride kullanilmiyor, referans amaciyla duruyor.

### 1.4 BullMQ Kuyruk Mimarisi

5 kuyruk, `BullMQAdapter` (`packages/core/src/messaging/bullmq-adapter.ts`) tarafindan yonetilir.

| Kuyruk Adi (Redis) | Job Tipi | Uretici | Tuketici |
|-------------------|----------|---------|----------|
| `queue_read_device` | `READ_DEVICE` | DeviceScheduler (repeatable) | DeviceService worker |
| `queue_write_telemetry` | `WRITE_TELEMETRY` | DeviceScheduler.publishTelemetry | DataService worker |
| `queue_command_device` | `COMMAND_DEVICE` | command-routes (POST API) | DeviceService worker |
| `queue_management` | `MANAGEMENT` | DeviceScheduler.publishTelemetry | (tuketici yok) |
| `queue_ws_broadcast` | `WS_BROADCAST` | DeviceScheduler.publishTelemetry | web-service worker |

**Varsayilan job ayarlari:** `attempts: 3`, exponential backoff (delay 1000ms), `removeOnComplete: 100`, `removeOnFail: 50`.

### 1.5 Komut Akisi (Mevcut Durum)

```
POST /api/commands/execute {deviceId, command, telemetries, params}
  │
  ▼
command-routes.ts (web-service):
  ├── loadDeviceConfig(deviceId)                     ← diskten JSON okur
  ├── CommandConfig'dan telemetri + {{param}} cozme
  ├── buildJob() -> COMMAND_DEVICE job
  └── mq.executeAndWait(job, timeoutMs)              ← SENKRON bekleme
       │
       │ BullMQ (Redis roundtrip)
       ▼
device-service executeCommand():
  ├── 1. device.writeAtomic() | device.write()       ← Modbus yazma
  ├── 2. simulators.forceTick(deviceId)              ← simulator state ilerlet
  ├── 3. device.read() + readBitfields()             ← read-back (ANINDA)
  ├── 4. scheduler.publishTelemetry(data)            ← 3 job cikar
  │     ├── WRITE_TELEMETRY -> data-service -> TimescaleDB
  │     └── WS_BROADCAST -> web-service -> RealtimeManager
  │           ├── writeBatchToRingBuffer             ← Redis LPUSH + LTRIM 299
  │           └── broadcast({type:"telemetry",...})  ← tum subscriber WebSocket'lere
  └── 5. (varsa) validate poll loop (50ms aralik, timeoutMs boyunca)
       return {success, validated?, reason?}
```

**Sorun:** Komut basariyla calissa bile (adim 5'ten `{success:true}` doner), REST yaniti **sadece** `{success, validated?, reason?}` dondurur. Read-back verisi (adim 3) ayni anda okunmustur ama yanita eklenmez. Frontend yeni register degerlerini ancak **ayri bir kanaldan** (adim 4'teki `WS_BROADCAST`) gelen WebSocket mesajiyla gorur. Bu iki kanal (REST response vs WebSocket) bagimsiz calistigi icin timing gap olusur.

### 1.6 Veri Akisi — Telemetri (Polling)

```
DeviceScheduler (repeatable, N ms)
  -> READ_DEVICE job (BullMQ)
    -> device-service.readDevice()
      -> ModbusDevice.read() + readBitfields()
      -> scheduler.publishTelemetry(deviceId, data)
        ├── WRITE_TELEMETRY -> data-service -> TimescaleDB hypertable
        └── WS_BROADCAST -> web-service -> RealtimeManager
              ├── writeBatchToRingBuffer (Redis LPUSH + LTRIM 0 299 + EXPIRE 300)
              └── broadcast({type:"telemetry", deviceId, data})
                    -> tum subscriber WebSocket'lere ws.send()
```

### 1.7 Ring Buffer (Yeni WebSocket Subscriber'lari icin)

```
Client baglanir -> WebSocket /ws/telemetry?token=JWT
  -> JWT dogrulama (ITokenService.verifyAccess)
  -> Client gonderir: {type:"subscribe", deviceId:"bsc-1"}
  -> RealtimeManager.subscribe("bsc-1", ws)
  -> RealtimeManager.sendInitialData("bsc-1", ws)
      -> Redis'ten device:bsc-1:buffer listesini okur (LRANGE 0 -1)
      -> ws.send({type:"initial", deviceId:"bsc-1", data:[...son 300 veri...]})
  -> ws.send({type:"subscribed", deviceId:"bsc-1"})
```

### 1.8 Mevcut Stabilite Optimizasyonlari

| # | Optimizasyon | Konum | Detay |
|---|-------------|-------|-------|
| 1 | WS mesaj gruplama | `web-service/src/index.ts:68-86` | `WS_BROADCAST` worker device bazinda gruplar, tek mesajda gonderir |
| 2 | WS ping/pong | `server.ts:130-135` | `@fastify/websocket` ile 30s ping, 10s timeout |
| 3 | Dead socket sweep | `realtime-manager.ts:19-31` | Her 60s'de CLOSED/CLOSING socket'leri temizler |
| 4 | Redis ring buffer | `realtime-manager.ts:73-90` | Son 300 veri Redis'te, yeni subscriber'lara initial data |
| 5 | Token refresh | Frontend `RealtimeContext.tsx` | Expired JWT'yi otomatik yeniler |
| 6 | rAF batch | `useRealtimeTelemetry.ts` | `requestAnimationFrame` ile state update'leri frame basina 1'e dusurur |
| 7 | WebGL context lifecycle | `BSC.tsx`, `TMS.tsx` | PIXI Application key degisiminde eskiyi destroy eder |
| 8 | PixiJS ticker throttle | `BSCGraphic.hooks.ts` | 60fps -> 6fps |
| 9 | Modbus batch read | `ModbusDevice.read()` | Register'lari tablo tipine gore gruplar, bitisik adresleri tek seferde okur |
| 10 | Atomic write | `ModbusDevice.writeAtomic()` | Read-backup + write + rollback on failure |
| 11 | Per-device PG connection | `TimescaleDBAdapter` | Her cihaz icin ayri `PoolClient` + explicit transaction izolasyonu |
| 12 | Retention politikasi | `web-service/src/index.ts:47-66` | Baslangicta tum cihaz hypertable'larina retention/compress/chunk uygular |
| 13 | Exponential backoff | `ModbusTcpClient` | 1s-16s arasi jitter'li reconnect denemesi (max 5) |
| 14 | Statement timeout | `TimescaleDBAdapter` | 30s query timeout (takili sorgulari serbest birakir) |

---

## 2. Optimizasyon Onerileri

### 2.1 Komut Yanitina Read-Back Verisi Ekleme

**Oncelik:** EN YUKSEK — 1 gunluk is, sifir altyapi degisikligi.

**Degisiklik 1 — `device-service.ts` (`executeCommand()`):**

`services/device-service/src/device-service.ts:286-341`

```ts
// Mevcut kodda 312-314. satirlar:
const allData = await entry.device.read();
const bitfields = (await entry.device.readBitfields?.()) ?? [];
await this.scheduler.publishTelemetry(job.deviceId, [...allData, ...bitfields]);

// Degisiklik: read-back verisini return degerine ekle
const readBackData = [...allData, ...bitfields];
await this.scheduler.publishTelemetry(job.deviceId, readBackData);

// 340. satir:
return { success: true, data: readBackData };  // ← YENI
```

**Degisiklik 2 — `command-routes.ts` (`POST /execute`):**

`services/web-service/src/presentation/routes/command-routes.ts:120-126`

```ts
// Mevcut:
const result = await mq.executeAndWait(job, timeoutMs);
return reply.status(result.success ? 200 : 422).send({
  deviceId, command: commandName, ...result,
});

// Yanit zaten {success, validated?, reason?, data?} icerecek —
// result objesi spread edildigi icin data field'i otomatik eklenir.
// Ek kod degisikligi gerektirmez.
```

**Degisiklik 3 — `execute-multi` yaniti:**

`command-routes.ts:196`

```ts
// Ayni sekilde executeStep() return degerine data eklenir:
return { deviceId, command: commandName, ...result, data: result.data };
```

**Etki:** Frontend komut yanitini alir almaz read-back verisine erisir. WebSocket mesajini beklemek zorunda kalmaz. WebSocket mesaji yine de gelir (double-check), ama kullanici aninda dogru UI gorur.

---

### 2.2 WS_BROADCAST icin BullMQ Bypass — Redis Pub/Sub

**Oncelik:** ORTA — Performans iyilestirmesi, 2-3 gunluk is.

**Sorun:** Komut sonrasi `WS_BROADCAST` su yolu izler:

```
device-service -> BullMQ queue (Redis enqueue)
  -> web-service worker poll (Redis dequeue)
    -> RealtimeManager.broadcast()
```

Iki Redis roundtrip + worker polling. Normalde <10ms ama yogun sistemde kuyrukta bekleme olabilir.

**Cozum:** Device-service'den web-service'e dogrudan Redis pub/sub mesaji.

```ts
// ===== device-service tarafinda =====
// RedisConnection zaten mevcut.

class DeviceService {
  // ...

  private async executeCommand(job: CommandDeviceJob) {
    // ... yazma, forceTick, read-back ayni ...

    // PUBLISH: Dogrudan Redis pub/sub ile web-service'e gonder
    const channel = `realtime:push`;
    await this.redis.publish(channel, JSON.stringify({
      deviceId: job.deviceId,
      data: readBackData,
    }));

    // ... validate ve return ayni ...
  }
}

// ===== web-service tarafinda =====
// main() icinde:

const subscriber = redis.client().duplicate();
await subscriber.connect();
await subscriber.subscribe("realtime:push", (message) => {
  const { deviceId, data } = JSON.parse(message);
  realtime.writeBatchToRingBuffer(deviceId, data);
  realtime.broadcast(deviceId, { type: "telemetry", deviceId, data });
});
```

**Alternatif — Hibrit yaklasim (tavsiye edilen):**
- Polling kaynakli telemetriler BullMQ `WS_BROADCAST` ile devam etsin (batch isleme avantaji)
- Sadece komut sonrasi read-back verileri Redis pub/sub ile gitsin
- Boylece BullMQ'nun sagladigi retry/backoff mekanizmasi polling verileri icin korunur

**Etki:** Komut sonrasi WS gecikmesi BullMQ kuyruk turundan kurtulur, ~5-10ms -> <1ms.

---

### 2.3 Komut Timeout Optimizasyonu

**Oncelik:** YUKSEK — 1 saatlik is, kullanici deneyimine dogrudan etki.

**Sorun:** `command-routes.ts:117` — `const timeoutMs = (commandConfig?.timeoutMs ?? 3000) + 2000`. Her komut en az 5000ms blokluyor. Oysa:

- Coil yazma (CB ac/kapat, DC output on/off): genelde <50ms
- Holding register yazma (BSC charge/discharge): genelde <200ms
- Validasyon gerektiren komutlar: timeoutMs kadar bekler (dogru)

**Cozum:** Timeout'u komut tipine gore dinamik yap:

```json
// cihaz config JSON'larinda:
{
  "commands": {
    "open":   { "timeoutMs": 500  },   // coil yazma — hizli
    "close":  { "timeoutMs": 500  },   // coil yazma — hizli
    "charge": { "timeoutMs": 2000 },   // holding register — orta
    "stop":   { "timeoutMs": 1000 }    // holding register — dusuk
  }
}
```

```ts
// command-routes.ts:117
const baseTimeout = commandConfig?.timeoutMs ?? 3000;
const timeoutMs = baseTimeout <= 1000 ? baseTimeout + 500 : baseTimeout + 1000;
const job = buildJob(deviceId, telemetries, commandConfig, jobId);
const result = await mq.executeAndWait(job, timeoutMs);
```

**Etki:** Hizli komutlarda API yanit suresi ~5000ms -> ~1000ms.

---

### 2.4 Poll Interval Cihaz Bazli Optimizasyonu

**Oncelik:** ORTA — Config degisikligi, kod degisikligi yok.

**Sorun:** Varsayilan poll interval `servicePollIntervalMs` degeri ile tum cihazlara uygulaniyor (`device-scheduler.ts:9` — `DEFAULT_POLL_INTERVAL_MS = 5000`). Frontend guncelleme gecikmesinin ana sebebi.

**Cozum:** Device config JSON'da `pollIntervalMs` zaten tanimlanabiliyor. Kritik cihazlar icin dusurulebilir:

```json
// bsc-1.json
{
  "pollIntervalMs": 1000,
  ...
}

// hvac-1.json (daha az kritik)
{
  "pollIntervalMs": 10000,
  ...
}
```

| Cihaz Tipi | Onerilen Poll Interval | Sebep |
|-----------|----------------------|-------|
| BSC | 1000ms | Pil state kritik, anlik degisim olabilir |
| XRack | 1000ms | 16 raf pil takibi, yuksek cozunurluk gerekir |
| HVAC | 10000ms | Sicaklik yavas degisir |
| CB | 2000ms | Kesici durumu kritik ama nadiren degisir |
| DC Output | 2000ms | Cikis durumu kritik ama nadiren degisir |
| Energy Analyzer | 5000ms | Enerji verisi orta siklikta |

**Dikkat:** Daha sik polling = daha fazla BullMQ job + TimescaleDB write. `servicePollIntervalMs` alt sinir olarak 500ms onerilir. Compression ve retention politikasi mevcut oldugu icin depolama sorunu yok.

**Etki:** Kritik cihazlarda frontend veri tazeligi 5sn -> 1sn.

---

### 2.5 Frontend Optimistic Update

**Oncelik:** DUSUK — Frontend degisikligi, 2.1 uygulandiktan sonra gerek kalmaz.

**Cozum:** Komut gonderilirken yazilan register degerleri bilindigi icin (command config'den), frontend bu degerleri hemen optimistic olarak UI'a yansitir. WS'ten gercek deger geldiginde reconciliation yapilir.

```tsx
// ornek hook:
const useCommandWithOptimisticUpdate = (deviceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cmd: ExecuteCommandParams) => api.execute(deviceId, cmd),
    onMutate: async (cmd) => {
      // Optimistic: mevcut telemetri cache'ini guncelle
      await queryClient.cancelQueries({ queryKey: ["telemetry", deviceId] });
      const previous = queryClient.getQueryData(["telemetry", deviceId]);

      queryClient.setQueryData(["telemetry", deviceId], (old: any) => {
        if (!old) return old;
        const updated = [...old];
        for (const t of cmd.telemetries) {
          const idx = updated.findIndex((d: any) => d.name === t.name);
          if (idx >= 0) updated[idx] = { ...updated[idx], value: t.value };
          else updated.push(t);
        }
        return updated;
      });

      return { previous };
    },
    onError: (_err, _cmd, context) => {
      // Rollback
      queryClient.setQueryData(["telemetry", deviceId], context?.previous);
    },
  });
};
```

**2.1 uygulanirsa bu optimizasyona gerek kalmaz.** Komut yaniti zaten dogru veriyi icerir.

---

### 2.6 Oncelik Siralamasi

| # | Optimizasyon | Etki | Maliyet | Risk | 2.1'e Bagimli mi? |
|---|-------------|------|---------|------|-------------------|
| **1** | Komut yanitina read-back verisi ekleme | YUKSEK | COK DUSUK | YOK | — |
| **2** | Redis pub/sub bypass | ORTA | DUSUK | DUSUK | HAYIR |
| **3** | Timeout optimizasyonu | ORTA-YUKSEK | COK DUSUK | YOK | HAYIR |
| **4** | Poll interval ayarlama | YUKSEK | DUSUK | ORTA (CPU/net) | HAYIR |
| **5** | Frontend optimistic update | ORTA | ORTA | DUSUK | EVET (2.1 varsa gereksiz) |

---

## 3. Backend'in Go'ya Gecisi — Analiz

### 3.1 Saglanacak Seyler (Go'nun Avantajlari)

| Kazanim | Detay | Tahmini Etki |
|---------|-------|-------------|
| **CPU performansi** | Native derlenmis binary, JIT yok, GC dusuk pause | Modbus register cozumleme, byte-order decoding, simulator tick hesaplamalari ~3-5x hizlanir |
| **Bellek kullanimi** | Go binary ~10-30MB RAM, Node.js ~50-150MB (V8 heap + event loop) | Servis basina 5x daha az bellek. Container yogunlugu artar, Raspberry Pi gibi kisitli ortamlar icin kritik |
| **Es zamanlilik modeli** | `goroutine` (2KB stack, M:N scheduling) vs Node.js event loop + Worker Threads | 1000 cihazli polling'de 1000 goroutine (20MB) vs 1000 async islem. Go daha hafif ve predictable |
| **Tek binary deployment** | Go statik derleme -> tek binary (~10MB) | Docker image boyutu ~5MB (scratch) vs Node.js ~150MB (node:alpine) |
| **`errgroup` / `sync.WaitGroup`** | `Promise.all`/`allSettled` karsiligi — native dil destegi | Mevcut async kodun birebir karsiligi, gecis kolay |
| **`context.Context`** | Timeout/cancellation propagation | `executeAndWait` timeout pattern'i dil seviyesinde |
| **Tip guvenligi** | Derleme zamani tip kontrolu, `interface` + `struct embedding` | Runtime tip hatasi riski sifir. TypeScript'ten daha kati |
| **Ekosistem** | `goburrow/modbus`, `pgx`, `go-redis`, `river`, `gorilla/websocket`, `fiber` | Tum bagimliliklar Go ekosisteminde karsilik buluyor |
| **Kendi kendine yeten binary** | libc bagimliligi yok (CGO_ENABLED=0), tek dosya | Deployment sadeligi: scp + restart |

### 3.2 Saglanamayacak Seyler (Go'nun Dezavantajlari / Kayiplar)

| Kayip | Detay | Sonuc |
|-------|-------|-------|
| **`shared-types` paketi** | Pure TypeScript tip tanimlari. Frontend TypeScript kaldigi surece **ortak tip kontrati korunamaz** | Cozum: JSON Schema / Protobuf / OpenAPI spec ile cross-language type generation. Ek build adimi ve bakim yuku |
| **Nx monorepo orchestration** | Nx Go projelerini tanimaz. Build sirasi, cache, task bagimliliklari manuel yonetilir | Ya Makefile / Taskfile yazilacak, ya da Nx custom executor eklenecek. Su anki `bun run dev` -> 5 servis paralel baslatma kaybedilir |
| **BullMQ** | Go'da BullMQ yok | Alternatifler: `river` (Go-native, PostgreSQL tabanli), `asynq` (Redis tabanli, BullMQ benzeri). `river` Redis bagimliligini azaltir ama mevcut Redis yatirimini bosa cikarir |
| **Modbus simulatorleri** | 6 simulator + 6 adapter, register-accurate state makineleri. ~3000 satir TypeScript kodu | Go'ya birebir port gerekecek. Test coverage sifir, port sonrasi dogrulama zor |
| **awilix DI container** | Go'da awilix gibi deklaratif DI yok. Manuel constructor injection (zaten prensip olarak dogru) | Mevcut kod manuel DI kullandigi icin gecis kolay. Go'da `wire` (compile-time DI) veya manuel |
| **Fastify plugin ekosistemi** | `@fastify/swagger`, `@fastify/cors`, `@fastify/compress`, `@fastify/websocket`, `@fastify/rate-limit` | Go'da `fiber`, `gin`, `chi` var ama her eklenti icin ayri middleware yazmak veya bulmak gerekir. Swagger/OpenAPI icin `swaggo` |
| **Teknoloji yigini bolunmesi** | Backend Go, frontend TypeScript -> iki dil, iki CI pipeline, iki developer skillset | Ise alim ve onboarding maliyeti artar. Kod review yapabilen kisi sayisi azalir |
| **Runtime hata ayiklama** | Node.js: `--inspect` + Chrome DevTools. Go: `delve` + IDE entegrasyonu | Alisma suresi, tooling degisikligi |
| **Paylasimli kod tekrari** | `core`, `simulators`, `shared-utils` hem TS hem Go'da olacak | Iki dilde ayni mantigi senkronize tutma yuku. Breaking change'ler ikiye katlanir |

### 3.3 Bu Spesifik Sorunu (Komut-Veri Senkronizasyonu) Go Cozer mi?

**Hayir, cozmez.**

Sorun dil degil, mimari kaynakli:

```
Komut yaniti (REST) ----> Frontend (hemen)
WS_BROADCAST (BullMQ) --> Frontend (ayri kanal, gecikmeli)
```

Go'ya gecsen de ayni iki ayri kanal olacak. Go'daki `goroutine` + `channel` yapisi BullMQ'dan daha hizli olabilir ama **mimari pattern ayni kalirsa sorun devam eder.**

Cozum bolum 2.1'deki gibi: komut yanitina read-back verisini **rest response icine** eklemek. Bu, dil degisikliginden tamamen bagimsiz bir mimari iyilestirme.

### 3.4 Go'da Karsilik Bulan / Bulmayan Bagimliliklar

| Mevcut (TypeScript) | Go Karsiligi | Durum |
|---------------------|-------------|-------|
| `jsmodbus` | `goburrow/modbus` | Mevcut, olgun |
| `serialport` | `go.bug.st/serial` | Mevcut, olgun |
| `node-redis` | `go-redis/redis` | Mevcut, olgun |
| `pg` (node-postgres) | `pgx` (jackc/pgx) | Mevcut, olgun |
| `bullmq` | `river` (PostgreSQL) / `asynq` (Redis) | Mevcut, alternatif secimi gerekir |
| `fastify` | `fiber` (express benzeri) / `chi` (hafif) | Mevcut, farkli API |
| `@fastify/websocket` | `gorilla/websocket` | Mevcut, olgun |
| `jose` (JWT) | `golang-jwt/jwt` | Mevcut, olgun |
| `awilix` (DI) | `wire` (compile-time) / manuel | Mevcut, farkli paradigma |
| `zod` | `go-playground/validator` / `ozzo-validation` | Mevcut, farkli API |
| `bun` (package manager) | `go mod` | Mevcut, yerlesik |
| `nx` (monorepo) | Yok | **Karsilik yok** — manuel Makefile/Taskfile |
| `@fastify/swagger` | `swaggo/swag` | Mevcut, farkli is akisi |
| `pixi.js` (UI) | Yok (Go'da UI yok) | **Gecersiz** — frontend TS kalacak |
| `vitest` | `testing` (std lib) | Mevcut, yerlesik |

### 3.5 Go Gecisi Icin Yol Haritasi

| Faz | Kapsam | Sure (tahmini) | Risk |
|-----|--------|---------------|------|
| **Faz 0: Optimizasyonlar** | Bolum 2.1-2.5 uygula. Performans hala yetersizse devam et. | 3-5 gun | YOK |
| **Faz 1: Prototip** | `device-service` Go'ya port. Modbus client, simulatorler (sadece BSC), Redis pub/sub | 4-6 hafta | ORTA |
| **Faz 2: Kiyaslama** | CPU, bellek, gecikme karsilastirmasi. Kazanim anlamli degilse DUR. | 1 hafta | DUSUK |
| **Faz 3: Tam gecis** | `data-service`, `web-service` port. Queue secimi (river/asynq). Cross-language type layer | 6-8 hafta | YUKSEK |
| **Faz 4: Frontend entegrasyon** | WebSocket transport Go backend ile test. API breaking change yok | 2 hafta | DUSUK |
| **Faz 5: Eski kodun kaldirilmasi** | JS backend kodunu sil. Tip katmanini stabilize et | 1 hafta | DUSUK |

Toplam: ~14-18 hafta (3.5-4.5 ay) — optimizasyonlar haric.

### 3.6 Sonuc Matrisi

| Kriter | Node.js (Mevcut) | Go | Net Kazanim |
|--------|-----------------|-----|------------|
| CPU performansi | Orta | YUKSEK | **+3-5x** |
| Bellek kullanimi | 50-150MB/servis | 10-30MB/servis | **+5x** |
| Docker image boyutu | 150MB | 5-10MB | **+15x** |
| Gelistirme hizi | YUKSEK (tek dil) | ORTA (iki dil) | **-1x (kayip)** |
| Tip guvenligi (cross-package) | YUKSEK (shared-types) | DUSUK (manuel sync) | **-1x (kayip)** |
| Monorepo tooling | YUKSEK (Nx) | DUSUK (manuel) | **-1x (kayip)** |
| Simulator kodu | Var, test edildi | Port gerekir | **-1x (maliyet)** |
| **Komut-veri senkronizasyonu** | **SORUN DEVAM** | **SORUN DEVAM** | **FARK YOK** |
| Ise alim kolayligi | YUKSEK (JS/TS yaygin) | ORTA (Go daha az yaygin) | **-0.5x** |
| CI/CD karmasikligi | DUSUK | ORTA (iki toolchain) | **-1x (maliyet)** |
| Queue guvenilirligi | YUKSEK (BullMQ) | ORTA-YUKSEK (river/asynq) | **NOMINAL** |
| WebSocket performansi | Node.js yuksek (event loop) | Go yuksek (goroutine) | **NOMINAL** |
| Tip katmani bakim yuku | DUSUK | YUKSEK | **-2x (kayip)** |

### 3.7 Onerilen Strateji

```
Simdi:
  ├── 2.1: Komut yanitina read-back verisi ekle         ← 1-2 saat
  ├── 2.3: Timeout optimizasyonu                         ← 1 saat
  └── 2.4: Poll interval ayarla (kritik cihazlar)        ← config degisikligi

1-2 hafta icinde:
  └── 2.2: Redis pub/sub bypass (gerekli gorulurse)      ← 2-3 gun

3-6 ay icinde (performans dar bogazi varsa):
  └── Go gecisi Faz 1-5                                   ← 3.5-4.5 ay
      └── ONCE device-service prototipi ile kiyaslama yap
          └── Kazanim > maliyet ise devam et
```

---

## Ek A: Anahtar Dosya Referanslari

| Dosya | Icerik |
|-------|--------|
| `packages/core/src/messaging/bullmq-adapter.ts` | BullMQ adapter, 5 kuyruk tanimi, executeAndWait |
| `packages/core/src/modbus/device.ts` | ModbusDevice — read, write, writeAtomic, readBitfields |
| `packages/core/src/timeseries/timescaledb-adapter.ts` | TimescaleDB adapter — hypertable, compression, retention |
| `services/device-service/src/device-service.ts` | DeviceService — executeCommand, readDevice |
| `services/device-service/src/device-scheduler.ts` | DeviceScheduler — scheduleRead, publishTelemetry |
| `services/device-service/src/simulator-provider.ts` | SimulatorProvider — 6 simulator registry, tick, forceTick |
| `services/data-service/src/data-service.ts` | DataService — WRITE_TELEMETRY consumer |
| `services/web-service/src/index.ts` | Web service main — WS_BROADCAST worker, startup/shutdown |
| `services/web-service/src/infrastructure/realtime/realtime-manager.ts` | RealtimeManager — subscribe, broadcast, ring buffer, sweep |
| `services/web-service/src/presentation/routes/command-routes.ts` | Command routes — execute, executeMulti, timeout |
| `packages/shared-types/src/telemetry.ts` | TelemetryData, DeviceConfigFile, CommandStep, ManeuverConfig |
| `packages/shared-types/src/job.ts` | DeviceJob union, JobType, JobResult |

## Ek B: Cihaz Config Dosyalari

| Dosya | Poll Interval | Komutlar |
|-------|--------------|----------|
| `device-service/config/bsc-1.json` | 5000ms | charge, discharge, stop |
| `device-service/config/bsc-2.json` | 5000ms | charge, discharge, stop |
| `device-service/config/hvac-1.json` .. `hvac-8.json` | 5000ms | on, off, force_cool, force_heat |
| `device-service/config/cb-1.json` .. `cb-2.json` | 5000ms | open, close, reset |
| `device-service/config/dc-output-1.json` .. `dc-output-2.json` | 5000ms | on, off |
| `device-service/config/ep203.json` | 5000ms | — |
| `device-service/config/pm5340-1.json` | 5000ms | — |
| `device-service/config/service.json` | — (global ayarlar) | — |
