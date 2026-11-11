---
status: active
space: architecture
tags: [mimari, app, boss, superadmin, spec]
review_date: 2026-11-10
---
> **Not (2026-11-11):** İlgili UI app'i kaldırıldı (`apps/superadmin` / `apps/container-web` / `apps/container-desktop`). Bu SPEC/KAPANIŞ tarihsel kayıttır; backend tier servisleri yaşamaya devam eder.


# Boss — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `APPS-MIMARISI.md` (indeks), `SITE-MIMARISI.md` (uzak UI), `WEB-SERVICE-MIMARISI.md` (boss tier), `AUTH-MIMARISI.md`.

## 1. Amaç ve Bağlam

Tier 3 patron uygulaması: `apps/superadmin` (BOSS). Sahaların/varlıkların yönetimi, saha uygulamasına uzak erişim (iframe tünel), pazar/EPİAŞ verileri, bildirimler. Mobil-öncelikli PWA.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Saha/varlık yönetimi, uzak site erişimi, pazar/bildirim görünümleri, oturum |
| hariç | Site/konteyner UI'ı (SITE/CONTAINER), backend (WEB-SERVICE) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Tek rol `boss`; mobil-öncelikli PWA | Tek deneyim |
| K2 | Boss→konteyner DOĞRUDAN bağlantı yok: site uygulaması `/fields/:fid/ui/*` subpath tüneliyle iframe'de açılır | Tek erişim yolu |
| K3 | WireGuard yedek/istisnai yoldur | Normal akış tünel |
| K4 | Varlık yönetimi boss'ta; EPİAŞ verileri grafiklerde (pazar görünümü) | Sorumluluk ayrımı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `SERVICE_TIER: boss` hiçbir compose'da yok — boss birimleri kod+test var, çalışan ortam yok | `deployment/v2/dev/` |

## 4. Mimari

```text
apps/superadmin
├ features/fields (useAdminFields, fieldsApi, fieldSessionApi, FieldRemoteFrame)
├ features/{wireguard,market,notifications,settings}
├ mappers (toFieldMarker)
└ layouts/BossShell
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `apps/superadmin/src/features/fields/hooks/useAdminFields.ts#useAdminFields` | Saha verisi |
| `apps/superadmin/src/features/fields/services/fieldsApi.ts#fieldsApi` | API |
| `apps/superadmin/src/features/fields/services/fieldSessionApi.ts#fieldSessionApi` | Uzak oturum |
| `apps/superadmin/src/features/fields/components/FieldRemoteFrame.tsx#FieldRemoteFrame` | İframe tünel |
| `apps/superadmin/src/layouts/BossShell.tsx#BossShell` | Kabuk |

## 5. Purity Kuralları (ZORUNLU)

1. Doğrudan konteyner bağlantısı yok; erişim site subpath tüneliyle (K2).
2. WireGuard normal akış değil (K3).
3. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Saha/Varlık Yönetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: saha listesi/detayı, form, harita işaretleri
- hariç: saha UI'ı (SITE)

**Akış:**
1. Saha listesi API'den alınır.
2. Form ile oluşturma/güncelleme yapılır.
3. Harita işaretleri türetilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Saha listesi ve detayı API'den gelir; UI'da kopya veri tutulmaz | AK-1.1 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** saha güncellendi **WHEN** liste yenilenir **THEN** güncel veri görünür

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | API kaynak | unit (`useAdminFields`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Yetkisiz | API reddeder |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/superadmin/src/features/fields/**` | Saha |

### 6.2 UC-2 — Uzak Site Erişimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: uzak oturum açma, iframe, subpath tüneli
- hariç: tünel çekirdeği (zero-trust)

**Akış:**
1. `fieldSessionApi` ile uzak oturum açılır.
2. Site UI'ı iframe'de yüklenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Uzak UI yalnız subpath tüneliyle açılır | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** saha seçildi **WHEN** uzak UI açılır **THEN** iframe `/fields/:fid/ui` yükler

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | İframe tünel | unit (`FieldRemoteFrame`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tünel kapalı | Hata mesajı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/superadmin/src/features/fields/components/FieldRemoteFrame.tsx` | İframe |

### 6.3 UC-3 — Pazar/Bildirim Görünümleri

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: EPİAŞ pazar grafikleri, bildirimler
- hariç: dış seri yazımı (INTEGRATION-SERVICE)

**Akış:**
1. Pazar verileri API'den alınır ve grafiklenir.
2. Bildirimler listelenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Pazar verisi yalnız API'den okunur | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** pazar sayfası **WHEN** açılır **THEN** veri API'den gelir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | API kaynak | unit (`MarketPage`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Veri yok | Boş durum |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/superadmin/src/features/{market,notifications}/**` | Görünümler |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Tünel kapalı | Hata mesajı |
| Yetkisiz | API reddi |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Saha/uzak erişim testli | komut |
| SC-2 | Doğrudan konteyner bağlantısı yok | kod inceleme |
| SC-3 | PWA/mobil uyum | gözle |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 13 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-3 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `BOSS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Boss tier deployment'ının eklenmesi (B1) | İleri İş (DEPLOYMENT ile) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Boss tier compose (A1).
2. E2E kapsamı.

## 12. T Görev Özeti

| T-1 | UC-1 (saha yönetimi) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (uzak erişim) kanıt testinin eşleştirilmesi |
| T-3 | UC-3 (pazar/bildirim) kanıt testinin eşleştirilmesi |
