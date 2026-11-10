---
status: active
space: architecture
tags: [mimari, core, messaging, bullmq, redis, spec]
review_date: 2026-11-10
---

# Mesajlaşma — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `PLATFORM-MIMARISI.md` (JobType sahibi `PlatformMessageQueue`), `DATA-SERVICE-MIMARISI.md` / `DEVICE-SERVICE-MIMARISI.md` (tüketiciler), `DOKUMAN-YAPISI-MIMARISI.md` (K16 istisnası).

## 1. Amaç ve Bağlam

`packages/core/src/messaging` klasörünün sözleşmesi: jenerik kuyruk portu (`IMessageQueue`), BullMQ adaptörü, kuyruk/worker sarmalayıcısı ve Redis bağlantısı. Domain kavramı (JobType, kuyruk adı, retry politikası) TAŞIMAZ — bunlar `platform/messaging`'in işidir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Jenerik kuyruk portu, BullMQ adapter/queue sarmalayıcı, RedisConnection yaşam döngüsü, executeAndWait semantiği, health/stats |
| hariç | JobType/kuyruk adları/retry politikası (`PLATFORM-MIMARISI`), worker iş mantığı (servisler) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Jenerik sınır: adapter hiçbir sistem/domain kavramı taşımaz; kuyruklar adla açılır, politika dışarıdan verilir | `JobType`'ı bilen TEK yer `platform/messaging#PlatformMessageQueue` |
| K2 | DI kuralı 5: `BullMQAdapter` ham config değil, constructed `RedisConnection` instance'ı alır | Tek Redis bağlantısı kuyruklar arasında paylaşılır |
| K3 | `executeAndWait` asla throw ETMEZ: hata/timeout → `{ success: false, reason }`; worker nesne döndürürse alanlar spread edilir ve worker'ın `success:false`'u EZER | Çağıran akış hata yerine sonuç görür |
| K4 | Kademeli bozulma: `stats()` `allSettled` — reddedilen sayaç 0 sayılır; `health()` yalnız redis ping, throw etmez (false döner) | Sağlık ucu asla çökmez |
| K5 | `stalledInterval` işin kendi timeout'undan (statement_timeout) BÜYÜK tutulmalı | Aksi halde asılı iş "stalled" sayılıp çift işlenir; `moveToFinished/moveToDelayed` "Missing key" ile iş kaybeder |
| K6 | Lazy kuyruk önbelleği: aynı ad → tek `Queue`; `close()` tüm worker + QueueEvents + Queue kaynaklarını toplar | Kaynak sızıntısı yok |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `IMessageQueue` kontratı core'da, implementasyon `platform/messaging`'de — sahiplik belirsiz | `packages/core/src/messaging/interface.ts` + `packages/platform/messaging/src/platform-message-queue.ts` |
| B2 | `packages/core` bağımlılık hijyeni: `nodemailer`, `p-limit`, `ws`, `@gd-monorepo/result` src'de import edilmiyor | `packages/core/package.json` |

## 4. Mimari

```text
Servisler (device/data/web/management) ──► IMessageQueue (core)
                                                │
                                                ▼
                                        BullMQAdapter ──► RedisConnection (core)
                                                │
                                                ▼
                                     PlatformMessageQueue (platform)
                                     └ JobType + retry politikası
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/core/src/messaging/interface.ts#IMessageQueue` | Jenerik kuyruk portu |
| `packages/core/src/messaging/interface.ts#WorkerOptions` | Worker seçenekleri |
| `packages/core/src/messaging/interface.ts#QueueStatus` | Kuyruk durumu |
| `packages/core/src/messaging/bullmq-adapter.ts#BullMQAdapter` | BullMQ adaptörü |
| `packages/core/src/messaging/bullmq-queue.ts#BullMQQueue` | Kuyruk/worker sarmalayıcı |
| `packages/core/src/messaging/redis.ts#RedisConnection` | Paylaşılan Redis bağlantısı |

## 5. Purity Kuralları (ZORUNLU)

1. Core messaging domain kavramı taşımaz (K1); kuyruk adı/retry politikası dışarıdan gelir.
2. `bullmq`/`redis` importu yalnız bu klasörde; tüketiciler `IMessageQueue` görür.
3. Sağlık/istatistik sorguları throw etmez (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Kuyruk Yaşam Döngüsü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kuyruk açma (lazy cache), job ekleme, repeatable job, worker kaydı, close
- hariç: retry politikası (PLATFORM)

**Akış:**
1. `addJob`/`executeAndWait` → kuyruk adıyla lazy açılır.
2. `registerWorker` → worker + QueueEvents kurulur.
3. `close()` tüm kaynakları toplar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Aynı adlı kuyruk tek `Queue` örneğiyle temsil edilir | AK-1.1 |
| FR-1.2 | `close()` worker + QueueEvents + Queue kaynaklarını kapatır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** aynı kuyruğa iki `addJob` **WHEN** kuyruklar açılır **THEN** tek `Queue` örneği kullanılır
2. **AK-1.2 — GIVEN** açık worker'lar **WHEN** `close()` çağrılır **THEN** tüm kaynaklar kapanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Lazy önbellek | unit (`bullmq-adapter.test.ts`) | ⬜ |
| AK-1.2 | Kaynak temizliği | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Kuyruk adı boş | Adla açılır; doğrulama çağıranda |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/messaging/bullmq-adapter.ts` | Adaptör |
| `packages/core/src/messaging/bullmq-queue.ts` | Sarmalayıcı |

### 6.2 UC-2 — Execute-and-Wait Semantiği

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: hata/timeout → sonuç nesnesi, worker spread + ezme kuralı
- hariç: iş mantığı (worker tüketicileri)

**Akış:**
1. `executeAndWait` job ekler ve sonucu bekler.
2. Hata/timeout → `{ success:false, reason }`.
3. Worker nesne döndürürse alanlar spread edilir; `success:false` ezilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Hata/timeout throw etmez, sonuç nesnesi döner | AK-2.1 |
| FR-2.2 | Worker'ın `success:false` değeri ezilir | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** worker hata fırlatır **WHEN** `executeAndWait` biter **THEN** `{success:false, reason}` döner
2. **AK-2.2 — GIVEN** worker `{success:false}` döner **WHEN** sonuç birleştirilir **THEN** sonuç `success:true` olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Throw yok | unit | ⬜ |
| AK-2.2 | Ezme kuralı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Timeout | `{success:false, reason:"timeout"}` |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/messaging/bullmq-adapter.ts#executeAndWait` | Sonuç birleştirme |

### 6.3 UC-3 — Sağlık ve İstatistik

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `health()`, `stats()`, `queueStatus()` kademeli bozulma
- hariç: metrik toplama (CI)

**Akış:**
1. `health()` redis ping atar; hata → false.
2. `stats()` allSettled; reddedilen sayaç 0.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `health()` throw etmez, boolean döner | AK-3.1 |
| FR-3.2 | `stats()` kısmi hata durumunda 0 sayaçla döner | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** redis kapalı **WHEN** `health()` çağrılır **THEN** `false` döner (throw yok)
2. **AK-3.2 — GIVEN** sayaçlardan biri reddeder **WHEN** `stats()` çağrılır **THEN** o sayaç 0'dır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Sağlık fail-open | unit | ⬜ |
| AK-3.2 | allSettled | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Redis yok | `health()` false |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/messaging/bullmq-adapter.ts#health` | Sağlık |

### 6.4 UC-4 — Redis Bağlantısı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: idempotent connect, koşullu disconnect, ping, URL üretimi
- hariç: kuyruk politikası

**Akış:**
1. `connect()` idempotent; URL config'ten üretilir.
2. `ping()` PONG/false.
3. `disconnect()` bağlıysa quit eder.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | `connect()` idempotenttir | AK-4.1 |
| FR-4.2 | `disconnect()` yalnız bağlıyken quit eder | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** iki kez `connect()` **WHEN** çağrılar biter **THEN** tek bağlantı açılır
2. **AK-4.2 — GIVEN** bağlantı yok **WHEN** `disconnect()` çağrılır **THEN** quit denenmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | İdempotent | unit (`redis.test.ts`) | ⬜ |
| AK-4.2 | Koşullu quit | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| URL eksik | Config üretimi hata verir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/messaging/redis.ts` | Bağlantı |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Worker hatası | Sonuç nesnesi (throw yok) |
| Redis hatası | `health()` false |
| Stall | `stalledInterval > job timeout` kuralı (K5) |
| Kuyruk adı | Dışarıdan gelir (K1) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Jenerik sınır korunur (domain kavramı yok) | kod inceleme |
| SC-2 | executeAndWait/sağlık semantiği kanıtlı | komut |
| SC-3 | Kaynak sızıntısı yok (`close`) | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 26 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `MESAJLASMA-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `IMessageQueue` sahipliği: core portu mu platform mu (B1) | İleri İş (kontrat kararı) |
| A2 | Core bağımlılık temizliği (B2) | İleri İş (paket hijyeni) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `IMessageQueue` sahiplik kararı (A1).
2. Kullanılmayan core bağımlılıklarının kaldırılması (A2).
3. Kuyruk metriklerinin izleme sistemine bağlanması.

## 12. T Görev Özeti

| T-1 | UC-1 (kuyruk yaşam döngüsü) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (executeAndWait) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (sağlık/istatistik) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (Redis) kanıt testlerinin eşleştirilmesi |
