# BSC Simülatörü (Battery System Controller)

> Cihaz: LG Energy Solution **BSC** — rak tabanlı batarya sistem kontrolcüsü.
> Kaynak harita: `MAP_PLANNING_MC_090626_V1.xlsx` → JSON.
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
| `initialSocPercent` | Başlangıç SOC (%) | **50** |
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

### 3.1 `updateRackStates` — güç modeli

`bsc/bsc-simulator.ts#BSCSimulator.updateRackStates`:

- Holding'ten okunur: `COMMAND_REQUEST` (40010), `CHARGE_POWER_SETPOINT` (40030),
  `DISCHARGE_POWER_SETPOINT` (40031).
- Rack gücü (`powerKw`):
  - `cmd === START (0x02)` → `chargeSetpoint × 0.01` (pozitif = şarj)
  - `cmd === DISCHARGE (0x0B)` → `-(dischargeSetpoint × 0.01)` (negatif = deşarj)
  - aksi → 0
- **Yalnızca `status === true` (online) rack'ler** için:
  `deltaEnergy = powerKw × (elapsedSeconds / 60)` → `storedCapacityKwh += deltaEnergy`.
- **Clamp:** enerji entegrasyonu %3,5 (MIN_SOC) ile %97 (MAX_SOC) arasında tutulur
  (`socToCapacity(MIN_SOC)` ≤ capacity ≤ `socToCapacity(MAX_SOC)`).
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
| 30063–64 | `CHARGE_POWER_LIMIT` | Şarjda `chargeSp×10`; deşarjda 0; komut yokken nominal **500 kW** |
| 30065–66 | `DISCHARGE_POWER_LIMIT` | Deşarjda `dischargeSp×10`; şarjda 0; komut yokken nominal 500 kW |
| 30100–30157 | `SUMMARY_STATS.*` | MAX/AVG/MIN SOC, SOH, cell-sum gerilimi, akım, sıcaklık, konumlar |

- **`BSC_INFO` (30037) bitleri** (`register-map.ts#BSC_INFO_BITS`):
  - b4:b5 `CHARGE_STATUS`: START → `0b01` (şarj), DISCHARGE → `0b10` (deşarj), aksi `0b11` (idle)
  - b10 `PRE_VPC` (avgSoc > %95), b11 `VPC` (> %90), b12 `SPC` (> %85)
- **Not:** ortalama gerilim, online rack'lerin gerilimlerinin ortalamasıdır;
  online rack yoksa fallback 1300 V kullanılır.

### 3.3 `updatePerRackRegisters` — rack başına

`bsc/bsc-simulator.ts#BSCSimulator.updatePerRackRegisters`. Rack `n` için:

- Nameplate tabanı = `RACK_NAMEPLATE_BASE (30170) + (n-1) × RACK_STRIDE (200)`
- Summary tabanı = nameplate + `RACK_SUMMARY_BASE_OFFSET (50)` → rack 1 için **30220**

Yazılanlar (online rack): `HEARTBEAT`, `STATE = NORMAL (0x09)`, `STATUS_FLAGS`
(b8 Battery Ready, b7 DC Line Closed, b3/b4 şarj/deşarj), `COMPONENT_STATUS`
(MC+/MC-/CB kapalı, fan), `COMPONENT_FEEDBACK`, `LIVE_UNIT_COUNT = 200`,
`SOC` (×100), `SOH` (99×100), güç limitleri, `CELL_SUM_VOLTAGE` (V×10000),
`CURRENT` (sint32), hücre gerilimleri, `MAX/MIN/AVG_PACK_TEMPERATURE`,
`CALIBRATION_INFO = 0`, diyagnostikler = 0.
Offline rack'ler idle değerlerde bırakılır.

### 3.4 `updateRackFlags` — discrete input bayrakları

`bsc/bsc-simulator.ts#BSCSimulator.updateRackFlags`. `N = rackCount`, `i = 1..N` için:
`i` = Disabled, `N+i` = Online (`state.status`), `2N+i` = Alarm, `3N+i` = Warning,
`4N+i` = Fault, `5N+i` = Non-Balancing. Alarm/Warning/Fault **hep `false`** (sağlıklı).

---

## 4. Yazma davranışı — hangi register'a yazınca ne olur?

`bsc/bsc-simulator.ts#BSCSimulator.writeHoldingRegister`: değer her zaman holding
tablosuna yazılır; ayrıca:

| Adres | Sembol | Etki |
| :--- | :--- | :--- |
| **40000** | `CONTROLLER.HEARTBEAT` | `lastControllerHeartbeat = tickCount` → LOC alarmı sıfırlanır |
| **40010** | `CONTROLLER.COMMAND_REQUEST` | `handleCommand(value)` **anında** çalışır |
| **40030** | `CHARGE_POWER_SETPOINT` | Saklanır; **sonraki tick'te** güç modeline girer (scale 0.01 kW) |
| **40031** | `DISCHARGE_POWER_SETPOINT` | Saklanır; sonraki tick'te güç modeline girer |

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
| `DISCHARGE` | 0x000B | Durum `NORMAL`; rack'ler online (resmi haritada **kaldırılmış**, geçici — `register-map.ts#COMMAND` ELEGANT-EXCEPTION) |
| Bilinmeyen | — | ACK = `INVALID_REQUEST` (0x0030) |

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
- Rack blokları: nameplate tabanı `RACK_NAMEPLATE_BASE = 30170`, blok boyu `RACK_STRIDE = 200`;
  özet başlangıcı +50 → rack 1 özeti **30220**

**HOLDING REGISTERS (4x) — oku/yaz**
- `CONTROLLER.HEARTBEAT` 40000, `CONTROLLER.COMMAND_REQUEST` 40010
- `MANUAL_RACKS_*` 40011–40017, `DISABLED_RACKS_*` 40020–40026 + reserved 40027–40028
- `CHARGE_POWER_SETPOINT` 40030, `DISCHARGE_POWER_SETPOINT` 40031 (geçici, ELEGANT-EXCEPTION)

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
  ~23 °C) yazılır.
- **DISCHARGE komutu** resmi Rev AF haritasında yoktur; güç normalde PCS tarafından
  kontrol edilir (bkz. `docs/analysis/BSC-VERI-ANALIZI.md`).
