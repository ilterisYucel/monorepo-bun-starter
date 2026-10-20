---
status: active
space: architecture
tags: [mimari, ws-tunnel, bootstrap, kimlik, hub-servis, hexagonal, sqlite, spec]
review_date: 2026-10-16
---

# ws-tunnel Bootstrap ve Peer Kimliği — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 DOĞRULANMIŞ (2026-10-16) — KAPANIŞ tamam.
> **KAPANIŞ:** [WS-TUNNEL-BOOTSTRAP-KIMLIK-KAPANIS.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-KAPANIS.md)
> **İlişkili:** [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](./WS-TUNNEL-HUB-SERVIS-MIMARISI.md), [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md), [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md), [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md)

## 1. Amaç ve Bağlam

Bugün peer kimliği **env'de tek paylaşılan token** ile yönetiliyor (`EnvPeerTokenStore`, P2). Bu, demo/tek-peer için yeterli; ancak çoklu peer, tek-kullanımlık bootstrap, kalıcı kimlik ve iptal (revocation) yoktur. Kimlik otoritesi **hub-servis** olacaktır:

1. Hub, yeni peer için **tek kullanımlık, TTL'li bootstrap token** üretir.
2. Peer, bu token'ı **HTTP üzerinden** kalıcı kimliğiyle (`peerSecret`) takas eder.
3. Sonraki WS bağlantıları mevcut Bearer-token yoluyla kurulur — **WS/tünel protokolü değişmez**.
4. Admin, peer'ı iptal eder → kimlik geçersiz + aktif bağlantı düşer.

**Konum:** Hub-servis (P2) hexagonal çekirdeği. Kimlik akışları **use-case + port**; sqlite yalnız **outbound adapter**. `@gd-monorepo/ws-tunnel` paketi **değişmez** (wire aynı).

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Hub-üretimli bootstrap token (üretim/claim/iptal) | ✅ dahil |
| Kalıcı `peerSecret` (sqlite hash) + WS auth sürekliliği | ✅ dahil |
| Revocation + aktif bağlantı düşürme + re-enrollment | ✅ dahil |
| Dev/prod auth modu (env vs sqlite) | ✅ dahil |
| Paket (`@gd-monorepo/ws-tunnel`) değişikliği | ❌ hariç — sıfır değişiklik |
| mTLS / client-cert / public-key pinning | ❌ hariç (§10 A1) |
| Tarayıcı kullanıcı login'i / cookie front-door | ❌ hariç — P3 |
| Monorepo web-service entegrasyonu | ❌ hariç — P3 |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Bootstrap token **hub-üretimli**, tek kullanımlık, 24 saat TTL | Yalnız hub üretir; peer kendi kimliğini ilan etmez |
| K2 | Takas **HTTP üzerinden** (hub-servis inbound) | WS/tünel protokolü DEĞİŞMEZ; paket sıfır değişiklik |
| K3 | Kalıcı kimlik = hub-üretimli rastgele `peerSecret`; **sqlite'ta hash** | Düz metin saklanmaz; mevcut Bearer-token yolu aynı |
| K4 | **Auth modu:** `PEER_TOKEN` env = dev/simple; sqlite + bootstrap = prod | `HUB_AUTH_MODE=headless` yerine env varlığına göre seçim; fail-fast |
| K5 | Revocation = kimliği iptal + **aktif WS kapat** | Re-enrollment yalnız yeni bootstrap ile |
| K6 | **Hexagonal:** bootstrap/claim/revoke use-case; sqlite yalnız adapter | Domain/application sqlite/env import ETMEZ |
| K7 | Wire v1/v2 birebir | Tagli peer'lar aynı frame'lerle çalışmaya devam eder |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Peer auth tek env token'ı; çoklu peer/tek-kullanım/TTL yok | `hub-servis/src/infrastructure/outbound/env-peer-token-store.ts#EnvPeerTokenStore` |
| B2 | Sqlite adapter yalnız `authenticate` iskeleti; bootstrap/claim/revoke yok | `hub-servis/src/infrastructure/outbound/sqlite-peer-credential-store.ts#SqlitePeerCredentialStore` |
| B3 | Hub'da bootstrap üretim/claim uçları yok | `hub-servis/src/infrastructure/inbound/fastify-server.ts#buildHubServer` |
| B4 | Revocation'da aktif bağlantı düşürme yok | `hub-servis/src/infrastructure/inbound/peer-channel-hub.ts#PeerChannelHub` |
| B5 | Legacy `FieldRegistry` token modeli web-service'te (P3'te emekli) | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` |

## 4. Mimari

### 4.1 Bootstrap akışı (hub-servis)

```
1) Admin:  POST /admin/peers            { peerId }
              → { peerId, bootstrapToken, expiresAt }        (DB: bootstrap hash, TTL 24h, used=false)
2) Teslim: BOOTSTRAP_TOKEN=<token> env/QR/config ile peer'a
3) Peer:   POST /peers/bootstrap/claim  { peerId, bootstrapToken }
              → { peerSecret }                                (token used=true; DB: secret hash)
4) Peer:   WS /ws/peer  Authorization: Bearer <peerSecret>    ← MEVCUT yol, protokol aynı
5) Admin:  DELETE /admin/peers/:peerId
              → kimlik revoked + aktif WS kapatılır
```

### 4.2 Hexagonal yerleşim

```
application/  CreateBootstrap · ClaimBootstrap · RevokePeer
domain/ports/ IPeerBootstrapRepository · IPeerDisconnector
infrastructure/outbound/ SqlitePeerCredentialRepository (bootstrap + secret + revoke)
infrastructure/inbound/  admin-routes (POST/DELETE) · bootstrap-routes (claim)
config/       auth modu seçimi (env vs sqlite) — fail-fast
```

- `domain`/`application` sqlite/env/HTTP bilmez.
- Bootstrap token ve `peerSecret` yalnız **hash** olarak saklanır; düz metin yalnız yanıtta bir kez.

## 5. Purity Kuralları

1. `hub-servis/src/{domain,application}` altında sqlite/env/Fastify importu YASAK.
2. Sırlar düz metin saklanmaz/loglanmaz; `sha256` hash + sabit-zamanlı karşılaştırma.
3. Bootstrap tek kullanım + TTL + fail-closed; süresi geçmiş/kullanılmış token reddedilir.
4. Auth modu seçimi fail-fast; ne `PEER_TOKEN` ne sqlite hazırsa açılış reddedilir.
5. WS/tünel wire şekilleri değişmez; revocation yalnız kimliği ve bağlantıyı düşürür.
6. `peerSecret` yalnız sahibine (claim yanıtı) bir kez döner; loglanmaz.

## 6. Use Case'ler

### 6.1 UC-1 — CreateBootstrap (admin)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: admin (consumer token) peer oluşturma + tek kullanımlık bootstrap üretimi.
- hariç: claim (UC-2); revocation (UC-3).

**Akış:**
1. Admin `POST /admin/peers {peerId}` çağırır (consumer token).
2. Use-case rastgele token üretir; hash + TTL(24h) + used=false saklanır.
3. Düz metin token yalnız yanıtta döner.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Bootstrap yalnız admin (consumer token) ile üretilmeli; düz metin tek kez yanıtta, DB'de hash | AK-1.1 |
| FR-1.2 | Token tek kullanımlık + 24 saat TTL olmalı | AK-1.2 |
| FR-1.3 | Aynı peer için yeni bootstrap, önceki kullanılmamış token'ı geçersiz kılmalı | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** admin consumer token **WHEN** `POST /admin/peers` **THEN** düz metin token döner, DB'de yalnız hash.
2. **AK-1.2 — GIVEN** yeni token **WHEN** kayıt incelenir **THEN** `expires_at=+24h`, `used=false`.
3. **AK-1.3 — GIVEN** kullanılmamış eski token **WHEN** yeni bootstrap üretilir **THEN** eski token claim edilemez.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Admin üretim + hash | unit | ⬜ |
| AK-1.2 | TTL + tek kullanım | unit | ⬜ |
| AK-1.3 | Yeni token eskiyi geçersiz kılar | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `IPeerBootstrapRepository` portu + sqlite adapter (bootstrap tablosu)
- [ ] T-2: `CreateBootstrap` use-case + testler
- [ ] T-3: `POST /admin/peers` rotası (consumer token) + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Yetkisiz çağrı | 401 |
| Boş peerId | 400 |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/domain/ports/peer-bootstrap-repository.ts` | YENİ — port |
| `hub-servis/src/application/create-bootstrap.ts` | YENİ — use-case |
| `hub-servis/src/infrastructure/inbound/routes/admin-routes.ts` | YENİ — admin rotaları |

### 6.2 UC-2 — ClaimBootstrap (peer)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: token doğrulama, kalıcı `peerSecret` üretimi, tek kullanım işaretleme, WS auth sürekliliği.
- hariç: üretim (UC-1); revocation (UC-3).

**Akış:**
1. Peer `POST /peers/bootstrap/claim {peerId, bootstrapToken}` çağırır.
2. Use-case bootstrap'ı hash + TTL + used ile doğrular.
3. Geçerliyse rastgele `peerSecret` üretir (hash DB'ye, düz metin yanıtta), token used=true.
4. Peer sonraki bağlantıları `peerSecret` ile kurar (mevcut Bearer yolu).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Claim bootstrap'ı hash + TTL + tek-kullanım ile doğrulamalı (fail-closed) | AK-2.1 |
| FR-2.2 | Geçerli claim kalıcı `peerSecret` üretmeli; DB'de hash, yanıtta düz metin | AK-2.2 |
| FR-2.3 | Kullanılmış/süresi geçmiş token ikinci claim'de reddedilmeli | AK-2.3 |
| FR-2.4 | Sonraki WS bağlantıları `peerSecret` ile mevcut Bearer yolunu kullanmalı | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** geçerli bootstrap **WHEN** claim **THEN** doğrulama başarılı.
2. **AK-2.2 — GIVEN** geçerli claim **WHEN** işlenir **THEN** `peerSecret` döner, hash DB'de.
3. **AK-2.3 — GIVEN** token kullanıldı **WHEN** tekrar claim **THEN** 409/400 reddedilir.
4. **AK-2.4 — GIVEN** peer secret aldı **WHEN** `/ws/peer`'a bağlanır **THEN** sqlite auth kabul eder.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Hash+TTL+tek kullanım | unit | ⬜ |
| AK-2.2 | Kalıcı secret | unit | ⬜ |
| AK-2.3 | Tekrar claim reddi | unit | ⬜ |
| AK-2.4 | WS auth sürekliliği | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `ClaimBootstrap` use-case + testler
- [ ] T-5: `POST /peers/bootstrap/claim` rotası + testler
- [ ] T-6: Güvenli token/secret üretimi (`crypto.randomBytes`) + hash

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Süresi geçmiş token | 400/410; audit yok (P2) |
| Bilinmeyen peerId | 404 |
| Claim sonrası eski token | reddedilir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/application/claim-bootstrap.ts` | YENİ — use-case |
| `hub-servis/src/infrastructure/inbound/routes/bootstrap-routes.ts` | YENİ — claim rotası |
| `hub-servis/src/infrastructure/outbound/sqlite-peer-credential-store.ts` | Bootstrap + secret metodları |

### 6.3 UC-3 — RevokePeer (iptal + düşürme)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: kimlik iptali, aktif WS düşürme, re-enrollment zorunluluğu.
- hariç: üretim/claim (UC-1/UC-2).

**Akış:**
1. Admin `DELETE /admin/peers/:peerId` (consumer token).
2. Use-case kimliği revoked işaretler; `IPeerDisconnector` ile aktif bağlantı kapatılır.
3. Yeniden bağlanma yeni bootstrap gerektirir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Revocation kimliği iptal etmeli (authenticate false) | AK-3.1 |
| FR-3.2 | Revocation aktif WS'i düşürmeli (`IPeerDisconnector`) | AK-3.2 |
| FR-3.3 | Re-enrollment yalnız yeni bootstrap ile mümkün olmalı | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** geçerli peer **WHEN** revoke **THEN** eski secret ile auth reddedilir.
2. **AK-3.2 — GIVEN** peer bağlı **WHEN** revoke **THEN** WS kapanır.
3. **AK-3.3 — GIVEN** peer iptal edildi **WHEN** eski secret ile bağlanır **THEN** reddedilir; yeni bootstrap gerekir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Kimlik iptali | unit | ⬜ |
| AK-3.2 | Aktif WS düşürme | unit | ⬜ |
| AK-3.3 | Re-enrollment bootstrap | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-7: `IPeerDisconnector` portu + `PeerChannelHub.disconnect`
- [ ] T-8: `RevokePeer` use-case + testler
- [ ] T-9: `DELETE /admin/peers/:peerId` rotası + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bağlı olmayan peer | yalnız kimlik iptali (idempotent) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/domain/ports/peer-disconnector.ts` | YENİ — port |
| `hub-servis/src/application/revoke-peer.ts` | YENİ — use-case |
| `hub-servis/src/infrastructure/inbound/routes/admin-routes.ts` | DELETE rotası |

### 6.4 UC-4 — Auth modu (dev/prod)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: env-token (dev/simple) ile sqlite+bootstrap (prod) seçimi; fail-fast; uçtan uca doğrulama.
- hariç: tarayıcı login (P3); mTLS (A1).

**Akış:**
1. `PEER_TOKEN` tanımlıysa `EnvPeerTokenStore` (dev/simple).
2. Değilse sqlite credential repository (prod); bootstrap uçları aktif.
3. İkisi de yoksa açılış fail-fast.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Auth modu config'ten seçilmeli; ikisi de yoksa açılış reddedilmeli | AK-4.1 |
| FR-4.2 | Bootstrap → claim → register → revoke uçtan uca çalışmalı | AK-4.2 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** ne `PEER_TOKEN` ne sqlite yolu **WHEN** başlatılır **THEN** açılış hata ile durur.
2. **AK-4.2 — GIVEN** sqlite modu **WHEN** bootstrap→claim→register→revoke **THEN** akış tamamlanır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Mod seçimi fail-fast | unit | ⬜ |
| AK-4.2 | E2E bootstrap akışı | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-10: `HubConfig` auth modu + `main.ts` wiring (env/sqlite)
- [ ] T-11: Bootstrap uçtan uca integration testi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Her iki mod da yapılandırılmış | `PEER_TOKEN` (dev) öncelikli; log uyarısı |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `hub-servis/src/config/hub-config.ts` | Auth modu seçimi |
| `hub-servis/src/main.ts` | Credential store wiring |

### 6.5 Paket Geneli Görevler

- [ ] T-12: `AGENTS-WS-TUNNEL.md` bootstrap sözleşmesi + `hub-servis/README.md` uç/env tablosu

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bootstrap üretimi | Düz metin tek kez; DB hash + TTL(24h) + used=false |
| Claim (geçerli) | `peerSecret` üretilir; token used=true; secret hash DB |
| Claim (kullanılmış/süre aşımı) | Reddedilir (fail-closed) |
| WS register (secret) | sqlite `authenticate` — mevcut yol |
| Revocation | Kimlik revoked + aktif WS kapatılır |
| Re-enrollment | Yeni bootstrap zorunlu |
| Dev mod (`PEER_TOKEN`) | Env token; bootstrap uçları pasif |
| Sır log'u | Asla loglanmaz |

Beklenen hata → yerel `Result`; beklenmeyen → `DomainError`. Kimlik yolları fail-closed'dır.

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Bootstrap → claim → register → revoke uçtan uca çalışır | integration testi |
| SC-2 | Kullanılmış/süresi geçmiş token ve iptal edilmiş secret reddedilir (fail-closed) | unit + integration |
| SC-3 | Hexagonal sınır korunur (domain/application'da sqlite/env yok) | grep + kod inceleme |
| SC-4 | `@gd-monorepo/ws-tunnel` paketi DEĞİŞMEZ; wire v1/v2 aynı | `git diff` + integration |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✅ Approved 2026-10-16) |
| 2. JSDoc | T-1/T-2/T-4/T-8 sözleşmeleri |
| 3. TEST | T-2, T-4, T-8, T-10 kırmızı testler |
| 4. IMPL | Port/adapter + use-case + rotalar + wiring |
| 5. KAPANIŞ | `WS-TUNNEL-BOOTSTRAP-KIMLIK-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | mTLS / client-cert / public-key pinning | İhtiyaç belirince |
| A2 | Kalıcı hub audit adapter'ı (bootstrap/claim/revoke olayları) | İhtiyaç belirince |
| A3 | Bootstrap token teslimi (QR/config dosyası) | Env yeterli; alternatif ileri iş |
| A4 | `peerSecret` periyodik rotasyonu | İhtiyaç belirince |
| A5 | Çoklu secret / aynı peer'a birden fazla cihaz | Tek secret (YAGNI) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **P3** monorepo web-service consumer entegrasyonu + tarayıcı cookie front-door.
2. **A4** host-based erişim.
3. **İP-4** isim/marka, LICENSE, registry publish.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | `IPeerBootstrapRepository` + sqlite adapter | UC-1 | `hub-servis/src/domain/ports/peer-bootstrap-repository.ts`, `infrastructure/outbound/sqlite-peer-credential-store.ts` |
| T-2 | `CreateBootstrap` use-case | UC-1 | `hub-servis/src/application/create-bootstrap.ts` |
| T-3 | `POST /admin/peers` rotası | UC-1 | `hub-servis/src/infrastructure/inbound/routes/admin-routes.ts` |
| T-4 | `ClaimBootstrap` use-case | UC-2 | `hub-servis/src/application/claim-bootstrap.ts` |
| T-5 | `POST /peers/bootstrap/claim` rotası | UC-2 | `hub-servis/src/infrastructure/inbound/routes/bootstrap-routes.ts` |
| T-6 | Token/secret üretimi + hash | UC-2 | `hub-servis/src/application/claim-bootstrap.ts` |
| T-7 | `IPeerDisconnector` + `PeerChannelHub.disconnect` | UC-3 | `hub-servis/src/domain/ports/peer-disconnector.ts`, `infrastructure/inbound/peer-channel-hub.ts` |
| T-8 | `RevokePeer` use-case | UC-3 | `hub-servis/src/application/revoke-peer.ts` |
| T-9 | `DELETE /admin/peers/:peerId` rotası | UC-3 | `hub-servis/src/infrastructure/inbound/routes/admin-routes.ts` |
| T-10 | Auth modu + wiring | UC-4 | `hub-servis/src/config/hub-config.ts`, `hub-servis/src/main.ts` |
| T-11 | Bootstrap E2E integration testi | UC-4 | `hub-servis/src/bootstrap.integration.test.ts` |
| T-12 | Sözleşme + README güncellemesi | Genel | `AGENTS-WS-TUNNEL.md`, `hub-servis/README.md` |

**review_date:** 2026-10-16 — 🟢 doğrulanmış (KAPANIŞ: WS-TUNNEL-BOOTSTRAP-KIMLIK-KAPANIS.md).
