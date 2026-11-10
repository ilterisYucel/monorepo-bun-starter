---
status: active
space: architecture
tags: [mimari, auth, guvenlik, rbac, spec]
review_date: 2026-11-10
---

# Auth — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `WEB-SERVICE-MIMARISI.md`, `WS-TUNNEL-HUB` (bootstrap kimlik), `docs/standards/owasp-asvs-level2.md`.

## 1. Amaç ve Bağlam

Kimlik doğrulama zinciri (multi-modül): web-service login/MFA/refresh/throttle/audit, rbac + allowlist'ler, konteyner/site oturum taşıma (stateless + tunnel session), WS token doğrulama ve agent kimliği (bootstrap/claim/HMAC). Güvenlik-kritik; ASVS Level 2 hedefi.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Giriş, refresh rotasyonu, MFA, throttle, audit fail-closed, rbac matrisi, oturum taşıma, agent kimliği |
| hariç | Genel hata sözleşmesi (RESULT), kullanıcı CRUD UI (APPS), tunnel wire (zero-trust) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Refresh token DB'de SHA-256 hash'li; rotasyonlanmış token yeniden sunulursa `clearRefreshToken` (reuse tespiti, fail-closed) | Çalınmış token zinciri kırılır |
| K2 | Kullanıcı başına TEK refresh token (çoklu oturum tablosu YOK); logout tüm oturumları düşürür | Basit model |
| K3 | MFA: TOTP (RFC 6238, ±1 pencere) + tek kullanımlık recovery code (SHA-256 hash, tek seferde yanar); `mfa_enrolled`/`mfa_reset` audit **fail-closed** | Kayıt izlenebilir |
| K4 | Login/audit fail-closed (`login_succeeded` yazılamazsa giriş reddedilir); throttle fail-closed (Redis hatası → giriş reddi); kilit geçişinde TEK `login_locked` + 429 | Kilit davranışı deterministik |
| K5 | Token alg pinleme HS256 + `type` etiketi (access/refresh/mfa/container-session/field-session) | Token karışması yok |
| K6 | `mustChangePassword` claim'i rbac'e taşınır; `change-password` yeni token çifti döner | Zorunlu değişim |
| K7 | field/boss tier'da dev JWT secret / kısa secret / eksik seed şifresi **fail-fast** | Ortam sızıntısı yok |
| K8 | Konteyner oturumu STATELESS doğrulanır: agent `HUB_SECRET` = uygulama `JWT_SECRET`; yerel oturum kaydı YOK | Yatay ölçek |
| K9 | Cookie varsa Bearer yerine geçer; geçersiz → 401 fail-closed; oturum kullanıcısında mustChangePassword/MFA enforcement uygulanmaz | Tünel akışı |
| K10 | Public önek eşleşmesi SEGMENT SINIRLI; tünel yolları (`/containers/`, `/fields/`) rbac'te public → yetki route katmanında | `/healthz` yanlış pozitifi kapalı |
| K11 | WS token zorunlu: access token veya tunnel session token | Anonim WS yok |
| K12 | Agent kimliği: HMAC imzalı token; `PEER_SECRET` kalıcı, tek kullanımlık bootstrap token'ı ezer; claim **fail-closed**; secret dosyası 0600 | Enrollment güvenli |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Guest oturum kuralı doküman↔kod çelişkisi: `AGENTS-WS-TUNNEL.md` "guest→oturum YOK" ↔ kod/test "guest oturum AÇABİLİR (2026-08-30 kararı)" | `zero-trust-application-tunnel/ws-tunnel/src/proxy/session-gateway.ts#mapSessionRole` |
| B2 | `update-user`/`list-users`/`logout` use-case'leri doğrudan unit testi yok (route üzerinden dolaylı) | test envanteri |
| B3 | Agent setup: bootstrap TEK kullanımlık — `/test` bir kez claim eder, `/save` aynı token'ı yeniden claim ETMEZ; eşzamanlı kaydetme 409 | `zero-trust-application-tunnel/ws-tunnel-agent/src/setup-server.ts` |

## 4. Mimari

```text
apps (AuthStore + 401 interceptor)
        │
web-service ──► auth-routes ──► use-cases ──► ITokenService / IUserRepository / ILoginThrottle / ITotpService / IAuditLog
        │                         │
        ├ rbac middleware (ROUTE_PERMISSIONS + allowlist'ler)
        ├ ws-routes token doğrulama
        └ session (stateless + tunnel cookie)

ws-tunnel-agent ──► bootstrap claim (fail-closed) ──► PEER_SECRET (0600) ──► HMAC token
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `services/web-service/src/domain/services/ITokenService.ts#ITokenService` | Token portu |
| `services/web-service/src/domain/services/ILoginThrottle.ts#ILoginThrottle` | Throttle portu |
| `services/web-service/src/domain/services/ITotpService.ts#ITotpService` | TOTP portu |
| `services/web-service/src/domain/repositories/IUserRepository.ts#IUserRepository` | Kullanıcı deposu |
| `services/web-service/src/presentation/middleware/rbac.ts#createRbacHook` | Yetki |
| `services/web-service/src/domain/ports/session.ts#ISessionAuthenticator` | Oturum |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/hmac-signer.ts#signAgentToken` | Agent imza |
| `zero-trust-application-tunnel/ws-tunnel-agent/src/claim-client.ts#BootstrapClaimClient` | Claim |

## 5. Purity Kuralları (ZORUNLU)

1. Token/şifre düz metni loglanmaz; audit olayları TamperLogger'a gider.
2. Audit yazılamazsa güvenlik-kritik işlem reddedilir (K3/K4).
3. Secret'lar env/dosyadan; repo'da düz metin yok.
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Giriş + Throttle + Audit

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: parola doğrulama, throttle, kilit, audit fail-closed, token çifti
- hariç: MFA (UC-3), refresh (UC-2)

**Akış:**
1. Throttle kontrolü (fail-closed).
2. Parola doğrulanır; audit yazılır (fail-closed).
3. Token çifti döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Audit yazılamazsa giriş reddedilir | AK-1.1 |
| FR-1.2 | Kilit geçişinde tek `login_locked` + 429 döner | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** audit deposu hata veriyor **WHEN** doğru parola girilir **THEN** giriş reddedilir
2. **AK-1.2 — GIVEN** eşik aşıldı **WHEN** yeni deneme **THEN** 429 + tek kilit logu

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Fail-closed | unit (`login-use-case.test.ts`) | ⬜ |
| AK-1.2 | Kilit | unit (`auth-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Redis hatası | Throttle fail-closed |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/application/use-cases/login-use-case.ts` | Giriş |
| `services/web-service/src/infrastructure/auth/redis-login-throttle.ts` | Throttle |

### 6.2 UC-2 — Refresh Rotasyonu + Reuse Tespiti

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: hash'li refresh saklama, rotasyon, reuse tespiti, logout
- hariç: login (UC-1)

**Akış:**
1. Refresh token hash ile aranır.
2. Rotasyon: eski hash geçersiz, yeni çift üretilir.
3. Eski token yeniden sunulursa tüm refresh temizlenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Refresh token yalnız hash olarak saklanır | AK-2.1 |
| FR-2.2 | Reuse tespitinde refresh zinciri temizlenir | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** refresh token üretildi **WHEN** DB incelenir **THEN** yalnız hash görünür
2. **AK-2.2 — GIVEN** eski token yeniden sunuldu **WHEN** doğrulanır **THEN** refresh temizlenir, istek reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Hash | unit (`user-repository.test.ts`) | ⬜ |
| AK-2.2 | Reuse | unit (`refresh-token-use-case.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Logout | Refresh temizlenir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/application/use-cases/refresh-token-use-case.ts` | Rotasyon |

### 6.3 UC-3 — MFA (TOTP + Recovery)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: enroll/confirm/reset, girişte TOTP, recovery code, audit fail-closed
- hariç: rbac enforcement (UC-4)

**Akış:**
1. Kullanıcı TOTP kaydı yapar; confirm audit yazar (fail-closed).
2. Girişte TOTP ±1 pencere doğrulanır.
3. Recovery code tek kullanımlık.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | TOTP ±1 pencere toleransıyla doğrulanır | AK-3.1 |
| FR-3.2 | Recovery code tek kullanımda yanar | AK-3.2 |
| FR-3.3 | MFA audit'i yazılamazsa kayıt/sıfırlama reddedilir | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** bir önceki pencere kodu **WHEN** girilir **THEN** kabul edilir
2. **AK-3.2 — GIVEN** kullanılmış recovery code **WHEN** tekrar girilir **THEN** reddedilir
3. **AK-3.3 — GIVEN** audit hatası **WHEN** enroll confirm **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | TOTP | unit (`otplib-totp-service.test.ts`) | ⬜ |
| AK-3.2 | Recovery | unit (`mfa-enroll-use-case.test.ts`) | ⬜ |
| AK-3.3 | Fail-closed | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| TOTP throttle | Redis fail-closed |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/application/use-cases/{mfa-login,mfa-enroll}-use-case.ts` | MFA |

### 6.4 UC-4 — Yetkilendirme (RBAC + Allowlist'ler)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: rol matrisi, public önek, mustChange allowlist, MFA allowlist
- hariç: oturum doğrulama (UC-5)

**Akış:**
1. `rbacPreHandler` rolü çözer.
2. Public/mustChange/MFA kapıları uygulanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Public önekler segment sınırlı eşleşir | AK-4.1 |
| FR-4.2 | mustChangePassword durumunda yalnız allowlist yolları açıktır | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** `/healthz-extra` **WHEN** istenir **THEN** public sayılmaz (401)
2. **AK-4.2 — GIVEN** mustChangePassword **WHEN** allowlist dışı yol **THEN** 403

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Segment | unit (`rbac.test.ts`) | ⬜ |
| AK-4.2 | Allowlist | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tünel yolları | Route katmanında yetki |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/presentation/middleware/rbac.ts` | Yetki |

### 6.5 UC-5 — Oturum Taşıma (Stateless + WS + Tunnel)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: konteyner stateless oturum, cookie önceliği, WS token, tunnel session cookie
- hariç: agent kimliği (UC-6)

**Akış:**
1. Agent'ın ürettiği oturum token'ı stateless doğrulanır.
2. Cookie varsa Bearer yerine geçer.
3. WS handshake'te token zorunludur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Konteyner oturumu yerel kayıt gerektirmez | AK-5.1 |
| FR-5.2 | WS bağlantısı token olmadan reddedilir | AK-5.2 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** geçerli oturum token'ı **WHEN** istek gelir **THEN** stateless doğrulanır (DB yok)
2. **AK-5.2 — GIVEN** tokensiz WS **WHEN** bağlanır **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Stateless | unit (`stateless-session-authenticator.test.ts`) | ⬜ |
| AK-5.2 | WS token | unit (`ws-routes.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Geçersiz cookie | 401 fail-closed |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/web-service/src/tiers/container/infrastructure/session/**` | Oturum |

### 6.6 UC-6 — Agent Kimliği (Bootstrap / Claim / HMAC)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: tek kullanımlık bootstrap, claim fail-closed, PEER_SECRET kalıcılığı, HMAC token, 0600
- hariç: tunnel çekirdeği (zero-trust)

**Akış:**
1. Bootstrap token tek kez claim edilir.
2. `PEER_SECRET` dosyaya 0600 yazılır; env'i ezer.
3. HMAC imzalı token üretilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Bootstrap token tek kullanımlıktır; ikinci claim reddedilir | AK-6.1 |
| FR-6.2 | Claim hatası tunnel başlatmaz (fail-closed) | AK-6.2 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** kullanılmış bootstrap token **WHEN** claim denenir **THEN** reddedilir
2. **AK-6.2 — GIVEN** hub erişilemez **WHEN** claim **THEN** tunnel başlamaz

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Tek kullanım | unit (`claim-client.test.ts`) | ⬜ |
| AK-6.2 | Fail-closed | unit (`setup-server.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-6: UC-6 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Secret dosyası | 0600 |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel-agent/src/{claim-client,hmac-signer,config}.ts` | Kimlik |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Audit hatası | Red (fail-closed) |
| Reuse tespiti | Refresh temizliği |
| Geçersiz token | 401 |
| Claim hatası | Tunnel başlamaz |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Güvenlik-kritik akışlar testli (≥%90 hedefi) | komut |
| SC-2 | Düz metin sır/token yok | kod inceleme |
| SC-3 | Fail-closed davranışlar kanıtlı | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 21 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-6 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `AUTH-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Guest oturum çelişkisinin tek karara bağlanması (B1) | İleri İş (ürün kararı) |
| A2 | Eksik use-case testleri (B2) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Guest oturum kararı (A1).
2. Kullanıcı use-case test borcu (A2).
3. ASVS Level 2 kontrol matrisinin bu SPEC'e bağlanması.

## 12. T Görev Özeti

| T-1 | UC-1 (giriş/throttle/audit) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (refresh) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (MFA) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (rbac) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (oturum) kanıt testlerinin eşleştirilmesi |
| T-6 | UC-6 (agent kimliği) kanıt testlerinin eşleştirilmesi |
