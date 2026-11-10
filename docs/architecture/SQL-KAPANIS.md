---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, sql, core]
review_date: 2026-11-10
---

# SQL — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [SQL-MIMARISI.md](./SQL-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — bu turda `packages/core/src/sql` kaynak değişikliği YOK; SPEC B1 "0 test" iddiası ile birlikte kod incelemesi kanıt.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/core/src/sql/interface.ts#ISqlDatabase` | (doğrulama) CQS: `execute → Promise<void>`, `query → Promise<T[]>`, `queryOne → Promise<T \| undefined>`; JSDoc'ta komut/sorgu ayrımı yazılı | K2/FR-1.1 |
| 2 | `packages/core/src/sql/postgres-adapter.ts#PostgresAdapter` | (doğrulama) lazy havuz: ctor'da bağlantı yok; `#connect` havuz kurar + client alıp bırakır (doğrulama); `#client` havuzsuz throw; `#health` havuzsuz `false`, catch → `false` | K3/FR-2.1, FR-2.2 |
| 3 | `packages/core/src/sql/postgres-adapter.ts#connect` | (SAPMA) `max: config.maxConnections ?? 3` — config'ten override VAR; SPEC K4 "override YOK" diyor (statement_timeout 15000 / idle 30000 / connTimeout 5000 sabit kaldı, `max` hariç) | K4 — S1 |
| 4 | `packages/shared-types/src/config/postgres.ts#PostgresConfig` | (doğrulama) `maxConnections?: number` alanı mevcut — S1'in kaynağı | K4/B2 |
| 5 | SQL enjeksiyon yüzeyi | (doğrulama) adaptör sql+params'ı olduğu gibi `pg`'ye geçirir; metin birleştirme yok; kök `eslint.config.mjs` içinde `energy/require-parameterized-query: "error"` bağlı | K2 Purity 3/FR-1.2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test dosyası varlığı | glob `packages/core/src/sql/*` | **B1 DOĞRULANDI: 0 test dosyası** (yalnız `index.ts`, `interface.ts`, `postgres-adapter.ts`) |
| CQS semantiği | — | kod incelemesi (A.1 #1) — **KAPSANMAYAN** (test borcu) |
| Havuz yaşam döngüsü | — | kod incelemesi (A.1 #2) — **KAPSANMAYAN** (test borcu) |
| Parametreli sorgu lint'i | `bun run lint` | **İLETİLMEDİ** — reviewer salt-okuma; lint bağlamı config incelemesiyle doğrulandı (A.1 #5) (B.2/G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — değişen dosya yok |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | CQS semantiği | kod inceleme (`#ISqlDatabase` imzaları + JSDoc) | 🟡 |
| AK-1.2 | Parametreli sorgu | kod inceleme (birleştirme yok) + lint bağlı (`energy/require-parameterized-query`) — taze lint koşusu iletilmedi | 🟡 |
| AK-2.1 | Bağlantı doğrulaması | kod inceleme (`#connect` client al/bırak) | 🟡 |
| AK-2.2 | Sağlık fail-safe | kod inceleme (`#health` false yolları) | 🟡 |

Tümü "kod inceleme" kanıtlı; SPEC'in öngördüğü karakterizasyon testleri (T-1/T-2) henüz YAZILMAMIŞ — bu, SPEC B1'de kabul edilmiş test borcudur; kapanış AK'ları 🟢'e test yazılmadan taşınamaz.

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `max` havuz sınırı config'ten override edilebiliyor | SPEC K4 + B2 "override YOK" diyor; `PostgresConfig.maxConnections` + `#connect` `?? 3` bu kararı kısmen aşar. Ya K4 "yalnız max override edilebilir"e revize edilir ya alan kaldırılır — **SPEC Revizyon Önerisi** bölümünde; karar developer |
| S2 | Taze lint koşusu iletilmedi | AK-1.2 lint yarısı ve SC-3 komut kanıtı eksik; ana agent `bun run lint` koşmalı |

### A.5 Gözle Kontrol Maddeleri

- [x] `pg` importu yalnız adaptörde (Purity 1)
- [x] `execute` değer döndürmüyor; sorgu metotları state değiştirmiyor (Purity 2)
- [x] Havuz yokken `client()` throw / `health()` false — erken bağlanma yok (K3)
- [x] Zaman serisi yüzeyi `sql` portuna sızmıyor; `TIMESERIES` ayrı (K1)

### A.6 Genel Durum Özeti

**MODÜL KOŞULU UYGUN:** 4 AK kod incelemesiyle 🟡; davranış uyumu yüksek, tek gerçek sapma S1 (K4/maxConnections). Test borcu (B1) kapanmadı — karakterizasyon testleri yazılmadan modül değişikliğine gidilirse AGENTS "dokunulan testsiz dosya → önce test" kuralı işler. **NIS-2:** SQL enjeksiyon sınırı lint kuralı + AK-1.2 ile güvenlik AK'sı taşınıyor → SPEC tarafında uyumluluk boşluğu YOK; kanıt yarım (S2, taze lint koşusu). Mutasyon: uygulanmaz (değişiklik yok).

### SPEC Revizyon Önerisi

- **K4/B2 →** "`max` bağlantı sınırı `PostgresConfig.maxConnections` ile override edilebilir (varsayılan 3); `statement_timeout`/idle/connection timeout sabittir." (Davranışı kod taşıyor; SPEC'i koda uydurmak en ucuz yol. Alternatif: config alanını kaldırıp K4'ü aynen korumak — developer kararı.)

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `execute` | komut çağrısı | `Promise<void>`; client release finally | **KAPSANMAYAN** (G2) |
| `queryOne` boş | SELECT 0 satır | `undefined` | **KAPSANMAYAN** (G2) |
| Parametreli sorgu | `$n` bağlama | değer birleştirme yok | **KAPSANMAYAN** (G2) — lint kapısı dolaylı koruma |
| `client()` havuzsuz | connect öncesi çağrı | throw "Havuz baslatilmamis" | **KAPSANMAYAN** (G3) |
| `health()` havuzsuz | başlatılmamış adaptör | `false` | **KAPSANMAYAN** (G3) |
| `health()` bağlantı hatası | pool.connect fail | `false` (throw yutmazdan) | **KAPSANMAYAN** (G3) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `bun run lint` koşusu iletilmedi (AK-1.2/SC-3) | Düşük | Ana agent koşar; ihlal varsa ayrı iş |
| G2 | UC-1 karakterizasyon testleri (T-1) yok | Orta — en yaygın core kontratı (8+ tüketici); regresyonsuz değişiklik riski | `vi.mock("pg")` ile sahte Pool; imza + CQS + parametre passthrough sabitlemesi |
| G3 | UC-2 karakterizasyon testleri (T-2) yok | Orta — yaşam döngüsü dalları (throw/false yolları) | aynı fake pool ile 3 dal |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: kod incelemesi doğrulaması; S1 (K4/maxConnections) sapması + SPEC revizyon önerisi; B1 test borcu teyit edildi | (yok — öneri aşamasında; developer onayı bekliyor) |
