---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, container, electron, app]
review_date: 2026-11-10
---
> **Not (2026-11-11):** İlgili UI app'i kaldırıldı (`apps/superadmin` / `apps/container-web` / `apps/container-desktop`). Bu SPEC/KAPANIŞ tarihsel kayıttır; backend tier servisleri yaşamaya devam eder.


# Container — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [CONTAINER-MIMARISI.md](./CONTAINER-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — bu turda yalnız `vite.config/tsconfig` dokunuşu; davranış envanteri mevcut testlerden.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/container-web/src/lib/api-base.ts#isTunnelMode` | (doğrulama) yalnız `/containers/:cid/ui` öneki tünel; T4.3+Faz5.1 regresyon düzeltüsü testli (8 vaka: alt yol, /containers, file://) | K1/FR-1.1 |
| 2 | `apps/container-web/src/lib/api-client.ts` + `api-client.interceptor.test.ts` | (doğrulama) 401 → tek refresh + kuyruk; tünel modu ayrımı | K4/FR-1.2 |
| 3 | `apps/container-web/src/features/telemetry/utils/dedupeLatest.ts#dedupeLatest` | (doğrulama) REST+WS birleşiminde tekilleştirme; hook izolasyon testleriyle | K2/FR-2.1 |
| 4 | `apps/container-web/src/features/control/services/maneuverApi.test.ts` | (doğrulama) katalog `GET /api/maneuvers` — UI kataloğu tanımlı değil | K3/FR-3.1 |
| 5 | `apps/container-desktop/src/main/index.ts#createWindow` | (SAPMA) `webPreferences`: `preload` + `sandbox:false`; **`contextIsolation` satırda YAZILI DEĞİL** — Electron varsayılanına (true) güveniyor; K5 "açık" iddiası dolaylı | K5 — S1 |
| 6 | `apps/container-desktop/**` (alias/crash) | (doğrulama) `@gd-monorepo/container-web` alias (vite+tsconfig+vitest), `setWindowOpenHandler→shell.openExternal+deny`, `render-process-gone/crashed→reload` | K5/FR-4.1 |
| 7 | `VITE_WS_URL` yüzeyi | (doğrulama) src'de değer olarak KULLANIM YOK — yalnız kök-neden yorumları | K1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob apps/container-web | **12 test dosyası** — SPEC iddiasıyla birebir |
| Tünel tespiti | api-base.test (8+) — önek içi/dışı/file:// vakaları | ✓ |
| Refresh kuyruğu | api-client.interceptor.test + api-client.test | ✓ |
| Telemetri | dedupeLatest.test + RealtimeContext.test + useFieldConnection.test | ✓ |
| Manevra | maneuverApi.test + ManeuverPanel.test | ✓ |
| Auth/mağaza | session-auth.test + AuthStore (via session) + LogStore | ✓ |
| Desktop | **0 test** (kabuk — kanıt kod incelemesi, AK-4.1 zaten "kod inceleme") | |
| Taze koşu / mutasyon | komutlar | **İLETİLMEDİ / verisi yok** (değişen üretim .ts yok) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Tünel tespiti — önek dışı tünel değil | api-base.test önek içi/dışı vakaları | 🟡 |
| AK-1.2 | 401 tek refresh + kuyruk | interceptor testleri | 🟡 |
| AK-2.1 | Bileşen izolasyonu (dedupeLatest + hook) | dedupeLatest.test + RealtimeContext.test | 🟡 |
| AK-3.1 | Sunucu kataloğu | maneuverApi.test | 🟡 |
| AK-4.1 | Electron alias + ince kabuk | kod inceleme A.1 #6 (S1 notuyla) | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `contextIsolation` bilinçli satır olarak pin'lenmemiş; `sandbox:false` | K5 güvenlik iddiası varsayılana emanet — sonraki Electron major'da sessiz değişebilir. Küçük düzeltme: `contextIsolation: true` + `sandbox` kararının gerekçelenmesi; karar developer |
| S2 | B1 borcu (breaker/dcOutput küresel akış) | SPEC A1 İleri İş'i aynen geçerli — bu turda değişmedi |
| S3 | Desktop kabuğun kendi testi yok | AK-4.1 kanıt türü "kod inceleme" olduğundan sapma değil; crash-reload yolları manuel doğrulamalı |

### A.5 Gözle Kontrol Maddeleri

- [x] Sayfa-seviyesi küresel telemetri birleştirmesi yeni kodda yok (K2; B1 istisnası kayıtlı)
- [x] Katalog sabitlenmemiş — panel veriyi API'den çözer
- [x] Electron'da iş mantığı yok: renderer yalnız import alias'ları bağlar (App.tsx 6 satır bağlantı)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 5/5 AK kanıtlı (test/kod-inceleme); tek güvenlik notu S1 — **NIS-2:** desktop kabuğu yerel kimlik/oturum yüzeyi taşıyor; "contextIsolation açık" bir güvenlik AK'sı gibi okunuyor ama koda pin'lenmemiş → kapatma aksiyonu küçük, kararı developer. Mutasyon: uygulanmaz.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `/containers/c-1/ui/...` | isTunnelMode | true (trailing-slash dahil) | `api-base.test.ts` |
| `/containers/c-1` | isTunnelMode | false (kök-neden regresyonu) | aynı |
| `file://` | desktop paket | false | aynı |
| 3× eşzamanlı 401 | interceptor | tek refresh + kuyruk retry | api-client.interceptor |
| WS+REST aynı satır | dedupeLatest | tekil, en yeni kazanır | dedupeLatest.test |
| Katalog değişti | panel mount | sunucudan taze liste | maneuverApi + ManeuverPanel |
| Renderer crash | render-process-gone | loadFile reload | kod inceleme (S3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Desktop webPreferences sabit-assertion testi yok (S1) | Düşük-orta | küçük unit: config objesi assertion veya Playwright-electron smoke |
| G2 | B1 küresel akış izolasyonu (breaker/dcOutput) | Orta — SPEC A1 | bileşen-kapsamlı taşınma işi |
| G3 | Taze koşu iletilmedi | Düşük | `nx run container-web:test` |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 12 dosya eşleşti; S1 contextIsolation pin'leme notu (NIS-2) | (yok — SPEC değişmedi) |
