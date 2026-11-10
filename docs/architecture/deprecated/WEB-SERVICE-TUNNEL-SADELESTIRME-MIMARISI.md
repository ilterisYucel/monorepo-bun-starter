---
status: active
space: architecture
tags: [mimari, ws-tunnel, web-service, sadelestirme, http, telemetri, spec]
review_date: 2026-10-22
---

# Web-Service Tunnel Entegrasyon Sadeleştirmesi — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (REV.02 — developer onayı 2026-10-22).
> **REV.02 (2026-10-22):** UC-1..UC-3 uygulandı (container↔field telemetri HTTP). Bu revizyon
> kapsamı genişletir: **boss→field operasyon + field→boss olay** hattı da HTTP'ye sadeleştirilir
> (UC-4, UC-5, K9–K12); §11'deki i18n incelemesi tamamlanır (kod değişmez).
> **İlişkili:** [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md) (paket sınırı), [WS-TUNNEL-AGENT-MIMARISI.md](./WS-TUNNEL-AGENT-MIMARISI.md), [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md) (paket sözleşmesi), [AGENTS-KOMUT-MANEVRA.md](../../AGENTS-KOMUT-MANEVRA.md) (boss→field kanalı).

## 1. Amaç ve Bağlam

**Sorun:** Container↔field veri yolu (latestTelemetry, historical/downsampled) hub döneminde hâlâ **kontrol-kanalı domain mesajlarıyla** yürüyor: `TelemetrySnapshotPusher` (push), `telemetry-query`/`responder`, `TelemetrySeriesSource`/`RealtimeSnapshotSource`. Bu mesaj şemaları yalnızca **bizim iki web-service'imiz** arasında konuşulan, tünelin bilmediği (`sendControl` generic) özel bir protokoldür. Oysa iki web-service **tek ürün** (tier config ile ayrılır), endpoint'ler generic ve her iki tier'da aynıdır; hub döneminde container'ın HTTP yüzeyi consumer session'ı ile **opak relay** üzerinden erişilebilir (`/peers/:pid/services/:sid/*`). Eski "konteynere inbound HTTP açılmaz" kısıtı hub öncesi outbound-only modele aitti; hub ile geçersizdir.

**Çözüm:** Container↔field veri yolu **opak HTTP over hub relay**'e çevrilir: field, container'ın kendi generic endpoint'lerini (`/api/unified/telemetry/latest|downsampled`) çağırır. Tünel ürünü **değişmez**; web-service'teki kontrol-kanalı domain mesaj katmanı silinir. Böylece: tek taşıma biçimi (HTTP + generic stream), sıfır özel wire şeması, daha küçük bakım yüzeyi.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `services/web-service` | Telemetri kontrol-kanalı yolu → HTTP; pusher/responder/source silme; **boss→field operasyon HTTP relay; field→boss olay PULL**; wiring temizliği | Komut/manevra HTTP yolu (zaten var), telemetri-push uplink (message push) |
| `packages/ws-tunnel` + hub + agent | — (0 satır) | — |
| API sözleşmeleri | — (yanıt şekilleri aynı; field'da yeni salt-okunur `GET /api/events`) | Boss dış API'sinde şekil değişikliği yok |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-22)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **ws-tunnel/hub/agent dokunulmaz**; jeneriklikten geri adım YOK | UC-1..UC-3 |
| K2 | Container↔field telemetri yolu **hub opak relay + container'ın kendi HTTP endpoint'leri** | UC-1 |
| K3 | Telemetri **push kaldırılır**; field talep-üzeri HTTP + kısa TTL cache kullanır | UC-1 |
| K4 | Presence, session yönetimi, audit kullanıcı başlıkları **kalır** (web-service tesisatı, tunnel'a sızmaz) | UC-1 |
| K5 | Komut/manevra HTTP yolu (`HubManeuverChannel`, `field-container-commands`) **aynı kalır** | UC-3 |
| K6 | Telemetri-push uplink mesajı bu SPEC **dışı**; **boss operation/event hattı REV.02 ile kapsama alındı (K9–K11)** | §11 |
| K7 | Tip güvenliği **shared-types DTO'ları** ile korunur; tunnel'a domain tipi girmez | UC-2 |
| K8 | Dış API yanıt şekilleri DEĞİŞMEZ (`/fields/:id/containers`, `.../telemetry/downsampled`, `/notifications`) | UC-3 |
| K9 | Boss→field operasyon **hub opak relay HTTP** ile yürür; field peer servisi `field-api` (`hub.fieldServiceId`) | UC-4 |
| K10 | Operasyon sonucu **terminal-only** sözleşme: HTTP yanıtı `operation-result`'a eşlenir; 202 → `failed/still_running` | UC-4 |
| K11 | Olaylar **PULL**: boss, field'ın `GET /api/events` ucunu poll eder; `UplinkEventRelay` push silinir | UC-5 |
| K12 | `eventCodes`/cookie enjeksiyonları **KORUNUR** (i18n incelemesi §11; kod değişmez) | §11 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | latestTelemetry push + query/response kontrol-kanalı mesajlarıyla geliyor | `tunnel-extensions/telemetry-push.ts`, `field-connector/telemetry-query-responder.ts`, `container-session/hub-container-view.ts#query` |
| B2 | Historical/downsampled kontrol-kanalı `telemetry-series-source` ile | `field-connector/telemetry-series-source.ts` |
| B3 | Container generic HTTP uçları mevcut ve relay erişilebilir | `unified-routes.ts#/telemetry/latest`, `#/telemetry/downsampled`; `ws-tunnel-hub/.../access-routes.ts#/peers/:peerId/services/:serviceId/*` |
| B4 | Komut/manevra yolu zaten HTTP (örnek desen) | `container-session/hub-maneuver-channel.ts#execute` |
| B5 | "Inbound HTTP açılmaz" kısıtı hub öncesi outbound-only tasarımdan | `config/container.ts#telemetryQueryResponder` JSDoc (R4/R5) |
| B6 | Boss→field operasyon hâlâ WS kontrol kanalı: `operation-execute`/`operation-result` | `field-uplink/operation-requester.ts#send`, `field-uplink/operation-responder.ts#handle` |
| B7 | Field→boss olay hâlâ WS push: `UplinkEventRelay` → `FieldEventCollector.attachChannel` | `field-uplink/uplink-event-relay.ts#sendEvent`, `field-uplink/field-event-collector.ts#attachChannel` |
| B8 | HTTP relay + peer session altyapısı kanıtlı; field'da yürütme ucu mevcut | `hub-consumer-client.ts#access`, `container.ts#uplinkSessionServer`, `maneuver-routes.ts#/operations/:name/execute` |

## 4. Mimari

### 4.1 Akış (yeni)

```
Field web-service (consumer)                    Hub (opak relay)          Container web-service (peer)
GET /api/fields/:id/containers
  └─ ContainerProxy.latestTelemetry(cid)
       └─ TTL cache? ─ yoksa ──► openSession(cid)
                                  GET /peers/<cid>/services/container-api
                                      /api/unified/telemetry/latest ──► generic endpoint (DB)
GET /api/fields/:id/telemetry/downsampled
  └─ ContainerProxy.historical(cid, params)
       └─ GET .../api/unified/telemetry/downsampled?from&to&points&names ──► generic endpoint
```

### 4.2 Bileşenler

- `hub-container-view.ts#query` — `sendControl` yerine hub relay HTTP (openSession + fetch); sonuç TTL cache'e yazılır.
- `HubTtlCache` (yeni, küçük) — `latestTelemetry` için varsayılan 2 sn TTL (config `tunnel.latestCacheTtlMs`).
- `HubFieldRegistry` — presence (değişmez).
- `session-user-map` — audit kullanıcı başlıkları (değişmez; relay çağrısında `x-tunnel-user-*` iletilir).

### 4.3 Silinecekler (web-service)

- `infrastructure/field-connector/telemetry-query-responder.ts`, `telemetry-series-source.ts`, `realtime-snapshot-source.ts`, `interfaces.ts`, `index.ts` (+ testleri) — **REV.01'de silindi**.
- `infrastructure/tunnel-extensions/messages.ts` — telemetri/operation/event domain tipleri; **REV.02'de** operation tipleri + `operationExecuteSchema` + `EventMessage` çıkar (yalnız `TelemetryMessage`/`TunnelTelemetryPoint`/`ISnapshotSource` kalır: telemetri-push uplink).
- `infrastructure/field-uplink/operation-responder.ts` (+test), `infrastructure/field-uplink/operation-flow.spec.ts` — **REV.02**.
- `infrastructure/field-uplink/uplink-event-relay.ts` (+test) — **REV.02**.
- `config/container.ts` ilgili kayıtlar; `index.ts` start/stop çağrıları.

### 4.4 Boss→field operasyon akışı (REV.02)

```
Boss web-service (consumer)                         Hub (opak relay)              Field web-service (peer)
POST /api/fields/:fieldId/operations/:name/execute
  └─ OperationRequester.send(fieldId, opId, name, params, traceId)
       └─ access({peerId: fieldId, serviceId: "field-api",
                  path: "/api/operations/<name>/execute",
                  headers: x-tunnel-user-* + x-gd-trace-id + x-gd-operation-id})
                                                   ──► POST /api/operations/:name/execute
                                                       └─ OperationExecutor (trigger boss:<opId>)
                                                   ◄── 200 | 202 | 4xx | 5xx (OperationRunResult)
  ◄── terminal sonuç eşlemesi → { result } 200 | operation_timeout 503
```

- Field'da **yeni uç yok**; mevcut `POST /api/operations/:name/execute` kullanılır. Boss kökenini
  korumak için istek `x-gd-operation-id` başlığı taşır; rota bu başlık varsa `trigger: boss:<id>`,
  `createdBy: "boss"` ile yürütür (yoksa mevcut `manual`/kullanıcı davranışı aynen).
- Kimlik: relay çağrısı `SYSTEM_USER_HEADERS` + consumer token ile yapılır; field peer session
  altyapısı (`uplinkSessionServer`/`uplinkSessionStore`) değişmez — container'da kanıtlı mekanizma.
- `operation-boss-routes` sözleşmesi **aynen** korunur (`{ result }` / 503 `operation_timeout`).

### 4.5 Field→boss olay akışı (REV.02)

```
Field web-service (peer)                        Hub (opak relay)              Boss web-service (consumer)
GET /api/events?after=<ISO>&limit=<n>  ◄── access (peerId=field, serviceId=field-api)
  └─ log_events + UPLINK_EVENT_WHITELIST          FieldEventCollector.poll()
     (ts > after, ORDER BY ts ASC)                  ├─ client.peers() → peerType "field"
                                                    ├─ her field için cursor (after)
                                                    └─ field_events UPSERT (dedupe: field_id,event_id)
```

- Field yeni uç: `GET /api/events` (salt-okunur; admin/teknik veya hub system başlığı).
  `eventId = <fieldId>:<correlation_id|seq>` (push dönemindeki türetim aynen).
- Boss `FieldEventCollector`: `attachChannel` yerine `start()/stop()` poller; whitelist ve dedupe
  tablosu değişmez. Poll aralığı varsayılan **10 sn** (constructor ile testlerde ezilebilir; yeni env yok).
- `GET /api/notifications` sözleşmesi ve superadmin UI **değişmez**.

### 4.6 Bileşenler (REV.02)

- `field-uplink/operation-requester.ts` — WS kanal yerine `HubConsumerClient.access`; `send()` imzası aynı.
- `presentation/routes/event-routes.ts` (YENİ) — field `GET /api/events`; whitelist + cursor + limit.
- `field-uplink/field-event-collector.ts` — poller (`poll()`, cursor map, fail-safe tur atlama).
- `field-uplink/event-message.ts` (YENİ) — `EventMessage` DTO (tunnel-extensions'tan taşınır).
- Config: `hub.fieldServiceId` (varsayılan `field-api`) — boss requester + event poller kullanır.

**Ölçüm (read-only):** ~860 satır silinir (≈%26'sı test); `hub-container-view` içinde ~80 satır dönüşür; yeni TTL cache ~40 satır. Web-service toplamı 21.023 satır → **≈%4 net küçülme**; "container↔field telemetri glue" özelinde **≈%55 küçülme**.

## 5. Purity Kuralları (ZORUNLU)

1. `packages/ws-tunnel*` içine **hiçbir** domain/EMS kodu eklenmez (0 satır değişiklik).
2. Field, container'ın **yalnız generic** endpoint'lerini çağırır; container'a özel yeni uç eklenmez.
3. Wire'da domain mesaj tipi kalmaz (telemetry/query/operation/event); yalnız telemetri-push uplink
   tipi (`TelemetryMessage`) yaşar — o da bu SPEC kapsamı dışı.
4. API yanıt şekilleri değişmez; frontend etkilenmez.
5. Audit kimliği relay çağrılarında taşınır; anonim çağrı yok.
6. Field'da boss kökenli yürütme `trigger = boss:<operationId>` + `createdBy = "boss"` ile
   işaretlenir (audit/rapor izlenebilirliği korunur).

## 6. Use Case'ler

### 6.1 UC-1 — Container telemetrisi: kontrol-kanalı → HTTP relay

**Status:** ✅ Approved

**Kapsam:**
- dahil: `hub-container-view` query/historical'ın HTTP'ye çevrilmesi, TTL cache, push/query kaldırma
- hariç: komut/manevra yolu, boss event/operation

**Akış:**
1. `latestTelemetry(cid)` cache'e bakar; TTL geçmişse relay'den `GET /api/unified/telemetry/latest` çeker, cache'e yazar.
2. `historical(cid, params)` relay'den `GET /api/unified/telemetry/downsampled` çeker.
3. Peer erişilemezse mevcut davranış: boş dizi + `connectionStatus` "disconnected".

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | latestTelemetry MUST hub relay HTTP ile container generic endpoint'inden gelmeli | AK-1.1 |
| FR-1.2 | historical/downsampled MUST aynı relay üzerinden `downsampled` endpoint'inden gelmeli | AK-1.2 |
| FR-1.3 | latestTelemetry MUST kısa TTL cache ile sunulmalı (varsayılan 2 sn, config) | AK-1.3 |
| FR-1.4 | Peer erişilemezse boş + bağlantı durumu; throw YOK | AK-1.4 |
| FR-1.5 | Relay çağrıları audit kullanıcı başlıklarını taşımalı | AK-1.5 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** container bağlı **WHEN** `/api/fields/:id/containers` çağrılır **THEN** latestTelemetry container'ın generic `latest` yanıtından üretilir (kontrol-frame yok)
2. **AK-1.2 — GIVEN** grafik isteği **WHEN** downsampled çağrılır **THEN** relay'den `downsampled` endpoint'i kullanılır, nokta sayısı/penceresi korunur
3. **AK-1.3 — GIVEN** TTL içinde ikinci istek **WHEN** cache doluysa **THEN** yeni relay çağrısı yapılmaz
4. **AK-1.4 — GIVEN** peer erişilemez **WHEN** latest çağrılır **THEN** boş dizi döner, istek 200 kalır
5. **AK-1.5 — GIVEN** operatör isteği **WHEN** relay çağrısı yapılır **THEN** `x-tunnel-user-id/username` başlıkları taşınır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | HTTP latest yolu | unit (`hub-container-view.test.ts`) | ⬜ |
| AK-1.2 | HTTP downsampled | unit | ⬜ |
| AK-1.3 | TTL cache | unit | ⬜ |
| AK-1.4 | Fail-safe boş | unit | ⬜ |
| AK-1.5 | Kullanıcı başlıkları | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `HubTtlCache` + config (`tunnel.latestCacheTtlMs`)
- [ ] T-2: `hub-container-view` query/historical → relay HTTP + kullanıcı başlıkları
- [ ] T-3: Kırmızı testler (HTTP yolu, TTL, fail-safe, başlıklar)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Relay 5xx/timeout | Cache'teki son değer (varsa) döner; yoksa boş |
| Container yeniden bağlandı | Presence "connected" → cache invalidation (anahtar bazlı) |
| `names` filtresi | Relay query'sine aynen geçer |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/container-session/hub-container-view.ts` | HTTP query |
| `services/web-service/src/infrastructure/container-session/hub-ttl-cache.ts` | YENİ |
| `services/web-service/src/presentation/routes/field-routes.ts` | Davranış aynı (proxy) |

### 6.2 UC-2 — Kontrol-kanalı telemetri katmanının kaldırılması

**Status:** ✅ Approved

**Kapsam:**
- dahil: pusher, query-responder, series/snapshot source, telemetry/operation mesaj tipleri, wiring temizliği
- hariç: `EventMessage` taşıma (REV.02'de UC-5 kapsamına alındı — uygulamada `tunnel-extensions`'ta kaldı), telemetri-push uplink
- **REV.02 notu:** UC-2 tamamlandı; `EventMessage` taşıma işi UC-5/T-14'e devredildi.

**Akış:**
1. Container tier'da `telemetryQueryResponder` + `telemetrySnapshotPusher` kayıtları kaldırılır.
2. `field-connector` telemetri modülleri silinir.
3. `messages.ts`'ten yalnız `EventMessage` `field-uplink/event-message.ts`'e taşınır.
4. `index.ts` start/stop/ensureSchema çağrıları temizlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Telemetri kontrol-frame'i üreten/tüketen kod KALMAMALI (`sendControl` telemetri) | AK-2.1 |
| FR-2.2 | Container'da telemetri responder/pusher kaydı OLMAMALI | AK-2.2 |
| FR-2.3 | `EventMessage` boss event hattında korunmalı (davranış değişmez) | AK-2.3 |
| FR-2.4 | `bun run test` + `test:demo-integration` yeşil kalmalı | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** kod tabanı **WHEN** telemetri kontrol mesajı aranır **THEN** üretim/tüketim yok
2. **AK-2.2 — GIVEN** container tier açılışı **WHEN** DI kayıtları incelenir **THEN** responder/pusher yok
3. **AK-2.3 — GIVEN** boss event hattı **WHEN** testler koşulur **THEN** event collector/relay testleri yeşil
4. **AK-2.4 — GIVEN** tam test + gerçek stack **WHEN** koşulur **THEN** tümü yeşil

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Telemetri frame kalıntısı yok | grep | ⬜ |
| AK-2.2 | DI temiz | unit/kod inceleme | ⬜ |
| AK-2.3 | Event hattı korunur | web-service test | ⬜ |
| AK-2.4 | Tam doğrulama | test + entegrasyon | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `EventMessage` taşı; telemetri/operation tiplerini sil
- [ ] T-5: `tunnel-extensions` + `field-connector` telemetri modüllerini sil
- [ ] T-6: `container.ts`/`index.ts`/`server.ts` wiring temizliği

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Eski bir peer hâlâ telemetri frame'i gönderirse | Jenerik kanal bilinmeyen tipi yutar (tunnel değişmez) |
| Boss tier | Bu SPEC'te kod değişikliği yok |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/tunnel-extensions/` | SİLİNİR (event tipi taşınır) |
| `services/web-service/src/infrastructure/field-connector/` | SİLİNİR |
| `services/web-service/src/config/container.ts`, `src/index.ts` | Wiring temizliği |
| `services/web-service/src/infrastructure/field-uplink/event-message.ts` | YENİ (taşıma) |

### 6.3 UC-3 — Doğrulama ve geri uyum

**Status:** ✅ Approved

**Kapsam:**
- dahil: dış API şekilleri, komut/manevra yolunun değişmediğinin kanıtı, entegrasyon suite'i
- hariç: yeni uç/alan

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `/fields/:id/containers` yanıt şekli DEĞİŞMEZ | AK-3.1 |
| FR-3.2 | Komut/manevra HTTP yolu DEĞİŞMEZ | AK-3.2 |
| FR-3.3 | Demo entegrasyon suite'i (108) yeşil kalmalı | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** field API **WHEN** containers çağrılır **THEN** alanlar aynı (`containerId`, `connectionStatus`, `latestTelemetry`, `lastSeenAt`)
2. **AK-3.2 — GIVEN** uzak komut **WHEN** çalıştırılır **THEN** sonuç/outcome aynı
3. **AK-3.3 — GIVEN** hub stack **WHEN** `bun run test:demo-integration` **THEN** 108/108

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Şekil sabit | entegrasyon | ⬜ |
| AK-3.2 | Komut aynı | entegrasyon | ⬜ |
| AK-3.3 | 108/108 | `test:demo-integration` | ⬜ |

**T Görev Listesi:**
- [ ] T-7: Entegrasyon testlerini HTTP yoluna göre doğrula (davranış aynı)
- [ ] T-8: Tam doğrulama + KAPANIŞ

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Eski frontend | Değişiklik yok |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/integration/*` | Doğrulama (gerekirse küçük uyarlama) |

### 6.4 UC-4 — Boss→field operasyon: WS kontrol kanalı → HTTP relay

**Status:** ✅ Approved

**Kapsam:**
- dahil: `OperationRequester`'ın hub access HTTP'ye çevrilmesi, field `trigger/createdBy` kökeni,
  `OperationResponder` + `operation-execute/result` tiplerinin silinmesi, wiring
- hariç: field'ın kendi yerel operasyon uçları (davranış aynı), telemetri-push uplink, komut/manevra yolu

**Akış:**
1. Boss `operation-boss-routes` aynı istek gövdesiyle `OperationRequester.send(...)` çağırır.
2. Requester, hub access üzerinden field'ın `POST /api/operations/:name/execute` ucunu çağırır
   (`x-tunnel-user-*`, `x-gd-trace-id`, `x-gd-operation-id` başlıkları).
3. Field rota, `x-gd-operation-id` varsa `trigger: boss:<id>`, `createdBy: "boss"` ile yürütür.
4. HTTP yanıtı terminal sonuca eşlenir; ağ/timeout → `undefined` (boss rotası 503 `operation_timeout`).
5. `OperationResponder` ve WS operation tipleri kaldırılır; `index.ts` lifecycle temizlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Operasyon tetikleme MUST hub access HTTP ile field generic ucunu çağırmalı (`serviceId: field-api`) | AK-4.1 |
| FR-4.2 | `operationId` ve `traceId` field'a taşınmalı; yürütme `boss:<id>` + `createdBy=boss` ile işaretlenmeli | AK-4.2 |
| FR-4.3 | HTTP durumları MUST terminal sonuca eşlenmeli: 200 → completed/rolled_back/failed; 422 → failed; 202 → failed (`still_running`); 404/403 → rejected; ağ/timeout → undefined | AK-4.3 |
| FR-4.4 | Field'da WS `operation-execute`/`operation-result` üretimi/tüketimi KALMAMALI | AK-4.4 |
| FR-4.5 | Boss dış sözleşmesi DEĞİŞMEZ: 200 `{ result }` veya 503 `operation_timeout` | AK-4.5 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** boss tier **WHEN** operasyon tetiklenir **THEN** hub access POST `/api/operations/<name>/execute` çağrılır (WS frame yok)
2. **AK-4.2 — GIVEN** `operationId` + `traceId` **WHEN** istek field'a ulaşır **THEN** koşu `trigger=boss:<id>`, `createdBy=boss`, traceId korunur
3. **AK-4.3 — GIVEN** field 200/422/202/404/ağ-hatası **WHEN** yanıt döner **THEN** sırasıyla terminal sonuç / failed / failed(still_running) / rejected / timeout eşlenir
4. **AK-4.4 — GIVEN** kod tabanı **WHEN** `operation-execute`/`operation-result` aranır **THEN** üretim/tüketim yok
5. **AK-4.5 — GIVEN** boss rotası **WHEN** çağrılır **THEN** 200 `{ result }` veya 503 `operation_timeout` (şekil sabit)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | HTTP relay yolu | unit (`operation-requester.test.ts`) | ⬜ |
| AK-4.2 | Köken (trigger/createdBy/trace) | unit (requester + field rota) | ⬜ |
| AK-4.3 | Durum eşlemesi | unit | ⬜ |
| AK-4.4 | WS operation kalıntısı yok | grep + unit | ⬜ |
| AK-4.5 | Boss sözleşmesi sabit | unit (`operation-boss-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-9: `OperationRequester` → hub access HTTP + durum eşlemesi (kırmızı test önce)
- [ ] T-10: Field operasyon rotası `x-gd-operation-id` kökeni + test
- [ ] T-11: `OperationResponder`/`operation-flow.spec` + WS operation tiplerini sil; wiring temizle

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Field 202 (`still_running`) | `failed` + `reason: "still_running"` (terminal-only sözleşme) |
| Peer erişilemez / timeout | `undefined` → boss rotası 503 `operation_timeout`; retry yok |
| `x-gd-operation-id` yok (manuel çağrı) | Mevcut davranış: `trigger=manual`, `createdBy=<kullanıcı>` |
| Field 5xx | `failed` + gövdedeki `error`/reason |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-uplink/operation-requester.ts` | HTTP'ye çevrilir (imza aynı) |
| `services/web-service/src/presentation/routes/maneuver-routes.ts` | `x-gd-operation-id` kökeni |
| `services/web-service/src/infrastructure/field-uplink/operation-responder.ts` | SİLİNİR |
| `services/web-service/src/infrastructure/tunnel-extensions/messages.ts` | Operation tipleri SİLİNİR |
| `services/web-service/src/config/container.ts`, `src/index.ts` | Wiring temizliği |
| `packages/shared-utils/src/config/definitions.ts` | `hub.fieldServiceId` YENİ |

### 6.5 UC-5 — Field→boss olay: WS push → HTTP pull

**Status:** ✅ Approved

**Kapsam:**
- dahil: field `GET /api/events` ucu, boss `FieldEventCollector` poller, `UplinkEventRelay` silme,
  `EventMessage` taşıma (field-uplink), wiring
- hariç: `field_events` şeması, whitelist içeriği, `GET /api/notifications` sözleşmesi, superadmin UI

**Akış:**
1. Field `GET /api/events?after=<ISO>&limit=<n>` ile `log_events`'ten whitelist'li olayları döndürür
   (`eventId = <fieldId>:<correlation_id|seq>`, `ORDER BY ts ASC`).
2. Boss poller her turda `client.peers()` → `peerType "field"` listesini alır.
3. Her field için cursor (`after`) ile `GET /api/events` çağrılır; dönen olaylar `field_events`'a
   `ON CONFLICT (field_id, event_id) DO NOTHING` ile yazılır.
4. Cursor son olayın `occurred_at` değerine ilerler; peer hatasında tur atlanır, cursor ilerlemez.
5. `UplinkEventRelay` ve `attachChannel` kaldırılır; `index.ts` lifecycle güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Field MUST `GET /api/events` (after+limit) ile whitelist'li olayları döndürmeli | AK-5.1 |
| FR-5.2 | `eventId` türetimi `<fieldId>:<correlation_id|seq>` olmalı; boss dedupe korunmalı | AK-5.2 |
| FR-5.3 | Boss collector MUST poller olmalı (field peer keşfi + cursor) | AK-5.3 |
| FR-5.4 | Peer erişilemezse MUST tur atlanmalı; hata yutulmalı, cursor ilerlememeli | AK-5.4 |
| FR-5.5 | `GET /api/notifications` yanıt şekli ve demo seed DEĞİŞMEZ | AK-5.5 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** field tier **WHEN** `GET /api/events?after&limit` çağrılır **THEN** whitelist'li olaylar artan `ts` sırasıyla döner
2. **AK-5.2 — GIVEN** aynı olay iki turda gelir **WHEN** collector yazar **THEN** tek satır kalır (dedupe)
3. **AK-5.3 — GIVEN** boss tier **WHEN** poller çalışır **THEN** field peer'ları keşfedilir ve cursor ile çekilir
4. **AK-5.4 — GIVEN** peer erişilemez **WHEN** tur çalışır **THEN** hata yutulur, sonraki tur aynı cursor'dan devam eder
5. **AK-5.5 — GIVEN** bildirim ucu **WHEN** çağrılır **THEN** alanlar aynı (`fieldId`, `eventCode`, `level`, `occurredAt`, ...)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Events ucu | unit (`event-routes.test.ts`) | ⬜ |
| AK-5.2 | Dedupe korunur | unit (collector) | ⬜ |
| AK-5.3 | Poller keşif+cursor | unit (collector) | ⬜ |
| AK-5.4 | Fail-safe tur | unit (collector) | ⬜ |
| AK-5.5 | Notifications şekli sabit | unit (`notification-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-12: `GET /api/events` rotası + test (whitelist, cursor, limit)
- [ ] T-13: `FieldEventCollector` → poller (peers keşfi, cursor, fail-safe) + test
- [ ] T-14: `UplinkEventRelay` sil; `EventMessage`'ı `field-uplink/event-message.ts`'e taşı; wiring temizle

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Field peer henüz yok | Tur boş geçer; sonraki turda keşfedilir |
| Batch sınırı (limit) | Sonraki tur aynı cursor'dan devam eder (veri kaybı yok) |
| Aynı `ts`'li iki olay | Dedupe `event_id` ile; cursor `ts` (eşitlikte sıralama stabil) |
| Boss'ta `hubConsumerClient` yok | Collector kaydı oluşmaz (mevcut tier koşulu) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/event-routes.ts` | YENİ |
| `services/web-service/src/infrastructure/field-uplink/field-event-collector.ts` | Poller |
| `services/web-service/src/infrastructure/field-uplink/uplink-event-relay.ts` | SİLİNİR |
| `services/web-service/src/infrastructure/field-uplink/event-message.ts` | YENİ (taşıma) |
| `services/web-service/src/config/container.ts`, `src/index.ts`, `src/presentation/server.ts` | Wiring |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Peer yok/bağlı değil | `connectionStatus` disconnected; latest boş |
| Relay timeout | Cache son değeri (varsa) döner; yoksa boş (fail-safe) |
| Relay 401/403 | Boş + log; retry yok (session yenilenir) |
| Container yeniden bağlandı | Cache anahtarı geçersizleşir |
| Cache TTL | 2 sn (config ile ezilebilir) |
| Boss→field peer erişilemez | `undefined` → 503 `operation_timeout`; retry yok (fail-closed) |
| Field 202 (uzun süren koşu) | `failed` + `reason: "still_running"` (terminal-only) |
| Event poll turunda peer hatası | Tur atlanır, cursor ilerlemez; sonraki tur aynı yerden |
| Event batch doldu | Cursor son olayda kalır; sonraki tur devam eder |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Telemetri kontrol-frame'i üretimi/tüketimi grep=0 | kod inceleme |
| SC-2 | `ws-tunnel*` paketlerinde 0 satır değişiklik | `git diff` |
| SC-3 | `bun run test` yeşil | komut |
| SC-4 | `bun run test:demo-integration` 108/108 | komut |
| SC-5 | `bun run spec:check` temiz | komut |
| SC-6 | Net silme ≥ 700 satır (ölçüm KAPANIŞ'ta) | `git diff --stat` |
| SC-7 | Boss WS operation/event frame üretimi/tüketimi grep=0 | kod inceleme |
| SC-8 | Boss operasyon + event yolları unit testlerle kapsanır | `nx run web-service:test` |
| SC-9 | i18n incelemesi (§11) KAPANIŞ'a kanıtla işlenir | doküman |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (REV.02: UC-4/UC-5) |
| 2. JSDoc | `OperationRequester.send`, `FieldEventCollector.poll`, `event-routes` sözleşmeleri |
| 3. TEST | T-3 (kırmızı) + T-9/T-10/T-12/T-13 kırmızı testler |
| 4. IMPL | T-1..T-7 (REV.01) + T-9..T-14 (REV.02) |
| 5. KAPANIŞ | `WEB-SERVICE-TUNNEL-SADELESTIRME-KAPANIS.md`; T-8 |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Boss→field operation akışının HTTP'ye taşınması | **UC-4 ile kapandı (REV.02)** |
| A-2 | Event/uplink akışı (field-uplink) | **UC-5 ile kapandı (REV.02)** — yalnız telemetri-push uplink kapsam dışı |
| A-3 | Push'a geri dönüş (ölçülen ihtiyaç doğarsa) | Ayrı iş; HTTP webhook/poll ile |
| A-4 | Field peer'ın demo stack'te hub'a açılması (uçtan uca curl doğrulaması) | Kapsam dışı — unit + mevcut 108/108 integration yeterli (kullanıcı kararı, 2026-10-22) |

## 11. İnceleme: i18n — eventCodes / cookie enjeksiyonları (K12 — KORUNUR)

> **Karar:** Kod değişikliği YOK. Envanter ve bağımlılıklar KAPANIŞ'a kanıt olarak işlenir.

| Enjeksiyon | Yer | Tüketici / Bağımlılık |
|:-----------|:----|:----------------------|
| `GD_PMS_TUNNEL_EVENT_CODES` | `config/default.ts#GD_PMS_TUNNEL_EVENT_CODES` → `hubPeerConfig`/`fieldUplinkConfig` | ws-tunnel connector log'ları → TamperLogger → `log_events` → boss bildirimleri |
| `DEFAULT_ALERT_EVENT_CODES` | `config/container.ts#DEFAULT_ALERT_EVENT_CODES` → `alertRules.eventCodes` | TamperLogger → AlertNotifier (alarm/audit yönlendirmesi) |
| `tunnel_session` cookie | `presentation/server.ts#hubSessionRoutes` (`cookieName`) | Hub consumer oturum front-door'u |
| `container_session` cookie | `presentation/server.ts#sessionRbacOptions` + `middleware/rbac.ts` varsayılanı | Container tünel oturumu doğrulaması |
| `field_session` cookie | `presentation/server.ts#sessionRbacOptions` + `config/container.ts#uplinkSessionStore` | Field uplink oturumu doğrulaması |
| `UPLINK_EVENT_WHITELIST` / `COLLECTED_EVENT_CODES` | `field-uplink/uplink-event-relay.ts` (taşınır), `field-uplink/field-event-collector.ts` | Aktarım/toplama filtreleri — wire kontrat |

- **eventCode'lar wire kontrattır:** hub/agent peer'ları ve boss UI (`apps/superadmin/.../NotificationsPage.tsx#eventCodeLabel`)
  aynı dizgileri anahtar olarak kullanır; yeniden adlandırma hub/agent sürümleri + alertRules config'leri +
  UI i18n etiketlerini kırar.
- **Cookie adları dağınık ama sabittir** (`sessionCookieValue` çağrıları); merkezîleştirme ayrı iş.
- **i18n boşluğu (bilinen):** olay `message` alanları Türkçe serbest metindir (çevrilmez); UI etiketleri
  `eventCode` → i18n anahtarı ile çözülür. Bu SPEC kapsamında davranış değişmez.
- **Sonuç:** K12 gereği tümü korunur; ileride merkezî sabit/config modülü ayrı SPEC konusu.

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | `HubTtlCache` + config | UC-1 |
| T-2 | `hub-container-view` HTTP relay + başlıklar | UC-1 |
| T-3 | Kırmızı testler | UC-1 |
| T-4 | `EventMessage` taşı; telemetri/operation tiplerini sil | UC-2 |
| T-5 | Telemetri modüllerini sil | UC-2 |
| T-6 | Wiring temizliği | UC-2 |
| T-7 | Entegrasyon doğrulaması | UC-3 |
| T-8 | Tam doğrulama + KAPANIŞ | UC-3 |
| T-9 | `OperationRequester` HTTP + durum eşlemesi | UC-4 |
| T-10 | Field rota `x-gd-operation-id` kökeni | UC-4 |
| T-11 | `OperationResponder`/WS operation tiplerini sil + wiring | UC-4 |
| T-12 | `GET /api/events` rotası | UC-5 |
| T-13 | `FieldEventCollector` poller | UC-5 |
| T-14 | `UplinkEventRelay` sil + `EventMessage` taşı + wiring | UC-5 |
