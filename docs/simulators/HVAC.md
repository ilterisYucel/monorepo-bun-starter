# HVAC Simülatörü (Sunucu Odası Kliması)

> Cihaz: **MC90HDNC1R-L** soğutma ünitesi (sunucu/oda kliması).
> Kod: `hvac/hvac-simulator.ts#HvacSimulator`, register: `hvac/register-map.ts`.
> Vendor kaynağı: *MC Series Modbus Protocol A3* (2024-10-16) — `vendor-documentation/HVAC/`.
> Fiziksel model (Sim-Lab): `physical/models/hvac-mc90.ts` — bkz. [FIZIKSEL-SAHA-SIMULATORU.md](FIZIKSEL-SAHA-SIMULATORU.md).
>
> **Protokol özeti (A3):** yalnız **FC03** (okuma), **FC06** ve **FC10** (yazma). Tüm
> ölçüm, ayar ve alarm adresleri holding tablosundadır (config de HOLDING_REGISTER okur).
> Sıcaklık/nem/gerilim ×10 tamsayıdır. Kullanılmayan / desteklenmeyen adres **0xFFFF**
> döner (EMS bunu sentinel sayıp telemetri üretmez). 32-bit sayaçlarda yüksek kelime önce.

Bu simülatör, bir oda/sunucu iklimlendirme ünitesinin **soğutma/ısıtma** davranışını,
fan/kompresör durumlarını, sıcaklık rampasını ve sıcaklık/gerilim alarmlarını taklit eder.

---

## 1. Başlangıç durumu

`hvac/hvac-simulator.ts#defaultState` (ham ölçek 0.1):

| Alan | Ham | Gerçek |
| :--- | :--- | :--- |
| `remoteOn` | false | Uzaktan kapalı |
| `equipmentStatus` | 1 | Standby |
| `coolingSetpoint` | 230 | 23.0 °C |
| `heatingSetpoint` | 150 | 15.0 °C |
| `highTempAlarm` | 400 | 40.0 °C |
| `lowTempAlarm` | 0 | 0.0 °C |
| `currentTemp` | 250 | 25.0 °C (oda) |
| `outsideTemp` | 300 | 30.0 °C |
| `condenserTemp` | 350 | 35.0 °C |
| `evaporatorTemp` | 150 | 15.0 °C |
| `supplyTemp` | 200 | 20.0 °C (üfleme) |
| `returnHumidity` | 500 | %50 |
| `acInputVoltage` | 2300 | 230.0 V |
| Çalışma saatleri | — | ekipman 1000 h, kompresör 500 h, fan 800 h |

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni; `tick: (s) => this.tick(s)` bağlanır.

---

## 3. `tick(elapsedSeconds)` — adım adım

`hvac/hvac-simulator.ts#HvacSimulator.tick`:

**Çalışma koşulu:** `remoteOn === true` ve `equipmentStatus !== 3` (Fault):

1. `equipmentStatus = 2` (Running); iç/dış fan ve kompresör `2`.
2. **Ölü bant (deadband, ham 0.1 °C):**
   - Soğutma: `currentTemp > coolingSetpoint + 10` (setpoint'in **1.0 °C** üzeri)
   - Isıtma: `currentTemp < heatingSetpoint − 10` (setpoint'in **1.0 °C** altı)
   - Bu deadband register'dan okunmaz; **kodda sabittir** (±10 ham = ±1.0 °C).
3. **Sıcaklık rampası:** `speed = 0.5 × elapsedSeconds` ham → **0.05 °C/s**.
   - **Soğutma:** `currentTemp -= speed`; `supplyTemp = currentTemp − 50`; iç fan 1500 rpm,
     dış fan 1200 rpm; kompresör 2; elektrikli ısıtıcı 0.
   - **Isıtma:** `currentTemp += speed`; `supplyTemp = currentTemp + 50`; iç fan 800 rpm,
     dış fan 0; kompresör 1; elektrikli ısıtıcı 1.
   - **Ölü bant:** iç fan 300 rpm, dış fan 0, kompresör 1, ısıtıcı 0; `supplyTemp` güncellenmez.
4. **Kondenser (1. mertebe gecikme):** `condenserTemp += (outsideTemp − condenserTemp) × 0.1 × elapsedSeconds`
   (τ ≈ 10 s; dış hava sıcaklığına yakınsar).
5. **Evaporatör:** `evaporatorTemp += (currentTemp − evaporatorTemp) × 0.1 × elapsedSeconds`.
6. **Çalışma saati:** ekipman ve iç fan her tick `elapsedSeconds/3600` saat artar;
   kompresör yalnız `compressorStatus === 2` iken artar.
7. **Kapalı/fault dalı:** `equipmentStatus = 1`, fan/kompresör `1`, ısıtıcı 0, fan hızları 0;
   `supplyTemp` oda sıcaklığına yavaş döner (τ ≈ 20 s). **Oda sıcaklığı bu dalda değişmez.**
8. **Alarmlar (input):**
   - `0x300 HIGH_TEMP`: `currentTemp > highTempAlarm`
   - `0x306 LOW_TEMP`: `currentTemp < lowTempAlarm`
   - `0x309 OVER_VOLTAGE`: `acInputVoltage > 2530` (253.0 V)
   - `0x30A UNDER_VOLTAGE`: `acInputVoltage < 1800` (180.0 V)
   - Diğer alarm adresleri her tick 0 (sağlıklı).

---

## 4. Yazma davranışı (HOLDING)

`hvac/hvac-simulator.ts#HvacSimulator.writeHoldingRegister`:

| Adres | Ad | Etki |
| :--- | :--- | :--- |
| `0x202` | `REMOTE_ON_OFF` | Değer **tam 1** ise `remoteOn = true`; diğer tüm değerlerde `false`. Ana on/off komutu. |
| `0x0A` | `COOLING_SETPOINT` | `coolingSetpoint` güncellenir (ham 0.1 °C) — sonraki tick kararını etkiler |
| `0x1C` | `HEATING_SETPOINT` | `heatingSetpoint` güncellenir (ham 0.1 °C) |
| `0x0E` | `HIGH_TEMP_ALARM` | `0x300` alarm eşiği değişir |
| `0x10` | `LOW_TEMP_ALARM` | `0x306` alarm eşiği değişir |
| `0x200` | `RESET` | **Yalnız `0x0001`** ise tüm state fabrika ayarına döner (`Object.assign(state, defaultState())`) — `remoteOn` dahil kapanır |
| `0x2000/0x2001/0x2002` | `SERVER_TEMP_MAX/MIN/AVG` | Saklanır (davranışsal etkisi yok) |
| Diğer | — | Sessiz no-op |

- Coil ve discrete **yoktur**: `readCoil` / `readDiscreteInput` → `false`; `writeCoil` → no-op.

---

## 5. Register grupları

`hvac/register-map.ts`:

**Ayar parametreleri (A3 §7.2, holding, oku/yaz):** 0x07 haberleşme adresi, 0x08 baud,
0x09 **sıcaklık kontrol modu** (0 dönüş havası ort., 1 üfleme ort., 2 dönüş sıcak nokta,
3 üfleme sıcak nokta, **4 izleme/sunucu sıcaklığı** — batarya sıcaklığına göre kontrol için 4),
0x0A soğutma setpoint (7.0–50.0 °C, ısıtma setpoint'inden büyük olmalı),
0x0B **nem kontrol modu** (0–4), 0x0C **soğutma hassasiyeti** (0.1–1.5 °C ×10),
0x0D **nem alma setpoint'i** (%), 0x0E yüksek sıcaklık alarm noktası, 0x0F **nem alma hassasiyeti** (%),
0x10 düşük sıcaklık alarm noktası, 0x11 **dönüş havası yüksek nem noktası** (%),
0x1C ısıtma setpoint (−40.0–35.0 °C), 0x1E **ısıtma hassasiyeti**, 0x21 parametre sıfırlama seçeneği,
0x23 stop bit.

> ⚠️ Simülatör kodundaki `register-map.ts` isimleri (`COOLING_HYSTERESIS` 0x0B, `COMPRESSOR_START_DELAY` 0x0C,
> `RESTART_DELAY` 0x0D, `HIGH/LOW_TEMP_HYSTERESIS` 0x0F/0x11) A3 ile **uyuşmaz**; config'ler (kök + deployment)
> vendor adlarını kullanır. Bu simülatör o adreslere yalnız değer saklar, anlam yüklemez.

**Kontrol parametreleri (A3 §7.3):** 0x200 = 1 fabrika ayarına dönüş (alarm reset DEĞİL),
0x202 = 1 aç / **2 kapat** (diğer değerler geçersiz), 0x2000/0x2001/0x2002 sunucu
maks./min./ort. sıcaklığı (EMS yazar; sensör arızasında 32767), 0x2003 sunucu nemi,
0x2100 zorunlu mod etkinleştirme. **0x2101–0x2104 (zorunlu soğutma/üfleme/standby/ısıtma)
MC90HDNC1R-L için "not involving"** — yazım kabul edilir ama etkisizdir (bkz.
[VENDOR-UYUM-DENETIMI.md](VENDOR-UYUM-DENETIMI.md) H-4: kural motorundaki `force_cool`).

**Ölçümler (A3 §7.1, holding — FC03):** `EQUIPMENT_STATUS` 0x1000, `ELECTRIC_HEATING_ON` 0x1001,
`INDOOR_FAN_STATUS` 0x1002, `SUPPLY_TEMP` 0x1003, `OUTDOOR_FAN_STATUS` 0x1004,
`RETURN_HUMIDITY` 0x1005, `COMPRESSOR_STATUS` 0x1006, `CURRENT_TEMP` 0x1008, `OUTSIDE_TEMP` 0x100C,
`CONDENSER_TEMP` 0x100E, `EVAPORATOR_TEMP` 0x1010, `INTERNAL_FAN_SPEED` 0x1012, `EXTERNAL_FAN_SPEED` 0x1014,
`AC_INPUT_VOLTAGE` 0x1016, çalışma saati çiftleri 0x101C–0x1025

**ALARMLAR (A3 §7.3 alarm sinyalleri, holding, 0 normal / 1 alarm / 0xFF geçersiz):** `HIGH_TEMP` 0x300–0x305, `LOW_TEMP` 0x306–0x308,
`OVER_VOLTAGE` 0x309/0x30B, `UNDER_VOLTAGE` 0x30A/0x30C, `COMPRESSOR_FAULT` 0x30D, `FAN_FAULT` 0x30E,
`HEATER_FAULT` 0x30F, `SENSOR_FAULT` 0x310, `HIGH_PRESSURE` 0x312, `LOW_PRESSURE` 0x313,
`CONDENSER_FAULT` 0x316, `EVAPORATOR_FAULT` 0x317

---

## 6. Bilinen davranış boşlukları

- `equipmentStatus = 3` (Fault) **hiçbir yerde set edilmez**; tick'teki `!== 3` kontrolü
  fiilen ölü dallanmadır.
- `returnHumidity` (0x1005) ve `acInputVoltage` (0x1016) tick'te **güncellenmez**; dolayısıyla
  aşırı/eksik gerilim alarmları pratikte tetiklenemez.
- Hysteresis register'ları **kullanılmaz** (deadband kodda sabit).
- `SERVER_TEMP_*` yalnız saklanır, okuma/tick'te kullanılmaz.
- Testte bazı adresler haritayla uyuşmuyor (`hvac.test.ts`) — trivial assertion'lar oluşabilir.
- Kontrol modu (0x09) ve sunucu sıcaklıkları (0x2000/0x2001) davranışa bağlı değil; gerçek cihaz
  mod 4'te bu değerlere göre soğutur, EMS yazmazsa kontrol bozulur. Fiziksel modelde uygulanır.
- `0x202 = 0` kapatma olarak kabul ediliyor; gerçek cihazda 0 geçersizdir (yalnız 2 kapatır).
- Zorunlu modlar (0x2101–0x2104) bu simülatörde hiç modellenmez; fiziksel model "gerçek"
  profilde vendor'a uygun olarak etkisiz bırakır.
