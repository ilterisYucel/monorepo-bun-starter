---
status: active
space: architecture
tags: [mimari, management-service, kural-motoru, spec]
review_date: 2026-11-10
---

# Management Service — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `SERVICES-MIMARISI.md` (indeks), `SHARED-TYPES-MIMARISI.md` (AutomationRule şeması), `PLATFORM-MIMARISI.md` (kanallar), `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`.

## 1. Amaç ve Bağlam

`services/management-service` sözleşmesi: kural motoru — `MANAGEMENT` job'larından snapshot toplar, `rules.json` kurallarını kenar-tetikli değerlendirir ve aksiyonları yürütür (komut, container-command, manevra/operasyon, log, notify). Kural motoru bu servisin bölümüdür (ayrı SPEC açılmaz).

| Katman | Kapsam |
|:-------|:-------|
| dahil | Snapshot, değerlendirme semantiği, aksiyon kanalları, kural kataloğu |
| hariç | Kural şeması (SHARED-TYPES), komut yürütme (PLATFORM), manevra semantiği (KOMUT-MANEVRA) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `MANAGEMENT` job → snapshot; TTL bayat girişler çıkarılır (sessiz cihaz değerlendirmede yok sayılır) | Taze veri |
| K2 | Kenar-tetikli: yalnız inactive→active; aktifken tekrarlamaz; koşul başına debounce; `cooldownMs` bastırır; `armAfterFalse` açılışta TRUE ise ateşlemez | Sel yok, kurtarma kuralı |
| K3 | `canonical` etiketi ile ikincil indeks (ör. `soc` → `BSC SOC`) | Semantik eşleme |
| K4 | `rules.json` strict şema; geçersizse açılış REDDEDİLİR (fail-fast) | Bozuk kural yüklenmez |
| K5 | Aksiyon tipleri: `command` (COMMAND_DEVICE), `container-command` (field proxy), `maneuver`/`operation` (web-service internal token), `log`, `notify`; aksiyonlar SIRALI, biri başarısızsa devam (kademeli bozulma) | Tek kural çoklu aksiyon |
| K6 | `202` → `ok + started`; terminal durum `operation_*` audit'inden izlenir | Uzun işlem ayrımı |
| K7 | Kanal yoksa aksiyon fail; internal token yoksa web-service yolu 403 (fail-closed) | Güvenlik sınırı |
| K8 | `notify` logger yoksa atlanır | Kademeli bozulma |
| K9 | Kural kataloğu VERİDİR; deployment config'leri testle sabitlenir (regresyon kapısı) | Kural regresyonu |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Kural kataloğu 5 ayrı test dosyasıyla deployment config'lerine bağlı | `services/management-service/src/*-rules*.test.ts` |

## 4. Mimari

```text
MANAGEMENT job ──► CycleSnapshotStore ──► RuleEvaluator ──► ActionExecutor
                                               │                 ├ command
                                               │                 ├ container-command
                                               │                 ├ maneuver/operation
                                               │                 ├ log
                                               │                 └ notify
                                               └ rules.json (strict)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `services/management-service/src/cycle-snapshot-store.ts#CycleSnapshotStore` | Snapshot |
| `services/management-service/src/rule-evaluator.ts#RuleEvaluator` | Değerlendirme |
| `services/management-service/src/action-executor.ts#ActionExecutor` | Aksiyon |
| `services/management-service/src/rule-config-loader.ts#RuleConfigLoader` | Config |
| `services/management-service/src/device-catalog.ts#DeviceCatalog` | Hedef çözümü |

## 5. Purity Kuralları (ZORUNLU)

1. Değerlendirme saf mantık + config; I/O executor'da (K2).
2. Kural kataloğu veridir; kod değil (K9).
3. Kanal yoksa fail-closed (K7).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Kural Değerlendirme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: snapshot, kenar-tetik, debounce, cooldown, armAfterFalse, canonical indeks
- hariç: aksiyon yürütme (UC-2)

**Akış:**
1. Snapshot tazelenir; bayat girişler çıkarılır.
2. Koşullar değerlendirilir; kenar geçişi tespit edilir.
3. Geçişte aksiyon listesi üretilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Yalnız inactive→active geçişinde aksiyon üretilir | AK-1.1 |
| FR-1.2 | `armAfterFalse` açılışta TRUE ise ateşlemez | AK-1.2 |
| FR-1.3 | Bayat cihaz değerlendirmede yok sayılır | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** koşul aktif **WHEN** sonraki cycle **THEN** yeni aksiyon üretilmez
2. **AK-1.2 — GIVEN** açılışta koşul TRUE **WHEN** ilk cycle **THEN** aksiyon yok
3. **AK-1.3 — GIVEN** TTL aşmış cihaz **WHEN** cycle **THEN** o cihaz değerlendirilmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Kenar-tetik | unit (`rule-evaluator.test.ts`) | ⬜ |
| AK-1.2 | armAfterFalse | unit | ⬜ |
| AK-1.3 | TTL | unit (`cycle-snapshot-store.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Boş snapshot | Değerlendirme yok |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/management-service/src/{rule-evaluator,cycle-snapshot-store}.ts` | Değerlendirme |

### 6.2 UC-2 — Aksiyon Yürütme + Kanallar

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: 5 aksiyon tipi, sıralı yürütme, kademeli bozulma, 202 semantiği, fail-closed
- hariç: kanal implementasyonları (PLATFORM/WEB-SERVICE)

**Akış:**
1. Aksiyonlar sırayla yürütülür.
2. Biri başarısızsa sonuç fail olur, diğerleri denenir.
3. `202` → `ok + started`.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Aksiyonlar sıralıdır; biri başarısızsa akış devam eder | AK-2.1 |
| FR-2.2 | Kanal/token yoksa aksiyon fail-closed döner | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** 2 aksiyon, ilki hata **WHEN** execute **THEN** ikincisi denenir, sonuç fail
2. **AK-2.2 — GIVEN** internal token yok **WHEN** manevra aksiyonu **THEN** fail (403)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Kademeli | unit (`action-executor.test.ts`) | ⬜ |
| AK-2.2 | Fail-closed | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Notify logger yok | Atlanır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/management-service/src/action-executor.ts` | Executor |
| `services/management-service/src/{container-command,maneuver-operation}-channel.ts` | Kanallar |

### 6.3 UC-3 — Kural Kataloğu (veri sözleşmesi)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kural setleri (FL-05 hysteresis, PPC zinciri, R-06/SOC), tier yerelliği, strict yükleme
- hariç: şema (SHARED-TYPES)

**Akış:**
1. `rules.json` strict şemadan geçer.
2. Geçersizse açılış reddedilir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Geçersiz kural dosyası açılışı reddeder | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** bilinmeyen anahtarlı kural **WHEN** açılış **THEN** servis başlamaz

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Fail-fast | unit (`rule-config-loader.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tier'a özgü kural | Yalnız o tier'da yüklenir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `services/management-service/src/rule-config-loader.ts` | Yükleyici |
| `deployment/v2/dev/*/rules/*.json` | Katalog |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Koşul aktif | Tekrar ateşlemez |
| Aksiyon hatası | Kademeli devam |
| Kanal yok | Fail-closed |
| Bozuk kural | Açılış reddi |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Değerlendirme semantiği testli | komut |
| SC-2 | Aksiyon kanalları fail-closed | komut |
| SC-3 | Kural kataloğu regresyon kapısı | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 11 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-3 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `MANAGEMENT-SERVICE-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Kural kataloğunun tier-bazlı otomatik doğrulanması | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Kural kataloğu doğrulamasının CI'a bağlanması.
2. Yeni aksiyon tipleri.

## 12. T Görev Özeti

| T-1 | UC-1 (değerlendirme) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (aksiyon) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (katalog) kanıt testinin eşleştirilmesi |
