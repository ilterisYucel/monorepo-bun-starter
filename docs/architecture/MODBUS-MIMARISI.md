---
status: active
space: architecture
tags: [mimari, core, modbus, cihaz, spec]
review_date: 2026-11-10
---

# Modbus — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `SHARED-TYPES-MIMARISI.md` (cihaz/telemetri tipleri), `TELEMETRI-ZINCIRI-MIMARISI.md` (tüketici akış), `DOKUMAN-YAPISI-MIMARISI.md` (K16 istisnası).

## 1. Amaç ve Bağlam

`packages/core/src/modbus` klasörünün sözleşmesi: cihaz kontratı (`IDevice`), okuma/yazma stratejisi (`ModbusDevice`), kod çözme (`BinaryPayloadDecoder`) ve taşıma katmanı (TCP/RTU istemcileri + `IModbusTransport` Strategy). Bu birim, tüm saha cihaz iletişiminin tek giriş noktasıdır; komut/manevra yazımının rollback noktası ve sahte ölçüm filtresi burada yaşar.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Okuma/yazma sözleşmesi, transactional yazma, sentinel filtresi, decoder, TCP/RTU taşıma, reconnect davranışı |
| hariç | Simülatör üretimi (`packages/simulators`), cihaz config şeması (`SHARED-TYPES`), polling zamanlaması (`DEVICE-SERVICE`), CANBUS/MQTT protokolleri (stub — kendi dokümanları) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `IDevice` ISP: yalnız `connect/disconnect/read/write` (+opsiyonel `writeAtomic`); alarm API'si taşımaz | Cihaz tipinden bağımsız sözleşme; alarm `device-service`'te değerlendirilir |
| K2 | `read()` HER ZAMAN cihazın tüm telemetrisini döner; register + bitfield birleşik, tek `timestamp` | Poll başına tek zaman damgası; alt küme istenirse yalnız o okunur, bitfield yine eklenir |
| K3 | Okuma sırası: HOLDING → INPUT → COIL → DISCRETE → bitfield; tip içinde adrese göre sıralı (batch maksimizasyonu) | `priority` okumada kullanılmaz — yalnız yazma sırasıdır (0 en yüksek) |
| K4 | `writeAtomic` (TEİAŞ #22): önce ham register backup → plan sırasıyla yaz → hata olursa yazılanlar HAM değerlerle geri yüklenir → orijinal hata fırlar | Decode/encode yok (float kayması yok); rollback hatası yutulur; cihaz içi TEK rollback noktası |
| K5 | Sentinel filtresi: 0x7FFF / 0x8000 / 0xFFFF ve FLOAT NaN/Inf "veri yok" sayılır, yayınlanmaz | Arızalı sensörün sahte değerle koruma tetiklemesi engellenir |
| K6 | Limitler: tek istek ≤125 register; bitfield alanı ≤32 bit (en fazla 2 register) | Aşım fail-fast (config) veya istek hatası |
| K7 | Yazma yalnız HOLDING + COIL; INPUT/DISCRETE sessizce atlanır; yalnız INPUT girdide `writeAtomic` no-op | Fiziksel yazılamaz register'a yazma denemesi yok |
| K8 | Config doğrulaması constructor'da fail-fast: bitfield `registerType` yalnız HOLDING/INPUT; bit aralığı 0–31; `bitEnd >= bitStart` | Bozuk config cihaz başlamadan reddedilir |
| K9 | Transport **Strategy**: `ModbusDevice` gerçek/simüle ayrımı YAPMAZ; fark yalnız enjekte `IModbusTransport`'tadır | `isSimulator` dallanması YASAK; core jeneriktir |
| K10 | RTU backend: `bun-serialport` (bun:ffi) + `SerialSocketAdapter`; `bun:ffi` yalnız `connect()` anında dinamik import | Node tabanlı test/araçlar etkilenmez; port üretimi `ModbusRtuPortFactory` ile enjekte |
| K11 | Reconnect: exponential backoff 1 sn → 30 sn tavan + kriptografik jitter; kopuk bağlantıda 10 sn cooldown | Aynı saniyede ikinci deneme `reconnect cooldown active` fırlatır |
| K12 | Taşıma adapter'ı tek elemanlı yazmayı `writeSingle*`, çokluyu `writeMultiple*`'a eşler | `IModbusTransport` (5 çift) `IModbusClient`'tan daha dar sözleşme |
| K13 | Bun-only: `parity` yalnız `none|even|odd` (aksi fail-fast); `SerialSocketAdapter` mutable kaynak sarmalayıcısı (belgelenmiş istisna) | Elle tip shim `bun-serialport.d.ts` korunur |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Bayt sırası tutarsızlığı: okuma yolu (`decoder.ts#applyByteOrder`) `LITTLE_ENDIAN`'da tüm buffer'ı ters çevirir; yazma yolu (`device.ts#applyByteOrderToBuffer`) 16-bit'lik ikili takas yapar — 16-bit `*_SWAP` hatası | `SIMULATOR-SERVISI-MIMARISI.md` §11.3 "ayrı düzeltme paketi" |
| B2 | `decoder.ts#RegisterTableType` hiçbir yerde kullanılmıyor (ölü tip) | kod incelemesi |
| B3 | `decoder.ts#RegisterDataType` ile `shared-types/telemetry/telemetry-data.ts#RegisterDataType` yapısal kopya | kod incelemesi |
| B4 | `bun-serialport.d.ts` elle yazılmış tip shim — build artifacts kuralının istisnası | `AGENTS-INFRA.md` build artifacts kuralı |

## 4. Mimari

```text
DeviceService (poll) ──► IDevice#read / #write / #writeAtomic
                              │
                              ▼
                        ModbusDevice  (register + bitfield planı, sentinel, rollback)
                              │
                              ▼
                     IModbusTransport  (Strategy — 5 okuma/yazma çifti)
                        │                    │
                        ▼                    ▼
              ModbusClientTransport    (RTU adapter)
                        │                    │
                        ▼                    ▼
                IModbusClient          SerialSocketAdapter
                ├ ModbusTcpClient      └ bun-serialport (dinamik import)
                └ ModbusRtuClient
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/shared-types/src/device-interface.ts#IDevice` | Cihaz kontratı (ISP) |
| `packages/core/src/modbus/device.ts#ModbusDevice` | Okuma/yazma stratejisi, sentinel, transactional rollback |
| `packages/core/src/modbus/decoder.ts#BinaryPayloadDecoder` | Byte order + 16/32/64-bit çözüm |
| `packages/core/src/modbus/transport/interface.ts#IModbusTransport` | Taşıma Strategy portu |
| `packages/core/src/modbus/transport/modbus-client-transport.ts#ModbusClientTransport` | `IModbusClient` → `IModbusTransport` adapter |
| `packages/core/src/modbus/client.ts#ModbusTcpClient` | TCP istemcisi + reconnect/backoff |
| `packages/core/src/modbus/client-rtu.ts#ModbusRtuClient` | RTU istemcisi + port fabrikası |
| `packages/core/src/modbus/serial-socket-adapter.ts#SerialSocketAdapter` | `bun-serialport` köprüsü |
| `packages/core/src/modbus/utils.ts#randomFloat` | Backoff jitter (yardımcı, ayrı SPEC değil) |

## 5. Purity Kuralları (ZORUNLU)

1. `packages/core` jeneriktir: simülatör, connector, saha kavramı GİRMEZ; `isSimulator` dallanması YASAK.
2. `ModbusDevice` taşımayı bilmez; taşıma yalnız `IModbusTransport` üzerinden enjekte edilir.
3. `jsmodbus`/`node:net`/`bun-serialport` yalnız taşıma katmanında import edilir; cihaz katmanı bunları görmez.
4. `shared-types` bağımlılığı yalnız `import type` düzeyindedir.
5. Kod referansı `#sembol` çapasıdır; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Cihaz Okuma Sözleşmesi (Poll)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `read()` birleşik dönüş, okuma sırası, tek timestamp, sentinel filtresi, 125 register limiti
- hariç: polling zamanlaması (device-service), telemetri yazma indirgeme (telemetri zinciri)

**Akış:**
1. `read()` çağrılır; istenen isimler (varsa) çözülür.
2. Register'lar tip sırasına göre gruplanıp okunur (≤125/istek).
3. Bitfield alanları okunup register telemetrisine eklenir.
4. Sentinel değerler elenir; tek `timestamp` ile `TelemetryData[]` döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `read()` register + bitfield telemetrisini birleşik ve tek timestamp'le döner | AK-1.1 |
| FR-1.2 | Sentinel değerler (0x7FFF/0x8000/0xFFFF, NaN/Inf) çıktıya girmez | AK-1.2 |
| FR-1.3 | Tek istek 125 register'ı aşamaz; aşım hata üretir | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** register + bitfield içeren cihaz **WHEN** `read()` çağrılır **THEN** tüm telemetri tek timestamp'le döner
2. **AK-1.2 — GIVEN** okunan değer 0x7FFF (veya NaN) **WHEN** telemetri üretilir **THEN** o satır çıktıya girmez
3. **AK-1.3 — GIVEN** 126 register içeren istek **WHEN** okuma planlanır **THEN** batch limiti hatası fırlar

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Birleşik dönüş + tek timestamp | unit (`device.test.ts`) | ⬜ |
| AK-1.2 | Sentinel filtresi | unit (`device.test.ts`) | ⬜ |
| AK-1.3 | 125 limiti | unit (`device.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini (`device.test.ts`) SPEC AK'leriyle eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Aynı isimde çok kayıt | Tag alt kümesi eşleşmesi seçer; eşleşmeyen isim uyarı + kademeli bozulma |
| Yalnız bitfield cihaz | Register yoksa yalnız bitfield telemetrisi döner |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/modbus/device.ts` | Okuma stratejisi |
| `packages/core/src/modbus/decoder.ts` | Değer çözümü |
| `packages/shared-types/src/device-interface.ts` | Kontrat |

### 6.2 UC-2 — Cihaz Yazma Sözleşmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `write()` sırası, scale/offset, yalnız HOLDING+COIL, INPUT/DISCRETE atlama
- hariç: transactional yazma (UC-3), komut çözümleme (KOMUT-MANEVRA-OPERASYON)

**Akış:**
1. `write()` telemetri listesi alır.
2. `priority` sırasına göre (0 en yüksek) yazma planlanır.
3. Yalnız HOLDING/COIL register'lar yazılır; diğerleri atlanır.
4. Değerler `scale`/`offset` ile ham register'a çevrilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Yazma sırası `priority` alanına göredir (0 en yüksek) | AK-2.1 |
| FR-2.2 | INPUT/DISCRETE telemetrisi yazılmaz (sessiz atlanır) | AK-2.2 |
| FR-2.3 | `scale`/`offset` yazma yolunda uygulanır | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** farklı `priority` değerli iki telemetri **WHEN** `write()` çağrılır **THEN** düşük priority değeri önce yazılır
2. **AK-2.2 — GIVEN** INPUT register telemetrisi **WHEN** `write()` çağrılır **THEN** hiçbir yazma isteği gitmez
3. **AK-2.3 — GIVEN** `scale=0.1, offset=0` telemetri **WHEN** 5.0 yazılır **THEN** register'a 50 yazılır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Priority sırası | unit (`device.test.ts`) | ⬜ |
| AK-2.2 | INPUT/DISCRETE atlama | unit (`device.test.ts`) | ⬜ |
| AK-2.3 | Scale/offset | unit (`device.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Yalnız INPUT girdi + `writeAtomic` | No-op (backup dahi okunmaz) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/modbus/device.ts` | Yazma planı |

### 6.3 UC-3 — Transactional Yazma (writeAtomic)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: ham backup, plan sırasıyla yazma, hata halinde rollback, hata semantiği
- hariç: komut seviyesi rollback (manevra yürütücüsü)

**Akış:**
1. Hedef register'ların ham değerleri backup'lanır (COIL → readCoils, HOLDING → readHoldingRegisters, paralel).
2. Plan sırasıyla yazılır.
3. Hata olursa yazılanlar ham değerlerle geri yüklenir.
4. Orijinal hata fırlatılır; rollback hatası yutulur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Yazma hatasında tüm yazılanlar ham değerlerle geri yüklenir | AK-3.1 |
| FR-3.2 | Rollback sonrası orijinal hata fırlatılır (rollback hatası gizlenir) | AK-3.2 |
| FR-3.3 | Backup ham register değerleriyle yapılır (decode/encode yok) | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** 3 adımlı atomic yazma **WHEN** 2. adım hata verir **THEN** 1. adımın register'ı ham değerine döner
2. **AK-3.2 — GIVEN** rollback sırasında da hata **WHEN** işlem biter **THEN** orijinal hata fırlar
3. **AK-3.3 — GIVEN** float telemetri **WHEN** backup alınır **THEN** register ham değeri saklanır (yeniden çözülmez)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Rollback | unit (`device.test.ts`) | ⬜ |
| AK-3.2 | Hata önceliği | unit (`device.test.ts`) | ⬜ |
| AK-3.3 | Ham backup | unit (`device.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Backup okunamaz | Yazma başlamaz, hata fırlar |
| INPUT-only cihaz | No-op |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/modbus/device.ts#writeAtomic` | Rollback noktası |

### 6.4 UC-4 — Bağlantı Yaşam Döngüsü ve Taşıma Stratejisi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `connect/disconnect`, timeout, reconnect backoff + jitter, cooldown, TCP/RTU istemcileri, adapter eşlemesi
- hariç: simülatör host (SIMULATORS)

**Akış:**
1. `connect()` timeout ile bağlanır (TCP varsayılan 3000 ms).
2. `close`/`error` olayları `connected=false` yapar.
3. Yeniden bağlanma exponential backoff (1→30 sn) + jitter ile denenir.
4. Adapter, tek/çok yazmayı doğru istemci metoduna eşler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Bağlı değilken çağrı `Not connected` hatası fırlatır | AK-4.1 |
| FR-4.2 | Yeniden bağlanma backoff'u 1→30 sn tavan + jitter uygular | AK-4.2 |
| FR-4.3 | RTU'da `bun:ffi` yalnız `connect()` anında yüklenir | AK-4.3 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** bağlantı yok **WHEN** okuma denenir **THEN** `Not connected` hatası döner
2. **AK-4.2 — GIVEN** ardışık başarısız denemeler **WHEN** gecikme hesaplanır **THEN** süre üstel artar, 30 sn'yi aşmaz
3. **AK-4.3 — GIVEN** Node tabanlı test **WHEN** TCP istemcisi import edilir **THEN** `bun:ffi` yüklenmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Bağlantısız hata | unit (`client.test.ts`) | ⬜ |
| AK-4.2 | Backoff matematiği | unit (`client.test.ts`) | ⬜ |
| AK-4.3 | Dinamik import | unit (`client-rtu.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| 10 sn içinde ikinci deneme | `reconnect cooldown active` hatası |
| RTU parity `mark` | Constructor'da fail-fast |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/modbus/client.ts` | TCP istemci |
| `packages/core/src/modbus/client-rtu.ts` | RTU istemci |
| `packages/core/src/modbus/transport/modbus-client-transport.ts` | Adapter |

### 6.5 UC-5 — Kod Çözme (Decoder)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: byte order, 16/32/64-bit, `4Q_FP_PF` Schneider eşlemesi, scale/offset okuma yolu
- hariç: yazma yolu byte order tutarsızlığı (B1 — ayrı düzeltme paketi)

**Akış:**
1. Ham buffer alınır.
2. `byteOrder` uygulanır.
3. `registerDataType`'a göre değer çözülür.
4. `scale`/`offset` uygulanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | 16/32/64-bit tipler ve byte order varyantları doğru çözülür | AK-5.1 |
| FR-5.2 | `4Q_FP_PF` Schneider eşlemesi çözülür | AK-5.2 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** `FLOAT32_BE` buffer **WHEN** decode edilir **THEN** beklenen float döner
2. **AK-5.2 — GIVEN** `4Q_FP_PF` register **WHEN** decode edilir **THEN** Schneider eşlemesine uygun değer döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Tip/byte order matrisi | unit (`decoder.test.ts`) | ⬜ |
| AK-5.2 | 4Q eşlemesi | unit (`decoder.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen `registerDataType` | Constructor/plan aşamasında reddedilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/modbus/decoder.ts` | Çözümleyici |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bağlı değil | Beklenen hata (`Not connected`) |
| Okuma/yazma başarısız | `"Read/Write ... failed: ..."` sarmalanır |
| Atomic yazma hatası | Rollback + orijinal hata |
| Reconnect cooldown | Beklenen hata (10 sn) |
| Bozuk config | Constructor'da fail-fast |
| Batch limiti aşımı | Beklenen hata |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Okuma/yazma/rollback testleri SPEC AK'leriyle eşleşir | kod inceleme |
| SC-2 | Sentinel filtresi ve batch limiti kanıtlı | komut (`vitest`) |
| SC-3 | Purity: core'da simülatör/connector kavramı yok | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut testler kanıt; yeni davranış yok |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme); değişen üretim kodu yok |
| 4. REVIEW (GLM-5.3) | `MODBUS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Bayt sırası tutarsızlığı (B1) — 16-bit `*_SWAP` düzeltme paketi | İleri İş; ayrı bug paketi |
| A2 | `RegisterTableType` ölü tipinin kaldırılması | İleri İş (temizlik) |
| A3 | `RegisterDataType` çift tanımının tek kaynağa indirilmesi | İleri İş (temizlik) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Byte order düzeltme paketi (A1) — okuma/yazma semantiğinin birleştirilmesi.
2. CANBUS/MQTT gerçek implementasyonları geldiğinde `IDevice` üzerinden kendi SPEC'leri.
3. Donanım-simülatör uyum (conformance) testlerinin genişletilmesi.

## 12. T Görev Özeti

| T-1 | UC-1 (okuma) kanıt testlerinin SPEC AK'leriyle eşleştirilmesi |
| T-2 | UC-2 (yazma) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (transactional) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (taşıma/bağlantı) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (decoder) kanıt testlerinin eşleştirilmesi |
