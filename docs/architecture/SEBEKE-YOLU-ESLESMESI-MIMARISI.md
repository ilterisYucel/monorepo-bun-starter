---
status: active
space: architecture
tags: [mimari, simulator, pcs, mv-station, breaker, energization, spec]
review_date: 2026-10-22
---

# Şebeke Yolu Eşleşmesi — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟡 Geliştirmede (2026-10-21) — SPEC onaylı; T-1…T-7 tamam.
> **REV.01 (2026-10-22):** İstasyon başına **1 MV simülatörü** (DEMO-MV-1/-2); GridLink bus'ları
> **MV cihazı başına** kurulur (PCS-1/2→MV-1, PCS-3/4→MV-2). Config `details.gridLink {deviceId, feeder}`.
> **İlişkili:** [SIMULATOR-MIMARISI.md](./SIMULATOR-MIMARISI.md) (ISimulator REV.03), [PCS-BSC-GUC-LINKI-MIMARISI.md](./PCS-BSC-GUC-LINKI-MIMARISI.md) (P1).

## 1. Amaç ve Bağlam

**Sorun:** PCS simülatörü MV şalter durumundan bağımsız çalışıyor; kesici açıldığında PCS hâlâ güç üretiyor/şebeke gerilimi gösteriyor. Gerçek saha ve gdems referansında enerji zinciri kopuksa PCS standby'a düşer, güç 0 ve AC gerilim 0 olur.

**Çözüm:** Field tier'da in-process `GridLinkBus` — `DemoMvStationSimulator` şalter pozisyonlarını yayınlar, `WattoxPcsSimulator` kendi bağlı olduğu kesiciyi sorgular. Zincir kopukken PCS de-enerjili davranır.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `packages/simulators` | `GridLinkBus`, MV yayın, PCS tüketim | DC kesici (container tier) |
| Config | `details.gridLink {deviceId, breaker}` (sim türevi) | Yeni topoloji modeli |
| UI | — | Nova/`computeEnergization` (frontend hesabı ayrı kalır) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-21)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Zincir semantiği gdems `computeEnergization` ile aynı: POI H01 → fider kesici (H04/H05) → RMU H02; **kopuk zincir (kesici AÇIK) → PCS standby, güç 0, AC gerilim 0** | UC-1, UC-2 |
| K2 | Bağlama config'te açık: `details.gridLink {deviceId, feeder}` — `deviceId` MV simülatörü (istasyon başına 1), `feeder` H04/H05 (sim türevi şemayı, deployment değeri taşır) | UC-3 |
| K3 | Bus host tarafından field tier'da **her MV simülatörü için ayrı** oluşturulur; yayıncı o MV, tüketici kendi `deviceId`'sine bağlı PCS (in-process, aynı süreç) | UC-1 |
| K4 | De-enerjili PCS: `opStatus = standby`, setpoint/grid/DC güç 0, `REG_GRID_V_AB = 0`; komutlar kabul edilir ama çıkış yok | UC-2 |
| K5 | `gridLink` yoksa PCS enerjili varsayılan (geriye uyum) | UC-3 |
| K6 | DC kesici eşleşmesi (container tier, ayrı süreç) MVP DIŞI | §11 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | PCS AC gerilimi sabit 4000 (400.0 V) döner; şalter durumu yok sayılır | `packages/simulators/src/wattox-pcs/simulator.ts#readInputRegister` |
| B2 | MV simülatörü şalter pozisyonlarını tutar ama dışarı yayınlamaz | `packages/simulators/src/demo-mv-station/demo-mv-simulator.ts#writeCoil` |
| B3 | Frontend `computeEnergization` aynı zinciri hesaplar — backend simülatörde karşılığı yok | `packages/ui/src/nova/nova-mimic.ts#computeEnergization` |

## 4. Mimari

### 4.1 Akış

```
DemoMvStationSimulator (H01,H02,H04,H05)
        │ writeCoil → bus.setBreaker(cell, closed)
        ▼
   GridLinkBus (in-process, field tier)
        ▲ bus.isEnergized(breaker)
        │
WattoxPcsSimulator (details.gridLink.breaker)
   de-enerjili → standby, P=0, Vac=0
```

### 4.2 Bileşenler

- `GridLinkBus` — `packages/simulators/src/grid-link/bus.ts`: `setBreaker(cell, closed)`, `isEnergized(breaker)`; saf in-memory, thread-safe (tek süreç).
- `DemoMvStationSimulator` — `writeCoil` sonrası bus'a yayın (bus yoksa no-op).
- `WattoxPcsSimulator` — AC gerilim/güç sorgularında ve setpoint yazımında `isEnergized` kontrolü.
- `SimulatorHost` — her `demo-mv-station` için bir `GridLinkBus` kurar; MV kendi bus'ına yayınlar, PCS `details.gridLink.deviceId` ile o MV'nin bus'ını tüketir.

### 4.3 Config şeması

`configs/sim/wattox-pcs-sim.json` (ve field tier kopyaları):

```json
"details": {
  "gridLink": { "deviceId": "DEMO-MV-2", "feeder": "H04" }
}
```

## 5. Purity Kuralları (ZORUNLU)

1. Bus yalnız simülatör katmanında yaşar; device-service'e sızmaz (SIMULATOR-MIMARISI K8).
2. PCS simülatörü MV simülatör sınıfına bağımlı OLMAZ — yalnız `IGridLink` interface'i tüketir.
3. Production kök config'lerde `gridLink` alanı YOKTUR (sim türevi + deployment).
4. Frontend `computeEnergization` DEĞİŞMEZ (ayrı hesap katmanı); backend sim yalnız PCS davranışını etkiler.
5. İnterlock kuralları MV simülatöründe kalır (mevcut davranış).

## 6. Use Case'ler

### 6.1 UC-1 — GridLinkBus + MV yayını

**Status:** 🟡 Geliştirmede (T-1…T-7 tamam)

**Kapsam:**
- dahil: `IGridLink`, `GridLinkBus`, MV writeCoil yayını, host oluşturma
- hariç: topoloji grafiği, UI

**Akış:**
1. Host, field config listesinde `demo-mv-station` + `details.gridLink` taşıyan PCS varsa bus oluşturur.
2. MV simülatörü her şalter değişiminde `bus.setBreaker`.
3. PCS simülatörü `bus.isEnergized(breaker)` ile durum sorgular.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Bus şalter durumlarını tutmalı ve sorgulanabilir olmalı | AK-1.1 |
| FR-1.2 | MV simülatörü her başarılı şalter değişimini yayınlamalı | AK-1.2 |
| FR-1.3 | Host bus'ı yalnız gerekli cihazlar varsa oluşturmalı | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** bus boş **WHEN** `setBreaker("H02", true)` **THEN** `isEnergized("H02")` true
2. **AK-1.2 — GIVEN** MV sim start'lı **WHEN** H04 aç coil yazılır **THEN** bus'ta H04 açık
3. **AK-1.3 — GIVEN** gridLink'siz config seti **WHEN** host kurulur **THEN** bus oluşmaz, PCS davranışı değişmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Bus durum | unit | ⬜ |
| AK-1.2 | Yayın | unit | ⬜ |
| AK-1.3 | Koşullu oluşturma | unit | ⬜ |

**T Görev Listesi:**
- [x] T-1: `IGridLink` + `GridLinkBus` + JSDoc
- [x] T-2: Kırmızı testler (bus + yayın)
- [x] T-3: MV yayın entegrasyonu + host oluşturma

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bus yok | MV yayını no-op; PCS enerjili |
| Aynı değer tekrar yazılır | Idempotent |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/grid-link/bus.ts` | YENİ — bus + interface |
| `packages/simulators/src/demo-mv-station/demo-mv-simulator.ts` | Yayın |
| `packages/simulators/src/host.ts` | Oluşturma/enjeksiyon |

### 6.2 UC-2 — PCS de-enerjili davranış

**Status:** 🟡 Geliştirmede (T-1…T-7 tamam)

**Kapsam:**
- dahil: standby, güç 0, Vac 0, komut kabulü
- hariç: arıza/estop senaryoları

**Akış:**
1. PCS her AC okumasında/yazımında bağlı kesiciyi sorgular.
2. Kopuk → güç çıkışları 0, `opStatus = standby`, Vac 0.
3. Yeniden enerjilenince standby'dan başlar (son setpoint'i kendiliğinden uygulamaz).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Kopuk zincirde güç 0 ve `opStatus = standby` olmalı | AK-2.1 |
| FR-2.2 | Kopuk zincirde `REG_GRID_V_AB = 0` okunmalı | AK-2.2 |
| FR-2.3 | Yeniden enerjide otomatik güç uygulanmamalı | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** PCS şarj ediyor **WHEN** bağlı kesici açılır **THEN** sonraki okumada güç 0, opStatus standby
2. **AK-2.2 — GIVEN** kesici açık **WHEN** AC gerilim okunur **THEN** 0
3. **AK-2.3 — GIVEN** kesici kapatılır **WHEN** okuma yapılır **THEN** güç 0 (setpoint otomatik uygulanmaz)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Standby + P=0 | unit | ⬜ |
| AK-2.2 | Vac=0 | unit | ⬜ |
| AK-2.3 | Yeniden enerji | unit | ⬜ |

**T Görev Listesi:**
- [x] T-4: Kırmızı testler — standby/Vac/yeniden enerji
- [x] T-5: PCS tüketim implementasyonu

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| gridLink yok | Enerjili varsayılan (K5) |
| Kesici bilinmeyen | Enerjili varsayılan (config hatası loglanır) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/wattox-pcs/simulator.ts` | De-enerjili davranış |

### 6.3 UC-3 — Config + entegrasyon

**Status:** 🟡 Geliştirmede (T-1…T-7 tamam)

**Kapsam:**
- dahil: sim türevi `details.gridLink`, field tier deployment değerleri, entegrasyon testi
- hariç: DC kesici (K6)

**Akış:**
1. `configs/sim/wattox-pcs-sim.json` `details.gridLink` şemasını taşır.
2. Field tier kopyaları PCS↔kesici eşleşmesini taşır.
3. Entegrasyon: kesici aç → PCS transferi durur.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Sim türevi `gridLink` şemasını içermeli; production kök içermemeli | AK-3.1 |
| FR-3.2 | Field tier kopyalarında PCS başına kesici eşleşmesi bulunmalı | AK-3.2 |
| FR-3.3 | Entegrasyon testi kesici→PCS davranışını kanıtlamalı | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** `configs/*.json` **WHEN** taranır **THEN** `gridLink` yok; `configs/sim/wattox-pcs-sim.json`'da var
2. **AK-3.2 — GIVEN** field tier PCS config'leri **WHEN** incelenir **THEN** her PCS'de `gridLink.breaker` dolu
3. **AK-3.3 — GIVEN** demo stack **WHEN** fider kesici açılır **THEN** bağlı PCS gücü 0'a düşer

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Şema ayrımı | script kontrolü | ⬜ |
| AK-3.2 | Eşleşme | config kontrolü | ⬜ |
| AK-3.3 | Uçtan uca | entegrasyon | ⬜ |

**T Görev Listesi:**
- [x] T-6: Sim türevi + field kopya config güncellemesi
- [x] T-7: Entegrasyon testi + doğrulama

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Aynı kesiciye çoklu PCS | Hepsi aynı durumu izler |
| Topoloji değişikliği | Yalnız config değişir; kod değişmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `configs/sim/wattox-pcs-sim.json` | `details.gridLink` şeması |
| `deployment/v2/*/field/device-configs/pcs-*.json` | Eşleşme değerleri |
| `apps/demo-field/integration/*` | Uçtan uca test |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bus yok / gridLink yok | PCS enerjili (geriye uyum) |
| Kesici açık | Standby, P=0, Vac=0 |
| Kesici kapanır | Standby'dan başlar; otomatik güç yok |
| Bilinmeyen kesici adı | Enerjili varsayılan + log |
| MV simülatör yok | Bus oluşmaz; PCS enerjili |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Kesici→PCS davranışı unit testlerle kanıtlı | `nx run simulators:test` |
| SC-2 | Production kök config'te `gridLink` grep=0 | script |
| SC-3 | `bun run spec:check` temiz | komut |
| SC-4 | Uçtan uca entegrasyon yeşil | entegrasyon |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | `IGridLink`, bus sözleşmesi |
| 3. TEST | T-2, T-4 (kırmızı) |
| 4. IMPL | T-1, T-3, T-5, T-6 |
| 5. KAPANIŞ | `SEBEKE-YOLU-ESLESMESI-KAPANIS.md`; T-7 |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | DC kesici (container tier) eşleşmesi | MVP dışı (§11) |
| A-2 | Topoloji grafiğinden otomatik eşleşme | İleri iş; MVP açık config |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. DC kesici → BSC/DC çıkış eşleşmesi (container tier, süreçler arası kanal gerekir).
2. Ada modu (islanding) ve şebeke frekansı senaryoları.

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | `IGridLink` + `GridLinkBus` + JSDoc | UC-1 |
| T-2 | Kırmızı bus/yayın testleri | UC-1 |
| T-3 | MV yayın + host oluşturma | UC-1 |
| T-4 | Kırmızı PCS de-enerjili testleri | UC-2 |
| T-5 | PCS tüketim implementasyonu | UC-2 |
| T-6 | Config (sim türevi + field kopyaları) | UC-3 |
| T-7 | Entegrasyon testi + doğrulama | UC-3 |
