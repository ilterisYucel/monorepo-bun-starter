---
status: active
space: architecture
tags: [mimari, shared-utils, config, spec]
review_date: 2026-11-10
---

# Shared Utils — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `DEPLOYMENT-MIMARISI.md` (device-config drift), `SHARED-TYPES-MIMARISI.md`.

## 1. Amaç ve Bağlam

`packages/shared-utils` paketinin sözleşmesi: `ConfigLoader` + config kaynakları (env/dotenv/json/yaml/object), birim normalizasyonu, secret redaction, değişim izleme ve cihaz-config drift karşılaştırması. Tüm servislerin ve araçların config girişi buradan geçer.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Öncelik zinciri, kaynaklar, birim normalizasyonu, redaction, watch/reload, drift |
| hariç | Config kataloğu içeriği (veri — `definitions.ts`), servis config semantiği (servis SPEC'leri) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Öncelik zinciri: `ObjectSource 5` > `EnvSource 10` > `DotenvSource 20` > `Json/YamlFileSource 30` > `default` | Düşük sayı yüksek öncelik; kaynak sırası sabit |
| K2 | Birim normalizasyonu: `duration-pg` (PG interval doğrular), `duration-ms` (`30s`→30000), `bytes` (`256MB`→sayı); geçersizde throw | Yanlış birim sessizce geçmez |
| K3 | `secret: true` tanımlar `redacted()`'da `***`; `restartOnChange` → `ConfigChangeEvent.restartRequired` | Log/teşhis çıktısında sır yok |
| K4 | `watch()` dosya kaynaklarını izler → `reload()` yalnız değişen anahtar için `onUpdate`/`onChange` tetikler; handler hatası YUTULUR (fail-open) | Config hatası servisi düşürmez |
| K5 | Dotenv kendi parser'ı (dotenv bağımlılığı yok); YAML opsiyonel `require("yaml")` — yoksa kaynak sessizce devre dışı | Bağımlılık yüzeyi dar |
| K6 | `compareDeviceConfig` (drift): kopyada eksik → `error`, fazla → allowlist'te `warn` yoksa `error`; `deviceId/name/connection/transport` ve komutlar karşılaştırma DIŞI | Root `configs/` source-of-truth ↔ deployment kopyası denetimi |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `definitions.ts` ~1017 satır config kataloğu — veridir, ayrı birim değildir | `packages/shared-utils/src/config/definitions.ts` |
| B2 | `units.ts` içinde `import type` dosya sonunda (stil sapması) | `packages/shared-utils/src/config/units.ts` |

## 4. Mimari

```text
Servisler (run.ts / container) ──► ConfigLoader
                                      ├ kaynaklar (Object/Env/Dotenv/Json/Yaml)
                                      ├ birim normalizasyonu
                                      ├ redaction
                                      ├ watch → reload (onChange)
                                      └ device-config-drift (compareDeviceConfig)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/shared-utils/src/config/types.ts#ConfigDefinition` | Tanım tipi |
| `packages/shared-utils/src/config/types.ts#ConfigSource` | Kaynak portu |
| `packages/shared-utils/src/config/loader.ts#ConfigLoader` | Yükleyici |
| `packages/shared-utils/src/config/sources.ts#EnvSource` | Env kaynağı |
| `packages/shared-utils/src/config/units.ts#applyUnit` | Birim normalizasyonu |
| `packages/shared-utils/src/config/device-config-drift.ts#compareDeviceConfig` | Drift |

## 5. Purity Kuralları (ZORUNLU)

1. `definitions.ts` veridir — davranış taşımaz; ayrı SPEC açmaz (B1).
2. Secret değerleri hiçbir log/teşhis çıktısına sızmaz (K3).
3. Watch/reload hatası servisi düşürmez (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Config Yükleme ve Öncelik

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kaynak önceliği, default, birim normalizasyonu, doğrulama
- hariç: servis-spesifik config semantiği

**Akış:**
1. Kaynaklar önceliğe göre birleştirilir.
2. Birimler normalize edilir.
3. `validate` varsa doğrulanır; hata → throw.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Öncelik zinciri (K1) uygulanır | AK-1.1 |
| FR-1.2 | Geçersiz birim/değer throw eder | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** env ve dosya aynı anahtarı verir **WHEN** `load()` çağrılır **THEN** env değeri kazanır
2. **AK-1.2 — GIVEN** `duration-ms` tanımına geçersiz değer **WHEN** normalize edilir **THEN** throw eder

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Öncelik | unit (`loader.test.ts`) | ⬜ |
| AK-1.2 | Birim hatası | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Kaynak yok | `default` kullanılır |
| Bilinmeyen anahtar | `get()` hatası |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-utils/src/config/loader.ts` | Yükleyici |
| `packages/shared-utils/src/config/sources.ts` | Kaynaklar |

### 6.2 UC-2 — Değişim İzleme (watch/reload)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: dosya izleme, değişen anahtar bildirimi, fail-open handler
- hariç: restart orkestrasyonu (servisler)

**Akış:**
1. `watch()` dosya kaynaklarını izler.
2. Değişimde `reload()` yalnız değişen anahtarları işler.
3. `onChange`/`onUpdate` tetiklenir; handler hatası yutulur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Yalnız değişen anahtar için olay tetiklenir | AK-2.1 |
| FR-2.2 | Handler hatası reload'u düşürmez | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** bir anahtar değişti **WHEN** reload koşar **THEN** yalnız o anahtarın olayı tetiklenir
2. **AK-2.2 — GIVEN** handler throw eder **WHEN** reload koşar **THEN** reload tamamlanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Değişen anahtar | unit | ⬜ |
| AK-2.2 | Fail-open | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Dosya silindi | Son değer korunur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-utils/src/config/loader.ts#watch` | İzleme |

### 6.3 UC-3 — Secret ve Birim Normalizasyonu

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `redacted()`, `restartRequired`, birim tipleri
- hariç: sır dağıtımı (deployment)

**Akış:**
1. `secret: true` tanımlar `redacted()`'da `***` olur.
2. `restartOnChange` değişimi `restartRequired` işaretler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Secret değerleri maskelenir | AK-3.1 |
| FR-3.2 | Restart gerektiren değişim işaretlenir | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** secret tanımı **WHEN** `redacted()` çağrılır **THEN** değer `***` görünür
2. **AK-3.2 — GIVEN** `restartOnChange` anahtarı değişti **WHEN** olay üretilir **THEN** `restartRequired=true` olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Redaction | unit | ⬜ |
| AK-3.2 | Restart işareti | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Secret log'a yazılırsa | Redaction engeller |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-utils/src/config/loader.ts#redacted` | Maskeleme |

### 6.4 UC-4 — Cihaz Config Drift

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kopya ↔ kaynak karşılaştırma, allowlist, hata seviyeleri
- hariç: kaynak seçimi (DEPLOYMENT)

**Akış:**
1. İki config seti karşılaştırılır.
2. Eksik → error; fazla → allowlist kontrolü.
3. Sonuç raporlanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Eksik tanım error üretir | AK-4.1 |
| FR-4.2 | İzinli farklar karşılaştırma dışıdır | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** kopyada eksik cihaz **WHEN** drift koşar **THEN** error döner
2. **AK-4.2 — GIVEN** yalnız `deviceId` farkı **WHEN** drift koşar **THEN** hata üretilmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Eksik tespiti | unit (`device-config-drift.test.ts`) | ⬜ |
| AK-4.2 | Muafiyet | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Allowlist'te olmayan fazla | error |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/shared-utils/src/config/device-config-drift.ts` | Drift |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Geçersiz birim | throw |
| Watch hatası | Fail-open (K4) |
| Secret | Maskelenir (K3) |
| Drift eksik | error |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Öncelik/normalizasyon testli | komut |
| SC-2 | Secret sızıntısı yok | kod inceleme |
| SC-3 | Drift denetimi çalışır | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 25 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `SHARED-UTILS-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `units.ts` stil sapmasının düzeltilmesi (B2) | İleri İş (temizlik) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Config kataloğunun (`definitions.ts`) otomatik doküman üretimi.
2. Drift denetiminin CI'a bağlanması.

## 12. T Görev Özeti

| T-1 | UC-1 (yükleme/öncelik) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (watch/reload) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (secret/birim) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (drift) kanıt testlerinin eşleştirilmesi |
