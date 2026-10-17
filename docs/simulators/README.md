# Simülatör Referansı — Ortak Mimari

> Enerji mühendisleri için referans. Bu dizin, `packages/simulators/` altındaki
> tüm simülatörlerin **ne yaptığını**, bir `tick` sırasında **hangi register'ı
> nasıl güncellediğini** ve **hangi register'a yazıldığında nasıl tepki
> verdiğini** anlatır.
>
> Kod referansları `path/sembol` çapasıyla verilir (örn. `bsc/bsc-simulator.ts#BSCSimulator.tick`);
> satır numarası kasıtlı olarak kullanılmaz (edit sonrası bayatlar).

---

## 1. Simülatör nedir, neden var?

Bir simülatör, **gerçek bir saha cihazının Modbus TCP arayüzünü taklit eden
yazılımdır.** `device-service` gerçek cihazdan okur gibi simülatörden okur;
kod tarafında "simülatör" kavramı görünmez, yalnızca bir TCP adresi/portu vardır.

- Amaç: donanım gelmeden önce uçtan uca (control → cihaz → telemetri → SCADA)
  zincirini test etmek, saha senaryolarını (arıza, manevra, alarm) tekrarlanabilir
  şekilde üretmek.
- Her konteyner/sahada config'teki `transport.kind === "simulator"` cihazlar
  `SimulatorHost` tarafından ayağa kaldırılır.

---

## 2. Yaşam döngüsü sözleşmesi (`start` / `stop` / `port`) — tick DEĞİL

Önemli düzeltme: **Ortak arayüz `ISimulator` değildir ve `tick` bu arayüzün
parçası değildir.** Host'un tanıdığı arayüz üç metotludur:

```ts
// host.ts#SelfHostedSimulator
interface SelfHostedSimulator {
  start(): Promise<void>;   // sunucuyu + tick interval'ını başlat
  stop(): Promise<void>;    // sunucuyu + tick'i durdur
  port(): number;           // dinlenen TCP portu
}
```

- `start()` → simülatörün kendi `SimulatorServer`'ını açar (Modbus TCP köprüsü +
  periyodik tick).
- `stop()` → timer + TCP sunucusunu kapatır. **İdempotenttir** (iki kez çağrı güvenli).
- `port()` → `start()` sonrası gerçek dinlenen port; öncesi config portu.
- Sınıflar `implements SelfHostedSimulator` yazmaz; **yapısal (structural) tipleme**
  ile karşılar. `network` config'i yoksa `start()` **no-op**'tur (yalnız in-memory test).

### `tick()` nerede yaşar?

`tick(elapsedSeconds)` simülatör sınıfının bir metodudur ama host arayüzünde
değildir; **`SimulatorServer`'a callback olarak** verilir:

- `simulator-server.ts#SimulatorServerConfig.tick` → `(elapsedSeconds: number) => void`
- `simulator-server.ts#SimulatorServer.start` → `setInterval` kurar:
  - periyot: `network.tickIntervalMs ?? 1000` ms
  - her tick'te ilerletilen sanal süre: `tickSeconds ?? 1` saniye

Yani pratikte: **her 1 saniyede bir, simülatöre 1 sanal saniye ilerletme sinyali
gider.** Gerçek zamana bağlı fizik modelleri (enerji entegrasyonu, sıcaklık
rampası) bu `elapsedSeconds` değerini kullanır.

---

## 3. İki katmanlı arayüz özeti

| Katman | Arayüz | Ne yapar | Kim çağırır |
| :--- | :--- | :--- | :--- |
| **Yaşam döngüsü** | `host.ts#SelfHostedSimulator` | `start` / `stop` / `port` | `host.ts#SimulatorHost` |
| **Modbus yüzeyi** | `@gd-monorepo/shared-types` → `modbus/adapter.ts#IModbusSimulatorAdapter` | FC01/02/03/04/05/06/0F/10 okuma-yazma | `server/modbus-server-bridge.ts#ModbusServerBridge` |
| **Zaman adımı** | `server/simulator-server.ts#SimulatorServerConfig.tick` | fizik/enerji/alarm güncellemesi | `SimulatorServer` `setInterval` |

Her simülatörün `*-modbus-adapter.ts` dosyası, sınıfın senkron
`readRegister`/`writeRegister` metotlarını `IModbusSimulatorAdapter` sözleşmesine
sarmalar. Köprü (`ModbusServerBridge`) gerçek Modbus TCP sunucusu olarak yayınlar.

---

## 4. Modbus yüzeyi ve adresleme

- **Fonksiyon kodları:** 01/02 (discrete/coil okuma), 03 (holding okuma),
  04 (input okuma), 05 (coil yazma), 06 (tek holding yazma),
  0F (çoklu coil yazma), 10 (çoklu holding yazma).
- **Hata istisnaları:** adaptör hatası → Modbus `0x04` (Slave Device Failure);
  korumalı adrese erişim → `0x02` (Illegal Data Address) —
  `server/modbus-server-bridge.ts#ModbusServerBridge`.
- **Adresleme kuralı:** köprü register adreslerini **tablo-içi ofset** olarak
  doğrudan adaptöre iletir; Modbus veri modeli offset'i (3x = 30001, 4x = 40001)
  numerik adresin içinde taşınır. Yani BSC "30055" adresi, 3x input register
  tablosunda `30055` ofseti olarak okunur.
- **Korumalı aralık:** Wattox PCS BMS yüzü gibi bazı yüzler, blok dışı adreslere
  erişimi `readProtected`/`writeProtected` ile `0x02` exception'ı vererek reddeder
  (`wattox-pcs/bms-face-adapter.ts#createWattoxBmsBridge`).

---

## 5. Simülatör üç davranış desenine ayrılır

| Desen | Açıklama | Örnek simülatörler |
| :--- | :--- | :--- |
| **Anlık komut** | Yazma register'a yazıldığı an etki eder; tick yalnız enerji/sayaç işler | Wattox PCS, HVAC, Control Panel IO, Demo MV Station |
| **Darbe → tick'te uygula** | Coil bir "komut darbesi"dir; gerçek durum **sonraki tick'te** değişir (yazma→okuma tutarlılığı) | CB, DC-Output |
| **Salt okunur** | Yazma yok; değerler fizik/senaryo enjeksiyonuyla üretilir | Energy Analyzer, DC-Meter, IMD |

---

## 6. Host entegrasyonu (`host.ts`)

- `host.ts#SimulatorHost.registerDefaults` → `type` string'ini builder fonksiyonuna
  eşleyen `builders` haritası. **Yeni simülatör tipi = 1 satır kayıt.**
- Kayıtlı tipler: `bsc`, `hvac`, `cb`, `dc-output`, `dc-meter`, `energy-analyzer`,
  `control-panel-io`, `imd`, `demo-mv-station`, `wattox-pcs`.
- `host.ts#SimulatorHost.start` fail-fast çalışır: bilinmeyen tip veya **port
  çakışması** → hata; hata hâlinde kısmen açılan sunucular kapatılır.
- `host.ts#SimulatorHost.plan` ayrıca `connector.sim` tanımlı BSC config'lerinden
  `BscPcsConnectorAdapter`'ı (BSC→PCS köprüsü) örnekler.
- BSC bağlamdan ek alanlar alır: `details.rackCount` (yoksa **8**) ve
  `transport.registerMap` yolu.

---

## 7. Tip → doküman → kapsam haritası

| `type` | Doküman | Cihaz / rol | Ana dosya |
| :--- | :--- | :--- | :--- |
| `bsc` | [BSC.md](BSC.md) | LG BSC — batarya sistem kontrolcüsü (rak tabanlı BESS) | `bsc/bsc-simulator.ts` |
| `wattox-pcs` | [WATTOX-PCS.md](WATTOX-PCS.md) | Wattox MPCS — 1725 kW PCS (EMS + BMS çift yüz) | `wattox-pcs/simulator.ts` |
| `xrack` | [XRACK.md](XRACK.md) | 16'lı batarya rack grubu (host'a kayıtlı **değil**) | `xrack/simulator.ts` |
| `cb` | [CB.md](CB.md) | DC şalter (SYW6GZ-4000) | `cb/cb-simulator.ts` |
| `dc-output` | [DC-OUTPUT.md](DC-OUTPUT.md) | DC güç kaynağı / çıkış | `dc-output/simulator.ts` |
| `dc-meter` | [DC-METER.md](DC-METER.md) | DJSF1352-RN DC metre (salt ölçüm) | `dc-meter/dc-meter-simulator.ts` |
| `energy-analyzer` | [ENERGY-ANALYZER.md](ENERGY-ANALYZER.md) | PM5340 enerji analizörü | `energy-analyzer/simulator.ts` |
| `hvac` | [HVAC.md](HVAC.md) | Sunucu odası klima ünitesi (MC90HDNC1R-L) | `hvac/hvac-simulator.ts` |
| `imd` | [IMD.md](IMD.md) | Bender isoPV1685RTU izolasyon monitörü | `imd/imd-simulator.ts` |
| `control-panel-io` | [CONTROL-PANEL-IO.md](CONTROL-PANEL-IO.md) | Kontrol paneli dijital I/O (kapı/ışık/FSS) | `control-panel-io/control-panel-io-simulator.ts` |
| `demo-mv-station` | [DEMO-MV-STATION.md](DEMO-MV-STATION.md) | Demo OG köşk (34,5 kV hücreler) | `demo-mv-station/demo-mv-simulator.ts` |
| — | [BSC-PCS-CONNECTOR.md](BSC-PCS-CONNECTOR.md) | BSC→PCS register köprüsü (simülatör değil, konnektör) | `bsc-pcs-connector/connector.ts` |

---

## 8. Hızlı referans — davranış özeti

| Simülatör | Yazılabilir | tick fizik modeli | Alarm/arıza kaynağı |
| :--- | :--- | :--- | :--- |
| BSC | holding (komut/setpoint) | güç entegrasyonu + SOC/SOH | iç durum makinesi + LOC |
| Wattox PCS | holding (`SET_*`) | yalnız enerji sayaçları | fault/alarm word'leri |
| XRack | holding + coil | enerji entegrasyonu + SOC/gerilim | e-stop / reset coil |
| CB | coil (open/close darbe) | darbe uygulama | yok (aux kontak) |
| DC-Output | coil + holding setpoint | gerilim/akım/sıcaklık yakınsama | OV/OC eşiği → fault |
| DC-Meter | yok | yok (deterministik) | `setMeasurements` enjeksiyonu |
| Energy Analyzer | yok | 3 faz + enerji + talep | yok (ölçüm) |
| HVAC | holding setpoint/on-off | sıcaklık rampası + termal model | sıcaklık/gerilim eşiği |
| IMD | yok (sınıf API'si) | direnç rastgele örnekleme | `setFault` → <100 kΩ |
| Control Panel IO | coil (ışık) | yok (sabit) | `setFssState` enjeksiyonu |
| Demo MV Station | coil (kesici/toprak) | yok (yazımda anında) | interlock reddi |

---

## 9. Ortak davranış boşlukları (bilinçli not)

Dokümanlar gerçek durumu yansıtır; aşağıdaki noktalar **simülatörlerin
basitleştirmeleri**dir, hata değildir:

- Bazı register'lar yalnız yazılır ama hiç okunmaz (örn. BSC `DISABLED_RACKS_*`).
- Bazı durumlar kodda tanımlı ama tetiklenemez (örn. HVAC `Fault`, IMD haritasının
  büyük bölümü 0 döner).
- Fizik modelleri mühendislik yaklaşımlarıdır (doğrusal rampa, birinci mertebe
  gecikme, sabit sıcaklık/nem), gerçek termodinamik/eletriksel çözücü değildir.
