---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, bootstrap, kimlik, hub-servis, sqlite]
review_date: 2026-10-19
---

# ws-tunnel Bootstrap ve Peer Kimliği — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md) (✅ Approved 2026-10-16 — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ws-tunnel-hub/src/domain/ports/peer-bootstrap-repository.ts#IPeerBootstrapRepository` | YENİ — `createBootstrap`/`claim`/`revoke` portu | K1/K5/K6, T-1 |
| 2 | `packages/ws-tunnel-hub/src/domain/ports/peer-disconnector.ts#IPeerDisconnector` | YENİ — `disconnect(peerId)` portu | K5, T-7 |
| 3 | `packages/ws-tunnel-hub/src/domain/ports/sql-database.ts#SqlDatabase` | YENİ — `run`/`all`/`close` minimal port | K6, T-1 |
| 4 | `packages/ws-tunnel-hub/src/domain/secrets.ts#generateSecret` | YENİ — kriptografik rastgele token (base64url) | K3, T-6 |
| 5 | `packages/ws-tunnel-hub/src/domain/secrets.ts#hashSecret` | YENİ — SHA-256 hex özet | K3, T-6 |
| 6 | `packages/ws-tunnel-hub/src/application/create-bootstrap.ts#CreateBootstrap` | YENİ — admin peer + tek kullanımlık bootstrap üretimi | UC-1, T-2 |
| 7 | `packages/ws-tunnel-hub/src/application/claim-bootstrap.ts#ClaimBootstrap` | YENİ — bootstrap → kalıcı `peerSecret` takası (fail-closed) | UC-2, T-4/T-6 |
| 8 | `packages/ws-tunnel-hub/src/application/revoke-peer.ts#RevokePeer` | YENİ — kimlik iptali + aktif WS düşürme | UC-3, T-8 |
| 9 | `packages/ws-tunnel-hub/src/infrastructure/outbound/sqlite-peer-credential-store.ts#SqlitePeerCredentialStore` | DEĞİŞTİ — `SqlDatabase` enjeksiyonu + `peer_bootstrap` tablosu + `claim`/`revoke`/`createBootstrap` | K3/K6, T-1, UC-2/UC-3 |
| 10 | `packages/ws-tunnel-hub/src/infrastructure/outbound/bun-sqlite-database.ts#BunSqliteDatabase` | YENİ — üretim `bun:sqlite` adapter | K6, T-1 |
| 11 | `packages/ws-tunnel-hub/src/__test-helpers__/node-sqlite-database.ts#NodeSqliteDatabase` | YENİ — vitest/Node `node:sqlite` adapter (test) | K6, S-1 |
| 12 | `packages/ws-tunnel-hub/src/infrastructure/inbound/peer-channel-hub.ts#PeerChannelHub` | DEĞİŞTİ — `implements IPeerDisconnector` + `disconnect(peerId)` | K5, T-7 |
| 13 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/admin-routes.ts#adminRoutes` | YENİ — `POST /admin/peers` + `DELETE /admin/peers/:peerId` (consumer token) | UC-1/UC-3, T-3/T-9 |
| 14 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/bootstrap-routes.ts#bootstrapRoutes` | YENİ — `POST /peers/bootstrap/claim` | UC-2, T-5 |
| 15 | `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/http-helpers.ts#bearerToken` | YENİ — ortak yardımcılar (bearer/auth/jsonBody/statusForKind) | S-5, T-3/T-5/T-9 |
| 16 | `packages/ws-tunnel-hub/src/infrastructure/inbound/fastify-server.ts#buildHubServer` | DEĞİŞTİ — opsiyonel `bootstrap` rotaları (yalnız sqlite modu) | K4, UC-1/UC-2/UC-3 |
| 17 | `packages/ws-tunnel-hub/src/config/hub-config.ts#loadHubConfig` | DEĞİŞTİ — `authMode` env/sqlite + fail-fast (`HUB_DB_PATH`) | K4, UC-4, T-10 |
| 18 | `packages/ws-tunnel-hub/src/main.ts#createHub` | DEĞİŞTİ — `HubCompositionOptions.createDatabase`, sqlite/env wiring, dinamik `bun:sqlite` import | K4/K6, T-10, S-2/S-4 |
| 19 | `packages/ws-tunnel-hub/src/integration.test.ts` | DEĞİŞTİ — `authMode: env` açık wiring | K4, AK-4.1 |
| 20 | `packages/ws-tunnel-hub/src/bootstrap.integration.test.ts` | YENİ — bootstrap→claim→register→revoke e2e | UC-4, T-11, AK-4.2 |
| 21 | `AGENTS-WS-TUNNEL.md` | DEĞİŞTİ — bootstrap sözleşmesi | T-12 |
| 22 | `packages/ws-tunnel-hub/README.md` | DEĞİŞTİ — uç/env tablosu | T-12 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| hub-servis (unit/component/integration) | `npx vitest run --root packages/ws-tunnel-hub` | 13 dosya, 42 test yeşil |
| hub-servis tip kontrolü | `npx tsc --noEmit -p packages/ws-tunnel-hub/tsconfig.json` | yeşil |
| ws-tunnel paket regresyonu | `npx vitest run --root packages/ws-tunnel` | 14 dosya, 233 test yeşil |
| container image | `docker build -f packages/ws-tunnel-hub/Dockerfile -t ws-tunnel-hub:local .` | başarılı |
| container smoke (sqlite, gerçek akış) | `POST /admin/peers` → `POST /peers/bootstrap/claim` → TunnelConnector register → `DELETE /admin/peers/:peerId` | başarılı |
| SPEC lint | `bun tools/spec-check.mjs docs/architecture/WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md` | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Admin üretim + hash (düz metin tek kez yanıtta) | `create-bootstrap.test.ts` "AK-1.1" + `create-bootstrap.ts#CreateBootstrap` | 🟢 |
| AK-1.2 | TTL 24h + tek kullanım | `create-bootstrap.test.ts` "AK-1.2" | 🟢 |
| AK-1.3 | Yeni bootstrap eski token'ı geçersiz kılar | `sqlite-peer-credential-store.test.ts` "AK-1.3" | 🟢 |
| AK-2.1 | Hash+TTL+tek kullanım doğrulaması (fail-closed) | `claim-bootstrap.test.ts` "AK-2.1/AK-2.2" + `sqlite-peer-credential-store.test.ts` | 🟢 |
| AK-2.2 | Kalıcı `peerSecret` (hash DB, düz metin yanıt) | `claim-bootstrap.test.ts` "AK-2.1/AK-2.2" + `sqlite-peer-credential-store.test.ts` "AK-2.2" | 🟢 |
| AK-2.3 | Tekrar claim reddi (kullanılmış/süreli) | `claim-bootstrap.test.ts` "AK-2.3" + `sqlite-peer-credential-store.test.ts` "AK-2.3" | 🟢 |
| AK-2.4 | WS auth sürekliliği (`peerSecret` → `/ws/peer`) | `sqlite-peer-credential-store.test.ts` "AK-2.2" + `bootstrap.integration.test.ts` | 🟢 |
| AK-3.1 | Kimlik iptali (authenticate false) | `revoke-peer.test.ts` "AK-3.1/AK-3.2" + `sqlite-peer-credential-store.test.ts` "AK-3.1" | 🟢 |
| AK-3.2 | Aktif WS düşürme (`IPeerDisconnector`) | `revoke-peer.test.ts` "AK-3.1/AK-3.2" + `peer-channel-hub.test.ts` | 🟢 |
| AK-3.3 | Re-enrollment yalnız yeni bootstrap | `sqlite-peer-credential-store.test.ts` "AK-3.1" + container smoke (revoke → peers boş + connector disconnected) | 🟢 |
| AK-4.1 | Auth modu fail-fast (ikisi de yoksa açılış reddi) | `integration.test.ts` (env modu) + `hub-config.ts#loadHubConfig` | 🟢 |
| AK-4.2 | E2E bootstrap akışı (bootstrap→claim→register→revoke) | `bootstrap.integration.test.ts` "AK-4.2" + container smoke | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S-1 | `SqlDatabase` portu runtime'e özgü adapter'lar ile | Üretim `bun:sqlite` (`BunSqliteDatabase`), vitest/Node `node:sqlite` (`NodeSqliteDatabase`). Adapter runtime bilmez; vitest Node'da `bun:sqlite` çözülemediği için zorunlu. |
| S-2 | `createHub(config, { logger?, createDatabase? })` + dinamik import | CLI `bun:sqlite` adapter'ını dinamik import eder; testler Node'da `bun:` builtin yüklemesin. |
| S-3 | Admin uçları consumer token ile korunur | SPEC'te ayrı admin kimliği tanımlı değil; mevcut `CONSUMER_TOKEN` yetki sınırı olarak kullanılır. |
| S-4 | `SqlitePeerCredentialStore.close()` kaldırıldı | DB yaşam döngüsü composition root'ta (`database.close()` — `main.ts#createHub` stop). |
| S-5 | `http-helpers.ts` ortak yardımcı | `bearerToken`/`authorizedConsumer`/`jsonBody`/`statusForKind`; access/control/admin/bootstrap rotaları paylaşır. |

### A.5 Gözle Kontrol Maddeleri

- [x] `domain`/`application` katmanında sqlite/env/Fastify importu YOK (purity — SC-3, grep ile doğrulandı).
- [x] Sırlar düz metin saklanmaz: `createBootstrap`/`claim` yalnız `hashSecret` sonucunu yazar; düz metin yalnız yanıt nesnesinde.
- [x] Bootstrap fail-closed: `claim` atomik `UPDATE ... used=0 AND expires_at > now` ile tüketilir; 0 değişiklikte false döner.
- [x] Auth modu fail-fast: `loadHubConfig` sqlite modunda `HUB_DB_PATH` eksikse hata; `createHub` `createDatabase` yoksa hata.
- [x] `@gd-monorepo/ws-tunnel` paketi DEĞİŞMEDİ (SC-4 — wire v1/v2 birebir; paket regresyonu 233 test yeşil).
- [x] `peerSecret` yalnız claim yanıtında bir kez döner; log'lanmaz.

### A.6 Genel Durum Özeti

Bootstrap ve peer kimliği (İP-2) hub-servis hexagonal çekirdeğine K1–K7 kararları doğrultusunda uygulandı. `IPeerBootstrapRepository` + `IPeerDisconnector` + `SqlDatabase` portları, `CreateBootstrap`/`ClaimBootstrap`/`RevokePeer` use-case'leri, sqlite outbound adapter'ı (bootstrap tablosu + claim/revoke), admin/bootstrap inbound rotaları ve env/sqlite auth-modu wiring'i tamamlandı. T-1..T-12 görevleri kapatıldı; 13 dosya 42 test (hub-servis) ve 14 dosya 233 test (paket regresyonu) yeşil, tip kontrolü ve docker build temiz, container smoke sqlite modunda uçtan uca akışı doğruladı. Tüm AK'ler (1.1–4.2) 🟢; 5 sapma (S-1..S-5) ve 4 kapsanmayan boşluk (G1–G4) kaydedildi. **review_date:** 2026-10-19.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Bootstrap üretimi | admin consumer token + geçerli peerId | 201 + düz metin token; DB'de yalnız hash | `create-bootstrap.test.ts` + `admin-routes.ts#adminRoutes` |
| Bootstrap üretimi | boş peerId | 400 (validation) | `create-bootstrap.test.ts` "boş peerId" |
| Bootstrap üretimi | consumer token yok/geçersiz | 401 | `http-helpers.ts#authorizedConsumer` |
| Claim (geçerli) | geçerli + kullanılmamış + süresiz bootstrap | `peerSecret` döner; token used=true; secret hash DB | `claim-bootstrap.test.ts` + `sqlite-peer-credential-store.test.ts` |
| Claim (kullanılmış) | token ikinci kez claim | false → reddedilir | `claim-bootstrap.test.ts` "AK-2.3" + `sqlite-peer-credential-store.test.ts` "AK-2.3" |
| Claim (süre aşımı) | `expires_at <= now` | reddedilir (fail-closed) | `sqlite-peer-credential-store.test.ts` "süresi geçmiş" |
| Claim (bilinmeyen peerId) | eşleşen bootstrap yok | false → reddedilir | `sqlite-peer-credential-store.test.ts` |
| WS register (secret) | `peerSecret` ile `/ws/peer` Bearer | sqlite `authenticate` kabul eder | `sqlite-peer-credential-store.test.ts` "AK-2.2" + `bootstrap.integration.test.ts` |
| Revocation | revoke + peer bağlı | `authenticate` false + WS kapanır | `revoke-peer.test.ts` + `peer-channel-hub.ts#disconnect` |
| Revocation | peer bağlı değil | yalnız kimlik iptali (idempotent) | `revoke-peer.test.ts` (no-op disconnect) |
| Re-enrollment | eski secret ile bağlanma | reddedilir; yeni bootstrap gerekir | container smoke + `sqlite-peer-credential-store.test.ts` "AK-3.1" |
| Dev mod (`PEER_TOKEN`) | env token tanımlı | `EnvPeerTokenStore`; bootstrap uçları pasif | `integration.test.ts` (env modu) |
| Fail-fast | ne `PEER_TOKEN` ne sqlite yolu | açılış hata ile durur | `hub-config.ts#loadHubConfig` + `main.ts#createHub` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Eski secret ile revoke sonrası YENİ bağlantı reddi doğrudan test edilmedi (dolaylı: revoke → peers boş + connector disconnected; sqlite `authenticate` revoked=0 testi var) | orta | E2E'ye revoke sonrası eski secret ile ikinci register denemesi ekle |
| G2 | Süresi geçmiş bootstrap E2E testi yok (sqlite unit testte var) | düşük | E2E'de deterministik `now` ile süreli token claim reddi |
| G3 | mTLS/client-cert, secret rotasyonu, kalıcı audit (A1/A2/A4) | düşük | SPEC §10 açık kararları kapanınca |
| G4 | Aynı peer'a çoklu cihaz/secret (A5) | düşük | İhtiyaç belirince (tek secret YAGNI) |

**review_date:** 2026-10-19
