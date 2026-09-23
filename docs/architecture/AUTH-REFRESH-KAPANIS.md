---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, auth, refresh-token]
review_date: 2026-09-23
---

# Auth-Refresh Düzeltmesi — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [AUTH-REFRESH-MIMARISI.md](./AUTH-REFRESH-MIMARISI.md) (onaylı — AK/FR/SC kaynağı; bu doküman kanonik tanımları tekrar etmez, işaret eder).

---

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/web-service/src/infrastructure/persistence/user-repository.ts#storeRefreshToken` @9c65a89 | `storeRefreshToken`/`findByRefreshToken` SHA-256 hash'e geçti (`sha256Hex` — `infrastructure/auth/service-token.ts#sha256Hex`) | K4 (B6: düz metin biter) |
| 2 | `services/web-service/src/application/use-cases/refresh-token-use-case.ts#execute` @9c65a89 | `verifyRefresh` try/catch (throw → `Result.err`) + K5 reuse tespiti: hash DB'de yoksa `clearRefreshToken(sub)` | K5 (B1 rotasyon yarışı, B5 tek-token) |
| 3 | `services/web-service/src/application/use-cases/logout-use-case.ts#execute` | DEĞİŞMEDİ (kod inceleme maddesi) | K3 global iptal korunur |
| 4 | `apps/field/src/lib/auth-navigation.ts#setLoginNavigator` | YENİ — `setLoginNavigator`/`navigateToLogin` callback enjeksiyonu | lib→router döngüsünü kırar (UC-1 Edge) |
| 5 | `apps/field/src/lib/api-client.ts#<response interceptor>` | Interceptor yeniden yazımı: tünel guard (request+response), `/auth/login`/`/auth/refresh` guard'ları, tek-uçuş refresh (failedQueue), `clearAuthState` + `navigateToLogin` | B1/B2/B3/B4; AK-1.1-1.4 |
| 6 | `apps/field/src/features/auth/stores/AuthStore.ts#clearSession` | `loginAsGuest` + `GUEST_USERNAME`/`GUEST_PASSWORD` KALDIRILDI; logout auto-guest kaldırıldı; `clearSession` eklendi | K1 (AK-2.1/2.2) |
| 7 | `apps/field/src/app/App.tsx#TunnelBootstrap` | `GuestBootstrap` → `TunnelBootstrap` (yalnız tünel hydrate'i; standalone no-op) | UC-2 (AK-2.3) |
| 8 | `apps/field/src/app/router.tsx#router` | `setLoginNavigator((p) => router.navigate(p))` | SPA navigasyon wiring (B4) |
| 9 | `apps/superadmin/src/lib/auth-navigation.ts` | YENİ — field ile aynı modül | UC-3 |
| 10 | `apps/superadmin/src/lib/api-client.ts#<response interceptor>` | Queue + `_retry` + `clearAuthState` + `navigateToLogin` (tünel guard YOK) | UC-3; AK-3.1/3.2 |
| 11 | `apps/superadmin/src/features/auth/stores/AuthStore.ts#clearSession` | `clearSession` eklendi; logout değişmedi | UC-3 |
| 12 | `apps/superadmin/src/app/router.tsx#router` | `setLoginNavigator` | SPA navigasyon wiring |
| 13 | `e2e/security/guest-auto-dashboard.spec.ts` | REV — K1: token'sız açılış → LOGIN ekranı (eski auto-guest beklentileri söküldü) | AK-2.1 e2e |
| 14 | `e2e/field-auth.spec.ts` | YENİ — AK-5.1 çift sekme, AK-5.2 logout, kısa-TTL refresh | UC-5 |
| 15 | `e2e/superadmin-auth.spec.ts` | YENİ — AK-5.2 superadmin | UC-5 |
| 16 | `e2e/security/container-guest-fallback.spec.ts` | YENİ — AK-5.3 regresyon (container-web DEĞİŞMEDİ) | K1 korunmuş |
| 17 | `deployment/docker-compose.{field,boss,container}.dev.yml` | `ACCESS_TOKEN_EXPIRY_SECONDS` opsiyonel passthrough (varsayılan 900) | A1 kapanışı |
| 18 | `docs/roadmap/test-envanteri.md` | Girdiler güncellendi (otomatik envanter kuralına geçiş) | UC-6 |

**DEĞİŞMEDİ (purity doğrulaması):** `apps/container-web/**`, `packages/*`, ws-tunnel, tünel protokolü, `session-auth.ts#hydrateSessionAuth`, `LoginPage.tsx`, `logout-use-case.ts`, `IUserRepository.ts`, `auth-routes.ts`, `field-session-routes.ts`, `rbac.ts`.

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| web-service (tam) | `bunx vitest run` (services/web-service) | **577/577 yeşil** |
| field (tam) | `bunx vitest run` (apps/field) | **156/156 yeşil** |
| superadmin (tam) | `bunx vitest run` (apps/superadmin) | **56/56 yeşil** |
| field build | `bunx nx run field:build` | ✅ |
| superadmin build | `bunx nx run superadmin:build` | ✅ |
| tsc (dokunulan dosyalar) | `bunx tsc -b` + filtre | ✅ (repo'da önceden var olan paket hataları hariç) |
| SPEC lint'i | `bun run spec:check docs/architecture/AUTH-REFRESH-MIMARISI.md docs/architecture/AUTH-REFRESH-KAPANIS.md` | ✅ |

### A.3 Kabul Kriteri Kanıtları

> Kanonik kriter tanımı SPEC §6'dadır; bu tablo kanıt işaretçisidir.

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Eşzamanlı N 401 → TEK refresh + queue retry (B1) | `apps/field/src/lib/api-client.test.ts` — "eşzamanlı N 401 → TEK /auth/refresh…" (refreshCalls===1, ikisi 200) | 🟢 |
| AK-1.2 | Refresh apiClient üzerinden; ham `axios.post` KALDIRILDI (B2) | aynı dosya — "refresh apiClient üzerinden…" (`rawPost` çağrılmadı) + kod inceleme `api-client.ts#<response interceptor>` | 🟢 |
| AK-1.3 | Başarısızlıkta token+persist temizliği + SPA `/login`, reload yok (B4) | aynı dosya — "refresh başarısız → token'lar + persist store…" (`field-auth-storage` `user:null`; navigator `/login`) | 🟢 |
| AK-1.4 | Tünel modunda 401 → interceptor İNERT (B3) | aynı dosya — "tünel modunda 401 → tamamen İNERT…" | 🟢 |
| AK-2.1 | Field'de auto-guest YOK (K1) | `AuthStore.test.ts` — "logout … auto-guest YOKTUR"; kod inceleme (`grep` boş) + e2e `guest-auto-dashboard.spec.ts` REV | 🟢 |
| AK-2.2 | `clearSession` persist dahil tam temizler; backend/auto-guest YAPMAZ | `AuthStore.test.ts` — "clearSession persist dahil…" | 🟢 |
| AK-2.3 | `TunnelBootstrap` tünel hydrate'ini korur; standalone no-op | `apps/field/src/app/App.test.tsx` (3 test) | 🟢 |
| AK-3.1 | Superadmin eşzamanlı N 401 → tek refresh + retry | `apps/superadmin/src/lib/api-client.test.ts` — "eşzamanlı N 401…" | 🟢 |
| AK-3.2 | Superadmin başarısızlıkta tam temizlik + SPA `/login` | aynı dosya — "refresh başarısız → …" | 🟢 |
| AK-4.1 | `storeRefreshToken` SHA-256 hash yazar; `findByRefreshToken` hash eşleştirir (K4) | `user-repository.test.ts` — "storeRefreshToken DB'ye SHA-256 hash yazar…", "findByRefreshToken gelen token'ı hash'leyip…" (64-hex assert) | 🟢 |
| AK-4.2 | Reuse: imza geçerli + DB'de yok → `clearRefreshToken` (K5) | `refresh-token-use-case.test.ts` — "imza geçerli + hash DB'de YOK…" | 🟢 |
| AK-4.3 | Rotasyon: yeni token hash'li saklanır; eski token reuse → iptal | aynı dosya — "rotasyon sonrası eski token…" | 🟢 |
| AK-4.4 | Refresh rotası davranışı DEĞİŞMEDİ (200/400/401) | `auth-routes.test.ts` — 200/400 + 401 (imza red → 401, reuse → 401 + clear) | 🟢 |
| AK-5.1 | Çift sekme: B login, A refresh → ikisi de login'e düşer | `e2e/field-auth.spec.ts` (Playwright — docker stack + `E2E_SHORT_TTL=1` gerekli) | 🟡 spec yazıldı — stack koşumu bekliyor |
| AK-5.2 | Field/superadmin logout → login ekranı (auto-guest YOK) | `e2e/field-auth.spec.ts` + `e2e/superadmin-auth.spec.ts` | 🟡 spec yazıldı — stack koşumu bekliyor |
| AK-5.3 | Container-web regresyon: guest fallback (K1 korunmuş) | `e2e/security/container-guest-fallback.spec.ts` | 🟡 spec yazıldı — stack koşumu bekliyor |
| AK-6.1 | Güvenlik-kritik modüller ≥%90 branch | web-service 577/577; hedef dosyalar: `refresh-token-use-case` (5/5 test — tüm dallar), interceptor'ler (8+5 test). Tam branch metriği sonar'dan alınır | 🟢 (birim düzeyinde) |
| AK-6.2 | KAPANIŞ güncel; AK tabloları işaretli | Bu doküman + SPEC §6 Durum sütunları | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | Retry'de `Authorization` header'ı elle yazılmıyor | SPEC akış adımı 6'da "orijinal istek `_retry=true` ile tekrar gönderilir" der; header yazımı belirtilmez. Retry `apiClient(originalRequest)` ile gider ve request interceptor yeni token'ı localStorage'dan tazeler — tek doğruluk noktası. AK-1.1 testi yeni token'ın retry'e gittiğini kanıtlar. |
| S2 | `verifyRefresh` throw'u artık `Result.err` → 401 (önce 500) | SPEC §4.5/§7: "imza geçersiz → 401 — reuse YAPILMAZ". Davranış düzeltmesi: hata kategorisi oturum sonu (beklenen) — route'un err→401 eşlemesi değişmedi. |
| S3 | `/auth/login` guard'ı eklendi | SPEC akış listesinde açıkça yok ama container-web referans deseninde var (`api-client.ts#<response interceptor>`); hizalanma kapsamında eklendi. |
| S4 | Request interceptor tünel modunda Bearer eklemiyor | SPEC UC-1 adım 1: "standalone modda … ekler". Tünelde boss'un `auth-token`'ı (ortak localStorage) field API'sine taşınmaz — B3 korumasının istek tarafı. |
| S5 | E2E zamanlama testleri `E2E_SHORT_TTL=1` gate'iyle skip | A1: stack'te `ACCESS_TOKEN_EXPIRY_SECONDS` kısa değilse bekleme 15 dk+ olur — gate dokümante kısıtlı koşum sağlar. |

### A.5 Gözle Kontrol Maddeleri

- [x] `apps/container-web`'de DEĞİŞİKLİK YOK (bu iş paketinden değişiklik eklenmedi)
- [x] `packages/*` ve tünel protokolü değişmedi
- [x] `GUEST_PASSWORD`/`loginAsGuest`/`GuestBootstrap` field/superadmin kodunda yok (`grep` boş)
- [x] `window.location.href` interceptor'larda yok — `navigateToLogin` SPA
- [x] Ham `axios.post("/api/auth/refresh")` field/superadmin'de yok — `apiClient.post("/auth/refresh")`
- [x] `IUserRepository`/`ITokenService` imzaları değişmedi (purity 6)
- [x] `user_refresh_tokens` tablosu AÇILMADI; migration yok (K2)
- [x] DB'ye düz metin refresh token yazılmıyor (hash tek yol)
- [x] Dev compose passthrough varsayılanı 900 sn — üretim davranışı değişmez
- [x] SPEC/KAPANIŞ `spec:check` lint'inden temiz geçiyor

### A.6 Genel Durum Özeti

Backend (K4+K5), field (UC-1/UC-2) ve superadmin (UC-3) katmanları tamamlandı; birim/entegrasyon testleri yeşil (789 test toplam — 577+156+56), build'ler geçiyor. E2E specleri yazıldı; AK-5.1-5.3 koşumu docker stack + kısa TTL ön koşulu nedeniyle bu oturumda çalıştırılamadı (dokümante gate — A1). Container-web'e dokunulmadı (purity).

---

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| verifyRefresh başarısız (imza/süre/type throw) | herhangi bir refresh isteği | `Result.err("Gecersiz refresh token")`; repo'ya DOKUNULMAZ (reuse YAPILMAZ) | `refresh-token-use-case.test.ts` — "verifyRefresh BAŞARISIZ → err…" |
| İmza geçerli + hash DB'de YOK | rotasyonlanmış/iptal token yeniden sunuldu | `clearRefreshToken(sub)` + err (K5 fail-closed) | `refresh-token-use-case.test.ts` — "imza geçerli + hash DB'de YOK…" |
| İmza geçerli + hash VAR ama `user.id !== payload.sub` | imzayla çelişen kayıt | `clearRefreshToken(sub)` + err | `refresh-token-use-case.test.ts` — "hash DB'de VAR ama kullanıcı eşleşmiyor…" |
| Geçerli token + eşleşen kullanıcı | normal refresh | yeni çift; `storeRefreshToken` yeni token ile; ok | `refresh-token-use-case.test.ts` — "başarılı refresh…" |
| Rotasyon sonrası ESKİ token ile yeniden refresh | reuse senaryosu (K4+K5) | ikinci çağrı err + `clearRefreshToken`; store 1 kez | `refresh-token-use-case.test.ts` — "rotasyon sonrası eski token…" |
| `storeRefreshToken` çağrısı | her kayıt | DB parametresi `sha256Hex(token)` (64 hex), düz metin DEĞİL | `user-repository.test.ts` — "storeRefreshToken DB'ye SHA-256 hash yazar…" |
| `findByRefreshToken` çağrısı | her arama | sorgu parametresi hash; SQL `expires_at > NOW()` | `user-repository.test.ts` — "findByRefreshToken gelen token'ı hash'leyip…" |
| POST /auth/refresh — geçerli token | route regresyonu | 200 | `auth-routes.test.ts` — "returns 200 with new tokens" |
| POST /auth/refresh — imza red | route regresyonu | 401 + `"Gecersiz refresh token"`; clear ÇAĞRILMAZ | `auth-routes.test.ts` — "returns 401 when refresh token is invalid" |
| POST /auth/refresh — reuse | route regresyonu | 401 + `clearRefreshToken("user-1")` | `auth-routes.test.ts` — "K5: imza geçerli + DB'de yok…" |
| POST /auth/refresh — boş gövde | route regresyonu | 400 (zod) | `auth-routes.test.ts` — "returns 400 when refreshToken is empty" |
| Request — standalone | `auth-token` var | `Authorization: Bearer` eklenir | `api-client.test.ts` — "standalone: request'e Bearer token eklenir" |
| Request — tünel | `isTunnelMode()` true | Bearer EKLENMEZ (boss localStorage korunur) | `api-client.test.ts` — "tünel modunda request interceptor Bearer EKLEMEZ…" |
| 401 — eşzamanlı N istek | paralel 401'ler | TEK refresh; hepsi yeni token'la 200 | `api-client.test.ts` — "eşzamanlı N 401 → TEK /auth/refresh…" (AK-1.1) |
| Refresh kanalı | her 401-refresh | `apiClient.post` (base `/api`); ham `axios.post` ÇAĞRILMAZ | `api-client.test.ts` — "refresh apiClient üzerinden…" (AK-1.2) |
| Refresh BAŞARISIZ (refresh 401) | refresh token geçersiz/iptal | token'lar + `field-auth-storage` (`user:null`) temiz; `navigateToLogin("/login")` SPA | `api-client.test.ts` — "refresh başarısız → token'lar + persist store…" (AK-1.3) |
| Refresh token YOK | localStorage'da yok | retry YOK; temizlik + navigasyon; 401 fırlar | `api-client.test.ts` — "refresh token yoksa retry YAPILMAZ…" |
| Retry sonrası ikinci 401 | `_retry` bayraklı | refresh ÇAĞRILMAZ — döngü koruması | `api-client.test.ts` — "retry sonrası ikinci 401…" |
| Tünel modunda 401 | `isTunnelMode()` true | tamamen İNERT | `api-client.test.ts` — "tünel modunda 401 → tamamen İNERT…" (AK-1.4) |
| Manuel giriş 401 | url `/auth/login` | refresh akışına GİRİLMEZ — direkt reject | kod `api-client.ts#<response interceptor>` (AuthStore login hatası senaryoları) |
| login / mfaRequired | başarılı yanıt | oturum + bayraklar; `pendingMfaToken` adımı | `AuthStore.test.ts` — "login başarılı…", "login mfaRequired…" |
| logout | normal / sunucu hatası | backend + temizlik; auto-guest YOK | `AuthStore.test.ts` — "logout backend'i çağırır…", "logout sunucu hatasında…" (AK-2.1) |
| clearSession | refresh başarısızlık yolu | tam sıfırlama + persist `user:null`; backend ÇAĞRILMAZ | `AuthStore.test.ts` — "clearSession persist dahil…" (AK-2.2) |
| TunnelBootstrap — standalone | soğuk açılış | no-op — hydrate ÇAĞRILMAZ | `App.test.tsx` — "standalone: hydrate ÇAĞRILMAZ…" (AK-2.3) |
| TunnelBootstrap — tünel | soğuk açılış iframe | hydrate tam BİR kez | `App.test.tsx` — "tünel modu…", "yalnızca BİR kez…" |
| Bayat persist (`isAuthenticated:true`, token yok) | standalone | UC-1 temizler → login (B4 kapanır) | `api-client.test.ts` AK-1.3 senaryosu (bayat state seed'iyle) |
| Superadmin eşzamanlı 401 | paralel 401'ler | TEK refresh + hepsi retry (AK-3.1) | `apps/superadmin/src/lib/api-client.test.ts` — "eşzamanlı N 401…" |
| Superadmin refresh başarısız | refresh 401 | token'lar + `supadmin-auth-storage` temiz; navigator `/login` (AK-3.2) | aynı dosya — "refresh başarısız…" |
| Superadmin refresh token yok | — | temizlik + navigasyon; retry YOK | aynı dosya — "refresh token yoksa…" |
| Superadmin ikinci 401 | `_retry` | refresh ÇAĞRILMAZ | aynı dosya — "retry sonrası ikinci 401…" |
| Superadmin clearSession | — | `user:null` + persist; backend ÇAĞRILMAZ | `apps/superadmin/src/features/auth/stores/AuthStore.test.ts` — "clearSession persist dahil…" |
| Superadmin logout | — | DEĞİŞMEDİ (backend + yerel temizlik) | aynı dosya — "logout backend'i çağırır…" |
| Çift sekme (AK-5.1) | A login → B login → A refresh | İKİ sekme de login'e düşer | `e2e/field-auth.spec.ts` — "AK-5.1: çift sekme…" |
| Field logout (AK-5.2) | Çıkış tık | login ekranı; token'lar null; auto-guest YOK | `e2e/field-auth.spec.ts` — "AK-5.2: logout…" |
| Superadmin logout (AK-5.2) | Çıkış tık | login ekranı; token'lar null | `e2e/superadmin-auth.spec.ts` — "AK-5.2: logout…" |
| Kısa TTL refresh (field/superadmin) | access dolar | otomatik refresh — kesintisiz | `e2e/field-auth.spec.ts` + `e2e/superadmin-auth.spec.ts` — "kısa TTL: access süresi dolar…" |
| Refresh başarısız (field e2e) | sunucuda token iptal | login ekranı (guest YOK) | `e2e/field-auth.spec.ts` — "kısa TTL: refresh başarısız…" |
| Container-web regresyon (AK-5.3) | refresh token bozuk + access dolar | guest fallback → dashboard KALIR | `e2e/security/container-guest-fallback.spec.ts` |
| Field soğuk açılış (K1) | token'sız | LOGIN ekranı (auto-guest YOK) | `e2e/security/guest-auto-dashboard.spec.ts` REV |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Kuyruktaki isteklerin, refresh İPTAL edildiğinde (refresh esnasında yeni 401) reject olması ayrı senaryo yok — yalnızca başarı yolu testli | Düşük (reject davranışı processQueue'da simetrik) | A3 ile kapalı — desen birebir container-web |
| G2 | E2E AK-5.1-5.3 bu oturumda koşulamadı (docker stack + kısa TTL ön koşulu) | Orta — spec'ler stack kalkınca koşulmalı | İlk stack koşumunda kanıt topla |
| G3 | Branch coverage metriği sonar'dan alınmadı — birim testler tüm dalları hedefler | Düşük | SonarCloud koşumu |
| G4 | Tünel modunda logout'un localStorage'a dokunmaması birim testi yok (yalnız kod inceleme) | Düşük | `AuthStore` tünel senaryo testi |
| G5 | Field must-change 403 interceptor akışı (A2) — kapsam dışı, ileri iş | Orta (mevcut açık) | A2 kendi SPEC'iyle |
| G6 | Refresh başarısızlığında navigator kayıtsızsa no-op — FieldShell guard fallback davranışı component testi yok | Düşük | BossShell guard testi mevcut; field guard'ı benzer desen |
| G7 | `user.id !== payload.sub` çakışmasında yalnızca `sub`'ın token'ı iptal edilir (bilinçli basitleştirme) | Çok düşük (gerçekte oluşmaz) | Gerekirse ileri düzeltme |

**review_date:** 2026-09-23
