---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, messaging, bullmq, redis]
review_date: 2026-11-10
---

# Mesajlaşma — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [MESAJLASMA-MIMARISI.md](./MESAJLASMA-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — `packages/core/src/messaging` bu turda değişmedi; retry politikası değişikliği `platform/messaging`'de (PLATFORM-KAPANIŞ AK-4.1 🟢 kapsamı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/core/src/messaging/bullmq-adapter.ts#BullMQAdapter` | (doğrulama) kuyruklar adla açılır; lazy `Queue` önbelleği; `close()` worker+QueueEvents+Queue toplar; `executeAndWait` throw ETMEZ (sonuç nesnesi + ezme kuralı); `stats()` allSettled; `health()` ping→boolean | K3/K4/K6, FR-1/2/3 |
| 2 | `packages/core/src/messaging/bullmq-adapter.ts#BullMQAdapter` ctor | (doğrulama) `constructor(connection: RedisConnection)` — constructed instance, ham config değil | K2 |
| 3 | `packages/core/src/messaging/redis.ts#RedisConnection` | (doğrulama) idempotent connect, koşullu quit, ping false-dalı, URL üretimi (şifreli/şifresiz) | K4, UC-4 |
| 4 | `packages/core/src/messaging/interface.ts#IMessageQueue` | (SAPMA) port `@gd-monorepo/shared-types`'tan `DeviceJob/JobType/JobResult` import ediyor; JSDoc READ_DEVICE/WRITE_TELEMETRY adlarını sayıyor — "jenerik port" K1/Purity 1 iddiası PORT düzeyinde ihlal (adapter düzeyinde tutuluyor) | K1 — S1 |
| 5 | `packages/core/src/messaging/interface.ts#WorkerOptions.stalledInterval` | (doğrulama) JSDoc'ta "işin kendi timeout'undan BÜYÜK tutulmalı" kuralı yazılı | K5 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | grep `it(` core/src/messaging | **26 test / 2 dosya** (`bullmq-adapter.test.ts` 18 + `redis.test.ts` 8) — SPEC "mevcut 26" DOĞRULANDI |
| Yaşam döngüsü | önbellek tek-Queue, close tüm kaynaklar, registerWorker ad+concurrency | |
| executeAndWait | spread + `success:false` ezme + timeout/hata `{success:false, reason}` + nesne-dışı `{success:true}` | |
| Sağlık/stats | health throw yok (2 dal), stats reddedilen→0, queueStatus/queueStats | |
| Redis | idempotent connect, koşullu quit, ping PONG/hata, URL şifre/şifresiz, connectionConfig, client | |
| Taze koşu / mutasyon | komutlar | **İLETİLMEDİ / verisi yok** (core messaging değişmedi) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Aynı ad → tek Queue | "aynı ad iki kez açılırsa tek Queue örneği" | 🟡 |
| AK-1.2 | close kaynak temizliği | "close: tüm worker + QueueEvents + Queue close'ları" | 🟡 |
| AK-2.1 | Hata/timeout → sonuç nesnesi | "timeout/hatada → {success:false, reason}" | 🟡 |
| AK-2.2 | Ezme kuralı | "worker success:false sonucu EZER" | 🟡 |
| AK-3.1 | health throw etmez | "health: ping hatası → false (throw yok)" + redis ping dalı | 🟡 |
| AK-3.2 | stats allSettled 0-sayaç | "stats: sayaçlar döner; reddedilen sayaç 0" | 🟡 |
| AK-4.1 | connect idempotent | redis.test "yalnızca bir kez client.connect" | 🟡 |
| AK-4.2 | koşullu quit | redis.test "yalnızca bağlıyken quit" | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | Port jenerik değil: `IMessageQueue` shared-types domain tiplerini (`JobType/DeviceJob`) import ediyor | K1 "adapter domain kavramı taşımaz" ADAPTER'da tutuluyor (yorum + kod doğrulandı) ama PORT ve JSDoc kuyruk adlarını sayıyor → "JobType'ı bilen TEK yer platform" iddiası tip düzeyinde yanlış. A1 sahiplik kararıyla birlikte çöz: (a) portu `string`-ad + generic payload'a indir ya da (b) sahipliği platforma taşı (port oraya gider). Karar developer — **SPEC Revizyon Önerisi** yok, mevcut A1 tam bu konu |
| S2 | B2 bağımlılık hijyeni: src'de import YOK doğrulandı (grep 0), ama `package.json` deps hâlâ taşıyor olabilir | A2 İleri İş'i geçerli; bağımlılık satırlarının temizliği ayrı iş |

### A.5 Gözle Kontrol Maddeleri

- [x] `bullmq`/`redis` importu yalnız bu klasörde (Purity 2) — servisler port görüyor
- [x] DI: RedisConnection instance paylaşımı (K2) + data-service `run.ts` örneği tutarlı
- [x] K5 stalledInterval kuralı dokümante; DATA-SERVICE `120_000` uygulaması bunu izliyor

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 8/8 AK 26 testle örtüşüyor; tek yapısal sapma S1 (port sızıntısı — A1'in ta kendisi, bilinçli İleri İş). Cross-not: WRITE_TELEMETRY `attempts:1` politikası platformda ve PLATFORM-KAPANIŞ'ta 🟢; DATA-SERVICE-KAPANIŞ S1'i ile aynı kararın tüketici tarafı — çelişki SPEC'ler arasında (DATA-SERVICE K3), kod politikasında değil. NIS-2: kuyruk veri yolu — ek güvenlik AK'sı beklenmez; job payload'ı deviceId taşır (PII yok). Mutasyon: uygulanmaz (değişiklik yok).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| İki addJob aynı ad | kuyruk cache | tek Queue | `bullmq-adapter.test.ts` #2 |
| close | açık worker'lar | 3 kaynak tipi de kapanır | #18 |
| executeAndWait hata | worker throw | `{success:false, reason}`, throw yok | #8 |
| executeAndWait nesne | `{success:false,...}` | ezme + spread | #6–7 |
| stats | bir sayaç reject | o sayaç 0 | #13 |
| health | ping false/hata | false (throw yok) | #16–17 |
| connect×2 | RedisConnection | tek client.connect | `redis.test.ts` #3 |
| disconnect yokken | bağlı değil | quit denenmez | #4 |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Port sızıntısı için "yanlış tip JobType derlenmez" koruması yok (S1) | Düşük — tip sistemi zaten kilitli | A1 kararıyla birlikte yeniden tiplendirme |
| G2 | `addRepeatableJob` cron "slash" biçiminin gerçek BullMQ uyumu testte mock üzerinden | Düşük-orta | entegrasyon (redis'li) turu — messaging İleri İş #3 kapsamında |
| G3 | Taze koşu iletilmedi | Düşük | `nx run core:test` |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 26 test eşleşti; S1 port-sızıntısı A1'e bağlandı; attempts-1 politikası PLATFORM 🟢 notuyla çaprazlandı | (yok — SPEC değişmedi) |
