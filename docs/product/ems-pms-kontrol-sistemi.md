# EMS-PMS Kontrol Sistemi — Komut, Manevra ve Operasyon Kataloğu

Bu doküman; enerji depolama kontrol sistemimizde kullanılan üç temel yürütme kavramını
(**komut, manevra, operasyon**), bunların veri yapılarını, tüm cihazların komut-register
sözlüklerini ve konteyner ile saha tarafındaki tüm manevra/operasyonların çalışma
algoritmalarını açıklar. Amaç: algoritmayı okuyup veri yapısını satır satır
karşılaştırarak sistem davranışını doğrulayabilmektir.

---

## 1. Komut, Manevra ve Operasyon Nedir?

| Kavram        | Tanım                                                                                                                                                                                                                                              | Ayrım                |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------- |
| **Komut**     | Tek bir **cihazı** hedefleyen, isimlendirilmiş eylemdir. Cihazın **bir veya birden fazla register'ına** yazar (yazım listesi cihaz konfigürasyonunda tanımlıdır) ve sonucu okuma (read-back) ile doğrulanır.                                       | Tek cihaz            |
| **Manevra**   | Aynı **sistem** içindeki birden fazla **cihaza** paralel veya sıralı komut zinciri çalıştırır. Hata durumunda durma/devam/geri alma politikası taşır. Başka sistemlerden yalnızca OKUMA yapılıp komutlar tek sistemde çalışıyorsa yine manevradır. | Tek sistem, 1+ cihaz |
| **Operasyon** | **Farklı sistemler arasında koordineli komut/manevra çalıştırır.** Burada **sistem = ayrı bir uygulama** demektir: **konteyner uygulaması**, **saha uygulaması**, **boss (üst) uygulaması**.                                                       | 1+ sistem            |

**Kritik ayrım:** Başka sistemden yalnızca **okuma** (telemetri, durum, olay raporu)
operasyon DEĞİLDİR — operasyon, başka sistemde **komut/manevra ÇALIŞTIRMAK** demektir.
Okuma + kendi sisteminde komut = manevra; başka sistemde komut/manevra çalıştırma = operasyon.

**Komut örneği:** HVAC cihazına `force_cool` komutu → cihazın iki register'ına yazar:
`Remote On/Off` ← 1 ve `Cooling Setpoint` ← 10. İki yazım, ama hep aynı tek cihaz —
bu yüzden komuttur.

**Manevra örneği:** Konteyner uygulamasında "TMS Soğutmayı Zorla" manevrası → aynı
sistemdeki 8 HVAC cihazına paralel `force_cool` komutları çalıştırır. Tek sistem
(konteyner), 8 cihaz — manevradır. İkinci örnek: saha "Başlatma" akışı — konteynerlerden
hazırlık durumu OKUNUR (AUX, cihaz müsaitliği), koşullar uygunsa PCS'ler başlatılır;
konteynerde komut çalıştırılmadığı için bu da manevradır.

**Operasyon örneği:** "Saha Şarj" operasyonu iki farklı uygulamada koordineli çalışır:

1. **Uzak adım:** konteyner uygulamasında `bsc_prepare` manevrası — BSC kontaktörlerini
   kapatır ve sistemi başlatır (güç parametresi YOK — BSC'de güç komutu yoktur, güç
   PCS'ten kontrol edilir).
2. **Yerel adım:** saha uygulamasında `pcs_charge` manevrası — Wattox PCS'e şarj güç
   setpoint'i yazar (S06 register'ı, şarj için NEGATİF değer).
   İki farklı uygulamada (sistemde) komut/manevra koordinasyonu — operasyondur.

---

## 2. Veri Yapıları

### 2.1 Komut

```pseudo
Komut (cihaz konfigürasyonunda isimlendirilmiş):
  ad:        "force_cool"
  yazımlar:  [ { register: "Remote On/Off",    değer: 1 },
               { register: "Cooling Setpoint", değer: 10 } ]   ← 1+ register, TEK cihaz
  parametreler:  { powerKw: { tip: sayı, min, max, zorunlu } } ← opsiyonel
  doğrulama: [ { register: "Equipment Status", beklenen: ... } ] ← read-back
```

```ts
// Konfigürasyondaki komut tanımı (tek cihaza, 1+ register yazımı)
interface CommandConfig {
  label?: string;
  telemetries: Array<{ name: string; value: unknown; unit?: string }>; // 1+ yazım
  params?: Record<
    string,
    {
      type: "number" | "string" | "boolean";
      min?: number;
      max?: number;
      default?: unknown;
      required?: boolean;
      label?: string;
    }
  >;
  atomic?: boolean; // yazımlar atomik mi (hata olursa geri al)
  timeoutMs?: number;
  validate?: {
    minWaitMs?: number;
    reads: Array<{ name: string; expect: string | number | boolean }>;
  };
}

// Manevra/operasyon adımlarında kullanılan komut adımı
interface CommandStep {
  deviceId: string; // TEK cihaz
  command?: string; // isimlendirilmiş komut (config'ten)
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>; // veya ham yazımlar
  params?: Record<string, unknown>;
}
```

### 2.2 Manevra

```pseudo
Manevra (tek sistem, 1+ cihaz):
  ad:         "bsc_prepare"
  mod:        paralel | sıralı
  hata:       dur | devam et | geri al
  adımlar:    [ KomutAdımı(c1), KomutAdımı(c2), ... ]        ← hepsi AYNI sistemde
  geriAl:     [ KomutAdımı, ... ]                            ← opsiyonel
```

```ts
interface ManeuverConfig {
  name: string;
  label?: string;
  description?: string;
  mode: "parallel" | "sequential";
  onFailure?: "stop" | "continue" | "rollback";
  steps: CommandStep[];
  rollbackSteps?: CommandStep[];
}

// ÖRNEK — konteyner uygulaması: "BSC Hazırlık" manevrası
// (Saha Şarj operasyonunun uzak adımı)
{
  name: "bsc_prepare", mode: "parallel", onFailure: "stop",
  steps: [
    { deviceId: "BSC-1", command: "close_contactors" },  // HR 40010 ← 0x0005
    { deviceId: "BSC-1", command: "start" },             // HR 40010 ← 0x0002
  ],
  rollbackSteps: [ { deviceId: "BSC-1", command: "stop" } ],
}

// ÖRNEK — saha uygulaması: "PCS Şarj" manevrası (güç dağıtımı buradadır)
{
  name: "pcs_charge", mode: "parallel", onFailure: "stop",
  steps: [
    { deviceTypes: ["pcs"], command: "charge", params: { powerKw: "{{divideTotal}}" } },
  ],
  rollbackSteps: [ { deviceTypes: ["pcs"], command: "stop" } ],
}
```

### 2.3 Operasyon

```pseudo
Operasyon (1+ sistem — ayrı uygulamalar arası koordineli komut/manevra çalıştırma):
  ad:       "field_charge"
  mod:      paralel | sıralı
  hata:     dur | devam et | geri al
  adımlar:  [ { sistem: "container-1", manevra: "bsc_prepare" },   ← UZAK (başka uygulama)
              { sistem: "container-2", manevra: "bsc_prepare" },   ← UZAK
              { manevra: "pcs_charge", parametreler: {...} } ]     ← YEREL (bu uygulama)
  geriAl:   [ { manevra: "pcs_stop" },
              { sistem: "container-1", manevra: "bsc_stop" }, ... ]
```

```ts
type OperationStep =
  | { maneuver: string; params?: Record<string, unknown> }            // yerel manevra
  | { commands: CommandStep[]; mode?: "parallel" | "sequential";
      onFailure?: "stop" | "continue"; params?: Record<string, unknown> } // yerel ham zincir
  | { system: string; maneuver: string; params?: Record<string, unknown> }; // UZAK manevra

// ÖRNEK — "Saha Şarj" operasyonu (iki sistem: konteyner + saha)
{
  name: "field_charge", label: "Saha Şarj", mode: "sequential", onFailure: "rollback",
  steps: [
    { system: "container-1", maneuver: "bsc_prepare" },   // 1. konteyner: kontaktör + start
    { system: "container-2", maneuver: "bsc_prepare" },   // 2. konteyner: kontaktör + start
    { maneuver: "pcs_charge", params: { powerKw: 200 } }, // saha: PCS S06 ← −200 (şarj NEGATİF)
  ],
  rollback: [
    { maneuver: "pcs_stop" },
    { system: "container-1", maneuver: "bsc_stop" },
    { system: "container-2", maneuver: "bsc_stop" },
  ],
}
```

**Operasyon sözleşmeleri:**

- **Adım sırası kritiktir:** konteyner hazırlığı PCS setpoint'inden ÖNCE gelir (sıralı
  mod bunu garanti eder) — tersi PCS'i boşta güç basmaya zorlar.
- **Tamamlanma anlamı:** operasyonun "tamamlandı" durumu, komutların gönderildiği ve
  cihazlardan doğrulandığı anlamına gelir. Şarj FİZİKSEL olarak yeni bir komuta kadar
  sürer — "tamamlandı" ≠ "şarj bitti".
- **Geri alma (rollback):** yalnızca başarıyla çalışan adımların tersi işletilir (ters
  sırada); tünel bağlantısı kopuksa uzak geri alma "sistem erişilemez" olarak kaydedilir
  ve operatör manuel tamamlar — otomatik yeniden deneme YOKTUR.

---

## 3. Cihaz Komut-Register Sözlükleri

> Konvansiyon: HR = Holding Register (yazılabilir), IR = Input Register (okunur),
> COIL/DO = bobin çıkışı, DI = sayısal giriş. Tüm adresler ondalıktır.

### 3.1 BSC (Batarya Sistemi — Flex)

**Tüm komutlar tek register'dan gider: HR 40010 (Command Request).**

| Komut              | Register | Değer  | Not                                             |
| :----------------- | :------- | :----- | :---------------------------------------------- |
| `emergency`        | HR 40010 | 0x0001 | acil durdurma                                   |
| `start`            | HR 40010 | 0x0002 |                                                 |
| `stop`             | HR 40010 | 0x0003 |                                                 |
| `open_contactors`  | HR 40010 | 0x0004 | kontaktörleri aç — koruma akışlarının karşılığı |
| `close_contactors` | HR 40010 | 0x0005 | kontaktörleri kapat                             |
| `enter_manual`     | HR 40010 | 0x0006 |                                                 |
| `exit_manual`      | HR 40010 | 0x0007 |                                                 |
| `event_clear`      | HR 40010 | 0x0009 |                                                 |
| `reset`            | HR 40010 | 0x000A |                                                 |
| şarj/deşarj        | —        | yok    | güç PCS üzerinden yönetilir                     |

**Doğrulama:** komut sonrası IR 30030 (`Request Acknowledge`) okunur; 0x0002 = tamam,
diğer kodlar hata sebebini taşır (kontaktör zaten açık, akım akıyor, manuel mod vb.).

**Kural girdisi olarak kullanılan telemetriler:** `BSC SOC` (IR 30055), `BSC SOH`
(IR 30056), `Max Pack Temp` (IR 30149), `Min Pack Temp` (IR 30151),
`Rack Max Diff Temp R1..R8` (IR 30264), `Rack Max Diff Temp Pack R1..R8` (IR 30265),
`BSC State` (IR 30036).

### 3.2 HVAC (Kabin Kliması — MC90HDNC1R)

| Komut        | Register                                               | Değer                   |
| :----------- | :----------------------------------------------------- | :---------------------- |
| `on`         | HR 514 (Remote On/Off)                                 | 1                       |
| `off`        | HR 514                                                 | 0                       |
| `force_cool` | HR 514 ← 1 **+** HR 10 (Cooling Setpoint, °C) ← 10     | iki register, tek komut |
| `force_heat` | HR 514 ← 1 **+** HR 28 (Heating Setpoint, 0.1°C) ← 500 | = 50.0°C                |

**Doğrulama/izleme:** `Equipment Status` (IR 4096), `Current Temp` (IR 4104 — dönüş
havası sıcaklığı, kural girdisi), `Return Humidity` (IR 4101 — nem kuralı girdisi).
**Nem alma komutu YOKTUR** — HVAC haritasında dehumid komutu tanımlı değildir.

### 3.3 DC Şalter (Switch-Disconnector — SYW6GZ-4000)

| Komut   | Register | Değer | Not                              |
| :------ | :------- | :---- | :------------------------------- |
| `open`  | COIL 0   | 1     | shunt trip bobini (uzaktan açma) |
| `close` | COIL 1   | 1     | kapatma bobini                   |

**Durum:** DI 0 = `Is Closed` (yardımcı kontak NC), DI 1 = `Is Open` (yardımcı kontak NO).
Trip/akım/sıcaklık semantiği YOKTUR — cihaz kesici değil, şalterdir.

### 3.4 DC Çıkış (DC Output)

| Komut | Register | Değer |
| :---- | :------- | :---- |
| `on`  | COIL 0   | 1     |
| `off` | COIL 1   | 1     |

**Durum:** DI 0 = `Is On`.

### 3.5 IO Modülü (Kapılar, Işıklar, Yangın Paneli — Control Panel IO)

| Komut                  | Register | Değer | Not                 |
| :--------------------- | :------- | :---- | :------------------ |
| `battery_light_on/off` | COIL 0   | 1 / 0 | batarya odası ışığı |
| `panel_light_on/off`   | COIL 1   | 1 / 0 | panel odası ışığı   |

**Durum girişleri (DI):** DI 0 = `Battery Door Open`, DI 1 = `Panel Door Open`;
yangın söndürme paneli (EP203) kuru kontakları aynı modüle DI olarak bağlanır:
`System OK`, `Fault`, `Discharged`, `2nd Stage` (panel seri protokole sahip değildir).

### 3.6 DC Metre (DJSF1352-RN)

Komut YOKTUR — salt ölçüm cihazı. FC03 okumaları: **addr 50/52/54 = V/I/P** (float,
kW) + **alarm word addr 19**. 1500 VDC / 9999 A şant aralığına uygundur. DC kısa devre
koruma kuralının veri kaynağıdır.

### 3.7 AUX Enerji Analizörü (PM5340)

Komut YOKTUR (katalog amaçlı `reset_energy`/`reset_demand` mevcuttur) — AUX barasının
ölçüm cihazıdır. AUX kaybı kuralı bu cihazdan okur: **`Voltage L-N Avg`** (faz-nötr
ortalama gerilim) + `Frequency` + faz THD değerleri.

### 3.8 İzolasyon İzleme Cihazı — IMD (isoPV1685RTU)

Komut YOKTUR — izolasyon direnci (`Insulation Resistance`) + alarm bitleri
(Alarm1 / Alarm2 / Device Error) okunur. Toprak direnci hatası kuralının veri kaynağıdır.

### 3.9 PCS (Güç Dönüştürücü — Wattox MPCS, saha tarafı)

| Komut                | Register      | Değer                   | Not                          |
| :------------------- | :------------ | :---------------------- | :--------------------------- |
| `start`              | HR 3604 (S16) | 1                       |                              |
| `stop`               | HR 3605 (S17) | 1                       |                              |
| `standby`            | HR 3607 (S19) | 1                       |                              |
| `fault_reset`        | HR 3606 (S18) | 1                       |                              |
| `charge`             | HR 3609 (S06) | **−powerKw** (işaretli) | şarj NEGATİF konvansiyonu    |
| `discharge`          | HR 3609 (S06) | +powerKw                |                              |
| `set_power_zero`     | HR 3609 (S06) | 0                       | idle                         |
| `set_command_source` | HR 3584 (S01) | 1                       | açılışta EMS kontrolüne alma |

**Doğrulama/izleme:** `PCS Operation Status` (0 Stop / 1 Standby / 2 Şarj / 3 Deşarj /
6 Fault), `PCS Fault Status`, `PCS Alarm Status`, `Grid Active Power` (akış doğrulaması),
AC/DC kesici + kontaktör durumları, `E-stop Button Status` (kural tetikleyicisi),
`Max Charge/Discharge Power` (B09/B10 — güç dağıtım hesabında zorunlu limit; kaynağı
BSC'dir, bağlantı köprüsüyle PCS'e taşınır).

---

## 4. Konteyner Manevraları

> Konteyner uygulaması = TEK SİSTEM. Aşağıdakilerin tamamı **manevra** veya otomatik
> kuraldır (operasyon DEĞİL — operasyonlar birden fazla uygulamayı ilgilendirir, §5).

### 4.1 FL-02 — AUX Kaybı Koruma (otomatik kural)

**Ne yapar:** AUX barası gerilimi eşiğin altına düşerse (PM5340 `Voltage L-N Avg` < 180 V,
5 sn boyunca) sistem enerjisizleştirilir: DC şalterler açılır + BSC kontaktörleri açılır.

```pseudo
ALGORİTMA fl02_aux_loss:
her telemetri anlık görüntüsünde:
  koşul = PM5340."Voltage L-N Avg" < 180 V  VE  5 sn debounce doldu
  eğer koşul YÜKSELEN KENAR ise (yalnız ilk geçiş):
    CB-1, CB-2   → komut "open"             // COIL 0 ← 1 (shunt trip)
    BSC-1, BSC-2 → komut "open_contactors"  // HR 40010 ← 0x0004
    log "auto_rule_fl02_aux_loss" + bildirim
    cooldown 5 dk (koşul sürerken tekrar YOK)
```

```jsonc
{
  "name": "fl02_aux_loss",
  "cooldownMs": 300000,
  "when": {
    "all": [
      {
        "device": { "ids": ["PM5340-1"] },
        "telemetry": "Voltage L-N Avg",
        "op": "lt",
        "threshold": 180,
        "debounceMs": 5000,
      },
    ],
  },
  "then": [
    { "action": "command", "deviceIds": ["CB-1", "CB-2"], "command": "open" },
    {
      "action": "command",
      "deviceIds": ["BSC-1", "BSC-2"],
      "command": "open_contactors",
    },
    { "action": "log", "eventCode": "auto_rule_fl02_aux_loss" },
    { "action": "notify" },
  ],
}
```

### 4.2 FL-05 — TMS Normal Sıcaklık Kontrolü (otomatik kurallar, 32 adet)

**Ne yapar:** Her kabin kliması kendi dönüş havası sıcaklığını hysteresis eşikleriyle
kontrol eder. 8 klima × 4 kural = 32 kural (cihaz başına bağımsız karar).

| Kural    | AÇ (komut)                                      | KAPAT (komut)                 |
| :------- | :---------------------------------------------- | :---------------------------- |
| Soğutma  | `Current Temp` ≥ 25°C → `force_cool`            | < 23°C → `on` (normal mod)    |
| Isıtma   | `Current Temp` ≤ 17°C (düşerken) → `force_heat` | ≥ 20°C → `on`                 |
| Nem alma | `Return Humidity` ≥ 75%                         | ⛔ komut YOK — kural yazılmaz |

```pseudo
ALGORİTMA tms_cool_on_hN (klima N):
  eğer HVAC-N."Current Temp" >= 25 (YÜKSELEN KENAR):
    HVAC-N → "force_cool"   // HR 514 ← 1 + HR 10 ← 10
    log "auto_rule_tms_cool_on" ; cooldown 60 sn
ALGORİTMA tms_cool_off_hN:
  eğer HVAC-N."Current Temp" < 23 (YÜKSELEN KENAR):
    HVAC-N → "on"           // HR 514 ← 1
```

```jsonc
{
  "name": "tms_cool_on_h1",
  "cooldownMs": 60000,
  "when": {
    "all": [
      {
        "device": { "ids": ["HVAC-1"] },
        "telemetry": "Current Temp",
        "op": "gte",
        "threshold": 25,
      },
    ],
  },
  "then": [
    { "action": "command", "deviceId": "HVAC-1", "command": "force_cool" },
    { "action": "log", "eventCode": "auto_rule_tms_cool_on" },
  ],
}
// tms_cool_off_h1 (< 23 → "on"), tms_heat_on_h1 (<= 17 → force_heat),
// tms_heat_off_h1 (>= 20 → "on") — HVAC-2..8 için aynı dörtlü.
```

### 4.3 FL-05 — TMS Koruma Kapıları (otomatik kurallar, 4 adet)

**Ne yapar:** Sıcaklık/nem/fark eşikleri aşılırsa sistem "blok"a alınır: klimalar
zorlanır + BSC'ler durdurulur. Konteyner uygulamasında PCS YOKTUR — blok seti BSC stop

- klima zorlamadır (PCS tarafı saha uygulamasındadır, §5).

| Koruma         | Koşul (VEYA)                                                                  | Aksiyon                                              |
| :------------- | :---------------------------------------------------------------------------- | :--------------------------------------------------- |
| Aşırı sıcak    | Oda > 29°C **15 dk** VEYA Max Pack Temp > 50°C **5 dk** VEYA > 75°C **45 sn** | 8 klima `force_cool` + 2 BSC `stop` + log + bildirim |
| Aşırı soğuk    | Oda < 10°C **15 dk** VEYA Min Pack Temp < 15°C **5 dk** VEYA < 5°C **45 sn**  | 8 klima `force_heat` + 2 BSC `stop` + log + bildirim |
| Nem            | `Return Humidity` ≥ 85%                                                       | 2 BSC `stop` + log + bildirim                        |
| Sıcaklık farkı | herhangi bir rack farkı ≥ 10°C VEYA pack farkı ≥ 5°C                          | 2 BSC `stop` + log + bildirim                        |

```pseudo
ALGORİTMA tms_overheat_protect:
  koşullar = [ herhangiHVAC."Current Temp" > 29  (debounce 15 dk),
               herhangiBSC."Max Pack Temp" > 50  (debounce 5 dk),
               herhangiBSC."Max Pack Temp" > 75  (debounce 45 sn) ]
  eğer herhangi(koşullar) YÜKSELEN KENAR:
    HVAC-1..8 → "force_cool"      // HR 514←1 + HR 10←10
    BSC-1, BSC-2 → "stop"        // HR 40010 ← 0x0003
    log "auto_rule_tms_overheat" + bildirim ; cooldown 15 dk
```

### 4.4 FL-07 — Kapı Açık Güvenliği (otomatik kurallar, 4 adet)

```pseudo
ALGORİTMA fl07_battery_door_open:
  eğer IO."Battery Door Open" == doğru (YÜKSELEN KENAR):
    IO → "battery_light_on"   // COIL 0 ← 1
    BSC-1, BSC-2 → "stop"     // HR 40010 ← 0x0003
    log "auto_rule_fl07_door"
ALGORİTMA fl07_battery_door_close:
  "Battery Door Open" == yanlış → IO → "battery_light_off"  // COIL 0 ← 0
// panel kapısı: aynı desen — panel_light_on/off (COIL 1)
```

### 4.5 FL-08 — DC Kısa Devre Koruması (otomatik kural)

**Ne yapar:** DC metre V/I/P eşiklerinden herhangi biri aşılırsa sistem DC tarafını
de-enerjize eder. Debounce 1 sn, cooldown 1 saat (servis penceresi); otomatik geri dönüş
YOKTUR.

```pseudo
ALGORİTMA fl08_scf_trip:
  koşullar = [ DCMETRE."DC Voltage" > 1500 V,
               DCMETRE."DC Current" > 1680 A,
               DCMETRE."DC Power"  > 1784 kW ]   (her biri 1 sn debounce)
  eğer herhangi(koşullar) YÜKSELEN KENAR:
    BSC-1, BSC-2 → "open_contactors"   // HR 40010 ← 0x0004
    CB-1, CB-2   → "open"              // COIL 0 ← 1
    log "auto_rule_fl08_scf" + bildirim ; cooldown 1 sa
```

### 4.6 FL-11 — Toprak Direnci Hatası (otomatik kural)

```pseudo
ALGORİTMA fl11_ground_fault:
  koşullar = [ IMD."Insulation Alarm" == doğru,    // Alarm1/Alarm2 bitleri
               IMD."Device Error"   == doğru ]     (2 sn debounce)
  eğer herhangi(koşullar) YÜKSELEN KENAR:
    BSC-1, BSC-2 → "open_contactors"   // HR 40010 ← 0x0004
    CB-1, CB-2   → "open"              // COIL 0 ← 1
    log "auto_rule_fl11_ground" + bildirim
```

### 4.7 FL-09 İletişim Kaybı — SİNYAL KAYNAĞI BEKLENİYOR

Cihaz çevrimdışı durumunun kural girdisine çevrilmesi için sinyal kaynağı bekleniyor —
kaynak gelene kadar kural YAZILMAZ (yanlış veriyle kural çalışmaz, fail-safe). Bkz. §6.2.

### 4.8 FL-12 Yangın Modu — DOKÜMAN BEKLENİYOR

Yangın söndürme panelinin akış dokümanı gelince kural yazılacak; kuru kontak girişleri
(§3.5) hazırdır.

### 4.9 Manuel Kartlar (operatör arayüzü)

Ortak akış: kart → komut adımları → her cihaz `IDevice.write` → read-back doğrulama →
kart durumu (çalışıyor / başarılı / hatalı + istenirse geri al).

| Kart                                         | Adımlar                                                          | Register eşlemesi                                                                                                                                                 |
| :------------------------------------------- | :--------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FL-01 Başlatma                               | CB `open` + BSC `start` + DC `on`                                | COIL 0←1 · HR 40010←0x0002 · COIL 0←1                                                                                                                             |
| FL-03 Acil Durdur                            | BSC `emergency` + CB `open`                                      | HR 40010←0x0001 · COIL 0←1 (şalter dry contact ile mekanik açılır — DC adımı yok)                                                                                 |
| FL-10 Bakım Kapatma                          | BSC `open_contactors` + CB `open`                                | HR 40010←0x0004 · COIL 0←1                                                                                                                                        |
| DC Şalter Kapat                              | CB `close`                                                       | COIL 1←1                                                                                                                                                          |
| Kontaktör Kapat                              | BSC `close_contactors`                                           | HR 40010←0x0005                                                                                                                                                   |
| Durdur                                       | BSC `stop`                                                       | HR 40010←0x0003                                                                                                                                                   |
| BSC Güç / Kalibrasyon / Şarj-Deşarj kartları | katalogda YOK — güç komutu saha operasyonundan (PCS S06) verilir | **SORU (enerji ekibi):** kalibrasyon için şarj/deşarj nasıl yapılacak — manevra sahaya mı taşınacak, konteyner saha uygulamasına istek mi gönderecek? (§6 soru 1) |

**Hazırlık manevrası (`bsc_prepare`)** — saha operasyonlarının uzak adımı:
`close_contactors` (0x0005) + `start` (0x0002) — §2.2'deki örnek kayıt.

---

## 5. Saha Manevraları ve Operasyonları

> Saha uygulaması = AYRI SİSTEM. Konteyner uygulamasıyla koordinasyon gerektiren
> akışlar OPERASYON, yalnız PCS cihazlarını ilgilendirenler MANEVRA'dır. Konteyner
> tarafı kendi otomatik korumalarını kendisi işletir (bkz. §4) ve önemli olayları
> sahaya raporlar.

### 5.1 FL-01 — Başlatma / Kapatma (MANEVRA)

**Ne yapar:** Saha çapında hazırlık kontrolü: konteynerlerden durum OKUNUR (AUX =
konteyner PM5340, cihaz müsaitliği, olay raporları) → koşullar uygunsa PCS'ler
başlatılır/durdurulur. Konteynerde komut/manevra ÇALIŞTIRILMAZ — yalnız okuma →
MANEVRA. (MV/grid verileri gelene kadar önkoşul kapısı sınırlıdır.)

```pseudo
ALGORİTMA fl01_startup (MANUEL):
  kart tetiklenir →
    OKU: konteyner durumları (AUX PM5340 gerilimi, cihaz müsaitliği, olay raporları)
    eğer koşullar uygunsa:
      adım: PCS-1..N → "start"     // HR 3604 (S16) ← 1
      doğrulama: PCS çalışma durumu (Ready durum makinesi)
ALGORİTMA fl01_shutdown (MANUEL):
  adım: PCS-1..N → "stop"          // HR 3605 (S17) ← 1
```

```ts
fl01_startup:  { mode: "parallel", onFailure: "continue", steps: stepsFor("start", pcsIds) },
fl01_shutdown: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop",  pcsIds) },
```

### 5.2 FL-02 — Şarj / Deşarj (OPERASYON)

**Ne yapar:** Operatör santral gücünü girer → grup seçimi (seçim yoksa online+müsait PCS
sayısına eşit bölünür) → konteyner hazırlığı → PCS setpoint. İki sistem — operasyon.

```pseudo
ALGORİTMA field_charge:
  girdiler: group (hedef konteyner grubu), powerKw (santral gücü)
  Mode: sequential, onFailure: rollback
    adım 1 (UZAK): sistem "container-1" → manevra "bsc_prepare"
                   // BSC close_contactors (0x0005) + start (0x0002)
    adım 2 (UZAK): sistem "container-2" → manevra "bsc_prepare"
    adım 3 (YEREL): manevra "pcs_charge" { powerKw }
                   // PCS'lere eşit dağıtım: her PCS S06 ← −(powerKw / PCS sayısı)
    doğrulama: Grid Active Power işareti + B09/B10 limit kontrolü
    hata → geri al (ters sıra): pcs_stop + uzak bsc_stop'lar
```

```jsonc
{
  "name": "field_charge",
  "label": "Saha Şarj",
  "mode": "sequential",
  "onFailure": "rollback",
  "steps": [
    { "system": "container-1", "maneuver": "bsc_prepare" },
    { "system": "container-2", "maneuver": "bsc_prepare" },
    { "maneuver": "pcs_charge", "params": { "powerKw": 200 } },
  ],
  "rollback": [
    { "maneuver": "pcs_stop" },
    { "system": "container-1", "maneuver": "bsc_stop" },
    { "system": "container-2", "maneuver": "bsc_stop" },
  ],
}
```

```ts
// Yerel PCS manevrası (operasyonun 3. adımı):
pcs_charge:    { mode: "parallel", onFailure: "stop",
                 steps: stepsFor("charge", pcsIds), rollbackSteps: stepsFor("stop", pcsIds) },
pcs_discharge: { mode: "parallel", onFailure: "stop",
                 steps: stepsFor("discharge", pcsIds), rollbackSteps: stepsFor("stop", pcsIds) },
// kart girdileri: group (seçim), powerKw; transform: gücü adım sayısına eşit böler
```

### 5.3 FL-03 — Idle / Bekleme (MANEVRA)

**Ne yapar:** Güç sıfırlanır → akış doğrulanır → DC Block'a idle bildirimi (pasif —
konteyner akışın durduğunu kendi telemetrisinden görür; uzak komut YOK) → PCS enerjili
kalır. Yalnız PCS komutu + okuma → MANEVRA.

```pseudo
ALGORİTMA fl03_idle (MANUEL):
  adım: PCS-1..N → "set_power_zero"   // S06 ← 0
  doğrulama: |Grid Active Power| < eşik (okuma)
  NOT: "DC Block'a idle bildirimi" pasif bildirimdir — konteyner akışın durduğunu
       kendi telemetrisinden görür; uzak komut GÖNDERİLMEZ.
```

```ts
fl03_idle: { mode: "parallel", onFailure: "continue", steps: stepsFor("set_power_zero", pcsIds) },
```

### 5.4 FL-04 — Kalibrasyon (MANEVRA)

**Ne yapar:** Kalibrasyon iç algoritması DC Block'ta kendi çalışır (konteyner tarafı —
uzak komut YOKTUR); saha tarafı ön koşul olarak PCS'leri beklemeye (standby) alır ve
takvimli başlatmayı yönetir. Süre aşımı → şarj/deşarj YASAK (interlock). Güç akışı
PCS S06'dandır.

```pseudo
ALGORİTMA fl04_calibration (MANUEL):
  kart tetiklenir (zamanlı kutu mevcut) →
    adım: PCS-1..N → "standby"   // HR 3607 (S19) ← 1 — ön koşul
  izleme: hücre voltaj sapması + sıcaklıklar (BSC kaynaklı, bağlantı köprüsüyle)
  NOT: DC Block tamamlanma/fault durumunu sahaya raporlar.
```

```ts
fl04_calibration: { mode: "parallel", onFailure: "continue", steps: stepsFor("standby", pcsIds) },
// kart kontrolü: timerConfig: true (zamanlı çalıştırma)
```

### 5.5 FL-05 — Acil Durdurma (MANEVRA)

**Ne yapar:** Konteyner kendi acil durdurmasını kendi tarafında işletir ve olayı sahaya
raporlar; saha tarafı etkilenen PCS grubunu izole eder.

```pseudo
ALGORİTMA fl05_emergency_stop (MANUEL):
  kart/buton tetiklenir →
    adım 1: PCS-1..N → "stop"          // HR 3605 (S17) ← 1
    adım 2: PCS-1..N → "set_power_zero" // S06 ← 0 — setpoint sıfırlama
    doğrulama: PCS durumu = Stop; AC/DC kontaktörler açık
    ⛔ MV kesici + topraklama: motorlu değilse operatöre MANUEL talimat (arayüz bilgisi)
```

```ts
fl05_emergency_stop: { mode: "parallel", onFailure: "continue",
                       steps: [...stepsFor("stop", pcsIds), ...stepsFor("set_power_zero", pcsIds)] },
```

### 5.6 FL-06 — Recovery / Toparlanma (otomatik kural)

**Ne yapar:** E-stop düştüğünde ve arıza temizlendiğinde PCS'leri sırayla arıza-sıfırla
ve beklemeye al. Şarj/deşarj ASLA otomatik geri yüklenmez — yeni komut şarttır.
Konteyner kendi durumunu kendisi yönetir ve raporlar; uzak komut YOKTUR.

```pseudo
ALGORİTMA r06_recovery:
  koşullar = [ PCS-1."E-stop Buton Durumu" == 0  (2 sn debounce),
               PCS-1."PCS Arıza Durumu" == 0 ]
  eğer hepsi (YÜKSELEN KENAR):
    PCS-1 → "fault_reset"   // HR 3606 (S18) ← 1
    PCS-1 → "standby"       // HR 3607 (S19) ← 1
    log "auto_rule_r06_recovery" + bildirim ; cooldown 60 sn
```

```jsonc
{
  "name": "r06_recovery",
  "enabled": true,
  "cooldownMs": 60000,
  "when": {
    "all": [
      {
        "device": { "ids": ["PCS-1"] },
        "telemetry": "Emergency Stop Button Status",
        "op": "eq",
        "threshold": 0,
        "debounceMs": 2000,
      },
      {
        "device": { "ids": ["PCS-1"] },
        "telemetry": "PCS Fault Status",
        "op": "eq",
        "threshold": 0,
      },
    ],
  },
  "then": [
    { "action": "command", "deviceId": "PCS-1", "command": "fault_reset" },
    { "action": "command", "deviceId": "PCS-1", "command": "standby" },
    {
      "action": "log",
      "level": "info",
      "eventCode": "auto_rule_r06_recovery",
      "message": "FL-06 Recovery: E-stop kalkti — sistem Standby'a dondu",
    },
    { "action": "notify" },
  ],
}
```

### 5.7 FL-07 — İletişim Kaybı (otomatik kural — doküman bekleniyor)

```pseudo
ALGORİTMA r07_comm_loss:
  koşullar = [ konteyner bağlantısı kopuk/gecikmeli (saha bağlantı kaydı),
               PCS çevrimdışı ]
  eğer herhangi (YÜKSELEN KENAR):
    ilgili PCS → "stop"        // S17 ← 1
    ilgili PCS → S06 ← 0
    log + bildirim
// Aksiyon yalnız PCS'tedir — konteynere uzak komut YOKTUR (manevra seviyesi).
```

### 5.8 FL-08 / FL-09 — Black Start / Mikrogrid (DOKÜMAN BEKLENİYOR)

PCS hazırlık register'ları mevcuttur (grid-forming, primer frekans/voltaj kontrolü,
sanal atalet/sönüm, off-grid modu + parametreleri) — akış dokümanları gelince kural ve
komut seti bu register'larla kurulur.

### 5.9 FL-10 — Ada Modu / Grid Kaybı (otomatik kural — doküman bekleniyor)

```pseudo
ALGORİTMA r10_islanding:
  koşullar = [ PCS Alarm Word 3 bit9 (Islanding fault) == 1,
               PCS arıza word'ü grid aşırı/düşük gerilim-frekans bitleri ]
  eğer herhangi (YÜKSELEN KENAR):
    ilgili PCS → "stop"        // S17 ← 1
    log + bildirim
```

### 5.10 FL-11 — Bakım Modu (OPERASYON)

**Ne yapar:** DC Block (konteyner) bakım moduna alınır — bu adım konteynerde
komut/manevra ÇALIŞTIRMAYI gerektirdiği için uzak adımdır; PCS'ler durdurulur; MV tarafı
izole edilir. İki sistem — OPERASYON.

```pseudo
ALGORİTMA fl11_maintenance:
  grup seçilir →
    Mode: sequential
      adım 1 (UZAK): sistem "container-N" → manevra "bakım kapatma"
                     // BSC open_contactors (HR 40010 ← 0x0004) + DC şalter open (COIL 0 ← 1)
      adım 2 (YEREL): PCS-1..N → "stop"      // S17 ← 1
    doğrulama: PCS durumu + AC/DC kesici/kontaktör pozisyonları (okuma)
    ⛔ MV kesici + topraklama şalteri: motorlu değilse MANUEL talimat
```

```ts
// Yerel PCS manevrası (operasyonun 2. adımı):
pcs_stop: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop", pcsIds) },
```

---

## 6. Açık Sorular

> Bu bölümdeki maddeler sistem davranışını DEĞİŞTİRMEZ — mühendislik girdisi
> tamamlanınca ilgili bölümlere işlenecek açık noktalardır.

1. **Kalibrasyon için şarj/deşarj nasıl yapılacak?** Konteyner uygulamasından
   charge/discharge komutu verilemiyor — PCS saha uygulamasında. Kalibrasyon manevrası
   için şarj/deşarj şart. Seçenekler: (a) kalibrasyon manevrası **saha uygulamasına
   taşınır**, (b) konteyner uygulaması şarj/deşarj için **saha uygulamasına istek
   gönderir**.
2. **FL-09 İletişim Kaybı veri kaynağı:** konteyner ↔ saha arası soket tünel
   bağlantısının var/yok verisi yeterli mi, yoksa ek bir cihaz okuması/ekipman sinyali
   mi kullanılacak?
3. **FL-12 FSS (konteyner):** yangın söndürme panelinin akış dokümanı bekleniyor
   (kuru kontak girişleri hazır).
4. **FL-08/FL-09 (saha):** Black Start ve Mikrogrid prosedür dokümanları bekleniyor
   (PCS register hazırlığı mevcuttur).
5. **Kalibrasyon takvimi (saha FL-04):** takvim verisinin kaynağı bekleniyor (operatör
   girişi mi, üst sistem mi) — kalibrasyonun nerede yaşayacağı **soru 1'e bağlıdır**;
   süre aşımı interlok'u bu kaynağa bağlanır.
6. **Eşik değerleri (varsayılanlarla çalışıyor):** AUX kayıp eşiği 180 V / 5 sn ·
   DC kısa devre debounce 1 sn (reset eşiği tanımsız) · IMD alarm bitleri esas
   (R eşiği tanımsız).
