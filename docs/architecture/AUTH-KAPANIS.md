---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, auth, guvenlik, asvs]
review_date: 2026-11-10
---

# Auth — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [AUTH-MIMARISI.md](./AUTH-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Çapraz modül doğrulama kapanışı (web-service + ws-tunnel-agent/hub); bu turda auth kodunda davranış değişikliği YOK.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/web-service/src/application/use-cases/login-use-case.ts` | (doğrulama) audit fail-closed (sink kapalı → giriş RED), kilit eşiğinde TEK `login_locked`, kilitli hesapta doğru şifre reddi | K4/FR-1 |
| 2 | `refresh-token-use-case.ts` | (doğrulama) reuse: hash DB'de yok/uyuşmuyor → `clearRefreshToken` + err; rotasyon yeni çift; verify-fail yolunda reuse TESPİTİ YAPILMAZ (repo'ya dokunulmaz) | K1/K2/FR-2 |
| 3 | `mfa-enroll/mfa-login-use-case.ts` | (doğrulama) TOTP ± pencere, recovery tek kullanım, `mfa_enrolled`/`mfa_reset` fail-closed, throttle fail-closed | K3/FR-3 |
| 4 | `presentation/middleware/rbac.ts` | (doğrulama) 40 testlik matris: segment sınırlı public, cookie/Bearer, mustChange + MFA allowlist/öncelik | K5–K11/FR-4 |
| 5 | `tiers/container/infrastructure/session/stateless-session-authenticator.ts` | (doğrulama) yerel kayıt yok; token stateless doğrulama | K8/FR-5.1 |
| 6 | `zero-trust-application-tunnel/ws-tunnel-agent/src/setup-server.ts` + `install.ts` | (doğrulama) bootstrap claim TEK kullanımlık (bellek-içi tek claim), PEER_SECRET `mode: 0o600` + chmod + test-teyidi | K12/FR-6 |
| 7 | `ws-tunnel/src/proxy/session-gateway.ts#mapSessionRole` | (bulgu) rol eşlemesi `boss→boss, guest→guest` (2026-08-30 birebir kararı testli); `AGENTS-APPLICATION-TUNNEL.md` hâlâ `boss→guest, guest→oturum YOK` diyor | B1 — S1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Dosya envanteri | enumeration (web-service auth yüzeyi + agent) | **21 test dosyası** — SPEC ile birebir (7 infrastructure/auth + 6 use-case + rbac + ws-routes + 2 session + auth-routes + user-repository + claim-client + setup-server) |
| UC-1 | login-use-case (16): fail-closed audit, tek login_locked, kilitli hesap; redis-login-throttle (5); auth-routes (31) | |
| UC-2 | refresh-token (5): reuse×2 + rotasyon + verify-fail; user-repository (12) | |
| UC-3 | otplib (7: pencere içi/dışı), mfa-enroll (9: fail-closed×2, kilit), mfa-login (9: throttle fail-closed), redis-totp-throttle (5) | |
| UC-4 | rbac (40): segment sınırı, allowlist'ler, öncelik pinlemeleri | |
| UC-5 | stateless-session-authenticator, session-user-map, ws-routes (7) | |
| UC-6 | claim-client (AK-2.1 URL/gövde, reddedilen/erişilemez yolları), setup-server (AK-3.2 tek claim), install (0600 assert), hub bootstrap.integration (reuse 401) | |
| K10 fail-fast | `default.test.ts` (30) — WEB-SERVICE A.5 ile çapraz | |
| Taze koşu / mutasyon / branch-coverage | komutlar | **İLETİLMEDİ** — güvenlik-kritik ≥%90 branch kapısı kanıtsız (G2/G3) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Audit yazılamazsa giriş reddi | login-use-case "fail-closed: audit sink kapalıyken geçerli giriş REDDEDİLİR" | 🟡 |
| AK-1.2 | Eşik geçişinde tek `login_locked` + 429 | login-use-case "tek sefer" vakası + throttle testleri | 🟡 |
| AK-2.1 | Refresh yalnız hash | refresh "hash DB'de YOK → reuse" yolu + user-repository (12) | 🟡 |
| AK-2.2 | Reuse → zincir temizliği | refresh "K5 reuse: clearRefreshToken + err" ×2 + "K4+K5 birlikte" | 🟡 |
| AK-3.1 | TOTP ± pencere | otplib "komşu adımlar geçerli / pencere dışı red" | 🟡 |
| AK-3.2 | Recovery tek kullanımda yanar | mfa-enroll dosya envanteri (9) — vaka adı bu turda pin'lenmedi (G1) | 🟡 |
| AK-3.3 | MFA audit fail-closed | mfa-enroll "audit yazılamazsa MFA AÇILMAZ" + "reset YAPILMAZ" | 🟡 |
| AK-4.1 | Segment sınırlı public | rbac "PUBLIC_PREFIX segment sınırı… 401" | 🟡 |
| AK-4.2 | mustChange → yalnız allowlist | rbac "403" + "öncelik pinleme" + MFA allowlist vakaları | 🟡 |
| AK-5.1 | Stateless oturum | stateless-session-authenticator.test | 🟡 |
| AK-5.2 | WS tokensiz reddedilir | ws-routes.test (7) | 🟡 |
| AK-6.1 | Bootstrap tek kullanımlık | setup-server "tekrar claim etmez" + hub integration reuse-red | 🟡 |
| AK-6.2 | Claim hatası → tunnel başlamaz | claim-client "reddedildi/erişilemez" vakaları | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | **B1 çelişki yaşıyor ve KAPSAMI BÜYÜK** | Kod/test: `boss→boss, guest→guest` (2026-08-30 "birebir" kararı). `AGENTS-APPLICATION-TUNNEL.md`: `boss→guest, guest→oturum YOK`. İki mismatch tek satırda; ya AGENTS satırı güncellenir ya karar geri alınır (A1 — ürün kararı, developer) |
| S2 | `sha256Hex` application→infrastructure sızıntısı | MFA throttle anahtarı katman sınırını atlıyor; arch:check kaydı (WEB-SERVICE-KAPANIŞ S2 ile aynı bulgu) |
| S3 | Kanıt boşlukları: recovery-tek-kullanım ve hash-only vakaları dosya envanterinde ama vaka-adı bu turda pin'lenmedi; branch-coverage (%90) ve mutasyon raporu iletilmedi | G1/G2/G3 |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: token/parola loglanmıyor — audit'te yalnız eventCode+context; şifre alanları redaction listesinde (LOGGER/PLATFORM kapanışlarıyla çapraz)
- [x] Purity 2: fail-closed zincirleri testli (login, MFA, resolve, komut)
- [x] Purity 3: repo'da düz metin sır yok — tek istisna EPIAS geçmişi idi (EPIAS-KAPANIŞ S2; AUTH surface'i temiz)
- [x] Agent 0600: hem `mode` hem `chmodSync` + `statSync` assert'ı (K12 tam)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — bir ürün-karar bekleyişiyle:** 13/13 AK kanıt yüzeyi mevcut; ASVS L2 hedefi test yoğunluğuna yansımış (rbac 40, login 16, config 30). **NIS-2:** bu SPEC güvenlik AK'larını TAŞIYOR (fail-closed×4, reuse, token pinleme, 0600) → uyumluluk boşluğu YOK; kalan eksik METRIK kanıtı: SC-1 "≥%90 branch" sayısal raporu iletilmedi (G2) — güvenlik-kritik modüllerde bu kapanışın 🟢'e dönmesi coverage + mutasyon koşusuna bağlı. S1 tek gerçek açık davranış çelişkisi.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Audit sink kapalı | doğru şifre | giriş RED | `login-use-case.test.ts` |
| Eşik aşımı | n+1 deneme | tek `login_locked` + kilit | aynı + redis-login-throttle |
| Eski refresh sunuldu | reuse | `clearRefreshToken` + err | `refresh-token-use-case.test.ts` |
| Verify başarısız | bozuk imza | repo'ya dokunulmaz (yanlış alarm yok) | aynı |
| Komşu pencere TOTP | t-1 adımı | kabul | `otplib-totp-service.test.ts` |
| Audit hatası enroll | confirm | MFA AÇILMAZ | `mfa-enroll-use-case.test.ts` |
| `/healthz-extra` | public'e benzer | 401 | `rbac.test.ts` |
| mustChange + MFA birlikte | allowlist dışı | ÖNCE şifre 403 | `rbac.test.ts` |
| Tokensiz WS | handshake | red | `ws-routes.test.ts` |
| İkinci claim | kullanılmış bootstrap | hub reuse-red / tekrar-claim yok | `setup-server.test.ts` + hub integration |
| Secret dosyası | install | mode 0600 | `install.test.ts` |
| guest rolü (S1) | mapSessionRole | guest→guest (kod) ≠ doküman | `session-gateway.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Recovery-tek-kullanım + hash-only vakalarının ad düzeyinde pinlenmesi | Düşük (dosyalar mevcut) | vaka-adı eşleştirmesi bir sonraki turda |
| G2 | Branch coverage %90 raporu (rbac/token-adapter/ws-auth/session-gateway) | Orta — SC-1 sayısız | `nx run web-service:test --coverage` + `test-nis2` |
| G3 | Mutasyon verisi yok (auth yüzeyi bu turda değişmedi ama ilk kapanış) | Orta | değişim turunda `--break 90` |
| G4 | S1 ürün kararı + AGENTS satır düzeltmesi | Orta — doküman↔kod iki gerçeğe işaret ediyor | A1 |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-11 | S1 kapatıldı (kaynakta): `AGENTS-APPLICATION-TUNNEL.md` rol eşlemesi koda uyduruldu (`boss→boss`, `guest→guest`) — doküman↔kod çelişkisi kalmadı; dosya repo-dışı ürünü (npm/Docker) referanslıyor | (yok — SPEC değişmedi) |
| 2026-11-10 | İlk kapanış: 21 dosya eşleşti; B1 çelişkisinin AGENTS tarafında boss eşlemesi de yanlış (S1); coverage/mutasyon metric'leri bekleniyor | (yok — SPEC değişmedi) |
