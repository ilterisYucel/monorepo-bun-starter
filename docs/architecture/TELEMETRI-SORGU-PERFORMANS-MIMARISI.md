---
status: active
space: architecture
tags: [mimari, telemetri, sorgu-performans, kimlik, timescaledb, gapfill, canonical, spec]
review_date: 2026-10-09
---

# Telemetri Sorgu Performansı ve Seri Kimliği — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟢 Doğrulanmış (2026-10-09) — T-1…T-14 tamam; T-15 (Faz-3) ertelenmiş; doğrulama TELEMETRI-SORGU-PERFORMANS-KAPANIS.md'de.
> **REV.04 (2026-10-09, jenerikleştirme):** Grup anahtarı **çekirdeğe gömülü `rack_id` DEĞİL** —
> `DownsampleOptions.tag?` (ve endpoint `?tag=`) ile **çağıran** belirler (ör. BSC sayfaları
> `tag=rack_id` gönderir). Core/TimescaleDB cihaza özgü tag adı BİLMEZ. Güvenlik: tag anahtarı
> `^[a-zA-Z_][a-zA-Z0-9_]*$` ile doğrulanır (SQL interpolasyon enjeksiyon sınırı). tag verilmezse
> `GROUP BY bucket, name` (ayırımsız). K2/K6/K10 revize; K4 (config normalizasyonu + Feedback
> ayrımı) veri hazırlığı olarak korunur.
> **REV.03 (2026-10-09, implementasyon bulgusu):** flex-bsc bitfield'larında aynı `name+rack_id`
> farklı register'larda tekrar ediyordu (30222 "Component Status" ↔ 30223 "Component **Feedback**
> Status"; 48 çakışma). Kaynak doküman (`20250730_Flex_BSC_Modbusmap_JF1_Rev_AF.xlsx`) ile doğrulandı;
> registerAddress kimliği İSTENMEDİ. Çözüm: 30223 grubunun 6 alanına `… Feedback` eki (528 alan / 11
> dosya) → çakışma 48→0. `dataTag` kaldırıldı; şema racksiz bitfield ↔ register adı çakışmasında
> fail-fast.
> **REV.02 (2026-10-09):** Kimlik (`name + rack_id` — damgasız), `dataTag` kaldırma, config
> uzlaştırma/drift, Faz-1 uzun-format SQL, gapfill/locf (seri-bazlı taşıma sınırı) ve **kanıt
> zinciri** (seed + EXPLAIN + k6) tek pakette birleştirildi. Yazım indirgeme (eski Faz-2)
> [TELEMETRI-OKUMA-YAZMA-MIMARISI.md](./TELEMETRI-OKUMA-YAZMA-MIMARISI.md)'da uygulandı; bu SPEC
> okuma/kimlik tarafının sahibidir.
> **İlişkili:** [TELEMETRI-OKUMA-YAZMA-MIMARISI.md](./TELEMETRI-OKUMA-YAZMA-MIMARISI.md) (yazım
> indirgeme + A6 gapfill devri), [AGENTS-DEVICE-CONFIG.md](../../AGENTS-DEVICE-CONFIG.md)
> (config source-of-truth + canonical sözleşmesi), [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md)
> (`device.ts#readBitfieldGroup` tag üretimi), [STORAGE-ESTIMATE.md](../analysis/STORAGE-ESTIMATE.md).

---

## 1. Amaç ve Bağlam

Faz-1 sorgu şekli + seri kimliği + gapfill/locf + ölçülebilir kanıt tek pakette ele alınır. Amaç:
**kontratları bozmadan** downsampled sorgu maliyetini düşürmek, aynı isimli farklı rack serilerini
doğru ayırmak ve yapılan optimizasyonun **hakikaten etkili olduğunu ölçerek** kanıtlamak.

**Canlı doğrulanan sorun (demo-container `device_bsc_1`, 26 saat simülatör verisi):**

| Bulgu | Ölçüm |
|:------|:------|
| Hacim | **88,8M satır** (yalnız BSC-1, 26 saat) — `count(*)` 111 sn |
| Mevcut şekil `GROUP BY bucket, tags` | 10 dk pencere = **3,7 sn** (adaptörün ~500 `AVG(CASE…)` sütunu eklenince gerçek daha kötü — alt sınır) |
| Önerilen şekil `GROUP BY bucket, name, tags->>'rack_id'` | 10 dk = **274 ms (≈14×)** |
| Aynı isim, farklı rack | 16 bitfield ismi ×8 rack ("Fault", "Warning", "Battery Ready", "Charge/Discharge Status"…) + `Reserved` ×3 racksız |

**Kök nedenler:** (1) `GROUP BY tags` tüm JSONB objesiyle gruplar → kombinasyon patlaması ve pahalı
çıkarım; (2) bitfield isimleri rack başına **tekrar eder** ama DB'de tekil seri kimliği yok;
(3) `dataTag` rack'i ikinci kez (önekle) taşır — çifte modelleme, fonksiyonel tüketicisi yok;
(4) config source-of-truth (`configs/`) ile deployment kopyaları **sapmış**.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `configs/` + deployment config'ler | eksik config ekleme, drift aracı, Reserved normalize | Yeni cihaz tipleri |
| shared-types | `dataTag` kaldırma, seri-teklik fail-fast | canonical semantiği (grup/UI etiketi — korunur) |
| packages/core (adapter) | Faz-1 uzun-format SQL, gapfill/locf + taşıma sınırı | Faz-3 CA/MV (defer), raw `query()` (dokunulmaz) |
| device-service / simulators | `bsc-config` Data Tag parse temizliği, `device.ts` damga kaldırma | OKUMA cadencesi |
| web-service / ön yüz / e2e | — | Kontrat değişmez (K6/K10) |
| Araçlar | `tools/timescale-seed.mjs`, EXPLAIN harness, k6 senaryoları | — |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-09)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Yazım indirgeme TELEMETRI-OKUMA-YAZMA'da **uygulandı**; bu SPEC **Faz-1 sorgu şekli + kimlik + gapfill/locf + kanıt** sahibidir | Tek sahip; çift-kaynak yok |
| K2 | **Seri kimliği = `name` + çağıranın verdiği grup-anahtarı tag'i** (`options.tag` / `?tag=`). Core cihaza özgü tag adı BİLMEZ; tag verilmezse kimlik = `name` | Jenerik; BSC bağlılığı core'dan çıkar |
| K3 | **`dataTag` KALDIRILIR** (şema + tip + `device.ts` damgası + simülatör CSV parse'ı); semantik UI etiketi `canonical` olarak kalır | Çifte modelleme biter; ölü tag temizlenir |
| K4 | Veri hazırlığı: `dataTag` KALDIRILIR; racksiz rack-bazlı bitfield config'lerine `rack_id` eklenir; `name+rack_id` çakışmaları `Feedback` ekli ayrı isimle çözülür (30222/30223) | `tag=rack_id` ile senkron/ayrık veri |
| K5 | `configs/` **source of truth**; eksikler (FSS-1, DEMO-MV-1) köke eklenir; drift aracı sürekli denetler; `bsc` kök (401) kanoniktir | Sapma bir daha sessizce oluşmaz |
| K6 | Downsampled **uzun format** (`bucket, name, tags->>'<tag>', AVG(value)`; tag yoksa `bucket, name`); `unit`/`tags` **seri haritasından** yapıştırılır; dönüş `TelemetryData[]` şekli DEĞİŞMEZ | HTTP ucu/parametreler/tüketiciler aynı |
| K7 | Gapfill/locf yalnız `locfCarryMs > 0` iken; taşıma sınırı **seri-bazlı** (gerçek gözlem bucket'ına göre, JS'te); raw `query()` dokunulmaz; varsayılan **kapalı** | Uydurma veri yok (TEIAŞ kanıt) |
| K8 | demo-field istemci timeout'u **60 sn**; statement timeout gözden geçirilir | >15 sn sorgu iptali (NS_BIND_ABORT) biter |
| K9 | **Kanıt zorunlu:** seed aracı + EXPLAIN (önce/sonra) + k6 senaryoları + kontrat eşdeğerliği; ölçümler warm-up + tekrar | "Etkili oldu" iddiası ölçümle kanıtlanır |
| K10 | **Frontend:** rack-bazlı BSC sayfaları `tag=rack_id` gönderir (filtre gibi); jenerik sayfalar göndermez. Görüntüleme `name` + `tags` ile aynı kalır | Cihaz bilgisi çağıranda; core jenerik |
| K11 | Faz-3 (CA/MV hibrit, eşzamanlılık sınırı) bu SPEC'te tanımlı ama **ayrı faz** (defer) | Faz-1 kazanımı önce doğrulanır |
| K12 | Performans hedefi **names-filtreli** sorgularda p95 < 1 sn; filtresiz tam-tarama ayrı **stres** senaryosudur | Gerçek UI davranışı esas |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `getDownsampledData` `GROUP BY bucket, tags` + isim-başına `AVG(CASE…)` sütunu → patlama | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getDownsampledData`; ölçüm §1 |
| B2 | Bitfield isimleri rack başına tekrar eder; DB'de tekil seri anahtarı yok | Canlı: `Fault` ×8, `Warning` ×8, `Reserved` ×3 (`device_bsc_1`) |
| B3 | `dataTag` rack önekini (`r1_fault`) taşır + `rack_id` tag'i aynı boyutu tekrarlar; frontend hiç kullanmaz | `packages/core/src/modbus/device.ts#readBitfieldGroup`; `configs/flex-bsc.json`; apps/ui taraması boş |
| B4 | Config drift: `fss-1` dev=27 vs aws/demo-edge=21; `bsc-1` dev/demo-edge=403 vs kök `flex-bsc`=401 | `deployment/dev/container/device-configs/fss-1.json` vb. |
| B5 | Kökte olmayan config'ler: `FSS-1`, `DEMO-MV-1` | `AGENTS-DEVICE-CONFIG.md` source-of-truth kuralı |
| B6 | Tüm tüketiciler aynı adaptörü çağırır: unified-routes, data-routes, field `telemetry-series-source` | `services/web-service/src/presentation/routes/unified-routes.ts#telemetry/downsampled`, `...#data-routes`, `services/web-service/src/infrastructure/field-connector/telemetry-series-source.ts` |
| B7 | Kanıt altyapısı yetersiz: k6 yalnız `/health`+login; uzun-menzil veri üretimi yok | `deployment/k6/smoke.js`, `load-test.js` |
| B8 | Sıkıştırma `segmentby='name'`; gapfill sıkıştırılmış chunk'ta ek yük üretir | `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#setupCompression` |
| B9 | `canonical` GRUP etiketidir (kimlik değil): "soc" → 9 isim | `configs/flex-bsc.json` |

---

## 4. Mimari

### 4.1 Seri kimliği (K2/K3/K4)

```
Çekirdek (jenerik): GROUP BY bucket, name [, tags->>'<tag>']
  <tag> = ÇAĞIRANIN verdiği grup anahtarı (options.tag / ?tag=); ör. BSC "rack_id"
  tag verilmezse: yalnız name (ayırımsız — tekil-name cihazlar)
Register telemetri:  name (device-içi unique)
Bitfield alanı:      ayrım tag'i config.tags'te (ör. rack_id); dataTag YOK
Frontend (BSC):      tag=rack_id gönderir; görüntüleme name + tags ile aynı
```

- `dataTag` şema/tip/`device.ts`/simülatörden kaldırılır; `tags.dataTag` eski satırlarda zararsız kalır.
- `Reserved` gibi racksız mükerrerler + 30222/30223 çakışması config'te normalize edilir (`Feedback` eki).
- Şema refine jenerik: ayrım tag'i OLMAYAN bitfield adı register adıyla çakışamaz (cihaza özgü tag adı bilinmez).

### 4.2 Faz-1 downsampled sorgu şekli (K6)

```
SELECT time_bucket('<bucket>', timestamp, '<from>'::timestamptz) AS bucket,
       name,
       tags->>'<tag>' AS tag_value,        -- yalnız tag verilmişse
       AVG(value) AS avg
FROM device_<id>
WHERE timestamp >= $from AND timestamp <= $to
  [AND name = ANY($names)] [AND tags->>'<filtre>' = $val]
GROUP BY bucket, name [, tags->>'<tag>']      -- tag verilmezse yalnız (bucket, name)
ORDER BY bucket ASC
```
- `AVG(CASE…)` sütun listesi ve `GROUP BY tags` kalkar; `(name, timestamp DESC)` indexi kullanılır.
- `<tag>` — SQL interpolasyonu; `^[a-zA-Z_][a-zA-Z0-9_]*$` doğrulaması (enjeksiyon sınırı).
- `unit`/`tags` **seri haritasından** yapıştırılır (`SELECT DISTINCT ON (name[, tags->>'<tag>']) …`); `value` 4 hane yuvarlanır.
- Dönüş `TelemetryData[]` (name/value/unit/timestamp/deviceId/tags/description) — eski çıktıyla eşdeğer.

### 4.3 Gapfill/locf (K7)

- `locfCarryMs = 0` (varsayılan) → mevcut davranış (gapfill yok).
- `locfCarryMs > 0` → `time_bucket_gapfill(...)` + `locf(AVG(value))` + `COUNT(value) AS n`
  (gapfilled bucket'ta `n = 0`); **taşıma sınırı JS'te** uygulanır: her seride son `n>0` bucket'tan
  `locfCarryMs`'den uzak doldurulmuş satırlar NULL'a çevrilir.
- Raw `query()` hiç değişmez (kanıt yolu).

### 4.4 Kanıt zinciri (K9)

| Bileşen | Görev |
|:--------|:------|
| `tools/timescale-seed.mjs` | N cihaz × M seri × T geriye dönük sentetik veri (COPY/batch) — uzun menzil testi simülatör beklemeden |
| `tools/downsampled-bench.mjs` | Senaryo matrisi için `EXPLAIN (ANALYZE, BUFFERS)` → önce/sonra rapor dokümanı |
| `deployment/k6/downsampled.js` | Gerçek endpoint senaryoları + p95 eşikleri |
| Adaptör kontrat testi | Eski geniş-format ↔ yeni uzun-format çıktı eşdeğerliği |

### 4.5 Config uzlaştırma (K5)

- `fss.json` (FSS-1, **27 telemetri** kanonik) + `demo-mv-station.json` (DEMO-MV-1) köke eklenir.
- `bsc` kök (`flex-bsc`, 401) kanonik; dev/demo-edge fazladan 2 girdi kırpılır.
- `tools/device-config-drift.mjs`: kök `configs/` ↔ her deployment kopyası için **register imzası**
  (telemetri `registerAddress`+`name` listesi, bitfield `registerAddress`+alan adları) karşılaştırır;
  yalnız izinli proje alanları (`deviceId`/`name`/`connection`/`transport`) farklı olabilir; sapma = hata.

---

## 5. Purity Kuralları (ZORUNLU)

1. **Kontrat sabittir:** HTTP ucu/parametreleri, `TelemetryData` şekli, `unit`/`description` çizgisi ve
   `value` 4-hane yuvarlaması değişmez (K6/K10).
2. **Kimlik türetilir, damgalanmaz:** `tags.series` gibi ek alan YOK; ayrım tag anahtarı **çağırandan** gelir (`tag`), core cihaza özgü adı bilmez.
3. **`canonical` grup/UI etiketidir** — operatör/şema onu kimlik olarak KULLANMAZ (B9).
4. **Gapfill uydurmaz:** varsayılan kapalı; taşıma yalnız `locfCarryMs` sınırında; raw `query()` dokunulmaz.
5. **Config source of truth:** register/bitfield/alarm/canonical yalnız kök `configs/`'te sabitlenir;
   deployment yalnız proje değişkeni taşır (K5).
6. **Adaptör içi değişiklik:** SQL/plan yalnız TimescaleDB implementasyonunda; mock/arayüz/frontend aynı kalır.
7. **Kimlik filtreleri parametreli:** `name`/tag değerleri parametreli; tag ANAHTARI yalnız `^[a-zA-Z_][a-zA-Z0-9_]*$` doğrulanmışsa interpolasyona girer (enjeksiyon yasak).
8. **Frontend cihaz bilgisini taşır:** rack-bazlı BSC sayfaları `tag=rack_id` gönderir; jenerik sayfalar göndermez (K10).

---

## 6. Use Case'ler

### 6.1 UC-1 — Config Uzlaştırma ve Drift Denetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: eksik kök config'ler (FSS-1, DEMO-MV-1), `bsc` sapma giderme, drift aracı + test
- hariç: yeni cihaz tipleri, canonical/register içerik değişikliği

**Akış:**
1. Deployment'tan `fss-1` (27 kanonik) + `demo-mv-1` alınır, kök `configs/`'e kanonik adla eklenir.
2. `bsc` kök (401) referans alınır; dev/demo-edge kopyalarındaki fazladan girdiler kırpılır.
3. `device-config-drift.mjs` kök ↔ deployment register imzalarını karşılaştırır.
4. Sapma varsa araç hata verir (CI/test kapısı).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Kök `configs/` MUST deployment'ta kullanılan tüm cihaz tiplerini (FSS-1, DEMO-MV-1 dahil) içermelidir. | AK-1.1 |
| FR-1.2 | `bsc` register listesi MUST kök kanonik sürümle (401) özdeş olmalı; deployment sapması giderilmelidir. | AK-1.2 |
| FR-1.3 | Drift aracı, register imzası farkında MUST hata vermelidir; yalnız izinli proje alanları farklı olabilir. | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** deployment'ta kullanılan `FSS-1`/`DEMO-MV-1` **WHEN** kök `configs/` taranır **THEN** bu tiplerin kanonik dosyaları bulunur
2. **AK-1.2 — GIVEN** dev `bsc-1` ve kök `flex-bsc` **WHEN** register imzaları karşılaştırılır **THEN** ikisi de 401 telemetri ile özdeştir
3. **AK-1.3 — GIVEN** bir deployment kopyasında register listesi kökten farklı **WHEN** drift aracı koşar **THEN** hata verir ve farkı raporlar

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Kök config tamlığı | kod inceleme + test | ⬜ |
| AK-1.2 | bsc register özdeşliği | test (imza karşılaştırma) | ⬜ |
| AK-1.3 | Drift fail-fast | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `configs/fss.json` (FSS-1, 27)
- [ ] T-2: `configs/demo-mv-station.json` (DEMO-MV-1)
- [ ] T-3: `bsc` deployment sapması giderme
- [ ] T-4: `tools/device-config-drift.mjs` + test

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `deviceId`/`name`/`connection`/`transport` farkı | İzinli — sapma sayılmaz |
| `EMU-1` kökte var, deployment'ta yok | Sapma değil (simülatör/editor-only) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `configs/fss.json` + `configs/demo-mv-station.json` | YENİ — kök kanonik config'ler |
| `deployment/*/device-configs/*.json` | Sapma düzeltmeleri |
| `tools/device-config-drift.mjs` | YENİ — drift denetimi |

### 6.2 UC-2 — Seri Kimliği ve dataTag Kaldırma

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `dataTag` kaldırma (şema/tip/yazım/simülatör), jenerik kimlik refine, `Reserved`+`Feedback` normalize
- hariç: okuma SQL şekli (UC-3), frontend davranışı (K10)

**Akış:**
1. `dataTag` şema/tip/`device.ts`/simülatörden çıkarılır.
2. Şema refine (jenerik): ayrım tag'i olmayan bitfield adı register adıyla çakışamaz.
3. `Reserved` + 30222/30223 çakışması benzersiz adlandırılır (`Feedback` eki).
4. Frontend görüntüleme aynı; BSC sayfaları sorguya `tag=rack_id` ekler.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `dataTag` MUST şema, tip, `device.ts` damgası ve simülatör parse'ından kaldırılmalıdır. | AK-2.1 |
| FR-2.2 | Şema MUST ayrım tag'i olmayan bitfield adının register telemetri adıyla çakışmasını reddetmelidir (jenerik; cihaza özgü tag adı bilinmez). | AK-2.2 |
| FR-2.3 | Racksız mükerrer isimler (`Reserved`) ve 30222/30223 çakışması MUST ayrık adlandırılmalıdır. | AK-2.3 |
| FR-2.4 | Frontend MUST görüntüleme açısından korunmalı; rack-bazlı sayfalar sorguya ayrım tag'ini (`tag=rack_id`) göndermelidir. | AK-2.4 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** config bitfield alanı **WHEN** şema doğrular **THEN** `dataTag` alanı beklenmez; yeni yazımlarda `tags.dataTag` YOKTUR
2. **AK-2.2 — GIVEN** ayrım tag'i olmayan bitfield adı register adıyla aynı **WHEN** config yüklenir **THEN** fail-fast hata verir
3. **AK-2.3 — GIVEN** `Reserved` mükerrerleri ve 30222/30223 çakışması **WHEN** config yüklenir **THEN** adlar benzersizdir (`Reserved <addr>`, `… Feedback`)
4. **AK-2.4 — GIVEN** rack-bazlı BSC sayfası **WHEN** downsampled ister **THEN** `tag=rack_id` gönderir; görüntüleme davranışı değişmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | dataTag tamamen kalkar | unit + kod inceleme | ⬜ |
| AK-2.2 | jenerik kimlik refine | unit | ⬜ |
| AK-2.3 | Reserved/Feedback normalize | unit + config diff | ⬜ |
| AK-2.4 | Frontend regresyon yok | container-web/field/ui/e2e | ⬜ |

**T Görev Listesi:**
- [ ] T-5: şema/tip `dataTag` kaldırma + jenerik kimlik refine + test güncelleme
- [ ] T-6: `device.ts` dataTag damgası kaldırma + core test güncelleme
- [ ] T-7: simülatör `bsc-config`/`bsc-simulator` Data Tag parse temizliği
- [ ] T-8: `Reserved` + 30222/30223 normalizasyonu

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Eski satırlarda `tags.dataTag` | Zararsız kalır; ayrım `tag` ile yapılır |
| İki bitfield alanı aynı isim + farklı tag değeri | Geçerli (ayrım tag'i ile ayrık) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/shared-types/src/schemas/device-config.ts` + `src/modbus/bitfield.ts` | `dataTag` kaldırma + seri-teklik refine |
| `packages/core/src/modbus/device.ts` | `readBitfieldGroup` damga kaldırma |
| `packages/simulators/src/bsc/bsc-config.ts` + `bsc-simulator.ts` | CSV Data Tag parse temizliği |
| `configs/flex-bsc.json` (+ deployment kopyaları) | `Reserved` normalize + `dataTag` alanları |

### 6.3 UC-3 — Faz-1 Downsampled Sorgu Şekli

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `getDownsampledData` uzun-format SQL, seri haritası, kontrat eşdeğerliği, demo-field timeout
- hariç: gapfill/locf (UC-4), Faz-3 (UC-6), raw `query()` (dokunulmaz)

**Akış:**
1. İstenen isim filtreleri + (varsa) ayrım `tag` anahtarı çözülür.
2. Tek `GROUP BY bucket, name [, tags->>'<tag>']` sorgusu çalışır (tag yoksa name-only).
3. `unit`/`tags` seri haritasından yapıştırılır.
4. Sonuç aynı `TelemetryData[]` şekline eşlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Sistem MUST downsampled sorguyu `GROUP BY bucket, name [, tags->>'<tag>']` ile üretmelidir; `tag` anahtarı çağırandan gelir ve regex ile doğrulanır. | AK-3.1 |
| FR-3.2 | Çıktı MUST eski şekille `name/value/unit/timestamp/tags/description` eşdeğeri olmalıdır (AVG, 4 hane). | AK-3.2 |
| FR-3.3 | demo-field istemci timeout'u MUST ≥60 sn olmalıdır. | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** `tag=rack_id` + names filtreli istek **WHEN** downsampled çalışır **THEN** sonuç `(bucket, name, rack_id)` başına tek satırdır ve `(name, timestamp)` indexini kullanır; geçersiz `tag` → 400
2. **AK-3.2 — GIVEN** aynı girdi **WHEN** eski ve yeni şekil karşılaştırılır **THEN** çıktılar birebir eşdeğerdir
3. **AK-3.3 — GIVEN** demo-field api istemcisi **WHEN** yapılandırma okunur **THEN** timeout ≥ 60000 ms'dir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | uzun-format + parametrik tag + index | unit + EXPLAIN | ⬜ |
| AK-3.2 | çıktı eşdeğerliği | karakterizasyon testi | ⬜ |
| AK-3.3 | timeout ≥ 60 sn | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-9: `getDownsampledData` uzun-format + seri haritası + parametrik `tag` + karakterizasyon testi
- [ ] T-14: demo-field `api-client.ts` timeout 60 sn + test

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| İsim bulunamaz / veri yok | Boş dizi (uydurma yok) |
| `tag` verilmez | name-only gruplama (ayırımsız) |
| Geçersiz `tag` anahtarı | 400 (rota) / yok sayılır (adaptör savunması) |
| Sıkıştırılmış chunk | `GROUP BY name[, tag]` ile segment kullanımı korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.ts#getDownsampledData` | uzun-format SQL + seri haritası |
| `apps/demo-field/src/lib/api-client.ts` | timeout 60 sn |

### 6.4 UC-4 — Gapfill/Locf Sürekliliği

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `time_bucket_gapfill` + `locf` + seri-bazlı taşıma sınırı (`locfCarryMs`)
- hariç: raw `query()` (dokunulmaz), Faz-3 CA/MV

**Akış:**
1. `locfCarryMs = 0` → gapfill kapalı (mevcut davranış).
2. `locfCarryMs > 0` → gapfill+locf; her bucket `COUNT(value) AS n` taşır.
3. JS: her seride son `n>0` bucket'tan `locfCarryMs`'den uzak doldurulmuş satır NULL'a çevrilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | `locfCarryMs > 0` iken downsampled MUST gapfill+locf kullanmalı; `0` iken mevcut davranış korunmalıdır. | AK-4.1 |
| FR-4.2 | Taşıma sınırını aşan boşluklar MUST doldurulmamalıdır (seri-bazlı). | AK-4.2 |
| FR-4.3 | Raw `query()` yolu MUST gapfill/locf içermemelidir. | AK-4.3 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** `locfCarryMs > 0` ve boşluk **WHEN** downsampled çalışır **THEN** boşluk son değerle doldurulur
2. **AK-4.2 — GIVEN** bir seride boşluk `locfCarryMs`'den uzun **WHEN** çalışır **THEN** o aralık NULL kalır; diğer seriler etkilenmez
3. **AK-4.3 — GIVEN** `locfCarryMs > 0` **WHEN** raw `query()` çalışır **THEN** yalnız gerçek satırlar döner

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | gapfill+locf süreklilik | unit | ⬜ |
| AK-4.2 | seri-bazlı taşıma sınırı | unit | ⬜ |
| AK-4.3 | raw dokunulmaz (regresyon) | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-10: gapfill/locf + `locfCarryMs` + seri-bazlı sınır + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Boşluk tam `locfCarryMs` | Sınır dahil taşınır (`≤`) |
| `locfCarryMs = 0` | Gapfill kapalı (varsayılan) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `timescaledb-adapter.ts#getDownsampledData` + `timescaledb-config.ts` | gapfill/locf + `locfCarryMs` |

### 6.5 UC-5 — Kanıt Zinciri (Benchmark)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: seed aracı, EXPLAIN önce/sonra raporu, k6 senaryoları, kontrat eşdeğerlik testi
- hariç: canlı üretim ölçümü zorunluluğu (stres senaryosu dev stack)

**Akış:**
1. Seed aracı uzun menzil (1g/1h/90g) sentetik veri basar.
2. EXPLAIN ANALYZE senaryo matrisi önce/sonra koşar, rapor dokümanına yazar.
3. k6 names-filtreli senaryoları eşiklerle koşar.
4. Adaptör eşdeğerlik testi kontratı garanti eder.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Seed aracı MUST N cihaz × M seri × T aralık geriye dönük veri üretmelidir. | AK-5.1 |
| FR-5.2 | Benchmark MUST senaryo matrisini (tek/çok isim, 2-cihaz, rack filtre, zorunlu menziller) EXPLAIN ile ölçüp raporlamalıdır. | AK-5.2 |
| FR-5.3 | k6 downsampled senaryoları MUST p95 eşiğiyle koşmalıdır. | AK-5.3 |
| FR-5.4 | Adaptör testi eski↔yeni çıktı eşdeğerliğini MUST doğrulamalıdır. | AK-5.4 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** seed aracı hedef gün/cihaz/seri **WHEN** koşar **THEN** ilgili hypertable'larda geriye dönük satırlar oluşur
2. **AK-5.2 — GIVEN** seed verisi **WHEN** benchmark koşar **THEN** senaryo başına süre/plan raporlanır (warm-up + tekrar)
3. **AK-5.3 — GIVEN** dev stack + k6 **WHEN** downsampled senaryosu koşar **THEN** p95 eşiği raporlanır
4. **AK-5.4 — GIVEN** aynı girdi **WHEN** eşdeğerlik testi koşar **THEN** eski ve yeni çıktı birebir eşittir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | seed üretimi | unit + DB kontrol | ⬜ |
| AK-5.2 | EXPLAIN raporu | rapor dokümanı | ⬜ |
| AK-5.3 | k6 eşikleri | k6 çıktısı | ⬜ |
| AK-5.4 | çıktı eşdeğerliği | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-11: `tools/timescale-seed.mjs`
- [ ] T-12: `tools/downsampled-bench.mjs` + rapor dokümanı
- [ ] T-13: `deployment/k6/downsampled.js`

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Ölçüm tek koşum | Geçersiz — warm-up + ≥3 tekrar ortalaması |
| CPU çekişmesi (paralel ağır sorgu) | Ölçüm öncesi izole; not edilir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/timescale-seed.mjs` + `tools/downsampled-bench.mjs` | YENİ |
| `deployment/k6/downsampled.js` | YENİ |
| `docs/architecture/TELEMETRI-SORGU-BENCHMARK.md` | YENİ — ölçüm raporu |

### 6.6 UC-6 — CA/MV Hibrit ve Eşzamanlılık (Faz-3)

**Status:** ⛔ Defer (A3 — Faz-1 kazanımı doğrulandıktan sonra)

**Kapsam:**
- dahil: uzun menzilde CA/MV + son pencere raw; çok-cihazlı downsampled'ta eşzamanlılık sınırı
- hariç: şema yeniden tasarımı, farklı TSDB

**Akış:**
1. Menzil eşiğine göre CA/MV veya raw seçilir; son pencere raw ile tamamlanır.
2. Cihaz sorguları sınırlı eşzamanlılıkla koşar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Uzun menzilde sistem MUST önceden toplanmış seriden okumalıdır. | AK-6.1 |
| FR-6.2 | Çok-cihazlı downsampled'ta eşzamanlılık MUST sınırlanmalıdır. | AK-6.2 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** uzun menzil (≥24 sa) **WHEN** downsampled çalışır **THEN** sonuç CA/MV'den üretilir, raw tam tarama yapılmaz
2. **AK-6.2 — GIVEN** N cihaz isteği **WHEN** downsampled çalışır **THEN** aynı anda en çok K sorgu koşar

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | uzun menzil CA/MV'den | unit | ⬜ |
| AK-6.2 | eşzamanlılık ≤ K | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-15: (Faz-3) CA/MV hibrit + eşzamanlılık semaforu + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| MV güncel değil | Son pencere raw ile tamamlanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/unified-routes.ts` + `packages/core/src` (MV/CA) | hibrit seçim + semafor |

---

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Telemetri var | Sorgu `(name, timestamp)` indexi ile döner; seriler `name` + (varsa) ayrım tag'i ile ayrı |
| Telemetri yok | Boş dizi (uydurma yok) |
| Aynı isim, çok rack | Kimlik çifti ile ayrı seriler; birleşme YOK |
| Sorgu yavaş (>15 sn) | Faz-1'de istemci 60 sn bekler; hedef p95 < 1 sn (names filtreli) |
| Sorgu > 60 sn | Adaptör statement timeout → iptal (hedef: ulaşmamak) |
| Sıkıştırılmış chunk | `GROUP BY bucket, name[, tag]` segment kullanımını korur |
| Racksız mükerrer isim | Normalize; kimlik invariantı yükleme anında garanti |
| Config drift | Drift aracı hata verir (servis/CI kapısı) |
| `locfCarryMs = 0` | Gapfill kapalı (varsayılan) |
| Boşluk > `locfCarryMs` | NULL kalır — grafikte boşluk |
| Beklenmeyen hata | `DomainError` sınırına taşınır |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Downsampled sorgu (names filtreli, 4 sa) p95 < 1 sn | EXPLAIN + k6 (önce/sonra) |
| SC-2 | Aynı isim+farklı rack serileri sorguda ayrı döner (birleşme yok) | unit + canlı DB |
| SC-3 | Ön yüzde istek iptali (NS_BIND_ABORT) oranı ≈ 0 | tarayıcı Network / sunucu logu |
| SC-4 | Kontrat değişmez; `core`, `web-service`, `container-web`, `field`, `demo-field` testleri yeşil | `bun run test` |
| SC-5 | `dataTag` kod/config'te kalmadı; `configs/` drift aracı temiz | kod inceleme + araç |
| SC-6 | `spec:check` temiz + test envanteri güncel | `bun run spec:check` + `bun run test:inventory` |
| SC-7 | `locfCarryMs = 0` iken uydurma satır üretilmez | unit |

---

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | `getDownsampledData` (uzun-format) + `locfCarryMs` sözleşmeleri; drift aracı; seed/bench araçları |
| 3. TEST | T-4/T-5/T-9/T-10/T-11 kırmızı testleri |
| 4. IMPL | T-1/T-2/T-3/T-6/T-7/T-8/T-12/T-13/T-14 |
| 5. KAPANIŞ | `TELEMETRI-SORGU-PERFORMANS-KAPANIS.md` (+ benchmark raporu) |

---

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `locfCarryMs` varsayılan değeri | ⏳ Açık — T-10 öncesi onay (öneri: varsayılan 0 = kapalı) |
| A2 | Sıkıştırma `segmentby` → ayrım tag değeri / `series` kolonu | ⛔ Defer — mevcut `name` ile ölçüm sonrası (B8) |
| A3 | Faz-3 CA/MV + eşzamanlılık | ⛔ Defer — Faz-1 kazanımı doğrulandıktan sonra (UC-6) |
| A4 | Gerçek `series` DB kolonu (tags yerine) | ⛔ Defer — `name` + çağıran-tag yeterli; kolon migrasyonu gerekmez |
| A5 | Filtresiz tam-tarama için ayrı cache/LTTB | ⛔ Defer — names filtreli gerçek UX; gerekirse ayrı SPEC |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Gerçek `series` DB kolonu + `segmentby=series` (A2/A4) — migrasyon gerektirir.
2. Faz-3 CA/MV hibrit + eşzamanlılık sınırı (UC-6).
3. Ön yüz LTTB/istemci-taraflı seyrekleştirme.
4. Boss toplama katmanında önceden toplanmış seri federasyonu.
5. Farklı TSDB (InfluxDB/ClickHouse) değerlendirmesi — kontrat korunur.

---

## 12. T Görev Özeti

| T | Görev | UC |
|:--|:------|:---|
| T-1 | `configs/fss.json` (FSS-1, 27 kanonik) | UC-1 |
| T-2 | `configs/demo-mv-station.json` (DEMO-MV-1) | UC-1 |
| T-3 | `bsc` deployment register sapması giderme | UC-1 |
| T-4 | `tools/device-config-drift.mjs` + test | UC-1 |
| T-5 | Şema/tip `dataTag` kaldırma + seri-teklik refine + test | UC-2 |
| T-6 | `device.ts` dataTag damgası kaldırma + core test | UC-2 |
| T-7 | Simülatör `bsc-config`/`bsc-simulator` Data Tag parse temizliği | UC-2 |
| T-8 | `Reserved` normalize (flex-bsc) | UC-2 |
| T-9 | `getDownsampledData` uzun-format + seri haritası + karakterizasyon | UC-3 |
| T-10 | Adaptör gapfill/locf + `locfCarryMs` + seri-bazlı sınır + testler | UC-4 |
| T-11 | `tools/timescale-seed.mjs` | UC-5 |
| T-12 | `tools/downsampled-bench.mjs` + rapor dokümanı | UC-5 |
| T-13 | `deployment/k6/downsampled.js` | UC-5 |
| T-14 | demo-field `api-client.ts` timeout 60 sn + test | UC-3 |
| T-15 | (Faz-3) CA/MV hibrit + eşzamanlılık semaforu | UC-6 (⛔ Defer) |
