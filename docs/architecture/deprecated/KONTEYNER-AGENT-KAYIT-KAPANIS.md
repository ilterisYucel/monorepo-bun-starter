---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, agent, konteyner, deployment]
review_date: 2026-10-22
---

# Konteyner Kaydı Agent Üzerinden — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [KONTEYNER-AGENT-KAYIT-MIMARISI.md](./KONTEYNER-AGENT-KAYIT-MIMARISI.md) (✅ Approved 2026-10-22 — K0–K5, FR/AK/T/SC kaynağı).
> **Kapsam:** UC-1..UC-3 — container tier'den peer/session/tunnel tesisatının kaldırılması, agent üzerinden kayıt, stateless oturum doğrulama, demo deployment'ın üretim topolojisine çekilmesi, doğrulama/geri uyum.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/web-service/src/infrastructure/container-session/stateless-session-authenticator.ts#StatelessSessionAuthenticator` | YENİ — `ISessionAuthenticator` arayüzü + agent imzalı `container_session` JWT'sini **stateless** doğrulayan sınıf (`verify` + `toWebUser` eşlemesi; yerel oturum map'i yok) | K2, K3, FR-1.3 |
| 2 | `services/web-service/src/infrastructure/container-session/stateless-session-authenticator.test.ts` | YENİ — sözleşme testleri (cookie çözümü, stateless tekrar doğrulama, cookie yok → undefined, bozuk token → fail-closed) | FR-1.3, FR-1.4, AK-1.3, AK-1.4, T-4 |
| 3 | `services/web-service/src/config/container.ts#buildContainer` | `hubPeerConnector`/`containerSessionStore`/`containerSessionServer`/`tunnelClient` DI kayıtları silindi; `containerSessionAuthenticator` (container tier, `JoseTokenSigner(authCfg.jwtSecret)`) eklendi | K1, K3, FR-1.1, AK-1.1 |
| 4 | `services/web-service/src/config/default.ts#hubPeerConfig` | `hubPeerConfig` fonksiyonu + `HUB_PEER_*` config tanımları kaldırıldı | FR-1.2, AK-1.2 |
| 5 | `services/web-service/src/config/default.test.ts` | `hubPeerConfig (T2.3)` sözleşme suite'i + import temizlendi | FR-1.2, AK-1.2, T-4 |
| 6 | `services/web-service/src/index.ts#main` | `sessionStore`/`containerSessionServer`/`tunnelClient`/`hubPeerConnector` okuma + start/stop/attach lifecycle'ları silindi; `containerSessionAuthenticator` bağlandı | K1, K3, FR-1.1, AK-1.1 |
| 7 | `services/web-service/src/presentation/server.ts#WebServiceServer` | `ServerDependencies.hubPeerConnector`/`sessionStore` → `containerSessionAuthenticator`; rbac `sessionAuthenticator` doğrudan `authenticate(cookie)`; status route konnektörsüz; ws-routes'a `sessionAuthenticator` | K2, K3, FR-1.3, FR-1.4 |
| 8 | `services/web-service/src/infrastructure/realtime/ws-routes.ts#telemetryWsRoutes` | `sessionStore.authenticate` → `sessionAuthenticator.authenticateToken` | FR-1.3, AK-1.3 |
| 9 | `services/web-service/src/infrastructure/realtime/ws-routes.test.ts` | Test fixture `ClientSessionStore` → `ISessionAuthenticator`; assert `authenticateToken` | FR-1.3, T-4 |
| 10 | `packages/shared-utils/src/config/definitions.ts` | `hubPeerEnabled`/`hubPeerUrl`/`hubPeerToken` tanımları + `ALL_CONFIG_DEFINITIONS` kaydı silindi | FR-1.2, AK-1.2 |
| 11 | `deployment/v2/dev/container/docker-compose.yml` | web-service env'inden `HUB_PEER_*`/`TUNNEL_SERVICE_ID`/`TUNNEL_*_UPSTREAM` kaldırıldı; `container-agent` servisi eklendi (`PEER_TYPE=container`, `PEER_ID=container-1`, `SERVICE_ID=container-api`, `LOCAL_TARGET`, `HUB_SECRET=${JWT_SECRET}`) | UC-2, FR-2.1, FR-2.2, AK-2.1, AK-2.2 |
| 12 | `deployment/v2/dev/container2/docker-compose.yml` | Aynı temizlik + `container2-agent` servisi (`PEER_ID=container-2`, `LOCAL_TARGET=http://container2-web-service:5001`) | UC-2, FR-2.1, FR-2.2, AK-2.1, AK-2.2 |
| 13 | `deployment/v2/dev/container/.env.example` | Agent modeli notu + `CONTAINER_ID=container-1`; natif `HUB_PEER_ENABLED`/`HUB_PEER_URL` kaldırıldı | FR-2.3, AK-2.3 |
| 14 | `deployment/v2/dev/container2/.env.example` | Agent modeli + `CONTAINER_ID` düzeltmesi (`container-1` → `container-2`) | FR-2.3, AK-2.3 |
| 15 | `docs/process/DEMO-STACK-ISLETIM-RUNBOOK.md` | Agent'lı model anlatımı + register/troubleshoot notu | FR-2.3, AK-2.3, T-6 |
| 16 | `AGENTS-DEPLOYMENT.md` | Container tier kimlik modeli: kayıt YALNIZ agent üzerinden; natif `HUB_PEER_ENABLED` kaldırıldı | FR-2.3, T-6 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tam test seti | `bun run test` | ✅ 312 dosya / 2582 test PASS |
| web-service birim/component | `bun nx run web-service:test` | ✅ 63 dosya / 518 test PASS |
| Demo entegrasyon | `bun run test:demo-integration` | ✅ 10 dosya / **108/108 PASS** |
| Canlı hub peer listesi | `curl /peers` | ✅ `container-1 (container, agent)`, `container-2 (container, agent)`, `demo-field-agent (device)` |
| Canlı agent erişimi | consumer token + `x-tunnel-user-*` → `/peers/container-1\|2/services/container-api/api/unified/telemetry/latest-per-name` | ✅ HTTP 200, 2135 satır (agent imzası + stateless doğrulama) |
| Compose geçerliliği | `docker compose config` (container, container2) | ✅ geçerli |
| SPEC lint | `bun run spec:check docs/architecture/KONTEYNER-AGENT-KAYIT-MIMARISI.md` | ✅ 0 hata |
| Purity (K0) | `git status --porcelain -- packages/` | ✅ yalnız `packages/shared-utils/src/config/definitions.ts` — `packages/ws-tunnel*` **0 satır** |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | DI temiz (peer/session/tunnel kaydı yok) | `config/container.ts#buildContainer` (yalnız `containerSessionAuthenticator`); `index.ts#main` (lifecycle yok); grep `hubPeer` web-service/src → boş | 🟢 |
| AK-1.2 | Config kalıntısı yok | `default.ts` (fonksiyon yok), `default.test.ts` (suite silindi), `definitions.ts` (tanımlar silindi) | 🟢 |
| AK-1.3 | Stateless doğrulama (yerel map yok) | `stateless-session-authenticator.ts#authenticateToken`; test "stateful değildir — aynı token tekrar doğrulanır" (verify 2×) | 🟢 |
| AK-1.4 | Fail-closed 401 | `stateless-session-authenticator.test.ts` "geçersiz token → undefined"; `jose-token-signer.ts#verify` (HS256 + `type=container-session` + `exp`); `ws-routes.ts` → 401 | 🟢 |
| AK-1.5 | Geri uyum (Bearer + field tier değişmez) | web-service 63/518 + demo 108/108; `server.ts` `uplinkSessionStore` yolu korunur | 🟢 |
| AK-2.1 | Agent servisleri (doğru peer kimliği) | `container/docker-compose.yml` (`container-agent`, `PEER_ID=container-1`); `container2/docker-compose.yml` (`container2-agent`, `PEER_ID=container-2`); `docker compose config` | 🟢 |
| AK-2.2 | Web-service env temiz | Her iki compose web-service env bloğu (tunnel/peer değişkeni yok) | 🟢 |
| AK-2.3 | Doküman senkron | `runbook` §1–§3, `.env.example` (container/container2), `AGENTS-DEPLOYMENT.md` | 🟢 |
| AK-2.4 | Field değişmez | `git diff` — field compose/demo-field-agent dosyası YOK | 🟢 |
| AK-3.1 | API şekli sabit | `test:demo-integration` 108/108 (field davranışı) | 🟢 |
| AK-3.2 | Agent üzerinden erişim + oturum doğrulaması | Canlı curl: `/peers` + consumer token ile 200 / 2135 satır | 🟢 |
| AK-3.3 | 108/108 | `bun run test:demo-integration` | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama | Etki |
|:--|:------|:---------|:-----|
| S-1 | `bsc-pcs-connector` 2 testi ilk koşuda kırmızı | Stack tamamen yeniden oluşturulduktan sonraki ilk entegrasyon koşusunda BSC→PCS connector testleri kırmızı (PCS sim init sırasında yazdığı için 776 register 17250'de kaldı); container device-service'ler field ayaktayken yeniden başlatılınca ve suite tekrar koşulunca 108/108. | Mevcut demo başlatma-sırası kırılganlığı — bu SPEC'in kod değişikliğiyle ilgisi YOK (device-service/simülatör/connector dosyaları değişmedi) |
| S-2 | `status-route.ts` opsiyonel `hubPeerConnector` tipini koruyor | `presentation/routes/status-route.ts#makeStatusRoute` hâlâ `{ hubPeerConnector?: TunnelConnector }` alıyor; artık hiçbir tier'da kayıtlı değil, route hep "offline" döner. | Endpoint korunur; tip arındırması kapsam dışı bırakıldı |
| S-3 | `tunnel.apiUpstream`/`tunnel.staticUpstream` config tanımları kaldı (hâlâ tanımlı) | `definitions.ts` içinde tanımlar duruyor; kod artık bunları kullanmıyor (`TunnelClient.create` kaldırıldı). | Kapsam dışı — ölü config tanımı, davranışa etkisi yok |
| S-4 | `web-service:typecheck` baseline gürültüsü | TS6305/TS2347 proje-referans gürültüsü pre-existing; yeni dosyalarda hata yok. | Kapı değil — testler + build + spec:check temiz |

### A.5 Gözle Kontrol Maddeleri

- [x] `packages/ws-tunnel*` altında 0 satır değişiklik (K0) — `git status --porcelain -- packages/` yalnız `shared-utils`.
- [x] Container tier'da `hubPeerConnector`/`containerSessionServer`/`tunnelClient` DI kaydı ve lifecycle KALMADI (grep `hubPeer` boş).
- [x] `HUB_PEER_ENABLED`/`HUB_PEER_URL`/`HUB_PEER_TOKEN` config tanımı ve `hubPeerConfig` kullanımı KALMADI.
- [x] `containerSessionAuthenticator`, `JoseTokenSigner(authCfg.jwtSecret)` ile varsayılan etiket `container-session` üzerinden HS256 + `type` + `exp` doğruluyor.
- [x] `ClientSessionStore` container tier rbac/telemetry yolunda KULLANILMIYOR (yalnız field `uplinkSessionStore` korunuyor).
- [x] Bearer access-token akışı değişmedi (`ws-routes.ts` önce `tokens.verifyAccessToken`, sonra oturum).
- [x] Her iki compose'ta agent servisi var ve `HUB_SECRET=${JWT_SECRET:?...}` fail-closed.
- [x] Field compose + `demo-field-agent` diff'te YOK (AK-2.4).
- [x] `TUNNEL_SERVICE_ID` yalnız agent `SERVICE_ID` fallback'i olarak kaldı (web-service env bloğunda değil).

### A.6 Genel Durum

UC-1..UC-3'ün tüm görevleri (T-1..T-8) tamamlandı; tüm kabul kriterleri (AK-1.1..1.5, AK-2.1..2.4, AK-3.1..3.3) yeşil. Container web-service saf HTTP API'ye indirgendi; kayıt **yalnız agent** ile yapılıyor ve `container_session` JWT'si **stateless** doğrulanıyor (HS256 + `type=container-session` + `exp`, fail-closed). Tüm başarı kriterleri (SC-1..SC-7) karşılandı: ws-tunnel 0 satır, 312/2582 + 63/518 + 108/108 yeşil, canlı agent erişimi 200/2135 satır, `docker compose config` geçerli, spec:check temiz. Dört sapma (S-1..S-4) kayıt altında — hiçbiri kabul kriterlerini ihlal etmiyor (S-1 pre-existing demo başlatma-sırası kırılganlığı; S-2/S-3 kapsam dışı tip/config arındırması; S-4 pre-existing typecheck gürültüsü). Modül kapanabilir.

**review_date:** 2026-10-22

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Stateless oturum (cookie) | `container_session` cookie'si, geçerli token | Token çözülür, payload `User`'a eşlenir (`id=sub`, `username`, `role`) | `stateless-session-authenticator.test.ts` "cookie'den token'ı çözer ve payload'ı User'a eşler" |
| Stateless oturum (tekrar) | Aynı token iki kez doğrulanır | Yerel kayıt ARANMAZ; `verify` 2× çağrılır, aynı `User` döner | `stateless-session-authenticator.test.ts` "stateful değildir" |
| Cookie yok | `cookieHeader` undefined / `container_session` yok | `undefined` döner, `verify` çağrılmaz | `stateless-session-authenticator.test.ts` "cookie yok" |
| Bozuk token | `authenticateToken("bozuk")` / `authenticate("container_session=bozuk")` | `undefined` (fail-closed) | `stateless-session-authenticator.test.ts` "geçersiz token" |
| İmza/etiket/exp | HS256 dışı / `type`≠`container-session` / expired | `undefined` (jose `jwtVerify` + `type` kontrolü) | `jose-token-signer.ts#verify` (web-service token signer testleri) |
| Telemetri WS (Bearer) | `/ws/telemetry` query `token` = access token | Bağlantı kurulur (değişmez) | `ws-routes.test.ts` (access token) |
| Telemetri WS (oturum) | query `token` = agent imzalı oturum token'ı | `sessionAuthenticator.authenticateToken` ile kabul | `ws-routes.test.ts` "agent imzalı oturum token'ı kabul edilir" |
| Telemetri WS (geçersiz) | token yok/geçersiz | 401 (fail-closed) | `ws-routes.test.ts` (T1.5) |
| rbac (container tier) | `containerSessionAuthenticator` kayıtlı | `authenticate(cookie)` → payload'dan `User` | `server.ts#WebServiceServer` (wiring) + web-service 63/518 |
| rbac (field tier) | `uplinkSessionStore` | `field_session` stateful yolu korunur (değişmez) | web-service test seti |
| Status route | `makeStatusRoute({})` (konnektörsüz) | `{ connected:false, state:"offline" }` | `server.ts#WebServiceServer` + `status-route.ts#makeStatusRoute` |
| Agent kaydı (container) | `container-agent` servisi, `PEER_TYPE=container`, `PEER_ID=container-1` | Hub'da `container-1 (container, agent)` | `docker compose config` + canlı `/peers` |
| Agent kaydı (container2) | `container2-agent`, `PEER_ID=container-2` | Hub'da `container-2 (container, agent)` | canlı `/peers` |
| Agent erişimi (uçtan uca) | consumer token + `x-tunnel-user-*` → `/peers/<cid>/services/container-api/...` | HTTP 200, telemetri verisi (2135 satır) | canlı curl (AK-3.2) |
| Demo entegrasyon | field stack ayakta | 108/108 yeşil | `test:demo-integration` (AK-3.3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Öncelik |
|:--|:-------|:------|:--------|
| G1 | App-side oturum iptali (revocation) | Stateless modelde uygulama iptali bilmez; iptal hub tarafında (SPEC A-1, K2) | Düşük — token `exp` ile sınırlı, hub erişimi keser |
| G2 | `status-route.ts` tip arındırması (`hubPeerConnector?` → kaldır) | Kapsam dışı bırakıldı (S-2); endpoint korunur, route hep "offline" | Düşük — görsel arındırma |
| G3 | `tunnel.apiUpstream`/`tunnel.staticUpstream` ölü config tanımları | Kapsam dışı bırakıldı (S-3); kod artık kullanmıyor | Düşük — ölü config, davranışa etkisi yok |
| G4 | `bsc-pcs-connector` başlatma-sırası kırılganlığı | Pre-existing demo ordering (S-1); bu SPEC'in kapsamı dışı | Orta — demo entegrasyon flakiness'i |
| G5 | Container SPA / v2 UI uçtan uca doğrulama | Demo'da SPA yok (SPEC A-2); yalnız API yolu doğrulanıyor | Orta — üretim SPA agent arkasında |
| G6 | Boss tier'ın field servislerine hub üzerinden erişimi (`field-api` duyurusu) | Ayrı SPEC (SPEC §11 İP-1) | Orta — ayrı iş |

**review_date:** 2026-10-22
