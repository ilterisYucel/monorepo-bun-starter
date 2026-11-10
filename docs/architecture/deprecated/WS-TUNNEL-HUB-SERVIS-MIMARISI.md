---
status: active
space: architecture
tags: [mimari, ws-tunnel, hub-servis, hexagonal, ports-adapters, docker, spec]
review_date: 2026-10-16
---

# ws-tunnel Hub-Servis — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 DOĞRULANMIŞ (2026-10-16) — KAPANIŞ tamam.
> **KAPANIŞ:** [WS-TUNNEL-HUB-SERVIS-KAPANIS.md](./WS-TUNNEL-HUB-SERVIS-KAPANIS.md)
> **İlişkili:** [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md), [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md), [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md), [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md)

## 1. Amaç ve Bağlam

Hub işlevi bugün monorepo `web-service` içine gömülüdür (`FieldRegistry` WS + token + stale + tüm route'lar). Paket bağımsızlaştı (P1); şimdi hub tarafı **ayrı çalıştırılabilir bir servis** olarak paketlenir: `packages/ws-tunnel-hub/` — kendi `package.json`'ı, kendi Docker imajı, monorepo importu YOK. Compose'lara imaj olarak eklenir; container-field ve RevPi testleri bu imajla yapılır.

**Mimari zorunluluk:** Hub-servis'in web kısmı **hexagonal (ports & adapters)** olacaktır. Domain ve uygulama katmanları framework'ten (Fastify/ws/sqlite/env) bağımsızdır; dış bağımlılıklar portlardan enjekte edilir. **Use-case'i belirlenmemiş, dış bağımlılığı decouple edilmemiş ham implementasyon YASAKTIR.**

**Wire uyumu:** `/ws/peer` üzerindeki register/ack/heartbeat/session/stream frame'leri v1/v2 ile birebirdir; hub domain mesajı (telemetri/operation/event) **yorumlamaz**, opak iletir.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Hexagonal domain + application + ports + adapters | ✅ dahil |
| Fastify HTTP/WS inbound adapter, `/ws/peer`, keşif/erişim, consumer relay | ✅ dahil |
| SQLite peer credential store + env token store (basit auth) | ✅ dahil |
| Dockerfile (`oven/bun`) + compose örneği | ✅ dahil |
| İP-2 tam bootstrap/revocation akışı | ❌ hariç — port hazır, akış İP-2'de |
| Host-based erişim (A4) | ❌ hariç — ayrı SPEC (tetikte) |
| Monorepo web-service'in consumer'a dönüştürülmesi | ❌ hariç — ayrı faz (P3) |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **Hexagonal mimari** zorunlu | `domain` + `application` framework import ETMEZ; dış bağımlılık yalnız portlardan |
| K2 | Konum `packages/ws-tunnel-hub/` | Kendi `package.json`'ı; monorepo importu YASAK; yalnız `../src` (paket yüzeyi) |
| K3 | HTTP/WS çerçevesi **Fastify + @fastify/websocket** | Yalnız inbound adapter katmanında |
| K4 | Wire uyumu: `/ws/peer` v1/v2 birebir | Hub domain mesajlarını yorumlamaz (opak relay) |
| K5 | Kalıcılık **`bun:sqlite`** (tek dosya, volume) | `IPeerCredentialsStore` portu; adapter sqlite/env |
| K6 | Consumer relay ayrı **consumer token**'ı ile | Peer token'ı consumer kanalını KULLANAMAZ (kanal izolasyonu) |
| K7 | Audit başlangıçta **no-op/memory** sink | Tamper-evidence kaynak tarafta; kalıcı hub audit'i aynı porta adapter olarak eklenir |
| K8 | Peer auth P2'de **env/token dosyası** (hash) | İP-2 bootstrap aynı portun sqlite adapter'ına eklenir |
| K9 | Stale/liveness **domain** policy'si | `PeerConnectionTracker` + enjekte `IClock`; WS adapter yalnız event taşır |
| K10 | Docker: `oven/bun` multi-stage + `HEALTHCHECK` | Volume `/data/hub.db`; `compose.example.yml` |
| K11 | Oturum/akış ömrü **env ile ayarlanabilir** (default korunur) | `HUB_SESSION_TTL_MS`=4sa, `HUB_SESSION_IDLE_MS`=15dk, `HUB_STREAM_IDLE_MS`=5dk; bayat oturum cookie'si → 401 "Oturum suresi doldu" + cookie temizliği (fail-closed) |
| K11 | Monorepo bağımsızlığı | Hub-servis bağımlılıkları: `../src` + `fastify` + `@fastify/websocket` + `ws` + `zod` (monorepo YOK) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Hub işlevi web-service'e gömülü (WS + token + stale + route'lar tek katmanda) | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry`; `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes` |
| B2 | Paket bağımsızlaştı; hub tarafı için çalıştırılabilir servis yok | `WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-KAPANIS.md` |
| B3 | Keşif/opak erişim rotaları tüketicide (web-service) — hub-servis'e taşınacak seed | `services/web-service/src/presentation/routes/peer-service-routes.ts#peerServiceRoutes` |
| B4 | Compose'lara eklenecek bağımsız hub imajı yok | `deployment/**` (hub-servis imajı YOK) |

## 4. Mimari (hexagonal)

### 4.1 Katmanlar ve bağımlılık kuralı

```
┌─ INBOUND ADAPTERS (infrastructure) ────────────────────────────────────────────┐
│ Fastify HTTP rotaları · /ws/peer (PeerChannelHub) · /ws/consumer (ConsumerChannel)│
│        │ use-case arayüzlerini çağırır — framework YALNIZ burada                 │
│  ┌─ APPLICATION (use-case'ler, saf) ──────────────────────────────────────────┐ │
│  │ RegisterPeer · DiscoverPeers · OpenServiceAccess · RelayControl ·         │ │
│  │ AuthenticatePeerToken · HealthCheck                                       │ │
│  │        │                                                                  │ │
│  │  ┌─ DOMAIN (saf) ───────────────────────────────────────────────────────┐ │ │
│  │  │ ws-tunnel paketi: HubPeerRegistry · SessionGateway · HubSessionStore │ │ │
│  │  │ · TunnelProxy                                                         │ │ │
│  │  │ hub-servis: PeerConnectionTracker (stale policy + IClock) · DTO'lar   │ │ │
│  │  │ PORTS: IHubChannel · IPeerCredentialsStore · IAuditSink · ILogger ·   │ │ │
│  │  │        IClock · IControlRelaySink                                      │ │ │
│  │  └───────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│ OUTBOUND ADAPTERS: PeerChannelHub (IHubChannel, WS) · SqlitePeerCredentialStore · │
│ EnvPeerTokenStore · ConsoleLogger · MemoryAuditSink · ConsumerChannel            │
└─ COMPOSITION ROOT: main.ts (düz constructor wiring — framework burada) ──────────┘
```

**Bağımlılık kuralı:** `domain` hiçbir dış pakete; `application` yalnız `domain` + portlara; `infrastructure` `application`/`domain`'e; `main` hepsine bağlıdır. Ters yön YASAK.

### 4.2 Modül yerleşimi

| Katman | Dosyalar |
|:-------|:---------|
| `src/domain/` | `ports/*.ts`, `peer-connection-tracker.ts`, `discovery-view.ts` (saflar) |
| `src/application/` | `register-peer.ts`, `discover-peers.ts`, `open-service-access.ts`, `relay-control.ts`, `authenticate-peer-token.ts`, `health-check.ts` |
| `src/infrastructure/inbound/` | `fastify-server.ts`, `routes/*.ts`, `peer-channel-hub.ts`, `consumer-channel.ts` |
| `src/infrastructure/outbound/` | `sqlite-peer-credential-store.ts`, `env-peer-token-store.ts`, `console-logger.ts`, `memory-audit-sink.ts` |
| `src/config/` | `hub-config.ts` (env → config, fail-fast) |
| `src/main.ts` | Composition root |

## 5. Purity Kuralları

1. `domain/` ve `application/` altında **Fastify/ws/bun:sqlite/process.env importu YASAK**; dış bağımlılık yalnız port arayüzü.
2. Her use-case tek dosyada, tek sorumluluk; constructor injection; komutlar `void`/`Promise<void>`, sorgular değer döner.
3. Adapter'lar ince: HTTP/WS şekli → DTO → use-case; iş mantığı adapter'a GİRMEZ.
4. Domain mesajları (telemetri/operation/event) yorumlanmaz; consumer relay'de opak taşınır.
5. Wire şekilleri değişmez; hata yolları fail-closed (token, config, audit).
6. Sırlar düz metin saklanmaz/loglanmaz; token karşılaştırması hash ile.
7. Monorepo importu YASAK; yalnız paket yüzeyi `../src`.

## 6. Use Case'ler

### 6.1 UC-1 — RegisterPeer (peer kaydı)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: token doğrulama, servis duyurusu doğrulama, registry + tracker kaydı, register-ack.
- hariç: bootstrap/revocation akışı (İP-2); consumer relay (UC-4).

**Akış:**
1. `/ws/peer` bağlantısı → ilk `register` frame'i.
2. `AuthenticatePeerToken` portu ile token doğrulanır (fail-closed).
3. `services[]` STRICT şema ile doğrulanır (opak; hedef/protokol alanı reddedilir).
4. `HubPeerRegistry` + `PeerConnectionTracker` kaydı; `register-ack ok`; geçersizde `rejected` + kapatma.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Peer token'ı port üzerinden doğrulanmalı; geçersizse `register-ack rejected` + bağlantı kapatılmalı | AK-1.1 |
| FR-1.2 | `services[]` STRICT doğrulanmalı; opak olmayan alan (target/protocol/health) reddedilmeli | AK-1.2 |
| FR-1.3 | Başarılı register peer'ı `HubPeerRegistry` + `PeerConnectionTracker`'a yazmalı; ack dönmeli | AK-1.3 |
| FR-1.4 | Aynı peer yeniden register'da önceki bağlantı kapatılmalı; servis listesi yenisiyle değişmeli | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** geçersiz peer token **WHEN** register gelir **THEN** `rejected` ack döner ve bağlantı kapanır.
2. **AK-1.2 — GIVEN** `{id:"x", target:"http://…"}` duyurusu **WHEN** doğrulanır **THEN** reddedilir (STRICT).
3. **AK-1.3 — GIVEN** geçerli token + duyuru **WHEN** register gelir **THEN** registry/tracker kaydı + `ok` ack.
4. **AK-1.4 — GIVEN** peer bağlıyken yeni register **WHEN** işlenir **THEN** eski bağlantı kapanır, servis listesi değişir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Token fail-closed | unit | ⬜ |
| AK-1.2 | Opak duyuru doğrulaması | unit | ⬜ |
| AK-1.3 | Registry + tracker kaydı | unit | ⬜ |
| AK-1.4 | Re-register değişimi | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `PeerConnectionTracker` (domain, IClock) + testler
- [ ] T-2: `RegisterPeer` use-case + port-mock testleri
- [ ] T-3: `PeerChannelHub` inbound adapter (`/ws/peer`) + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Token yok | fail-closed reject |
| Bilinmeyen peerType | reddedilir (enum) |
| Aynı servis id iki kez | son değer kazanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/domain/peer-connection-tracker.ts` | YENİ — stale/liveness policy |
| `hub-servis/src/application/register-peer.ts` | YENİ — use-case |
| `hub-servis/src/infrastructure/inbound/peer-channel-hub.ts` | YENİ — WS adapter |

### 6.2 UC-2 — Discover (peer/servis keşfi)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: `GET /peers`, `GET /peers/:peerId/services`; DTO eşleme.
- hariç: erişim (UC-3); relay (UC-4).

**Akış:**
1. Inbound adapter isteği use-case'e DTO olarak verir.
2. Use-case registry + tracker'dan okur.
3. Adapter DTO'yu JSON'a çevirir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `GET /peers` kayıtlı peer'ları id/type/status/services ile dönmeli | AK-2.1 |
| FR-2.2 | `GET /peers/:id/services` yalnız o peer'ın servislerini dönmeli; bilinmeyen peer 404 | AK-2.2 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** iki peer bağlı **WHEN** `GET /peers` **THEN** ikisi id/type/status/services ile listelenir.
2. **AK-2.2 — GIVEN** bilinmeyen peer **WHEN** servis istenir **THEN** 404.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Peer listesi DTO | unit | ⬜ |
| AK-2.2 | Bilinmeyen peer 404 | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `DiscoverPeers` use-case + testler
- [ ] T-5: Keşif rotaları (inbound) + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Servis duyurusu yok | boş dizi |
| Stale peer | listede `status:"stale"` |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/application/discover-peers.ts` | YENİ |
| `hub-servis/src/infrastructure/inbound/routes/discovery-routes.ts` | YENİ |

### 6.3 UC-3 — OpenServiceAccess (opak erişim)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: oturum aç/yeniden kullan, allowlist, stale/404 kontrolleri, opak HTTP/WS proxy.
- hariç: karar token'ları (İP-2); host-based (A4).

**Akış:**
1. `resolveAccessContext` ile peer/servis belirlenir (inbound adapter).
2. Use-case: servis duyurulmuş mu, peer bağlı mı, allowlist geçiyor mu?
3. `SessionGateway.openSession` (veya mevcut oturum) → `TunnelProxy.startHttpStream`/`startWsBridge`.
4. Yanıt opak akar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Bilinmeyen servis 404; stale/idle peer 503 dönmeli; stream açılmamalı | AK-3.1 |
| FR-3.2 | Oturum `SessionGateway` üzerinden açılmalı/yeniden kullanılmalı; audit portu çağrılmalı | AK-3.2 |
| FR-3.3 | Allowlist config'i uygulanmalı; istek opak proxy ile peer'a iletilmeli (HTTP+WS) | AK-3.3 |
| FR-3.4 | Bayat/geçersiz oturum cookie'si + consumer token yoksa 401 "Oturum suresi doldu" dönmeli ve cookie temizlenmeli (WS'te 1008 aynı nedenle); geçerli consumer token yolu etkilenmemeli | AK-3.4 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** duyurulmamış servis **WHEN** erişim **THEN** 404; **GIVEN** stale peer **THEN** 503.
2. **AK-3.2 — GIVEN** geçerli erişim **WHEN** oturum gerekir **THEN** gateway oturumu açılır/yeniden kullanılır.
3. **AK-3.3 — GIVEN** bağlı peer + servis **WHEN** `/peers/:p/services/:s/assets/app.js` **THEN** opak proxy yanıtı akar; allowlist dışı 403.
4. **AK-3.4 — GIVEN** süresi dolmuş `tunnel_session` cookie'si **WHEN** consumer token'sız erişim **THEN** 401 "Oturum suresi doldu" + `Set-Cookie Max-Age=0`; **GIVEN** geçerli consumer token **THEN** yol çalışır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | 404/503 redleri | unit | ⬜ |
| AK-3.2 | Oturum aç/reuse | unit | ⬜ |
| AK-3.3 | Opak HTTP/WS + allowlist | integration | ⬜ |
| AK-3.4 | Bayat oturum semantiği + cookie temizliği | unit | ✅ |

**T Görev Listesi:**
- [ ] T-6: `OpenServiceAccess` use-case + testler
- [ ] T-7: Erişim rotaları (HTTP/WS) + testler
- [x] T-8: Bayat oturum semantiği + oturum/akış ömrü env knob'ları + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| WS upgrade | opak köprü |
| Allowlist dışı | 403, stream yok |
| Bayat oturum cookie'si | 401 "Oturum suresi doldu" + `Set-Cookie Max-Age=0` (WS: 1008); consumer token varsa etkilenmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/application/open-service-access.ts` | YENİ |
| `hub-servis/src/infrastructure/inbound/routes/access-routes.ts` | YENİ |

### 6.4 UC-4 — RelayControl (consumer kanalı)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: consumer token doğrulama, `POST /control/:peerId`, `/ws/consumer` ile inbound opak iletim.
- hariç: domain mesaj şemaları (consumer'da; hub bilmez).

**Akış:**
1. Consumer, ayrı token ile bağlanır (peer token'ından farklı).
2. `POST /control/:peerId` → `IHubChannel.sendControl` ile opak iletilir.
3. Peer'dan gelen bilinmeyen kontrol mesajları `/ws/consumer` abonelerine opak akar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Consumer token'ı env'den doğrulanmalı; peer token'ı consumer kanalını açamamalı | AK-4.1 |
| FR-4.2 | `POST /control/:peerId` gövdeyi opak iletmeli; bilinmeyen peer 404, bağlı değil 503 | AK-4.2 |
| FR-4.3 | Peer'dan gelen bilinmeyen kontrol mesajları consumer kanalına opak akmalı (hub yorumlamaz) | AK-4.3 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** peer token'ı **WHEN** consumer kanalı açılır **THEN** reddedilir; consumer token'ı ile kabul.
2. **AK-4.2 — GIVEN** bağlı peer **WHEN** `POST /control/p1` **THEN** frame peer'a iletilir; bilinmeyen peer 404.
3. **AK-4.3 — GIVEN** peer `telemetry` frame'i gönderdi **WHEN** hub alır **THEN** consumer kanalına opak iletilir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Consumer token izolasyonu | unit | ⬜ |
| AK-4.2 | Kontrol gönderimi | unit | ⬜ |
| AK-4.3 | Inbound opak relay | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-8: `RelayControl` use-case + testler
- [ ] T-9: Consumer adapters (`POST /control`, `/ws/consumer`) + testler
- [ ] T-10: Consumer token doğrulama (env) + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Consumer bağlı değil | inbound mesaj düşer (kademeli) |
| Bilinmeyen peer | 404 |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/application/relay-control.ts` | YENİ |
| `hub-servis/src/infrastructure/inbound/consumer-channel.ts` | YENİ |
| `hub-servis/src/infrastructure/inbound/routes/control-routes.ts` | YENİ |

### 6.5 UC-5 — AuthenticatePeerToken (kimlik portu)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: `IPeerCredentialsStore` portu + env/token dosyası adapter'ı (P2) + sqlite adapter iskeleti.
- hariç: bootstrap üretimi/claim/revocation (İP-2 — aynı port genişlemesi).

**Akış:**
1. Token kaynağı env veya dosyadan okunur (hash).
2. Gelen token hash'lenir, sabit-zamanlı karşılaştırılır.
3. Eşleşme yoksa false (fail-closed).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Token doğrulaması port arkasında olmalı; düz metin token saklanmamalı/loglanmamalı | AK-5.1 |
| FR-5.2 | Port, İP-2 bootstrap/revocation'ı destekleyecek şekilde genişletilebilir olmalı (P2'de env adapter) | AK-5.2 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** geçerli token **WHEN** doğrulanır **THEN** true; geçersiz → false; log'da token yok.
2. **AK-5.2 — GIVEN** port arayüzü **WHEN** incelenir **THEN** kimlik kaynağı değiştirilebilir (env/sqlite), use-case değişmez.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Hash karşılaştırma, sır yok | unit | ⬜ |
| AK-5.2 | Port değiştirilebilirliği | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-11: `IPeerCredentialsStore` + `EnvPeerTokenStore` + `SqlitePeerCredentialStore` + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Token kaynağı tanımsız | açılışta fail-fast |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/domain/ports/peer-credentials-store.ts` | YENİ |
| `hub-servis/src/infrastructure/outbound/env-peer-token-store.ts` | YENİ |
| `hub-servis/src/infrastructure/outbound/sqlite-peer-credential-store.ts` | YENİ (iskelet) |

### 6.6 UC-6 — HealthCheck ve config

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: `/health`, config yükleme + fail-fast doğrulama.
- hariç: metrik/tracing.

**Akış:**
1. `main.ts` config'i yükler; eksik/geçersizse açılış reddedilir.
2. `/health` registry + credential store durumunu döner.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | `/health` servis durumunu (ok/degraded) dönmeli | AK-6.1 |
| FR-6.2 | Eksik/geçersiz config açılışta fail-fast reddedilmeli | AK-6.2 |

**Kabul Senaryoları (GWT):**
1. **AK-6.1 — GIVEN** servis ayakta **WHEN** `GET /health` **THEN** 200 + durum.
2. **AK-6.2 — GIVEN** eksik `PEER_TOKEN` **WHEN** başlatılır **THEN** açılış hata ile durur.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Health yanıtı | unit | ⬜ |
| AK-6.2 | Config fail-fast | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-12: `HubConfig` + fail-fast + `/health` + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| DB açılamıyor | health degraded |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/config/hub-config.ts` | YENİ |
| `hub-servis/src/application/health-check.ts` | YENİ |

### 6.7 Paket Geneli Görevler

- [ ] T-13: Composition root (`main.ts`) — tüm port/adapter wiring
- [ ] T-14: `hub-servis/package.json` + `tsconfig.json` (monorepo importu YOK)
- [ ] T-15: `Dockerfile` (oven/bun multi-stage) + `compose.example.yml` + `.dockerignore`
- [ ] T-16: `docker build` + compose uçtan uca (sahte peer: register → keşif → erişim → relay)
- [ ] T-17: `AGENTS-WS-TUNNEL.md` hub-servis sözleşmesi + README

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Register geçerli | registry + tracker; ack ok |
| Register geçersiz | ack rejected + kapatma (fail-closed) |
| Heartbeat | tracker `lastSeenAt`; stale→connected |
| Stale (config eşiği) | yeni erişim 503; mevcut stream korunur |
| Erişim bilinmeyen servis | 404 |
| Consumer token geçersiz | 401 |
| Config eksik/geçersiz | açılış fail-fast |
| DB hatası | health degraded |

Beklenen hata → yerel `Result`; beklenmeyen → `DomainError` (paket sözleşmesi).

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Hexagonal sınır korunur: domain/application'da framework importu YOK | grep + kod inceleme |
| SC-2 | Hub-servis imajı `docker build` ile üretilir; compose ile sahte peer register→keşif→erişim→relay çalışır | imaj + compose testi |
| SC-3 | Wire uyumu: v1/v2 peer frame'leri kabul edilir | integration |
| SC-4 | Use-case'ler port-mock ile birim testli; adapter'lar ayrı testli | coverage ≥%70 (hexagonal çekirdek) |
| SC-5 | Paket bağımsızlığı: hub-servis monorepo importu YOK | grep |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✅ Approved 2026-10-16) |
| 2. JSDoc | T-1..T-3 sözleşmeleri (portlar + use-case'ler) |
| 3. TEST | T-1..T-12 kırmızı testler (önce use-case, port-mock) |
| 4. IMPL | Adapter'lar + composition root + Dockerfile |
| 5. KAPANIŞ | `WS-TUNNEL-HUB-SERVIS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | İP-2 bootstrap/revocation (sqlite port genişlemesi) | İP-2'de |
| A2 | Kalıcı hub audit adapter'ı | İhtiyaç belirirse |
| A3 | Host-based erişim (A4) | Tetikte |
| A4 | Metrik/tracing (Prometheus/OTel) | İleri iş |
| A5 | Consumer kanalında çoklu consumer / fan-out | Tek consumer yeterli (YAGNI) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **İP-2** bootstrap + kalıcı kimlik + revocation (`WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md`, hub-servis portuna taşınır).
2. **A4** host-based erişim.
3. **P3** monorepo web-service'in hub-servis consumer'ına dönüştürülmesi.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | `PeerConnectionTracker` (domain, IClock) | UC-1 | `hub-servis/src/domain/peer-connection-tracker.ts` |
| T-2 | `RegisterPeer` use-case | UC-1 | `hub-servis/src/application/register-peer.ts` |
| T-3 | `PeerChannelHub` WS inbound adapter | UC-1 | `hub-servis/src/infrastructure/inbound/peer-channel-hub.ts` |
| T-4 | `DiscoverPeers` use-case | UC-2 | `hub-servis/src/application/discover-peers.ts` |
| T-5 | Keşif rotaları | UC-2 | `hub-servis/src/infrastructure/inbound/routes/discovery-routes.ts` |
| T-6 | `OpenServiceAccess` use-case | UC-3 | `hub-servis/src/application/open-service-access.ts` |
| T-7 | Erişim rotaları (HTTP/WS) | UC-3 | `hub-servis/src/infrastructure/inbound/routes/access-routes.ts` |
| T-8 | `RelayControl` use-case | UC-4 | `hub-servis/src/application/relay-control.ts` |
| T-9 | Consumer adapters (`POST /control`, `/ws/consumer`) | UC-4 | `hub-servis/src/infrastructure/inbound/consumer-channel.ts`, `routes/control-routes.ts` |
| T-10 | Consumer token doğrulama | UC-4 | `hub-servis/src/infrastructure/inbound/routes/control-routes.ts` |
| T-11 | Kimlik portu + env/sqlite adapter'ları | UC-5 | `hub-servis/src/domain/ports/peer-credentials-store.ts`, `infrastructure/outbound/*` |
| T-12 | Config fail-fast + `/health` | UC-6 | `hub-servis/src/config/hub-config.ts`, `application/health-check.ts` |
| T-13 | Composition root | Genel | `hub-servis/src/main.ts` |
| T-14 | `package.json` + `tsconfig.json` | Genel | `hub-servis/package.json`, `hub-servis/tsconfig.json` |
| T-15 | Dockerfile + compose örneği | Genel | `hub-servis/Dockerfile`, `hub-servis/compose.example.yml` |
| T-16 | Docker build + compose uçtan uca | Genel | `hub-servis/` (gözle/CI) |
| T-17 | Sözleşme + README | Genel | `AGENTS-WS-TUNNEL.md`, `hub-servis/README.md` |

**review_date:** 2026-10-16 — 🟢 doğrulanmış (KAPANIŞ: WS-TUNNEL-HUB-SERVIS-KAPANIS.md).
