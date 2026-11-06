# BSC Simülatörü (Battery System Controller)

> Cihaz: LG Energy Solution **Flex BSC** (JF1 1CP raf sistemi) — rak tabanlı batarya sistem kontrolcüsü.
> Vendor kaynakları: *Flex BSC Modbus Map JF1 Rev AF* (2025-07-30), *Flex BSC SW User Manual RevAH*
> (2026-01-19), *LGES Diagnosis v1.1.0* — `vendor-documentation/battery/`. Config denetimi:
> [VENDOR-UYUM-DENETIMI.md](VENDOR-UYUM-DENETIMI.md) §2.1. Vendor'a birebir davranan fiziksel model:
> `physical/models/bsc.ts` + `physical/models/battery/*` ([FIZIKSEL-SAHA-SIMULATORU.md](FIZIKSEL-SAHA-SIMULATORU.md)).
> Kod: `bsc/bsc-simulator.ts#BSCSimulator`, register tanımları: `bsc/register-map.ts`,
> dönüşüm tablosu: `bsc/bsc-math.ts`, parser: `bsc/bsc-config.ts`.

Bu simülatör, bir BESS (batarya enerji depolama sistemi) **sistem kontrolcüsünü**
taklit eder: N adet rack (raf), her rack'in SOC/SOH/gerilimi, sistem özet
telemetrisi ve bir controller'ın gönderdiği komutlara verilen yanıtlar.

---

## 1. Konfigürasyon ve başlangıç durumu

`BSCSimulatorConfig` (`bsc/bsc-simulator.ts#BSCSimulatorConfig`):

| Alan | Anlam | Varsayılan |
| :--- | :--- | :--- |
| `rackCount` | Toplam rack sayısı (host'tan `details.rackCount`) | 8 (host) |
| `registers` | Excel türevi register tanımları (`parseBSCMap` çıktısı) | — |
| `initialSocPercent` | Başlangıç SOC (%) — host `details.initialSocPercent` | **50** |
| `simSpeedMultiplier` | SOC enerji entegrasyonu hız çarpanı (K-20); tick/telemetri ritmi 1 sn KALIR — host `details.simSpeedMultiplier` | **1** (demo **133**) |
| `network` | Verilirse self-host Modbus TCP açılır | — |

- Constructor (`bsc/bsc-simulator.ts#BSCSimulator.constructor`): `initRegisters()` +
  `initRackStates(initialSocPercent ?? 50)`.
- Her rack başlangıçta: `storedCapacityKwh = socToCapacity(initialSoc)`,
  `status = false` (offline), `disabled = false`.
- Sistem başlangıç durumu: `BSC_STATE.NOT_INITIALIZED` (0x0001).
- Üç ayrı tablo tutulur: `inputRegisters`, `holdingRegisters`, `discreteInputs`
  + `rackStates`.

---

## 2. `start()` / `stop()` / `port()`

`SelfHostedSimulator` deseni (bkz. [README.md](README.md)):
- `start()` — `network` yoksa no-op; varsa `SimulatorServer` (BSCSimulatorAdapter +
  `tick: (s) => this.tick(s)`) açılır. **İdempotent.**
- `stop()` — sunucuyu kapatır, idempotent.
- `port()` — çalışırken gerçek port, öncesi config portu.

---

## 3. `tick(elapsedSeconds)` — adım adım

`bsc/bsc-simulator.ts#BSCSimulator.tick`:

1. **`tickCount++`** — sanal tick sayacı.
2. **Otomatik başlatma durum makinesi:**
   - `NOT_INITIALIZED` ve `tickCount >= 3` → `INITIALIZING` (0x0002).
   - `INITIALIZING` ve `tickCount >= 6` → `NORMAL` (0x0003); tüm rack'ler
     `status = !disabled` (online) yapılır.
3. **Controller LOC tespiti:** Son controller heartbeat'ten bu yana **5 tick'ten
   fazla** geçtiyse `locBits` bit0 (Alarm) set edilir → `DIAGNOSTICS.CONTROLLER_LOC`
   (30043). Controller `CONTROLLER.HEARTBEAT` (40000) yazdıkça sayaç sıfırlanır.
4. `updateRackStates(elapsedSeconds)` — **güç/enerji entegrasyonu** (aşağıda).
5. `updateSystemRegisters(locBits)` — sistem input register'ları.
6. `updatePerRackRegisters()` — rack başına input register'ları.
7. `updateRackFlags()` — discrete input rack bayrakları.

### 3.1 `updateRackStates` — güç modeli (dış güç girdisi)

`bsc/bsc-simulator.ts#BSCSimulator.updateRackStates`:

- **Güç, holding setpoint'lerinden DEĞİL, dış girdiden gelir**
  (`bsc/power-input.ts#IBatteryPowerInput` → `#BSCSimulator.applyPowerKw`).
  PCS→BSC ters kanalı (konnektör `powerLink`) toplam PCS gücünü yazar; gerçek
  sahada DC gücü PCS üretir, BSC yalnız ölçer.
  - İşaret: `kw < 0` şarj (SOC ↑), `kw > 0` deşarj (SOC ↓) — Wattox S06/S16
    konvansiyonu. Sonlu olmayan değer 0 kabul edilir.
- **Etkin güç kırpması** (`#BSCSimulator.effectivePowerKw`): `±NOMINAL_POWER_LIMIT_KW`
  (500 kW) ve SOC sınırları — max SOC'de şarj 0, min SOC'de deşarj 0.
- **Yalnızca `status === true` (online) rack'ler** için:
  `ΔE = |P| × h × η` (şarj) / `P × h / η` (deşarj); `h = elapsedSeconds ×
  simSpeedMultiplier / 3600`, `η = ROUND_TRIP_EFFICIENCY (0.975)`.
- **Clamp:** enerji entegrasyonu %3,5 (MIN_SOC) ile %97 (MAX_SOC) arasında tutulur.
- Enerji entegrasyonu yalnızca `bscState === NORMAL || MANUAL` iken yapılır.

### 3.2 `updateSystemRegisters` — sistem okuma register'ları

| Adres | Ad | Değer |
| :--- | :--- | :--- |
| 30035 | `ESSENTIAL.HEARTBEAT` | `tickCount % 65536` (+1/tick) |
| 30036 | `ESSENTIAL.BSC_STATE` | Aktif BSC durumu |
| 30037 | `ESSENTIAL.BSC_INFO` | Bitfield (aşağıda) |
| 30038 | `ESSENTIAL.ONLINE_RACK_NO` | Online rack sayısı |
| 30043 | `DIAGNOSTICS.CONTROLLER_LOC` | LOC alarm bitleri |
| 30055 | `SYSTEM_SUMMARY.BSC_SOC` | Ortalama SOC ×100 |
| 30056 | `SYSTEM_SUMMARY.BSC_SOH` | Ortalama SOH ×100 (hep **99 %**) |
| 30057–58 | `DC_VOLTAGE_ANTICIPATED` | Online yoksa ortalama gerilim ×10000, varsa 0 |
| 30059–60 | `SYSTEM_SUMMARY.DC_VOLTAGE` | Ortalama DC gerilim ×10000 (uint32) |
| 30061–62 | `SYSTEM_SUMMARY.DC_CURRENT` | `powerKw×1000 / avgVoltage` (sint32) |
| 30063–64 | `CHARGE_POWER_LIMIT` | Max SOC'de 0; aksi nominal **500 kW** (×1000) |
| 30065–66 | `DISCHARGE_POWER_LIMIT` | Min SOC'de 0; aksi nominal 500 kW (×1000) |
| 30100–30157 | `SUMMARY_STATS.*` | MAX/AVG/MIN SOC, SOH, cell-sum gerilimi, akım, sıcaklık, konumlar |

- **`BSC_INFO` (30037) bitleri** (`register-map.ts#BSC_INFO_BITS`):
  - b4:b5 `CHARGE_STATUS` — **güç işaretinden** (dış girdi): `P < 0` → `0b01` (şarj),
    `P > 0` → `0b10` (deşarj), `P = 0` → `0b11` (idle)
  - b10 `PRE_VPC` (avgSoc > %95), b11 `VPC` (> %90), b12 `SPC` (> %85)
- **Not:** ortalama gerilim, online rack'lerin gerilimlerinin ortalamasıdır;
  online rack yoksa fallback 1300 V kullanılır.

### 3.3 `updatePerRackRegisters` — rack başına

`bsc/bsc-simulator.ts#BSCSimulator.updatePerRackRegisters`. Rack `n` için:

- Nameplate tabanı = `RACK_NAMEPLATE_BASE (30170) + (n-1) × RACK_STRIDE (150)`
- Summary tabanı = nameplate + `RACK_SUMMARY_BASE_OFFSET (50)` → rack 1 için **30220**

Yazılanlar (online rack): `HEARTBEAT`, `STATE = NORMAL (0x09)`, `STATUS_FLAGS`
(b8 Battery Ready, b7 DC Line Closed, b3/b4 şarj/deşarj — **güç işaretinden**), `COMPONENT_STATUS`
(MC+/MC-/CB kapalı, fan), `COMPONENT_FEEDBACK`, `LIVE_UNIT_COUNT = 200`,
`SOC` (×100), `SOH` (99×100), güç limitleri, `CELL_SUM_VOLTAGE` (V×10000),
`CURRENT` (sint32), hücre gerilimleri, `MAX/MIN/AVG_PACK_TEMPERATURE`,
`CALIBRATION_INFO = 0`, diyagnostikler = 0.
Offline rack'ler idle değerlerde bırakılır.

### 3.4 `updateRackFlags` — discrete input bayrakları

`bsc/bsc-simulator.ts#BSCSimulator.updateRackFlags`. `N = rackCount`, `i = 1..N` için:
`i` = Disabled, `N+i` = Online (`state.status`), `2N+i` = Alarm, `3N+i` = Warning,
`4N+i` = Fault, `5N+i` = Non-Balancing. Alarm/Warning/Fault **hep `false`** (sağlıklı).

### 3.5 `inject(scenario)` — senaryo enjeksiyonu

`bsc/bsc-simulator.ts#BSCSimulator.inject` (`ISimulator.inject`; yalnız dev/debug):

| Senaryo | Etki |
| :--- | :--- |
| `soc:<pct>` | Tüm rack'lerin SOC'sini `<pct>`'e çeker (%3,5–%97 aralığına kırpılır) |
| `overheat` | Max pack sıcaklığı 80,0 °C (`tms_overheat_protect`) |
| `diff_temp` | Rack 1 sıcaklık farkı 15,0 °C (`tms_temp_diff_protect`) |
| `fault` | `BSC_INFO` fault biti set (arıza görünümü) |
| `nominal` | Enjeksiyonları temizler (sağlıklı) |

- Enjeksiyonlar her tick'te geçerlidir (override); bilinmeyen senaryo `false` döner.
- Demo entegrasyon testleri bu API'yi kullanır (SOC başlangıcı, overheat alarmı).

---

## 4. Yazma davranışı — hangi register'a yazınca ne olur?

`bsc/bsc-simulator.ts#BSCSimulator.writeHoldingRegister`: değer her zaman holding
tablosuna yazılır; ayrıca:

| Adres | Sembol | Etki |
| :--- | :--- | :--- |
| **40000** | `CONTROLLER.HEARTBEAT` | `lastControllerHeartbeat = tickCount` → LOC alarmı sıfırlanır |
| **40010** | `CONTROLLER.COMMAND_REQUEST` | `handleCommand(value)` **anında** çalışır |
| **40030** | `CHARGE_POWER_SETPOINT` | **Yalnız saklanır** — güç modeli dış girdiden beslenir (tüketilmez) |
| **40031** | `DISCHARGE_POWER_SETPOINT` | **Yalnız saklanır** (tüketilmez) |

### Komut tablosu (`handleCommand` → 40010)

`bsc/bsc-simulator.ts#BSCSimulator.handleCommand`:

| Komut | Değer | Tepki |
| :--- | :--- | :--- |
| `EMERGENCY` | 0x0001 | Durum `EMERGENCY`; tüm rack'ler offline; ACK = DONE |
| `START` | 0x0002 | Durum `NORMAL`; `!disabled` rack'ler online; register'lar anında güncellenir |
| `STOP` | 0x0003 | ACK = DONE; register'lar güncellenir (rack durumu değişmez) |
| `OPEN_ALL_CONTACTORS` | 0x0004 | Tüm rack'ler offline |
| `CLOSE_CONTACTORS` | 0x0005 | `!disabled` rack'ler online |
| `ENTER_MANUAL` | 0x0006 | Durum `MANUAL`; tüm rack'ler offline |
| `EXIT_MANUAL` | 0x0007 | `MANUAL` ise `NORMAL`; rack'ler online |
| `EVENT_CLEAR` | 0x0009 | ACK = DONE |
| `RESET` | 0x000A | `resetSimulator()` — register/rack state sıfırlanır, durum `NOT_INITIALIZED` |
| Bilinmeyen / `0x000B` | — | ACK = `INVALID_REQUEST` (0x0030) — **0x000B Rev AF'de kaldırıldı**; BSC'de charge/discharge komutu YOKTUR (güç PCS'te) |

**Kabul kuralları:**
- `NOT_INITIALIZED` iken `START` dışındaki komut → ACK = `UNDER_INITIALIZING` (0x0007), reddedilir.
- `EMERGENCY` iken `RESET`/`EMERGENCY` dışındaki komut → ACK = `BSC_EMERGENCY_MODE` (0x000C).
- ACK, `NAMEPLATE.REQUEST_ACKNOWLEDGE` (**30030**) register'ına yazılır; DONE/IN_PROGRESS
  ise `NAMEPLATE.LAST_ACCEPTED_REQ` (**30031**) = komut kodu.

---

## 5. Register grupları (özet)

Tam liste: `bsc/register-map.ts`. Önemli bloklar:

**INPUT REGISTERS (3x) — salt okunur**
- `NAMEPLATE` 30000–30031: `SW_VERSION`, `TOTAL_RACK_NO`, `REQUEST_ACKNOWLEDGE` (30030), `LAST_ACCEPTED_REQ` (30031)
- `ESSENTIAL` 30035–30038: `HEARTBEAT`, `BSC_STATE`, `BSC_INFO`, `ONLINE_RACK_NO`
- `DIAGNOSTICS` 30043–30050: `CONTROLLER_LOC`, bitfield'lar
- `SYSTEM_SUMMARY` 30055–30066: SOC/SOH/DC gerilim/akım/güç limitleri
- `SUMMARY_STATS` 30100–30157: MAX/AVG/MIN SOC, SOH, cell-sum, akım, sıcaklık + konumlar
- Rack blokları: nameplate tabanı `RACK_NAMEPLATE_BASE = 30170`, blok boyu `RACK_STRIDE = 150`;
  özet başlangıcı +50 → rack 1 özeti **30220**

**HOLDING REGISTERS (4x) — oku/yaz**
- `CONTROLLER.HEARTBEAT` 40000, `CONTROLLER.COMMAND_REQUEST` 40010
- `MANUAL_RACKS_*` 40011–40017, `DISABLED_RACKS_*` 40020–40026 + reserved 40027–40028
- `CHARGE_POWER_SETPOINT` 40030, `DISCHARGE_POWER_SETPOINT` 40031 (saklanır; güç
  modelini sürmez — charge/discharge komutu yoktur)

**DISCRETE INPUTS (1x)** — rack bayrakları: Disabled `n`, Online `N+n`, Alarm `2N+n`,
Warning `3N+n`, Fault `4N+n`, Non-Balancing `5N+n` (toplam `6N`).

**Enum'lar (aynı dosyada):** `BSC_STATE`, `COMMAND`, `ACKNOWLEDGE`, `BSC_INFO_BITS`,
`RACK_STATE`, `RACK_STATUS_BITS`.

---

## 6. Yardımcı dosyalar

- `bsc/bsc-math.ts` — SOC ↔ gerilim ↔ kapasite dönüşüm tablosu (21 nokta, doğrusal
  interpolasyon). Sabitler: `SYSTEM_CAPACITY_KWH = 3568`, `MAX_SOC_PERCENT = 97`,
  `MIN_SOC_PERCENT = 3.5`; fonksiyonlar `capacityToSocVoltage(capacityKwh)` ve
  `socToCapacity(socPercent)`.
- `bsc/bsc-config.ts` — Excel türevi JSON map'ini parse eder: `parseBSCMap(raw)` →
  `{ registers }`. Çok satırlı bitfield açıklamalarını birleştirir (`mergeRows`),
  `b0 ~ b1` kalıbını ayrıştırır (`parseBitFields`).

---

## 7. Bilinen davranış boşlukları

- **Disable/manual rack register'ları kablolu değil:** `DISABLED_RACKS_*` (40020–40026)
  ve `MANUAL_RACKS_*` (40011–40017) holding'e yazılır ama hiçbir kod yolu okumaz;
  `RackState.disabled` pratikte hep `false` kalır.
- **Kalibrasyon tetiklenemez:** `CALIBRATION_INFO` ve `RECALIBRATION_NO` her tick 0.
- **Sıcaklık/cell gerilimi sabit:** gerçek ölçüm yerine sabit değerler (3.5288 V,
  ~23 °C) yazılır; `inject` ile 80 °C / 15 °C fark override edilebilir.
- **Offline rack:** SOC/state sıfırlanır (bayat gösterim yok); sıcaklık/gerilim son
  bilinen değerde kalır — tam "idle register tablosu" değildir.
- **Charge/discharge komutu yoktur** (Rev AF, 0x000B kaldırıldı): güç PCS'ten gelir
  (konnektör ters kanalı); setpoint register'ları saklanır ama güç modelini sürmez
  (bkz. `docs/analysis/BSC-VERI-ANALIZI.md`).

---

## 8. Vendor davranışı ile karşılaştırma (Rev AF Sequence / Request Ack. Table + SW Manual RevAH)

| Konu | Vendor | Bu simülatör (kolaylık modeli) |
| :--- | :--- | :--- |
| Ack yaşam döngüsü | Kabul → 30030 = 0x0001 In Progress (+ 30031 = komut) → işlem bitince 0x0002 Done → **3 s sonra 0x0000 None** (30031 de 0); red → ilgili kod (0x05…0x13, 0x30) | Ack hemen DONE (In Progress yok); EMS 40010'a 0 yazınca None — 3 s zamanlayıcısı yok |
| Start | Not Initialized → **Initializing** (Done bu geçişle) → tüm RBMS hazır olunca Normal; kontaktörler AÇIK kalır, Close beklenir. 40020–40028 devre dışı raf bayrakları yalnız başlatmada okunur | tick 3/6'da otomatik Initializing/Normal; Start ile raflar hemen online |
| Stop | Akım akarken (> 0.5 A × online raf) **0x0A Current Flows**; kontaktör kontrolü sürerken 0x10; aksi halde tüm RBMS reset → Not Initialized. RevAH geçiş #2: Initializing'de Stop kabul edilir | durum değişmez, ACK = DONE |
| Close | Normal/Manual'de; bölüm warning/fault → 0x0F; online raf varsa 0x09; raflar **gerilim sapmasına göre seçilip sırayla** kapatılır (bazıları sapma/arıza nedeniyle kapanmayabilir); Manual'de seçili raflar ve sapma → 0x11 | tüm raflar anında online |
| Emergency | Tüm kontaktörler hemen açılır; yalnız **Stop/Reset** ile çıkılır; Start → 0x06 | durum EMERGENCY; çıkış Reset ile |
| Event Clear | 30 s soğuma (0x12); CER (PDVF/RDVF) yalnız LGES servis temizler | ACK = DONE |
| NPS | Idle + raf akımı ≤ 3 A + maks. SOC < NPS eşiği + dengeleme yok → süre sonunda NPS; akım ≥ 3 A veya röle komutu ile çıkış | yok |
| Heartbeat | 40000 her 1 s güncellenmeli; 10 s alarm, 20 s LOC fault (30043 b0/b2) → limitler 0, kontaktörler açılır | 5 tick sonra yalnız alarm biti |
| Ölçümler | hücre/paket/raf ölçümleri, teşhis eşikleri (OVW 3.7 V, OVF1 3.8 V, UVW 2.4 V, OTW 49 °C, OTF1 58 °C, OCCW 210 A …) ve aksiyonları | sabit 3.5288 V / ~23 °C; teşhis yok |

Bu farklar `demo-field` entegrasyon testlerinin "anında uygula" varsayımı nedeniyle bu
sınıfta bilinçli olarak korunmuştur (README §10, K-2). Vendor zaman modeliyle test için
Sim-Lab kullanılır.
