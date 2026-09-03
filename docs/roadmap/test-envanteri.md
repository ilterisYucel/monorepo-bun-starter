# Test Envanteri — Dosya Bazında Kapsam Dökümü

> **Üretim:** 2026-08-31 · **Kaynak:** monorepo kaynak test dosyalarının tek tek okunmasıyla derlendi (otomatik parse değil).
> **Kapsam:** packages/*, services/*, apps/* içindeki tüm `*.test.ts` / `*.test.tsx` dosyaları + `e2e/` Playwright spec'leri.
> **Yapı:** Her test dosyası bir başlıktır (`### dosya yolu`); altında dosyanın "Hedef" özeti ve TEK TEK her `it(...)`/`test(...)` bloğunun neyi kontrol ettiği madde madde yazılıdır. Dosya sonundaki `[DOSYA NOTU]` satırı, o dosyanın testlerinin KAPSAMADIĞI dalları söyler — bu notların tümü belgenin sonundaki "Boşluk Dökümü" bölümünde birleştirilmiştir.

## İstatistik

| Bölüm | Kapsam | Test dosyası | Madde (it/test) |
|-------|--------|--------------|-----------------|
| 1 | packages/result · core · shared-utils · shared-types | 17 | 208 |
| 2 | packages/ui · simulators · plugin-sdk · epias · editor | 26 | 169 |
| 3 | web-service — presentation · application · domain · config | 22 | 257 |
| 4 | web-service — infrastructure · device-service · data-service · integration-service | 32 | 258 |
| 5 | apps — field · container-web · superadmin · demo-backend · e2e | 36 | 202 |
| 6 | packages/tamper-logger — tamper-evident log kütüphanesi | 14 | 104 |
| 7 | packages/platform — messaging · container-access · logging | 3 | 35 |
| 8 | packages/ws-tunnel — çoklanmış WS tüneli (2026-09-01 ayrıldı) | 12 | 214 |
| **Toplam** | | **164** | **~1447** |

> **Sayım doğrulaması (2026-09-01):** tüm monorepo gerçek vitest çıktısıyla doğrulandı — **153 test dosyası / 1431 test, tümü yeşil** (`bun run test`). Proje bazında: result 2/33, ws-tunnel 12/214, web-service 44/423, shared-types 5/56, core 8/102, data-service 1/13, platform-container-access 0 (interface yalnızca tip), container-web 9/82. **Son değişiklik (2026-09-01):** `Result`/`DomainError` AYRI YAPRAK PAKETE taşındı (`packages/result` — core/errors + ws-tunnel kopyası + shared-types basit Result tek pakette birleşti; `okVoid` eklendi); `tunnel-proxy.test.ts` 34 ve `ws-socket-client.test.ts` 9 başlık sayısı `it.each` genişlemelerini içerir. **Faz B teknik (2026-09-01):** ws-tunnel tam bağımsız (shared-types tip bağımlılığı söküldü); paket içi loopback (`demo/loopback.spec.ts` 5 test) + `examples/loopback-demo.mjs` 6/6.

## Ayrım Kaydı — ws-tunnel ✅ TAMAMLANDI (2026-09-01, KUTUPHANE-CIKARMA-PLANI.md Faz A)

Aşağıdaki tablo ayrımın kontrol listesiydi ve **uygulandı** — gerçek hedefler ve sapmalar:

### → `packages/ws-tunnel` taşınacak (jenerik: çoklanmış WS tüneli)

| Dosya (kaynak) | Test dosyası | Madde |
|---|---|---|
| `packages/platform/container-access/src/tunnel/{types,frame-codec,index}.ts` | `frame-codec.test.ts` | 18 |
| `packages/shared-types/src/field-connector.ts` (kontrol mesaj tipleri + zod şemaları) | `field-connector.test.ts` | 27 |
| `field-connector/field-connector.ts` (durum makinesi — `ISnapshotSource`/`IMessageSubscriber` enjeksiyonuyla) | `field-connector.test.ts` + `field-connector.spec.ts` | 53 + 7 |
| `field-connector/tunnel-client.ts` | `tunnel-client.test.ts` | 25 |
| `field-connector/ws-socket-client.ts` + `interfaces.ts` (`ISocketClient`) | `adapters.test.ts` (WsSocketClient/Factory kısmı) | 9 |
| `field-connector/reconnect-delay.ts` | `reconnect-delay.test.ts` | 13 |
| `field-connector/container-session-server.ts` (`ITokenSigner` enjeksiyonuyla) | `container-session-server.test.ts` | 3 |
| `field-connector/session-store.ts` (ContainerSessionStore) | `session-store.test.ts` | 10 |
| `container-session/session-gateway.ts` + `field-session-store.ts` (`IAuditSink`/`IFieldChannel`/`ILogger` enjeksiyonuyla; **session-audit monorepo'da kaldı** — `SessionAudit` IAuditSink implementasyonu) | `session-gateway.test.ts` | 10 |
| `container-session/tunnel-proxy.ts` (`IStreamSink` + kanal arayüzü; Fastify adapter'i monorepo'da) | `tunnel-proxy.test.ts` | 34 |
| `container-session/tunnel.spec.ts` — **monorepo'da kaldı** (ürün entegrasyon kapısı) | — | 4 |
| YENİ: `errors` (core'dan birebir kopya — paket bağımsızlığı) | `result.test.ts` + `domain-error.test.ts` | 31 |
| **Toplam** | | **240** |

### Monorepo'da kalacak (domain — GD-PMS field/container ürünü)

| Dosya | Test dosyası | Madde | Not |
|---|---|---|---|
| `container-proxy/container-proxy.ts` | `container-proxy.test.ts` | 52 | Faz 3 kanal metotları (`sendControl`/`sendBinary`/observer) ws-tunnel **kanal kontratına adapter** olur |
| `container-proxy/container-ws-routes.ts` | `container-ws-routes.test.ts` | 4 | |
| `field-connector/realtime-snapshot-source.ts` | `adapters.test.ts` (RealtimeSnapshotSource kısmı) | 6 | |
| `field-connector/telemetry-query-responder.ts` | `telemetry-query-responder.test.ts` | 7 | |
| `field-connector/telemetry-series-source.ts` | `telemetry-series-source.test.ts` | 4 | |
| `presentation/routes/session-routes.ts` | `session-routes.test.ts` | 6 | Fastify route katmanı |
| `realtime/ws-routes.ts` (tünel oturum token kabulü), `rbac.ts` (sessionAuthenticator), `auth-routes.ts` (tunnel bayrağı) | ilgili dosyalar | — | |
| `apps/container-web` `session-auth` | `session-auth.test.ts` | 7 | |
| `e2e/tunnel.spec.ts` + `e2e/field-flow.spec.ts`, `tools/tunnel-demo.mjs` + `tools/field-connector-demo.mjs` | — | 2 + 1 | canlı kanıtlar monorepo'da kalır |

**Ayrım sonrası monorepo'da YAZILAN adapter testleri (tamamı yeşil):** `container-proxy-field-channel.test.ts` (4), `fastify-stream-sink.test.ts` (3), `jose-token-signer.test.ts` (4), `session-audit.test.ts` (5), `realtime-snapshot-source.test.ts` (6). Kapılar (KUTUPHANE-CIKARMA-PLANI.md §7): tüm monorepo testleri yeşil (1463), `nx run-many -t build` yeşil, `bun tools/tunnel-demo.mjs` 9/9 + `bun tools/field-connector-demo.mjs` gözle demoları geçti; `tunnel.spec.ts` (4) monorepo'da entegrasyon kanıtı olarak yeşil.

## Nasıl okunur

- **Başlık:** `### `yol`` + `(`N test`)` — dosyadaki `it`/`test` bloğu sayısı.
- **Hedef:** Test edilen sınıf/bileşen + dosya başındaki JSDoc sözleşmesinin özeti.
- **Madde formatı:** `1. (describe: "...") **"it adı"** — Açıklama.` — "X sınıfındaki Y metodunun test bloğu — şu girdi/koşul şu beklenen davranışı üretiyor mu kontrol ediyor" tarzında tek cümle.
- **`(skip)` / `(todo)`:** Tanımlı ama çalıştırılmayan bloklar.
- **`[DOSYA NOTU]`:** O dosyanın kapsamadığı dallar — boşluk analizi için birincil girdi.


---

## 1. packages/result · core · shared-utils · shared-types

### `packages/core/src/modbus/client.test.ts` (`8 test`)
**Hedef:** `ModbusTcpClient` — jsmodbus TCP sarmalayıcı; connect/timeout/reconnect yaşam döngüsü ve bağlantı gerektiren hataların karakterizasyonu.

1. (describe: "ModbusTcpClient (T3)") **"connect başarılı: bağlı durum + reconnect sayacı sıfırlanır"** — `ModbusTcpClient.connect` socket "connect" olayında isConnected=true döndürüp doğru host/port ile bağlandığını doğruluyor.
2. (describe: "ModbusTcpClient (T3)") **"connect error eventi → 'Modbus connection failed' hatası"** — `connect` socket "error" olayında "Modbus connection failed: ..." hatasıyla reddediyor mu kontrol ediyor.
3. (describe: "ModbusTcpClient (T3)") **"connect timeout (varsayılan 3000 ms) → socket destroy + hata"** — `connect` 3000 ms'de yanıt gelmeyince socket'i yok edip "Modbus connection timeout" fırlatıyor mu kontrol ediyor.
4. (describe: "ModbusTcpClient (T3)") **"bağlı değilken read/write 'Not connected' fırlatır"** — bağlantı yokken tüm okuma/yazma metodlarının "Not connected" fırlattığını doğruluyor.
5. (describe: "ModbusTcpClient (T3)") **"readHoldingRegisters jsmodbus sonucunu döner; hata sarılır"** — `readHoldingRegisters` jsmodbus değer dizisini döndürüp hata durumunda "Read holding registers failed" sarmalaması yapıyor mu kontrol ediyor.
6. (describe: "ModbusTcpClient (T3)") **"socket close eventi bağlantıyı düşürür"** — bağlıyken socket "close" olayının isConnected'ı false'a çektiğini doğruluyor.
7. (describe: "ModbusTcpClient (T3)") **"bağlıyken socket error eventi bağlantıyı düşürür"** — bağlıyken socket "error" lifecycle olayının isConnected'ı false'a çektiğini doğruluyor (`client.ts:71` yolu).
8. (describe: "ModbusTcpClient (T3)") **"reconnect: cleanup + bekleme sonrası yeniden connect"** — `reconnect` eski socket'i yok edip jitter'li bekleme sonrası yeni socket'le bağlandığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/core/src/messaging/redis.test.ts` (`8 test`)
**Hedef:** `RedisConnection` — node-redis sarmalayıcı; URL kurulumu, idempotent connect/disconnect ve kademeli bozulan ping davranışı.

1. (describe: "RedisConnection (T3)") **"şifresiz config: URL redis://host:port + database opsiyonu"** — constructor şifresiz config'den `redis://host:port` URL'ini ve database seçeneğini üretiyor mu kontrol ediyor.
2. (describe: "RedisConnection (T3)") **"şifreli config: URL şifre taşır"** — constructor şifreli config'den `redis://:s3cret@h:6379` URL'ini üretiyor mu kontrol ediyor.
3. (describe: "RedisConnection (T3)") **"connect yalnızca bir kez client.connect çağırır (idempotent)"** — `connect` tekrar çağrıldığında client.connect'in yalnızca bir kez çağrıldığını ve isReady'nin client.isReady'yi izlediğini doğruluyor.
4. (describe: "RedisConnection (T3)") **"disconnect yalnızca bağlıyken quit çağırır"** — `disconnect` bağlı değilken quit çağırmayıp bağlandıktan sonra bir kez çağırdığını doğruluyor.
5. (describe: "RedisConnection (T3)") **"ping PONG → true"** — `ping` PONG yanıtında true döndürüyor mu kontrol ediyor.
6. (describe: "RedisConnection (T3)") **"ping hatası → false (throw DEĞİL — kademeli bozulma)"** — `ping` hata durumunda throw etmeden false döndürüyor mu kontrol ediyor.
7. (describe: "RedisConnection (T3)") **"connectionConfig yapılandırmayı döner"** — `connectionConfig` host/port/db üçlüsünü geri döndürüyor mu kontrol ediyor.
8. (describe: "RedisConnection (T3)") **"client ham redis client'ı döner"** — `client` metodunun ham RedisClientType örneğini döndürdüğünü doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/core/src/modbus/device.test.ts` (`27 test`)
**Hedef:** `ModbusDevice` — ISP sözleşmeli okuma (register + bitfield birleşik, adres sıralı + paralel gruplama), scale/offset'li yazma, transactional `writeAtomic` (ham register backup + rollback) ve config doğrulaması.

1. (describe: "ModbusDevice.read() ISP sözleşmesi") **"register + bitfield çıktılarını birleşik döner"** — `read()` register telemetrileri ile bitfield çıktılarını tek dizide birleştirip döndürüyor mu kontrol ediyor.
2. (describe: "ModbusDevice.read() ISP sözleşmesi") **"bitfield bit değeri mask ile çıkarılır"** — `read()` 0b101 register'ından BSC Alarm bitini maske ile 1 olarak çıkarıyor mu kontrol ediyor.
3. (describe: "ModbusDevice.read() ISP sözleşmesi") **"bitfield config yoksa yalnızca register telemetrileri döner"** — `read()` bitfieldConfigs yokken yalnızca register telemetrilerini döndürüyor mu kontrol ediyor.
4. (describe: "ModbusDevice.write()") **"scale/offset uygulanmış ham değeri HOLDING register'ına yazar"** — `write()` 465 değerini scale 10/offset 5 ile 46 ham değerine çevirip writeHoldingRegisters'a gönderiyor mu kontrol ediyor.
5. (describe: "ModbusDevice.write()") **"COIL telemetrisini writeCoils ile boolean olarak yazar"** — `write()` COIL tipi telemetriyi 1→true ve 0→false olarak writeCoils'a yönlendiriyor mu kontrol ediyor.
6. (describe: "ModbusDevice.write()") **"boş girdi → transport'a yazma çağrısı YAPILMAZ"** — `write([])` boş dizide transport'a hiçbir yazma çağrısı yapılmadığını doğruluyor.
7. (describe: "ModbusDevice.write()") **"config'te olmayan isim yok sayılır (kademeli bozulma)"** — `write()` config'te olmayan telemetri ismini sessizce atlıyor mu kontrol ediyor.
8. (describe: "ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)") **"başarılı yazımda backup okur, yazar, rollback ÇAĞRILMAZ"** — `writeAtomic` başarılı yolda backup okuması + tek yazma yapıp rollback çağırmadığını doğruluyor.
9. (describe: "ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)") **"ikinci grupta hata → ilk grup ESKİ değerine geri yüklenir + orijinal hata fırlar"** — `writeAtomic` ikinci grup yazımı patlayınca ilk grubu eski değere geri yükleyip orijinal hatayı fırlatıyor mu kontrol ediyor.
10. (describe: "ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)") **"rollback sırasında hata olursa ORİJİNAL hata fırlar (rollback hatası yutulur)"** — `writeAtomic` rollback hatasında orijinal yazma hatasını fırlatıp rollback hatasını yuttuğunu doğruluyor.
11. (describe: "ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)") **"COIL yazımı başarılı + holding başarısız → coil ESKİ değerine döner"** — `writeAtomic` coil başarılıyken holding yazımı patlayınca coil'i eski false değerine geri yazıyor mu kontrol ediyor (COIL backup'u readCoils'tan).
12. (describe: "ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)") **"FLOAT32 değerleri BE register çifti olarak yazılır ve rollback round-trip korunur"** — `writeAtomic` FLOAT32 23.5'i [16828,0] register çifti olarak yazıp rollback'te aynı çifti geri yüklüyor mu kontrol ediyor.
13. (describe: "ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)") **"yalnızca INPUT_REGISTER girdi → no-op (backup dahi okunmaz)"** — `writeAtomic` yalnızca INPUT_REGISTER girdide hiçbir okuma/yazma yapmadığını doğruluyor.
14. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"bitişik adresler priority farkına rağmen tek istekte okunur"** — `read()` okuma yolunda priority'yi yok sayıp adrese göre grupladığını ve bitişik adresleri tek `readHoldingRegisters` çağrısında okuduğunu doğruluyor.
15. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"okuma sırası: HOLDING, INPUT, COIL, DISCRETE, bitfield"** — `read()` sonuç sırasının tip sırasına (HOLDING, INPUT, COIL, DISCRETE, bitfield) uyduğunu doğruluyor.
16. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"coil/discrete okumalarında sıra korunur"** — paralel okumada da coil sonuçlarının girdi sırasıyla döndüğünü doğruluyor.
17. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"tüm sonuçlar aynı poll timestamp'ini taşır"** — bir `read()` çağrısındaki tüm sonuçların TEK timestamp taşıdığını doğruluyor.
18. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"yalnızca bitfield'lı cihazda read() bitfield sonuçlarını döner"** — telemetryList boşken bile `read()`'in bitfield çıktılarını döndürdüğünü doğruluyor (ISP: read = TÜM telemetri).
19. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"aynı isimli girdilerde tag alt küme eşleşmesi doğru olanı seçer"** — aynı isimli iki config girdisinde girdi tag'lerine göre doğru adresin seçildiğini doğruluyor.
20. (describe: "ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)") **"32-bit tam genişlik bitfield doğru çözülür"** — bit 0-31'i kaplayan alanın 0x1234ABCD değerini doğru çözdüğünü doğruluyor (maske wrap regresyonu).
21. (describe: "ModbusDevice config doğrulaması (Faz C)") **"bitfield bit aralığı 31 üstü reddedilir"** — `bitEnd > 31` olan bitfield config'inin constructor'da throw ettiğini doğruluyor.
22. (describe: "ModbusDevice config doğrulaması (Faz C)") **"bitEnd < bitStart reddedilir"** — ters bit aralığının constructor'da throw ettiğini doğruluyor.
23. (describe: "ModbusDevice config doğrulaması (Faz C)") **"bitfield registerType COIL reddedilir"** — COIL bitfield registerType'ının constructor'da throw ettiğini doğruluyor.
24. (describe: "ModbusDevice writeAtomic ham backup (Faz C)") **"COIL backup'u readCoils'tan okunur; aynı adresli HOLDING ile karışmaz"** — aynı adresteki COIL + HOLDING'in ayrı planlanıp COIL backup'ının `readCoils`'tan okunduğunu ve rollback'in `writeCoils [false]` yaptığını doğruluyor.
25. (describe: "ModbusDevice writeAtomic ham backup (Faz C)") **"rollback ham register'ları aynen geri yazar (float kayma yok)"** — scale 0.1'li değerin rollback'te decode/encode olmadan ham [46] olarak geri yazıldığını doğruluyor (float bölüm kayması regresyonu).
26. (describe: "ModbusDevice yazma limiti (Faz C)") **"125 register üstü yazma grubu reddedilir"** — 126 register'lık bitişik yazma grubunun "Batch too large" fırlattığını doğruluyor.
27. (describe: "ModbusDevice bağlantı cooldown (mevcut davranış karakterizasyonu)") **"kopuk bağlantıda reconnect dener; 10 sn içinde ikinci deneme reddedilir"** — kopuk bağlantıda `read()`'in reconnect denediğini, 10 sn cooldown içinde "reconnect cooldown active" fırlatıp süre dolunca tekrar denediğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/core/src/modbus/client-rtu.test.ts` (`7 test`)
**Hedef:** `ModbusRtuClient` — jsmodbus RTU sarmalayıcı; SerialPort yaşam döngüsü, config varsayılanları ve path bağlamlı hata mesajları.

1. (describe: "ModbusRtuClient (T3)") **"config varsayılanlarıyla SerialPort kurulur (connect anında)"** — `connect` SerialPort'u path/baudRate + varsayılan dataBits 8, stopBits 1, parity none ile kuruyor mu kontrol ediyor.
2. (describe: "ModbusRtuClient (T3)") **"connect open eventi ile bağlanır"** — `connect` port "open" olayında isConnected=true döndürüyor mu kontrol ediyor.
3. (describe: "ModbusRtuClient (T3)") **"connect error eventi → 'Modbus RTU connection failed'"** — `connect` port "error" olayında "Modbus RTU connection failed: ..." hatasıyla reddediyor mu kontrol ediyor.
4. (describe: "ModbusRtuClient (T3)") **"connect timeout → port kapatılır + path bağlamlı hata"** — `connect` 3000 ms timeout'ta portu kapatıp path içeren "Modbus RTU connection timeout" fırlatıyor mu kontrol ediyor.
5. (describe: "ModbusRtuClient (T3)") **"bağlı değilken okuma 'Not connected' fırlatır"** — bağlantı yokken readHoldingRegisters ve writeSingleCoil'in "Not connected" fırlattığını doğruluyor.
6. (describe: "ModbusRtuClient (T3)") **"close eventi bağlantıyı düşürür"** — bağlıyken port "close" olayının isConnected'ı false'a çektiğini doğruluyor.
7. (describe: "ModbusRtuClient (T3)") **"bağlıyken port error eventi bağlantıyı düşürür"** — bağlıyken port "error" lifecycle olayının isConnected'ı false'a çektiğini doğruluyor (`client-rtu.ts:87` yolu).

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/core/src/modbus/utils.test.ts` (`1 test`)
**Hedef:** `randomFloat` — [0,1) aralığında kriptografik uniform rasgele sayı (client/rtu reconnect jitter'ı ortak yardımcısı).

1. (describe: "randomFloat") **"[0,1) aralığında döner — 100 örneklem"** — 100 çağrının tamamının [0,1) aralığında kaldığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/core/src/messaging/bullmq-adapter.test.ts` (`18 test`)
**Hedef:** `BullMQAdapter` (JENERİK — JobType/kuyruk adı BİLMEZ) + `BullMQQueue` facade'ı — openQueue lazy/önbellekli kurulum, add/repeatable/executeAndWait/registerWorker/stats/jobCounts/close ve kademeli bozulan sayaçlar. Sistem kuyruğu sözleşmesi `packages/platform/messaging`'e taşındı.

1. (describe: "BullMQAdapter openQueue (jenerik)") **"kuyruk + QueueEvents kurulur; retryOptions işlenir"** — `openQueue(name, { retryOptions })`'ın Queue + QueueEvents kurduğunu ve retryOptions'ı kuyruğa işlediğini doğruluyor.
2. (describe: "BullMQAdapter openQueue (jenerik)") **"aynı ad iki kez açılırsa tek Queue örneği döner (önbellek)"** — lazy önbelleklemenin aynı ad için tek örnek döndürdüğünü doğruluyor.
3. (describe: "BullMQAdapter openQueue (jenerik)") **"QueueEvents failed handler'ı konsola yazılır"** — failed event'inin kuyruk adıyla console.error'a yazıldığını doğruluyor.
4. (describe: "BullMQQueue facade (jenerik)") **"add: jobName + data + jobId/delay/priority iletimi"** — `add`'in tüm opsiyonları bullmq'ya ilettiğini doğruluyor.
5. (describe: "BullMQQueue facade (jenerik)") **"addRepeatable: every + startDate + jobId"** — `addRepeatable`'ın repeat opsiyonlarını ilettiğini doğruluyor.
6. (describe: "BullMQQueue facade (jenerik)") **"addRepeatablePattern: pattern + jobId"** — `addRepeatablePattern`'ın cron pattern ilettiğini doğruluyor.
7. (describe: "BullMQQueue facade (jenerik)") **"executeAndWait: nesne sonuç spread edilir (success:true varsayılan)"** — worker nesnesinin spread edildiğini ve success varsayılanının true olduğunu doğruluyor.
8. (describe: "BullMQQueue facade (jenerik)") **"executeAndWait: worker success:false sonucu EZER"** — worker'ın `success:false`'unun varsayılanı ezdiğini doğruluyor.
9. (describe: "BullMQQueue facade (jenerik)") **"executeAndWait: nesne olmayan sonuç → { success: true }"** — sonuç nesne değilse `{ success: true }` döndürdüğünü doğruluyor.
10. (describe: "BullMQQueue facade (jenerik)") **"executeAndWait: timeout/hatada → { success: false, reason }"** — hatada throw ETMEDEN `{ success: false, reason }` döndürdüğünü doğruluyor.
11. (describe: "BullMQQueue facade (jenerik)") **"registerWorker: doğru ad + concurrency; onCompleted/onFailed bağlanır"** — worker kurulumu + callback'lerin bağlandığını ve processor'ın unknown data ile çağrıldığını doğruluyor.
12. (describe: "BullMQQueue facade (jenerik)") **"worker error eventi konsola yazılır"** — error event'inin kuyruk adıyla loglandığını doğruluyor.
13. (describe: "BullMQQueue facade (jenerik)") **"stats: sayaçlar döner; reddedilen sayaç 0 sayılır"** — allSettled kademeli bozulmasını doğruluyor.
14. (describe: "BullMQQueue facade (jenerik)") **"jobCounts delegate eder"** — `jobCounts`'ın bullmq getJobCounts'a delege ettiğini doğruluyor.
15. (describe: "BullMQAdapter queueStatus/health/close (jenerik)") **"queueStatus: açık tüm kuyrukları kuyruk adıyla döner"** — `queueStatus`'ın tüm facade'ları kuyruk adıyla listelediğini doğruluyor.
16. (describe: "BullMQAdapter queueStatus/health/close (jenerik)") **"health: ping false → false; ping true → true"** — yalnızca redis ping'e dayalı health'i doğruluyor.
17. (describe: "BullMQAdapter queueStatus/health/close (jenerik)") **"health: ping hatası → false (throw yok)"** — ping hatasının throw ETMEDEN false döndürdüğünü doğruluyor.
18. (describe: "BullMQAdapter queueStatus/health/close (jenerik)") **"close: tüm worker + QueueEvents + Queue close'ları çağrılır"** — `close()`'un üç kaynağı da kapattığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor (sistem kuyruğu testleri platform-messaging'e taşındı).

### `packages/result/src/result.test.ts` (`19 test` — core/errors'tan taşındı 2026-09-01 + okVoid)
**Hedef:** `Result<T,E>` — iki durumlu (ok/err), null/undefined reddeden, immutable dönüşümlü fonksiyonel hata taşıyıcı (T0.2 kontratı).

1. (describe: "ok()") **"başarı durumu taşır"** — `Result.ok(42)` isOk=true, isErr=false ve unwrap=42 döndürüyor mu kontrol ediyor.
2. (describe: "ok()") **"null kabul etmez — constructor doğrular"** — `Result.ok(null)`'ın throw ettiğini doğruluyor.
3. (describe: "ok()") **"undefined kabul etmez — constructor doğrular"** — `Result.ok(undefined)`'ın throw ettiğini doğruluyor.
4. (describe: "err()") **"hata durumu taşır"** — `Result.err("modbus_timeout")` isErr=true ve error()="modbus_timeout" döndürüyor mu kontrol ediyor.
5. (describe: "err()") **"undefined hata kabul etmez"** — `Result.err(undefined)`'ın throw ettiğini doğruluyor.
6. (describe: "unwrap / error sınırları") **"err üzerinde unwrap fırlatır"** — hata durumunda `unwrap()`'ın throw ettiğini doğruluyor.
7. (describe: "unwrap / error sınırları") **"ok üzerinde error() fırlatır"** — başarı durumunda `error()`'ın throw ettiğini doğruluyor.
8. (describe: "unwrap / error sınırları") **"unwrapOr hata durumunda fallback döner"** — `unwrapOr(7)` hata durumunda 7 döndürüyor mu kontrol ediyor.
9. (describe: "unwrap / error sınırları") **"unwrapOr başarı durumunda değeri döner"** — `unwrapOr(7)` başarı durumunda kendi değerini döndürüyor mu kontrol ediyor.
10. (describe: "map") **"ok üzerinde dönüşüm uygular"** — `map(v => v*10)` ok(2)'yi ok(20)'ye dönüştürüyor mu kontrol ediyor.
11. (describe: "map") **"err üzerinde dönüşüm uygulamaz — hatayı korur"** — `map` hata durumunda fonksiyonu çağırmayıp hatayı aynen koruyor mu kontrol ediyor.
12. (describe: "andThen") **"ok üzerinde zincirler ve yeni Result döner"** — `andThen` ok(2)'yi koşullu zincirleme ile ok(3)'e dönüştürüyor mu kontrol ediyor.
13. (describe: "andThen") **"err üzerinde zincirlemez — hatayı korur"** — `andThen` hata durumunda fonksiyonu çağırmayıp hatayı koruyor mu kontrol ediyor.
14. (describe: "match") **"ok kolunu çalıştırır"** — `match` başarı durumunda ok kolunu çalıştırıp "ok:3" döndürüyor mu kontrol ediyor.
15. (describe: "match") **"err kolunu çalıştırır"** — `match` hata durumunda err kolunu çalıştırıp "err:x" döndürüyor mu kontrol ediyor.
16. (describe: "immutability") **"map/andThen mevcut nesneyi değiştirmez"** — dönüşümlerin orijinal Result'ı değiştirmediğini doğruluyor.
17. (describe: "immutability") **"her üretim yeni örnektir"** — iki ayrı `Result.ok(1)` çağrısının farklı örnekler döndürdüğünü doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/result/src/domain-error.test.ts` (`14 test` — core/errors'tan taşındı 2026-09-01)
**Hedef:** `DomainError` hiyerarşisi — beklenmeyen hataların immutable tabanı; alt sınıfların kind/retryable sabitlemesi.

1. (describe: "DomainError tabanı") **"tüm alanları korur"** — `DomainError` code/message/kind/retryable/context/cause alanlarının tümünü koruduğunu doğruluyor.
2. (describe: "DomainError tabanı") **"boş message kabul etmez — constructor doğrular"** — boş message ile kurulumun throw ettiğini doğruluyor.
3. (describe: "DomainError tabanı") **"boş code kabul etmez"** — boş code ile kurulumun throw ettiğini doğruluyor.
4. (describe: "DomainError tabanı") **"varsayılanlar: context boş, cause yok"** — opsiyonel alan verilmediğinde context={} ve cause=undefined olduğunu doğruluyor.
5. (describe: "DomainError tabanı") **"Error zincirinin parçasıdır"** — DomainError'ın Error örneği olduğunu doğruluyor.
6. (describe: "alt sınıf kind/retryable sabitlemesi") **"ValidationError → kind=validation, retryable=false"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
7. (describe: "alt sınıf kind/retryable sabitlemesi") **"NotFoundError → kind=not_found, retryable=false"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
8. (describe: "alt sınıf kind/retryable sabitlemesi") **"UnauthorizedError → kind=unauthorized, retryable=false"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
9. (describe: "alt sınıf kind/retryable sabitlemesi") **"ForbiddenError → kind=forbidden, retryable=false"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
10. (describe: "alt sınıf kind/retryable sabitlemesi") **"ConflictError → kind=conflict, retryable=false"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
11. (describe: "alt sınıf kind/retryable sabitlemesi") **"TransientError → kind=transient, retryable=true"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
12. (describe: "alt sınıf kind/retryable sabitlemesi") **"FatalError → kind=fatal, retryable=false"** — alt sınıfın kind/retryable değerlerini sabitlediğini doğruluyor.
13. (describe: "alt sınıf kind/retryable sabitlemesi") **"alt sınıflar context/cause seçeneklerini kabul eder"** — `TransientError`'ın context seçeneğini kabul edip cause'u undefined bıraktığını doğruluyor.
14. (describe: "alt sınıf kind/retryable sabitlemesi") **"kind üzerine yazılamaz — alt sınıf kimliği korunur"** — DomainError tipine atanan alt sınıf örneğinin kendi kind'ını koruduğunu doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/core/src/modbus/decoder.test.ts` (`27 test`)
**Hedef:** `BinaryPayloadDecoder` — register dizisinden byte-order varyantlı ilkel tip çözümleme (uint16/int16/uint32/int32/float32/float64) ve sıralı pozisyon ilerlemesi.

1. (describe: "constructor + byte order") **"stores registers in BIG_ENDIAN order (no transform)"** — BIG_ENDIAN'da register'ların dönüşümsüz sırayla uint16 olarak çözüldüğünü doğruluyor.
2. (describe: "constructor + byte order") **"reverses bytes for LITTLE_ENDIAN"** — LITTLE_ENDIAN'da byte ters çevirmenin uint32=1 sonucunu verdiğini doğruluyor.
3. (describe: "constructor + byte order") **"swaps words for BIG_ENDIAN_SWAP"** — BIG_ENDIAN_SWAP'ta iki 2-baytlık kelimenin yer değiştirip uint32=0x00020001 verdiğini doğruluyor.
4. (describe: "constructor + byte order") **"does 4-byte reverse for LITTLE_ENDIAN_SWAP"** — LITTLE_ENDIAN_SWAP'ta 4 bayt tersinin uint32=0x03040102 verdiğini doğruluyor.
5. (describe: "decodeUint16") **"decodes single unsigned 16-bit"** — `decodeUint16` tek register'ı 42 olarak çözüyor mu kontrol ediyor.
6. (describe: "decodeUint16") **"decodes 0xFFFF as 65535"** — `decodeUint16` 0xFFFF'yi 65535 olarak çözüyor mu kontrol ediyor.
7. (describe: "decodeInt16") **"decodes positive value"** — `decodeInt16` 100 değerini 100 olarak çözüyor mu kontrol ediyor.
8. (describe: "decodeInt16") **"decodes negative value (two's complement)"** — `decodeInt16` 0xFFFF'yi iki tümleyen ile -1 olarak çözüyor mu kontrol ediyor.
9. (describe: "decodeUint32") **"decodes two registers into 32-bit unsigned"** — `decodeUint32` iki register'ı 65536 olarak çözüyor mu kontrol ediyor.
10. (describe: "decodeUint32") **"decodes max value"** — `decodeUint32` [0xFFFF,0xFFFF]'yi 0xFFFFFFFF olarak çözüyor mu kontrol ediyor.
11. (describe: "decodeInt32") **"decodes positive 32-bit"** — `decodeInt32` register çiftini 100 olarak çözüyor mu kontrol ediyor.
12. (describe: "decodeInt32") **"decodes negative 32-bit"** — `decodeInt32` [0xFFFF,0xFFFF]'yi -1 olarak çözüyor mu kontrol ediyor.
13. (describe: "decodeFloat32") **"decodes float 32 from two registers"** — `decodeFloat32` [0x4366,0x8000] çiftini 230.5 olarak çözüyor mu kontrol ediyor.
14. (describe: "decodeFloat32") **"decodes 0.0"** — `decodeFloat32` sıfır register çiftini 0 olarak çözüyor mu kontrol ediyor.
15. (describe: "decodeFloat32") **"decodes negative float"** — `decodeFloat32` [0xBF80,0x0000] çiftini -1.0 olarak çözüyor mu kontrol ediyor.
16. (describe: "decodeFloat64") **"decodes float 64 from four registers"** — `decodeFloat64` dört register'ı 123.456 olarak çözüyor mu kontrol ediyor.
17. (describe: "decodeFloat64") **"decodes 0.0"** — `decodeFloat64` sıfır register dizisini 0 olarak çözüyor mu kontrol ediyor.
18. (describe: "sequential position advancement") **"advances position across multiple decodes"** — ardışık decode çağrılarının pozisyonu ilerletip doğru değerler döndürdüğünü doğruluyor.
19. (describe: "getRegisterCount") **"INT16 requires 1 register(s)"** — `getRegisterCount("INT16")`'nın 1 döndürdüğünü doğruluyor.
20. (describe: "getRegisterCount") **"UINT16 requires 1 register(s)"** — `getRegisterCount("UINT16")`'nın 1 döndürdüğünü doğruluyor.
21. (describe: "getRegisterCount") **"BOOL requires 1 register(s)"** — `getRegisterCount("BOOL")`'un 1 döndürdüğünü doğruluyor.
22. (describe: "getRegisterCount") **"INT32 requires 2 register(s)"** — `getRegisterCount("INT32")`'nın 2 döndürdüğünü doğruluyor.
23. (describe: "getRegisterCount") **"UINT32 requires 2 register(s)"** — `getRegisterCount("UINT32")`'nın 2 döndürdüğünü doğruluyor.
24. (describe: "getRegisterCount") **"FLOAT32 requires 2 register(s)"** — `getRegisterCount("FLOAT32")`'nın 2 döndürdüğünü doğruluyor.
25. (describe: "getRegisterCount") **"FLOAT64 requires 4 register(s)"** — `getRegisterCount("FLOAT64")`'nın 4 döndürdüğünü doğruluyor.
26. (describe: "scale/offset pattern (integration example)") **"applies scale and offset after decoding"** — decode sonrası scale 0.1 uygulamasının 2305→230.5 verdiğini doğruluyor.
27. (describe: "scale/offset pattern (integration example)") **"handles negative offset"** — decode sonrası scale 0.1 + offset -40 uygulamasının 500→10 verdiğini doğruluyor.

[DOSYA NOTU] Dosya başında JSDoc yok; çözücünün sınır durumları (yetersiz register sayısıyla decode, kısmi byte-order bozuk girdi) kapsanmıyor — hata yolu davranışı belirsiz.

### `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.test.ts` (`6 test`)
**Hedef:** `TimescaleDBAdapter` — cihaz başına hypertable'a transaction'lı telemetri yazımı ve Grafana kuralına göre bucket origin hizalaması.

1. (describe: "TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)") **"multi-row INSERT + BEGIN/COMMIT üretir; tablo adı device_ önekli"** — `write` BEGIN→INSERT INTO device_BSC_1→COMMIT sırasını ve 7 kolonlu multi-row INSERT'i üretiyor mu kontrol ediyor.
2. (describe: "TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)") **"boş girdi → havuz işlemi YAPILMAZ"** — `write([])` boş girdide pool/client query çağırmadığını doğruluyor.
3. (describe: "TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)") **"INSERT hatası → ROLLBACK; write hata YUTAR (allSettled — kademeli bozulma, pipeline durmaz)"** — INSERT hatasında ROLLBACK çalıştırılıp write'ın hatayı yutarak çözüldüğünü doğruluyor.
4. (describe: "TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)") **"ensureTableExists tablo DDL'ini yalnızca bir kez çalıştırır (tablo önbelleği)"** — aynı cihaz için iki write'ta CREATE TABLE DDL'inin yalnızca bir kez çalıştığını doğruluyor.
5. (describe: "TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)") **"aggregate: bucket'lar sorgunun from zamanına hizalanır (origin=$1)"** — `aggregate` SQL'inin `time_bucket(..., $1)` ile origin'i from zamanına bağladığını doğruluyor.
6. (describe: "TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)") **"getDownsampledData: bucket'lar from ISO zamanına hizalanır (origin literal)"** — `getDownsampledData` SQL'inin from zamanını literal `::timestamptz` olarak gömdüğünü doğruluyor.

[DOSYA NOTU] Kaynaktaki sıkıştırma/retention policy kurulumu (`add_compression_policy`/`add_retention_policy`), `close()` ve `health()` metodları hiç test edilmemiş — yalnızca write akışı ve bucket origin hizalaması kapsanıyor.

### `packages/shared-utils/src/config/definitions.test.ts` (`7 test`)
**Hedef:** shared-utils config tanımları — log seviyesi/imza anahtarı/dosya yolu/tier tanımlarının ConfigLoader'dan tip güvenli okunması.

1. (describe: "log config definitions (T0.5/T0.6)") **"logLevel varsayılanı info'dur"** — ConfigLoader'dan `log.level`'in varsayılan "info" olarak okunduğunu doğruluyor.
2. (describe: "log config definitions (T0.5/T0.6)") **"logLevel env ile okunur"** — LOG_LEVEL env değişkeninin "error" olarak okunmasını sağlıyor mu kontrol ediyor.
3. (describe: "log config definitions (T0.5/T0.6)") **"logLevel geçersiz değerde fırlatır"** — `logLevel.validate("verbose")`'in throw ettiğini doğruluyor.
4. (describe: "log config definitions (T0.5/T0.6)") **"logSigningKeyPath varsayılanı doludur"** — `logSigningKeyPath.default`'ın "/etc/gd-pms/log-signing.key" olduğunu doğruluyor.
5. (describe: "log config definitions (T0.5/T0.6)") **"logFilePath varsayılanı undefined — tier varsayılanına düşer"** — `logFilePath.default`'ın undefined olduğunu doğruluyor.
6. (describe: "log config definitions (T0.5/T0.6)") **"serviceTier geçersiz değerde fırlatır"** — `serviceTier.validate` "edge" için throw edip "FIELD"ı "field"a normalize ediyor mu kontrol ediyor.
7. (describe: "log config definitions (T0.5/T0.6)") **"tüm tanımlar benzersiz anahtara sahiptir"** — ALL_CONFIG_DEFINITIONS içindeki tüm anahtarların benzersiz olduğunu doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/shared-utils/src/config/loader.test.ts` (`10 test`)
**Hedef:** `ConfigLoader` — kaynak öncelikli (ObjectSource > EnvSource > default) config yükleme, birim normalizasyonu ve redacted/reload/health davranışı.

1. (describe: "ConfigLoader (T3)") **"kaynak önceliği: ObjectSource EnvSource'u ezer"** — aynı anahtarda ObjectSource değerinin env değerine kazandığını doğruluyor.
2. (describe: "ConfigLoader (T3)") **"kaynak yoksa default değer kullanılır"** — hiçbir kaynakta olmayan anahtarın default 8080 ile yüklendiğini doğruluyor.
3. (describe: "ConfigLoader (T3)") **"EnvSource sayısal değerleri number'a çevirir"** — PORT="9090" string'inin number 9090'a çevrildiğini doğruluyor.
4. (describe: "ConfigLoader (T3)") **"validate hatası load()'da anahtar bağlamıyla fırlar"** — geçersiz değerde `load()`'un "limit.count" bağlamıyla throw ettiğini doğruluyor.
5. (describe: "ConfigLoader (T3)") **"get bilinmeyen anahtarda fırlar"** — bilinmeyen anahtar için `get`'in throw ettiğini doğruluyor.
6. (describe: "ConfigLoader (T3)") **"birim normalizasyonu: duration-ms ve bytes"** — "30s"→30000 ve "1KB"→1024 normalizasyonlarını doğruluyor.
7. (describe: "ConfigLoader (T3)") **"geçersiz duration-ms fırlatır"** — "30ss" değerinde load'un duration hatasıyla throw ettiğini doğruluyor.
8. (describe: "ConfigLoader (T3)") **"redacted: secret tanımlar maskelenir, diğerleri görünür"** — `redacted()`'in auth.secret'i "***" yapıp server.port'u açık gösterdiğini doğruluyor.
9. (describe: "ConfigLoader (T3)") **"reload: değişen değer onChange'e bildirilir"** — `reload()`'un değişen anahtarı key/oldValue/newValue ile bildirip unsub sonrası bildirmediğini doğruluyor.
10. (describe: "ConfigLoader (T3)") **"health: erişilebilir kaynaklar healthy döner"** — `health()`'in env ve override kaynakları için healthy=true döndürdüğünü doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/shared-types/src/result.test.ts` (`11 test`)
**Hedef:** `Result` (shared-types) — değer/hata taşıyan basit iki durumlu sonuç tipi (eski fonksiyonel Result'ın hafif versiyonu).

1. (describe: "ok()") **"creates a success result with the value"** — `Result.ok(42)` isSuccess=true, value=42 ve error=undefined döndürüyor mu kontrol ediyor.
2. (describe: "ok()") **"preserves generic type"** — `Result.ok<string>("hello")`'nun string değerini koruduğunu doğruluyor.
3. (describe: "ok()") **"handles object values"** — `Result.ok({a:1,b:"x"})`'in nesne değerini koruduğunu doğruluyor.
4. (describe: "ok()") **"handles undefined value"** — `Result.ok(undefined)`'ın isSuccess=true ile undefined değer taşıdığını doğruluyor.
5. (describe: "ok()") **"handles null value"** — `Result.ok(null)`'ın isSuccess=true ile null değer taşıdığını doğruluyor.
6. (describe: "fail()") **"creates a failure result with error message"** — `Result.fail(...)` isFailure=true, error mesajı ve value=undefined döndürüyor mu kontrol ediyor.
7. (describe: "fail()") **"creates failure with different error messages"** — farklı hata mesajının aynen taşındığını doğruluyor.
8. (describe: "fail()") **"has undefined value on failure"** — hata durumunda value'nun undefined olduğunu doğruluyor.
9. (describe: "isFailure") **"returns true for failed result"** — fail edilmiş sonucun isFailure=true döndürdüğünü doğruluyor.
10. (describe: "isFailure") **"returns false for success result"** — başarılı sonucun isFailure=false döndürdüğünü doğruluyor.
11. (describe: "immutability pattern") **"readonly properties create new Result each time"** — iki ayrı `Result.ok(1)`'in farklı örnekler olup aynı değeri taşıdığını doğruluyor.

[DOSYA NOTU] Dosya başında JSDoc yok; `value`/`error` getter dışında dönüşüm API'si (map/match vb.) yok — kontrat yalnızca taşıyıcı olarak sabitlenmiş.


### `packages/shared-types/src/schemas/alarm.test.ts` (`8 test`)
**Hedef:** Cihaz alarm kuralı şeması — `alarms` üst seviye bölümü ve bitfield şemasından alarmLimit/logType temizliği (Faz 0 eki).

1. (describe: "device alarm kuralı şeması") **"alarms bölümünü kabul eder"** — `deviceConfigFileSchema` alarms listesini kabul edip telemetry/severity ikilisini koruyor mu kontrol ediyor.
2. (describe: "device alarm kuralı şeması") **"geçersiz severity reddedilir"** — `deviceAlarmRuleSchema` "fatal" severity'sini reddediyor mu kontrol ediyor.
3. (describe: "device alarm kuralı şeması") **"telemetry boş olamaz"** — boş telemetry adını reddediyor mu kontrol ediyor.
4. (describe: "device alarm kuralı şeması") **"activeLow opsiyoneldir (varsayılan false)"** — activeLow:true değerinin kabul edilip korunduğunu doğruluyor.
5. (describe: "device alarm kuralı şeması") **"alarms yoksa config yine geçerli (geriye uyumlu)"** — alarms'sız config'in geçerli kalıp alarms undefined döndürdüğünü doğruluyor.
6. (describe: "bitfield alarmLimit/logType temizliği") **"alarmLimit artık şemada yok — strip edilir"** — `bitfieldFieldSchema`'nın alarmLimit anahtarını strip ettiğini doğruluyor.
7. (describe: "bitfield alarmLimit/logType temizliği") **"logType artık şemada yok — strip edilir"** — `bitfieldFieldSchema`'nın logType anahtarını strip ettiğini doğruluyor.
8. (describe: "bitfield alarmLimit/logType temizliği") **"çıktı tipi alarmLimit/logType taşımaz (derleme kontratı)"** — parse çıktısı tipinin iki alanı da compile-time taşımadığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/shared-types/src/schemas/service-config.test.ts` (`15 test`)
**Hedef:** Servis config şemaları — `redisConfigSchema`, `postgresConfigSchema`, `serviceConfigFileSchema` doğrulama kuralları.

1. (describe: "redisConfigSchema") **"accepts minimal config"** — host+port ile minimal config'i kabul ediyor mu kontrol ediyor.
2. (describe: "redisConfigSchema") **"accepts full config"** — password/db dahil tam config'i kabul ediyor mu kontrol ediyor.
3. (describe: "redisConfigSchema") **"rejects empty host"** — boş host'u reddediyor mu kontrol ediyor.
4. (describe: "redisConfigSchema") **"rejects port 0"** — port 0'ı reddediyor mu kontrol ediyor.
5. (describe: "redisConfigSchema") **"rejects port > 65535"** — 65536 portunu reddediyor mu kontrol ediyor.
6. (describe: "redisConfigSchema") **"rejects negative db index"** — db=-1'i reddediyor mu kontrol ediyor.
7. (describe: "postgresConfigSchema") **"accepts valid config"** — geçerli config'in parse edildiğini doğruluyor.
8. (describe: "postgresConfigSchema") **"accepts with optional ssl and maxConnections"** — ssl/maxConnections opsiyonel alanlarını kabul ediyor mu kontrol ediyor.
9. (describe: "postgresConfigSchema") **"rejects empty database"** — boş database adını reddediyor mu kontrol ediyor.
10. (describe: "postgresConfigSchema") **"rejects empty password"** — boş password'u reddediyor mu kontrol ediyor.
11. (describe: "postgresConfigSchema") **"rejects zero maxConnections"** — maxConnections=0'ı reddediyor mu kontrol ediyor.
12. (describe: "serviceConfigFileSchema") **"accepts minimal config"** — yalnızca redis içeren minimal dosya config'ini kabul ediyor mu kontrol ediyor.
13. (describe: "serviceConfigFileSchema") **"accepts full config with optional sections"** — postgresql + poll/worker/management opsiyonel alanlarını kabul ediyor mu kontrol ediyor.
14. (describe: "serviceConfigFileSchema") **"rejects missing redis"** — redis'siz config'i reddediyor mu kontrol ediyor.
15. (describe: "serviceConfigFileSchema") **"rejects invalid redis config"** — geçersiz redis bölümünü reddediyor mu kontrol ediyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/shared-types/src/schemas/server-config.test.ts` (`11 test`)
**Hedef:** Sunucu config şemaları — `authConfigSchema` (JWT secret/expiry kuralları) ve `serverConfigSchema` (host/port kuralları).

1. (describe: "authConfigSchema") **"accepts valid config"** — geçerli jwtSecret + süre alanlarını kabul ediyor mu kontrol ediyor.
2. (describe: "authConfigSchema") **"rejects short jwtSecret (< 16 chars)"** — 16 karakterden kısa secret'ı reddediyor mu kontrol ediyor.
3. (describe: "authConfigSchema") **"rejects zero accessTokenExpirySeconds"** — 0 saniyelik access token süresini reddediyor mu kontrol ediyor.
4. (describe: "authConfigSchema") **"rejects negative refreshTokenExpirySeconds"** — negatif refresh süresini reddediyor mu kontrol ediyor.
5. (describe: "authConfigSchema") **"rejects non-integer expiry"** — ondalıklı süreyi reddediyor mu kontrol ediyor.
6. (describe: "authConfigSchema") **"accepts exactly 16 char jwtSecret"** — tam 16 karakterlik secret'ı kabul ediyor mu kontrol ediyor.
7. (describe: "serverConfigSchema") **"accepts valid config"** — geçerli host+port'u kabul ediyor mu kontrol ediyor.
8. (describe: "serverConfigSchema") **"rejects empty host"** — boş host'u reddediyor mu kontrol ediyor.
9. (describe: "serverConfigSchema") **"rejects port 0"** — port 0'ı reddediyor mu kontrol ediyor.
10. (describe: "serverConfigSchema") **"rejects port > 65535"** — 99999 portunu reddediyor mu kontrol ediyor.
11. (describe: "serverConfigSchema") **"rejects negative port"** — negatif portu reddediyor mu kontrol ediyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/shared-types/src/schemas/validate.test.ts` (`4 test`)
**Hedef:** `validateOrThrow` — zod şemasını etiketli hata mesajıyla doğrulayan yardımcı.

1. (describe: "validateOrThrow") **"returns parsed data on valid input"** — geçerli girdide parse edilmiş veriyi döndürüyor mu kontrol ediyor.
2. (describe: "validateOrThrow") **"throws with label in error message on invalid input"** — geçersiz girdide hata mesajının "User" etiketini içerdiğini doğruluyor.
3. (describe: "validateOrThrow") **"throws with detailed Zod validation errors"** — geçersiz girdide detaylı zod hatasıyla throw ettiğini doğruluyor.
4. (describe: "validateOrThrow") **"handles nested schema errors"** — iç içe şema hatasında "DB" etiketiyle throw ettiğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/shared-types/src/schemas/device-config.test.ts` (`18 test`)
**Hedef:** Cihaz config şemaları — `bitfieldFieldSchema`, `bitfieldConfigSchema` ve `deviceConfigFileSchema` doğrulama kuralları.

1. (describe: "bitfieldFieldSchema") **"accepts valid input"** — geçerli bit alanını kabul ediyor mu kontrol ediyor.
2. (describe: "bitfieldFieldSchema") **"rejects bitStart > bitEnd"** — bitStart'ın bitEnd'den büyük olmasını reddediyor mu kontrol ediyor.
3. (describe: "bitfieldFieldSchema") **"rejects bitStart > 15"** — 16'dan büyük bit indeksini reddediyor mu kontrol ediyor.
4. (describe: "bitfieldFieldSchema") **"rejects empty name"** — boş ismi reddediyor mu kontrol ediyor.
5. (describe: "bitfieldFieldSchema") **"accepts optional fields omitted"** — opsiyonel alanlar olmadan kabul ediyor mu kontrol ediyor.
6. (describe: "bitfieldFieldSchema") **"accepts with all optional fields"** — label0/label1/scale/offset/tags alanlarıyla kabul edip değerleri koruyor mu kontrol ediyor.
7. (describe: "bitfieldFieldSchema") **"logType artık şemada yok (T0.11) — bilinmeyen anahtar strip edilir"** — logType anahtarının strip edildiğini doğruluyor.
8. (describe: "bitfieldConfigSchema") **"accepts valid config"** — geçerli registerAddress/registerType/fields config'ini kabul ediyor mu kontrol ediyor.
9. (describe: "bitfieldConfigSchema") **"rejects empty fields array"** — boş fields dizisini reddediyor mu kontrol ediyor.
10. (describe: "bitfieldConfigSchema") **"rejects invalid registerType"** — COIL registerType'ını reddediyor mu kontrol ediyor.
11. (describe: "deviceConfigFileSchema") **"accepts valid device config without optional fields"** — opsiyonel alansız geçerli cihaz config'ini kabul ediyor mu kontrol ediyor.
12. (describe: "deviceConfigFileSchema") **"accepts config with optional fields"** — pollIntervalMs/simulator/bitfieldConfigs alanlarını kabul ediyor mu kontrol ediyor.
13. (describe: "deviceConfigFileSchema") **"rejects empty deviceId"** — boş deviceId'yi reddediyor mu kontrol ediyor.
14. (describe: "deviceConfigFileSchema") **"rejects empty telemetry array"** — boş telemetri dizisini reddediyor mu kontrol ediyor.
15. (describe: "deviceConfigFileSchema") **"rejects invalid protocol"** — HTTP protokolünü reddediyor mu kontrol ediyor.
16. (describe: "deviceConfigFileSchema") **"rejects invalid transport kind"** — "teleport" transport kind'ını reddediyor mu kontrol ediyor.
17. (describe: "deviceConfigFileSchema") **"accepts simulator transport (tip açık string — kayıt defteri çalışma zamanında doğrular)"** — bilinmeyen simülatör tipleri dahil tüm simulator transport'larını kabul ediyor mu kontrol ediyor.
18. (describe: "deviceConfigFileSchema") **"accepts tcp and rtu transport kinds"** — tcp ve rtu kind'larını kabul ediyor mu kontrol ediyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

## 2. packages/ui · simulators · plugin-sdk · epias · editor

### `packages/ui/src/logging/client-logger.test.ts` (10 test)
**Hedef:** `ClientLogger` + `installGlobalErrorHandlers` — T0.8 kontratı: `log()` olaylarını tamponlayıp tek `transport.send()` ile batch gönderir, başarısızlıkta retry/drop sayaçları tutar ve global pencere hatalarını logger'a bağlar.

1. (describe: "ClientLogger (T0.8)") **"batchSize dolunca tek send ile flush eder"** — `ClientLogger.log` blok davranışı: 2 olayda send yapılmaz, 3. olayda batchSize dolunca tek `transport.send()` çağrısında 3 olay birlikte gider.
2. (describe: "ClientLogger (T0.8)") **"interval geçince flush eder"** — zamanlayıcı davranışı: batchIntervalMs dolunca bekleyen olaylar otomatik tek send ile gönderilir.
3. (describe: "ClientLogger (T0.8)") **"send başarısızsa retry eder — aynı olaylar tekrar gönderilir"** — retry mekanizması: ilk send hata verince batch retry kuyruğuna döner ve sonraki flush'ta aynı olaylar başarıyla yeniden gönderilir.
4. (describe: "ClientLogger (T0.8)") **"maxRetries aşılınca drop + sayaç"** — offline drop davranışı: ardışık denemeler maxRetries'ı aşınca batch atılır, `droppedEvents()` sayacı artar ve send hiç çağrılmaz.
5. (describe: "ClientLogger (T0.8)") **"pending() bekleyen olay sayısını döner"** — `pending()` sorgusu: tampondaki gönderilmemiş olay sayısını doğru döndürür.
6. (describe: "ClientLogger (T0.8)") **"close() kalan batch'i flush eder ve timer durur"** — kapanış davranışı: close() kalan olayları son kez gönderir ve sonrasında interval bir daha flush tetiklemez.
7. (describe: "ClientLogger (T0.8)") **"boş transport kabul edilmez"** — kurucu validasyonu: transport verilmezse `ClientLogger` fırlatır.
8. (describe: "installGlobalErrorHandlers (T0.8)") **"window.onerror olayını logger'a iletir"** — global hata yakalama: `window`'a error eventi dispatch edilince logger'a error eventi yazılır (pending 1 olur).
9. (describe: "installGlobalErrorHandlers (T0.8)") **"unhandledrejection'ı logger'a iletir"** — global hata yakalama: `unhandledrejection` eventi logger'a error eventi olarak iletilir.
10. (describe: "installGlobalErrorHandlers (T0.8)") **"temizleme fonksiyonu listener'ları kaldırır"** — cleanup davranışı: dönen temizleme fonksiyonu çağrıldıktan sonra error eventleri logger'a ulaşmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ui/src/components/LogTerminal/LogTerminal.test.tsx` (5 test)
**Hedef:** `LogTerminal` — alarm kutucuğu sözleşmesi (Faz 0 eki): `alarm` metadata'lı satırlarda "Çözüldü" kutucuğu render edilir; duruma göre boş/disabled/işaretli olur ve tıklama `provider.resolveAlarm(entry)` çağırır.

1. **"alarm satırında kutucuk render edilir"** — alarm metadata'lı log satırı için `alarm-resolve-<alarmAdı>` test-id'li kutucuk DOM'a düşer.
2. **"resolved=false kutucuk boş ve tıklanınca resolveAlarm çağrılır"** — çözülmemiş alarm kutucuğu boş + aktif olur ve tıklanınca `provider.resolveAlarm(entry)` çağrılır.
3. **"resolved=true kutucuk işaretli + disabled + çözen gösterilir"** — çözülmüş alarm kutucuğu işaretli ve devre dışı olur, çözen kullanıcı adı görüntülenir.
4. **"resolveAlarm yoksa kutucuk disabled (saf UI kullanımı)"** — `resolveAlarm` sağlanmadığında kutucuk devre dışı render edilir.
5. **"alarm'sız satırda kutucuk YOKTUR"** — alarm metadata'sı olmayan satırlarda hiç checkbox render edilmez.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ui/src/components/RackCard/RackCard.test.tsx` (5 test)
**Hedef:** `RackCard` — T4 sözleşmesi: rack metriklerini (isim/SoC/SoH/voltaj/güç) gösterir, SoC barı %0-100 kırpılır, `onDetailClick` verilirse "Detay" butonu render edilir ve labels i18n'i dışarıdan alır.

1. **"temel metrikleri gösterir (SoC/SoH/Güç/Voltaj)"** — rack adı, "85.0%", "45.2 kW", "748.0 V", "95.0 %" ve "Cevrimici" etiketi aynı anda görünür.
2. **"SoC % değeri 0-100 arasına kırpılır"** — `soc=140` verildiğinde bar doluluk genişliği inline style'da %100'e kırpılır.
3. **"onDetailClick verilirse Detay butonu render edilir ve çağrılır"** — "Detaya Git" butonuna tıklanınca `onDetailClick` bir kez çağrılır.
4. **"onDetailClick verilmezse buton render edilmez"** — callback yokken Detay butonu DOM'da bulunmaz.
5. **"offline durumda offline etiketi görünür"** — `status="offline"` iken "Cevrimdisi" etiketi render edilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ui/src/colors/tokens.test.ts` (8 test)
**Hedef:** `hexToNumber` + `COLORS` token tablosu — hex string'leri PixiJS 0x sayı formatına çevirir ve token değerlerinin geçerli hex formatında olduğunu doğrular.

1. (describe: "hexToNumber") **"converts hex string to number"** — `#10b981` girişi `0x10b981` sayısına çevrilir.
2. (describe: "hexToNumber") **"handles alpha hex colors"** — `#ff0000` girişi `0xff0000`'e doğru dönüşür.
3. (describe: "hexToNumber") **"handles white"** — `#ffffff` → `0xffffff` dönüşür.
4. (describe: "hexToNumber") **"handles black"** — `#000000` → `0x000000` dönüşür.
5. (describe: "COLORS tokens") **"all status tokens are valid hex"** — success/warning/error/info token'ları 6 haneli hex regex'ine uyar.
6. (describe: "COLORS tokens") **"all background tokens are valid hex"** — bgApp/bgCard/bgHeader token'ları geçerli hex formatındadır.
7. (describe: "COLORS tokens") **"all text tokens are valid hex"** — textPrimary/textWhite/textMuted geçerli hex'tir.
8. (describe: "COLORS tokens") **"no two tokens share the same value for common groups"** — yaygın gruplardaki token çiftleri (success/error, warning/info, bgApp/bgCard) aynı değeri paylaşmaz.

[DOSYA NOTU] 104 token'lık tablonun yalnızca bir alt kümesi (~10 token) doğrulanıyor; kalan token'ların format geçerliliği ve tekillik garantisi kapsam dışı.

### `packages/ui/src/transports/HttpPollingTransport.test.ts` (6 test)
**Hedef:** `HttpPollingTransport` — T2 sözleşmesi: connect anında ilk fetch + periyodik poll yapar, başarılı yanıtları onData'ya iletir, HTTP hatalarında state'i bozmaz (kademeli bozulma) ve token'ı Authorization header'ına koyar.

1. **"connect: ilk fetch + interval kurulur; state connected yayınlanır"** — connect anında ilk fetch atılır, state "connected" yayınlanır ve 5 sn sonra ikinci poll `deviceIds=BSC-1` sorgu parametresiyle yapılır.
2. **"başarılı fetch onData'yı besler (telemetries fallback data)"** — yanıt gövdesinde `telemetries` veya `data` alanı varsa her poll'da onData doğru batch ile çağrılır.
3. **"HTTP 500 → onError; state BOZULMAZ (kademeli bozulma)"** — 500 yanıtında observer'a Error iletilir ama bağlantı state'i "connected" kalır.
4. **"getToken Authorization header olarak eklenir"** — `getToken` dönen token isteklere `Bearer tok-1` header'ı olarak eklenir.
5. **"disconnect: interval durur + state idle"** — disconnect sonrası zaman ilerletilse bile fetch sayısı artmaz ve state "idle" olur.
6. **"subscribe geri dönüşü observer'ı çıkarır"** — unsubscribe edilen observer'a connect sonrası onData ulaşmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ui/src/transports/transport-contract.test.ts` (7 test)
**Hedef:** `ITelemetryTransport` kontratı — herhangi bir implementasyonun sağlaması gereken davranışların referans (passthrough) implementasyon üzerinden doğrulanması.

1. **"starts idle and transitions to connected"** — passthrough transport "idle" başlar ve connect sonrası "connected" olur.
2. **"transitions back to idle on disconnect"** — disconnect sonrası state "idle"a döner.
3. **"notifies observer of connection state changes"** — observer'a connect/disconnect sırasında sırayla ["connected", "idle"] state geçişleri bildirilir.
4. **"unsubscribe stops notifications"** — unsubscribe edilen observer'a state değişikliği bildirimi ulaşmaz.
5. **"onData callback delivers telemetry batches"** — observer kontratının onData callback'i hiç veri gelmediğinde null kalır.
6. **"onError callback receives errors from transport"** — observer kontratının onError callback'i hiç hata gelmediğinde null kalır.
7. **"multiple observers all receive notifications"** — iki observer da connect bildirimini alır.

[DOSYA NOTU] 5. ve 6. maddeler passthrough transport veri/hata üretmediği için davranış değil yalnızca kontrat varlığı doğrular; veri iletim mekanizması bu dosyada iddia edilmez.

### `packages/ui/src/transports/MockTransport.test.ts` (8 test)
**Hedef:** `MockTransport` — metrik tanımlarından intervalMs ritmiyle, min/max aralığında sahte telemetri batch'leri üretir (Storybook/demo/test senaryoları).

1. **"starts in idle state"** — yeni transport "idle" başlar.
2. **"transitions to connected on connect()"** — connect sonrası state "connected" olur.
3. **"generates data for each definition per tick"** — her tick'te tanım başına bir satır üretilir; deviceId ve metrik isimleri doğru set edilir.
4. **"generates values within min/max range"** — 10 tick boyunca üretilen tüm Voltage/Current değerleri tanımlı min/max aralığında kalır.
5. **"stops generating after disconnect"** — disconnect sonrası tick'ler ilerlese de onData bir daha çağrılmaz ve state idle olur.
6. **"unsubscribe stops receiving data"** — unsubscribe edilen observer veri almaz.
7. **"multiple observers all receive data"** — iki observer da aynı tick verilerini alır.
8. **"respects custom intervalMs"** — 500 ms interval'li transport her 500 ms'te bir batch üretir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ui/src/transports/WebSocketTransport.test.ts` (7 test)
**Hedef:** `WebSocketTransport` — T2 sözleşmesi: open'da deviceId başına subscribe mesajı gönderir, initial/telemetry mesajlarını onData'ya iletir, açılış öncesi kapanmada hata verir ve açılış sonrası kopmada üstel backoff ile reconnect eder.

1. **"connect → open: connected + deviceId başına subscribe mesajı"** — open olayında "connected" yayınlanır ve `BSC-1,CB-1` için iki ayrı subscribe mesajı gönderilir.
2. **"token varsa query'ye eklenir"** — `getToken` varsa WS URL'ine `token=tok-1` query parametresi eklenir.
3. **"initial ve telemetry mesajları onData'yı besler"** — `initial` ve `telemetry` tipindeki mesajların her ikisi de onData'ya iletilir.
4. **"malform mesaj onError üretir (bağlantı kopmaz)"** — JSON olmayan mesaj geldiğinde onError çağrılır ama bağlantı korunur.
5. **"açılmadan kapanma → error + rejected; reconnect YOK"** — open olmadan kapanınca state "error" ve "WebSocket connection rejected" hatası iletilir; 60 sn içinde yeni bağlantı açılmaz.
6. **"açıldıktan sonra kapanma → üstel backoff reconnect (tavan 30 sn)"** — open sonrası kapanmada ~3 sn sonra ikinci WS instance'ı açılır (backoff).
7. **"disconnect: cancelled — kapanma sonrası reconnect OLMAZ, state idle"** — disconnect sonrası socket kapanıp 60 sn geçse de yeni bağlantı açılmaz, state "idle" kalır.

[DOSYA NOTU] `onerror` olayı dalı hiç test edilmiyor ve JSDoc'taki backoff tavanının (30 sn) davranışı iddia edilmiyor — yalnızca ilk backoff (~3 sn) doğrulanıyor.

### `packages/ui/src/core/TranslationProvider/TranslationProvider.test.tsx` (5 test)
**Hedef:** `TranslationProvider`/`useTranslation` — T4 sözleşmesi: sözlükten çeviri + `{param}` interpolasyonu, eksik anahtarda anahtarın kendisini döndürme, extraKeys override'ı ve setLocale ile dil değişimi.

1. **"varsayılan dilde çeviri + interpolasyon"** — "hello"→"Merhaba", "greet {name}"→"Selam Kanka" ve locale() "tr" döner.
2. **"eksik anahtar anahtarın kendisini döner (fallback)"** — sözlükte olmayan anahtar için anahtarın kendisi döner.
3. **"extraKeys uygulama anahtarları UI sözlüğünü override eder"** — uygulama sözlüğündeki "shared" anahtarı UI sözlüğünü ezer ("UYGULAMA-ortak").
4. **"setLocale dili değiştirir"** — EN butonuna tıklanınca çeviriler "Hello"ya döner ve locale() "en" olur.
5. **"Provider dışında useTranslation hata fırlatır"** — Provider sarmalamadan Probe render etmek hata fırlatır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ui/src/core/TelemetryGauge/TelemetryGauge.test.tsx` (5 test)
**Hedef:** `TelemetryGauge` — tema sözleşmesi: circular arc ve linear bar dolguları tema paletinden renklenir, açık `color` prop'u temayı ezer, varsayılan tema info'dur.

1. **"circular: success temasında arc, success paletinin mid tonudur"** — %75 dolulukta doluluk arc'ının stroke'u success mid tonuna eşit olur.
2. **"circular: varsayılan tema info'dur (mevcut davranış)"** — tema verilmezse arc info mid tonunu kullanır.
3. **"circular: %80 ve üzeri koyu tonu kullanır"** — %90 dolulukta arc warning temasının dark tonuna geçer.
4. **"linear: varsayılan bar rengi tema mid tonudur"** — linear varyantta BarFill background'ı temp mid tonudur.
5. **"linear: açık color prop'u temayı ezer"** — `color="#123456"` verilince bar rengi tema yerine bu renk olur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/simulators/src/emu/emu.test.ts` (5 test)
**Hedef:** `EmuSimulator` — EMU istasyon simülatörü: coil/register yazımlarıyla istasyon durumu (standby/şarj/deşarj/shutdown) ve PCS iletişim durumu üretilir.

1. **"başlangıçta istasyon açık, hot standby durumu (3)"** — ilk tick sonrası COIL_STATION_ON_OFF=false (ON) ve STATION_STATE=3 okunur.
2. **"negatif setpoint → şarj durumu (4)"** — negatif AC_ACTIVE_POWER_SETPOINT yazılıp 10 tick sonra STATION_STATE=4 olur.
3. **"pozitif setpoint → deşarj durumu (5)"** — pozitif setpoint yazılıp 10 tick sonra STATION_STATE=5 olur.
4. **"istasyon kapanınca shutdown durumu (1) ve güç sıfır"** — OFF coil'i true yapılınca STATION_STATE=1 olur.
5. **"PCS sayısı ve comm durumu word'leri doğru"** — PCS_COUNT=3 ve STATUS_WORD_1+2=0b111 (3 PCS comm) okunur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/simulators/src/cb/cb.test.ts` (14 test)
**Hedef:** `CbSimulator` — kesici simülatörü: coil yazımlarıyla aç/kapa, aşırı akımda trip, reset dizisi ve sıcaklık kayıtlarını simüle eder.

1. (describe: "initial state") **"starts closed and not tripped"** — başlangıçta IS_CLOSED=true ve IS_TRIPPED=false okunur.
2. (describe: "initial state") **"has current flowing when closed"** — kapalıyken akım kaydı 0'dan büyüktür.
3. (describe: "open/close via coils") **"opens when OPEN coil is set true"** — OPEN coil'i true yazılınca IS_CLOSED false olur.
4. (describe: "open/close via coils") **"closes when CLOSE coil is set true after open"** — açıldıktan sonra CLOSE coil'i true yazılınca IS_CLOSED tekrar true olur.
5. (describe: "open/close via coils") **"ignores writeCoil with false value"** — false coil yazımı yok sayılır, kesici kapalı kalır.
6. (describe: "open/close via coils") **"increments operateCount on open and close"** — bir aç+kapa döngüsü operateCount'u 2 artırır.
7. (describe: "trip on overcurrent") **"trips when current exceeds tripThreshold"** — eşik çok düşürülünce kesici trip eder (IS_TRIPPED=true, IS_CLOSED=false, akım 0).
8. (describe: "trip on overcurrent") **"increments tripCount on overcurrent trip"** — trip oluşunca tripCount 1 artar.
9. (describe: "reset") **"handles trip and reset sequence"** — trip sonrası eşik yükseltilip RESET coil'i yazılınca trip kalkar (IS_TRIPPED=false).
10. (describe: "reset") **"increments operateCount on reset"** — reset işlemi operateCount'u 1 artırır.
11. (describe: "reset") **"cannot close while tripped (must reset first)"** — trip durumundayken CLOSE yazılsa da kesici kapalı konuma geçmez.
12. (describe: "temperature") **"reports temperature readings"** — sıcaklık kaydı 0'dan büyük sayısal bir değerdir.
13. (describe: "temperature") **"temperature changes when open"** — açıkken sıcaklık kaydı sayısal okunabilir durumdadır.
14. (describe: "threshold changes") **"updates trip threshold in real-time"** — holding register'a yazılan eşik değeri aynen geri okunur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/simulators/src/bsc/bsc-simulator.test.ts` (5 test)
**Hedef:** `BSCSimulator` — T4 karakterizasyonu: otomatik init sonrası NORMAL duruma geçer, START/DISCHARGE/EMERGENCY komutlarını register'a işler ve deşarjda SOC'nin %0 altına düşmesini engeller.

1. **"otomatik init: 6 tick sonrası NORMAL duruma geçer"** — 7 tick sonrası BSC_STATE=NORMAL okunur.
2. **"START komutu → charge status bitleri (BSC_INFO 30037)"** — START + şarj setpoint'i yazılınca BSC_INFO charge status bitleri 0b01 olur.
3. **"DISCHARGE komutu → discharge status bitleri (BSC_INFO 30037)"** — DISCHARGE + deşarj setpoint'i yazılınca charge status bitleri 0b10 olur.
4. **"EMERGENCY komutu durumu EMERGENCY'ye geçirir"** — EMERGENCY yazılınca BSC_STATE=EMERGENCY olur.
5. **"deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01)"** — %0 SOC ile 50 tick deşarj sonrası tüm rack SOC ham değerleri ≥0 kalır.

[DOSYA NOTU] JSDoc'ta not var: ack davranışı (komut yazımı anında acknowledge=DONE) Vitest (node) ortamında iddia edilmiyor — acknowledge register yazımı bu dosyanın kapsamı dışında.

### `packages/simulators/src/simulator-transport.test.ts` (4 test)
**Hedef:** `SimulatorTransport` — simülatör adapter'ını Modbus transport arayüzüne saran; tick'leri interval ile çalıştırır ve tüm okuma/yazmaları adapter'a devreder.

1. **"connect ticker'ı başlatır, disconnect durdurur"** — connect sonrası 3 sn'de tick 3 kez çağrılır, disconnect sonrası ilerleyen zamanda bir daha çağrılmaz.
2. **"çift connect ticker'ı çoğaltmaz"** — iki kez connect edilse de tick intervali tek kalır (3 sn'de 3 çağrı).
3. **"okuma/yazmaları simulator adapter'ına delege eder"** — register okumaları ve coil/holding yazımları doğru parametrelerle adapter'a iletilir.
4. **"isConnected her zaman true, reconnect no-op"** — `isConnected()` her zaman true döner ve `reconnect()` sorunsuz çözülür.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/simulators/src/pcs/pcs.test.ts` (5 test)
**Hedef:** `PcsSimulator` — PCS simülatörü: on/off coil'i ve setpoint ile şarj/deşarj durum bitleri, 32-bit hi/lo kayıt okumaları ve enerji sayaçları üretilir.

1. **"başlangıçta kapalıdır (coil=1), standby biti set"** — ilk tick sonrası COIL_ON_OFF=true ve STATUS_WORD_1 standby biti (bit5) set olur.
2. **"on + negatif setpoint → şarj durumu (status bit7)"** — ON + negatif setpoint ile 10 tick sonra charge biti (bit7) set, discharge biti (bit8) 0 ve run biti (bit1) set olur.
3. **"pozitif setpoint → deşarj durumu (status bit8)"** — pozitif setpoint ile discharge biti set, charge biti 0 olur.
4. **"32-bit kayıtlar hi/lo kelime olarak okunur (frekans)"** — AC_FREQUENCY hi/lo kelimeleri birleştirilince ~50 Hz okunur.
5. **"şarj sırasında toplam şarj enerjisi artar"** — negatif setpoint'le şarjda TOTAL_CHARGE_ENERGY 0'dan büyük olur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/simulators/src/dc-output/dc-output.test.ts` (10 test)
**Hedef:** `DcOutputSimulator` — DC çıkış simülatörü: coil'lerle on/off, voltajın setpoint'e doğru kayması/boşalması, aşırı gerilim hatası, enerji sayacı ve sıcaklık davranışları.

1. (describe: "initial state") **"has default voltage and discrete inputs"** — başlangıçta isOn/isFault boolean, voltaj sayısal okunur.
2. (describe: "on/off via coils") **"handles coil toggling"** — ON coil'i true yazılınca isOn true, OFF coil'i true yazılınca false olur.
3. (describe: "on/off via coils") **"on/off cycle works"** — aç/kapa döngüsü ikinci kez aynı davranışla doğrulanır.
4. (describe: "voltage and current drift") **"voltage drifts toward setpoint when on"** — 480 setpoint'te 30 tick sonra voltaj 0'dan büyük ve ≤480 kalır.
5. (describe: "voltage and current drift") **"voltage decays when off"** — kapatma sonrası voltaj açık durumdaki değerin altına düşer.
6. (describe: "overvoltage fault") **"triggers fault when voltage exceeds ovThreshold * 10"** — düşük eşikle voltaj limiti aşılınca fault oluştuysa çıkış kapanır (isOn false).
7. (describe: "energy counter") **"accumulates energy when output is on"** — açıkken enerji sayaç kayıtları (hi+lo) ≥0 okunur.
8. (describe: "temperature") **"drifts toward target when on"** — açıkken 30 tick sonra sıcaklık kaydı >0 olur.
9. (describe: "setpoints via holding registers") **"reads back written setpoints"** — yazılan holding register setpoint'leri aynen geri okunur.
10. (describe: "setpoints via holding registers") **"can change setpoints at runtime"** — çalışma sırasında setpoint değiştirilince voltaj >0 kalır.

[DOSYA NOTU] Birçok iddia gevşek (yalnızca tip/aralık kontrolü — ">0", "boolean" vb.); overvoltage testinde fault oluşmazsa iddiasız geçer (if koşullu); akım kaydının drift davranışı ve fault sonrası kurtarma kapsam dışı.

### `packages/simulators/src/hvac/hvac.test.ts` (11 test)
**Hedef:** `HvacSimulator` — HVAC simülatörü: remote on/off, soğutma/ısıtma modları, alarm register'ları, reset, sıcaklık kayması ve fan hızları.

1. (describe: "initial state") **"starts in standby"** — başlangıç status register'ı 1 (STANDBY) okunur.
2. (describe: "initial state") **"has default temperature"** — başlangıç sıcaklığı >0'dır.
3. (describe: "remote on/off") **"turns on when remoteOn is set"** — remote on register'ına 1 yazılınca status 2 (RUNNING) olur.
4. (describe: "remote on/off") **"turns off when remoteOn is cleared"** — remote on 0'a çekilince status tekrar 1 (STANDBY) olur.
5. (describe: "cooling mode") **"cools when temperature is above coolingSetpoint + deadband"** — soğutma setpoint'i çok altına çekilip açılınca kompresör register'ı ≥1 olur.
6. (describe: "heating mode") **"produces heat when remote is on with high setpoint"** — yüksek ısıtma setpoint'inde heater register'ı sayısal okunur.
7. (describe: "alarms") **"has alarm registers that are readable"** — alarm hi/lo register'ları sayısal değer döner.
8. (describe: "reset") **"resets alarm state"** — reset register'ına 1 yazılıp tick sonrası işlem hata fırlatmadan tamamlanır.
9. (describe: "temperature drift") **"changes temperature over time when running"** — çalışırken 10 tick sonrası sıcaklık başlangıçtan farklı olur.
10. (describe: "fan speeds") **"reports fan speeds when running"** — çalışırken iç/dış fan hızları ≥0 okunur.
11. (describe: "fan speeds") **"reports fan speed values"** — iç fan register'ı sayısal değer döner.

[DOSYA NOTU] Reset testi davranış iddiası içermez (yalnızca hata fırlatmama); ısıtma ve fan hızları yalnızca tip kontrolü; alarm register'larının gerçek alarm koşulu üretimi kapsam dışı.

### `packages/plugin-sdk/src/registry.test.ts` (5 test)
**Hedef:** `PluginRegistry` — plugin kaydı/sorgusu, duplicate ve SDK uyumsuzluğu reddi, deactivateAll ve health toplama.

1. **"plugin kaydeder ve sorgular"** — register sonrası `names()`, `find()` ve `registrations()[0].origin` doğru döner, olmayan isim undefined olur.
2. **"ayni isimdeki ikinci kaydi reddeder"** — aynı isimli ikinci kayıt /zaten kayitli/ hatası fırlatır.
3. **"SDK versiyon uyumsuzlugunu reddeder"** — uyumsuz sdkVersion manifest'li plugin /SDK uyumsuzlugu/ hatasıyla reddedilir.
4. **"deactivateAll tum pluginleri deactivate eder ve temizler"** — iki plugin de deactivate olur ve registry boşalır.
5. **"health tum pluginleri toplar"** — `health()` tüm pluginlerin status bilgisini döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/plugin-sdk/src/loader.test.ts` (5 test)
**Hedef:** `PluginLoader` — statik ve dizin kaynaklarından plugin yükleme, eksik dizin toleransı ve isim çakışmasında öncelik kuralı.

1. **"statik kaynaktaki pluginleri kaydeder"** — StaticPluginSource'taki iki plugin registry'e kaydedilir.
2. **"dizin kaynagindan plugin yukler (runtime plugin)"** — geçici dizindeki plugin.json + entry modülü yüklenir, origin `dir:` içerir ve dir yolu doğrudur.
3. **"olmayan dizinde bos doner ve hata firlatmaz"** — var olmayan dizin kaynağı boş registry döndürür, hata fırlatmaz.
4. **"ayni isim statik ve dizin kaynagindan gelirse ilki kazanir"** — aynı isimde çakışınca statik kayıt kazanır, dizin kaydı eklenmez.
5. **"manifest'siz dizin girisini atlar"** — plugin.json'sız dizin girişi sessizce atlanır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/plugin-sdk/src/sdk-version.test.ts` (4 test)
**Hedef:** `SemVerRange` — SDK versiyon aralığı ayrıştırıcısı; aralık içi/dışı versiyon kontrolü ve geçersiz ifadelerde hata.

1. **"aralik icindeki versiyonlari kabul eder"** — `>=1.0.0 <2.0.0` aralığında 1.0.0, 1.5.3, 1.99.99 kabul edilir.
2. **"aralik disindaki versiyonlari reddeder"** — 0.9.9 ve 2.0.0 reddedilir.
3. **"tek kosullu araliklari destekler"** — yalnız alt sınırlı `>=2.1.0` aralığı 2.1.0/3.0.0 kabul, 2.0.9 reddeder.
4. **"gecersiz ifadelerde firlatir"** — boş ifade, `=1.0.0` operatörü ve `>=x.y.z` geçersiz versiyonu ayrı hata mesajlarıyla fırlatır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/plugin-sdk/src/context.test.ts` (4 test)
**Hedef:** `FilePluginStateStore`, `JsonFilePluginConfigSource`, `PluginContextFactory` — dosya tabanlı plugin state/konfig yönetimi ve PluginContext üretimi.

1. (describe: "FilePluginStateStore") **"yazma/okuma/silme turu calisir"** — cursor/count anahtarları yazılır ve okunur, cursor silinir ve count korunur.
2. (describe: "FilePluginStateStore") **"bozuk dosya durumunda bos obje doner"** — bozuk JSON dosyası boş okunur ve sonrasında yazma/okuma çalışmaya devam eder.
3. (describe: "JsonFilePluginConfigSource + PluginContextFactory") **"config dosyasini yukler ve context olusturur"** — plugin JSON konfigü yüklenir, context.config/pluginDir/logger/state doğru set edilir ve state dosyaya yazılır.
4. (describe: "JsonFilePluginConfigSource + PluginContextFactory") **"config dosyasi yoksa bos obje doner"** — konfig dosyası bulunmayan plugin için boş config döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/plugin-sdk/src/http/http-client.test.ts` (7 test)
**Hedef:** `HttpClient` — domain-agnostik fetch sarmalayıcı: baseUrl/header birleşimi, JSON/form gövde üretimi ve 4xx/5xx/network retry politikası.

1. **"getJson — baseUrl ile birlesik URL ve header'lar ile istek atar"** — URL baseUrl ile birleştirilir, default + istek header'ları ve GET metodu doğru kurulur.
2. **"postJson — JSON govde ve Content-Type header'i ekler"** — POST isteğinde gövde JSON string olur ve Content-Type application/json set edilir.
3. **"postForm — form-encoded govde uretir"** — form gövdesi `username=u&password=p` olur ve Content-Type x-www-form-urlencoded set edilir.
4. **"5xx hatasinda yeniden dener, basarili denemeyi dondurur"** — ilk 500 yanıtı sonrası ikinci deneme 200 döner ve sonuç iletilir.
5. **"4xx hatasinda yeniden denemez, HttpError firlatir"** — 401'de tek deneme yapılır ve status'lu HttpError fırlatılır.
6. **"ag hatasinda maxRetries kadar yeniden dener"** — network hatasında maxRetries=2 ile toplam 3 deneme yapılır ve hata fırlatılır.
7. **"HttpError govdeyi ve durumu tasir"** — 400 yanıtında HttpError status ve gövdeyi taşır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/epias-client/src/client.test.ts` (6 test)
**Hedef:** `EpiasClient` + `toEpiasIso` — CAS'ten TGT edinimi, TGT header'lı API istekleri, 401'de bilet yenileme ve EPIAŞ tarih formatı (+03:00).

1. (describe: "EpiasClient") **"fetchJson — once CAS'ten TGT alir, istege TGT header'i ekler"** — ptf çağrısı önce CAS'ten TGT alır, sonra /mcp endpoint'ine TGT header'lı POST atar ve satırları döndürür.
2. (describe: "EpiasClient") **"ptf — tarihler +03:00 formatina cevrilir"** — UTC giriş tarihleri gövdede +03:00 formatına çevrilir (startDate/endDate).
3. (describe: "EpiasClient") **"401 alinirsa bilet gecersiz kilinir ve istek bir kez tekrarlanir"** — API 401 dönünce bilet invalidate edilir, yeni TGT alınıp istek bir kez tekrarlanır.
4. (describe: "EpiasClient") **"ayni client, bilet gecerliyken tek TGT kullanir"** — ardışık iki çağrıda CAS'e yalnızca 1 kez gidilir.
5. (describe: "toEpiasIso") **"UTC tarihi Turkiye saati +03:00 olarak bicimler"** — 10:00Z → 13:00+03:00 biçimlenir.
6. (describe: "toEpiasIso") **"kis aylarinda da sabit +03:00 kullanir"** — Ocak tarihinde de +03:00 sabittir (DST yok).

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/epias-client/src/ticket-store.test.ts` (7 test)
**Hedef:** `EpiasTicketStore` — CAS TGT yaşam döngüsü: dosya önbelleği, TTL yenileme, eşzamanlı throttle ve invalidate.

1. **"ilk istekte CAS'ten bilet alir ve dosyaya yazar"** — ilk ticket() CAS'e tek istek atar ve TGT döner.
2. **"gecerli bilet varken CAS'e tekrar istek atmaz (throttle korumasi)"** — TTL içindeki ikinci çağrı aynı TGT'yi döner, CAS'e gidilmez.
3. **"omru dolan bilet yenilenir"** — TTL (50 ms) dolduktan sonra yeni TGT alınır (2 CAS çağrısı).
4. **"bilet dosyada kalicidir — yeni store ornegi ayni bileti kullanir"** — yeni store örneği dosyadaki TGT'yi kullanır, CAS'e tek istek atılır.
5. **"es zamanli isteklerde tek CAS cagrisi yapilir"** — 3 paralel ticket() tek CAS çağrısıyla aynı TGT'yi döner.
6. **"invalidate sonrasi bilet yeniden alinir"** — invalidate sonrası ticket() yeni TGT alır.
7. **"CAS 201 disinda cevap donerse hata firlatir"** — 401 yanıtında /HTTP 401/ hatası fırlatılır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/plugins/epias-market-prices/src/plugin.test.ts` (7 test)
**Hedef:** `EpiasMarketPricesPlugin` — integration plugin'i: PTF/SMF serilerini EPIAŞ'tan çekip MarketDataPoint'e dönüştürür, cursor state yönetir ve TGT'yi paylaşır.

1. **"manifest ve schedule dondurur"** — activate sonrası manifest adı "epias-market-prices", kind "integration" ve schedule interval 3600000 ms döner.
2. **"fetch — satirlari MarketDataPoint'e cevirir, TGT header ekler ve cursor yazar"** — iki seri çekilir, noktalar doğru seri/değer/timestamp ile üretilir, tüm API çağrılarında TGT header'ı vardır ve lastFetchTo cursor'ı yazılır.
3. **"fetch — pencere verilmezse cursor'dan devam eder"** — state'teki lastFetchTo değeri startDate'e dönüştürülür (+03:00).
4. **"iki fetch ayni TGT'yi kullanir — CAS'e tek istek atilir"** — ardışık iki fetch'te CAS'e 1, API'ye 4 istek atılır.
5. **"gecersiz konfigurasyonda activate firlatir"** — boş username vb. konfigla activate /username/ hatası fırlatır.
6. **"bozuk satirlari sessizce atlar"** — geçersiz tarih ve sayısal olmayan değerli satırlar atlanır, yalnızca geçerli satırlar (her seriden 1) döner.
7. **"activate'ten once fetch firlatir"** — activate edilmemiş plugin'de fetch /activate/ hatası fırlatır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/editor/src/features/editor/device-catalog/catalog.test.ts` (4 test)
**Hedef:** `DEVICE_LIBRARY`/`DEVICE_TYPES`/`getDeviceDefinition` — editor device kataloğunun tutarlılığı.

1. **"5 built-in cihaz tipi sunar"** — DEVICE_TYPES 5 elemanlıdır.
2. **"her DeviceType icin tanim var ve type alani kendi anahtariyla eslesiyor"** — her tipin kütüphane tanımı mevcut ve `def.type` kendi anahtarıyla eşleşir.
3. **"tum tanimlar en az bir protokol ve bir ikon bildirir"** — her tanımda supportedProtocols ve icon boş değildir.
4. **"getDeviceDefinition bilinen tip icin tanim dondurur"** — "pcs" için DEVICE_LIBRARY.pcs referansı döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

## 3. web-service — presentation · application · domain · config

### `services/web-service/src/presentation/routes/session-routes.test.ts` (`6 test` — domain, kalır)
**Hedef:** session-routes (T3.3) — oturum açma/kapama route katmanı sözleşmesi: 302 + Path-scoped cookie, gateway hata eşlemesi ve tünel HTTP/WS yolları.

1. **"POST session → 302 + Path-scoped HttpOnly cookie + open-session"** — `POST /api/fields/:fid/containers/:cid/session` route'u: `openSession` ok döndüğünde 302, `Location: /containers/c-1/ui/` ve `container_session` cookie'si `Path=/containers/c-1/ui; HttpOnly; SameSite=Lax` olarak döner.
2. **"gateway conflict → 409"** — `openSession` `kind:"conflict"` hatası döndüğünde aynı uç 409 verir.
3. **"teknik fieldIds'siz saha için 403"** — kullanıcının `fieldIds` listesi hedef sahayı içermiyorsa oturum açma isteği 403 ile reddedilir.
4. **"DELETE session → açık oturum kapatılır (200); yoksa 404"** — `DELETE` aynı uca açık oturum varken `closeSession(sessionId, "operator-end")` çağırıp 200 döner; oturum yoksa 404 döner.
5. **"tünel HTTP: cookie'siz 401; yasaklı yol 403; geçerli → proxy akışı"** — `/containers/:cid/ui/*`: cookie'siz istek 401, allowlist dışı yol (`/api/auth/login`) 403, geçerli oturumla `startHttpStream` orijinal path'le çağrılır ve proxy gövdesi döner.
6. **"tünel WS: geçersiz oturum 1008 ile kapanır"** — `/containers/:cid/ui/ws/*` ucu geçersiz oturumda WS upgrade'i tamamlanmaz (yalnızca route kaydı doğrulanır, ≥400).

[DOSYA NOTU] WS kapanış kodu 1008 burada yalnızca yorum olarak belgelenir — `app.inject` WS el sıkışmasını tamamlamadığından kapanış kodu gerçekte assert edilmez; `startWsBridge`/`sendWsToContainer`/`closeWs` mock'ları hiçbir testte çağrılmaz.

### `services/web-service/src/presentation/routes/log-routes.test.ts` (`10 test`)
**Hedef:** log-routes (Faz 0 T0.6/T0.8) — log GET/POST/batch ve rate-limit sözleşmesi; altyapı hataları sınıra ulaşır, route içinde console yok.

1. **"GET / → 200 {logs}"** — `GET /api/logs/` repo'dan gelen tek logu `{logs:[...]}` ile 200 döner.
2. **"GET / — sorgu parametreleri repo'ya iletilir"** — `?type=error&limit=10` parametreleri repo `query`'sine `{types:["error"], limit:10}` olarak iletilir.
3. **"POST / → 201"** — type/source/message eksiksiz tek log gövdesi 201 ile kabul edilir.
4. **"POST / — eksik alan → 400 (mevcut davranış korunur)"** — zorunlu alanlar (type/source/message) eksikse 400 döner.
5. (describe: "T0.8 — batch + rate-limit") **"POST / { events: [...] } → 201 {accepted}"** — 2 event'lik batch 201 döner, `{accepted:2}` ve repo `insert` 2 kez çağrılır.
6. (describe: "T0.8 — batch + rate-limit") **"POST / events boşsa 400"** — boş `events:[]` dizisi 400 ile reddedilir.
7. (describe: "T0.8 — batch + rate-limit") **"rate-limit aşılınca 429"** — `maxPerMinute:2` ile aynı IP'den 3. istek 429 döner.
8. (describe: "T0.8 — batch + rate-limit") **"rateLimiter yoksa limitsizdir (geriye uyumlu)"** — limiter enjekte edilmezse 5 ardışık POST hep 201 döner.
9. **"GET / — altyapı hatası sınıra ulaşır, route console.error kullanmaz"** — repo hata fırlatınca 500 döner ve `console.error` hiç çağrılmaz.
10. **"sınır logu altyapı hatasını correlationId ile kaydeder"** — boundary logger hatayı `request_failed` eventCode'u ve `X-Request-Id` başlığından gelen correlationId ile kaydeder.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/command-routes.test.ts` (`12 test`)
**Hedef:** command-routes (Faz 0 T0.6 + T0.11) — komut execute/execute-multi/komut listesi ve zamanlı stop audit sözleşmesi.

1. **"POST /execute — geçersiz gövde → 400 (zod)"** — boş gövde zod parse hatasıyla 400 döner.
2. **"POST /execute — bilinmeyen cihaz → 404"** — `loadDeviceConfig` null döndüğünde 404 verilir.
3. **"POST /execute — zorunlu param eksik → 400"** — `params:{}` ile zorunlu `powerKw` eksik olduğunda 400 döner.
4. **"POST /execute — başarılı → 200"** — geçerli cihaz+komut+param ile 200 döner.
5. **"POST /execute — mq başarısız → 422"** — `executeAndWait` `{success:false}` döndüğünde 422 verilir.
6. **"POST /execute-multi — parallel başarılı → 200"** — 2 komutluk parallel yürütme 200 ve `results` uzunluğu 2 döner.
7. **"POST /execute-multi — onFailure=stop sequential ilk hatada durur"** — sequential modda ilk komut başarısız olunca 422 döner ve yalnızca 1 result üretilir.
8. **"GET /:deviceId/commands — config yoksa boş liste"** — config bulunamayan cihaz için 200 + `{commands:[]}` döner.
9. **"GET /:deviceId/commands → 200 {commands}"** — bilinen cihazın komut listesi 200 ile döner.
10. (describe: "zamanlı stop audit (T0.11)") **"logger varsa zamanlı stop planlaması audit loglanır"** — `_durationSeconds` içeren adımda `command_executed` audit event'i `deviceId` ve `timerSeconds` bağlamıyla loglanır.
11. (describe: "zamanlı stop audit (T0.11)") **"logger yoksa console bilgi çıktısı (geriye uyumlu)"** — logger enjekte edilmezse planlama `console.log` ile bildirilir.
12. (describe: "zamanlı stop audit (T0.11)") **"planlama hatası logger varsa audit command_rejected"** — `addJob` reject olunca `command_rejected` audit event'i loglanır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/health-route.test.ts` (`2 test`)
**Hedef:** health-route (T0.10) — `/health` ucunun TamperLogger drop sayaçlarını yansıtma sözleşmesi.

1. **"sağlıklı logger → status ok + log yansıması"** — drop olmayan logger ile `/health` 200 döner; `status:"ok"`, `timestamp`/`uptime` mevcut ve `log.status:"healthy"` + `dropped.total:0`.
2. **"error drop sonrası → status degraded + sayaç"** — `FailSink` ile bir error log düşürüldükten sonra `/health` `status:"degraded"` ve `log.dropped.error:1` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/auth-routes.test.ts` (`30 test`)
**Hedef:** makeAuthRoutes (Fastify entegrasyonu) — login/refresh/users/session/change-password ve Faz 6 MFA uçlarının sözleşmesi.

1. (describe: "POST /login") **"returns 200 with tokens on valid credentials"** — geçerli kimlik bilgisiyle 200 döner; access/refresh token'lar, `user.username` ve `mfaRequiredRoles:["admin","teknik"]` gövdededir.
2. (describe: "POST /login") **"returns 400 when username is empty"** — boş username 400 + hata gövdesi üretir.
3. (describe: "POST /login") **"returns 400 when password is empty"** — boş password 400 üretir.
4. (describe: "POST /refresh") **"returns 200 with new tokens"** — geçerli refreshToken ile 200 + yeni accessToken döner.
5. (describe: "POST /refresh") **"returns 401 when refresh token is invalid"** — `verifyRefresh`/`findByRefreshToken` boş döndüğünde 401 verilir.
6. (describe: "POST /refresh") **"returns 400 when refreshToken is empty"** — boş refreshToken 400 üretir.
7. (describe: "GET /users") **"returns 200 with user list"** — 1 kullanıcılı liste 200 + `username:"admin"` döner.
8. (describe: "GET /users/:id") **"returns 200 with user by id"** — bilinen id 200 + kullanıcı döner.
9. (describe: "GET /users/:id") **"returns 404 when user not found"** — repo `findById` undefined döndüğünde 404 verilir.
10. (describe: "POST /users") **"returns 201 on successful create"** — `findByUsername` boşken geçerli gövde ile 201 döner.
11. (describe: "POST /users") **"returns 400 when role is invalid"** — `role:"superadmin"` zod doğrulamasından 400 ile geçemez.
12. (describe: "POST /users") **"2026-08-30: developer rolü GEÇERLİDİR (201)"** — `role:"developer"` kullanıcı oluşturmada 201 ile kabul edilir.
13. (describe: "POST /users") **"returns 400 when password is too short"** — 2 karakterlik şifre 400 üretir.
14. (describe: "DELETE /users/:id") **"returns 200 on successful delete"** — DELETE ucu kayıtlıdır ve auth akışı dışında yapı kontrolü `≥200` ile geçer (yalnızca route yapısı doğrulanır).
15. (describe: "POST /logout") **"route is registered"** — logout ucu kayıtlıdır; tam auth akışı başka yerde birim-test edildiğinden yalnızca `≥200` beklenir.
16. (describe: "POST /change-password (T1.6)") **"geçerli istek → 200 + yeni token'lar"** — doğru eski şifre + yeterli yeni şifre 200 döner; yeni accessToken ve `user.mustChangePassword:false` gövdededir.
17. (describe: "POST /change-password (T1.6)") **"kısa yeni şifre → 400 (zod)"** — `"kisa"` yeni şifre zod ile 400'e takılır.
18. (describe: "POST /change-password (T1.6)") **"yanlış eski şifre → 400"** — `hasher.verify` false döndüğünde 400 verilir.
19. (describe: "GET /session (T4.4)") **"kimlik çözülmüşse kullanıcı + tunnel bayrağı döner (cookie yok → false)"** — `request.user` bağlıyken 200 döner; gövde `{user, tunnel:false}`.
20. (describe: "GET /session (T4.4)") **"container_session cookie'si varsa tunnel true"** — `container_session=xyz` cookie'si varsa `tunnel:true` döner.
21. (describe: "GET /session (T4.4)") **"kimlik çözülmemişse 401"** — `request.user` bağlı değilken 401 verilir.
22. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /login/mfa — başarılı akışta 200 + token döner"** — `mfaLoginUC.execute` ok döndüğünde 200 verilir ve `{mfaToken, code}` ile çağrılır.
23. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /login/mfa — use case fail → 401"** — use case `"Gecersiz dogrulama kodu"` döndüğünde 401 + hata mesajı verilir.
24. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /login/mfa — T1.6: TOTP deneme kilidi → 429"** — use case `"MFA dogrulamasi gecici kilitli"` döndüğünde 429 verilir.
25. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /login/mfa — bozuk gövde → 400"** — kısa `mfaToken` zod ile 400'e takılır.
26. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /mfa/enroll — 200 + secret/uri döner"** — enroll ucundan 200 + `secret:"S"` döner.
27. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /mfa/confirm — 200 + kurtarma kodları döner"** — confirm 200 + `recoveryCodes:["A-1"]` döner.
28. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /mfa/reset — admin değilse 403; admin ise 200"** — test hook'u admin bağladığından 200 döner ve `reset("u-2")` çağrılır (403 kolu yalnızca başlıkta iddia edilir).
29. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"POST /mfa/reset — userId yoksa 400"** — boş gövde 400 üretir.
30. (describe: "Auth Routes — Faz 6 T6.1 (MFA uçları)") **"T6.6: login kilitli hesap → 429"** — `LoginUseCase.execute` `"Hesap gecici kilitli"` döndüğünde `/login` 429 verir.

[DOSYA NOTU] "POST /mfa/reset — admin değilse 403" kolunun 403 senaryosu gerçekte çalıştırılmaz (test hook'u her zaman admin bağlar, başlıktaki 403 iddiası test gövdesinde yok); DELETE /users ve POST /logout yalnızca route kaydını doğrular, tam auth akışını değil.

### `services/web-service/src/presentation/routes/data-routes.test.ts` (`13 test`)
**Hedef:** data-routes (Faz 0 T0.6) — karakterizasyon + DomainError propagasyonu; sınır tek log noktasıdır.

1. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /devices → 200 {devices}"** — cihaz listesi 200 + 1 elemanlı `devices` dizisi döner.
2. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /devices — hata → 500 genel mesaj"** — `listDevices` reject olunca 500 + `"Internal server error"` döner.
3. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/latest → 200 {telemetries}"** — son telemetri 200 + 1 elemanlı `telemetries` döner.
4. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/range — from/to yoksa 400"** — tarih parametresi eksik istek 400 döner.
5. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/range → 200 {telemetries}"** — geçerli from/to ile 200 döner.
6. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/downsampled — from/to yoksa 400"** — eksik parametreyle downsampled 400 döner.
7. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/aggregate — fn geçersizse 400"** — `fn=MEDIAN` geçersiz fonksiyon 400 döner.
8. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/aggregate → 200 {buckets}"** — geçerli `fn=AVG&interval=1 hour` ile 200 + `buckets` döner.
9. (describe: "data-routes karakterizasyon (mevcut davranış)") **"GET /:deviceId/aggregate — hata → 500"** — `aggregate` reject olunca 500 döner.
10. (describe: "data-routes T0.6 sözleşmesi (DomainError propagasyonu)") **"geçersiz tags JSON → ValidationError → 400 (önceki davranış: 500)"** — `tags={bozuk` geçersiz JSON 400 + `code:"invalid_tags"` üretir.
11. (describe: "data-routes T0.6 sözleşmesi (DomainError propagasyonu)") **"geçerli tags JSON ayrıştırılır ve sorguya iletilir"** — `tags={"rack_id":"r1"}` sorguya `{rack_id:"r1"}` nesnesi olarak iletilir.
12. (describe: "data-routes T0.6 sözleşmesi (DomainError propagasyonu)") **"route içinde console hata logu yoktur — altyapı hatası sınıra ulaşır"** — DB hatası 500 döner ve `console.error` çağrılmaz.
13. (describe: "data-routes T0.6 sözleşmesi (DomainError propagasyonu)") **"sınır logu altyapı hatasını request_failed olarak kaydeder"** — boundary logger hatayı 1 kez `request_failed` + `corr-9` correlationId ile kaydeder.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/unified-routes.test.ts` (`17 test`)
**Hedef:** unified-routes (Faz 0 T0.6) — birleşik telemetri/timeseries/proje uçları; `Promise.allSettled` kısmi başarı korunur.

1. **"GET /telemetry/latest → 200 {telemetries}"** — en son telemetriler 200 + 1 eleman döner.
2. **"GET /telemetry/latest — kısmi başarı: cihaz hatası warn + boş sonuç (allSettled korunur)"** — `getLatestN` reject olunca 200 + boş `telemetries:[]` döner ve `console.warn` çağrılır.
3. **"GET /telemetry/downsampled — from/to yoksa 400"** — eksik parametre 400 döner.
4. **"GET /telemetry/downsampled → 200"** — geçerli from/to ile 200 döner.
5. **"GET /telemetry/:deviceId → 200 {deviceId, interval, dataPointCount, data}"** — cihaz telemetrisi `deviceId:"bsc-1"` ve `data:[{name:"Voltage"}]` ile döner.
6. **"GET /devices/:deviceId/telemetry-config — config yoksa 404"** — `loadDeviceConfig` null iken 404 verilir.
7. **"GET /devices/:deviceId/telemetry-config → 200"** — bilinen cihaz için 200 + `deviceId` döner.
8. **"GET /timeseries/hypertables → 200 {hypertables}"** — hypertable listesi 200 döner.
9. **"GET /timeseries/hypertables/:name → 200"** — `executeRaw` boş satır döndürse bile 200 verilir.
10. **"GET /timeseries/materialized-views → 200"** — view listesi 200 döner.
11. **"POST /timeseries/materialized-views — hypertable yoksa 400"** — boş gövde 400 üretir.
12. **"POST /timeseries/materialized-views → 200"** — `{hypertable:"device_bsc_1"}` gövdesiyle 200 döner.
13. **"GET /projects → 200 {projects}"** — proje listesi 200 + 1 eleman döner.
14. **"POST /projects → 201 {id}"** — geçerli gövdeyle proje oluşturma 201 döner.
15. **"PUT /projects/:id → 200"** — proje güncelleme 200 döner.
16. **"DELETE /projects/:id → 200 {success}"** — proje silme 200 döner.
17. **"altyapı hatası sınıra ulaşır — console.error yok, 500"** — `executeRaw` reject olunca 500 + genel mesaj döner ve `console.error` çağrılmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/admin-routes.test.ts` (`8 test`)
**Hedef:** admin-routes (Faz 0 T0.6 karakterizasyon) — saha yönetim uçlarının mevcut davranışının sabitlenmesi (try/catch'siz tasarım).

1. **"GET / → 200 liste"** — saha listesi 200 + 1 eleman döner.
2. **"GET /:id — yoksa 404"** — `field` undefined döndüğünde 404 verilir.
3. **"POST / → 201"** — saha oluşturma 201 döner.
4. **"PUT /:id — yoksa 404"** — `field` undefined döndüğünde güncelleme 404 verir.
5. **"PUT /:id — updateField Field not found → 404"** — `updateField` `"Field not found"` fırlattığında 404 döner.
6. **"PUT /:id — beklenmeyen hata sınıra yayılır (rethrow)"** — `updateField` genel hata fırlattığında 500 döner.
7. **"DELETE /:id → 200 {success}"** — saha silme 200 döner.
8. **"GET /:id/summary — saha API erişilemezse 502"** — `fetch` reject olunca 502 verilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/field-routes.test.ts` (`15 test`)
**Hedef:** field-routes (KARAKTERİZASYON — Faz 1 T1.2/T1.3 öncesi mevcut davranış) — saha veri uçları, erişim kontrolü ve konteyner register.

1. **"T1.3: boş fieldIds'li teknik /:fieldId/containers erişEMEZ (403)"** — `fieldIds:[]` teknik kullanıcı saha konteyner listesine 403 alır.
2. **"GET /:fieldId/summary → 200 yapı"** — boss rolüyle saha özeti 200 + 1 konteyner döner.
3. **"GET /:fieldId/containers → 200 + connectionStatus"** — admin rolüyle konteyner listesi 200 döner ve `connectionStatus:"idle"` içerir.
4. **"T2.4: containers → gerçek lastSeenAt + stale durumu"** — `connectionStatus:"stale"` + `lastSeenAt` verildiğinde yanıtta ISO tarih ve `"stale"` durumu yer alır.
5. **"T2.4: containers → lastSeenAt yoksa alan yok"** — `lastSeenAt` undefined iken yanıttaki konteynerde `lastSeenAt` alanı bulunmaz.
6. **"T2.4: summary → gerçek lastSeenAt + stale ≠ connected"** — stale konteyner özette `connected:false` + ISO `lastSeenAt` ile yer alır.
7. **"GET /:fieldId/telemetry/latest → 200"** — saha son telemetrisi 200 döner.
8. **"GET /:fieldId/telemetry/downsampled — proxy yoksa {} (kademeli)"** — `containerProxy` enjekte edilmezse 200 + boş nesne döner.
9. **"2026-08-28: saha registry uçları KALDIRILDI — POST/PUT/DELETE 404"** — saha mutasyon uçlarının üçü de 404 döner.
10. **"2026-08-28: saha listesi ucu KALDIRILDI — GET / 404"** — `GET /api/fields/` 404 döner.
11. **"T1.2: register endpoint'i admin için 201 — yalnızca hash saklanır"** — 32 karakterlik token ile 201 döner; INSERT SQL'de token ve `container_url` bulunmaz.
12. **"T1.2: kısa token → 400"** — `"kisa"` token zod ile 400'e takılır.
13. **"2026-08-30: payload'daki containerUrl YOK SAYILIR — 201 + DB'ye yazılmaz"** — `containerUrl:"file:///etc/passwd"` gönderilse bile 201 döner ve INSERT `container_url` içermez.
14. **"T1.2: teknik → 403"** — teknik rol register isteğinde 403 alır.
15. **"T1.2: bilinmeyen saha → 404"** — `queryOne` sahayı bulamazsa 404 verilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/status-route.test.ts` (`3 test`)
**Hedef:** status-route (T2.2) — `GET /api/status` FieldConnector durum yansıması sözleşmesi.

1. **"bağlı connector → fieldConnected true + state + heartbeat"** — connector bağlıyken `{fieldConnected:true, state:"connected", lastHeartbeatAt:<ISO>}` döner.
2. **"heartbeat hiç atılmadıysa lastHeartbeatAt yoktur"** — `backoff` durumunda `fieldConnected:false` döner ve `lastHeartbeatAt` alanı yoktur.
3. **"connector yoksa kapalı durum bildirir"** — `fieldConnector` enjekte edilmezse `{fieldConnected:false, state:"offline"}` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/device-routes.test.ts` (`2 test`)
**Hedef:** device-routes (T0.6 + Faz 5.1 B3) — cihaz listesi ucu; DB hatasında kademeli bozulma.

1. **"GET /devices → 200 {devices}"** — cihaz listesi 200 + 1 eleman döner.
2. **"DB hatası → 200 {devices: []} (Faz 5.1 B3 — kademeli bozulma)"** — `query` reject olunca 500 yerine 200 + boş `devices:[]` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/routes/alarm-routes.test.ts` (`7 test`)
**Hedef:** alarm-routes (Faz 0 eki) — alarm listeleme ve çözme ucu; audit fail-closed.

1. **"GET /alarms — aktif + kapananlar birleşik döner"** — aktif ve kapanan alarmlar birleşik 2 elemanlı listede döner; ilk eleman aktif (`resolved:false`).
2. **"POST /alarms/resolve — teknik: audit log + DB güncellemesi"** — teknik rol 200 alır; `alarm_resolved` audit'i `resolvedBy:"teknikci"` bağlamıyla loglanır ve `resolved = TRUE` güncellemesi `[deviceId, alarmName, kullanıcı]` parametreleriyle çalışır.
3. **"POST /alarms/resolve — admin de çözebilir"** — admin rol 200 alır.
4. **"POST /alarms/resolve — guest 403"** — guest rol 403 ile reddedilir.
5. **"POST /alarms/resolve — aktif olmayan alarm 409"** — `queryOne` alarmı bulamazsa 409 verilir.
6. **"POST /alarms/resolve — audit log fail-closed: yazılamazsa 500 + DB'ye GİDİLMEZ"** — logger reject olunca 500 döner ve DB güncellemesi hiç çağrılmaz.
7. **"POST /alarms/resolve — eksik gövde 400"** — boş gövde zod ile 400'e takılır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/middleware/rbac.test.ts` (`38 test`)
**Hedef:** createRbacHook (KARAKTERİZASYON + Faz 3 + Faz 6 T6.1) — rota-rol izin matrisi, oturum auth'u ve MFA enrollment enforcement sözleşmesi.

1. (describe: "rbac karakterizasyon") **"PUBLIC_PREFIXES JWT'siz geçer"** — `/health` public önekinde token olmadan 200 döner.
2. (describe: "rbac karakterizasyon") **"Bearer yoksa 401"** — korumalı `/api/data/x` header'sız 401 döner.
3. (describe: "rbac karakterizasyon") **"geçersiz token → 401"** — `verifyAccess` hata fırlatınca 401 verilir.
4. (describe: "rbac karakterizasyon") **"/api/auth/users yalnızca admin'e açık — teknik 403"** — teknik rol kullanıcı yönetimi ucunda 403 alır.
5. (describe: "rbac karakterizasyon") **"/api/auth/users admin için açık"** — admin rol 200 alır.
6. (describe: "rbac karakterizasyon") **"2026-08-30: /api/fields guest için AÇIK (saha dashboard salt-okunur)"** — guest rol saha verilerinde 200 alır.
7. (describe: "rbac karakterizasyon") **"2026-08-30: /api/fields developer için AÇIK"** — developer rol 200 alır.
8. (describe: "rbac karakterizasyon") **"/api/fields boss için açık"** — boss rol 200 alır.
9. (describe: "rbac karakterizasyon") **"/api/admin/fields izin satırı kaldırıldı (2026-08-28) — rbac serbest, uç yok (404)"** — izin satırı silindiği için rbac 403 üretmez, test app'te rota da olmadığından 404 döner.
10. (describe: "rbac karakterizasyon") **"/api/data/ beş role de açık (guest + developer dahil)"** — admin/teknik/guest/boss/developer rollerinin hepsi 200 alır.
11. (describe: "rbac karakterizasyon") **"2026-08-30: developer /api/commands için KAPALI (403) — salt-okunur rol"** — developer komut ucunda 403 alır.
12. (describe: "rbac karakterizasyon") **"2026-08-30: developer /api/auth/users için KAPALI (403)"** — developer kullanıcı yönetiminde 403 alır.
13. (describe: "rbac karakterizasyon") **"T1.4: /api/commands guest için KAPALI (403) — delik kapatıldı"** — guest komut ucunda 403 alır.
14. (describe: "rbac karakterizasyon") **"T1.4: /api/commands teknik için AÇIK"** — teknik rol 200 alır.
15. (describe: "rbac karakterizasyon") **"T1.4: /api/commands admin için AÇIK"** — admin rol 200 alır.
16. (describe: "rbac karakterizasyon") **"2026-08-28: /api/fields mutasyon izin satırı kaldırıldı — rbac 403 ÜRETMEZ (uçlar kaldırıldı, gerçek sistemde 404)"** — teknik ve admin için `POST /api/fields` rbac katmanında serbesttir (test app'te 200).
17. (describe: "rbac karakterizasyon") **"T1.4: /api/fields GET teknik için AÇIK (okuma korunur)"** — teknik rol 200 alır.
18. (describe: "rbac karakterizasyon") **"izinsiz yol (tabloda yok) doğrulanmış kullanıcıya açıktır"** — matriste olmayan `/api/unified/x` doğrulanmış guest'e 200 döner.
19. (describe: "rbac Faz 3 (oturum auth + tünel yolları)") **"geçerli container_session cookie'si Bearer'sız erişir"** — `sessionAuthenticator` kullanıcı döndürdüğünde cookie ile Bearer'sız 200 alınır.
20. (describe: "rbac Faz 3") **"geçersiz oturum cookie'si → 401 (fail-closed)"** — authenticator undefined döndüğünde 401 verilir.
21. (describe: "rbac Faz 3") **"oturum kullanıcısına rol izinleri uygulanır (guest → komut 403)"** — session kullanıcısı guest iken `/api/commands` 403 döner.
22. (describe: "rbac Faz 3") **"oturum kullanıcısında mustChangePassword uygulanmaz"** — bayrak true olsa bile oturum kullanıcısı veri ucuna 200 ile girer.
23. (describe: "rbac Faz 3") **"2026-08-30: guest mustChangePassword enforcement'ından MUAFTIR (otomatik misafir girişi)"** — Bearer'lı guest bayrak true olsa da 200 alır.
24. (describe: "rbac Faz 3") **"mustChangePassword olan teknik 403 alır (T1.6 korunur)"** — teknik 403 + `"Sifre degisimi gerekli"` hatası alır.
25. (describe: "rbac Faz 3") **"cookie yoksa Bearer akışı korunur"** — cookie'siz istek Bearer ile 200 döner.
26. (describe: "rbac Faz 3") **"T3.3: /api/fields/ POST (session) teknik'e açık; 2026-08-30: guest/developer da AÇIK (birebir tünel eşlemesi)"** — session ucu üç rolde de 200; ayrıca `POST /api/fields` mutasyon satırı kaldırıldığı için 403 üretmez.
27. (describe: "rbac Faz 3") **"tünel yolları PUBLIC'dir (cookie auth route katmanında)"** — `/containers/c-1/ui/` JWT'siz 200 döner.
28. (describe: "rbac Faz 6 T6.1 (MFA enrollment enforcement)") **"MFA kaydı olmayan admin veri uçlarına 403 alır (MFA kaydi gerekli)"** — zorunlu rolde MFA'sız kullanıcı 403 + `"MFA kaydi gerekli"` alır.
29. (describe: "rbac Faz 6 T6.1") **"MFA allowlist yolları (enroll/confirm/logout/session) açık kalır"** — dört allowlist ucu MFA'sız admin için de 200 döner.
30. (describe: "rbac Faz 6 T6.1") **"MFA kayıtlı admin (mfaEnabled=true) veri uçlarına girer"** — `mfaEnabled:true` kullanıcı 200 alır.
31. (describe: "rbac Faz 6 T6.1") **"zorunlu liste dışındaki roller etkilenmez (boss/guest)"** — boss ve guest MFA zorunluluğu olmadan 200 alır.
32. (describe: "rbac Faz 6 T6.1") **"mfaRequiredRoles boşsa enforcement KAPALI (container tier davranışı)"** — boş liste ile MFA'sız admin 200 alır.
33. (describe: "rbac sınır durumları (2026-08-30 — T1.4)") **"session kullanıcısında MFA enforcement UYGULANMAZ (pinleme — regresyon koruması)"** — cookie'lı oturum kullanıcısı MFA zorunlu listede olsa da 200 alır.
34. (describe: "rbac sınır durumları") **"PUBLIC_PREFIX segment sınırı: benzer ama farklı yollar JWT'siz 401 döner"** — `/healthz`, `/api/auth/loginX`, `/containersXYZ`, `/ws/telemetry-x` benzer yollar public sayılmaz, 401 döner.
35. (describe: "rbac sınır durumları") **"PUBLIC yollar query param'la da geçer (401 DEĞİL — rota yoksa 404)"** — `/api/auth/login?next=...` public kalır, test app'te rota yoksa 404 döner.
36. (describe: "rbac sınır durumları") **"mustChangePassword + MFA zorunluluğu birlikte: ÖNCE şifre değişimi 403 döner (öncelik pinleme)"** — iki koşul birlikteyken `"Sifre degisimi gerekli"` 403'ü önceliklidir.
37. (describe: "rbac sınır durumları") **"session yolu method eşleşmezse rbac serbesttir (uç yoksa 404 — pinleme)"** — `GET /api/fields/.../session` matristeki POST satırıyla eşleşmez, rbac serbest bırakır ve rota yoksa 404 döner.
38. (describe: "rbac sınır durumları") **"developer MFA zorunlu listesinde değilse enforcement'dan etkilenmez"** — developer zorunlu liste dışında 200 alır.

[DOSYA NOTU] Yok — kapsam tam görünüyor (security-kritik modül; branch kapısı gereği geniş).

### `services/web-service/src/presentation/middleware/error-handler.test.ts` (`13 test`)
**Hedef:** createErrorHandler (T0.6) — sınırın tek log noktası, DomainError→HTTP eşlemesi ve gizlilik sözleşmesi.

1. (describe: "DomainError eşlemesi") **"ValidationError → 400"** — ValidationError 400 + `code`/`error` gövdesi üretir.
2. (describe: "DomainError eşlemesi") **"NotFoundError → 404"** — NotFoundError 404 + `code`/`error` gövdesi üretir.
3. (describe: "DomainError eşlemesi") **"UnauthorizedError → 401"** — UnauthorizedError 401 + `code`/`error` gövdesi üretir.
4. (describe: "DomainError eşlemesi") **"ForbiddenError → 403"** — ForbiddenError 403 + `code`/`error` gövdesi üretir.
5. (describe: "DomainError eşlemesi") **"ConflictError → 409"** — ConflictError 409 + `code`/`error` gövdesi üretir.
6. (describe: "DomainError eşlemesi") **"TransientError → 503"** — TransientError 503 + `code`/`error` gövdesi üretir.
7. (describe: "DomainError eşlemesi") **"FatalError → 500"** — FatalError 500 + `code`/`error` gövdesi üretir.
8. **"ZodError → 400 (mevcut davranış korunur)"** — zod parse hatası 400 döner.
9. **"bilinmeyen hata → 500 genel mesaj — stack sızmaz"** — ham Error 500 + `"Internal server error"` üretir; hata mesajındaki sırlar yanıta sızmaz.
10. (describe: "sınır logu — bir kez") **"beklenen hata app kanalında warn ile loglanır"** — ValidationError 1 kez `app`/`warn`/`request_rejected` olarak, başlıktaki correlationId ve `code` bağlamıyla loglanır.
11. (describe: "sınır logu — bir kez") **"unauthorized güvenlik kanalında loglanır"** — UnauthorizedError `security` kategorisinde `request_rejected` olarak loglanır.
12. (describe: "sınır logu — bir kez") **"beklenmeyen hata app kanalında error ile loglanır"** — TransientError `app`/`error`/`request_failed` + `code` bağlamıyla loglanır.
13. (describe: "sınır logu — bir kez") **"log() hatası istemciye yansımaz (yanıt yine de gönderilir)"** — logger reject olsa bile 500 yanıtı üretilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/middleware/log-rate-limiter.test.ts` (`4 test`)
**Hedef:** LogRateLimiter (T0.8) — anahtar başına dakikalık limit sözleşmesi.

1. **"limit altında izin verir"** — `maxPerMinute:3` ile aynı anahtar 3 kez `true` alır.
2. **"limit aşılınca reddeder"** — `maxPerMinute:2` limitinde 3. `allow` `false` döner.
3. **"farklı anahtarlar birbirini etkilemez"** — `ip-1` limitini doldurunca `ip-2` yine `true` alır.
4. **"pencere dolunca sıfırlanır"** — enjekte edilen `now` 60.001ms ilerletilince sayaç sıfırlanır ve `true` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/presentation/middleware/request-context.test.ts` (`9 test`)
**Hedef:** RequestContext + createRequestIdHook (T0.6) — correlationId bağlamı ve istek id üretimi sözleşmesi.

1. (describe: "RequestContext (T0.6)") **"run içinde current() id'yi döner"** — `run("corr-1", fn)` içinde `current()` `"corr-1"` döner.
2. (describe: "RequestContext (T0.6)") **"run dışında current() undefined döner"** — bağlam dışında `current()` undefined'dır.
3. (describe: "RequestContext (T0.6)") **"run dönüş değerini aynen iletir"** — senkron fn'in dönüş değeri (`42`) aynen iletilir.
4. (describe: "RequestContext (T0.6)") **"run async fn'i destekler"** — async fn içinde `current()` doğru id'yi döner.
5. (describe: "RequestContext (T0.6)") **"iç içe run içteki id'yi kullanır, dışarıda dıştaki geçerli kalır"** — iç run'da `"inner"`, çıkınca tekrar `"outer"` görünür.
6. (describe: "createRequestIdHook (T0.6)") **"başlık yoksa id üretir, yanıta yazar ve bağlama kurar"** — üretilen `"gen-1"` yanıt başlığına, handler içi `current()`'e ve `request.correlationId`'ye yazılır.
7. (describe: "createRequestIdHook (T0.6)") **"gelen X-Request-Id başlığını kullanır ve yankılar"** — `"incoming-9"` başlığı aynen kullanılır ve yankılanır.
8. (describe: "createRequestIdHook (T0.6)") **"boş başlık üretilmiş id ile değiştirilir"** — boşluk başlığı `"gen-2"` ile değiştirilir.
9. (describe: "createRequestIdHook (T0.6)") **"üretim fonksiyonu yoksa UUID formatı üretir"** — üretilen id `^[0-9a-f-]{36}$` desenine uyar.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/application/use-cases/mfa-enroll-use-case.test.ts` (`9 test`)
**Hedef:** MfaEnrollUseCase (T6.1) — MFA kayıt/onay/sıfırlama sözleşmesi; audit fail-closed.

1. (describe: "MfaEnrollUseCase.enroll (T6.1)") **"sır üretir, saklar ve otpauth URI döner"** — `enroll` `"NEWSECRET"` + `otpauth://totp/` URI'si döner ve `setTotpSecret("u-1","NEWSECRET")` çağrılır.
2. (describe: "MfaEnrollUseCase.confirm (T6.1)") **"doğru kod: MFA aktifleşir, 10 kurtarma kodu döner, hash'ler saklanır"** — doğru kodla 10 adet `AAAAA-BBBBB` formatlı kod döner, `enableMfa` + `storeRecoveryCodes` çağrılır ve yeni token'lar üretilir.
3. (describe: "MfaEnrollUseCase.confirm (T6.1)") **"yanlış kod: fail + mfa_login_failed logu; enableMfa ÇAĞRILMAZ"** — `isCodeValid:false` iken fail döner, `mfa_login_failed` güvenlik logu atılır ve MFA açılmaz.
4. (describe: "MfaEnrollUseCase.confirm (T6.1)") **"fail-closed: mfa_enrolled audit logu yazılamazsa MFA AÇILMAZ"** — logger reject olunca confirm fail döner ve `enableMfa` çağrılmaz.
5. (describe: "MfaEnrollUseCase.confirm (T6.1)") **"kayıt yoksa (sır yok) fail"** — `totpSecretByUserId` undefined döndüğünde fail verilir.
6. (describe: "MfaEnrollUseCase.confirm (T6.1)") **"T1.6: kilitli kullanıcıda kod DENENMEZ (confirm — brute-force koruması)"** — throttle kilitliyken `"MFA dogrulamasi gecici kilitli"` fail döner ve `isCodeValid` çağrılmaz.
7. (describe: "MfaEnrollUseCase.confirm (T6.1)") **"T1.6: yanlış kod throttle sayacını artırır"** — yanlış kodda `recordFailure("u-1")` çağrılır.
8. (describe: "MfaEnrollUseCase.reset (T6.1)") **"MFA'yı düşürür + mfa_reset audit logu"** — `disableMfa("u-1")` çağrılır ve `mfa_reset` audit'i loglanır.
9. (describe: "MfaEnrollUseCase.reset (T6.1)") **"fail-closed: audit logu yazılamazsa reset YAPILMAZ"** — logger reject olunca reset fail döner ve `disableMfa` çağrılmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/application/use-cases/login-use-case.test.ts` (`16 test`)
**Hedef:** LoginUseCase (T0.11 + T6.1 + T6.6) — giriş akışı, güvenlik/audit logları (fail-closed) ve hesap kilidi sözleşmesi.

1. **"returns tokens and user on successful login"** — geçerli kimlik bilgisiyle `{accessToken, refreshToken, user}` döner.
2. **"fails when user is not found"** — kullanıcı yoksa `"Gecersiz kullanici adi veya sifre"` fail döner.
3. **"fails when password hash is missing"** — hash kaydı yoksa aynı genel hata fail döner.
4. **"fails when password does not match"** — `verify:false` iken genel hata fail döner.
5. **"stores refresh token on success"** — başarıda `storeRefreshToken(id, "refresh-token-xxx", <Date>)` çağrılır.
6. **"passes the user to signAccess and signRefresh"** — token imzalama fonksiyonları kullanıcı nesnesiyle çağrılır.
7. (describe: "T0.11 — login güvenlik logu (K0.3 fail-closed)") **"başarısız giriş security kanalında login_failed loglar — password YOK"** — yanlış şifrede `security`/`login_failed` loglanır ve log girdisi şifreyi içermez.
8. (describe: "T0.11") **"bilinmeyen kullanıcı da security login_failed loglar"** — kullanıcı yokken de aynı security logu atılır.
9. (describe: "T0.11") **"başarılı giriş audit kanalında login_succeeded loglar"** — başarıda `audit`/`login_succeeded` loglanır.
10. (describe: "T0.11") **"fail-closed: audit sink kapalıyken geçerli giriş REDDEDİLİR"** — audit logu yazılamazsa giriş fail döner ve `signAccess` çağrılmaz.
11. (describe: "T0.11") **"fail-closed: başarısız girişte log hatası crash etmez — yanıt yine başarısız"** — log reject olsa bile başarısız giriş yine fail döner (crash yok).
12. (describe: "T6.1 — MFA gerekli akış") **"MFA aktif kullanıcıda access/refresh ÜRETİLMEZ — mfaRequired + mfaToken döner"** — `mfaEnabled:true` kullanıcıda `{mfaRequired:true, mfaToken, user}` döner; `signAccess`/`storeRefreshToken` çağrılmaz.
13. (describe: "T6.1") **"MFA kapalı kullanıcıda normal token akışı korunur"** — MFA'sız kullanıcıda `accessToken` normal üretilir.
14. (describe: "T6.6 — hesap kilidi") **"kilitli hesapta DOĞRU şifre de reddedilir"** — `isLocked:true` iken `"Hesap gecici kilitli"` fail döner; `recordFailure`/`signAccess` çağrılmaz.
15. (describe: "T6.6") **"eşik geçişinde login_locked security logu atılır (tek sefer)"** — `recordFailure` sonrası kilit kurulunca `login_locked` security logu atılır.
16. (describe: "T6.6") **"başarılı girişte sayaç temizlenir"** — başarıda `recordSuccess("admin")` çağrılır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/application/use-cases/mfa-login-use-case.test.ts` (`9 test`)
**Hedef:** MfaLoginUseCase (T6.1) — TOTP/kurtarma kodu doğrulama ve throttle sözleşmesi.

1. **"geçerli TOTP kodu ile token üretir"** — doğru kodla `accessToken:"access-x"` ve `user.id:"u-1"` döner.
2. **"mfa token geçersizse fail — TOTP denenmez"** — `verifyMfa` hata fırlatınca fail döner ve `isCodeValid` çağrılmaz.
3. **"TOTP geçersizse kurtarma kodu dener; başarılı kurtarma yanar"** — TOTP geçersizken `consumeRecoveryCode` true dönerse giriş başarılı olur ve kurtarma kodu tüketilir.
4. **"TOTP + kurtarma ikisi de geçersiz → fail + mfa_login_failed security logu"** — iki yol da başarısızsa `"Gecersiz dogrulama kodu"` fail döner ve security logu atılır.
5. **"kullanıcıda TOTP sırrı yoksa fail (MFA pasif)"** — `totpSecretByUserId` undefined iken fail döner.
6. **"T1.6: kilitli kullanıcıda TOTP/kurtarma DENENMEZ (brute-force koruması)"** — throttle kilitliyken `"MFA dogrulamasi gecici kilitli"` fail döner; `isCodeValid` ve `consumeRecoveryCode` çağrılmaz.
7. **"T1.6: başarısız kod throttle sayacını artırır"** — yanlış kodda `recordFailure("u-1")` çağrılır.
8. **"T1.6: başarılı doğrulama sayacı temizler (recordSuccess)"** — başarıda `recordSuccess("u-1")` çağrılır.
9. **"T1.6: throttle hatası fail-closed (doğrulama reddedilir)"** — `isLocked` reject olunca `"MFA dogrulamasi gecici kilitli"` fail döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/application/use-cases/change-password-use-case.test.ts` (`4 test`)
**Hedef:** ChangePasswordUseCase (Faz 1 T1.6) — şifre değişimi, hash + bayrak güncellemesi ve yeni token üretimi sözleşmesi.

1. **"kullanıcı yoksa fail"** — `findById` undefined döndüğünde fail verilir.
2. **"eski şifre yanlışsa fail — hash değişmez"** — `verify:false` iken fail döner; `hasher.hash` ve `repo.update` çağrılmaz.
3. **"yeni şifre eskiyle aynıysa fail"** — aynı şifre fail döner ve `repo.update` çağrılmaz.
4. **"başarı — hash + bayrak düşürme + yeni token'lar"** — başarıda `hash(new)` + `update("u-1", {password_hash, must_change_password:false})` + yeni access/refresh token'lar üretilir ve `user.mustChangePassword:false` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/application/use-cases/user-use-cases.test.ts` (`4 test`)
**Hedef:** DeleteUserUseCase + CreateUserUseCase — silme öz-koruma ve kullanıcı oluşturma sözleşmesi.

1. (describe: "DeleteUserUseCase") **"deletes user when id is different from current user"** — başka kullanıcıyı silme `repo.delete("user-2")` ile başarılı döner.
2. (describe: "DeleteUserUseCase") **"fails when trying to delete self"** — kendini silme `"Kendinizi silemezsiniz"` fail döner ve `delete` çağrılmaz.
3. (describe: "CreateUserUseCase") **"creates user when username is available"** — username boştaysa `hash` + `create(username, hash, rol, ad)` ile kullanıcı oluşturulur.
4. (describe: "CreateUserUseCase") **"fails when username already exists"** — username doluysa `"Bu kullanici adi zaten kullaniliyor"` fail döner.

[DOSYA NOTU] `ListUsersUseCase` ve `UpdateUserUseCase` bu dosyada test edilmez (ayrı test dosyaları yok).

### `services/web-service/src/config/default.test.ts` (`26 test`)
**Hedef:** default.ts config fabrikaları (T1.6 + T2.3 + 2026-08-28/30) — seed kullanıcıları, authConfig, fieldConnectorConfig, siteFieldConfig, mfaRequiredRoles sözleşmeleri.

1. (describe: "seedUsers (T1.6 + 2026-08-30)") **"container tier: dev default'ları + admin/boss mustChangePassword true, guest FALSE (otomatik guest)"** — 3 seed üretilir; admin/boss bayrakları true, guest false ve admin şifresi `"admin123"`'tür.
2. (describe: "seedUsers") **"field tier: SEED_*_PASSWORD yoksa fırlatır (fail-fast)"** — `SERVICE_TIER=field` iken env şifreleri eksikse `seedUsers()` throw eder.
3. (describe: "seedUsers") **"field tier: env şifreleri kullanılır; guest bayrağı false kalır"** — env'den gelen şifreler seed'e yazılır; admin/boss bayrakları true, guest false kalır.
4. (describe: "seedUsers") **"field tier: 8 karakterden kısa env değeri de fırlatır"** — kısa env şifresi throw eder.
5. (describe: "authConfig (T1.6)") **"field tier + dev secret → fırlatır"** — field tier'da varsayılan JWT_SECRET ile `authConfig` throw eder.
6. (describe: "authConfig (T1.6)") **"field tier + geçerli secret → ok"** — uzun env secret'i config'e aynen taşınır.
7. (describe: "authConfig (T1.6)") **"container tier + dev secret → ok (dev ortamı)"** — container tier'da dev secret'i kabul edilir.
8. (describe: "fieldConnectorConfig (T2.3)") **"kapalıysa undefined döner"** — `FIELD_CONNECT_ENABLED` yoksa `undefined` döner.
9. (describe: "fieldConnectorConfig (T2.3)") **"etkinse URL listesi + token + containerId ayrıştırılır"** — virgüllü `FIELD_WS_URL` 2 elemanlı `wsUrls` listesine ayrışır; token/containerId ve varsayılan heartbeat/telemetry aralıkları (15 sn) döner.
10. (describe: "fieldConnectorConfig (T2.3)") **"etkin ama URL yoksa fail-fast fırlatır"** — boş `FIELD_WS_URL` throw eder.
11. (describe: "fieldConnectorConfig (T2.3)") **"etkin ama token yoksa fail-fast fırlatır"** — boş `CONTAINER_TOKEN` throw eder.
12. (describe: "fieldConnectorConfig (T2.3)") **"etkin ama containerId yoksa fail-fast fırlatır"** — boş `CONTAINER_ID` throw eder.
13. (describe: "fieldConnectorConfig (T2.3)") **"ws:// veya wss:// olmayan URL reddedilir"** — `http://` URL'i throw eder.
14. (describe: "fieldConnectorConfig (T2.3)") **"field tier'da etkin = hata"** — field tier'da etkin connector config throw eder.
15. (describe: "fieldConnectorConfig (T2.3)") **"tek URL de geçerli"** — tek `wss://` URL'i geçerli tek elemanlı liste üretir.
16. (describe: "siteFieldConfig (FIELD_ID env)") **"field tier + geçerli UUID → config döner"** — `{fieldId:<UUID>, fieldName:"Saha"}` döner.
17. (describe: "siteFieldConfig") **"field tier + FIELD_ID yoksa fail-fast fırlatır"** — eksik FIELD_ID `FIELD_ID` içeren mesajla throw eder.
18. (describe: "siteFieldConfig") **"field tier + geçersiz UUID fail-fast fırlatır"** — `"saha-bir"` değeri `UUID` içeren mesajla throw eder.
19. (describe: "siteFieldConfig") **"field tier + FIELD_NAME env'den isim alır"** — env `FIELD_NAME` config'e `"Gunes Santrali"` olarak taşınır.
20. (describe: "siteFieldConfig") **"container tier → undefined (FIELD_ID opsiyonel)"** — container tier'da `undefined` döner.
21. (describe: "siteFieldConfig") **"boss tier → undefined (çok saha ileride)"** — boss tier'da `undefined` döner.
22. (describe: "mfaRequiredRoles (MFA_ENABLED flag)") **"field tier varsayılan: admin,teknik"** — varsayılan `["admin","teknik"]` döner.
23. (describe: "mfaRequiredRoles") **"MFA_ENABLED=false → [] (debug)"** — debug bayrağı kapatınca boş liste döner.
24. (describe: "mfaRequiredRoles") **"MFA_ENABLED=false + AUTH_MFA_REQUIRED_ROLES dolu → yine [] (bayrak öncelikli)"** — bayrak false ise liste dolu olsa da boş liste kazanır.
25. (describe: "mfaRequiredRoles") **"AUTH_MFA_REQUIRED_ROLES boş string → []"** — boş string de enforcement'ı kapatır.
26. (describe: "mfaRequiredRoles") **"container tier her zaman []"** — container tier'da MFA enforcement yoktur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

## 4. web-service — infrastructure · device-service · data-service · integration-service

### `services/web-service/src/infrastructure/auth/token-adapter.test.ts` (`16` test)
**Hedef:** `TokenAdapter` — access/refresh/mfa JWT üretimi ve doğrulaması: fieldIds claim'i (T1.3), HS256 pinleme, süre kontrolü ve tip ayrımı.

1. (describe: "token-adapter karakterizasyon (mevcut davranış) @nis2-security") **"signAccess → verifyAccess round-trip kimliği korur"** — `TokenAdapter.signAccess`→`verifyAccess`: id/username/role/name alanları aynen geri döner.
2. (describe: "token-adapter karakterizasyon") **"verifyAccess başarısız token'da fırlatır"** — `verifyAccess("bogus.token.value")` throw eder.
3. (describe: "token-adapter karakterizasyon") **"refresh token'ı access olarak doğrulanamaz"** — `signRefresh` çıktısı `verifyAccess`'te reddedilir (tip kontrolü).
4. (describe: "token-adapter karakterizasyon") **"verifyAccess fieldIds döndürür (T1.3)"** — access payload'daki `fieldIds` doğrulama sonrası kullanıcıda mevcuttur.
5. (describe: "token-adapter karakterizasyon") **"fieldIds'siz kullanıcıda alan undefined/boş kalır"** — fieldIds tanımsız kullanıcıda `?? []` ile boş davranır.
6. (describe: "token-adapter karakterizasyon") **"verifyRefresh jti/sub döner"** — refresh doğrulaması `sub` ve truthy `jti` döner.
7. (describe: "token-adapter karakterizasyon") **"T6.1: mfaEnabled claim'i round-trip korunur"** — `mfaEnabled: true` sign→verify sonrası korunur.
8. (describe: "token-adapter karakterizasyon") **"T6.1: signMfa → verifyMfa sub döner; access olarak KULLANILAMAZ"** — mfa token'ı kendi doğrulamasında sub döner ama `verifyAccess`'te reddedilir.
9. (describe: "token-adapter karakterizasyon") **"T6.1: access token mfa olarak doğrulanamaz"** — access token `verifyMfa`'da reddedilir.
10. (describe: "token-adapter karakterizasyon") **"T6.1: bozuk mfa token fırlatır"** — bozuk mfa token'ı `verifyMfa`'da throw eder.
11. (describe: "token-adapter güvenlik ekleri (2026-08-30 — T1.2)") **"süresi dolmuş (exp geçmiş) access token reddedilir"** — negatif expiry config'iyle üretilen access token `verifyAccess`'te reddedilir.
12. (describe: "token-adapter güvenlik ekleri") **"YANLIŞ secret ile imzalanmış GEÇERLİ biçimli JWT reddedilir (sahte imza)"** — saldırgan secret'iyle HS256 imzalanmış access JWT'si reddedilir.
13. (describe: "token-adapter güvenlik ekleri") **"alg:none token reddedilir (algoritma karıştırma)"** — imzasız `alg:none` JWT `verifyAccess`'te reddedilir.
14. (describe: "token-adapter güvenlik ekleri") **"HS512 ile imzalanmış token HS256 doğrulamasında reddedilir"** — doğru secret'le ama HS512 ile imzalanan token HS256 doğrulamasında reddedilir.
15. (describe: "token-adapter güvenlik ekleri") **"mustChangePassword claim'i sign→verify round-trip korunur (rbac güvenir)"** — claim hem true hem false değerinde korunur.
16. (describe: "token-adapter güvenlik ekleri") **"süresi dolmuş refresh token reddedilir"** — negatif expiry refresh token'ı `verifyRefresh`'te reddedilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/auth/bun-password-hasher.test.ts` (`4` test)
**Hedef:** `BunPasswordHasher` — `Bun.password`'ya delegasyon kontratı; verify throw'unda false dönerek login akışını 500'den korur.

1. (describe: "BunPasswordHasher @nis2-security") **"hash Bun.password.hash'e delege eder"** — `hash("parola")` `Bun.password.hash` çıktısını aynen döner ve stub aynı argümanla çağrılır.
2. (describe: "BunPasswordHasher") **"verify Bun.password.verify'e delege eder — true sonucu aynen döner"** — `verify("p","h")` true döner ve delegasyon argümanları doğrudur.
3. (describe: "BunPasswordHasher") **"verify false sonucu false döner"** — yanlış parolada false sonucu aynen iletilir.
4. (describe: "BunPasswordHasher") **"verify THROW ederse false döner (kontrat — login 500 koruması)"** — `Bun.password.verify` reject ederse hasher false döner, hata yayılmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/auth/otplib-totp-service.test.ts` (`7` test)
**Hedef:** `OtpLibTotpService` — RFC 6238 TOTP: sır üretimi, otpauth URI'si ve ±1 adım pencereli kod doğrulaması.

1. (describe: "OtpLibTotpService.generateSecret (T6.1)") **"her çağrıda yeni bir sır döner (base32)"** — iki ardışık `generateSecret` farklıdır ve uzunluk ≥16.
2. (describe: "OtpLibTotpService.otpauthUri (T6.1)") **"otpauth://totp URI'si issuer ve kullanıcıyı taşır"** — URI `otpauth://totp/`, `issuer=GD-EMS` ve `secret=` içerir.
3. (describe: "OtpLibTotpService.isCodeValid (T6.1)") **"RFC 6238 vektörü: T=59 → 94287082 (6 haneli: 287082) geçerli"** — RFC Ek B vektörünün son 6 hanesi geçerli sayılır.
4. (describe: "isCodeValid") **"pencere içi komşu adımlar geçerlidir (±30 sn)"** — T=59 kodu T=29 ve T=89 zamanlarında da geçerlidir.
5. (describe: "isCodeValid") **"pencere dışı reddedilir"** — T=240'ta aynı kod false döner.
6. (describe: "isCodeValid") **"yanlış kod reddedilir"** — "000000" kodu doğru zamanda bile reddedilir.
7. (describe: "isCodeValid") **"sayısal olmayan/boş kod throw etmez — false döner"** — "" ve "abc" girdileri false döner, exception yok.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/auth/redis-totp-throttle.test.ts` (`5` test)
**Hedef:** `RedisTotpThrottle` — TOTP deneme sayacı + kilit penceresi (ASVS V3.5.2); Redis hatası fail-open YOK.

1. (describe: "RedisTotpThrottle (T1.6) @nis2-security") **"ilk başarısız deneme: sayaç penceresi kurulur, kilit YOK"** — `recordFailure` ilk artışta `totp:fail:u-1` anahtarına EXPIRE 300 kurar ve `isLocked` false döner.
2. (describe: "RedisTotpThrottle") **"eşik aşılınca kilit kurulur (SET + EX)"** — sayaç maxFailures'a ulaşınca `totp:lock:u-1` SET + EX 300 yazılır ve `isLocked` true olur.
3. (describe: "RedisTotpThrottle") **"recordSuccess sayaç ve kilidi temizler"** — her iki anahtar tek DEL çağrısıyla silinir.
4. (describe: "RedisTotpThrottle") **"isLocked mevcut kilit anahtarını okur"** — Redis'te "1" olan kilit anahtarı true döndürür.
5. (describe: "RedisTotpThrottle") **"Redis hatası fırlatılır (fail-open YOK)"** — `isLocked` ve `recordFailure` Redis hatasını çağırana fırlatır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/auth/service-token.test.ts` (`3` test)
**Hedef:** `sha256Hex` — konteyner servis token'larının SHA-256 özeti (deterministik hex çıktı).

1. (describe: "sha256Hex (Faz 1)") **"bilinen vektörü üretir (RFC 6234: abc)"** — `sha256Hex("abc")` RFC 6234 test vektörüne eşittir.
2. (describe: "sha256Hex") **"deterministik ve 64 hex karakterdir"** — aynı girdi aynı özeti üretir ve çıktı `[0-9a-f]{64}` formatındadır.
3. (describe: "sha256Hex") **"farklı girdiler farklı özet üretir"** — "a" ve "b" özetleri farklıdır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/auth/redis-login-throttle.test.ts` (`5` test)
**Hedef:** `RedisLoginThrottle` — login deneme sayacı + kilit penceresi (T6.6); Redis hatası fail-open YOK.

1. (describe: "RedisLoginThrottle (T6.6) @nis2-security") **"ilk başarısız giriş: sayaç penceresi kurulur, kilit YOK"** — `recordFailure` `login:fail:admin`'e EXPIRE 900 kurar, kilit oluşmaz.
2. (describe: "RedisLoginThrottle") **"eşik aşılınca kilit kurulur (SET + EX — EXPIRE var olmayan anahtarı yaratmaz)"** — sayaç 5'e ulaşınca `login:lock:admin` SET + EX 900 yazılır ve `isLocked` true olur.
3. (describe: "RedisLoginThrottle") **"recordSuccess sayaç ve kilidi temizler"** — iki anahtar tek DEL ile silinir.
4. (describe: "RedisLoginThrottle") **"isLocked mevcut kilit anahtarını okur"** — mevcut kilit anahtarı true döndürür.
5. (describe: "RedisLoginThrottle") **"Redis hatası fırlatılır (fail-open YOK)"** — her iki metot Redis hatasını çağırana fırlatır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.



### `services/web-service/src/infrastructure/container-session/tunnel.spec.ts` (`4` test — domain, kalır: ürün entegrasyon kapısı)
**Hedef:** Faz 3 uçtan uca tünel entegrasyonu (K3.1-K3.3) — gerçek WS üzerinde konteyner/field tünel akışı ve audit.

1. (describe: "Faz 3 uçtan uca tünel (K3.1-K3.3)") **"K3.1: curl benzeri GET / → HTML akar (FIN ile biter)"** — openSession + startHttpStream sonrası 200 writeHead ve `<html>SPA</html>` gövdesi gerçek WS kanalından akar.
2. (describe: "Faz 3 uçtan uca tünel") **"K3.2: GET /api/data/latest → JSON akar"** — `/api/*` isteği JSON gövdesiyle ({voltage:750}) sonuçlanır.
3. (describe: "Faz 3 uçtan uca tünel") **"K3.2: /ws köprüsü çift yönlü WS_OP mesajı taşır"** — `sendWsToContainer("subscribe")` upstream WS'ten geri yansır ve tarayıcıya ulaşır.
4. (describe: "Faz 3 uçtan uca tünel") **"K3.3: session_audit INSERT + session_open security logu"** — açılışta `INSERT INTO session_audit` (container-int, operator) ve `session_open` security logu üretilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/container-session/session-user-map.test.ts` (`3` test — Faz B, 2026-09-01)
**Hedef:** `SessionUserMap` — GD-PMS `User` ↔ ws-tunnel `TunnelUser` sınır eşlemesi: `toTunnelUser` yalnızca id/username/role taşır (fieldIds/mustChangePassword sızmaz); `toWebUser` geçici oturum kullanıcısı üretir (fieldIds boş, şifre değişimi yok).

1. (describe: "SessionUserMap") **"toTunnelUser yalnızca tünel alanlarını taşır"** — çıktıda id/username/role dışında alan yoktur.
2. (describe: "SessionUserMap") **"toWebUser geçici oturum kullanıcısı üretir"** — rbac yüzeyi için tam `User` şekli doldurulur.
3. (describe: "SessionUserMap") **"round-trip: role korunur"** — iki yönlü eşlemede rol aynen taşınır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/container-proxy/container-proxy.test.ts` (`52` test — domain, kalır)
**Hedef:** `ContainerProxy` — konteyner register/token doğrulama (T1.1), registry URL + token'lı fetch (T1.5), telemetry-query (Faz 5.1 B2), heartbeat/stale (T2.4), tünel kanalı (Faz 3).

1. (describe: "container-proxy T1.1 sözleşmesi (token doğrulama)") **"geçerli token ile register — connected + registry URL"** — doğru token ile register sonrası connectionStatus "connected" olur.
2. (describe: "T1.1") **"yanlış token ile register — bağlantı kapatılır, kayıt yok"** — hash uyuşmayan token'da soket kapanır ve containerIds boş kalır.
3. (describe: "T1.1") **"token'sız register — bağlantı kapatılır"** — token verilmeyen register reddedilir.
4. (describe: "T1.1") **"registry'de bilinmeyen containerId — kapatılır"** — queryOne undefined dönen konteyner kapatılır.
5. (describe: "T1.1") **"sql yoksa fail-closed — register reddedilir"** — SQL enjekte edilmeyen proxy her register'ı reddeder.
6. (describe: "T1.1") **"reddedilen register ws_register_rejected security logu üretir"** — log `category:"security"`, `eventCode:"ws_register_rejected"` ve containerId bağlamını taşır.
7. (describe: "T1.1") **"authenticateContainerToken — registry'deki hash ile true"** — SHA-256 eşleşmesi true döner.
8. (describe: "T1.1") **"authenticateContainerToken — bilinmeyen token false"** — registry'de satır yoksa false.
9. (describe: "container-proxy T1.5 sözleşmesi (registry URL + token'lı fetch)") **"health() registry URL'ine token'lı fetch yapar"** — fetch URL registry'den gelir ve `Authorization: Bearer <token>` taşır.
10. (describe: "T1.5") **"token RAM'de yoksa fetch headersız gider (restart sonrası kademeli)"** — tokens map'inden silinen kayıtta fetch Authorization'sız çalışır.
11. (describe: "container-proxy Faz 5.1 B2 sözleşmesi (telemetry-query kontrol frame'i)") **"historical() WS'e telemetry-query frame'i gönderir ve telemetry-result ile çözülür"** — frame from/to/points taşır, yanıt promise'i veriyle resolve eder.
12. (describe: "Faz 5.1 B2") **"telemetry-query-error → boş dizi (kademeli bozulma)"** — hata frame'i promise'i boş diziyle çözer.
13. (describe: "Faz 5.1 B2") **"konteyner kayıtlı değilse veya WS kapalıysa frame gönderilmez — boş dizi"** — kayıtsız/ kapalı durumlarda historical boş dizi döner ve frame gönderilmez.
14. (describe: "Faz 5.1 B2") **"timeout aşılınca boş dizi döner (queryTimeoutMs enjekte edilir)"** — 5000 ms timeout sonrası promise boş diziyle çözülür.
15. (describe: "Faz 5.1 B2") **"WS kapanınca bekleyen sorgular boş diziyle kapatılır"** — close olayı bekleyen historical promise'lerini boş diziyle çözer.
16. (describe: "Faz 5.1 B2") **"ilgisiz mesajlar bekleyen sorguları etkilemez (observer'a düşer)"** — stream-open-ack gibi ilgisiz mesajlar observer'a iletilir, telemetry-result normal çözülür.
17. (describe: "container-proxy karakterizasyon (değişmeyen davranışlar)") **"observer'a connection değişimi bildirilir"** — register sonrası `onConnectionChange("c-1","connected")` çağrılır.
18. (describe: "karakterizasyon") **"telemetry mesajı latest günceller + onData"** — telemetry frame'i latestTelemetry'i günceller ve observer'a iletilir.
19. (describe: "karakterizasyon") **"close → idle bildirimi"** — kapanma sonrası status "idle" ve observer'a idle bildirilir.
20. (describe: "karakterizasyon") **"unregisterContainer siler"** — kayıt silinince containerIds boş döner.
21. (describe: "container-proxy T2.4 sözleşmesi (heartbeat + stale)") **"başarılı register register-ack ok gönderir"** — ilk frame `register-ack {status:"ok", serverTime}` olur.
22. (describe: "T2.4") **"reddedilen register register-ack rejected + kapatma"** — sahte token'da rejected ack + soket kapanır.
23. (describe: "T2.4") **"register lastSeenAt'i şimdiye kurar"** — register anında lastSeenAt = 0 (mock saat).
24. (describe: "T2.4") **"heartbeat lastSeenAt'i tazeler"** — heartbeat ts'i lastSeenAt'e yazılır, status connected kalır.
25. (describe: "T2.4") **"45 sn sessizlik → stale (observer bildirimi dahil)"** — son atıştan tam 45 sn sonra status "stale" ve observer'a bildirilir.
26. (describe: "T2.4") **"stale → heartbeat → connected geri döner"** — yeni heartbeat status'ü tekrar connected yapar.
27. (describe: "T2.4") **"close sonrası kayıt + lastSeenAt korunur (idle — §12.4)"** — kapanma sonrası status idle, lastSeenAt son değerde korunur.
28. (describe: "T2.4") **"kayıtsız container lastSeenAt undefined"** — bilinmeyen konteyner için lastSeenAt undefined.
29. (describe: "T2.4") **"stale eşiği config ile değiştirilebilir"** — staleTimeoutMs=10000 ile 10 sn'de stale olur.
30. (describe: "T2.4") **"kapalıysa pushConfigUpdate frame göndermez"** — kapalı sokete yalnızca register-ack gitmiştir (1 frame).
31. (describe: "T2.4") **"pushConfigUpdate config-update frame'i gönderir"** — ikinci frame `{type:"config-update", config:{...}}` olur.
32. (describe: "T2.4") **"operationalConfig register-ack'e gömülür"** — ack'in `config` alanı operationalConfig'i taşır.
33. (describe: "container-proxy kapsama (T2.4 ek — hata yolları)") **"sql'siz authenticateContainerToken false"** — SQL yoksa false (fail-closed).
34. (describe: "kapsama") **"sql hatasında authenticateContainerToken false (fail-closed)"** — queryOne reject'inde false döner.
35. (describe: "kapsama") **"registry sorgusu hata verirse register reddedilir"** — DB hatası register'ı kapatır.
36. (describe: "kapsama") **"yeniden register eski bağlantıyı kapatır"** — aynı containerId'ye ikinci register ilk soketi kapatır.
37. (describe: "kapsama") **"registry'de container_url yoksa health false; historical frame'le yine çalışır"** — URL'siz kayıtta health false ama historical telemetry-result ile çalışır.
38. (describe: "kapsama") **"malform JSON mesajı yok sayılır"** — bozuk JSON throw etmez, status connected kalır.
39. (describe: "kapsama") **"kayıtsız container latestTelemetry boş döner"** — bilinmeyen cihaz boş dizi döner.
40. (describe: "kapsama") **"historical() from/to/points frame'e taşınır"** — frame tarihleri ISO formatında taşınır.
41. (describe: "kapsama") **"historical() gönderim hatası → boş dizi"** — send throw ederse boş dizi döner.
42. (describe: "kapsama") **"allHistorical çoklu konteyner"** — her containerId için (kayıtsız dahil) boş dizi döner.
43. (describe: "kapsama") **"health() fetch hatası → false"** — fetch reject'inde false döner.
44. (describe: "kapsama") **"start/stop + sweep (kapalı soket → idle)"** — start sonrası kapanan soket idle'a geçer, stop temiz kapanır.
45. (describe: "kapsama") **"removeObserver bildirimi durdurur"** — sökülen observer'a connection bildirimi gitmez.
46. (describe: "kapsama") **"register-ack gönderiminde soket zaten kapalıysa gönderilmez"** — kapalı sokete register-ack yazılmaz.
47. (describe: "kapsama") **"unregister sonrası heartbeat yok sayılır"** — silinen kayda gelen heartbeat throw etmez.
48. (describe: "kapsama") **"security logu yazılamazsa da register reddedilir (fail-closed)"** — logger reject'inde dahi sahte register kapatılır.
49. (describe: "container-proxy Faz 3 kanalı (control + binary)") **"bilinmeyen kontrol mesajı observer'a iletilir"** — open-session-ack gibi mesajlar `onControlMessage`'e düşer.
50. (describe: "Faz 3 kanalı") **"binary frame observer'a iletilir (text parse edilmez)"** — isBinary mesaj `onBinaryFrame`'e ham iletilir.
51. (describe: "Faz 3 kanalı") **"sendControl açık WS'e JSON gönderir; kapalıysa no-op"** — açıkken JSON frame gider, kapalıyken hiçbir şey gönderilmez.
52. (describe: "Faz 3 kanalı") **"sendBinary açık WS'e ham frame gönderir; kapalıysa no-op"** — açıkken ham buffer gider, kapalıyken no-op.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/container-proxy/container-ws-routes.test.ts` (`4` test — domain, kalır)
**Hedef:** `containerWsRoutes` — /ws/container upgrade öncesi Bearer token doğrulaması (T1.1), self-reported containerUrl reddi.

1. (describe: "container-ws-routes T1.1 sözleşmesi") **"token yoksa upgrade öncesi 401"** — Authorization'sız WS bağlantısı açılmaz (401/error).
2. (describe: "T1.1") **"hash'i registry'de olmayan token → 401"** — sahte Bearer token'ı 401 ile reddedilir.
3. (describe: "T1.1") **"geçerli token + register mesajı → registerContainer(token) çağrılır"** — register mesajı sonrası `registerContainer("c-1", ws, token)` doğru argümanlarla çağrılır.
4. (describe: "T1.1") **"register mesajındaki containerUrl setContainerUrl'ı tetikLEMEZ (trust kalktı)"** — self-reported containerUrl tamamen yok sayılır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.






### `services/web-service/src/infrastructure/field-connector/telemetry-series-source.test.ts` (`4` test — domain, kalır)
**Hedef:** `TelemetrySeriesSource` — çevrimiçi cihazlar için TimescaleDB downsampled seri sorgusu (Faz 5.1 B2).

1. (describe: "TelemetrySeriesSource (Faz 5.1 B2)") **"çevrimiçi cihazlarda downsampled sorgular ve birleştirir"** — her online cihaz için `getDownsampledData` (from/to/points/names) çağrılır ve sonuçlar birleştirilir.
2. (describe: "TelemetrySeriesSource") **"deviceIds filtresi uygulanır"** — filtre verilirse yalnızca o cihaz sorgulanır.
3. (describe: "TelemetrySeriesSource") **"tek cihaz hatası diğer sonuçları etkilemez"** — hatalı cihaz atlanır, sağlam sonuç döner.
4. (describe: "TelemetrySeriesSource") **"tüm cihazlar hatalıysa boş dizi döner"** — toplu hatada boş dizi döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.



### `services/web-service/src/infrastructure/field-connector/telemetry-query-responder.test.ts` (`7` test — domain, kalır)
**Hedef:** `TelemetryQueryResponder` — telemetry-query frame'ine seri kaynağından telemetry-result üretme (Faz 5.1 B2).

1. (describe: "TelemetryQueryResponder (Faz 5.1 B2)") **"geçerli sorgu → series() çağrılır ve telemetry-result döner"** — from/to/points Date'e çevrilerek `series` çağrılır, sonuç queryId ile frame'lenir.
2. (describe: "TelemetryQueryResponder") **"deviceIds/names opsiyoneldir — varsa sorguya taşınır"** — opsiyonel filtreler `series`'e iletilir.
3. (describe: "TelemetryQueryResponder") **"geçersiz sorgu → telemetry-query-error (kaynağa ulaşılmaz)"** — zod doğrulaması geçemeyen sorgu `series` çağrılmadan error frame'i üretir.
4. (describe: "TelemetryQueryResponder") **"queryId'siz geçersiz mesaj → queryId 'unknown'"** — eksik queryId hata frame'inde "unknown" olur.
5. (describe: "TelemetryQueryResponder") **"kaynak hatası → telemetry-query-error"** — `series` throw ederse hata mesajı frame'e taşınır.
6. (describe: "TelemetryQueryResponder") **"farklı tipte mesajlar yok sayılır"** — stream-open gibi mesajlar yanıt üretmez.
7. (describe: "TelemetryQueryResponder") **"start idempotenttir; stop aboneliği söker"** — çift start tek abonelik tutar, stop sonrası mesaj işlenmez, yeniden start abonelik kurar.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/realtime/ws-routes.test.ts` (`7` test)
**Hedef:** `telemetryWsRoutes` — /ws/telemetry handshake token doğrulaması, subscribe/unsubscribe delegasyonu, tünel oturum token'ı.

1. (describe: "ws-routes /ws/telemetry (T1.5) @nis2-security") **"token'sız handshake 401 ile reddedilir"** — query token'sız bağlantı açılmaz (CLOSED).
2. (describe: "ws-routes") **"geçersiz token 401 ile reddedilir"** — sahte token bağlantısı açılmaz.
3. (describe: "ws-routes") **"geçerli access token bağlanır; subscribe → subscribed + initial data"** — subscribe `subscribed` yanıtı üretir, realtime.subscribe + sendInitialData çağrılır.
4. (describe: "ws-routes") **"tünel oturum token'ı sessionStore üzerinden kabul edilir (Faz 3)"** — access doğrulaması başarısızsa sessionStore.authenticate denenir.
5. (describe: "ws-routes") **"unsubscribe → unsubscribed karşılığı döner"** — unsubscribe `unsubscribed` yanıtı üretir ve realtime'a delege edilir.
6. (describe: "ws-routes") **"malform JSON mesajı error tipi yanıt üretir (bağlantı kopmaz)"** — bozuk mesaj `{type:"error", message:"Invalid message format"}` döner.
7. (describe: "ws-routes") **"kapanışta realtime.unsubscribeAll çağrılır"** — soket kapanınca unsubscribeAll tetiklenir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/realtime/realtime-manager.test.ts` (`7` test)
**Hedef:** `RealtimeManager` — Redis ring buffer yazımı/trim'i, broadcast ve abone defteri (Faz 5.1 B1).

1. (describe: "RealtimeManager (Faz 5.1 B1)") **"büyük parti (isim sayısı > RING_BUFFER_MAX) tamamen korunur — B1 regresyonu"** — 960 kayıtlık parti trim sonrası tam korunur, listenin başı ve kuyruğu kaybolmaz.
2. (describe: "RealtimeManager") **"küçük partiler RING_BUFFER_MAX'ta kesilir (geçmiş korunur)"** — 7×50 kayıt sonrası buffer 300 elemanla sınırlı kalır.
3. (describe: "RealtimeManager") **"tek kayıt writeToRingBuffer trim sınırında kalır"** — tek kayıt 1 eleman olur ve EXPIRE 300 uygulanır.
4. (describe: "RealtimeManager") **"ringBuffer en-yeni-önce sıralı JSON nesneleri döner"** — buffer parse'lı ve en-yeni-önce sıralıdır.
5. (describe: "RealtimeManager") **"ringBuffer bozuk JSON'u ham string olarak döndürür"** — parse edilemeyen kayıt ham string döner.
6. (describe: "RealtimeManager") **"broadcast yalnızca OPEN soketlere JSON gönderir"** — açık sokete JSON gider, kapalıya gitmez.
7. (describe: "RealtimeManager") **"subscribe/unsubscribe abone defterini tutarlı tutar"** — subscribe/unsubscribe/unsubscribeAll sayıları tutarlıdır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/persistence/site-field-seed.test.ts` (`2` test)
**Hedef:** `ensureSiteField` — field tier açılışında `fields` tablosuna UPSERT (ON CONFLICT DO NOTHING).

1. (describe: "ensureSiteField") **"FIELD_ID + isim ile UPSERT çalıştırır (ON CONFLICT DO NOTHING)"** — `INSERT INTO fields ... ON CONFLICT (id) DO NOTHING` doğru parametrelerle (id, isim) çalışır.
2. (describe: "ensureSiteField") **"boş isim yerine varsayılan kullanılmaz — config'in sorumluluğu"** — isim config'ten aynen geçer, kod varsayılan uydurmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/persistence/log-repository.test.ts` (`4` test)
**Hedef:** `LogRepository` — system_logs + log_events UNION okuması (A1), çift DDL, geçiş insert'i.

1. (describe: "LogRepository (A1)") **"initialize hem system_logs hem log_events DDL'ini oluşturur"** — iki tablo DDL'i de execute edilir.
2. (describe: "LogRepository") **"query UNION üretir — iki kaynağı birleştirir"** — SQL `UNION ALL` ile her iki tabloyu okur.
3. (describe: "LogRepository") **"query filtreleri UNION dışına uygulanır"** — type/source filtreleri `= ANY` parametreli olarak dış sorguda uygulanır.
4. (describe: "LogRepository") **"insert system_logs'a yazar (client olayları — geçiş)"** — istemci olayları geçiş tablosuna INSERT edilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/web-service/src/infrastructure/persistence/user-repository.test.ts` (`10` test)
**Hedef:** `UserRepository` — users DDL + developer rolü migration, CRUD ve MFA (TOTP/kurtarma kodu) kalıcılığı.

1. (describe: "UserRepository (developer rolü migration — 2026-08-30)") **"initialize users DDL'ini oluşturur (developer CHECK dahil)"** — CREATE TABLE `'developer'` rolünü içerir.
2. (describe: "UserRepository") **"initialize eski kurulumlar için role CHECK constraint'ini yeniler (idempotent)"** — DROP CONSTRAINT IF EXISTS + developer'lı ADD CONSTRAINT üretilir.
3. (describe: "UserRepository") **"create satırı döndürür; satır gelmezse hata fırlatır"** — başarılı create id döner, satır gelmeyince "Failed to create user" throw.
4. (describe: "UserRepository") **"findById yoksa undefined döner"** — bilinmeyen id undefined.
5. (describe: "UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)") **"totpSecretByUserId: satır yok/null ise undefined"** — sır döner; null veya eksik satırda undefined.
6. (describe: "UserRepository MFA") **"setTotpSecret: yeni sır yazılırken mfa_enabled FALSE'a düşer (yeniden kayıt sözleşmesi)"** — SQL hem totp_secret hem mfa_enabled=FALSE günceller.
7. (describe: "UserRepository MFA") **"enableMfa satır döndürür; satır yoksa hata fırlatır"** — başarılı enableMfa kullanıcı döner, eksik satırda "Failed to enable MFA" throw.
8. (describe: "UserRepository MFA") **"disableMfa: mfa_enabled FALSE + sır NULL + kurtarma kodları silinir; satır yoksa hata"** — disable kurtarma kodlarını siler, eksik satırda throw.
9. (describe: "UserRepository MFA") **"storeRecoveryCodes: önce tüm eski kodlar silinir, sonra her hash INSERT edilir"** — önce DELETE, sonra 3 ayrı INSERT çalışır.
10. (describe: "UserRepository MFA") **"consumeRecoveryCode: kullanılmamış kod 1 satır etkiler → true; kullanılmış → false (tek kullanımlık SQL koşulu)"** — `used = FALSE` koşuluyla tek kullanımlık tüketim.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/telemetry-tagger.test.ts` (`5` test)
**Hedef:** `TelemetryTagger` — device_id/container_id/field_id tag'lerinin tek sahibi; elle girilen tag'ler korunur.

1. (describe: "TelemetryTagger") **"korur elle girilen tag'leri ve device_id ekler"** — mevcut rack_id korunur, device_id eklenir.
2. (describe: "TelemetryTagger") **"container-level app'te container_id ekler"** — containerId verilince tags'e container_id eklenir.
3. (describe: "TelemetryTagger") **"field-level app'te field_id ekler, container_id eklemez"** — fieldId verilince yalnızca field_id eklenir.
4. (describe: "TelemetryTagger") **"kimlik yoksa sadece device_id ekler"** — ne container_id ne field_id eklenir.
5. (describe: "TelemetryTagger") **"tags olmayan telemetriye de tag ekler"** — tags undefined ise yeni tags nesnesi oluşturulur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/device-factory.test.ts` (`6` test)
**Hedef:** `DeviceFactory` — transport seçimi (Strategy) ve canonical alanının tags.canonical taşınması.

1. (describe: "DeviceFactory — transport seçimi (Strategy)") **"simulator transport'lu config, kayıtlı simülatör transport'uyla cihaz üretir"** — `{kind:"simulator", type:"pcs"}` config PCS-1 cihazı üretir.
2. (describe: "transport seçimi") **"bilinmeyen simulator tipi cihaz üretimini engellemez (varsayılan TCP)"** — bilinmeyen tip cihaz üretimini engellemez, TCP'ye düşer.
3. (describe: "transport seçimi") **"transport olmayan config varsayılan TCP ile çalışır"** — transport'sız config cihaz üretir.
4. (describe: "transport seçimi") **"rtu transport'lu config cihaz üretir (bağlantı kurmaz)"** — RTU config'i (path/baudRate) cihaz üretir.
5. (describe: "transport seçimi") **"canonical alanı tags.canonical olarak taşınır (AGENTS MANDATORY sözleşmesi)"** — config `canonical:"voltage"` read sonucunda tags.canonical olarak görünür.
6. (describe: "transport seçimi") **"canonical verilmeyen telemetride tags.canonical YOKTUR"** — canonical'sız satırda tags.canonical undefined'dir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/device-service.test.ts` (`18` test)
**Hedef:** `DeviceService` — read/command processor hata yolları (T0.11), audit fail-closed, cihaz alarm orkestrasyonu.

1. (describe: "device-service T0.11 sözleşmesi" > "readDevice hata yolu (Açık 1 kapanışı)") **"read hatası processor'ı REJECT ETMEZ — poll devam eder"** — read hatası undefined ile çözülür, publishTelemetry çağrılmaz.
2. (describe: "readDevice hata yolu") **"online→offline geçişinde 1× error log + devices.status='offline'"** — ilk hatada `modbus_read_failed` error logu + status güncellemesi yapılır.
3. (describe: "readDevice hata yolu") **"sürekli hata 60 sn içinde yeni log üretmez (spam önleme)"** — 3 ardışık hatada yalnızca 1 log yazılır.
4. (describe: "readDevice hata yolu") **"60 sn sonra debug hatırlatma üretir"** — 60 sn sonrası hata debug seviyesinde loglanır.
5. (describe: "readDevice hata yolu") **"offline→online geçişinde info log + status='online'"** — başarılı read `device_online` info logu + status günceller.
6. (describe: "readDevice hata yolu") **"logger yoksa eski davranış korunur (console.warn)"** — logger'sız bilinmeyen cihaz console.warn üretir.
7. (describe: "executeCommand audit (T0.11)") **"write hatası → audit command_rejected + app modbus_write_failed"** — write hatası success:false döner, audit+app logu yazılır, console.error yok.
8. (describe: "executeCommand audit") **"başarılı yazma → audit command_executed"** — başarılı komut success:true + audit logu üretir.
9. (describe: "executeCommand audit") **"audit fail-closed: command_rejected logu başarısızsa job düşer"** — audit sink hatasında processor throw eder.
10. (describe: "bilinmeyen cihaz") **"logger varsa request_rejected loglanır, publish yok"** — bilinmeyen cihaz `request_rejected` loglanır, telemetri yayınlanmaz.
11. (describe: "cihaz alarm orkestrasyonu (Faz 0 eki)") **"yükselen kenar → activate UPSERT + tek device_alarm logu"** — ilk aktif okumada `INSERT INTO device_alarms` + tek error logu.
12. (describe: "alarm orkestrasyonu") **"aktifken tekrar eden okumalar SESSİZDİR (dedup)"** — 3 ardışık aktif okumada 1 log ve 1 UPSERT.
13. (describe: "alarm orkestrasyonu") **"düşen kenar → deactivate + device_alarm_cleared logu"** — değer 0'a düşünce `SET active = FALSE` + info logu.
14. (describe: "alarm orkestrasyonu") **"çözülme sonrası yeniden oluşum → yeniden tek log"** — clear sonrası aktif tekrar 1 yeni device_alarm logu üretir (toplam 2).
15. (describe: "alarm orkestrasyonu") **"logger yoksa durum tablosu yine çalışır"** — logger'sız dahi UPSERT çalışır.
16. (describe: "alarm orkestrasyonu") **"sql yoksa yalnızca log çalışır (tablo yazımı atlanır)"** — SQL'siz ortamda device_alarm logu üretilir, tablo yazılmaz.
17. (describe: "alarm orkestrasyonu") **"alarm kuralları yoksa hiçbir alarm işlemi yapılmaz"** — kuralsız cihazda ne log ne activate/deactivate SQL'i üretilir.
18. (describe: "alarm orkestrasyonu") **"start() restart sonrası bayat aktifleri kapatır + dedup sıfırlar"** — start `SET active = FALSE` ile tüm cihazları kapatır, ardından aktif koşul yeniden yükselen kenar sayılır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/device-scheduler.test.ts` (`6` test)
**Hedef:** `DeviceScheduler` — read/management repeatable job planlaması ve telemetri yayını.

1. (describe: "DeviceScheduler" > "scheduleRead()") **"creates repeatable job with correct name and interval"** — `addRepeatableJobEvery("read-bsc-1", {type:"READ_DEVICE", deviceId:"bsc-1"}, 5000)` çağrılır.
2. (describe: "scheduleRead()") **"uses deviceId in job name"** — job adı `read-hvac-3` olur.
3. (describe: "scheduleManagement()") **"creates management job with default interval"** — varsayılan 10000 ms'lik `management-publish` job'u planlanır.
4. (describe: "scheduleManagement()") **"uses configured managementIntervalMs"** — config'teki 60000 ms aralık kullanılır.
5. (describe: "publishTelemetry()") **"adds job when telemetry data is provided"** — veri varsa `WRITE_TELEMETRY` job'u kuyruğa eklenir.
6. (describe: "publishTelemetry()") **"skips when telemetry data is empty"** — boş diziyle addJob çağrılmaz.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/alarm-state-repository.test.ts` (`7` test)
**Hedef:** `AlarmStateRepository` — device_alarms durum tablosu: activate UPSERT, deactivate, resolve, resetAll, sorgular.

1. (describe: "AlarmStateRepository (Faz 0 eki)") **"initialize DDL'i oluşturur"** — `CREATE TABLE IF NOT EXISTS device_alarms` execute edilir.
2. (describe: "AlarmStateRepository") **"activate UPSERT üretir — yeni oluşumda resolved sıfırlanır"** — SQL `ON CONFLICT (device_id, alarm_name)` + active durumuna göre CASE'li resolved/started_at taşır.
3. (describe: "AlarmStateRepository") **"deactivate yalnızca aktif satırı kapatır"** — `SET active = FALSE ... AND active = TRUE` parametreleriyle çalışır.
4. (describe: "AlarmStateRepository") **"resolve — aktif satır bulunursa true"** — `resolved = TRUE` güncellemesi çalışır ve true döner.
5. (describe: "AlarmStateRepository") **"resolve — aktif satır yoksa false (409 kaynağı)"** — satır gelmeyince false.
6. (describe: "AlarmStateRepository") **"resetAll cihazların bayat aktiflerini kapatır"** — `WHERE device_id = ANY` ile toplu kapatma.
7. (describe: "AlarmStateRepository") **"listActive / recentEnded sorguları tabloyu okur"** — `active = TRUE` ve `ended_at DESC` sorguları üretilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/alarm-transition-detector.test.ts` (`16` test)
**Hedef:** `AlarmTransitionDetector` (+`alarmSamples`) — yükselen/düşen kenar dedup durum makinesi.

1. (describe: "alarmSamples (kural → örnek)") **"kural telemetri adıyla eşleşir"** — kural adıyla eşleşen telemetri örneğe dönüşür.
2. (describe: "alarmSamples") **"value !== 0 → aktif (varsayılan)"** — 0 değeri pasif sayılır.
3. (describe: "alarmSamples") **"activeLow: value === 0 → aktif"** — activeLow kuralında 0 değeri aktif olur.
4. (describe: "alarmSamples") **"telemetri üretilmediyse örnek yok (geçiş yok — durum korunur)"** — eşleşen ad yoksa örnek üretilmez.
5. (describe: "alarmSamples") **"kural yoksa örnek yok"** — boş kurallar boş örnek üretir.
6. (describe: "alarmSamples") **"aynı isimli birden fazla satır OR ile birleşir (rack başına alanlar)"** — bir satır aktifse örnek aktif olur.
7. (describe: "alarmSamples") **"aynı isimli TÜM satırlar pasifse alarm pasiftir"** — tümü 0 ise pasif.
8. (describe: "AlarmTransitionDetector (dedup state machine)") **"yükselen kenar → tek set"** — pasif→aktif tek `set` geçişi üretir.
9. (describe: "detector") **"aktifken tekrar eden okuma sessizdir"** — ardışık aktif okumalar boş geçiş üretir.
10. (describe: "detector") **"düşen kenar → clear"** — aktif→pasif `clear` geçişi üretir.
11. (describe: "detector") **"clear sonrası yeni aktif → yeniden tek set"** — yeniden aktif tek `set` üretir ve sonrası sessizdir.
12. (describe: "detector") **"cihazlar birbirinden izoledir"** — d-1'in durumu d-2'yi etkilemez.
13. (describe: "detector") **"reset cihazın tüm alarm durumlarını unutur"** — reset sonrası aktif koşul yeniden `set` üretir.
14. (describe: "detector") **"reset yalnızca hedef cihazı etkiler"** — diğer cihazın dedup'ı korunur.
15. (describe: "detector") **"aynı pollda birden fazla yükselen kenar toplu döner"** — iki alarmın set'i aynı çağrıda döner.
16. (describe: "detector") **"hiç aktif olmamış alarmda pasif örnek geçiş üretmez (kenar yok)"** — baştan pasif örnek geçiş üretmez.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/device-service/src/config-loader.test.ts` (`4` test)
**Hedef:** `DeviceConfigLoader` — cihaz config dizinini yükleme ve doğrulama.

1. (describe: "DeviceConfigLoader" > "constructor") **"throws when configDir is empty"** — boş configDir "[DeviceConfigLoader] configDir bos olamaz" throw eder.
2. (describe: "parseFile (via public API)") **"throws when directory does not exist"** — var olmayan dizinde `load()` /dizini bulunamadi/ hatası verir.
3. (describe: "load() — gerçek config dizini") **"tüm cihaz config'lerini doğrular (bsc, pcs, emu dahil)"** — gerçek config dizininden BSC-1, PCS-1, EMU-1 yüklenir.
4. (describe: "load() — gerçek config dizini") **"PCS instance'ları ayrı adres pencerelerinde (5000+300×(n−1))"** — PCS-1 register 5000, PCS-2 5300'dür.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/data-service/src/data-service.test.ts` (`13` test)
**Hedef:** `DataService` — WRITE_TELEMETRY worker'ı: saf telemetri yazımı, TransientError retry, onFailed sınır logu, health.

1. (describe: "DataService" > "start()") **"registers WRITE_TELEMETRY worker with onFailed boundary"** — `registerWorkerFor("WRITE_TELEMETRY", fn, {concurrency:10, onFailed})` çağrılır.
2. (describe: "worker processing") **"writes telemetry to timescale on WRITE_TELEMETRY job"** — job telemetrileri `timescale.write`'e iletilir.
3. (describe: "worker processing") **"telemetri akışından system_logs'a YAZIM YOKTUR (Açık 2 kapanışı)"** — worker sonrası `sql.execute` hiç çağrılmaz.
4. (describe: "worker processing") **"write hatası → TransientError fırlatılır (retry tetiklenir)"** — timescale hatası processor'dan throw eder.
5. (describe: "worker processing") **"skips processing when service is stopped"** — stop sonrası worker timescale.write çağırmaz.
6. (describe: "onFailed sınır logu (T0.7/T0.11)") **"denemeler tükenince jobId + deviceId'lerle loglanır"** — `telemetry_write_failed` error logu jobId ve deviceIds bağlamıyla tek kez yazılır.
7. (describe: "onFailed sınır logu") **"logger yoksa onFailed sessizdir (geriye uyumluluk)"** — logger'sız onFailed throw etmez.
8. (describe: "stop()") **"closes all connections"** — mq.close, timescale.close ve sql.disconnect çağrılır.
9. (describe: "health()") **"returns false when stopped"** — start edilmemiş servis sağlıksız döner.
10. (describe: "health()") **"returns true when all services healthy"** — start sonrası health true.
11. (describe: "health()") **"returns false when message queue is unhealthy"** — mq.health false ise false.
12. (describe: "health()") **"returns false when timescale is unhealthy"** — timescale.health false ise false.
13. (describe: "health()") **"returns false on exception"** — health kontrolü throw ederse false döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/integration-service/src/external-series-writer.test.ts` (`5` test)
**Hedef:** `ExternalSeriesWriter` — external_series hypertable şeması, upsert yazımı, sorgu ve kapanış.

1. (describe: "ExternalSeriesWriter") **"init tablo, hypertable ve index olusturur"** — üç DDL: CREATE TABLE, create_hypertable ve idx sırayla çalışır.
2. (describe: "ExternalSeriesWriter") **"write upsert SQL uretir ve parametreleri sirali gecer"** — `ON CONFLICT (source, series, timestamp)` ile parametreler (tags dahil JSON) sıralı geçer.
3. (describe: "ExternalSeriesWriter") **"bos listede write hicbir SQL calistirmaz"** — boş diziyle hiçbir execute yok.
4. (describe: "ExternalSeriesWriter") **"query satirlari MarketDataPoint'e cevirir"** — sorgu sonucu timestamp'i ISO string'e çevrilmiş MarketDataPoint döner.
5. (describe: "ExternalSeriesWriter") **"close baglantiyi kapatir"** — close sql.disconnect'i tetikler.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `services/integration-service/src/integration-service.test.ts` (`12` test)
**Hedef:** `IntegrationService` — plugin aktivasyonu, interval/cron/manual zamanlama, FETCH_EXTERNAL worker'ı ve runPlugin.

1. (describe: "IntegrationService") **"start — integration pluginlerini aktive eder ve interval job planlar"** — interval plugin FETCH_EXTERNAL repeatable job (everyMs) + worker kaydeder.
2. (describe: "IntegrationService") **"start — integration olmayan pluginleri atlar"** — management plugin planlanmaz, yalnızca integration plugin'i işlenir.
3. (describe: "IntegrationService") **"start — cron mode'da cron job planlar"** — cron plugin `0 * * * *` pattern'iyle planlanır.
4. (describe: "IntegrationService") **"start — manual mode'da zamanlama kaydetmez"** — manual plugin hiçbir repeatable job üretmez.
5. (describe: "IntegrationService") **"worker isi — fetch eder ve yazar"** — FETCH_EXTERNAL job'ı plugin.fetch'i window ile çağırır ve sonucu writer'a yazar.
6. (describe: "IntegrationService") **"runPlugin — manuel calistirir ve yazilan sayiyi dondurur"** — manuel çalıştırma yazılan kayıt sayısını (1) döner.
7. (describe: "IntegrationService") **"runPlugin — bilinmeyen pluginde firlatir"** — kayıtsız plugin adı /bulunamadi/ hatası fırlatır.
8. (describe: "IntegrationService") **"stop — pluginleri deactivate eder ve kaynaklari kapatir"** — queue ve writer kapanır, health false olur.
9. (describe: "IntegrationService") **"2026-08-30 (T3): worker — bilinmeyen plugin job'ı YOK SAYILIR (kademeli bozulma)"** — bilinmeyen pluginName job'ı yazım yapmadan geçilir.
10. (describe: "IntegrationService") **"2026-08-30 (T3): worker — plugin fetch HATASI job'ı düşürür, yazım YAPILMAZ (hata akışı yukarı fırlar)"** — fetch throw'u processor'dan fırlar, writer boş kalır.
11. (describe: "IntegrationService") **"2026-08-30 (T3): worker — boş fetch sonucu BOŞ listeyle yazıma gider (writer no-op'tur)"** — boş sonuç writer'a boş dizi olarak iletilir.
12. (describe: "IntegrationService") **"2026-08-30 (T3): runPlugin — fetch hatası çağırana fırlar (yutulmaz)"** — manuel çalıştırmada plugin hatası yukarı yayılır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

## 5. apps — field · container-web · superadmin · demo-backend · e2e

### `apps/field/src/layouts/nav-visibility.test.ts` (4 test)
**Hedef:** `nav-visibility` — role göre menü görünürlüğü ve acil durdurma butonu görünürlüğü sözleşmesi (admin/teknik tam menü; boss kontrol hariç; guest/developer yalnız Panel; acil durdurma yalnız admin/teknik).

1. (describe: "visibleNavKeys") **"admin ve teknik tüm menüyü görür"** — `visibleNavKeys(role)` admin/teknik rolünde `ALL_NAV_KEYS`'in tamamını döner.
2. (describe: "visibleNavKeys") **"boss kontrol hariç tüm menüyü görür"** — `visibleNavKeys("boss")` sonucu `nav.control` içermez, `nav.containers`/`nav.devices` içerir ve tam listeden 1 eksiktir.
3. (describe: "visibleNavKeys") **"guest ve developer yalnız Panel görür"** — `visibleNavKeys(role)` guest/developer rolünde yalnız `["nav.dashboard"]` döner.
4. (describe: "emergencyVisible") **"admin/teknik görür; boss/guest/developer görmez"** — `emergencyVisible(role)` admin/teknik'te `true`, boss/guest/developer'da `false` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/field/src/lib/api-client.test.ts` (5 test)
**Hedef:** field `apiClient` interceptor'ü — localStorage'dan Bearer token ekleme, 401'de tek seferlik refresh+retry, refresh başarısızlığında token temizliği + `/login` yönlendirmesi (jsdom'da navsiz) sözleşmesi.

1. (describe: "field api-client interceptor (T2)") **"request'e Bearer token eklenir"** — `apiClient.get` isteğinde `Authorization: Bearer eski` header'ı gönderilir.
2. (describe: "field api-client interceptor (T2)") **"401 → refresh → yeni token'larla retry"** — ilk yanıt 401 olunca `POST /api/auth/refresh` bir kez çağrılır, localStorage token'ları güncellenir ve orijinal istek 200 ile döner.
3. (describe: "field api-client interceptor (T2)") **"refresh başarısız → token'lar silinir (tam sayfa /login yönlendirmesi jsdom'da navsiz)"** — refresh reddedilince istek hata fırlar ve `auth-token`/`auth-refresh-token` localStorage'dan silinir.
4. (describe: "field api-client interceptor (T2)") **"refresh token yoksa retry YAPILMAZ — hata fırlar"** — refresh token yokken 401 olduğunda `axios.post` hiç çağrılmaz ve 401 hatası çağırana fırlar.
5. (describe: "field api-client interceptor (T2)") **"ikinci 401 (retry sonrası) refresh ÇAĞRILMAZ — döngü koruması"** — sürekli 401 dönen adaptörde refresh tam olarak bir kez çağrılır, ardından hata fırlar.

[DOSYA NOTU] Refresh yanıtında `accessToken`/`refreshToken` alanlarının eksik veya boş olduğu senaryo test edilmemiş.

### `apps/field/src/pages/SettingsPage.test.tsx` (4 test)
**Hedef:** `SettingsPage` — görünüm (dark/light toggle + "yakında" notu) ve dil (TR/EN butonları, `settingsStore.locale` + `TranslationProvider` geçişi) bölümleri sözleşmesi.

1. (describe: "SettingsPage") **"görünüm ve dil bölümleri render edilir"** — sayfada "Görünüm" ve "Dil" bölüm etiketleri görünür.
2. (describe: "SettingsPage") **"tema bölümü 'yakında' notunu gösterir"** — "Tema desteği yakında" notu render edilir (tema no-op).
3. (describe: "SettingsPage") **"EN seçilince locale değişir ve çeviri EN'e geçer"** — "English" butonuna tıklanınca `settingsStore.locale` "en" olur ve bölüm etiketleri İngilizceye ("Appearance"/"Language") geçer.
4. (describe: "SettingsPage") **"TR seçilince locale tr'ye döner"** — EN'den sonra "Türkçe" butonuna tıklanınca locale tekrar "tr" olur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/field/src/lib/site-field.test.ts` (8 test)
**Hedef:** `postLoginDestination`/`siteFieldId` — giriş sonrası rota seçimi sözleşmesi (mustChangePassword → /change-password, MFA zorunlu rol + kayıt yok → /mfa-enroll, kayıtlıysa sahaya, MFA listesi boşsa debug pas, boss → /map, fieldId boşsa açık hata).

1. (describe: "postLoginDestination") **"mustChangePassword → /change-password (her rol için öncelikli)"** — `mustChangePassword: true` kullanıcı boss olsa bile `/change-password` yolu döner.
2. (describe: "postLoginDestination") **"MFA zorunlu rol + kayıt yok → /mfa-enroll"** — admin rolü MFA roller listesindeyse ve `mfaEnabled` değilse `/mfa-enroll` yolu döner.
3. (describe: "postLoginDestination") **"MFA kayıtlıysa → saha ana sayfası"** — admin `mfaEnabled: true` ise `/field/<id>` yolu döner.
4. (describe: "postLoginDestination") **"MFA roller listesi boşsa (debug) → enroll YOK, doğrudan saha"** — boş MFA listesiyle admin doğrudan `/field/<id>`'e yönlenir.
5. (describe: "postLoginDestination") **"boss → /map"** — boss rolü MFA listesinden bağımsız `/map` yoluna gider.
6. (describe: "postLoginDestination") **"fieldId boşsa → açık hata"** — boş fieldId ile `{ error: "Saha kimligi tanimsiz (VITE_FIELD_ID)" }` döner (sessiz takılma yok).
7. (describe: "postLoginDestination") **"teknik + MFA zorunlu + kayıtlı → kendi sahası"** — teknik rolü MFA kayıtlıysa `/field/<id>` yolu döner.
8. (describe: "siteFieldId") **"string döner (tanımsızsa boş)"** — `siteFieldId()` her koşulda string döner.

[DOSYA NOTU] guest/developer rollerinin destinasyonu ayrı bir senaryo ile test edilmemiş (yalnız "Diğer → /field" dalı teknik üzerinden kapsanıyor).

### `apps/field/src/features/auth/stores/AuthStore.test.ts` (6 test)
**Hedef:** field `AuthStore` — login sonrası rol bayrakları, mfaRequired'ta `pendingMfaToken` saklanması, otomatik guest girişi ve logout sonrası otomatik guest'e dönüş sözleşmesi.

1. (describe: "AuthStore (otomatik guest — 2026-08-30)") **"login başarılı → oturum + rol bayrakları"** — admin yanıtıyla `login()` sonrası `isAuthenticated`/`isAdmin` true olur ve `auth-token` localStorage'a yazılır.
2. (describe: "AuthStore (otomatik guest — 2026-08-30)") **"login mfaRequired → pendingMfaToken, oturum yok"** — `mfaRequired: true` yanıtında `login()` true döner, oturum AÇILMAZ ve `pendingMfaToken` saklanır.
3. (describe: "AuthStore (otomatik guest — 2026-08-30)") **"loginAsGuest başarılı → guest oturumu"** — `loginAsGuest()` sonrası `isAuthenticated`/`isGuest` true, `isAdmin` false olur.
4. (describe: "AuthStore (otomatik guest — 2026-08-30)") **"loginAsGuest başarısız → unauthenticated kalır"** — API reddederse guest girişi sessizce başarısız olur, `isAuthenticated` false kalır.
5. (describe: "AuthStore (otomatik guest — 2026-08-30)") **"logout temizler ve guest'e otomatik yeniden giriş yapar"** — admin oturumundan `logout()` sonrası rol bayrakları temizlenir ve guest oturumu otomatik açılır.
6. (describe: "AuthStore (otomatik guest — 2026-08-30)") **"developer rolü isDeveloper bayrağını set eder"** — developer yanıtıyla `login()` sonrası `isDeveloper` true, `isGuest` false olur.

[DOSYA NOTU] `pendingMfaToken` ile ikinci adım MFA doğrulama akışı (verify) ve `fieldIds` bayrağının set edilmesi test edilmemiş.

### `apps/field/src/features/field-devices/hooks/useFieldDevices.test.ts` (7 test)
**Hedef:** `deriveDevicesFromSnapshot`/`latestTelemetryForDevice` — field tier'da cihaz tablosu yoktur; cihaz listesi konteyner snapshot'ının (`/fields/:id/containers` → `latestTelemetry`, yalnız online) deviceId'lerinden türetilir.

1. (describe: "deriveDevicesFromSnapshot (B3)") **"benzersiz deviceId başına bir satır üretir (19 cihazlı konteyner)"** — 11 farklı cihazlı snapshot'tan her deviceId için bir satır üretilir (BSC/PCS/EMU/CB/DC-OUTPUT/HVAC/PM5340).
2. (describe: "deriveDevicesFromSnapshot (B3)") **"tip önekten türetilir; snapshot cihazı online'dır"** — PCS-1 satırında `type: "pcs"`, `status: "online"`, `protocol: "ws"`, `name: "PCS-1"` olur.
3. (describe: "deriveDevicesFromSnapshot (B3)") **"bilinmeyen önek → type 'unknown'"** — tanınmayan önekli deviceId için `type` "unknown" olur.
4. (describe: "deriveDevicesFromSnapshot (B3)") **"aynı cihaz iki konteynerde → tek satır, en yeni last_seen"** — iki konteynerdeki aynı deviceId tek satırda birleşir ve en yeni timestamp `last_seen` olur.
5. (describe: "deriveDevicesFromSnapshot (B3)") **"boş snapshot → boş liste"** — boş dizi ve telemetrisiz konteyner durumlarında `[]` döner.
6. (describe: "latestTelemetryForDevice (B3)") **"seçili cihazın satırlarını döndürür (isim başına en yeni değer)"** — PCS-1'in isim başına en yeni satırları döner (AC Active Power'da -60 kazanır), diğer cihazlar filtrelenir.
7. (describe: "latestTelemetryForDevice (B3)") **"bilinmeyen cihaz → boş dizi"** — listede olmayan deviceId için `[]` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/field/src/features/settings/stores/settingsStore.test.ts` (4 test)
**Hedef:** `settingsStore` — varsayılan locale "tr"/theme "dark", `setLocale`/`setTheme` ile state değişimi ve persist sözleşmesi.

1. (describe: "settingsStore") **"varsayılan değerler tr/dark"** — başlangıç state'i `locale: "tr"`, `theme: "dark"` olur.
2. (describe: "settingsStore") **"setLocale dil değiştirir"** — `setLocale("en")` ve geri `setLocale("tr")` locale'i karşılıklı değiştirir.
3. (describe: "settingsStore") **"setTheme tema değiştirir"** — `setTheme("light")` theme'i "light" yapar.
4. (describe: "settingsStore") **"locale persist edilir"** — `setLocale("en")` sonrası localStorage `field-settings` anahtarına state yazılır.

[DOSYA NOTU] Theme'in persist edildiği ve bozuk `field-settings` JSON'unun ele alınışı test edilmemiş.

### `apps/field/src/features/dashboard/deriveDashboard.test.ts` (7 test)
**Hedef:** `deriveEmuMetrics`/`derivePcsRows`/`sparkSeries` — saha PANO'su mock'suz: EMU sütunu EMU-* satırlarından, PCS sütunu PCS-* cihazlarından, sparkline SOC serisinden türetilir.

1. (describe: "deriveEmuMetrics (B4)") **"EMU-* satırlarını isim→değer eşler; aynı isimde en yeni kazanır"** — EMU-1'in "System SOC"/"Active Power" değerleri eşlenir, tekrar eden isimde en yeni (140) kazanır, BSC satırı dışarıda kalır.
2. (describe: "deriveEmuMetrics (B4)") **"EMU yoksa boş eşleme"** — EMU-* satırı olmayan snapshot'ta `{}` döner.
3. (describe: "derivePcsRows (B4)") **"benzersiz PCS-* cihazları, snapshot'ta varsa bağlı"** — PCS-1/PCS-2 satırları `connected: true` ve kendi aktif güçleriyle üretilir, BSC satırı dışarıda kalır.
4. (describe: "derivePcsRows (B4)") **"PCS yoksa boş liste"** — PCS-* içermeyen snapshot'ta `[]` döner.
5. (describe: "sparkSeries (B4)") **"canonical 'soc' veya name 'SOC' noktalarını zamana göre sıralar"** — canonical "soc" ve name "SOC" noktaları zamana göre artan sırada `{time, value}` dizisine çevrilir, "Voltage" elenir.
6. (describe: "sparkSeries (B4)") **"sayısal olmayan değerler atlanır"** — `"n/a"` değerli SOC noktası seriye girmez, `[]` döner.
7. (describe: "sparkSeries (B4)") **"boş giriş → boş dizi"** — boş dizi için `[]` döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/field/src/features/ui/Modal.test.tsx` (6 test)
**Hedef:** `Modal` — open=false'ta null render, açıkken başlık/içerik + aria-modal dialog, Escape/overlay/kapatma butonunun onClose'u tetiklemesi, içerik tıklamasının tetiklememesi sözleşmesi.

1. (describe: "Modal") **"open=false iken null render eder"** — kapalı modda konteyner HTML'i boştur.
2. (describe: "Modal") **"open=true iken başlık ve içerik render eder"** — açık modda başlık ve children içeriği görünür.
3. (describe: "Modal") **"Escape tuşu onClose çağırır"** — document'e Escape keydown'ı onClose'u bir kez çağırır.
4. (describe: "Modal") **"overlay tıklaması onClose çağırır"** — dış katman (overlay) tıklaması onClose'u bir kez çağırır.
5. (describe: "Modal") **"içerik tıklaması onClose çağırmaz"** — modal içeriğine tıklama onClose'u tetiklemez.
6. (describe: "Modal") **"kapatma butonu onClose çağırır"** — kapatma butonu tıklaması onClose'u bir kez çağırır.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/field/src/features/containers/hooks/useContainerData.test.ts` (6 test)
**Hedef:** `statusForContainer`/`summarizeContainer` — connectionStatus→kart durumu eşlemesi (stale ≠ bağlı) ve kanonik metrik (canonical attr + name fallback), SOC ortalaması ve tip bazlı aktif cihaz sayımı sözleşmesi.

1. (describe: "statusForContainer (T5.1)") **"connected → online; stale/error → warning; idle → offline"** — dört connectionStatus değeri doğru kart durumlarına eşlenir.
2. (describe: "summarizeContainer (T5.1)") **"kanonik metriklerden SOC/güç toplar"** — canonical `soc`/`charge_power`/`discharge_power` etiketlerinden SOC ortalaması 85, toplam güç 150 kW, cihaz sayısı 2 hesaplanır.
3. (describe: "summarizeContainer (T5.1)") **"canonical yoksa name fallback çalışır (system rack'iyle)"** — "SOC"/"Power" isimli satırlar fallback olarak SOC ve güce yazılır.
4. (describe: "summarizeContainer (T5.1)") **"stale → warning + connected false"** — stale bağlantılı boş konteynerde durum "warning" ve `connected: false` olur.
5. (describe: "summarizeContainer (T5.1)") **"boş telemetri → sıfırlar"** — idle + boş telemetride `soc` undefined, güç ve sayımlar 0 olur.
6. (describe: "summarizeContainer (T5.1)") **"tip bazlı aktif sayım: CB kapalı, DC açık"** — 3 cihazdan yalnız kapalı CB ve açık DC aktif sayılır (`activeDeviceCount: 2`).

[DOSYA NOTU] HVAC sıcaklığı (`sıcak>0`) ve BSC güç eşikli aktif sayım dalları doğrudan test edilmemiş; rack bazlı filtreleme senaryosu yok.

### `apps/field/src/features/containers/hooks/pcsDerivation.test.ts` (14 test)
**Hedef:** `pcsDerivation` — konteyner başına TEK PCS: `derivePcsSummary` sıralı ilk PCS-* cihazını seçer, `pcsState` bağlantı + işaretli AC aktif güce göre durum üretir, `pcsTelemetryValue` name bazlı sayısal okur, `pcsConfigInfo` config modal girdisi üretir.

1. (describe: "derivePcsSummary") **"tek PCS cihazı için özet döner (bağlantı + filtrelenmiş telemetri)"** — PCS-1 özeti `pcsId`/`containerId`/`connected: true` taşır ve telemetrisi yalnız PCS-1 satırlarına filtrelenir.
2. (describe: "derivePcsSummary") **"PCS cihazı yoksa undefined döner"** — yalnız BSC satırı varsa özet üretilmez.
3. (describe: "derivePcsSummary") **"birden fazla PCS varsa sıralı ilki kazanır (1 konteyner = 1 PCS)"** — PCS-2/PCS-1 birlikteyken sıralı ilk olan PCS-1 seçilir, telemetri tek satıra iner.
4. (describe: "derivePcsSummary") **"bağlantı durumu parametreden taşınır"** — `connected: false` parametresi özete `connected: false` olarak geçer.
5. (describe: "pcsState") **"bağlantı yok → offline"** — `pcsState(false, -5)` → `{kind: "offline", statusKey: "common.offline"}`.
6. (describe: "pcsState") **"negatif aktif güç → charging"** — `pcsState(true, -5)` → `{kind: "charging", statusKey: "status.charging"}`.
7. (describe: "pcsState") **"pozitif aktif güç → discharging"** — `pcsState(true, 5)` → `{kind: "discharging", statusKey: "status.discharging"}`.
8. (describe: "pcsState") **"sıfır aktif güç → idle"** — `pcsState(true, 0)` → `{kind: "idle", statusKey: "status.idleMode"}`.
9. (describe: "pcsTelemetryValue") **"mevcut sayısal satırı döner"** — "DC Voltage" isimli satırın değeri 745 döner.
10. (describe: "pcsTelemetryValue") **"eksik satır → 0"** — listede olmayan isim için 0 döner.
11. (describe: "pcsTelemetryValue") **"sayısal olmayan değer → 0"** — boolean değerli satır için 0 döner.
12. (describe: "pcsTelemetryValue") **"boş telemetri → 0"** — boş listede 0 döner.
13. (describe: "pcsConfigInfo") **"envanter unique + sıralı üretir; bağlantı meta bilgilerini taşır"** — `pcsConfigInfo` tekrar eden "DC Current" ismini teke indirip sıralı `telemetryNames` üretir; `lastSeenAt`/`layout`/`connected` taşınır.
14. (describe: "pcsConfigInfo") **"opsiyonel alanlar undefined kalabilir"** — timestamp/layout verilmezse `lastSeenAt`/`layout` undefined, `telemetryNames` boş kalır.

[DOSYA NOTU] `pcsState` güç eşiğinde yalnız tam 0 sınırı test edilmiş; ±0'a çok yakın küçük değerler için sınır senaryosu yok.

### `apps/field/src/features/containers/hooks/useContainerTelemetry.test.tsx` (3 test)
**Hedef:** `useContainerTelemetry` + `useContainerSparkline` — list query'den konteyner snapshot'ı bulma, series query'nin 120 nokta istemesi ve sparkline'ın son 24 saat/60 nokta ile SOC serisi üretmesi sözleşmesi.

1. (describe: "useContainerTelemetry (T2)") **"list'ten konteyner snapshot'ını bulur; series 120 nokta ister"** — `containersApi.list` mock'uyla konteyner bulunur, `latest` dolar ve `timeSeries` `("f-1","c-1",120)` ile çağrılır.
2. (describe: "useContainerTelemetry (T2)") **"konteyner listede yoksa container undefined"** — list'te olmayan id için `container` undefined ve `latest` `[]` olur.
3. (describe: "useContainerSparkline (T2)") **"son 24 saat / 60 nokta ister ve SOC serisini üretir"** — canonical "soc" satırları seriye çevrilir (SOH elenir) ve `timeSeries` çağrısının zaman aralığı tam 24 saattir.

[DOSYA NOTU] `timeSeries` hata yolu (sparkline boş/error state) ve 30 sn refetchInterval davranışı test edilmemiş.

### `apps/field/src/features/containers/hooks/containerGaugeBlocks.test.ts` (7 test)
**Hedef:** `buildDeviceGaugeBlocks` — snapshot'tan deviceId önekine göre cihaz tipi + tema türetme (BSC success/CB warning/DC info/HVAC temp); PCS blok üretmez; eksik değer 0; HVAC oda ortalaması sözleşmesi.

1. (describe: "buildDeviceGaugeBlocks") **"BSC cihazları success temalı blok üretir (SoC/SoH/Güç/Voltaj)"** — BSC-1 blokları success temalı ve SoC 87/SoH 95 etiketli gauge'ler içerir; BSC-2'de eksik SoH 0 ile doldurulur.
2. (describe: "buildDeviceGaugeBlocks") **"CB cihazları warning temalı 0/1 gauge üretir"** — CB-1 blokları warning temalıdır ve Is Closed/Is Tripped 0/1 değerleriyle üretilir.
3. (describe: "buildDeviceGaugeBlocks") **"DC cihazları info temalı blok üretir (Is On + V/A/P)"** — DC-1 bloğu info temalıdır ve Actual Voltage 512 gauge'ine taşınır.
4. (describe: "buildDeviceGaugeBlocks") **"HVAC oda sıcaklıklarının ortalamasını temp temalı tek gauge yapar"** — iki oda sıcaklığı (21.5/24.5) ortalanıp (≈23) tek temp temalı gauge üretir.
5. (describe: "buildDeviceGaugeBlocks") **"HVAC odası yoksa blok üretilmez"** — tags.room taşımayan HVAC satırı blok üretmez.
6. (describe: "buildDeviceGaugeBlocks") **"PCS cihazları blok üretmez (PcsCard'ın alanı)"** — PCS-1 satırı yok sayılır, yalnız BSC-1 bloğu üretilir.
7. (describe: "buildDeviceGaugeBlocks") **"boş snapshot → boş liste"** — boş girişte `[]` döner.

[DOSYA NOTU] Bilinmeyen cihaz öneki (örn. EMU/PM5340) davranışı ve HVAC dışı sıcaklık satırlarının ele alınışı test edilmemiş.

### `apps/field/src/features/containers/components/PcsCard.test.tsx` (10 test)
**Hedef:** `PcsCard` — RackCard formatı: başlık (pcsId + konteyner adı), bağlantı/çevrimiçi-çevrimdışı rozetleri, işaretli AC aktif güce göre durum rozeti, ana metrik (kW) ve callback'e bağlı Detay/Config butonları sözleşmesi.

1. (describe: "PcsCard") **"pcsId ve konteyner adını gösterir"** — "PCS-1" ve "c-1" metinleri render edilir.
2. (describe: "PcsCard") **"bağlı PCS'te online rozeti görünür"** — `connected: true` iken "Çevrimiçi" rozeti görünür.
3. (describe: "PcsCard") **"kopuk PCS'te offline rozeti görünür"** — `connected: false` iken "Çevrimdışı" rozeti görünür.
4. (describe: "PcsCard") **"negatif aktif güç → şarj rozeti"** — aktif güç -42 kW iken "Şarj Oluyor" rozeti görünür.
5. (describe: "PcsCard") **"pozitif aktif güç → deşarj rozeti"** — aktif güç +25 kW iken "Deşarj Oluyor" rozeti görünür.
6. (describe: "PcsCard") **"sıfır aktif güç → bekleme rozeti"** — aktif güç 0 iken "Beklemede" rozeti görünür.
7. (describe: "PcsCard") **"ana metrik işaretli aktif gücü gösterir"** — -42 kW "−42.0 kW" biçiminde render edilir.
8. (describe: "PcsCard") **"Detay butonu onDetailClick'i çağırır"** — "Detay" butonu tıklaması callback'i bir kez çağırır.
9. (describe: "PcsCard") **"Config butonu onConfigClick'i çağırır"** — "Config" butonu tıklaması callback'i bir kez çağırır.
10. (describe: "PcsCard") **"callback verilmezse butonlar render edilmez"** — callback'siz durumda Detay/Config butonları DOM'da yoktur.

[DOSYA NOTU] Boş `latestTelemetry` (AC Active Power yokken ana metrik) ve kopuk bağlantının durum rozetini ezmesi senaryosu component seviyesinde test edilmemiş.

### `apps/field/src/features/containers/components/RegisterContainerForm.test.tsx` (5 test)
**Hedef:** `RegisterContainerForm` — istemci doğrulaması (boş containerId, <32 karakter token → istek GİTMEZ), "Konteyner Adresi" alanının YOKLUĞU (outbound WSS mimarisi), geçerli girdide `containersApi.register` + success + alan temizliği ve API hatası akışı sözleşmesi.

1. (describe: "RegisterContainerForm") **"adres alanı render edilmez (mimari sözleşme)"** — "Konteyner Adresi" label'ı DOM'da yoktur.
2. (describe: "RegisterContainerForm") **"boş containerId → hata, register çağrılmaz"** — boş id ile Kaydet'e basınca "Konteyner kimliği gerekli" görünür, `register` ve `onRegistered` çağrılmaz.
3. (describe: "RegisterContainerForm") **"32 karakterden kısa token → hata, register çağrılmaz"** — "kisa" token'da "Token en az 32 karakter olmalı" görünür ve `register` çağrılmaz.
4. (describe: "RegisterContainerForm") **"geçerli girdi → register + success + onRegistered + alanlar temizlenir"** — `register("f-1", {containerId, token})` çağrılır, "Kayıt tamamlandı — konteyner artık bağlanabilir" görünür, `onRegistered` bir kez çağrılır ve inputlar boşalır.
5. (describe: "RegisterContainerForm") **"API hatası → hata mesajı, onRegistered çağrılmaz"** — register reddedilince "Kayıt başarısız" içerikli hata görünür, `onRegistered` çağrılmaz.

[DOSYA NOTU] Kaydet sırasında çift submit koruması (pending state) test edilmemiş.

### `apps/field/src/features/field-control/maneuvers.test.ts` (4 test)
**Hedef:** `buildFieldManeuvers`/`stepsFor` — sabit PCS listesi yok; adımlar dışarıdan verilen pcsIds'ten üretilir (charge/discharge/emergency-stop, mode parallel, onFailure continue), boş liste → boş adımlar sözleşmesi.

1. (describe: "stepsFor") **"her PCS kimliği için bir komut adımı üretir"** — `stepsFor("charge", ["PCS-1","PCS-2"])` her PCS'e `{deviceId, command: "charge"}` adımı üretir.
2. (describe: "stepsFor") **"boş liste → boş adım listesi"** — `stepsFor("stop", [])` → `[]`.
3. (describe: "buildFieldManeuvers") **"3 manevra üretir ve adımları pcsIds'e yayar"** — `field_charge_all`/`field_discharge_all`/`field_emergency_stop` anahtarları üretilir; charge parallel/continue ve 3 PCS'e yayılır, emergency stop komutları "stop" olur.
4. (describe: "buildFieldManeuvers") **"boş pcsIds → manevralar boş adımlı üretilir"** — üç manevra da boş `steps` ile üretilir.

[DOSYA NOTU] `field_discharge_all` ve `field_emergency_stop` için mode/onFailure alanları doğrulanmamış (yalnız charge'da assert var).

### `apps/container-web/src/stores/LogStore.test.ts` (6 test)
**Hedef:** `LogStore` — addLog'un başa eklemesi, MAX 200 sınırı, backend'e gönderim (başarıda sunucu kaydı local'le değişir, hatada local kalır) ve ~2 sn debounced localStorage yazımı sözleşmesi.

1. (describe: "LogStore (T2)") **"can be imported without localStorage errors (karakterizasyon)"** — LogStore modülü gerçek import ile yüklenir ve `useLogStore.getState` fonksiyondur.
2. (describe: "LogStore (T2)") **"addLog yeni girişi başa ekler ve backend'e gönderir"** — `addLog("ilk")` sonrası giriş `logs[0]`'da olur ve `logsApi.create` bir kez çağrılır.
3. (describe: "LogStore (T2)") **"MAX 200 sınırı: en eski giriş atılır"** — 205 addLog sonrası 200 giriş kalır, baş "log-204" son "log-5" olur.
4. (describe: "LogStore (T2)") **"backend başarılı dönüşünde sunucu kaydı local girişle DEĞİŞTİRİLİR"** — `logsApi.create` sunucu kaydı dönünce local girişin `id`'si "srv-1" ile değiştirilir.
5. (describe: "LogStore (T2)") **"localStorage yazımı debounced: 2 sn içinde ardışık addLog TEK yazım üretir"** — 500 ms arayla 3 addLog sonrası storage boştur; 2001 ms geçince a/b/c tek yazımda persist edilir.
6. (describe: "LogStore (T2)") **"addLog backend hatasını yutar — local giriş korunur"** — `logsApi.create` reddedilince giriş local'de kalır.

[DOSYA NOTU] `logsApi.list`'in mağazaya yüklenme akışı hiç test edilmemiş (mock'ta tanımlı ama kullanılmıyor).

### `apps/container-web/src/contexts/RealtimeContext.test.tsx` (4 test)
**Hedef:** `RealtimeProvider` — WS "credentials" hatasında refresh token'la `/auth/refresh` → token güncelleme + reconnect; refresh token yoksa/başarısızsa reconnect YOK; credentials içermeyen hata refresh'i tetiklemez sözleşmesi.

1. (describe: "RealtimeProvider token refresh (T2)") **"credentials hatası → refresh başarılı → token güncellenir + reconnect"** — "invalid credentials" hatası sonrası `/auth/refresh` çağrılır, `auth-token` "yeni-token" olur ve transport `connect` 2. kez çağrılır.
2. (describe: "RealtimeProvider token refresh (T2)") **"refresh token yoksa refresh ÇAĞRILMAZ"** — refresh token silinmişken credentials hatasında `fetch` çağrılmaz ve `connect` bir kezde kalır.
3. (describe: "RealtimeProvider token refresh (T2)") **"refresh başarısız → reconnect çağrılmaz, token değişmez"** — `/auth/refresh` 401 dönünce `auth-token` "eski-token" kalır ve reconnect yapılmaz.
4. (describe: "RealtimeProvider token refresh (T2)") **"credentials içermeyen hata refresh'i TETİKLEMEZ"** — "Connection error" hatasında `fetch` hiç çağrılmaz.

[DOSYA NOTU] Refresh başarılı ama reconnect sırasında ikinci bir hata oluşması senaryosu test edilmemiş.

### `apps/container-web/src/hooks/useFieldConnection.test.tsx` (4 test)
**Hedef:** `useFieldConnection` — `GET /api/status` yanıtını `{fieldConnected, state, lastHeartbeatAt}`'a eşleme, 5 sn tazeleme ve hata durumunda offline kabul sözleşmesi (UI beyaz ekranda kalmaz).

1. (describe: "useFieldConnection (T2.2)") **"bağlı durumu yansıtır"** — başarılı `/status` yanıtı `fieldConnected: true`/`state: "connected"`/`lastHeartbeatAt` olarak yansıtılır ve GET `/status` signal ile çağrılır.
2. (describe: "useFieldConnection (T2.2)") **"bağlantı yoksa kapalı bildirir"** — `fieldConnected: false, state: "backoff"` yanıtı state'e taşınır ve `lastHeartbeatAt` undefined kalır.
3. (describe: "useFieldConnection (T2.2)") **"istek hatasında kapalı kabul edilir"** — network hatasında `state: "offline"` ve `fieldConnected: false` olur.
4. (describe: "useFieldConnection (T2.2)") **"5 sn tazeleme aralığı kullanır"** — `FIELD_CONNECTION_QUERY_KEY` sabiti `["fieldConnection"]` olarak doğrulanır.

[DOSYA NOTU] RefetchInterval yalnız sabit üzerinden doğrulanıyor — gerçek 5 sn'de bir tazeleme davranışı fake-timer testi yok.

### `apps/container-web/src/features/auth/session-auth.test.ts` (7 test)
**Hedef:** `hydrateSessionAuth` — tünel modunda `GET /api/auth/session` ile kullanıcı hydrate'i (K4.2, login ekranı görünmez); tünel değilse/401/fetch hatası/tunnel:false → false; tünel modunda AuthStore persist'i no-op (kırılganlık #1) sözleşmesi.

1. (describe: "hydrateSessionAuth (T4.4)") **"tünel değilse false — fetch yapılmaz"** — `isTunnelMode` false iken `hydrateSessionAuth()` false döner ve `fetch` çağrılmaz.
2. (describe: "hydrateSessionAuth (T4.4)") **"tünel + geçerli oturum → kullanıcı hydrate edilir"** — `{user, tunnel: true}` yanıtıyla true döner, `isAuthenticated` true ve kullanıcı "operator" olur.
3. (describe: "hydrateSessionAuth (T4.4)") **"401 → false, hydrate yok"** — `ok: false` yanıtında false döner, oturum açılmaz.
4. (describe: "hydrateSessionAuth (T4.4)") **"tunnel:false → false (alan tarafı oturum değil)"** — yanıt `tunnel: false` ise hydrate yapılmaz.
5. (describe: "hydrateSessionAuth (T4.4)") **"fetch hatası → false (çökme yok)"** — network hatasında false döner, exception fırlamaz.
6. (describe: "tünel modunda persist izolasyonu (T4.4 — kırılganlık #1)") **"tünel modunda oluşturulan AuthStore auth-storage YAZMAZ"** — tünel modunda import edilen mağazada `applySession` sonrası `auth-storage`/`auth-token` localStorage'da YOKTUR (field anahtarları ezilmez).
7. (describe: "tünel modunda persist izolasyonu (T4.4 — kırılganlık #1)") **"normal modda persist çalışır (geriye uyumluluk)"** — normal modda `applySession` `auth-storage`'ı yazar.

[DOSYA NOTU] Hydrate sonrası rol bayraklarının (isAdmin/isTeknik) set edilmesi doğrudan assert edilmemiş; cookie'nin kendisi (jsdom kısıtı) test dışı.

### `apps/container-web/src/features/control/maneuvers.test.ts` (15 test)
**Hedef:** `MANEUVERS`/`HIDDEN_MANEUVER_NAMES`/`MANEUVER_CONTROLS` — 18 manevra tanımı kontratı: gerekli alanlar, adım deviceId'leri, fl06/fl03 yapısı, yardımcı hedef sayıları ve gizli manevra listesi sözleşmesi.

1. (describe: "MANEUVERS") **"has 18 entries"** — `Object.keys(MANEUVERS)` uzunluğu ≥18'dir.
2. (describe: "MANEUVERS") **"every maneuver has required fields"** — her manevranın `name`/`label`'ı dolu, `steps` boş olmayan dizi ve `mode` "parallel"|"sequential" olur.
3. (describe: "MANEUVERS") **"all steps have deviceId"** — tüm manevralardaki tüm adımlar `deviceId` taşır.
4. (describe: "MANEUVERS > fl06_charge") **"targets all BSC devices"** — fl06_charge adımları BSC-1/BSC-2'yi içerir ve BSC adımlarının komutu "charge" olur.
5. (describe: "MANEUVERS > fl03_emergency_stop") **"is sequential mode"** — `fl03_emergency_stop.mode` "sequential" olur.
6. (describe: "MANEUVERS > fl03_emergency_stop") **"stops BSC, DC, and opens CB in order"** — acil duruş adımlarında "stop", "off" ve "open" komutları bulunur.
7. (describe: "MANEUVERS > fl06_charge") **"has onFailure set to stop"** — `fl06_charge.onFailure` "stop" olur.
8. (describe: "MANEUVERS > fl06_charge") **"is sequential"** — `fl06_charge.mode` "sequential" olur.
9. (describe: "maneuver helpers") **"BSC charge targets 2 devices"** — fl06_charge'taki BSC adım sayısı 2'dir.
10. (describe: "maneuver helpers") **"HVAC maneuvers target 8 devices"** — `fl05_tms_cooling_force` 8 adım üretir ve hepsi HVAC önekli olur.
11. (describe: "maneuver helpers") **"DC maneuvers target 2 devices"** — `fl01_start` içindeki "on" komutlu adım sayısı 2'dir.
12. (describe: "maneuver helpers") **"CB maneuvers target 2 devices"** — `fl01_start` içindeki "open" komutlu adım sayısı 2'dir.
13. (describe: "MANEUVER_CONTROLS") **"can be imported"** — modül `MANEUVER_CONTROLS` export'unu içerir.
14. (describe: "HIDDEN_MANEUVER_NAMES") **"keeps hidden maneuvers in config"** — `HIDDEN_MANEUVER_NAMES`'teki her isim `MANEUVERS` içinde tanımlı kalır.
15. (describe: "HIDDEN_MANEUVER_NAMES") **"does not hide FL-01, FL-03, FL-04, FL-10 and switch cards"** — FL-01/FL-03/FL-04/FL-05/FL-10 ve kesici/kontaktör kartları gizli listede DEĞİLDİR.

[DOSYA NOTU] `MANEUVER_CONTROLS`'ün inputs/timerConfig içeriği doğrulanmıyor (yalnız import); kalan 16 manevranın tek tek adım yapısı assert edilmiyor.

### `apps/container-web/src/features/control/services/controlApi.test.ts` (7 test)
**Hedef:** `controlApi` + manevra transform'u — executeCommand/executeMulti payload şekli (params varsayılan `{}`) ve yanıt passthrough; API hatası çağırana fırlar; `fl_bsc_power` transform mode 0→charge/1→discharge, değer her adıma yayılır sözleşmesi.

1. (describe: "controlApi (T2)") **"executeCommand doğru payload gönderir ve yanıtı döner"** — `POST /commands/execute` `{deviceId, command, params: {}}` ile çağrılır ve yanıt passthrough edilir.
2. (describe: "controlApi (T2)") **"executeCommand params'ı gönderir"** — `params: {powerKw: 50}` payload'a taşınır.
3. (describe: "controlApi (T2)") **"executeMulti varsayılanlar: parallel + stop"** — `POST /commands/execute-multi` `{commands, mode: "parallel", onFailure: "stop"}` ile çağrılır ve `results` döner.
4. (describe: "controlApi (T2)") **"API hatası çağırana fırlar (yutulmaz)"** — `apiClient.post` 403 reddedince `executeCommand` da "403" ile reject eder.
5. (describe: "MANEUVER_CONTROLS transform (T2)") **"fl_bsc_power transform tanımlıdır"** — `MANEUVER_CONTROLS.fl_bsc_power.transform` mevcuttur.
6. (describe: "MANEUVER_CONTROLS transform (T2)") **"mode 0 → charge; mode 1 → discharge; değerler her adıma yayılır"** — 3 adımlı listede mode 0 tüm adımlara `command: "charge"` + `powerKw: 60`, mode 1 `command: "discharge"` + `powerKw: 80` üretir (bölme yok).
7. (describe: "MANEUVER_CONTROLS transform (T2)") **"boş adım listesi → boş parametre listesi"** — boş steps için `[]` döner.

[DOSYA NOTU] `executeMulti`'nun varsayılan dışı (sequential/continue) mode/onFailure passthrough'u test edilmemiş.

### `apps/container-web/src/lib/api-client.interceptor.test.ts` (7 test)
**Hedef:** container `api-client` 401-refresh interceptor'ü — 401→refresh→retry, eşzamanlı 401'lerde tek refresh (kuyruk), `_retry` döngü koruması, `/auth/login` 401'ine karışmama, tünel modunda refresh kapalı, must-change 403 yönlendirmesi ve refresh+guest fallback başarısızsa /login sözleşmesi.

1. (describe: "api-client 401-refresh interceptor (T2)") **"401 → refresh → yeni token'la retry 200 döner"** — ilk 401'den sonra `/auth/refresh` bir kez çağrılır, token'lar "yeni-access"/"yeni-refresh" olur ve retry 200 döner.
2. (describe: "api-client 401-refresh interceptor (T2)") **"eşzamanlı 401'ler TEK refresh üretir (kuyruk)"** — paralel iki isteğin 401'i tek `axios.post` refresh'i üretir ve ikisi de 200 ile tamamlanır.
3. (describe: "api-client 401-refresh interceptor (T2)") **"_retry'li ikinci 401 reddedilir (döngü koruması)"** — sürekli 401'de refresh bir kez çağrılır, ikinci 401 reject edilir.
4. (describe: "api-client 401-refresh interceptor (T2)") **"/auth/login 401'ine karışılmaz (refresh ÇAĞRILMAZ)"** — login 401'inde `axios.post` refresh çağrısı yapılmaz, hata aynen döner.
5. (describe: "api-client 401-refresh interceptor (T2)") **"tünel modunda 401-refresh KAPALI (401 aynen reddedilir)"** — `/containers/c-1/ui/...` pathname'inde 401 reddedilir, refresh yok ve localStorage'a dokunulmaz.
6. (describe: "api-client 401-refresh interceptor (T2)") **"must-change 403'ü /change-password'a yönlendirir"** — 403 + "Sifre degisimi gerekli" yanıtında `window.location.hash` "#/change-password" olur, refresh çağrılmaz.
7. (describe: "api-client 401-refresh interceptor (T2)") **"refresh başarısız + guest fallback başarısız → /login'e yönlendirilir"** — refresh reddedilince hash "#/login" olur ve `auth-token` localStorage'dan silinir.

[DOSYA NOTU] Kuyruklanmış isteklerin retry sırasında yeni Authorization header'ı taşıdığı doğrulanmıyor (yalnız status 200'e bakılıyor).

### `apps/container-web/src/lib/api-client.test.ts` (11 test)
**Hedef:** must-change 403 döngüsü düzeltmesi — `isMustChangeError` yalnız 403+"Sifre degisimi gerekli"yi tanır; `mustChangeRedirectNeeded` döngü yapmaz (login/change-password/tünel); `navigateToAppRoute` hash router'a yazar; `writeUserToAuthStorage` güncel user'ı kalıcı store'a yazar.

1. (describe: "isMustChangeError (Faz 5.1 ek)") **"403 + dogru hata mesajini tanir"** — `{status: 403, data: {error: "Sifre degisimi gerekli"}}` için true döner.
2. (describe: "isMustChangeError (Faz 5.1 ek)") **"403 ama farkli hata → false"** — farklı hata mesajlı 403 için false döner.
3. (describe: "isMustChangeError (Faz 5.1 ek)") **"401 → false; response'suz hata → false"** — 401 yanıtı, düz `Error` ve `null` için false döner.
4. (describe: "mustChangeRedirectNeeded (Faz 5.1 ek)") **"dashboard gibi sayfalarda must-change 403 → yonlendirme gerekli"** — `/dashboard`'da must-change 403 için true döner.
5. (describe: "mustChangeRedirectNeeded (Faz 5.1 ek)") **"/change-password ve /login sayfalarinda dongu yapmaz"** — bu iki rotada false döner.
6. (describe: "mustChangeRedirectNeeded (Faz 5.1 ek)") **"tunel modunda yonlendirme yapilmaz"** — `/containers/c-1/ui/dashboard`'ta false döner (iframe kapanmaz).
7. (describe: "mustChangeRedirectNeeded (Faz 5.1 ek)") **"must-change olmayan hatalarda yonlendirme yapilmaz"** — 401 veya farklı mesajlı 403'te false döner.
8. (describe: "navigateToAppRoute (Faz 5.1 ek — hash router)") **"yönlendirme pathname'e değil HASH'e yazılır"** — `navigateToAppRoute("/change-password")` `location.hash`'i "#/change-password" yapar.
9. (describe: "writeUserToAuthStorage (Faz 5.1 ek)") **"auth-storage state'ine kullaniciyi ve rol bayraklarini yazar"** — mevcut auth-storage'a user, `mustChangePassword`, `isAuthenticated`, `isAdmin` yazılır ve `isGuest` false olur.
10. (describe: "writeUserToAuthStorage (Faz 5.1 ek)") **"auth-storage yoksa no-op (sessiz)"** — anahtar yokken hiçbir şey yazılmaz.
11. (describe: "writeUserToAuthStorage (Faz 5.1 ek)") **"bozuk auth-storage temizlenir"** — `{bozuk` JSON'u parse hatasında anahtar silinir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `apps/container-web/src/lib/api-base.test.ts` (21 test)
**Hedef:** `api-base` — normal/tünel modu URL türetimi (api/ws), trailing slash normalizasyonu, Faz 5.1 regresyonları (normal route'ta sert yenileme kök adresi korur), `isTunnelMode` yalnız `/containers/:cid/ui` öneki, `hasContainerSessionCookie`, file:// Electron fallback'leri, hashRoute ve postLoginRoute sözleşmesi.

1. (describe: "apiBaseUrl (T4.3)") **"kök dizinde /api döner"** — `pathname: "/"` için `"/api"` döner.
2. (describe: "apiBaseUrl (T4.3)") **"tünel subpath'inde /containers/:cid/ui/api döner"** — `/containers/c-1/ui/` için `"/containers/c-1/ui/api"` döner.
3. (describe: "apiBaseUrl (T4.3)") **"trailing slash normalize edilir"** — çoklu slash'li pathname'de tek prefix döner.
4. (describe: "apiBaseUrl (T4.3)") **"Faz 5.1 regresyon: normal SPA route'larinda sert yenileme /api dondurur"** — `/change-password`, `/dashboard`, `/login` hep `"/api"` döner.
5. (describe: "apiBaseUrl (T4.3)") **"tünel icindeki alt route'lar prefix'i korur"** — `/containers/c-1/ui/dashboard` için prefix korunur.
6. (describe: "wsUrl (T4.3)") **"http → ws, https → wss"** — `ws://h:5001/ws/telemetry` ve `wss://h/ws/telemetry` türetilir.
7. (describe: "wsUrl (T4.3)") **"tünel subpath'inde cookie kapsamıyla eşleşir"** — `wss://field.local/containers/c-1/ui/ws/telemetry` üretilir.
8. (describe: "wsUrl (T4.3)") **"Faz 5.1 regresyon: normal route'ta sert yenileme kök WS adresini korur"** — `/change-password`/`/dashboard` kök `ws://h:5173/ws/telemetry` verir.
9. (describe: "appDirPath (T4.3)") **"kök için boş dize"** — `/` pathname'inde `""` döner.
10. (describe: "isTunnelMode (T4.3 + Faz 5.1 düzeltmesi)") **"yalnız /containers/:cid/ui öneki tüneldir"** — `/containers/c-1/ui`, `/ui/` ve alt route'ları true döner.
11. (describe: "isTunnelMode (T4.3 + Faz 5.1 düzeltmesi)") **"Faz 5.1 regresyon: normal SPA route'lari tünel DEGILDIR"** — kök/dashboard/login/change-password ve `/containers` altı `/containers/c-1` false döner.
12. (describe: "hasContainerSessionCookie (T4.3)") **"container_session varsa true"** — cookie'de `container_session=xyz` varsa true döner.
13. (describe: "hasContainerSessionCookie (T4.3)") **"yoksa false"** — yalnız `auth-token` varsa false döner.
14. (describe: "file:// (Electron LCD — K4.3)") **"host yoksa ws://localhost:5001 fallback"** — `file:` protokolünde `ws://localhost:5001/ws/telemetry` döner.
15. (describe: "file:// (Electron LCD — K4.3)") **"host yoksa api /api (eski davranış)"** — `file:` protokolünde `"/api"` döner.
16. (describe: "file:// (Electron LCD — K4.3)") **"file:// tünel sayılmaz"** — `isTunnelMode` file:// için false döner.
17. (describe: "hashRoute (Faz 5.1 — hash router uyumu)") **"yol hash formuna çevrilir"** — `/change-password`→`#/change-password`, `/login`→`#/login`, `/`→`#/`.
18. (describe: "hashRoute (Faz 5.1 — hash router uyumu)") **"başına / eklenir"** — `"dashboard"` → `"#/dashboard"`.
19. (describe: "hashRoute (Faz 5.1 — hash router uyumu)") **"zaten hash'liyse olduğu gibi"** — `"#/dashboard"` değişmeden döner.
20. (describe: "postLoginRoute (Faz 5.1 — giriş sonrası rota)") **"must-change kullanıcı → /change-password"** — `mustChangePassword: true` için `/change-password` döner.
21. (describe: "postLoginRoute (Faz 5.1 — giriş sonrası rota)") **"normal kullanıcı → /dashboard"** — false/null/undefined kullanıcı için `/dashboard` döner.

[DOSYA NOTU] `postLoginRoute`'un MFA-required kullanıcı varyantı yok; `hasContainerSessionCookie` bozuk cookie formatı senaryosu test edilmemiş.

### `apps/superadmin/src/app/app.test.ts` (3 test)
**Hedef:** superadmin app kabuğu — modüllerin import edilebilirliği ve temel state kontratları (proje 0 testten geliyor; ilk karakterizasyon smoke'u).

1. (describe: "superadmin app (T4 smoke)") **"App + providers import edilebilir"** — `./App` ve `./providers` modüllerinin `App`/`AppProviders` export'ları tanımlıdır.
2. (describe: "superadmin app (T4 smoke)") **"routes tablosu auth + saha rotalarını tanımlar"** — `./routes` modülünün `routes` dizisi boş değildir.
3. (describe: "superadmin app (T4 smoke)") **"AuthStore state kontratı (login/logout aksiyonları)"** — `useAuthStore` state'inde `login`/`logout` fonksiyondur ve başlangıçta `isAuthenticated: false` olur.

[DOSYA NOTU] Yalnız import smoke'u — bileşen render testi, route guard'ları ve login/logout davranışı tamamen kapsam dışı (proje 0 testten geliyor).

### `apps/demo-backend/src/demo-backend.test.ts` (1 test)
**Hedef:** demo-backend — uygulama modüllerinin derlenip export edilebildiği smoke kontratı.

1. (describe: "demo-backend") **"exports application modules"** — `./application/device-job-handler` modülü `DeviceJobHandler` export'unu içerir.

[DOSYA NOTU] Yalnız tek modül import'u — REST/WS uçları ve `DeviceJobHandler` davranışı tamamen kapsam dışı.

### `e2e/container-realtime.spec.ts` (1 test)
**Hedef:** Faz 5.1 B5 E2E — konteyner app dev modu realtime: Vite (5173) `/ws` proxy'si üzerinden web-service'e abone olup canlı telemetri alma kanıtı (B5 öncesi 404'tü).

1. (describe: "Faz 5.1 B5 — konteyner realtime (Vite /ws proxy)") **"5173 üzerinden WS aboneliği canlı telemetri alır"** — hazır access token veya `/api/auth/login` (Vite proxy) ile kimlik alınır, `ws://…/ws/telemetry?token=` üzerinden `{type:"subscribe", deviceId:"BSC-1"}` gönderilir ve 15 sn içinde dolu `telemetry` batch'i alınır.

[DOSYA NOTU] WS hata senaryoları (abonelik reddi, geçersiz token, bağlantı kopması) kapsam dışı.

### `e2e/smoke.test.ts` (1 test)
**Hedef:** kurulum doğrulama smoke'u — web uygulamasının yüklenip GD başlıklı sayfa göstermesi (kritik yollar sonra genişletilecek).

1. **"web app loads"** — `/`'a gidilince sayfa başlığı `/GD/` deseniyle eşleşir.

[DOSYA NOTU] Tek smoke testi — kritik yol genişletmesi dosya yorumunda açıkça TODO ("expand with critical paths later").

### `e2e/auth-flow.test.ts` (4 test)
**Hedef:** auth akışı — login sayfası öğeleri, hatalı kimlik bilgisiyle hata görünümü, korumalı rotaların login'e yönlendirmesi ve sidebar navigasyon linkleri.

1. (describe: "Auth Flow") **"login page loads"** — `/login`'de username/password inputları ve submit butonu görünür.
2. (describe: "Auth Flow") **"login with invalid credentials shows error"** — "wrong/wrong" ile submit sonrası 5 sn içinde `[role='alert'], .error, .toast-error` görünür.
3. (describe: "Auth Flow") **"protected routes redirect to login"** — `/dashboard`'a gidince URL `/login` desenine düşer.
4. (describe: "Navigation") **"sidebar navigation links exist"** — kökte nav link sayısı 0'dan büyüktür.

[DOSYA NOTU] Başarılı giriş akışı ve logout yok; hata selector'ları genel (`.error, .toast-error`) — bileşen sözleşmesine bağlı değil.

### `e2e/maneuver-ui.spec.ts` (1 test)
**Hedef:** T5 — manevra UI akışı: Control sayfasında manevra kartı → "Çalıştır" → durum rozeti (Çalışıyor... → success/failed) görünürlüğü (ManeuverPanel bileşenini doğrular).

1. (describe: "Manevra UI (ControlPage)") **"manevra kartı çalıştırılır ve durum değişimi görünür"** — admin girişi sonrası `/#/control`'da ilk manevra kartının çalıştır butonu tıklanır ve "Çalışıyor|Running|Tekrar Dene|Geri Al|Retry" durum rozeti 30 sn içinde görünür.

[DOSYA NOTU] Yalnız ilk kart test ediliyor; success/failed son durumu ayrımı assert edilmiyor (tek rozet deseni).

### `e2e/tunnel.spec.ts` (2 test — domain, kalır: canlı kanıt)
**Hedef:** Faz 4 E2E — tünel iframe turu (K4.1: `/containers/:cid/ui/#/dashboard` render; K4.2: login ekranı görünmez — session hydrate; Faz 3 kanıtı: iframe içinden `/api` çalışır).

1. (describe: "tünel iframe (Faz 4 — K4.1/K4.2)") **"cookie ile /#/dashboard render; login ekrani gorunmez"** — field admin girişi + session endpoint'inden `container_session` cookie'si alınır, Path-scoped kurulur; `/#/dashboard`'da "Giriş"/password inputu YOKTUR, "Field Bağlantısı" etiketi görünür ve iframe içinden `/api/auth/session` `tunnel: true` döner.
2. (describe: "tünel iframe (Faz 4 — K4.1/K4.2)") **"cookiesiz tünel URL'i 401 — login yerine hata (guvenlik)"** — cookie'siz `GET /containers/container-1/ui/` yanıtı 401'dir.

[DOSYA NOTU] Oturum TTL/idle sona erme, oturum kapatma (`stream-close`/session-end) ve eşzamanlı oturum limiti E2E'de kapsam dışı.

### `e2e/field-flow.spec.ts` (1 test)
**Hedef:** Faz 5 E2E — K5.1 uçtan uca: kart → özet → tam ekran iframe → konteynerde komut → audit kaydı + grafik serisi + snapshot'tan cihaz listesi (B2/B3) kanıtı.

1. (describe: "Faz 5 saha akışı (K5.1)") **"kart → özet → tam ekran → konteynerde komut → audit"** — field girişi, container-1 kartına tıklayıp özet (Bağlı rozeti), Tam Ekran iframe'de login'siz "Panel" render'ı, iframe içinden `POST /api/commands/execute` (BSC-1 stop, <400), Kapat sonrası Olaylar'da `session_open|session_end` audit kaydı, Grafikler'de `GET /api/fields/:id/telemetry/:cid?points=60` 200 + chart render'ı ve Cihazlar'da ≥19 satır (BSC-1, PCS-1 görünür) doğrulanır.

[DOSYA NOTU] Grafik serisinin veri noktası sayısı S11 performans kısıtı nedeniyle assert EDİLMEZ (10 sn+ sorgu; çözüm Faz 5.2'de); adımlar tek dev testte birleşik — bağımsız izolasyon yok.

### `e2e/security/alarm-api.spec.ts` (3 test)
**Hedef:** NIS-2 — alarm uçları E2E kanıtı (Faz 0 eki KE): GET alarms 200 liste, aktif olmayan alarm resolve'u 409 (TEİAŞ resolved akışı), guest resolve'da 403 yetki matrisi.

1. (describe: "NIS-2 güvenlik — alarm uçları (KE)") **"GET /api/unified/alarms yetkili kullanıcıya liste döner"** — admin token'ıyla GET alarms 200 döner ve yanıt JSON dizisidir.
2. (describe: "NIS-2 güvenlik — alarm uçları (KE)") **"aktif olmayan alarm çözümlemesi 409 döner (TEİAŞ resolved sözleşmesi)"** — admin ile olmayan alarm adına resolve POST'u 409 döner.
3. (describe: "NIS-2 güvenlik — alarm uçları (KE)") **"guest alarm çözümleyemez (403 — yetki matrisi)"** — guest token'ıyla resolve POST'u 403 döner.

[DOSYA NOTU] Aktif bir alarmın başarılı resolve'u (200) ve alarm listesinin içerik doğrulaması kapsam dışı.

### `e2e/security/tfa-throttle.spec.ts` (1 test)
**Hedef:** NIS-2 — TOTP deneme kilidi E2E kanıtı (T1.6): şifre adımı sonrası art arda yanlış kodla `totpMaxFailures` (5) aşılınca 429 "MFA dogrulamasi gecici kilitli" (brute-force koruması, ASVS V3.5.2).

1. (describe: "NIS-2 güvenlik — TOTP deneme kilidi (T1.6)") **"5 yanlış kod sonrası 6. deneme 429 ile kilitlenir @nis2-security"** — `mfaLoginToken` ile `mfaRequired: true` alınır; 5 kez yanlış "000000" 401 döner, 6. deneme 429 + `{error: "MFA dogrulamasi gecici kilitli"}` döner.

[DOSYA NOTU] Doğru TOTP ile başarılı giriş ve kilit TTL'sinin dolması (yeniden deneme) senaryoları kapsam dışı.

### `e2e/security/guest-auto-dashboard.spec.ts` (2 test)
**Hedef:** T5 — otomatik guest E2E kanıtı (Faz R): token'sız açılışta login YERİNE Panel render edilir; guest rolünde yalnızca "Panel" menüsü görünür.

1. (describe: "Otomatik guest (Faz R)") **"token'sız açılışta login YERİNE Panel render edilir"** — token'lar temizlenip `/field/<id>`'e gidilince URL sahada kalır ve "Panel" 10 sn içinde görünür (GuestBootstrap oturumu).
2. (describe: "Otomatik guest (Faz R)") **"guest rolünde yalnızca Panel menüsü görünür"** — "Panel" başlığı görünürken "Kontrol" ve "Konteynerler" menüleri YOKTUR (salt-okunur menü).

[DOSYA NOTU] Guest'ten çıkış/yeniden giriş döngüsü ve guest oturumunun saha API'sindeki yetki sınırları E2E'de kapsam dışı.
---

# Boşluk Dökümü — Dosya Notlarından Derlenen Kapsam Açıkları

Aşağıdakiler, yukarıdaki `[DOSYA NOTU]` satırlarının proje bazında birleştirilmiş halidir. **103 dosyada kapsam tam görünüyor**; kalan notlar şunlar:

## 6. packages/tamper-logger — tamper-evident log kütüphanesi

### `packages/tamper-logger/src/verify-chain.test.ts` (`11 test`)
**Hedef:** `verifyChain` — dosyadan okunan imzalı log zincirini doğrulayan fonksiyon; restart segmentleri ve üç ihlal türü (missing_event/signature_mismatch/out_of_order).

1. (describe: "verifyChain (T0.9) @nis2-security") **"boş liste geçerlidir (0 olay, 0 segment)"** — `verifyChain([])` valid=true, 0 olay, 0 segment döndürüyor mu kontrol ediyor.
2. (describe: "verifyChain (T0.9) @nis2-security") **"tek genesis olayı geçerlidir"** — tek olaylık zincirin valid=true ve 1 segment döndürdüğünü doğruluyor.
3. (describe: "verifyChain (T0.9) @nis2-security") **"3 olaylık zincir geçerlidir"** — 3 olaylık zincirin valid=true ve 1 segment döndürdüğünü doğruluyor.
4. (describe: "verifyChain (T0.9) @nis2-security") **"aradan olay silinirse missing_event tespit edilir"** — ortadan silinen olayın missing_event ihlali ürettiğini doğruluyor.
5. (describe: "verifyChain (T0.9) @nis2-security") **"kurcalanmış içerik signature_mismatch üretir"** — message'ı değiştirilen olayın signature_mismatch ihlali ürettiğini doğruluyor.
6. (describe: "verifyChain (T0.9) @nis2-security") **"yanlış anahtar signature_mismatch üretir"** — yanlış anahtarla doğrulamanın valid=false döndürdüğünü doğruluyor.
7. (describe: "verifyChain (T0.9) @nis2-security") **"restart segmenti (yeni genesis zinciri) geçerlidir — 2 segment"** — iki genesis zincirinin birleşiminin valid=true ve 2 segment döndürdüğünü doğruluyor.
8. (describe: "verifyChain (T0.9) @nis2-security") **"karışık dosya sırası missing_event üretir (write zinciri sırayı garanti eder)"** — karıştırılmış olay sırasının missing_event ihlali ürettiğini doğruluyor.
9. (describe: "verifyChain (T0.9) @nis2-security") **"seq atlaması (silinen satır, eşleşen hash) missing_event üretir"** — seq atlamasının seq=3 bağlamıyla missing_event ihlali ürettiğini doğruluyor.
10. (describe: "verifyChain (T0.9) @nis2-security") **"yinelenen seq out_of_order ihlali üretir"** — ilerlemeyen seq'li sahte olayın out_of_order ihlali ürettiğini doğruluyor.
11. (describe: "verifyChain (T0.9) @nis2-security") **"başlangıç prevHash'i genesis değilse missing_event üretir"** — başsız zincirin missing_event ihlali ürettiğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/tamper-logger.test.ts` (`21 test`)
**Hedef:** `TamperLogger` — filter → redact → enrich → sign (HMAC + prevHash zinciri) → fan-out pipeline'ı; audit/security fail-closed, app drop politikası; jenerik `eventCodeValidator` sözlük enjeksiyonu.

1. (describe: "temel akış") **"app olayı batch dolar dolmaz sink'e imzalı gider"** — batchSize 2 dolunca olayların 64-hex imzalı, zincirli (prevHash=önceki imza) ve service/host alanlarıyla sink'e gittiğini doğruluyor.
2. (describe: "temel akış") **"interval flush — batch dolmadan da yazılır"** — batch dolmadan batchIntervalMs geçince olayın flush edildiğini doğruluyor.
3. (describe: "temel akış") **"context redakte edilir (password görünmez)"** — password değerinin [REDACTED] yapılıp ham sırrın çıktıda hiç görünmediğini doğruluyor.
4. (describe: "temel akış") **"correlationId yoksa üretilir"** — correlationId verilmediğinde UUID formatında üretildiğini doğruluyor.
5. (describe: "fail-closed (audit/security)") **"audit olayı batch'i beklemeden anında yazılır"** — audit olayının batchSize 100 olsa bile anında sink'e yazıldığını doğruluyor.
6. (describe: "fail-closed (audit/security)") **"security olayı sink başarısızsa log() reddeder"** — security olayında sink hatasının log()'un throw etmesine yol açtığını doğruluyor.
7. (describe: "fail-closed (audit/security)") **"audit olayı sink başarısızsa log() reddeder"** — audit olayında sink hatasının log()'un throw etmesine yol açtığını doğruluyor.
8. (describe: "app kategorisi drop politikası") **"error seviyesi sink başarısızsa drop + sayaç + health degraded"** — app error seviyesinde sink hatasının drop edilip sayaç artırıldığını ve health durumunun degraded olduğunu doğruluyor.
9. (describe: "app kategorisi drop politikası") **"debug/info sink başarısızsa drop + sayaç, health sağlıklı kalır"** — app info seviyesinde sink hatasının nonError sayacını artırıp health'i healthy bıraktığını doğruluyor.
10. (describe: "seviye filtresi (yalnızca app)") **"eşik altı app olayı sessizce düşer"** — eşik altı debug olayının sink'e hiç yazılmadan düştüğünü doğruluyor.
11. (describe: "seviye filtresi (yalnızca app)") **"eşik üstü yazılır"** — eşik üstü warn olayının sink'e yazıldığını doğruluyor.
12. (describe: "seviye filtresi (yalnızca app)") **"audit/security seviye filtresine takılmaz"** — fatal eşiğine rağmen security info olayının yazıldığını doğruluyor.
13. (describe: "ring buffer") **"son işlenmiş olayları tutar"** — ringBufferSize 2 iken son 2 olayın doğru sırayla döndürüldüğünü doğruluyor.
14. (describe: "ring buffer") **"limit parametresi ile daraltılır"** — `recentEvents(1)`'in yalnızca son olayı döndürdüğünü doğruluyor.
15. (describe: "close()") **"kalan batch'i flush eder ve sink'leri kapatır"** — `close()`'un birikmiş batch'i yazıp sink.closed=true yaptığını doğruluyor.
16. (describe: "close()") **"sonrasında log() yazmaz"** — `close()` sonrası log()'un throw edip hiçbir olay yazmadığını doğruluyor.
17. (describe: "constructor doğrulaması") **"boş sinks kabul edilmez"** — boş sink listesiyle kurulumun throw ettiğini doğruluyor.
18. (describe: "constructor doğrulaması") **"boş signingKey kabul edilmez"** — boş signingKey ile kurulumun throw ettiğini doğruluyor.

19. (describe: "TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)") **"validator reddederse log() fırlatır (fail-closed) — olay sink'e GİTMEZ"** — enjekte edilen doğrulayıcının reddettiği eventCode için `log()`'un throw ettiğini ve sink'e hiçbir olay gitmediğini doğruluyor.
20. (describe: "TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)") **"validator kabul ederse normal akış işler"** — doğrulayıcıdan geçen kodun normal pipeline'dan sink'e ulaştığını doğruluyor.
21. (describe: "TamperLogger eventCodeValidator (jenerik sözlük enjeksiyonu)") **"validator verilmezse her string kabul edilir"** — validator enjekte edilmemişken serbest string eventCode'un kabul edildiğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/config.test.ts` (`5 test`)
**Hedef:** Logger config (core, JENERİK) — imza anahtarı materyalinin yüklenmesi/çözülmesi. Tier varsayılanları (`TIER_LOGGER_DEFAULTS`, `loggerConfigForTier`) `packages/platform/logging`'e taşındı.

1. (describe: "LoggerConfig signing key (T0.5)") **"dosyadan anahtar materyalini okur ve trim'ler"** — `loadSigningKey` dosya içeriğini trim'leyip döndürüyor mu kontrol ediyor.
2. (describe: "LoggerConfig signing key (T0.5)") **"dosya yoksa fırlatır"** — var olmayan dosya için `loadSigningKey`'in throw ettiğini doğruluyor.
3. (describe: "LoggerConfig signing key (T0.5)") **"env override kazanır — dosyaya bakılmaz"** — `resolveSigningKey` env değeri varken dosyayı okumadan env değerini döndürüyor mu kontrol ediyor.
4. (describe: "LoggerConfig signing key (T0.5)") **"boş env override yok sayılır — dosya kullanılır"** — boş/whitespace env değerinde dosya anahtarının kullanıldığını doğruluyor.
5. (describe: "LoggerConfig signing key (T0.5)") **"dosya yoksa dev fallback + uyarı"** — dosya yokken "dev-only-signing-key" fallback'i dönüp bir kez console.warn basıldığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor (tier testleri platform-logging'e taşındı).

### `packages/tamper-logger/src/pipeline.test.ts` (`22 test`)
**Hedef:** Log pipeline yardımcıları — redaction, enrichment, HMAC imzalama, zincir durumu ve deterministik serileştirme (T0.3).

1. (describe: "redactValue") **"hassas anahtar değerini REDACTED yapar"** — `redactValue` password anahtarını [REDACTED] yapıp diğer alanları koruyor mu kontrol ediyor.
2. (describe: "redactValue") **"büyük/küçük harf duyarsız eşleşir"** — `redactValue` Authorization anahtarını küçük harfli listedeki authorization ile eşleştiriyor mu kontrol ediyor.
3. (describe: "redactValue") **"iç içe nesnelerde de redakte eder"** — `redactValue` derin iç içe token/apiKey değerlerini redakte ediyor mu kontrol ediyor.
4. (describe: "redactValue") **"dizilerdeki nesneleri de redakte eder"** — `redactValue` dizi elemanı nesnelerdeki hassas anahtarları redakte ediyor mu kontrol ediyor.
5. (describe: "redactValue") **"anahtar adı kısmi içeriyorsa eşleşir (api_key, apiKey)"** — `redactValue` xApiKeyY gibi kısmi içeren anahtarları eşleştiriyor mu kontrol ediyor.
6. (describe: "redactValue") **"hassas olmayan değerler dokunulmaz"** — boş anahtar listesiyle deviceId/voltage alanlarının aynen kaldığını doğruluyor.
7. (describe: "redactValue") **"ilkel değerler aynen döner"** — sayı/string/null girdilerin değişmeden döndürüldüğünü doğruluyor.
8. (describe: "redactEvent") **"context'i redakte eder, diğer alanları korur"** — `redactEvent` context'i redakte edip eventCode'u koruduğunu ve yeni nesne döndürdüğünü doğruluyor.
9. (describe: "redactEvent") **"context yoksa dokunmadan döner"** — context undefined iken `redactEvent`'in message'ı aynen koruduğunu doğruluyor.
10. (describe: "enrichEvent") **"eksik alanları doldurur"** — `enrichEvent` ts/service/host/correlationId/seq/prevHash alanlarını dolduruyor mu kontrol ediyor.
11. (describe: "enrichEvent") **"girdideki değerleri ezmez"** — girdide var olan correlationId'yi ezmeden koruduğunu doğruluyor.
12. (describe: "enrichEvent") **"ts girdide varsa korunur"** — girdideki ts değerinin korunduğunu doğruluyor.
13. (describe: "signEvent + nextState + verifySignature") **"signature 64 hex karakterdir"** — `signEvent` imzasının 64 hex karakter formatında olduğunu doğruluyor.
14. (describe: "signEvent + nextState + verifySignature") **"deterministik — aynı zincir + girdi = aynı imza"** — aynı girdi + durumun aynı imzayı ürettiğini doğruluyor.
15. (describe: "signEvent + nextState + verifySignature") **"nextState zinciri ilerletir"** — `nextState` seq'i artırıp prevHash'i önceki imzaya bağlıyor mu kontrol ediyor.
16. (describe: "signEvent + nextState + verifySignature") **"ikinci olayın prevHash'i ilk imzadır (zincir)"** — zincirin ikinci olayının prevHash'inin ilk imza ve seq'inin 2 olduğunu doğruluyor.
17. (describe: "signEvent + nextState + verifySignature") **"verifySignature geçerli event'i kabul eder"** — bozulmamış event için `verifySignature` true döndürüyor mu kontrol ediyor.
18. (describe: "signEvent + nextState + verifySignature") **"verifySignature kurcalanmış message'ı reddeder"** — message'ı değiştirilen event için false döndürüyor mu kontrol ediyor.
19. (describe: "signEvent + nextState + verifySignature") **"verifySignature yanlış anahtarı reddeder"** — farklı anahtarla doğrulamanın false döndürdüğünü doğruluyor.
20. (describe: "signEvent + nextState + verifySignature") **"verifySignature kurcalanmış seq'i reddeder"** — seq'i değiştirilen event için false döndürüyor mu kontrol ediyor.
21. (describe: "canonicalize") **"context anahtar sırasından bağımsızdır"** — `canonicalize` çıktısının context anahtar sıralamasından bağımsız olduğunu doğruluyor.
22. (describe: "canonicalize") **"dizi içeren context'i serileştirir"** — dizi içeren context'in sıralı JSON olarak serileştirildiğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/sinks/timescale-sink.test.ts` (`6 test`)
**Hedef:** `TimescaleSink` — imzalı olayları `log_events` tablosuna çok satırlı tek INSERT (unnest) ile yazan sink.

1. (describe: "TimescaleSink (T0.4)") **"name() 'timescale' döner"** — sink adının "timescale" olduğunu doğruluyor.
2. (describe: "TimescaleSink (T0.4)") **"çok satırlı tek INSERT üretir — kolon sayısı 12, parametre 12 dizi"** — `write` 2 olay için tek INSERT + unnest SQL'i ve 12 parametre dizisi üretiyor mu kontrol ediyor.
3. (describe: "TimescaleSink (T0.4)") **"boş batch no-op"** — `write([])` boş batch'te executor çağırmadığını doğruluyor.
4. (describe: "TimescaleSink (T0.4)") **"opsiyonel alanlar eksikse NULL ile yazılır"** — eksik context/service/host/correlationId alanlarının "{}" ve NULL olarak yazıldığını doğruluyor.
5. (describe: "TimescaleSink (T0.4)") **"executor hatası fırlatılır"** — executor hatasının `write`'tan yukarı fırlatıldığını doğruluyor.
6. (describe: "TimescaleSink (T0.4)") **"close() hata fırlatmaz (bağlantı executor sahibinde)"** — `close()`'un başarıyla çözüldüğünü doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/sinks/http-webhook-sink.test.ts` (`5 test`)
**Hedef:** `HttpWebhookSink` — HMAC imzalı JSON batch POST yapan SIEM webhook sink'i (T6.2).

1. (describe: "HttpWebhookSink (T6.2)") **"JSON batch + HMAC imza başlığı ile POST eder"** — `write` hedef URL'e POST ile dizi gövde ve `X-Signature: sha256=<64 hex>` başlığı gönderiyor mu kontrol ediyor.
2. (describe: "HttpWebhookSink (T6.2)") **"secret yoksa imza başlığı gönderilmez"** — secret verilmediğinde X-Signature başlığının hiç gönderilmediğini doğruluyor.
3. (describe: "HttpWebhookSink (T6.2)") **"5xx → retries kadar dener, tükenince fırlatır"** — 503 yanıtında toplam 3 deneme (1+2 retry) yapıp tükenince throw ettiğini doğruluyor.
4. (describe: "HttpWebhookSink (T6.2)") **"2xx sonrası retry YOK"** — 200 yanıtında tek çağrıyla yetindiğini doğruluyor.
5. (describe: "HttpWebhookSink (T6.2)") **"close sonrası write fırlatır; close idempotent"** — `close()`'un iki kez çağrılabildiğini ve sonrasında write'ın throw ettiğini doğruluyor.

[DOSYA NOTU] Ağ hatası yolu (fetch'in reject etmesi — 5xx dışı) test edilmemiş; yalnızca HTTP yanıt kodları kapsanıyor.

### `packages/tamper-logger/src/sinks/file-sink.test.ts` (`4 test`)
**Hedef:** `FileSink` — append-only JSONL dosya sink'i; zincir verileri birebir dosyaya yazılır.

1. (describe: "FileSink (T0.4)") **"name() 'file' döner"** — sink adının "file" olduğunu doğruluyor.
2. (describe: "FileSink (T0.4)") **"olayları satır satır append eder"** — iki write çağrısının dosyada 2 JSON satırı üretip ikinci satırın prevHash'inin ilk satırın imzası olduğunu doğruluyor.
3. (describe: "FileSink (T0.4)") **"close() sonrası write() reddedilir"** — kapatıldıktan sonra write'ın throw ettiğini doğruluyor.
4. (describe: "FileSink (T0.4)") **"boş dizi yazılmaz (dosya açılmaz)"** — boş batch'te dosyanın hiç açılmadığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/sinks/alert-notifier.test.ts` (`5 test`)
**Hedef:** `AlertNotifier` — cooldown'lu alarm bildirim yönlendiricisi (T0.4 iskelet).

1. (describe: "AlertNotifier (T0.4)") **"ilk olay iletilir"** — `consider` ilk olayı sink'e iletir mi kontrol ediyor.
2. (describe: "AlertNotifier (T0.4)") **"aynı eventCode cooldown içinde bastırılır"** — aynı eventCode'un cooldown içinde ikinci kez iletilmediğini doğruluyor.
3. (describe: "AlertNotifier (T0.4)") **"farklı eventCode'lar birbirini engellemez"** — farklı kodların ikisinin de iletildiğini doğruluyor.
4. (describe: "AlertNotifier (T0.4)") **"cooldown dolunca aynı kod yeniden iletilir"** — enjekte edilen `now` 300001 ms ilerleyince aynı kodun tekrar iletildiğini doğruluyor.
5. (describe: "AlertNotifier (T0.4)") **"sink hatası yukarı fırlatılır"** — sink hatasının `consider`'dan yukarı fırlatıldığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/sinks/smtp-notifier.test.ts` (`3 test`)
**Hedef:** `SmtpNotifier` — AlertNotifier'dan geçen olayları tek e-postada toplayan SMTP notifier (T6.7).

1. (describe: "SmtpNotifier (T6.7)") **"olayları tek mailde toplar (konu + JSON gövde)"** — `write` iki olayı tek mailde birleştirip konuya eventCode + mesaj, gövdeye iki olayın kodunu basıyor mu kontrol ediyor.
2. (describe: "SmtpNotifier (T6.7)") **"close idempotent; kapandıktan sonra write fırlatır"** — `close()`'un iki kez çağrılabildiğini ve sonrasında write'ın throw ettiğini doğruluyor.
3. (describe: "SmtpNotifier (T6.7)") **"SMTP hatası fırlatılır"** — transporter hatasının `write`'tan yukarı fırlatıldığını doğruluyor.

[DOSYA NOTU] JSDoc'taki "yapılandırılmış `to` listesinin TÜMÜNE gönderilir" iddiası test edilmemiş — test yalnızca tek alıcılı config kullanıyor.

### `packages/tamper-logger/src/sinks/syslog-sink.test.ts` (`4 test`)
**Hedef:** `SyslogSink` — RFC 5424 frame üreten, UDP'de ayrı datagram/TCP'de `\n` frame'li syslog sink'i (T6.2).

1. (describe: "SyslogSink — RFC 5424 frame (T6.2)") **"PRI severity eşlemesi + zorunlu alanlar"** — `formatFrame` error(3) için PRI 107, host/app alanları, eventCode ve "-" yapısal veri bölümünü üretiyor mu kontrol ediyor.
2. (describe: "SyslogSink — RFC 5424 frame (T6.2)") **"warn(4) → 108, info(6) → 110"** — `formatFrame` warn ve info seviyeleri için PRI 108 ve 110 üretiyor mu kontrol ediyor.
3. (describe: "SyslogSink — UDP transport (T6.2)") **"her olay ayrı datagram olarak gönderilir"** — UDP'de `write` iki olayı iki ayrı datagram olarak gönderiyor mu kontrol ediyor.
4. (describe: "SyslogSink — UDP transport (T6.2)") **"close idempotent; kapandıktan sonra write fırlatır"** — `close()`'un iki kez çağrılabildiğini ve sonrasında write'ın throw ettiğini doğruluyor.

[DOSYA NOTU] TCP transport yolu (kaynakta `tcpSocket` kurulumu, `\n` framing, kopan bağlantıda yeniden kurma — `syslog-sink.ts:80-110`) hiç test edilmemiş; yalnızca UDP kapsanıyor.

### `packages/tamper-logger/src/sinks/http-sms-notifier.test.ts` (`3 test`)
**Hedef:** `HttpSmsNotifier` — bodyTemplate şablonlu, telefon başına ayrı HTTP POST atan SMS notifier'ı (T6.7).

1. (describe: "HttpSmsNotifier (T6.7)") **"her telefon için şablonlu ayrı POST atar"** — `write` 2 telefon için 2 POST atıp şablondan `{{phone}}`/`{{eventCode}}`/`{{message}}` alanlarını dolduruyor mu kontrol ediyor.
2. (describe: "HttpSmsNotifier (T6.7)") **"hata fırlatılır"** — 401 yanıtında write'ın throw ettiğini doğruluyor.
3. (describe: "HttpSmsNotifier (T6.7)") **"close sonrası write fırlatır; close idempotent"** — `close()`'un iki kez çağrılabildiğini ve sonrasında write'ın throw ettiğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/sinks/console-sink.test.ts` (`3 test`)
**Hedef:** `ConsoleSink` — seviye eşlemeli console metodlarına JSON satırı yazan sink.

1. (describe: "ConsoleSink (T0.4)") **"name() 'console' döner"** — sink adının "console" olduğunu doğruluyor.
2. (describe: "ConsoleSink (T0.4)") **"seviyeleri doğru console metoduna eşler"** — debug/info/warn/error/fatal seviyelerinin sırasıyla console.debug/info/warn/error'a (error+fatal→error) eşlendiğini doğruluyor.
3. (describe: "ConsoleSink (T0.4)") **"JSON satırı olarak yazar (tamper alanlarıyla)"** — `write` çıktısının seq/signature içeren parse edilebilir JSON satırı olduğunu doğruluyor.
4. (describe: "ConsoleSink (T0.4)") **"close() hata fırlatmaz"** — `close()`'un no-op olarak başarıyla çözüldüğünü doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/tamper-logger-alerts.test.ts` (`5 test`)
**Hedef:** `TamperLogger` alert kuralları — alertRules.eventCodes eşleşmesinin cooldown'lu AlertNotifier'a iletilmesi (Faz 6 T6.7).

1. (describe: "TamperLogger — alertRules (T6.7)") **"eşleşen eventCode cooldown'lu notifier'a iletilir"** — alertRules ile eşleşen `login_locked` olayının alert sink'ine iletildiğini doğruluyor.
2. (describe: "TamperLogger — alertRules (T6.7)") **"eşleşmeyen eventCode iletilmez"** — eşleşmeyen `service_started` olayının alert sink'ine hiç yazılmadığını doğruluyor.
3. (describe: "TamperLogger — alertRules (T6.7)") **"cooldown: aynı eventCode kısa sürede tek bildirim"** — aynı eventCode'un iki kez loglanmasına rağmen tek bildirim üretildiğini doğruluyor.
4. (describe: "TamperLogger — alertRules (T6.7)") **"alert hatası audit fail-closed zincirini bozmaz"** — alert sink'i patlarken audit olayının başarıyla işlendiğini (hatasız çözüldüğünü) doğruluyor.
5. (describe: "TamperLogger — alertRules (T6.7)") **"close alert sink'lerini kapatır"** — `close()`'un alert sink'lerinin close'unu da çağırdığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/tamper-logger/src/types.test.ts` (`6 test`)
**Hedef:** tamper-logger tip sözleşmesi — `LogLevel`/`LogCategory` birlikleri, `isLogLevel`/`isLogCategory` doğrulayıcıları, `LogEventInput` (serbest string `eventCode`, zincir alanları YOK) ve `LogEvent` çıktısı (ts/seq/prevHash/signature zorunlu).

1. (describe: "tamper-logger tip sözleşmesi") **"LogLevel birliği 5 seviyeden oluşur"** — `LOG_LEVELS`'in debug/info/warn/error/fatal taşıdığını ve `LogLevel` tipinin bu birliğe eşit olduğunu doğruluyor.
2. (describe: "tamper-logger tip sözleşmesi") **"LogCategory birliği 3 kategoriden oluşur"** — `LOG_CATEGORIES`'in app/audit/security taşıdığını ve `LogCategory` tipinin bu birliğe eşit olduğunu doğruluyor.
3. (describe: "tamper-logger tip sözleşmesi") **"isLogLevel geçerli/geçersiz değerleri ayırır"** — `isLogLevel`'in "warn"ı kabul edip "verbose"/boş string'i reddettiğini doğruluyor.
4. (describe: "tamper-logger tip sözleşmesi") **"isLogCategory geçerli/geçersiz değerleri ayırır"** — `isLogCategory`'nin "audit"i kabul edip "system"i reddettiğini doğruluyor.
5. (describe: "tamper-logger tip sözleşmesi") **"LogEventInput zorunlu alanları taşır; zincir alanları yoktur"** — girdi sözleşmesinin serbest string `eventCode` taşıdığını ve seq'in girdide olmadığını doğruluyor.
6. (describe: "tamper-logger tip sözleşmesi") **"LogEvent çıktısı zincir alanlarını zorunlu taşır"** — çıktının ts/seq/prevHash/signature alanlarını zorunlu taşıdığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

## 7. packages/platform — messaging · container-access · logging

### `packages/platform/messaging/src/platform-message-queue.test.ts` (`24 test`)
**Hedef:** `PlatformMessageQueue` — IMessageQueue sözleşmesinin sistem implementasyonu; JobType'ı bilen TEK yer (QUEUE_NAMES + JOB_RETRY_OPTIONS). Generic `BullMQAdapter`/`BullMQQueue` (core) üzerine kuruludur (bkz. docs/roadmap/mesajlasma-katmanlari.md).

1. (describe: "PlatformMessageQueue retry haritası (T0.12)") **"harita politika değerlerini taşır"** — `JOB_RETRY_OPTIONS` sabitinin 6 job tipi için 1/5/3/1/2/3 attempts değerlerini taşıdığını doğruluyor.
2. (describe: "PlatformMessageQueue retry haritası (T0.12)") **"READ_DEVICE kuyruğu attempts:1 ile açılır (poll = doğal retry)"** — `addJob` READ_DEVICE tipinde kuyruğun attempts:1 ile oluşturulduğunu doğruluyor.
3. (describe: "PlatformMessageQueue retry haritası (T0.12)") **"WRITE_TELEMETRY kuyruğu attempts:5 + backoff ile açılır"** — `addJob` WRITE_TELEMETRY tipinde attempts:5 + exponential backoff 1000 ms ile kuyruk oluşturulduğunu doğruluyor.
4. (describe: "PlatformMessageQueue retry haritası (T0.12)") **"her tip kendi seçenekleriyle açılır"** — tüm 6 job tipi için açılan kuyrukların attempts değerinin haritadaki beklentiyle eşleştiğini doğruluyor.
5. (describe: "PlatformMessageQueue config enjeksiyonu") **"queueNames override: Queue + QueueEvents + Worker özel adla açılır"** — `queueNames` override'ının üç kaynağı da özel adla kurduğunu, verilmeyen tiplerin varsayılan adı kullandığını doğruluyor.
6. (describe: "PlatformMessageQueue config enjeksiyonu") **"retryOptions override kuyruğa işlenir (tip başına TAM değiştirme)"** — `retryOptions` override'ının yalnızca o tipin seçeneklerini değiştirdiğini doğruluyor.
7. (describe: "PlatformMessageQueue config enjeksiyonu") **"bilinmeyen JobType anahtarları yok sayılır"** — config'teki bilinmeyen anahtarın sessizce yok sayılıp varsayılanların geçerli kaldığını doğruluyor.
8. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"addJob delay seçeneğini iletir"** — `addJob` delay opsiyonunun bullmq `queue.add`'a iletildiğini doğruluyor.
9. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"executeAndWait: başarılı nesne sonucu döner"** — `executeAndWait` waitUntilFinished nesne döndüğünde sonucu aynen döndürüyor mu kontrol ediyor.
10. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"executeAndWait: nesne olmayan sonuç → { success: true }"** — sonuç nesne değilse `{ success: true }` döndürdüğünü doğruluyor.
11. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"executeAndWait: timeout/hatada → { success: false, reason }"** — waitUntilFinished reddedince throw ETMEDEN `{ success: false, reason }` döndürdüğünü doğruluyor.
12. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"addRepeatableJob: pattern + jobId formatı"** — `addRepeatableJob`'un `{ pattern }` ve `${type}-${deviceId}-${name}` jobId formatıyla eklediğini doğruluyor.
13. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"addRepeatableJobEvery: startDate'li ve startDate'siz"** — `addRepeatableJobEvery`'in startDate verilmeden `{ every }` ve verilince `{ every, startDate }` ürettiğini doğruluyor.
14. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"registerWorkerFor: doğru ad + concurrency; onCompleted/onFailed bağlanır"** — worker'ın doğru kuyruk adı/concurrency ile kurulup completed/failed event'lerinin callback'lere bağlandığını ve processor'ın DeviceJob ile çağrıldığını doğruluyor.
15. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"registerWorker: 6 tip için worker kurulur"** — `registerWorker`'ın tüm 6 tip için varsayılan adlarla worker kurduğunu doğruluyor.
16. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"worker error eventi konsola yazılır"** — worker "error" eventinin kuyruk adıyla console.error'a yazıldığını doğruluyor.
17. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"queueStatus: kuyruklar JobType adıyla döner"** — `queueStatus`'ın açılmış kuyrukların sayaçlarını `name` = JobType ile döndürdüğünü doğruluyor.
18. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"queueStatus: reddedilen sayaç 0 sayılır (allSettled — kademeli bozulma)"** — bir sayacın reddedilmesinin yalnızca o sayacı 0 yapıp diğerlerini koruduğunu doğruluyor.
19. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"queueStats: bilinen tip durum döner, bilinmeyen tip null"** — `queueStats`'ın açılmış tip için durum, açılmamış tip için null döndürdüğünü doğruluyor.
20. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"health: ping false → false"** — redis ping'i başarısızsa health false döndürüyor mu kontrol ediyor.
21. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"health: ping true + READ_DEVICE kuyruğu → true"** — ping ok + READ_DEVICE kuyruğu jobCounts başarılıysa true döndürüyor mu kontrol ediyor.
22. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"health: ping true + kuyruk yok → true"** — ping ok ama READ_DEVICE kuyruğu açılmamışsa true döndürüyor mu kontrol ediyor.
23. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"health: getJobCounts hatası → false"** — getJobCounts hatasının health'i false'a çektiğini doğruluyor.
24. (describe: "PlatformMessageQueue yüzeyi (IMessageQueue)") **"close: tüm worker/queueEvents/queue close'ları çağrılır"** — `close()`'un üç kaynağın da close'unu çağırdığını doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.


### `packages/platform/logging/src/event-codes.test.ts` (`3 test`)
**Hedef:** GD-PMS olay sözlüğü — `LOG_EVENT_CODES` kapalı kümesi + `isLogEventCode` doğrulayıcısı (TamperLogger `eventCodeValidator` enjeksiyon noktasına bağlanır).

1. (describe: "GD-PMS olay sözlüğü") **"kayıtlı kodlar doğrulanır"** — `isLogEventCode`'un sözlükteki kodları (login_locked, device_alarm, service_started, audit_sink_failure) kabul ettiğini doğruluyor.
2. (describe: "GD-PMS olay sözlüğü") **"bilinmeyen kodlar reddedilir"** — sözlükte olmayan string'lerin reddedildiğini doğruluyor.
3. (describe: "GD-PMS olay sözlüğü") **"küme boş değildir ve benzersizdir"** — sözlüğün 30+ kod içerdiğini ve tekrarsız olduğunu doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/platform/logging/src/logger-config.test.ts` (`8 test`)
**Hedef:** Logger tier config (platform) — tier bazlı logger varsayılanları (`TIER_LOGGER_DEFAULTS`) ve `loggerConfigForTier` birleşimi. (core'dan taşındı — bkz. platform-paket-yapisi.md Aşama 2.)

1. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"üç tier için de tanımlıdır"** — container/field/boss üçü için de tier varsayılanının tanımlı olduğunu doğruluyor.
2. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"container: console + file (timescale YOK)"** — container tier sink listesinin console+file içerip timescale içermediğini doğruluyor.
3. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"field: console + file + timescale"** — field tier sink listesinin üç sink'i de içerdiğini doğruluyor.
4. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"boss: console + file + timescale"** — boss tier sink listesinin üç sink'i de içerdiğini doğruluyor.
5. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"tüm tier'ların signingKeyPath'i doludur"** — üç tier'ın da boş olmayan signingKeyPath taşıdığını doğruluyor.
6. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"override'sız tier varsayılanını döner"** — `loggerConfigForTier("container")`'ın varsayılanı aynen döndürdüğünü doğruluyor.
7. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"override alanları tier varsayılanını ezer"** — level/batchSize override'larının varsayılanı ezip sink'leri koruduğunu doğruluyor.
8. (describe: "LoggerConfig tier varsayılanları (T0.5)") **"sink listesi override edilebilir"** — sinks override'ının tier sink listesini değiştirdiğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.


## 8. packages/ws-tunnel — çoklanmış WS tüneli (2026-09-01 ayrıldı)

NOT: `errors` (Result + DomainError) 2026-09-01'de YAPRAK PAKETE taşındı — `@gd-monorepo/result` (bkz. bölüm 1). Yeni sözleşmeler: `channel` (ISocketClient/Factory + ITunnelChannel/IFieldChannel), `token` (ITokenSigner), `audit` (IAuditSink), `snapshot` (ISnapshotSource), `types` (jenerik `TunnelRole`/`TunnelUser`/`TunnelTelemetryPoint` — Faz B: shared-types bağımlılığı söküldü). Monorepo adapter testleri web-service'te: `jose-token-signer.test.ts` (4), `container-proxy-field-channel.test.ts` (4), `fastify-stream-sink.test.ts` (3), `session-audit.test.ts` (5), `realtime-snapshot-source.test.ts` (6), `session-user-map.test.ts` (3).

### `packages/ws-tunnel/src/demo/loopback.spec.ts` (`5` test — Faz B, 2026-09-01)
**Hedef:** Paket içi loopback uçtan uca — monorepo'ya hiç değmez (ContainerProxy/Fastify/PG YOK): `FieldHarness` (paket içi field ucu) ↔ FieldConnector + TunnelClient ↔ Gateway + TunnelProxy tek gerçek WS kanalında. Aynı akış `examples/loopback-demo.mjs` ile gözle de koşulur (6/6 PASS).

1. (describe: "loopback uçtan uca (paket içi — ContainerProxy'siz)") **"FieldConnector field'a kaydolur (register-ack → connected)"** — gerçek WS register turu connected'a ulaşır.
2. (describe: "loopback uçtan uca") **"open-session → ack + kayıt + audit"** — konteyner JWT'si üretilir, ack döner, IAuditSink.open çağrılır.
3. (describe: "loopback uçtan uca") **"GET / → SPA HTML akar (FIN ile biter)"** — tünel HTTP akışı 200 + HTML gövdesi IStreamSink'e akar.
4. (describe: "loopback uçtan uca") **"GET /api/data/latest → JSON akar (K3.2)"** — API yönlendirmesi JSON döner.
5. (describe: "loopback uçtan uca") **"/ws köprüsü çift yönlü WS_OP mesajı taşır"** — echo upstream üzerinden çift yönlü WS köprüsü.

[DOSYA NOTU] Yok — paket bağımsızlık kanıtı; monorepo entegrasyonu ayrıca `web-service/tunnel.spec.ts`'te.

### `packages/ws-tunnel/src/protocol/messages.test.ts` (`27 test` — shared-types'tan taşındı 2026-09-01)
**Hedef:** FieldConnector kontrol kanalı sözleşmesi — durum makineleri, operational config şeması ve kontrol mesajı tipleri (T2.0).

1. (describe: "FIELD_PROTOCOL_VERSION") **"1'dir — sürümlü protokol (tasarım §12.3)"** — protokol sürüm sabitinin 1 olduğunu doğruluyor.
2. (describe: "fieldOperationalConfigSchema") **"tam config'i kabul eder"** — iki interval alanıyla tam config'in parse edildiğini doğruluyor.
3. (describe: "fieldOperationalConfigSchema") **"kısmi config'i kabul eder (yalnızca heartbeat)"** — yalnızca heartbeatIntervalMs verilen config'de telemetryIntervalMs undefined olduğunu doğruluyor.
4. (describe: "fieldOperationalConfigSchema") **"boş config'i kabul eder (tüm alanlar opsiyonel)"** — boş nesnenin parse edildiğini doğruluyor.
5. (describe: "fieldOperationalConfigSchema") **"bilinmeyen anahtarları strip eder — ileri uyumluluk"** — sessionLimit/pathAllowlist gibi bilinmeyen anahtarların strip edildiğini doğruluyor.
6. (describe: "fieldOperationalConfigSchema") **"1000 ms altını reddeder"** — heartbeatIntervalMs=999'un throw ettiğini doğruluyor.
7. (describe: "fieldOperationalConfigSchema") **"300000 ms üstünü reddeder"** — telemetryIntervalMs=300001'in throw ettiğini doğruluyor.
8. (describe: "fieldOperationalConfigSchema") **"ondalıklı değeri reddeder"** — 15.5 gibi ondalıklı değerin throw ettiğini doğruluyor.
9. (describe: "fieldOperationalConfigSchema") **"tip uyuşmazlığını reddeder"** — "fast" string değerinin throw ettiğini doğruluyor.
10. (describe: "DEFAULT_FIELD_OPERATIONAL_CONFIG") **"heartbeat 15 sn — tasarım §4.3"** — varsayılan heartbeat aralığının 15000 ms olduğunu doğruluyor.
11. (describe: "DEFAULT_FIELD_OPERATIONAL_CONFIG") **"telemetry 15 sn"** — varsayılan telemetri aralığının 15000 ms olduğunu doğruluyor.
12. (describe: "DEFAULT_FIELD_OPERATIONAL_CONFIG") **"dondurulmuştur (immutable)"** — sabitin Object.isFrozen olduğunu doğruluyor.
13. (describe: "isContainerConnectionState") **"geçerli durumları tanır"** — idle/connected/stale/error dördünün true döndürdüğünü doğruluyor.
14. (describe: "isContainerConnectionState") **"geçersiz durumları reddeder"** — "connecting"/"nope"/"" için false döndürdüğünü doğruluyor.
15. (describe: "kontrol mesajı tipleri (discriminated union)") **"RegisterMessage alanlarını sabitler"** — register mesajının containerId/containerUrl/protocolVersion alanlarını compile-time sabitlediğini doğruluyor.
16. (describe: "kontrol mesajı tipleri (discriminated union)") **"RegisterAckMessage opsiyonel config taşır"** — register-ack'in opsiyonel operational config taşıyabildiğini doğruluyor.
17. (describe: "kontrol mesajı tipleri (discriminated union)") **"HeartbeatMessage ms timestamp taşır"** — heartbeat'in pozitif ms timestamp taşıdığını doğruluyor.
18. (describe: "kontrol mesajı tipleri (discriminated union)") **"TelemetryMessage TelemetryData dizisi taşır"** — telemetry mesajının TelemetryData[] tipinde data taşıdığını compile-time doğruluyor.
19. (describe: "kontrol mesajı tipleri (discriminated union)") **"ConfigUpdateMessage tam config taşır"** — config-update mesajının config alanı taşıdığını doğruluyor.
20. (describe: "kontrol mesajı tipleri (discriminated union)") **"ErrorMessage kod + mesaj taşır"** — error mesajının snake-case kod formatı taşıdığını doğruluyor.
21. (describe: "kontrol mesajı tipleri (discriminated union)") **"StreamOpenMessage akış açılışını taşır (§5.2)"** — stream-open mesajının streamId/sessionId/method/path alanlarını compile-time sabitlediğini doğruluyor.
22. (describe: "kontrol mesajı tipleri (discriminated union)") **"StreamOpenMessage upgrade bayrağı WS köprüsü taşır (§5.3)"** — stream-open'in upgrade:"websocket" bayrağı taşıyabildiğini doğruluyor.
23. (describe: "kontrol mesajı tipleri (discriminated union)") **"OpenSessionMessage eşlenmiş konteyner rolü taşır (§5.5)"** — open-session mesajının eşlenmiş kullanıcı rolü taşıdığını doğruluyor.
24. (describe: "kontrol mesajı tipleri (discriminated union)") **"OpenSessionAckMessage konteyner JWT + süre taşır"** — open-session-ack'in token + pozitif expiresInSec taşıdığını doğruluyor.
25. (describe: "durum tipi birlikleri") **"FieldConnectorState 5 durumludur"** — konteyner durum makinesinin 5 durumu taşıdığını doğruluyor.
26. (describe: "durum tipi birlikleri") **"FieldOperationalConfig yalnızca iki opsiyonel alan taşır"** — config tipinin yalnızca iki opsiyonel interval alanı taşıdığını compile-time doğruluyor.
27. (describe: "durum tipi birlikleri") **"ContainerConnectionState transport ConnectionState'ından ayrıdır"** — field tarafı görünümünün "connecting" içermediğini compile-time doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/proxy/tunnel-proxy.test.ts` (`34` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `TunnelProxy` (+`containerSessionCookie`, `isPathAllowed`) — field tarafı tünel proxy: cookie çözümleme, path allowlist, HTTP akışı (ack/gövde/FIN/RST/kredi), WS köprüsü ve sweep.

1. (describe: "containerSessionCookie") **"cookie başlığından değeri çözer"** — `a=1; container_session=xyz; b=2` başlığından "xyz" döner.
2. (describe: "containerSessionCookie") **"yoksa undefined"** — cookie yoksa veya başlık undefined ise undefined döner.
3. (describe: "containerSessionCookie") **"bozuk parçalar atlanır"** — `=` içermeyen parçalar atlanır, geçerli parça bulunur.
4. (describe: "isPathAllowed (§5.6)") **"izinli: %s"** (it.each — 5 durum) — `/`, `/api/data/x`, `/ws/telemetry`, `/assets/app.js`, `/favicon.ico` yolları izinlidir.
5. (describe: "isPathAllowed") **"yasaklı: %s"** (it.each — 5 durum) — `/api/auth/login`, `/api/auth/refresh`, `/api/auth/users`, `/etc/passwd` ve query'li users yolu reddedilir.
6. (describe: "TunnelProxy HTTP akışı (T3.3)") **"ack → writeHead + gövde frame'leri + FIN → end"** — stream-open gönderilir, ack sonrası writeHead(200, headers) çağrılır, binary frame'ler "hello" olarak birleşir, başlangıç stream-window kredisi gönderilir ve FIN'de end çağrılır.
7. (describe: "TunnelProxy HTTP akışı") **"RST → destroy"** — RST bayraklı binary frame yanıtı destroy eder.
8. (describe: "TunnelProxy HTTP akışı") **"ack gelmezse (timeout) hiçbir şey yazılmaz"** — 10 sn'de ack gelmeyen akışta writeHead hiç çağrılmaz.
9. (describe: "TunnelProxy HTTP akışı") **"tarayıcı kopması → stream-close"** — raw response close olayında `stream-close {reason:"client-abort"}` gönderilir.
10. (describe: "TunnelProxy HTTP akışı") **"kredi: YARI pencere eşiğinde yeni stream-window gönderilir"** — windowSize=10'da 6+6+1 bayt tüketimi ≥3 stream-window kredisi üretir.
11. (describe: "TunnelProxy HTTP akışı") **"kredi DEADLOCK KORUMASI: pencere altı tüketimde bile kredi yenilenir"** — 9 bayt (< pencere 10) tüketiminde yarı eşik geçilince kredi gönderilir (≥2).
12. (describe: "TunnelProxy HTTP akışı") **"authenticate: geçersiz cookie → undefined"** — bilinmeyen/eksik cookie veya yanlış containerId undefined, geçerli eşleşme tanımlı oturum döner.
13. (describe: "TunnelProxy HTTP akışı") **"requestBody → BINARY frame'ler + FIN gönderilir"** — POST gövdesi tek FIN'li binary frame olarak konteynere gider.
14. (describe: "TunnelProxy HTTP akışı") **"konteyner stream-close (http) → yanıt destroy edilir"** — field'dan gelen stream-close yanıtı destroy eder.
15. (describe: "TunnelProxy HTTP akışı") **"malform binary frame yok sayılır"** — 2 baytlık geçersiz frame throw etmeden yok sayılır.
16. (describe: "TunnelProxy HTTP akışı") **"akış tavanı dolunca stream açılmaz (writeHead yok)"** — maxStreams=1'de ikinci akışın yanıtına writeHead yapılmaz.
17. (describe: "TunnelProxy HTTP akışı") **"sweep: boşta kalan http akışı kapatılır"** — idleTimeout 30 sn dolunca sweep yanıtı destroy eder.
18. (describe: "TunnelProxy HTTP akışı") **"logger varken akış kapanışı security kanalına düşer"** — stream kapanışı `category:"security"` + streamId bağlamıyla loglanır.
19. (describe: "TunnelProxy WS köprüsü (T3.3)") **"101 ack → köprü açılır; WS_OP frame tarayıcıya iletilir"** — ack 101 ile köprü kurulur, gelen WS_OP text frame tarayıcıya text olarak iletilir.
20. (describe: "TunnelProxy WS köprüsü") **"tarayıcı mesajı WS_OP frame'i olarak konteynere gider"** — `sendWsToContainer` text mesajı WS_OP + Text opcode'lu frame üretir.
21. (describe: "TunnelProxy WS köprüsü") **"konteyner stream-close → tarayıcı kapatılır"** — gelen stream-close tarayıcı soketini kapatır.
22. (describe: "TunnelProxy WS köprüsü") **"ack 101 değilse tarayıcı 1013 ile kapatılır"** — 503 ack'inde tarayıcı soketi close(1013) alır.
23. (describe: "TunnelProxy WS köprüsü") **"closeWs → stream-close kontrolü gönderilir"** — `closeWs(streamId, reason)` karşı tarafa stream-close frame'i gönderir.
24. (describe: "TunnelProxy WS köprüsü") **"RST frame → tarayıcı 1011 ile kapatılır"** — RST bayraklı frame tarayıcıyı close(1011) ile kapatır.
25. (describe: "TunnelProxy WS köprüsü") **"binary tarayıcı mesajı Binary opcode taşır"** — binary `sendWsToContainer` WS_OP + Binary opcode üretir.
26. (describe: "TunnelProxy WS köprüsü") **"bilinmeyen streamId'ye WS mesajı yok sayılır"** — 999 streamId'ye send/close throw etmez.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/proxy/session-gateway.test.ts` (`10` test — web-service'ten taşındı 2026-09-01; SessionAudit kısmı monorepo `session-audit.test.ts`'e)
**Hedef:** `ContainerSessionGateway` (+`mapFieldRole`, `SessionAudit`) — open-session ack akışı, birebir rol eşlemesi, 1-oturum limiti ve fail-closed audit.

1. (describe: "mapFieldRole (§5.5 — 2026-08-30 birebir)") **"tüm roller aynen taşınır (birebir eşleme)"** — admin/teknik/boss/guest/developer field rolünden konteyner rolüne aynen eşlenir.
2. (describe: "ContainerSessionGateway (T3.3)") **"2026-08-30: guest oturum AÇABİLİR — konteyner rolü guest (birebir)"** — guest kullanıcı open-session→ack döngüsünü tamamlar, dönen containerRole "guest"tir.
3. (describe: "ContainerSessionGateway") **"konteyner bağlı değilse 503 (TransientError)"** — bağlı olmayan konteynere openSession transient hata döner.
4. (describe: "ContainerSessionGateway") **"ikinci açılış eskisini 'replaced' ile kapatır ve yenisini açar (Faz 5)"** — aynı konteynere ikinci oturum açılışı eskisine session-end(replaced) gönderir ve aktif sayı 1 kalır.
5. (describe: "ContainerSessionGateway") **"ack zaman aşımı → 503 (TransientError)"** — 1000 ms içinde ack gelmeyen oturum transient hatayla sonuçlanır.
6. (describe: "ContainerSessionGateway") **"audit hatası → fail-closed (oturum açılmaz, FatalError)"** — audit sink'i hata verirse oturum açılmaz, fatal hata döner, aktif sayı 0 kalır.
7. (describe: "ContainerSessionGateway") **"closeSession → session-end frame + audit close + kayıt düşer"** — `closeSession` session-end gönderir, `UPDATE session_audit` çalışır, kayıt silinir.
8. (describe: "ContainerSessionGateway") **"sweep süresi dolan oturumu session-end ile kapatır"** — 4 saat TTL sonrası sweep oturumu `expired` nedeniyle kapatır.
9. (describe: "ContainerSessionGateway") **"sessionForContainer acik oturumu konteyner kimligiyle bulur"** — kayıtlı oturum döner, bilinmeyen konteyner undefined.
10. (describe: "ContainerSessionGateway") **"sessionByToken kayıtlı oturumu döner"** — token ile oturum bulunur, bilinmeyen token undefined.
11. (describe: "SessionAudit (T3.4)") **"ensureSchema session_audit DDL'ini kurar"** — `CREATE TABLE IF NOT EXISTS session_audit` execute edilir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/session/session-store.test.ts` (`10` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `ContainerSessionStore` (+`ContainerSessionTokenAdapter`) — konteyner tarafı oturum JWT'si, TTL/idle sweep, iptal.

1. (describe: "ContainerSessionStore (T3.3)" > "open() / authenticate()") **"open → token doğrulanır, kullanıcı + rol döner"** — `open` 4 saatlik expiresInSec döner ve `authenticate` kullanıcıyı geri verir.
2. (describe: "open() / authenticate()") **"geçersiz token undefined döner"** — bozuk token authenticate'te undefined.
3. (describe: "open() / authenticate()") **"tahrifli token (farklı secret) undefined döner"** — başka secret ile imzalanmış geçerli-biçim token reddedilir.
4. (describe: "open() / authenticate()") **"bilinmeyen sessionId'li geçerli-imza token da reddedilir"** — doğru secret ama kayıtsız sessionId reddedilir.
5. (describe: "end()") **"iptal sonrası authenticate undefined döner"** — `end` sonrası token geçersizleşir ve activeCount 0 olur.
6. (describe: "TTL + idle sweep") **"4 saat TTL dolunca oturum kapanır"** — sweep TTL dolan oturumu kapatır.
7. (describe: "TTL + idle sweep") **"15 dk idle → oturum kapanır; aktivite süreyi uzatır"** — authenticate aktivitesi idle sayacını tazeler, son aktiviteden 15 dk sonra sweep kapatır.
8. (describe: "TTL + idle sweep") **"sweep TTL'den önce oturumu kapatmaz"** — 3 saatte sweep oturumu korur.
9. (describe: "TTL + idle sweep") **"activeCount açık oturum sayısını döner"** — iki açılışta 2, end sonrası 1 döner.
10. (describe: "role eşlemesi passthrough") **"field'da eşlenen konteyner rolü korunur"** — admin rolü authenticate'te aynen korunur.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/session/container-session-server.test.ts` (`3` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `ContainerSessionServer` — konteyner tarafı open-session/session-end kontrol frame işleyicisi.

1. (describe: "ContainerSessionServer (T3.3)") **"open-session → open-session-ack (token + expiresInSec)"** — gelen open-session'a 4 saatlik token'lı ack döner ve store authenticate edebilir.
2. (describe: "ContainerSessionServer") **"session-end → kayıt düşer"** — session-end sonrası activeCount 0'a düşer.
3. (describe: "ContainerSessionServer") **"bilinmeyen mesaj tipleri yok sayılır"** — stream-window gibi mesajlar yanıt üretmez.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/client/tunnel-client.test.ts` (`25` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `TunnelClient` — konteyner tarafı tünel istemcisi: loopback fetch/WS köprüsü, kredi bazlı backpressure, limitler, hata yolları.

1. (describe: "TunnelClient (T3.2)" > "HTTP akışı") **"stream-open → ack (durum + başlıklar) → gövde frame'leri + FIN"** — stream-open sonrası 200 ack, "hello" gövdesi frame'lerle akar ve son frame FIN taşır.
2. (describe: "HTTP akışı") **"yönlendirme: /api/* → web-service, diğer → statik"** — `/api/x` web-service'e, `/index.html` statik upstream'e gider.
3. (describe: "HTTP akışı") **"backpressure: kredi olmadan gövde gönderilmez, krediyle akar"** — kredisiz ack'ten sonra 0 frame; 64 bayt krediyle ilk parça (FIN'siz), kalan krediyle 100 bayt + FIN.
4. (describe: "HTTP akışı") **"POST gövdesi: BINARY frame'ler + FIN → fetch body"** — gelen gövde frame'i fetch request body'sine dönüşür.
5. (describe: "HTTP akışı") **"upstream 404 → ack 404"** — upstream durum kodu ack'e taşınır.
6. (describe: "HTTP akışı") **"akış tavanı aşılınca 503 + stream-close"** — maxStreams=2'de üçüncü akış 503 ack + stream-close alır.
7. (describe: "HTTP akışı") **"field stream-close → akış iptal edilir"** — iptal sonrası yeni frame üretilmez.
8. (describe: "WS köprüsü (upgrade)") **"upgrade → 101 ack + çift yönlü WS_OP frame'leri"** — WS köprüsü kurulur, WS_OP text frame upstream'e text olarak gider, echo WS_OP frame olarak geri gelir.
9. (describe: "WS köprüsü") **"loopback WS kapanınca stream-close gönderilir"** — karşı uç kapanınca field'a stream-close iletilir.
10. (describe: "WS köprüsü") **"boşta kalan akış idle timeout ile kapatılır"** — 31 sn boşta kalan köprü stream-close üretir.
11. (describe: "kapsama (hata yolları + limitler)") **"bilinmeyen streamId'li window/close/binary yok sayılır"** — bilinmeyen streamId ve malform frame'ler sessizce yok sayılır.
12. (describe: "kapsama") **"kredi bekleyen akış stream-close ile temiz kapanır"** — kredisiz bekleyen akış iptal sonrası frame üretmez.
13. (describe: "kapsama") **"ack sonrası kredi beklerken kapanma → çökme/çıkış frame'i yok"** — ack sonrası stream-close frame sızıntısı üretmez.
14. (describe: "kapsama") **"gövde ortasında kapanma → akış durur (abort)"** — gövde akarken iptal frame üretimini durdurur.
15. (describe: "kapsama") **"upstream erişilemez → ack 502 + stream-close"** — bağlantı hatasında 502 ack + stream-close.
16. (describe: "kapsama") **"gövdesiz yanıt (204) → yalnızca FIN frame"** — 204 yanıtı tek boş-FIN frame üretir.
17. (describe: "kapsama") **"istek gövdesi tavan aşımı → RST + stream-close"** — maxRequestBody aşımında RST frame + `request-body-too-large` stream-close.
18. (describe: "kapsama") **"GET akışında gövde frame'i yok sayılır"** — GET'te gelen gövde frame'i ignore edilir, yanıt normal akar.
19. (describe: "kapsama") **"upstream gövde ortasında koparsa stream-close fetch-error"** — gövde ortasında destroy stream-close(fetch-error) üretir.
20. (describe: "kapsama") **"WS köprüsü: WS olmayan upstream → stream-close ws-error"** — WS upgrade'i desteklemeyen upstream ws-error ile kapatılır.
21. (describe: "kapsama") **"WS köprüsü: binary opcode upstream'e binary iletilir"** — WS_OP Binary frame'i upstream'e isBinary olarak gider.
22. (describe: "kapsama") **"kapanmış akışa gelen WS_OP frame'i yok sayılır"** — stream-close sonrası geç frame throw etmez.
23. (describe: "TunnelClient (T3.2)" — üst seviye) **"FIN sonrası akış temizlenir — sıradaki stream-open 503 ALMAZ (sızıntı regresyonu)"** — tamamlanan akış tavan sayacından düşer, ikinci akış 200 ack alır.
24. (describe: "TunnelClient" — üst seviye) **"gzip basliklari ack'e TASINMAZ (content-encoding/content-length strip)"** — ack headers'ta content-encoding ve content-length bulunmaz, content-type kalır.
25. (describe: "max yaş sweep") **"azami yaş dolan akış max-age ile kapatılır"** — maxAgeMs=1000 dolan köprü stream-close(max-age) üretir.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/channel/ws-socket-client.test.ts` (`9` test — adapters.test bölündü)
**Hedef:** `WsSocketClient`/`WsSocketClientFactory`/`RealtimeSnapshotSource` — ws paketi adaptörü ve anlık telemetri görüntü kaynağı.

1. (describe: "WsSocketClient (T2.1c)") **"send/ping/close raw'a delege edilir"** — üç komut da raw ws'e birebir iletilir.
2. (describe: "WsSocketClient") **"message olayı string'e çevrilir"** — Buffer payload string olarak callback'e verilir.
3. (describe: "WsSocketClient") **"open/close/error/pong olayları birebir kablolanır"** — dört olayın her biri birer kez iletilir.
4. (describe: "WsSocketClient") **"unexpected-response → statusCode (yoksa 0)"** — pre-upgrade ret 401 olarak, statusCode yoksa 0 olarak iletilir.
5. (describe: "WsSocketClient") **"readyState %s → '%s'"** (it.each — 4 durum) — ws readyState 0→connecting, 1→open, 2→closing, 3→closed eşlemesi doğrudur.
6. (describe: "WsSocketClientFactory (T2.1c)") **"creator'ı url + headers ile çağırır ve sarar"** — factory creator'u doğru argümanlarla çağırır, dönen client send'i delege eder.
7. (describe: "RealtimeSnapshotSource (T2.1c)") **"her cihazın en yeni değerlerini döndürür"** — online cihazların buffer'ındaki (deviceId,name) başına en yeni kayıtlar döner.
8. (describe: "RealtimeSnapshotSource") **"(deviceId, name) başına ilk görülen (en yeni) korunur"** — aynı isimdeki eski değerler elenir, yalnızca en yeni kalır.
9. (describe: "RealtimeSnapshotSource") **"bozuk kayıtları eler"** — deviceId'siz/null/string kayıtlar atlanır, geçerli kayıtlar kalır.
10. (describe: "RealtimeSnapshotSource") **"SQL hatası → boş dizi (kademeli bozulma)"** — devices sorgusu hatasında boş dizi döner.
11. (describe: "RealtimeSnapshotSource") **"tek cihazın Redis hatası diğerlerini etkilemez"** — hatalı cihaz atlanır, sağlam cihaz verisi döner.
12. (describe: "RealtimeSnapshotSource") **"cihaz yoksa boş dizi döner"** — cihaz listesi boşsa boş dizi döner.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/connector/field-connector.spec.ts` (`7` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `FieldConnector` ↔ field WS integration (gerçek ws sunucusu) — K2.1 <5 sn bağlanma, register/heartbeat/telemetry akışı, T2.5 canlı config.

1. (describe: "FieldConnector integration (gerçek WS — T2.5/K2.1)") **"K2.1: start → connected < 5 sn (gerçek WS, ölçümlü)"** — start'tan connected'a geçiş 5 sn altında, register frame'i containerId + protocolVersion:1 taşır.
2. (describe: "integration") **"heartbeat + telemetry snapshot gerçek WS üzerinden akar"** — sunucuda ≥2 heartbeat ve ≥1 telemetry frame'i (Voltage) gözlenir.
3. (describe: "integration") **"T2.5: register-ack.config aralığı canlı uygular"** — ack'teki heartbeatIntervalMs=100000 sonrası 600 ms'de yeni heartbeat üretilmez (yalnızca ilk).
4. (describe: "integration") **"T2.5: config-update frame'i heartbeat aralığını canlı değiştirir"** — config-update sonrası eski aralıkta heartbeat gelmez.
5. (describe: "integration") **"T2.5: geçersiz config-update eski aralığı korur"** — negatif aralıklı config-update reddedilir, heartbeat eski aralıkta devam eder.
6. (describe: "integration") **"WS kopunca backoff → yeniden bağlanır"** — sunucu kapatınca yeni bağlantı kurulur ve fieldConnected true olur.
7. (describe: "integration") **"stop() sonrası yeniden bağlanma olmaz"** — stop sonrası bağlantı sayısı artmaz, state "offline".

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/connector/field-connector.test.ts` (`53` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `FieldConnector` — durum makinesi (offline→connecting→registered→connected↔backoff), üstel geri çekilme, liveness, operational config, bayat soket koruması, tünel kancaları.

1. (describe: "FieldConnector (T2.1b)" > "start() / bağlanma") **"start() → connecting + ilk URL'e Bearer'lı bağlanır"** — start state'i connecting yapar, ilk wsUrls adresine Bearer token'lı soket açılır.
2. (describe: "start() / bağlanma") **"open sonrası register mesajı gönderir (containerId + protocolVersion)"** — open olayında tek `register` frame'i containerId ve protocolVersion ile gider.
3. (describe: "start() / bağlanma") **"çift start() no-op — ikinci soket açılmaz"** — ikinci start yeni soket üretmez.
4. (describe: "register-ack → connected akışı") **"ack ok → ilk heartbeat + connected + snapshot push"** — ack ok ile connected olur, ilk heartbeat (ts=0) gider ve snapshot çağrılır.
5. (describe: "register-ack → connected akışı") **"ack ok → field_connected bilgi logu"** — `field_connected` eventCode'lu log yazılır.
6. (describe: "register-ack → connected akışı") **"heartbeat her 15 sn'de bir gönderilir"** — 15 sn sonra ts'li yeni heartbeat gider ve `lastHeartbeatAt` güncellenir.
7. (describe: "register-ack → connected akışı") **"telemetri snapshot her 15 sn'de bir push edilir (boş veri push edilmez)"** — 15 sn'de heartbeat + telemetry (2 frame) gönderilir.
8. (describe: "register-ack → connected akışı") **"boş snapshot telemetry frame'i üretmez"** — boş veriyle telemetry frame'i yoktur.
9. (describe: "register-ack → connected akışı") **"snapshot hatası bağlantıyı etkilemez (kademeli bozulma)"** — snapshot reject'inde state connected kalır.
10. (describe: "backoff / yeniden bağlanma") **"connected iken WS kapanırsa backoff → 1 sn sonra yeniden bağlanır"** — kapanma state'i backoff yapar, 1 sn sonra ikinci soket açılır.
11. (describe: "backoff") **"kopuş warn logu (ws_connection_lost) üretir"** — kapanmada `ws_connection_lost` logu yazılır.
12. (describe: "backoff") **"üstel backoff: 1, 2, 4 sn (jitter 0)"** — ardışık kapanmalarda 1s→2s→4s aralıklarla yeni soketler açılır.
13. (describe: "backoff") **"başarılı bağlantı deneme sayacını sıfırlar"** — başarılı register sonrası kopuş tekrar 1 sn'den başlar.
14. (describe: "backoff") **"register timeout (10 sn) → backoff"** — 10 sn ack'siz kalan soket kapanır ve backoff'a geçer.
15. (describe: "backoff") **"register-ack rejected → backoff + security logu"** — rejected ack `ws_register_rejected` security loguyla backoff'a düşer.
16. (describe: "backoff") **"401 pre-upgrade → sıradaki URL denenir; tümü reddedilirse backoff"** — 401'de ikinci URL denenir, o da reddedilirse backoff + security logu.
17. (describe: "backoff") **"reddedilen soketin geç kapanma olayı durumu bozmaz"** — geç close olayı state'i değiştirmez.
18. (describe: "liveness (yarı-ölü bağlantı tespiti)") **"60 sn pong yoksa bağlantı kapatılır + backoff"** — livenessTimeout dolunca soket kapanır, backoff'a geçilir.
19. (describe: "liveness") **"pong gelirse bağlantı canlı kalır"** — 30 sn'de pong gelince connected korunur.
20. (describe: "liveness") **"heartbeat gönderiminde ping atılır"** — her heartbeat'te sockete ping atılır.
21. (describe: "stop()") **"connected iken stop → offline + soket kapanır + yeniden bağlanmaz"** — stop sonrası 60 sn beklenir, yeni soket açılmaz.
22. (describe: "stop()") **"stop sonrası start tekrar bağlanır"** — yeniden start connecting yapar ve yeni soket açar.
23. (describe: "stop()") **"offline durumda stop no-op"** — hiç başlatılmamış bağlantıda stop sessizdir.
24. (describe: "operational config (T2.5)") **"register-ack.config aralıkları değiştirir (heartbeat 5 sn)"** — ack config'iyle heartbeat 5 sn'ye iner.
25. (describe: "operational config") **"config-update frame'i restart'sız aralık değiştirir"** — canlı config-update heartbeat+telemetry aralıklarını anında uygular.
26. (describe: "operational config") **"geçersiz config-update reddedilir — eski aralık korunur"** — negatif aralık `field_config_rejected` logu üretir, 15 sn döngüsü bozulmaz.
27. (describe: "operational config") **"geçersiz register-ack config'i de reddedilir ama bağlantı kurulur"** — hatalı ack config'inde connected olur + `field_config_rejected` loglanır.
28. (describe: "mesaj sağlamlığı") **"malform JSON yok sayılır — çökme yok"** — bozuk JSON state'i bozmaz.
29. (describe: "mesaj sağlamlığı") **"bilinmeyen mesaj tipi yok sayılır"** — stream-open gibi mesajlar state'i değiştirmez.
30. (describe: "mesaj sağlamlığı") **"soket hatası loglanır (close olayı backoff'u yönetir)"** — error olayı state'i connecting'de bırakır.
31. (describe: "mesaj sağlamlığı") **"error frame'i loglanır"** — `error` tipi frame `ws_connection_lost` + code bağlamıyla loglanır.
32. (describe: "mesaj sağlamlığı") **"kodsuz error frame'i 'unknown' ile loglanır"** — code'suz hata "unknown"/"" bağlamıyla loglanır.
33. (describe: "mesaj sağlamlığı") **"register-ack status alanı yoksa 'unknown' ile reddedilir"** — status'suz ack backoff'a düşer, `status:"unknown"` bağlamıyla loglanır.
34. (describe: "mesaj sağlamlığı") **"403 pre-upgrade de security logu üretir"** — 403 reddi `ws_register_rejected` security logu üretir.
35. (describe: "bayat soket olayları (generation koruması)") **"bayat soketin tüm olayları yok sayılır"** — reddedilen soketten gelen open/message/close/error/pong/rejected hiçbir etki yaratmaz.
36. (describe: "bayat soket olayları") **"bayat register timeout'u yeni bağlantıyı bozmaz"** — 10 sn sonra state connecting kalır, yeni soket açıktır.
37. (describe: "stop() yarışları") **"stop sonrası geç kapanma olayı durumu bozmaz"** — stop sonrası close offline'ı korur, yeniden bağlanma yok.
38. (describe: "stop() yarışları") **"stop sonrası geç open register göndermez"** — stop sonrası open olayı frame üretmez.
39. (describe: "stop() yarışları") **"stop sonrası rejected yeniden bağlanmaz (tek URL)"** — tek URL'de stop sonrası 401 yeni bağlantı tetiklemez.
40. (describe: "stop() yarışları") **"stop sonrası rejected sıradaki URL'i denemez (çok URL)"** — çok URL'de dahi stop sonrası 401 sıradaki URL'e geçmez.
41. (describe: "snapshot yarışı ve hata biçimleri") **"snapshot beklerken bağlantı koparsa telemetri gönderilmez"** — kopuş sonrası resolve olan snapshot telemetry frame'i üretmez.
42. (describe: "snapshot yarışı") **"Error olmayan snapshot hatası da loglanır"** — string reject `telemetry_push_failed` + error bağlamıyla loglanır.
43. (describe: "logger'sız çalışma") **"log çağrıları atlanır — çökme yok"** — logger'sız bağlantı kopuş/backoff akışı çalışır.
44. (describe: "tünel kanal kancaları (Faz 3)") **"bilinmeyen kontrol mesajı abonelere iletilir"** — open-session mesajı `onMessage` abonesine ulaşır.
45. (describe: "tünel kanal kancaları") **"unsubscribe sonrası iletilmez"** — unsubscribe edilen aboneye mesaj gitmez.
46. (describe: "tünel kanal kancaları") **"sendControl JSON text frame gönderir"** — kontrol mesajı JSON text frame olarak gider.
47. (describe: "tünel kanal kancaları") **"sendBinary ham binary frame gönderir"** — binary kanala ham buffer yazılır.
48. (describe: "tünel kanal kancaları") **"gelen binary frame abonelere iletilir"** — `onBinaryFrame` abonesi ham frame'i alır.
49. (describe: "tünel kanal kancaları") **"bağlı değilken sendControl/sendBinary no-op"** — hiç bağlanmamış bağlantıda send çağrıları soket üretmez.
50. (describe: "constructor doğrulaması") **"boş URL listesi reddedilir"** — `wsUrls: []` constructor'da throw.
51. (describe: "constructor doğrulaması") **"boş token reddedilir"** — whitespace token throw.
52. (describe: "constructor doğrulaması") **"boş containerId reddedilir"** — boş containerId throw.
53. (describe: "constructor doğrulaması") **"pozitif olmayan aralıklar reddedilir"** — 0/-1 heartbeat/telemetry aralıkları throw.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/connector/reconnect-delay.test.ts` (`13` test — web-service'ten taşındı 2026-09-01)
**Hedef:** `ReconnectDelay` — üstel geri çekilme hesabı: exp(2^n·1s)+jitter, 60 sn tavan, config doğrulaması.

1. (describe: "ReconnectDelay (T2.1a)" > "delayFor()") **"attempt 1 → taban gecikme (1000 ms)"** — ilk deneme taban gecikmeyi döner.
2. (describe: "delayFor()") **"üstel büyür: 1→1000, 2→2000, 3→4000, 4→8000"** — denemeler iki kat büyür.
3. (describe: "delayFor()") **"60 sn tavanına takılır (attempt 7: 64000 → 60000)"** — hesaplanan değer tavana kırpılır.
4. (describe: "delayFor()") **"tavan üstü attempt'lerde de tavanı korur (attempt 100)"** — çok yüksek denemede tavan korunur.
5. (describe: "delayFor()") **"jitter'ı ekler (deterministik jitter 0.5 → +500 ms)"** — jitter×jitterSpanMs gecikmeye eklenir.
6. (describe: "delayFor()") **"jitter tavanı ezemez"** — 0.999 jitter'da dahi sonuç 60000'dir.
7. (describe: "delayFor()") **"jitter [0,1) dışında ise reddeder"** — 1.5 dönen jitter throw eder.
8. (describe: "delayFor()") **"attempt 0 ve negatif attempt reddedilir"** — geçersiz attempt'ler throw.
9. (describe: "delayFor()") **"ondalıklı attempt reddedilir"** — 1.5 attempt throw.
10. (describe: "reset()") **"deneme sayacını sıfırlar — sonraki delay yeniden tabandan başlar"** — reset sonrası delayFor(1) tekrar 1000 döner.
11. (describe: "konfigürasyon doğrulaması") **"geçersiz taban (≤0) reddedilir"** — baseMs=0 constructor'da throw.
12. (describe: "konfigürasyon doğrulaması") **"tavan tabandan küçük olamaz"** — maxMs<baseMs throw.
13. (describe: "konfigürasyon doğrulaması") **"negatif jitter açıklığı reddedilir"** — jitterSpanMs=-5 throw.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

### `packages/ws-tunnel/src/codec/frame-codec.test.ts` (`18 test` — container-access'ten taşındı 2026-09-01)
**Hedef:** `FrameCodec` — tünel binary frame kodlayıcı/kod çözücü; 9 bayt başlık (streamId u32 BE + seq u32 BE + flags) ile encode programcı hatasında throw eder, decode asla throw etmez (`Result`). (core'dan taşındı — bkz. platform-paket-yapisi.md Aşama 1.)

1. (describe: "encode()") **"başlık + payload boyutu = 9 + payload.length"** — `FrameCodec.encode` toplam tampon boyutunun başlık sabiti + payload uzunluğuna eşit olduğunu doğruluyor.
2. (describe: "encode()") **"streamId u32 BE olarak yazılır"** — `encode` streamId'yi ilk 4 bayta big-endian düzende yazıyor mu kontrol ediyor.
3. (describe: "encode()") **"seq u32 BE olarak yazılır (wrap değerleri dahil)"** — `encode` seq=0xffffffff sınır değerini 4 bayt big-endian olarak yazıyor mu kontrol ediyor.
4. (describe: "encode()") **"flags baytı: FIN|RST|WS_OP birleşimi"** — `encode` 9. bayta flags bitlerini + yüksek 4 bite opcode'u birleştirerek yazıyor mu kontrol ediyor.
5. (describe: "encode()") **"negatif streamId reddedilir"** — `encode` streamId=-1 için ValidationError fırlatıyor mu kontrol ediyor.
6. (describe: "encode()") **"u32 üstü streamId/seq reddedilir"** — `encode` 2^32'den büyük streamId veya seq girdilerinde throw ediyor mu kontrol ediyor.
7. (describe: "encode()") **"ondalıklı streamId reddedilir"** — `encode` tam sayı olmayan streamId'yi reddediyor mu kontrol ediyor.
8. (describe: "encode()") **"WS_OP set iken opcode zorunludur"** — `encode` WS_OP bayrağı varken opcode verilmemesini hata olarak fırlatıyor mu kontrol ediyor.
9. (describe: "encode()") **"WS_OP yokken opcode verilemez"** — `encode` WS_OP bayrağı yokken opcode geçilmesini reddediyor mu kontrol ediyor.
10. (describe: "encode()") **"opcode 4 bit ile sınırlıdır"** — `encode` 16'dan büyük opcode değerini reddediyor mu kontrol ediyor.
11. (describe: "decode()") **"9 bayttan kısa girdi → Err (throw yok)"** — `decode` 0–8 bayt arası her girdi için throw etmeden Err dönüyor mu kontrol ediyor.
12. (describe: "decode()") **"boş payload'lı frame decode edilir"** — `decode` FIN bayraklı boş payload'lı frame'i doğru streamId/seq/flags ve undefined opcode ile geri çözüyor mu kontrol ediyor.
13. (describe: "decode()") **"WS_OP + opcode geri okunur"** — `decode` WS_OP bayraklı frame'de opcode'u ve bayrağı geri okuyor mu kontrol ediyor.
14. (describe: "decode()") **"bilinmeyen opcode değeri taşınır (ileri uyumluluk)"** — `decode` 0xf gibi bilinmeyen opcode'u aynen taşıyor mu kontrol ediyor.
15. (describe: "decode()") **"maxPayload aşımı → Err"** — `decode` MAX_FRAME_PAYLOAD üstü payload'ı Err ile reddedip opsiyonel üst sınır parametresiyle kabul ediyor mu kontrol ediyor.
16. (describe: "decode()") **"payload tam uzunlukta döner"** — `decode` 256 baytlık payload'ı byte-birebir geri döndürüyor mu kontrol ediyor.
17. (describe: "round-trip (fuzz)") **"rastgele 500 frame encode→decode eşitliği"** — deterministik rastgele 500 frame'in encode→decode sonrası tüm alanlarının korunduğunu doğruluyor.
18. (describe: "round-trip (fuzz)") **"rastgele 1000 bayt akışı decode'da asla throw etmez"** — 1000 rastgele tamponda `decode`'un asla throw etmediğini doğruluyor.

[DOSYA NOTU] Yok — kapsam tam görünüyor.

## packages/core

| Dosya | Kapsanmayan |
|-------|-------------|
| `modbus/decoder` | Sınır durumları: yetersiz register ile decode, kısmi/bozuk byte-order girdi — hata yolu davranışı belirsiz |
| `timescaledb-adapter` | Sıkıştırma/retention policy kurulumu, `close()`, `health()` (yalnız write + bucket hizalaması testli) |

## packages/ui

| Dosya | Kapsanmayan |
|-------|-------------|
| `transports/WebSocketTransport` | `onerror` olay dalı hiç testli değil; backoff tavanı (30 sn) iddia edilmiyor — yalnız ilk backoff (~3 sn) |
| `colors/tokens` | 104 token'ın ~10'u doğrulanıyor; kalanların format/teklik garantisi yok |

## packages/simulators

| Dosya | Kapsanmayan |
|-------|-------------|
| `bsc/bsc-simulator` | ack davranışı (yazım anında DONE) Vitest/node ortamında iddia edilmiyor — bun runtime'ında kanıtlı (bkz. JSDoc); ısıtma/fan hızları yalnız tip kontrolü; alarm register'larının gerçek alarm üretimi |
| `hvac` | Birçok iddia gevşek (">0", "boolean" tip kontrolü); overvoltage fault oluşmazsa iddiasız geçer; fault sonrası kurtarma |

## services/web-service

| Dosya | Kapsanmayan |
|-------|-------------|
| `routes/auth-routes` | `POST /mfa/reset` 403 senaryosu gerçekte çalışmıyor (hook hep admin bağlıyor); DELETE /users ve POST /logout yalnız route kaydı — tam auth akışı değil |
| `use-cases` | `ListUsersUseCase` ve `UpdateUserUseCase` için ayrı test dosyası YOK |
| `field api-client (field app)` | Refresh yanıtında eksik/boş accessToken/refreshToken senaryosu |
| `tunnel.spec.ts` | Oturum TTL/idle sona erme, stream-close/session-end, eşzamanlı oturum limiti E2E dışı |
| `auth/redis-login-throttle` | Kilit TTL dolunca yeniden deneme + doğru TOTP ile başarılı giriş senaryoları |
| `persistence/site-field-seed` | Yapılandırılmış `to` listesinin TÜMÜNE gönderim iddiası (test tek alıcılı config kullanıyor) |

## services/device-service

| Dosya | Kapsanmayan |
|-------|-------------|
| `alarm-transition-detector` | Reset testi davranış iddiası içermiyor (yalnız hata fırlatmama) |

## apps/field

| Dosya | Kapsanmayan |
|-------|-------------|
| `useContainerTelemetry` | `timeSeries` hata yolu + 30 sn refetchInterval davranışı |
| `settingsStore` | Tema persist + bozuk `field-settings` JSON'unun ele alınışı |
| `pcsDerivation` | `pcsState` ±0'a yakın küçük güç değerleri sınırı (yalnız tam 0 testli) |
| `site-field` | guest/developer rolleri için ayrı destinasyon senaryosu (yalnız teknik üzerinden) |
| `PcsCard` | Boş latestTelemetry (AC Active Power yok) + kopuk bağlantının durum rozetini ezmesi |
| `RegisterContainerForm` | Kaydet sırasında çift submit koruması (pending state) |
| `useContainerData` | 5 sn refetch davranışı fake-timer testi yok; HVAC sıcaklık + BSC güç eşikli sayım dalları; rack bazlı filtreleme |
| `useFieldDevices` | Bilinmeyen cihaz öneki (EMU/PM5340) davranışı |
| `AuthStore` | pendingMfaToken ile ikinci adım akışı + fieldIds bayrağı set edilmesi |
| `maneuvers` | field_discharge_all/emergency_stop mode/onFailure alanları (yalnız charge'da assert) |

## apps/container-web

| Dosya | Kapsanmayan |
|-------|-------------|
| `api-client.interceptor` | Kuyruklanmış isteklerin retry'da yeni Authorization header'ı taşıması (yalnız 200'e bakılıyor) |
| `api-base` | `postLoginRoute` MFA-required varyantı; `hasContainerSessionCookie` bozuk cookie formatı |
| `session-auth` | Hydrate sonrası rol bayraklarının set edilmesi doğrudan assert edilmiyor; cookie'nin kendisi (jsdom kısıtı) dışı |
| `RealtimeContext` | Refresh başarılıyken reconnect sırasında İKİNCİ hata senaryosu |
| `LogStore` | `logsApi.list`'in mağazaya yüklenme akışı (mock tanımlı ama kullanılmıyor) |
| `controlApi` | executeMulti varsayılan dışı (sequential/continue) passthrough |
| `maneuvers` | MANEUVER_CONTROLS inputs/timerConfig içeriği; kalan 16 manevranın adım yapısı |
| `RackCard` | Yalnız ilk kart; success/failed ayrımı (maneuver-ui spec'te) |

## apps/superadmin · demo-backend · editor

| Dosya | Kapsanmayan |
|-------|-------------|
| `superadmin/app` | Yalnız import smoke'u — bileşen render, route guard, login/logout davranışı (proje 0 testten geliyor) |
| `demo-backend` | Tek smoke — kritik yol genişletmesi kaynakta TODO |
| `editor/catalog` | Yalnız tek modül — REST/WS uçları ve DeviceJobHandler davranışı |

## e2e

| Dosya | Kapsanmayan |
|-------|-------------|
| `security/alarm-api` | Aktif alarmın başarılı resolve'u (200) + liste içerik doğrulaması |
| `security/guest-auto-dashboard` | Guest çıkış/yeniden giriş döngüsü + guest saha API yetki sınırları |
| `field-flow` | Grafik veri noktası sayısı assert edilmiyor (S11 perf kısıtı — Faz 5.2); adımlar tek testte birleşik |
| `auth-flow` | Başarılı giriş + logout yok; hata selector'ları genel |
| `maneuver-ui` | Yalnız ilk kart; success/failed son durum ayrımı assert edilmiyor |

## packages/ws-tunnel

| Dosya | Kapsanmayan |
|-------|-------------|
| `proxy/tunnel-proxy` | WS kapanış kodu 1008 assert edilmiyor (app.inject WS el sıkışmasını tamamlamıyor); startWsBridge/sendWsToContainer/closeWs mock'ları çağrılmıyor |
| `session/container-session-server` | WS hata senaryoları (abonelik reddi, geçersiz token) |

## packages/tamper-logger

| Dosya | Kapsanmayan |
|-------|-------------|
| `sinks/syslog-sink` | TCP transport yolu (yalnız UDP testli): tcpSocket kurulumu, `\n` framing, kopan bağlantıda yeniden kurma |
| `verify-chain` | strict-null tip borcu (tsc hataları) — davranış testli, tip temizliği bekliyor |

## Bilinen kapsam dışı dosyalar (hiç testi yok — plan: test-gelistirme-plani.md)

- `packages/core/src/timeseries/implementations/timescaledb/materialized-view-manager.ts`
- `services/web-service/src/config/container.ts` (awilix wiring), `presentation/server.ts` (bootstrap)
- `apps/container-desktop` (renderer smoke vite:import-analysis alias sınırı nedeniyle; config/setup hazır)
- simulators: XRack, EnergyAnalyzer aileleri + tüm Modbus adapter'ları
- container-web/field sayfa (pages/) katmanları, ui kart komponentlerinin çoğu (Storybook kapsamında)
