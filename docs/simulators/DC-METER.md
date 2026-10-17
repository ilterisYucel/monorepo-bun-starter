# DC-Meter Simülatörü (DJSF1352-RN)

> Cihaz: ACREL **DJSF1352-RN** DC metre — salt ölçüm.
> Kod: `dc-meter/dc-meter-simulator.ts#DcMeterSimulator`, register: `dc-meter/register-map.ts`.
> Kaynak sözleşme: `KONTEYNER-MANEVRA-KATALOGU-REV03 MIMARISI.md §2.6 (K1)`.
> FL-08 (DC kısa devre koruması) veri kaynağı.

Bu cihaz **saf ölçüm cihazıdır**: komut kabul etmez, yalnız gerilim/akım/güç
okunur. Değerler deterministik kalır; tick etkisizdir.

---

## 1. Başlangıç değerleri

`dc-meter/dc-meter-simulator.ts#DcMeterSimulator.constructor` (nominal):

| Değer | Başlangıç |
| :--- | :--- |
| DC gerilim | 750.0 V |
| DC akım | 100.0 A |
| DC güç | 75.0 kW |
| Alarm Word | 0 |

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni; `tick: (s) => this.tick(s)` bağlanır
(network yoksa no-op, idempotent).

---

## 3. `tick(elapsedSeconds)` — etkisiz

`dc-meter/dc-meter-simulator.ts#DcMeterSimulator.tick`: **gövde boştur.**
Salt ölçüm cihazı olduğundan zamanla değişen davranış yoktur.

---

## 4. Değer değiştirme yolu — senaryo enjeksiyonu

`dc-meter/dc-meter-simulator.ts#DcMeterSimulator.setMeasurements`:

```ts
setMeasurements({ voltage?, current?, power?, alarmWord? })
```

- Yalnızca verilen alanlar değişir, diğerleri korunur.
- FL-08 eşik testleri bu yolla üretilir (gerilim/akım/güç telemetrileri üzerinden
  1500 V / 1680 A / 1784 kW eşikleri değerlendirilir — alarm word kullanılmaz).

---

## 5. Okuma davranışı (INPUT REGISTER)

`dc-meter/dc-meter-simulator.ts#DcMeterSimulator.readInputRegister`:

| Adres | Sembol | Format | Açıklama |
| :--- | :--- | :--- | :--- |
| 19 | `INPUT.ALARM_WORD` | UINT16 | Alarm word (normalde 0; v1 ham değer) |
| 50–51 | `INPUT.DC_VOLTAGE` | FLOAT32 BE | DC gerilim (V) |
| 52–53 | `INPUT.DC_CURRENT` | FLOAT32 BE | DC akım (A) |
| 54–55 | `INPUT.DC_POWER` | FLOAT32 BE | DC güç (kW) |

- float32 değerler **big-endian iki kelime** olarak okunur (`floatToWords`).
- Bilinmeyen adres → 0.

---

## 6. Register grupları

`dc-meter/register-map.ts#INPUT`: `ALARM_WORD: 19`, `DC_VOLTAGE: 50`,
`DC_CURRENT: 52`, `DC_POWER: 54`.

> **Holding/coil/discrete YOKTUR.** Tüm okumalar input register üzerindendir
> (FC03 olarak da sunulur).

---

## 7. Notlar

- FL-08 kuralı **alarm word'ü kullanmaz**; eşikler V/I/P telemetrileri üzerinden
  değerlendirilir (`register-map.ts` yorumu).
- Test: `dc-meter/dc-meter.test.ts`.
