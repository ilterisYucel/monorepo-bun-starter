---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, apps, indeks]
review_date: 2026-11-10
---

# Apps — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [APPS-MIMARISI.md](./APPS-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** İndeks doğrulama kapanışı — dizin eşleştirme + rename kalıntı taraması + `spec:check`.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `docs/architecture/APPS-MIMARISI.md#4.1` | (2026-11-11 güncel) `apps/` disk listesi: `editor, sim-lab, site` = 3; container-web/container-desktop/superadmin + site-v1.1 silindi, demo-field → site | K1/FR-1.1 |
| 2 | `apps/` rename | (doğrulama) `apps/field` yok → `apps/site` var (K2 ✓); kök script `dev:site` (diff'li) ✓; kaynak kalıntısı: yalnız `superadmin/vite.config.ts` içinde TARİHSEL YORUM satırı — import yok (SC-3 ✓) | K2 |
| 3 | `docs/architecture/APPS-MIMARISI.md#4.1` | (SAPMA) `apps/web`, `apps/demo-backend` diskte YOK (silinmiş) ama satır durumu "silinecek"; §7 "silindi (tarih)" bekliyor | K4/FR-1.2 — S1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Dizin↔satır | dizin okuması + indeks | 7/7 ✓ |
| Kalıntı taraması | grep `apps/field` / `@gd-monorepo/field` apps/** | 1 sonuç — yorum satırı (zararsız) |
| İndeks lint'i | `bun run spec:check docs/architecture/APPS-MIMARISI.md` | **0 hata** (bkz. B.2/G2 — kapanış turu koşusu) |
| Birim app testleri | — | kendi KAPANIŞ'larında (SITE/BOSS/CONTAINER/EDITOR/DEMO) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | Dizin↔satır tam eşleşme | A.1 #1 (7/7) | 🟢 |
| AK-1.2 | Ölü dizin işaretleri | satırlar mevcut ama durum bayat ("silinecek" → "silindi (2026-11)" olmalı) | 🟡 |
| AK-1.3 | spec:check 0 | A.2 — PACKAGES/SERVICES turunda koşulan komut indeks ailesini kapsıyor; APPS tek-koşusu G2 | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | Ölü dizin satırları "silinecek"te kaldı | Diziler silinmiş; K4/§7 lifecycle "silindi (tarih)" notu istiyor — belge hijyeni, karar developer |
| S2 | `DOKUMAN-YAPISI-MIMARISI.md` ölü linki | İlişkili + B2 kanıt satırları diskte olmayan dosyaya işaret (PACKAGES/SERVICES S2 ile aynı kök) |

### A.5 Gözle Kontrol Maddeleri

- [x] K3: container-desktop ayrı SPEC değil — CONTAINER §6.4 bölümü ✓ (CONTAINER-KAPANIŞ AK-4.1)
- [x] sim-lab satırı SIMULATORS bölümüne bağlı (A1 kaydı ✓)
- [x] Tier eşlemesi (container/site/boss) deployment compose tier'larıyla uyumlu — boss compose YOK, DEPLOYMENT K10'da bilinen boşluk olarak kayıtlı ✓

### A.6 Genel Durum Özeti

**İNDEKS UYGUN:** 7/7 satır; rename tam ve kalıntısız; iki belge-hijyeni sapması (S1/S2). NIS-2: indeks — yüzey yok. Mutasyon: uygulanmaz.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Kanıt ref'i |
|:------|:------|:----------------|:------------|
| Dizin listesi | §4.1 | 7 app satırı birebir | A.1 #1 |
| Rename | grep kalıntı | import kalıntısı yok | A.2 |
| Ölü dizin | disk vs satır | "silindi" notu | **KAPSANMAYAN** (G1/S1) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | §4.1 satır durum güncellemesi (S1) | Düşük | SPEC bakımı |
| G2 | — | — | İndeks lint'i bu kapanış turunda koştu (draft+final) |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 7/7 indeks + rename doğrulaması; S1/S2 raporlandı | (yok — SPEC değişmedi) |
