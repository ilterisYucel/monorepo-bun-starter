# XRack Simülatörü (16'lı Batarya Rack Grubu)

> Rol: Bir batarya **rack grubunun** (varsayılan 16 rack) enerji/SOC/gerilim davranışı.
> Kod: `xrack/simulator.ts#XRackSimulator`, register: `xrack/register-map.ts`,
> adapter: `xrack/modbus-interface.ts#XRackSimulatorAdapter`, dönüşüm: `xrack/math.ts`.

> ⚠️ **Fark:** XRack `SelfHostedSimulator` arayüzünü **uygulamaz** ve
> `host.ts#SimulatorHost` builder haritasında **kayıtlı değildir**. `start()`/`stop()`/`port()`
> metotları yoktur; yalnızca `tick(elapsedSeconds): TickData` vardır.
> `apps/demo-backend` içindeki `XRackManager` tarafından `setInterval` ile **elle sürülür**.

---

## 1. Başlangıç durumu

`xrack/simulator.ts#XRackSimulator` constructor `rackCount = 16`; `initRegisters()` +
`initRackStates()`:

- Her rack için (offset `i×2`): gerilim/akım/SOC = 0; `STATUS = 1` (aktif);
  rack gücü ham değeri 5000 (≈50 kW, ölçek 0.01).
- `CHARGE_STATUS = 0`; `GLOBAL_POWER_START` (40410/40411) = 0.
- Input: `TEMPERATURE_START` = 23.0 °C (×10 float32), `SOH_START` = 99.0 % (×10 float32).
- Coil'ler: `RESET = false`, `EMERGENCY_STOP = false`.
- Rack state: `storedCapacityKwh = socToCapacity(MIN_SOC = 3.5 %)`, `status = true`.

---

## 2. `tick(elapsedSeconds)` — adım adım

`xrack/simulator.ts#XRackSimulator.tick`:

1. **`processCoils()`** — coil reset/e-stop işlenir (aşağıda).
2. **Global güç okunur:** `GLOBAL_POWER_START` (40410) + 40411 float32 birleştirilir ve
   `/100` → kW (`getGlobalPowerKw`).
3. **Her rack için:**
   - `updateRackState` — rack aktif ve `globalChargeStatus ≠ 0` ise:
     - şarj (`status==1`) → güç pozitif, deşarj (`status==2`) → negatif
     - `deltaEnergy = güç × (elapsedSeconds/60)` (kW·s → kWh)
     - şarjda `MAX_USABLE_CAPACITY_KWH`/`SYSTEM_CAPACITY_KWH` ile üstten sınırlanır;
       deşarjda min SOC kapasitesine tabanlanır
     - max SOC'ye ulaşınca (şarj) veya min SOC'ye düşünce (deşarj): `globalChargeStatus = 0`,
       `CHARGE_STATUS = 0`, global güç = 0
   - `updateRegistersFromState` — gerilim/akım/SOC float32 yazılır; akım `(kW×1000)/V`
     (şarj poz., deşarj neg.); `STATUS` yazılır
   - `setPowerRegister` — rack güç register'ı global güçle güncellenir
4. **Anlık `TickData` snapshot'ı** (holding/input/coil kopyaları + timestamp) alınır,
   geçmişe eklenir (en fazla **5** kayıt).

---

## 3. Yazma davranışı

`xrack/simulator.ts#XRackSimulator.writeHoldingRegister`:

| Adres | Sembol | Yazılan | Tepki |
| :--- | :--- | :--- | :--- |
| 40401 | `CHARGE_STATUS` | 0/1/2 | `globalChargeStatus` olur (0 boşta / 1 şarj / 2 deşarj). **0 yazılırsa global güç de 0'lanır.** |
| 40410 / 40411 | `GLOBAL_POWER_START` | float32 | Güç setpoint'i (kW, ölçek 0.01); iki register birlikte okunur |
| `POWER_START` (40501+) | — | — | Doğrudan yazılırsa kaydedilir, ama tick sonraki adımda global güçle **ezer** |

`xrack/simulator.ts#XRackSimulator.writeCoil` + `processCoils`:

| Adres | Sembol | Yazılan | Tepki |
| :--- | :--- | :--- | :--- |
| 1 | `COILS.RESET` | `true` | `resetSimulator()` (register + rack durumları + charge status sıfırlanır); sonra coil `false`'a çekilir |
| 2 | `COILS.EMERGENCY_STOP` | `true` | `emergencyStop()` (charge status 0, `CHARGE_STATUS` 0, global güç 0); sonra coil `false`'a çekilir |

- `readDiscreteInput` → her zaman `false`.

---

## 4. Register grupları

`xrack/register-map.ts`:

**HOLDING (4x):**
- `VOLTAGE_START` 40001 (40001–40032, rack başına float32, ×2) — gerilim, ölçek 0.1
- `CURRENT_START` 40101 (40101–40132) — akım, ölçek 0.01
- `SOC_START` 40201 (40201–40232) — SOC, ölçek 0.1
- `STATUS_START` 40301 (40301–40316) — durum, U16
- `CHARGE_STATUS` 40401 — şarj durumu (0/1/2)
- `GLOBAL_POWER_START` 40410 (40410–40411) — global güç setpoint, float32, ölçek 0.01
- `POWER_START` 40501 (40501–40532) — rack gücü, float32, ölçek 0.01

**INPUT (3x):**
- `TEMPERATURE_START` 30001 (30001–30032) — sıcaklık, float32, ölçek 0.1
- `SOH_START` 30051 (30051–30082) — SOH, float32, ölçek 0.1

**COILS (0x):** `RESET = 1`, `EMERGENCY_STOP = 2`

---

## 5. Yardımcı dosyalar ve sorgular

- `xrack/math.ts` — SOC ↔ kapasite ↔ gerilim dönüşümü (21 nokta). Sabitler:
  `SYSTEM_CAPACITY_KWH = 3568`, `MAX_SOC_PERCENT = 97`, `MIN_SOC_PERCENT = 3.5`,
  `MAX_USABLE_CAPACITY_KWH`; fonksiyonlar `capacityToSocVoltage`, `socToCapacity`.
- `xrack/modbus-interface.ts#XRackSimulatorAdapter` — `IModbusSimulatorAdapter`'ı
  simülatörün `read*`/`write*` metotlarına delege eder (`readDiscreteInput` hep `false`).
- Sorgular: `getLastTick()`, `getTickHistory()`, `debugRack(rackId)`.

---

## 6. Notlar

- XRack yalnızca demo-backend tarafından sürüldüğü için `device-service` self-host
  akışında yer almaz.
- `readDiscreteInput` her zaman `false` döner.
