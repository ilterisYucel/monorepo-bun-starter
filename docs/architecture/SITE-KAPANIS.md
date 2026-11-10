---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, site, app]
review_date: 2026-11-10
---

# Site — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [SITE-MIMARISI.md](./SITE-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** `apps/field → apps/site` rename turu + doğrulama kapanışı; davranış KORUNDU (K5), env/import yüzeyi taşındı.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/field/** → apps/site/**` | (değişiklik) tam rename: klasör/package/nx/compose-adları; domain adları KORUNDU (`VITE_FIELD_ID`, `SERVICE_TIER=field`, `peerType:"field"`) | K5/K2 |
| 2 | `apps/site/src/lib/api-base.ts#isTunnelMode` | (doğrulama) tünel subpath tespiti + `fieldRootPath` önek üretimi; testli | K2/FR-2.1 |
| 3 | `apps/site/src/lib/api-client.ts` | (doğrulama) refresh kuyruğu + tünel-guard (401'de İNERT), tam state temizliği — AK etiketli testlerle (AK-1.1..1.4) | K3 |
| 4 | `apps/site/src/features/field-devices/hooks/useFieldDevices.ts#deriveDevicesFromSnapshot` | (doğrulama) snapshot'tan cihaz türetimi (benzersiz deviceId, tip önek, en-yeni birleştirme) — 7 test | K1/FR-1.2 |
| 5 | `apps/site/src/features/field-control/services/fieldManeuverApi.ts#fieldManeuverApi` | (doğrulama) katalog sunucudan (`listManeuvers/listOperations`); panelde "gizli manevra YOKTUR" testi | K4/FR-3.1 |
| 6 | Kalıntı taraması | (doğrulama) `apps/field` import kalıntısı YOK (yalnız superadmin yorum satırı) | SC-3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob + grep `it(` apps/site | **26 test dosyası** (SPEC iddiasıyla birebir) ; src içi **149 `it()`** + kök `vite-config.test.ts` ≈ SPEC'in 151'i (±2, envanter aracıyla netleşir) |
| Talep-üzeri/veri | useContainerData (6), useContainerTelemetry (2), containersApi (7) | |
| Türetim | useFieldDevices (7), useContainerDevices (4, tünel+fallback), derivePcsSummaries (2), deriveDashboard (11) | |
| Tünel/auth | api-base (7: önek + trailing-slash + alt-route), api-client (8: refresh kuyruğu AK-1.1..1.4 etiketli), App.test (3: hydrate/auto-guest K3), site-field (8), AuthStore (6), nav-visibility (4) | |
| Manevra | fieldManeuverApi (3) + defs (4) + FieldManeuverPanel (5) + AdminOperationsPage (4) | |
| B1 kopya | `git diff --no-index apps/site/src/lib/api-base.ts apps/demo-field/src/lib/api-base.ts` | **bayt bayt aynı** — kopya borcu DOĞRULANDI (A2 ileri iş) |
| Taze test koşusu | `nx run site:test` | **İLETİLMEDİ** — reviewer salt-okuma (G1) |
| Mutasyon | `bun run test:mutation` | **İLETİLMEDİ** — rename+modifize dosyalar (RM) değişen sayılır; ana agent koşmalı (G2) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Veri talep üzerine; canlı yalnız latest snapshot | useContainerTelemetry (series isteği) + useContainerData envanteri | 🟡 |
| AK-1.2 | Cihaz listesi snapshot'tan türetilir | useFieldDevices #1–7 (eksik/bilinmeyen önek dahil) | 🟡 |
| AK-2.1 | Uzak UI aynı tünelden subpath ile | api-base #3/#5/#6/#7 (`/fields/:fid/ui` + isTunnelMode) | 🟡 |
| AK-2.2 | Login rotası önekli | routes.test DOSYA OLARAK YOK; karşılık: App.test guard'ları + site-field yönlendirme testleri + api-base `fieldRootPath` | 🟡 |
| AK-3.1 | Katalog yalnız sunucudan | fieldManeuverApi #1 + FieldManeuverPanel "kartlar sunucudan gelir" | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | AK-2.2 kanıt etiketi: SPEC `unit (routes)` diyor, `routes.test.*` dosyası yok | Önek davranışı fiilen api-base+App+site-field testleriyle sabit — kanıt ZAYIF değil, ETİKETİ yanlış; SPEC kanıt hücresi düzeltme önerisi |
| S2 | B1 borcu canlı: iki `api-base.ts` bayt bayt aynı | A2 (ortak lib) İleri İş'i doğrulandı; kopya şu an drift üretmiyor (testler site tarafında) |
| S3 | Taze test + mutasyon iletilmedi | K5 "davranış değişmez" iddiasının komut kanıtı eksik (G1/G2) |

### A.5 Gözle Kontrol Maddeleri

- [x] Veri kopyalanmıyor — site state'i snapshot/tünel kaynaklı, ayrı depo yok (K1/Purity 1)
- [x] Konteyner UI yeniden yazılmadı — tünel iframe/Frame akışı (Purity 2)
- [x] auto-guest kaldırıldı; clearSession tam temizlik (K3 — AuthStore AK-2.1/2.2 etiketli testler)
- [x] Domain env adları korundu — yalnız uygulama adı rename (K5/A1)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** rename davranışı bozmadı; 26 dosyalık test envanteri AK'ları fiilen karşılıyor. Tek semantik sapma S1 (kanıt etiketi). **NIS-2:** oturum/refresh yüzeyi — güvenlik kararları AUTH SPEC'te (kopya yok, referans var ✓). Mutasyon için G2 bekliyor.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Tünel subpath | `/fields/:fid/ui/...` | apiBase önekli; isTunnelMode true | api-base #3/#5/#6 |
| Normal yol | `/dashboard` vb. | düz `/api`; tünel false | api-base #2/#4 |
| Eşzamanlı 401 | N istek | TEK refresh + hepsi retry | api-client AK-1.1 |
| Tünelde 401 | boss localStorage | İNERT — dokunmaz | api-client AK-1.4 |
| Refresh fail | token yok | temizlik + /login navigasyonu | api-client AK-1.3 |
| auto-guest | standalone boot | hydrate ÇAĞRILMAZ | App.test #1 (K3) |
| Cihaz türetimi | snapshot | benzersiz+tip önek+en yeni | useFieldDevices #1–7 |
| Tünel cihaz listesi | oturum açılır | source=tunnel; hata→snapshot fallback | useContainerDevices #1–4 |
| Katalog | panel açılır | sunucu listesi; gizli yok | FieldManeuverPanel #1 |
| Login öneki (AK-2.2) | önekli login | rotalar önekte çözülür | App/site-field — S1 |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run site:test` iletilmedi | Düşük | Ana agent koşar (K5 iddiasının komut kanıtı) |
| G2 | Mutasyon verisi yok (RM-dosyalar) | Orta | `bun run test:mutation` — rename turları sessiz drift üretmesin |
| G3 | routes.tsx'in kendi başına birim testi yok (S1) | Düşük — dolaylı kapsamlı | istenirse routes tablosu birim testi |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış (rename turu): 26 dosya/≈151 test eşleşti; B1 kopya bayt-bayt doğrulandı; S1 kanıt etiketi notu | (yok — SPEC değişmedi) |
