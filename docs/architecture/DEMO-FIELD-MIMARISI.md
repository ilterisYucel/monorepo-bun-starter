---
status: active
space: architecture
tags: [mimari, field, saha, scada, demo, spec]
review_date: 2026-11-04
---

# DEMO-FIELD — Saha Demo Uygulaması Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-10-07) — implementasyon sürüyor.
> **İlişkili:** [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](./KOMUT-MANEVRA-OPERASYON-MIMARISI.md),
> [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md),
> `AGENTS-UI.md`, `AGENTS-DEVICE-CONFIG.md`, `AGENTS-KOMUT-MANEVRA.md`.

## 1. Amaç ve Bağlam

Enerji mühendislerinin Claude'a hazırlattığı framework'suz **NOVA-EMS** arayüz çalışması
(`nova-topology`, `nova-mimic` SVG saha yerleşimi + tek hat, `nova-charts`, ışık-modu renk
paleti, OG hücre kumandası + manevra ekranı) kaynak alınır. Amaç: bu arayüzün **saha (field)
demo** sürümünü monorepo'ya taşıyıp **mevcut backend'e canlı bağlamak** — gerçek telemetriyle
beslenen, gerçek manevra/komut API'lerini kullanan, 6 konteynerlik bir sahayı görselleştiren
demo uygulaması. Nova bileşenleri tekrar kullanılabilir olması için `packages/ui/src/nova/`
altında yaşar; uygulama ince bir tüketicidir.

**Bağlam sınırı:** Backend'de gerçek OG köşk/fider/RMU/POI veri modeli **yoktur**
(FIELD-MANEVRA boşlukları G-1/G-3/G-4). Bu katman, demo için **nova'ya özel cihaz
config'leri + yeni bir simülatör tipi** ile canlı beslenir; gerçek donanım/model bu paketin
kapsamı dışındadır.

| Katman | Kapsam |
|:-------|:-------|
| **Dahil** | Yeni `apps/demo-field` uygulaması; `packages/ui/src/nova/` bileşenleri (SVG saha yerleşimi + tek hat, KPI/uyarı/detay/OG hücre, manevra sihirbazı, trend); ışık renk token'ları + demo ikonları; **ayrı demo manevra/operasyon katalog dosyaları** + eklemeli demo kurallar; **demo MV istasyon simülatörü + config**; 2. PCS zinciri; **manevra entegrasyon testleri**; **AWS demo ürün dizini** (`deployment/aws/demo-edge`, konteyner ön yüzü olmadan) |
| **Hariç** | Mevcut `apps/field` ve kök servislerin (web/device/data/management/integration) mevcut davranışlarının değiştirilmesi; gerçek MV donanımı/modeli; tüm field app'in light tema dönüşümü; canlı WS telemetri; `dTdt10` türetimi |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Veri kaynağı: canlı backend + **demo cihaz config'leriyle canlı MV katmanı** | SOC/SOH/sıcaklık/PCS telemetrisi gerçek uçlardan; OG köşk/RMU durumu `demo-mv-station` cihazından; manevralar gerçek execute uçlarına gider |
| K2 | Nova bileşenleri **`packages/ui/src/nova/`** altında (paylaşımlı); `apps/demo-field` ince tüketici | Mimic, KPI, uyarı, detay, hücre diyaloğu, trend, manevra bileşenleri ui'da; ileride başka app'ler kullanabilir |
| K3 | Bileşenler **`Demo` prefix**'li | `DemoMimic`, `DemoKpiTile`, `DemoManeuverWizard`, `DemoTrendChart`, `DemoCellDialog` … |
| K4 | Işık modu yalnızca yeni ekranlar | Nova paleti `packages/ui/src/colors`'a `COLORS_LIGHT`/`COLOR_LIGHT` olarak eklenir; mevcut koyu set ve diğer sayfalar değişmez |
| K5 | Nova modülleri **framework'suz TS portu** | `createNovaMimic(svg, topo, opts)` fabrikası + `DemoMimic.tsx` React sarmalayıcı |
| K6 | **Sanal filo:** 1 gerçek konteyner → 6 sanal ünite | Sunumsal varyasyon YOK — 6 ünite gerçek değeri **birebir** yansıtır (gerçek %50 ise hepsi %50); yalnızca PCS gücü ünite sayısına bölünür → saha toplamı gerçek kalır |
| K7 | **2 PCS/konteyner**, bank↔BSC↔PCS 1:1 | `bank A↔BSC-1↔PCS-1`, `bank B↔BSC-2↔PCS-2`; eksik `pcs-2` config'i bu işte kapatılır |
| K8 | **Ayrı demo manevra kataloğu dosyaları** — mevcut dosyalara dokunulmaz | Yeni `demo-maneuvers.json`/`demo-operations.json` (field + container); yükleyici bunları **eklemeli** okur (dosya yokken davranış birebir); mevcut `maneuvers.json`/`operations.json` DEĞİŞMEZ. Kayıt isimleri prefix'siz: `charge`, `discharge`, `full_charge`, `full_discharge`, `calibration`, `standby` |
| K9 | `dTdt10` **kapsam dışı** | Sıcaklık uyarıları eşik + hücre ΔV ile üretilir |
| K10 | Ölçü hücresi H03 **demo MV telemetrisinden** | Yoksa PM5340-1; kesici hücreleri demo sim interlock'larıyla kumandalı |
| K11 | SOC/telemetri koşullu geçişler **eklemeli demo kurallarla** | Field `rules.json`'a yeni kayıtlar; mevcut kurallar değişmez |
| K12 | **Open-Closed (kök servisler)** | Mevcut davranış değişmez; yalnız ekleme: demo katalog **dosyaları** + opsiyonel yükleyici desteği, yeni simülatör builder, eklemeli kural. Paylaşımlı kod tamamlamaları: `host.ts` `connector.sim.target` + `loadTierManeuverRecords` opsiyonel demo dosyaları (ikisi de yokken eski davranış birebir) |
| K13 | **Manevralar entegrasyon testleriyle kanıtlanır** | Gerçek stack'te yükleme→execute→run tamamlandı→telemetri değişti; `bun run test:demo-integration` |
| K16 | **Zamanlı durdurma (saniye) uzak adıma iletilir** (additive) | `options.timer` (sn) hem yerel komut adımlarına hem uzak manevraya (`TunnelManeuverChannel` gövdesi `{params, timer}`) iletilir; timer yokken gövde yalnız `{params}` (mevcut davranış birebir) |
| K15 | **Şarj/deşarj çapraz katman** (gerçek `field_charge` deseni) | `charge`/`discharge` birer **operasyon**: uzak `bsc_charge`/`bsc_discharge` + yerel `pcs_charge`/`pcs_discharge`. Kullanıcı `powerKw` iki katmana da yayılır (PCS ve BSC setpoint). BSC'ye komut EKLEMELİ config ile eklenir |
| K14 | **AWS demo = ayrı ürün dizini** `deployment/aws/demo-edge`; mevcut `deployment/aws/edge` değişmez | 1 demo-field + 1 container; container **ön yüzü (container-web) YOK**; bağlantı gerçek senaryodaki `FIELD_WS_URL` uplink'iyle; `PCS_BMS_TARGET_HOST=field-device-service` |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Backend'de gerçek MV istasyon/fider/RMU/POI veri modeli yok | FIELD-MANEVRA §6 boşlukları G-1/G-3/G-4 |
| B2 | Field stack'te yalnızca 1 PCS config'i var; 2. PCS zinciri eksik | `deployment/dev/field/device-configs/pcs-1.json` |
| B3 | BSC-2'nin PCS connector'ı tanımlı değil; `connector.sim.target` tipi var ama uygulanmıyor | `deployment/dev/container/device-configs/bsc-1.json#connector`, `packages/simulators/src/host.ts#applyBmsTarget` |
| B4 | Field app koyu-özel; ışık modu ve tema mekanizması yok | `packages/ui/src/colors/tokens.ts`; `apps/field/src/index.css` |
| B5 | Manevra yükleyici yalnız sabit `maneuvers.json`/`operations.json` okur; demo için ayrı dosya desteği yok | `services/web-service/src/infrastructure/commands/load-maneuver-records.ts#loadTierManeuverRecords` |
| B6 | Repo'da entegrasyon test katmanı ve `test:integration` script'i yok | root `package.json`; `TESTING.md` |

## 4. Mimari

### 4.1 Veri akışı

```
web-service (REST)                     apps/demo-field
  GET /api/fields/:id/containers ──┐
  GET /api/fields/:id/telemetry/latest
  GET /api/fields/:id/telemetry/downsampled
  GET /api/maneuvers|operations        (demo allowlist filtreli)
  POST /api/{maneuvers|operations}/:name/execute
  POST /api/commands/execute           (MV kesici/toprak — demo sim)
  GET /api/operations/runs
                                    ▼
                     useDemoFieldData (TanStack Query, 5s/30s)
                                    ▼
        ┌────── mapFieldToMimicState (SAF) ──────┐
        │  fanOutUnits → 6 sanal ünite           │
        │  bank↔BSC, pcs↔PCS · güç bölüşümü      │
        │  demo-MV telemetri → station · ΔV/CT   │
        └───────────────────┬────────────────────┘
                            ▼
     DemoMimic.update(state) + KPI/uyarı/trend türevleri   (packages/ui/src/nova)
```

### 4.2 Dizin yapısı

```
packages/ui/src/nova/            # paylaşımlı nova bileşenleri (Demo prefix)
  nova-mimic.ts, nova-mimic.css  # framework'suz SVG fabrikası + stiller
  DemoMimic.tsx                  # React sarmalayıcı
  DemoKpiTile.tsx, DemoKpiStrip.tsx, DemoAlertList.tsx
  DemoUnitDetail.tsx, DemoCellDialog.tsx
  trend-chart.ts, DemoTrendChart.tsx
  DemoManeuverCard.tsx, DemoManeuverWizard.tsx, DemoActiveManeuver.tsx, DemoStopButton.tsx
  apply-light-vars.ts, index.ts

apps/demo-field/src/             # ince tüketici + backend'e özgü katman
  lib/                           # api-client, api-base, site-field, query-client (field'dan)
  features/demo-data/            # mapFieldToMimicState, fanOutUnits, deriveKpis, deriveAlerts,
                                 #  buildTrendSeries, demo-topology.ts, useDemoFieldData
  pages/                         # DemoFieldPage (Saha), DemoManeuverPage (Manevra), LoginPage
  integration/                   # *.integration.test.ts (stack'e karşı — default workspace DIŞI)
```

### 4.3 `packages/ui` eklemeleri

- `colors/tokensLight.ts` → `lightTokens` (hex) + `COLORS_LIGHT`, `COLOR_LIGHT`, `hexToRgbTriple`.
- `icons/demo-icons.tsx` → 19 çizgi ikon; `ScadaIconName` union + `SCADA_ICONS` genişletmesi.
- `nova/apply-light-vars.ts` → `:root`'a `--nm-*` değişkenlerini `COLORS_LIGHT`'tan yazar.

### 4.4 Backend demo katmanı (K1/K8/K11/K12)

```
container stack:  BSC-1 sim ─connector(mapping A)─▶ field:15502 (PCS-1 BMS face)
                  BSC-2 sim ─connector(mapping B)─▶ field:15503 (PCS-2 BMS face)
field stack:      PCS-1 sim · PCS-2 sim · demo-mv-station sim (H01–H05 + toprak, interlock)
web-service:      GET /api/maneuvers|operations (mevcut) · demo-maneuvers.json/demo-operations.json (eklemeli yüklenir)
management-svc:   field rules.json + demo kurallar (SOC≥97 → demo_rest)  [eklemeli]
```

## 5. Purity Kuralları (ZORUNLU)

1. `features/demo-data/**` **saf**tır: `Date.now()`/rastgele/IO yok; zaman ve telemetri girdi olarak geçer. Beklenen eksik veri → boş/null-object döner, throw etmez; beklenmeyen hata → `DomainError`.
2. Tüm renk `COLORS_LIGHT`/`COLOR_LIGHT` token'larından; hiçbir dosyada hex hardcode yok.
3. Named export only; `Demo` prefix'li bileşenler; dosya başına tek sorumluluk; `packages/ui/src/nova/index.ts` barrel.
4. `createNovaMimic` DOM'a yalnızca verilen `svg` elemanına yazar; global state tutmaz; `destroy()` temizler.
5. **Open-Closed:** kök servislerin (services/*) mevcut uçları/davranışı DEĞİŞMEZ. Demo yalnız **ekler**: yeni config dosyası, yeni simülatör builder, DB kaydı, eklemeli kural. `packages/simulators`'ta yalnız `connector.sim.target` davranış tamamlaması (tanımsızken mevcut davranış birebir korunur).
6. Manevra/model değişiklikleri mevcut API sözleşmesini (`ManeuverRecord`/`OperationRecord`/`OperationRunResult`/`CommandConfig`) tüketir; mevcut endpoint sözleşmeleri değiştirilmez.
7. Entegrasyon testleri stack'e bağımlıdır; default vitest workspace DIŞINDA tutulur ve stack yoksa net hata verir (sessiz skip yok).

## 6. Use Case'ler

### 6.1 UC-1 — Uygulama iskeleti ve canlı veri erişimi

**Status:** ✅ Approved

**Kapsam:**
- dahil: Nx app iskeleti, auth/api-client kopyası, router/providers/i18n, containers + latest telemetry polling
- hariç: yeni backend endpoint; WS canlı akış; boss tünel modu

**Akış:**
1. Uygulama `VITE_FIELD_ID` + login ile açılır.
2. `GET /api/fields/:id/containers` 5 sn'de yenilenir.
3. Hata/boş yanıt → boş durum ekranı; uygulama çökmez.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Sistem, `GET /api/fields/:fieldId/containers`'ı 5 sn'de bir sorgulamalı ve `latestTelemetry`'yi tek kaynak sunmalıdır. | AK-1.1 |
| FR-1.2 | Sistem, standalone `Bearer` ve tünel `field_session` cookie kimliğini desteklemelidir. | AK-1.2 |
| FR-1.3 | Sistem, boş/hata yanıtında çökmemeli; boş durum mesajı göstermelidir. | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** geçerli oturum ve `FIELD_ID` **WHEN** uygulama açılır **THEN** `/containers` yanıtı çekilir ve ham `TelemetryData[]` state katmanına ulaşır
2. **AK-1.2 — GIVEN** localStorage'da geçerli token **WHEN** istek atılır **THEN** `Authorization: Bearer` başlığı eklenir; 401'de refresh denenir
3. **AK-1.3 — GIVEN** `/containers` 500 döndürür **WHEN** ekran render edilir **THEN** boş durum mesajı görünür ve uygulama çalışmaya devam eder

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | containers yanıtı hook üzerinden erişilebilir | unit | ⬜ |
| AK-1.2 | istek başlığında Bearer/session kimliği | kod inceleme | ⬜ |
| AK-1.3 | hata yanıtında boş durum render edilir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `apps/demo-field` Nx iskeleti (package/project/vite/tsconfig/vitest) + nx/workspace kaydı
- [ ] T-2: `lib/` api-client, api-base, site-field, query-client kopyası
- [ ] T-3: providers + router + i18n + LoginPage kopyası
- [ ] T-4: `useDemoFieldData` containers + latest telemetry polling hook'u
- [ ] T-5: hata/boş durum ekranı + testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `containers` boş dizi | Boş durum mesajı; state `units=[]` |
| 401 ve refresh başarısız | Login'e yönlendirme (mevcut field davranışı) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/package.json` #scripts | Yeni app tanımı |
| `apps/demo-field/src/lib/api-client.ts` #apiClient | API istemcisi (kopya) |
| `apps/demo-field/src/features/demo-data/useDemoFieldData.ts` #useDemoFieldData | containers polling |

### 6.2 UC-2 — Sanal filo eşleme ve canlı MV telemetrisi

**Status:** ✅ Approved

**Kapsam:**
- dahil: `TelemetryData[]` → mimic state, 1→6 fan-out, bank/PCS eşleme, güç bölüşümü, ΔV/raf türetme, demo-MV telemetrisinden station + CT türetme
- hariç: ünite başına bağımsız manevra simülasyonu; `dTdt10`; gerçek MV donanımı

**Akış:**
1. Gerçek konteyner telemetrisi deviceId prefix'ine göre (BSC-1/2, PCS-1/2, PM5340-1, CB-1/2) gruplanır.
2. `fanOutUnits` her gerçek değeri 6 sanal üniteye birebir kopyalar (sunumsal varyasyon yok).
3. `demo-mv-station` telemetrisinden station pozisyonları/kV/Hz okunur; CT/POI/PCS gücünden türetilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Sistem, tek gerçek konteyneri 6 sanal üniteye birebir çoğaltmalıdır (sunumsal varyasyon yok; aynı girdi → aynı çıktı). | AK-2.1 |
| FR-2.2 | Sistem, banka A→BSC-1→PCS-1 ve banka B→BSC-2→PCS-2 eşlemesini uygulamalıdır. | AK-2.2 |
| FR-2.3 | Sistem, gerçek PCS gücünü sanal ünite sayısına bölerek saha toplam gücünü korumalıdır. | AK-2.3 |
| FR-2.4 | Sistem, raf sıcaklıklarını ve hücre ΔV'yi `Rack Max/Min Pack Temp Rn` ve `Rack Max/Min Cell Voltage Rn`'den türetmelidir. | AK-2.4 |
| FR-2.5 | Sistem, `PCS Operation Status`'u (0/1/2/3/6) mimic durumlarına (off/stby/chg/dis/fault) eşlemelidir. | AK-2.5 |
| FR-2.6 | Sistem, `demo-mv-station` telemetrisinden station pozisyonlarını/kV/Hz'yi, `poiMW`/`feederMW`/CT akımlarını PCS gücünden türetmelidir. | AK-2.6 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** 1 konteyner telemetrisi **WHEN** `fanOutUnits` çağrılır **THEN** 6 ünite döner ve iki çağrı birebir aynıdır
2. **AK-2.2 — GIVEN** BSC-1 SOC %60, BSC-2 SOC %55 **WHEN** state üretilir **THEN** ünite banka A %60, banka B %55 (birebir) taşır
3. **AK-2.3 — GIVEN** gerçek PCS gücü 1.20 MW **WHEN** 6 üniteye dağıtılır **THEN** `Σ units.pcs.pMW = 1.20 MW` (±tolerans)
4. **AK-2.4 — GIVEN** `Rack Max Cell Voltage R1=3.400 V`, `Rack Min Cell Voltage R1=3.350 V` **WHEN** banka üretilir **THEN** `dvmV=50`
5. **AK-2.5 — GIVEN** `PCS Operation Status=2` **WHEN** PCS üretilir **THEN** `state='chg'` ve `pMW` pozitif
6. **AK-2.6 — GIVEN** demo-MV telemetrisi H05 açık **WHEN** state üretilir **THEN** `station.H05='open'` ve fider A enerjisiz türetilir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | determinizm + 6 ünite | unit | ⬜ |
| AK-2.2 | bank↔BSC eşlemesi | unit | ⬜ |
| AK-2.3 | güç korunumu | unit | ⬜ |
| AK-2.4 | ΔV/raf türetme | unit | ⬜ |
| AK-2.5 | PCS durum eşlemesi | unit | ⬜ |
| AK-2.6 | MV telemetri + fider/CT türetme | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-6: `demo-topology.ts` (statik site config: fider/limit/eşleme)
- [ ] T-7: `fanOutUnits` (birebir çoğaltma + güç bölüşümü)
- [ ] T-8: `mapFieldToMimicState` (bank/PCS/DC kesici + demo-MV station + türetmeler)
- [ ] T-9: golden fixture testleri (1 konteyner + MV telemetrisi → beklenen state)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Telemetri boş | `units=[]`, alanlar null-object; throw yok |
| PCS-2 telemetrisi yok | Banka B PCS'i `'off'`; UI çalışır |
| demo-MV telemetrisi yok | Station statik topoloji varsayılanı |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-data/demo-topology.ts` #demoTopology | Site config |
| `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts` #mapFieldToMimicState | Telemetri→state |
| `apps/demo-field/src/features/demo-data/fanOutUnits.ts` #fanOutUnits | Sanal filo |

### 6.3 UC-3 — Saha yerleşimi SVG mimic (ui/nova)

**Status:** ✅ Approved

**Kapsam:**
- dahil: nova mimic portu (saf yardımcılar + SVG fabrikası) `packages/ui/src/nova/`, React sarmalayıcı, ışık CSS değişkenleri, overlay/seçim/tıklama
- hariç: canvas/Pixi render; canlı WS

**Akış:**
1. `DemoMimic` mount'ta `createNovaMimic(svg, topo, opts)` kurar.
2. Veri değişince `mimic.update(state)` çağrılır.
3. Ünite/hücre tıklaması callback'e düşer.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Sistem, 6 ünite + istasyon + fiderleri tek SVG'de çizmelidir. | AK-3.1 |
| FR-3.2 | Sistem, `update(state)` ile enerji durumu/durum metinlerini yeniden hesaplamalıdır. | AK-3.2 |
| FR-3.3 | Sistem, `status/soc/soh/temp` overlay'lerini, ünite seçimini ve ünite/hücre tıklamasını desteklemelidir. | AK-3.3 |
| FR-3.4 | Sistem, renkleri `COLORS_LIGHT` CSS değişkenlerinden almalı; hareket azaltma tercihine uymalıdır. | AK-3.4 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** geçerli topoloji **WHEN** mimic kurulur **THEN** SVG'de 6 `.demo-unit` düğümü vardır
2. **AK-3.2 — GIVEN** H01 kapalı ve fider kapalı **WHEN** `update` çağrılır **THEN** hattın `live` sınıfı beklenen değere ayarlanır
3. **AK-3.3 — GIVEN** overlay `temp` **WHEN** `setOverlay('temp')` çağrılır **THEN** banka dolgu rengi sıcaklığa göre güncellenir
4. **AK-3.4 — GIVEN** mount edildi **WHEN** `applyDemoLightVars` çalışır **THEN** `:root` üzerinde `--nm-fg` tanımlıdır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | 6 ünite SVG'de çizilir | unit | ⬜ |
| AK-3.2 | enerji durumu güncellenir | unit | ⬜ |
| AK-3.3 | overlay/seçim/tıklama çalışır | unit | ⬜ |
| AK-3.4 | token tabanlı CSS değişkenleri | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-10: `nova-mimic.ts` saf yardımcılar (computeEnergization, bankSeverity, tempFill, defaultUnitStatus)
- [ ] T-11: `createNovaMimic` SVG fabrikası (6 ünite)
- [ ] T-12: `nova-mimic.css` + `apply-light-vars.ts`
- [ ] T-13: `DemoMimic.tsx` React sarmalayıcı
- [ ] T-14: mimic saf yardımcı + minimal DOM testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `destroy()` sonrası `update` | No-op (eleman yok) |
| Overlay bilinmeyen mod | `status`'a düşer |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/nova-mimic.ts` #createNovaMimic | SVG fabrikası |
| `packages/ui/src/nova/nova-mimic.css` | Mimic stilleri |
| `packages/ui/src/nova/DemoMimic.tsx` #DemoMimic | React sarmalayıcı |

### 6.4 UC-4 — KPI, uyarı, detay ve OG hücre kumandası

**Status:** ✅ Approved

**Kapsam:**
- dahil: 7 KPI kutusu, severite sıralı uyarı listesi, ünite detayı, OG hücre diyaloğu (ölçü + kesici/toprak kumandası)
- hariç: gerçek MV donanım modeli; trend (UC-6)

**Akış:**
1. State'ten KPI ve uyarılar türetilir.
2. Ünite/hücre seçimi detay panelini/diyaloğu açar.
3. Hücre kumandası mevcut `POST /api/commands/execute`'a gider; sim interlock'ı reddederse mesaj gösterilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Sistem, mod/POI güç/SOC/SOH/sıcaklık/kullanılabilirlik/alarm olmak üzere 7 KPI kutusu göstermelidir. | AK-4.1 |
| FR-4.2 | Sistem, uyarıları severity sırasına göre (alarm>warn>cold>maint>info) listelemelidir. | AK-4.2 |
| FR-4.3 | Sistem, seçili ünite için RMU/PCS/banka/raf detayını göstermelidir. | AK-4.3 |
| FR-4.4 | Sistem, OG hücre diyaloğunda H03 ölçüsünü göstermeli ve kesici/toprak kumandasını mevcut komut API'siyle yapmalıdır. | AK-4.4 |
| FR-4.5 | Sistem, sim interlock reddini hata mesajı olarak göstermeli; UI durumu korunmalıdır. | AK-4.5 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** geçerli state **WHEN** KPI şeridi render edilir **THEN** 7 kutu ve doğru ortalama SOC değeri görünür
2. **AK-4.2 — GIVEN** bir banka sıcak, bir PCS arızalı **WHEN** uyarılar üretilir **THEN** alarm satırları uyarı satırlarından önce gelir
3. **AK-4.3 — GIVEN** BESS#3 seçili **WHEN** detay paneli açılır **THEN** 2 PCS ve 2 banka tablosu görünür
4. **AK-4.4 — GIVEN** demo-MV telemetrisi var **WHEN** hücre diyaloğu açılır **THEN** pozisyon/ölçü görünür ve komut butonu mevcuttur
5. **AK-4.5 — GIVEN** toprak kapalı **WHEN** "kesiciyi kapat" denenir **THEN** sim reddi mesaj olarak gösterilir ve state değişmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | 7 KPI ve doğru ortalama | unit | ⬜ |
| AK-4.2 | severity sıralaması | unit | ⬜ |
| AK-4.3 | ünite detay içeriği | unit | ⬜ |
| AK-4.4 | hücre ölçü + kumanda butonu | unit | ⬜ |
| AK-4.5 | interlock reddi gösterimi | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-15: `deriveKpis` / `deriveAlerts` saf fonksiyonları
- [ ] T-16: `DemoKpiStrip` + `DemoKpiTile`
- [ ] T-17: `DemoAlertList`
- [ ] T-18: `DemoUnitDetail`
- [ ] T-19: `DemoCellDialog` (ölçü + komut API bağlı)
- [ ] T-20: türev + panel testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Uyarı yok | "Dikkat gerektiren durum yok" satırı |
| MV telemetrisi yok | Hücre diyaloğu salt-okunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoCellDialog.tsx` #DemoCellDialog | OG hücre kumanda diyaloğu |
| `apps/demo-field/src/features/demo-data/deriveKpis.ts` #deriveKpis | KPI türevi |
| `apps/demo-field/src/features/demo-data/deriveAlerts.ts` #deriveAlerts | Uyarı türevi |

### 6.5 UC-5 — Manevra sihirbazı (demo katalog)

**Status:** ✅ Approved

**Kapsam:**
- dahil: demo katalog listesi, kapsam→deviceIds, şema-driven parametre, onay, execute, aktif run takibi, stop
- hariç: mevcut katalog kayıtlarının gösterimi; run iptali; hedef-SOC parametresi (kural ile sağlanır)

**Akış:**
1. `GET /api/maneuvers` + `/api/operations` çekilir, yalnızca allowlist (`charge`/`discharge`/`full_charge`/`full_discharge`/`calibration`/`standby`) gösterilir.
2. Kapsam (sanal üniteler) seçilir; gerçek `deviceIds`'a indirgenir.
3. Parametreler kayıt şemasından üretilir; iki adımlı onayla `execute` çağrılır.
4. Aktif manevra `GET /api/operations/runs` ile izlenir; "Durdur" `standby` operasyonunu gönderir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Sistem, katalogdan yalnızca demo allowlist kayıtlarını (`charge`, `discharge`, `full_charge`, `full_discharge`, `calibration`, `standby`; hidden hariç) göstermelidir. | AK-5.1 |
| FR-5.2 | Sistem, seçilen sanal üniteleri tekilleştirilmiş gerçek `deviceIds`'a eşlemelidir. | AK-5.2 |
| FR-5.3 | Sistem, parametreleri kayıt şemasından (`ui.inputs`/`params`) üretmeli ve onay göstermelidir. | AK-5.3 |
| FR-5.4 | Sistem, execute çağrısını doğru gövdeyle (`params`/`deviceIds`) yapmalıdır. | AK-5.4 |
| FR-5.5 | Sistem, çalışan run'ı izleyip adım durumlarını göstermelidir. | AK-5.5 |
| FR-5.6 | Sistem, "Durdur" ile `standby` operasyonunu göndermeli; çalışan run'ı iptal etmemelidir. | AK-5.6 |
| FR-5.7 | Sistem, zamanlı durdurmayı **saniye** cinsinden almalı ve uzak adımlara da iletmelidir (timer yokken mevcut davranış birebir). | AK-5.7 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** katalogda `charge` ve `fl01_startup` **WHEN** kartlar render edilir **THEN** yalnızca `charge` görünür
2. **AK-5.2 — GIVEN** BESS#1..#6 seçildi **WHEN** istek hazırlanır **THEN** `deviceIds=['PCS-1','PCS-2']` (tekrarsız) oluşur
3. **AK-5.3 — GIVEN** `charge` kaydı `powerKw` girdisi tanımlar **WHEN** parametre bölümü render edilir **THEN** sayısal girdi görünür ve onay adımı zorunludur
4. **AK-5.4 — GIVEN** geçerli form **WHEN** onaylanır **THEN** execute uç noktasına `params`/`deviceIds` ile POST gider
5. **AK-5.5 — GIVEN** `status='running'` run **WHEN** poll edilir **THEN** adım listesi durumlarıyla gösterilir
6. **AK-5.6 — GIVEN** aktif manevra **WHEN** "Durdur" **THEN** `standby` execute edilir, run iptal çağrısı yapılmaz
7. **AK-5.7 — GIVEN** `charge` kaydı `ui.timer` tanımlar **WHEN** 5 sn girilir **THEN** execute gövdesi `timer:{durationSeconds:5}` içerir ve uzak adıma iletilir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | demo allowlist filtresi | unit | ⬜ |
| AK-5.2 | deviceIds indirgemesi | unit | ⬜ |
| AK-5.3 | şema-driven parametre + onay | unit | ⬜ |
| AK-5.4 | execute gövdesi | unit | ⬜ |
| AK-5.5 | aktif run adımları | unit | ⬜ |
| AK-5.6 | stop manevrası, iptal yok | kod inceleme | ⬜ |
| AK-5.7 | timer saniye + uzak iletim | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-21: `demoManeuverApi.ts` (katalog filtre + execute + runs)
- [ ] T-22: `DemoManeuverCard`
- [ ] T-23: `DemoManeuverWizard` (kapsam→manevra→param→onay)
- [ ] T-24: `DemoActiveManeuver` + `DemoStopButton`
- [ ] T-25: sihirbaz indirgeme/gövde testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Kapsam boş | Gönderim devre dışı + açıklama |
| Execute 409/422 | Hata mesajı gösterilir, form korunur |
| Aktif run yok | "Aktif manevra yok" durumu |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-maneuver/demoManeuverApi.ts` #demoManeuverApi | API istemcisi |
| `packages/ui/src/nova/DemoManeuverWizard.tsx` #DemoManeuverWizard | Sihirbaz |
| `packages/ui/src/nova/DemoActiveManeuver.tsx` #DemoActiveManeuver | Aktif run paneli |

### 6.6 UC-6 — Trend grafikleri

**Status:** ✅ Approved

**Kapsam:**
- dahil: bağımlılıksız SVG çizgi grafiği (ui/nova), downsampled telemetriden seri üretimi, boş durum
- hariç: uplot/grafana entegrasyonu; alarm gösterimi

**Akış:**
1. `GET /api/fields/:id/telemetry/downsampled` 30 sn'de bir çekilir.
2. Seriler (ortalama SOC, toplam MW, maks hücre °C) türetilir.
3. Grafikler çizilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Sistem, downsampled telemetriden SOC/güç/sıcaklık zaman serilerini türetmelidir. | AK-6.1 |
| FR-6.2 | Sistem, bağımlılıksız SVG çizgi grafiğini (limit çizgileri dahil) render etmelidir. | AK-6.2 |
| FR-6.3 | Sistem, veri yoksa boş durum göstermelidir. | AK-6.3 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** N adet downsampled örnek **WHEN** seri builder çalışır **THEN** zaman sıralı SOC/MW/°C noktaları üretilir
2. **AK-6.2 — GIVEN** boş olmayan seri **WHEN** grafik render edilir **THEN** çizgi + limit çizgileri görünür
3. **AK-6.3 — GIVEN** seri boş **WHEN** grafik render edilir **THEN** "veri yok" mesajı görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | seri türetimi | unit | ⬜ |
| AK-6.2 | SVG grafik çizimi | unit | ⬜ |
| AK-6.3 | boş durum | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-26: `buildTrendSeries` saf fonksiyonu
- [ ] T-27: `DemoTrendChart` (SVG, ui/nova)
- [ ] T-28: seri + grafik testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Tek örnek | Nokta/kısa çizgi; çökme yok |
| Eksik canonical tag | İlgili seri atlanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-data/buildTrendSeries.ts` #buildTrendSeries | Seri türevi |
| `packages/ui/src/nova/DemoTrendChart.tsx` #DemoTrendChart | SVG grafik |

### 6.7 UC-7 — `packages/ui`: light token'ları, demo ikonları, nova barrel

**Status:** ✅ Approved

**Kapsam:**
- dahil: nova paletinin light token seti, RGB türevleyici, 19 demo ikonu, `nova/` barrel
- hariç: mevcut koyu token'ların değiştirilmesi; tema switch mekanizması

**Akış:**
1. `COLORS_LIGHT` ve `COLOR_LIGHT` dışa aktarılır.
2. `hexToRgbTriple` CSS değişken enjeksiyonunda kullanılır.
3. İkonlar ve nova bileşenleri `@gd-monorepo/ui` barrel'ından erişilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | Sistem, nova light paletini semantik token seti olarak (`COLORS_LIGHT`) sunmalıdır. | AK-7.1 |
| FR-7.2 | Sistem, 19 demo ikonunu `ScadaIconName`/`SCADA_ICONS`'a eklemelidir. | AK-7.2 |
| FR-7.3 | Sistem, nova bileşenlerini `packages/ui/src/nova/index.ts` barrel'ından sunmalıdır. | AK-7.3 |
| FR-7.4 | Sistem, demo bileşenlerinde hex hardcode'a izin vermemelidir. | AK-7.4 |

**Kabul Senaryoları (GWT):**

1. **AK-7.1 — GIVEN** token seti **WHEN** `COLORS_LIGHT.alarm` okunur **THEN** nova light alarm rengi ve `COLOR_LIGHT.alarm` sayısal karşılığı döner
2. **AK-7.2 — GIVEN** `SCADA_ICONS` **WHEN** `SCADA_ICONS.novaBolt` alınır **THEN** render edilebilir bileşen döner
3. **AK-7.3 — GIVEN** ui barrel **WHEN** `DemoMimic` import edilir **THEN** tanımlıdır
4. **AK-7.4 — GIVEN** demo bileşen dosyaları **WHEN** taranır **THEN** ham hex değeri bulunmaz

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | light token + sayısal karşılık | unit | ⬜ |
| AK-7.2 | 19 ikon kaydı | unit | ⬜ |
| AK-7.3 | nova barrel export | unit | ⬜ |
| AK-7.4 | hex hardcode yok | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-29: `tokensLight.ts` (`COLORS_LIGHT`/`COLOR_LIGHT`/`hexToRgbTriple`)
- [ ] T-30: token testleri
- [ ] T-31: `demo-icons.tsx` + union/mapping genişletmesi
- [ ] T-32: ikon testleri
- [ ] T-33: `nova/index.ts` barrel + ui barrel export

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bilinmeyen ikon adı | Boş gövde (mevcut davranış) |
| Geçersiz hex | `hexToRgbTriple` hata fırlatır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/colors/tokensLight.ts` #lightTokens | Light token seti |
| `packages/ui/src/icons/demo-icons.tsx` #NOVA_ICONS | Demo ikonları |
| `packages/ui/src/nova/index.ts` | Nova barrel |

### 6.8 UC-8 — 2. PCS zinciri ve connector hedef portu

**Status:** ✅ Approved

**Kapsam:**
- dahil: `pcs-2` field config'i, BSC-2→PCS-2 connector + mapping, connector başına hedef port, compose port yayını
- hariç: gerçek donanım; MV modeli; PCS komut seti değişikliği

**Akış:**
1. Field stack'e `pcs-2.json` eklenir ve 15503 yayınlanır.
2. Container stack'te BSC-2 connector'ı 15503'e bağlanır.
3. Field device-service PCS-2 telemetrisi üretir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-8.1 | Sistem, field stack'te `PCS-2` (unitId 2, bmsPort 15503) config'i ve port yayınını içermelidir. | AK-8.1 |
| FR-8.2 | Sistem, BSC-2 verisini PCS-2 BMS yüzüne taşıyan connector + mapping tanımlamalıdır. | AK-8.2 |
| FR-8.3 | Sistem, `connector.sim.target`'ı uygulamalıdır (yokken mevcut davranış korunur). | AK-8.3 |
| FR-8.4 | Sistem, mevcut PCS-1/BSC-1 zincirini bozmamalıdır (Open-Closed). | AK-8.4 |

**Kabul Senaryoları (GWT):**

1. **AK-8.1 — GIVEN** field stack başlatılır **WHEN** device-service config'leri yüklenir **THEN** `PCS-2` cihazı listelenir
2. **AK-8.2 — GIVEN** BSC-2 telemetrisi değişir **WHEN** connector çalışır **THEN** PCS-2 BMS yüzü güncel değeri okur
3. **AK-8.3 — GIVEN** connector'da `sim.target.port` tanımlı **WHEN** host başlar **THEN** connector kendi portuna bağlanır
4. **AK-8.4 — GIVEN** `sim.target` tanımsız ve env portu var **WHEN** host başlar **THEN** env portu kullanılır (mevcut davranış)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-8.1 | PCS-2 config + port | kod inceleme | ⬜ |
| AK-8.2 | BSC-2→PCS-2 connector | integration | ⬜ |
| AK-8.3 | connector.sim.target uygulanır | unit | ⬜ |
| AK-8.4 | mevcut davranış korunur | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-34: `deployment/dev/field/device-configs/pcs-2.json` + compose `15503:15503`
- [ ] T-35: BSC-2 connector bloğu + `mappings/bsc-2-pcs-mapping.json`
- [ ] T-36: `host.ts` `connector.sim.target` uygulaması + regresyon testi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| 15503 dolu | Başlatma hatası (mevcut `claim` davranışı) |
| BSC-2 offline | PCS-2 BMS yüzü son değeri korur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/dev/field/device-configs/pcs-2.json` | Yeni PCS config |
| `deployment/dev/container/device-configs/bsc-2.json` #connector | Connector tanımı |
| `packages/simulators/src/host.ts` #applyBmsTarget | Connector hedef port |

### 6.9 UC-9 — Demo MV istasyon simülatörü

**Status:** ✅ Approved

**Kapsam:**
- dahil: yeni `demo-mv-station` simülatör tipi (H01–H05 + toprak ayırıcıları, kV/Hz), interlock mantığı, demo cihaz config'i, unit testler
- hariç: gerçek donanım; gerçek MV backend modeli; başka cihaz config'lerinin değiştirilmesi

**Akış:**
1. Simülatör, pozisyon/kV/Hz telemetrisi üretir.
2. Komut (kesici/toprak) interlock kontrolünden geçer; geçersizse reddedilir.
3. Config `commands` bölümü mevcut komut akışıyla eşlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-9.1 | Sistem, `demo-mv-station` simülatör tipiyle H01–H05 pozisyonu + kV/Hz telemetrisi üretmelidir. | AK-9.1 |
| FR-9.2 | Sistem, interlock uygulamalıdır: toprak kapalıyken kesici kapanmaz, kesici kapalıyken toprak kapanmaz. | AK-9.2 |
| FR-9.3 | Sistem, komut setini (`cb_open`/`cb_close`/`es_open`/`es_close`) ve telemetri satırlarını demo cihaz config'inde tanımlamalı; mevcut `POST /api/commands/execute` ile çalışmalıdır. | AK-9.3 |
| FR-9.4 | Sistem, mevcut simülatör tiplerini/config'lerini değiştirmemelidir (Open-Closed). | AK-9.4 |

**Kabul Senaryoları (GWT):**

1. **AK-9.1 — GIVEN** demo MV simülatörü başlatıldı **WHEN** telemetri okunur **THEN** H01–H05 pozisyonları ve kV/Hz değerleri döner
2. **AK-9.2 — GIVEN** toprak ayırıcısı kapalı **WHEN** kesici kapatma komutu gönderilir **THEN** komut reddedilir ve pozisyon değişmez
3. **AK-9.3 — GIVEN** demo cihaz config'i **WHEN** komut çalıştırılır **THEN** ilgili register yazılır ve read-back doğrulanır
4. **AK-9.4 — GIVEN** mevcut simülatör testleri **WHEN** yeni tip eklenir **THEN** tümü yeşil kalır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-9.1 | MV telemetrisi üretilir | unit | ⬜ |
| AK-9.2 | interlock reddi | unit | ⬜ |
| AK-9.3 | komut config eşlemesi | integration | ⬜ |
| AK-9.4 | mevcut simülatörler değişmez | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-37: `demo-mv-station` simülatör tipi (builder + register map + interlock)
- [ ] T-38: MV simülatör unit testleri (interlock + pozisyon)
- [ ] T-39: `deployment/dev/field/device-configs/demo-mv-1.json` (telemetri + commands)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bilinmeyen komut | Reddedilir (hata) |
| Eşzamanlı cb+es | İlk geçerli işlem; ikincisi interlock ile reddedilir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/demo-mv-station/simulator.ts` #DemoMvStationSimulator | Yeni simülatör |
| `packages/simulators/src/host.ts` #buildSimulators | Builder kaydı (eklemeli) |
| `deployment/dev/field/device-configs/demo-mv-1.json` | Demo MV config |

### 6.10 UC-10 — Demo manevra kataloğu, kurallar ve entegrasyon testleri

**Status:** ✅ Approved

**Kapsam:**
- dahil: ayrı demo katalog dosyaları (`demo-maneuvers.json`/`demo-operations.json`) + eklemeli yükleyici desteği, eklemeli demo kurallar, entegrasyon test paketi + root script
- hariç: mevcut `maneuvers.json`/`operations.json` içeriği; mevcut kurallar; yeni motor kodu

**Akış:**
1. Demo katalog dosyaları (`demo-maneuvers.json`/`demo-operations.json`, field + container) yükleyici tarafından **eklemeli** okunur (allowlist isimleri).
2. Demo kurallar field `rules.json`'a eklenir.
3. Entegrasyon testleri yükleme→execute→run→telemetri akışını ve interlock/kural davranışını doğrular.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-10.1 | Sistem, demo katalogunu ayrı `demo-maneuvers.json`/`demo-operations.json` dosyalarından **eklemeli** yüklemeli; mevcut dosyalar değişmemeli ve dosyalar yokken davranış birebir aynı kalmalıdır. | AK-10.1, AK-10.7 |
| FR-10.2 | Sistem, nova setini içermelidir: `charge`, `discharge`, `full_charge`, `full_discharge`, `calibration`, `standby`; `charge`/`discharge` çapraz katman operasyonudur (uzak BSC setpoint/mod + yerel PCS setpoint) ve `powerKw` iki katmana yayılır. | AK-10.2 |
| FR-10.3 | Sistem, SOC/telemetri koşullu geçişleri field `rules.json`'a eklemeli demo kurallarla sağlamalıdır (mevcut kurallar değişmez). | AK-10.3 |
| FR-10.4 | Sistem, entegrasyon testleriyle yükleme→execute→run tamamlandı→telemetri değişti akışını doğrulamalıdır. | AK-10.4 |
| FR-10.5 | Sistem, entegrasyon testleriyle interlock reddini ve kural tetiklemesini doğrulamalıdır. | AK-10.5 |
| FR-10.6 | Sistem, entegrasyon testlerini stack yoksa net hata ile durdurmalıdır (sessiz skip yok). | AK-10.6 |

**Kabul Senaryoları (GWT):**

1. **AK-10.1 — GIVEN** `demo-maneuvers.json`/`demo-operations.json` mevcut **WHEN** servis açılır **THEN** demo kayıtları katalogda görünür ve mevcut kayıtlar değişmemiştir
2. **AK-10.2 — GIVEN** katalog **WHEN** listelenir **THEN** altı nova kaydının tümü mevcuttur
3. **AK-10.3 — GIVEN** `SOC ≥ 97` demo kuralı **WHEN** koşul sağlanır **THEN** `standby` tetiklenir ve mevcut `r06_recovery` kuralı korunur
4. **AK-10.4 — GIVEN** stack çalışıyor **WHEN** `charge` execute edilir **THEN** PCS gücü negatif olur ve **BSC SOC yükselir** (fiziksel etki)
5. **AK-10.5 — GIVEN** toprak kapalı bir MV hücresi **WHEN** kesici kapatma komutu verilir **THEN** reddedilir
6. **AK-10.6 — GIVEN** stack kapalı **WHEN** entegrasyon testi koşar **THEN** net hata ile başarısız olur (skip etmez)
7. **AK-10.7 — GIVEN** demo katalog dosyaları yok **WHEN** servis açılır **THEN** katalog yalnızca mevcut `maneuvers.json`/`operations.json` kayıtlarını içerir
8. **AK-10.8 — GIVEN** `charge` + timer 5 sn **WHEN** süre dolar **THEN** BSC stop komutu yazılır ve PCS gücü 0 olur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-10.1 | demo dosyaları yüklenir + mevcut katalog korunur | integration | ⬜ |
| AK-10.2 | altı nova kaydı mevcut | integration | ⬜ |
| AK-10.3 | eklemeli kural + mevcut korunur | integration | ⬜ |
| AK-10.4 | uçtan uca manevra tamamlanır | integration | ⬜ |
| AK-10.5 | interlock reddi | integration | ⬜ |
| AK-10.6 | stack yokluğunda net hata | integration | ⬜ |
| AK-10.7 | dosya yokken davranış korunur | unit | ⬜ |
| AK-10.8 | zamanlı durdurma BSC+PCS durdurur | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-40: field `demo-operations.json` (charge/discharge/full_charge/full_discharge/calibration/standby) + container `demo-maneuvers.json` (bsc_charge/bsc_discharge) + BSC config komut/telemetri eklemeleri
- [ ] T-41: `loadTierManeuverRecords` eklemeli demo dosya desteği + fail-fast/absent testleri
- [ ] T-42: field `rules.json` eklemeli demo kurallar
- [ ] T-43: entegrasyon test paketi (`apps/demo-field/integration/*.integration.test.ts`)
- [ ] T-44: root `test:demo-integration` script'i + stack gereksinim dokümantasyonu

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Demo dosyası bozuk | Fail-fast (mevcut semantik) |
| Demo dosyası yok | Boş liste; mevcut katalog değişmez |
| Run timeout | Test net hata ile başarısız; run durumu raporlanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/dev/field/maneuvers/demo-operations.json` | Demo operasyon kataloğu (çapraz katman: BSC uzak + PCS yerel) |
| `deployment/dev/container/maneuvers/demo-maneuvers.json` | Konteyner demo manevraları (bsc_charge/bsc_discharge) |
| `deployment/dev/container/device-configs/bsc-{1,2}.json` | EKLEMELİ: Charge/Discharge Power Setpoint telemetri + `set_*_power`/`charge`/`discharge` komutları |
| `packages/platform/commands/src/operation-executor-contracts.ts#IRemoteCommandChannel` + `operation-executor.ts#runRemoteStep` | EKLEMELİ: uzak adıma opsiyonel `timer` iletimi |
| `services/web-service/src/infrastructure/container-session/tunnel-maneuver-channel.ts#execute` | EKLEMELİ: gövdeye `timer` (yokken yalnız `{params}`) |
| `packages/ui/src/nova/DemoManeuverWizard.tsx` | Zamanlı durdurma birimi **saniye** |
| `deployment/dev/demo-edge/docker-compose.yml` | `TUNNEL_API_UPSTREAM` (konteyner tünel HTTP köprüsü — uzak komut/stream) |
| `services/web-service/src/infrastructure/commands/load-maneuver-records.ts` #loadTierManeuverRecords | Eklemeli demo dosya desteği |
| `deployment/dev/field/rules/rules.json` | Eklemeli demo kurallar |
| `apps/demo-field/integration/demo-maneuver.integration.test.ts` #demoManeuverIntegration | Entegrasyon testleri |

### 6.11 UC-11 — AWS demo deployment (product layer)

**Status:** ✅ Approved

**Kapsam:**
- dahil: yeni `deployment/aws/demo-edge/` ürün dizini (compose + nginx conf + `.env.example`), demo-field Dockerfile, prod config kopyaları (container ön yüzü olmadan)
- hariç: mevcut `deployment/aws/edge` değişikliği; ALB/TLS/ACM; boss uplink; gerçek donanım

**Akış:**
1. `deployment/aws/demo-edge/` compose'u 1 container (web-service var, container-web YOK) + 1 field (demo-field SPA dahil) kaldırır.
2. Container web-service, field web-service'e `FIELD_WS_URL` ile bağlanır (gerçek senaryo).
3. Field stack demo config'lerini (pcs-2, demo-mv-1, demo katalog, demo kurallar) prod dizinlerinden yükler.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-11.1 | Sistem, demo için ayrı `deployment/aws/demo-edge/` ürün dizini sağlamalı; mevcut `deployment/aws/edge` değişmemelidir. | AK-11.1 |
| FR-11.2 | Sistem, container tarafını `container-web` ön yüzü OLMADAN çalıştırmalı ve field'a `FIELD_WS_URL` uplink'iyle bağlamalıdır. | AK-11.2 |
| FR-11.3 | Sistem, field tarafında demo-field SPA'yı nginx ile servis etmeli; `VITE_FIELD_ID` build arg guard'ı uygulanmalıdır. | AK-11.3 |
| FR-11.4 | Sistem, demo config'lerini prod dizinlerine koymalıdır: bsc-2 connector + mapping, pcs-2, demo-mv-1, demo katalog dosyaları, demo kurallar. | AK-11.4 |
| FR-11.5 | Sistem, `.env.example`'da zorunlu değişkenleri (FIELD_ID, CONTAINER_ID, PCS_BMS_TARGET_*) belgelemelidir. | AK-11.5 |

**Kabul Senaryoları (GWT):**

1. **AK-11.1 — GIVEN** `deployment/aws/demo-edge` **WHEN** dizin incelenir **THEN** yeni compose/nginx/env dosyaları vardır ve `deployment/aws/edge` diff'sizdir
2. **AK-11.2 — GIVEN** demo-edge compose **WHEN** servisler listelenir **THEN** `container-web` servisi yoktur ve container web-service `FIELD_WS_URL` taşır
3. **AK-11.3 — GIVEN** demo-field Dockerfile **WHEN** `VITE_FIELD_ID` boş build edilir **THEN** build fail-fast durur
4. **AK-11.4 — GIVEN** prod config dizinleri **WHEN** incelenir **THEN** bsc-2 connector/mapping, pcs-2, demo-mv-1, demo katalog ve demo kurallar mevcuttur
5. **AK-11.5 — GIVEN** `.env.example` **WHEN** okunur **THEN** FIELD_ID/CONTAINER_ID/PCS_BMS_TARGET_* değişkenleri listelenmiştir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-11.1 | ayrı ürün dizini, edge değişmez | kod inceleme | ⬜ |
| AK-11.2 | container-web yok + uplink | kod inceleme | ⬜ |
| AK-11.3 | VITE_FIELD_ID guard | unit | ⬜ |
| AK-11.4 | prod demo config'leri mevcut | kod inceleme | ⬜ |
| AK-11.5 | env örneği tam | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-45: `deployment/aws/demo-edge/docker-compose.yml` + nginx conf
- [ ] T-46: `apps/demo-field/deployment/Dockerfile` (`VITE_FIELD_ID` guard)
- [ ] T-47: prod demo config kopyaları (bsc-2 connector/mapping, pcs-2, demo-mv-1, demo katalog, demo kurallar)
- [ ] T-48: `.env.example` + deploy dokümanı
- [ ] T-49: AWS smoke doğrulama (compose up + `/containers` akışı)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| FIELD_ID tanımsız | Compose fail-fast (mevcut `:?` deseni) |
| Container offline | Field boş durum; demo çalışır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/aws/demo-edge/docker-compose.yml` | Demo ürün compose'u |
| `apps/demo-field/deployment/Dockerfile` | Demo SPA imajı |
| `deployment/aws/demo-edge/.env.example` | Env şablonu |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Veri tam | Tüm üniteler/bankalar/PCS/MV gerçek değerlerle dolu |
| Veri kısmi (PCS-2 yok) | İlgili PCS `'off'`; kalan UI çalışır |
| MV telemetrisi yok | Hücre diyaloğu salt-okunur; statik varsayılan |
| Telemetri boş | `units=[]`, KPI'lar `—`, boş durum mesajları |
| API hatası (5xx/timeout) | Son başarılı veri korunur; hata durumu gösterilir; çökme yok |
| Komut interlock reddi | Mesaj gösterilir; durum değişmez |
| Execute reddedildi (409/422) | Form korunur, hata mesajı gösterilir |
| Çalışan run yok | "Aktif manevra yok" durumu |
| Entegrasyon testi + stack yok | Net hata (skip yok) |
| Beklenen eksik (data yok) | Boş/null-object döner — throw yok |
| Beklenmeyen hata (tip ihlali) | `DomainError` |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Demo app 1 gerçek konteyneri 6 üniteli canlı saha olarak gösterir | `nx run demo-field:dev` + gözle |
| SC-2 | Yeni modüllerde satır kapsamı ≥ %70 | vitest coverage |
| SC-3 | `features/demo-data/**` saf fonksiyonları deterministiktir | golden fixture testleri |
| SC-4 | Mevcut `packages/ui` koyu token'ları ve mevcut simülatör/servis testleri yeşil kalır | ilgili test komutları |
| SC-5 | Demo manevralar gerçek stack'te uçtan uca çalışır | `bun run test:demo-integration` yeşil |
| SC-6 | Mevcut manevra/kural katalogları değişmemiştir | `deployment/dev/field/maneuvers/maneuvers.json` diff yok |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-6/T-7/T-8, T-10, T-15, T-26, T-37 sözleşmeleri |
| 3. TEST | T-5, T-9, T-14, T-20, T-25, T-28, T-30, T-32, T-36, T-38, T-41, T-43 kırmızı testleri |
| 4. IMPL | T-1..T-49 implementasyonu |
| 5. KAPANIŞ | `DEMO-FIELD-KAPANIS.md` + T-43/T-49 entegrasyon & smoke kanıtı |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Ünite başına bağımsız manevra animasyonu (yerel simülasyon) | ⛔ Defer — K6 sonrası iterasyon |
| A2 | Canlı WS telemetri (REST polling yerine) | ⛔ Defer — ayrı paket (container-web TransportContext deseni) |
| A3 | `dTdt10` türetimi (geçmişten) | ⛔ Defer — K9 |
| A4 | Gerçek MV backend modeli + interlock motoru (demo sim yerine) | ⛔ Defer — G-1/G-3/G-4 |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Gerçek MV/RMU/POI backend veri modeli + interlock motoru — FIELD-MANEVRA G-1/G-3/G-4.
2. Field app genelinde ışık tema dönüşümü — ayrı tema paketi.
3. Boss tarafında demo-field gömme (iframe/tunnel) — KONTEYNER-UZAKTAN-ERISIM-MIMARISI.
4. Nova bileşenlerinin container-web/boss'ta yeniden kullanımı — `packages/ui/src/nova` hazır.

## 12. T Görev Özeti

| Kod | Görev | UC | Aşama |
|:----|:------|:---|:------|
| T-1 | `apps/demo-field` Nx iskeleti + kayıt | UC-1 | IMPL |
| T-2 | `lib/` api-client/api-base/site-field/query-client kopyası | UC-1 | IMPL |
| T-3 | providers + router + i18n + LoginPage kopyası | UC-1 | IMPL |
| T-4 | `useDemoFieldData` containers + latest telemetry polling | UC-1 | IMPL |
| T-5 | hata/boş durum ekranı + testleri | UC-1 | TEST |
| T-6 | `demo-topology.ts` site config | UC-2 | IMPL |
| T-7 | `fanOutUnits` birebir + güç bölüşümü | UC-2 | IMPL |
| T-8 | `mapFieldToMimicState` (bank/PCS/MV/türetme) | UC-2 | IMPL |
| T-9 | golden fixture testleri | UC-2 | TEST |
| T-10 | `nova-mimic.ts` saf yardımcılar | UC-3 | IMPL |
| T-11 | `createNovaMimic` SVG fabrikası | UC-3 | IMPL |
| T-12 | `nova-mimic.css` + `apply-light-vars.ts` | UC-3 | IMPL |
| T-13 | `DemoMimic.tsx` React sarmalayıcı | UC-3 | IMPL |
| T-14 | mimic testleri | UC-3 | TEST |
| T-15 | `deriveKpis`/`deriveAlerts` | UC-4 | IMPL |
| T-16 | `DemoKpiStrip` + `DemoKpiTile` | UC-4 | IMPL |
| T-17 | `DemoAlertList` | UC-4 | IMPL |
| T-18 | `DemoUnitDetail` | UC-4 | IMPL |
| T-19 | `DemoCellDialog` (komut bağlı) | UC-4 | IMPL |
| T-20 | türev + panel testleri | UC-4 | TEST |
| T-21 | `demoManeuverApi.ts` (filtre) | UC-5 | IMPL |
| T-22 | `DemoManeuverCard` | UC-5 | IMPL |
| T-23 | `DemoManeuverWizard` | UC-5 | IMPL |
| T-24 | `DemoActiveManeuver` + `DemoStopButton` | UC-5 | IMPL |
| T-25 | sihirbaz testleri | UC-5 | TEST |
| T-26 | `buildTrendSeries` | UC-6 | IMPL |
| T-27 | `DemoTrendChart` | UC-6 | IMPL |
| T-28 | seri + grafik testleri | UC-6 | TEST |
| T-29 | `tokensLight.ts` | UC-7 | IMPL |
| T-30 | token testleri | UC-7 | TEST |
| T-31 | `demo-icons.tsx` + union/mapping | UC-7 | IMPL |
| T-32 | ikon testleri | UC-7 | TEST |
| T-33 | `nova/index.ts` barrel + ui export | UC-7 | IMPL |
| T-34 | `pcs-2.json` + compose port | UC-8 | IMPL |
| T-35 | BSC-2 connector + mapping | UC-8 | IMPL |
| T-36 | `host.ts` `connector.sim.target` + regresyon testi | UC-8 | IMPL |
| T-37 | `demo-mv-station` simülatör tipi | UC-9 | IMPL |
| T-38 | MV simülatör unit testleri | UC-9 | TEST |
| T-39 | `demo-mv-1.json` config | UC-9 | IMPL |
| T-40 | demo manevra + operasyon katalog dosyaları | UC-10 | IMPL |
| T-41 | `loadTierManeuverRecords` demo dosya desteği + testleri | UC-10 | IMPL |
| T-42 | field `rules.json` demo kurallar | UC-10 | IMPL |
| T-43 | entegrasyon test paketi | UC-10 | TEST |
| T-44 | root `test:demo-integration` script'i | UC-10 | IMPL |
| T-45 | `deployment/aws/demo-edge/docker-compose.yml` + nginx conf | UC-11 | IMPL |
| T-46 | `apps/demo-field/deployment/Dockerfile` (`VITE_FIELD_ID` guard) | UC-11 | IMPL |
| T-47 | prod demo config kopyaları (bsc-2, pcs-2, demo-mv-1, katalog, kurallar) | UC-11 | IMPL |
| T-48 | `.env.example` + deploy dokümanı | UC-11 | IMPL |
| T-49 | AWS smoke doğrulama (compose up + `/containers` akışı) | UC-11 | e2e |
