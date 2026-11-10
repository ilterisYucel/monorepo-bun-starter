---
status: active
space: architecture
tags: [mimari, core, sql, postgres, spec]
review_date: 2026-11-10
---

# SQL — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `TIMESERIES-MIMARISI.md` (zaman serisi kontratı ayrıdır), `DOKUMAN-YAPISI-MIMARISI.md` (K16 istisnası).

## 1. Amaç ve Bağlam

`packages/core/src/sql` klasörünün sözleşmesi: `ISqlDatabase` portu ve `PostgresAdapter`. Zaman serisi DEĞİL; metadata/durum sorguları (cihaz kaydı, kullanıcı, kural, log) içindir. En yaygın core kontratı (8+ dosya tüketici). **Test borcu vardır (B1).**

| Katman | Kapsam |
|:-------|:-------|
| dahil | Sorgu portu (CQS), havuz yaşam döngüsü, sağlık, sabitler |
| hariç | Zaman serisi sorguları (`TIMESERIES`), migration'lar (deployment) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | TimescaleDB sözleşmesinden AYRI port: metadata/durum sorguları, zaman serisi değil | İki kontrat karışmaz; tüketici doğru portu seçer |
| K2 | CQS: `execute` → `void`, `query` → `T[]`, `queryOne` → `T \| undefined` | Komut/sorgu ayrımı interface JSDoc'unda |
| K3 | Lazy havuz: `connect()` havuz kurar + client alıp bırakır (doğrulama); `client()` havuz yoksa throw; `health()` havuz yoksa `false` | Erken bağlantı yok |
| K4 | Sabitler: `statement_timeout` 15000 ms, idle 30 sn, connection timeout 5 sn, `max` 3 — config'ten override YOK | Timescale adaptöründen farklı (belirsiz: bilinçli mi — A1) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | **0 test dosyası** — AGENTS "testsiz PR merge edilmez" kuralına aykırı; dokunulduğunda karakterizasyon testi zorunlu | `packages/core/src/sql` |
| B2 | Havuz sabitleri config'ten override edilemiyor (K4) | `postgres-adapter.ts` |

## 4. Mimari

```text
Servisler (device/data/web/management) ──► ISqlDatabase (core/sql)
                                                │
                                                ▼
                                        PostgresAdapter ──► pg Pool
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/core/src/sql/interface.ts#ISqlDatabase` | Port (CQS) |
| `packages/core/src/sql/postgres-adapter.ts#PostgresAdapter` | Adaptör |
| `packages/shared-types/src/config/postgres.ts#PostgresConfig` | Config tipi |

## 5. Purity Kuralları (ZORUNLU)

1. `pg` importu yalnız adaptörde; tüketiciler `ISqlDatabase` görür.
2. Komut (`execute`) değer döndürmez; sorgu metotları yan etkisizdir (K2).
3. SQL string birleştirme yasak — parametreli sorgu (`$1..$n`); lint kuralı `energy/require-parameterized-query` kökte bağlı.
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Sorgu Yürütme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `execute/query/queryOne` semantiği, parametreli sorgu
- hariç: iş sorguları (tüketici servisler)

**Akış:**
1. `execute(sql, params)` yan etki üretir, değer döndürmez.
2. `query<T>(sql, params)` satır dizisi döner.
3. `queryOne<T>` ilk satırı veya `undefined` döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `execute` değer döndürmez; `query` dizi; `queryOne` tek satır/undefined | AK-1.1 |
| FR-1.2 | Sorgular parametreli (`$n`) çalışır; değer birleştirme yok | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `queryOne` boş sonuç **WHEN** çağrılır **THEN** `undefined` döner
2. **AK-1.2 — GIVEN** parametreli sorgu **WHEN** çalıştırılır **THEN** değerler `$n` ile bağlanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | CQS semantiği | kod inceleme | ⬜ |
| AK-1.2 | Parametreli sorgu | kod inceleme + lint | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 karakterizasyon testlerini yaz (test borcu — B1)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Havuz yok | `client()` throw |
| Sorgu hatası | `pg` hatası aynen yükselir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/sql/interface.ts` | Port |
| `packages/core/src/sql/postgres-adapter.ts` | Adaptör |

### 6.2 UC-2 — Havuz Yaşam Döngüsü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `connect()`, `client()`, `health()`, sabitler
- hariç: havuz ayarının config'ten yönetimi (A1)

**Akış:**
1. `connect()` havuzu kurar ve bağlantıyı doğrular.
2. `client()` havuz yoksa throw eder.
3. `health()` havuz yoksa false döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `connect()` bağlantıyı doğrular (client alıp bırakır) | AK-2.1 |
| FR-2.2 | `health()` havuz yoksa throw etmez, `false` döner | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** geçerli config **WHEN** `connect()` çağrılır **THEN** bağlantı doğrulanır
2. **AK-2.2 — GIVEN** havuz yok **WHEN** `health()` çağrılır **THEN** `false` döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Bağlantı doğrulaması | kod inceleme | ⬜ |
| AK-2.2 | Sağlık fail-safe | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 karakterizasyon testlerini yaz (test borcu — B1)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bağlantı hatası | `connect()` hata fırlatır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/core/src/sql/postgres-adapter.ts` | Havuz |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Havuz yok | `client()` throw; `health()` false |
| Sorgu hatası | `pg` hatası yükselir |
| Sabitler | Config'ten override edilemez (K4) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Test borcu kayıtlı ve karakterizasyon testleri yazılır | komut |
| SC-2 | CQS semantiği kanıtlı | kod inceleme |
| SC-3 | Parametreli sorgu lint kapısı temiz | komut (`bun run lint`) |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Karakterizasyon testleri (T-1/T-2) |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | Test yeşil; mutasyon kapısı |
| 4. REVIEW (GLM-5.3) | `SQL-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Havuz sabitlerinin config'ten override edilmesi (B2) | İleri İş (ihtiyaç doğarsa) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Havuz ayarlarının config'ten yönetimi (A1).
2. Sorgu performans metriklerinin izlenmesi.

## 12. T Görev Özeti

| T-1 | UC-1 (sorgu yürütme) karakterizasyon testlerinin yazılması |
| T-2 | UC-2 (havuz yaşam döngüsü) karakterizasyon testlerinin yazılması |
