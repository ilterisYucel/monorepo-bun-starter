---
status: active
space: architecture
tags: [mimari, result, hata, spec]
review_date: 2026-11-10
---

# Result — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` (tüketici), `DOKUMAN-YAPISI-MIMARISI.md`.

## 1. Amaç ve Bağlam

`packages/result` paketinin sözleşmesi: `Result` (Railway Oriented Programming) + `DomainError` taksonomisi. Sistem geneli hata sözleşmesi: beklenen hatalar `Result`, beklenmeyen hatalar `throw DomainError`. Sıfır bağımlılıklı yaprak paket; 20+ tüketici.

| Katman | Kapsam |
|:-------|:-------|
| dahil | `Result` API'si, `okVoid`, hata taksonomisi (kind → HTTP/retry) |
| hariç | HTTP eşlemesinin uygulanması (web-service error-handler), servis hata politikaları |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `null`/`undefined` kabul edilmez; `ok(undefined)` YASAK → komutlar için `okVoid()` sentinel | Değer taşımayan başarı tip güvenli |
| K2 | `Result` immutable ve yan etkisiz (ROP) | Zincirleme (`map`/`andThen`) güvenli |
| K3 | `ErrorKind` → 4xx/5xx eşlemesi + retry kararı; `TransientError.retryable=true`, diğerleri `false` | Retry yalnız geçici hatalarda |
| K4 | Beklenen hata = `Result`, beklenmeyen = `throw DomainError` | Hata kategorisi tek kurala bağlı |
| K5 | Tek yaprak paket (2026-09-01 birleştirme); yayın bağımlılığı `ws-tunnel` ile birlikte (`KUTUPHANE-CIKARMA-PLANI`) | Kopya Result yasak — tek kaynak |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `ws-tunnel` kendi yerel `Result` kopyasını taşır (paket bağımsızlığı kararı, DOMAIN-KALINTI K2) — API birebir aynı, tek kaynak değil | `zero-trust-application-tunnel/ws-tunnel/src/result/` |
| B2 | Yayın notu: ws-tunnel yayınlanırsa result da yayınlanır | `KUTUPHANE-CIKARMA-PLANI.md` |

## 4. Mimari

```text
Tüm servisler/paketler ──► Result<T,E> + DomainError
                              ├ ok/err/okVoid
                              ├ map/andThen/match/unwrapOr
                              └ ErrorKind → HTTP + retryable
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/result/src/result.ts#Result` | Sonuç tipi |
| `packages/result/src/result.ts#VOID_SENTINEL` | `okVoid` sentinel |
| `packages/result/src/domain-error.ts#ErrorKind` | Hata kategorisi |
| `packages/result/src/domain-error.ts#DomainError` | Hata tabanı |
| `packages/result/src/domain-error.ts#TransientError` | Retry'lanabilir hata |

## 5. Purity Kuralları (ZORUNLU)

1. Paket sıfır runtime bağımlılığı taşır.
2. `Result` immutable; hiçbir metot girdiyi mutasyona uğratmaz (K2).
3. `ws-tunnel` yerel kopyası ayrı ürün sınırıdır; monorepo içi yeni kod `@gd-monorepo/result` kullanır (B1).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Result Sözleşmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `ok/err/okVoid`, `unwrap` sınırları, `map/andThen/match`, immutability
- hariç: hata taksonomisi (UC-2)

**Akış:**
1. Başarı → `ok(value)` veya `okVoid()`.
2. Hata → `err(DomainError)`.
3. Zincirleme `map`/`andThen` ile yapılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `ok(undefined)` reddedilir; değersiz başarı `okVoid()` ile ifade edilir | AK-1.1 |
| FR-1.2 | `unwrap`/`error` yanlış tarafta fırlatır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `ok(undefined)` **WHEN** çağrılır **THEN** hata fırlar
2. **AK-1.2 — GIVEN** `err` sonucu **WHEN** `unwrap()` çağrılır **THEN** hata fırlar

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Sentinel | unit (`result.test.ts`) | ⬜ |
| AK-1.2 | Unwrap sınırı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| `unwrapOr` hata tarafında | Fallback döner |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/result/src/result.ts` | Sonuç tipi |

### 6.2 UC-2 — Hata Taksonomisi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `ErrorKind`, 4xx/5xx eşlemesi, `retryable`, alan koruması
- hariç: HTTP yanıt üretimi (web-service)

**Akış:**
1. Hata `DomainError` alt sınıfıyla üretilir.
2. `kind` HTTP sınıfına eşlenir.
3. `retryable` retry kararını belirler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Her `ErrorKind` tek HTTP sınıfına eşlenir | AK-2.1 |
| FR-2.2 | Yalnız `TransientError` retry'lanabilir | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `ValidationError` **WHEN** HTTP eşlemesi yapılır **THEN** 4xx üretilir
2. **AK-2.2 — GIVEN** `TransientError` **WHEN** retry kararı verilir **THEN** `retryable=true` olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Kind eşlemesi | unit (`domain-error.test.ts`) | ⬜ |
| AK-2.2 | Retryable | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş code/message | Constructor reddeder |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/result/src/domain-error.ts` | Hata ailesi |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Beklenen hata | `Result.err` |
| Beklenmeyen hata | `throw DomainError` |
| Geçici hata | `TransientError` (retryable) |
| Yanlış taraf erişimi | Throw |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Result/hata sözleşmesi testli | komut |
| SC-2 | Tek kaynak (yeni kodda kopya yok) | kod inceleme |
| SC-3 | Kind→HTTP eşlemesi tek yerde | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 27 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-2 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `RESULT-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `ws-tunnel` yerel Result kopyasının paket bağımsızlığı kararı (B1) | Kabul edildi (ayrı ürün sınırı) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. ws-tunnel yayınlanırsa result paketinin de yayınlanması (B2).

## 12. T Görev Özeti

| T-1 | UC-1 (Result sözleşmesi) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (hata taksonomisi) kanıt testlerinin eşleştirilmesi |
