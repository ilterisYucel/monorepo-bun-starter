---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, hub-servis, consumer, monorepo, gecis]
review_date: 2026-10-19
---

# ws-tunnel Hub-Servis Tüketici Entegrasyonu (Monorepo P3) — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md](./WS-TUNNEL-HUB-CONSUMER-P3-MIMARISI.md) (✅ Approved 2026-10-16 — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/web-service/src/infrastructure/hub-consumer/hub-consumer-client.ts#HubConsumerClient` | YENİ — hub REST tipli sarmalayıcı (`peers`/`servicesOf`/`sendControl`/`openSession`/`access`/`createPeer`/`revokePeer`) + `HubConsumerError` | K3 / UC-1 / FR-1.1 / T-1 |
| 2 | `services/web-service/src/infrastructure/hub-consumer/consumer-relay.ts#ConsumerRelay` | YENİ — `/ws/consumer` WS relay + üstel backoff reconnect + `{peerId,message}` opak dağıtım | UC-1 / FR-1.2 / FR-1.3 / T-2 |
| 3 | `services/web-service/src/infrastructure/hub-consumer/hub-consumer-channel.ts#HubConsumerChannel` | YENİ — `IHubChannel` uyarlaması (sendControl REST + onControlMessage relay + presence) | K6 / UC-2 / FR-2.1 / T-3 |
| 4 | `services/web-service/src/infrastructure/hub-consumer/hub-field-registry.ts#HubFieldRegistry` | YENİ — `FieldRegistry` hub karşılığı (presence `GET /peers` + `upsertToken→POST /admin/peers` + `removeToken→DELETE /admin/peers/:id`) | K3 / UC-2 / FR-2.3 / T-6 |
| 5 | `services/web-service/src/infrastructure/hub-consumer/index.ts` | YENİ — barrel export | UC-1 / T-3 |
| 6 | `packages/ws-tunnel-hub/src/application/open-session.ts#OpenSession` | YENİ — oturum açma use-case'i (registry+tracker+gateway, `Result` dönüş) | K4 / UC-4 / FR-4.1 / T-9 |
| 7 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/session-routes.ts#sessionRoutes` | YENİ — `POST /sessions` (consumer auth + user doğrulama) | K4 / UC-4 / FR-4.1 / T-9 |
| 8 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/access-routes.ts#accessRoutes` | DEĞİŞİK — erişim rotasına tarayıcı cookie front-door (`tunnel_session` → consumer token aranmaz) | K4 / UC-4 / FR-4.2 / T-10 |
| 9 | `services/web-service/src/infrastructure/container-session/hub-maneuver-channel.ts#HubManeuverChannel` | YENİ — `IRemoteCommandChannel` hub REST uyarlaması (manevra execute + hata eşlemesi) | UC-3 / FR-3.1 / FR-3.2 / T-7 |
| 10 | `services/web-service/src/infrastructure/container-session/hub-container-view.ts#HubContainerView` | YENİ — field tier `ContainerProxy` karşılığı (presence polling + relay telemetri store + telemetry-query correlation) | K6 / UC-2 / T-5 |
| 11 | `services/web-service/src/presentation/routes/hub-session-routes.ts#hubSessionRoutes` | YENİ — web-service cookie set + redirect URL (`POST /api/hub/:peerId/session`) | K4 / UC-4 / FR-4.2 / T-11 |
| 12 | `services/web-service/src/presentation/routes/field-container-commands.ts#fieldContainerCommandRoutes` | DEĞİŞİK — hub REST programatik erişim (`/peers/:pid/services/:sid/api/commands/execute-multi`), internal-token yetkisi korunur | UC-3 / FR-3.2 / T-8 |
| 13 | `services/web-service/src/presentation/routes/admin-routes.ts#adminRoutes` | DEĞİŞİK — admin peer oluşturma artık hub bootstrap token'ı döner | UC-2 / T-6 |
| 14 | `services/web-service/src/presentation/routes/field-routes.ts#fieldRoutes` | DEĞİŞİK — `ContainerProxy` → `IContainerProxy` tipine gevşetildi (latestTelemetry/connectionStatus/lastSeenAt/latestQuery/historical hub view'dan) | UC-2 / K6 |
| 15 | `services/web-service/src/config/default.ts#hubConsumerConfig` | YENİ — field/boss tier'da `HUB_CONSUMER_URL`+`HUB_CONSUMER_TOKEN` fail-fast; container tier peer-only | UC-5 / FR-5.1 / T-14 |
| 16 | `services/web-service/src/config/container.ts#buildContainer` | DEĞİŞİK — `hubConsumer*` wiring + `fieldRegistry`→`HubFieldRegistry` + `tunnelManeuverChannel`→`HubManeuverChannel` + `containerProxy`→`HubContainerView` + `operationRequester`→`HubConsumerChannel` | UC-2/UC-3 / T-4/T-6/T-7 |
| 17 | `services/web-service/src/index.ts#main` | DEĞİŞİK — legacy gateway/proxy/session başlatmaları kaldırıldı; `hubConsumerChannel.start()` + `attachChannel` | UC-2 / T-5 |
| 18 | `services/web-service/src/presentation/server.ts#WebServiceServer` | DEĞİŞİK — legacy field-uplink/peer/session/container-ws rotaları kaldırıldı; `hubSessionRoutes` + `fieldContainerCommandRoutes` hub-client'a bağlandı | UC-3/UC-4 |
| 19 | `services/web-service/src/infrastructure/field-uplink/field-event-collector.ts#FieldEventCollector` | DEĞİŞİK — `attach(registry)` → `attachChannel(channel)` (relay'den beslenir) | UC-2 / FR-2.2 / T-5 |
| 20 | `services/web-service/src/infrastructure/field-uplink/operation-requester.ts#OperationRequester` | DEĞİŞİK — `HubConsumerChannel` ile `sendControl` | UC-2 / FR-2.1 / T-4 |
| 21 | `services/web-service/src/infrastructure/tunnel-extensions/` | YENİ — `telemetry-push.ts` + `messages.ts` (domain mesaj tipleri; relay'e beslenen snapshot) | K6 / UC-2 |
| 22 | `packages/ws-tunnel/src/channel/interface.ts#IHubChannel` + `packages/ws-tunnel/src/result/` | YENİ — paket yüzeyi: `IHubChannel` soyutlaması + `Result`/`DomainError` hata modeli | K6 / UC-2 / Purity-2 |
| 23 | `deployment/v1/dev/boss/docker-compose.yml` + `deployment/v1/dev/field/docker-compose.yml` | DEĞİŞİK — `hub-servis` servisi (imaj + `CONSUMER_TOKEN` + volume + healthcheck) + web-service `HUB_CONSUMER_URL`/`HUB_CONSUMER_TOKEN` | K2 / UC-5 / FR-5.1 / T-13 |
| 24 | `deployment/v1/aws/field/nginx/aws-field-web.conf` | DEĞİŞİK — `/peers/` proxy + `/containers/<cid>/ui/*` → hub peer/servis alias | K5 / UC-4 / FR-4.3 / T-12 |
| 25 | `AGENTS-DEPLOYMENT.md` | DEĞİŞİK — hub-servis cutover/rollback runbook + nginx alias sözleşmesi | UC-5 / FR-5.2 / T-16 |
| 26 | SİLİNEN legacy (boss+field hub): `field-registry.ts`, `field-uplink-ws-routes.ts`, `field-session-routes.ts`, `peer-service-routes.ts`, `field-uplink-channel.ts`, `field-session-audit.ts`, `container-proxy.ts`, `container-ws-routes.ts`, `container-proxy-field-channel.ts`, `session-routes.ts`, `tunnel-maneuver-channel.ts`, `collecting-stream-sink.ts`, `fastify-stream-sink.ts`, `session-audit.ts`, `tunnel.spec.ts`, `field-container-command.spec.ts` + testleri | SİLİNDİ — hub sorumlulukları hub-servis'e taşındı | S-1 (K1/K8 pivot) |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| web-service derleme | `npx nx run web-service:build` | ✅ |
| web-service test | `npx nx run web-service:test --skip-nx-cache` | 67 dosya, 540 test yeşil (legacy test dosyaları silindiği için sayı düştü) |
| hub-servis test | `npx vitest run --root packages/ws-tunnel-hub` | 14 dosya, 45 test yeşil (bootstrap + session + cookie e2e dahil) |
| ws-tunnel paket regresyon | `npx vitest run --root packages/ws-tunnel` | 14 dosya, 233 test yeşil |
| shared-utils | `npx nx run shared-utils:test` | 25 test yeşil |
| Compose doğrulama | `docker compose config` (boss + field dev) | ✅ geçerli |
| Doküman lint | `bun tools/spec-check.mjs` | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Tipli REST sarmalayıcı | `hub-consumer-client.test.ts` | 🟢 |
| AK-1.2 | Reconnect + üstel backoff; kopukluk sessiz değil | `consumer-relay.test.ts` | 🟢 |
| AK-1.3 | `{peerId,message}` opak dağıtım | `consumer-relay.test.ts` + `hub-consumer-channel.test.ts` | 🟢 |
| AK-2.1 | Operation istekleri consumer `/control` | `hub-consumer-channel.test.ts` (sendControl) + `operation-requester.ts#OperationRequester` | 🟢 |
| AK-2.2 | Yanıtlar relay'den domain extension'lara (korelasyon) | `hub-consumer-channel.test.ts` (onControlMessage) + `field-event-collector.test.ts` (attachChannel) | 🟢 |
| AK-2.3 | Boss keşfi hub `/peers` | `hub-field-registry.test.ts` (refresh/isConnected) | 🟢 |
| AK-3.1 | Manevra kanalı hub REST | `hub-maneuver-channel.test.ts` | 🟢 |
| AK-3.2 | Hata eşlemesi (`system_unreachable`) | `hub-maneuver-channel.test.ts` | 🟢 |
| AK-4.1 | Hub `POST /sessions` oturum açar | `open-session.test.ts` | 🟢 |
| AK-4.2 | Cookie auth (erişim rotası front-door) | `integration.test.ts` (cookie) + `hub-session-routes.test.ts` | 🟢 |
| AK-4.3 | nginx alias rewrite | `deployment/v1/aws/field/nginx/aws-field-web.conf` (gözle) + AGENTS-DEPLOYMENT alias sözleşmesi | 🟢 |
| AK-5.1 | Compose hub-servis + health | `docker compose config` (boss + field) | 🟢 |
| AK-5.2 | Rollback tek env ile | `AGENTS-DEPLOYMENT.md` runbook (gözle) — canlı tatbikat P4 | 🟡 |
| AK-5.3 | Hub modunda parity e2e (komut/telemetri/event) | P4'e ertelendi (G1) | ⬜ |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S-1 | `HUB_MODE` feature flag KALDIRILDI (hub-only) | SPEC K1/K8/§1'deki "kademeli geçiş + feature flag + legacy korunur" kararı kullanıcı kararıyla hub-only'a pivot edildi; legacy hub kodu silindi. Rollback = git branch/etiket (tek env ile değil). |
| S-2 | Admin peer oluşturma hub bootstrap token'ı döner | `POST /api/fields` artık `bootstrapToken`/`bootstrapExpiresAt` döner; `uplinkToken` parametresi yok sayılır (token üretimi hub-servis'e taşındı). |
| S-3 | `containerProxy` = `HubContainerView` | `historical`/`latestQuery`, eski `ContainerProxy`'nin in-memory store'u yerine hub `telemetry-query` kontrol kanalı + `queryId` correlation ile beslenir. |
| S-4 | T-12 nginx alias yalnız aws field config'ine uygulandı | Boss/superadmin ve diğer tier'ların alias'ı runbook sözleşmesiyle bırakıldı (P4'te uygulanır). |
| S-5 | `fieldTunnelPathAllowlist` container kaydı kaldırıldı | Fonksiyon + test dosyası duruyor ancak artık kullanılmıyor (allowlist hub-servis'te). |
| S-6 | v1/v2 tagged peer wire'ı değişmedi | Yalnız compose uç noktaları hub-servis'e işaret ediyor; frame/şema aynı. |

### A.5 Gözle Kontrol Maddeleri

- [x] **Purity-1/K6:** hub-servis domain bilmez; `OpenSession`/`accessRoutes` yalnız portlar üzerinden çalışır (framework `infrastructure/inbound`'da)
- [x] **Purity-2:** web-service `HubConsumerClient` framework-agnostik (`fetch` enjekte edilebilir); HTTP/WS adapter ayrı (`ConsumerRelay`)
- [x] **Purity-3:** consumer token peer token'ından ayrı (`HUB_CONSUMER_TOKEN` vs peer token); sır loglanmaz
- [x] **Purity-4:** v1/v2 wire + SPA base sözleşmesi korunur (nginx alias, base değişmez)
- [x] **DI (MANDATORY):** `HubConsumerClient`/`ConsumerRelay`/`HubConsumerChannel`/`HubFieldRegistry`/`HubManeuverChannel`/`HubContainerView` düz constructor injection; named export; config objeleri (`*Config` arayüzleri)
- [x] **Elegant Object:** komut/sorgu ayrımı (start/stop void; isConnected/lastSeenAt sorgu); statik metot yok; `readonly` alanlar
- [x] **CQS:** `HubConsumerChannel.sendControl` void + `onControlMessage` abonelik; `HubContainerView.latestTelemetry`/`connectionStatus`/`lastSeenAt` sorgu
- [x] **Fail-fast:** `hubConsumerConfig` field/boss tier'da eksik env → açılış reddi (S-1 sonrası flag kalktı, zorunlu)
- [x] **Kod referansı:** satır-numarası referansı YOK (sembol çapası `#sembol`)

### A.6 Genel Durum Özeti

Web-service hub olmaktan çıkıp tüketici oldu: `HubConsumerClient` + `ConsumerRelay` + `HubConsumerChannel` + `HubFieldRegistry` altyapısı, hub-servis tarafında `OpenSession`/`POST /sessions` + erişim rotası cookie front-door'u, boss/field wiring (`OperationRequester`→`HubConsumerChannel`, `FieldEventCollector.attachChannel`, `fieldRegistry`→`HubFieldRegistry`, `tunnelManeuverChannel`→`HubManeuverChannel`, `containerProxy`→`HubContainerView`) ve compose/nginx/runbook deployment tamamlandı. 14 kabul kriterinin 13'ü kanıtlandı (🟢); AK-5.3 (parity e2e) ve AK-5.2'nin canlı rollback tatbikatı P4'e ertelendi (G1). SPEC K1/K8'deki kademeli geçiş kullanıcı kararıyla hub-only'a pivot edildi (S-1) — legacy hub kodu silindi, rollback git branch ile. Belirlenen 6 sapma (S-1..S-6) bilinçli karar/erteleme olup kalan açık işler §B.2'de listelendi.

**review_date:** 2026-10-19

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Hub kapalı (komut) | REST çağrısı hub'a ulaşamaz | fail-fast (`HubConsumerError`) | `hub-consumer-client.test.ts` |
| Consumer token yanlış | 401 döner | açılışta fail-fast | `hub-consumer-client.test.ts` + `default.ts#hubConsumerConfig` |
| Consumer WS koptu | backoff dolar | yeniden bağlanır | `consumer-relay.test.ts` |
| Opak dağıtım | peer `event` gönderir | aboneler `(peerId,message)` alır | `consumer-relay.test.ts` + `hub-consumer-channel.test.ts` |
| Keşif | `GET /peers` başarılı | presence cache `connected`/`lastSeenAt` güncellenir | `hub-field-registry.test.ts` |
| Keşif hatası | `GET /peers` başarısız | eski presence korunur (kademeli bozulma) | `hub-field-registry.test.ts` |
| Admin peer oluştur | `POST /admin/peers` | tek kullanımlık `bootstrapToken` + `expiresAt` döner | `hub-field-registry.test.ts` |
| Admin revoke | `DELETE /admin/peers/:id` | kayıt düşer | `hub-field-registry.test.ts` |
| Manevra başarı | hub REST 200 | `{ ok: true }` | `hub-maneuver-channel.test.ts` |
| Manevra 404/503 | container erişilemez | `{ ok: false, reason: "system_unreachable" }` | `hub-maneuver-channel.test.ts` |
| Oturum aç | consumer token + user | session token + expiry döner | `open-session.test.ts` |
| Oturum (peer offline) | peer bağlı değil | transient 503 | `open-session.test.ts` |
| Cookie front-door | geçerli `tunnel_session` cookie | opak proxy 200 (consumer token aranmaz) | `integration.test.ts` (cookie) |
| Cookie yok | erişim rotası cookie'siz | consumer token/user gerekli (401) | `access-routes.ts#accessRoutes` + `integration.test.ts` |
| Web-service oturum | RBAC kullanıcı + hub `openSession` | `tunnel_session` cookie `Path=/peers` set + redirect | `hub-session-routes.test.ts` |
| Telemetri frame | relay'den `telemetry` | latest store güncellenir + observer yayın | `hub-container-view.test.ts` |
| Telemetri sorgu | `telemetry-query` + `queryId` | `telemetry-result` correlation ile çözülür | `hub-container-view.test.ts` |
| Sorgu timeout | yanıt gelmez | boş liste çözülür | `hub-container-view.test.ts` |
| Presence geçişi | `connected`→`stale` | `onConnectionChange` yayınlanır | `hub-container-view.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | T-15 parity e2e — hub modunda komut/telemetri/event tam stack (AK-5.3) | yüksek | P4 (imajla testler) |
| G2 | nginx alias boss/superadmin + prod/aws dışı tier'lar (S-4) | orta | runbook sözleşmesi; uygulama P4 |
| G3 | `historical`/`latestQuery` gerçek container telemetry-query responder ile e2e (S-3) | orta | P4 |
| G4 | PPC synthetic telemetry görünümü tam stack'te | orta | P4 |
| G5 | Host-based erişim (A4) | düşük | A4 SPEC (tetikte) |

**review_date:** 2026-10-19
