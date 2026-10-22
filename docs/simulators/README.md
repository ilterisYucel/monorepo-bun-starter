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

Ortak sözleşme `contracts.ts#ISimulator`dır (SIMULATOR-MIMARISI REV.03, K8/UC-5):
`deviceId` (zorunlu — `contracts.ts#requireDeviceId` fail-fast), `start()`, `stop()`
ve opsiyonel `inject(scenario)`. **`tick` bu arayüzün parçası değildir.**

Host'un beklediği yüzey self-host ekiyle genişler:

```ts
// host.ts#SelfHostedSimulator
interface SelfHostedSimulator extends ISimulator {
  start(): Promise<void>;
  stop(): Promise<void>;
  port(): number;
}
```

- `start()` → simülatörün kendi `SimulatorServer`'ını açar (Modbus TCP köprüsü +
  periyodik tick).
- `stop()` → timer + TCP sunucusunu kapatır. **İdempotenttir** (iki kez çağrı güvenli).
- `port()` → `start()` sonrası gerçek dinlenen port; öncesi config portu.
- `inject(scenario)` → yalnız senaryo enjeksiyonunu destekleyen simülatörler uygular;
  bilinmeyen senaryoda `false` döner, hata fırlatmaz (yalnız dev/debug).
- `network` config'i yoksa `start()` **no-op**'tur (yalnız in-memory test).

Yeni simülatör checklist'i `contracts.ts` başlığındadır (register-map, tek config
objesi, host kaydı, testler).

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

## 5. Simülatör dört davranış desenine ayrılır

| Desen | Açıklama | Örnek simülatörler |
| :--- | :--- | :--- |
| **Anlık komut** | Yazma register'a yazıldığı an etki eder; tick yalnız enerji/sayaç işler | Wattox PCS, HVAC, Control Panel IO, Demo MV Station |
| **Anlık komut + senaryo** | Coil yazımı anında; yangın/gaz durumu sınıf API'siyle enjekte edilir, release geri sayımı tick'te ilerler | FSS |
| **Darbe → tick'te uygula** | Coil bir "komut darbesi"dir; gerçek durum **sonraki tick'te** değişir (yazma→okuma tutarlılığı) | CB, DC-Output |
| **Salt okunur** | Yazma yok; değerler fizik/senaryo enjeksiyonuyla üretilir | Energy Analyzer, DC-Meter, IMD |

Not: BSC'de komut register'ı (`CONTROLLER.COMMAND_REQUEST`) yazıldığı an işlenir,
ama **güç modeli dış girdiden** beslenir (`bsc/power-input.ts#IBatteryPowerInput`,
PCS→BSC ters kanal). Setpoint register'ları (40030/40031) yalnız saklanır; güç
modelini sürmez (BSC'de charge/discharge komutu yoktur).

---

## 6. Host entegrasyonu (`host.ts`)

- `host.ts#SimulatorHost.registerDefaults` → `type` string'ini builder fonksiyonuna
  eşleyen `builders` haritası. **Yeni simülatör tipi = 1 satır kayıt.**
- Kayıtlı tipler: `bsc`, `hvac`, `cb`, `dc-output`, `dc-meter`, `energy-analyzer`,
  `control-panel-io`, `imd`, `fss`, `demo-mv-station`, `wattox-pcs`.
- `host.ts#SimulatorHost.start` fail-fast çalışır: bilinmeyen tip veya **port
  çakışması** → hata; hata hâlinde kısmen açılan sunucular kapatılır.
- `host.ts#createGridLinks` her `demo-mv-station` config'i için bir `GridLinkBus`
  kurar; MV simülatörü şalterleri bus'a yayınlar, PCS simülatörleri sorgular
  (bkz. [GRID-LINK.md](GRID-LINK.md)).
- `host.ts#SimulatorHost.start` ayrıca `connector.sim` tanımlı BSC config'lerinden
  `BscPcsConnectorAdapter`'ı örnekler; `pcsSources`/`target`/`powerScale`/`registerMap`
  alanları `connector.sim`'dedir.
- BSC bağlamdan ek alanlar alır: `details.rackCount` (**yoksa 8**),
  `details.initialSocPercent` (yoksa 50) ve `details.simSpeedMultiplier`
  (yoksa 1 = gerçek zaman; demo 133), `transport.registerMap` yolu.

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
| `fss` | [FSS.md](FSS.md) | Sigma XT yangın söndürme paneli + VIGI-DT1 gaz dedektörü | `fss/fss-simulator.ts` |
| `demo-mv-station` | [DEMO-MV-STATION.md](DEMO-MV-STATION.md) | Demo OG köşk (34,5 kV hücreler) | `demo-mv-station/demo-mv-simulator.ts` |
| — | [BSC-PCS-CONNECTOR.md](BSC-PCS-CONNECTOR.md) | BSC→PCS register köprüsü (simülatör değil, konnektör) | `bsc-pcs-connector/connector.ts` |
| — | [GRID-LINK.md](GRID-LINK.md) | Şebeke yolu bus'ı (MV şalterleri ↔ PCS enerji zinciri; simülatör değil) | `grid-link/bus.ts` |

---

## 8. Hızlı referans — davranış özeti

| Simülatör | Yazılabilir | tick fizik modeli | Alarm/arıza kaynağı |
| :--- | :--- | :--- | :--- |
| BSC | holding (komut; setpoint saklanır) | dış güç girdisi (PCS→BSC) + SOC/SOH | iç durum makinesi + LOC |
| Wattox PCS | holding (`SET_*`) | yalnız enerji sayaçları | fault/alarm word'leri |
| XRack | holding + coil | enerji entegrasyonu + SOC/gerilim | e-stop / reset coil |
| CB | coil (open/close darbe) | darbe uygulama | yok (aux kontak) |
| DC-Output | coil + holding setpoint | gerilim/akım/sıcaklık yakınsama | OV/OC eşiği → fault |
| DC-Meter | yok | yok (deterministik) | `setMeasurements` enjeksiyonu |
| Energy Analyzer | yok | 3 faz + enerji + talep | yok (ölçüm) |
| HVAC | holding setpoint/on-off | sıcaklık rampası + termal model | sıcaklık/gerilim eşiği |
| IMD | yok (sınıf API'si) | direnç rastgele örnekleme | `setFault` → <100 kΩ |
| Control Panel IO | coil (ışık) | yok (sabit) | `setFssState` enjeksiyonu |
| FSS | coil (reset/mode/fan/havalandırma) | release geri sayımı + dedektör sapması | zone/gaz enjeksiyonu + panel fault |
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

---

## 10. GELEN MİMARİ KARARLAR (⏳ karar bekliyor — 2026-10-22)

> Bu bölüm **tartışma notudur**; aşağıdaki maddeler henüz karara bağlanmadı ve
> kod değişikliği yapılmadı. Amaç: BSC donanımının zaman modelinden çıkan
> simülatör tasarım sorularını tek yerde tutmak. Kararlar verilince bu bölüm
> ilgili cihaz dokümanlarına/`AGENTS-DEVICE-SERVICE.md`'ye taşınır.

### 10.1 Bağlam — gerçek BSC'nin 1 saniyelik tick'i

Gerçek cihazda üç zaman ekseni iç içedir; "önce komut, sonra register" diye
tek bir sıra yoktur:

1. **Donanım/ISR katmanı (tick'ten bağımsız):** ADC örnekleme (hücre gerilimi,
   akım, sıcaklık) sürekli; Modbus sunucusu master ne zaman konuşursa o an
   yanıtlar; acil koruma/kontaktör yolu tick beklemez.
2. **Kontrol döngüsü (1 sn tick):** tick başında komut register'ları tüketilir
   (durum makinesi, latch'ler), hesaplar yapılır (SOC entegrasyonu, güç/enerji,
   alarm bitleri, heartbeat), tick sonunda **tek snapshot** register haritasına
   yazılır.
3. **Modbus sunucusu (paralel):** yazma geldiği anda holding register'a iner;
   okuma tick'ler arasında **donmuş son snapshot'ı** servis eder.

Çıkarım: "1 sn'de taze veri" = hesap döngüsünün snapshot hızı; Modbus yanıtı
bundan hızlıdır ama tick'ler arasında aynı değerleri döndürür. Komutun **fiziksel
etkisi** en erken sonraki tick sınırında doğar (tüketim + telemetriye yansıma →
pratikte 1–2 sn).

### 10.2 K-1 — Komut gönderme akışı: optimizasyon YOK (öneri: mevcut korunur)

"Job tetiklenir → yazar → validate eder → çıkar" bu cihaz modelinde doğru akıştır.
Tick modeli yalnızca bir gerçeği teyit eder: **validate, 1–2 tick gecikmeyi
tolere eden bir timeout içinde yaşamalı** (mevcut `CommandJobBuilder` 3000 ms).
Aradaki tick'lerde telemetri poll döngüsü tarafından zaten yazılır. Komut yolunda
optimize edilecek bir şey yok; tek parametre validate toleransıdır.

### 10.3 K-2 — Simülatör felsefesi: kolaylık modeli mi, sözleşme modeli mi?

| Model | Ne kodlar | Ne doğrular | Bugünkü durum |
| :--- | :--- | :--- | :--- |
| **Kolaylık (A)** | Komut yazıldığı an etki eder; tick yalnız zamanı akıtır | Yazılımımızın mutlu yolu (job, validate, pipeline) | Yaygın (bkz. §5 "Anlık komut") |
| **Sözleşme (B)** | Cihazın **zaman modeli**: yazma kabulü ≠ etki; etki tick'te, snapshot tick sonunda | Zaman bağımlılıklarımız: validate gecikmesi, LOC/heartbeat, kenar yakalama | BSC'de kısmen (komut anında; güç dış girdiden) |

Tartışma sonucu eğilim: **B, yalnız mimari karar aldığımız davranışlarla sınırlı.**
Gerekçe: simülatör, cihazın çalıştırılabilir SPEC'idir (`docs/simulators/*.md`
cihaz dokümantasyonu gibi yazılmıştır). Sim, SPEC'te yazan latch davranışını
anında uyguluyorsa testler gerçek cihazın zorluklarını üretmez — özellikle:

- validate'in bayat ACK okuma riski,
- `CONTROLLER.HEARTBEAT` (40000) yazılmadığında LOC alarmı (5 tick),
- komut → tüketim → telemetri yansıması gecikmesi.

Sim cihazdan daha nazikse, testler bir illüzyonu onaylar.

### 10.4 K-3 — BSC'deki mevcut tutarsızlık

`bsc/bsc-simulator.ts` içinde `COMMAND_REQUEST` (40010) **anında** işlenir
(`#BSCSimulator.writeHoldingRegister` → `#handleCommand`); setpoint register'ları
(40030/40031) ise **yalnız saklanır** — güç modeli artık `bsc/power-input.ts`
dış girdisinden (PCS→BSC ters kanal, `#BSCSimulator.applyPowerKw`) beslenir.
Yani güç yolunda setpoint latch'i kalmadı; komut hâlâ yazma anında tüketiliyor.
Gerçek cihaz komutu tick sınırında tüketir — karar verilirse tek zaman modeline
(tick tüketimi) hizalanmalıdır.

### 10.5 K-4 — Önerilen tasarım ilkeleri (tüm simülatörler)

1. **Yazma ile etkiyi ayır:** protokol katmanı yazmayı kabul eder (Modbus ACK'ı);
   **etki tick'te tüketilir** (komut shadow'u → tick başında durum makinesi).
2. **Tek snapshot noktası:** tick önce hesaplar, sonra register haritasını
   **bir seferde** commit eder → çoklu register okumaları atomik olur ve "yırtık
   snapshot" riski bizim tarafımızda ölçülebilir hale gelir.
3. **Zaman tabanı enjekte edilir:** `tick(elapsedSeconds)` × hız çarpanı —
   demo hızlı, gerçek-zamanlı sim 1:1, birim testlerde tick elle sürülür
   (deterministik zaman testleri).
4. **Fizik detayı kodlanmaz:** hücre gürültüsü/termal çözücü yok; sabitler yeterli.
   Sadakatin sınırı, **mimari karar aldığımız her davranış**; karar almadığımız
   vendor detayları sim'de netleştirilmez.

### 10.6 Açık sorular

| # | Soru | Neden önemli |
| :-- | :--- | :--- |
| S-1 | ACK (`REQUEST_ACKNOWLEDGE` 30030) gerçekte protokol anında mı, tick'te mi yazılır? | Validate toleransının en kötü durumu; sim'de "tick'te" seçmek güvenli yön |
| S-2 | Vendor register bloğunu tick içinde tek seferde mi (atomik) yoksa artımlı mı yazar? | Okuma mimarisi sabit (config'deki tüm register'lar okunur) — soru yalnız "yırtık snapshot" ihtimali |
| S-3 | Hangi simülatörler sözleşme modeline taşınacak? (§5 desen tablosu yeniden sınıflanır) | CB/DC-Output zaten "darbe → tick" deseninde; BSC/PCS/panel ayrımı netleşmeli |
| S-4 | Demo hız çarpanı (`simSpeedMultiplier`) latch gecikmesini ~ms'e indiriyor — demo UX'i için ek önlem gerekir mi? | Latch'in demo'da görünür etkisi beklenmiyor; teyit edilmeli |

### 10.7 Karar verilirse dokunulacak yerler

- `AGENTS-DEVICE-SERVICE.md` — "Simülatörler komut yazımlarını **anında** uygular
  (validate read-back tick beklemez)" kuralı, sözleşme modeli seçilirse revize.
- Bu README §5 (davranış desenleri) ve ilgili cihaz dokümanları (BSC §4 vb.).
- `apps/demo-field/integration/*` — tick gecikmesine bağlı bekleme süreleri gözden
  geçirilir (çoğu zaten 6–15 sn bekliyor).
- Birim testlerde tick'in elle sürülebilir olması (K-4/3) test altyapısı işi.
