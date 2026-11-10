---
status: active
space: architecture
tags: [mimari, ui, frontend, sprite, pixi, spec]
review_date: 2026-11-10
---

# UI — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `FRONTEND-KONTRATLARI` (transport portları `SHARED-TYPES`'ta), `APPS-MIMARISI.md` (tüketici app'ler), `DEMO-MIMARISI.md` (nova bölümü).

## 1. Amaç ve Bağlam

`packages/ui` paketinin sözleşmesi: frontend veri kontratları (transport/provider/hooks), renk/ikon/sprite pipeline, Pixi grafik katmanı, paylaşılan React bileşenleri + i18n ve Nova demo konsolu. Paket state kütüphanesinden bağımsızdır; app'ler veriyi props/Context ile taşır.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Transport stratejileri, provider kontratları, renk token'ları, ikon sistemi, sprite üretim hattı, Pixi SCADA grafikleri, paylaşılan bileşenler, i18n, nova |
| hariç | App'lerin kendi sayfa/route'ları (APPS), backend kontratları (SERVICES), demo app akışı (DEMO) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | UI state kütüphanesinden bağımsızdır: TanStack Query/Zustand/SWR/Axios importu YASAK; veri props/Context/IoC ile gelir | Paket app-agnostik |
| K2 | Multipleks tek soket: `addDevices/removeDevices` referans sayar, `connect()` idempotent, reconnect'te tüm abonelikler yeniden gönderilir, `disconnect()` yalnız provider teardown | Panel başına ayrı soket yok |
| K3 | İsim filtresi: abonelik `{deviceId, names?}` bildirir; sunucu socket başına yalnız istenen isimleri yollar | Bant genişliği ve panel izolasyonu |
| K4 | Strateji deseni: WS/HTTP/Mock aynı arayüzü uygular; transport değişimi sıfır bileşen değişikliği | Test/demo için Mock transport |
| K5 | Crash izolasyonu: her `DeviceTelemetryProvider` kendi stream'ini kurar (`useSyncExternalStore`, rAF batching, buffer 200) | Bir panel çökmesi diğerlerini etkilemez |
| K6 | İstemci log sözleşmesi: batch + retry + offline-drop; `ClientLogger` fail-open | Log hatası UI'ı düşürmez |
| K7 | Ham hex YASAK: tüm renkler token'dan; çift format (`COLORS` hex string, `COLOR` 0x sayı — PixiJS) | Tema tutarlılığı |
| K8 | Koyu set dokunulmaz: nova için `COLORS_LIGHT`/`COLORS_DARK` eklenir, mevcut `tokens.ts` değişmez | Geriye uyum |
| K9 | İkon Open-Closed: nova ikonları `nova*` önekiyle `ScadaIconName`'e eklenir; Tabler anahtarları korunur | Kırılmasız genişleme |
| K10 | Sprite hibrit katman: sprite yalnız nötr gövdeyi değiştirir; durum rengi/glow/etiket kodda çizilir; texture yüklenemezse `drawX`'e fallback | Boş ekran yok |
| K11 | Nötr baz kuralı: AI çıktısında success/warning/error rengi ve metin bulunamaz; `check-sprite.mjs` piksel bazlı kalite kapısı | Tema takası bozulmaz |
| K12 | Ölçülen meta: AI her üretimde ±10-30px kaydırır; `*-meta.ts` (`measured` bayrağı) yuvaları emer; `measured=false` ise tasarım geometrisi | Görsel hizalama |
| K13 | Varyant sprite (`close`/`open`) + tema takası (sprite + meta birlikte taşınır); cable tek segment texture'ı path boyunca döndürülüp uzatılır | Durum sprite'a gömülür |
| K14 | BESS yerleşim matematiği: `step = width/28`, PAD=2; `BSCUnitRow` rack satırının (rack'ler + cable bus/feeder + kesici + DC çıkışı) TEK çizim kaynağıdır; yeni ham kablo çizimi YASAK | Tek kaynak, tutarlı diagram |
| K15 | Grafik katmanı props-only'dir; veri çekmez (presentational) | Test/storybook kolaylığı |
| K16 | Nova `packages/ui/src/nova`'da yaşar, app ince tüketicidir; `createNovaMimic(svg, topo, opts)` framework'suz saf çekirdek; `Demo` prefix + barrel zorunlu | Demo mantığı app'e sızmaz |
| K17 | Nova CSS kök barrel'dan import edilir → ürün app'leri demo CSS'ini de yükler (açık karar A1) | Bilinen kuplaj |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `graphics/deprecated/*` hâlâ public export; hiçbir app kullanmıyor | `packages/ui/src/graphics/deprecated/` |
| B2 | `PlayCanvasViewer` export edilir ama hiçbir app import etmiyor (yalnız story) | `packages/ui/src/components/PlayCanvasViewer/` |
| B3 | Nova CSS sızıntısı (K17) | `packages/ui/src/index.ts` + `nova/index.ts` |
| B4 | Sprite'ın vitest testi yok — kapı `tools/check-sprite.mjs` + storybook | `tools/check-sprite.mjs` |

## 4. Mimari

```text
App'ler (props/Context) ──► packages/ui
                             ├ transports (WS/HTTP/Mock) ──► ITelemetryTransport
                             ├ providers (Telemetry/Log/Annotations/DeviceDetail)
                             ├ hooks (useTelemetryStream, useRealtimeTelemetry)
                             ├ assets (COLORS, SCADA_ICONS, SPRITE_ASSETS)
                             ├ graphics (BESSDiagram, BSCUnitRow, elementler)
                             ├ components (TelemetryChart, FieldMap, ...)
                             └ nova (createNovaMimic + Demo* bileşenleri)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/ui/src/transports/WebSocketTransport.ts#WebSocketTransport` | Multipleks WS |
| `packages/ui/src/transports/HttpPollingTransport.ts#HttpPollingTransport` | HTTP polling |
| `packages/ui/src/interfaces/telemetry-provider.ts#TelemetryProvider` | Veri provider kontratı |
| `packages/ui/src/core/DeviceTelemetryProvider/DeviceTelemetryProvider.tsx#DeviceTelemetryProvider` | İzole stream |
| `packages/ui/src/colors/tokens.ts#COLORS` | Renk token'ları |
| `packages/ui/src/icons/nav-icons.tsx#SCADA_ICONS` | İkon seti |
| `packages/ui/src/graphics/textures.ts#SPRITE_ASSETS` | Sprite kataloğu |
| `packages/ui/src/graphics/system/BESSDiagram/BESSDiagram.tsx#BESSDiagram` | SCADA diagram |
| `packages/ui/src/nova/nova-mimic.ts#createNovaMimic` | Demo çekirdek |
| `packages/ui/src/logging/client-logger.ts#ClientLogger` | İstemci log |

## 5. Purity Kuralları (ZORUNLU)

1. Paket app-agnostiktir: state/fetch kütüphanesi importu yok (K1).
2. Grafik katmanı props-only; veri çekmez (K15).
3. Ham hex yok; renkler token'dan (K7).
4. Nova app'i ince tüketicidir; mantık `packages/ui/src/nova`'da (K16).
5. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Frontend Veri Kontratları

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: transport stratejileri, multipleks/refcount, isim filtresi, provider/hook kontratları, istemci log
- hariç: backend WS protokolü (WEB-SERVICE)

**Akış:**
1. App provider'ı kurar; transport enjekte edilir.
2. Hook abonelikleri `addDevices` ile referans sayar.
3. Veri observer'lara dağıtılır; teardown'da `removeDevices`.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Aynı cihaz için çoklu abonelik tek soket/tek referans sayacı kullanır | AK-1.1 |
| FR-1.2 | Reconnect'te tüm abonelikler yeniden gönderilir | AK-1.2 |
| FR-1.3 | İstemci log hatası UI'ı düşürmez | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** iki bileşen aynı cihaza abone **WHEN** abonelikler açılır **THEN** tek soket ve refcount 2 olur
2. **AK-1.2 — GIVEN** soket koptu **WHEN** yeniden bağlanır **THEN** tüm abonelikler yeniden gönderilir
3. **AK-1.3 — GIVEN** log transport'u hata verir **WHEN** log gönderilir **THEN** UI akışı devam eder

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Refcount | unit (`WebSocketTransport.test.ts`) | ⬜ |
| AK-1.2 | Resubscribe | unit | ⬜ |
| AK-1.3 | Fail-open | unit (`client-logger.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Malform JSON | Mesaj yok sayılır |
| Abone olunmayan cihaz | Filtrelenir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/transports/**` | Stratejiler |
| `packages/ui/src/hooks/**` | Hook'lar |
| `packages/ui/src/logging/**` | İstemci log |

### 6.2 UC-2 — UI Varlıkları (Renk / İkon / Sprite)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: renk token'ları, ikon Open-Closed, sprite pipeline (üretim + meta + tema takası + piksel kapısı)
- hariç: AI görsel üretimi operasyonu (docs/process)

**Akış:**
1. Renkler token'dan seçilir.
2. İkonlar `ScadaIconName` üzerinden kullanılır.
3. Sprite'lar `SPRITE_ASSETS` + `*_META` ile çizilir; fallback `drawX`.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Yeni ikonlar mevcut anahtarları bozmadan eklenir | AK-2.1 |
| FR-2.2 | Sprite üretimi nötr baz kuralına uyar (piksel kapısı) | AK-2.2 |
| FR-2.3 | Texture yüklenemezse fallback çizim devreye girer | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** yeni nova ikonu **WHEN** `SCADA_ICONS` kontrol edilir **THEN** eski Tabler anahtarları korunur
2. **AK-2.2 — GIVEN** üretilmiş sprite **WHEN** `check-sprite.mjs` koşar **THEN** yasak renk/boyut ihlali yoktur
3. **AK-2.3 — GIVEN** texture 404 **WHEN** bileşen çizilir **THEN** `drawX` fallback çalışır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | İkon parity | unit (`demo-icons.test.tsx`) | ⬜ |
| AK-2.2 | Piksel kapısı | komut (`check-sprite`) | ⬜ |
| AK-2.3 | Fallback | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Meta `measured=false` | Tasarım geometrisi kullanılır |
| Tema takası | Sprite + meta birlikte |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/colors/**` | Token'lar |
| `packages/ui/src/icons/**` | İkonlar |
| `packages/ui/src/graphics/textures.ts` | Sprite kataloğu |
| `tools/sprites-*.mjs` | Pipeline |

### 6.3 UC-3 — Pixi Grafik Katmanı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: BESSDiagram yerleşimi, BSCUnitRow tek kaynak kuralı, elementler, storybook kapısı
- hariç: veri akışı (UC-1)

**Akış:**
1. Props veri gelir.
2. `calculateBESSConfig`/`getBSCLayout` yerleşimi hesaplar.
3. `BSCUnitRow` rack satırını çizer; diagram kompoze edilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Kablo/kesici çizimi yalnız `BSCUnitRow` üzerinden yapılır | AK-3.1 |
| FR-3.2 | Yerleşim matematiği `step = width/28` kuralına uyar | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** yeni diagram bileşeni **WHEN** kablo çizimi gerekir **THEN** `BSCUnitRow` kullanılır (ham çizim yok)
2. **AK-3.2 — GIVEN** farklı genişlik **WHEN** diagram çizilir **THEN** bileşen boyutları step katıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Tek çizim kaynağı | kod inceleme | ⬜ |
| AK-3.2 | Yerleşim | gözle (storybook) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Deprecated grafikler | Public export — A2 kararı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/graphics/**` | Grafik katmanı |

### 6.4 UC-4 — Nova Demo Konsolu

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: saf çekirdek (`createNovaMimic`), fan-out, Demo* bileşen seti, tema değişkenleri
- hariç: demo app akışı (`DEMO-MIMARISI.md`)

**Akış:**
1. `createNovaMimic(svg, topo, opts)` saf TS portu kurar.
2. `DemoMimic` React sarmalayıcı olarak render eder.
3. `destroy()` temizler; global state yok.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Nova mantığı `packages/ui/src/nova`'da yaşar; app ince tüketicidir | AK-4.1 |
| FR-4.2 | `createNovaMimic` framework'suz ve global state'sizdir | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** demo app **WHEN** nova bileşeni kullanır **THEN** yalnız props/veri bağlar (mantık pakette)
2. **AK-4.2 — GIVEN** `createNovaMimic` **WHEN** `destroy()` çağrılır **THEN** tüm kaynaklar temizlenir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Katman ayrımı | kod inceleme | ⬜ |
| AK-4.2 | Temizlik | unit (nova testleri) | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| CSS sızıntısı (B3) | A1 kararı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/nova/**` | Demo çekirdek |

### 6.5 UC-5 — Paylaşılan Bileşenler + i18n (referans)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kart/chart/atom koleksiyonu, `TranslationProvider` enjeksiyonu
- hariç: app sayfaları

**Akış:**
1. App sözlükleri provider'a verir (ek anahtarlar dahil).
2. Bileşenler veri/props ile beslenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | i18n sözlükleri props ile enjekte edilir; app ek anahtar geçebilir | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** app ek anahtar verir **WHEN** `TranslationProvider` kurulur **THEN** ek anahtarlar çözülür

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Enjeksiyon | unit (`TranslationProvider.test.tsx`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıtlarını eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik anahtar | Anahtarın kendisi gösterilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/components/**` | Bileşenler |
| `packages/ui/src/i18n/**` | Sözlükler |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Soket kopması | Backoff + resubscribe |
| Texture yok | Fallback çizim |
| Log hatası | Fail-open |
| Provider unmount | Refcount azalır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Transport/provider kontratları testli | komut |
| SC-2 | Ham hex/state kütüphanesi ihlali yok | kod inceleme + lint |
| SC-3 | Sprite piksel kapısı temiz | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 40+ test dosyası kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `UI-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Nova CSS sızıntısının giderilmesi (B3) | İleri İş (paket ayrımı) |
| A2 | Deprecated grafiklerin kaldırılması (B1) | İleri İş (temizlik) |
| A3 | `PlayCanvasViewer`'ın kaldırılması (B2) | İleri İş (temizlik) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Nova CSS izolasyonu (A1).
2. Deprecated grafik ve PlayCanvas temizliği (A2/A3).
3. Sprite'ın vitest kapsamına alınması (B4).

## 12. T Görev Özeti

| T-1 | UC-1 (veri kontratları) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (varlıklar) kanıtlarının eşleştirilmesi |
| T-3 | UC-3 (grafik) kanıtlarının eşleştirilmesi |
| T-4 | UC-4 (nova) kanıtlarının eşleştirilmesi |
| T-5 | UC-5 (bileşen/i18n) kanıtlarının eşleştirilmesi |
