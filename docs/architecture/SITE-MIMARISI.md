---
status: active
space: architecture
tags: [mimari, app, site, saha, spec]
review_date: 2026-11-10
---

# Site — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `APPS-MIMARISI.md` (indeks), `WEB-SERVICE-MIMARISI.md` (tier), `CONTAINER-MIMARISI.md`, `AUTH-MIMARISI.md`.

## 1. Amaç ve Bağlam

Tier 2 saha operatörü uygulaması — eski `apps/field`, yeni adı **SITE** (`apps/site`). Saha operatörü konteynerleri uzaktan görüntüler (talep-üzeri telemetri + tünel ile konteyner UI'ı) ve saha manevralarını çalıştırır. Container verisi kopyalanmaz; canlı veri yalnız latest snapshot push'u ile gelir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Site konteyner görünümü, uzak UI tüneli, manevra kataloğu/çalıştırma, auth refresh |
| hariç | Konteyner UI'ı (CONTAINER), backend tier uçları (WEB-SERVICE), kimlik semantiği (AUTH) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Container verisi KOPYALANMAZ: talep üzerine sorgu; canlı için yalnız latest snapshot push | Kaynak tek (konteyner) |
| K2 | Uzak UI tüneli: aynı outbound WS duplex; SPA `/fields/:fid/ui` altında iframe'de yaşar; login rotası da önekli | Tek tünel |
| K3 | Auth refresh: kuyruk + tünel guard; auto-guest kaldırıldı; tam state temizliği | Oturum sürekliliği |
| K4 | Site manevra kataloğu sunucudan (`GET /api/maneuvers`) | Tek kaynak |
| K5 | Rename `apps/field` → `apps/site` + tier rename: klasör/package/nx/compose/env/import + `SERVICE_TIER=site` + `tiers/site` + servis/compose adları `site-*`. Kimlik/wire adları korunur: `VITE_FIELD_ID`, `FIELD_ID`, `peerType:"field"`, `/fields/:fid/ui`. **2026-11-11:** `apps/demo-field` → `apps/site` (tek uygulama); eski site sürümü (`site-v1.1`) inceleme sonrası kaldırıldı | Davranış değişmez (A1) |
| K6 | **2026-11-24:** Zorunlu şifre değişimi sayfası (`/change-password`) site'a geri gelir. "UC-11: MFA/şifre değişimi sayfaları YOKTUR" kararı (`61058eb`) şifre değişimi için geri alınır; şifre değişimi MFA'dan bağımsızdır, MFA kayıt sayfası bu kararın dışında kalır (A3) | UC-4 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `api-base.ts` site ile birebir kopya — ortak frontend lib borcu | `apps/site/src/lib/api-base.ts` ↔ `apps/site/src/lib/api-base.ts` |
| B2 | `deriveDevicesFromSnapshot` cihaz türetimi testli ama sözleşme dokümanda değil | `apps/site/src/features/field-devices/hooks/useFieldDevices.ts` |
| B3 | Taze DB'de seed `admin`/`boss` `must_change_password=true` (env bayrağı yok; `MFA_ENABLED` yalnız MFA'yı kapatır); backend rbac şifre değişimi dışındaki tüm yolları 403 ile kapatır (`AUTH-MIMARISI.md` UC-4 allowlist kuralı), ama site'ta değişim ekranı ve guard yok → kullanıcı giriş yapar, ekran sessizce boş kalır | `services/web-service/src/presentation/middleware/rbac.ts#createAuthMiddleware`; `apps/site/src/pages/ChangePasswordPage.tsx` silindi @61058eb; `apps/site/src/lib/site-field.ts#postLoginDestination` |

## 4. Mimari

```text
apps/site
├ features/containers (useContainerData, useContainerTelemetry)
├ features/field-devices (deriveDevicesFromSnapshot)
├ features/pcs (derivePcsSummaries)
├ features/field-control (fieldManeuverApi, FieldManeuverPanel)
├ lib (api-base tünel, api-client refresh, site-field postLoginDestination)
├ layouts/DemoShell (auth guard + zorunlu şifre değişimi guard'ı — UC-4)
├ pages/ChangePasswordPage (zorunlu şifre değişimi — UC-4)
└ app/routes (önekli login + /change-password + site rotaları)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `apps/site/src/features/containers/hooks/useContainerData.ts#useContainerData` | Konteyner verisi |
| `apps/site/src/features/containers/hooks/useContainerTelemetry.ts#useContainerTelemetry` | Canlı telemetri |
| `apps/site/src/features/field-devices/hooks/useFieldDevices.ts#deriveDevicesFromSnapshot` | Cihaz türetimi |
| `apps/site/src/features/pcs/hooks/derivePcsSummaries.ts#deriveAllPcsSummaries` | PCS özeti |
| `apps/site/src/features/field-control/services/fieldManeuverApi.ts#fieldManeuverApi` | Manevra |
| `apps/site/src/lib/api-base.ts#isTunnelMode` | Tünel tespiti |
| `apps/site/src/lib/site-field.ts#postLoginDestination` | Giriş sonrası hedef (UC-4: şifre değişimi öncelikli) |
| `apps/site/src/pages/ChangePasswordPage.tsx#ChangePasswordPage` | Zorunlu şifre değişimi ekranı (UC-4) |
| `apps/site/src/features/auth/stores/AuthStore.ts#useAuthStore` | `changePassword` — yeni token çifti ile oturumu tazeler (mevcut) |

## 5. Purity Kuralları (ZORUNLU)

1. Konteyner verisi kopyalanmaz (K1).
2. Site UI'ı konteyner UI'ını yeniden yazmaz — tünelde iframe kullanır (K2).
3. Katalog UI'da tanımlanmaz (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Site Konteyner Görünümü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: konteyner listesi/özeti, talep-üzeri telemetri, latest snapshot push
- hariç: konteyner içi UI (CONTAINER)

**Akış:**
1. Site konteyner listesini alır.
2. Özet için latest snapshot; detay için talep-üzeri sorgu.
3. Cihaz/PCS özetleri türetilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Konteyner verisi talep üzerine alınır; canlı yalnız latest snapshot | AK-1.1 |
| FR-1.2 | Cihaz listesi snapshot'tan türetilir | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** site açık **WHEN** konteyner seçilir **THEN** veri konteynerden talep edilir
2. **AK-1.2 — GIVEN** snapshot **WHEN** cihazlar türetilir **THEN** eksik cihaz görünmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Talep-üzeri | unit (`useContainerData`) | ⬜ |
| AK-1.2 | Türetim | unit (`useFieldDevices`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Konteyner çevrimdışı | Boş/önceki veri |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/site/src/features/containers/**` | Görünüm |

### 6.2 UC-2 — Uzak UI Tüneli + Oturum

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `/fields/:fid/ui` öneki, iframe, login öneki, refresh guard
- hariç: tunnel çekirdeği (zero-trust)

**Akış:**
1. Site, konteyner UI'ını tünel subpath'inde iframe ile açar.
2. Aynı outbound WS duplex kullanılır.
3. Oturum guard'ı refresh'i yönetir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Uzak UI aynı tünelden subpath ile açılır | AK-2.1 |
| FR-2.2 | Login rotası da önekli çalışır | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** konteyner UI isteği **WHEN** iframe yüklenir **THEN** `/fields/:fid/ui` altında servis edilir
2. **AK-2.2 — GIVEN** oturum düştü **WHEN** login açılır **THEN** önek korunur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Tünel öneki | unit (`api-base`) | ⬜ |
| AK-2.2 | Login öneki | unit (`routes`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tünel kopması | Guard yönlendirir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/site/src/app/routes.tsx` | Rotalar |
| `apps/site/src/lib/api-base.ts` | Tünel |

### 6.3 UC-3 — Site Manevra Kataloğu/Çalıştırma

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: katalog, çalıştırma, sonuç
- hariç: manevra semantiği (KOMUT-MANEVRA)

**Akış:**
1. Katalog sunucudan alınır.
2. Manevra çalıştırılır; sonuç gösterilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Katalog yalnız sunucudan gelir | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** katalog güncellendi **WHEN** panel açılır **THEN** güncel katalog görünür

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Sunucu kataloğu | unit (`fieldManeuverApi`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Yetkisiz | Sunucu reddeder |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/site/src/features/field-control/**` | Manevra |

### 6.4 UC-4 — Zorunlu Şifre Değişimi

**Status:** 🟢 Doğrulanmış (2026-11-24 — KAPANIŞ `SITE-KAPANIS.md`; açık: SC-4 gözle deneme, ESLint — S4/S5)

**Kapsam:**
- dahil: `/change-password` rotası ve sayfası; `DemoShell` guard'ı; `postLoginDestination` önceliği; istemci tarafı ön doğrulama (en az 8 karakter, tekrar eşleşmesi); başarıda giriş sonrası hedefe yönlendirme
- hariç: backend enforcement ve şifre politikası (AUTH — sunucu tek yetkilidir, `min(8)/max(100)`); MFA kayıt sayfası (A3); tünel modunda şifre değişimi (AUTH K9 — cookie oturumunda enforcement yoktur); konteyner UI'ı (CONTAINER kendi `PrivateRoute`'unu taşır); görsel yeniden tasarım (mevcut `LoginPage` nova stili kullanılır); şifre değişimi sayfasında çıkış düğmesi (2026-11-24 developer kararı — KAPANIŞ S6)

**Akış:**
1. Kullanıcı giriş yapar; `postLoginDestination` `mustChangePassword=true` ve rol `guest` değilse `/change-password` döner.
2. Doğrudan korumalı bir rotaya gelinirse `DemoShell` aynı koşulda `/change-password`'e yönlendirir.
3. Kullanıcı mevcut şifre + yeni şifre + tekrarını girer; istemci ön doğrulaması geçerse `AuthStore.changePassword` çağrılır.
4. Sunucu yeni token çifti döner (AUTH K6); oturum tazelenir, `mustChangePassword=false` olur.
5. Kullanıcı `postLoginDestination` hedefine (`/projects`) yönlendirilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | System MUST `mustChangePassword=true` ve rol `guest` değilken korumalı rotaları (`DemoShell`) `/change-password`'e yönlendirmeli | AK-4.1 |
| FR-4.2 | System MUST `postLoginDestination`'da şifre değişimini saha kimliği kontrolünden ÖNCE döndürmeli (`{ path: "/change-password" }`) | AK-4.2 |
| FR-4.3 | System MUST yeni şifre 8 karakterden kısaysa ya da tekrarla eşleşmiyorsa hata göstermeli ve sunucuya istek atmamalı | AK-4.3 |
| FR-4.4 | System MUST başarılı değişimde oturumu yeni token'larla tazeleyip `postLoginDestination` hedefine `replace` ile gitmeli | AK-4.4 |
| FR-4.5 | System MUST sunucu hatasında hata mesajı göstermeli ve sayfada kalmalı | AK-4.5 |
| FR-4.6 | System MUST oturum yokken `/change-password`'i `/login`'e yönlendirmeli | AK-4.6 |
| FR-4.7 | System MUST `guest` rolünde ve tünel modunda şifre değişimi guard'ını uygulamamalı | AK-4.7 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** `admin` oturumu `mustChangePassword=true` **WHEN** `/projects` açılır **THEN** `/change-password`'e yönlendirilir ve proje sayfası render edilmez
2. **AK-4.2 — GIVEN** `mustChangePassword=true` kullanıcı ve boş `VITE_FIELD_ID` **WHEN** `postLoginDestination` çağrılır **THEN** `{ path: "/change-password" }` döner (saha kimliği hatası değil)
3. **AK-4.3 — GIVEN** şifre değişimi sayfası **WHEN** yeni şifre 7 karakter ya da tekrar farklı girilip gönderilir **THEN** ilgili hata mesajı görünür ve `changePassword` çağrılmaz
4. **AK-4.4 — GIVEN** geçerli form **WHEN** gönderilir ve sunucu 200 döner **THEN** `changePassword(eski, yeni)` bir kez çağrılır ve `/projects`'e `replace` ile gidilir
5. **AK-4.5 — GIVEN** geçerli form **WHEN** sunucu hata döner **THEN** "Şifre değiştirilemedi" mesajı görünür ve navigasyon olmaz
6. **AK-4.6 — GIVEN** oturum yok **WHEN** `/change-password` açılır **THEN** `/login`'e yönlendirilir
7. **AK-4.7 — GIVEN** `mustChangePassword=true` olan `guest` oturumu ya da tünel modu **WHEN** korumalı rota açılır **THEN** yönlendirme olmaz, sayfa render edilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Guard yönlendirir | unit (`DemoShell.test.tsx`) | 🟢 |
| AK-4.2 | Hedef önceliği | unit (`site-field.test.ts`) | 🟢 |
| AK-4.3 | İstemci ön doğrulaması | unit (`ChangePasswordPage.test.tsx`) | 🟢 |
| AK-4.4 | Başarı akışı | unit (`ChangePasswordPage.test.tsx`) | 🟢 |
| AK-4.5 | Hata akışı | unit (`ChangePasswordPage.test.tsx`) | 🟢 |
| AK-4.6 | Oturumsuz erişim | unit (`ChangePasswordPage.test.tsx`) | 🟢 |
| AK-4.7 | Guest/tünel istisnası | unit (`DemoShell.test.tsx`) | 🟢 |

**T Görev Listesi:**
- [x] T-4: `postLoginDestination` şifre değişimi önceliği + `site-field.test.ts` (AK-4.2)
- [x] T-5: `ChangePasswordPage` + `/change-password` rotası + testler (AK-4.3..AK-4.6)
- [x] T-6: `DemoShell` guard'ı + testler (AK-4.1, AK-4.7)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Mevcut şifre yanlış | Sunucu 401/400 → "Şifre değiştirilemedi", sayfada kalınır |
| Sunucu politikası istemciden sıkı | Sunucu reddeder → hata mesajı (sunucu tek yetkili) |
| Değişim sonrası `VITE_FIELD_ID` boş | `postLoginDestination` hatası gösterilir, sessiz takılma yok |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/site/src/pages/ChangePasswordPage.tsx` | Yeni (geri gelir) — sayfa, nova stili |
| `apps/site/src/pages/ChangePasswordPage.test.tsx` | Yeni — AK-4.3..AK-4.6 |
| `apps/site/src/app/routes.tsx` | `/change-password` rotası eklenir |
| `apps/site/src/app/routes.test.tsx` | Yeni — rota tablosu (UC-2/UC-4 + karakterizasyon) |
| `apps/site/src/pages/ChangePasswordPage.css` | Yeni — co-located stil (nova `--nm-*`) |
| `apps/site/src/layouts/DemoShell.tsx` | Guard eklenir |
| `apps/site/src/layouts/DemoShell.test.tsx` | Yeni — AK-4.1, AK-4.7 |
| `apps/site/src/lib/site-field.ts` | `postLoginDestination` önceliği |
| `apps/site/src/lib/site-field.test.ts` | AK-4.2 testi eklenir |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Konteyner çevrimdışı | Boş/önceki veri |
| Tünel kopması | Guard |
| 401 | Refresh kuyruğu |
| `mustChangePassword=true` (guest/tünel değil) | Tüm korumalı rotalar → `/change-password` (UC-4) |
| Şifre değişimi istemci doğrulaması başarısız | Hata mesajı, istek yok (beklenen) |
| Şifre değişimi sunucu hatası | Hata mesajı, sayfada kalınır (beklenen) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Tünel/refresh akışı testli | komut |
| SC-2 | Veri kopyalanmaz | kod inceleme |
| SC-3 | Rename sonrası eski ad kalıntısı yok | komut |
| SC-4 | Taze DB'li test stack'te seed `admin` ile giriş → şifre değişimi → veriler görünür; 403 ile boş ekran kalmaz | gözle (test stack) |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 26 test dosyası / 151 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-3 (kanıt eşleştirme); T-4..T-6 (UC-4 zorunlu şifre değişimi) |
| 4. REVIEW (GLM-5.3) | `SITE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Domain/wire adlarının (`VITE_FIELD_ID`, `FIELD_ID`, `peerType:"field"`, tünel öneki `/fields/:fid/ui`) korunması — rename uygulama/tier/compose katmanında | Kabul edildi (K5) |
| A2 | `api-base` kopyasının ortak lib'e taşınması (B1) | İleri İş |
| A3 | MFA kayıt sayfasının (`/mfa-enroll`) geri gelmesi — bugün `MFA_ENABLED=false` ile kapalı; açılırsa aynı boş ekran sorunu oluşur | İleri İş (UC-4 kapsamı dışı) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Ortak frontend lib (api-base/query-client) çıkarımı (A2).
2. E2E kapsamının genişletilmesi.

## 12. T Görev Özeti

| T-1 | UC-1 (konteyner görünümü) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (uzak UI tüneli) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (manevra) kanıt testinin eşleştirilmesi |
| T-4 | UC-4 `postLoginDestination` şifre değişimi önceliği |
| T-5 | UC-4 `ChangePasswordPage` + `/change-password` rotası |
| T-6 | UC-4 `DemoShell` zorunlu şifre değişimi guard'ı |
