---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, web-service, telemetri, sadelestirme, http]
review_date: 2026-10-22
---

# Web-Service Tunnel Entegrasyon Sadeleştirmesi — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md](./WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md) (✅ Approved 2026-10-22 — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Test ref'i | Geçme | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------|:------|:-----------------|
| 1 | `services/web-service/src/infrastructure/field-connector/` (8 dosya: `index.ts`, `interfaces.ts`, `telemetry-query-responder.ts`, `telemetry-series-source.ts`, `realtime-snapshot-source.ts` + testleri) | SİLİNDİ — telemetri kontrol-kanalı katmanı tamamen kaldırıldı | — (grep=0, kod inceleme) | 🟢 | UC-2 / FR-2.1 / T-5 |
| 2 | `services/web-service/src/infrastructure/tunnel-extensions/messages.ts` | `TelemetryQueryMessage`/`TelemetryResultMessage`/`TelemetryQueryErrorMessage`/`TelemetryQueryControlMessage` + `telemetryQuerySchema` çıkarıldı | — (grep=0) | 🟢 | UC-2 / FR-2.1 / T-4 |
| 3 | `services/web-service/src/config/container.ts#buildContainer` | `telemetryQueryResponder` kaydı kaldırıldı; `telemetrySnapshotPusher` yalnız field→boss uplink branch'i; `HubContainerView` artık `{peers, access, serviceId, latestCacheTtlMs}` | `hub-container-view.test.ts` | 🟢 | UC-2 / FR-2.2 / T-6 |
| 4 | `services/web-service/src/index.ts#main` | `telemetryQueryResponder` start/stop yaşam döngüsü kaldırıldı | — (kod inceleme) | 🟢 | UC-2 / FR-2.2 / T-6 |
| 5 | `services/web-service/src/infrastructure/container-session/hub-ttl-cache.ts#HubTtlCache` | YENİ — saf TTL cache; `get` TTL içinde değer, `peek` TTL'siz fallback | `hub-ttl-cache.test.ts` | 🟢 | UC-1 / FR-1.3 / T-1 |
| 6 | `services/web-service/src/infrastructure/container-session/hub-ttl-cache.test.ts` | YENİ — TTL/peek/delete/clear sözleşme testleri | `hub-ttl-cache.test.ts` | 🟢 | T-3 |
| 7 | `services/web-service/src/infrastructure/container-session/hub-container-view.ts#latestQuery` | latest → hub relay `GET /api/unified/telemetry/latest-per-name`; TTL cache; fail-safe | `hub-container-view.test.ts` | 🟢 | UC-1 / FR-1.1 / FR-1.3 / T-2 |
| 8 | `services/web-service/src/infrastructure/container-session/hub-container-view.ts#historical` | historical → `GET /api/unified/telemetry/downsampled` | `hub-container-view.test.ts` | 🟢 | UC-1 / FR-1.2 / T-2 |
| 9 | `services/web-service/src/infrastructure/container-session/hub-container-view.ts#refresh` | presence geçişi `connected` → cache anahtarı silinir (reconnect invalidation) | `hub-container-view.test.ts` | 🟢 | UC-1 / Edge Case / T-2 |
| 10 | `services/web-service/src/infrastructure/container-session/hub-container-view.test.ts` | YENİDEN YAZILDI — HTTP relay yolu (kontrol-frame emisyonu yerine `access` mock'u) | `hub-container-view.test.ts` | 🟢 | T-3 |
| 11 | `services/web-service/src/presentation/routes/unified-routes.ts#unifiedRoutes` | YENİ uç `GET /api/unified/telemetry/latest-per-name` — `timescale.getLatestPerName`, `windowMs` default 5 dk, `deviceIds`/`names` filtreleri | `unified-routes.test.ts` | 🟢 | UC-1 / FR-1.1 / T-2 |
| 12 | `services/web-service/src/presentation/routes/unified-routes.test.ts` | YENİ test — `getLatestPerName` pencere + names filtresiyle çağrılır | `unified-routes.test.ts` | 🟢 | T-3 |
| 13 | `packages/shared-utils/src/config/definitions.ts#tunnelLatestCacheTtlMs` | YENİ config `tunnel.latestCacheTtlMs` (env `TUNNEL_LATEST_CACHE_TTL_MS`, default 2000) | — (config tanımı) | 🟢 | UC-1 / FR-1.3 / T-1 |
| 14 | `deployment/v2/aws/field/device-configs/demo-mv-2.json` | SİLİNDİ — aws tier kaldırılmıştı; kalıntı | — (gözle) | 🟢 | temizlik |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tüm repo (unit/component/integration) | `bun run test` | 315 dosya / 2591 test PASS |
| Demo entegrasyon suite | `bun run test:demo-integration` | 10 dosya / 108 test PASS (597s) |
| Canlı doğrulama | `GET /api/fields/:id/containers` | 2 konteyner `connected`, latestTelemetry 2135/2117 satır, ~0.28s (TTL cache sonrası) |
| Doküman lint | `bun run spec:check` (bu doküman + SPEC) | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | HTTP latest yolu (kontrol-frame yok) | `hub-container-view.test.ts` "AK-1.1: latestQuery container'ın generic latest endpoint'ini çağırır" | 🟢 |
| AK-1.2 | HTTP downsampled | `hub-container-view.test.ts` "AK-1.2: historical downsampled endpoint'ini pencereyle çağırır" | 🟢 |
| AK-1.3 | TTL cache | `hub-container-view.test.ts` "AK-1.3: TTL içinde ikinci sorgu cache'ten döner" + `hub-ttl-cache.test.ts` | 🟢 |
| AK-1.4 | Fail-safe boş | `hub-container-view.test.ts` "AK-1.4: erişim hatasında boş dizi; son cache değeri fallback" | 🟢 |
| AK-1.5 | Kullanıcı başlıkları | `hub-container-view.test.ts` (AK-1.1 içinde `x-tunnel-user-id` doğrulaması) | 🟢 |
| AK-2.1 | Telemetri frame kalıntısı yok | `field-connector/` silindi + `messages.ts` telemetri-query tipleri çıkarıldı (kod inceleme; grep) | 🟢 |
| AK-2.2 | DI temiz | `container.ts#buildContainer` — `telemetryQueryResponder` kaydı yok (kod inceleme) | 🟢 |
| AK-2.3 | Event hattı korunur | `field-event-collector.test.ts` (web-service suite içinde yeşil) | 🟢 |
| AK-2.4 | Tam doğrulama | `bun run test` (2591) + `bun run test:demo-integration` (108) | 🟢 |
| AK-3.1 | Şekil sabit | `bun run test:demo-integration` + canlı `GET /api/fields/:id/containers` | 🟢 |
| AK-3.2 | Komut aynı | `bun run test:demo-integration` (komut/manevra yolu dokunulmadı) | 🟢 |
| AK-3.3 | 108/108 | `bun run test:demo-integration` → 10 dosya / 108 test PASS | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama | Etki |
|:--|:------|:---------|:-----|
| S-1 | `telemetry-push` (field→boss uplink) KORUNDU | SPEC K6, event/uplink akışını kapsam dışı bırakmıştı; `TelemetryMessage` (type `"telemetry"`) ve `telemetrySnapshotPusher` field branch'i silinmedi | Boss tier telemetri uplink davranışı değişmedi; yalnız container→field push kaldırıldı |
| S-2 | `EventMessage` `field-uplink/event-message.ts`'e TAŞINMADI | SPEC §4.3/UC-2 akış adımı taşımayı öngörüyordu; ancak event hattı K6/A-2 ile kapsam dışı ve `field-event-collector.ts` zaten `../tunnel-extensions`'tan import ediyor — minimal diff | `messages.ts`'te `EventMessage` tipi yerinde kaldı (davranış değişmez) |
| S-3 | `operation-*` mesaj tipleri KORUNDU | SPEC purity kuralı "operation mesaj tipi kalmaz" diyordu; ancak boss→field operation akışı K6 ile kapsam dışı (`OperationRequester/Responder`) | Boss operation hattı dokunulmadı; wire şeması değişmedi |
| S-4 | `latest` pencere default 5 dk | SPEC §7'de TTL 2 sn iken, `latest-per-name` window default 5 dk (`5 * 60 * 1000`); Redis OOM (`256MB noeviction`) durumunda pencere içi veri bayatlayıp boş dönebilir | Altyapı sorunu (Redis kapasitesi); kod kapsamı dışı |
| S-5 | Test koşusunda bir kez toplu timeout | `device-service` SIGTERM sonrası ölü kalınca entegrasyon testleri toplu timeout verdi; restart sonrası 108/108 | Test ortamı kararsızlığı; kalıcı kod sorunu değil |

### A.5 Gözle Kontrol Maddeleri

- [x] **Purity-1:** `packages/ws-tunnel*` paketlerinde 0 satır değişiklik (SC-2) — `git diff --stat` boş
- [x] **Purity-2:** Field yalnız container'ın generic uçlarını çağırır — `hub-container-view.ts#latestQuery` → `/api/unified/telemetry/latest-per-name`, `#historical` → `/api/unified/telemetry/downsampled`
- [x] **Purity-3:** Wire'da telemetri-query/result/error domain mesajı kalmadı — `field-connector/` silindi, `messages.ts` tipleri çıkarıldı (SC-1: üretim/tüketim kodu grep=0; kalanlar yalnız yorum + genel-kanal test fixture'ı)
- [x] **Purity-4:** API yanıt şekli değişmedi — `bun run test:demo-integration` 108/108 + canlı `containers` doğrulaması
- [x] **Purity-5:** Audit başlıkları relay çağrısına taşınır — `hub-container-view.ts#fetchTelemetry` `userHeaders` (varsayılan `SYSTEM_USER_HEADERS`); AK-1.5 testi doğrular
- [x] **Fail-safe:** Relay erişilemezse boş dizi, cache varsa son değer — `hub-container-view.ts#latestQuery` + AK-1.4 testi
- [x] **Reconnect invalidation:** presence `connected` geçişinde cache silinir — `hub-container-view.ts#refresh`
- [x] **Elegant Object:** `HubTtlCache` saf, `readonly` alanlar, komut/query ayrımı (`get/peek` query, `set/delete/clear` komut-void); statik metot yok
- [x] **Kod referansı:** satır-numarası referansı YOK (sembol çapası `#sembol`)
- [x] **SC-3/SC-4:** `bun run test` (2591) + `test:demo-integration` (108/108) yeşil
- [x] **SC-6:** `git diff --stat` → 885 silme / 279 ekleme (brüt silme ≥ 700 ✅; net -606 — `hub-container-view` yeniden yazımı + yeni `hub-ttl-cache` + `latest-per-name` eklemelerinden kaynaklı)

### A.6 Genel Durum Özeti

Container↔field telemetri veri yolu, kontrol-kanalı domain mesajlarından (push + `telemetry-query`/`responder` + `TelemetrySeriesSource`/`RealtimeSnapshotSource`) **hub opak relay + container'ın kendi generic HTTP uçlarına** taşındı. `field-connector/` (8 dosya, ~674 satır) ve `messages.ts` telemetri-query tipleri silindi; `HubContainerView` artık `latestQuery`/`historical` için `latest-per-name`/`downsampled` uçlarını `access()` üzerinden çağırıyor ve sonucu yeni `HubTtlCache` (default 2 sn, config `tunnel.latestCacheTtlMs`) ile seyreltiyor. Fail-safe davranışı (erişilemez peer → boş dizi + bayat cache fallback) ve reconnect'te cache invalidation testlerle sabitlendi. Tüm kapılar yeşil: 2591 unit + 108 demo-entegrasyon testi, canlı `containers` doğrulaması (~0.28s TTL cache sonrası), `ws-tunnel*` 0 satır değişiklik. Belirlenen 5 sapma (S-1..S-5) K6 kapsam-dışı kararları, bilinçli minimal-diff tercihi veya altyapı/ortam sorunudur; kalan açık dallar §B.2'de listelendi.

**review_date:** 2026-10-22

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Presence | hub keşfinden peer listesi | `connectionStatus`/`lastSeenAt`/`containerIds` doğru; device peer hariç | `hub-container-view.test.ts` "presence: connectionStatus + lastSeenAt hub keşfinden" |
| Latest (taze) | TTL dolmamış, cache boş | relay `latest-per-name` çağrılır, `names`/`windowMs` query'e geçer, audit başlıkları taşınır | `hub-container-view.test.ts` "AK-1.1" |
| Latest (cache hit) | TTL içinde ikinci sorgu | yeni relay çağrısı YAPILMAZ | `hub-container-view.test.ts` "AK-1.3" + `hub-ttl-cache.test.ts` |
| TTL cache | süre doldu | `get` → `undefined`; `peek` son değeri döner | `hub-ttl-cache.test.ts` |
| Historical | grafik isteği | `downsampled` endpoint'i `from`/`to`/`points` ile çağrılır | `hub-container-view.test.ts` "AK-1.2" |
| Peer erişilemez | `access` throw | boş dizi; son cache değeri fallback (200 kalır) | `hub-container-view.test.ts` "AK-1.4" |
| Peer bağlı değil | `presence` boş | `latestQuery` boş döner, relay çağrısı YAPILMAZ | `hub-container-view.test.ts` "bağlı olmayan konteyner sorgusu boş döner" |
| Yeniden bağlanma | peer `idle`→`connected` geçişi | cache anahtarı silinir; TTL dolmadan yeni sorgu relay'e gider | `hub-container-view.test.ts` "yeniden bağlanan peer'ın cache'i geçersizleşir" |
| latest-per-name ucu | `deviceIds`/`names`/`windowMs` filtreleri | `timescale.getLatestPerName` pencere + names ile çağrılır | `unified-routes.test.ts` "latest-per-name" |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Relay 401/403 yanıt yolu (`response.ok === false`) açık testi yok — throw-yoluyla dolaylı örtüşür | düşük | `fetchTelemetry` `!response.ok` dalına unit test ekle |
| G2 | HTTP zaman aşımı dalı (`Promise.race` → `queryTimeoutMs`) açık testi yok | düşük | `accessFn` hiç resolve etmeyen stub + `queryTimeoutMs` küçük değerle test |
| G3 | `latest-per-name` `deviceIds` filtresi ve `windowMs` üst sınırı (24s clamp) / negatif `windowMs` (5 dk default) assertion'ı yok | düşük | `unified-routes.test.ts` genişlet |
| G4 | AK-1.5 gerçek operatör başlıkları (canlı `x-tunnel-user-*`) entegrasyon/canlı doğrulanmadı — unit yalnız `system` varsayılanını kontrol eder | orta | demo-entegrasyon veya canlı koşuda audit başlık iletimini doğrula |
| G5 | 5 dk pencere + Redis OOM durumunda bayat/boş snapshot (S-4) | orta | Redis kapasitesi (noeviction) gözden geçir — altyapı işi, kod kapsamı dışı |

**review_date:** 2026-10-22

---

## REV.02 — Boss→field Operasyon + Field→boss Olay (HTTP Sadeleştirme)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (REV.02 — UC-4/UC-5, K9–K12).
> **SPEC:** [WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md](./WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md) (✅ Approved 2026-10-22 — REV.02).
> **Kapsam:** boss→field operasyon WS kontrol kanalı (`operation-execute`/`operation-result`, `OperationResponder`) → hub access HTTP; field→boss olay WS push (`UplinkEventRelay`) → HTTP pull (`GET /api/events` + `FieldEventCollector` poller); `EventMessage` taşıma; ek hub-consumer temizliği; i18n (K12) incelemesi (kod değişikliği YOK).

### A. DOĞRULAMA

#### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Test ref'i | Geçme | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------|:------|:-----------------|
| 1 | `services/web-service/src/infrastructure/field-uplink/operation-requester.ts#OperationRequester` | WS `operation-execute` kanal yerine `HubConsumerClient.access` HTTP; `send()` imzası AYNI; terminal-only durum eşlemesi | `operation-requester.test.ts` | 🟢 | UC-4 / FR-4.1 / FR-4.3 / T-9 |
| 2 | `services/web-service/src/infrastructure/field-uplink/operation-responder.ts` (+ `operation-responder.test.ts`) | SİLİNDİ — field WS `operation-execute` yanıtlayıcı | — (grep=0) | 🟢 | UC-4 / FR-4.4 / T-11 |
| 3 | `services/web-service/src/infrastructure/field-uplink/operation-flow.spec.ts` | SİLİNDİ — WS operasyon akış spec'i | — | 🟢 | UC-4 / T-11 |
| 4 | `services/web-service/src/presentation/routes/maneuver-routes.ts#bossOperationId` | `x-gd-operation-id` varsa `trigger=boss:<id>` + `createdBy=boss` (+ `traceId`); yoksa `manual`/kullanıcı | `maneuver-routes.test.ts` "UC-4: x-gd-operation-id kökeni" | 🟢 | UC-4 / FR-4.2 / T-10 |
| 5 | `services/web-service/src/presentation/routes/operation-boss-routes.ts#operationBossRoutes` | Sözleşme AYNI (`{result}` / 503 `operation_timeout`); JSDoc HTTP'ye güncellendi | `operation-boss-routes.test.ts` | 🟢 | UC-4 / FR-4.5 |
| 6 | `services/web-service/src/infrastructure/field-uplink/uplink-event-relay.ts` (+ test) | SİLİNDİ — field→boss WS `event` push | — | 🟢 | UC-5 / FR-5.4 / T-14 |
| 7 | `services/web-service/src/infrastructure/field-uplink/event-message.ts#EventMessage` | YENİ — `EventMessage` DTO (`tunnel-extensions`'tan taşındı) | `field-event-collector.test.ts` | 🟢 | UC-5 / T-14 |
| 8 | `services/web-service/src/infrastructure/tunnel-extensions/messages.ts` | operation/event domain tipleri çıkarıldı; yalnız `TelemetryMessage`/`TunnelTelemetryPoint`/`ISnapshotSource` (telemetri-push uplink) kaldı | — (grep) | 🟢 | UC-4 / UC-5 / FR-4.4 / T-14 |
| 9 | `services/web-service/src/presentation/routes/event-routes.ts#eventRoutes` | YENİ — `GET /api/events?after&limit` (whitelist + `eventId=<fieldId>:<corr|seq>` + `ORDER BY ts ASC`) | `event-routes.test.ts` | 🟢 | UC-5 / FR-5.1 / FR-5.2 / T-12 |
| 10 | `services/web-service/src/infrastructure/field-uplink/field-event-collector.ts#FieldEventCollector` | push (`attachChannel`) → poller: `poll()` + `peers()` keşfi + cursor + 2 sn örtüşme + fail-safe tur + dedupe `ON CONFLICT` | `field-event-collector.test.ts` | 🟢 | UC-5 / FR-5.3 / FR-5.4 / T-13 |
| 11 | `services/web-service/src/infrastructure/hub-consumer/consumer-relay.ts` + `hub-consumer-channel.ts` (+ testler) | SİLİNDİ — işlevsiz WS relay/channel (sapma S-6) | — | 🟢 | temizlik / K9–K11 |
| 12 | `services/web-service/src/infrastructure/hub-consumer/index.ts` | `ConsumerRelay`/`HubConsumerChannel` export'ları kaldırıldı | — | 🟢 | temizlik |
| 13 | `services/web-service/src/config/container.ts#buildContainer` | `operationResponder`/`uplinkEventRelay`/`hubConsumerRelay`/`hubConsumerChannel` kayıtları kaldırıldı; `operationRequester` `{channel}`→`{client, serviceId}`; `fieldEventCollector` HTTP client'a bağlandı; `containerProxy` guard `hubConsumerClient`'a indirildi | — (kod inceleme) | 🟢 | UC-4 / UC-5 / T-11 / T-14 |
| 14 | `services/web-service/src/index.ts#main` | responder/relay/channel lifecycle kaldırıldı; collector `ensureSchema`+`start()` (attachChannel yerine); `siteFieldId` wiring | — | 🟢 | UC-4 / UC-5 |
| 15 | `services/web-service/src/presentation/server.ts#registerRoutes` | `eventRoutes` (field, `siteFieldId`) kaydı; `operationBossRoutes` yorum güncellendi | — | 🟢 | UC-4 / UC-5 |
| 16 | `packages/shared-utils/src/config/definitions.ts#hubFieldServiceId` | YENİ config `hub.fieldServiceId` (env `HUB_FIELD_SERVICE_ID`, default `field-api`) | — (config tanımı) | 🟢 | UC-4 / FR-4.1 / T-9 |
| 17 | `AGENTS-KOMUT-MANEVRA.md` | Boss→field kanal satırı WS → HTTP relay + `GET /api/events` pull | — | 🟢 | doküman senkronu |

#### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tüm repo (unit/component/integration) | `bun run test` | 311 dosya / 2586 test PASS |
| Demo entegrasyon suite | `bun run test:demo-integration` | 10 dosya / 108 test PASS |
| Doküman lint (SPEC) | `bun run spec:check docs/architecture/WEB-SERVICE-TUNNEL-SADELESTIRME-MIMARISI.md` | 0 hata / 0 uyarı |
| Diff ölçümü | `git diff --stat` | 24 dosya (tracked) — +966 / −1580 (net −614; brüt silme 1580 ≥ 700 → SC-6 ✅); 3 yeni dosya untracked (`event-routes.ts`, `event-routes.test.ts`, `event-message.ts`) |

#### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-4.1 | HTTP relay yolu (WS frame yok) | `operation-requester.test.ts` "hub access POST'u system kimliği + köken başlıklarıyla atar; 200 sonucu eşler" | 🟢 |
| AK-4.2 | Köken (trigger/createdBy/trace) | `operation-requester.test.ts` (başlıklar) + `maneuver-routes.test.ts` "UC-4: x-gd-operation-id kökeni → trigger boss:<id> + createdBy boss" | 🟢 |
| AK-4.3 | Durum eşlemesi (200/422/202/4xx/5xx/ağ/timeout) | `operation-requester.test.ts` (202/422/404/403/5xx/ağ/timeout senaryoları) | 🟢 |
| AK-4.4 | WS operation kalıntısı yok | grep=0 (`operation-execute` yok); `operation-result` yalnız requester DTO `type` alanı + JSDoc + test fixture (dış şekil uyumu FR-4.5) | 🟢 |
| AK-4.5 | Boss sözleşmesi sabit (200 `{result}` / 503 `operation_timeout`) | `operation-boss-routes.test.ts` "admin → requester.send → 200 {result}" + "timeout (undefined) → 503 operation_timeout" | 🟢 |
| AK-5.1 | Events ucu (whitelist + after + limit + artan ts) | `event-routes.test.ts` "whitelist + after + limit ile sorgular; eventId/level/category eşler" | 🟢 |
| AK-5.2 | Dedupe korunur (`ON CONFLICT (field_id, event_id)`) | `field-event-collector.test.ts` "field peer'ı keşfeder … dedupe INSERT yazar" | 🟢 |
| AK-5.3 | Poller keşif + cursor | `field-event-collector.test.ts` (backlog cursor + "ikinci tur cursor - 2 sn örtüşmesinden devam eder") | 🟢 |
| AK-5.4 | Fail-safe tur (hata yutulur, cursor ilerlemez) | `field-event-collector.test.ts` "peer erişilemezse tur atlanır, cursor ilerlemez" | 🟢 |
| AK-5.5 | Notifications şekli sabit | `notification-routes.test.ts` (collector `list`/`countSince` sözleşmesi değişmedi) | 🟢 |

#### A.4 Sapmalar

| # | Sapma | Açıklama | Etki |
|:--|:------|:---------|:-----|
| S-6 | Hub consumer WS relay/channel temizliği | `consumer-relay.ts` + `hub-consumer-channel.ts` (+ testler) + DI kayıtları artık işlevsizdi (operasyon/event WS kanalları kalkınca tüketen kalmadı) | Kapsam genişlemesi; işlevsiz kod silindi, davranış değişmez |
| S-7 | Demo'da field peer açılmadı | SPEC A-4 — boss→field operasyon + olay uçtan uca curl doğrulaması yok | Unit + mevcut 108/108 integration yeterli (kullanıcı kararı) |
| S-8 | Field peer session cookie adı | Hub `peerSessionCookie` config'i deployment tarafında `field_session` olmalı; kod zaten `field_session` kullanıyor (`server.ts#sessionRbacOptions` + `container.ts#uplinkSessionStore` `"field-session"`) | Kod değişikliği gerekmedi; deployment notu |
| S-9 | `web-service:typecheck` gürültüsü | TS6305/TS2347 proje-referans gürültüsü pre-existing; yeni dosyalarda yalnız TS6305 görüldü | Typecheck kapısı dışı; kalıcı kod hatası değil |

#### A.5 Gözle Kontrol Maddeleri

- [x] **SC-7:** WS operation/event frame üretimi/tüketimi grep=0 — `operation-execute` yok; `operation-result` yalnız `operation-requester.ts#OperationResult` DTO `type` alanı + JSDoc (dış şekil uyumu, FR-4.5)
- [x] **SC-2:** `packages/ws-tunnel*` altında 0 değişiklik — `git status` boş
- [x] **SC-3:** `bun run test` → 311 dosya / 2586 PASS
- [x] **SC-4:** `bun run test:demo-integration` → 108/108
- [x] **SC-5:** `bun run spec:check` (SPEC) → 0 hata / 0 uyarı
- [x] **SC-6:** brüt silme 1580 ≥ 700 (net −614)
- [x] **SC-8:** boss operasyon + event yolları unit testlerle kapsanır (`operation-requester.test.ts`, `operation-boss-routes.test.ts`, `maneuver-routes.test.ts`, `event-routes.test.ts`, `field-event-collector.test.ts`)
- [x] **SC-9 / K12:** i18n incelemesi (SPEC §11) kanıtla işlendi — kod değişikliği YOK (bkz. A.6)
- [x] **K12 — KORUNUR:** `GD_PMS_TUNNEL_EVENT_CODES`, `DEFAULT_ALERT_EVENT_CODES`, `tunnel_session`/`container_session`/`field_session` cookie enjeksiyonları, `UPLINK_EVENT_WHITELIST`/`COLLECTED_EVENT_CODES`, TamperLogger/alertRules, superadmin `NotificationsPage` i18n etiketleri — hiçbiri diff'te yok (git diff yalnız UC-4/UC-5 bileşenleri)
- [x] **Elegant Object:** `OperationRequester`/`FieldEventCollector` `readonly` alanlar, tek primary constructor, komut/query ayrımı (`send`/`poll`/`start`/`stop` komut-void; `list`/`countSince` query), statik metot yok
- [x] **Purity-6:** field `trigger=boss:<id>` + `createdBy=boss` işaretlemesi — `maneuver-routes.ts#bossOperationId` + test
- [x] **Kod referansı:** satır-numarası referansı YOK (`#sembol` çapası)

#### A.6 Genel Durum Özeti

Boss→field operasyon WS kontrol kanalı (`operation-execute`/`operation-result`, `OperationResponder`) silindi; `OperationRequester` artık hub opak relay üzerinden field'ın kendi `POST /api/operations/:name/execute` ucunu çağırıyor (`serviceId: field-api`, system kimliği + `x-gd-operation-id`/`x-gd-trace-id`) ve terminal-only durum eşlemesi yapıyor (200→completed/rolled_back/failed, 422→failed, 202→failed/still_running, 4xx→rejected, 5xx→failed, ağ/timeout→undefined→503). Field tarafında aynı rota `x-gd-operation-id` varlığında koşuyu `trigger=boss:<id>` + `createdBy=boss` ile işaretliyor (audit izlenebilirliği korunur). Field→boss olay WS push'u (`UplinkEventRelay`) silindi; yerine field `GET /api/events` ucu (whitelist + `eventId=<fieldId>:<corr|seq>` + `ORDER BY ts ASC`) ve boss `FieldEventCollector` poller'ı (`peers()` keşfi, cursor, 2 sn örtüşme, fail-safe tur, `ON CONFLICT` dedupe) geldi. `EventMessage` `field-uplink/event-message.ts`'e taşındı; `messages.ts` yalnız telemetri-push tiplerini taşıyor. Ek temizlik (S-6) işlevsiz hub consumer WS relay/channel katmanını kaldırdı. i18n/eventCode/cookie enjeksiyonları (K12) korundu — kod değişikliği YOK. Tüm kapılar yeşil: 2586 unit + 108 demo-entegrasyon testi, `ws-tunnel*` 0 satır değişiklik, brüt silme 1580.

**review_date:** 2026-10-22

### B. TEST KAPSAMI

#### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Operasyon tetikleme | boss tier | hub access POST `/api/operations/<name>/execute` + system kimliği + `x-gd-operation-id`/`x-gd-trace-id` | `operation-requester.test.ts` "hub access POST'u …" |
| 200 completed | field `status: completed` | `{type: operation-result, operationId, status: completed}` | `operation-requester.test.ts` |
| 200 rolled_back + outcomes | field `status: rolled_back` + `outcomes` | `results` özetine dönüşür (`step`/`system`/`maneuver`/`ok`/`reason`) | `operation-requester.test.ts` "200 + outcomes → results özetine dönüşür" |
| 202 uzun koşu | field `status: running` | `failed` + `reason: still_running` (terminal-only) | `operation-requester.test.ts` "202 (uzun koşu) → failed/still_running" |
| 422 | field `failed` + `reason` | `failed` + gövde `reason` | `operation-requester.test.ts` "422 → failed + gövdedeki reason" |
| 404/403 | field `not_found` / boş | `rejected` (+ `not_found` / `invalid_request`) | `operation-requester.test.ts` "404/403 → rejected" |
| 5xx | field 502 | `failed` + `remote_http_502` | `operation-requester.test.ts` "5xx → failed" |
| Ağ hatası / timeout | `access` throw / hiç resolve | `undefined` | `operation-requester.test.ts` "ağ hatası → undefined" + "timeout → undefined" |
| Boss rotası timeout | `send` → `undefined` | 503 `operation_timeout` | `operation-boss-routes.test.ts` "timeout (undefined) → 503" |
| Boss rotası requester yok | tier boss değil | 503 `operation_requester_unavailable` | `operation-boss-routes.test.ts` |
| Field kökeni | `x-gd-operation-id` var | `trigger=boss:<id>` + `createdBy=boss` + `traceId` | `maneuver-routes.test.ts` "UC-4: x-gd-operation-id kökeni" |
| Events yetki | yetkisiz istek | 403 (fail-closed) | `event-routes.test.ts` "yetkisiz istek → 403" |
| Events delta | `after` + `limit` | whitelist'li `log_events`, `ORDER BY ts ASC`, `eventId=<fieldId>:<corr|seq>` | `event-routes.test.ts` "whitelist + after + limit ile sorgular" |
| Events `after` yok / `correlation` yok | epoch / `seq` | epoch'tan; `eventId=<fieldId>:<seq>` | `event-routes.test.ts` "after yoksa epoch; correlation yoksa seq" |
| Events geçersiz `after` | `"dun"` | 400 `invalid_after` | `event-routes.test.ts` "geçersiz after → 400" |
| Events limit kırpma | `5000` / `0` | `1000` / `1` | `event-routes.test.ts` "limit 1..1000 aralığına kırpılır" |
| Events iç token | `x-internal-token` | 200 (hub programatik yolu) | `event-routes.test.ts` "iç token ile erişir" |
| Poller keşif | `peers()` → field connected | backlog cursor (1 saat) + `limit=200` + dedupe INSERT | `field-event-collector.test.ts` "field peer'ı keşfeder" |
| Poller whitelist savunma | `eventCode` dışı | yok sayılır (INSERT yok) | `field-event-collector.test.ts` "whitelist dışı olay yok sayılır" |
| Poller örtüşme | 2. tur | cursor − 2 sn'den devam | `field-event-collector.test.ts` "ikinci tur cursor - 2 sn örtüşmesinden devam eder" |
| Poller fail-safe | peer throw | tur atlanır, cursor ilerlemez | `field-event-collector.test.ts` "peer erişilemezse tur atlanır" |
| Poller bağlı değil | peer `disconnected`/`container` | atlanır (0 çağrı) | `field-event-collector.test.ts` "bağlı olmayan field peer'ı atlanır" |
| Demo seed | `demoSeed` açık/kapalı | 3 örnek bildirim (idempotent) / 0 | `field-event-collector.test.ts` "demoSeed açıkken/kapalıyken" |

#### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G6 | `OperationRequester#json` gövde çözümü hata yolu (JSON olmayan gövde) açık testi yok — try/catch üstü kapalı örtüşür | düşük | non-JSON gövde stub'ı ile açık test |
| G7 | `withTimeout` zaman aşımı sınırında yarış (timer vs response aynı anda) deterministik testi yok | düşük | fake timer ile sınır senaryosu |
| G8 | Boss→field operasyon + olay uçtan uca (field peer hub'a açık) doğrulanmadı — S-7/A-4 | orta | field peer'ı demo stack'e açıp curl/entegrasyon (ayrı iş) |
| G9 | `GET /api/events` whitelist'i ile boss `COLLECTED_EVENT_CODES` arasında drift (iki liste elle senkron) | düşük | tek kaynak sabiti (paylaşılan modül) — ayrı SPEC |
| G10 | `FieldEventCollector#list`/`countSince` JOIN edge (field satırı silinmiş → `field_name` null fallback) açık testi yok | düşük | `list` testi genişlet |

**review_date:** 2026-10-22
