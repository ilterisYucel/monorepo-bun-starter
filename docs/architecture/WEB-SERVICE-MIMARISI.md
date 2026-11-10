---
status: active
space: architecture
tags: [mimari, web-service, hexagonal, api, spec]
review_date: 2026-11-10
---

# Web Service — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `AUTH-MIMARISI.md`, `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`, `TELEMETRI-ZINCIRI-MIMARISI.md`, `WS-TUNNEL-HUB` (zero-trust docs).

## 1. Amaç ve Bağlam

`services/web-service` sözleşmesi: tek HTTP/WS API servisi (hexagonal), tier'lar (container/site/boss), telemetri sorgu yüzeyi, komut/manevra yüzeyleri, olay akışı, realtime yayın, hub tünel taşıması, log/audit hattı. Kimlik zinciri, komut akışı ve telemetri zinciri kendi çapraz SPEC'lerindedir — bu doküman servis kabuğunu ve sahipliği tanımlar.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Katman/purity, tier kompozisyonu, route yüzeyleri, telemetri görünümü, olay akışı, realtime, hub portu, hata/log sınırı |
| hariç | Kimlik (AUTH), komut/manevra semantiği (KOMUT-MANEVRA), telemetri kalıcılığı (TIMESERIES/TELEMETRI-ZINCIRI), tunnel çekirdeği (zero-trust) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Hexagonal: `domain/` ve `application/` Fastify/pg/redis import ETMEZ; portlar `domain/ports`'ta | Katman sınırı korunur |
| K2 | Tier kompozisyonu yalnız `config/` + `tiers/`'te; `serviceTier` route katmanına sızmaz | container/site/boss ayrımı tek yerde |
| K3 | Tek sınır log noktası (`error-handler`): ZodError 400, DomainError kind→HTTP, bilinmeyen 500; stack sızdırmaz | Hata tutarlılığı |
| K4 | Konteyner telemetri görünümü push DEĞİL: field talep-üzeri HTTP + kısa TTL cache; presence 15 sn poll; erişim hatasında boş dizi + bayat cache fallback; kısmi başarı `allSettled` | Field tier dayanıklılığı |
| K5 | Cihaz telemetri sorgu yüzeyi: `latest` limit 20000; latest-per-name pencere bazlı (5 dk, max 24 sa); tag anahtarı regex whitelist (timeseries'e devredilir) | Sorgu sözleşmesi |
| K6 | Olay akışı PULL: boss 10 sn'de bir hub üzerinden field `GET /api/events` poll eder; cursor −2 sn örtüşme; `(field_id, event_id)` dedupe | Push yok |
| K7 | Komut yüzeyi: `execute/execute-multi`; timeout = `command.timeoutMs + 2000`; zamanlı stop BullMQ `delay`; field→konteyner proxy İNCE (iş mantığı yok) + internal token fail-closed | Komut güvenliği |
| K8 | Hub tünel erişimi TEK porttan (`IHubTunnelPort`); endpoint-agnostik opak `path`; doğrudan `HubConsumerClient` importu yasak | Transport bağımsızlığı |
| K9 | Realtime: ring buffer `device:<id>:buffer` 299 kayıt; batch trim `max(299, len)`; TTL 300 sn; socket başına isim filtresi; 60 sn ölü socket sweep | WS yayın sözleşmesi |
| K10 | Config fail-fast: field/boss tier'da dev JWT secret, kısa secret veya eksik seed şifresi açılışı REDDEDER | Güvenlik kapısı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Whitelist drift: `UPLINK_EVENT_WHITELIST` (9 kod) ↔ `COLLECTED_EVENT_CODES` (5 kod) → `operation_*` olayları boss'a HİÇ yazılmıyor | `services/web-service/src/tiers/boss/infrastructure/field-event-collector.ts` |
| B2 | Purity borcu: `data-routes`/`unified-routes` route'tan doğrudan `timescale`/`postgres` çağırıyor (port yok) | `services/web-service/src/presentation/routes/` |
| B3 | `hub-session-routes`/`field-container-commands` somut `HubConsumerClient` tipini kullanıyor (port tipi olmalı) | aynı dosyalar |
| B4 | `SYSTEM_USER` + `tokenMatches` iki dosyada kopya (`internal-authorize` + `field-container-commands`) | aynı dosyalar |
| B5 | Boss tier için deployment yok (`SERVICE_TIER: boss` hiçbir compose'da yok) | `deployment/v2/dev/` |
| B6 | `update-user`/`list-users`/`logout` use-case'leri doğrudan unit testi yok (route üzerinden dolaylı) | test envanteri |

## 4. Mimari

```text
presentation/routes ──► application/use-cases ──► domain/ports ◄── infrastructure (pg/redis/hub)
        │                      │
        ├ middleware (rbac, error-handler, request-context)
        └ tiers/{container,site,boss}/registrations
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `services/web-service/src/domain/ports/hub-tunnel.ts#IHubTunnelPort` | Hub taşıma portu |
| `services/web-service/src/domain/ports/container-telemetry.ts#IContainerTelemetryPort` | Konteyner görünümü |
| `services/web-service/src/domain/ports/event-feed.ts#IEventFeedPort` | Olay akışı |
| `services/web-service/src/domain/ports/session.ts#ISessionAuthenticator` | Oturum doğrulama |
| `services/web-service/src/infrastructure/realtime/realtime-manager.ts#RealtimeManager` | Realtime yayın |
| `services/web-service/src/presentation/middleware/error-handler.ts#createErrorHandler` | Sınır hata |
| `services/web-service/src/config/container.ts` | Composition root (awilix) |

## 5. Purity Kuralları (ZORUNLU)

1. `domain/`+`application/` framework import etmez (K1).
2. `serviceTier` yalnız config/tiers'te (K2).
3. Hub erişimi yalnız porttan (K8).
4. Tek sınır hata noktası (K3).
5. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Kimlik ve Oturum Yüzeyi (referans)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: auth route'larının servis kabuğundaki yeri, rbac hook bağlama, oturum cookie akışı
- hariç: token/MFA/refresh semantiği (AUTH SPEC)

**Akış:**
1. Route'lar `rbacPreHandler` ile korunur.
2. Public önek eşleşmesi segment sınırlıdır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Korunan route'lar rbac hook'undan geçer; public önekler segment sınırlı eşleşir | AK-1.1 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** public önek `/healthz` **WHEN** `/healthz-extra` istenir **THEN** public sayılmaz (401)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Segment sınırı | unit (`rbac.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Cookie + Bearer | Cookie öncelikli |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/presentation/middleware/rbac.ts` | Yetki |

### 6.2 UC-2 — Telemetri Görünümü (Cihaz + Konteyner)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: cihaz sorgu uçları, konteyner görünümü (TTL cache/presence/kısmi başarı)
- hariç: kalıcılık (TIMESERIES), indirgeme (DEVICE-SERVICE)

**Akış:**
1. Cihaz sorgusu timeseries portundan geçer.
2. Konteyner görünümü hub üzerinden talep-üzeri okur; cache'ler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Konteyner görünümü push yapmaz; TTL cache + talep-üzeri okur | AK-2.1 |
| FR-2.2 | Bir konteyner hatası diğerlerini engellemez (kısmi başarı) | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** 3 konteyner **WHEN** görünüm istenir **THEN** sonuç cache'den/talep-üzeri döner
2. **AK-2.2 — GIVEN** 1 konteyner erişilemez **WHEN** görünüm istenir **THEN** diğerleri döner, hata boş dizi

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Cache | unit (`hub-container-view.test.ts`) | ⬜ |
| AK-2.2 | Kısmi başarı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bayat cache | `peek` TTL'e bakmaz (fallback) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/tiers/site/infrastructure/container-telemetry/**` | Görünüm |
| `services/web-service/src/presentation/routes/{data,unified}-routes.ts` | Sorgu uçları |

### 6.3 UC-3 — Komut ve Manevra Yüzeyleri (referans)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: route'ların servis kabuğundaki yeri, timeout eşlemesi, field proxy
- hariç: çözümleme/kayıt/yürütme semantiği (KOMUT-MANEVRA SPEC)

**Akış:**
1. `/api/commands` → `CommandJobBuilder` + kuyruk.
2. `/api/maneuvers` → `OperationExecutor`.
3. Field→konteyner proxy ince kalır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Komut timeout'u `command.timeoutMs + 2000` ile sınırlanır | AK-3.1 |
| FR-3.2 | Field→konteyner proxy internal token yoksa kapalıdır (fail-closed) | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** timeoutMs 3000 **WHEN** komut çalışır **THEN** 5000 ms sonra timeout döner
2. **AK-3.2 — GIVEN** internal token tanımsız **WHEN** field proxy çağrılır **THEN** yol kapalıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Timeout | unit (`command-routes.test.ts`) | ⬜ |
| AK-3.2 | Fail-closed | unit (`field-container-commands.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Internal token kopyası (B4) | A1 temizliği |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/presentation/routes/command-routes.ts` | Komut |
| `services/web-service/src/presentation/routes/maneuver-routes.ts` | Manevra |

### 6.4 UC-4 — Olay Akışı (field → boss)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: pull poll, cursor, dedupe, whitelist
- hariç: tunnel çekirdeği

**Akış:**
1. Boss collector 10 sn'de bir field `GET /api/events` çağırır.
2. Cursor −2 sn örtüşmeyle ilerler; `(field_id,event_id)` dedupe.
3. Hata turu atlar, cursor ilerlemez.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Cursor örtüşmeli ilerler; tekrar eden olay yazılmaz | AK-4.1 |
| FR-4.2 | Whitelist iki tarafta TEK kaynaktan türetilir (drift yok) | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** aynı olay iki turda gelir **WHEN** collector yazar **THEN** tek kayıt oluşur
2. **AK-4.2 — GIVEN** operation_* olayı **WHEN** uplink yapılır **THEN** boss'ta görünür (drift kapalı)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Dedupe | unit (`field-event-collector.test.ts`) | ⬜ |
| AK-4.2 | Whitelist tekilliği | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Peer hatası | Tur atlanır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/tiers/boss/infrastructure/field-event-collector.ts` | Collector |

### 6.5 UC-5 — Realtime WS Yayını

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: ring buffer, batch trim, TTL, isim filtresi, sweep, token zorunluluğu
- hariç: UI transport (UI SPEC)

**Akış:**
1. `WS_BROADCAST` worker ring buffer'a yazar.
2. Socket aboneliklerine filtreli yayın yapılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Ring buffer 299 kayıt tutar; büyük batch'te trim `max(299,len)` | AK-5.1 |
| FR-5.2 | WS handshake token zorunludur | AK-5.2 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** 960 isimli batch **WHEN** buffer'a yazılır **THEN** isim kaybı olmaz
2. **AK-5.2 — GIVEN** tokensiz bağlantı **WHEN** WS açılır **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Trim | unit (`realtime-manager.test.ts`) | ⬜ |
| AK-5.2 | Token | unit (`ws-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Ölü socket | 60 sn sweep |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/infrastructure/realtime/**` | Realtime |

### 6.6 UC-6 — Hub Tünel Taşıma

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `IHubTunnelPort`, opak path, session cookie akışı, system header'ları
- hariç: hub çekirdeği (WS-TUNNEL-HUB)

**Akış:**
1. Port üzerinden hub'a istek yapılır.
2. Oturum cookie'si tarayıcıya set edilir; consumer token sızmaz.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Tüm hub erişimi `IHubTunnelPort` üzerinden yapılır | AK-6.1 |
| FR-6.2 | Consumer token tarayıcıya sızmaz | AK-6.2 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** yeni tüketici **WHEN** hub'a erişir **THEN** port üzerinden erişir (concrete import yok)
2. **AK-6.2 — GIVEN** oturum açma **WHEN** yanıt döner **THEN** yalnız cookie set edilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Port kullanımı | kod inceleme | ⬜ |
| AK-6.2 | Token sızıntısı yok | unit (`hub-session-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-6: UC-6 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Sapma (B3) | A2 temizliği |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/domain/ports/hub-tunnel.ts` | Port |
| `services/web-service/src/infrastructure/hub-tunnel/**` | Adaptör |

### 6.7 UC-7 — Log/Audit Hattı + Sağlık + Topoloji

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: TamperLogger bootstrap, `/health`, `/api/logs`, saha topolojisi ucu
- hariç: TamperLogger çekirdeği (TAMPER-LOGGER)

**Akış:**
1. `buildTamperLogger` main'de kurulur (`asValue`).
2. `/health` logger degraded → servis degraded.
3. Topoloji JSON dosyasından okunur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | `/health` logger drop sayaçlarını yansıtır | AK-7.1 |
| FR-7.2 | Topoloji ucu kimlik ister; bozuk dosya 404 | AK-7.2 |

**Kabul Senaryoları (GWT):**

1. **AK-7.1 — GIVEN** logger degraded **WHEN** `/health` çağrılır **THEN** servis degraded döner
2. **AK-7.2 — GIVEN** bozuk topoloji dosyası **WHEN** uç çağrılır **THEN** 404 döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | Sağlık | unit (`health-route.test.ts`) | ⬜ |
| AK-7.2 | Topoloji | unit (`topology-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-7: UC-7 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Log rate limit | 60 istek/dk |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/config/container.ts` | Bootstrap |
| `services/web-service/src/presentation/routes/{health,log,topology}-route.ts` | Uçlar |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| ZodError | 400 |
| DomainError | kind→HTTP |
| Bilinmeyen | 500 (stack yok) |
| Konteyner erişim hatası | Boş dizi + bayat cache |
| Peer hatası (olay) | Tur atlanır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Katman purity korunur (domain framework'siz) | kod inceleme |
| SC-2 | Sorgu/komut/realtime semantiği testli | komut |
| SC-3 | Hub erişimi tek porttan | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 63 test dosyası / 494 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-7 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `WEB-SERVICE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `SYSTEM_USER`/`tokenMatches` kopyasının tekilleştirilmesi (B4) | İleri İş |
| A2 | `HubConsumerClient` concrete kullanımının porta çekilmesi (B3) | İleri İş |
| A3 | Route→timescale/postgres doğrudan erişimin porta çekilmesi (B2) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Whitelist drift düzeltmesi (B1) — KAPANIŞ'ta bug olarak izlenecek.
2. Purity borçları (B2/B3/B4).
3. Boss tier deployment'ı (B5).

## 12. T Görev Özeti

| T-1 | UC-1 (kimlik yüzeyi) kanıt testinin eşleştirilmesi |
| T-2 | UC-2 (telemetri görünümü) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (komut yüzeyleri) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (olay akışı) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (realtime) kanıt testlerinin eşleştirilmesi |
| T-6 | UC-6 (hub taşıma) kanıt testlerinin eşleştirilmesi |
| T-7 | UC-7 (log/health/topoloji) kanıt testlerinin eşleştirilmesi |
