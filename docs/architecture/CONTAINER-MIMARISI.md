---
status: active
space: architecture
tags: [mimari, app, container, electron, spec]
review_date: 2026-11-10
---

# Container — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `APPS-MIMARISI.md` (indeks), `UI-MIMARISI.md` (transport/provider), `AUTH-MIMARISI.md`, `WEB-SERVICE-MIMARISI.md`.

## 1. Amaç ve Bağlam

Tier 1 ürün UI'ı: `apps/container-web` (SCADA panelleri, telemetri, manevra, auth) ve `apps/container-desktop` (aynı UI'ın Electron kabuğu). Konteyner başına çalışır; tünel modunda `/containers/:cid/ui` altında servis edilir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Tünel modu URL/cookie akışı, bileşen-kapsamlı telemetri tüketimi, manevra paneli, auth akışı, Electron paketleme |
| hariç | Ortak kontratlar (UI SPEC), backend uçları (WEB-SERVICE), kimlik semantiği (AUTH) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Tünel modu URL türetimi: build-time `VITE_WS_URL` YOK; `/containers/:cid/ui` öneki tespit edilir, istekler Path-scoped cookie ile taşınır; yalnız bu önek tünel sayılır | Aynı build hem doğrudan hem tünelde çalışır |
| K2 | Bileşen-kapsamlı telemetri: `useDeviceTelemetry` = REST (`keepPreviousData`) + WS + `dedupeLatest`; sayfa-seviyesi küresel birleştirme YASAK | Panel izolasyonu |
| K3 | Manevra kataloğu sunucudan gelir (`GET /api/maneuvers`); UI kendi kataloğunu tanımlamaz | Tek kaynak |
| K4 | Auth: zorunlu şifre değişimi + guest istisnası `PrivateRoute`'ta; refresh kuyruklu interceptor | Oturum sürekliliği |
| K5 | Electron kabuğu İNCE: iş mantığı yok; container-web `src`'sine alias; `contextIsolation` açık, dış URL `shell.openExternal`, renderer crash → reload | Tek kod tabanı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `breaker`/`dcOutput` hâlâ küresel telemetri akışında (bileşen-kapsamlı izolasyon tamamlanmadı) | `FRONTEND-TELEMETRI-IZOLASYONU-KAPANIS.md` A.4/G3 |
| B2 | `providers.tsx` başlığı eski app'ten (`apps/web`) türeme | `apps/container-web/src/app/providers.tsx` |

## 4. Mimari

```text
container-web
├ contexts (TransportProvider, RealtimeProvider)
├ features/telemetry (useDeviceTelemetry, dedupeLatest)
├ features/control (maneuverApi, ManeuverPanel)
├ lib (api-base tünel tespiti, api-client interceptor)
└ app/routes (PrivateRoute)

container-desktop ── alias ──► container-web src (Electron kabuk)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `apps/container-web/src/contexts/TransportContext.tsx#TransportProvider` | Transport |
| `apps/container-web/src/features/telemetry/hooks/useDeviceTelemetry.ts#useDeviceTelemetry` | Veri tüketimi |
| `apps/container-web/src/features/telemetry/utils/dedupeLatest.ts#dedupeLatest` | Tekilleştirme |
| `apps/container-web/src/lib/api-base.ts#isTunnelMode` | Tünel tespiti |
| `apps/container-web/src/lib/api-client.ts#apiClient` | HTTP |
| `apps/container-web/src/app/routes.tsx#routes` | Rotalar |
| `apps/container-desktop/src/main/index.ts` | Electron kabuk |

## 5. Purity Kuralları (ZORUNLU)

1. Bileşen verisi props/context ile gelir; sayfa-seviyesi küresel telemetri birleştirmesi yok (K2).
2. Katalog UI'da tanımlanmaz (K3).
3. Electron kabuğu iş mantığı taşımaz (K5).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Tünel Modu + Oturum

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: tünel öneki tespiti, Path-scoped cookie, login/refresh, zorunlu şifre değişimi
- hariç: token semantiği (AUTH)

**Akış:**
1. URL `/containers/:cid/ui` ise tünel modu açılır.
2. İstekler aynı origin + cookie ile gider.
3. Refresh kuyruklu interceptor 401'i yönetir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Tünel öneki dışındaki yollar tünel sayılmaz | AK-1.1 |
| FR-1.2 | 401'de tek refresh + istek kuyruğu çalışır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `/api/x` isteği **WHEN** tünel tespiti yapılır **THEN** doğrudan mod kullanılır
2. **AK-1.2 — GIVEN** süresi dolmuş token **WHEN** 3 istek aynı anda 401 alır **THEN** tek refresh + kuyruk çalışır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Tünel tespiti | unit (`api-base`) | ⬜ |
| AK-1.2 | Refresh kuyruğu | unit (`api-client`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Login rotası | Tünel önekli |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/container-web/src/lib/{api-base,api-client}.ts` | Tünel/auth |
| `apps/container-web/src/app/routes.tsx` | Rotalar |

### 6.2 UC-2 — Telemetri Tüketimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: REST+WS birleşimi, `keepPreviousData`, `dedupeLatest`, bileşen izolasyonu
- hariç: transport kontratı (UI SPEC)

**Akış:**
1. Hook REST snapshot alır.
2. WS güncellemeleri `dedupeLatest` ile birleşir.
3. Bileşen kendi stream'ini yönetir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Her bileşen yalnız kendi cihaz/panel verisini tüketir | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** iki panel **WHEN** biri unmount olur **THEN** diğeri etkilenmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | İzolasyon | unit (`dedupeLatest`, hook) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Küresel akış (B1) | A1 temizliği |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/container-web/src/features/telemetry/**` | Tüketim |

### 6.3 UC-3 — Manevra Paneli

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: sunucu kataloğu, çalıştırma, sonuç gösterimi
- hariç: manevra semantiği (KOMUT-MANEVRA)

**Akış:**
1. `GET /api/maneuvers` katalog.
2. Seçilen manevra POST ile çalıştırılır.
3. Sonuç panelde gösterilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Katalog yalnız sunucudan gelir | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** katalog değişti **WHEN** panel açılır **THEN** yeni katalog görünür (UI güncellemesi gerekmez)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Sunucu kataloğu | unit (`maneuverApi`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Yetkisiz manevra | Sunucu reddeder |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/container-web/src/features/control/**` | Panel |

### 6.4 UC-4 — Desktop Paketleme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: Electron kabuk, alias, güvenlik ayarları, crash reload
- hariç: iş mantığı

**Akış:**
1. Renderer container-web src'ini alias ile yükler.
2. Dış URL'ler `shell.openExternal` ile açılır.
3. Renderer crash → reload.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Electron kabuğu iş mantığı taşımaz; container-web src alias'ı kullanılır | AK-4.1 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** desktop build **WHEN** renderer yüklenir **THEN** container-web src alias'ından gelir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Alias | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Renderer crash | Reload |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/container-desktop/**` | Kabuk |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Tünel öneki | Tünel modu |
| 401 | Tek refresh + kuyruk |
| Renderer crash | Reload |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Tünel/auth akışı testli | komut |
| SC-2 | Bileşen telemetri izolasyonu | kod inceleme |
| SC-3 | Desktop ince kabuk | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 12 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `CONTAINER-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | breaker/dcOutput küresel akışının bileşen-kapsamlıya taşınması (B1) | İleri İş |
| A2 | `providers.tsx` başlık temizliği (B2) | İleri İş (kozmetik) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Telemetri izolasyonunun tamamlanması (A1).
2. E2E kapsamının genişletilmesi.

## 12. T Görev Özeti

| T-1 | UC-1 (tünel/oturum) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (telemetri) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (manevra) kanıt testinin eşleştirilmesi |
| T-4 | UC-4 (desktop) kanıtının eşleştirilmesi |
