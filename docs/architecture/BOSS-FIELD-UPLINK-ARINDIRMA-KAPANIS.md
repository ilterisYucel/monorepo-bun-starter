---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, web-service, boss, field-uplink, arindirma]
review_date: 2026-10-22
---

# Boss / Field-Uplink Eski Model Arındırması — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [BOSS-FIELD-UPLINK-ARINDIRMA-MIMARISI.md](./BOSS-FIELD-UPLINK-ARINDIRMA-MIMARISI.md) (✅ Approved 2026-10-22 — AK/FR/SC kaynağı).
> **Kapsam:** UC-1..UC-3 — (A) field→boss uplink kompleksinin, (B) boss tier eski yönetim
> parçalarının silinmesi; (C) yeni boss modeli + `/api/status` sadeleştirmesinin korunması.
> **Commit/push:** YAPILMAZ — değişiklikler çalışma ağacında (32 dosya, +26/−2599).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

**A grubu — field→boss uplink kompleksi (UC-1):**

| # | Dosya | Değişiklik | SPEC ref | Test ref | Durum |
|:--|:------|:-----------|:---------|:---------|:------|
| 1 | `services/web-service/src/config/container.ts#buildContainer` | `uplinkConnector`, `uplinkSessionStore`, `uplinkSessionServer`, `uplinkTunnelClient`, `telemetrySnapshotPusher` DI kayıtları silindi | K1, FR-1.1 | `web-service:test` | 🟢 |
| 2 | `services/web-service/src/index.ts#main` | Uplink lifecycle (start/stop blokları) + `as any` alımları silindi | K1, FR-1.1 | `web-service:test` | 🟢 |
| 3 | `services/web-service/src/presentation/server.ts#WebServiceServer` | `field_session` rbac dalı + `sessionCookieValue`/`toWebUser` importları silindi; `containerSessionAuthenticator` tek oturum yolu | K1, FR-1.2 | `web-service:test` | 🟢 |
| 4 | `services/web-service/src/infrastructure/tunnel-extensions/` (3 dosya) | Modül tamamen silindi (`index.ts`, `messages.ts`, `telemetry-push.ts`) | K1, FR-1.3 | dosya silindi | 🟢 |
| 5 | `services/web-service/src/infrastructure/field-uplink/field-uplink-snapshot-source.ts` | Silindi | K1, FR-1.3 | dosya silindi | 🟢 |
| 6 | `services/web-service/src/config/default.ts` | `fieldUplinkConfig`, `fieldTunnelPathAllowlist`, `resolveTelemetryIntervalMs`, `serviceAnnouncement`, `GD_PMS_TUNNEL_EVENT_CODES`, `wireGuardConfig` + `REGISTER/LIVENESS_TIMEOUT_MS` silindi | K1, FR-1.4 | `default.test.ts` | 🟢 |
| 7 | `packages/shared-utils/src/config/definitions.ts#ALL_CONFIG_DEFINITIONS` | `FIELD_UPLINK_*`, `uplink.*`, `fieldTunnel.*`, `tunnel.*Upstream`, `wg*` tanımları + `ALL_CONFIG_DEFINITIONS` kayıtları silindi | K1, FR-1.4 | `web-service:test` | 🟢 |
| 8 | `deployment/v2/dev/field/.env.example` + `docker-compose.yml` | `FIELD_UPLINK_*` satırları silindi | K1, FR-1.1 | `test:demo-integration` | 🟢 |

**B grubu — boss tier eski yönetimi (UC-2):**

| # | Dosya | Değişiklik | SPEC ref | Test ref | Durum |
|:--|:------|:-----------|:---------|:---------|:------|
| 9 | `services/web-service/src/infrastructure/field-poller.ts` | Silindi | K2, FR-2.1 | dosya silindi | 🟢 |
| 10 | `services/web-service/src/presentation/routes/admin-routes.ts` (+`.test.ts`) | Silindi (221 test satırı dahil) | K2, FR-2.1 | test silindi | 🟢 |
| 11 | `services/web-service/src/infrastructure/market/market-series.ts` (+`.test.ts`) | Silindi | K2, FR-2.2 | test silindi | 🟢 |
| 12 | `services/web-service/src/presentation/routes/market-routes.ts` (+`.test.ts`) | Silindi | K2, FR-2.2 | test silindi | 🟢 |
| 13 | `services/web-service/src/infrastructure/wireguard/` (3 dosya + 2 test) | Silindi (`wg-host-store`, `wireguard-connection`, `wireguard-driver`) | K2, FR-2.3 | testler silindi | 🟢 |
| 14 | `services/web-service/src/presentation/routes/wireguard-routes.ts` (+`.test.ts`) | Silindi | K2, FR-2.3 | test silindi | 🟢 |
| 15 | `services/web-service/src/infrastructure/hub-consumer/hub-field-registry.ts` (+`.test.ts`) | Silindi; barrel export temizlendi | K2, FR-2.4 | test silindi | 🟢 |
| 16 | `services/web-service/src/infrastructure/hub-consumer/index.ts` | `HubFieldRegistry` + tip re-export'ları silindi | K2, FR-2.4 | — | 🟢 |
| 17 | `services/web-service/src/config/container.ts#buildContainer` | `fieldPoller`, `marketSeries`, `fieldRegistry`, `wireGuard` kayıtları silindi | K2 | `web-service:test` | 🟢 |
| 18 | `services/web-service/src/index.ts#main` | `fieldPoller`/`wireGuard`/`fieldRegistry` start/stop blokları silindi | K2 | `web-service:test` | 🟢 |
| 19 | `services/web-service/src/presentation/server.ts#WebServiceServer` | `adminRoutes`/`marketRoutes`/`wireGuardRoutes` route kayıtları + `ServerDependencies` alanları silindi | K2 | `web-service:test` | 🟢 |
| 20 | `services/web-service/src/presentation/middleware/rbac.ts#ROUTE_PERMISSIONS` | `/api/market` + `/api/admin/wireguard` izin satırları silindi | K2, K5 | `web-service:test` | 🟢 |

**C grubu — korunan yeni model + statü (UC-3):**

| # | Dosya | Değişiklik | SPEC ref | Test ref | Durum |
|:--|:------|:-----------|:---------|:---------|:------|
| 21 | `services/web-service/src/presentation/routes/status-route.ts#makeStatusRoute` | Deps parametresi kaldırıldı; her zaman `{connected:false,state:"offline"}` | K4, FR-3.3 | `status-route.test.ts` | 🟢 |
| 22 | `services/web-service/src/presentation/routes/status-route.test.ts` | 3 senaryo → 1 ("her zaman offline"); `TunnelConnector` importu kaldırıldı | K4, FR-3.3 | — | 🟢 |
| 23 | `services/web-service/src/config/default.test.ts` | `fieldTunnelPathAllowlist` + `resolveTelemetryIntervalMs` test blokları silindi | K1, FR-1.4 | — | 🟢 |
| 24 | `services/web-service/src/config/container.ts#buildContainer` | `operationRequester`, `fieldEventCollector`, `hubConsumerClient`, `containerSessionAuthenticator` KORUNDU (dokunulmadı) | K3, K6, FR-3.1 | `web-service:test` | 🟢 |
| 25 | `packages/ws-tunnel*` | **0 satır** (diff boş) | K0, SC-1 | `git diff --stat` | 🟢 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tam test seti | `bun run test` | ✅ 305 dosya / **2535 test PASS** |
| web-service birim/component | `bun nx run web-service:test` | ✅ 56 dosya / **471 test PASS** |
| Demo entegrasyon (hub stack) | `bun run test:demo-integration` | ✅ 10 dosya / **108/108 PASS** |
| Canlı — hub peers | `GET /api/hub/peers` | ✅ `demo-field-agent, container-1, container-2` (connected) |
| Canlı — statü | `GET /api/status` (Bearer) | ✅ `{"connected":false,"state":"offline"}` |
| Canlı — eski uç kalktı | `GET /api/admin/fields` (Bearer) | ✅ **404** (K5 — kabul) |
| SPEC lint | `bun run spec:check` | ✅ 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Uplink kaydı yok | grep `FIELD_UPLINK` kaynakta → 0 (yalnız `docs/architecture/*` tarihsel notları); `container.ts#buildContainer` + `index.ts#main` + `definitions.ts` temiz | 🟢 |
| AK-1.2 | Oturum/tunnel yok | `container.ts#buildContainer` `uplinkSessionStore/Server`, `uplinkTunnelClient`, `telemetrySnapshotPusher` yok; `server.ts#sessionRbacOptions` yalnız `containerSessionAuthenticator` | 🟢 |
| AK-1.3 | Push modülü yok | `infrastructure/tunnel-extensions/` + `field-uplink-snapshot-source.ts` git rm; grep `tunnel-extensions` → 0 | 🟢 |
| AK-1.4 | Config temiz | `default.ts` sabitleri yok; `definitions.ts#ALL_CONFIG_DEFINITIONS` uplink/allowlist/telemetry-interval anahtarları yok; `default.test.ts` ilgili testler silindi | 🟢 |
| AK-2.1 | Admin uçları yok | `field-poller.ts` + `admin-routes.ts`(+test) silindi; `server.ts` route kaydı yok; canlı `/api/admin/fields` → 404 | 🟢 |
| AK-2.2 | Market uçları yok | `market-series.ts`(+test) + `market-routes.ts`(+test) silindi; `rbac.ts` `/api/market` satırı yok | 🟢 |
| AK-2.3 | WireGuard yok | `wireguard/` (3+2) + `wireguard-routes.ts`(+test) silindi; `wg*` config + `wireGuardConfig` yok; `rbac.ts` `/api/admin/wireguard` satırı yok | 🟢 |
| AK-2.4 | Registry yok | `hub-field-registry.ts`(+test) silindi; `hub-consumer/index.ts` barrel export temiz | 🟢 |
| AK-3.1 | Yeni boss yolu çalışır | `operationRequester`/`operationBossRoutes`, `fieldEventCollector`/`notificationRoutes`, `hubSessionRoutes`, `hubConsumerClient`, `containerSessionAuthenticator` korundu; web-service 471 test (operation-boss-routes, notification-routes, hub-session-routes, operation-requester, field-event-collector) yeşil | 🟢 |
| AK-3.2 | 108/108 | `test:demo-integration` → 108/108; canlı hub peers 3 peer connected | 🟢 |
| AK-3.3 | Statü sabit | `status-route.ts#makeStatusRoute` deps'siz; `status-route.test.ts` "her zaman offline" | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama | Etki |
|:--|:------|:---------|:-----|
| S-1 | `web-service:typecheck` pre-existing hatalar | HEAD'den gelen TS6305/TS2347 + `default.ts` `logConfig`/`alertSinkConfigs` TS7006/TS2540 — bu değişiklikle ilgisiz; yeni/dokunulan dosyalarda hata yok | Kapı değil (test/build yeşil); ayrı temizlik konusu |
| S-2 | Superadmin app fields/wireguard/market uçları artık 404 | Silinen uçların istemcisi (eski boss UI) kırılır | K5 ile kabul — boss app yeniden yazılacak |
| S-3 | Yerel gitignored `deployment/v2/dev/field/.env`'de `FIELD_UPLINK_*` kalabilir | Config tanımı olmadığından yüklenmez | Zararsız (UC-1 Edge Case) |
| S-4 | `AGENTS-DEPLOYMENT.md`/runbook'ta silinen env'lere referans yok | grep temiz; ek doküman değişikliği gerekmedi | Yok |

### A.5 Gözle Kontrol Maddeleri

- [x] `packages/ws-tunnel*` altında 0 satır değişiklik (`git diff --stat -- packages/ws-tunnel*` boş) — K0.
- [x] Kaynak ağacında `FIELD_UPLINK`, `uplinkConnector`, `uplinkSession*`, `uplinkTunnelClient`, `telemetrySnapshotPusher`, `tunnel-extensions`, `wireguard`, `fieldPoller`, `adminRoutes`, `marketSeries`, `marketRoutes`, `HubFieldRegistry` yok (kalan izler yalnız gitignore'lu `dist/` build çıktısı + diğer SPEC'lerin tarihsel notları).
- [x] `field-uplink/` dizininde yalnız yeni model kaldı: `field-event-collector.ts`, `operation-requester.ts`, `event-message.ts` (+testler) — `field-uplink-snapshot-source.ts` yok.
- [x] `hub-consumer/` dizininde `hub-consumer-client.ts` korundu; `hub-field-registry.ts` yok.
- [x] `rbac.ts` `ROUTE_PERMISSIONS` yalnız `/api/fields`, `/api/data/`, `/api/notifications` izin satırları taşıyor; market/wireguard satırları yok.
- [x] `index.ts#main` açılış/kapanış blokları: `fieldEventCollector.ensureSchema()/start()/stop()` bağımsız; uplink/fieldPoller/wireGuard/fieldRegistry lifecycle yok.
- [x] `/api/status` `makeStatusRoute()` çağrısı `server.ts`'te deps'siz — `TunnelConnector` tipi web-service'ten tamamen çıktı.
- [x] `git diff --stat` = 32 dosya, **+26 / −2599** (SC-7 ≥1500 sağlandı).

### A.6 Genel Durum Özeti

UC-1..UC-3'ün tüm görevleri (T-1..T-7) tamamlandı; kabul kriterleri AK-1.1..1.4, AK-2.1..2.4,
AK-3.1..3.3 yeşil. A grubu (field→boss uplink) ve B grubu (eski boss yönetimi) kaynak ağacından
tamamen kaldırıldı; `packages/ws-tunnel*`'a 0 satır dokunuldu (K0). Yeni boss veri yolu
(`operationRequester`/`operationBossRoutes`, `fieldEventCollector`/`notificationRoutes`,
`hubSessionRoutes`, `hubConsumerClient`, `containerSessionAuthenticator`) korundu ve testlerle
doğrulandı. `/api/status` sabit `offline` döner (K4). Net silme 2599 satır (SC-7). Dört sapma
(S-1..S-4) kayıt altında — hiçbiri kabul kriterini ihlal etmiyor. Modül kapanabilir.

**review_date:** 2026-10-22

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Uplink varlığı | Kaynakta `FIELD_UPLINK`/`uplink*` aranır | İz yok (kod/config/lifecycle silinmiş) | `web-service:test`; grep kanıtı |
| DI açılışı | Field tier `buildContainer` incelenir | `uplinkConnector`/`uplinkSession*`/`uplinkTunnelClient`/`telemetrySnapshotPusher` yok | `container.ts#buildContainer` |
| rbac oturum dalı | `sessionRbacOptions` incelenir | Yalnız `containerSessionAuthenticator`; `field_session` dalı yok | `server.ts#sessionRbacOptions` |
| Telemetri push | `tunnel-extensions`/snapshot-source aranır | Modül + timer yok | dosya silindi (git rm) |
| Config tanımları | `ALL_CONFIG_DEFINITIONS` listelenir | `FIELD_UPLINK_*`/`uplink.*`/`fieldTunnel.*`/`tunnel.*Upstream`/`wg*` yok | `definitions.ts#ALL_CONFIG_DEFINITIONS`; `default.test.ts` |
| Admin uçları | `GET /api/admin/fields` (Bearer) | 404 | canlı doğrulama |
| Market uçları | `GET /api/market` (Bearer) | 404 (route + rbac satırı yok) | `web-service:test`; `rbac.ts#ROUTE_PERMISSIONS` |
| WireGuard | Kaynakta `wireguard` aranır | İz yok | grep kanıtı |
| Hub saha registry | `hub-consumer` barrel incelenir | `HubFieldRegistry` yok; `HubConsumerClient` korunur | `hub-consumer/index.ts` |
| Yeni boss yolu | Boss tier testleri koşulur | operation/event/hub-session yolları yeşil | `operation-boss-routes.test.ts`, `notification-routes.test.ts`, `hub-session-routes.test.ts`, `operation-requester.test.ts`, `field-event-collector.test.ts` |
| Demo entegrasyon | `test:demo-integration` | 108/108 | `test:demo-integration` |
| Statü endpoint'i | `GET /api/status` | `{connected:false,state:"offline"}` (değişmez) | `status-route.test.ts` "her zaman offline"; canlı |
| Statü — connector'sız | `makeStatusRoute()` deps'siz çağrılır | 200 + offline (hata yok) | `status-route.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Öncelik |
|:--|:-------|:------|:--------|
| G1 | Boss'un field servislerine hub üzerinden erişimi (`field-api` duyurusu) | SPEC kapsam dışı (A-1); ayrı SPEC | Orta |
| G2 | Yeni boss uygulaması (eski superadmin UI yerine) | SPEC kapsam dışı (A-2); uçlar 404 (K5 kabul) | Orta |
| G3 | `web-service:typecheck` baseline kırmızı (S-1) | Pre-existing; bu işin kapısı değil | Düşük |
| G4 | `/api/status` endpoint'inin kalıcılığı | Container-web kullanıyor (A-3); boss UI yenilenince gözden geçirilir | Düşük |

**review_date:** 2026-10-22
