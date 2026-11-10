---
status: active
space: architecture
tags: [mimari, plugin-sdk, plugin, spec]
review_date: 2026-11-10
---

# Plugin SDK — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `PLUGINS-MIMARISI.md` (örnek plugin), `INTEGRATION-SERVICE-MIMARISI.md` (host).

## 1. Amaç ve Bağlam

`packages/plugin-sdk` paketinin sözleşmesi: hafif plugin framework — manifest, registry, loader (statik + dizin), context (state/config/logger), SDK sürüm uyumu ve `HttpClient`. Tam plugin platformu (sandbox/marketplace/version negotiation) bilinçli olarak REDDEDİLDİ.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Manifest/registry/loader/context, SDK semver kapısı, state store, HTTP istemcisi |
| hariç | Host orkestrasyonu (INTEGRATION-SERVICE), örnek plugin (PLUGINS), EPİAŞ auth (EPIAS-CLIENT) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Hafif model: contract + registry + manifest; sandbox/marketplace/version negotiation REDDEDİLDİ | YAGNI sınırı |
| K2 | Hybrid yükleme: workspace paketleri `StaticPluginSource`, müşteri plugin'leri `DirectoryPluginSource` (`plugin.json` + named export `plugin`); dinamik import tek tip sınır, `instanceof`/reflection YOK | Tek yükleme sözleşmesi |
| K3 | Zamanlama plugin'de DEĞİL: `schedule()` declare edilir, BullMQ repeatable job servis core'unda kurulur | Plugin zamanlayıcı sahiplenmez |
| K4 | `PluginRegistry`: isim çakışması + `sdkVersion` aralığı `SDK_VERSION`'a karşı doğrulanır; `deactivateAll` allSettled + temizlik | Uyumsuz plugin yüklenmez |
| K5 | `SemVerRange` yalnız `>=` ve `<` destekler | YAGNI |
| K6 | `FilePluginStateStore` atomik yazım (tmp+rename); Redis/DB bağımlılığı YOK; config `<configDir>/<plugin>.json`, yoksa `{}` | Bağımsız state |
| K7 | CQS: `activate/deactivate` komut, `manifest/health/names/find` sorgu | Elegant Object uyumu |
| K8 | `HttpClient`: baseUrl/header/timeout/retry; 5xx retry, 4xx `HttpError` | Domain-agnostic taşıma |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `shared-types/integration-plugin.ts` plugin-sdk'ya bağımlı — ters yön katman kokusu (SHARED-TYPES B1) | `packages/shared-types/src/integration-plugin.ts` |

## 4. Mimari

```text
IntegrationService ──► PluginLoader ──► PluginSource (Static | Directory)
                          │
                          ├ PluginRegistry (isim + sdkVersion)
                          └ PluginContextFactory ──► state/config/logger
Plugin ──► HttpClient (baseUrl/retry) ──► dış servis
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/plugin-sdk/src/manifest.ts#PluginManifest` | Manifest |
| `packages/plugin-sdk/src/plugin.ts#IPlugin` | Plugin kontratı |
| `packages/plugin-sdk/src/registry.ts#PluginRegistry` | Registry |
| `packages/plugin-sdk/src/loader.ts#PluginLoader` | Yükleyici |
| `packages/plugin-sdk/src/context.ts#PluginContextFactory` | Context |
| `packages/plugin-sdk/src/sdk-version.ts#SemVerRange` | Sürüm aralığı |
| `packages/plugin-sdk/src/http/http-client.ts#HttpClient` | HTTP taşıma |

## 5. Purity Kuralları (ZORUNLU)

1. SDK runtime bağımlılığı taşımaz (yalnız dev `typescript`/`vitest`).
2. Dinamik yükleme tek sınır: `plugin.json` + named export (K2).
3. Zamanlama SDK'da değil (K3).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Manifest + Kayıt

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: manifest doğrulama, isim çakışması, SDK uyum kapısı, deactivateAll
- hariç: yükleme kaynakları (UC-2)

**Akış:**
1. Manifest okunur.
2. Registry isim + sürüm doğrular.
3. Kayıt kabul/reddedilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Aynı isimli plugin reddedilir | AK-1.1 |
| FR-1.2 | SDK aralığı uymayan plugin reddedilir | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** aynı isimde iki plugin **WHEN** kayıt denenir **THEN** ikincisi reddedilir
2. **AK-1.2 — GIVEN** `sdkVersion: ">=99"` **WHEN** kayıt denenir **THEN** uyumsuzluk hatası döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | İsim çakışması | unit (`registry.test.ts`) | ⬜ |
| AK-1.2 | Semver kapısı | unit (`sdk-version.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş manifest | Reddedilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/plugin-sdk/src/registry.ts` | Registry |
| `packages/plugin-sdk/src/manifest.ts` | Manifest |

### 6.2 UC-2 — Yükleme (Loader + Sources)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: statik/dizin kaynakları, dinamik import, eksik manifest
- hariç: host orkestrasyonu

**Akış:**
1. Kaynak plugin listesini verir.
2. Loader import eder; manifest doğrulanır.
3. Registry'ye kaydedilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Dizin kaynağından yüklenen plugin `plugin.json` + named export taşır | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** müşteri plugin dizini **WHEN** loader çalışır **THEN** plugin import edilir ve kaydedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Dizin yükleme | unit (`loader.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik manifest | Plugin atlanır, servis devam |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/plugin-sdk/src/loader.ts` | Loader |
| `packages/plugin-sdk/src/sources.ts` | Kaynaklar |

### 6.3 UC-3 — Context + State/Config

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: context factory, dosya state store (atomik), config okuma, logger
- hariç: host yaşam döngüsü

**Akış:**
1. Context factory plugin için state/config/logger üretir.
2. State dosyaya atomik yazılır; config okunur (yoksa `{}`).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | State yazımı atomiktir | AK-3.1 |
| FR-3.2 | Config yoksa boş nesne döner | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** state güncellemesi **WHEN** yazılır **THEN** tmp+rename ile tamamlanır
2. **AK-3.2 — GIVEN** config dosyası yok **WHEN** context kurulur **THEN** `{}` döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Atomik yazım | unit (`context.test.ts`) | ⬜ |
| AK-3.2 | Boş config | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bozuk state dosyası | Boş state + hata raporu |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/plugin-sdk/src/context.ts` | Context |

### 6.4 UC-4 — HttpClient

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: baseUrl/header/timeout, 5xx retry, 4xx `HttpError`, JSON/form
- hariç: EPİAŞ auth (EPIAS-CLIENT)

**Akış:**
1. İstek header/timeout ile gönderilir.
2. 5xx → retry; 4xx → `HttpError`.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | 5xx yanıtları retry edilir | AK-4.1 |
| FR-4.2 | 4xx yanıtları `HttpError` fırlatır | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** 503 yanıtı **WHEN** istek yapılır **THEN** retry denenir
2. **AK-4.2 — GIVEN** 404 yanıtı **WHEN** istek yapılır **THEN** `HttpError` fırlar

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | 5xx retry | unit (`http-client.test.ts`) | ⬜ |
| AK-4.2 | 4xx hata | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Ağ hatası | Retry politikası |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/plugin-sdk/src/http/http-client.ts` | HttpClient |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Uyumsuz SDK | Kayıt reddi |
| Eksik manifest | Plugin atlanır |
| 4xx | HttpError |
| 5xx | Retry |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Registry/loader/context/http testli | komut |
| SC-2 | SDK runtime bağımlılığı yok | kod inceleme |
| SC-3 | Zamanlama SDK'da değil | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 25 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `PLUGIN-SDK-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `integration-plugin` ters bağımlılığının kaldırılması (B1) | İleri İş (SHARED-TYPES A1 ile birlikte) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Katman ayrımı (A1).
2. Plugin kataloğu dokümanı (plugin sayısı artınca).

## 12. T Görev Özeti

| T-1 | UC-1 (manifest/registry) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (loader) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (context) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (HttpClient) kanıt testlerinin eşleştirilmesi |
