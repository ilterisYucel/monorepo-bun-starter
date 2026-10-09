---
status: active
space: architecture
tags: [mimari, telemetri, yazma-indirgeme, deadband, gapfill, device-service, spec]
review_date: 2026-10-09
---

# Telemetri Okuma/Yazma Revizyonu — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 Doğrulanmış (2026-10-09) — T-1…T-6 + T-8 tamam; UC-3/T-7 (gapfill/locf) A6 ile
> ayrı SPEC'e ertelendi; doğrulama TELEMETRI-OKUMA-YAZMA-KAPANIS.md'de.
> **REV.01.2 (2026-10-09):** UC-3 (gapfill/locf) bu pakette UYGULANMADI — query optimizasyonu/kimlik
> kararına (Faz-1) bağlı olduğu için **ayrı SPEC'e ertelendi (A6)**. K1 yazım indirgeme emilimini
> korur; okuma tarafı gapfill/locf kapsam dışıdır (K6 revize).
> **REV.01 (2026-10-09):** Developer incelemesi (10 madde) işlendi — `deadband: number | "auto"`
> pozitif zorunlu, state = son **başarılı/kuyruklanmış** değer, kimlik = name + v1 register-only,
> adaptör commit hatası **yutma kaldırılır**, çalıştırma modeli "1 device = 1 device-service",
> LOCF işareti YOK. Query optimizasyonu (Faz-1 SQL şekli) bu SPEC DIŞINDADIR (ayrı karar).
> **REV.01.1 (2026-10-09):** **ACK mekanizması KALDIRILDI.** Gerekçe: kalıcılık güvencesi mevcut
> **BullMQ retry (WRITE_TELEMETRY attempts:5 + backoff + dead-letter)** ile zaten sağlanıyor;
> change-only'nin kaybettiği "sonraki poll doğal retry" boşluğu ise **zorunlu TTL** (`deadband`
> tanımlıysa `maxStaleMs` zorunlu) ile kapatılıyor — DB toparlanınca TTL yazımı veriyi yerleştirir.
> ACK job tipi/worker/pending/ackTimeout mekanizması bu kazanç için orantısız bulundu; persist-çapalı
> garanti İleri İş'e alındı. Buna bağlı olarak `write()` commit hatası reject (yutma kaldırma) ZORUNLU
> kalır — yoksa mevcut retry hiç tetiklenmez.
> **İlişkili:** [TELEMETRI-SORGU-PERFORMANS-MIMARISI.md](./TELEMETRI-SORGU-PERFORMANS-MIMARISI.md)
> (sorgu performansı; Faz-2 bu SPEC'e emilir), [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md)
> (device-service orkestrasyonu; UC-2 poll akışı korunur), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md)
> (§Faz 0 "Telemetri ≠ log" kırmızı kuralı + T0.12 retry haritası), [AGENTS.md](../../AGENTS.md)
> (cihaz alarm sözleşmesi, DI/Elegant Object/purity kuralları).
> **Kaynak girdi:** `docs/analysis/telemetry-okuma-yazma-revizyon.md` (ön plan analiz dokümanı).

---

## 1. Amaç ve Bağlam

Sistemde çok sayıda donanım var ve bunların telemetrileri farklı hızda değişir. Bugün
device-service her cihazdan **tüm** telemetriyi tek poll periyodunda okuyup koşulsuz olarak
TimescaleDB'ye yazar. Bu iki sonuç doğurur:

1. **Saklama hacmi şişer** — neredeyse hiç değişmeyen değerler bile saniyede bir satır üretir.
2. **Sorgu ve iletim yavaşlar** — veri büyüdükçe downsampled sorgular ağırlaşır (AWS demo-edge'de
   > 15 sn → istemci iptali; ayrıntı: TELEMETRI-SORGU-PERFORMANS-MIMARISI §1).

**Çözüm yönü:** Telemetri **okuma** hızı cihaz seviyesinde kalır (tazelik korunur); **yazma** yolu
config ile yönetilir. Her telemetri için isteğe bağlı bir **yazma politikası** tanımlanır:
değişmeyen değer yazılmaz (deadband) ve `maxStaleMs` ile en geç belirli sürede bir satır garantilenir.
**Hiç politika tanımlanmayan telemetriler bugünkü gibi her poll'da yazılır** — bu sayede TEIAŞ için
kritik/kanıt değerleri varsayılan olarak güvende kalır.

**Kalıcılık güvencesi:** Yazım kalıcılığı iki katmanla sağlanır: (1) mevcut BullMQ retry
(`WRITE_TELEMETRY` attempts:5 + backoff + dead-letter) geçici DB arızalarını kurtarır; (2) politikalı
isimlerde **zorunlu** `maxStaleMs` (TTL) sayesinde değer değişmese bile periyodik olarak yeniden
yazılır, böylece retry penceresini aşan arızalarda DB toparlanınca veri yerleşir. Change-only'nin
"değişmeyeni yazma" davranışı tek başına doğal-retry'ı devre dışı bıraktığından TTL zorunludur.

Bu SPEC, TELEMETRI-SORGU-PERFORMANS-MIMARISI'nın **Faz-2'sinin yazım indirgeme kısmını devralır**
(K1). Sorgu performansının SQL şekli (Faz-1) ve sürekli aggregate/eşzamanlılık (Faz-3) ilgili SPEC'te
kalır. **Okuma tarafı gapfill/locf (Faz-2'nin diğer yarısı) bu SPEC DIŞIDIR** — query
optimizasyonu/kimlik kararına bağlı olduğundan ayrı SPEC'e ertelendi (A6).

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| shared-types | telemetri girdisi `deadband`/`maxStaleMs` tip + zod; name-teklik kuralı | Diğer config şemaları |
| device-service | politika çözümlemesi, `TelemetryWriteFilter`, WRITE_TELEMETRY job ayrımı | Okuma cadencesi değişikliği (A1), MANAGEMENT/WS_BROADCAST içeriği |
| data-service | — | Yazma yolu değişmez (mevcut retry + onFailed aynen kalır) |
| packages/core | adaptör commit hatası reject (K10) | Faz-1 SQL şekli, gapfill/locf (A6), raw `query()` yolu, CA/MV (Faz-3) |
| web-service / ön yüz | — | HTTP ucu, parametreler, `TelemetryData` şekli değişmez (K7) |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-09)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | TELEMETRI-SORGU-PERFORMANS-MIMARISI **Faz-2'sinin YAZIM İNDİRGEME kısmı bu SPEC'e emilir**; okuma tarafı gapfill/locf kapsam dışı (A6 — ayrı SPEC). Performans SPEC'i yazım tarafı için bu SPEC'e işaret eder | Yazım indirgeme tek sahipli; gapfill/locf ayrı ele alınır |
| K2 | Yazma filtresi **device-service'te**, job kuyruğa alınmadan ÖNCE; **yalnızca WRITE_TELEMETRY** filtrelenir. State, başarılı enqueue sonrası güncellenir | Redis payload'ı küçülür; data-service aptal yazıcı kalır |
| K3 | **Okuma cadencesi cihaz seviyesinde kalır** (`pollIntervalMs`); telemetri-başına okuma aralığı ERTELENİR | MANAGEMENT/WS tazelik semantiği bozulmaz; Modbus adres-batçlama korunur (§4.5) |
| K4 | Politika **opt-in**: `deadband: number \| "auto"` (**pozitif zorunlu**; `"auto"` = scale) ve **`deadband` tanımlıysa `maxStaleMs` ZORUNLU** (TTL). Hiçbiri yoksa **her poll yaz** (mevcut davranış) | TEIAŞ kritik değerler varsayılan-güvenli; change-only TTL ile kayıpsız |
| K5 | Karşılaştırma **son kuyruklanan** değere göre; geçici arıza **mevcut BullMQ retry(5)** ile kurtarılır; retry tükenirse **zorunlu TTL** DB toparlanınca yeniden yazar; restart'ta tüm değerler bir kez yazılır | ACK protokolü olmadan kalıcılık güvencesi |
| K6 | **Downsampled gapfill/locf bu SPEC DIŞI** — query optimizasyonu/kimlik kararına bağlı, ayrı SPEC (A6) | Uydurma veri riski taşınmaz; doğru kimlikle ele alınır |
| K7 | **Kontrat sabit:** HTTP ucu/parametreleri, `TelemetryData` şekli, birim/description/value yuvarlaması değişmez | Tüketiciler (container-web, demo-field, web-service) etkilenmez |
| K8 | **Kimlik = name**; v1'de politika yalnız register-telemetri girdilerinde. `telemetry[]` name'leri device başına **unique** (şema fail-fast). Bitfield telemetrileri v1'de filtrelenmez (dataTag onarımı ertelendi — A5) | Yanlış seri birleşmesi/karışması önlenir |
| K9 | **Çalıştırma modeli kuralı:** bir cihazı aynı anda **tek** device-service okur (ölçek = cihazları bölerek partition) | Bellek-içi state güvenli; risk değil dokümante varsayım |
| K10 | Adaptör `write()` commit hatasını **yutamaz** — tek-device batch'te reject eder | Mevcut `WRITE_TELEMETRY` retry + `onFailed` logu gerçekten çalışır (bugün yutma yüzünden ölü) |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Cihaz başına **tek** poll aralığı; `read()` çağrısı argümansız → tüm telemetri döner | `services/device-service/src/device-service.ts#readDevice`, `services/device-service/src/device-scheduler.ts#scheduleRead` |
| B2 | `IDevice.read(telemetries?)` alt küme destekliyor ama çağıran yok; bitfield'lar her durumda okunur | `packages/core/src/modbus/device.ts#read`, `#readBitfieldTelemetry` |
| B3 | `publishTelemetry` üç job'a **aynı tam** veriyi koyar | `services/device-service/src/device-scheduler.ts#publishTelemetry` |
| B4 | data-service her satırı **koşulsuz** yazar (retry mevcut) | `services/data-service/src/data-service.ts#start`, `packages/platform/messaging/src/platform-message-queue.ts#JOB_RETRY_OPTIONS` |
| B5 | Adaptör tüm satırları yazar (indirgeme yok) | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#write`, `#writeBatch` |
| B6 | Downsampled SQL `GROUP BY bucket, tags` üretir (JSONB kombinasyon patlaması) | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getDownsampledData` |
| B7 | Telemetri şeması `catchall` — name teklik ve politika alanları bugün doğrulanmıyor | `packages/shared-types/src/schemas/device-config.ts#telemetryEntrySchema` |
| B8 | Bitfield alan adları device içinde tekrar eder (flex-bsc: 58 dup name; 330 tekrar dataTag) → name/dataTag tek başına kimlik değil | `configs/flex-bsc.json` (542 alan / 212 unique dataTag; "Fault" ×8, "Warning" ×8) |
| B9 | Adaptör `write()` commit hatasını yutar (`Promise.allSettled` + `console.warn`) — retry/onFailed hiç tetiklenmez | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#write` |
| B10 | Konteyner grafikleri serileri `tags` ile ayırır (rack_id filtreleri) | `apps/container-web/src/pages/RacksPage.tsx`, `packages/ui/src/components/TelemetryChart/TelemetryChart.tsx` |

---

## 4. Mimari

### 4.1 Yazma yolu (hedef)

```
poll → read() [TÜM telemetri, değişmedi] → TelemetryTagger.enrich
   ├── alarm değerlendirmesi [TAM veri, değişmedi]
   └── publish
         ├── WRITE_TELEMETRY   → TelemetryWriteFilter.select(...) → alt küme → data-service
         │       └── commit hatası → adaptör reject → BullMQ retry(5) → tükenirse dead-letter
         ├── MANAGEMENT        → TAM veri (kural motoru taze kalır)
         └── WS_BROADCAST      → TAM veri (ön yüz taze kalır)
```

`TelemetryWriteFilter.select` **saf sorgudur** (state okur, değiştirmez); WRITE job kuyruğa
**başarıyla** eklendikten sonra `markWritten` komutu state'i günceller (Elegant Object CQS: command
`void`, query değer döner). Enqueue başarısızsa state ilerlemez → sonraki poll yeniden değerlendirir.

### 4.2 Yazma politikası semantiği

Politika config'teki telemetri girdisindedir (tek kaynak):

| Config | Anlam | Zorunluluk |
|:-------|:------|:-----------|
| `deadband?: number \| "auto"` | Mutlak değişim eşiği. Sayı ise **> 0**; `"auto"` ise scale'dan türetilir. \|yeni − sonKuyruklanan\| < eşik olan değer **yazılmaz** | — |
| `maxStaleMs?: number` | Bayatlama sınırı (TTL). Değer değişmese bile son yazımdan bu süre geçtiyse **yazılır** | **`deadband` varsa zorunlu** |

`"auto"` türetimi: `değer = raw × scale + offset`; ham değeri **tam sayı** olan girdilerde
(MODBUS `UINT16/INT16/UINT32/INT32/BOOL`, CANBUS) raw'ın en küçük adımı 1'dir → en küçük anlamlı
değişim **scale**'dır (`deadband = scale`). MODBUS `FLOAT32/FLOAT64` ve MQTT'de `"auto"` fail-fast
reddedilir (ondalık raw).

Karar algoritması (her poll, her politikalı telemetri için):

```
politika yok            → yaz                         (mevcut davranış — K4)
kayıt yok (ilk/restart) → yaz                         (K5)
|yeni − sonKuyruklanan| >= deadband  → yaz            (değişti)
değişmedi ve maxStaleMs doldu        → yaz            (TTL — zorunlu)
değişmedi                            → yazma
```

- **Örnek (yavaş değer):** `"deadband": "auto", "maxStaleMs": 60000` (scale 0.01) → yalnız ham adım
  değişince yazılır; değişmese de en geç 60 sn'de bir satır bulunur.
- **Örnek (kritik değer):** alan yok → her poll yazılır (TEIAŞ kanıt).
- **Komut yolu:** komut sonrası `read()` + `publish` aynı filtreden geçer; komutun neden olduğu
  değişim deadband'ı aşar ve yazılır.
- **Kalıcılık:** geçici DB arızası → BullMQ retry(5); retry tükenir → dead-letter + `onFailed`
  (`telemetry_write_failed`); ardından TTL yazımı DB toparlanınca veriyi yerleştirir (K5).
- **TTL zorunluluğu gerekçesi:** change-only, değer değişmediğinde sonraki poll'u "doğal retry"
  olmaktan çıkarır; zorunlu `maxStaleMs` bu boşluğu kapatır (retry tükenirse TTL yeniden yazar).

### 4.3 Gapfill/locf — kapsam dışı (A6)

Downsampled okuma için gapfill/locf **bu SPEC'te UYGULANMADI**. Gerekçe: mevcut downsampled sorgusu
geniş format (`GROUP BY bucket, tags` + isim-başına `AVG(CASE…)`) ve isim-başı `locfCarryMs` taşıma
sınırı bu formatta ifade edilemiyor; uzun format ise bitfield name-tekrarı (B8) kimlik çözümüne
bağlı — yani query optimizasyonu (Faz-1) kararıyla iç içe. Ayrı SPEC'te ele alınacaktır.

### 4.4 Bileşenler

| Bileşen | Yer | Görev |
|:--------|:----|:------|
| `TelemetryWriteFilter` | `services/device-service/src/` | (deviceId, name) başına son kuyruklanan `{value, at}` state; `select` (query) + `markWritten` (command). Davranış sahibi, config bilmez — politika parametre olarak verilir |
| Politika çözümleyici | `services/device-service/src/device-service.ts#fromConfigDir` | Config'ten `name → { deadband(resolved), maxStaleMs }`; `"auto"` → scale; FLOAT/MQTT `auto` fail-fast; bitfield girdileri hariç |
| `publishTelemetry` (imza) | `services/device-service/src/device-scheduler.ts` | WRITE_TELEMETRY job'una filtrelenmiş alt küme; MANAGEMENT/WS tam veri |

### 4.5 K3 gerekçesi (neden telemetri-başına OKUMA aralığı yok)

1. MANAGEMENT/WS_BROADCAST filtrelenmediğinden (K2) kural motoru ve ön yüz her poll'da taze veri
   bekler; okumayı yavaşlatmak bu iki tüketiciyi de bayatlatır — K2 ile çelişir.
2. Bitfield telemetrileri `read()` içinde koşulsuz okunur (B2) → yavaş interval bitfield'larda
   tutulamaz; cihaz kontratı değişikliği (DEVICE-SERVICE A2) gerekir.
3. Modbus okumaları adres-batçlıdır (`groupByAddress`); 403 register birkaç istekte okunur —
   darboğaz bus değil **DB**dir.

---

## 5. Purity Kuralları (ZORUNLU)

1. **Kontrat sabittir:** HTTP ucu/parametreleri, `TelemetryData` şekli, birim/description çizgisi ve
   `value` yuvarlaması (4 hane) korunur (K7).
2. **Filtre yalnız WRITE_TELEMETRY yolundadır:** MANAGEMENT ve WS_BROADCAST içeriği değişmez.
3. **Politika tek kaynak config'tir:** kod, tag veya enum içinde gömülü yazma politikası YOKTUR;
   alarm kaynağı yalnız config `alarms[]` (AGENTS cihaz alarm sözleşmesi korunur).
4. **Alarm değerlendirmesi filtrelenmemiş tam veriyle çalışır** — yazma indirgemesi alarm
   tespitini etkilemez (geçiş-odaklı dedup korunur).
5. **data-service aptal yazıcı kalır:** filtre/karar device-service'te; data-service'in mevcut
   retry + `onFailed` yolu değişmez.
6. **Uydurma veri yok:** bu SPEC okuma yoluna dokunmaz; gapfill/locf (uydurma riski taşıyan okuma
   tarafı) kapsam dışıdır ve ayrı SPEC'te ele alınır (A6).
7. **Okuma cadencesi değişmez** (K3); `IDevice` kontratı ve `packages/core` cihaz soyutlaması
   dokunulmaz (adaptör `write` hata sözleşmesi K10 istisnası hariç).
8. **Kimlik name'dir (K8):** bitfield telemetrilerine v1'de gömülü politika uygulanmaz.

---

## 6. Use Case'ler

### 6.1 UC-1 — Yazma Politikası Şeması ve Çözümleme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: telemetri girdisine `deadband`/`maxStaleMs` alanları (tip + zod), `"auto"` kuralları,
  TTL zorunluluğu, name-teklik fail-fast, device-service politika haritası çözümlemesi
- hariç: filtrenin çalışma zamanı davranışı (UC-2), gapfill/locf (UC-3)

**Akış:**
1. Config dosyası yüklenir, zod şeması doğrular.
2. `deadband` sayı ise pozitif; `"auto"` yalnız ham-tam-sayı girdilerde; `deadband` varsa
   `maxStaleMs` zorunlu; name'ler device içinde tekil.
3. `fromConfigDir` her cihaz için `name → { deadband (resolved), maxStaleMs }` haritası üretir.
4. İhlalde servis açılmaz (fail-fast).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Sistem MUST `deadband`'i `number \| "auto"` olarak doğrulamalı; sayı pozitif, `"auto"` yalnız MODBUS integer register/CANBUS girdilerinde kabul edilmelidir. | AK-1.1 |
| FR-1.2 | `deadband` tanımlıysa sistem MUST `maxStaleMs`'i de zorunlu (pozitif) kılmalıdır; yoksa fail-fast. | AK-1.2 |
| FR-1.3 | Politika alanları tanımsızsa davranış "her poll yaz" olmalıdır. | AK-1.3 |
| FR-1.4 | Bir cihazın `telemetry[]` name'leri MUST tekil olmalıdır (ihlal fail-fast). | AK-1.4 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `deadband: "auto"` ve `registerDataType: FLOAT32` **WHEN** config yüklenir **THEN** fail-fast hata verir; MODBUS integer türde ise `deadband = scale` çözülür
2. **AK-1.2 — GIVEN** `deadband` var ama `maxStaleMs` yok **WHEN** config yüklenir **THEN** fail-fast hata verir
3. **AK-1.3 — GIVEN** politika alanı olmayan telemetri **WHEN** `fromConfigDir` çalışır **THEN** o isim "her poll yaz" işaretlenir
4. **AK-1.4 — GIVEN** aynı `name` iki girdide **WHEN** config yüklenir **THEN** fail-fast hata verir, servis açılmaz

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | `auto` türetimi + FLOAT fail-fast | unit | ⬜ |
| AK-1.2 | `deadband` ⇒ `maxStaleMs` zorunluluğu | unit | ⬜ |
| AK-1.3 | Alan yokluğu → always-write | unit | ⬜ |
| AK-1.4 | name-teklik fail-fast | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: shared-types tip (`TelemetryConfigEntry`) + zod (`telemetryEntrySchema` + auto/pozitif/TTL-zorunlu/name-teklik) + test
- [ ] T-2: device-service politika çözümleme (`auto`=scale, FLOAT/MQTT fail-fast, bitfield hariç) + test

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `deadband: 0` veya negatif | Fail-fast (pozitif zorunlu) |
| `deadband: "auto"` + scale 0 | Fail-fast (anlamsız eşik) |
| `maxStaleMs` tek başına (deadband yok) | No-op — her poll zaten yazılır (§4.2) |
| Bitfield isimlerine politika | v1'de yok sayılır (K8); bitfield satırları her poll yazılır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/shared-types/src/config/device-config.ts` | `TelemetryConfigEntry` politika alanları |
| `packages/shared-types/src/schemas/device-config.ts` | `telemetryEntrySchema` + `auto`/pozitif/TTL-zorunlu/name-teklik |
| `services/device-service/src/device-service.ts` | Politika haritası çözümlemesi |

### 6.2 UC-2 — Değişiklik Tespiti ve Yazma İndirgeme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `TelemetryWriteFilter`, WRITE_TELEMETRY job ayrımı, boş küme davranışı, adaptör commit-hatası reject (K10)
- hariç: okuma cadencesi (A1), MANAGEMENT/WS_BROADCAST içeriği (tam kalır)

**Akış:**
1. Poll `read()` ile tam telemetriyi okur (değişmez).
2. Alarm değerlendirmesi tam veriyle çalışır (değişmez).
3. `select(deviceId, telemetriler)` politikaya göre alt kümeyi döner; boşsa WRITE job atlanır.
4. WRITE job alt kümeyi, MANAGEMENT/WS job'ları tam veriyi alır; enqueue başarılıysa `markWritten`.
5. Commit hatası → adaptör reject → BullMQ retry(5); tükenirse TTL yazımı kurtarır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Sistem MUST WRITE_TELEMETRY job'una yalnız politika-filtreli alt kümeyi koymalıdır. | AK-2.1 |
| FR-2.2 | MANAGEMENT ve WS_BROADCAST job'ları MUST tam telemetriyi taşımalıdır. | AK-2.2 |
| FR-2.3 | `deadband` tanımlı isimde eşik altındaki değişim MUST yazılmamalıdır. | AK-2.3 |
| FR-2.4 | `maxStaleMs` dolan değer, değişmese bile MUST yazılmalıdır (son kuyruklanandan). | AK-2.4 |
| FR-2.5 | İlk poll ve restart sonrası tüm politikalı değerler bir kez MUST yazılmalıdır. | AK-2.5 |
| FR-2.6 | Enqueue başarısızsa state MUST ilerlememelidir (sonraki poll yeniden değerlendirir). | AK-2.6 |
| FR-2.7 | Filtre sonrası alt küme boşsa WRITE_TELEMETRY job'u MUST atılmamalıdır. | AK-2.7 |
| FR-2.8 | Adaptör `write()` tek-device batch commit hatasında MUST reject etmelidir (yutma kaldırılır). | AK-2.8 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `deadband`'lı isim ve değeri değişmedi **WHEN** publish çalışır **THEN** WRITE_TELEMETRY job'unda o isim yoktur
2. **AK-2.2 — GIVEN** aynı poll **WHEN** publish çalışır **THEN** MANAGEMENT ve WS_BROADCAST job'ları tam telemetriyi taşır
3. **AK-2.3 — GIVEN** son kuyruklanan 10.0 ve yeni değer 10.2, `deadband: 0.5` **WHEN** publish çalışır **THEN** isim WRITE job'una dahil edilmez
4. **AK-2.4 — GIVEN** değer değişmedi ama son kuyruklanmadan `maxStaleMs` geçti **WHEN** publish çalışır **THEN** isim WRITE job'una dahil edilir
5. **AK-2.5 — GIVEN** servis yeni açıldı (state boş) **WHEN** ilk poll işlenir **THEN** tüm politikalı isimler WRITE job'una dahil edilir
6. **AK-2.6 — GIVEN** WRITE job enqueue başarısız oldu **WHEN** sonraki poll gelir **THEN** değer yeniden değerlendirilir
7. **AK-2.7 — GIVEN** tüm politikalı isimler değişmedi **WHEN** publish çalışır **THEN** WRITE_TELEMETRY job'u hiç atılmaz
8. **AK-2.8 — GIVEN** commit sırasında DB hatası **WHEN** `write()` döner **THEN** reject eder (retry tetiklenir)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | WRITE alt küme filtresi | unit | ⬜ |
| AK-2.2 | MANAGEMENT/WS tam veri (regresyon) | unit | ⬜ |
| AK-2.3 | deadband eşiği | unit | ⬜ |
| AK-2.4 | TTL (son kuyruklanandan) | unit | ⬜ |
| AK-2.5 | Soğuk başlangıç tam yazım | unit | ⬜ |
| AK-2.6 | Başarısız enqueue'da state ilerlemez | unit | ⬜ |
| AK-2.7 | Boş alt küme → job atılmaz | unit | ⬜ |
| AK-2.8 | Adaptör hata reject (karakterizasyon) | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: `TelemetryWriteFilter` (`select`/`markWritten`) + test
- [ ] T-4: device-service `publish` ayrımı + filter entegrasyonu + test
- [ ] T-5: `DeviceScheduler.publishTelemetry` WRITE alt küme imzası
- [ ] T-6: adaptör `write()` commit-hatası reject (yutma kaldır) + karakterizasyon testi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Değer `NaN`/sayısal değil | Değişim sayılır, yazılır (güvenli taraf) |
| Komut sonrası read+publish | Aynı filtreden geçer; komut değişimi yazılır |
| Politika sonradan config'ten kaldırıldı | "Always write"a döner; state yok sayılır |
| Bitfield telemetrisi | Politika yok → her poll yazılır (K8) |
| WRITE commit hatası | Adaptör reject → retry(5); tükenirse TTL kurtarır (K5) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/device-service/src/telemetry-write-filter.ts` | YENİ — `{value, at}` state + `select`/`markWritten` |
| `services/device-service/src/device-service.ts` | Politika haritası, publish ayrımı |
| `services/device-service/src/device-scheduler.ts` | `publishTelemetry` WRITE alt küme parametresi |
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` | `write()` commit hatası reject |

### 6.3 UC-3 — Gapfill/Locf ile Okuma Sürekliliği

**Status:** ⛔ Defer (A6 — ayrı SPEC'e ertelendi; §4.3 gerekçesi)

**Kapsam:**
- dahil: downsampled okumada `time_bucket_gapfill` + `locf` + `locfCarryMs` taşıma sınırı
- hariç: raw `query()` yolu (kanıt — dokunulmaz), Faz-1 SQL şekli (ayrı karar), CA/MV (Faz-3)

**Akış:**
1. İstemci downsampled isteği gönderir (parametreler değişmez).
2. `locfCarryMs = 0` ise sorgu bugünkü gibi çalışır.
3. `locfCarryMs > 0` ise `time_bucket_gapfill` bucket üretir, `locf` son değeri taşır.
4. Taşıma yalnız boşluk ≤ `locfCarryMs` iken uygulanır; aksi halde değer NULL kalır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `locfCarryMs > 0` iken downsampled MUST gapfill+locf kullanmalı; `0` iken mevcut davranış korunmalıdır. | AK-3.1 |
| FR-3.2 | Taşıma sınırını aşan boşluklar MUST doldurulmamalıdır (uydurma veri yok). | AK-3.2 |
| FR-3.3 | Raw `query()` yolu MUST gapfill/locf içermemelidir (kanıt yolu korunur). | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** `locfCarryMs > 0` ve bucket'larda boşluk **WHEN** downsampled çalışır **THEN** boşluk son değerle doldurulur
2. **AK-3.2 — GIVEN** boşluk `locfCarryMs`'den uzun **WHEN** downsampled çalışır **THEN** o aralık NULL kalır (uydurma yok)
3. **AK-3.3 — GIVEN** `locfCarryMs > 0` **WHEN** raw `query()` çalışır **THEN** yalnız gerçek satırlar döner, doldurulmuş satır yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | gapfill+locf süreklilik | unit | ⬜ |
| AK-3.2 | Taşıma sınırı uydurmayı önler | unit | ⬜ |
| AK-3.3 | Raw query dokunulmaz (regresyon) | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-7: adaptör gapfill/locf + `TimescaleDBConfig.locfCarryMs` + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Boş zaman aralığı | Boş dizi (uydurma yok) |
| Tek nokta | Değişiklik yok |
| Boşluk tam `locfCarryMs` | Sınır dahil taşınır (`≤`) |
| `locfCarryMs = 0` | Gapfill kapalı (varsayılan) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts` | `getDownsampledData` gapfill/locf |
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-config.ts` | `locfCarryMs` alanı |

---

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Politika yok | Her poll yazılır (mevcut davranış — regresyon) |
| Değer değişmedi (deadband altı) | Yazılmaz; state değişmez |
| Kayıt yok (ilk/restart) | Değer yazılır, state kurulur |
| `maxStaleMs` doldu | Değişmese de yazılır, state zamanı tazelenir |
| WRITE enqueue başarısız | State ilerlemez; sonraki poll yeniden değerlendirir |
| WRITE commit hatası | Adaptör reject → BullMQ retry(5); tükenirse dead-letter + `onFailed`; TTL DB toparlanınca yerleştirir |
| Boş alt küme | WRITE job'u atılmaz |
| Config politika/şema ihlali | Fail-fast — servis açılmaz (`ValidationError`) |
| `deadband` var, `maxStaleMs` yok | Fail-fast (K4) |
| Alarm aktifken değer yazılmadı | Alarm geçişi yine üretilir (tam veriyle değerlendirme — purity 4) |
| Beklenmeyen hata | `DomainError` sınırına taşınır (mevcut yol) |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `deadband` işaretli isimlerde tablo satır sayısı belirgin azalır (hedef ≥5×) | tablo boyutu ölçümü (opt-in isimler) |
| SC-2 | Politika tanımsız telemetrilerde davranış birebir korunur (her poll satırı) | regresyon testi |
| SC-3 | Kontrat değişmez; etkilenen projelerin mevcut testleri yeşil | `core`, `shared-types`, `device-service`, `data-service`, `web-service`, `container-web` |
| SC-4 | `spec:check` temiz + test envanteri güncel | `bun run spec:check` + `bun run test:inventory` |
| SC-5 | Commit hatası artık sessiz yutulmaz — retry/`onFailed` gözlemlenebilir | unit + karakterizasyon |

---

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (+ PERFORMANS SPEC revizyonu — T-9) |
| 2. JSDoc | `TelemetryWriteFilter` kontratı; `deadband`/`maxStaleMs` sözleşmeleri; `locfCarryMs` |
| 3. TEST | T-1/T-2/T-3/T-6 kırmızı testleri |
| 4. IMPL | T-4/T-5/T-8 |
| 5. KAPANIŞ | `TELEMETRI-OKUMA-YAZMA-KAPANIS.md` |

---

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Telemetri-başına **okuma** aralığı (analiz öneri 1) | ⛔ Defer — K3; tetikleyici: Modbus bus yükü ölçümü + bitfield alt küme desteği (DEVICE-SERVICE A2) |
| A3 | Minimum yazma sıklığı / throttle (analiz öneri 2) | ⛔ Defer — change-only veri kaybısız kapsıyor |
| A4 | `deadband` mutlak mı yüzde mi | Mutlak (mühendislik birimi); yüzde İleri İş |
| A5 | Bitfield deadband desteği + dataTag tekilleştirme migrasyonu (flex-bsc 330 tekrar) | ⛔ Defer — v1 register-only (K8); onarım ayrı iş |
| A6 | Downsampled **gapfill/locf** (Faz-2 okuma tarafı) + `locfCarryMs` taşıma sınırı | ⛔ Defer — query optimizasyonu/kimlik kararı (Faz-1) ile birlikte **ayrı SPEC** (K6, §4.3) |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **Query optimizasyonu (Faz-1 SQL şekli) + downsampled gapfill/locf (A6):** AYRI SPEC (device-config
   kimlik kural seti ile birlikte). Not: mevcut `GROUP BY bucket, name` önerisi bitfield name
   tekrarları (B8) nedeniyle güvenli değildir — kimlik/seri çözümü o kararın parçasıdır; gapfill/locf
   de aynı kimlik zeminine oturur.
2. **Persist-çapalı ACK:** Dead-letter'a düşen değişimi TTL'den önce garantilemek gerekirse
   (kanıtlanmış ihtiyaç) ayrı SPEC — job tipi + pending/jobId + ackTimeout (REV.01.1'de bilinçli ertelendi).
3. Bitfield deadband + dataTag tekilleştirme migrasyonu (A5).
4. Telemetri-başına okuma aralığı (A1) — bitfield alt küme desteği ve bus yükü ölçümü sonrası.
5. `deadband` yüzde/oransal mod (A4).
6. CA/MV hibrit + eşzamanlılık sınırı — TELEMETRI-SORGU-PERFORMANS-MIMARISI Faz-3.

---

## 12. T Görev Özeti

| T | Görev | UC |
|:--|:------|:---|
| T-1 | shared-types `TelemetryConfigEntry` + zod (`deadband` auto/pozitif, `maxStaleMs` zorunlu, name-teklik) + test | UC-1 |
| T-2 | device-service politika çözümleme (`auto`=scale, FLOAT/MQTT fail-fast, bitfield hariç) + test | UC-1 |
| T-3 | `TelemetryWriteFilter` (`select`/`markWritten`) + test | UC-2 |
| T-4 | device-service `publish` ayrımı + filter entegrasyonu + test | UC-2 |
| T-5 | `DeviceScheduler.publishTelemetry` WRITE alt küme imzası | UC-2 |
| T-6 | adaptör `write()` commit-hatası reject + karakterizasyon testi | UC-2 |
| T-7 | ~~adaptör gapfill/locf + `locfCarryMs`~~ ERTELENDİ — ayrı SPEC (A6) | UC-3 (⛔ Defer) |
| T-8 | örnek config rollout (kritik olmayan isimlerde deadband+maxStaleMs) | — (deployment) |
| T-9 | TELEMETRI-SORGU-PERFORMANS SPEC revizyonu (Faz-2 çıkar, A2 kapat) + KAPANIŞ | — (dokümantasyon) |
