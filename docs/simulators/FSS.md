# FSS Simülatörü (Yangın Söndürme Paneli + Gaz Dedektörleri)

> Cihaz: **Sigma XT** yangın söndürme paneli + **VIGI-DT1** gaz dedektörleri
> (demo sözleşme; SPEC DEMO-KONSOL-UI-UYUM UC-10 / K-7).
> Kod: `fss/fss-simulator.ts#FssSimulator`, register: `fss/register-map.ts`,
> adaptör: `fss/fss-modbus-adapter.ts#FssAdapter`.
>
> **Önemli:** Resmî Sigma XT Modbus haritası YOKTUR. Gerçek konsolda panel
> sinyalleri kablolu röle çıkışlarıyla konteyner kontrolcüsüne DI olarak alınır;
> bu harita o davranışı Modbus telemetrisine taşımak için **tasarlanmıştır**.
> Gerçek harita geldiğinde yalnızca `register-map.ts` + config güncellenir.

---

## 1. Konfigürasyon ve başlangıç durumu

`fss/fss-simulator.ts#FssSimulatorConfig`:

| Alan | Anlam | Varsayılan |
| :--- | :--- | :--- |
| `deviceId` | Cihaz kimliği (zorunlu — boşsa fail-fast) | — |
| `network` | Verilirse self-host Modbus TCP açılır | — |
| `releaseDelayS` | Söndürme gecikmesi (s) | **30** |
| `h2AlarmLEL` | H₂ alarm eşiği (%LEL) | **10** |

Başlangıç (`#FssSimulator.healthy`): panel normal, 3 zone normal, 2 dedektör
normal (RH 45 %, sıcaklık 22 °C, LEL/VOC 0), release yok, disablement yok.

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni (`ISimulator` + `port()`; `network` yoksa
no-op, idempotent). Tick, `SimulatorServer` tarafından 1 sn'de bir çağrılır.

---

## 3. `tick(elapsedSeconds)` — adım adım

`fss/fss-simulator.ts#FssSimulator.tick`:

1. **Release geri sayımı:** `firstStage && !modeManual && !released` iken
   `countdown -= elapsedSeconds`; 0'a inince `released = true`.
2. **Dedektör sapması:** gaz alarmı yoksa H₂ LEL değeri `0.1/sn` azalır; yangın
   varsa dedektör sıcaklığı `0.2/sn` artar (üst sınır 60 °C), yoksa 22 °C'ye döner.
3. Diğer durumlar (zone/panel/fan) yalnız yazma/enjeksiyonla değişir.

---

## 4. Durum makinesi

- `injectZoneFire(zone, true)`: zone fire; **1 zone** → `firstStage` + geri sayım
  (`releaseDelayS`), **≥2 zone** → `secondStage`. `modeManual` iken otomatik
  release YOK (geri sayım durur).
- `injectGasAlarm(det, true)`: H₂ ≥ `h2AlarmLEL` → tahliye fanı + havalandırma on.
- **Panel durumu önceliği:** released/firstStage → `FIRE`; panel fault → `FAULT`;
  disabled → `DISABLED`; test → `TEST`; aksi `NORMAL`.

---

## 5. Senaryo enjeksiyonu (sınıf API'si)

`inject(scenario)` string'i yerine tipli metodlar (yalnız dev/debug):

| Metot | Etki |
| :--- | :--- |
| `injectZoneFire(zone, active)` | Zone 0..2 yangın/normal; stage + countdown |
| `injectGasAlarm(det, active)` | Dedektör 0..1 gaz alarmı; fan/havalandırma |
| `setPanelFault(active)` | Panel arızası |
| `setDisablement(key, active)` | `dE/dt/dc/dP/dA/db` disablement bayrakları |
| `setPanelMode("normal"\|"disabled"\|"test")` | Panel modu |
| `reset()` | Sağlıklı başlangıç durumuna döner |

---

## 6. Yazma davranışı — COIL

`fss/fss-simulator.ts#FssSimulator.writeCoil` (adresler `register-map.ts#COILS`):

| Coil | Ad | Tepki |
| :--- | :--- | :--- |
| 0 | `RESET` | `true` → panel reset (sağlıklıya döner) |
| 1 | `MODE_MANUAL` | `true` = yalnız manuel (otomatik release yok) |
| 2 | `EXTRACT_FAN` | Tahliye fanı aç/kapa |
| 3 | `VENTILATION` | Havalandırma aç/kapa |

Bilinmeyen coil → no-op.

---

## 7. Okuma yüzeyi

**INPUT REGISTERS (FC04)** — `register-map.ts#INPUT`:

| Adres | Ad | Anlam |
| :--- | :--- | :--- |
| 0 | `PANEL_STATUS` | 0 normal · 1 fire · 2 fault · 3 disabled · 4 test |
| 1 / 2 / 3 | `FIRST_STAGE` / `SECOND_STAGE` / `RELEASED` | 0/1 |
| 4 | `COUNTDOWN` | Release geri sayımı (s) |
| 5 | `MODE` | 0 auto · 1 manual only |
| 6–8 | `ZONE_1..3_STATE` | 0 normal · 1 fire · 2 fault |
| 9–12 | `DET1_*` | H₂ %LEL ×10, VOC ×10, RH %, sıcaklık ×10 |
| 13–16 | `DET2_*` | Aynı alanlar (2. dedektör) |
| 17 / 18 / 19 / 20 | `EXTRACT_FAN` / `VENTILATION` / `BUZZER` / `VENTS_OPEN` | 0/1 |
| 21–26 | `DISABLE_*` | Mode menüsü disablement bayrakları (dE/dt/dc/dP/dA/db) |

**DISCRETE INPUTS (1x)** — `register-map.ts#DISCRETE`: `SYSTEM_OK` (NC),
`FAULT`, `DISCHARGED` (release), `SECOND_STAGE`.

---

## 8. Notlar

- Harita tasarım gereğidir; gerçek panel geldiğinde yalnız `register-map.ts` +
  config değişir (simülatör gövdesi değil).
- Disablement bayrakları telemetride raporlanır; simülasyon release/fan mantığını
  **gate'lemez** (mode menüsü görünümü içindir).
- Testler: `fss/fss-simulator.test.ts`.
