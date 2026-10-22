---
status: active
space: architecture
tags: [mimari, ws-tunnel, web-service, sadelestirme, http, telemetri, spec]
review_date: 2026-10-22
---

# Web-Service Tunnel Entegrasyon Sadeleştirmesi — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✏️ Specified — ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md) (paket sınırı), [WS-TUNNEL-AGENT-MIMARISI.md](./WS-TUNNEL-AGENT-MIMARISI.md), [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md) (paket sözleşmesi).

## 1. Amaç ve Bağlam

**Sorun:** Container↔field veri yolu (latestTelemetry, historical/downsampled) hub döneminde hâlâ **kontrol-kanalı domain mesajlarıyla** yürüyor: `TelemetrySnapshotPusher` (push), `telemetry-query`/`responder`, `TelemetrySeriesSource`/`RealtimeSnapshotSource`. Bu mesaj şemaları yalnızca **bizim iki web-service'imiz** arasında konuşulan, tünelin bilmediği (`sendControl` generic) özel bir protokoldür. Oysa iki web-service **tek ürün** (tier config ile ayrılır), endpoint'ler generic ve her iki tier'da aynıdır; hub döneminde container'ın HTTP yüzeyi consumer session'ı ile **opak relay** üzerinden erişilebilir (`/peers/:pid/services/:sid/*`). Eski "konteynere inbound HTTP açılmaz" kısıtı hub öncesi outbound-only modele aitti; hub ile geçersizdir.

**Çözüm:** Container↔field veri yolu **opak HTTP over hub relay**'e çevrilir: field, container'ın kendi generic endpoint'lerini (`/api/unified/telemetry/latest|downsampled`) çağırır. Tünel ürünü **değişmez**; web-service'teki kontrol-kanalı domain mesaj katmanı silinir. Böylece: tek taşıma biçimi (HTTP + generic stream), sıfır özel wire şeması, daha küçük bakım yüzeyi.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `services/web-service` | Telemetri kontrol-kanalı yolu → HTTP; pusher/responder/source silme; wiring temizliği | Komut/manevra HTTP yolu (zaten var), boss→field operation akışı, event/uplink akışı |
| `packages/ws-tunnel` + hub + agent | — (0 satır) | — |
| API sözleşmeleri | — (yanıt şekilleri aynı) | Yeni uç yok |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-22)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **ws-tunnel/hub/agent dokunulmaz**; jeneriklikten geri adım YOK | UC-1..UC-3 |
| K2 | Container↔field telemetri yolu **hub opak relay + container'ın kendi HTTP endpoint'leri** | UC-1 |
| K3 | Telemetri **push kaldırılır**; field talep-üzeri HTTP + kısa TTL cache kullanır | UC-1 |
| K4 | Presence, session yönetimi, audit kullanıcı başlıkları **kalır** (web-service tesisatı, tunnel'a sızmaz) | UC-1 |
| K5 | Komut/manevra HTTP yolu (`HubManeuverChannel`, `field-container-commands`) **aynı kalır** | UC-3 |
| K6 | Boss→field operation (`OperationRequester/Responder`) ve event/uplink akışı (`FieldEventCollector`, `UplinkEventRelay`) bu SPEC **dışı** | §11 |
| K7 | Tip güvenliği **shared-types DTO'ları** ile korunur; tunnel'a domain tipi girmez | UC-2 |
| K8 | Dış API yanıt şekilleri DEĞİŞMEZ (`/fields/:id/containers`, `.../telemetry/downsampled`) | UC-3 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | latestTelemetry push + query/response kontrol-kanalı mesajlarıyla geliyor | `tunnel-extensions/telemetry-push.ts`, `field-connector/telemetry-query-responder.ts`, `container-session/hub-container-view.ts#query` |
| B2 | Historical/downsampled kontrol-kanalı `telemetry-series-source` ile | `field-connector/telemetry-series-source.ts` |
| B3 | Container generic HTTP uçları mevcut ve relay erişilebilir | `unified-routes.ts#/telemetry/latest`, `#/telemetry/downsampled`; `ws-tunnel-hub/.../access-routes.ts#/peers/:peerId/services/:serviceId/*` |
| B4 | Komut/manevra yolu zaten HTTP (örnek desen) | `container-session/hub-maneuver-channel.ts#execute` |
| B5 | "Inbound HTTP açılmaz" kısıtı hub öncesi outbound-only tasarımdan | `config/container.ts#telemetryQueryResponder` JSDoc (R4/R5) |

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

- `infrastructure/tunnel-extensions/messages.ts` (telemetri/operation tipleri; `EventMessage` `field-uplink`'e taşınır), `telemetry-push.ts`, `index.ts`.
- `infrastructure/field-connector/telemetry-query-responder.ts`, `telemetry-series-source.ts`, `realtime-snapshot-source.ts`, `interfaces.ts`, `index.ts` (+ testleri).
- `config/container.ts` ilgili kayıtlar; `index.ts` start/stop çağrıları.

**Ölçüm (read-only):** ~860 satır silinir (≈%26'sı test); `hub-container-view` içinde ~80 satır dönüşür; yeni TTL cache ~40 satır. Web-service toplamı 21.023 satır → **≈%4 net küçülme**; "container↔field telemetri glue" özelinde **≈%55 küçülme**.

## 5. Purity Kuralları (ZORUNLU)

1. `packages/ws-tunnel*` içine **hiçbir** domain/EMS kodu eklenmez (0 satır değişiklik).
2. Field, container'ın **yalnız generic** endpoint'lerini çağırır; container'a özel yeni uç eklenmez.
3. Wire'da domain mesaj tipi kalmaz (telemetry/query/operation); `EventMessage` yalnız boss event hattında (kapsam dışı) yaşar.
4. API yanıt şekilleri değişmez; frontend etkilenmez.
5. Audit kimliği relay çağrılarında taşınır; anonim çağrı yok.

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
- hariç: `EventMessage` (field-uplink'e taşınır), boss operation/event akışı

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

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Peer yok/bağlı değil | `connectionStatus` disconnected; latest boş |
| Relay timeout | Cache son değeri (varsa) döner; yoksa boş (fail-safe) |
| Relay 401/403 | Boş + log; retry yok (session yenilenir) |
| Container yeniden bağlandı | Cache anahtarı geçersizleşir |
| Cache TTL | 2 sn (config ile ezilebilir) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Telemetri kontrol-frame'i üretimi/tüketimi grep=0 | kod inceleme |
| SC-2 | `ws-tunnel*` paketlerinde 0 satır değişiklik | `git diff` |
| SC-3 | `bun run test` yeşil | komut |
| SC-4 | `bun run test:demo-integration` 108/108 | komut |
| SC-5 | `bun run spec:check` temiz | komut |
| SC-6 | Net silme ≥ 700 satır (ölçüm KAPANIŞ'ta) | `git diff --stat` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | `HubTtlCache`, `HubContainerView.query` sözleşmeleri |
| 3. TEST | T-3 (kırmızı) |
| 4. IMPL | T-1..T-7 |
| 5. KAPANIŞ | `WEB-SERVICE-TUNNEL-SADELESTIRME-KAPANIS.md`; T-8 |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Boss→field operation akışının HTTP'ye taşınması | Kapsam dışı (K6); ayrı iş |
| A-2 | Event/uplink akışı (field-uplink) | Ayrı iş; bu SPEC'te dokunulmaz |
| A-3 | Push'a geri dönüş (ölçülen ihtiyaç doğarsa) | Ayrı iş; HTTP webhook/poll ile |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Boss tier operation/event hattının HTTP'ye sadeleştirilmesi.
2. i18n: config'teki `eventCodes`/cookie enjeksiyonlarının gözden geçirilmesi (şimdilik korunur).

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
