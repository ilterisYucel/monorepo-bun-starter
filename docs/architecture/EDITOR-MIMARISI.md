---
status: active
space: architecture
tags: [mimari, app, editor, low-code, spec]
review_date: 2026-11-10
---

# Editor — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `APPS-MIMARISI.md` (indeks), `SHARED-TYPES-MIMARISI.md` (config şeması), `DEVICE-SERVICE-MIMARISI.md` (ConfigLoader).

## 1. Amaç ve Bağlam

`apps/editor`: ürün katmanı bestecisi (low-code). Cihaz kataloğu + proje/konfigürasyon düzenleme + manevra editörü (P2+). P1 kapsamı: cihaz kataloğu (device-library buraya taşındı). Yeni platform paketi üretilmez.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Cihaz kataloğu (P1), editör store (undo/redo), proje API, şema tekilliği |
| hariç | Runtime motoru (iptal), manevra editörü (P2+, Specified) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Editör ürün katmanını üretir; yeni platform paketi YOK (`config-engine`/`runtime-engine`/`app-builder` iptal) | Mevcut paketler kullanılır |
| K2 | Katalog VERİDİR: built-in seed + kullanıcı cihazları + görsel meta; `packages/device-library` migrate edildi (paket kaldırıldı) | Tek katalog yeri |
| K3 | Tek kaynak şema: `shared-types/schemas/device-config.ts` zod; device-service `ConfigLoader` ile AYNI ("editörde geçen sahada da geçer") | Şema drift yok |
| K4 | Alarm koşulu string'i ASLA `eval` edilmez; küçük ifade alt kümesi + zod | Güvenlik |
| K5 | Beklenen hata → `Result<T,E>`; beklenmeyen → `DomainError` | Hata sözleşmesi |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Yalnız P1 testli (`catalog.test.ts` 5 test); P2+ (config validator, manevra editörü, dashboard tasarımcısı) yok | `apps/editor/src/features/editor/device-catalog/catalog.test.ts` |

## 4. Mimari

```text
apps/editor
├ features/editor/device-catalog (DEVICE_LIBRARY, DEVICE_TYPES, getDeviceDefinition)
├ features/editor/stores (useEditorStore: undo/redo/snapshot)
├ features/editor/services (projectApi)
└ features/editor/types
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `apps/editor/src/features/editor/device-catalog/registry.ts#DEVICE_LIBRARY` | Katalog |
| `apps/editor/src/features/editor/device-catalog/index.ts#getDeviceDefinition` | Tanım çözümü |
| `apps/editor/src/features/editor/stores/editorStore.ts#useEditorStore` | Editör state |
| `apps/editor/src/features/editor/services/projectApi.ts#projectApi` | Proje API |
| `packages/shared-types/src/schemas/device-config.ts#deviceConfigFileSchema` | Tek şema |

## 5. Purity Kuralları (ZORUNLU)

1. Katalog veridir; kod değil (K2).
2. Tek şema kaynağı `shared-types` (K3).
3. `eval` yok (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Cihaz Kataloğu (P1)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: built-in tipler, kullanıcı cihazları, görsel meta, tanım çözümü
- hariç: P2+ editörler

**Akış:**
1. Katalog yüklenir (seed + kullanıcı).
2. `getDeviceDefinition` tip çözer.
3. Şema doğrulaması aynı zod ile yapılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Built-in tipler + kullanıcı cihazları tek katalogda temsil edilir | AK-1.1 |
| FR-1.2 | Tanım çözümü bilinmeyen tipi reddeder | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** katalog **WHEN** liste okunur **THEN** built-in + kullanıcı cihazları görünür
2. **AK-1.2 — GIVEN** bilinmeyen tip **WHEN** `getDeviceDefinition` çağrılır **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Katalog | unit (`catalog.test.ts`) | ⬜ |
| AK-1.2 | Tanım | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik ikon/protokol | Tanım reddedilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/editor/src/features/editor/device-catalog/**` | Katalog |

### 6.2 UC-2 — Proje/Konfigürasyon Düzenleme (P1)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: store undo/redo, proje kaydetme, şema doğrulama
- hariç: P2+ manevra/dashboard editörleri

**Akış:**
1. Kullanıcı düzenler; store snapshot tutar.
2. Kaydetmede zod doğrulaması yapılır.
3. `projectApi` ile yazılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Kaydetme öncesi şema doğrulaması zorunludur | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** geçersiz config **WHEN** kaydedilir **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Şema kapısı | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıtını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Undo sınırı | Snapshot limiti |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/editor/src/features/editor/stores/editorStore.ts` | Store |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Geçersiz config | Reddedilir |
| Bilinmeyen tip | Reddedilir |
| P2+ | Specified |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Katalog testli | komut |
| SC-2 | Tek şema kaynağı | kod inceleme |
| SC-3 | `eval` yok | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | P1 mevcut 5 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-2 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `EDITOR-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | P2+ (config validator, manevra editörü, dashboard tasarımcısı) | İleri İş (ayrı SPEC) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. P2+ editör yetenekleri (A1).
2. Editör E2E kapsamı.

## 12. T Görev Özeti

| T-1 | UC-1 (katalog) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (proje düzenleme) kanıtının eşleştirilmesi |
