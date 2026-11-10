---
status: active
space: architecture
tags: [mimari, plugins, epias, entegrasyon, spec]
review_date: 2026-11-10
---

# Plugins — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `PLUGIN-SDK-MIMARISI.md`, `EPIAS-CLIENT-MIMARISI.md`, `INTEGRATION-SERVICE-MIMARISI.md`.

## 1. Amaç ve Bağlam

`packages/plugins` grubunun sözleşmesi: örnek entegrasyon plugin'i `epias-market-prices`. Plugin, dış veriyi çeker ve `MarketDataPoint[]` döner; auth ve DB yazımı plugin'de DEĞİLDİR.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Plugin yaşam döngüsü, config eşlemesi, cursor, fetch sözleşmesi |
| hariç | TGT/auth (EPIAS-CLIENT), plugin host (INTEGRATION-SERVICE), seri yazımı (dış seri deposu) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Auth tamamen `EpiasClient`'ta; plugin auth bilmez; `EpiasTicketStore` enjekte edilir | Tüm EPİAŞ plugin'leri tek TGT önbelleğini paylaşır (throttle koruması) |
| K2 | `series` eşlemesi config'den (path/dateField/valueField/`hourField`); `hourField` verilirse timestamp = date + (hour-1) saat (TR); geçersiz satır sessizce atlanır | Veri şekli config'le yönetilir |
| K3 | Cursor `state["lastFetchTo"]`; pencere yoksa cursor'dan, ilk çalışmada son 24 saat; `intervalMs` varsayılan 1 saat | Tekrarlı çekim yok |
| K4 | Config doğrulama `activate` sırasında throw eder → plugin atlanır, servis devam eder | Kademeli bozulma |
| K5 | DB yazımı plugin'de YOK: `MarketDataPoint[]` döner; `ExternalSeriesWriter` servis core'unda yazar | Tek yazım sorumluluğu |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Tek örnek plugin; plugin sayısı artınca "plugin kataloğu" bölümü gerekir | `packages/plugins/epias-market-prices/` |

## 4. Mimari

```text
IntegrationService ──► EpiasMarketPricesPlugin
                          ├ manifest/schedule (interval 1h)
                          ├ EpiasClient (TGT, auth)
                          └ fetch → MarketDataPoint[]  ──► ExternalSeriesWriter
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/plugins/epias-market-prices/src/plugin.ts#EpiasMarketPricesPlugin` | Plugin |
| `packages/shared-types/src/integration-plugin.ts#IIntegrationPlugin` | Entegrasyon kontratı |
| `packages/shared-types/src/integration-plugin.ts#MarketDataPoint` | Veri noktası |

## 5. Purity Kuralları (ZORUNLU)

1. Plugin auth ve DB bilmez (K1/K5).
2. Geçersiz satır sessizce atlanır; plugin çökmez (K2).
3. Config hatası plugin'i devre dışı bırakır, servisi düşürmez (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Plugin Yaşam Döngüsü + Fetch

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: manifest/schedule, activate config doğrulama, fetch + cursor, seri eşlemesi
- hariç: TGT (EPIAS-CLIENT), yazım (INTEGRATION-SERVICE)

**Akış:**
1. `activate` config doğrular; geçersizse throw.
2. `schedule()` interval bildirir.
3. `fetch(window)` veriyi çeker, `MarketDataPoint[]` döner; cursor güncellenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Fetch, cursor'dan devam eder; ilk çalışmada son 24 saati çeker | AK-1.1 |
| FR-1.2 | `hourField` verilirse timestamp date + (hour-1) saat olur | AK-1.2 |
| FR-1.3 | Geçersiz config plugin'i devre dışı bırakır, servis devam eder | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** cursor `lastFetchTo` **WHEN** fetch çalışır **THEN** pencere cursor'dan başlar
2. **AK-1.2 — GIVEN** `hourField` ve saat 3 **WHEN** satır eşlenir **THEN** timestamp 2 saat kaydırılır
3. **AK-1.3 — GIVEN** geçersiz config **WHEN** activate çalışır **THEN** plugin atlanır, servis çalışır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Cursor | unit (`plugin.test.ts`) | ⬜ |
| AK-1.2 | hourField | unit | ⬜ |
| AK-1.3 | Kademeli bozulma | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bozuk satır | Atlanır |
| İki fetch aynı TGT | Tek CAS (EPIAS-CLIENT) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/plugins/epias-market-prices/src/plugin.ts` | Plugin |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Geçersiz config | Plugin atlanır |
| Bozuk satır | Atlanır |
| Fetch hatası | Servis core'unda ele alınır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Plugin sözleşmesi testli | komut |
| SC-2 | Auth/DB plugin'de değil | kod inceleme |
| SC-3 | Cursor ilerlemesi kanıtlı | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 9 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `PLUGINS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Plugin kataloğu bölümünün açılması (plugin sayısı artınca) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Plugin kataloğu (A1).
2. Yeni entegrasyon plugin'leri (her biri kendi bölümü).

## 12. T Görev Özeti

| T-1 | UC-1 (plugin yaşam döngüsü) kanıt testlerinin eşleştirilmesi |
