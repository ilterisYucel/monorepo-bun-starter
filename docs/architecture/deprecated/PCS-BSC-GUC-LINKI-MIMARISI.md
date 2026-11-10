---
status: active
space: architecture
tags: [mimari, simulator, bsc, pcs, soc, connector, spec]
review_date: 2026-10-21
---

# PCS→BSC Güç Linki — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟡 Geliştirmede (2026-10-21) — SPEC onaylı; T-1…T-9 tamam, KAPANIŞ bekliyor.
> **İlişkili:** [SIMULATOR-MIMARISI.md](./SIMULATOR-MIMARISI.md) (ISimulator REV.03, connector UC-4), [SEBEKE-YOLU-ESLESMESI-MIMARISI.md](./SEBEKE-YOLU-ESLESMESI-MIMARISI.md) (P2), [DEVICE-CONFIG-KAYNAK-AYRIMI-MIMARISI.md](./DEVICE-CONFIG-KAYNAK-AYRIMI-MIMARISI.md) (config türevleri).

## 1. Amaç ve Bağlam

**Sorun:** BSC simülatörü SOC'yi SIM_ONLY register'lardan (49000/49001) gelen setpoint ile değiştiriyor. Gerçek sahada BSC'nin güç setpoint'i YOKTUR; DC gücü PCS üretir (Wattox S06) ve BSC yalnız ölçer. Ayrıca gdems referans demosunda charge/discharge komutu doğrudan PCS'e gider ve SOC fiziksel olarak PCS gücünden entegre edilir.

**Çözüm:** Güç akışı PCS→BSC yönünde modellenir. BSC simülatörü dış güç girdisi (`IBatteryPowerInput`) alır; SOC'yi gdems formülüyle entegre eder. `BscPcsConnectorAdapter`'a ters kanal eklenir: PCS EMS S16 (aktif güç) TCP Modbus ile okunur, toplam in-process BSC girdisine yazılır. SIM_ONLY register'ları ve SIM setpoint komutları silinir.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `packages/simulators` | `IBatteryPowerInput`, BSC SOC entegrasyonu, connector ters kanalı | PCS güç modeli (mevcut register davranışı) |
| Config | `configs/sim/*` connector `pcsSources`; v2 container BSC türevleri | Gerçek cihaz config'leri (production-only kalır) |
| Manevralar | Container `bsc_charge/bsc_discharge` kaldırma; field `pcs_charge/pcs_discharge` | Yeni manevra kataloğu |
| device-service | Host wiring (connector) | Komut doğrulama yolu (NEW-3 mevcut) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-21)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | BSC güç kaynağı **dış girdi**: `IBatteryPowerInput` (`applyPowerKw(kw)`); SIM_ONLY register bloğu ve `set_*_power` komutları SİLİNİR | UC-1 |
| K2 | SOC entegrasyonu gdems formülü: `ΔE = P × (dt/3600) × η`, η=0.975; mevcut rack kapasite modeli; SOC clamp %3.5–%97 | UC-1 |
| K3 | İşaret: `P < 0` şarj (SOC ↑), `P > 0` deşarj (SOC ↓) — Wattox S06 konvansiyonu | UC-1 |
| K4 | Ters kanal connector'da: PCS S16 (`REG_GRID_ACTIVE_POWER`) TCP Modbus ile okunur; toplam BSC'ye in-process iletilir | UC-2 |
| K5 | Link yok/erişilemez → güç 0 (SOC sabit); mevcut connector durum telemetrisi görünürlük sağlar | UC-2 |
| K6 | BSC limitleri (nominal 500 kW, SOC kapılı) girdi gücünü kırpar | UC-1 |
| K7 | Container demo-manevralarındaki BSC güç komutları kaldırılır; field `pcs_charge/pcs_discharge` tek kaynak | UC-3 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | BSC simülatörü SIM_ONLY 49000/49001 setpoint'lerinden güç türetiyor | `packages/simulators/src/bsc/register-map.ts#SIM_ONLY`, `#bsc-simulator.ts#updateRackStates` |
| B2 | Connector tek yönlü: BSC register'ları → PCS BMS (0x0300) | `packages/simulators/src/bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter` |
| B3 | Container demo-manevraları `bsc_charge/bsc_discharge` SIM setpoint komutlarına bağlı | `deployment/v2/dev/container/maneuvers/demo-maneuvers.json` |
| B4 | gdems referansı: charge = PCS S06 negatif + S16 start; SOC = P gücünden entegre | `/home/gd-software/Downloads/gdems-kaynak/gdems/demo/sim.js` (harici referans) |

## 4. Mimari

### 4.1 Akış

```
Field tier (device-service)                 Container tier (device-service)
┌──────────────────────────┐                ┌──────────────────────────────────┐
│ WattoxPcsSimulator       │  Modbus TCP    │ BscPcsConnectorAdapter (ek)      │
│  EMS: S06 güç setpoint   │ ─────────────► │  1) PCS S16 oku (TcpPowerReader)  │
│  S16 start/stop          │  S16 okuma     │  2) toplam P hesapla              │
└──────────────────────────┘                │  3) BSCSimulator.applyPowerKw(P)  │
                                            │       └─ SOC entegrasyonu         │
                                            │  4) BSC reg → PCS BMS (mevcut)    │
                                            └──────────────────────────────────┘
```

### 4.2 Bileşenler

- `IBatteryPowerInput` — `packages/simulators/src/bsc/power-input.ts`: `applyPowerKw(kw: number): void` (komut; void).
- `BSCSimulator` — tick'te `rackPowerKw = f(externalPowerKw)`; SOC enerji entegrasyonu `simSpeedMultiplier` ile hızlandırılır (mevcut davranış).
- `PcsPowerReader` — `packages/simulators/src/bsc-pcs-connector/pcs-power-reader.ts`: PCS endpoint listesinden S16 okur (mevcut `TcpSourceReader`/jsmodbus client deseni).
- `BscPcsConnectorAdapter` — mevcut tick'e ters kanal eklenir; `pcsSources` boşsa davranış değişmez.
- Host — `connector.sim.pcsSources` varsa connector'a `PcsPowerReader` + BSC güç girdisi enjekte eder.

### 4.3 Config şeması

`configs/sim/flex-bsc-sim-with-wattox.json` (ve v2 container kopyaları):

```json
"connector": {
  "device": { "...": "mevcut" },
  "sim": {
    "registerMap": "mappings/bsc-pcs-mapping.json",
    "pcsSources": [
      { "deviceId": "PCS-1", "host": "127.0.0.1", "port": 15502 },
      { "deviceId": "PCS-2", "host": "127.0.0.1", "port": 15503 }
    ]
  }
}
```

`host`/`port` proje değişkenidir (deployment kopyasında); şema sim türevinde sabittir.

## 5. Purity Kuralları (ZORUNLU)

1. Production kök config'lerde (`configs/*.json`) güç linki alanı/sim anahtarı BULUNMAZ (config kaynak ayrımı SPEC'i).
2. BSC simülatörü PCS'e bağımlı OLMAZ — yalnız `IBatteryPowerInput` tüketir (interface ayrımı).
3. Connector, BSC'ye in-process; PCS'e TCP Modbus ile bağlanır (SIMULATOR-MIMARISI K6 deseni korunur).
4. `packages/core`'a bağımlılık YOK; jsmodbus client doğrudan kullanılır.
5. SIM_ONLY register/komut adı kodda grep=0 (silinir).

## 6. Use Case'ler

### 6.1 UC-1 — BSC dış güç girdisi + SOC entegrasyonu

**Status:** 🟡 Geliştirmede (T-1…T-9 tamam)

**Kapsam:**
- dahil: `IBatteryPowerInput`, BSC tick güç kaynağı değişimi, SOC formülü, limit kırpma, SIM_ONLY temizliği
- hariç: PCS güç modeli, connector ters kanalı (UC-2)

**Akış:**
1. Connector/girdi `applyPowerKw(P)` çağırır.
2. BSC tick'te `P_eff = clamp(P, -dischargeLimit, +chargeLimit)` (işaret K3).
3. Her rack için `storedCapacityKwh += P_eff/n × (dt/3600) × η × simSpeedMultiplier`.
4. SOC = storedCapacity/kapasite; clamp %3.5–%97; register'lar güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | BSC `applyPowerKw(kw)` komutunu sunmalı; son değer tick'te kullanılmalı | AK-1.1 |
| FR-1.2 | SOC gdems formülüyle (η=0.975, clamp %3.5–%97) entegre edilmeli | AK-1.2 |
| FR-1.3 | SOC kapılı güç limitleri girdi gücünü kırpmalı | AK-1.3 |
| FR-1.4 | SIM_ONLY register'ları ve SIM güç komutları kod/config'ten kalkmalı | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** BSC start'lı **WHEN** `applyPowerKw(-500)` **THEN** tick sonrası SOC artar
2. **AK-1.2 — GIVEN** 1000 kWh kapasite, SOC %50 **WHEN** 500 kW şarj 1 saat (η=0.975) **THEN** SOC ≈ %98.75 → clamp %97
3. **AK-1.3 — GIVEN** SOC %100 **WHEN** şarj gücü verilir **THEN** efektif güç 0 (limit), SOC artmaz
4. **AK-1.4 — GIVEN** kod tabanı **WHEN** `49000`, `49001`, `set_charge_power`, `set_discharge_power` aranır **THEN** sonuç yok

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Güç yönü SOC'yi doğru değiştirir | unit | ⬜ |
| AK-1.2 | Formül sayısal doğrulama | unit | ⬜ |
| AK-1.3 | Limit kırpma | unit | ⬜ |
| AK-1.4 | SIM kalıntısı yok | grep | ⬜ |

**T Görev Listesi:**
- [x] T-1: `IBatteryPowerInput` + JSDoc (`bsc/power-input.ts`)
- [x] T-2: Kırmızı testler — yön, formül, clamp, limit
- [x] T-3: BSC implementasyonu + SIM_ONLY temizliği

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Güç girdisi hiç çağrılmadı | 0 kabul edilir (SOC sabit) |
| İşaret değişimi (şarj→deşarj) | Anında yön değişir; enerji korunur |
| SOC sınırda | Limit 0; register limitleri 0 gösterir |
| `simSpeedMultiplier` | Enerji entegrasyonunu hızlandırır, tick ritmi değişmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/bsc/power-input.ts` | YENİ — `IBatteryPowerInput` |
| `packages/simulators/src/bsc/bsc-simulator.ts` | Güç kaynağı değişimi |
| `packages/simulators/src/bsc/register-map.ts` | SIM_ONLY silinir |

### 6.2 UC-2 — Connector ters kanalı (PCS→BSC)

**Status:** 🟡 Geliştirmede (T-1…T-9 tamam)

**Kapsam:**
- dahil: PCS S16 okuma (TCP), toplam güç, BSC in-process yazım, config şeması, host wiring, erişilemezlik davranışı
- hariç: PCS DC/AC detay modelleri, çoklu cluster agregasyonu

**Akış:**
1. Host, BSC config'indeki `connector.sim.pcsSources` listesini çözer (env override).
2. Connector tick'te her PCS'den S16 okur; erişilemeyen → 0 + durum.
3. Toplam `ΣP` BSC `applyPowerKw`'ya yazılır.
4. Mevcut BSC→PCS BMS yazımı aynen sürer.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Connector, `pcsSources` endpoint'lerinden S16'yı TCP Modbus ile okumalı | AK-2.1 |
| FR-2.2 | Toplam güç BSC'ye in-process iletilmeli | AK-2.2 |
| FR-2.3 | Erişilemeyen PCS toplama 0 katmalı; durum telemetrisi güncellenmeli | AK-2.3 |
| FR-2.4 | `pcsSources` yoksa mevcut davranış aynen korunmalı | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** PCS S16 = −400 **WHEN** connector tick **THEN** BSC girdisi −400
2. **AK-2.2 — GIVEN** iki PCS (−300, −200) **WHEN** tick **THEN** BSC girdisi −500 (toplam)
3. **AK-2.3 — GIVEN** PCS erişilemez **WHEN** tick **THEN** katkı 0, connector kaynak durumu bozulma gösterir
4. **AK-2.4 — GIVEN** `pcsSources` yok **WHEN** connector çalışır **THEN** BSC güç girdisi çağrılmaz

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | S16 okuma | unit (gerçek server) | ⬜ |
| AK-2.2 | Toplama | unit | ⬜ |
| AK-2.3 | Erişilemezlik | unit | ⬜ |
| AK-2.4 | Geriye uyum | unit | ⬜ |

**T Görev Listesi:**
- [x] T-4: `PcsPowerReader` + testler (gerçek Modbus server)
- [x] T-5: Connector ters kanal + host wiring + config şeması
- [x] T-6: v2 container BSC türevlerine `pcsSources` (deployment)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| PCS partial erişim | Erişilebilenler toplanır; durum=kısmi |
| Tüm PCS kapalı | Toplam 0; SOC sabit |
| S16 negatif/pozitif | İşaret korunur (K3) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/bsc-pcs-connector/pcs-power-reader.ts` | YENİ — TCP S16 okuyucu |
| `packages/simulators/src/bsc-pcs-connector/connector.ts` | Ters kanal |
| `packages/simulators/src/host.ts` | Wiring |
| `configs/sim/flex-bsc-sim-with-wattox.json` | `pcsSources` şeması |
| `deployment/v2/*/container*/device-configs/bsc-*.json` | Değerler |

### 6.3 UC-3 — Manevra temizliği (PCS tek kaynak)

**Status:** 🟡 Geliştirmede (T-1…T-9 tamam)

**Kapsam:**
- dahil: container demo-manevralarından BSC güç komutlarının kaldırılması; demo operations'ın yalnız field PCS ops çağırması; entegrasyon testi
- hariç: yeni operasyon kataloğu, UI değişikliği

**Akış:**
1. `deployment/v2/*/container/maneuvers/demo-maneuvers.json` BSC güç manevraları kaldırılır (start/contactors hazırlığı `bsc_prepare`'da kalır).
2. `deployment/v2/*/field/maneuvers/demo-operations.json` `charge/discharge` yalnız `pcs_charge/pcs_discharge` çağırır.
3. Entegrasyon testi: PCS S06 yazımı → connector → BSC SOC yönü.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Container demo-manevraları BSC güç komutu içermemeli | AK-3.1 |
| FR-3.2 | Demo charge/discharge yalnız field PCS operasyonlarını çağırmalı | AK-3.2 |
| FR-3.3 | Uçtan uca test PCS gücünün SOC'ye yansıdığını kanıtlamalı | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** container demo-maneuvers **WHEN** incelenir **THEN** `bsc_charge/bsc_discharge` / `set_*_power` yok
2. **AK-3.2 — GIVEN** field demo-operations.charge **WHEN** çalışır **THEN** adımlar yalnız `pcs_charge` (ve gerekli hazırlık) içerir
3. **AK-3.3 — GIVEN** demo stack **WHEN** `pcs_charge` 500 kW **THEN** BSC SOC azalan/dinamik değil, şarj yönünde artar

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Manevra içeriği | script kontrolü | ⬜ |
| AK-3.2 | Operasyon zinciri | entegrasyon | ⬜ |
| AK-3.3 | SOC yönü | entegrasyon | ⬜ |

**T Görev Listesi:**
- [x] T-7: Container demo-manevra temizliği + field operations güncellemesi
- [x] T-8: Uçtan uca entegrasyon testi (S06 → SOC)
- [x] T-9: Doğrulama — tam test + drift

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| BSC hazırlık gereksinimi | `bsc_prepare` (start + contactors) korunur; güç adımı yok |
| PCS start edilmemiş | S06 yazımı PCS'te standby'a çeker (mevcut davranış) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/v2/*/container/maneuvers/demo-maneuvers.json` | BSC güç komutları kaldırılır |
| `deployment/v2/*/field/maneuvers/demo-operations.json` | Yalnız PCS ops |
| `apps/demo-field/integration/*.integration.test.ts` | Uçtan uca kanıt |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Güç girdisi yok | 0 kabul; SOC sabit |
| PCS erişilemez | Katkı 0; durum telemetrisi; SOC sabit |
| Config `pcsSources` boş | Ters kanal kapalı (geriye uyum) |
| SOC sınırı | Limit 0; entegrasyon durur |
| Connector tick hatası | Yakalanır; BSC girdisi son geçerli değerde kalır (fail-safe) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | SOC entegrasyonu sayısal olarak gdems formülüyle uyumlu (±%2, 1 saat) | unit |
| SC-2 | Kod/config'te SIM_ONLY güç kalıntısı grep=0 | grep kontrolü |
| SC-3 | Connector ters kanal branch coverage ≥%90 | `nx run simulators:test` + coverage |
| SC-4 | `bun run spec:check` temiz | komut |
| SC-5 | Uçtan uca entegrasyon testi yeşil | entegrasyon |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | `IBatteryPowerInput`, `PcsPowerReader` sözleşmeleri |
| 3. TEST | T-2, T-4 (kırmızı) |
| 4. IMPL | T-1, T-3, T-5, T-6, T-7 |
| 5. KAPANIŞ | `PCS-BSC-GUC-LINKI-KAPANIS.md`; T-8/T-9 |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Çoklu BSC/küme agregasyonu | İleri iş; MVP tek BSC toplamı |
| A-2 | PCS S16 yerine DC güç okuma | MVP S16 (EMS); DC güç sonraki iş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Fault injection / thermal-HVAC / kalibrasyon senaryoları.
2. Çoklu cluster güç agregasyonu ve BSC limit paylaşımı.

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | `IBatteryPowerInput` + JSDoc | UC-1 |
| T-2 | Kırmızı SOC testleri | UC-1 |
| T-3 | BSC impl + SIM_ONLY temizliği | UC-1 |
| T-4 | `PcsPowerReader` + testler | UC-2 |
| T-5 | Connector ters kanal + host wiring | UC-2 |
| T-6 | v2 BSC config `pcsSources` | UC-2 |
| T-7 | Manevra temizliği | UC-3 |
| T-8 | Uçtan uca entegrasyon testi | UC-3 |
| T-9 | Doğrulama (test + drift) | UC-3 |
