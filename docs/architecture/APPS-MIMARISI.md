---
status: active
space: architecture
tags: [mimari, indeks, apps, spec]
review_date: 2026-11-10
---

# APPS — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `DOKUMAN-YAPISI-MIMARISI.md` (reorg ana SPEC'i), `PACKAGES-MIMARISI.md`, `SERVICES-MIMARISI.md`.

## 1. Amaç ve Bağlam

`apps/` altındaki uygulamaların haritası. 5 doküman: CONTAINER (tier 1), SITE (tier 2 — eski `field`), BOSS (tier 3 — superadmin), EDITOR (ürün bestecisi), DEMO (ui/nova + demo-field). Ölü dizinler (`apps/web`, `apps/demo-backend`) silinir (K13).

| Katman | Kapsam |
|:-------|:-------|
| dahil | 5 app dokümanı haritası, SPEC linkleri, ürün/demo sınıflaması, durum takibi |
| hariç | App içi kararlar (kendi SPEC'lerinde), ortak frontend kontratları (`UI-MIMARISI.md`) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | 5 app dokümanı: CONTAINER, SITE, BOSS, EDITOR, DEMO | Bu indeksin satırları o dosyalara bağlanır |
| K2 | `apps/field` → `apps/site` tam rename (klasör, package, nx, compose, env adları) | `apps/site`; eski ad yalnız tarihsel dokümanlarda |
| K3 | `container-desktop` ayrı doküman değil — CONTAINER'ın paketleme bölümü | Tek SPEC iki app'i kapsar |
| K4 | Ölü dizinler (`apps/web`, `apps/demo-backend`) silinir | İndekste "silindi" notu |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | App dokümanları parçalı (field için 3+ eski doküman, demo için 3 ayrı SPEC) | `docs/architecture/` envanteri (2026-11-10) |
| B2 | Ölü app dizinleri: `apps/web` (boş), `apps/demo-backend` (yalnız dist) | `DOKUMAN-YAPISI-MIMARISI.md` B5 |

## 4. Mimari

### 4.1 Uygulama haritası

| Dizin | Ürün / Rol | Birim SPEC | Durum |
|:------|:-----------|:-----------|:------|
| `apps/container-web` | Tier 1 konteyner SCADA/web UI (ürün) | `CONTAINER-MIMARISI.md` | ✅ yazıldı |
| `apps/container-desktop` | Aynı UI'ın Electron kabuğu (paketleme) | `CONTAINER-MIMARISI.md` (bölüm) | ✅ yazıldı |
| `apps/site` | Tier 2 saha operatörü (ürün; eski `field`) | `SITE-MIMARISI.md` | ✅ yazıldı |
| `apps/superadmin` | Tier 3 boss/patron PWA (ürün) | `BOSS-MIMARISI.md` | ✅ yazıldı |
| `apps/editor` | Ürün katmanı bestecisi (low-code, P1) | `EDITOR-MIMARISI.md` | ✅ yazıldı |
| `apps/demo-field` + `packages/ui/src/nova` | Nova demo konsolu (demo) | `DEMO-MIMARISI.md` | ✅ yazıldı |
| `apps/sim-lab` | Fiziksel saha simülatörü servisi + god-mode UI (araç) | `SIMULATORS-MIMARISI.md` (bölüm) | ✅ yazıldı |
| `apps/web` | Ölü dizin (src yok) | — | silinecek |
| `apps/demo-backend` | Ölü dizin (src yok) | — | silinecek |

### 4.2 Tier eşlemesi

| Tier | App | Servis yüzü |
|:-----|:----|:------------|
| container | CONTAINER | web-service (container tier) |
| site | SITE | web-service (site tier) + hub tünel |
| boss | BOSS | web-service (boss tier) + hub tünel |

## 5. Purity Kuralları (ZORUNLU)

1. İndeks derinlik taşımaz — app kararı kendi SPEC'indedir.
2. Ortak frontend kontratları `UI-MIMARISI.md` sahibidir; app SPEC'leri onlara referans verir.
3. Her satırın SPEC linki ve durumu zorunludur.

## 6. Use Case'ler

### 6.1 UC-1 — App İndeksinin Bakımı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: app haritası, ürün/demo/araç sınıflaması, tier eşlemesi, durum kolonu
- hariç: app içi kararlar

**Akış:**
1. App eklendi/silindi → indeks güncellenir.
2. Durum değişti → kolon güncellenir.
3. `bun run spec:check` temiz.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Her app dizini tek satırla temsil edilir; rol + SPEC yolu + durum taşır | AK-1.1 |
| FR-1.2 | Ölü dizinler "silinecek/silindi" olarak işaretlenir, satır gizlenmez | AK-1.2 |
| FR-1.3 | İndeks `bun run spec:check` lint'inden 0 hata ile geçer | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `apps/` dizin listesi **WHEN** indeks okunur **THEN** her dizin için tam bir satır vardır
2. **AK-1.2 — GIVEN** ölü dizinler **WHEN** indeks okunur **THEN** satırları "silinecek" durumuyla görünür
3. **AK-1.3 — GIVEN** indeks dosyası **WHEN** spec:check koşulur **THEN** hata sayısı 0'dır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Dizin↔satır tam eşleşme | gözle | ⬜ |
| AK-1.2 | Ölü dizin işaretleri mevcut | gözle | ⬜ |
| AK-1.3 | spec:check çıkış kodu 0 | komut | ⬜ |

**T Görev Listesi:**
- [ ] T-1: İndeksin yazımı ve app listesinin kodla eşleştirilmesi

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Birim SPEC henüz yok | Satır `yazılacak` durumunda kalır |
| App başka app'in varyantı | Tek SPEC içinde bölüm olarak işaretlenir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `docs/architecture/APPS-MIMARISI.md` | Bu indeks |
| `apps/*/` | Haritalanan uygulamalar |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Yeni app | Satır + birim SPEC görevi eklenir |
| Birim SPEC onaylandı | Durum `✅ Approved` |
| Birim KAPANIŞ tamamlandı | Durum `🟢 Doğrulanmış` |
| Ölü dizin silindi | Satır "silindi (tarih)" notuyla kapatılır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | 5 app dokümanı + ölü dizin işaretleri indekste mevcut | gözle |
| SC-2 | İndeks spec:check 0 hata | komut |
| SC-3 | Tier eşlemesi deployment tier'larıyla uyumlu | gözle |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — yeni davranış kodu yok |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1; mutasyon kapısı değişen üretim `.ts` yoksa atlanır |
| 4. REVIEW (GLM-5.3) | `APPS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `apps/sim-lab`'ın ayrı doküman olması — şimdilik SIMULATORS bölümü | SIMULATORS SPEC'inde kapanır |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. App başına bundle/boyut bütçesinin indekse eklenmesi.
2. E2E kapsam matrisinin app SPEC'lerinden otomatik derlenmesi.

## 12. T Görev Özeti

| T-1 | `APPS-MIMARISI.md` indeksinin yazımı ve app listesinin kodla eşleştirilmesi |
