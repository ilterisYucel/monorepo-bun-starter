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
