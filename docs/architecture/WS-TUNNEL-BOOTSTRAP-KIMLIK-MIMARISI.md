---
status: active
space: architecture
tags: [mimari, ws-tunnel, bootstrap, kimlik, peer, dev-prod, spec]
review_date: 2026-10-16
---

# ws-tunnel Bootstrap ve Peer Kimliği — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ ONAYLANDI (2026-10-16) — İP-1 sonrası sırada (aşama 2-4).
> **İlişkili:** [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md), [WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md), [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md), [AGENTS-DEPLOYMENT.md](../../AGENTS-DEPLOYMENT.md)

## 1. Amaç ve Bağlam

Bugün peer kimliği **elle üretilip elle taşınıyor**: admin, peer için bir uplink token'ı girer (`admin-routes.ts` → `upsertToken`), token peer'ın `.env`'ine yazılır ve hub'a kaydedilir. Bu akış, demo/ortam taşımayı yavaşlatır (her peer için manuel token işi), token'ı peer'ın üretmesine/kimliğini kendi ilan etmesine yakın bir modeldir ve token yaşam döngüsü (üretim, tek kullanım, iptal) merkezi değildir.

**Çözüm yönü:** Kimlik otoritesi **hub** olur. Hub, yeni peer için **tek kullanımlık, TTL'li bootstrap token** üretir; bu token peer'a güvenli kanaldan (env var) iletilir. Peer, token'ı **HTTP üzerinden** kalıcı kimliğiyle (`peerSecret`) takas eder; sonraki WS bağlantıları mevcut Bearer-token yoluyla kurulur. Böylece **WS/tünel protokolü hiç değişmez**; bootstrap tamamen tüketici (web-service) katmanında yaşar.

**Dev/prod ayrımı:** Lokal geliştirmede TLS/domain/bootstrap derdi olmamalı. Bu bir **deployment sözleşmesidir** — pakete dev/prod bayrağı eklenmez; hub dev yapılandırması token'sız register kabul eder, üretimde bootstrap zorunludur.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Hub-üretimli bootstrap token (üretim/claim/iptal) | ✅ dahil |
| Kalıcı peer kimliği (`peerSecret`) ve WS auth sürekliliği | ✅ dahil |
| Revocation + aktif bağlantı düşürme + re-enrollment | ✅ dahil |
| Dev/prod mod sözleşmesi (deployment) | ✅ dahil |
| Paket (`@gd-monorepo/ws-tunnel`) protokol/kod değişikliği | ❌ hariç — sıfır değişiklik |
| mTLS / client-cert / public-key pinning | ❌ hariç (§10 A1) |
| Çoklu tenant / merkezi kimlik sunucusu (IdP) | ❌ hariç (§10 A2) |
| Keşif + opak servis erişimi | ❌ hariç → `WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md` |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Bootstrap token **hub-üretimli**, tek kullanımlık, 24 saat TTL | Üretim yalnız hub'da; peer kendi kimliğini ilan etmez |
| K2 | Takas **HTTP üzerinden** (mevcut register API deseni) | WS/tünel protokolü DEĞİŞMEZ; pakete sıfır dokunuş |
| K3 | Kalıcı kimlik = uzun ömürlü rastgele `peerSecret` | Mevcut token-hash modelinin genelleşmesi; mTLS/pubkey-pin sonraki adım (A1) |
| K4 | Dev/prod **paket bayrağı değil**, deployment sözleşmesi | Dev: `ws://` + token opsiyonel; Prod: `wss://` + bootstrap zorunlu |
| K5 | Revocation = kimliği sil + aktif WS'i düşür | Re-enrollment yeni bootstrap ile; mevcut `removeToken` genişler |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Token admin tarafından elle giriliyor (peer üretmiyor); ölçeklenmez ve demo/ortam taşımayı yavaşlatır | `services/web-service/src/presentation/routes/admin-routes.ts` — `upsertToken(field.id, body.uplinkToken)` |
| B2 | Kimlik deposu yalnız kalıcı token hash'i tutar; bootstrap/TTL/tek-kullanım kavramı yok | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` — `token_hash` |
| B3 | WS auth mevcut Bearer-token → hash yolu; yeniden kullanılabilir | `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes` |
| B4 | Kimlik iptalinde aktif bağlantı düşürme yok (yalnız kayıt silinir) | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` — `removeToken` |
| B5 | Dev/prod mod ve token'sız lokal geliştirme sözleşmesi dokümante değil | `AGENTS-DEPLOYMENT.md`; loopback demo (`packages/ws-tunnel/examples`) |

## 4. Mimari

### 4.1 Bootstrap akışı (üretim → takas → sürekli kimlik)

```
1) Admin:  POST /api/admin/peers/bootstrap   →  { peerId, bootstrapToken, expiresAt }
                                                  (DB: sha256(bootstrapToken), TTL 24h, used=false)
2) Teslim: BOOTSTRAP_TOKEN=<token> env ile peer'a                          ← güvenli kanal (env/config/QR)
3) Peer:   POST /api/peers/bootstrap/claim  { peerId, bootstrapToken }  →  { peerSecret }
                                                  (token used=true; DB: sha256(peerSecret))
4) Peer:   WS /ws/field  Authorization: Bearer <peerSecret>                  ← MEVCUT yol, protokol aynı
5) Hub:    authenticateToken(peerSecret) → register-ack ok
```

- **Adım 3 tek kullanımlıktır**: aynı bootstrap token ikinci kez claim edilemez.
- **Adım 4-5 mevcut mekanizmadır** (`field_uplinks.token_hash` + Bearer) — yeni protokol yok.
- Peer agent kalıcı `peerSecret`'i kendi lokal deposunda saklar; sonraki açılışlarda env'e gerek yok.

### 4.2 Dev vs Prod

| Boyut | Dev | Prod |
|:------|:----|:-----|
| Taşıma | `ws://` (TLS yok) | `wss://` (TLS zorunlu — NIS-2) |
| Domain | `localhost` yeterli | hub domaini |
| Register auth | Token opsiyonel (yalnız dev env; hub dev config) | Bootstrap/`peerSecret` zorunlu (fail-closed) |
| Bootstrap | Opsiyonel/sabit dev token | Zorunlu, tek kullanımlık |
| Paket farkı | YOK | YOK |

## 5. Purity Kuralları

1. Paket (`@gd-monorepo/ws-tunnel`) bu SPEC kapsamında **değişmez** — bootstrap tüketici katmanındadır.
2. Sırlar asla düz metin saklanmaz: `bootstrapToken` ve `peerSecret` yalnız `sha256` hash olarak DB'de (`field_uplinks` deseni).
3. `peerSecret`/`bootstrapToken` log'lara yazılmaz (redacted; mevcut secret-log kuralı).
4. Dev modu **yalnız** açık dev yapılandırmasında token'sız kabul eder; prod'da bu yol kapalıdır (fail-closed).
5. Bootstrap/claim uçları tüketicide (web-service); domain/oturum kavramı pakete girmez.
6. WS/tünel protokolü ve `packages/ws-tunnel` sözleşmeleri bu işte referans dışıdır — dokunulmaz.

## 6. Use Case'ler

### 6.1 UC-1 — Hub bootstrap token üretimi

**Status:** ✅ Approved (2026-10-16)

**Kapsam:**
- dahil: admin peer bootstrap üretimi, tek kullanım + TTL + hash saklama, audit.
- hariç: claim (UC-2); revocation (UC-3); dev mod (UC-4); paket değişikliği.

**Akış:**
1. Admin `POST /api/admin/peers/bootstrap` çağırır.
2. Hub tek kullanımlık `bootstrapToken` üretir, `sha256`'ini TTL ile saklar.
3. Düz metin token yalnız yanıtta bir kez döner.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Bootstrap üretimi hub'da yapılmalı; düz metin token tek kez yanıtta, DB'de yalnız hash saklanmalı | AK-1.1 |
| FR-1.2 | Token tek kullanımlık ve 24 saat TTL'li olmalı (`used`, `expires_at`) | AK-1.2 |
| FR-1.3 | Üretim audit'lenmeli (peer_bootstrap_created) | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** admin bootstrap ister **WHEN** istek işlenir **THEN** düz metin token döner ve DB'de yalnız hash bulunur.
2. **AK-1.2 — GIVEN** yeni token üretildi **WHEN** kayıt incelenir **THEN** `expires_at = +24h` ve `used = false`'dır.
3. **AK-1.3 — GIVEN** bootstrap üretildi **WHEN** denetim incelenir **THEN** `peer_bootstrap_created` kaydı mevcuttur.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Bootstrap hub'da üretilir, hash saklanır | unit | ⬜ |
| AK-1.2 | TTL + tek kullanım alanları yazılır | unit | ⬜ |
| AK-1.3 | Üretim audit olayı basılır | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: YENİ bootstrap deposu + üretim ucu (`POST /api/admin/peers/bootstrap`)
- [ ] T-2: Bootstrap üretim/TTL/tek-kullanım testleri
- [ ] T-3: `event-codes.ts` — `peer_bootstrap_created` + audit yazımı

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Aynı peer için yeni bootstrap | Önceki kullanılmamış token geçersiz kılınır |
| Yetkisiz çağrı | 401/403 (admin/teknik) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` | Bootstrap deposu + üretim |
| `services/web-service/src/presentation/routes/admin-routes.ts` | Bootstrap üretim ucu |
| `packages/platform/logging/src/event-codes.ts` | `peer_bootstrap_created` olay kodu |

### 6.2 UC-2 — Peer bootstrap claim → kalıcı kimlik

**Status:** ✅ Approved (2026-10-16)

**Kapsam:**
- dahil: claim ucu, `peerSecret` üretimi, tek kullanım işaretleme, mevcut WS auth sürekliliği.
- hariç: üretim (UC-1); revocation (UC-3); mTLS (A1).

**Akış:**
1. Peer `BOOTSTRAP_TOKEN` ile `POST /api/peers/bootstrap/claim` çağırır.
2. Hub token'ı hash+TTL+tek-kullanım ile doğrular.
3. Geçerliyse kalıcı `peerSecret` üretir (hash DB'ye, düz metin yanıtta), token'ı `used=true` yapar.
4. Peer sonraki bağlantıları `peerSecret` ile kurar (mevcut Bearer yolu).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Claim, bootstrap token'ı hash + TTL + tek-kullanım ile doğrulamalı (fail-closed) | AK-2.1 |
| FR-2.2 | Geçerli claim kalıcı `peerSecret` üretmeli (düz metin yanıtta, hash DB'de) | AK-2.2 |
| FR-2.3 | Kullanılmış/süresi geçmiş token ikinci claim'de reddedilmeli | AK-2.3 |
| FR-2.4 | Sonraki WS bağlantıları `peerSecret` ile mevcut Bearer-token yolunu kullanmalı (protokol değişmez) | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** geçerli bootstrap token **WHEN** claim çağrılır **THEN** doğrulama başarılı olur.
2. **AK-2.2 — GIVEN** geçerli claim **WHEN** işlenir **THEN** `peerSecret` döner ve hash'i DB'de saklanır.
3. **AK-2.3 — GIVEN** token daha önce kullanıldı **WHEN** tekrar claim edilir **THEN** reddedilir.
4. **AK-2.4 — GIVEN** peer `peerSecret` aldı **WHEN** `/ws/field`'a bağlanır **THEN** mevcut token doğrulaması kabul eder.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Claim doğrulaması hash+TTL+tek-kullanım | unit | ⬜ |
| AK-2.2 | Kalıcı `peerSecret` üretilir | unit | ⬜ |
| AK-2.3 | Tekrar claim reddedilir | unit | ⬜ |
| AK-2.4 | WS auth mevcut yoldan çalışır | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-4: Claim ucu (`POST /api/peers/bootstrap/claim`) + `peerSecret` üretimi
- [ ] T-5: Tek kullanım işaretleme + reddi
- [ ] T-6: Claim/tek-kullanım/`peerSecret` testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Süresi geçmiş token | Reddedilir; audit |
| Bilinmeyen `peerId` | Reddedilir |
| Claim sonrası eski bootstrap yeniden kullanımı | Reddedilir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` | Claim + `peerSecret` üretimi |
| `services/web-service/src/presentation/routes/field-routes.ts` | Claim ucu |

### 6.3 UC-3 — Revocation + re-enrollment

**Status:** ✅ Approved (2026-10-16)

**Kapsam:**
- dahil: kimlik iptali, aktif WS düşürme, re-enrollment.
- hariç: üretim/claim (UC-1/2).

**Akış:**
1. Admin peer'ı düşürür → kimlik silinir.
2. Hub aktif WS bağlantısını kapatır.
3. Yeniden bağlanma yeni bootstrap token gerektirir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Revocation kimliği silmeli ve aktif WS'i düşürmeli | AK-3.1 |
| FR-3.2 | Re-enrollment yalnız yeni bootstrap token ile mümkün olmalı | AK-3.2 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** peer bağlı **WHEN** revocation uygulanır **THEN** kimlik silinir ve WS kapanır.
2. **AK-3.2 — GIVEN** peer düşürüldü **WHEN** eski `peerSecret` ile bağlanır **THEN** reddedilir; yalnız yeni bootstrap ile döner.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Revocation kimlik + aktif bağlantı | unit | ⬜ |
| AK-3.2 | Re-enrollment bootstrap gerektirir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-7: Revocation + aktif WS düşürme (mevcut `removeToken` genişler)
- [ ] T-8: Revocation/re-enrollment testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bağlı olmayan peer revocation | Yalnız kimlik silinir (idempotent) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` | `removeToken` + aktif WS kapatma |
| `services/web-service/src/presentation/routes/admin-routes.ts` | Revocation ucu |

### 6.4 UC-4 — Dev/prod mod sözleşmesi

**Status:** ✅ Approved (2026-10-16)

**Kapsam:**
- dahil: dev modda token'sız register kabulü, prod fail-closed, deployment dokümantasyonu.
- hariç: paket değişikliği; wildcard subdomain.

**Akış:**
1. Dev yapılandırması: hub token'sız register kabul eder (`ws://`).
2. Prod yapılandırması: bootstrap/`peerSecret` zorunlu (`wss://`).
3. `BOOTSTRAP_TOKEN=xxx` env'i ile demo/ortam taşıma hızlanır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Dev modda (yalnız açık dev yapılandırması) token'sız register kabul edilmeli | AK-4.1 |
| FR-4.2 | Prod'da token'sız register reddedilmeli; paket dev/prod bayrağı taşımamalı | AK-4.2 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** dev yapılandırması **WHEN** token'sız peer register eder **THEN** kabul edilir.
2. **AK-4.2 — GIVEN** prod yapılandırması **WHEN** token'sız register denenir **THEN** 401 reddedilir; pakete bayrak eklenmez.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Dev token'sız kabul | unit | ⬜ |
| AK-4.2 | Prod fail-closed + paket dokunulmaz | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-9: Hub dev-config kapısı (token'sız register — yalnız dev env)
- [ ] T-10: `AGENTS-DEPLOYMENT.md`/env örneği — dev/prod bootstrap sözleşmesi + host-based erişim geçiş işaretçisi (A4: `WS-TUNNEL-SUBDOMAIN-YONLENDIRME-MIMARISI.md`)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Dev bayrağı prod'da yanlışlıkla açık | Fail-closed varsayılan; bayrak açıkça dev-only |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes` | Dev-config token kapısı |
| `AGENTS-DEPLOYMENT.md` | Dev/prod bootstrap sözleşmesi (referans) |

### 6.5 Paket Geneli Görevler

- [ ] T-11: `AGENTS-WS-TUNNEL.md` — "Bootstrap ve peer kimliği sözleşmesi (MANDATORY)" bölümü
- [ ] T-12: YENİ `tools/bootstrap-demo.mjs` — uçtan uca (`BOOTSTRAP_TOKEN` → claim → kalıcı kimlik → register)

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bootstrap üretimi | Düz metin tek kez; DB hash + TTL(24h) + used=false |
| Claim (geçerli) | `peerSecret` üretilir; token used=true |
| Claim (kullanılmış/süre aşımı) | Reddedilir; audit |
| WS register (kalıcı secret) | Mevcut `authenticateToken` yolu — değişmez |
| Revocation | Kimlik silinir + aktif WS kapatılır |
| Re-enrollment | Yeni bootstrap token zorunlu |
| Dev mod | Token opsiyonel (yalnız dev env); prod'da kapalı |
| Sır log'u | Asla loglanmaz (redacted) |

Beklenen hata → `Result`; beklenmeyen → `DomainError`. Kimlik yolları fail-closed'dır.

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `BOOTSTRAP_TOKEN=xxx` ile peer otomatik register olur ve kalıcı kimlik alır; ikinci açılışta env gerekmez | `tools/bootstrap-demo.mjs` PASS |
| SC-2 | Prod'da token'sız / kullanılmış / süresi geçmiş bootstrap reddedilir (fail-closed) | unit + integration yeşil |
| SC-3 | Revocation aktif bağlantıyı düşürür; re-enrollment yalnız yeni bootstrap ile çalışır | unit yeşil |
| SC-4 | ws-tunnel paketinde bu SPEC kapsamında DEĞİŞİKLİK YOK | `git diff` (paket boş) |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✅ Approved 2026-10-16) |
| 2. JSDoc | T-1/T-4/T-7 sözleşmeleri (bootstrap deposu, claim, revocation) |
| 3. TEST | T-2, T-6, T-8 kırmızı testler |
| 4. IMPL | T-1, T-3, T-4, T-5, T-7, T-9, T-10, T-11, T-12 |
| 5. KAPANIŞ | `WS-TUNNEL-BOOTSTRAP-KIMLIK-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | mTLS / client-cert / public-key pinning | İhtiyaç belirince ayrı SPEC (RevPi fabrika cert'i cihaz üreticisi işi) |
| A2 | Çoklu tenant / merkezi IdP (OIDC/LDAP) | İlk pilot sonrası |
| A3 | Bootstrap token teslimi (QR/config dosyası alternatifi) | Env var yeterli; alternatifler ileri iş |
| A4 | `peerSecret` rotasyonu (periyodik) | İhtiyaç belirince |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **mTLS/pubkey-pinning:** TOFU pinning + client cert (A1).
2. **Merkezi IdP/SSO:** OIDC/LDAP entegrasyonu (A2).
3. **Otomatik rotasyon:** periyodik `peerSecret` yenileme (A4).
4. **Opak servis erişimi:** `WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md`.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | Bootstrap deposu + üretim ucu | UC-1 | `services/web-service/src/infrastructure/field-uplink/field-registry.ts`, `presentation/routes/admin-routes.ts` |
| T-2 | Bootstrap üretim/TTL/tek-kullanım testleri | UC-1 | `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` |
| T-3 | `peer_bootstrap_created` audit olayı | UC-1 | `packages/platform/logging/src/event-codes.ts` |
| T-4 | Claim ucu + `peerSecret` üretimi | UC-2 | `presentation/routes/field-routes.ts`, `infrastructure/field-uplink/field-registry.ts` |
| T-5 | Tek kullanım işaretleme + reddi | UC-2 | `services/web-service/src/infrastructure/field-uplink/field-registry.ts` |
| T-6 | Claim/tek-kullanım/`peerSecret` testleri | UC-2 | `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` |
| T-7 | Revocation + aktif WS düşürme | UC-3 | `services/web-service/src/infrastructure/field-uplink/field-registry.ts` |
| T-8 | Revocation/re-enrollment testleri | UC-3 | `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` |
| T-9 | Hub dev-config token kapısı | UC-4 | `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts` |
| T-10 | Dev/prod bootstrap sözleşmesi dokümanı/env + A4 host-based işaretçisi | UC-4 | `AGENTS-DEPLOYMENT.md` |
| T-11 | `AGENTS-WS-TUNNEL.md` bootstrap sözleşmesi bölümü | Genel | `AGENTS-WS-TUNNEL.md` |
| T-12 | Uçtan uca bootstrap demo | Genel | `tools/bootstrap-demo.mjs` |

**review_date:** 2026-10-16 — ilk sürüm; ✅ onaylandı, İP-1 sonrası sırada.
