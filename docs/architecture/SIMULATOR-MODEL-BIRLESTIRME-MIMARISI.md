---
status: active
space: architecture
tags: [mimari, simulator, model-birlestirme, sim-lab, spec]
review_date: 2026-11-12
---

# Simülatör Model Birleştirme — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-11-12) → **UYGULANDI (2026-11-13/16)** — T-1..T-12 kapandı; KAPANIŞ: `docs/architecture/SIMULATOR-MODEL-BIRLESTIRME-KAPANIS.md`. Kapanış revizyonu (2026-11-16): K8–K10 eklendi, SC-1 bölündü, A1/A2 kapandı, İleri İş 5–6 eklendi — **onay kapısı yeniden işliyor.**
> **İlişkili:** [SIMULATORS-MIMARISI.md](./SIMULATORS-MIMARISI.md) (paket sözleşmesi — A1/B1 "İleri İş"leri bu SPEC ile uygulanır),
> [SIMULATOR-PIPE-MIMARISI.md](./SIMULATOR-PIPE-MIMARISI.md) (pipe/solver katmanı — K4 bu SPEC'e dayanır),
> [DEVICE-SERVICE-SADELESTIRME-MIMARISI.md](./DEVICE-SERVICE-SADELESTIRME-MIMARISI.md) (`periodicWrites` — K6 ile tutarlı),
> [../simulators/MEVCUT-DURUM-VE-EKSIKLER.md](../simulators/MEVCUT-DURUM-VE-EKSIKLER.md) (§1.1–1.4 davranış fark tabloları — T-1 girdisi).

## 1. Amaç ve Bağlam

**Sorun:** Aynı cihazın davranışı bugün üç yerde yaşıyor: (1) legacy simülatör
sınıfları (`packages/simulators/src/{bsc,hvac,wattox-pcs,…}` — kolaylık modeli,
`SimulatorHost` + Plant'in yardımcı cihazları), (2) fiziksel modeller
(`packages/simulators/src/physical/models/*` — Plant'in BSC/PCS/HVAC tarafı),
(3) fiziksel modellerin `apps/sim-lab/src/*` kopyaları (`plant.test.ts` zinciri).
Bir yerdeki değişiklik diğerlerine yansımazsa davranış sessizce sapar (çift doğruluk).

**Çözüm (kullanıcı yönlendirmesi — 2026-11-12):** Davranış tek kaynağa iner:
fiziksel modeller. Legacy simülatör sınıflarının **config / modbus-server /
interface** kısmı korunur ve sınıflar fiziksel model üzerine ince adaptör olur —
böylece "her simülatör kendi modbus sunucusuyla bağımsız birim" gücü kaybolmaz.
`apps/sim-lab/src/*` kopyaları **silinmez**; legacy compatibility **doğruluk
kontrolü** olarak yaşar — kolaylık sözleşmesini ("anında uygula") sabitleyen bekçi.

| Katman | Kapsam |
| :--- | :--- |
| dahil | Davranış fark envanteri, eşdeğerlik test iskelesi, BSC/PCS/HVAC adaptörleri, connector'un link katmanına oturtulması, aux Plant yamalarının pipe/port sinyallerine dönüşmesi, `SimulatorHost` registry geçişi, kopya zincirin bekçi rolünün sabitlenmesi |
| hariç | Pipe kontratının kendisi (ayrı SPEC), device-service (ayrı SPEC), yeni cihaz aileleri, yeni vendor solver'ları, `physical` modülünün E-O refaktörü (ayrı iş — davranış değiştirmez) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
| :--- | :--- | :--- |
| K1 | (2026-11-12, kullanıcı) Davranışın tek kaynağı **fiziksel modellerdir**; legacy simülatör sınıfları config/modbus-server/interface'i taşıyan ince adaptör olur | Aynı cihazın iki davranışı kalmaz |
| K2 | (2026-11-12, kullanıcı) `apps/sim-lab/src/*` kopyaları silinmez — **legacy compatibility doğruluk kontrolü** olarak tutulur; kolaylık sözleşmesi bu zincirin testleriyle sabitlenir | Bekçi test: paket modeli değişince kopya zincir yeşil kalmalı |
| K3 | Kolaylık sözleşmesi korunur: komut anında etki, sabit ölçümler ("anında uygula") — `uyumlu` profil bunu bugün zaten verir; site entegrasyon testleri bozulmaz | Mevcut entegrasyon sözleşmesi regresyonsuz |
| K4 | Aux cihazlara (CB, DC metre, DC çıkış, IMD, FSS, kontrol paneli IO, PM5340, OG istasyon) **fiziksel model yazılmaz** — EMS için legacy yeterli; Plant'in bu cihazlara yamaları pipe/port sinyallerine dönüşür (pipe SPEC A3) | İki modele de sahip cihaz sayısı sıfıra iner, iş kapsamı sınırlı kalır |
| K5 | Birleşme kademeli: BSC → PCS → HVAC → connector; her adım kendi eşdeğerlik kanıtıyla kapanır | Küçük diff, geri alınabilir adımlar |
| K6 | `SimulatorHost` API'si (builder registry, `start`, `inject`) korunur — device-service artık kullanmaz (ayrı SPEC) ama bağımsız ünite ve test kullanır | "Bağımsız birim" gücü korunur |
| K7 | Legacy adaptör, fiziksel modelin yüzüyle (DeviceFace) birebir aynı register davranışını üretmek zorundadır — kanıtı eşdeğerlik iskelesidir | Sapma testle yakalanır |
| K8 | (2026-11-16, kapanış revizyonu — A1 kapanışı) Adaptör şekli: **ayrı `*LegacyAdaptor` sınıfları** (`bsc-legacy-adaptor.ts`, `pcs-legacy-adaptor.ts`, `hvac-legacy-adaptor.ts`). Legacy sınıflar üretimde kullanılmaz; **eşdeğerlik tabanı + karakterizasyon testleri** için karantinada yaşar, `@deprecated` işaretlenir. Emeklilik ayrı onay (SC-1b / İleri İş 5) | İki yazım yolu üretimde kalmaz; drift harness'ta kızarır |
| K9 | (2026-11-16) Host/PCS şebeke gerilimi **anma 690 V** (`0x2f4f` → 6900, 0,1 V ölçek); legacy stub'ı (400,0 V) kaldırılır — fiziksel modelin gerçek anma değeri esas | EMS tarafında gerçek gerilim okunur; host test beklentisi güncellendi |
| K10 | (2026-11-16) BSC `inject` sözleşmesi (yaklaşık eşleme): `soc:<pct>`→raf SOC · `overheat`→R1 paket sensörü 80 °C · `diff_temp`→127 °C (açık devre) · `fault`→`SOCPF` zorlaması · `nominal`→temizlik. Legacy'nin 15 °C fark senaryosu **kaldırıldı** (sayısal eşdeğerlik aranmaz). `simSpeedMultiplier` adaptörlerde karşılıksız — host bu alanı yok sayar (demo hızı: Plant `spec.sim.speed`) | Enjeksiyon davranışı belgeli ve kasıtlı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
| :--- | :--- | :--- |
| B1 | Aynı cihazın üç temsili: legacy sınıflar, fiziksel modeller, sim-lab kopyaları | `packages/simulators/src/{bsc,hvac,wattox-pcs}` · `packages/simulators/src/physical/models/*` · `apps/sim-lab/src/{models,faces,link}` |
| B2 | Plant, aux cihazlarda legacy sınıf + dış yamayla çalışıyor — davranış iki yerde | `packages/simulators/src/physical/site/plant.ts#physics` (`setMeasurements`, IMD→PCS izolasyon yaması) |
| B3 | sim-lab `main.ts` paket sürümünü kullanıyor ama kopyalar test zincirinde — çift doğruluk riski | `apps/sim-lab/src/main.ts` · `apps/sim-lab/src/plant.test.ts` |
| B4 | Davranış farkları dokümante: BSC başlatma/güç/Ack, PCS durum makinesi, HVAC kontrol | `docs/simulators/MEVCUT-DURUM-VE-EKSIKLER.md` §1.1–1.3 |
| B5 | Eşdeğerlik için ortak test iskelesi yok — legacy ve fiziksel ayrı ayrı test ediliyor | `packages/simulators/src/{bsc,…}/*.test.ts` · `packages/simulators/src/physical/**/*.test.ts` |

## 4. Mimari

```text
                         TEK DAVRANIŞ KAYNAĞI
                    packages/simulators/src/physical/models/*
                       (bsc · pcs-wattox · hvac-mc90 · battery · environment)
                                        ▲
              LegacyAdaptor (config + tick + register map'ten çözüm)
                                        │
        ┌───────────────┬───────────────┼──────────────────┐
        │               │               │                  │
  SimulatorHost    Plant (site)    Bağımsız ünite     apps/sim-lab
  (builder registry, (pipe/port      (kendi modbus     (main.ts → paket;
   tek cihaz)        sinyalleri)     sunucusu)          kopyalar = bekçi)
```

- **Adaptör yönü:** legacy arayüz (`IModbusSimulatorAdapter` + `tick(s)`) fiziksel model
  üzerine sarılır — config'teki register map, komut ve ölçümler legacy yüzden okunur,
  davranış modelden gelir (A1'de kesinleşir).
- **Aux cihazlar:** legacy kalır; Plant yamaları port/pipe sinyali olur (K4) — aux'un
  iki modeli olmaz, tek modeli (legacy) + dış sinyaller.
- **Bekçi:** `apps/sim-lab/src/*` kopyalarının test zinciri CI'da koşmaya devam eder;
  kolaylık sözleşmesinin ihlali orada kızarır (K2).

## 5. Purity Kuralları (ZORUNLU)

1. Davranış mantığı yalnız fiziksel modellerde; adaptörde koşul/durum geçişi YOK (yalnız eşleme/serileştirme).
2. Aux cihazlar için ikinci model üretilmez (K4).
3. Kolaylık sözleşmesi (`uyumlu` profil) bu SPEC'in hiçbir adımında bozulmaz (K3).
4. Legacy adaptör device-service'e dönmez — `SimulatorHost` yalnız paket içi + test kullanımı.
5. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Davranış Fark Envanteri + Eşdeğerlik İskelesi

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: legacy ↔ fiziksel davranış fark tablosunun güncellenmesi (MEVCUT-DURUM §1.1–1.3 bazı), ortak eşdeğerlik harness'i (aynı komut dizisi → iki yüzün register okumalarını karşılaştırır), kırmızı başlangıç (farklar listelenir)
- hariç: farkların kapatılması (UC-2..5), `gercek` profil katılık farkları (bilinen ve kasıtlı — `uyumlu` baz alınır)

**Akış:**
1. Envanter tablosu güncellenir (fark = kasıtlı mı, uyarlanacak mı).
2. Harness: cihaz başına komut/okuma sekansı; legacy ve fiziksel yüz aynı sekansla koşturulur.
3. Fark çıktısı tabloya işlenir (kırmızı kanıt).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-1.1 | System MUST legacy ve fiziksel yüzü aynı komut/okuma sekansıyla koşturan ortak harness sunmak | AK-1.1 |
| FR-1.2 | System MUST farkları (kasıtlı/kapatılacak sınıflamasıyla) envanter tablosuna işlemek | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** BSC için sekans dosyası **WHEN** harness koşar **THEN** iki yüzün register okuma kayıtları üretilir ve fark satırları listelenir
2. **AK-1.2 — GIVEN** fark çıktısı **WHEN** envanter güncellenir **THEN** her fark "kasıtlı (profil)" ya da "kapatılacak" etiketini taşır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-1.1 | Harness iki yüzü koşturur | unit | ⬜ |
| AK-1.2 | Envanter etiketli | kod inceleme | ⬜ |

**T Görev Listesi:**
- [x] T-1: Fark envanteri güncellemesi — §1.5 ölçülen tablo (BSC 1/12, PCS 0/11, HVAC 3/10)
- [x] T-2: Eşdeğerlik harness'i + BSC/PCS/HVAC sekansları — `physical/conformance/equivalence.ts`

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Sekansta desteklenmeyen komut | Harness fark olarak kaydeder, durmaz |
| Zamanlama farkı (Ack süreleri) | `uyumlu` profilde eşit beklenir; fark "kasıtlı" işaretlenebilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/physical/conformance/equivalence.ts` | YENİ — harness |
| `docs/simulators/MEVCUT-DURUM-VE-EKSIKLER.md` | Envanter güncellemesi |

### 6.2 UC-2 — BSC Adaptörü (ilk birleşme)

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: legacy BSC sınıfının fiziksel `Bsc` modeli üzerine adaptör olması (config register map + `IModbusSimulatorAdapter` + tick), `uyumlu` profilde eşdeğerlik yeşili, bağımsız ünite açılışı (kendi modbus sunucusu)
- hariç: PCS/HVAC (UC-3/UC-4), heartbeat (device-service SPEC'in `periodicWrites` alanı — K6 tutarlılığı test edilir)

**Akış:**
1. Adaptör config'ten register map çözer, modeli kurar.
2. `tick(s)` model adımına ilerletir; Modbus okuma/yazma model yüzünden karşılanır.
3. Eşdeğerlik harness'i `uyumlu` profilde fark 0 olur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-2.1 | System MUST legacy BSC register/komut davranışını fiziksel modelden karşılamak (`uyumlu`) | AK-2.1 |
| FR-2.2 | System MUST adaptörün kendi modbus sunucusuyla bağımsız açılmasını sağlamak | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** BSC sekansı **WHEN** adaptör ve fiziksel yüz koşturulur **THEN** `uyumlu` profilde fark satırı 0'dır
2. **AK-2.2 — GIVEN** legacy BSC config'i **WHEN** bağımsız host başlar **THEN** kendi portunda modbus sunucusu açılır ve aynı register'lar okunur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-2.1 | BSC eşdeğerliği | unit (harness) | ⬜ |
| AK-2.2 | Bağımsız ünite | unit | ⬜ |

**T Görev Listesi:**
- [x] T-3: `BscLegacyAdaptor` sözleşmesi + test (önce `it.fails`, T-4'te `it`)
- [x] T-4: Implementasyon + AK-2.1/AK-2.2 yeşili (12/12 test)

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Config'te legacy'ye özel alan (setpoint register'ları) | `uyumlu` profilde tolere; envanterde "kasıtlı" işaretli |
| Model durumu config'te yok (bağımsız ünite) | Site config'teki gibi varsayılanlarla kurulur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/bsc/bsc-legacy-adaptor.ts` | **YENİ adaptör** — legacy sınıf test tabanı olarak kalır (K8) |
| `packages/simulators/src/physical/conformance/equivalence.ts` | BSC sekansı yeşili |

### 6.3 UC-3 — PCS Adaptörü

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: legacy Wattox PCS sınıfının fiziksel `WattoxPcs` modeli üzerine adaptör olması; işaret konvansiyonu (şarj negatif) ve iki-yüz (EMS/BMS) davranışının korunması; eşdeğerlik yeşili
- hariç: connector (UC-5), BMS bloğu içeriği (fiziksel modelde mevcut)

**Akış:**
1. Adaptör EMS yüzünü ve BMS yüzünü model yüzlerinden karşılar.
2. Eşdeğerlik harness'i PCS sekansıyla fark 0 olur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-3.1 | System MUST legacy PCS register/komut davranışını fiziksel modelden karşılamak (`uyumlu`) | AK-3.1 |
| FR-3.2 | System MUST şarj=negatif/deşarj=pozitif işaret konvansiyonunu korumak | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** PCS sekansı **WHEN** adaptör koşturulur **THEN** `uyumlu` profilde fark 0'dır
2. **AK-3.2 — GIVEN** şarj setpoint'i **WHEN** register okunur **THEN** güç negatif işaretlidir (mevcut konvansiyon)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-3.1 | PCS eşdeğerliği | unit (harness) | ⬜ |
| AK-3.2 | İşaret konvansiyonu | unit | ⬜ |

**T Görev Listesi:**
- [x] T-5: `PcsLegacyAdaptor` sözleşmesi + test
- [x] T-6: Implementasyon + AK-3.1/AK-3.2 + BMS yüzü yeşili

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| BMS yüzüne EMS gibi erişim | Mevcut iki-bridge davranışı korunur (SIMULATORS K3) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/wattox-pcs/pcs-legacy-adaptor.ts` | **YENİ adaptör** — legacy sınıf test tabanı olarak kalır (K8) |
| `packages/simulators/src/physical/conformance/equivalence.ts` | PCS sekansı |

### 6.4 UC-4 — HVAC Adaptörü

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: legacy HVAC sınıfının fiziksel `Mc90Hvac` modeli üzerine adaptör olması; FC seti (03/06/10) ve setpoint doğrulamasının korunması; eşdeğerlik yeşili
- hariç: termal zon bağlantısı (Plant alanı — aux sinyalleriyle gelir, K4)

**Akış:**
1. Adaptör model kontrolünü ve register yüzünü karşılar.
2. Eşdeğerlik harness'i HVAC sekansıyla fark 0 olur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-4.1 | System MUST legacy HVAC register/komut davranışını fiziksel modelden karşılamak (`uyumlu`) | AK-4.1 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** HVAC sekansı **WHEN** adaptör koşturulur **THEN** `uyumlu` profilde fark 0'dır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-4.1 | HVAC eşdeğerliği | unit (harness) | ⬜ |

**T Görev Listesi:**
- [x] T-7: `HvacLegacyAdaptor` sözleşmesi + test
- [x] T-8: Implementasyon + AK-4.1 yeşili

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| `force_cool`/`force_heat` aralık dışı setpoint | Mevcut fiziksel model davranışı (doğrulama) korunur — envanterde "kasıtlı" |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/hvac/hvac-legacy-adaptor.ts` | **YENİ adaptör** — legacy sınıf test tabanı olarak kalır (K8) |
| `packages/simulators/src/physical/conformance/equivalence.ts` | HVAC sekansı |

### 6.5 UC-5 — Connector + Aux Sinyalleri + Host Geçişi + Bekçi

**Status:** ✅ Approved (2026-11-12)

**Kapsam:**
- dahil: `BscPcsConnectorAdapter`'ın link katmanına (`BmsLink`/pipe) oturtulması — TCP master davranışı bağımsız ünite çifti için korunur; aux cihaz Plant yamalarının pipe/port sinyallerine dönüşmesi (K4 — pipe SPEC A3 ile koordineli); `SimulatorHost` builder registry'sinin adaptörlere geçişi; sim-lab kopya zincirinin bekçi testi olarak sabitlenmesi (CI)
- hariç: pipe kontratının kendisi, yeni aux modelleri

**Akış:**
1. Connector, kaynak BSC'yi (artık adaptör) okur, hedef PCS BMS yüzüne yazar — mevcut sözleşme aynı kalır.
2. Aux yamaları (DC metre ölçümleri, IMD→PCS izolasyonu) port/pipe sinyali olur.
3. Host registry adaptörleri kurar; bağımsız ünite + çoklu ünite (TCP) testleri yeşil kalır.
4. Kopya zincir bekçi olarak CI'da koşar — paket değişince kopyalar değişmeden yeşil kalmak zorundadır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-5.1 | System MUST connector akışını link katmanı üzerinden sürdürmek (retry, kaynak okuma, hedef yazma) | AK-5.1 |
| FR-5.2 | System MUST aux cihaz yamalarını pipe/port sinyalleriyle beslemek (Plant içi hardcode yama kalmaz) | AK-5.2 |
| FR-5.3 | System MUST `SimulatorHost`'un adaptörlerle bağımsız ünite/çoklu ünite kullanımını korumak | AK-5.3 |
| FR-5.4 | System MUST kopya zincir testlerini bekçi olarak CI'da koşturmak | AK-5.4 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** bağımsız BSC+PCS çifti **WHEN** connector çalışır **THEN** kaynak register'lar hedef BMS bloğuna mevcut mapping'le yazılır; hedef erişilemezse retry
2. **AK-5.2 — GIVEN** Plant **WHEN** aux cihaz tick'i koşar **THEN** ölçümler pipe sinyallerinden gelir, `plant.ts#physics` içinde cihaza özel yama kodu yoktur
3. **AK-5.3 — GIVEN** legacy config'ler **WHEN** `SimulatorHost` başlar **THEN** her simülatör kendi portunda açılır ve enjeksiyon API'si çalışır
4. **AK-5.4 — GIVEN** paket modelinde davranış değişikliği **WHEN** kopya zincir koşar **THEN** kolaylık sözleşmesi testleri yeşil kalır ya da sapmayı kırmızıyla raporlar

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-5.1 | Connector akışı | unit (`bsc-pcs-connector/*`) | ⬜ |
| AK-5.2 | Aux sinyalleri | unit (`plant.test.ts`) | ⬜ |
| AK-5.3 | Host bağımsız/çoklu ünite | unit (`host.test.ts`) | ⬜ |
| AK-5.4 | Bekçi CI'da | kod inceleme + CI | ⬜ |

**T Görev Listesi:**
- [x] T-9: Connector iki yolu netleştirildi (Plant `BmsLink`; host TCP + retry kanıtı)
- [x] T-10: Aux yamaları pipe sinyaline dönüştü — `physical/site/aux-ports.ts` + test
- [x] T-11: `SimulatorHost` üç builder adaptörde — `host.test.ts` 9/9
- [x] T-12: Bekçi workspace/CI'da (`vitest.workspace.ts` + `test.yml`), rol §1.5'te belgeli

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Bağımsız ünitede pipe yok | Mock default'lar (pipe SPEC K2) — bağımsız ünite etkilenmez |
| Bekçi kırmızı yanar | Davranış sapması — birleşme öncesi durum: fark envantere işlenir, kasıtlıysa profil notu |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `packages/simulators/src/bsc-pcs-connector/connector.ts` | Link katmanına oturur |
| `packages/simulators/src/physical/site/plant.ts` | Aux yamaları → sinyaller |
| `packages/simulators/src/host.ts` | Registry adaptörlere geçer |
| `apps/sim-lab/src/plant.test.ts` | Bekçi (rol sabitlenir) |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
| :--- | :--- |
| Adaptör model kuramaz (config eksik) | Fail-fast (config hatası) |
| Eşdeğerlik farkı (uyumlu profil) | Kırmızı test — birleşme o adımda kapanmaz |
| Bekçi kırmızısı | Sapma raporu; envanter güncellenir (kasıtlı/kapatılacak) |
| Bağımsız ünitede pipe yok | Mock default (pipe SPEC K2) |
| Connector hedef erişilemez | Retry (mevcut davranış) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
| :--- | :--- | :--- |
| SC-1a | Üretim yollarında (SimulatorHost + Plant/sim-lab) tek davranış kaynağı — adaptörlerde durum geçişi yok | kod inceleme (purity testleri) |
| SC-1b | Legacy sınıfların emekliye ayrılması (`bsc-simulator.ts`, `wattox-pcs/simulator.ts`, `hvac-simulator.ts`, `xrack/`) — ayrı onay | İleri İş 5 |
| SC-2 | `uyumlu` profilde üç cihazın eşdeğerlik farkı 0 | harness koşusu |
| SC-3 | Site entegrasyon + sim-lab testleri regresyonsuz | `nx run simulators:test` + bekçi |
| SC-4 | Bağımsız ünite kullanımı korunur | `host.test.ts` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
| :--- | :--- |
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | JSDoc adaptör sözleşmeleri + harness + kırmızı eşdeğerlik testleri (T-2, T-3, T-5, T-7, T-9) |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-12; değişen dosyalarda mutasyon ≥%80 |
| 4. REVIEW (GLM-5.3) | `SIMULATOR-MODEL-BIRLESTIRME-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
| :--- | :--- | :--- |
| A1 | Adaptör şekli: legacy sınıfın içinde fiziksel modeli sarmalama (önerilen) vs fiziksel modelin legacy arayüzünü doğrudan implement etmesi | **KAPANDI (2026-11-16):** ayrı `*LegacyAdaptor` sınıfları (K8) |
| A2 | Eşdeğerlik bazı: `uyumlu` profil tek baz; `gercek` profil farkları "kasıtlı" kabulü | **KAPANDI:** `uyumlu` ile kapandı (SC-2 🟢) |
| A3 | Bekçi zincirin ömrü — kopya zincir 21/21 yeşil; rolü sabitlendi. Kaldırma ayrı onay (İleri İş 6) | **AÇIK** — sonraki gözden geçirme |
| A4 | Aux cihazların gelecekte fiziksel modele taşınması gerekenleri (yalnız gerçek fiziksel kuplaj varsa) | **AÇIK** — ilk somut ihtiyaçta |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `packages/simulators/src/physical` modülünün Elegant Object refaktörü (davranış değiştirmez — ayrı SPEC).
2. `packages/core` bayt sırası tutarsızlığı düzeltmesi.
3. Yeni vendor solver modülleri (pipe SPEC A4).
4. Aux cihazlara fiziksel model — yalnız gerçek kuplaj gerektiğinde (A4).
5. **Legacy sınıf emekliliği (SC-1b):** `bsc/bsc-simulator.ts`, `wattox-pcs/simulator.ts`, `hvac/hvac-simulator.ts`, `xrack/` — önce `@deprecated` işareti + barrel notu; eşdeğerlik harness'i stabil N tur yeşil kaldıktan sonra silme kararı (ayrı onay).
6. **Bekçi zincirin rolü (A3):** birleşme KAPANIŞ'ları stabil olunca `apps/sim-lab` kopyalarının kaldırılması ayrı gözden geçirmede değerlendirilir.

## 12. T Görev Özeti

| T-1 | Fark envanteri güncellemesi — UC-1 |
| T-2 | Eşdeğerlik harness'i + sekanslar (kırmızı) — UC-1 |
| T-3 | `BscLegacyAdaptor` sözleşmesi + kırmızı test — UC-2 |
| T-4 | BSC adaptör + eşdeğerlik yeşili — UC-2 |
| T-5 | `PcsLegacyAdaptor` sözleşmesi + kırmızı test — UC-3 |
| T-6 | PCS adaptör + eşdeğerlik yeşili — UC-3 |
| T-7 | `HvacLegacyAdaptor` sözleşmesi + kırmızı test — UC-4 |
| T-8 | HVAC adaptör + eşdeğerlik yeşili — UC-4 |
| T-9 | Connector iki yolu netleştirildi (Plant `BmsLink` kabul; host TCP korunur) — UC-5 |
| T-10 | Aux yamalarının pipe/port sinyallerine dönüşmesi — UC-5 |
| T-11 | `SimulatorHost` registry geçişi + ünite testleri — UC-5 |
| T-12 | Bekçi testin CI'a bağlanması — UC-5 |

İş sırası: UC-1 (iskel) → UC-2 (BSC) → UC-3 (PCS) → UC-4 (HVAC) → UC-5 (connector/aux/host/bekçi).
