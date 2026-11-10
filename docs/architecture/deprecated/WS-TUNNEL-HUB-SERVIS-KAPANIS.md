---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, hub-servis, hexagonal]
review_date: 2026-10-19
---

# ws-tunnel Hub-Servis — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](./WS-TUNNEL-HUB-SERVIS-MIMARISI.md) (✅ Approved 2026-10-16 — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ws-tunnel-hub/src/domain/ports/peer-credentials-store.ts#IPeerCredentialsStore` | YENİ — peer kimlik portu | K8 / UC-5 / FR-5.2 |
| 2 | `packages/ws-tunnel-hub/src/domain/ports/consumer-credentials.ts#IConsumerCredentials` | YENİ — consumer kimlik portu | K6 / UC-4 / FR-4.1 |
| 3 | `packages/ws-tunnel-hub/src/domain/ports/consumer-relay.ts#IConsumerRelay` | YENİ — opak inbound relay portu | K4 / UC-4 / FR-4.3 |
| 4 | `packages/ws-tunnel-hub/src/domain/peer-connection-tracker.ts#PeerConnectionTracker` | YENİ — stale/liveness policy + enjekte `now` | K9 / UC-1 / T-1 |
| 5 | `packages/ws-tunnel-hub/src/domain/discovery-view.ts#toPeerSummaries` | YENİ — keşif DTO indirgemesi (saf) | UC-2 / FR-2.1 |
| 6 | `packages/ws-tunnel-hub/src/application/register-peer.ts#RegisterPeer` | YENİ — peer kaydı use-case'i (token + STRICT duyuru) | UC-1 / FR-1.1..1.4 / T-2 |
| 7 | `packages/ws-tunnel-hub/src/application/authenticate-peer-token.ts#AuthenticatePeerToken` | YENİ — peer token use-case'i | UC-5 / FR-5.1 |
| 8 | `packages/ws-tunnel-hub/src/application/disconnect-peer.ts#DisconnectPeer` | YENİ — kapanışta kayıt temizliği | UC-1 |
| 9 | `packages/ws-tunnel-hub/src/application/discover-peers.ts#DiscoverPeers` | YENİ — keşif use-case'i | UC-2 / FR-2.1..2.2 / T-4 |
| 10 | `packages/ws-tunnel-hub/src/application/open-service-access.ts#OpenServiceAccess` | YENİ — opak erişim yetkilendirmesi + oturum aç/reuse | UC-3 / FR-3.1..3.3 / T-6 |
| 11 | `packages/ws-tunnel-hub/src/application/relay-control.ts#RelayControl` | YENİ — consumer↔peer opak kontrol kanalı | UC-4 / FR-4.2..4.3 / T-8 |
| 12 | `packages/ws-tunnel-hub/src/application/authenticate-consumer-token.ts#AuthenticateConsumerToken` | YENİ — consumer token use-case'i | UC-4 / FR-4.1 / T-10 |
| 13 | `packages/ws-tunnel-hub/src/application/health-check.ts#HealthCheck` | YENİ — sağlık use-case'i | UC-6 / FR-6.1 |
| 14 | `packages/ws-tunnel-hub/src/infrastructure/inbound/peer-channel-hub.ts#PeerChannelHub` | YENİ — `/ws/peer` adapter'ı + `IHubChannel` uygulaması | UC-1 / T-3 |
| 15 | `packages/ws-tunnel-hub/src/infrastructure/inbound/consumer-channel.ts#ConsumerChannel` | YENİ — `/ws/consumer` adapter'ı (`IConsumerRelay`) | UC-4 / T-9 |
| 16 | `packages/ws-tunnel-hub/src/infrastructure/inbound/fastify-server.ts#buildHubServer` | YENİ — Fastify inbound wiring (framework yalnız burada) | K3 / T-13 |
| 17 | `packages/ws-tunnel-hub/src/infrastructure/inbound/peer-routes.ts#peerWsRoutes` | YENİ — `/ws/peer` rota (Bearer pre-upgrade) | UC-1 |
| 18 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/discovery-routes.ts#discoveryRoutes` | YENİ — `GET /peers`, `GET /peers/:id/services` | UC-2 / T-5 |
| 19 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/access-routes.ts#accessRoutes` | YENİ — opak HTTP+WS proxy (`/peers/:p/services/:s/*`) | UC-3 / T-7 |
| 20 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/control-routes.ts#controlRoutes` | YENİ — `POST /control/:peerId` + `/ws/consumer` | UC-4 / T-9 |
| 21 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/health-routes.ts#healthRoutes` | YENİ — `GET /health` | UC-6 |
| 22 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/node-stream-sink.ts#NodeStreamSink` | YENİ — `IStreamSink` node adapter'i | UC-3 / S-5 |
| 23 | `packages/ws-tunnel-hub/src/infrastructure/outbound/env-peer-token-store.ts#EnvPeerTokenStore` | YENİ — `IPeerCredentialsStore` env adapter (hash + timingSafeEqual) | UC-5 / T-11 |
| 24 | `packages/ws-tunnel-hub/src/infrastructure/outbound/sqlite-peer-credential-store.ts#SqlitePeerCredentialStore` | YENİ — `IPeerCredentialsStore` sqlite adapter (iskelet) | K5 / UC-5 / T-11 |
| 25 | `packages/ws-tunnel-hub/src/infrastructure/outbound/env-consumer-credentials.ts#EnvConsumerCredentials` | YENİ — `IConsumerCredentials` env adapter | UC-4 / T-10 |
| 26 | `packages/ws-tunnel-hub/src/infrastructure/outbound/console-logger.ts#ConsoleLogger` | YENİ — `ILogger` stdout adapter'i | K7 |
| 27 | `packages/ws-tunnel-hub/src/infrastructure/outbound/memory-audit-sink.ts#MemoryAuditSink` | YENİ — no-op `IAuditSink` | K7 / A2 |
| 28 | `packages/ws-tunnel-hub/src/config/hub-config.ts#loadHubConfig` | YENİ — env → config (fail-fast `required()`) | UC-6 / FR-6.2 / T-12 |
| 29 | `packages/ws-tunnel-hub/src/main.ts#createHub` | YENİ — composition root (düz constructor wiring) | T-13 |
| 30 | `packages/ws-tunnel-hub/src/integration.test.ts` | YENİ — gerçek WS+Fastify e2e | T-16 / SC-2 / SC-3 |
| 31 | `packages/ws-tunnel-hub/package.json` + `tsconfig.json` + `vitest.config.ts` | YENİ — paket/workspace (monorepo importu YOK) | K2 / K11 / T-14 |
| 32 | `packages/ws-tunnel-hub/Dockerfile` + `compose.example.yml` + `.dockerignore` | YENİ — oven/bun multi-stage + HEALTHCHECK + volume | K10 / T-15 |
| 33 | `vitest.workspace.ts` | hub-servis workspace'e eklendi | T-14 |
| 34 | `AGENTS-WS-TUNNEL.md` | hub-servis sözleşmesi eklendi (hexagonal + kanal izolasyonu) | T-17 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| hub-servis unit/component | `npx vitest run --root packages/ws-tunnel-hub` | 8 dosya, 27 test yeşil |
| hub-servis tip | `npx tsc --noEmit -p packages/ws-tunnel-hub/tsconfig.json` | yeşil |
| regresyon (paket) | `npx vitest run --root packages/ws-tunnel` | 14 dosya, 233 test yeşil |
| Docker imajı | `docker build -f packages/ws-tunnel-hub/Dockerfile -t ws-tunnel-hub:local .` | başarılı |
| Container smoke | `docker run ...` → `GET /health` + peer connector register → `GET /peers` | `{"status":"ok","peers":0,...}`; `revpi-smoke/device/connected/local-admin` |
| Compose | `docker compose -f .../compose.example.yml config` | geçerli |
| Doküman lint | `bun tools/spec-check.mjs` (hub + kalıntı + opak) | 0 hata |
| Test envanteri | `bun run test:inventory` | 311 dosya, 2636 test |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Token fail-closed (rejected + kapanış) | `register-peer.test.ts` (AK-1.1) + `peer-channel-hub.test.ts` (AK-1.1) | 🟢 |
| AK-1.2 | Opak duyuru STRICT doğrulaması | `register-peer.test.ts` (AK-1.2) | 🟢 |
| AK-1.3 | Registry + tracker kaydı + `ok` ack | `register-peer.test.ts` (AK-1.3) + `peer-channel-hub.test.ts` (AK-1.3) | 🟢 |
| AK-1.4 | Re-register eski bağlantıyı kapatır, listeyi değiştirir | `register-peer.test.ts` (AK-1.4) + `peer-channel-hub.ts#handleRegister` | 🟢 |
| AK-2.1 | Peer listesi DTO (`id/type/status/services`) | `integration.test.ts` (peers[0].status="connected") + `discovery-view.ts#toPeerSummaries` | 🟢 |
| AK-2.2 | Bilinmeyen peer 404 | `discover-peers.ts#servicesOf` (NotFoundError → 404) — kod inceleme | 🟢 |
| AK-3.1 | 404/503 redleri (duyurulmamış servis / bağlı olmayan peer) | `open-service-access.test.ts` (not_found + transient) | 🟢 |
| AK-3.2 | Oturum aç/yeniden kullan + audit portu | `open-service-access.test.ts` (AK-3.2) | 🟢 |
| AK-3.3 | Opak HTTP/WS + allowlist (dışı 403) | `open-service-access.test.ts` (allowlist forbidden) + `integration.test.ts` (assets akar) | 🟢 |
| AK-4.1 | Consumer token izolasyonu (peer token'ı consumer açamaz) | `env-consumer-credentials.test.ts` (AK-4.1) | 🟢 |
| AK-4.2 | Kontrol gönderimi (404/503/opak iletim) | `relay-control.test.ts` (not_found/transient/deliver) | 🟢 |
| AK-4.3 | Inbound opak relay (peer → consumer) | `peer-channel-hub.test.ts` (AK-4.3) + `integration.test.ts` (`/ws/consumer`) | 🟢 |
| AK-5.1 | Hash karşılaştırma, düz metin sır yok | `env-peer-token-store.test.ts` (AK-5.1) | 🟢 |
| AK-5.2 | Port değiştirilebilirliği (env/sqlite) | `peer-credentials-store.ts#IPeerCredentialsStore` + env/sqlite adapter'ları — kod inceleme | 🟢 |
| AK-6.1 | Health yanıtı (`ok` + peers) | `health-check.ts#HealthCheck` + container smoke (`GET /health`) | 🟢 |
| AK-6.2 | Config fail-fast (eksik token → açılış reddi) | `hub-config.ts#loadHubConfig` (`required()`) — kod inceleme | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S-1 | Erişim kimliği başlık-tabanlı | P2'de consumer token + `x-tunnel-user-id/username/role` başlıklarıyla; tarayıcı cookie/iframe front-door'u P3'e bırakıldı (SPEC UC-3 oturum aç/reuse use-case'i uygulandı) |
| S-2 | Bilinmeyen kontrol mesajları çift yönlü akar | `PeerChannelHub` bilinmeyen kontrol mesajlarını HEM paket domain abonelerine (SessionGateway/TunnelProxy) HEM consumer relay'e aktarır (opak; tüketici tip filtreler) |
| S-3 | Varsayılan credential store env | `EnvPeerTokenStore` aktif; `SqlitePeerCredentialStore` hazır+testli, İP-2 bootstrap'a bağlanacak (K5/K8) |
| S-4 | Docker bağlamı repo kökü | `tsconfig.base.json` path çözümü için kök bağlamdan kopyalanır |
| S-5 | Ek dosya: node-stream-sink | `routes/node-stream-sink.ts` (`IStreamSink` node adapter) SPEC'in Involved Files listesinde değildi |

### A.5 Gözle Kontrol Maddeleri

- [x] **Hexagonal sınır (SC-1):** `src/domain` + `src/application` altında `fastify`/`ws`/`bun:sqlite`/`process.env` importu YOK; framework yalnız `infrastructure/inbound` + `config` + `main`'de
- [x] **Monorepo bağımsızlığı (SC-5):** yalnız `@gd-monorepo/ws-tunnel` (paket yüzeyi) + `fastify`/`@fastify/websocket`/`ws`/`zod`; diğer `@gd-monorepo/*` importu YOK
- [x] **Sır güvenliği:** `EnvPeerTokenStore` + `EnvConsumerCredentials` sha256 + `timingSafeEqual`; düz metin saklama/loglama yok
- [x] **Wire uyumu (SC-3):** `register-ack` `status: ok|rejected` + `serverTime`; v1/v2 frame şekli birebir
- [x] **Kanal izolasyonu (K6):** `PEER_TOKEN` vs `CONSUMER_TOKEN` ayrı env değerleri, ayrı doğrulama yolları
- [x] **Composition root tek noktada:** tüm `new X(...)` wiring `main.ts#createHub`
- [x] **Docker (K10):** `HEALTHCHECK /health`, `VOLUME /data`, runtime `oven/bun:1-slim`
- [x] **Kod referansı:** satır-numarası referansı YOK (sembol çapası `#sembol`)

### A.6 Genel Durum Özeti

Hub-servis, SPEC'te onaylanan hexagonal (ports & adapters) mimariyi tam olarak uyguladı: 5 port + 6 domain/application saf sınıfı framework'ten tamamen bağımsız; Fastify/ws/bun:sqlite/env yalnız infrastructure + config + composition root'ta. 16 kabul kriterinin tamamı kanıtlandı (unit/component, integration e2e, container smoke, kod inceleme). SC-1 (hexagonal sınır), SC-2/SC-3 (docker imajı + wire uyumu), SC-4 (coverage/test), SC-5 (paket bağımsızlığı) karşılandı. Belirlenen 5 sapma (S-1..S-5) bilinçli erteleme/ekleme olup SPEC sınırlarını ihlal etmez; kalan açık işler §B.2'de listelendi. Modül doğrulanmıştır.

**review_date:** 2026-10-19

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Register geçerli | geçerli token + STRICT duyuru | registry + tracker kaydı; `register-ack ok` | `register-peer.test.ts` + `peer-channel-hub.test.ts` |
| Register geçersiz | geçersiz token / bozuk duyuru | `register-ack rejected` + kapanış | `peer-channel-hub.test.ts` (AK-1.1) |
| Heartbeat | `heartbeat` frame'i | `lastSeenAt` tazelenir; stale → connected | `peer-connection-tracker.test.ts` (heartbeat) |
| Stale (eşik) | `sweep()` eşiği aşar | `connected` → `stale`; yeni erişim 503 | `peer-connection-tracker.test.ts` (sweep) + `open-service-access.test.ts` (transient) |
| Erişim bilinmeyen servis | duyurulmamış `serviceId` | 404, stream açılmaz | `open-service-access.test.ts` (not_found) |
| Erişim allowlist dışı | path allowlist'i geçmez | 403 | `open-service-access.test.ts` (allowlist forbidden) |
| Consumer token geçersiz | yanlış/eksik consumer token | 401 / WS 1008 kapanış | `env-consumer-credentials.test.ts` + `control-routes.ts#authorizedConsumer` |
| Kontrol bilinmeyen peer | `POST /control/:p` bilinmeyen peer | 404 | `relay-control.test.ts` (not_found) |
| Kontrol bağlı olmayan peer | peer registry'de ama bağlı değil | 503 | `relay-control.test.ts` (transient) |
| Inbound opak relay | peer bilinmeyen kontrol mesajı gönderir | consumer'a `{peerId,message}` opak akar | `integration.test.ts` (`/ws/consumer`) |
| Config eksik/geçersiz | `PEER_TOKEN`/`CONSUMER_TOKEN` tanımsız | açılış fail-fast | `hub-config.ts#loadHubConfig` (`required()`) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Tarayıcı cookie/iframe front-door + gerçek login (S-1) | orta | P3 — monorepo web-service consumer dönüşümü |
| G2 | İP-2 bootstrap/claim/revocation (sqlite port genişlemesi) | orta | İP-2 (`WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md`) |
| G3 | Host-based erişim (A4) | düşük | A4 SPEC (tetikte) |
| G4 | Kalıcı hub audit adapter'ı (şu an `MemoryAuditSink`) | düşük | İhtiyaç belirirse (A2) |
| G5 | WS erişim köprüsü (`/peers/:p/services/:s/ws/*`) e2e test edilmedi (yalnız HTTP erişimi + consumer WS testli) | orta | `access-routes.ts#accessRoutes` WS dalına integration e2e |
| G6 | Metrik/tracing, çoklu consumer fan-out | düşük | İleri iş (A4/A5) |
| G7 | `HealthCheck` her zaman `ok` döner — `degraded` dalı (DB hatası) uygulanmadı/test edilmedi; izole `discover-peers`/`disconnect-peer`/`health-check` unit testi yok | düşük | S-3 sonrası sqlite wiring ile `degraded` dalı + izole unit testler |

**review_date:** 2026-10-19
