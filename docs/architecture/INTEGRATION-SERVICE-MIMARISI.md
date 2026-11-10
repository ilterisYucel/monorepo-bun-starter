---
status: active
space: architecture
tags: [mimari, integration-service, plugin-host, spec]
review_date: 2026-11-10
---

# Integration Service — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `PLUGIN-SDK-MIMARISI.md`, `EPIAS-CLIENT-MIMARISI.md`, `DEPLOYMENT-MIMARISI.md` (customer-plugins).

## 1. Amaç ve Bağlam

`services/integration-service` sözleşmesi: plugin host — workspace + müşteri plugin'lerini yükler, zamanlamayı BullMQ'ya bağlar, `FETCH_EXTERNAL` job'larını çalıştırır ve dış serileri `external_series` tablosuna yazar. Müşteri plugin'leri deployment'tan mount edilir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Plugin host, zamanlama, fetch worker, dış seri yazımı, credential yönetimi |
| hariç | Plugin framework (PLUGIN-SDK), EPİAŞ auth (EPIAS-CLIENT), plugin iş mantığı (PLUGINS) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Plugin host: statik (workspace) + runtime dizin (`integration.pluginDir` → `deployment/<proje>/common/customer-plugins`); `kind!=="integration"` atlanır | Müşteri eklentisi kod değişikliği olmadan yüklenir |
| K2 | Plugin'ler zamanlamayı SAHİPLENMEZ; `schedule()` bildirir → BullMQ repeatable job (`integration-fetch:<name>`) | Zamanlama tek yerde |
| K3 | `FETCH_EXTERNAL` worker concurrency 2: `plugin.fetch` → `ExternalSeriesWriter.write` | Tek yazım sorumluluğu |
| K4 | `external_series` hypertable + upsert `(source, series, timestamp)`; Timescale uzantısı yoksa uyarı ile devam | Kademeli bozulma |
| K5 | EPİAŞ TGT önbelleği state dir'de paylaşılır (throttle koruması) | Tek TGT |
| K6 | Credential'lar env'den okunur; config dosyasında düz metin sır TUTULMAZ | Güvenlik |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `config/plugins/epias-market-prices.json` içinde düz metin kullanıcı adı + şifre commit'li | `services/integration-service/config/plugins/` — T-18 ile düzeltilecek |

## 4. Mimari

```text
run.ts ──► PluginLoader (statik + dizin) ──► PluginRegistry
             │
             └ schedule() ──► BullMQ repeatable ──► FETCH_EXTERNAL worker
                                                      ├ plugin.fetch
                                                      └ ExternalSeriesWriter.write ──► external_series
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `services/integration-service/src/integration-service.ts#IntegrationService` | Servis |
| `services/integration-service/src/external-series-writer.ts#ExternalSeriesWriter` | Dış seri yazımı |
| `packages/plugin-sdk/src/registry.ts#PluginRegistry` | Registry |
| `packages/shared-types/src/integration-plugin.ts#IIntegrationPlugin` | Plugin kontratı |

## 5. Purity Kuralları (ZORUNLU)

1. Servis plugin iş mantığını bilmez; yalnız host'luk yapar (K1).
2. Zamanlama plugin'de değil (K2).
3. Düz metin sır config'te yok (K6).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Plugin Host + Zamanlama

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kaynak yükleme, kind filtresi, schedule→repeatable, activate/deactivate
- hariç: framework detayı (PLUGIN-SDK)

**Akış:**
1. Kaynaklar taranır; uygun plugin'ler aktive edilir.
2. `schedule()` bildirimleri repeatable job'a dönüşür.
3. Servis kapanışında plugin'ler deaktive edilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Yalnız `kind==="integration"` plugin'ler yüklenir | AK-1.1 |
| FR-1.2 | `schedule()` repeatable job olarak kurulur | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** farklı kind'lı plugin **WHEN** host başlar **THEN** o plugin yüklenmez
2. **AK-1.2 — GIVEN** interval schedule **WHEN** activate biter **THEN** repeatable job kurulur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Kind filtresi | unit (`integration-service.test.ts`) | ⬜ |
| AK-1.2 | Schedule | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Activate hatası | Plugin atlanır, servis devam |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/integration-service/src/integration-service.ts` | Host |
| `services/integration-service/run.ts` | Wiring |

### 6.2 UC-2 — Dış Seri Yazımı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `FETCH_EXTERNAL` worker, upsert, Timescale yoksa uyarı
- hariç: plugin fetch (PLUGINS)

**Akış:**
1. Worker job'u alır.
2. `plugin.fetch` → `MarketDataPoint[]`.
3. `ExternalSeriesWriter.write` upsert yapar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Aynı `(source, series, timestamp)` upsert edilir | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** aynı anahtarlı iki nokta **WHEN** yazılır **THEN** tek satır güncellenir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Upsert | unit (`external-series-writer.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Timescale yok | Uyarı + devam |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/integration-service/src/external-series-writer.ts` | Yazıcı |

### 6.3 UC-3 — Credential Yönetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: env'den credential, config'te sır yasağı
- hariç: EPİAŞ auth akışı (EPIAS-CLIENT)

**Akış:**
1. Credential env'den okunur.
2. Config dosyası yalnız sır olmayan alanları taşır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Düz metin sır repo'da bulunmaz; env referansı kullanılır | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** plugin config **WHEN** incelenir **THEN** sır alanı env referansıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Sır yok | gözle + komut | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıtını eşleştir (T-18 ile)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Env eksik | Plugin activate hatası → atlanır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/integration-service/config/plugins/*.json` | Config |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Kind uyumsuz | Atlanır |
| Activate hatası | Atlanır |
| Timescale yok | Uyarı + devam |
| Sır eksik | Plugin atlanır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Host/schedule/fetch testli | komut |
| SC-2 | Upsert doğru | komut |
| SC-3 | Düz metin sır yok | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 2 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-3 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `INTEGRATION-SERVICE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Müşteri plugin rehberinin ayrı dokümanı | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Müşteri plugin yazma rehberi (A1).
2. Plugin izolasyonu/sandbox değerlendirmesi (PLUGIN-SDK K1 ile hizalı).

## 12. T Görev Özeti

| T-1 | UC-1 (host/schedule) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (dış seri) kanıt testinin eşleştirilmesi |
| T-3 | UC-3 (credential) kanıtının eşleştirilmesi |
