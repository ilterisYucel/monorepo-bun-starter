---
status: active
space: architecture
tags: [mimari, gd-1, simulator, device-config, uyum, spec]
review_date: 2026-10-31
---

# GD1-SIMULATOR-CONFIG-UYUM — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** [SPEC-SABLONU.md](./SPEC-SABLONU.md), [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md), [docs/simulators/README.md](../simulators/README.md), `AGENTS-DEVICE-CONFIG.md`

## 1. Amaç ve Bağlam

Kök `configs/` ve `packages/simulators` üretici haritalarına (LGES Flex BSC Rev AF, Wattox MPCS,
Envicool MC90HDNC1R-L, Bender isoPV1685RTU, Acrel DJSF1352-RN, Schneider PM5340, EP203) göre
düzeltildi (bkz. §3 B1–B14). Bu düzeltmelerin bir kısmı, kök `configs/` dışındaki tüketicilerde
(frontend, deployment kopyaları, manevralar, mapping kopyaları) değişiklik gerektirir. Bu SPEC
yalnızca **o dış değişiklikleri** tanımlar; simülatör/config değişikliklerinin kendisi bu paketin
girdisidir ve tamamlanmıştır.

| Katman | Bu SPEC'te |
|:-------|:-----------|
| `configs/`, `packages/simulators/`, `docs/simulators/` | **Hariç** — değişiklikler yapıldı (girdi) |
| `apps/container-web`, `apps/field` canonical tüketicileri | Dahil (UC-1) |
| `deployment/v2/**/device-configs` + `mappings` | Dahil (UC-2) |
| Konteyner manevraları / kurallar (HVAC, BSC) | Dahil (UC-3) |
| BSC→PCS durum enum çevirisi | Dahil (UC-4) |
| `apps/demo-field` / `packages/ui/nova` gösterim kuralları | Dahil (UC-5) |
| Simülatör davranışının LGES sequence'ine uydurulması | **Hariç** — ileri iş (UC-6 ⛔ Defer) |
| GD-2 / v1 deployment'ları | **Hariç** |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | 2026-10-17 — Simülatör ve config değişiklikleri yalnız `packages/simulators` ve `configs/` altında yapılır; kodun diğer kısımları SPEC ile tanımlanır | Bu doküman |
| K2 | 2026-10-17 — Gerçek register'da olmayan değer UI'da gösterilmez; PMS hesabı olan değer "PMS hesabı" etiketiyle gösterilir | UC-1, UC-5 |
| K3 | 2026-10-17 — Yalnız GD-1 kapsamı | v2 deployment'ları; v1/GD-2 hariç |
| K4 | `AGENTS-DEVICE-CONFIG.md`: kök `configs/` source of truth; projede yalnız host/port/slaveId/deviceId/name/transport değişir | UC-2 kopyaları kökten yeniden üretilir |
| K5 | 30063/30065 **güç limitidir**, güç akışı değildir (LGES BSC Data) | Canonical `charge_power_limit` / `discharge_power_limit` (UC-1) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | BSC 30063/30065 canonical `charge_power`/`discharge_power` idi; frontend bunları işaretli `power_kw` olarak topluyor → limit (500 kW) güç gibi görünüyor | `apps/container-web/src/features/racks/utils/bscHelpers.ts#bscHelpers`, `apps/field/src/features/dashboard/deriveDashboard.ts#deriveDashboard` |
| B2 | Kök config canonical artık `*_limit`; deployment kopyaları eski canonical'ı taşıyor | `configs/flex-bsc.json` ↔ `deployment/v2/*/container*/device-configs/bsc-*.json` |
| B3 | BSC→PCS mapping: 789 ← 30063 `size` eksik, 774/775 ölçülen akımdan, 784/785 ölçülen gerilimden, 786/787 sabit 35000 idi | `configs/mappings/bsc-pcs-mapping.json` (düzeltildi) |
| B4 | Mapping anma enerjisi 5018 kWh; simülatör ve proje grubu 3568 kWh (32,112 MWh / 9) | `packages/simulators/src/bsc/bsc-math.ts#SYSTEM_CAPACITY_KWH`, `deployment/v2/dev/container/device-configs/mappings/bsc-pcs-mapping.json` |
| B5 | Rack/pack/cell konum register'ları (30103…30157) "Rack Max Voltage" gibi ölçüm adlarıyla tanımlıydı | `configs/flex-bsc.json` (düzeltildi) |
| B6 | HVAC holding 0x0B/0x0C/0x0D/0x0F/0x11/0x1E yanlış ad/ölçek; 0x2002 dokümanda geçersiz | `configs/hvac.json` (düzeltildi); `deployment/v2/**/hvac-*.json` hâlâ eski + FC04 okuma |
| B7 | HVAC 0x200 "Reset" = fabrika ayarlarına dönüş (alarm silme değil) | Envicool §7.3 #1 |
| B8 | PCS deployment config'leri `connection.unitId` kullanıyor; core yalnız `slaveId` okur → tüm PCS'ler unit 1 ile sorgulanır | `packages/core/src/modbus/device.ts#ModbusDevice`, `deployment/v2/*/field/device-configs/pcs-*.json` |
| B9 | Bender slave ID aralığı 2–17; config 1 idi | Bender D00007 §3 |
| B10 | CP-IO DI6 Fire / DI7 First Stage simülatörde vardı, config'te yoktu | `packages/simulators/src/control-panel-io/register-map.ts#DISCRETE` |
| B11 | Acrel alarm word bit çözümü yoktu; `emu.json` Acrel ile aynı port (5030) | `configs/acrel-dc-meter.json`, `configs/emu.json` |
| B12 | DC output enerji sayacı H/L iki ayrı ×1 kWh telemetri idi | `configs/dc-output.json` (tek UINT32 ×0.01) |
| B13 | PCS B01 (768) / B23 (790) ← BSC State (30036) ham kopyalanıyor; iki tarafın enum anlamı farklı | `configs/mappings/bsc-pcs-mapping.json` |
| B14 | Simülatör BSC'yi Start beklemeden 6 tick'te Normal'e alıyor; Stop durumu değiştirmiyor | `packages/simulators/src/bsc/bsc-simulator.ts#BSCSimulator.tick`, `#BSCSimulator.handleCommand` |

## 4. Mimari

### 4.1 Veri yolu (değişmeyen)

```
configs/*.json ──(kopya + proje değişkenleri)──▶ deployment/v2/<tier>/<app>/device-configs/*.json
        │                                                     │
        ▼                                                     ▼
packages/simulators (SimulatorHost) ◀── Modbus TCP ── device-service ──▶ tags.canonical ──▶ container-web / field / demo-field
```

### 4.2 BSC güç gösterimi (UC-1 sonrası)

```
30059 DC Voltage (×0.0001 V) ─┐
                              ├─▶ P_dc = V × I  [PMS hesabı] ──▶ işaretli power_kw
30061 DC Current (×0.001 A) ──┘
30063 / 30065 (×0.001 kW) ─────▶ charge_power_limit / discharge_power_limit ──▶ "Limit" alanları
```

## 5. Purity Kuralları (ZORUNLU)

1. Register listesi, bitfield, alarm ve canonical **yalnız** kök `configs/`'te değişir; deployment kopyası elle düzenlenmez, yeniden üretilir.
2. Frontend bir değeri ya register'dan (config telemetrisi) ya da açıkça "PMS hesabı" etiketli türetimden gösterir; simülatöre özel adresler (BSC 49000/49001) UI'da telemetri olarak gösterilmez.
3. Konum register'ları (birim `-`) sayısal ölçüm grafiğine/gauge'una bağlanmaz.

## 6. Use Case'ler

### 6.1 UC-1 — BSC güç ve güç limiti canonical'larının ayrılması

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `charge_power`/`discharge_power` tüketicilerinin `*_limit` ve V×I türetimine geçmesi; `AGENTS-DEVICE-CONFIG.md` istisna cümlesinin güncellenmesi
- hariç: PCS tarafı güç gösterimi (PCS kendi ölçümünü taşır), GD-2

**Akış:**
1. Tüketiciler `charge_power_limit`/`discharge_power_limit` canonical'larını limit alanlarına bağlar.
2. BSC DC gücü 30059 × 30061'den hesaplanır ve "PMS hesabı" etiketiyle gösterilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | System MUST NOT map `charge_power_limit`/`discharge_power_limit` to signed `power_kw` | AK-1.1 |
| FR-1.2 | System MUST derive BSC DC power as V(30059) × I(30061) and label it as a PMS calculation | AK-1.2 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** BSC limitleri 500 kW ve DC akım 0 **WHEN** container-web rack/BSC kartı ve field dashboard çizilir **THEN** güç 0 kW, limitler 500 kW ayrı alanda görünür
2. **AK-1.2 — GIVEN** 30059 = 1300 V, 30061 = 100 A **WHEN** BSC gücü hesaplanır **THEN** 130 kW gösterilir ve etiket "PMS hesabı" içerir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Limit canonical'ı güç toplamına girmez | unit | ⬜ |
| AK-1.2 | DC güç V×I ile hesaplanır ve etiketlenir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `bscHelpers`, `rackHelpers`, `useDashboardData` (container-web) limit/güç ayrımı
- [ ] T-2: `containerGaugeBlocks`, `useContainerData`, `deriveDashboard` (field) limit/güç ayrımı
- [ ] T-3: `AGENTS-DEVICE-CONFIG.md` canonical istisna cümlesi güncellemesi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Online rack yok (30038 = 0) | Güç "—", limitler gösterilir |
| 30059 = 0 | 30057 (anticipated) kullanılmaz; güç "—" |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/container-web/src/features/racks/utils/bscHelpers.ts` | canonical eşleme |
| `apps/container-web/src/features/racks/utils/rackHelpers.ts` | canonical eşleme |
| `apps/container-web/src/features/dashboard/hooks/useDashboardData.ts` | toplam güç |
| `apps/field/src/features/containers/hooks/containerGaugeBlocks.ts` | gauge |
| `apps/field/src/features/containers/hooks/useContainerData.ts` | konteyner verisi |
| `apps/field/src/features/dashboard/deriveDashboard.ts` | dashboard toplamı |
| `AGENTS-DEVICE-CONFIG.md` | konvansiyon metni |

### 6.2 UC-2 — GD-1 deployment config ve mapping kopyalarının yeniden üretilmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `deployment/v2/{dev,aws}/{container,container2,field}/device-configs/*.json` ve `mappings/bsc-pcs-mapping.json` dosyalarının kök `configs/`'ten, yalnız proje değişkenleri korunarak yeniden üretilmesi
- hariç: v1 deployment'ları, `service.json`, demo-mv-station

**Akış:**
1. Her deployment dosyası için eşleşen kök config seçilir (bsc → flex-bsc, hvac → hvac, pcs → wattox-pcs, imd → bender-imd, dc-meter → acrel-dc-meter, pm5340 → pm5340, cb → dc-switch, dc-output, control-panel-io, fss).
2. `deviceId`, `name`, `connection.host/port/slaveId`, `transport`, `connector`, rack/instance tag'leri korunur; geri kalan kökten alınır.
3. PCS dosyalarında `connection.unitId` → `connection.slaveId`.
4. Mapping kopyalarında `target`, `intervalMs` ve `deviceId` korunur; anma enerjisi proje grubuna göre (3568 kWh).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | System MUST keep register list, bitfields, alarms and canonical identical to root `configs/` | AK-2.1 |
| FR-2.2 | System MUST address each PCS with its own `slaveId` | AK-2.2 |
| FR-2.3 | System MUST use rated energy 3568 kWh in GD-1 BSC→PCS mappings | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** kök config ve deployment kopyası **WHEN** `device-config-drift` kontrolü çalışır **THEN** proje değişkenleri dışında fark yoktur
2. **AK-2.2 — GIVEN** `pcs-2.json` **WHEN** device-service bağlanır **THEN** Modbus unit ID 2 kullanılır
3. **AK-2.3 — GIVEN** SOC %50 **WHEN** konnektör çalışır **THEN** PCS 786 = 17840, 787 = 17840, 788 = 3568

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Drift yok | unit | ⬜ |
| AK-2.2 | PCS slaveId okunur | unit | ⬜ |
| AK-2.3 | Enerji alanları 3568 kWh tabanlı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: kopya üretim betiği (proje değişkenlerini koruyan) + v2 dosyalarının yeniden üretimi
- [ ] T-5: PCS `unitId` → `slaveId`
- [ ] T-6: mapping kopyalarında 3568 kWh ve kök mapping ile hizalama
- [ ] T-7: `apps/demo-field/integration/*.integration.test.ts` beklentilerinin yeni adlara göre güncellenmesi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Deployment'ta kökte olmayan ek telemetri | Kaldırılmaz; drift raporunda listelenir, karar developer'a |
| İsim değişikliği (ör. "Rack Max Voltage" → "Max Cell Sum V Rack No.") | Ada bağlı tüketiciler (UI, kural, manevra) aynı PR'da güncellenir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/v2/**/device-configs/*.json` | yeniden üretim |
| `deployment/v2/**/device-configs/mappings/bsc-pcs-mapping.json` | hizalama |
| `packages/shared-utils/src/config/device-config-drift.ts` | drift kontrolü (mevcut) |
| `apps/demo-field/integration/device-telemetry.integration.test.ts` | beklentiler |

### 6.3 UC-3 — HVAC ve BSC komut semantiğinin manevra/kurallara yansıması

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: HVAC off = 2, HVAC 0x200'ün alarm reset olarak kullanılmaması, zorlama modu (0x2100–0x2104) ile soğutma/ısıtma; BSC komutlarında ack sonrası 40010 = 0 ve 1 s heartbeat
- hariç: HVAC sıcaklık eşiklerinin değiştirilmesi (LGES C4 değerleri geçerli)

**Akış:**
1. Konteyner kuralları HVAC soğutma/ısıtma zorlamasını setpoint yazarak değil 0x2100 + 0x2101/0x2104 ile yapar.
2. "Alarm reset" eylemi HVAC için kaldırılır (cihazda alarm silme komutu yok); fabrika ayarı ayrı, onaylı admin eylemi olur.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | System MUST switch HVAC off by writing 2 to 0x202 | AK-3.1 |
| FR-3.2 | System MUST NOT write 0x200 as part of any alarm reset flow | AK-3.2 |
| FR-3.3 | System MUST use forced-mode registers for force cool/heat | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** HVAC açık **WHEN** yangın kuralı HVAC kapatır **THEN** 0x202'ye 2 yazılır ve okuma 2 döner
2. **AK-3.2 — GIVEN** admin "arızaları temizle" **WHEN** HVAC hedeflenir **THEN** 0x200 yazılmaz
3. **AK-3.3 — GIVEN** sıcaklık ≥ 25 °C **WHEN** kural tetiklenir **THEN** 0x2100 = 1 ve 0x2101 = 1 yazılır, setpoint değişmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Off = 2 | unit | ⬜ |
| AK-3.2 | Reset akışında 0x200 yok | unit | ⬜ |
| AK-3.3 | Zorlama register'ları kullanılır | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-8: `deployment/v2/**/rules` ve `maneuvers` HVAC eylemlerinin güncellenmesi
- [ ] T-9: Admin "Faults · clear" kartında HVAC reset hedefinin çıkarılması

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Zorlama açıkken remote off | Önce 0x2100 = 0, sonra 0x202 = 2 |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/v2/dev/container/rules/*.json` | HVAC kuralları |
| `deployment/v2/dev/container/maneuvers/*.json` | HVAC manevraları |
| `apps/demo-field/src/pages/DemoAdminPage.tsx` | reset hedefi |

### 6.4 UC-4 — BSC durumunun PCS BMS bloğuna çevrilmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: 768 (B01 BMS çalışma durumu) ve 790 (B23 DC sistem durumu) için BSC State (30036) → Wattox enum çeviri tablosu; konnektörde `enum` eşleme türü
- hariç: Wattox enum değerlerinin kendisi (Wattox dokümanından alınır — A1)

**Akış:**
1. Mapping'e `{ kind: "enum", from, to, table: { "3": x, "6": y, ... }, default }` eklenir.
2. Konnektör tabloda olmayan değerde `default` yazar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | System MUST translate BSC State to the PCS BMS running-status enum instead of copying the raw value | AK-4.1 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** 30036 = 6 (Emergency) **WHEN** konnektör tick'i **THEN** 768'e Wattox'un arıza/durma kodu yazılır, 6 yazılmaz

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Enum çevirisi uygulanır | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-10: `packages/simulators/src/bsc-pcs-connector/mapping.ts#parseBscPcsMapping` enum türü + test
- [ ] T-11: kök ve deployment mapping'lerinde 768/790 satırlarının enum'a çevrilmesi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Kaynak okunamaz | `lossBit` (769 b0) set edilir, 768 son değerde kalır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/bsc-pcs-connector/mapping.ts` | yeni eşleme türü |
| `packages/simulators/src/bsc-pcs-connector/connector.ts` | uygulama |
| `configs/mappings/bsc-pcs-mapping.json` | 768/790 |

### 6.5 UC-5 — Demo konsolda yalnız gerçek register'ların gösterilmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `apps/demo-field` ve `packages/ui/src/nova` cihaz/gauge/grafik alanlarının config telemetrisine bağlanması; BSC "bağlı değil" durumu; konum register'larının metin olarak gösterimi; sim-only alanların gizlenmesi
- hariç: buton/grafik yerleşimi (makro düzen değişmez), tasarım

**Akış:**
1. BSC State = 1 (Not Initialized) veya online rack = 0 iken SOC/SOH/V/I "—" ve "Bağlı değil" rozeti.
2. Konum register'ları "Rack 3 · Pack 2 · Cell 7" biçiminde metin.
3. Register'ı olmayan alan (ör. IMD gerilimleri, BSC 49000/49001, FSS haritası) gösterilmez veya "harita yok" ile işaretlenir.
4. PMS hesapları (POI = ΣPCS − AUX, BSC P = V×I) "PMS hesabı" etiketiyle.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | System MUST show "—" for BSC SOC/SOH/V/I while no rack is online | AK-5.1 |
| FR-5.2 | System MUST NOT render location registers as numeric measurements | AK-5.2 |
| FR-5.3 | System MUST NOT render values without a backing register unless labelled as PMS calculation | AK-5.3 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** 30036 = 1, 30038 = 0 **WHEN** cihaz sayfası açılır **THEN** SOC "—" ve "Bağlı değil" görünür
2. **AK-5.2 — GIVEN** 30152 = 3, 30153 = 2 **WHEN** sıcaklık kartı çizilir **THEN** "Rack 3 · Pack 2" metni görünür, gauge yoktur
3. **AK-5.3 — GIVEN** IMD config'inde 8198 yok **WHEN** IMD kartı çizilir **THEN** net gerilim alanı görünmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Bağlı değil durumu | unit | ⬜ |
| AK-5.2 | Konum metni | unit | ⬜ |
| AK-5.3 | Register'sız alan yok | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-12: `mapFieldToMimicState` ve `DemoDevicesPage` alan eşlemelerinin config adlarına göre güncellenmesi (ör. `Rack Max Temp Location` → `Max Temp Rack No.`)
- [ ] T-13: `packages/ui/src/nova/demo-bess-data.ts` alan listesinin register kataloğuyla hizalanması

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Telemetri bayat (`maxStaleMs` aşıldı) | Değer gri + zaman damgası |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/pages/DemoDevicesPage.tsx` | alan eşleme |
| `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts` | durum türetimi |
| `packages/ui/src/nova/demo-bess-data.ts` | alan kataloğu |

### 6.6 UC-6 — Simülatörün LGES sequence'ine uydurulması

**Status:** ⛔ Defer

**Kapsam:**
- dahil: Start'sız otomatik Normal geçişinin kaldırılması, Stop sonrası 0x0001 + online 0, rack gücünün rack sayısına bölünmesi, enerji entegrasyonunda gerçek zaman tabanı
- hariç: bu paket — kullanıcı kararı "simülasyonlara daha sonra detaylıca gireceğiz" (A2)

**Akış:**
1. Ayrı SPEC ile ele alınır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Simulator SHOULD stay Not Initialized until the controller sends Start | AK-6.1 |

**Kabul Senaryoları (GWT):**
1. **AK-6.1 — GIVEN** yeni açılmış BSC simülatörü **WHEN** 10 tick geçer ve Start yazılmaz **THEN** 30036 = 1 kalır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Start'sız başlatma yok | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-14: ayrı simülasyon SPEC'i

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Demo akışı Start'a bağımlı hale gelir | Demo başlatma betiği Start manevrasını tetikler |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/bsc/bsc-simulator.ts` | davranış |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Kök config değişti, kopya güncellenmedi | Drift kontrolü uyarır; deployment PR'ı reddedilir |
| Ada bağlı tüketici eski adı arıyor | Değer "—" görünür; entegrasyon testi kırılır (beklenen) |
| Mapping kaynağı okunamıyor | `lossBit`; PCS BMS bloğu son değerde |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | UI'da register karşılığı olmayan veya etiketsiz türetilmiş değer sayısı 0 | UC-5 testleri + gözle kontrol |
| SC-2 | v2 deployment kopyaları kökle drift'siz | drift kontrolü |
| SC-3 | BSC limitleri güç olarak görünmez | UC-1 testleri |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-4 betik sözleşmesi, T-10 enum eşleme sözleşmesi |
| 3. TEST | AK-1.x … AK-5.x unit testleri |
| 4. IMPL | T-1 … T-13 |
| 5. KAPANIŞ | `GD1-SIMULATOR-CONFIG-UYUM-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Wattox B01/B23 enum değerleri (UC-4 tablosu) | Wattox BMS arayüz dokümanından alınacak |
| A2 | Simülatör LGES sequence uyumu | UC-6, ayrı paket |
| A3 | Simülatör branch'i | `simulators` branch'i önce `origin/demo-konsol-ui-uyum`'u merge etmeli (temiz merge doğrulandı) |
| A4 | Acrel enerji register'ları | Simülatör desteklemiyor; eklenince config'e girer |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Simülatör davranış revizyonu (UC-6).
2. FSS için gerçek Modbus haritası gelirse `configs/fss.json` `simOnly` kaldırılır.

## 12. T Görev Özeti

| Kod | Görev | UC |
|:----|:------|:---|
| T-1 | `bscHelpers`, `rackHelpers`, `useDashboardData` (container-web) limit/güç ayrımı | UC-1 |
| T-2 | `containerGaugeBlocks`, `useContainerData`, `deriveDashboard` (field) limit/güç ayrımı | UC-1 |
| T-3 | `AGENTS-DEVICE-CONFIG.md` canonical istisna cümlesi güncellemesi | UC-1 |
| T-4 | kopya üretim betiği (proje değişkenlerini koruyan) + v2 dosyalarının yeniden üretimi | UC-2 |
| T-5 | PCS `unitId` → `slaveId` | UC-2 |
| T-6 | mapping kopyalarında 3568 kWh ve kök mapping ile hizalama | UC-2 |
| T-7 | `apps/demo-field/integration/*.integration.test.ts` beklentilerinin yeni adlara göre güncellenmesi | UC-2 |
| T-8 | `deployment/v2/**/rules` ve `maneuvers` HVAC eylemlerinin güncellenmesi | UC-3 |
| T-9 | Admin "Faults · clear" kartında HVAC reset hedefinin çıkarılması | UC-3 |
| T-10 | `packages/simulators/src/bsc-pcs-connector/mapping.ts#parseBscPcsMapping` enum türü + test | UC-4 |
| T-11 | kök ve deployment mapping'lerinde 768/790 satırlarının enum'a çevrilmesi | UC-4 |
| T-12 | `mapFieldToMimicState` ve `DemoDevicesPage` alan eşlemelerinin config adlarına göre güncellenmesi (ör. `Rack Max Temp Location` → `Max Temp Rack No.`) | UC-5 |
| T-13 | `packages/ui/src/nova/demo-bess-data.ts` alan listesinin register kataloğuyla hizalanması | UC-5 |
| T-14 | ayrı simülasyon SPEC'i | UC-6 |
