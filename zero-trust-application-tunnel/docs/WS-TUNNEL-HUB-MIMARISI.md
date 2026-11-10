---
status: active
space: architecture
tags: [mimari, ws-tunnel, hub, zero-trust, spec]
review_date: 2026-11-10
---

# WS Tunnel — Hub — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `WS-TUNNEL-CEKIRDEK-MIMARISI.md`, `WS-TUNNEL-AGENT-MIMARISI.md`, `AUTH-MIMARISI.md` (bootstrap kimlik).

## 1. Amaç ve Bağlam

Hub-servis (hexagonal): peer kaydı/keşfi, oturum kapısı, HTTP/WS proxy, opak servis erişimi, consumer relay, bootstrap kimlik ve dağıtım. Domain/application katmanı framework import ETMEZ; monorepo importu yoktur (yalnız `@gd-monorepo/ws-tunnel` yüzeyi — taşınmış haliyle `ws-tunnel` paketi).

| Katman | Kapsam |
|:-------|:-------|
| dahil | Oturum kapısı (fail-closed audit), proxy (kredi/deadlock), registry, opak erişim, consumer relay, bootstrap kimlik, config/TLS |
| hariç | Wire/codec (ÇEKIRDEK), agent kurulumu (AGENT), web-service tüketicisi |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **Audit fail-closed**: `IAuditSink.open` yazılamazsa oturum AÇILMAZ (`FatalError`) | Denetim izi garantili |
| K2 | Peer başına 1 oturum; limit doluysa mevcut oturum `"replaced"` ile kapatılır | Çift tıklama/çökme takılması yok |
| K3 | Ack timeout / peer bağlı değil → `TransientError` | Geçici hata ayrımı |
| K4 | TTL 4 sa / idle 15 dk sweep → `session-end` + audit close | Orphan temizliği |
| K5 | **Erişim ≠ keşif**: doğrulama sırası servis duyurusu (404) → peer bağlı (503) → allowlist (403) → oturum | Yetki sırası net |
| K6 | Kök-montaj (A2): hostMap doluysa `/*` catch-all, allowlist atlanır AMA blocklist kazanır; Host çözümlemesi tek `resolveAccessContext` sözleşmesi | Mount = yetki sınırı |
| K7 | Bayat `tunnel_session` cookie + consumer token yok → 401 + `Set-Cookie Max-Age=0`; WS'te 1008 | Dürüst hata |
| K8 | Header iletimi denylist: hop-by-hop + `x-tunnel-*` düşer; `authorization` YALNIZ cookie-oturum yolunda iletilir | Token sızıntısı yok |
| K9 | Consumer kanal izolasyonu: consumer token ≠ peer token; peer'lar consumer kanalı açamaz | Kanal ayrımı |
| K10 | Bootstrap: tek kullanımlık + 24h TTL; token/secret yalnız HASH; auth modu `PEER_TOKEN` env (dev) yoksa sqlite+bootstrap (prod); ikisi de yoksa açılış fail-fast | Enrollment güvenli |
| K11 | Revocation sırası: ÖNCE kimlik, SONRA soket (re-enrollment yalnız yeni bootstrap) | Erişim kesin |
| K12 | Config fail-fast: `HUB_HOST_MAP` (`host[:port]=peerId/serviceId`), TLS BYO/self-signed; eksik/geçersiz → açılış reddi | Yanlış yapılandırma yok |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | İki ayrı `isConnected` kaynağı (`PeerChannelHub` soket haritası ↔ `PeerConnectionTracker` durumu) | `zero-trust-application-tunnel/ws-tunnel-hub/src/` |
| B2 | `HubSessionStore` kendi test dosyası yok (gateway üzerinden dolaylı) | aynı dizin |
| B3 | Guest oturum çelişkisi (AUTH B1) | `session-gateway.ts#mapSessionRole` |

## 4. Mimari

```text
/ws/peer ──► PeerChannelHub ──► RegisterPeer / DisconnectPeer ──► HubPeerRegistry
                 │
                 └──► SessionGateway (fail-closed audit) ──► HubSessionStore
/containers|/fields ──► TunnelProxy (HTTP/WS köprü, kredi) ──► access-routes
/ws/consumer ──► ConsumerChannel (opak relay)
/admin,/bootstrap ──► CreateBootstrap/ClaimBootstrap/RevokePeer ──► sqlite store
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `zero-trust-application-tunnel/ws-tunnel/src/proxy/session-gateway.ts#SessionGateway` | Oturum kapısı |
| `zero-trust-application-tunnel/ws-tunnel/src/proxy/tunnel-proxy.ts#TunnelProxy` | Proxy |
| `zero-trust-application-tunnel/ws-tunnel/src/hub/registry.ts#HubPeerRegistry` | Registry |
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/register-peer.ts#RegisterPeer` | Kayıt |
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/open-service-access.ts#OpenServiceAccess` | Erişim |
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/relay-control.ts#RelayControl` | Relay |
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/claim-bootstrap.ts#ClaimBootstrap` | Kimlik |
| `zero-trust-application-tunnel/ws-tunnel-hub/src/config/hub-config.ts#loadHubConfig` | Config |

## 5. Purity Kuralları (ZORUNLU)

1. `domain/`+`application/` Fastify/ws/sqlite/env import ETMEZ.
2. Monorepo importu yok; yalnız tunnel yüzeyi (K13-çekirdek).
3. Audit fail-closed (K1).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Oturum Kapısı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: openSession/closeSession, audit fail-closed, "replaced", TTL/idle
- hariç: proxy (UC-2)

**Akış:**
1. Oturum isteği gelir; audit açılır (fail-closed).
2. Peer oturumu oluşturulur; limit doluysa eskisi `replaced` ile kapatılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Audit yazılamazsa oturum açılmaz | AK-1.1 |
| FR-1.2 | Aynı peer'a yeni oturum eskisini `replaced` ile kapatır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** audit sink hatası **WHEN** openSession **THEN** `FatalError`
2. **AK-1.2 — GIVEN** açık oturum **WHEN** yeni oturum **THEN** eski `replaced` ile kapanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Fail-closed | unit (`session-gateway.test.ts`) | ⬜ |
| AK-1.2 | Replaced | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Ack timeout | TransientError |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/proxy/session-gateway.ts` | Kapı |

### 6.2 UC-2 — Proxy (HTTP/WS Köprü)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: stream-open→gövde→ack sırası, yarım-pencere kredi, WS köprüsü, limitler
- hariç: erişim yetkilendirme (UC-4)

**Akış:**
1. `stream-open` gönderilir.
2. Gövde frame'leri ack'ten ÖNCE gider.
3. Kredi yarım pencerede yenilenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Kredi yarım-pencere eşiğinde yenilenir (deadlock yok) | AK-2.1 |
| FR-2.2 | 101 olmayan WS upgrade tarayıcıya 1013 döner | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** büyük gövde **WHEN** kredi yarıya iner **THEN** yenilenir, akış durmaz
2. **AK-2.2 — GIVEN** upstream 400 **WHEN** WS upgrade **THEN** 1013

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Deadlock | unit (`tunnel-proxy.test.ts`) | ⬜ |
| AK-2.2 | 1013 | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Ack timeout | 10 sn → RST |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/proxy/tunnel-proxy.ts` | Proxy |

### 6.3 UC-3 — Peer Kayıt/Keşif

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: register, duyuru doğrulama, replaced soket, keşif görünümü
- hariç: erişim (UC-4)

**Akış:**
1. İlk frame register; geçersizse `rejected` + kapatma.
2. Aynı peer yeniden register → eski soket `replaced`.
3. Keşif görünümü üretilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Geçersiz/opak ihlalli register reddedilir | AK-3.1 |
| FR-3.2 | Keşif görünümü yalnız kimlik+kozmetik meta taşır | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** hedef alanlı duyuru **WHEN** register **THEN** rejected
2. **AK-3.2 — GIVEN** keşif isteği **WHEN** görünüm **THEN** hedef adres yok

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Red | unit (`register-peer.test.ts`) | ⬜ |
| AK-3.2 | Keşif | unit (`discovery-view`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Heartbeat | Adapter'da yutulur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/register-peer.ts` | Kayıt |

### 6.4 UC-4 — Opak Erişim Yetkilendirme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: doğrulama sırası, allowlist/blocklist, hostMap root-mount, header/cookie kuralları
- hariç: proxy akışı (UC-2)

**Akış:**
1. Servis duyurusu kontrol edilir (404).
2. Peer bağlı mı (503).
3. Allowlist (403) → oturum açılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Doğrulama sırası K5 ile birebir | AK-4.1 |
| FR-4.2 | `authorization` yalnız cookie-oturum yolunda iletilir | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** duyurulmamış servis **WHEN** erişim **THEN** 404
2. **AK-4.2 — GIVEN** consumer-token yolu **WHEN** header iletilir **THEN** authorization düşer

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Sıra | unit (`open-service-access.test.ts`) | ⬜ |
| AK-4.2 | Header | unit (`access-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Root-mount | Blocklist kazanır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/open-service-access.ts` | Erişim |

### 6.5 UC-5 — Consumer Relay

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kanal izolasyonu, opak zarf, 404/503
- hariç: iş semantiği

**Akış:**
1. Consumer token'ı doğrulanır.
2. Mesaj `{peerId, message}` zarfıyla opak akar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Peer'lar consumer kanalı açamaz | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** peer token'ı **WHEN** consumer kanalı denenir **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | İzolasyon | unit (`relay-control.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen peer | 404 |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/relay-control.ts` | Relay |

### 6.6 UC-6 — Bootstrap Kimlik

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: create/claim/revoke, tek kullanım + TTL, hash, auth modu fail-fast
- hariç: agent tarafı (AGENT)

**Akış:**
1. Admin bootstrap üretir (düz metin yalnız yanıtta bir kez).
2. Claim atomik (used=1 + secret UPSERT).
3. Revoke önce kimliği keser.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Bootstrap tek kullanımlıktır, 24h sonra geçersiz | AK-6.1 |
| FR-6.2 | Token/secret yalnız hash saklanır | AK-6.2 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** kullanılmış bootstrap **WHEN** claim **THEN** reddedilir
2. **AK-6.2 — GIVEN** kayıt **WHEN** DB incelenir **THEN** düz metin yok

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Tek kullanım | unit (`claim-bootstrap.test.ts`) | ⬜ |
| AK-6.2 | Hash | unit (`sqlite-peer-credential-store.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-6: UC-6 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Auth modu yok | Açılış fail-fast |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-hub/src/application/{create,claim}-bootstrap.ts` | Kimlik |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Audit hatası | Oturum yok |
| Peer yok | 503 |
| Allowlist | 403 |
| Bootstrap | Tek kullanım |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Oturum/erişim testli (90+ test) | komut |
| SC-2 | Audit fail-closed kanıtlı | komut |
| SC-3 | Düz metin sır yok | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 16 test dosyası / 71 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-6 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `WS-TUNNEL-HUB-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | İki `isConnected` kaynağının tekilleştirilmesi (B1) | İleri İş |
| A2 | `HubSessionStore` test borcu (B2) | İleri İş |
| A3 | Guest oturum kararı (B3 — AUTH A1) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `isConnected` tekilleştirme (A1).
2. Session store testi (A2).
3. Çok-port/TLS canlı doğrulaması.

## 12. T Görev Özeti

| T-1 | UC-1 (oturum) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (proxy) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (kayıt/keşif) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (erişim) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (relay) kanıt testinin eşleştirilmesi |
| T-6 | UC-6 (bootstrap) kanıt testlerinin eşleştirilmesi |
