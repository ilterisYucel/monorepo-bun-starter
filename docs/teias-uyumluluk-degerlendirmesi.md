# TEİAŞ Test Prosedürleri — Yazılım Uyumluluk Değerlendirmesi

> **Doküman versiyonu:** 1.0  
> **Değerlendirme tarihi:** 2026-07-22  
> **Referans doküman:** TEİAŞ Test Prosedürleri PDF  
> **Kapsam:** gd-pms-monorepo — veri okuma, komut gönderme, kayıt ve izleme kabiliyetleri

---

## 1. Değerlendirme Notu

TEİAŞ test prosedürlerinin büyük kısmı **batarya/PCS (Power Conversion System) donanımının fiziksel davranışını** test eder: frekans tepkisi, reaktif güç çıkışı, droop karakteristiği, SOC yönetimi, black start kabiliyeti. Bu yazılımın doğrudan sorumluluğunda değildir — bunlar PCS ve batarya yönetim sistemi (BMS) seviyesinde gerçekleşir.

**Bu değerlendirmenin odağı:** Yazılımın veri toplama, komut gönderme, kayıt tutma ve izleme yeteneklerinin TEİAŞ test gereksinimlerini ne ölçüde karşıladığıdır.

---

## 2. Ana Değerlendirme Tablosu

| # | TEİAŞ Gereksinimi | Madde | Durum |
|---|---|---|---|
| 1 | **100 ms (10 Hz) örnekleme hızı** ile veri okuma | EK2-genel | 🔴 Karşılayamıyoruz |
| 2 | 10 Hz kayıt: Aktif Güç, Şebeke Frekansı, Simüle Frekans, SOC, Enerji Kapasitesi, DC Aktif Güç, PFK Modu | EK2-genel | 🔴 Karşılayamıyoruz |
| 3 | **Ölçüm cihazı doğruluk sınıfı ≥%0,2**, kalibrasyon sertifikası ≤3 yıl | EK2-genel | ⚪ Donanım kapsamı |
| 4 | **Simüle frekans sinyali enjeksiyonu** yapılabilmesi (şebeke frekansı algılanmayacak şekilde) | EK2-1 | 🟡 Karşılayabiliriz |
| 5 | **PFK rezervinin %50'si ≤15 sn, tamamı ≤30 sn** etkinleşmeli | Madde 7 / EK2-1.1 | ⚪ Donanım/PCS kapsamı |
| 6 | **PFK tepki gecikmesi ≤2 sn** | Madde 7 | ⚪ Donanım/PCS kapsamı |
| 7 | **Ölü bant ≤±10 mHz** | Madde 7 | ⚪ Donanım/PCS kapsamı |
| 8 | **Rezerv enerji/güç oranı ≥1,25** (batarya kapasite doğrulaması) | Madde 7 / EK2-1.1 | ⚪ Donanım/PCS kapsamı |
| 9 | **Çıkış ≥15 dk sürdürülmeli**, 5. basamakta tolerans içinde kalma (TRP_A/B/C pencereleri) | EK2-1.1 | ⚪ Donanım/PCS kapsamı |
| 10 | **PFK hassasiyet testi:** ±10 mHz'de rezervin %10'unu aşmama, ±20 mHz'de %9-%11 | EK2-1.2 | ⚪ Donanım/PCS kapsamı |
| 11 | **3 saat doğrulama testi** (gerçek frekansla) — veri kaydı ve SOC limit kontrolü | EK2-1.3 | 🟢 Karşılıyoruz |
| 12 | **SFK gecikme ≤30 sn, yüklenme hızı ≥%1,5 kurulu güç/sn** | Madde 8 | ⚪ Donanım/PCS kapsamı |
| 13 | **AGC arabirimi TEİAŞ onaylı olmalı** (IEC 60870-5-104 vb.) | Madde 8 | 🟡 Karşılayabiliriz |
| 14 | **Droop %2-%7 arası**, TEİAŞ belirler | Madde 11 | 🟡 Karşılayabiliriz |
| 15 | **Kurulu gücün %40'ına kadar reaktif kapasite** sunabilme | Madde 11 | ⚪ Donanım/PCS kapsamı |
| 16 | **Reaktif güç kapasite testi:** aşırı/düşük ikazlı zorunlu değerlere %10 toleransla ulaşma, 10 dk kararlılık | EK2-3.1 | ⚪ Donanım/PCS kapsamı |
| 17 | **Gerilim kontrolcüsü performans testi:** droop %2, ±%1 basamak, tolerans eğrisi | EK2-3.2 | ⚪ Donanım/PCS kapsamı |
| 18 | **Black start:** ≤5 dk baraya enerji, ≥30 dk sürdürme, 1 veri/sn kayıt | EK2-4 | 🟡 Donanım + Yazılım |
| 19 | **Zaman senkronizasyonu** (cihaza saat yazma — NTP veya Modbus) | EK2-genel | 🟡 Karşılayabiliriz |
| 20 | **Veri kalite flag'i** (timestamp quality, measurement validity) | EK2-genel | 🟡 Karşılayabiliriz |
| 21 | **SOE (Sequence of Events) kaydı** — olayların sıra numarası ve tam zamanı ile loglanması | EK2-genel | 🟡 Karşılayabiliriz |
| 22 | **Komut gönderme + read-back doğrulama** (write-validate döngüsü) | EK2-1.1 | 🟢 Karşılıyoruz |
| 23 | **Tüm standart Modbus fonksiyon kodları** (FC01-FC16) | EK2-genel | 🟢 Karşılıyoruz |
| 24 | **Çoklu byte order desteği** (BIG_ENDIAN, LITTLE_ENDIAN, swap varyantları) | EK2-genel | 🟢 Karşılıyoruz |
| 25 | **Tüm standart veri tipleri** (INT16/UINT16/INT32/UINT32/FLOAT32/FLOAT64) | EK2-genel | 🟢 Karşılıyoruz |
| 26 | **Cihaz bağlantı kopması ve otomatik geri bağlanma** (exponential backoff + jitter) | EK2-genel | 🟢 Karşılıyoruz |
| 27 | **Sürekli veri kaydı** (TimescaleDB hypertable + compression + materialized view) | EK2-genel | 🟢 Karşılıyoruz |
| 28 | **Hata loglama ve geriye dönük inceleme** (system_logs tablosu, periyodik alan loglaması) | EK2-genel | 🟢 Karşılıyoruz |
| 29 | **Cihaz başına özelleştirilebilir konfigürasyon** (JSON/TOML/YAML) | EK2-genel | 🟢 Karşılıyoruz |
| 30 | **SOC yönetimi — Ölü bant içi sınırlı şarj/deşarj** (Yöntem 1) | EK1-Y1 | 🟡 Karşılayabiliriz |
| 31 | **SOC yönetimi — Asimetrik fazla rezerv sağlama** (Yöntem 3) | EK1-Y3 | 🟡 Karşılayabiliriz |
| 32 | **SCADA/izleme arayüzü** ile tüm sinyallerin canlı gösterimi | EK2-genel | 🟢 Karşılıyoruz |
| 33 | **Alarm durum yaşam döngüsü** (aktif / onaylı / temizlendi state machine) | EK2-genel | 🟡 Karşılayabiliriz |
| 34 | **Frekans ve RoCoF (Rate of Change of Frequency) ölçümü** | Madde 15 | 🟡 Karşılayabiliriz |

### Lejant

| Sembol | Anlam |
|---|---|
| 🟢 Karşılıyoruz | Mevcut altyapı gereksinimi tam olarak karşılar |
| 🟡 Karşılayabiliriz | Mevcut altyapıya ek geliştirme ile karşılanabilir |
| 🔴 Karşılayamıyoruz | Yazılımsal ve donanımsal sınırlar nedeniyle mevcut mimaride karşılanamaz |
| ⚪ Donanım/PCS kapsamı | Yazılımın sorumluluğunda değil, PCS/batarya donanımı seviyesinde |

---

## 3. Detaylı Açıklamalar

### 3.1 🟢 Karşılıyoruz (10 madde)

#### #11 — 3 Saat Doğrulama Testi Veri Kaydı

**Gereksinim:** 3 saat boyunca gerçek frekansla çalışma kaydı, SOC limit kontrolü.

**Nasıl karşılıyoruz:**
- TimescaleDB hypertable (`device_{deviceId}`) sürekli veri depolama sağlar (`packages/core/src/timeseries/timescaledb-adapter.ts:42-68`)
- 1 günlük chunk interval, 7 gün sonra otomatik sıkıştırma, 365 gün retention (`:53, :83-85, :92-104`)
- 5 katmanlı materialized view (5s, 1m, 15m, 1h, 1d) ile uzun süreli veriye hızlı erişim (`packages/core/src/timeseries/materialized-view-manager.ts:21-61`)
- REST API üzerinden range/latest/downsampled/aggregate sorguları (`packages/services/web-service/src/presentation/routes/data-routes.ts`)
- SOC, aktif güç, DC güç, enerji kapasitesi gibi tüm gerekli sinyaller telemetri olarak tanımlanabilir

---

#### #22 — Komut Gönderme + Read-Back Doğrulama

**Gereksinim:** Cihaza komut gönderildikten sonra ilgili register'ların okunarak komutun başarılı olduğunun doğrulanması.

**Nasıl karşılıyoruz:**
- `ModbusDevice.writeAtomic()` — 3 aşamalı transactional yazma: backup → write → rollback (`packages/core/src/modbus/device.ts:224-427`)
- `validate` mekanizması: yazma sonrası 50ms aralıklarla read-back poll, configurable timeout (`packages/services/device-service/src/device-service.ts:284-301`)
- BSC protokolü için `Request Acknowledge` register (30030) ile 17 farklı yanıt kodu doğrulaması (`packages/simulators/src/bsc/register-map.ts:265-286`)
- JSON konfigürasyonda `commands.<name>.validate.reads` ile her komuta özel doğrulama register'ları tanımlanabilir

---

#### #23 — Tüm Standart Modbus Fonksiyon Kodları

**Gereksinim:** FC01 (Read Coils), FC02 (Read Discrete Inputs), FC03 (Read Holding Registers), FC04 (Read Input Registers), FC05 (Write Single Coil), FC06 (Write Single Register), FC15 (Write Multiple Coils), FC16 (Write Multiple Registers)

**Nasıl karşılıyoruz:**
- 8 fonksiyon kodunun tamamı `ModbusTcpClient` içinde implemente (`packages/core/src/modbus/client.ts:108-204`)
- `ModbusDevice` sınıfı bu metodları toplu okuma/yazma için optimize eder — 125 register batch limit, adrese göre gruplama, paralel grup okuma (`device.ts:38, 76-130, 754-785`)

> ⚠️ **Kısıt:** `ModbusDevice._readCoilBatch()` sadece simülatör adapter ile çalışır, gerçek cihaz coil okuması yapmaz (`device.ts:515-529`). Eğer saha cihazları coil/discrete input kullanıyorsa bu metodun gerçek client'a yönlendirilmesi gerekir.

---

#### #24 — Çoklu Byte Order Desteği

**Gereksinim:** Farklı cihaz üreticilerinin farklı endianness formatları.

**Nasıl karşılıyoruz:**
- 4 byte order modu: `BIG_ENDIAN` (ABCD), `LITTLE_ENDIAN` (DCBA), `BIG_ENDIAN_SWAP` (BADC), `LITTLE_ENDIAN_SWAP` (CDAB) (`packages/shared-types/src/telemetry.ts:8-12`)
- `BinaryPayloadDecoder` okuma sırasında buffer'ı yeniden sıralar (`packages/core/src/modbus/decoder.ts:36-65`)
- `applyByteOrderToBuffer()` yazma sırasında buffer'ı yeniden sıralar (`device.ts:645-681`)
- Her telemetri girişi için ayrı ayrı byte order tanımlanabilir

---

#### #25 — Tüm Standart Veri Tipleri

**Gereksinim:** INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64, BOOL

**Nasıl karşılıyoruz:**
- 7 veri tipi desteklenir: `BOOL`, `INT16`, `UINT16`, `INT32`, `UINT32`, `FLOAT32`, `FLOAT64` (`packages/core/src/modbus/decoder.ts:9-16`)
- Her tipe karşılık gelen register sayısı: 1-4 register (`:103-117`)
- `scale` ve `offset` parametreleri ile ham değer → mühendislik birimi dönüşümü (ör: `actual = raw * 0.01 + 0`)

---

#### #26 — Cihaz Bağlantı Kopması ve Otomatik Geri Bağlanma

**Gereksinim:** Test sırasında bağlantı koparsa otomatik toparlanma.

**Nasıl karşılıyoruz:**
- `ModbusTcpClient` — exponential backoff: 1000ms taban, 5 deneme, 30000ms maksimum gecikme, %30'a kadar random jitter (`packages/core/src/modbus/client.ts:75-85`)
- `ModbusDevice` — 10000ms reconnect cooldown (`device.ts:40, 56-58`)
- BullMQ worker — 3 retry, exponential backoff (`packages/core/src/messaging/bullmq-adapter.ts:9-13`)
- WebSocket — dead socket sweep 60sn, ping/pong 30sn (`packages/services/web-service/src/realtime-manager.ts:20-31`)

---

#### #27 — Sürekli Veri Kaydı

**Gereksinim:** Tüm telemetri sinyallerinin kesintisiz zaman serisi olarak saklanması.

**Nasıl karşılıyoruz:**
- TimescaleDB hypertable — cihaz başına ayrı tablo, otomatik partition (`packages/core/src/timeseries/timescaledb-adapter.ts:42-68`)
- Compression — 7 gün sonra otomatik, segment-by name (`:75-90`)
- Retention — yapılandırılabilir süre sonunda otomatik veri silme (`:92-104`)
- Materialized views — 5s/1m/15m/1h/1d continuous aggregate (`materialized-view-manager.ts:21-61`)
- Redis ring buffer — 300 entry, 5dk TTL, WebSocket aboneleri için (`realtime-manager.ts:73-89`)

---

#### #28 — Hata Loglama ve Geriye Dönük İnceleme

**Gereksinim:** Test sırasında oluşan hataların loglanması ve sonradan incelenebilmesi.

**Nasıl karşılıyoruz:**
- `system_logs` tablosu: id (UUID), timestamp (TIMESTAMPTZ), type (info/success/error/warning), source (system/user), message, details (`packages/services/web-service/src/domain/repositories/log-repository.ts:4-15`)
- Bitfield tabanlı otomatik log: `DataService` her telemetri yazımında `logType` tag'ine sahip ve değeri truthy olan bitfield'ları otomatik loglar (`packages/services/data-service/src/data-service.ts:24-37`)
- Tüm modüllerde `[ModülAdı]` prefix'i ile console.log/warn/error loglaması
- Örnek prefix'ler: `[ModbusDevice]`, `[BullMQ]`, `[DeviceService]`, `[TimescaleDB]`, `[FastifyServer]`, `[RealtimeManager]`

---

#### #29 — Cihaz Başına Özelleştirilebilir Konfigürasyon

**Gereksinim:** Her cihazın register haritasına göre özel konfigürasyon.

**Nasıl karşılıyoruz:**
- JSON, TOML ve YAML format desteği (`packages/services/device-service/src/config-loader.ts:36`)
- Cihaz başına: deviceId, name, manufacturer, model, protocol, connection (host/port/slaveId/timeout), pollIntervalMs, simulator tipi, parallelRead/Write (`shared-types/src/schemas/device-config.ts:46-57`)
- Telemetri başına: registerAddress, registerTableType, registerDataType, scale, offset, byteOrder, priority, tags (`shared-types/src/telemetry.ts:484-497`)
- Bitfield başına: registerAddress, registerType, bitStart/bitEnd, alarmLimit, logType
- Komut başına: telemetries, params (min/max/default/required/label), atomic, timeoutMs, validate.reads

---

#### #32 — SCADA/İzleme Arayüzü

**Gereksinim:** Tüm sinyallerin canlı gösterimi ve geçmiş veri grafikleri.

**Nasıl karşılıyoruz:**
- React v19 + Vite v8 frontend (`apps/web/`)
- PixiJS v8 ile gerçek zamanlı cihaz grafikleri (`packages/ui/src/components/`)
- Recharts v3 ile zaman serisi grafikleri (TelemetryChart)
- ITelemetryTransport interface ile WebSocket/HTTP polling/Mock transport stratejileri (`packages/shared-types/src/telemetry-transport.ts`)
- Compound component pattern: `DeviceTelemetryProvider` her cihaz için izole veri akışı sağlar

---

### 3.2 🟡 Karşılayabiliriz (11 madde)

#### #4 — Simüle Frekans Sinyali Enjeksiyonu

**Gereksinim:** PFK testi sırasında şebeke frekansı yerine simüle edilmiş frekans sinyali cihaza enjekte edilebilmeli. Bu TEİAŞ tarafından bir sinyal jeneratörü ile yapılır, ancak yazılımın bu sinyali okuyabilmesi ve/veya simülatöre frekans profili tanımlanabilmesi gerekir.

**Nasıl karşılayabiliriz:**
- Mevcut simülatör altyapısı (`packages/simulators/src/`) üzerine **frekans profili oynatıcı** eklenebilir
- `BSCSimulator`'a `setFrequency(freq_mHz: number)` metodu ve önceden tanımlı test profilleri (ör: ±200 mHz basamak, 15dk süre) eklenebilir
- Veya harici bir frekans jeneratöründen okunan frekans değeri telemetri olarak kaydedilebilir (mevcut altyapı bunu zaten destekler)
- Tahmini efor: 2-3 gün

---

#### #14 — Droop Parametresi Yazma

**Gereksinim:** PCS droop değeri %2-%7 arasında TEİAŞ tarafından belirlenir ve cihaza yazılabilmelidir.

**Nasıl karşılayabiliriz:**
- Mevcut komut sistemi holding register yazmayı destekler
- Cihaz konfigürasyonuna `"droop"` adında bir komut eklenerek ilgili register'a droop değeri yazılabilir
- Manevra sistemine droop değişikliği adımı eklenebilir
- Tahmini efor: 0.5 gün (konfigürasyon değişikliği)

---

#### #18 — Black Start Testi Yazılım Desteği

**Gereksinim:** "Devreye gir" talimatından bara enerjilenmesine kadar ≤5 dk, sonra ≥30 dk sürdürme. 1 veri/sn kayıt (diğer testlerin 10 Hz'ine göre daha yavaş).

**Durum:** Donanım tarafı (PCS'in black start kabiliyeti) yazılım dışı. Ancak yazılım şunları yapabilir/yapmalıdır:

**Nasıl karşılayabiliriz:**
- Komut gönderme: Mevcut komut sistemi ile black start başlatma komutu gönderilebilir
- 1 veri/sn kayıt: Mevcut 1000ms poll interval bunu karşılar
- Black start'a özel manevra tanımı (izolasyon → enerjilendirme → yükleme adımları)
- Test sırasında sürekli SOC ve bara gerilimi takibi (mevcut telemetri altyapısı ile mümkün)
- Tahmini efor: 1 gün (manevra tanımı + black start komut konfigürasyonu)

---

#### #30 — SOC Yönetimi: Ölü Bant İçi Sınırlı Şarj/Deşarj (Yöntem 1)

**Gereksinim:** Sistem frekansı ±10 mHz ölü bant aralığındayken, rezerv kapasitesinin en fazla %10'unu geçmeyecek şekilde şarj/deşarj yaparak SOC'yi dengeleme.

**Nasıl karşılayabiliriz:**
- Mevcut manevra sistemine (`apps/web/src/features/control/maneuvers.ts`) SOC yönetim algoritması eklenebilir
- `ManeuverControls.transform` ile frekans okumasına göre dinamik güç setpoint hesaplaması
- `ManeuverControls.inputs` ile kullanıcı tarafından SOC hedef aralığı ve maksimum güç limiti tanımlanabilir
- **Ancak asıl kontrol döngüsü (frekans → güç çıkışı) PCS tarafından yapılır**, yazılım sadece PCS'e "ölü bant içi mod" aktifleştirme komutu ve SOC hedef aralığı gönderebilir
- Tahmini efor: 2-3 gün

---

#### #31 — SOC Yönetimi: Asimetrik Fazla Rezerv Sağlama (Yöntem 3)

**Gereksinim:** Frekans 50 Hz altındayken (deşarj) veya üstündeyken (şarj) yükümlü rezervin %20'sine kadar fazlasını sağlayabilme.

**Nasıl karşılayabiliriz:**
- Yöntem 1 ile aynı mekanizma — manevra sistemine ek algoritma
- Frekans yönüne göre asimetrik güç limitleri tanımlanabilir
- **Yine asıl kontrol PCS'te** — yazılım sadece mod ve limit değerlerini PCS'e iletir
- Tahmini efor: 1-2 gün

---

#### #34 — Frekans ve RoCoF Ölçümü

**Gereksinim:** Şebeke frekansının ve frekans değişim hızının (RoCoF) ölçülüp kaydedilmesi.

**Nasıl karşılayabiliriz:**
- Şebeke frekansı PCS veya harici bir frekans ölçerden Modbus register olarak okunabilir (mevcut telemetri altyapısı destekler)
- RoCoF hesaplaması: `DataService` veya `device-service` seviyesinde ardışık frekans ölçümlerinden türev hesaplanabilir
- Ancak TEİAŞ'ın RoCoF gereksinimi (Madde 15) donanım seviyesinde hızlı tepki gerektirir (≤200ms), yazılım seviyesinde hesaplanan RoCoF sadece kayıt/izleme amaçlıdır
- Tahmini efor: 1 gün

---

#### #13 — AGC Arabirimi (IEC 60870-5-104)

**Gereksinim:** Sekonder Frekans Kontrolü için AGC (Automatic Generation Control) arabirimi TEİAŞ onaylı olmalı. Türkiye'de bu tipik olarak IEC 60870-5-104 protokolüdür.

**Nasıl karşılayabiliriz:**
- Mevcut protokol soyutlama katmanı (`packages/core/src/` içindeki Strategy pattern) üzerine yeni bir IEC 104 adapter eklenebilir
- `IModbusSimulatorAdapter` benzeri bir `IIec104Adapter` interface'i tanımlanır, `Iec104Client` implementasyonu ASDU formatında telemetri okuma ve komut gönderme yapar
- Mevcut cihaz konfigürasyon sistemine (JSON/TOML/YAML) IEC 104 point list mapping eklenir
- BullMQ job sistemi üzerinden periyodik IEC 104 polling entegre edilir
- TEİAŞ'ın belirlediği point list'e göre sinyal eşleme konfigürasyonu
- Tahmini efor: 10-15 gün (protokol implementasyonu + test + TEİAŞ onay süreci)

---

#### #19 — Zaman Senkronizasyonu (Cihaza Saat Yazma)

**Gereksinim:** Tüm cihazların ve kayıt sisteminin UTC ile senkronize olması. Cihazlara NTP veya Modbus üzerinden zaman yazılabilmesi.

**Nasıl karşılayabiliriz:**
- Sunucu tarafına NTP client entegrasyonu (örn. `ntp-client` npm paketi veya sistem `ntpd`) ile sunucu saati UTC'ye senkronize edilir
- BSC ve diğer cihaz konfigürasyonlarına zaman yazma komutu eklenir (ilgili register adreslerine UNIX timestamp veya yıl/ay/gün/saat/dakika/saniye yazılır)
- `ModbusDevice.writeMultipleRegisters()` mevcut olduğu için zaman yazma işlemi yeni bir kod gerektirmez — sadece konfigürasyona komut tanımı eklenir
- Management job içine periyodik zaman senkronizasyonu (örn. saatte bir) eklenir
- Tahmini efor: 2-3 gün (NTP + Modbus zaman yazma komut konfigürasyonu)

---

#### #20 — Veri Kalite Flag'i

**Gereksinim:** Her ölçümün geçerlilik durumunu belirten kalite flag'i (geçerli/geçersiz/şüpheli/tutarsız vb.).

**Nasıl karşılayabiliriz:**
- `quality` alanı veritabanı şemasında zaten `INTEGER DEFAULT 1` olarak tanımlı (`timescaledb-adapter.ts:48`) — altyapı hazır
- `TelemetryData` tipinde `quality?: number` zaten var (`shared-types/src/telemetry.ts`) — tip desteği var
- `DeviceService.readDevice()` içinde bağlantı durumu kontrolü eklenir: cihaz bağlantısı koptuysa `quality=0`, okuma hatası varsa `quality=2` (şüpheli), normalse `quality=1` (geçerli)
- NTP sync durumu da `quality` değerini etkileyebilir (ör: son 5 dk içinde NTP sync yoksa `quality` bir alt seviyeye düşer)
- Tahmini efor: 1-2 gün

---

#### #21 — SOE (Sequence of Events) Kaydı

**Gereksinim:** Alarm ve olayların oluş sırasına göre, tam zaman damgası ve sıra numarası ile kaydedilmesi.

**Nasıl karşılayabiliriz:**
- `system_logs` tablosuna `sequence_number` (BIGSERIAL) ve `device_timestamp` (TIMESTAMPTZ) alanları eklenir
- Cihaz konfigürasyonuna SOE register aralığı tanımı eklenir (birçok RTU/IED SOE olaylarını dahili buffer'da tutar, bu buffer periyodik okunur)
- `DeviceService` içinde SOE buffer okuma mantığı: cihazdan SOE register'ları okunur, yeni olaylar (sequence_number > son kaydedilen) `system_logs` tablosuna yazılır
- Çoklu cihazdan gelen SOE'ler `device_timestamp` ile kronolojik sıralanır
- Tahmini efor: 3-5 gün (veritabanı şeması + SOE buffer okuma + sıralama mantığı)

---

#### #33 — Alarm Durum Yaşam Döngüsü

**Gereksinim:** Her alarm için state machine: Aktif → Onaylandı (acknowledged) → Temizlendi (cleared). Alarm aktifken durumunun takip edilmesi, temizlendikten sonra da geçmişte kaldığının bilinmesi.

**Nasıl karşılayabiliriz:**
- Yeni `alarms` tablosu: id, device_id, alarm_name, state (active/acknowledged/cleared), active_at, acknowledged_at, acknowledged_by, cleared_at
- `AlarmStateMachine` sınıfı: active → acknowledge() → acknowledged → clear() → cleared durum geçişleri
- `DataService` içinde: her telemetri yazımında bitfield değerleri kontrol edilir, yeni alarm tespit edilirse `alarms` tablosuna INSERT, temizlenen alarm varsa state UPDATE
- REST API: `GET /api/alarms` (filtreli liste), `POST /api/alarms/:id/acknowledge` (kullanıcı onayı)
- UI: mevcut SCADA arayüzüne alarm paneli bileşeni eklenir
- Tahmini efor: 4-6 gün

---

### 3.3 🔴 Karşılayamıyoruz (2 madde — donanımsal sınır)

#### #1 — 100 ms (10 Hz) Örnekleme Hızı

**Gereksinim:** Saniyede 10 veri (100 ms aralıklarla) okuma.

**Neden karşılayamıyoruz:**

| Katman | Sınır | Detay |
|---|---|---|
| **Cihaz (BSC/PCS)** | Register güncelleme periyodu | BSC ve benzeri endüstriyel cihazlar internal register'larını tipik olarak 500ms-1sn aralığında günceller. 100ms'de bir poll yapılsa bile aynı değer tekrar tekrar okunur — cihazın kendisi bu hızda veri üretmez. |
| **Modbus TCP** | İletişim gecikmesi | 200+ register'lık bir batch okuma fiziksel olarak ≈50-150ms sürer (TCP round-trip + cihaz işlem süresi). 125 register batch limitiyle (Modbus protokol sınırı) 2-3 batch gerekir, toplam >100ms. |
| **Yazılım mimarisi** | Poll interval | Minimum 1000ms, BullMQ job tabanlı mimari 100ms interval için fazla ağır. |

**Neden yazılımla çözülemez:**
Cihaz register güncelleme periyodu ve Modbus TCP fiziksel gecikmesi yazılımın kontrolü dışındadır. Poll interval'ı 100ms'e indirsek bile cihaz aynı değeri dönecektir. 10Hz örnekleme için cihaz tarafında özel bir yüksek hızlı veri kanalı (ör: UDP streaming, FPGA tabanlı data logger) gerekir.

**TEİAŞ pratiği:**
TEİAŞ testlerinde 10Hz örnekleme genellikle **harici bir kayıt cihazı** (power quality analyzer, Class A PMU) tarafından yapılır. Bu cihaz doğrudan gerilim/akım trafolarına bağlanır, SCADA yazılımından bağımsız çalışır. SCADA'nın bu testteki rolü komut göndermek ve test sonuçlarını kaydetmektir, 10Hz ham veriyi toplamak değil.

---

#### #2 — 10 Hz Veri Kaydı

**Gereksinim:** Aktif Güç Çıkışı, Şebeke Frekansı, Uygulanan Simüle Frekans, Doluluk Oranı (SOC), Enerji Kapasite Miktarı, DC Aktif Güç Çıkışı, PFK on/off Modu sinyallerinin 100 ms aralıklarla kaydedilmesi.

**Neden karşılayamıyoruz:**
#1'deki aynı donanımsal sınırlar geçerli. Ayrıca:
- TimescaleDB yazma: batch 200 entry ≈50-100ms, 100ms interval ile sürekli yazma DB'yi doyurur
- poll → queue → process → write zinciri toplamda >500ms

**TEİAŞ pratiği:**
#1'de belirtildiği gibi, bu kayıt harici kayıt cihazı tarafından yapılır. SCADA yazılımı test süresince kendi normal poll interval'ında (1-5sn) kayıt yapmaya devam eder, bu kayıtlar test sonrası analiz için tamamlayıcı niteliktedir. TEİAŞ asıl 10Hz veriyi harici cihazın raporundan değerlendirir.

---

### 3.4 ⚪ Donanım/PCS Kapsamı (11 madde)

Bu maddeler yazılımın sorumluluğunda değildir — PCS (Power Conversion System), BMS (Battery Management System) veya batarya donanımı seviyesinde karşılanması gereken fiziksel performans gereksinimleridir. Yazılımın buradaki tek rolü: komut göndermek, veri okumak ve kaydetmek.

| # | Gereksinim | Açıklama |
|---|---|---|
| 3 | Ölçüm cihazı doğruluk sınıfı ≥%0,2 | Harici power quality analyzer veya PCS içi ölçüm devresi |
| 5 | PFK rezerv aktivasyon süresi (%50 ≤15sn, %100 ≤30sn) | PCS'in güç elektroniği tepki süresi |
| 6 | PFK tepki gecikmesi ≤2sn | PCS kontrol döngüsü + frekans ölçüm gecikmesi |
| 7 | Ölü bant ≤±10 mHz | PCS frekans ölçüm hassasiyeti |
| 8 | Rezerv enerji/güç oranı ≥1,25 | Batarya kapasitesi (kWh) / PCS gücü (kW) — fiziksel tasarım |
| 9 | Çıkış ≥15 dk sürdürme + TRP_A/B/C tolerans pencereleri | Batarya kapasitesi ve PCS termal yönetimi |
| 10 | PFK hassasiyet: ±10 mHz'de <%10, ±20 mHz'de %9-%11 | PCS frekans kontrol algoritması hassasiyeti |
| 12 | SFK gecikme ≤30sn, yüklenme hızı ≥%1,5/sn | PCS ramping performansı |
| 15 | Kurulu gücün %40'ına kadar reaktif kapasite | PCS inverter kapasitesi ve güç faktörü aralığı |
| 16 | Reaktif güç kapasite testi (%10 tolerans, 10 dk kararlılık) | PCS reaktif güç kontrol performansı |
| 17 | Gerilim kontrolcüsü performans testi (droop %2, tolerans eğrisi) | PCS gerilim kontrol algoritması |

---

## 4. Özet ve Öncelikli Aksiyonlar

### 4.1 Geliştirme Gerektiren Maddeler (öncelik sıralı)

Tüm 🟡 maddeler mevcut altyapıya ek geliştirme ile karşılanabilir. Önceliklendirme TEİAŞ testlerine katılım için kritiklik bazındadır.

| Öncelik | Eksiklik | Efor | Açıklama |
|---|---|---|---|
| **P0** | #13 AGC arabirimi (IEC 60870-5-104) | 10-15 gün | SFK için zorunlu, TEİAŞ onaylı olmalı |
| **P0** | #19 Zaman senkronizasyonu | 2-3 gün | Test kayıtlarının güvenilirliği için zorunlu |
| **P1** | #20 Veri kalite flag'i | 1-2 gün | Ölçüm geçerliliği takibi |
| **P1** | #21 SOE kaydı | 3-5 gün | Olay kronolojisi |
| **P1** | #33 Alarm yaşam döngüsü | 4-6 gün | Alarm yönetimi |
| **P2** | #4 Simüle frekans sinyali enjeksiyonu | 2-3 gün | Simülatör geliştirmesi |
| **P2** | #14 Droop parametresi yazma | 0.5 gün | Konfigürasyon değişikliği |
| **P2** | #18 Black start yazılım desteği | 1 gün | Manevra tanımı |
| **P2** | #30 SOC yönetimi (Yöntem 1) | 2-3 gün | Manevra algoritması |
| **P2** | #31 SOC yönetimi (Yöntem 3) | 1-2 gün | Manevra algoritması |
| **P2** | #34 Frekans ve RoCoF ölçümü | 1 gün | Hesaplama mantığı |

### 4.2 Yazılım Sorumluluğu Net Olan ve Mevcut Altyapının Güçlü Olduğu Alanlar

- **Modbus haberleşme:** Tüm standart fonksiyon kodları, byte order, veri tipleri — eksiksiz
- **Komut gönderme ve doğrulama:** Transactional write + read-back validation — test gereksinimlerini fazlasıyla karşılar
- **Veri depolama:** TimescaleDB hypertable + compression + materialized views — ölçeklenebilir
- **Cihaz konfigürasyonu:** JSON/TOML/YAML ile her cihaza özel, esnek yapı
- **Hata toleransı:** Exponential backoff, retry, reconnect, rollback — sağlam

### 4.3 Toplam Efor Özeti

| Kategori | Kapsam | Tahmini Efor |
|---|---|---|
| Kritik (P0) | AGC + Zaman sync | 12-18 gün |
| Yüksek (P1) | Kalite flag + SOE + Alarm | 8-13 gün |
| İyileştirme (P2) | Frekans, droop, black start, SOC, RoCoF | 7.5-10.5 gün |
| **Toplam (geliştirilebilir)** | **Tüm 🟡 maddeler** | **27.5-41.5 gün** |
| 🔴 Donanımsal sınır | 10 Hz örnekleme/kayıt | Karşılanamaz |

> **Not:** Bu efor tahminleri sadece yazılım geliştirme içindir. TEİAŞ onay süreci, saha testleri, dokümantasyon ve koordinasyon ayrıca planlanmalıdır. Özellikle AGC arabirimi için TEİAŞ ile ön görüşme ve point list onayı gerekir. 10 Hz örnekleme ve kayıt gereksinimi için harici kayıt cihazı (power quality analyzer) kullanılması standart uygulamadır ve yazılım kapsamı dışındadır.

---

## 5. Sonuç

GD-PMS yazılımı **TEİAŞ test prosedürlerindeki veri okuma, komut gönderme ve kayıt tutma gereksinimlerinin çoğunu karşılamaktadır.** Modbus haberleşme altyapısı, transactional yazma, veri depolama ve cihaz konfigürasyonu açısından güçlü bir temele sahiptir.

**Kod geliştirilerek karşılanabilecek 11 madde** tespit edilmiştir. Bunlardan en kritik ikisi:
1. **AGC arabirimi (IEC 60870-5-104)** — Sekonder Frekans Kontrolü için zorunlu, 10-15 gün
2. **Zaman senkronizasyonu** — Test kayıtlarının güvenilirliği için gerekli, 2-3 gün

**Donanımsal olarak karşılanamayan 2 madde** (#1, #2 — 10 Hz örnekleme ve kayıt) yazılımın değil, Modbus TCP protokolünün ve cihaz register güncelleme periyodunun fiziksel sınırlarından kaynaklanmaktadır. Bu gereksinim TEİAŞ testlerinde standart olarak harici kayıt cihazı (power quality analyzer / PMU) ile karşılanır, SCADA yazılımından beklenmez.

**Fiziksel performans gereksinimleri** (frekans tepkisi, reaktif güç, droop, black start) yazılımın değil PCS donanımının sorumluluğundadır. Yazılımın buradaki rolü, PCS'e doğru komutları zamanında iletmek ve sonuçları kaydetmektir — ki bu mevcut altyapı ile sağlanabilir.

**Toplam geliştirme eforu: 27.5-41.5 gün** (tüm 🟡 maddeler için).
