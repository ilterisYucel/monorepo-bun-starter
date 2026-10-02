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
> [DEVICE-SERVICE-TRANSPORT-MIMARISI.md](docs/architecture/DEVICE-SERVICE-TRANSPORT-MIMARISI.md)
> (transport Strategy/Adapter detayı), [DEVICE-SERVICE-MIMARISI.md](docs/architecture/DEVICE-SERVICE-MIMARISI.md)
> (servis + alarm §4.2), [SIMULATOR-MIMARISI.md](docs/architecture/SIMULATOR-MIMARISI.md).

## Device transport strategy (MANDATORY)

**`ModbusDevice` taşıma katmanını hiç bilmez.** Gerçek (TCP/RTU) ve simüle cihazlar aynı sınıftan üretilir; fark yalnızca enjekte edilen `IModbusTransport`'tadır (Strategy pattern).

```
IDevice ◄── ModbusDevice(config, transport?: IModbusTransport)
               └─ transport yoksa → varsayılan ModbusClientTransport(ModbusTcpClient)
IModbusTransport (packages/core/src/modbus/transport/)
   ├── ModbusClientTransport   (IModbusClient sarmalayıcı: TCP/RTU)
   └── SimulatorTransport      (simulators paketi; tick yaşam döngüsü kendi içinde:
                                connect() başlatır, disconnect() durdurur)
```

Config seçimi açıktır (`transport.kind`):

```json
{ "transport": { "kind": "tcp" } }                         // varsayılan
{ "transport": { "kind": "rtu" } }                         // connection.path vb. kullanır
{ "transport": { "kind": "simulator", "type": "pcs" } }    // SimulatorRegistry'den transport
```

Kurallar:

- `ModbusDevice` içinde `isSimulator` dallanması YASAKTIR — her yer `this.transport.*`.
- Yeni cihaz simülatörü = yeni simülatör modülü + `SimulatorRegistry`'e 1 kayıt satırı.
- Simülatörler komut yazımlarını **anında** uygular (validate read-back tick beklemez).
- Config'de üst seviye `type` alanı zorunludur (üretimde transport "simulator" olmayabilir).

## Alarm değerlendirme (özet)

Tam sözleşme `AGENTS.md` "Cihaz alarm sözleşmesi" bölümünde + `DEVICE-SERVICE-MIMARISI.md` §4.2'de.
Transport'a dokunurken unutma: alarm değerlendirmesi **yalnızca** standart `TelemetryData[]`
akışı üzerinden device-service'te yapılır; `IDevice` alarm API'si taşımaz (ISP). Yeni
transport/simülatör telemetri üretmek yeterlidir — alarm hattına dokunulmaz.
