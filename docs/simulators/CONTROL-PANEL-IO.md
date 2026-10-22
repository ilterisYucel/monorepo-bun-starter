# Control Panel IO Simülatörü

> Rol: Kontrol paneli **dijital I/O** — kapı kontaktları (DI), ışık röleleri (DO)
> ve FSS (yangın söndürme) kuru kontakları.
> Kod: `control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator`,
> register: `control-panel-io/register-map.ts`.
> Sözleşme: `SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.3` + K5.

Bu simülatör, FL-07 "Kapı Açık" manevrasının veri kaynağıdır ve FSS kuru
kontaklarını (K5) IO DI'lara taşır. Fiziksel olarak **kendiliğinden değişmez**;
durum yalnız Modbus yazımı veya demo enjeksiyonu ile değişir.

---

## 1. Başlangıç durumu

Tüm durumlar `false` (`control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator.constructor`):
kapılar kapalı, ışıklar sönük, FSS sağlıklı (`fssFault`, `fssDischarged`,
`fss2ndStage` = false).

---

## 2. `start()` / `stop()` / `port()`

Standart `SelfHostedSimulator` deseni (network yoksa no-op, idempotent).

---

## 3. `tick(elapsedSeconds)` — bilinçli no-op

`control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator.tick`:
durum sabit kalır. **Bu bir "sabit/yazımla değişen" cihazdır**, zamanla değişen
fizik modeli yoktur.

---

## 4. Durum değiştirme yolları

1. **Modbus COIL yazımı** — ışık röleleri (`writeCoil`), read-back anında yansır.
2. **Demo enjeksiyonu (sınıf API'si):**
   - `control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator.setDoorState`
     → `{ batteryOpen, panelOpen }` kapı kontakt DI'larını ayarlar.
   - `control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator.setFssState`
     → `{ fault?, discharged?, secondStage? }` FSS kuru kontaklarını ayarlar.

---

## 5. Yazma davranışı (COIL)

`control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator.writeCoil`:

| Adres | Sembol | Yazılan | Tepki |
| :--- | :--- | :--- | :--- |
| 0 | `COILS.BATTERY_LIGHT` | `true/false` | Batarya odası ışığı aç/kapat (read-back anında) |
| 1 | `COILS.PANEL_LIGHT` | `true/false` | Panel odası ışığı aç/kapat (bağımsız) |

Bilinmeyen COIL yazımı yok sayılır.

---

## 6. Okuma davranışı

**Discrete Inputs (DI)** — `control-panel-io/control-panel-io-simulator.ts#ControlPanelIoSimulator.readDiscreteInput`:

| Adres | Sembol | Anlam / mantık |
| :--- | :--- | :--- |
| 0 | `DISCRETE.BATTERY_DOOR_OPEN` | Batarya kapısı açık |
| 1 | `DISCRETE.PANEL_DOOR_OPEN` | Panel kapısı açık |
| 2 | `DISCRETE.FSS_SYSTEM_OK` | **Türetilmiş:** `!fssFault && !fssDischarged` (NC kuru kontak) |
| 3 | `DISCRETE.FSS_FAULT` | FSS arıza |
| 4 | `DISCRETE.FSS_DISCHARGED` | Söndürme aktive edildi |
| 5 | `DISCRETE.FSS_2ND_STAGE` | 2. aşama aktive |

Bilinmeyen DI adresi → `false`.

**Coils (ışık durumu read-back):** `readCoil(0/1)` → ilgili ışığın anlık durumu.

**Holding/Input register:** yoktur (adapter tarafında 0/boş, yazma no-op).

---

## 7. Register grupları

`control-panel-io/register-map.ts` (dışa `IO_COILS`, `IO_DISCRETE` olarak da açılır):
- **COILS:** `BATTERY_LIGHT: 0`, `PANEL_LIGHT: 1`
- **DISCRETE INPUTS:** `BATTERY_DOOR_OPEN: 0`, `PANEL_DOOR_OPEN: 1`,
  `FSS_SYSTEM_OK: 2`, `FSS_FAULT: 3`, `FSS_DISCHARGED: 4`, `FSS_2ND_STAGE: 5`

> Gerçek IO adresleri geldiğinde **yalnızca `register-map.ts` + config** güncellenir
> (demo sözleşme).

---

## 8. Notlar

- Testler: `control-panel-io/control-panel-io.test.ts` (ışık read-back, DI enjeksiyonu,
  bilinmeyen adres ihmal).
- FSS "System OK" **NC (normalde kapalı) kuru kontak** mantığıyla türetilir: arıza
  veya deşarj yoksa "sağlıklı" okunur.
