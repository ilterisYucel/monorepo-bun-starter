---
status: active
space: agents
tags: [agents, referans, device-service, device-transport]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Device Service / Device Transport

> Bu doküman `AGENTS.md`'den ayrılan **referans** içeriktir; her oturumda yüklenmez.
> Cihaz taşıma katmanına (`ModbusDevice`, `IModbusTransport`), simülatöre veya
> device-service'e dokunacaksan **önce bu dokümanı oku** (MANDATORY'dir).
>
> Authoritative kaynaklar:
> [DEVICE-SERVICE-MIMARISI.md](docs/architecture/DEVICE-SERVICE-MIMARISI.md)
> (transport Strategy/Adapter + servis + alarm §4.2), [SIMULATOR-MIMARISI.md](docs/architecture/SIMULATOR-MIMARISI.md)
> (self-host simülatör altyapısı).

## Device transport strategy (MANDATORY)

**`ModbusDevice` taşıma katmanını hiç bilmez.** Gerçek (TCP/RTU) ve simüle cihazlar AYNI TCP/RTU yolundan bağlanır; fark yalnızca enjekte edilen `IModbusTransport`'tadır (Strategy pattern). Simülatörler in-process DEĞİL — `packages/simulators` her simülatörü **gerçek bir Modbus TCP sunucusu** olarak self-host eder (`SimulatorHost` + `ModbusServerBridge`); device-service saf TCP görür.

```
IDevice ◄── ModbusDevice(config, transport?: IModbusTransport)
               └─ transport yoksa → varsayılan ModbusClientTransport(ModbusTcpClient)
IModbusTransport (packages/core/src/modbus/transport/)
   └── ModbusClientTransport   (IModbusClient sarmalayıcı: TCP/RTU)
```

Config seçimi açıktır (`transport.kind`):

```json
{ "transport": { "kind": "tcp" } }                         // varsayılan
{ "transport": { "kind": "rtu" } }                         // connection.path vb. kullanır
{ "transport": { "kind": "simulator", "type": "bsc" } }    // SimulatorHost sunucu açar; device-service TCP bağlanır
```

Kurallar:

- device-service simülatör KELİMESİNİ bilmez: `kind` dallanması ve `SimulatorRegistry` YOKTUR; yalnız `run.ts` `SimulatorHost`'u başlatır/durdurur.
- Yeni cihaz simülatörü = simülatör modülü (network config + `start()/stop()`) + `SimulatorHost`'a 1 kayıt satırı.
- Simülatör config `connection.host/port` = self-host bind adresi (127.0.0.1 + benzersiz, ayrıcalıksız port).
- Connector (BSC→PCS) BSC config'inin `connector` bölümüdür; sim tarafı `SimulatorHost`, device tarafı türetilmiş 2. MODBUS cihazı.
- Simülatörler komut yazımlarını **anında** uygular (validate read-back tick beklemez).
- Config'de üst seviye `type` alanı zorunludur (üretimde transport "simulator" olmayabilir).

## Alarm değerlendirme (özet)

Tam sözleşme `AGENTS.md` "Cihaz alarm sözleşmesi" bölümünde + `DEVICE-SERVICE-MIMARISI.md` §4.2'de.
Transport'a dokunurken unutma: alarm değerlendirmesi **yalnızca** standart `TelemetryData[]`
akışı üzerinden device-service'te yapılır; `IDevice` alarm API'si taşımaz (ISP). Yeni
transport/simülatör telemetri üretmek yeterlidir — alarm hattına dokunulmaz.
