# Faz 6 Planı — NIS-2 Kapanışı

**Kaynak:** `docs/architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md` §Faz 6 (T6.1-T6.9)
**Kullanıcı kararları:** MFA admin/teknik zorunlu, boss/guest opsiyonel; TOTP = otplib; WAF = yalnız dokümantasyon; bildirim = SMTP + genel HTTP SMS adapter.
**Kurallar:** TDD (JSDoc kontratı → kırmızı → yeşil), güvenlik-kritik modüllerde ≥%90 branch, OWASP ASVS L2, DI (constructor + config objesi + I-interface), Result<T,E> beklenen hatalarda, DOGRULAMA girişi faz kapanışında zorunlu.

## Paket 1 — Kimlik doğrulama sertleştirme (T6.1 + T6.6)

### T6.1 MFA (TOTP) — field tier; admin/teknik zorunlu
- **Dep:** `otplib` → `services/web-service/package.json`
- **Domain:** `services/web-service/src/domain/services/ITotpService.ts` (kontrat: `verify(secret, code, window=1)`, `generateSecret()`, `otpauthUri(secret, user)` → `Result`) + `OtpLibTotpService` implementasyonu
- **DB migrasyon:** `user-repository.ts` — `users.totp_secret TEXT NULL`, `users.mfa_enabled BOOL DEFAULT FALSE`, `mfa_recovery` (user_id FK, code_hash SHA-256, used bool) + `ALTER ... IF NOT EXISTS`
- **Akış:**
  - login → şifre OK; `mfa_enabled` → `200 { mfaRequired:true, mfaToken }` (`type:"mfa"`, 2 dk TTL JWT); değilse normal token'lar
  - `POST /api/auth/login/mfa` `{ mfaToken, code }` → TOTP yanlışsa `401 + security log mfa_login_failed`; kod TOTP veya tek kullanımlık recovery kod olabilir; başarı → access/refresh + audit
  - `POST /api/auth/mfa/enroll` (JWT) → sır üret + otpauth URI döner (mfa_enabled henüz false)
  - `POST /api/auth/mfa/confirm` `{ code }` → ilk doğrulama → `mfa_enabled=true` + 10 recovery kodu (hash'li saklanır) + `mfa_enrolled` audit
  - `POST /api/auth/mfa/reset` (admin) → hedef kullanıcının MFA'sını düşürür
- **Zorunluluk enforcement (T1.6 deseni):** rbac'te must-change'den sonra: kullanıcı `mfaEnrollmentRequired` (rol admin/teknik && !mfa_enabled && config açık) → allowlist dışı 403 `"MFA kaydi gerekli"`; allowlist: `/api/auth/mfa/*`, logout, refresh. `auth.mfaRequiredRoles` config (field default `admin,teknik`; container tier boş → konteyner login etkilenmez). JWT'ye `mfaEnabled` claim eklenir (verifyAccess → user.mfaEnabled).
- **UI (field app):** LoginForm 2. adım (kod girişi); yeni `MfaEnrollPage` + PrivateRoute guard'ı (must-change deseni); i18n tr/en.
- **Testler:** RFC 6238 test vektörleri, window ±1, akış route'ları, recovery tek-kullanım, rbac enforcement — ≥%90 branch (login-mfa + mfa middleware güvenlik-kritik).

### T6.6 Rate-limit + hesap kilidi (backend; WAF → Paket 3 dokümanı)
- `ILoginThrottle` + Redis implementasyonu (`login-throttle.ts`): `recordFailure(username)` → N=5/15 dk → kilit 15 dk; `recordSuccess` sıfırlar; `isLocked` sorgu. RedisConnection instance'ı RealtimeManager ile paylaşılır (DI kural 5).
- `login-use-case.ts`: başarısız girişte sayaç; eşik aşınca `login_locked` security logu + 429 `"Hesap gecici kilitli"`; kilitliyken DOĞRU şifre de reddedilir.
- Testler: fake timers ile pencere/kilit geçişleri, kilitli giriş reddi.

## Paket 2 — SIEM + Bildirim (T6.2 + T6.7)

### T6.2 SyslogSink + HttpWebhookSink (`packages/core/src/logging/sinks/`)
- `SyslogSink`: RFC 5424 frame (PRI/ver/timestamp/host/app/procid/msgid/structured-data), config `{ protocol:"udp"|"tcp", host, port }`; UDP fire-and-forget; TCP kısa ömürlü bağlantı; hata → drop + sayaç (pipeline durmaz).
- `HttpWebhookSink`: JSON batch POST + `X-Signature` HMAC-SHA256; 2 retry + backoff + timeout; config `{ url, secret?, timeoutMs? }`.
- `shared-utils/src/config/definitions.ts`: `LOG_SYSLOG_*`, `LOG_WEBHOOK_*` tanımları; tier varsayılanları (varsayılan kapalı; field tier açılabilir).
- Testler: frame formatı, drop/retry davranışı, imza.

### T6.7 AlertNotifier adapterleri
- `SmtpNotifier` (nodemailer → `packages/core` dep): `{ host, port, secure, user, pass, from, to[] }`; testlerde nodemailer streamTransport.
- `HttpSmsNotifier`: genel HTTP POST şablonu `{ url, method, headers, bodyTemplate, phones[] }` — NetGSM örnek config şablonu dokümanda.
- Mevcut `AlertNotifier` (cooldown) korunur; config wiring web-service `container.ts`.

## Paket 3 — Altyapı (T6.3 + T6.4 + WAF dokümanı)

### T6.3 NTP
- `docs/standards/ntp-konfigurasyonu.md`: RevPi host chrony/timedatectl adımları, doğrulama (`chronyc tracking`), risk #5 (container-JWT TTL) ilişkisi; compose'a yorum notu (host varsayımı).

### T6.4 İmaj pinleme + CVE tarama
- Tüm `FROM` satırları ve compose `image:` satırları digest pinlenir: `oven/bun`, `nginx:alpine`, `timescaledb`, `redis` (web-service Dockerfile zaten `1.3.14` — digest'e çevrilir; container-web/field `oven/bun:latest` + `nginx:alpine` pinsiz → pinlenir).
- `tools/sbom-scan.mjs`: trivy fs (bun.lock) + imaj taraması; `0 Critical/High` kapısı; trivy yoksa uyarı ile atlar (yerel uyumlu).
- `.github/workflows/security.yml`: trivy job (nis-2.md Adım 13'ün implementasyonu).

### WAF dokümanı
- `docs/standards/waf-onerisi.md`: ModSecurity/Coraza opsiyonları, nginx `limit_req`/`limit_conn` örnekleri, çift arayüz modu ön koşulları (mimari §3.4), uygulama kararı Faz sonrasına açık.

## Paket 4 — Dokümanlar + Kapanış (T6.5 + T6.8 + T6.9)

- **T6.5** `docs/standards/olay-mudahale-proseduru.md`: olay sınıflandırma (Kritik/Yüksek/Orta), NIS-2 24/72 saat bildirim akışı (BTK/USOM/sektörel otorite — TR), eskalasyon matrisi, kanıt toplama (`tools/verify-log.mjs`), post-incident şablonu.
- **T6.8** `docs/architecture/MINI-SIEM-PLANI.md`: log-service hedef mimarisi (log_events okuyucu, kural motoru, alert, dashboard), fazlandırma — plan yalnızca, kod yok.
- **T6.9 + DOGRULAMA:** `MIMARISI.md` Faz 6 durum satırı + `review_date`; `TESTING.md` §8.5 Faz 6 satırı; **`KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md` Faz 6 matrisi (T6.1-T6.9 satır ref'li, test kanıtlı) + K6.x kabul kriterleri + genel durum özeti + kapanış kararı**.

## Kabul kriterleri (K6.x önerisi)
- **K6.1** MFA kaydı olmayan admin/teknik veri uçlarında 403; yanlış TOTP → 401 + `mfa_login_failed`; recovery kodu tek kullanımlık.
- **K6.2** 5 başarısız giriş/15 dk → 15 dk kilit + `login_locked`; kilitliyken doğru şifre reddedilir.
- **K6.3** Syslog RFC 5424 frame + webhook HMAC; sink hatası pipeline'ı durdurmaz (sayaç + drop).
- **K6.4** Tüm imajlar digest pinli; `sbom-scan` 0 Critical/High (CI kapısı).
- **K6.5** 24/72 saat bildirim prosedürü dokümanı denetim şablonlu.
- **K6.6** SMTP (streamTransport) + SMS (HTTP mock) adapter testleri + cooldown doğrulanır.

## Sıra ve doğrulama kapıları
1. Paket 1 → `nx run web-service:test` + `nx run field:test` + build'ler; canlı curl (TOTP akışı, kilit)
2. Paket 2 → `nx run core:test` + web-service testleri
3. Paket 3 → docker build (pinli imajlar) + `tools/sbom-scan.mjs` denemesi
4. Paket 4 → dokümanlar + DOGRULAMA girişi + `review_date` güncellemesi
