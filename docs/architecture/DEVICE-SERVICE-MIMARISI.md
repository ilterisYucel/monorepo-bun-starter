---
status: active
space: architecture
tags: [mimari, device-service, modbus, telemetri, spec]
review_date: 2026-11-10
---

# Device Service — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `MODBUS-MIMARISI.md` (cihaz kontratı), `TELEMETRI-ZINCIRI-MIMARISI.md` (alarm/indirgeme), `DATA-SERVICE-MIMARISI.md`.

## 1. Amaç ve Bağlam

`services/device-service` sözleşmesi: cihaz config yükleme + fabrika, polling/zamanlama, telemetri yayını, komut yürütme (read-back/pulse/finalize), telemetri yazma indirgeme (deadband), periyodik yazım (`periodicWrites`), alarm üretimi.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Cihaz üretimi, poll grid, 3 downstream job, komut hattı, indirgeme, periyodik yazım |
| hariç | Cihaz protokolü (MODBUS), alarm çözme (WEB-SERVICE), kalıcılık (DATA-SERVICE) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Transport Strategy (core): `ModbusDevice` taşımayı bilmez; RTU `bun-serialport` + port fabrikası; simülatör dalı YOK | Protokol-agnostik servis |
| K2 | `config.connector.device` → türetilmiş 2. MODBUS cihazı; `canonical` → `tags.canonical` | Connector ayrı cihaz olarak poll edilir |
| K3 | Poll'lar 1000 ms ızgarasına hizalı; `WORKER_STALLED_INTERVAL_MS=120_000` (AWS stall olayı) | Deterministik zamanlama |
| K4 | Her okuma 3 downstream job: `WRITE_TELEMETRY` (filtreli alt küme), `MANAGEMENT` + `WS_BROADCAST` (tam veri) | Filtre yalnız yazma yolunda |
| K5 | Okuma hatası: 1× error + 60 sn'de 1 debug + `status='offline'`; online geçişte 1× info | Log seli yok |
| K6 | Komut: `writeAtomic` → read-back (50 ms poll; timeout = BAŞARISIZ), `pulse` sıfırlama, `finalize` el sıkışma; `command_executed`/`command_rejected` audit **fail-closed** | Fiziksel komut güvenliği |
| K7 | Telemetri indirgeme opt-in: `deadband` (+`"auto"`=scale) ve `maxStaleMs` zorunlu; CQS `select` saf, `markWritten` yalnız başarılı enqueue sonrası | State tutarlılığı |
| K8 | Periyodik yazım config-driven (`point`, `intervalMs`, `mode`, `extraPoints`); hata `onError`'a (servis düşmez) | Donanım canlılığı |
| K9 | Alarm üretimi geçiş-odaklı dedup + 3 katman; restart'ta bayat satırlar kapatılır (ayrıntı: TELEMETRI-ZINCIRI) | Log gürültüsü yok |
| K10 | Debug injector yalnız `NODE_ENV!=="production"` + `DEBUG_INJECT_ENABLED==="true"` | Test ucu kapalı |
| K11 | `devices` UPSERT + `details` opak JSONB (rack_count kolonu düşürüldü) | Şema esnekliği |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `debug-injector` sınıf varsayılanı `127.0.0.1` iken `run.ts` `host: "0.0.0.0"` veriyor (prod guard var ama ağa açık) | `services/device-service/run.ts` |
| B2 | Alarm `applyTransition` yalnız dolaylı test ediliyor | `services/device-service/src/device-service.ts` |
| B3 | `@gd-monorepo/logger` yalnız device-service'te kullanılıyor (web/data'ya yayılmadı) | `services/device-service/src/ops-log.ts` |

## 4. Mimari

```text
ConfigLoader ──► DeviceFactory ──► IDevice (ModbusDevice)
                    │
DeviceScheduler ──► read ──► 3 job (WRITE_TELEMETRY / MANAGEMENT / WS_BROADCAST)
                    │
                    └─ COMMAND_DEVICE worker ──► writeAtomic + read-back + audit
PeriodicWriteScheduler ──► periyodik telemetri
AlarmTransitionDetector ──► device_alarms + TamperLogger
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `services/device-service/src/device-service.ts#DeviceService` | Servis çekirdeği |
| `services/device-service/src/device-scheduler.ts#DeviceScheduler` | Zamanlama |
| `services/device-service/src/device-factory.ts#DeviceFactory` | Cihaz üretimi |
| `services/device-service/src/telemetry-write-filter.ts#TelemetryWriteFilter` | İndirgeme |
| `services/device-service/src/periodic-write-scheduler.ts#PeriodicWriteScheduler` | Periyodik yazım |
| `services/device-service/src/alarm-transition-detector.ts#AlarmTransitionDetector` | Alarm |
| `services/device-service/src/debug-injector.ts#InjectionTarget` | Test ucu |

## 5. Purity Kuralları (ZORUNLU)

1. Simülatör kavramı servise sızmaz (config `kind` dışında).
2. Transport yalnız `IModbusTransport` (K1).
3. Audit fail-closed: yazılamazsa komut reddedilir (K6).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Cihaz Üretimi ve Config

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: config yükleme (json/toml/yaml + zod), factory, connector türetimi, canonical tag
- hariç: config şeması (SHARED-TYPES)

**Akış:**
1. Config dosyaları yüklenir ve doğrulanır.
2. `DeviceFactory` cihazları üretir; connector ayrı cihaz olur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `connector.device` tanımı türetilmiş 2. cihaz üretir | AK-1.1 |
| FR-1.2 | `canonical` alanı `tags.canonical`'a taşınır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** connector tanımlı config **WHEN** yüklenir **THEN** iki cihaz oluşur
2. **AK-1.2 — GIVEN** `canonical: "soc"` **WHEN** telemetri üretilir **THEN** `tags.canonical="soc"` olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Connector türetimi | unit (`device-factory.test.ts`) | ⬜ |
| AK-1.2 | Canonical | unit (`config-loader.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen protokol | MQTT stub |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/{device-factory,config-loader}.ts` | Üretim |

### 6.2 UC-2 — Poll / Zamanlama / Yayın

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: 1000 ms grid, 3 job, hata log politikası, devices UPSERT
- hariç: indirgeme (UC-4)

**Akış:**
1. Scheduler grid'e hizalı okuma yapar.
2. `WRITE_TELEMETRY` filtreli, `MANAGEMENT`+`WS_BROADCAST` tam veri.
3. Hata → offline + seyrek log.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Her okuma 3 downstream job üretir | AK-2.1 |
| FR-2.2 | Okuma hatası offline işaretler ve log'u seyreltir | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** başarılı okuma **WHEN** yayın yapılır **THEN** 3 job kuyruğa girer
2. **AK-2.2 — GIVEN** art arda 2 hata **WHEN** log yazılır **THEN** yalnız 1 error + seyrek debug olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | 3 job | unit (`device-scheduler.test.ts`) | ⬜ |
| AK-2.2 | Log politikası | unit (`device-service.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Stall | 120 sn interval |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/device-scheduler.ts` | Zamanlama |

### 6.3 UC-3 — Komut Yürütme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: writeAtomic, read-back, pulse, finalize, audit fail-closed
- hariç: komut çözümleme (PLATFORM), manevra (KOMUT-MANEVRA)

**Akış:**
1. `COMMAND_DEVICE` job'u cihaza uygulanır.
2. Read-back 50 ms poll ile doğrulanır; timeout başarısız sayılır.
3. Audit yazılamazsa komut reddedilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Read-back timeout'u başarısız sayar | AK-3.1 |
| FR-3.2 | Audit yazılamazsa komut reddedilir (fail-closed) | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** read-back değeri değişmedi **WHEN** süre dolar **THEN** komut başarısız döner
2. **AK-3.2 — GIVEN** audit yazılamıyor **WHEN** komut denenir **THEN** `command_rejected` ile reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Read-back | unit (`device-service.test.ts`) | ⬜ |
| AK-3.2 | Fail-closed | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Pulse | Süre sonunda sıfırlanır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/device-service.ts` | Komut |

### 6.4 UC-4 — Telemetri Yazma İndirgeme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: deadband politikası, `select/markWritten`, tagger
- hariç: sorgu (WEB-SERVICE), kalıcılık (DATA-SERVICE)

**Akış:**
1. `select` saf değerlendirme yapar.
2. Başarılı enqueue sonrası `markWritten` state'i ilerletir.
3. Tagger `device_id` + ortam tag'lerini ekler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Yalnız `WRITE_TELEMETRY` filtrelenir | AK-4.1 |
| FR-4.2 | Enqueue başarısızsa state ilerlemez | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** deadband dışı değişim **WHEN** poll koşar **THEN** yazma job'u o satırı taşır
2. **AK-4.2 — GIVEN** enqueue hatası **WHEN** sonraki poll **THEN** satır yeniden değerlendirilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Filtre kapsamı | unit (`telemetry-write-filter.test.ts`) | ⬜ |
| AK-4.2 | CQS | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| `maxStaleMs` aşımı | Yazılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/{telemetry-write-filter,write-policy,telemetry-tagger}.ts` | İndirgeme |

### 6.5 UC-5 — Periyodik Yazım (periodicWrites)

**Status:** ✅ Approved (2026-11-12 — revizyon: `DEVICE-SERVICE-SADELESTIRME-MIMARISI` UC-2 ile heartbeat genellemesi)

**Kapsam:**
- dahil: config-driven periyodik yazım (`periodicWrites[]`), `counter` (0–255 döngü) ve `fixed` modları, `point` + `extraPoints`, hata kanalı
- hariç: alarm (UC-6), pulse/koşullu modlar (SADELESTIRME A2 — İleri İş)

**Akış:**
1. Config'teki her `periodicWrites` girdisi için süreç içi bir zamanlayıcı kurulur.
2. Her `intervalMs`'de `point` (+`extraPoints`) değeri yazılır; `counter` artar, `fixed` sabit değer yazar.
3. Hata `onError`'a iletilir; sonraki periyot doğal retry'dır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Beat yazılamazsa servis düşmez, sonraki tick yeniden dener | AK-5.1 |
| FR-5.2 | `counter` modu her yazımda artar ve 0–255 arasında döner | AK-5.2 |
| FR-5.3 | `point` + `extraPoints` aynı değerle yazılır (40000–40009 kuralı) | AK-5.3 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** yazma hatası **WHEN** tick çalışır **THEN** hata raporlanır, servis ayakta kalır
2. **AK-5.2 — GIVEN** `mode: "counter"` **WHEN** 256 yazım yapılır **THEN** değerler 1'den 255'e artar ve 0'a döner
3. **AK-5.3 — GIVEN** `extraPoints` dolu **WHEN** tick çalışır **THEN** tüm noktalar aynı değerle yazılır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Dayanıklılık | unit (`periodic-write-scheduler.test.ts`) | ⬜ |
| AK-5.2 | Sayaç döngüsü | unit (`periodic-write-scheduler.test.ts`) | ⬜ |
| AK-5.3 | Ek noktalar | unit (`periodic-write-scheduler.test.ts`) | ⬜ |

**T Görev Listesi:**
- [x] T-5: UC-5 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Sayaç 255 | 0'a döner |
| `mode: "fixed"` ve `value` yok | Açılışta fail-fast (config hatası) |
| `intervalMs` geçersiz | Açılışta fail-fast (config hatası) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/periodic-write-scheduler.ts` | Periyodik yazım (heartbeat genellemesi) |
| `services/device-service/src/periodic-write-scheduler.test.ts` | UC-5 kanıtları |

### 6.6 UC-6 — Alarm Üretimi (referans)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: geçiş dedup, 3 katman, restart temizliği
- hariç: çözme (WEB-SERVICE), sözleşme (SHARED-TYPES)

**Akış:**
1. Standart `TelemetryData[]` üzerinden kurallar değerlendirilir.
2. Yükselen/düşen kenarda log + durum UPSERT.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Aktifken tekrar log basılmaz | AK-6.1 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** alarm aktif **WHEN** art arda poll **THEN** yalnız ilk yükselen kenarda log basılır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Dedup | unit (`alarm-transition-detector.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-6: UC-6 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Restart | Bayat satırlar kapatılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/alarm-transition-detector.ts` | Alarm |

### 6.7 UC-7 — Debug Injector (test aracı)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: prod guard, gövde limiti, bilinmeyen cihaz/senaryo
- hariç: üretim yolu

**Akış:**
1. Yalnız non-prod + enabled ise açılır.
2. Hedef cihaza senaryo enjekte eder.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | Prod'da uç kapalıdır | AK-7.1 |

**Kabul Senaryoları (GWT):**

1. **AK-7.1 — GIVEN** `NODE_ENV=production` **WHEN** uç çağrılır **THEN** 404 döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | Prod guard | unit (`debug-injector.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-7: UC-7 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| 16 KB üstü gövde | Reddedilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/device-service/src/debug-injector.ts` | Test ucu |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Okuma hatası | Offline + seyrek log |
| Audit yazılamadı | Komut reddi |
| Periyodik yazım hatası | Servis ayakta |
| Prod'da debug ucu | Kapalı |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Poll/komut semantiği testli | komut |
| SC-2 | Audit fail-closed kanıtlı | komut |
| SC-3 | Prod guard doğru | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 11 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-7 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `DEVICE-SERVICE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Debug injector host'unun `127.0.0.1`'e sabitlenmesi (B1) | İleri İş |
| A2 | Alarm `applyTransition` doğrudan testi (B2) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Debug injector ağ bağlama düzeltmesi (A1).
2. Alarm geçiş doğrudan testi (A2).
3. Logger'ın diğer servislere yayılması (B3).

## 12. T Görev Özeti

| T-1 | UC-1 (cihaz üretimi) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (poll/zamanlama) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (komut) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (indirgeme) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (periodicWrites) kanıt testinin eşleştirilmesi |
| T-6 | UC-6 (alarm) kanıt testinin eşleştirilmesi |
| T-7 | UC-7 (debug) kanıt testinin eşleştirilmesi |
