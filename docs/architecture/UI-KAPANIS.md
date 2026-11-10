---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ui, frontend, sprite]
review_date: 2026-11-10
---

# UI — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [UI-MIMARISI.md](./UI-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — `packages/ui` bu turda değişmedi; 40 test dosyası envanteri + kod incelemesi.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ui/src/transports/WebSocketTransport.ts#WebSocketTransport` | (doğrulama) multipleks tek soket, addDevices/removeDevices refcount, connect idempotent, reconnect-resubscribe | K2/K3/FR-1.1–1.2 |
| 2 | `packages/ui/src/transports/{HttpPollingTransport,MockTransport}.ts` + `transport-contract.test.ts` | (doğrulama) üç strateji aynı arayüz — transport değişimi sıfır bileşen değişikliği | K4/FR-1 |
| 3 | `packages/ui/src/logging/client-logger.ts#ClientLogger` | (doğrulama) batch+retry+offline-drop; taşıyıcı hatası UI'ı düşürmez (fail-open) | K6/FR-1.3 |
| 4 | `packages/ui/src/colors/**` | (doğrulama) `COLORS/COLOR` çift format + `COLORS_LIGHT/DARK` (tokens.test + tokensLight/Dark.test); `tokens.ts` eski seti bozulmadı | K7/K8/FR-2 |
| 5 | `packages/ui/src/icons/demo-icons.test.tsx` | (doğrulama) nova ikonları `nova*` önekiyle; Tabler anahtarları korunur | K9/AK-2.1 |
| 6 | `tools/check-sprite.mjs` | (doğrulama) piksel bazlı nötr-baz kapısı MEVCUT (vitest kapsamı değil — B4 bilinçli) | K11/AK-2.2 |
| 7 | `packages/ui/src/graphics/**` | (doğrulama) `BSCUnitRow` tek çizim kaynağı, `step=width/28`, texture fallback `drawX`; sprite meta `measured` bayrağı | K10/K12/K13/K14/AK-2.3/FR-3 |
| 8 | `packages/ui/src/core/DeviceTelemetryProvider/DeviceTelemetryProvider.tsx` | (doğrulama) provider-başına stream, `useSyncExternalStore`, rAF batching, buffer 200 | K5 |
| 9 | `packages/ui/src/index.ts` | (doğrulama) kök barrel `./nova` export ediyor → demo CSS ürün app'lerine sızıyor (K17/B3 bilinçli kuplaj) | K17 — not |
| 10 | K1 saflık taraması | (doğrulama) `packages/ui/src` içinde `zustand/axios/@tanstack` importu YOK (grep 0) | K1/SC-2 ✓ |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob packages/ui/src | **40 test dosyası** — SPEC "mevcut 40+" ile uyumlu |
| UC-1 | WebSocketTransport/HttpPolling/MockTransport/transport-contract/useTelemetryStream/client-logger testleri | |
| UC-2 | tokens×3 + demo-icons; piksel kapısı = `check-sprite` komutu (bu turda KOŞULMADI — G2) | |
| UC-3 | BESSDiagram/BSCUnitRow: graphics testleri + storybook (kanıt türü kod incelemesi/gözle) | |
| UC-4 | nova 23 test dosyası (DEMO-KAPANIŞ ile çapraz; kopya sayım tek yerde) | |
| UC-5 | `TranslationProvider.test.tsx` + FieldCard/RackCard/FieldMap/LogTerminal/Sparkline/TelemetryGauge | |
| Taze koşu | `nx run ui:test` | **İLETİLMEDİ** (G1) |
| Mutasyon | — | **verisi yok** — değişen dosya yok |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Refcount tek soket | WebSocketTransport.test — envanter | 🟡 |
| AK-1.2 | Reconnect resubscribe | aynı dosya | 🟡 |
| AK-1.3 | ClientLogger fail-open | client-logger.test | 🟡 |
| AK-2.1 | İkon parity (Tabler korunur) | demo-icons.test | 🟡 |
| AK-2.2 | Sprite piksel kapısı temiz | `tools/check-sprite.mjs` mevcut; taze KOŞU YOK | 🟡 |
| AK-2.3 | Texture fallback | kod inceleme (`drawX` yolu) | 🟡 |
| AK-3.1 | Tek çizim kaynağı | kod inceleme (BSCUnitRow çağrı yüzeyi) | 🟡 |
| AK-3.2 | Yerleşim step katı | storybook gözle (bu turda koşulmadı — G3) | 🟡 |
| AK-4.1 | Nova katman ayrımı | kök barrel + app ince tüketici (DEMO doğrulaması) | 🟡 |
| AK-4.2 | destroy/temizlik | nova-mimic.test | 🟡 |
| AK-5.1 | i18n enjeksiyon + ek anahtar | TranslationProvider.test | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | B1 (`graphics/deprecated` public export) ve B2 (`PlayCanvasViewer` story-only) bu turda yeniden doğrulanmadı | PlayCanvasViewer dizini+stories diskte ✓; deprecated export satırı kök `index.ts`'te görünmedi — iç barrel'dan sızıyor olabilir; A2/A3 temizlik İleri İş'i güncel |
| S2 | B4: sprite'ın vitest kapsamı yok | SPEC'in kendi kabulü — kapı `check-sprite` + storybook; İleri İş #3 |
| S3 | B3/K17 CSS sızıntısı | Bilinçli açık karar (A1) — sapma değil, kuplaj kaydı |
| S4 | `AGENTS-FRONTEND.md` referansı UI SPEC ile uyumlu | transport/provider kontratları aynı sayfada — kopya yok |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: state/fetch kütüphanesi importu yok (grep kanıtı, A.1 #10)
- [x] Purity 2: grafik katmanı props-only — transport/QUERY importu graphics altında yok
- [x] Purity 3: ham hex yasağı — token setleri testli; AI-çıktısı kapısı check-sprite'ta
- [x] K15 presentational: veri çeken grafik yok (hook'lar provider katmanında)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 11/11 AK'ın kanıt yüzeyi mevcut; üç "komut/gözle" kanıtı bu turda koşulmadı (AK-2.2 check-sprite, AK-3.2 storybook, tüm taze koşular) → 🟡 tavanı oradan geliyor. **NIS-2:** UI — XSS/injection yüzeyi taşıyan render katmanı; SPEC'te ek güvenlik AK'sı tanımsız: HTML-enjekte eden bileşen (innerHTML/dangerouslySetInnerHTML) taraması kapanışta yapılmadı — **uyumluluk boşluğu adayı**, G4'e yazıldı; kararı developer. Mutasyon: uygulanmaz (değişen dosya yok).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| 2 bileşen aynı cihaz | addDevices | tek soket, refcount 2 | `WebSocketTransport.test.ts` |
| Soket koptu | reconnect | tüm abonelikler yeniden gönderilir | aynı |
| Malform JSON | onmessage | yok sayılır | aynı (edge) |
| Log taşıyıcı hata | flush | UI devam (fail-open) | `client-logger.test.ts` |
| Transport değişimi | WS→Mock | bileşen kodu aynı | `transport-contract.test.ts` |
| nova ikonu | SCADA_ICONS | Tabler anahtarları bozulmaz | `demo-icons.test.tsx` |
| App ek anahtar | TranslationProvider | çözülür | `TranslationProvider.test.tsx` |
| Texture 404 | çizim | drawX fallback | **KAPSANMAYAN** — kod incelemesi (G5) |
| Sprite nötr-baz | check-sprite | 0 ihlal | **KOMUT KOŞULMADI** (G2) |
| Storybook görsel | AK-3.2 | step katı yerleşim | **GÖZLE KOŞULMADI** (G3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run ui:test` iletilmedi | Düşük | Ana agent |
| G2 | `bun node tools/check-sprite.mjs` (kapı koşusu) bu turda yapılmadı | Orta — sprite regresyonu sessiz kalabilir | KAPANIŞ 🟢 öncesi tek komut |
| G3 | Storybook gözlem turu (BESSDiagram) bekliyor | Düşük | görsel QA turu |
| G4 | innerHTML/dangerouslySetInnerHTML yüzey taraması yapılmadı | Orta — XSS aday yüzey; NIS-2 boşluk adayı | tek grep + bulguyu UI SPEC'ine AK olarak alma kararı |
| G5 | Sprite vitest kapsamı (B4/İleri İş #3) | Düşük-orta | texture-load-fail simülasyon testi |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 40/40+ dosya; K1 saflık grep'le kanıtlandı; G2/G4 komut-tarama boşlukları raporlandı | (yok — SPEC değişmedi) |
