---
status: active
space: architecture
tags: [mimari, field, saha, konsol, gdems, demo, spec]
review_date: 2026-10-21
---

# DEMO-FIELD-KONSOL — gdems Console Parity Ekleri Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-10-07) — implementasyon başlayabilir.
> **Revizyon (2026-10-07):** gdems kaynağı (`src/topology.js`, `src/maneuvers.js`, `src/mimic.js`,
> `demo/market-view.js`, `docs/REQUIREMENTS.md`) ile karşılaştırıldı. K1 hizası hücre/RMU
> `motor`/`auxTr`/`es`, `bus`/`sections`/`auxLoads`/`fss` ve `pcsMaxMW 1.725` ile genişletildi (bkz. B6).
> **İlişkili:** [DEMO-FIELD-MIMARISI.md](./DEMO-FIELD-MIMARISI.md) (temel uygulama),
> [DEMO-FIELD-KAPANIS.md](./DEMO-FIELD-KAPANIS.md), `AGENTS-UI.md`, `AGENTS-FRONTEND.md`,
> `AGENTS-KOMUT-MANEVRA.md`, `FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md`.

## 1. Amaç ve Bağlam

Enerji mühendislerinin hazırlattığı **GD-PMS console** çalışması (`/gdpms-console/gdems` —
ÜNSAL DGES GDE-202030) daha eksiksizdir: 9 üniteli gerçek saha topolojisi, container SCADA tek hattı,
Devices köşesi, Faults + resolve/recovery, Operations FL-01…FL-11, Grid & Market, event log, logo.
Amaç: demo-field'i bu çalışmaya hizalayıp **eksikliklerini canlı backend'e bağlı kalarak** gidermek.
Temel demo-field zaten onaylı ve çalışıyor; bu SPEC yalnızca **eksikleri** tanımlar.

| Katman | Kapsam |
|:-------|:-------|
| **Dahil** | Topoloji hizası (9 ünite), mimic güç akışı/motor/RMU-ES, logo, `DemoContainerScada`, Devices/Faults/Operations genişletmeleri, event log, Ready/Rest kartı, Grid & Market (mevcut EPİAŞ entegrasyonu + eklemeli okuma ucu), I-1 toprak interlock (executor eklemeli) |
| **Hariç** | gdems'in sim motoru (dispatcher/sequencer/POI loop/termal iki-düğüm modeli/FSS sim) — demo canlı telemetri kullanır; Admin paneli (boss/superadmin scope); fault-inject demo kontrolü; gdems'in 6-16 raf uzlaşmazlıkları (bkz. §10) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **Topoloji gdems gerçeğine hizalanır** | 9 sanal ünite; Fider **A→H04 (BESS#1–5)**, **B→H05 (#6–9)**; site = ÜNSAL DGES GDE-202030 (Polatlı); cellsSeries 408; hücre `motor`/`esMotor`/`auxTr` + RMU `motor`/`es`; 3-sargılı Dy11y11; `pcsKVA 1725`/`pcsMaxMW 1.725`; `bus` 2000 A · 220 A sigorta · IMD; `sections`/`auxLoads`/`fss`; limits `tripC:32`, `zeroPowerMW:0.2` |
| K2 | **Mimic tam hat güç akışı + motor işaretleri** | Deşarj→şebeke turuncu, şarj←teal akış animasyonu (POI'ye kadar); motorlu CB'de "M"; RMU toprak ayırıcısı gösterilir |
| K3 | **GDEMS logosu** | `logo-light.png` demo-field asset'ine; header + footer |
| K4 | **Container SCADA** `ui/nova` bileşeni | 3-sargılı TR → 2 PCS → DC CB → DC BUS#1/#2 (2000 A, IMD) → 16 raf (220 A sigorta + kontaktör) → 4 HVAC bölümü → FSS; canlı BSC/PCS/CB/HVAC/PM5340 telemetrisi |
| K5 | **Devices sayfası** | MV hücreleri · Battery (raf başına SOC/V/I/sıcaklık haritası) · PCS · 8×HVAC · RMU&TR · AUX paneli; mimic tıklaması ilgili bölüme atlar |
| K6 | **Faults = mevcut alarm uçları** | `GET /api/unified/alarms` (aktif/çözülmüş) + `POST /api/unified/alarms/resolve` (notlu); FL-06 recovery backend `r06_recovery` kuralı |
| K7 | **Operations FL-01…FL-05 + sequence + Ready/Rest** | Mevcut backend manevraları listelenir; permissive'ler telemetriden; sequence = `operation_runs` adımları; dinlenme sayacı `full_charge`/`full_discharge` run `finishedAt`'inden (**demo eşiği 30 dk**), hazırlık raf sıcaklıklarından türetilir |
| K8 | **Event log** | `GET /api/logs` (log_events ∪ system_logs), alt tam genişlik + severity filtresi |
| K9 | **Grid & Market = mevcut EPİAŞ entegrasyonu** | Demo stack'e `integration-service` + `epias-market-prices` plugin; `external_series` hypertable; eklemeli okuma ucu `GET /api/unified/timeseries/external`; TEİAŞ P–f/P–Q/LVRT statik hesap (UI) |
| K10 | **I-1 toprak interlock executor'da (eklemeli)** | `OperationExecutor`'a opsiyonel `preconditions` hook; field web-service bunu demo-MV toprak durumundan besler; toprak kapalıyken şarj/deşarj reddedilir |
| K11 | **Open-Closed** | Kök servis/platform yalnız **ekler**: `external_series` okuma ucu + `preconditions` hook + alarm resolve `note` (additive) + integration-service config; hook/uca yokken davranış birebir. Ayrıca kapsam düzeltmesi (bugfix): device-service worker yalnız kendi job tiplerine (`READ_DEVICE`/`COMMAND_DEVICE`) kaydolur — aksi halde `FETCH_EXTERNAL`/`WRITE_TELEMETRY` no-op tüketiliyordu (çoklu-tüketici) |
| K12 | **Konvansiyon** | `Demo` prefix, `ui/nova`, ışık tema, Turkish JSDoc, TDD (JSDoc→kırmızı test→impl) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | demo-field topolojisi 6 ünite ve fider yönü ters (A→H05, B→H04) | `demo-topology.ts` |
| B2 | demo-field'de Devices/Faults/Operations genişletmesi/Event log/Container SCADA yok | `apps/demo-field/src` |
| B3 | `external_series` için seri okuma ucu yok (yalnız hypertable meta) | `unified-routes.ts#hypertables` |
| B4 | Şarj/deşarj toprak interlock'u (I-1) yaptırımı yok | FIELD-MANEVRA I-1 (tasarım) |
| B5 | gdems `sim.js` dispatcher/POI/termal/FSS simülasyon içerir; demo canlı telemetri kullanır | fark kararı §1 |
| B6 | demo-topology'de hücre `motor`/`auxTr`, RMU `motor`/`es`/ES ve `bus`/`sections`/`auxLoads`/`fss` alanları yok; `pcsMaxMW` 1.7 (gdems 1.725) | `demo-topology.ts`, `mimic-types.ts` |

## 4. Mimari

### 4.1 Topoloji hizası (K1)

```
feeders: A → H04 (side L) units [1..5] · B → H05 (side R) units [6..9]
cells: H01 cb incomer(motor,es) · H02 lbs aux(auxTr) · H03 vt · H04 cb feeder A(motor,es) · H05 cb feeder B(motor,es)
unit: 2 busbar × 8 raf · rackKWh 223 · cellsSeries 408 · 17 pack + BPU · TR 3750 kVA Dy11y11 · 8×MC90 HVAC · pcsMaxMW 1.725
rmu: H01 lbs(motor) · H02 cb(motor) · H03 lbs · ES es
bus: 2000 A · rackFuse 220 A · DC CB SYW6GZ-4000 · IMD Bender isoPV1685RTU
sections: 4 × (4 raf + 2 HVAC) · auxLoads/fss: UC-4/UC-5 panel verisi
```

### 4.2 Yeni `ui/nova` bileşenleri

`DemoContainerScada`, `DemoDeviceTree` + `DemoBatteryPanel`/`DemoPcsPanel`/`DemoHvacPanel`/`DemoMvPanel`/`DemoAuxPanel`,
`DemoFaultList` + `DemoFaultResolve`, `DemoSequence`, `DemoReadyCard`, `DemoEventLog`, `DemoMarketView` (+ `DemoPfChart`/`DemoPqChart`).

### 4.3 Veri akışları

```
Devices/Faults/Ops  → mevcut REST (containers, unified/latest, unified/alarms, /logs, maneuvers/runs)
Grid & Market       → integration-service (epias plugin) → external_series → GET /api/unified/timeseries/external
I-1 interlock       → field web-service preconditions(N) → DEMO-MV-1 toprak telemetrisi → reject
```

## 5. Purity Kuralları (ZORUNLU)

1. Renk `COLORS_LIGHT` token'larından; hex hardcode yok. Bileşenler `Demo` prefix, `ui/nova`, named export.
2. Türev/hesap fonksiyonları saf (TEİAŞ P–f/P–Q/LVRT, readiness, rest süresi); IO/hook yok.
3. Kök servis/platform değişiklikleri **eklemeli**: hook/ucun tanımsız olduğu çağrılarda davranış birebir.
4. `external_series` okuma ucu parametreleri sanitize (tablo/seri adı whitelist + parametreli sorgu).
5. gdems sim mantığı (dispatcher/sequencer/termal) demo'ya KOPYALANMAZ; canlı telemetri kullanılır.

## 6. Use Case'ler

### 6.1 UC-1 — Saha topolojisi hizası (9 ünite)

**Status:** ✅ Approved

**Kapsam:**
- dahil: 9 ünite, fider A→H04/B→H05, hücre motor/esMotor/auxTr, RMU motor/ES, `bus`/`sections`/`auxLoads`/`fss`, pcsMaxMW 1.725, limitler, site künyesi
- hariç: gdems sim sıralayıcı davranışları

**Akış:**
1. `demo-topology.ts` gdems `SITE_TOPOLOGY` ile hizalanır (isim/motor/limit alanları eklenir).
2. Fan-out 9 üniteye çıkar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Sistem, fider A→H04 (ünite 1–5) ve B→H05 (ünite 6–9) tanımlamalıdır. | AK-1.1 |
| FR-1.2 | Sistem; hücrelerde `motor`/`esMotor`/`auxTr`, RMU'da `motor`/`es`, `bus` ve `sections` alanlarını taşımalıdır. | AK-1.2 |
| FR-1.3 | Sistem, 9 sanal ünite üretmeli; güç 9'a bölünerek toplam korunmalıdır. | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `demoTopology` **WHEN** fiderler okunur **THEN** A.cell='H04' units [1,2,3,4,5], B.cell='H05' units [6,7,8,9]
2. **AK-1.2 — GIVEN** H04/H02 hücreleri ve RMU **WHEN** okunur **THEN** H04 `motor=true`, `es=true`; H02 `auxTr=true`; RMU'da `motor` ve `es` alanları vardır; `bus` 2000 A tanımlıdır
3. **AK-1.3 — GIVEN** gerçek PCS toplamı 1.8 MW **WHEN** fan-out edilir **THEN** 9 ünite döner ve ΣpMW = 1.8 MW

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | fider yönü A→H04/B→H05 | unit | ⬜ |
| AK-1.2 | motor/esMotor/auxTr + RMU motor/es | unit | ⬜ |
| AK-1.3 | 9 ünite + güç korunumu | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `demo-topology.ts` + `NovaTopology` gdems hizası (motor/auxTr/RMU es, bus/sections/auxLoads/fss, pcsMaxMW 1.725)
- [ ] T-2: topoloji/fan-out testleri (9 ünite)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| 9 ünite SVG satır yüksekliği | 5 satır L / 4 satır R — viewBox içinde kalır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-data/demo-topology.ts` #demoTopology | 9 ünite + fider/motor/bus/sections/aux/fss/limit |
| `apps/demo-field/src/features/demo-data/demo-topology.test.ts` | 9 ünite + hiza doğrulamaları |
| `packages/ui/src/nova/mimic-types.ts` #NovaTopology | hücre/RMU `motor`/`auxTr`/`es`, `bus`/`sections`/`auxLoads`/`fss` alanları |
| `apps/demo-field/src/features/demo-data/mapFieldToMimicState.test.ts` | 9 ünite testleri |

### 6.2 UC-2 — Mimic güç akışı, motor ve RMU-ES

**Status:** ✅ Approved

**Kapsam:**
- dahil: tam hat akış yönü (turuncu/teal), motor "M" işareti, RMU ES
- hariç: gdems simülasyon davranışları

**Akış:**
1. `createNovaMimic` akış sınıflarını güç işaretine göre uygular.
2. Motorlu hücrelere "M", RMU'ya ES çizilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Sistem, POI'ye kadar iletkenlerde güç akış yönünü (deşarj/şarj) animasyonla göstermelidir. | AK-2.1 |
| FR-2.2 | Sistem, motorlu hücreleri "M" ile işaretlemelidir. | AK-2.2 |
| FR-2.3 | Sistem, RMU toprak ayırıcısı durumunu çizmelidir. | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `poiMW > 0` **WHEN** `update` çağrılır **THEN** akış `flow-discharge` sınıfı taşır
2. **AK-2.2 — GIVEN** H04 motorlu **WHEN** mimic kurulur **THEN** hücrede "M" işareti vardır
3. **AK-2.3 — GIVEN** RMU ES kapalı **WHEN** `update` **THEN** ES sembolü işaretli görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | akış yönü sınıfı | unit | ⬜ |
| AK-2.2 | motor "M" | unit | ⬜ |
| AK-2.3 | RMU ES | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: `nova-mimic.ts` akış/motor/ES
- [ ] T-4: `nova-mimic.css` akış renkleri
- [ ] T-5: mimic testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `poiMW≈0` | akış animasyonu kapalı |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/nova-mimic.ts` #createNovaMimic | akış/motor/ES |
| `packages/ui/src/nova/nova-mimic.css` | flow renkleri |

### 6.3 UC-3 — Logo ve header

**Status:** ✅ Approved

**Kapsam:**
- dahil: GDEMS logo asset'i, header/footer
- hariç: dark logo (yalnız light)

**Akış:**
1. Logo asset'i demo-field'e kopyalanır (build'de import).
2. Header "GD-PMS" metninin yanına/yerine logo.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Sistem, header'da GDEMS logosunu göstermelidir. | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** uygulama açık **WHEN** header render edilir **THEN** logo görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | logo render | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-6: logo asset + DemoShell

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| logo yüklenemez | metin "GD-PMS" fallback |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/assets/logo-light.png` | logo |
| `apps/demo-field/src/layouts/DemoShell.tsx` #DemoShell | header logo |

### 6.4 UC-4 — Container SCADA tek hat

**Status:** ✅ Approved

**Kapsam:**
- dahil: `DemoContainerScada` (3-sargılı TR, 2 PCS, DC CB, BUS#1/#2 + IMD, 16 raf, 4 HVAC bölümü, FSS)
- hariç: gdems termal sim

**Akış:**
1. Ünite detayında SCADA çizimi canlı telemetriyle güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Sistem, 2 DC barayı (A/B) ve her barada 8 rafı SOC/sıcaklık durumuyla göstermelidir. | AK-4.1 |
| FR-4.2 | Sistem, 2 PCS'i durum/güç ile ve DC kesicileri göstermelidir. | AK-4.2 |
| FR-4.3 | Sistem, 4 HVAC bölümünü ve FSS panelini göstermelidir. | AK-4.3 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** 16 raf telemetrisi **WHEN** SCADA render edilir **THEN** 2 bara × 8 raf görünür
2. **AK-4.2 — GIVEN** PCS-1 şarjda **WHEN** render edilir **THEN** PCS-1 durumu "ŞARJ" ve DC CB kapalı
3. **AK-4.3 — GIVEN** HVAC durumu **WHEN** render edilir **THEN** 4 bölümde 8 ünite özeti görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | baralar + raflar | unit | ⬜ |
| AK-4.2 | PCS + DC CB | unit | ⬜ |
| AK-4.3 | HVAC bölümleri + FSS | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-7: `DemoContainerScada` bileşeni
- [ ] T-8: ünite detayına entegrasyon
- [ ] T-9: SCADA testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Raf telemetrisi eksik | nötr/boş raf |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoContainerScada.tsx` #DemoContainerScada | tek hat |
| `packages/ui/src/nova/index.ts` | barrel |

### 6.5 UC-5 — Devices sayfası

**Status:** ✅ Approved

**Kapsam:**
- dahil: MV/Battery/PCS/HVAC/RMU&TR/AUX bölümleri + mimic'ten atlama
- hariç: Admin/data-mapping

**Akış:**
1. Devices ağacından bölüm seçilir; canlı telemetriyle render edilir.
2. Mimic tıklaması ilgili bölüme atlar (`onTarget`).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Sistem, cihaz bölümlerini (MV/Battery/PCS/HVAC/RMU-TR/AUX) sekmeli göstermelidir. | AK-5.1 |
| FR-5.2 | Sistem, batarya bölümünde bara başına raf SOC/V/I/sıcaklık haritasını göstermelidir. | AK-5.2 |
| FR-5.3 | Sistem, mimic tıklamasında ilgili cihaz bölümüne atlamalıdır. | AK-5.3 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** Devices sayfası **WHEN** açılır **THEN** 6 bölüm sekmesi görünür
2. **AK-5.2 — GIVEN** BSC-1 rafları **WHEN** Battery bölümü açılır **THEN** 8 raf SOC/V/I/sıcaklık hücreleri görünür
3. **AK-5.3 — GIVEN** mimic'te BESS#3 tıklandı **WHEN** yönlendirme yapılır **THEN** Devices › Battery açılır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | bölüm sekmeleri | unit | ⬜ |
| AK-5.2 | raf haritası | unit | ⬜ |
| AK-5.3 | mimic→devices atlama | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-10: `DemoDevicesPage` + bölüm panelleri
- [ ] T-11: mimic onTarget yönlendirme
- [ ] T-12: devices testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| HVac telemetrisi eksik | boş durum satırı |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/pages/DemoDevicesPage.tsx` #DemoDevicesPage | Devices |
| `packages/ui/src/nova/DemoDevicePanels.tsx` #DemoBatteryPanel | bölüm panelleri |

### 6.6 UC-6 — Faults sayfası (alarm + resolve + recovery)

**Status:** ✅ Approved

**Kapsam:**
- dahil: aktif/çözülmüş alarm listesi, notlu resolve, FL-06 recovery açıklaması
- hariç: fault-inject demo kontrolü

**Akış:**
1. `GET /api/unified/alarms` listelenir (filtre).
2. `POST /api/unified/alarms/resolve` ile çözülür (audit fail-closed).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Sistem, alarmları aktif/çözülmüş filtreleriyle listemelidir. | AK-6.1 |
| FR-6.2 | Sistem, admin/teknik için notlu resolve göndermelidir. | AK-6.2 |
| FR-6.3 | Sistem, resolve sonrası FL-06 recovery'nin kural ile çalıştığını göstermelidir. | AK-6.3 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** aktif alarm var **WHEN** Faults açılır **THEN** aktif filtre alarmları listeler
2. **AK-6.2 — GIVEN** aktif alarm **WHEN** not girip resolve edilir **THEN** `POST /alarms/resolve` 200 döner ve satır çözülür
3. **AK-6.3 — GIVEN** E-stop kalktı **WHEN** kural değerlendirilir **THEN** `r06_recovery` operasyonu tetiklenir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | alarm listesi + filtre | unit | ⬜ |
| AK-6.2 | resolve akışı | integration | ⬜ |
| AK-6.3 | r06 recovery | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-13: `DemoFaultList` + `DemoFaultResolve`
- [ ] T-14: alarm API bağlantısı
- [ ] T-15: faults testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Alarm yok | boş durum |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/pages/DemoFaultsPage.tsx` #DemoFaultsPage | Faults |
| `apps/demo-field/src/features/demo-data/demoAlarmApi.ts` #demoAlarmApi | alarm uçları |

### 6.7 UC-7 — Operations FL-01…FL-05 + sequence + Ready/Rest

**Status:** ✅ Approved

**Kapsam:**
- dahil: FL kataloğu listesi, permissive, sequence görünümü, Ready/Rest kartı, yeni manevraların entegrasyon testi + telemetri verisiyle doğrulaması
- hariç: FL-06/07/10 (arka planda), FL-08/09 (doküman bekliyor), FL-04 e2e veri kontrolü (takvim S14 — Z'de sabitlenir)

**Akış:**
1. Mevcut manevralar (fl01_startup, fl01_shutdown, fl03_idle, fl04_calibration, fl05_emergency_stop) listelenir.
2. Aktif operasyon adımları `operation_runs`'tan gösterilir.
3. Ready/Rest kartı full_charge/full_discharge run'larından ve raf sıcaklıklarından türetilir.
4. Yeni manevralar demo-edge stack'te yürütülür; etki `/api/data/<PCS>/latest` telemetrisiyle doğrulanır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | Sistem, FL-01…FL-05 kayıtlarını demo manevralarıyla birlikte listemelidir. | AK-7.1 |
| FR-7.2 | Sistem, aktif operasyonun adımlarını durumlarıyla göstermelidir. | AK-7.2 |
| FR-7.3 | Sistem, dinlenme süresini son tam şarj/deşarj run'ından ve termal hazırlığı raf sıcaklıklarından türetmelidir. | AK-7.3 |
| FR-7.4 | Sistem, yeni manevraların (FL-01…FL-05) yürütmesini uçtan uca entegrasyon testiyle sabitlemelidir. | AK-7.4 |
| FR-7.5 | Sistem, manevra etkisini canlı telemetri verisiyle doğrulamalıdır (`/api/data/<PCS>/latest` + `operation_runs` terminal durumu). | AK-7.5 |

**Kabul Senaryoları (GWT):**

1. **AK-7.1 — GIVEN** katalog **WHEN** Operations açılır **THEN** FL-01…FL-05 kayıtları görünür
2. **AK-7.2 — GIVEN** çalışan operasyon **WHEN** poll edilir **THEN** adım listesi durumlarıyla görünür
3. **AK-7.3 — GIVEN** `full_charge` 30 dk önce bitti ve tüm raflar 19–25 °C **WHEN** Ready/Rest render edilir **THEN** "dinlenme tamam" ve "hazır" gösterir
4. **AK-7.4 — GIVEN** demo-edge FL config'i **WHEN** entegrasyon spec'i fl01_startup/fl03_idle/fl04_calibration/fl05_emergency_stop yürütür **THEN** her kayıt komut zincirini çözer ve run terminal duruma ulaşır
5. **AK-7.5 — GIVEN** demo stack ayakta **WHEN** FL-03 idle yürütülür ve `/api/data/PCS-1/latest` poll edilir **THEN** aktif güç setpoint'i 0'a düşer; FL-05 sonrası PCS durumu durduruldu olur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | FL listesi | unit | ⬜ |
| AK-7.2 | sequence adımları | unit | ⬜ |
| AK-7.3 | rest/readiness türevi | unit | ⬜ |
| AK-7.4 | FL-01…FL-05 uçtan uca yürütme | integration | ⬜ |
| AK-7.5 | telemetri veri kontrolü (PCS setpoint/durum) | e2e | ⬜ |

**T Görev Listesi:**
- [ ] T-16: FL kataloğu (allowlist genişletme)
- [ ] T-17: `DemoSequence` görünümü
- [ ] T-18: `DemoReadyCard` (rest + readiness saf türev)
- [ ] T-19: operations testleri
- [ ] T-30: `demo-maneuver-integration.spec.ts` (Z — gerçek FL config'li executor zinciri)
- [ ] T-31: e2e veri kontrolü (FL-01/03/05 yürütme + `/api/data/PCS-1/latest` doğrulaması)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hiç full şarj yok | dinlenme "—" |
| FL-04 kalibrasyon veri kontrolü | takvim S14 açık → Z katmanında sabitlenir, e2e kapsam dışı |
| Telemetri gecikmesi | poll retry — veri gelene kadar asserción yeşile dönmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-data/demoManeuverApi.ts` #DEMO_CATALOG_NAMES | FL ekleme |
| `packages/ui/src/nova/DemoReadyCard.tsx` #DemoReadyCard | rest/readiness |
| `services/web-service/src/presentation/routes/demo-maneuver-integration.spec.ts` #demo-maneuver-integration | FL-01…FL-05 Z zinciri |
| `e2e/field-maneuver.spec.ts` #field-maneuver | FL-01/03/05 yürütme + telemetri veri kontrolü |

### 6.8 UC-8 — Event log

**Status:** ✅ Approved

**Kapsam:**
- dahil: alt tam genişlik log + severity filtresi
- hariç: log yazma/yönetim

**Akış:**
1. `GET /api/logs` poll edilir; severity filtresi uygulanır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-8.1 | Sistem, son olayları severity filtresiyle göstermelidir. | AK-8.1 |

**Kabul Senaryoları (GWT):**

1. **AK-8.1 — GIVEN** `/api/logs` kayıtları **WHEN** Event log render edilir **THEN** zaman/seviye/mesaj satırları ve filtre çalışır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-8.1 | log listesi + filtre | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-20: `DemoEventLog`
- [ ] T-21: event log testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Kayıt yok | boş durum |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-data/demoLogApi.ts` #demoLogApi | `/logs` |
| `packages/ui/src/nova/DemoEventLog.tsx` #DemoEventLog | log paneli |

### 6.9 UC-9 — Grid & Market (mevcut EPİAŞ entegrasyonu)

**Status:** ✅ Approved

**Kapsam:**
- dahil: integration-service + epias plugin (demo stack), `external_series` okuma ucu, market UI (PTF/AOF/SMF), TEİAŞ P–f/P–Q/LVRT statik hesap
- hariç: EPİAŞ API kimliklerinin temini (env); kimlik yoksa kademeli boş veri

**Akış:**
1. Demo stack'e integration-service + plugin config eklenir; periyodik PTF/AOF/SMF `external_series`'e yazılır.
2. Eklemeli uç `GET /api/unified/timeseries/external` serileri okur.
3. Market UI saatlik grafik + TEİAŞ hesap kartlarını çizer.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-9.1 | Sistem, demo stack'te integration-service'i ve epias plugin'i çalıştırmalıdır. | AK-9.1 |
| FR-9.2 | Sistem, `external_series` serilerini okuyan eklemeli bir uç sunmalıdır (parametreli, sanitize). | AK-9.2 |
| FR-9.3 | Sistem, PTF/AOF/SMF serilerini saatlik göstermelidir. | AK-9.3 |
| FR-9.4 | Sistem, TEİAŞ P–f karakteristiği, P–Q kabiliyeti ve frekans aralıklarını hesaplayıp göstermelidir. | AK-9.4 |

**Kabul Senaryoları (GWT):**

1. **AK-9.1 — GIVEN** demo stack **WHEN** servisler listelenir **THEN** integration-service ve epias plugin çalışır
2. **AK-9.2 — GIVEN** `external_series` kayıtları **WHEN** `GET /timeseries/external?source=epias&series=PTF` **THEN** zaman sıralı değerler döner
3. **AK-9.3 — GIVEN** PTF serisi **WHEN** Market render edilir **THEN** saatlik çizgi + 4500 TL/MWh cap görünür
4. **AK-9.4 — GIVEN** R=10 MW rezerv **WHEN** P–f hesaplanır **THEN** Δf/ΔP ve 1.25 h enerji kontrolü doğru döner

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-9.1 | servisler ayakta | kod inceleme | ⬜ |
| AK-9.2 | external okuma ucu | unit | ⬜ |
| AK-9.3 | market grafiği | unit | ⬜ |
| AK-9.4 | TEİAŞ hesapları | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-22: demo stack integration-service + plugin config
- [ ] T-23: `GET /api/unified/timeseries/external` + testi
- [ ] T-24: `DemoMarketView` + TEİAŞ saf hesap fonksiyonları
- [ ] T-25: market testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| EPİAŞ kimliği yok / seri boş | "veri yok" (uydurma yok) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/dev/demo-edge/docker-compose.yml` | integration-service |
| `services/web-service/src/presentation/routes/unified-routes.ts` #externalSeries | eklemeli okuma ucu |
| `packages/ui/src/nova/DemoMarketView.tsx` #DemoMarketView | market UI |

### 6.10 UC-10 — I-1 toprak interlock (executor eklemeli)

**Status:** ✅ Approved

**Kapsam:**
- dahil: `OperationExecutor` eklemeli `preconditions` hook + field wiring (demo-MV toprak durumu)
- hariç: gerçek MV backend modeli

**Akış:**
1. Yürütme başında `preconditions(kind, name, params)` çağrılır.
2. Toprak kapalıysa `rejected` (ör. `interlock_earthed`) döner; hook yoksa davranış birebir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-10.1 | Sistem, eklemeli `preconditions` hook'u desteklemelidir (tanımsızsa davranış birebir). | AK-10.1 |
| FR-10.2 | Sistem, toprak kapalıyken şarj/deşarj operasyonunu reddetmelidir. | AK-10.2 |
| FR-10.3 | Sistem, toprak açılınca operasyonu normal çalıştırmalıdır. | AK-10.3 |

**Kabul Senaryoları (GWT):**

1. **AK-10.1 — GIVEN** hook tanımsız **WHEN** operasyon çalışır **THEN** sonuç hook'suz davranışla birebir
2. **AK-10.2 — GIVEN** H05 toprak kapalı **WHEN** `charge` execute edilir **THEN** `rejected` (`interlock_earthed`)
3. **AK-10.3 — GIVEN** H05 toprak açık **WHEN** `charge` execute edilir **THEN** `completed`

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-10.1 | hook yokken birebir | unit | ⬜ |
| AK-10.2 | topraklı red | integration | ⬜ |
| AK-10.3 | toprak açık çalışır | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-26: executor `preconditions` hook
- [ ] T-27: field web-service wiring (DEMO-MV toprak)
- [ ] T-28: executor unit testleri
- [ ] T-29: entegrasyon testi (toprak red/izin)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| MV telemetrisi yok | hook nötr (izin) — kademeli |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/platform/commands/src/operation-executor.ts` #preconditions | hook |
| `services/web-service/src/config/container.ts` | field wiring |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Telemetri tam | Tüm paneller canlı değerlerle dolu |
| Telemetri kısmi | İlgili hücre boş/nötr; UI çalışır |
| EPİAŞ serisi boş | Market "veri yok" (uydurma yok) |
| Hook reddi | `rejected` + net reason |
| Alarm resolve audit hatası | Fail-closed (409/5xx) |
| Beklenmeyen hata (tip ihlali) | `DomainError` |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | 9 ünite + doğru fider yönü canlı saha | gözle + test |
| SC-2 | Yeni modüllerde satır kapsamı ≥ %70 | vitest coverage |
| SC-3 | Kök servis/platform değişiklikleri eklemeli; mevcut testler yeşil | ilgili testler |
| SC-4 | Market verisi mevcut EPİAŞ entegrasyonundan (kimlik varsa) | `external_series` + uç |
| SC-5 | Toprak interlock uçtan uca çalışır | entegrasyon testi |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-1, T-7, T-10, T-18, T-24, T-26 sözleşmeleri |
| 3. TEST | T-2, T-5, T-9, T-12, T-15, T-19, T-21, T-23, T-25, T-28, T-30, T-31 kırmızı testleri |
| 4. IMPL | T-1..T-29 |
| 5. KAPANIŞ | `DEMO-FIELD-KONSOL-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | gdems termal iki-düğüm modeli / FSS sim / fault-inject | ⛔ Defer — canlı telemetri kullanılır |
| A2 | EPİAŞ API kimliklerinin yerel demo için temini | ✅ Kapandı — kimlik sağlandı; Market canlı veriyle dolu (`external_series` ptf/gip_wap/smf) |
| A3 | Admin (data mapping/site params) | ⛔ Defer — boss/superadmin scope |
| A4 | Fault isolation per-group (RMU H02 trip) sim davranışı | ⛔ Defer |
| A5 | Rest süresi varsayılanı admin-config | ✅ Kapandı — demo sabit **30 dk** (2026-10-07 kararı) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. gdems sim motorunun backend'e taşınması (dispatcher/sequencer/POI loop) — bu demo canlı telemetri kullanır.
2. Admin/master data-mapping paneli — supervisor/superadmin.
3. FL-08/FL-09 manevraları — GD-PMS REV.01 sonraki revizyon.

## 12. T Görev Özeti

| Kod | Görev | UC | Aşama |
|:----|:------|:---|:------|
| T-1 | `demo-topology.ts` + `NovaTopology` gdems hizası | UC-1 | IMPL |
| T-2 | topoloji/fan-out testleri | UC-1 | TEST |
| T-3 | `nova-mimic.ts` akış/motor/ES | UC-2 | IMPL |
| T-4 | `nova-mimic.css` flow renkleri | UC-2 | IMPL |
| T-5 | mimic testleri | UC-2 | TEST |
| T-6 | logo asset + DemoShell | UC-3 | IMPL |
| T-7 | `DemoContainerScada` bileşeni | UC-4 | IMPL |
| T-8 | ünite detayına entegrasyon | UC-4 | IMPL |
| T-9 | SCADA testleri | UC-4 | TEST |
| T-10 | `DemoDevicesPage` + paneller | UC-5 | IMPL |
| T-11 | mimic onTarget yönlendirme | UC-5 | IMPL |
| T-12 | devices testleri | UC-5 | TEST |
| T-13 | `DemoFaultList` + `DemoFaultResolve` | UC-6 | IMPL |
| T-14 | alarm API bağlantısı | UC-6 | IMPL |
| T-15 | faults testleri | UC-6 | TEST |
| T-16 | FL kataloğu (allowlist) | UC-7 | IMPL |
| T-17 | `DemoSequence` görünümü | UC-7 | IMPL |
| T-18 | `DemoReadyCard` saf türev | UC-7 | IMPL |
| T-19 | operations testleri | UC-7 | TEST |
| T-20 | `DemoEventLog` | UC-8 | IMPL |
| T-21 | event log testleri | UC-8 | TEST |
| T-22 | demo stack integration-service | UC-9 | IMPL |
| T-23 | external series okuma ucu + testi | UC-9 | IMPL |
| T-24 | `DemoMarketView` + TEİAŞ hesabı | UC-9 | IMPL |
| T-25 | market testleri | UC-9 | TEST |
| T-26 | executor `preconditions` hook | UC-10 | IMPL |
| T-27 | field web-service wiring | UC-10 | IMPL |
| T-28 | executor unit testleri | UC-10 | TEST |
| T-29 | entegrasyon testi (toprak red/izin) | UC-10 | TEST |
| T-30 | `demo-maneuver-integration.spec.ts` (Z — FL zinciri) | UC-7 | TEST |
| T-31 | e2e veri kontrolü (FL-01/03/05 + `/latest`) | UC-7 | TEST |
