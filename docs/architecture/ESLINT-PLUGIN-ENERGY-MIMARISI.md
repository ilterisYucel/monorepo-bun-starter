---
status: active
space: architecture
tags: [mimari, lint, guvenlik, asvs, spec]
review_date: 2026-11-10
---

# ESLint Plugin Energy — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `docs/standards/owasp-asvs-level2.md`, `AGENTS.md` (kök lint).

## 1. Amaç ve Bağlam

`tools/eslint-plugin-energy` tool'unun sözleşmesi: 4 güvenlik lint kuralı (`no-math-random`, `no-raw-console-log`, `require-parameterized-query`, `require-timeout`) ve bunların kök lint'te bağlanması. Üretim tool'u — OWASP ASVS Level 2 hizası.

| Katman | Kapsam |
|:-------|:-------|
| dahil | 4 kural, kök ESLint config entegrasyonu, kural testleri |
| hariç | Uygulama kodu düzeltmeleri (ayrı paketler), CI pipeline (İleri İş) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | 4 kural ASVS eşlemesi: `no-math-random` (V6 kriptografi), `no-raw-console-log` (log hijyeni), `require-parameterized-query` (SQL injection), `require-timeout` (kaynak tükenmesi) | Güvenlik kapısı |
| K2 | `no-raw-console-log` yalnız backend dizinlerinde (`BACKEND_SERVICE_DIRS`); `allowPrefixes` ile `[ModuleName]` konvansiyonu kabul edilir (AGENTS.md logging kuralı) | Repo konvansiyonuyla uyumlu |
| K3 | Kök lint'e BAĞLIDIR: `bun run lint` plugin'i dist'e build edip `services/`, `packages/`, `zero-trust-application-tunnel/` üzerinde koşar | Üretim tool'u |
| K4 | Test dosyalarında `no-math-random` ve `require-timeout` KAPALI (test iskelesi güvenlik yüzeyi değil) | Gürültü azaltma |
| K5 | Kural testleri `RuleTester` ile yazılır (valid + invalid her kural) | Kural regresyon kapısı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Önceden 0 test + 0 tüketiciydi (kök lint yoktu); `allowPrefixes` seçeneği tanımlı ama uygulanmıyordu | `tools/eslint-plugin-energy/src/rules/no-raw-console-log.ts` — T-7 ile düzeltildi |

## 4. Mimari

```text
eslint.config.mjs (kök) ──► eslint-plugin-energy (dist) ──► services/packages/zero-trust
                                 ├ no-math-random
                                 ├ no-raw-console-log (allowPrefixes ["["])
                                 ├ require-parameterized-query
                                 └ require-timeout
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `tools/eslint-plugin-energy/src/index.ts#rules` | Kural kaydı |
| `tools/eslint-plugin-energy/src/rules/no-math-random.ts#noMathRandom` | CSPRNG kuralı |
| `tools/eslint-plugin-energy/src/rules/no-raw-console-log.ts#noRawConsoleLog` | Log kuralı |
| `tools/eslint-plugin-energy/src/rules/require-parameterized-query.ts#requireParameterizedQuery` | SQL kuralı |
| `tools/eslint-plugin-energy/src/rules/require-timeout.ts#requireTimeout` | Döngü kuralı |
| `eslint.config.mjs` | Kök bağlama |

## 5. Purity Kuralları (ZORUNLU)

1. Kural yalnız AST üzerinde çalışır; dosya I/O yok.
2. Kurallar repo konvansiyonunu (K2) tanır; yanlış pozitif üretmez.
3. Kök lint kapsamı backend dizinleridir; app'ler kendi config'lerini korur (K3).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Kural Seti + Kök Lint Entegrasyonu

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: 4 kural davranışı, kök config, test dosyası istisnaları, `bun run lint`
- hariç: CI pipeline

**Akış:**
1. `bun run lint` plugin'i dist'e build eder.
2. ESLint kuralları backend dizinlerinde koşar.
3. İhlal varsa çıkış kodu 1.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `bun run lint` 4 kuralı koşar ve temizse 0 döner | AK-1.1 |
| FR-1.2 | `[ModuleName]` prefix'li console çağrıları ihlal sayılmaz | AK-1.2 |
| FR-1.3 | Test dosyalarında math-random/timeout kapalıdır | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** temiz repo **WHEN** `bun run lint` koşar **THEN** çıkış kodu 0'dır
2. **AK-1.2 — GIVEN** `console.log("[X] ...")` **WHEN** lint koşar **THEN** ihlal üretilmez
3. **AK-1.3 — GIVEN** test dosyasında `Math.random()` **WHEN** lint koşar **THEN** ihlal üretilmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Lint temiz | komut | ⬜ |
| AK-1.2 | Prefix istisnası | unit (`rules.test.ts`) | ⬜ |
| AK-1.3 | Test istisnası | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıtlarını (lint + kural testleri) eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Yeni kural | RuleTester testi zorunlu |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `eslint.config.mjs` | Kök config |
| `tools/eslint-plugin-energy/src/rules/*.ts` | Kurallar |
| `tools/eslint-plugin-energy/src/rules/rules.test.ts` | Testler |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| İhlal | Lint hatası (çıkış 1) |
| Prefix'li console | Kabul |
| Test dosyası | İstisna |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `bun run lint` temiz | komut |
| SC-2 | 4 kuralın testi var | komut |
| SC-3 | Kök config kapsamı doğru | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Kural testleri — mevcut 10 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `ESLINT-PLUGIN-ENERGY-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | CI'da lint kapısı | İleri İş |

## 11. İleri İş (bu tool'da YAPILMAZ — referans)

1. CI pipeline'a `bun run lint` kapısı.
2. Yeni ASVS kuralları (ihtiyaç doğunca).

## 12. T Görev Özeti

| T-1 | UC-1 (kural seti + kök lint) kanıtlarının eşleştirilmesi |
