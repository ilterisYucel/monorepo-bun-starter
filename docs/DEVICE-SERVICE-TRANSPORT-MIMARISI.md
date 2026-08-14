# Device Service Transport Mimarisi

Tarih: 2026-08-13
Kapsam: Device-service taşıma katmanı refactor'u (Strategy + Adapter), simülatör altyapısı, config modeli.

## Amaç & Motivasyon

Donanımlar sahaya geç geliyor ve maliyetli — simülatörle geliştirme/test yapabilmek kritik. Eski yapı bunu kirli biçimde çözüyordu:

| Eski sorun | Yeni durum |
|---|---|
| `ModbusDevice` içinde 15 `isSimulator` dallanması | Cihaz taşımayı hiç bilmez — tek sözleşme `IModbusTransport` |
| Komut yolunda `simulators.forceTick()` sızıntısı | Yok — tick yaşam döngüsü transport'un içinde |
| Global 1 sn'lik ticker (`SimulatorProvider.start()`) | Yok — her simülatör kendi tick'ini yönetir |
| Config'de örtük `simulator` anahtarı (varlığı = simüle et) | Açık seçim: `transport.kind: "tcp" \| "rtu" \| "simulator"` |
| Gerçek cihazlarda coil/discrete okuma hep `false` | Transport sözleşmesi üzerinden gerçekten okunur |
| Cihaz tipi `simulator.type`'dan geliyordu (üretimde "unknown") | Config'de zorunlu üst seviye `type` alanı |

## Mimari (Strategy + Adapter)

```
IDevice (shared-types) ◄── ModbusDevice(config, transport?)
                                │   encode/decode, komutlar, validate,
                                │   read-backup + rollback — taşıma BİLİNMEZ
                                ▼
                      IModbusTransport (core/src/modbus/transport/)
         ┌──────────────────────┴──────────────────────┐
         │                                             │
 ModbusClientTransport                          SimulatorTransport
 (IModbusClient sarmalar:                      (IModbusSimulatorAdapter sarmalar;
  ModbusTcpClient / ModbusRtuClient)            tick: connect() başlatır,
                                                disconnect() durdurur)
                                                        │
                                                        ▼
                                          tip bazlı simülatörler (domain davranışı):
                                          Bsc, Pcs, Emu, Hvac, Cb, DcOutput,
                                          EnergyAnalyzer, XRack
```

- `ModbusDevice` gerçek ve simüle cihaz için **aynı sınıftır**; fark yalnızca enjekte edilen transport'tadır.
- `DeviceFactory` transport seçimini yapar: `SimulatorRegistry.transportFor(id)` → simülatör; `transport.kind === "rtu"` → `ModbusClientTransport(ModbusRtuClient)`; yoksa `ModbusDevice` kendi varsayılan TCP transport'unu kurar.
- `SimulatorRegistry` (device-service) tip→factory kayıt defteridir; `configs` içinde `transport.kind === "simulator"` olan cihazlar için `SimulatorTransport` üretir.

## Sözleşmeler

| Sözleşme | Konum | Sorumluluk |
|---|---|---|
| `IDevice` | `shared-types/src/device-interface.ts` | `connect/disconnect/read/readBitfields?/write/writeAtomic?` — device-service'in gördüğü tek kontrat |
| `IModbusTransport` | `core/src/modbus/transport/interface.ts` | `connect/disconnect/reconnect/isConnected` + register/coil/discrete okuma-yazma |
| `IModbusClient` | `core/src/modbus/interface.ts` | Gerçek Modbus istemcilerinin kontratı (TCP/RTU) |
| `IModbusSimulatorAdapter` | `shared-types/src/modbus/adapter.ts` | Simülatörün register seviyesindeki portu (yaşam döngüsü YOK — SimulatorTransport ekler) |

Metot setleri (transport): `readHoldingRegisters`, `writeHoldingRegisters` (tek/çoklu ayırt etmeden değer dizisi), `readInputRegisters`, `readCoils`, `writeCoils`, `readDiscreteInputs`.

## Config Modeli

```json
{ "transport": { "kind": "tcp" } }                         // varsayılan (yoksa tcp kabul edilir)
{ "transport": { "kind": "rtu" } }                         // connection.path/baudRate/slaveId kullanır
{ "transport": { "kind": "simulator", "type": "pcs", "pcsCount": 3 } }  // SimulatorRegistry
```

- Tüm config'lerde üst seviye `"type"` alanı **zorunludur** (`bsc`, `pcs`, `emu`, `hvac`, `cb`, `dc-output`, `energy-analyzer`, `xrack`, ...). Üretimde transport "simulator" olmadığı için device-service cihaz tipini buradan alır: `c.type ?? c.transport?.type ?? "unknown"`.
- Simülatör tipi şemada açık string'dir (OCP) — bilinmeyen tip schema'da reddedilmez, `SimulatorRegistry` çalışma zamanında uyarı loglar ve cihaz varsayılan TCP ile üretilir.
- Zod şeması: `shared-types/src/schemas/device-config.ts` (`deviceTransportConfigSchema`).

## Yaşam Döngüsü

1. `DeviceService.start()` → her cihaz için `device.connect()` → `ModbusDevice` → `transport.connect()`.
2. `SimulatorTransport.connect()` ticker'ı başlatır (varsayılan 1000 ms), `disconnect()` durdurur — çift connect çoğaltmaz; `isConnected()` her zaman `true`, `reconnect()` no-op.
3. **Komut yazımları anında etkilidir:** simülatörler setpoint/coil/ack durumlarını `write*` içinde günceller; tick yalnızca fizik/enerji/sıcaklık benzeri zamanla değişen durumları ilerletir. Validate read-back döngüsü (50ms × timeoutMs) bu sayede tick beklemeden çalışır — `forceTick` gereksiz kılınmıştır.
4. Üretimde hiçbir simülatör/tick yoktur — transport gerçek TCP/RTU istemcisidir.

## SOLID Eşleşmesi

| Prensip | Karşılığı |
|---|---|
| SRP | `ModbusDevice` = telemetri encode/decode + komut; transport = I/O; simülatör = domain davranışı |
| OCP | Yeni cihaz tipi = yeni simülatör modülü + `SimulatorRegistry`'e 1 kayıt satırı; config tipi açık string |
| LSP | Tüm transport'lar aynı sözleşmeyi tam uygular (simülatör `reconnect` no-op olarak bile sözleşmeye uyar) |
| DIP | Her katman yalnızca interface görür; somutlar factory/registry'de üretilir |

## Yeni Simülatör Ekleme Rehberi

1. `packages/simulators/src/<tip>/` altında: `register-map.ts` (adres sabitleri), `simulator.ts` (domain durumu + `read*/write*`), `modbus-adapter.ts` (`IModbusSimulatorAdapter` implementasyonu), `index.ts`, `<tip>.test.ts`.
2. `packages/simulators/src/index.ts`'e export ekle.
3. `device-service/src/simulator-registry.ts` → `registerDefaults()` içine 1 kayıt:
   ```ts
   this.registry.set("<tip>", {
     build: (_id, sim, elapsed) => {
       const s = new <Tip>Simulator(/* sim parametreleri */);
       return { adapter: new <Tip>SimulatorAdapter(s), tick: () => s.tick(elapsed) };
     },
   });
   ```
4. Config: `"transport": { "kind": "simulator", "type": "<tip>" }` (+ üst seviye `"type": "<tip>"`).
5. Test: simülatör domain testi + (gerekirse) `DeviceFactory` transport seçim testi.

## Dosya Haritası (refactor sonrası)

| Dosya | Rol |
|---|---|
| `packages/core/src/modbus/transport/interface.ts` | `IModbusTransport` |
| `packages/core/src/modbus/transport/modbus-client-transport.ts` | TCP/RTU client sarmalayıcı |
| `packages/simulators/src/simulator-transport.ts` | Simülatörü transport'a çevirir; tick yaşam döngüsü |
| `packages/core/src/modbus/device.ts` | `isSimulator`'sız `ModbusDevice` (yalnızca `this.transport.*`) |
| `packages/services/device-service/src/simulator-registry.ts` | tip→factory kayıt defteri, `transportFor()` |
| `packages/services/device-service/src/device-factory.ts` | Transport seçimi + cihaz üretimi (Strategy) |
| `packages/services/device-service/src/device-service.ts` | forceTick/simulator bağımlılıklarından arındırılmış jenerik orkestratör |
| `packages/shared-types/src/telemetry.ts` | `DeviceTransportConfig`, `DeviceConfigFile.transport/type` |
| `packages/shared-types/src/schemas/device-config.ts` | `deviceTransportConfigSchema` |
| `tools/gen-pcs-configs.mjs` | PCS/EMU config üretici (`bun run gen:pcs [N]`) |

## Test Kapsamı

| Suit | Kapsam |
|---|---|
| `core` (40) | `ModbusDevice` okuma/yazma/atomic/rollback (mock transport ile), encoder/decoder |
| `simulators` (49) | Tüm tip simülatörleri + `SimulatorTransport` (ticker, delegasyon, çift connect) |
| `device-service` (19) | Config doğrulama (zod, gerçek config dizini), `DeviceFactory` transport seçimi, tag'leme, scheduler |
| `shared-types` (59) | Schema doğrulamaları (`transport.kind`, açık simülatör tipi) |

## Yol Haritası (YAGNI notlu)

- **CANBUS/MQTT cihazları:** Aynı desenle `ICanbusTransport`/`IMqttTransport` eklenecek (şu an stub'lar `throw` eder — kontrat şekli hazır).
- **Replay/scripted transport:** Donanım olmadan kayıtlı Modbus frame'lerini oynatmak istendiğinde `IModbusTransport` implementasyonu olarak eklenecek (tek yeni dosya). Şimdilik simülatörler test ihtiyacını karşılıyor.
- **`demo-backend/xrack-manager`:** Legacy — simülatörü doğrudan kullanıyor; bu mimarinin kapsamı dışında bırakıldı.
