---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, telemetri, yazma-indirgeme, deadband, device-service]
review_date: 2026-10-09
---

# TELEMETRI-OKUMA-YAZMA — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [TELEMETRI-OKUMA-YAZMA-MIMARISI.md](./TELEMETRI-OKUMA-YAZMA-MIMARISI.md) (REV.01.2, 🟢 Doğrulanmış — AK/FR/SC kaynağı).
> **Denetim sabiti:** @887f74c

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/shared-types/src/schemas/device-config.ts#telemetryEntrySchema` | `deadband` (`number\|"auto"`, pozitif) + `maxStaleMs` (int pozitif) alanları; `superRefine` ile `deadband⇒maxStaleMs` zorunlu ve `"auto"` yalnız MODBUS integer/CANBUS kısıtı | K4, FR-1.1, FR-1.2 |
| 2 | `packages/shared-types/src/schemas/device-config.ts#telemetryListSchema` | name teklik fail-fast (`superRefine`) | K8, FR-1.4 |
| 3 | `packages/shared-types/src/config/device-config.ts#TelemetryConfigEntry` | `deadband?: number\|"auto"`, `maxStaleMs?: number` tip alanları | T-1, FR-1.1 |
| 4 | `packages/shared-types/src/schemas/device-config.test.ts` | Yeni `"yazma politikası"` describe (10 test) | AK-1.1…AK-1.4 |
| 5 | `services/device-service/src/write-policy.ts#resolveWritePolicies` | YENİ — `name→{deadband,maxStaleMs}` haritası; `"auto"→scale`; geçersizde fail-fast | T-2, FR-1.1…FR-1.3 |
| 6 | `services/device-service/src/write-policy.test.ts` | YENİ — 6 test | AK-1.1…AK-1.3 |
| 7 | `services/device-service/src/telemetry-write-filter.ts#TelemetryWriteFilter` | YENİ — `select` (query) + `markWritten` (command); `{value,at}` state; deadband/TTL; sayısal-olmayan güvenli taraf | T-3, FR-2.3…FR-2.6 |
| 8 | `services/device-service/src/telemetry-write-filter.test.ts` | YENİ — 8 test | AK-2.3…AK-2.6 |
| 9 | `services/device-service/src/device-service.ts#DeviceService` | `DeviceEntry.writePolicy`; `fromConfigDir` politika çözümü (register + connector subset); `publish` → `filter.select` → `scheduler.publishTelemetry(deviceId, enriched, writeSubset)` → `writeEnqueued` ise `markWritten`; `EMPTY_POLICY` | K2, K5, T-4 |
| 10 | `services/device-service/src/device-service.test.ts` | `mockScheduler.publishTelemetry` → `{ writeEnqueued: true }` | T-4 (test ref) |
| 11 | `services/device-service/src/device-scheduler.ts#publishTelemetry` | `writeTelemetries=data` parametresi; WRITE job alt küme, MANAGEMENT/WS tam; boş alt kümede WRITE atılmaz; `{writeEnqueued}` döner | T-5, FR-2.1, FR-2.2, FR-2.7 |
| 12 | `services/device-service/src/device-scheduler.test.ts` | +2 test (subset, boş alt küme) | AK-2.1, AK-2.2, AK-2.7 |
| 13 | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#write` | `allSettled` sonrası reject — commit hatası yutulmaz | K10, FR-2.8, SC-5 |
| 14 | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.test.ts` | Karakterizasyon güncellendi: `"INSERT hatası → ROLLBACK; write REJECT"` | AK-2.8 |
| 15 | `services/device-service/deployment/sample-config/device-example.json` | Örnek telemetriye `deadband:"auto"`, `maxStaleMs:60000` | T-8 (deployment) |
| 16 | `docs/architecture/TELEMETRI-SORGU-PERFORMANS-MIMARISI.md` | K4 notu — yazım indirgeme bu SPEC'te uygulandı; gapfill/locf ayrı SPEC | T-9, K1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| shared-types | `nx run shared-types:test` | 126/126 yeşil |
| core | `nx run core:test` | 103/103 yeşil |
| device-service | `nx run device-service:test` | 87/87 yeşil |
| data-service | `nx run data-service:test` | yeşil |
| write-policy (hedefli) | vitest `write-policy.test.ts` | 6/6 yeşil |
| telemetry-write-filter (hedefli) | vitest `telemetry-write-filter.test.ts` | 8/8 yeşil |
| device-scheduler subset (hedefli) | vitest `device-scheduler.test.ts` | yeşil |
| SPEC lint | `bun run spec:check docs/architecture/TELEMETRI-OKUMA-YAZMA-MIMARISI.md` | 0 hata 0 uyarı |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | `auto` türetimi + FLOAT/MQTT fail-fast | `device-config.test.ts#deviceConfigFileSchema — yazma politikası` (`"auto" integer kabul`, `"auto" FLOAT32 reddedilir`, `"auto" MQTT reddedilir`) + `write-policy.test.ts#resolveWritePolicies` (`"auto" → scale`) | 🟢 |
| AK-1.2 | `deadband ⇒ maxStaleMs` zorunluluğu | `device-config.test.ts` (`deadband tanımlı ama maxStaleMs yok → fail-fast`) + `write-policy.test.ts` (`savunmacı: deadband var maxStaleMs yok → fail-fast`) | 🟢 |
| AK-1.3 | Alan yokluğu → always-write | `device-config.test.ts` (`politika alanları yoksa kabul edilir`) + `write-policy.test.ts` (`deadband tanımsız girdi haritaya alınmaz`) | 🟢 |
| AK-1.4 | name-teklik fail-fast | `device-config.test.ts` (`aynı name iki kez → fail-fast`) | 🟢 |
| AK-2.1 | WRITE alt küme filtresi | `device-scheduler.test.ts#publishTelemetry` (`WRITE job alt kümeyi, MANAGEMENT/WS tam veriyi taşır`) | 🟢 |
| AK-2.2 | MANAGEMENT/WS tam veri (regresyon) | `device-scheduler.test.ts#publishTelemetry` (aynı test — mgmt/ws `full`) | 🟢 |
| AK-2.3 | deadband eşiği | `telemetry-write-filter.test.ts` (`markWritten sonrası eşik altı değişim haric tutulur`) | 🟢 |
| AK-2.4 | TTL (son kuyruklanandan) | `telemetry-write-filter.test.ts` (`TTL doldu → değişmese de dahil edilir`) | 🟢 |
| AK-2.5 | Soğuk başlangıç tam yazım | `telemetry-write-filter.test.ts` (`ilk görüş (state yok) dahil edilir`) | 🟢 |
| AK-2.6 | Başarısız enqueue'da state ilerlemez | `telemetry-write-filter.ts#select` (query — state değiştirmez, unit testlerle doğrulanan CQS) + `device-service.ts#publish` (`markWritten` yalnız `writeEnqueued && subset>0`) + `device-scheduler.test.ts` (`writeEnqueued:false` yolu) | 🟢 |
| AK-2.7 | Boş alt küme → job atılmaz | `device-scheduler.test.ts` (`boş alt kümede WRITE job atılmaz, MANAGEMENT/WS devam eder`) | 🟢 |
| AK-2.8 | Adaptör hata reject (karakterizasyon) | `timescaledb-adapter.test.ts` (`INSERT hatası → ROLLBACK; write REJECT eder`) | 🟢 |
| AK-3.1…AK-3.3 | gapfill/locf (UC-3) | ⛔ Defer — ayrı SPEC (A6), kapsam dışı | ⬜ |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | ACK mekanizması uygulanmadı | REV.01.1'de bilinçli kaldırıldı — kalıcılık güvencesi mevcut BullMQ retry(5) + zorunlu TTL ile sağlanıyor; persist-çapalı ACK İleri İş (§11.2). K10 (adaptör reject) bu kararın ön koşulu olarak ZORUNLU kaldı |
| 2 | UC-3 / T-7 gapfill/locf ertelendi | A6 — geniş-format sorgu (`GROUP BY bucket, tags`) + bitfield kimlik çakışması (B8) nedeniyle ayrı SPEC'e ertelendi; K1/K6 korunuyor |
| 3 | K10 adaptör reject davranış değişikliği | `write()` önceden `console.warn` ile commit hatasını yutuyordu (B9); karakterizasyon testi güncellendi — mevcut davranış değil, sözleşme değişikliği |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — Kontrat sabit: HTTP ucu/parametreleri, `TelemetryData` şekli, birim/description, value yuvarlaması değişmedi (K7)
- [x] Purity 2 — Filtre yalnız WRITE_TELEMETRY yolunda; MANAGEMENT/WS tam veri (K2 — `device-scheduler.ts#publishTelemetry`)
- [x] Purity 3 — Politika tek kaynak config; kod/tag/enum içinde gömülü yazma politikası YOK (`write-policy.ts` config girdilerinden türetir)
- [x] Purity 4 — Alarm değerlendirmesi filtrelenmemiş tam veriyle (`device-service.ts#readDevice` → `evaluateAlarms(deviceId, data)` `publish`'ten bağımsız)
- [x] Purity 5 — data-service aptal yazıcı kalır (dokunulmadı); retry + `onFailed` yolu değişmedi
- [x] Purity 6 — Uydurma veri yok (okuma yoluna dokunulmadı; gapfill/locf kapsam dışı)
- [x] Purity 7 — Okuma cadencesi değişmedi (K3); `IDevice` kontratı dokunulmadı
- [x] Purity 8 — Kimlik = name; bitfield telemetrilerine v1'de gömülü politika uygulanmaz (K8)
- [x] Elegant Object — `TelemetryWriteFilter` CQS (`select` query / `markWritten` command void); `resolveWritePolicies` saf fonksiyon; DI kuralları korunur
- [x] Async — `Promise.allSettled` kalıpları korundu (job dağıtımı, adaptör write); `for...of` + `await` yok

### A.6 Genel Durum Özeti

UC-1 (şema + çözümleme) ve UC-2 (yazma filtresi + adaptör reject) uygulandı ve doğrulandı —
tüm AK'lar yeşil; 4 proje test süiti (shared-types 126, core 103, device-service 87, data-service)
ve hedefli testler (write-policy 6, telemetry-write-filter 8, scheduler subset) temiz; `spec:check` 0 hata.
UC-3 (gapfill/locf) ⛔ Defer — A6 ile ayrı SPEC'e ertelendi (A.4 sapma 2). ACK mekanizması REV.01.1'de
bilinçli kaldırıldı (A.4 sapma 1). Kalan açık kalemler B.2'de izlenir.

**review_date:** 2026-10-09

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Politika yok | isim `policies`'te değil | her poll yazılır (always-write) | `telemetry-write-filter.test.ts` (`politikasız isim her zaman dahil`) |
| Kayıt yok (ilk/restart) | state'te `{value,at}` yok | yazılır, state kurulur | `telemetry-write-filter.test.ts` (`ilk görüş (state yok) dahil edilir`) |
| Değer değişmedi (deadband altı) | \|yeni−son\| < deadband | yazılmaz | `telemetry-write-filter.test.ts` (`markWritten sonrası eşik altı değişim haric tutulur`) |
| Değer değişti (eşik üstü) | \|yeni−son\| ≥ deadband | yazılır | `telemetry-write-filter.test.ts` (`eşik üstü değişim dahil edilir`) |
| `maxStaleMs` doldu | now−son.at ≥ maxStaleMs | değişmese de yazılır | `telemetry-write-filter.test.ts` (`TTL doldu → değişmese de dahil edilir`) |
| Sayısal olmayan değer | `value` number/finite değil | güvenli tarafta yazılır | `telemetry-write-filter.test.ts` (`sayısal olmayan değer politikalı isimde güvenli tarafta dahil edilir`) |
| Cihaz izolasyonu | iki device aynı isim | state birbirini etkilemez | `telemetry-write-filter.test.ts` (`cihazlar izole`) |
| Girdi sırası | filtre sonrası alt küme | girdi sırası korunur | `telemetry-write-filter.test.ts` (`girdi sırası korunur, yalnız gerekenler döner`) |
| WRITE job ayrımı | subset < full | WRITE subset, MANAGEMENT/WS full | `device-scheduler.test.ts` (`WRITE job alt kümeyi, MANAGEMENT/WS tam veriyi taşır`) |
| Boş alt küme | subset `[]` | WRITE atılmaz, MANAGEMENT/WS devam | `device-scheduler.test.ts` (`boş alt kümede WRITE job atılmaz`) |
| Enqueue başarısız | WRITE addJob reject | `writeEnqueued:false`, state ilerlemez | `device-scheduler.test.ts` + `device-service.ts#publish` (kod inceleme) |
| WRITE commit hatası | INSERT hata | ROLLBACK + `write()` reject (retry tetiklenir) | `timescaledb-adapter.test.ts` (`INSERT hatası → ROLLBACK; write REJECT eder`) |
| Config şema ihlali | deadband 0/negatif, `auto` yanlış tür | fail-fast (servis açılmaz) | `device-config.test.ts` (`deadband: 0 reddedilir`, `negatif deadband reddedilir`, `auto FLOAT32/MQTT reddedilir`) |
| `deadband` var `maxStaleMs` yok | eksik TTL | fail-fast | `device-config.test.ts` + `write-policy.test.ts` |
| Name tekrarı | aynı `name` iki girdi | fail-fast | `device-config.test.ts` (`aynı name iki kez → fail-fast`) |
| Politika sonradan kaldırıldı | girdi `deadband` tanımsız | always-write'a döner | `write-policy.test.ts` (`deadband tanımsız girdi haritaya alınmaz`) + `telemetry-write-filter.test.ts` (politikasız) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | SC-1 canlı DB hacim ölçümü yapılmadı (≥5× satır indirgeme hedefi) | düşük | opt-in isimlerde tablo satır sayısı ölçümü canlı ortamda |
| G2 | Coverage raporu (`≥%70 satır` kapısı) bu oturumda üretilmedi | düşük | `bun run test:coverage` koşulması |
| G3 | K9 çoklu-instance dokümantasyonu ("1 device = 1 device-service") deploy dokümanında yazılı değil | orta | partition varsayımının deploy/ops dokümanına işlenmesi |
| G4 | UC-3 gapfill/locf ertelendi (A6) — downsampled okuma sürekliliği | orta | ayrı SPEC (Faz-1 kimlik/query kararıyla birlikte) |
| G5 | AK-2.6 "enqueue başarısız → state ilerlemez" doğrudan unit testle sabitlenmedi — `select` purity + `writeEnqueued` kontratıyla dolaylı | düşük | `device-service.publish` için enqueue-reject senaryosu testi |
| G6 | SC-4 ikinci yarısı: `bun run test:inventory` bu oturumda koşulmadı | düşük | test envanterinin yeniden üretilmesi |
| G7 | `platform-commands:test` — maneuver-migration (field maneuvers.json 11 bekliyor 12 var) ÖNCEDEN VAR OLAN kırık | düşük | kapsam dışı (bu modül dosyasına dokunulmadı); ayrı iş |

**review_date:** 2026-10-09
