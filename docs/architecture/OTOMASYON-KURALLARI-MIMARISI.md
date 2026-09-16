---
status: active
space: architecture
tags: [mimari, otomasyon, kural-motoru, manevra, FL, spec]
review_date: 2026-09-15
---

# Otomasyon Kuralları — Mimari Tasarım (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Kaynaklar:** `~/Downloads/080726/` — `GD-EMS_FL-XX_*.drawio` (enerji mühendisi akış diyagramları) + `Functional_Logic_Matrix_210626_MC_V1.xlsx` (fonksiyonel mantık matrisi: cihaz/register/aksiyon/değer/koşul/öncelik).
> **Durum:** ANALİZ + PLAN. **Geliştirme YAPILMAMIŞTIR** — §4'teki eksikler tamamlandıktan sonra tüm kurallar TEK SEFERDE uygulanacak (kurallar + config'ler + testler birlikte).
> **İlişkili:** [MANAGEMENT-SERVICE-MIMARISI.md](./MANAGEMENT-SERVICE-MIMARISI.md) (kural motoru altyapısı — Faz 0 tamamlandı), [MANEVRA-SISTEMI-MIMARISI.md](./MANEVRA-SISTEMI-MIMARISI.md).

---

## İçindekiler

1. [Kapsam ve Karar](#1-kapsam-ve-karar)
2. [FL Analizleri (akış → tetikleyici → aksiyon → veri)](#2-fl-analizleri)
3. [Taslak Kural Seti (rules.json)](#3-taslak-kural-seti-rulesjson)
4. [Eksikler Envanteri (uygulama öncesi iş listesi)](#4-eksikler-envanteri)
5. [Mühendis Ekibine Açık Sorular](#5-mühendis-ekibine-açık-sorular)
6. [Kabul Kriterleri ve Görev Listesi (uygulama gününe hazır)](#6-kabul-kriterleri-ve-görev-listesi)

---

## 1. Kapsam ve Karar

**Kapsam:** Control sayfasında manevra kartı OLMAYAN (gizli) manevraların çalışma koşulları draw.io + matrix'ten çıkarılmıştır. Kartı görünür olanlar (FL-01, FL-03, FL-04 şarj/deşarj, FL-05 force kartları, FL-10, fl_dc_breaker_close, fl_contactor_close) **manuel kalır** — ancak tanım sapmaları §2'de not olarak işaretlenmiştir.

**Karar (2026-09-15):** Veri kaynağı eksik olan FL'ler için şimdilik KOD YAZILMAZ. Eksik cihaz config'leri/sinyaller tamamlandıktan sonra §3'teki taslak kural seti bütün halinde uygulanır. Bu doküman o günün Aşama-1 SPEC'idir.

**Gizli manevraların otomasyon durumu:**

| FL | İsim | Tetikleyici | Otomasyon durumu |
|:---|:-----|:------------|:-----------------|
| FL-02 | AUX Kaybı | AUX enerji kaybı (AUX Analyser) | ⛔ EKSİK — cihaz yok |
| FL-05 | TMS normal kontrol | Hysteresis eşikleri (25/23, 17/20, 75/60) | ✅ UYGULANABİLİR (dehumid hariç) |
| FL-05 | TMS korumalar | Aşırı sıcak/soğuk/nem/sıcaklık farkı | ✅ UYGULANABİLİR (30264/30265 yaklaşımıyla) |
| FL-06 | Şarj/Deşarj | Üst EMS komutu (koşul DEĞİL) | ⏸ Otomatik kapsam DIŞI — EMS entegrasyonu |
| FL-07 | Kapı Açık | Batarya/panel kapısı açık | ⛔ EKSİK — kapı kontaktı yok |
| FL-08 | DC Kısa Devre | V>1500V / I>1680A / P>1784kW | ✅ UYGULANABİLİR (EMU DC kaynağı — doğrulama sorusu) |
| FL-09 | İletişim Kaybı | PPC koptu / ekipman koptu | ⛔ EKSİK — sinyal yok |
| FL-11 | Toprak Direnci | IMD izolasyon bozuk / IMD koptu | ⛔ EKSİK — IMD yok |
| FL-12 | FSS Modu | (doküman boş) | ⛔ EKSİK — doküman + cihaz yok |

---

## 2. FL Analizleri

### FL-02 — AUX Kaybı (P1-Critical)

**Akış (draw.io, sıralı):** AUX Energy Loss → (sadece kontrol ekipmanları enerjili kalır — AUX panel tasarımı gereği) → üst EMS + kullanıcıya bilgi → üst EMS PCS'i kapatma emri verir → DC şalter AÇ (de-enerjize) → BSC kontaktörleri AÇ → AUX dönene kadar IDLE bekle → kayıp sürerse → Safe Shutdown + bilgilendir.

**Aksiyonlar (matrix):**
- DC Switch: Write **Open** (P1-Critical) — de-enerjize
- BSC: HR 40010 → **0x0004 Open Contactor** (P1-Critical) → config komutu: `open_contactors`
- Bilgilendirme + idle bekleme + koşul sürerse safe shutdown

**Veri:** AUX Analyser cihazı (Energy Status okuma) — **hiçbir config'te YOK**.

**Mevcut tanım hatası:** `fl02_aux_loss` = `bscStop + dcOff(DC-1/DC-2) + cbOpen`. Dokümana göre: DC-Output'lar DEĞİL, DC şalter (CB) + **BSC `open_contactors` (0x0004)**; "inform EMS" aksiyonu yok.

### FL-05 — TMS: Normal Kontrol Döngüleri (P1-Critical)

**Kaynak:** draw.io + xlsx Condition kolonu (HVAC 0x1008 = return air temp, 0x1005 = return humidity):

| Kural | ON | OFF | Komut |
|:------|:---|:----|:------|
| Soğutma | Return Temp **≥ 25°C** | Return Temp **< 23°C** | `force_cool` → normal moda dönüş: `on` |
| Isıtma | Return Temp **≤ 17°C** (düşerken 17'ye ulaşınca) | Return Temp **≥ 20°C** | `force_heat` → `on` |
| Nem alma | Return Humidity **≥ 75%** | **≤ 60%**; dehumid durdurma sıcaklığı: return temp 19°C | ⛔ komut YOK |

**Not:** draw.io'da ısıtma ">= 17" yazar; xlsx daha net: "reaches 17°C" (düşüşte) + "rises to 20°C" (kapanış). **xlsx esas alınmıştır.**

**Veri:** ✅ HVAC `Current Temp` (addr 4104 = 0x1008 — "Return air temperature in the cabinet" eşlemesi kanıtlı), `Return Humidity` (addr 4101 = 0x1005). **Dikkat:** HVAC başına ayrı sensör — kurallar cihaz BAŞINA mı yoksa "herhangi bir HVAC" bazlı mı? (Bkz. §5 soru S2.)

### FL-05 — TMS: Koruma Kapıları (P1-Critical)

**Tetikleyiciler (draw.io kapıları + matrix register'ları):**

| Koruma | Koşul (OR) | Aksiyon |
|:-------|:-----------|:--------|
| Aşırı sıcak | Oda > 29°C için **15 dk** VEYA Max Pack Temp > 50°C için **5 dk** VEYA Max Pack Temp > 75°C için **45 sn** | Force HVAC soğutma + **blok** + Overheat Alarm |
| Aşırı soğuk | Oda < 10°C için **15 dk** VEYA Min Pack Temp < 15°C için **5 dk** VEYA Min Pack Temp < 5°C için **45 sn** | Force HVAC ısıtma + **blok** + Overcold Alarm |
| Nem | Return Humidity **≥ 85%** | Humidity Alarm + **blok** |
| Sıcaklık farkı | Rack farkı **≥ 10°C** (30264) VEYA Pack farkı **≥ 5°C** (30265) | Uyar + **blok** + reset beklenir |
| HVAC arızası | Herhangi bir HVAC fault biti | Uyar + **blok** |

**"Blok" semantiği:** "Do not Accept Charge/Discharge Command. Stop if executed" → PCS `forbid_charge` + `forbid_discharge` + BSC `stop`. (Blok kaldırma komutu — bkz. §4.6.)

**Veri:** ✅ `Max Pack Temp`/`Min Pack Temp` (BSC, 30149/30151 eşleşmesi), ✅ HVAC `Current Temp` (oda sıcaklığı kaynağı — S3 doğrulaması), ✅ `Return Humidity`. ⛔ BSC global 30264/30265 ("Max Difference of Temperature in Rack/Pack — among online racks") config'te YOK — per-rack `Rack Max Diff Temp R1..R8` / `Rack Max Diff Temp Pack R1..R8` mevcut; yaklaşım: herhangi bir rack eşiği aşarsa. HVAC fault bitleri: `Compressor Fault`, `Fan Fault`, `Heater Fault`, `Sensor Fault`, `High/Low Pressure Alarm` vb. ✅ mevcut.

**Mevcut tanım hatası:** `fl05_tms_block_charge` = yalnızca `bscStop()` — blok semantiği (PCS forbid) + force cooling/heating + alarm + üç kademeli süreler eksik.

### FL-06 — Şarj/Deşarj (P1-Critical) — ⏸ OTOMATİK DIŞI

**Akış:** Üst EMS komutu → önkoşul kontrolü:
1. BSC kontaktörler kapalı + DC CB kapalı → açıksa **otomatik kapat**
2. HVAC uygun + FSS uygun + oda/pil sıcaklıkları normal
3. Grid var + PCS uygun
→ AND GATE → üst EMS'e bilgi + PCS'e planlanan şarj/deşarj komutu → bitince kullanıcıya DC CB pozisyon tercihi sorulur.

**Neden otomatik dışı:** Tetikleyici bir KOŞUL değil, üst EMS komutu — boss/EMS entegrasyonunun konusu. Önkoşul kapısı ("istek gelince açık elemanı otomatik kapat") ileriki fazda, EMS komut sinyali tanımlanınca ele alınır.

**Veri:** ✅ CB `Is Closed`, ✅ HVAC `Equipment Status`, ✅ PCS `Status Word`/`Alarm Word`; ⛔ FSS availability, ⛔ grid durumu sinyali (adaylar: PCS `AC Voltage`/`Frequency`, EMU `Station State`, PM5340 — S4), ⛔ BSC kontaktör durumu (aday: BSC State bitfield — S5).

### FL-07 — Kapı Açık (P2-Major)

**Akış:** Kapı durumu izle → Batarya kapısı VEYA Panel kapısı AÇIK → kullanıcıyı uyar → batarya odası ışıkları AÇ (kapı kapanınca kapat) → panel odası ışıkları AÇ → PCS/grid/BSC durumunu kontrol et → şarj/deşarj çalışıyorsa DURDUR → erişim logu (kim/konum/aksiyon + timestamp).

**Veri:** ⛔ kapı kontakt telemetrisi YOK (matrix: "Control Panel | IO | Write | Open/Close Lights" — DO çıkışları). Eksik: kapı durum girişi (DI) + ışık kontrolü (DO) config'leri.

**Mevcut tanım hatası:** `fl07_door_open` = yalnızca `bscStop()` — ışık kontrolü, uyarı, erişim logu eksik.

### FL-08 — DC Kısa Devre Koruması (P1-Critical) — ✅ UYGULANABİLİR

**Akış:** DC metreyi sürekli izle → OR GATE: **V > 1500 VDC** VEYA **I > 1680 A** VEYA **P > 1784 kW** → DC şalter AÇ + BSC kontaktör AÇ + PCS durdur + Alarm + kullanıcı/EMS bilgilendir → servis gelene kadar bekle → tetikleyici koşul kalkınca normal işletime dönüş (matrix notu: ">1500 VDC <1000 VDC" — muhtemel reset eşiği 1000V; S6 doğrulaması).

**Aksiyon karşılıkları:** CB `open` ✓ · BSC `open_contactors` ✓ · PCS `stop` ✓.

**Veri:** ✅ EMU `DC Average Voltage`, `DC Current`, `DC Power`. Kaynak doğrulaması: matrix "DC Meter | IO" der — ayrı DC metre mi, EMU mu? (S7.)

**Mevcut tanım hatası:** `fl08_dc_fault` = `bscStop + cbOpen` — PCS `stop` eksikti; BSC komutu `stop` yerine `open_contactors` (0x0004) olmalı.

### FL-09 — İletişim Kaybı (P1-Critical)

**Akış:** PPC bağlantısı koptu VEYA herhangi bir ekipman bağlantısı koptu → şarj/deşarj YÜRÜTME, kullanıcıya bilgi + logla → idle bekle → koşul bitince normal işletime devam.

**Veri:** ⛔ PPC durum sinyali YOK. Ekipman kopması = device-service `devices.status='offline'` + `device_offline` logu — ancak bu MANAGEMENT snapshot'ına yansımıyor (telemetri değil). Eksik: offline durumunun kural girdisine dönüştürülmesi (§4.3).

**Mevcut tanım hatası:** `fl09_comm_loss` = `bscStop()` — PPC/ekipman ayrımı ve "blok" semantiği yok.

### FL-11 — Toprak Direnci Hatası (P2-Major)

**Akış:** IMD verisini sürekli izle + yedekle → IMD iletişim kaybı VEYA izolasyon değeri ideal değil → koşul bitene kadar sistemi DURDUR → Alarm + garanti için veri logla.

**Veri:** ⛔ IMD cihazı YOK.

**Mevcut tanım hatası:** `fl11_ground_fault` = `bscStop + cbOpen` — IMD veri kaynağı/backup logu eksik; komut karşılığı matrix'te BSC `open_contactors` (0x0004).

### FL-12 — FSS Modu (doküman yetersiz)

Draw.io yalnızca başlık + lejant içeriyor; matrix'te tek satır "FL-12 FSS". FL-01/FL-06'da "FSS availability" önkoşul olarak okunuyor. **Mühendislere soru** (S8): akış dokümanı + FSS cihaz config'i.

### Manuel kalanlar — tanım sapma notları (bilgi için)

| FL | Sapma |
|:---|:------|
| FL-03 Acil Durdur | Doküman: DC şalter **dry contact** ile mekanik açılır (EMS fonksiyonu YOK); BSC'ye **0x0001 Emergency** yazılır (config `emergency` komutu var); blinker + blok + yetkilendirme akışı. Mevcut tanım `bscStop+dcOff+cbOpen` dokümandan sapıyor (manuel kalır — uygulama gününde düzeltme adayı) |
| FL-04 Kalibrasyon | Manuel kalır. Ancak "kalibrasyon dönemi kaçırıldı → FAULT + charge/discharge kabul etme" kısmı **otomatik kural adayı** (takvim verisi gerekir — ileriki faz) |
| FL-10 Bakım | Doküman: PCS idle + grid normal AND kapısı → onay bekle → şarj/deşarj kabul etme + BSC `open_contactors` + CB open + veri yedekle → safe shutdown. Mevcut tanım `bscStop+cbOpen` — `open_contactors` eksik |
| FL-01 Başlatma | Doküman önkoşul kapısı: DC şalter açık + AUX var + HVAC uygun + FSS uygun + uyarı/alarm yok → BSC Start (0x0002) → idle bekle. Mevcut tanım `cbOpen+bscCharge(0)+dcOn` — önkoşul kapısı yok (manuel kalır) |

---

## 3. Taslak Kural Seti (rules.json)

> Uygulanabilir kurallar tam hazır; ⛔ işaretliler eksik tamamlanınca aynı dosyaya girecek. "Blok" aksiyon seti her koruma kuralında tekrar eder (şema çoklu command aksiyonu destekler).

```jsonc
// FL-05 TMS — normal kontrol (hysteresis çiftleri; her HVAC için ayrı kural —
// S2 kararına göre "any-device" varyantına geçilebilir)
{ "name": "tms_cool_on",  "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "gte", "threshold": 25 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "force_cool" } ], "cooldownMs": 60000 },
{ "name": "tms_cool_off", "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "lt", "threshold": 23 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "on" } ], "cooldownMs": 60000 },
{ "name": "tms_heat_on",  "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "lte", "threshold": 17 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "force_heat" } ], "cooldownMs": 60000 },
{ "name": "tms_heat_off", "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "gte", "threshold": 20 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "on" } ], "cooldownMs": 60000 },
// (HVAC-2..HVAC-8 için aynı çiftler; dehumid ⛔ — komut yok, §4.5)

// FL-05 TMS — korumalar (blok = PCS forbid + BSC stop; 3 kademeli debounce)
{ "name": "tms_overheat_protect", "cooldownMs": 900000,
  "when": { "any": [
    { "device": { "types": ["hvac"] }, "telemetry": "Current Temp", "op": "gt", "threshold": 29, "debounceMs": 900000 },
    { "device": { "types": ["bsc"] },  "telemetry": "Max Pack Temp", "op": "gt", "threshold": 50, "debounceMs": 300000 },
    { "device": { "types": ["bsc"] },  "telemetry": "Max Pack Temp", "op": "gt", "threshold": 75, "debounceMs": 45000 }
  ]},
  "then": [
    { "action": "command", "deviceId": "HVAC-1", "command": "force_cool" }, /* ...HVAC-8 */
    { "action": "command", "deviceId": "PCS-1", "command": "forbid_charge" },
    { "action": "command", "deviceId": "PCS-1", "command": "forbid_discharge" },
    { "action": "command", "deviceId": "BSC-1", "command": "stop" },
    { "action": "command", "deviceId": "BSC-2", "command": "stop" },
    { "action": "log", "level": "error", "eventCode": "auto_rule_tms_overheat" },
    { "action": "notify" }
  ]},

// FL-05 overcold + humidity + temp-diff (aynı blok kalıbı):
// - tms_overcold_protect: Oda<10 (15dk) / Min Pack Temp<15 (5dk) / <5 (45sn) → force_heat + blok
// - tms_humidity_alarm:    Return Humidity >= 85 → blok + alarm (dehumid ⛔)
// - tms_temp_diff_protect: any rack "Rack Max Diff Temp R1..R8" >= 10 VEYA
//   "Rack Max Diff Temp Pack R1..R8" >= 5 → blok + warn (30264/30265 yaklaşımı — §4.4)

// FL-08 DC kısa devre koruması (EMU DC kaynağı — S7; debounce önerisi 1-5 sn — S6)
{ "name": "fl08_scf_trip", "cooldownMs": 3600000,
  "when": { "any": [
    { "device": { "ids": ["EMU-1"] }, "telemetry": "DC Average Voltage", "op": "gt", "threshold": 1500, "debounceMs": 1000 },
    { "device": { "ids": ["EMU-1"] }, "telemetry": "DC Current", "op": "gt", "threshold": 1680, "debounceMs": 1000 },
    { "device": { "ids": ["EMU-1"] }, "telemetry": "DC Power", "op": "gt", "threshold": 1784, "debounceMs": 1000 }
  ]},
  "then": [
    { "action": "command", "deviceId": "CB-1", "command": "open" },
    { "action": "command", "deviceId": "CB-2", "command": "open" },
    { "action": "command", "deviceId": "BSC-1", "command": "open_contactors" },
    { "action": "command", "deviceId": "BSC-2", "command": "open_contactors" },
    { "action": "command", "deviceId": "PCS-1", "command": "stop" },
    { "action": "log", "level": "error", "eventCode": "auto_rule_fl08_scf" },
    { "action": "notify" }
  ]}

// ⛔ FL-02 (AUX cihazı yok), ⛔ FL-07 (kapı kontaktı yok), ⛔ FL-09 (PPC/offline
// sinyali yok), ⛔ FL-11 (IMD yok), ⛔ FL-06 (EMS komutu — otomatik dışı):
// dokümantasyon yeri burası; uygulama gününde §4 eksikleriyle birlikte girecek.
```

---

## 4. Eksikler Envanteri

| # | Eksik | Etkilenen | Çözüm yolu |
|:--|:------|:----------|:-----------|
| 4.1 | **AUX Analyser** cihaz config + simülatör (Energy Status okuma) | FL-02 | Enerji mühendisinden register map; device config + simülatör üretimi |
| 4.2 | **Kapı kontaktları** (Batarya/Panel Door DI) + **ışık kontrolü** (Control Panel DO) config | FL-07 | Control Panel IO register haritası; DI girişleri telemetriye, DO çıkışları komuta bağlanır |
| 4.3 | **PPC bağlantı durumu** sinyali + **ekipman offline** durumunun kural girdisi | FL-09 | PPC: web-service field-uplink/tunnel durumu → synthetic telemetry (ManagementService'e özel kaynak tasarımı); ekipman offline: `devices.status` → kural girdisine dönüştürme (seçenek: device-service offline/online geçişinde synthetic MANAGEMENT telemetrisi) |
| 4.4 | BSC global **30264/30265** (rack geneli maks. sıcaklık farkı) telemetrisi | FL-05 | Config'e 30264/30265 eklenecek (per-rack R1..R8 yaklaşımı geçici); doğrulama S9 |
| 4.5 | HVAC **dehumidification** komutu (on/off/force_cool/force_heat var) | FL-05 nem kontrolü | HVAC register haritasında dehumid komut register'ı; config + simülatör |
| 4.6 | **Blok kaldırma** komutu: PCS `forbid_charge/forbid_discharge` geri alma (`allow_*`) | FL-05/FL-08 sonrası normal işletime dönüş | PCS config'e allow komutları VEYA forbid register'ına yazılacak değer kontratı (S10) |
| 4.7 | **FSS** cihaz config + FL-12 dokümanı | FL-01/FL-06 önkoşulu, FL-12 | Mühendis ekibi — S8 |
| 4.8 | **EMS komut sinyali** (FL-06 tetikleyicisi) | FL-06 | Boss/EMS entegrasyon tasarımı (ayrı iş) |
| 4.9 | **Kalibrasyon takvimi** verisi (FL-04 "dönem kaçırıldı → blok" kuralı) | FL-04 (otomasyon yönü) | Takvim/yapılandırma kaynağı — ileriki faz |
| 4.10 | Canonical tag eklemeleri (rule okunabilirliği) | FL-05/FL-08 | `Current Temp`→`room_temp`, `Return Humidity`→`humidity`, `Max/Min Pack Temp`, EMU DC değerleri — opsiyonel, kurallar ad bazlı da çalışır |

---

## 5. Mühendis Ekibine Açık Sorular

| # | Soru | Etki |
|:--|:-----|:-----|
| S1 | FL-02 "Upper Level EMS issues an order to shut down the PCS" — PCS kapatma EMS'ten mi beklenir, yoksa AUX kaybı algılanınca EMS (biz) doğrudan açtırır mıyız? | FL-02 kural akışı |
| S2 | HVAC kontrol kuralları **cihaz başına** mı (her kabin kendi sensörüyle) yoksa **herhangi bir HVAC** aşarsa tümü mü zorlanır? | FL-05 normal kontrol kural topolojisi |
| S3 | "Room Temperature" sensörü hangi kaynak? (Öneri: HVAC return air = `Current Temp` 0x1008 — matrix bu adresle eşleşiyor) | FL-05 koruma eşikleri |
| S4 | FL-06 önkoşulundaki "Grid is available" hangi sinyalden? (Aday: PCS AC Voltage/Frequency, EMU Station State, PM5340) | FL-06 önkoşul kapısı |
| S5 | "BSC Contactors are closed" hangi telemetriden? (BSC State bitfield'ı mı?) | FL-06 önkoşul kapısı |
| S6 | FL-08 trip debounce süresi (öneri 1 sn) ve reset eşiği ("<1000 VDC" mi?) nedir? | FL-08 kural parametreleri |
| S7 | FL-08 ölçüm kaynağı: EMU DC değerleri mi, ayrı DC metre mi? | FL-08 veri kaynağı |
| S8 | FL-12 FSS akış dokümanı ve FSS cihaz config'i ne zaman? (FL-01/FL-06'da availability önkoşulu) | FL-12 + önkoşullar |
| S9 | 30264/30265 global register'ları BSC config'ine eklensin mi (per-rack R1..R8 yerine)? | FL-05 sıcaklık farkı kuralı |
| S10 | PCS forbid kaldırma kontratı (allow komutu / register değeri) nedir? | Tüm "blok" kurallarının geri dönüşü |

---

## 6. Kabul Kriterleri ve Görev Listesi

**Uygulama günü (eksikler tamamlanınca) — 6 aşamalı iş akışı devam eder:**

| Aşama | Görev |
|:------|:------|
| 1. SPEC | Bu doküman + mühendis cevaplarıyla güncelleme |
| 2. JSDoc | Gerekirse şema uzantısı (örn. "blok" aksiyonu, synthetic telemetry kontratı — §4.3) |
| 3. TEST | `automation-rules.spec.ts` — rules.json zod doğrulaması + her FL için senaryo testi (sentetik telemetri → RuleEvaluator ateşleme assert, fake timers; eşik sınırları: 29.9/30.0 gibi) |
| 4. IMPL | `rules.json` (§3 tamamı) + eksik config'ler + gerekirse synthetic sinyal kaynağı |
| 5. SONUÇ | `MANAGEMENT-SERVICE-DOGRULAMA.md`'ye giriş |
| 6. KAPSAM | `MANAGEMENT-SERVICE-TEST-KAPSAMI.md` + `test-envanteri.md` güncelleme |

**Kabul kriterleri (uygulama gününde kanıtlanacak):**
- K-A1: Her uygulanabilir FL kuralı, dokümanda yazılı eşik/süre ile birebir eşleşir (senaryo testi).
- K-A2: Blok aksiyon seti (PCS forbid + BSC stop) her koruma kuralında tamdır.
- K-A3: Kenar-tetik: koşul aktifken kural tekrarlanmaz; düşüş-yükselişte cooldown uygulanır (mevcut RuleEvaluator garantisi — testle sabitlenir).
- K-A4: Eksik FL'ler (⛔) rules.json'da YOKTUR — yanlış veriyle kural çalışmaz (fail-safe).
- K-A5: Gizli manevra tanımları (`maneuvers.ts` `HIDDEN_MANEUVER_NAMES` içeriği) kurallar canlıya alınınca kaldırılır; `fl_idle`/`fl_bsc_power` legacy bağımlılığı (`ControlPanel.tsx`) netleştirilir.
- K-A6: Kapılar: yeni kod ≥%70 satır; kural seti spec'i ≥%90 branch; monorepo test yeşil.

**Temizlik notu:** `apps/container-web/src/features/control/components/ControlPanel.tsx` hâlâ `MANEUVERS.fl_idle` kullanıyor (AGENTS.md'de "kaldırıldı" denmişti — dosya duruyor); kural uygulama gününde manevra temizliğiyle birlikte ele alınır.
