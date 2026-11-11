---
status: active
space: architecture
tags: [mimari, app, demo, nova, spec]
review_date: 2026-11-10
---

# Demo — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `APPS-MIMARISI.md` (indeks), `UI-MIMARISI.md` (nova bölümü), `SIMULATORS-MIMARISI.md`, `SITE-MIMARISI.md`.

## 1. Amaç ve Bağlam

Nova demo konsolu: `packages/ui/src/nova` (saf çekirdek + Demo* bileşenleri) + `apps/site` (ince tüketici, canlı backend'e bağlı). 3 eski SPEC (DEMO-FIELD, DEMO-FIELD-KONSOL, DEMO-KONSOL-UI-UYUM) bu dokümanda birleşir. Demo, ürün app'lerini etkilemez.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Nova mimik çekirdeği, sanal filo fan-out, demo konsol görünümleri, demo manevra/operasyon, tema |
| hariç | Ürün UI'ı (UI SPEC), simülatör (SIMULATORS), backend (SERVICES) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Nova `packages/ui/src/nova`'da; app İNCE tüketici (`Demo` prefix + barrel) | Demo mantığı app'e sızmaz |
| K2 | Framework'suz çekirdek: `createNovaMimic(svg, topo, opts)` saf TS port + `DemoMimic` sarmalayıcı; `destroy()` temizler, global state YOK | Test edilebilir |
| K3 | Sanal filo fan-out: 1 gerçek konteyner → 9 sanal ünite; üniteler gerçek değeri birebir yansıtır, yalnız PCS gücü bölünür (MW÷9, PCS başına MW÷18) | Saha toplamı korunur |
| K4 | İstasyon modeli hub'a SIZMAZ: 2 BESS istasyonu × 9 ünite + istasyon başına 1 MV simülatörü; topoloji EMS web-service'te (`GET /api/fields/:fieldId/topology`) | Hub yalnız peer kimliği |
| K5 | Açık-Kapalı: kök servisler yalnız EKLER (demo manevra/operasyon katalog dosyaları, eklemeli kurallar, `preconditions` hook, alarm resolve `note`) | Üretim davranışı değişmez |
| K6 | Purity: `demo-data/**` ve `nova/**.ts` saf (Date.now/IO yok); renk yalnız token, hex YASAK | Deterministik |
| K7 | Konsol İngilizce (i18n çağrısı bırakılmaz); light+dark tema + toggle | Referans tasarım |
| K8 | Register-source modu: Values · Tooltip · Inline; localStorage persist; backend sözleşmesi değişmez | Görsel deneyim |
| K9 | Portföy: 2 proje (1 canlı); login inişi `/projects` | Demo akışı |
| K10 | Nova CSS kök barrel'dan import edilir → ürün app'leri demo CSS'ini yükler (bilinen kuplaj) | UI SPEC A1 ile aynı |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | 3 eski SPEC birleştirildi; kararlar dağınıktı | `DEMO-FIELD-*`, `DEMO-FIELD-KONSOL-*`, `DEMO-KONSOL-UI-UYUM-*` |
| B2 | CSS sızıntısı (K10) | `packages/ui/src/index.ts` |

## 4. Mimari

```text
packages/ui/src/nova
├ nova-mimic.ts (createNovaMimic, computeEnergization)
├ saf modüller (demo-plant, demo-market, demo-readiness, demo-bess-data, demo-registers, demo-portfolio-map)
├ Demo* bileşenleri (Mimic, KpiStrip, TrendChart, ContainerScada, BessScada, OperationsView, MarketView, FaultsView, AdminView, PortfolioMap, PlantOverview, PackSchematic, DevicePanels)
└ tema (apply-nova-vars, nova-console.css, nova-mimic.css)

apps/site (ince tüketici)
├ mapFieldToMimicState / fanOutUnits
├ deriveKpis / deriveAlerts / buildTrendSeries
└ demoApi / demoManeuverApi
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/ui/src/nova/nova-mimic.ts#createNovaMimic` | Mimik çekirdeği |
| `packages/ui/src/nova/mimic-types.ts#NovaMimicState` | Durum tipi |
| `packages/ui/src/nova/apply-nova-vars.ts#applyNovaVars` | Tema |
| `apps/site/src/features/demo-data/mapFieldToMimicState.ts#mapFieldToMimicState` | Veri eşlemesi |
| `apps/site/src/features/demo-data/mapFieldToMimicState.ts#fanOutUnits` | Fan-out |
| `apps/site/src/features/demo-data/deriveKpis.ts#deriveKpis` | KPI |

## 5. Purity Kuralları (ZORUNLU)

1. Nova çekirdeği saf TS; global state yok (K2/K6).
2. Kök servisler yalnız eklemeli değişir (K5).
3. Renk token'dan; hex yok (K6).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Nova Mimik Çekirdeği

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `createNovaMimic`, enerjilenme hesabı, destroy, saf yardımcılar
- hariç: app veri akışı (UC-2)

**Akış:**
1. `createNovaMimic` SVG + topoloji ile kurulur.
2. Durum güncellemeleri saf fonksiyonlarla hesaplanır.
3. `destroy()` kaynakları temizler.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Çekirdek framework'suz ve global state'sizdir | AK-1.1 |
| FR-1.2 | `destroy()` sonrası kaynak kalmaz | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** çekirdek **WHEN** iki örnek oluşturulur **THEN** birbirini etkilemez
2. **AK-1.2 — GIVEN** destroy çağrıldı **WHEN** dinleyiciler kontrol edilir **THEN** temizlenmiştir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | İzolasyon | unit (nova testleri) | ⬜ |
| AK-1.2 | Temizlik | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bozuk SVG | Kurulum hatası |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/nova/nova-mimic.ts` | Çekirdek |

### 6.2 UC-2 — Sanal Filo / Fan-out

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: 1→9 fan-out, PCS güç bölünmesi, istasyon modeli, topoloji
- hariç: gerçek konteyner verisi (SITE)

**Akış:**
1. Gerçek konteyner verisi okunur.
2. 9 sanal üniteye fan-out edilir; PCS gücü bölünür.
3. İstasyon modeli (2×9 + 1 MV) topolojiden kurulur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Sanal üniteler gerçek değerleri birebir yansıtır; toplam güç korunur | AK-2.1 |
| FR-2.2 | İstasyon modeli hub'a sızmaz | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** gerçek PCS gücü 9 MW **WHEN** fan-out **THEN** ünite başına 1 MW, toplam 9 MW
2. **AK-2.2 — GIVEN** istasyon topolojisi **WHEN** hub verisi incelenir **THEN** istasyon bilgisi yoktur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Toplam korunumu | unit (`mapFieldToMimicState`) | ⬜ |
| AK-2.2 | Katman | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Eksik ünite | Kalanlar gösterilir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/site/src/features/demo-data/mapFieldToMimicState.ts` | Eşleme |

### 6.3 UC-3 — Demo Konsol Görünümleri

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: KPI/trend/alarm/portföy/admin görünümleri, tema, register-source modu, İngilizce metin
- hariç: ürün UI bileşenleri (UI SPEC)

**Akış:**
1. Demo verisi saf türevlerle hazırlanır.
2. Görünümler Demo* bileşenleriyle render edilir.
3. Tema toggle'ı CSS değişkenlerini değiştirir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Konsol metinleri İngilizcedir (i18n çağrısı yok) | AK-3.1 |
| FR-3.2 | Register-source modu kalıcıdır | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** demo konsol **WHEN** etiketler incelenir **THEN** İngilizce sabittir
2. **AK-3.2 — GIVEN** mod seçildi **WHEN** sayfa yenilenir **THEN** mod korunur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | İngilizce | unit (`nova-components.test.tsx`) | ⬜ |
| AK-3.2 | Persist | unit (`reg-mode`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tema yok | Varsayılan light |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/ui/src/nova/**` | Bileşenler |

### 6.4 UC-4 — Demo Manevra/Operasyon

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: demo katalog dosyaları (eklemeli), demo manevra API'si, sonuç gösterimi
- hariç: manevra semantiği (KOMUT-MANEVRA)

**Akış:**
1. Demo katalog dosyaları kök kataloğa eklenir.
2. Demo app manevrayı çalıştırır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Demo katalogları kök katalogları DEĞİŞTİRMEZ, yalnız ekler | AK-4.1 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** demo katalogları **WHEN** kök katalog okunur **THEN** üretim kayıtları aynen durur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Eklemeli | unit (`demoManeuverApi`) | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Katalog çakışması | Demo adı ayrık tutulur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `apps/site/src/features/demo-maneuver/**` | Demo manevra |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Çekirdek destroy | Temizlik |
| Fan-out eksik ünite | Kalanlar |
| Katalog | Eklemeli |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Çekirdek/fan-out testli | komut |
| SC-2 | Üretim app'leri etkilenmez | kod inceleme |
| SC-3 | Hex yok, token kullanımı | lint/kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 51 test dosyası |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `DEMO-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Nova CSS sızıntısının giderilmesi (B2) | UI SPEC A1 ile birlikte |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. CSS izolasyonu (A1).
2. Demo E2E kapsamı.

## 12. T Görev Özeti

| T-1 | UC-1 (mimik çekirdeği) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (fan-out) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (konsol görünümleri) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (demo manevra) kanıt testinin eşleştirilmesi |
