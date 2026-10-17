# DC-Output Simülatörü (DC Güç Kaynağı / Çıkış)

> Rol: Programlanabilir **DC güç kaynağı** — gerilim setpoint, akım limiti,
> aşırı gerilim/akım koruması ve enerji sayacı.
> Kod: `dc-output/simulator.ts#DcOutputSimulator`, register: `dc-output/register-map.ts`.

---

## 1. Başlangıç durumu

`dc-output/simulator.ts#defaultState` (ham ölçek 0.1):

| Alan | Değer | Gerçek |
| :--- | :--- | :--- |
| `outputOn` | true | Çıkış açık |
| `voltageSetpoint` | 480 | 48.0 V |
| `actualVoltage` | 480 | 48.0 V |
| `currentLimit` | 1000 | 100.0 A |
| `actualCurrent` | 500 | 50.0 A |
| `temperature` | 400 | 40.0 °C |
| `ovThreshold` | 550 | 55.0 V |
| `ocThreshold` | 1100 | 110.0 A |
| `energyCounterKwh` | 0 | — |
| `fault` | false | — |

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni; `tick: (s) => this.tick(s)` bağlanır.

---

## 3. `tick(elapsedSeconds)` — adım adım

`dc-output/simulator.ts#DcOutputSimulator.tick`:

1. **Bekleyen kontak komutları:**
   - `pendingOn` → temizlenir; arıza yoksa `outputOn = true`.
   - `pendingOff` → temizlenir; `outputOn = false`.
2. **Çıkış açık ve arızasızsa:**
   - `actualVoltage` → `voltageSetpoint`'e **%30/sn** hızla yakınsar.
   - `actualCurrent` → ~500 gürültülü taban (500 ± 20) değerine **%20/sn** yakınsar.
   - **Koruma:** `actualVoltage > ovThreshold × 10` → `fault = true`, `outputOn = false`;
     `actualCurrent > ocThreshold` → `fault = true`, `outputOn = false`.
3. **Çıkış kapalı/arızalıysa:** `actualVoltage` ve `actualCurrent` 0'a söner
   (sırasıyla %15 ve %30/sn).
4. **Sıcaklık:** hedef 45.0 °C (açık) / 25.0 °C (kapalı), **%2/sn** yakınsama.
5. **Enerji sayacı:** açık ve arızasızken `powerKw = (actualVoltage × actualCurrent) / 100000`;
   `energyCounterKwh += powerKw × (elapsedSeconds / 3600)`.

> **Ölçek notu:** `ovThreshold` karşılaştırması `× 10` ile yapılır (ham birim). Testte
> `ovThreshold = 10` yazılarak 100 ham birimlik sınır tetiklenir.

---

## 4. Yazma davranışı

### COIL — darbe → tick'te uygula

`dc-output/simulator.ts#DcOutputSimulator.writeCoil` (yalnızca `true` işlenir):

| Adres | Sembol | Yazılan | Tepki |
| :--- | :--- | :--- | :--- |
| 0 | `COILS.ON` | `true` | `pendingOn = true` → sonraki tick'te (arıza yoksa) çıkış açılır |
| 1 | `COILS.OFF` | `true` | `pendingOff = true` → sonraki tick'te çıkış kapanır |

- `readCoil(ON/OFF)` → **bekleyen bayrağı** döner (fiziksel durumu değil).
- Gerçek çıkış durumu `readDiscreteInput(IS_ON)` ile okunur.

### HOLDING — anlık setpoint

`dc-output/simulator.ts#DcOutputSimulator.writeHoldingRegister`:

| Adres | Sembol | Etki |
| :--- | :--- | :--- |
| 0 | `HOLDING.VOLTAGE_SETPOINT` | `voltageSetpoint` anında güncellenir; tick'te gerilim bu değere yakınsar |
| 1 | `HOLDING.CURRENT_LIMIT` | `currentLimit` güncellenir; **okunur ama akımı sınırlamaz** (saklanır) |
| 2 | `HOLDING.OV_THRESHOLD` | Aşırı gerilim eşiği |
| 3 | `HOLDING.OC_THRESHOLD` | Aşırı akım eşiği |

### DISCRETE (salt okuma)

| Adres | Sembol | Dönen |
| :--- | :--- | :--- |
| 0 | `DISCRETE.IS_ON` | Gerçek çıkış durumu (`outputOn`) |
| 1 | `DISCRETE.FAULT` | Arıza (`fault`) |

---

## 5. Okuma — INPUT REGISTER

`dc-output/simulator.ts#DcOutputSimulator.readInputRegister`:

| Adres | Sembol | Ölçek | Birim |
| :--- | :--- | :--- | :--- |
| 0 | `ACTUAL_VOLTAGE` | 0.1 | V |
| 1 | `ACTUAL_CURRENT` | 0.1 | A |
| 2 | `ACTUAL_POWER` | 1 | W → `(V×I)/100` |
| 3 | `TEMP` | 0.1 | °C |
| 4 | `ENERGY_COUNTER_H` | 0.01 | kWh (uint32 yüksek kelime) |
| 5 | `ENERGY_COUNTER_L` | 0.01 | kWh (uint32 düşük kelime) |

---

## 6. Register grupları

`dc-output/register-map.ts`:
- **COILS:** `ON: 0`, `OFF: 1`
- **DISCRETE INPUTS:** `IS_ON: 0`, `FAULT: 1`
- **INPUT REGISTERS:** `ACTUAL_VOLTAGE: 0`, `ACTUAL_CURRENT: 1`, `ACTUAL_POWER: 2`,
  `TEMP: 3`, `ENERGY_COUNTER_H: 4`, `ENERGY_COUNTER_L: 5`
- **HOLDING REGISTERS:** `VOLTAGE_SETPOINT: 0`, `CURRENT_LIMIT: 1`, `OV_THRESHOLD: 2`,
  `OC_THRESHOLD: 3`

---

## 7. Notlar

- Test: `dc-output/dc-output.test.ts`.
- On/off komutları ile gerçek durum ayrı yerlerden okunur: **komut = coil**,
  **durum = discrete input**.
