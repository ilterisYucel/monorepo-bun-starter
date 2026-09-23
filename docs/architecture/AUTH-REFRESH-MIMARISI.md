---
status: active
space: architecture
tags: [mimari, auth, refresh-token, jwt, interceptor, asvs, spec]
review_date: 2026-09-23
---

# Auth-Refresh Düzeltmesi — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-09-23) — implementasyon tamamlandı; kapanış: [AUTH-REFRESH-KAPANIS.md](./AUTH-REFRESH-KAPANIS.md).
> **Format:** [SPEC-SABLONU.md](./SPEC-SABLONU.md) (kanonik şablon).
> **İlişkili:** [OWASP ASVS Level 2](../standards/owasp-asvs-level2.md) (V2/V3/V8), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (tünel oturum deseni — cookie altyapısı referansı).

---

## 1. Amaç ve Bağlam

**Problem:** Field uygulamasında access token yenilenemiyor ("bazen refreshleyemiyor"); uygulama login ekranına da redirect etmiyor, etse bile login ekranı görüntülenmiyor. Aynı sınıf sorunlar superadmin'de mevcut; backend'de refresh token yaşam döngüsünün güvenlik zafiyetleri var.

**Kapsam:**

| Katman | Kapsam |
|:-------|:-------|
| `apps/field` | Interceptor yeniden yazımı (queue + tünel guard), auto-guest kaldırma, tam state temizliği, SPA navigasyon |
| `apps/superadmin` | Aynı queue + state temizliği (tünel yok) |
| `services/web-service` | Refresh token'ın DB'de SHA-256 hash'li saklanması + reuse tespiti |
| `apps/container-web` | **DEĞİŞMEZ** — referans uygulama; yalnızca regresyon e2e'si |
| `packages/*`, tünel protokolü, ws-tunnel | **DEĞİŞMEZ** |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-09-23)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| **K1** | Auto-guest **yalnızca container-web** içindir (fiziksel konteyner ekranı: refresh ölse bile dashboard görünür kalır — `apps/container-web/src/lib/api-client.ts#reLoginAsGuest` @9c65a89). | Field'deki `GuestBootstrap` ve logout-sonrası auto-guest **KALDIRILIR**; refresh ölümü = **login ekranı**. Superadmin'de zaten yok. |
| **K2** | Backend'de **çoklu oturum tablosu YOK** — kullanıcı başına tek refresh token kalır. | `user_refresh_tokens` tablosu açılmaz; şema değişmez. |
| **K3** | Logout: **sunucuda iptal, tüm oturumlar düşer.** | Mevcut davranış korunur (`logout-use-case.ts#execute` → `clearRefreshToken`). Çoklu sekmede logout diğer sekmeyi de düşürür — kabul edilen davranış, dokümante. |
| **K4** | Refresh token DB'de **SHA-256 hash'li** saklanır (düz metin biter). | `user-repository.ts` store/find hash üzerinden çalışır; aynı kolon, şema değişikliği yok. |
| **K5** | Refresh token **reuse tespiti**: rotasyonlanmış token tekrar sunulursa saklı token da iptal (OWASP). | Fail-closed: iki sekme senaryosunda ikisi de düşer (§7). |
| **K6** | localStorage → HttpOnly cookie migrasyonu **AYRI iş paketi**. | Bu pakette yapılmaz; repo'nun bilinen açığı olarak kalır (`owasp-asvs-level2.md` §V8). §10'da ileri iş olarak referanslanır. |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------------------|
| **B1** | **Field'de eşzamanlı refresh yarışı.** Access token (15 dk) dolunca dashboard paralel N istek 401 atar → N ayrı `/auth/refresh` aynı refresh token'la gider → backend ilk başarılı istekte token'ı rotasyonla değiştirir → kalan N-1 istek "Gecersiz refresh token" alır → her biri token'ları siler + login'e atar. Queue YOK. | `apps/field/src/lib/api-client.ts#<interceptor>` (queue yok); rotasyon `services/web-service/src/application/use-cases/refresh-token-use-case.ts#execute` @9c65a89 |
| **B2** | **Field: ham origin-göreli refresh.** `axios.post("/api/auth/refresh")` doğrudan `axios` üzerinden — `apiClient`/`apiBaseUrl()` baypas edilir. Tünel modunda (boss iframe `/fields/:fid/ui`) istek **boss origin'ine** gider. | `apps/field/src/lib/api-client.ts#<response interceptor>`; doğru taban `api-base.ts#apiBaseUrl` |
| **B3** | **Field: tünel modunda 401-refresh akışı inert değil.** Tünelde iframe boss origin'inin localStorage'ını paylaşır; interceptor `auth-token`/`auth-refresh-token` okuyup yazar — boss'un kullandığı AYNI anahtarlar. 401'de boss'un token'ları boss `/api`'sine gider → başarıda ezilir, başarısızlıkta silinir. container-web'de guard var; field'de yok. | `apps/container-web/src/lib/api-client.ts#<response interceptor>` (`isTunnelMode()` → reject) vs field'de yok; `apps/field/src/lib/api-base.ts#isTunnelMode` tanımlı ama interceptor'da kullanılmıyor |
| **B4** | **Field: başarısızlıkta persist state temizlenmiyor → kilitlenme.** Interceptor yalnızca iki token anahtarını siler; zustand persist (`field-auth-storage`) bayat `user` + `isAuthenticated:true` taşır. Reload → `GuestBootstrap` koşulu `!token && !isAuthenticated` DOĞRU olamaz → guest denenmez, FieldShell bayat kullanıcıyla render → tüm API 401 → döngü. Login'e gidilse bile `LoginPage:19` `isAuthenticated && user` görünce anında dashboard'a döner. | `api-client.ts#<interceptor>` (yalnızca 2 anahtar); `App.tsx#GuestBootstrap`; `LoginPage.tsx#LoginPage` (`isAuthenticated && user` koşulu); persist `AuthStore.ts#<persist yapılandırması>` |
| **B5** | **Backend: kullanıcı başına TEK refresh token (sistemik).** İkinci giriş ilk sekmenin token'ını ezer; logout global temizler. K2 kararıyla KABUL EDİLEN davranış — düzeltilmez, dokümante edilir. | `user-repository.ts#storeRefreshToken` (tek kolon overwrite), `user-repository.ts#clearRefreshToken` (global clear) |
| **B6** | **Refresh token DB'de DÜZ METİN.** DB sızıntısı = tüm aktif refresh token'lar ifşa. K4 kararıyla hash'e geçilir. | `user-repository.ts#storeRefreshToken` |

---

## 4. Mimari

### 4.1 Field — standalone mod (saha cihazı, `/field/:fid`)

```
API isteği (React Query hook'ları, paralel)
        │
        ▼
apiClient interceptor (field)
  ├─ request: Authorization: Bearer <access>
  ├─ response 401:
  │    ├─ isTunnelMode()? ──evet──► Promise.reject (İNERT — cookie oturumu, §4.2)
  │    ├─ _retry? ──evet──► Promise.reject (döngü koruması)
  │    ├─ isRefreshing? ──evet──► failedQueue.push (bekle)
  │    └─ hayır ──► tek-uçuş refresh:
  │          apiClient.post("/auth/refresh", { refreshToken })   ← apiBaseUrl tabanlı
  │          ├─ başarı ──► token'ları yaz + queue'yu boşalt + orijinal isteği retry
  │          └─ başarısız ──► clearAuthState() (tokenlar + persist store)
  │                            + router.navigate("/login")       ← reload YOK
  ▼
```

### 4.2 Field — tünel modu (boss iframe, `/fields/:fid/ui`)

- Kimlik doğrulama `field_session` cookie'sindedir (HttpOnly, Path-scoped — boss'ta `field-session-routes.ts#<session route>` üretir).
- localStorage'a token YAZILMAZ (mevcut: `AuthStore.ts#persistTokens` guard'ı) — korunur.
- Interceptor 401'de **tamamen inerttir** (B3 düzeltmesi): refresh denenmez, localStorage'a dokunulmaz, navigasyon yapılmaz.
- Açılışta `hydrateSessionAuth()` (`session-auth.ts#hydrateSessionAuth`) `GET /api/auth/session` ile kullanıcıyı hydrate eder — `GuestBootstrap` kaldırılınca bu akış **`TunnelBootstrap`** adıyla korunur (UC-2).

### 4.3 Superadmin (boss tier, tünel yok)

```
401 ──► tek-uçuş refresh (queue) ──► başarısız ──► clearAuthState + router.navigate("/login")
```

### 4.4 Container-web — DEĞİŞMEZ (referans)

`apps/container-web/src/lib/api-client.ts#<response interceptor>` zaten hedef desenin referansıdır: `isRefreshing` + `failedQueue`, `isTunnelMode()` guard, `clearAuthState`, refresh başarısızlığında **guest fallback** (K1 — korunur).

### 4.5 Backend — refresh akışı (K4 + K5 sonrası)

```
POST /api/auth/refresh { refreshToken }
  │
  ▼
RefreshTokenUseCase.execute(token)
  1. verifyRefresh(token)            ← imza/zaman/type doğrulaması (değişmez)
  2. findByRefreshToken(hash(token)) ← K4: SHA-256 hash eşleştirmesi
     ├─ BULUNDU ──► rotasyon: yeni çifti üret, storeRefreshToken(hash(yeni))
     └─ BULUNAMADI ──► K5 reuse tespiti: imza GEÇERLİyse (payload.sub var)
                        clearRefreshToken(sub)  ← saklı token da iptal (fail-closed)
                        → "Gecersiz refresh token"
```

---

## 5. Purity Kuralları (ZORUNLU)

1. **container-web'e DOKUNULMAZ** — referans uygulamadır; değişiklik yalnızca regresyon e2e spec'iyle kanıtlanır (AK-5.3).
2. **Çoklu oturum tablosu AÇILMAZ** (K2) — `users.refresh_token` tek kolon kalır; migration yok.
3. **Tünel protokolü genişlemez** — ws-tunnel, `field_session`/`container_session` akışları, rbac sessionAuthenticator değişmez.
4. **`packages/*` değişmez** — bu iş tamamen `apps/field`, `apps/superadmin`, `services/web-service` içindedir.
5. **Auto-guest yalnızca container-web'de yaşar** (K1) — field/superadmin kodunda `guest` parolası hardcode'u (`GUEST_PASSWORD`) KALDIRILIR; yeni kodda bu kavram görünmez.
6. Backend use-case imzaları (`IUserRepository`, `ITokenService`) DEĞİŞMEZ — K4/K5 içeride gerçekleşir; route katmanı değişmez.

---

## 6. Use Case'ler

### 6.1 UC-1 — Field interceptor yeniden yazımı (tek-uçuş refresh + tünel guard)

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: 401-yenileme interceptor'ının container-web desenine hizalanması (queue, guard, apiBaseUrl tabanlı refresh, tam state temizliği, SPA navigasyon).
- hariç: must-change 403 akışı (A2), cookie migrasyonu (K6), queue limiti (A3), tünel protokolü değişikliği.

**Akış:**
1. Request interceptor: standalone modda `auth-token` varsa `Authorization: Bearer` ekler (tünelde token zaten yok — `persistTokens` guard'ı yazmamıştır).
2. Response 401: `isTunnelMode()` ise `Promise.reject` — İNERT (hiçbir yan etki yok).
3. `originalRequest._retry` set ise `Promise.reject` — döngü koruması.
4. `isRefreshing` ise `failedQueue.push` — diğer istekler tek refresh'i bekler.
5. İlk 401: `apiClient.post("/auth/refresh", { refreshToken })` — **ham `axios.post` YASAKTIR** (B2).
6. Başarı: token'lar yazılır, `processQueue(null, accessToken)` ile kuyruk boşaltılır, orijinal istek `_retry=true` ile tekrar gönderilir.
7. Başarısızlık: `clearAuthState()` (iki token anahtarı + `useAuthStore.getState().clearSession()` ile persist store) + `router.navigate("/login")` — **`window.location.href` YASAKTIR** (B4).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Interceptor MUST eşzamanlı 401'lerde TEK refresh üretir (single-flight) | AK-1.1 |
| FR-1.2 | Refresh MUST `apiClient` üzerinden apiBaseUrl tabanlı yapılır; ham origin-göreli `axios.post` YASAK | AK-1.2 |
| FR-1.3 | Refresh başarısızlığında MUST tam state temizliği + SPA navigasyon (reload YOK) | AK-1.3 |
| FR-1.4 | Tünel modunda 401 MUST tamamen inert (refresh/localStorage/navigasyon yok) | AK-1.4 |

**Kabul Senaryoları (GWT):**

> AK başına en az 1 senaryo — Given/When/Then (test üretiminin girdisi).

1. **AK-1.1 — GIVEN** access token süresi dolmuş ve N paralel istek 401 almış **WHEN** interceptor ilk 401'i işler **THEN** tam olarak 1 `/auth/refresh` çağrısı olur ve tüm istekler yeni token'la retry edilip başarılı döner.
2. **AK-1.2 — GIVEN** 401 alan bir istek refresh başlatır **WHEN** refresh isteği gönderilir **THEN** istek `apiClient` üzerinden baseURL'li gider ve ham `axios.post` ÇAĞRILMAZ.
3. **AK-1.3 — GIVEN** refresh çağrısı başarısız (401) **WHEN** interceptor hata yolunu işler **THEN** `auth-token`/`auth-refresh-token`/`field-auth-storage` temizlenir ve `/login`'e SPA navigasyon yapılır (reload YOK).
4. **AK-1.4 — GIVEN** uygulama tünel modunda (boss iframe) ve istek 401 alır **WHEN** interceptor yanıtı işler **THEN** refresh denenmez, localStorage DEĞİŞMEZ, navigasyon yapılmaz (inert).

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Eşzamanlı N 401 → **TEK** `/auth/refresh` isteği; kalan istekler queue'da bekler ve yeni token'la retry olur (B1) | unit (axios adapter mock + sayaç) | 🟢 |
| AK-1.2 | Refresh `apiClient` (apiBaseUrl) üzerinden yapılır; ham origin-göreli `axios.post` KALDIRILDI (B2) | unit + kod inceleme | 🟢 |
| AK-1.3 | Refresh başarısızlığında: `auth-token`/`auth-refresh-token`/`field-auth-storage` (user null + isAuthenticated false) temizlenir + `/login`'e SPA navigasyon, reload yok (B4) | unit (jsdom) + e2e | 🟢 |
| AK-1.4 | Tünel modunda 401 → interceptor tamamen inert: refresh denenmez, localStorage'a dokunulmaz, navigasyon yok (B3) | unit | 🟢 |

**T Görev Listesi:**
- [x] T-4: `api-client.ts` interceptor yeniden yazımı (queue + guard + clearAuthState + router.navigate)
- [x] T-6: `api-client.test.ts` güncelleme + AK-1.x testleri (kırmızı → yeşil)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Refresh çağrısının kendisi 401 | `_retry` koruması döngüyü keser → clearSession + `/login` |
| Refresh sırasında logout | `logout` token'ları temizler; süren refresh başarılı dönse bile sonraki 401 `_retry` ile kesilir; queue reject olur |
| `router` import'unda circular dependency (`lib` → `app/router`) | T-4'te çözülür: `router.navigate` doğrudan import veya window-event/`navigate` callback enjeksiyonu — desen T-4'te kararlaştırılıp testle sabitlenir |
| localStorage erişimi engelli (gizli mod istisnaları) | try/catch — `clearAuthState` kontrollü; uygulama çökmez |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/field/src/lib/api-client.ts` | Interceptor yeniden yazımı (ana değişiklik) |
| `apps/field/src/lib/api-client.test.ts` | Yeni davranış testleri |
| `apps/field/src/lib/api-base.ts` | DEĞİŞMEZ — `isTunnelMode`/`apiBaseUrl` kaynağı |
| `apps/field/src/features/auth/stores/AuthStore.ts` | `clearSession` action'ı (UC-2) |

### 6.2 UC-2 — Field auto-guest kaldırma + TunnelBootstrap

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `GuestBootstrap` sökümü, `loginAsGuest` + `GUEST_PASSWORD` hardcode kaldırma, logout-sonrası auto-guest kaldırma, `clearSession` action'ı, tünel hydrate'inin `TunnelBootstrap` olarak korunması.
- hariç: tünel hydrate mekanizmasının değiştirilmesi (`session-auth.ts` DEĞİŞMEZ), LoginPage davranışı.

**Akış:**
1. `AuthStore`: `loginAsGuest` ve `GUEST_USERNAME`/`GUEST_PASSWORD` kaldırılır.
2. `logout()`: backend logout + token temizliği + state sıfırlama korunur; sonundaki `await get().loginAsGuest()` kaldırılır — logout → login ekranı.
3. `clearSession` action'ı eklenir: `logout`'un state-temizleme kısmı (backend çağrısı YOK, auto-guest YOK) — interceptor'ın refresh-başarısızlık yolundan çağrılır; persist middleware `set` ile bayatsız state'i yazar.
4. `App.tsx`: `GuestBootstrap` → `TunnelBootstrap`: `isTunnelMode()` ise `void hydrateSessionAuth()`; değilse no-op (standalone'da kullanıcı login ekranından girer — mevcut FieldShell guard'ı).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Field kodunda auto-guest olmamalıdır (GuestBootstrap/loginAsGuest/GUEST_PASSWORD YOK) | AK-2.1 |
| FR-2.2 | `clearSession` MUST persist dahil tam temizler; backend çağrısı ve auto-guest YAPMAZ | AK-2.2 |
| FR-2.3 | `TunnelBootstrap` MUST tünel hydrate'ini korur; standalone'da no-op | AK-2.3 |

**Kabul Senaryoları (GWT):**

> AK başına en az 1 senaryo — Given/When/Then (test üretiminin girdisi).

1. **AK-2.1 — GIVEN** logout tamamlanmış **WHEN** state temizlenir **THEN** guest girişi DENENMEZ ve kullanıcı login ekranına düşer.
2. **AK-2.2 — GIVEN** oturum açık (persist dahil) **WHEN** `clearSession` çağrılır **THEN** tüm bayraklar sıfırlanır, persist'e `user:null` yazılır, backend ÇAĞRILMAZ.
3. **AK-2.3 — GIVEN** uygulama tünel modunda açılır **WHEN** `TunnelBootstrap` çalışır **THEN** `hydrateSessionAuth` çağrılır; standalone'da ÇAĞRILMAZ.

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Field'de auto-guest YOK: `GuestBootstrap` yok, `logout` sonrası guest girişi yok, `GUEST_PASSWORD` hardcode'u yok (K1) | unit + kod inceleme | 🟢 |
| AK-2.2 | `clearSession` persist dahil tam temizler; backend çağrısı ve auto-guest YAPMAZ | unit | 🟢 |
| AK-2.3 | `TunnelBootstrap` tünel hydrate'ini korur; standalone'da no-op | unit | 🟢 |

**T Görev Listesi:**
- [x] T-5: `AuthStore.ts` (loginAsGuest kaldırma, logout auto-guest kaldırma, clearSession) + `App.tsx` GuestBootstrap → TunnelBootstrap
- [x] T-6: `AuthStore.test.ts` güncelleme (eski auto-guest beklentileri sökülür) + AK-2.x testleri

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Soğuk açılış, token yok (standalone) | Login ekranı — auto-guest denenmez (K1) |
| Soğuk açılış, tünel modu | `TunnelBootstrap` hydrate eder; başarısızsa mevcut guard ekranı (davranış değişmez) |
| Bayat persist (`isAuthenticated:true` ama token yok) | UC-1'in `clearSession`'ı bu durumu temizler; `LoginPage` normal çalışır (B4 kapanır) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/field/src/features/auth/stores/AuthStore.ts` | guest kaldırma + `clearSession` |
| `apps/field/src/features/auth/stores/AuthStore.test.ts` | Yeni beklentiler |
| `apps/field/src/app/App.tsx` | GuestBootstrap → TunnelBootstrap |
| `apps/field/src/features/auth/session-auth.ts` | DEĞİŞMEZ |
| `apps/field/src/pages/LoginPage.tsx` | DEĞİŞMEZ (B4'ün çözümü bayat persist temizliğindedir) |

### 6.3 UC-3 — Superadmin interceptor hizalama

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: queue + `_retry` + `clearAuthState` + `router.navigate("/login")`, `AuthStore.clearSession`.
- hariç: tünel guard (superadmin tünellenmez), auto-guest (zaten yok).

**Akış:**
1. `api-client.ts` UC-1 desenine hizalanır (tünel guard adımı HARİÇ).
2. `AuthStore.ts`: `clearSession` eklenir (`supadmin-auth-storage` persist temizliği dahil); `logout` değişmez.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Superadmin interceptor MUST tek-uçuş refresh + queue retry uygular (tünel guard'sız) | AK-3.1 |
| FR-3.2 | Refresh başarısızlığında MUST tam state temizliği + SPA `/login` | AK-3.2 |

**Kabul Senaryoları (GWT):**

> AK başına en az 1 senaryo — Given/When/Then (test üretiminin girdisi).

1. **AK-3.1 — GIVEN** N paralel istek 401 almış **WHEN** interceptor çalışır **THEN** TEK `/auth/refresh` olur ve tüm istekler yeni token'la retry edilir.
2. **AK-3.2 — GIVEN** refresh başarısız (401) **WHEN** hata yolu işlenir **THEN** `supadmin-auth-storage` dahil temizlenir ve `/login`'e SPA navigasyon yapılır.

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Eşzamanlı N 401 → tek refresh + queue retry (AK-1.1 karşılığı) | unit | 🟢 |
| AK-3.2 | Refresh başarısızlığında tam state temizliği + SPA `/login` navigasyonu (AK-1.3 karşılığı) | unit | 🟢 |

**T Görev Listesi:**
- [x] T-7: `api-client.ts` queue + `AuthStore.clearSession` + navigasyon
- [x] T-8: Superadmin testleri (AK-3.1/AK-3.2)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Refresh çağrısının kendisi 401 | `_retry` koruması → clearSession + `/login` |
| Circular dependency (lib → app/router) | T-7'de UC-1 ile aynı desen |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/superadmin/src/lib/api-client.ts` | Queue + clearAuthState + navigasyon |
| `apps/superadmin/src/features/auth/stores/AuthStore.ts` | `clearSession` |
| `apps/superadmin/src/app/router.tsx` | DEĞİŞMEZ (navigasyon hedefi) |

### 6.4 UC-4 — Backend: refresh token SHA-256 hash + reuse tespiti

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `UserRepository` store/find hash dönüşümü, `RefreshTokenUseCase` reuse tespiti, `LogoutUseCase` dokümante koruma.
- hariç: çoklu oturum tablosu (K2), route katmanı değişikliği, cookie migrasyonu (K6).

**Akış:**
1. `storeRefreshToken(userId, token, expiresAt)`: `crypto.createHash("sha256").update(token).digest("hex")` → aynı kolona hash yazılır (K4).
2. `findByRefreshToken(token)`: gelen token hash'lenir → `refresh_token = hash AND refresh_token_expires_at > NOW()` (K4).
3. `RefreshTokenUseCase.execute`:
   - `verifyRefresh` başarısız → `Result.err("Gecersiz refresh token")` — reuse YAPILMAZ.
   - verify başarılı + hash DB'de YOK → K5: `clearRefreshToken(payload.sub)` + err — rotasyonlanmış/iptal edilmiş token'ın tekrar sunulması olası hırsızlıktır; fail-closed hepsi düşer.
   - Başarı → yeni çift üretilir + `storeRefreshToken(hash(yeni))` + `AuthResponse` (rotasyon değişmez).
4. `LogoutUseCase` DEĞİŞMEZ — `clearRefreshToken` global iptal (K3).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | `storeRefreshToken` MUST DB'ye SHA-256 hash yazar; `findByRefreshToken` hash eşleştirir (düz metin YASAK) | AK-4.1 |
| FR-4.2 | İmzası geçerli ama DB'de yoksa MUST `clearRefreshToken(sub)` (reuse tespiti, fail-closed) | AK-4.2 |
| FR-4.3 | Başarılı refresh MUST yeni token'ı hash'li saklar (rotasyon); eski token reuse → iptal | AK-4.3 |
| FR-4.4 | `auth-routes` refresh rotası MUST davranışını korur (200/400/401) | AK-4.4 |

**Kabul Senaryoları (GWT):**

> AK başına en az 1 senaryo — Given/When/Then (test üretiminin girdisi).

1. **AK-4.1 — GIVEN** `storeRefreshToken` çağrılır **WHEN** token DB'ye yazılır **THEN** kolonda SHA-256 hash bulunur (düz metin DEĞİL); `findByRefreshToken` gelen token'ı hash'leyip eşleştirir.
2. **AK-4.2 — GIVEN** imzası geçerli ama DB'de hash'i olmayan token sunulur **WHEN** refresh çalışır **THEN** `clearRefreshToken(sub)` çağrılır ve err (401) döner.
3. **AK-4.3 — GIVEN** başarılı refresh rotasyon yapar **WHEN** eski token yeniden sunulur **THEN** reuse tespiti saklı token'ı iptal eder (401).
4. **AK-4.4 — GIVEN** refresh rotası farklı token'larla çağrılır **WHEN** sonuç işlenir **THEN** 200/400/401 davranışı DEĞİŞMEZ.

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | `storeRefreshToken` DB'ye SHA-256 hash yazar; `findByRefreshToken` hash eşleştirir; düz metin repo'ya yazılmaz (K4) | unit (fake db, hash assert) | 🟢 |
| AK-4.2 | Reuse tespiti: imzası geçerli ama DB'de yok → `clearRefreshToken` çağrılır (K5) | unit (use-case) | 🟢 |
| AK-4.3 | Rotasyon: başarılı refresh yeni token'ı hash'li saklar; eski token'la yeniden refresh → reuse → iptal (K4+K5 birlikte) | unit | 🟢 |
| AK-4.4 | `auth-routes` refresh rotası davranışı DEĞİŞMEDİ (200/400/401 senaryoları regresyon) | unit (route testi) | 🟢 |

**T Görev Listesi:**
- [x] T-1: JSDoc + sözleşmeler (`RefreshTokenUseCase`, `UserRepository`, interceptor sözleşmeleri)
- [x] T-2: `user-repository.ts` hash + `refresh-token-use-case.ts` reuse tespiti
- [x] T-3: Backend testleri (AK-4.x) — kırmızı → yeşil

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Çift sekme, tek kullanıcı (B5) | Sekme B login → DB token değişir; sekme A refresh'te eski token → K5 iptal → İKİ sekme de login'e düşer (fail-closed, K2+K5 kabulü — e2e AK-5.1) |
| Süresi dolmuş refresh token | `verifyRefresh` throw → reuse YAPILMAZ → 401; frontend clearSession + login |
| SHA-256 çakışması | Pratikte yok; tek kolon gereği aynı kullanıcıda iki token aynı anda bulunamaz |
| Hash kolonunda eski (düz metin) veri | Migration gerekmez: eski değerler hash'le eşleşmez → doğal olarak geçersiz; kullanıcı yeniden login olur (dokümante) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/persistence/user-repository.ts` | SHA-256 hash (store/find) |
| `services/web-service/src/application/use-cases/refresh-token-use-case.ts` | Reuse tespiti |
| `services/web-service/src/application/use-cases/logout-use-case.ts` | DEĞİŞMEZ (kod inceleme maddesi) |
| `services/web-service/src/domain/repositories/IUserRepository.ts` | DEĞİŞMEZ |
| `services/web-service/src/presentation/routes/auth-routes.ts` | DEĞİŞMEZ (regresyon testi) |

### 6.5 UC-5 — E2E doğrulama

**Status:** 🟡 Geliştirmede (specler yazıldı — stack koşumu bekliyor)

**Kapsam:**
- dahil: field auth akış specleri (refresh, çift sekme, logout), superadmin auth, container-web regresyonu — kısa access TTL'li test stack (A1).
- hariç: perf testleri, MFA e2e'leri.

**Akış:**
1. Test stack: `auth.accessTokenExpirySeconds` kısa değerle çalıştırılır (A1 — env anahtarı test yazımında netleşir).
2. Field standalone: access expiry → otomatik refresh → dashboard kesintisiz; refresh başarısız → login ekranı (auto-guest YOK).
3. Çift sekme: A login → B login → A refresh → iki sekme de login'e düşer (AK-5.1).
4. Logout: field/superadmin → login ekranı görünür.
5. Container-web regresyonu: refresh başarısızlığında guest fallback → dashboard kalır (K1 korunmuş).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | E2E MUST çift sekme senaryosunu kanıtlar (B login → A refresh → ikisi de login'e düşer) | AK-5.1 |
| FR-5.2 | E2E MUST field/superadmin logout → login ekranını kanıtlar (auto-guest YOK) | AK-5.2 |
| FR-5.3 | E2E MUST container-web guest fallback regresyonunu kanıtlar (dashboard kalır) | AK-5.3 |

**Kabul Senaryoları (GWT):**

> AK başına en az 1 senaryo — Given/When/Then (test üretiminin girdisi).

1. **AK-5.1 — GIVEN** sekme A girişli ve sekme B aynı kullanıcıyla giriş yapmış **WHEN** A'nın access token'ı dolar ve eski refresh token'la yenileme dener **THEN** İKİ sekme de login ekranına düşer (K2+K5 fail-closed).
2. **AK-5.2 — GIVEN** field/superadmin'de oturum açık **WHEN** logout tıklanır **THEN** login ekranı görünür ve auto-guest DENENMEZ.
3. **AK-5.3 — GIVEN** container-web'de refresh token bozuk ve access token dolmuş **WHEN** refresh başarısız olur **THEN** guest fallback çalışır ve dashboard KALIR (login'e düşmez).

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Çift sekme: B login, A refresh → her iki sekme login'e düşer (K2+K5 dokümante davranış) | Playwright | 🟡 spec yazıldı |
| AK-5.2 | Field logout → login ekranı (auto-guest YOK); superadmin logout → login | Playwright | 🟡 spec yazıldı |
| AK-5.3 | Regresyon: container-web refresh başarısızlığında guest fallback ile dashboard'da kalır (K1) | Playwright | 🟡 spec yazıldı |

**T Görev Listesi:**
- [x] T-9: E2E specleri (field-auth, superadmin auth, container-web regresyon) + kısa TTL stack notu

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| E2E ortamında MFA kapalı (`MFA_ENABLED=false`) | Mevcut `.env.field` değeri korunur; spec'ler MFA adımı beklemez |
| Test stack TTL env'i bulunamazsa | A1: specler skip veya uzun TTL'le dokümante edilmiş kısıtlı koşum |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `e2e/` (field-auth spec'leri) | Yeni/revize specler |
| `deployment/` test stack env | A1 TTL enjeksiyonu |
| `docs/roadmap/fl-test-envanteri.md` | E2E koşum notu güncellemesi (T-10 ile) |

### 6.6 UC-6 — Kapanış dokümantasyonu

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: KAPANIŞ (Doğrulama + Test Kapsamı tek doküman) + test-envanteri + graphify güncelleme.
- hariç: eski SPEC'lerin yeni formata dönüşümü (geriye dönük zorunluluk yok).

**Akış:**
1. `AUTH-REFRESH-KAPANIS.md` — §A Doğrulama (değişiklik matrisi `#sembol` referanslı, AK kanıtları, sapmalar, gözle kontrol) + §B Test Kapsamı (matris + boşluklar) — TEK doküman.
2. `docs/roadmap/test-envanteri.md` — yeni testler `bun run test:inventory` ile işlenir.
3. `bun run spec:check` — lint kapısı.
4. `graphify update .`

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Güvenlik-kritik modüllerde MUST ≥%90 branch; yeni kod ≥%70 satır | AK-6.1 |
| FR-6.2 | KAPANIŞ dokümanı MUST güncel ve AK tabloları `🟢 Doğrulanmış` işaretli | AK-6.2 |

**Kabul Senaryoları (GWT):**

> AK başına en az 1 senaryo — Given/When/Then (test üretiminin girdisi).

1. **AK-6.1 — GIVEN** güvenlik-kritik modüller test edilmiş **WHEN** coverage koşulur **THEN** branch ≥%90 / satır ≥%70 sağlanır.
2. **AK-6.2 — GIVEN** kapanış yapılır **WHEN** KAPANIŞ dokümanı kontrol edilir **THEN** AK tabloları 🟢 işaretli ve `review_date` günceldir.

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Güvenlik-kritik modüller (`refresh-token-use-case`, field/superadmin interceptor) ≥%90 branch; yeni kod ≥%70 satır | coverage | 🟢 (birim düzeyinde; sonar tam metriği bekliyor) |
| AK-6.2 | KAPANIŞ güncel ve AK tabloları `🟢 Doğrulanmış` işaretli | gözle | 🟢 |

**T Görev Listesi:**
- [x] T-10: KAPANIŞ + test-envanteri + `graphify update .`

**Edge Cases:** — (yok)

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `docs/architecture/AUTH-REFRESH-KAPANIS.md` | Yeni (Faz 5 — Doğrulama + Test Kapsamı) |
| `docs/roadmap/test-envanteri.md` | Güncelleme (otomatik envanter) |

---

## 7. Yaşam Döngüsü ve Hata Kategorileri

> JSDoc aşamasının girdisi — state'ler, edge-case'ler, hata kategorisi, yan etkiler, limitler.

| Durum | Davranış |
|:------|:---------|
| 401 + geçerli refresh (field standalone / superadmin) | Tek-uçuş refresh → retry (yan etki: token + store tazelenir) |
| 401, refresh zaten sürüyor | failedQueue'da bekle (limit: axios timeout 15 sn üst sınır — A3) |
| Refresh BAŞARISIZ (field/superadmin) | `clearAuthState` + `router.navigate("/login")` — beklenen hata (oturum sonu), throw yok |
| Refresh çağrısının kendisi 401 | `_retry` döngü koruması → clearSession + login |
| Tünel modunda 401 (field) | İnert — hiçbir yan etki yok (boss iframe koruması) |
| Refresh BAŞARISIZ (container-web) | DEĞİŞMEZ: guest fallback (K1) |
| Logout (field/superadmin) | Backend `clearRefreshToken` (global, K3) + clearSession → login; auto-guest YOK |
| Soğuk açılış standalone (field) | Login ekranı — auto-guest YOK (K1) |
| Soğuk açılış tünel (field) | `TunnelBootstrap` → `GET /auth/session` hydrate |
| Backend: imza geçerli + hash DB'de yok | Reuse tespiti (K5): `clearRefreshToken` — beklenen güvenlik olayı, fail-closed |
| Backend: imza geçersiz | 401 — reuse YAPILMAZ |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Field/superadmin'de access token yenileme yarışı biter — eşzamanlı 401'lerde TEK refresh (B1) | unit sayaç (refreshCalls === 1) |
| SC-2 | Refresh ölümü her koşulda login ekranıyla sonuçlanır — kilitlenme/bayat dashboard YOK (B4) | unit + e2e |
| SC-3 | Tünel (boss iframe) oturumuna field interceptor'ı hiçbir yan etki üretmez (B3) | unit (inert) |
| SC-4 | DB sızıntısında aktif refresh token'lar ifşa olmaz (K4) | hash assert |
| SC-5 | Rotasyonlanmış token'ın yeniden sunumu oturumu iptal eder — fail-closed (K5) | unit reuse |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-1 sözleşmeleri (UC-1 interceptor, UC-2 clearSession, UC-4 hash/reuse) |
| 3. TEST | T-3, T-6, T-8, T-9 (kırmızı önce) |
| 4. IMPL | T-2, T-4, T-5, T-7 (yeşil + refactor) |
| 5. KAPANIŞ | `AUTH-REFRESH-KAPANIS.md` (Doğrulama + Test Kapsamı) + test-envanteri |

---

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| **A1** | E2E'de kısa access TTL: `ACCESS_TOKEN_EXPIRY_SECONDS` env'i (config definition zaten mevcut) — `docker-compose.{field,boss,container}.dev.yml`'e opsiyonel passthrough eklendi (varsayılan 900); zamanlama testleri `E2E_SHORT_TTL=1` gate'iyle koşar | Kapalı (2026-09-23) |
| **A2** | Field'de must-change 403 akışı (`apps/container-web/src/lib/api-client.ts#isMustChangeError` deseni) field'de yok — BU PAKETİN KAPSAMI DIŞI; ileri iş olarak not edilir | Bu pakette yapılmaz |
| **A3** | Queue limiti: refresh süresince bekleyen istek sınırı (container-web'de sınırsız dizi) — aynı davranış korunur; limit eklenmez | Kapalı (desen birebir) |
| **A4** | K5 reuse tespitinin çift-sekme UX'i (ikisi birden düşer) — kullanıcı K2 ile onayladı; e2e AK-5.1 davranışı resmi olarak sabitler | Kapalı |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **HttpOnly cookie migrasyonu (ASVS V8 açığı):** refresh token (ve access) localStorage → HttpOnly + Secure + SameSite cookie; CSRF koruması (SameSite + Origin doğrulaması); WS token akışı (`apps/container-web/src/contexts/RealtimeContext.tsx#<token okuma>` localStorage okur) cookie'ye hizalanır; tünel `field_session`/`container_session` deseni (`field-session-routes.ts#<session route>`, `rbac.ts#rbacPreHandler`) hazır altyapıdır. Kendi SPEC/onay/fazlarıyla ayrı paket.
2. **Çoklu oturum tablosu** (`user_refresh_tokens`): K2 gereği açılmadı; ihtiyaç doğarsa kendi SPEC'iyle.
3. **A2** — field/superadmin must-change 403 interceptor akışı.

---

## 12. T Görev Özeti

| Görev | İçerik | UC |
|:------|:-------|:---|
| **T-1** | JSDoc + sözleşmeler: `RefreshTokenUseCase` (reuse semantiği), `UserRepository` hash davranışı, field `api-client` interceptor sözleşmesi, `AuthStore.clearSession` | UC-1/2/4 |
| **T-2** | Backend: `user-repository.ts` SHA-256 hash (store/find) + `refresh-token-use-case.ts` reuse tespiti; `logout-use-case.ts` DEĞİŞMEZ (kod inceleme maddesi) | UC-4 |
| **T-3** | Backend testleri (AK-4.x) — kırmızı → yeşil; `auth-routes` refresh rotası regresyon testi | UC-4 |
| **T-4** | Field: `api-client.ts` interceptor yeniden yazımı (queue + guard + clearAuthState + router.navigate) | UC-1 |
| **T-5** | Field: `AuthStore.ts` (loginAsGuest kaldırma, logout auto-guest kaldırma, clearSession) + `App.tsx` GuestBootstrap → TunnelBootstrap | UC-2 |
| **T-6** | Field testleri (AK-1.x, AK-2.x) + mevcut testlerde eski auto-guest beklentilerinin sökümü | UC-1/2 |
| **T-7** | Superadmin: `api-client.ts` queue + `AuthStore.clearSession` + navigasyon | UC-3 |
| **T-8** | Superadmin testleri (AK-3.x) | UC-3 |
| **T-9** | E2E: field-auth (refresh, çift sekme AK-5.1, logout AK-5.2), superadmin auth, container-web regresyon (AK-5.3) — kısa TTL stack (A1) | UC-5 |
| **T-10** | KAPANIŞ + test-envanteri + `graphify update .` | UC-6 |
