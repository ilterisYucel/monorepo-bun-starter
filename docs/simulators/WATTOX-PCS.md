# Wattox PCS Simülatörü (MPCS Serisi)

> Cihaz: Wattox **MPCS** serisi güç dönüştürücü (PCS) — batarya ↔ şebeke çift yönlü
> AC/DC dönüşüm. Nominal 1725 kW.
> Kod: `wattox-pcs/simulator.ts#WattoxPcsSimulator`, register: `wattox-pcs/register-map.ts`,
> EMS yüzü: `wattox-pcs/modbus-adapter.ts#WattoxPcsAdapter`,
> BMS yüzü: `wattox-pcs/bms-face-adapter.ts#WattoxBmsFaceAdapter`.
> Kaynak: `PCS-WATTOX-MIMARISI.md` + Wattox Modbus V1.0.

PCS'nin iki ayrı Modbus kölesi vardır (gerçek donanımın EMS/BMS link ayrımı):
- **EMS yüzü** — PCS'nin kendi parametreleri + BMS bloğu (**salt okunur**).
- **BMS yüzü** — yalnızca BMS bloğu (0x0300–0x0316), **okunur ve yazılır**; blok
  dışı erişim `0x02` ile reddedilir.

---

## 1. Konfigürasyon ve başlangıç durumu

`wattox-pcs/simulator.ts#WattoxPcsSimulatorConfig`: `ratedPowerKw` (1725),
`ratedVoltageV` (1500), `ratedCurrentA` (1900), `bmsPort` (verilirse BMS yüzü açılır),
`network` (verilirse EMS self-host açılır), `commandSource` (PCS12: 0 HMI / 1 EMS),
`gridLink` + `gridFeeder` (opsiyonel şebeke yolu bağı — aşağıda).

Demo config (`transport` + `details`):

```json
{ "transport": { "kind": "simulator", "type": "wattox-pcs", "bmsPort": 15502 },
  "details": { "gridLink": { "deviceId": "DEMO-MV-1", "feeder": "H04" } } }
```

`bmsPort` PCS BMS yüzünün dinlediği porttur (demo: PCS-1 15502 … PCS-4 15505);
`details.gridLink` host tarafından `ctx.gridLink`/`ctx.gridFeeder`'a çözülür.

- Constructor: `initBms()` (BMS bloğu doldurulur) + `initSettings()` (fabrika ayarları).
- BMS başlangıç örnekleri: `BMS_TOTAL_VOLTAGE` 1500.0 V, `BMS_SOC` %50.0, `BMS_SOH` %98.0,
  `BMS_MAX_CHARGE_POWER` 1725.0 kW, `BMS_RATED_ENERGY` 5.018 MWh.
- İşletme durumu başlangıcı: `OP_STOP (0)`.

---

## 2. `start()` / `stop()` / `port()`

- `start()` — `network` tanımlıysa **EMS** self-host sunucusunu (`WattoxPcsAdapter` + tick)
  açar; idempotent. **BMS yüzü burada açılmaz** — tembel olarak ilk `tick()` içinde
  `ensureBmsServer()` ile başlatılır.
- `stop()` — EMS + BMS sunucularını kapatır; idempotent.
- `port()` — EMS self-host sunucusunun portu.

---

## 3. `tick(elapsedSeconds)` — adım adım

`wattox-pcs/simulator.ts#WattoxPcsSimulator.tick`:

1. `ensureBmsServer()` — `bmsPort` config'liyse BMS yüzü köprüsünü **tembel** başlatır
   (idempotent).
2. **Şebeke yolu kontrolü** (`syncGridState`) — `gridLink` tanımlıysa `isEnergized(feeder)`
   sorgulanır (H01 ∧ fider ∧ H02). Zincir kopuksa PCS **de-enerjili** davranır:
   `OP_STANDBY`, aktif/DC güç 0, DC akım 0, PF 0. Yeniden enerjide güç **otomatik
   uygulanmaz** (bkz. [GRID-LINK.md](GRID-LINK.md)).
3. **Güç/setpoint anlık yazımda eşitlendiği için** tick yalnızca **enerji sayaçlarını** işler:
   - `OP_CHARGING` → `chargeEnergyKwh += |setpointRaw| × (elapsedSeconds/3600)`
   - `OP_DISCHARGING` → `dischargeEnergyKwh += |setpointRaw| × (elapsedSeconds/3600)`

> **Önemli sözleşme:** EMS komutları (`writeSetting`) **anında** uygulanır; setpoint
> yazıldığı an grid aktif güç = DC güç = setpoint olur (read-back tick beklemez).

---

## 4. Durum makinesi

`OP_STOP (0) → start → OP_STANDBY (1) → setpoint → OP_CHARGING (2) / OP_DISCHARGING (3)`;
`stop → OP_STOP`; `standby → OP_STANDBY`; **fault word ≠ 0 → OP_FAULT (6)**;
`fault reset → OP_STANDBY`. Kodlar: `register-map.ts#OP_STOP` … `#OP_FAULT`.

---

## 5. Yazma davranışı — EMS yüzü (`writeSetting`)

`wattox-pcs/simulator.ts#WattoxPcsSimulator.writeSetting`:

| Register | Adres | Yazılan | Tepki |
| :--- | :--- | :--- | :--- |
| `SET_ACTIVE_POWER` | 0x0e19 (3609) | S16 kW | setpoint = yazılan; grid aktif güç = DC güç = DC akım = setpoint; PF = ±0.990. STANDBY/CHARGE/DISCHARGE iken: **neg → şarj, poz → deşarj, 0 → standby** |
| `SET_START` | 0x0e14 (3604) | 1 | `OP_STOP` ise → `OP_STANDBY` |
| `SET_STOP` | 0x0e15 (3605) | 1 | `OP_STOP`; setpoint/güç/akım/PF sıfırlanır |
| `SET_STANDBY` | 0x0e17 (3607) | 1 | `OP_FAULT` değilse → `OP_STANDBY` + tüm ölçümler sıfır |
| `SET_FAULT_RESET` | 0x0e16 (3606) | 1 | fault + alarm word'leri sıfırlanır; `OP_FAULT` ise → `OP_STANDBY` |
| BMS bloğu (0x0300–0x0316) | — | herhangi | **Yok sayılır (RO)** — EMS yüzü BMS'i yazamaz |
| Diğer adresler | — | herhangi | `settings` map'ine kaydedilir (`readSetting` ile okunur) |

### BMS yüzü (`setBmsRegister` / `WattoxBmsFaceAdapter`)

- `wattox-pcs/simulator.ts#WattoxPcsSimulator.setBmsRegister` — **yalnızca BMS bloğu
  aralığında** yazar; blok dışı adres **hata fırlatır**.
- `bms-face-adapter.ts#WattoxBmsFaceAdapter` holding okuma/yazmayı doğrudan BMS bloğuna
  eşler; `OUTSIDE_BMS_RANGES` (0x0000–0x02FF, 0x0317–0xFFFF) `readProtected`/`writeProtected`
  ile Modbus `0x02` reddedilir (`bms-face-adapter.ts#createWattoxBmsBridge`).

---

## 6. Senaryo API'leri (test/yan etki)

| Metot | Etki |
| :--- | :--- |
| `setFaultWord(index 1-10, bits)` | Fault word yaz; `bits ≠ 0` ise durum `OP_FAULT` |
| `setAlarmWord(index 1-8, bits)` | Alarm word yaz (durum değiştirmez) |
| `setEstop({local, remote, bms})` | E-stop bitleri (bit0 local, bit1 remote, bit2 BMS) |
| `setDoorOpen(open)` | DI status 1 bit0 (kapı) |
| `setBmsRegister(address, value)` | Yalnız BMS bloğu aralığında; dışı hata fırlatır |

---

## 7. Okuma davranışı

**Input register** (`wattox-pcs/simulator.ts#WattoxPcsSimulator.readRegister`): büyük `switch`.
- BMS bloğu → BMS dizisi; fault/alarm word aralıkları → ilgili diziler.
- Sabit ölçümler: batarya 1500.0 V, grid 50.00 Hz, grid/inverter 400.0 V, IGBT 45.0 °C,
  reaktör 50.0 °C, filtre kondansatörü 40.0 °C, ortam 25.0 °C / %45 RH, izolasyon 1000 kΩ.
- Durum türevleri: `REG_OP_STATUS_BITS = 1 << opStatus`; `REG_FAULT_STATUS`/`REG_ALARM_STATUS`
  = word'lerden herhangi biri dolu mu; açma röleleri `OP_STOP` iken 1.
- Enerji sayaçları: akümülatif şarj/deşarj LOW/HIGH (32-bit) + günlük.

**Holding register** (`readSetting`): `settings` map'inden okunur.

> **Basitleştirme:** faz akımları aktif gücün mutlak değeri olarak döner; reaktif güç ve
> derated her zaman 0'dır.

---

## 8. Register grupları (özet)

`wattox-pcs/register-map.ts`:
- **A — PCS ölçüm/parametre (input):** nominal 0x2f08–0x2f0a; limitler 0x0123–0x0128;
  durum 0x2f7d/0x2f5a/0x2f43/0x2f45; DC ölçüm 0x2f48/0x2f49/0x2f4d; AC ölçüm 0x2f4e/0x2f53/0x2f7e/0x2f7f;
  sıcaklık/nem 0x2f54–0x2f58, 0x2027–0x202f; enerji 0x2f64–0x2f69
- **B — BMS bloğu (0x0300, 23 kayıt):** `BMS_RUNNING_STATUS` 0x0300 … `BMS_DC_SYSTEM_STATUS` 0x0316
- **D — arıza/alarm:** `FAULT_WORD_1` 0x2FB5 (10 word), `ALARM_WORD_1` 0x2FBF (8 word)
- **S — ayarlar (holding):** komut/mod 0x0e00–0x0e06; setpoint 0x0e19–0x0e23; komutlar
  0x0e14–0x0e17; grid-forming/virtual inertia 0x1200–0x120e
- **Durum kodları:** `OP_STOP/STANDBY/CHARGING/DISCHARGING/ZERO_POWER/OFFGRID/FAULT`

---

## 8.1 Vendor protokolü ile karşılaştırma (Modbus V1.0 + Kontrol Felsefesi)

> Ayrıntılı denetim: [VENDOR-UYUM-DENETIMI.md](VENDOR-UYUM-DENETIMI.md) §2.2. Vendor'a birebir davranan
> fiziksel model: `physical/models/pcs-wattox.ts` + `physical/faces/wattox-face.ts`
> ([FIZIKSEL-SAHA-SIMULATORU.md](FIZIKSEL-SAHA-SIMULATORU.md)).

| Konu | Vendor | Bu simülatör |
| :--- | :--- | :--- |
| Fonksiyon kodları | Yalnız **FC03** (okuma) ve **FC06** (tek register yazma); exception 0x01–0x04 | Adaptör FC04 okumalarını da yanıtlar, FC16 kabul eder (kolaylık) |
| Bloklar | A (0x2F00–0x30C0 iç parametreler), B (0x0300–0x0316 BMS), C (0x0A00–0x0B26 haberleşme, RO), D (0x2FB5–0x2FC6 fault/alarm word), S (0x0E00–0x120E ayar/komut, R/W) | C bloğu yanıtlanmaz (`settings` map'inde yoksa 0) |
| Durum makinesi | Başlatma → self-check → **durdurma (key shutdown)** → (Start) **soft start** (DC/AC röle gerilim farkı + yapışma kontrolü, ön şarj) → çalışma; Standby = kesiciler kapalı, IGBT darbesiz; **Fault Reset → Stop**; fault giderilince gecikmeyle otomatik toparlanma (manuel kurtarma etkinse yalnız reset) | Start → anında Standby; **Fault Reset → Standby** (vendor'da Stop); soft start / self-check yok; otomatik toparlanma yok |
| Fault davranışı | Dalga çıkışı durur, **AC ve DC kesiciler açılır** (A53/A55 = 1) | Durum 6 olur; kesici (açma rölesi) bitleri yalnız Stop durumunda açık görünür |
| Güç | Negatif setpoint şarj, pozitif deşarj; S11 güç değişim hızı (varsayılan 10000 = %100 Pn/s); 45 °C üstü / 2000 m üstü derating | Setpoint anında güç; rampa ve derating yok |
| Fault/alarm bitleri | Appendix 2 (fault word 1–9) / Appendix 3 (alarm word 1–8) — config bitfield'larında tam liste | `setFaultWord` / `setAlarmWord` ham word |
| Kümülatif enerji | A81–A84 düşük/yüksek kelime çiftleri (config: UINT32 `BIG_ENDIAN_SWAP`) | `LOW/HIGH` ayrı register |

## 9. Testler

`wattox-pcs/wattox-pcs.test.ts` (EMS komut/durum), `wattox-pcs/bms-face.test.ts`
(BMS yüzü koruma aralıkları).
