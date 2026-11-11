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

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `api-base.ts` site ile birebir kopya — ortak frontend lib borcu | `apps/site/src/lib/api-base.ts` ↔ `apps/site/src/lib/api-base.ts` |
| B2 | `deriveDevicesFromSnapshot` cihaz türetimi testli ama sözleşme dokümanda değil | `apps/site/src/features/field-devices/hooks/useFieldDevices.ts` |

## 4. Mimari

```text
apps/site
├ features/containers (useContainerData, useContainerTelemetry)
├ features/field-devices (deriveDevicesFromSnapshot)
├ features/pcs (derivePcsSummaries)
├ features/field-control (fieldManeuverApi, FieldManeuverPanel)
├ lib (api-base tünel, api-client refresh)
└ app/routes (önekli login + site rotaları)
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

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Konteyner çevrimdışı | Boş/önceki veri |
| Tünel kopması | Guard |
| 401 | Refresh kuyruğu |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Tünel/refresh akışı testli | komut |
| SC-2 | Veri kopyalanmaz | kod inceleme |
| SC-3 | Rename sonrası eski ad kalıntısı yok | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 26 test dosyası / 151 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-3 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `SITE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Domain/wire adlarının (`VITE_FIELD_ID`, `FIELD_ID`, `peerType:"field"`, tünel öneki `/fields/:fid/ui`) korunması — rename uygulama/tier/compose katmanında | Kabul edildi (K5) |
| A2 | `api-base` kopyasının ortak lib'e taşınması (B1) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Ortak frontend lib (api-base/query-client) çıkarımı (A2).
2. E2E kapsamının genişletilmesi.

## 12. T Görev Özeti

| T-1 | UC-1 (konteyner görünümü) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (uzak UI tüneli) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (manevra) kanıt testinin eşleştirilmesi |
