---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, editor, apps]
review_date: 2026-11-10
---

# Editor — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [EDITOR-MIMARISI.md](./EDITOR-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** P1 doğrulama kapanışı — bu turda `apps/editor` kaynak değişikliği YOK; kanıtlar kod incelemesi + mevcut test dosyası.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/editor/src/features/editor/device-catalog/registry.ts#DEVICE_LIBRARY` | (doğrulama) 5 built-in tip; tanımlar `definitions/*` veri dosyalarında — katalog VERİ, kod değil | K2/FR-1.1 |
| 2 | `apps/editor/src/features/editor/device-catalog/index.ts#getDeviceDefinition` | (doğrulama + SAPMA) `DEVICE_LIBRARY[type]` döner; TS tipi kısıtlar ama runtime'da bilinmeyen tip `undefined` döner — "reddedilir" (GWT AK-1.2) koşulu yok, test yok | FR-1.2 — S2 |
| 3 | `apps/editor/src/features/editor/stores/editorStore.ts#useEditorStore` | (doğrulama) undo/redo snapshot yığını, `MAX_UNDO = 50` sınırı (edge case "snapshot limiti" ✓); persist partialize | UC-2 altyapı |
| 4 | `apps/editor/src/features/editor/services/projectApi.ts#projectApi` | (SAPMA) `save` zod doğrulaması YAPMIYOR; sunucu tarafı (`unified-routes.ts#projects` POST/PUT) de body'yi tipte-zorlamadan yazıyor → şema kapısı HİÇBİR YERDE | FR-2.1/AK-2.1 — S3 |
| 5 | `packages/shared-types/src/schemas/device-config.ts#deviceConfigFileSchema` | (doğrulama) tek şema mevcut; `device-service/src/config-loader.ts` tüketiyor (K3 "servisle aynı" ✓); editör tarafı şemayı HİÇ import etmiyor | K3 — S3 |
| 6 | eval yüzeyi | (doğrulama) `apps/editor` genelinde `eval(` / `new Function` YOK (grep 0 sonuç) | K4/SC-3 |
| 7 | Yeni platform paketi üretimi | (doğrulama) `config-engine`/`runtime-engine`/`app-builder` dizinleri yok; `packages/device-library` de yok (migrate tamam) | K1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test dosyası | glob `apps/editor/**/*.test.*` | **tek dosya**: `catalog.test.ts` |
| Katalog | test #1 (5 built-in tip), #2 (tip↔anahtar eşliği), #3 (protokol+ikon bildirimi), #4 (`getDeviceDefinition("pcs")`) | |
| Tanım reddi (bilinmeyen tip) | — | **KAPSANMAYAN** (G2) |
| Store undo/redo | — | **KAPSANMAYAN** (G3) |
| Şema kapısı | — | **KAPSANMAYAN — implementasyon da yok** (G4/S3) |
| Taze test koşusu | `nx run editor:test` | **İLETİLMEDİ** — reviewer salt-okuma (G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — değişen dosya yok |

> **S1 (belge):** SPEC B1 "`catalog.test.ts` **5 test**" diyor; dosyada **4 `it()`** var. Sayı iddiası bayat (muhtemelen "5 built-in tip" assertion'ı ile karıştı).

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Katalog: built-in + kullanıcı cihazları tek yerde | test #1–3 + A.1 #1 — kullanıcı cihazı katmanı: seed+built-in kanıtı var, kullanıcı-cihazı birleştirme testi yok | 🟡 |
| AK-1.2 | Bilinmeyen tip reddedilir | yalnız TS tipi; runtime `undefined`, test YOK (A.1 #2) | 🟡 |
| AK-2.1 | Kaydetme öncesi şema doğrulaması zorunlu | KANIT YOK — client da server da doğrulama yapmıyor (A.1 #4) | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | B1 test sayısı: iddia 5, gerçek 4 | Belge düzeltmesi; davranış etkisi yok |
| S2 | `getDeviceDefinition` bilinmeyen tipi reddetmiyor | `T \| undefined` sessiz dönüş; Elegant-Object #2 (validation ctor'da, throw) ve GWT "reddedilir" ile çelişir — küçük düzeltme adayı: throw veya `Result`; karar developer |
| S3 | Şema kapısı (FR-2.1) implemente edilmemiş | SPEC B1 "config validator = P2+" diyor; ancak UC-2 P1 olarak `status ✏️ Specified` ve AK-2.1 `kod inceleme` kanıtı bekliyor. Ya AK-2.1 P2'ye taşınır (SPEC revizyonu) ya kapı eklenir (client `safeParse` veya server zod). Editör P1 kapanışı bu AK'yı YEŞİL gösteremez |
| S4 | K3 tek şema: editör taraflı yarım | Şema shared-types'ta ve device-service tüketiyor ✓; editör import etmiyor — S3 ile aynı kök |

### A.5 Gözle Kontrol Maddeleri

- [x] Katalog veri; mantık içermiyor (Purity 1)
- [x] `eval` yok (Purity 3/K4)
- [x] Undo sınırı `MAX_UNDO` ile sınırlı — snapshot kaçağı yok
- [x] Yeni platform paketi üretilmemiş (K1)

### A.6 Genel Durum Özeti

**P1 KOŞULU UYGUN — AK-2.1 açık sapmayla:** Katalog (AK-1.1) ve eval yokluğu kanıtlı; AK-1.2 zayıf (tip + eksik test), AK-2.1 karşılıksız (S3). MODÜL bu haliyle "P1 = katalog + store + proje API taşıma" olarak kapanır; şema kapısı ya SPEC'te P2'ye resmileşir ya kod eklenir — **SPEC Revizyon Önerisi** aşağıda. **NIS-2:** editör config üretir → device-service şema doğrulaması son savunmadır (K3 zinciri ayakta); ek güvenlik AK'sı tanımsız — S3 çözülene kadar "kabul yüzeyi doğrulamada editör tarafı zayıf" olarak notlu. Mutasyon: uygulanmaz (değişiklik yok).

### SPEC Revizyon Önerisi

1. **B1 →** "`catalog.test.ts` 4 test" (sayı düzeltmesi).
2. **UC-2 / FR-2.1 / AK-2.1 →** iki seçenekli karar: (a) şema kapısı P2+ kapsamına alınıp `Status ⛔ Defer` işaretlenir (mevcut gerçeklik); (b) P1 kalır, kapı implementasyonu iş açılır (client `projectApi.save` önü `deviceConfigFileSchema.safeParse` veya `unified-routes` POST/PUT zod). Karar developer.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Katalog listesi | `DEVICE_TYPES` | 5 built-in, tip↔anahtar eş | `catalog.test.ts` #1–2 |
| Tanım bütünlüğü | her tanım | protokol + ikon | #3 |
| Bilinen tip | `getDeviceDefinition("pcs")` | tanım nesnesi | #4 |
| Bilinmeyen tip | runtime string giriş | reddedilmeli → şu an `undefined` | **KAPSANMAYAN** (G2) |
| undo/redo | pushSnapshot/undo/redo; MAX_UNDO | snapshot sarmalı, 50 sınır | **KAPSANMAYAN** (G3) |
| Şema kapısı | geçersiz config save | reddedilmeli → şu an kapı yok | **KAPSANMAYAN** (G4) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run editor:test` sonucu iletilmedi | Düşük | Ana agent koşar |
| G2 | Bilinmeyen-tip red test yok (+ S2 davranış boşluğu) | Orta — bozuk config JSON'u sessiz `undefined` üretir | S2 kararı sonrası tek `it()` |
| G3 | editorStore undo/redo test yok | Orta — state motoru korumasız | jsdom + zustand store testi |
| G4 | Şema kapısı testi (ve kapının kendisi) | Yüksek değil — server son savunma; editör UX'i geç yakalar | S3 kararıyla |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: P1 doğrulama; S1–S4 sapmaları + 2 SPEC revizyon önerisi (B1 sayı, AK-2.1 konumlandırma) | (yok — öneri aşamasında) |
