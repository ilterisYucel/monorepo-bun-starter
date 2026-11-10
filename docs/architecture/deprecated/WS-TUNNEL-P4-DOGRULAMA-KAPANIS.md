---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, hub-servis, parity, e2e, v2, docker]
review_date: 2026-10-19
---

# ws-tunnel P4 Doğrulama (Aşamalı Parity + v2 Test) — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-P4-DOGRULAMA-MIMARISI.md](./WS-TUNNEL-P4-DOGRULAMA-MIMARISI.md) (✅ Approved 2026-10-16 — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `tools/hub-demo.mjs` | YENİ — process-içi hub (sqlite) + sahte device peer + consumer; bootstrap→claim→register→keşif→opak REST→WS köprü→control+relay adımları PASS/FAIL | UC-1 / FR-1.1 / FR-1.2 / T-1 |
| 2 | `packages/ws-tunnel-hub/src/main.ts#createHub` | DEĞİŞİK — `stop()` sırası düzeltildi (önce soketler, sonra `server.close`) | UC-1 (loopback kapanışı) |
| 3 | `packages/ws-tunnel-hub/src/infrastructure/inbound/fastify-server.ts#buildHubServer` | DEĞİŞİK — `forceCloseConnections: true` | UC-1 (loopback kapanışı) |
| 4 | `packages/ws-tunnel-hub/examples/device-app.mjs` | YENİ — saf REST (`/api/status`, `/api/actions/reboot`) + WS echo; peer agent `local-admin` duyurur | UC-2 / FR-2.1 / T-2 |
| 5 | `packages/ws-tunnel-hub/examples/consumer-app.mjs` | YENİ — opak REST + WS; offline→503, bilinmeyen servis→404 | UC-2 / FR-2.2 / T-3 |
| 6 | `packages/ws-tunnel-hub/examples/run-demo.mjs` | YENİ — hub + device-app + consumer-app tek komutta | UC-2 / FR-2.3 / T-4 |
| 7 | `tools/hub-image-parity.mjs` | YENİ — gerçek Docker imajı (`ws-tunnel-hub:local`) build→run→/health→bootstrap→register→REST→WS | UC-3a / FR-3.1 / T-5 |
| 8 | `deployment/v2/dev/field/docker-compose.yml` | DEĞİŞİK — hub-servis servisi (env modu `PEER_TOKEN=${FIELD_INTERNAL_API_TOKEN}` + `CONSUMER_TOKEN` + `demo-bridge` ağı); field-web-service `HUB_CONSUMER_URL`/`HUB_CONSUMER_TOKEN` | UC-3b / FR-3.2 / T-5/T-6 |
| 9 | `deployment/v2/dev/container/docker-compose.yml` | DEĞİŞİK — container-web-service `TUNNEL_SERVICE_ID=container-api` | UC-3b / FR-3.2 / T-5/T-6 |
| 10 | `deployment/v2/dev/container/.env` | DEĞİŞİK — `FIELD_WS_URL=ws://hub-servis:5003/ws/peer` | S-2 / FR-3.2 |
| 11 | `services/web-service/src/config/default.ts#serviceAnnouncement` | YENİ — container/field connector `services` duyurusu (env `TUNNEL_SERVICE_ID`) | S-1 / FR-3.2 |
| 12 | `e2e/hub-parity.spec.ts` | YENİ — 3 tarayıcı parity e2e: bağlı peer servis duyurur; bilinen servis opak (404 DÖNMEZ); bilinmeyen 404; rollback sözleşmesi | UC-3 / FR-3.2 / T-5/T-6 |
| 13 | `deployment/v2/aws/field/nginx/aws-demo-field.conf` | DEĞİŞİK — hub alias (`/peers/`, `/containers/<cid>/ui/` → `/peers/<cid>/services/container-api/$2`) | UC-3c / FR-3.3 / T-7 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Loopback demo | `bun tools/hub-demo.mjs` | 7/7 PASS, exit 0 |
| Mini uygulamalar | `bun packages/ws-tunnel-hub/examples/run-demo.mjs` | TÜM KONTROLLER GEÇTİ, exit 0 |
| İmaj parity | `bun tools/hub-image-parity.mjs` | TÜM KONTROLLER GEÇTİ, exit 0 |
| Parity e2e | `npx playwright test e2e/hub-parity.spec.ts` | 9/9 PASS (3 tarayıcı) |
| web-service derleme | `npx nx run web-service:build` | ✅ |
| web-service test | `npx nx run web-service:test --skip-nx-cache` | 540 test yeşil |
| hub-servis test | `npx vitest run --root packages/ws-tunnel-hub` | 45 test yeşil |
| ws-tunnel paket regresyon | `npx vitest run --root packages/ws-tunnel` | 233 test yeşil |
| Compose doğrulama | `docker compose config` (v1 boss/field + v2 field/container) | ✅ geçerli |
| Doküman lint | `bun run spec:check` | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Loopback demo PASS | `tools/hub-demo.mjs` (gözle — 7/7, exit 0) | 🟢 |
| AK-1.2 | Akışlar uçtan uca | `tools/hub-demo.mjs` (bootstrap→claim→register→keşif→opak REST→WS köprü→control+relay) | 🟢 |
| AK-2.1 | Device REST+WS sunar | `examples/device-app.mjs` (gözle — `/api/status`, `/api/actions/reboot`, WS echo; `local-admin` duyurur) | 🟢 |
| AK-2.2 | Opak REST+WS + hata yolları | `examples/consumer-app.mjs` (gözle — offline→503, bilinmeyen servis→404, fail-closed) | 🟢 |
| AK-2.3 | Koşucu PASS | `examples/run-demo.mjs` (gözle — TÜM KONTROLLER GEÇTİ, exit 0) | 🟢 |
| AK-3.1 | Wire+komut/telemetri/event parity | `tools/hub-image-parity.mjs` (3a 🟢 — imaj REST+WS) + `e2e/hub-parity.spec.ts` (3b register/duyuru/traversal/WS 🟢; domain-flow ⬜) | 🟡 |
| AK-3.2 | v2 SPA/API/WS + rollback | `e2e/hub-parity.spec.ts` 9/9 (register/duyuru/traversal/404 🟢, rollback sözleşmesi 🟢; SPA 200 render ⬜ — S-4) | 🟡 |
| AK-3.3 | nginx alias | `deployment/v2/aws/field/nginx/aws-demo-field.conf` (kod inceleme — hub alias uygulandı) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S-1 | `TUNNEL_SERVICE_ID` config eklendi | Container/field peer'in servis duyurusu için hub modunda zorunlu; P4 "yeni ürün kodu yok" kısıtına küçük sapma (`default.ts#serviceAnnouncement`). |
| S-2 | v2 compose/env wiring | hub-servis env modu + `demo-bridge`; `FIELD_WS_URL` hub'a; `TUNNEL_SERVICE_ID` forward. |
| S-3 | Rollback = branch revert | Legacy hub kodu P3'te silindi; env-flag ile geri alma YOK — rollback git branch/etiket ile. |
| S-4 | SPA/içerik 200 tarayıcı akışı | Container app'in KENDİ auth'unu gerektirir; hub parity kanıtı register+duyuru+traversal+404 ile sabitlendi (SPA 200 render G2'ye bırakıldı). |
| S-5 | `fieldTunnelPathAllowlist` ölü kalıntısı temizlendi | Index const + server dep kaldırıldı (fonksiyon `default.ts#fieldTunnelPathAllowlist` + test duruyor). |
| S-6 | Komut/telemetri/event domain-flow canlı doğrulanamadı | field→hub→container yürütme canlı koşuda field internal-token yolu auth hook'una takıldı (uygulama katmanı); G1'e bırakıldı. |

### A.5 Gözle Kontrol Maddeleri

- [x] **Purity-1:** parity testleri hub'a HTTP/WS tüketicidir; hub-servis monorepo import etmez (`e2e/hub-parity.spec.ts`, `tools/hub-image-parity.mjs`)
- [x] **Purity-2:** P4 yeni protokol/ürün kodu getirmez — yalnız demo/test scripti + deployment config (S-1 küçük config istisnası hariç)
- [x] **Purity-3:** sırlar demo'da env ile gelir (`PEER_TOKEN`/`CONSUMER_TOKEN`/`FIELD_INTERNAL_API_TOKEN`); düz metin repoda tutulmaz
- [x] **Purity-4:** v1/v2 wire + SPA base sözleşmesi korunur (nginx alias, base değişmez)
- [x] **Purity-5:** mini uygulamalar domain-free — saf REST + WS; auth yalnız hub consumer token
- [x] **Fail-closed:** erişilemeyen peer kayıttan düşer → 404; stale → 503 (`examples/consumer-app.mjs`)
- [x] **Kod referansı:** satır-numarası referansı YOK (sembol çapası `#sembol`)

### A.6 Genel Durum Özeti

Aşamalı doğrulama sırasıyla tamamlandı: UC-1 loopback (7/7), UC-2 mini uygulamalar (TÜM KONTROLLER GEÇTİ) ve UC-3a imaj parity (TÜM KONTROLLER GEÇTİ) tam 🟢; UC-3b gerçek v2 dev stack'in register/duyuru/traversal/WS/rollback kanıtı 9/9 e2e + canlı koşuyla sabitlendi, ancak komut/telemetri/event domain-flow (S-6) ve container SPA 200 render (S-4) canlı koşuda tam doğrulanamadı — AK-3.1/AK-3.2 🟡. nginx hub alias v2 aws config'ine uygulandı (AK-3.3 🟢). Tüm kapılar yeşil: web-service 540, hub-servis 45, ws-tunnel 233 test, `docker compose config` (v1+v2) ve `spec:check`. Belirlenen 6 sapma (S-1..S-6) bilinçli karar/ertelemedir; kalan açık işler §B.2'de listelendi.

**review_date:** 2026-10-19

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Port çakışması | demo hub boş portta | port 0 ile başlar, çakışma yok | `tools/hub-demo.mjs` |
| Loopback tam akış | bootstrap→claim→register | keşif + oturum + cookie + opak REST + WS köprü + relay | `tools/hub-demo.mjs` |
| WS köprü | peer echo | gidiş-dönüş tünelden akar | `tools/hub-demo.mjs` + `examples/device-app.mjs` |
| Control relay | consumer → peer → consumer | `{peerId,message}` consumer'a ulaşır (çift yön) | `tools/hub-demo.mjs` |
| Opak REST | consumer bilinen servisi çağırır | tünelden yanıt (200, 404 DÖNMEZ) | `examples/consumer-app.mjs` + `e2e/hub-parity.spec.ts` |
| Bilinmeyen servis | consumer yok servisi çağırır | 404 | `examples/consumer-app.mjs` + `e2e/hub-parity.spec.ts` |
| Peer offline | bağlı peer kayıttan düşer | 404 (fail-closed); stale → 503 | `examples/consumer-app.mjs` + `e2e/hub-parity.spec.ts` |
| İmaj health | hub imajı ayağa kalkar | `/health` 200 | `tools/hub-image-parity.mjs` |
| İmaj tam akış | build→run→bootstrap→register→REST→WS | tüm kontroller geçer, exit 0 | `tools/hub-image-parity.mjs` |
| Peer duyuru | bağlı peer `services` gönderir | `/peers` = `connected/services:[{id:container-api}]` | `e2e/hub-parity.spec.ts` |
| Hub keşif | canlı stack `up` | `/peers`/`/health` ok | `e2e/hub-parity.spec.ts` + canlı koşu |
| Opak yönlendirme | app katmanı 401/403 | istek upstream'e ulaştı; bilinmeyen 404 | canlı koşu |
| Rollback | uç nokta geri alınır | veri kaybı yok (branch revert) | `e2e/hub-parity.spec.ts` (sözleşme) |
| Hub kapanışı | `stop()` | önce soketler, sonra `server.close` | `packages/ws-tunnel-hub/src/main.ts#createHub` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Komut/telemetri/event DOMAIN-flow parity (fieldContainerCommandRoutes/OperationResponder → hub → container executor) canlı | yüksek | field auth harness gerekiyor (S-6) |
| G2 | Container SPA'nın tarayıcıda 200 render'ı (app auth/statik serving) | orta | ayrı iş (S-4) |
| G3 | nginx alias'ın dev (baked) nginx'e uygulanması | düşük | aws conf'e uygulandı; dev baked nginx'e aktar |
| G4 | Gerçek RevPi saha testi (Aşama 4) | orta | A1 — UC-1..3 geçince ayrıca, gözle/kontrollü |
| G5 | A4 host-based erişim (subdomain) | düşük | A2 — tetikte (absolute path/WS cookie kırılması / NIS-2) |

**review_date:** 2026-10-19

## A.7 (ek) — G1 domain-flow ara bulguları ve düzeltmeler (2026-10-19)

Canlı v2 stack'te komut zinciri (field→hub→container) izlenirken **üç gerçek hata** yüzeye çıktı ve düzeltildi:

| # | Bulgu | Düzeltme | Katman |
|:--|:------|:---------|:-------|
| F-a | Hub, peer uygulamasının beklediği oturum cookie'sini proxy isteğine eklemiyordu (legacy `container_session` forward'ı kaybolmuştu) | `HUB_PEER_SESSION_COOKIE` config'i + `access-routes` cookie birleştirme | hub-servis |
| F-b | P1'de `sessionCookieValue` varsayılanı `tunnel_session` olunca container rbac çağrısı cookie adını açıkça geçmediği için token okuyamıyordu | `sessionCookieValue(cookie, "container_session")` (açık ad) | web-service (tüketici) |
| F-c | Hub, peer yeniden bağlandığında bayat hub oturumunu yeniden kullanıp peer deposu sıfırlanmış olduğundan geçersiz token enjekte ediyordu | `PeerChannelHub.onPeerRegistered` → `gateway.closeSession(..., "peer-reconnect")` | hub-servis |

**Doğrulama (canlı):** hub `/peers` = `container-1/connected/services:[container-api]`; istek hub→peer→container'a **ulaşıyor** (container rbac/execute hattı devreye giriyor). Kanıt testleri: `access-routes.test.ts` (3), hub-servis 48 test, `tools/hub-demo.mjs` 7/7.

**Kalan (G1):** container'ın komut yürütme/ack semantiği (device ack timeout) — **hub ile ilgisiz**; tam `200` için demo cihaz simülatörü ack'i veya geçerli bir komut uç noktası gerekir.

## A.8 (ek) — A2 host-based erişim: RevPi tetiği ve port-tabanlı kök-montaj (2026-10-19)

**Tetik gerçekleşti:** RevPi dashboard (`https://revpi183949.local:41443`, Cockpit-benzeri) kök-mutlak asset kullanıyor (`/cockpit-revpi/cockpit/static/login.js`). Path-prefix modunda tarayıcı asset'leri hub kökünden istedi → 404/beyaz ekran. `<base>` enjeksiyonu XHR/WS'yi kurtaramayacağından A2 (host-based) seçildi.

**Karar:** Kullanıcıda sıfır konfigürasyon (hosts/DNS yok) → **port-tabanlı kök-montaj** (ürün modeli: appliance her yayınlanan uygulamaya port tahsis eder; Host anahtarı olduğu için ileride wildcard DNS aynı mekanizmayla gelir).

**Değişiklikler:**

| Katman | Değişiklik |
|:--|:--|
| `hub-config` | `HUB_HOST_MAP` (`host[:port]=peerId/serviceId`) → `hostMap`; `hostMapPorts()` |
| `access-routes` | `resolveAccessContext` önce Host (kök-montaj, prefix strip yok), sonra path paramları; `hostMap` doluysa GET+WS ve diğer metotlar için `/*` catch-all; geriye dönük path-modu aynen |
| `open-service-access` | `AccessRequest.rootMount` → allowlist atlanır (mount = yetki sınırı), blocklist her modda kazanır |
| `main` | `attachExtraPorts` — ek portlara request/upgrade forward; stop'ta kapanır |

**Kanıt:**
- `hub-config.test.ts` (4) — parse/hata/port çıkarımı.
- `access-routes.test.ts` (+3) — kök-montaj tam path, eşlenmeyen host 404, path-modu geriye dönük.
- `open-service-access.test.ts` (+1) — kök-montaj allowlist serbest + blocklist kapalı.
- `tools/revpi-agent-check.mjs` — **4/4 PASS** (path-modu TLS-bypass + kök-montaj kök-mutlak JS/CSS/XHR login gerçek port + viewer cookie).
- hub-servis 56, ws-tunnel 233 test yeşil.

**Kapsam dışı/ertelenen:** wildcard DNS + HTTPS varyantı (A2 ikinci varyant); origin-hardcoded JS URL'leri (gözlemde).

**Dosyalar:** `packages/ws-tunnel-hub/src/{config/hub-config.ts,infrastructure/inbound/routes/access-routes.ts,application/open-service-access.ts,main.ts,infrastructure/inbound/fastify-server.ts}`, `tools/{peer-agent.mjs,revpi-viewer.mjs,revpi-agent-check.mjs}`.

## A.9 (ek) — Login 401 düzeltmesi: header iletimi + mount TLS (2026-10-19)

**Bulgu (RevPi canlı):** A2 kök-montaj ekranı açıldı; giriş 401. Kanıt: doğrudan giriş **GET + `Authorization: Basic`** (`X-Superuser` dahil) ile yapılıyor; yanıt `Set-Cookie: cockpit=...; Secure; SameSite=Strict` + `csrf-token` dönüyor. Hub `FORWARD_HEADERS` allowlist'i yalnızca birkaç başlık taşıdığından `Authorization` düşüyordu (→ 401) ve `Secure` cookie `http://` üzerinden tarayıcıda saklanmıyordu.

**Düzeltmeler:**

| Katman | Değişiklik |
|:--|:--|
| `access-routes` | `FORWARD_HEADERS` allowlist → **denylist** (hop-by-hop + `x-tunnel-*` hariç tümü). `authorization` YALNIZCA cookie-oturum yolunda iletilir; consumer-token yolunda sızdırılmaz |
| `hub-config` | `HUB_TLS_CERT`/`HUB_TLS_KEY` (BYO) veya `HUB_TLS_ENABLED=1` (self-signed); `HUB_TLS_HOST`/`HUB_TLS_DIR` |
| `tls-material` (yeni) | BYO PEM okuma / openssl ile kalıcı self-signed üretim (SAN: host, localhost, 127.0.0.1) |
| `main` | `attachExtraPorts(..., tls)` → mount portları **https** (tarayıcı kenarı); ana port http kalır (peer/consumer/admin) → http+https birlikte |
| `Dockerfile` | Final imaja `openssl` (self-signed üretimi) |

**Kanıt:**
- `access-routes.test.ts` (+3) — cookie yolunda authorization/x-superuser/referer iletilir; consumer yolunda authorization + `x-tunnel-*` sızmaz; hop-by-hop gitmez.
- `hub-config.test.ts` (+3) — BYO cert, self-signed, TLS yok.
- `tools/revpi-agent-check.mjs` — **6/6 PASS**: path-modu TLS-bypass, A2 https kök-montaj + kök-mutlak JS/CSS, Basic-auth login→200+Secure cookie+korumalı endpoint, authorization iletim/sızıntı, viewer https cookie.
- hub-servis 62, ws-tunnel 233 test yeşil; imaj smoke: mount `https` (self-signed), ana port `http`, ikisi birlikte.

**Kapsam dışı:** WS upgrade'de `Authorization` iletimi (tarayıcı WS handshake cookie taşır; Basic-auth WS gerekirse ayrı iş). Subdomain/DNS + ACME (A2 ikinci varyant).

**Dosyalar:** `packages/ws-tunnel-hub/src/{config/hub-config.ts,infrastructure/inbound/routes/access-routes.ts,infrastructure/outbound/tls-material.ts,main.ts}`, `packages/ws-tunnel-hub/Dockerfile`, `tools/revpi-agent-check.mjs`.

## A.10 (ek) — WS köprüsü header iletimi + mount upgrade düzeltmesi (2026-10-19)

**Bulgu (RevPi canlı):** Login başarılı + CSS yüklendi; ancak Cockpit "Connection failed — journalctl -u cockpit" verdi. Kök neden: **WS köprüsü upstream handshake'ine header taşımıyordu** (`tunnel-client.ts#openWsBridge` → `socketFactory.create(wsUrl, {})`), bu yüzden tarayıcının `cockpit` oturum cookie'si upstream `cockpit-ws`'e ulaşmıyordu. `Access-Control-Allow-Origin` farkı yanıltıcıydı (sayfa aynı-origin; ACAO gerekmez).

**İkinci hata (kanıtla):** A2 kök-montaj ek portlarında WS el sıkışması **asılı kalıyordu**. İzole repro: fastify `route({wsHandler})` ana portta 101 verirken, ek-https front'ta `ERR_HTTP_SOCKET_ASSIGNED` ("Socket already assigned") → front soketinin `_httpMessage`'ı set'li olduğundan `assignSocket` reddediyordu.

**Düzeltmeler:**

| Katman | Değişiklik |
|:--|:--|
| `tunnel-proxy` (paket) | `startWsBridge` input'una `headers?` → stream-open'a eklenir |
| `tunnel-client` (paket) | `openWsBridge` handshake header'larını geçirir; `wsHandshakeHeaders` filtresi (hop-by-hop + `sec-websocket-*` + `origin` düşer — peer yeni handshake üretir) |
| `access-routes` (hub) | WS handler `forwardWsHeaders` ile cookie+authorization (cookie yolu) taşır; handshake-özgü + `x-tunnel-*` düşer |
| `main` (hub) | Ek-port front upgrade yolunda `socket._httpMessage = null` (ELEGANT-EXCEPTION: çok-portlu fastify+upgrade deseni) |

**Kanıt:**
- `tunnel-client.test.ts` (+1) — stream-open headers upstream WS handshake'ine taşınır (cookie/auth gider; `sec-websocket-key`/`origin` düşer).
- `access-routes.test.ts` (+2) — WS cookie yolunda cookie+authorization taşınır; consumer yolunda authorization sızmaz.
- `tools/revpi-agent-check.mjs` — **7/7 PASS**: + WS kanalı (cockpit cookie ile echo, cookie'siz red) https kök-montaj üzerinden.
- hub-servis 64, ws-tunnel 234 test yeşil; imaj yeniden derlendi.

**Kapsam dışı:** WS `Sec-WebSocket-Protocol` (subprotocol) aktarımı — ihtiyaç görülürse ayrı iş.

**Dosyalar:** `packages/ws-tunnel/src/{proxy/tunnel-proxy.ts,client/tunnel-client.ts}`, `packages/ws-tunnel-hub/src/{infrastructure/inbound/routes/access-routes.ts,main.ts}`, `tools/revpi-agent-check.mjs`.

## A.11 (ek) — WS subprotocol aktarımı (RFC 6455) + dağıtım dersi (2026-10-19)

**Bulgu (RevPi canlı):** Bayat agent binary güncellendikten sonra da "Connection failed" sürdü. Network kanıtı: tarayıcı `Sec-WebSocket-Protocol: cockpit1` gönderiyor, hub 101'de `cockpit1` yankılıyor; ancak agent upstream WS handshake'ine subprotocol taşımıyordu → `cockpit-ws` bağlantıyı kapatıyor.

**Tasarım (app-bağımsız, RFC 6455 proxy davranışı):** `Sec-WebSocket-Protocol` listesi stream-open ile peer'e taşınır; peer kendi upstream handshake'inde `protocols` olarak gönderir. `cockpit1` yalnızca bir örnek — aynı mekanizma `graphql-ws`, `mqtt`, `wamp.*` vb. için geçerlidir.

| Katman | Değişiklik |
|:--|:--|
| `channel/interface` | `ISocketClientFactory.create(url, headers, protocols?)` |
| `channel/ws-socket-client` | `protocols` → `new WebSocket(url, protocols, { headers })` |
| `client/tunnel-client` | `requestedSubprotocols()` — `sec-websocket-protocol` listesini ayrıştırır, fabrikaya geçirir (header olarak gönderilmez) |
| `access-routes` (hub) | `sec-websocket-protocol` artık WS filtresinde düşmez (key/version/extensions/origin düşmeye devam) |

**Bilinen sınır:** Upstream WS 4xx reddinde Bun `ws` istemcisi `unexpected-response` olayı üretmiyor → köprü, ack timeout'u (10s) sonrası tarayıcı soketini 1013 ile kapatıyor (hata gecikmeli yüzeye çıkar). Hızlı-fail iyileştirmesi açık (handshake timeout / upstream status iletimi) — **A.14'te kapatıldı**.

**Dağıtım dersi (checklist):** Paket (`packages/ws-tunnel/src`) değişince **agent binary yeniden derlenmeli** (`bun build --compile --target=bun-linux-arm64`); yalnız hub imajını güncellemek yetmez.

**Kanıt:**
- `ws-socket-client.test.ts` — creator'a `protocols` geçer.
- `tunnel-client.test.ts` (+1) — `Sec-WebSocket-Protocol: cockpit1, cockpit2` → upstream `socket.protocol === "cockpit1"` (wss `handleProtocols`).
- `access-routes.test.ts` — WS'te `sec-websocket-protocol` taşınır.
- `tools/revpi-agent-check.mjs` — **7/7 PASS**; WS: cookie+subprotocol ile echo, subprotocol'süz ve cookie'siz red.
- ws-tunnel 235, hub-servis 64 test yeşil.

**Seviye 2 (açık karar):** Upstream'in **seçtiği** subprotocol'ü tarayıcı 101'ine birebir yansıtma (çoklu-protokol pazarlığı) — `handleProtocols` + gecikmeli upgrade gerektirir; bugün YAGNI.

**Dosyalar:** `packages/ws-tunnel/src/{channel/interface.ts,channel/ws-socket-client.ts,client/tunnel-client.ts}`, `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/access-routes.ts`, `tools/revpi-agent-check.mjs`.

## A.12 (ek) — Upstream WS `Origin` maskeleme (Origin↔Host) + canlı RevPi doğrulaması (2026-10-20)

**Bulgu (RevPi canlı):** A.11 sonrası tarayıcı 101 alıyor, `{"command":"init","version":1}` gönderiyor, ardından soket **1013** ile kapanıyor (hub ack timeout). cockpit journal'ı boş. Ağ tabanı karşılaştırması: sağlıklı bağlantıda tarayıcı `Origin: https://revpi183949.local:41443` gönderiyor; agent'ın upstream handshake'inde **Origin hiç yok**.

**Probe matrisi (`revpi183949.local:41443`, raw upgrade):**

| Origin | Host | Sonuç |
|:--|:--|:--|
| yok | revpi183949.local:41443 | 403 |
| `https://127.0.0.1:41443` | revpi183949.local:41443 | 403 |
| `https://revpi183949.local:41443` | 127.0.0.1:41443 | 403 |
| `https://revpi183949.local:41443` | revpi183949.local:41443 | **101** |
| `https://127.0.0.1:41443` | 127.0.0.1:41443 | **101** |

**Kök neden:** Upstream WS sunucusu **Origin↔Host same-origin** kontrolü yapıyor (gorilla/websocket varsayılanı, Python `websockets`, tornado `check_origin` — yaygın). Bun'un `ws` istemcisi Origin göndermiyor (npm `ws` varsayılanı gönderir; Bun uyumluluk katmanı göndermez) → 403 → Bun `unexpected-response` üretmiyor (A.11 sınırı) → ack gelmiyor → hub 10s sonra 1013.

**Tasarım (app-bağımsız):** `wsOrigin(url)` — `wss:` → `https:`, `ws:` → `http:` (tarayıcı davranışı). `openWsBridge`, upstream handshake başlıklarına `origin = wsOrigin(wsUrl)` ekler; tarayıcıdan gelen Origin **taşınmaz/ezilir**. Böylece upstream kendi Host'uyla eşleşen bir Origin görür — nginx/apache/çıplak HTTP server fark etmeksizin same-origin kuralı sağlanır.

**Kenar durumlar (YAGNI, gerekince knob):** Origin'i sabit bir public hostname listesiyle doğrulayan uygulamalar → `WS_ORIGIN` env override'ı; "Origin yokken kabul edip tanımadığını reddeden" egzotik sunucular → `WS_ORIGIN=off`.

**Kanıt:**
- `tunnel-client.test.ts` — browser `origin: https://127.0.0.1:5101` gönderilse bile upstream `origin === http://127.0.0.1:<port>`; `wsOrigin` ws/wss eşlemesi.
- `tools/revpi-agent-check.mjs` — fake upstream artık **Origin↔Host** zorunlu (gerçek cockpit-ws davranışı); **7/7 PASS**.
- ws-tunnel **236**, hub-servis **64** test yeşil.

**Açık (Track B — ayrı tur; A.14'te tamamlandı):** local Bun 1.3.14 (2026-05-13) `unexpected-response`/`upgrade` olaylarını içermiyor; 1.4.0+ (fix merge 2026-07-29, PR #36272) içeriyor. Bun 1.4.3'e yükseltme + agent'ta upstream reddini statusCode ile ack'leme (10s timeout yerine hızlı-fail) + Dockerfile'da `oven/bun:1.4.3` sabitleme.

**Dosyalar:** `packages/ws-tunnel/src/client/tunnel-client.ts`, `packages/ws-tunnel/src/client/tunnel-client.test.ts`, `tools/revpi-agent-check.mjs`.

## A.13 (ek) — Oturum ömrü: env knob'ları + bayat oturum semantiği (2026-10-20)

**Bulgu (RevPi canlı, kullanıcı gözlemi):** Tünel üzerinden dashboard'da ~5-10 dk boşta kaldıktan sonra beyaz ekran + `{"error":"Consumer token gerekli"}`. Sekme kapatılıp yeniden bağlanınca çalışıyor.

**Mekanizma (bilinçli tasarım):** `HubSessionStore` — mutlak TTL **4 sa**, idle **15 dk**, 60 sn sweep (`§5.7`). İdle sayacı yalnız HTTP/WS handshake'te tazelenir (WS frame trafiği tazelemez). Ayrıca akış seviyesinde idle **5 dk** (`TunnelProxy`). Bayat cookie, `access-routes`'ta consumer dalına düşüp **yanıltıcı** "Consumer token gerekli" üretiyordu — güvenlik davranışı doğru, mesaj yanlış.

**Karar (K11):**
- Ömür env ile ayarlanabilir: `HUB_SESSION_TTL_MS` (4 sa), `HUB_SESSION_IDLE_MS` (15 dk), `HUB_STREAM_IDLE_MS` (5 dk) — default'lar korunur (fail-closed güvenlik değişmez).
- Bayat/geçersiz oturum cookie'si + consumer token yokken: **401 "Oturum suresi doldu"** + `Set-Cookie: <ad>=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`; WS'te `1008 "oturum suresi doldu"`. Geçerli consumer token yolu etkilenmez; cookie yoksa geriye dönük mesaj aynı.
- Heartbeat/keep-alive **yok** — idle süreli oturum bilinçli güvenlik önlemi.

**Kanıt:**
- `access-routes.test.ts` — bayat cookie → 401 + cookie temizliği; cookie yok → "Consumer token gerekli" (geriye dönük); bayat cookie + geçerli consumer token → 200; `sessionRejectReason` (WS nedeni).
- `hub-config.test.ts` — default'lar + env override + geçersiz değer reddi.
- hub-servis **71**, ws-tunnel **236** test yeşil; `revpi-agent-check` **7/7**; tsc temiz.

**Not (UX):** Yeniden bağlanma akışı viewer butonu üzerinden çalışır; opak dashboard uygulamasının 401 davranışı bizim kontrolümüzde değil — hub artık dürüst durum kodu/mesaj veriyor.

**Dosyalar:** `packages/ws-tunnel-hub/src/{infrastructure/inbound/routes/access-routes.ts,infrastructure/inbound/fastify-server.ts,config/hub-config.ts,main.ts}` + testler, `packages/ws-tunnel-hub/README.md`, `docs/architecture/WS-TUNNEL-HUB-SERVIS-MIMARISI.md`.

## A.14 (ek) — Bun 1.4.3 yükseltmesi + fast-fail + RTU backend swap (2026-10-20)

**Hedef:** Bun 1.3.14 → 1.4.3 (performans + `ws` `unexpected-response`/`upgrade` event'leri). Engel sanılan `jsmodbus` **değildi** — jsmodbus 4.0.10 saf JS (crc+debug, `unref`/`pause` yok). Gerçek engel `serialport` (N-API, libuv `uv_default_loop` → Bun #4622/#18546). Repo'da tek tüketicisi `packages/core` (RTU).

**Kararlar:**
- **RTU backend: `bun-serialport@0.2.0`** (`bun:ffi`, native derleme yok) + `SerialSocketAdapter` (jsmodbus RTU socket sözleşmesi: 'open'/isOpen/write/data). jsmodbus'a dokunulmadı.
  - Port **enjekte** edilir (`ModbusRtuPortFactory`); varsayılan üretici `bun-serialport`'u yalnız `connect()` anında dinamik import eder → Node tabanlı test/araçlar `bun:ffi` yüklemez.
  - `autoOpen: false` + dinleyiciler bağlandıktan sonra `open()` → 'open' olay yarışı yok.
  - `parity: mark|space` desteklenmez (fail-fast).
- **Fast-fail (A.11 sınırı kapandı):** agent `onRejected(statusCode)` → `stream-open-ack` gerçek status (0 → 502) + `stream-close ws-rejected`; hub ack≠101'de tarayıcıyı anında 1013 ile kapatır ve `stream_rejected` logu (status bağlamıyla) basar. 10s sessiz timeout bitti.
- **Docker pinleri:** hub-servis `oven/bun:1.4.3@sha256:ec06…` (build) + `1.4.3-slim@sha256:14a2…` (runtime); 9 servis `FROM` satırı `1.3.14@sha256:e105…` → `1.4.3@sha256:ec06…`.

**Kanıt:**
- Tam paket **2547 test / 305 dosya** yeşil (Bun 1.4.3 runtime; Node-run vitest da kırılmıyor).
- ws-tunnel **237**, hub-servis **71**, core **128**.
- `revpi-agent-check` **7/7** (negatif pencere 12s → 5s; fast-fail).
- **`tools/rtu-loopback-check.mjs`** — socat PTY çifti + jsmodbus `ModbusRTUServer` ↔ `ModbusRtuClient`: **4/4 PASS** (gerçek `bun:ffi` termios yolu; x64 + derlenmiş arm64 binary).
- Ajan binary: `bun-linux-aarch64-v1.4.3`, md5 `289e29ba2977f5c4af3fc03b7e9f09b6`; hub canlı `bun --version` → **1.4.3**.

**Açık riskler:**
- **AVX2'siz eski x64 CPU**: Bun >1.3.8 çöküyor (#30613) — ARM/RevPi etkilenmez; x64 saha makinelerinde `bun` (baseline) doğrulanmalı.
- `bun-serialport` genç (0.2.0) — sürüm pinli; `drain()` bloklayıcı (event loop stall) bilinen sınır; sorun çıkarsa upstream PR.
- RTU şu an hiçbir deployment config'inde kullanılmıyor (dormant) — loopback kanıtı taşıma katmanını doğrular, saha cihazı davranışı değil.

**Dosyalar:** `packages/core/src/modbus/{serial-socket-adapter.ts,serial-socket-adapter.test.ts,bun-serialport.d.ts,client-rtu.ts,client-rtu.test.ts}`, `packages/core/package.json`, `package.json`, `packages/ws-tunnel/src/{client/tunnel-client.ts,client/tunnel-client.test.ts,proxy/tunnel-proxy.ts}`, `packages/ws-tunnel/src/connector/tunnel-connector.spec.ts`, `tools/{rtu-loopback-check.mjs,revpi-agent-check.mjs}`, `packages/ws-tunnel-hub/Dockerfile`, servis/app Dockerfile'ları.
