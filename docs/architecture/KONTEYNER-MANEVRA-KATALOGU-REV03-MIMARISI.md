---
status: active
space: architecture
tags: [mimari, manevra, konteyner, katalog, otomasyon, FL, spec]
review_date: 2026-09-17
---

# Konteyner Manevra Kataloğu ve Otomasyon Kuralları — REV.03 (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Kaynaklar:** `~/Downloads/080726/` — `GD-EMS_FL-XX_*.drawio` (enerji mühendisi akış diyagramları) + `Functional_Logic_Matrix_210626_MC_V1.xlsx` (fonksiyonel mantık matrisi: cihaz/register/aksiyon/değer/koşul/öncelik) + `docs/devices/` cihaz manuelleri.
> **Durum:** **UYGULAMA ONAYI BEKLİYOR.** Geliştirme YAPILMAMIŞTIR — developer bu SPEC'i kontrol edip onaylayınca Faz 1-4 başlar (AGENTS.md kapısı: "SPEC yazılır → implementasyon developer onayı BEKLER").
> **Geçmiş:** REV.01/02 — OTOMASYON-KURALLARI-MIMARISI (kural seti taslağı); REV.03 (2026-09-17) — konteyner cihaz envanteri sabitlendi, 11 karar, FL veri kaynakları revize edildi, kural seti `command` aksiyon modeline çevrildi, PCS mimari düzeltmesi (K10/K11), S9/S10 kapanışı, BSC→PCS connector EMU çapraz etkisi (A7). REV.03 yeniden adlandırma ile katalog dokümanına dönüştü: §2 her FL için algoritma (pseudo-code) + komut/manevra veri yapıları + register eşlemesi; §3.2 manuel tetik yapıları eklendi.
> **İlişkili:** [MANAGEMENT-SERVICE-MIMARISI.md](./MANAGEMENT-SERVICE-MIMARISI.md) (kural motoru altyapısı — Faz 0 tamamlandı), [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md) (field tier kataloğu — PCS/Wattox), [PCS-WATTOX-MIMARISI.md](./PCS-WATTOX-MIMARISI.md), [BSC-PCS-CONNECTOR-MIMARISI.md](./BSC-PCS-CONNECTOR-MIMARISI.md), [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](./KOMUT-MANEVRA-OPERASYON-MIMARISI.md).

---

## İçindekiler

0. [Konteyner Cihaz Envanteri](#0-konteyner-cihaz-envanteri)
1. [Kapsam ve Kararlar](#1-kapsam-ve-kararlar)
2. [FL Analizleri — Algoritma + Veri Yapıları + Register Eşlemesi](#2-fl-analizleri--algoritma--veri-yapıları--register-eşlemesi)
3. [Tetikleme Yapıları (rules.json + manuel katalog)](#3-tetikleme-yapıları-rulesjson--manuel-katalog)
4. [Eksikler Envanteri](#4-eksikler-envanteri)
5. [Mühendis Ekibine Açık Sorular](#5-mühendis-ekibine-açık-sorular)
6. [Kabul Kriterleri ve Görev Listesi](#6-kabul-kriterleri-ve-görev-listesi)

---

## 0. Konteyner Cihaz Envanteri

Manuel seti (`docs/devices/`) ↔ mevcut sistem eşleşmesi — **2026-09-17 developer incelemesiyle sabitlenmiştir:**

| Manual (docs/devices) | Gerçek cihaz | Adet | Mevcut config | Durum |
|---|---|---|---|---|
| `20250730_Flex_BSC_Modbusmap_JF1_Rev_AF.xlsx` | BSC | 2 | bsc-1/2 | ✅ doğru (dokunma) |
| `MC90HDNC1R-L ...pdf` | HVAC | 8 | hvac-1..8 | ✅ doğru (dokunma) |
| `SYW6GZ-4000 ...pdf` | DC Şalter (switch-disconnector) | 2 | cb-1/2 | ⚠️ **REWORK** — kesici→şalter modeli (K2) |
| — | DC Output | 2 | dc-output-1/2 | ✅ doğru (dokunma) |
| `537 DJSF1352-RN ...pdf` | DC Metre | 1 | ❌ yok | **YENİ** — `dc-meter-1`; EMU-1 **KALDIRILIR** (K1) |
| `PM5340` (energy-analyzer) | AUX analizörü | 1 | pm5340-1 | ✅ TEK AUX cihazı olur; aux-analyser-1 **KALDIRILIR** (K3) |
| `isoPV1685RTU_D00504 ...pdf` | IMD | 1 | imd-1 | ⚠️ **REWORK** — gerçek register map (K4) |
| `EP203 ...pdf` | FSS paneli | 1 | fss-1 | ⚠️ **REWORK** — kuru kontaklar IO modülü DI'larına taşınır; fss-1 **KALDIRILIR** (K5) |
| — (kapı sensörleri + ışıklar) | DI/DO IO modülü | — | control-panel-io-1 | ✅ hazır (kapı DI + ışık DO) |
| — | PCS (Wattox MPCS) | — | konteynerde **YOK** (K10) | field device-service: `config-field/pcs-1.json` + `wattox-pcs` simülatörü + BSC→PCS connector — konteyner config-docker'daki ESKİ `pcs-1.json` KALDIRILIR (K11) |

Araştırma sonucu (adetler): IMD = galvanik bağlı DC sistem başına **1** (Bender: tek ISOMETER/galvanik sistem); AUX analizörü = AUX trafo başına **1**; DC metre = DC bara başına **1**. Konteyner başına: 1 dc-meter, 1 PM5340, 1 IMD, 2 şalter, 2 DC output.

---

## 1. Kapsam ve Kararlar

**Kapsam:** Konteyner içi manevraların TAM kataloğu: draw.io + matrix'ten çıkarılmış otomasyon (kural) koşulları VE manuel kartlar. Field tier (PCS/Wattox) konusu DEĞİLDİR — field kataloğu `FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md`'dedir.

**Kararlar (REV.03 — 2026-09-17 developer onayı):**

| # | Karar |
|:--|:------|
| K1 | **FL-08 kaynağı = DC Metre (DJSF1352).** EMU-1 ve `emu` simülatörü kaldırılır; DC V/I/P yalnız `DC-METER-1`'den okunur. Sistem agregatı telemetrisi (SOC/SOH) BSC kaynaklarından gelir. |
| K2 | **CB → SYW6GZ şalter modeli.** Trip semantiği (`Is Tripped`, akım, sıcaklık, trip sayacı, eşikler, `reset` komutu) KALDIRILIR. Yeni model: aux kontaklar (`Is Closed` / `Is Open`) + `open` (shunt trip coil DO) + `close` (closing coil DO). Etki: cb config+simülatör, `CBCard` UI, BscPage/DashBoardPage/ScadaDashboardPage, field `mockDataGenerator`, manevra tanımları. |
| K3 | **AUX = PM5340 tek cihaz.** aux-analyser-1 config + simülatör silinir; FL-02 PM5340'tan okur. |
| K4 | **IMD gerçek register map.** Bender "iso1685 Modbus setting" (D00272) dokümanı indirilip `docs/devices/`'a eklenir; R + Alarm1/Alarm2/Device Error gerçek adreslerle işlenir. Bulunamazsa mevcut soyut map + alarm bitleri eklenir (sapma notu düşülür). |
| K5 | **FSS kuru kontaklarla.** fss-1 config + simülatör silinir; control-panel-io'ya FSS DI'ları (`System OK`, `Fault`, `Discharged`, `2nd Stage`) eklenir. |
| K6 | **Kural aksiyon modeli = `command`** (mevcut motor). Kurallar `command` + `log` + `notify` listeleri taşır. KURAL-MOTORU-V2 (`maneuver` aksiyonu) ve KOMUT-MANEVRA-OPERASYON (maneuvers.json) implementasyonu **bu işin kapsamı DIŞIDIR**; ileride `maneuver` aksiyonu gelince kurallar taşınır. |
| K7 | **FL-09 defer** — cihaz offline durumunun kural girdisine çevrilmesi (synthetic sinyal) bu turda YOK; FL-09 ⛔ kalır. |
| K8 | **FL-05 normal kontrol topolojisi = HVAC başına kural** (8 HVAC × 4 = 32 kural). Kabinler kendi sensörleriyle bağımsız kontrol edilir. |
| K9 | **E2E kapsamı:** `automation-rules.spec.ts` (telemetri job → kural ateşleme → COMMAND job + TamperLogger audit assert) + mevcut e2e'lerin cihaz değişimine uyumu. FL başına ayrı UI e2e YOK. |
| K10 | **PCS konteyner tier'da YOKTUR.** Wattox PCS field device-service'indedir. Konteyner kuralları ASLA PCS'e komut yazmaz — "PCS durdur" adımları konteyner kural setinde YER ALMAZ (field tier notu). |
| K11 | **Legacy konteyner PCS kaldırılır:** eski `pcs-1.json` (tip `pcs`, `forbid_*`/`allow_*` komutları) + `SimulatorRegistry`'deki eski `PcsSimulator` kaydı silinir. |
| K12 | **BSC'de charge/discharge komutu YOKTUR** (Flex Rev AF haritasında 0x000B kaldırıldı — güç PCS tarafından kontrol edilir). Konteyner kataloğundaki `fl_bsc_power`/`fl04_calibration_*`/`fl06_*` kartlarının BSC charge/discharge adımları HEDEFTE KALDIRILIR — şarj/deşarj field FL-02 OPERASYONU'dur (KOMUT-MANEVRA-OPERASYON §6.1). |

**Manevra otomasyon durumu:**

| FL | İsim | Tetikleyici | Tip | Otomasyon durumu |
|:---|:-----|:------------|:----|:-----------------|
| FL-01 | Başlatma | — | MANUEL kart | manuel kalır (önkoşul kapısı sapma notu) |
| FL-02 | AUX Kaybı | PM5340 voltaj düşümü | OTO + gizli kart | ✅ UYGULANABİLİR |
| FL-03 | Acil Durdur | buton | MANUEL kart | manuel kalır (dry contact sapma notu) |
| FL-04 | Kalibrasyon | operatör | MANUEL kart | manuel kalır; BSC charge adımları ⛔ kaldırılır (K12) |
| FL-05 | TMS normal | hysteresis (25/23, 17/20) | OTO (32 kural) + force kartları | ✅ UYGULANABİLİR (dehumid hariç) |
| FL-05 | TMS koruma | sıcak/soğuk/nem/fark | OTO (4 kural) | ✅ UYGULANABİLİR (30264/30265 per-rack mevcut) |
| FL-06 | Şarj/Deşarj | üst EMS komutu | ⏸ OTO DIŞI — field FL-02 OPERASYONU (K12) | kartlar hedefte kaldırılır |
| FL-07 | Kapı Açık | kapı DI | OTO + gizli kart | ✅ UYGULANABİLİR (DI hazır) |
| FL-08 | DC Kısa Devre | V>1500 / I>1680 / P>1784 | OTO + gizli kart | ✅ UYGULANABİLİR (kaynak: DC Metre) |
| FL-09 | İletişim Kaybı | PPC/offline | ⛔ DEFER | synthetic sinyal yok (K7) |
| FL-10 | Bakım | operatör | MANUEL kart | manuel kalır (`open_contactors` sapma notu) |
| FL-11 | Toprak Direnci | IMD alarm bitleri | OTO + gizli kart | ✅ UYGULANABİLİR (IMD gerçek map) |
| FL-12 | FSS Modu | (doküman boş) | ⛔ | doküman yok (S8) |
| — | DC şalter kapat / kontaktör kapat / idle | operatör | MANUEL kartlar | manuel kalır |
| — | Hazırlık (`bsc_prepare`) | field operasyonu uzak adımı (KOMUT-MANEVRA-OPERASYON §6.1) | ⏸ HEDEF kayıt (§2.10) | `close_contactors` + `start`; güç param'ı YOK (K12) |

---

## 2. FL Analizleri — Algoritma + Veri Yapıları + Register Eşlemesi

> Format: her FL için **Akış** (kaynak doküman), **Algoritma** (pseudo-code — manuel/otomatik),
> **Komut/Manevra Yapısı** (kod — MEVCUT + HEDEF), **Register Eşlemesi** (enerjici için:
> hangi komut hangi register'a ne yazar).

### 2.0 Cihaz Komut-Register Sözlüğü

**BSC (Flex Rev AF) — tüm komutlar HR 40010 (Command Request, UINT16):**

| Komut | Register | Değer | Not |
|:------|:---------|:------|:----|
| `emergency` | HR 40010 | 0x0001 | |
| `start` | HR 40010 | 0x0002 | |
| `stop` | HR 40010 | 0x0003 | |
| `open_contactors` | HR 40010 | 0x0004 | matrix FL-02/FL-08/FL-11 karşılığı |
| `close_contactors` | HR 40010 | 0x0005 | |
| `enter_manual` | HR 40010 | 0x0006 | |
| `exit_manual` | HR 40010 | 0x0007 | |
| `event_clear` | HR 40010 | 0x0009 | |
| `reset` | HR 40010 | 0x000A | |
| charge/discharge | ⛔ **YOK** | — | Rev AF'de 0x000B kaldırıldı — güç PCS'te (K12); simülatörde geçici setpoint register'ları (HR 40030/40031) durur, model PCS-tabanlıya dönünce kalkar |

Doğrulama: komut sonrası `Request Acknowledge` (IR 30030) okunur (0x0002 = done; hata kodları register-map'te).

**HVAC (MC90HDNC1R):**

| Komut | Register | Değer |
|:------|:---------|:------|
| `on` | HR 514 (Remote On/Off) | 1 |
| `off` | HR 514 | 0 |
| `force_cool` | HR 514 ← 1 **+** HR 10 (Cooling Setpoint, INT16 °C) ← 10 |
| `force_heat` | HR 514 ← 1 **+** HR 28 (Heating Setpoint, INT16 0.1°C) ← 500 |

Doğrulama: `Equipment Status` (IR 4096), `Current Temp` (IR 4104), `Return Humidity` (IR 4101).

**CB — DC Şalter (SYW6GZ, HEDEF — K2):**

| Komut | Register | Değer | Not |
|:------|:---------|:------|:----|
| `open` | COIL 0 | 1 | shunt trip coil (uzaktan açma — FL-03 dry contact karşılığı) |
| `close` | COIL 1 | 1 | closing coil |
| `reset` | ⛔ KALDIRILIR | — | şalterde trip semantiği yok |

Durum: DI 0 = `Is Closed` (aux NC), DI 1 = `Is Open` (aux NO) — HEDEF (mevcut: `Is Tripped`).

**DC Output:** `on` → COIL 0 ← 1 · `off` → COIL 1 ← 1. Durum: DI 0 `Is On`.

**Control-panel-io:** `battery_light_on/off` → COIL 0 ← 1/0 · `panel_light_on/off` → COIL 1 ← 1/0.
Durum: DI 0 `Battery Door Open`, DI 1 `Panel Door Open`; HEDEF (K5): FSS DI'ları eklenir (`System OK`, `Fault`, `Discharged`, `2nd Stage` — adresler Faz 1.5).

**PCS (Wattox — yalnız field tier, konteyner referans almaz — K10):**

| Komut | Register | Değer |
|:------|:---------|:------|
| `stop` | HR 3605 (S17) | 1 |
| `standby` | HR 3607 (S19) | 1 |
| `fault_reset` | HR 3606 (S18) | 1 |
| `charge` | HR 3609 (S06) | **−powerKw** (S16) |
| `discharge` | HR 3609 (S06) | +powerKw |

---

### 2.1 FL-02 — AUX Kaybı (P1-Critical)

**Akış (draw.io, sıralı):** AUX Energy Loss → (sadece kontrol ekipmanları enerjili kalır — AUX panel tasarımı gereği) → üst EMS + kullanıcıya bilgi → üst EMS PCS'i kapatma emri verir → DC şalter AÇ (de-enerjize) → BSC kontaktörleri AÇ → AUX dönene kadar IDLE bekle → kayıp sürerse → Safe Shutdown + bilgilendir.

**Algoritma (OTOMATİK — RuleEvaluator kenar-tetik):**

```pseudo
ALGORİTMA fl02_aux_loss:
her management snapshot'ında:
  koşul = PM5340-1."Voltage L-N Avg" < 180 V   // S11 varsayılanı
  eğer koşul VE debounce(5000 ms) dolduysa:
    YÜKSELEN KENAR (yalnızca ilk geçiş) →
      CB-1,CB-2     → command "open"             // DC şalter de-enerjize
      BSC-1,BSC-2   → command "open_contactors"  // HR 40010 ← 0x0004
      log  auto_rule_fl02_aux_loss (TamperLogger)
      notify
      cooldown = 300000 ms
  koşul düşer + cooldown dolarsa → yeniden silahlanır (yeni oluşum = yeni kenar)
```

**Algoritma (MANUEL — gizli kart, yalnızca gözle/demo):**

```pseudo
ALGORİTMA fl02_aux_loss (MANUEL):
operatör tetikler (kart GİZLİ — HIDDEN_MANEUVER_NAMES) →
  Mode: sequential, onFailure: stop
  adım 1: BSC-1,BSC-2  → "open_contactors"   // HEDEF (mevcut: stop + dcOff — hata)
  adım 2: CB-1,CB-2    → "open"
  her adım: POST /api/commands/execute-multi → COMMAND_DEVICE job → IDevice.write
            → read-back doğrulama (Request Acknowledge / aux DI)
  sonuç: kart durum makinesi idle→running→success|failed
```

**Komut/Manevra Yapısı:**

```ts
// MEVCUT (hatalı — düzeltilecek):
fl02_aux_loss: { mode: "sequential", steps: [...bscStop(), ...dcOff(), ...cbOpen()] }
//   ✗ bscStop → "stop" (HR 40010 ← 0x0003) yanlış komut
//   ✗ dcOff — dokümanda DC-Output adımı YOK
//   ✗ "inform EMS" eksik

// HEDEF (Faz 1.2 düzeltmesi):
fl02_aux_loss: {
  name: "fl02_aux_loss", mode: "sequential", onFailure: "stop",
  steps: [
    { deviceId: "BSC-1", command: "open_contactors" },  // HR 40010 ← 0x0004
    { deviceId: "BSC-2", command: "open_contactors" },
    { deviceId: "CB-1",  command: "open" },             // COIL 0 ← 1
    { deviceId: "CB-2",  command: "open" },
  ],
}
// OTOMATİK karşılığı: §3.1 rules.json "fl02_aux_loss" (PM5340 tetikleyici + aynı set)
```

**Veri:** PM5340 `Voltage L-N Avg` (S11 — varsayılan 180 V, debounce 5 sn).

**PCS notu (K10):** "üst EMS PCS'i kapatma emri verir" adımı konteyner kuralının DIŞINDADIR — konteyner kendi tarafını de-enerjize eder; PCS kapatma field tier'ın konusudur (Wattox `stop` HR 3605 ← 1 + S06 ← 0 — FIELD-MANEVRA-KATALOGU REV.01 deseni).

### 2.2 FL-05 — TMS: Normal Kontrol Döngüleri (P1-Critical)

**Akış:** Kabin içi return sıcaklığı/nemi hysteresis eşikleriyle kontrol edilir (xlsx Condition kolonu: HVAC 0x1008 = return air temp, 0x1005 = return humidity):

| Kural | ON | OFF | Komut |
|:------|:---|:----|:------|
| Soğutma | Return Temp **≥ 25°C** | Return Temp **< 23°C** | `force_cool` → normal moda dönüş: `on` |
| Isıtma | Return Temp **≤ 17°C** (düşerken) | Return Temp **≥ 20°C** | `force_heat` → `on` |
| Nem alma | Return Humidity **≥ 75%** | **≤ 60%** (durma sıcaklığı 19°C) | ⛔ komut YOK |

**Algoritma (OTOMATİK — HVAC başına 4 kural, toplam 32 — K8):**

```pseudo
ALGORİTMA tms_cool_on_hN (HVAC-N; heat/cool kapalıları aynı desen):
her snapshot'ta:
  eğer HVAC-N."Current Temp" >= 25 VE debounce(0) ise:
    YÜKSELEN KENAR →
      HVAC-N → command "force_cool"   // HR 514 ← 1 + HR 10 ← 10
      log auto_rule_tms_cool_on
      cooldown 60000 ms   // hysteresis üst bandı: 23°C'ye düşmeden tekrar YOK

ALGORİTMA tms_cool_off_hN:
  eğer HVAC-N."Current Temp" < 23 ise:
    YÜKSELEN KENAR →
      HVAC-N → command "on"           // HR 514 ← 1 (normal moda dönüş)
      log auto_rule_tms_cool_off
```

**Algoritma (MANUEL — force kartları, görünür):**

```pseudo
ALGORİTMA fl05_tms_cooling_force (MANUEL):
operatör karttan tetikler →
  Mode: parallel
  adım: HVAC-1..8 → "force_cool"   // 8 cihaza AYNI komut
  her cihaz: job → IDevice.write → Equipment Status read-back
```

**Komut/Manevra Yapısı:**

```ts
// MEVCUT (doğru — kalır):
fl05_tms_cooling_force: { mode: "parallel", steps: hvacCool() },  // 8 × force_cool
fl05_tms_heating_force: { mode: "parallel", steps: hvacHeat() },  // 8 × force_heat
// OTOMATİK karşılığı: §3.1 rules.json — tms_cool_on/off_h1..h8, tms_heat_on/off_h1..h8 (32 kural)
```

**Veri:** ✅ HVAC `Current Temp` (IR 4104 = 0x1008 eşleşmesi kanıtlı), `Return Humidity` (IR 4101 = 0x1005). **Dehumid ⛔** — HVAC register haritasında dehumid komutu YOK (4.5).

### 2.3 FL-05 — TMS: Koruma Kapıları (P1-Critical)

**Akış (draw.io kapıları + matrix register'ları):**

| Koruma | Koşul (OR) | Aksiyon |
|:-------|:-----------|:--------|
| Aşırı sıcak | Oda > 29°C için **15 dk** VEYA Max Pack Temp > 50°C için **5 dk** VEYA Max Pack Temp > 75°C için **45 sn** | Force HVAC soğutma + **blok** + Overheat Alarm |
| Aşırı soğuk | Oda < 10°C için **15 dk** VEYA Min Pack Temp < 15°C için **5 dk** VEYA Min Pack Temp < 5°C için **45 sn** | Force HVAC ısıtma + **blok** + Overcold Alarm |
| Nem | Return Humidity **≥ 85%** | Humidity Alarm + **blok** |
| Sıcaklık farkı | Herhangi bir rack `Rack Max Diff Temp R1..R8` **≥ 10°C** (30264) VEYA `Rack Max Diff Temp Pack R1..R8` **≥ 5°C** (30265) | Uyar + **blok** + reset beklenir |
| HVAC arızası | Herhangi bir HVAC fault biti | Uyar + **blok** |

**"Blok" semantiği (konteyner tier):** "Do not Accept Charge/Discharge Command. Stop if executed" → konteyner tier'da PCS YOKTUR (K10) — blok seti: **BSC-1/2 `stop`** + **HVAC force** (overheat→`force_cool`, overcold→`force_heat`) + log + notify. **Field tier blok (bilgi):** Wattox'ta `forbid_*` YOK — blok = `stop` (S17) + setpoint 0 (S06=0); geri alma operatörün yeni komutuyla (kenar-tetik — kural otomatik geri almaz). S10 kapandı.

**Algoritma (OTOMATİK — 3 kademeli debounce):**

```pseudo
ALGORİTMA tms_overheat_protect:
her snapshot'ta:
  koşullar = [
    herhangiHVAC."Current Temp" > 29    debounce 900000 ms,
    herhangiBSC."Max Pack Temp" > 50    debounce 300000 ms,
    herhangiBSC."Max Pack Temp" > 75    debounce  45000 ms ]
  eğer herhangi(koşullar):
    YÜKSELEN KENAR →
      HVAC-1..8 → "force_cool"   // HR 514 ← 1 + HR 10 ← 10
      BSC-1,BSC-2 → "stop"       // HR 40010 ← 0x0003
      log auto_rule_tms_overheat + notify
      cooldown 900000 ms

ALGORİTMA tms_overcold_protect: (aynı desen; force_heat; eşikler 10/15/5 °C)
ALGORİTMA tms_humidity_alarm:    any HVAC "Return Humidity" >= 85 → BSC stop + log + notify
ALGORİTMA tms_temp_diff_protect: any rack diff >= 10 | pack diff >= 5 → BSC stop + log + notify
```

**Komut/Manevra Yapısı:**

```ts
// MEVCUT (eksik — hedefte genişler):
fl05_tms_block_charge: { mode: "parallel", steps: bscStop() }
//   ✗ yalnızca BSC stop — force + alarm + 3 kademeli süre eksik

// HEDEF: kural seti §3.1 (tms_overheat_protect vb.) — aksiyon setleri satır içi command listesi
// (K6). Gizli kart fl05_tms_block_charge kurallar canlıya alınınca KALDIRILIR (K-A5).
```

**Veri:** ✅ `Max Pack Temp`/`Min Pack Temp` (BSC, 30149/30151), ✅ HVAC `Current Temp` (oda sıcaklığı kaynağı — S3), ✅ `Return Humidity`. ✅ **S9:** per-rack 30264/30265 config'te mevcut — "any rack" yaklaşımı. HVAC fault bitleri (`Compressor Fault`, `Fan Fault`, `Heater Fault`, `Sensor Fault`, `High/Low Pressure Alarm` vb.) ✅ mevcut — "HVAC arızası" kuralı bunlarla yazılır.

### 2.4 FL-06 — Şarj/Deşarj (P1-Critical) — ⏸ OTOMATİK DIŞI, KARTLAR HEDEFTE KALKAR (K12)

**Akış (draw.io):** Üst EMS komutu → önkoşul kontrolü: (1) BSC kontaktörler + DC şalter kapalı (açıksa otomatik kapat) (2) HVAC/FSS/sıcaklıklar uygun (3) Grid + PCS uygun → AND GATE → PCS'e planlanan şarj/deşarj komutu → bitince DC şalter pozisyon tercihi sorulur.

**Neden konteynerde YOK:** Tetikleyici üst EMS komutudur (koşul DEĞİL) VE güç komutu BSC'de YOKTUR (K12) — şarj/deşarj **field FL-02 OPERASYONU'dur**: Wattox PCS `charge` (S06 ← −powerKw) + konteyner `close_contactors`/`start` (KOMUT-MANEVRA-OPERASYON §6.1).

**Komut/Manevra Yapısı (MEVCUT → HEDEF):**

```ts
// MEVCUT (çalışmaz — BSC'de "charge" komutu yok):
fl06_charge:      { mode: "sequential", onFailure: "stop", steps: [...cbClose(), ...bscCharge(500)] }
fl06_discharge:   { mode: "sequential", onFailure: "stop", steps: [...cbClose(), ...bscDischarge(500)] }
fl_bsc_power:     { steps: BSC_IDS.map(id => ({ deviceId: id })), transform: mode→charge|discharge }  // kartlı
//   ✗ bscCharge(500) → bilinmeyen komut → job Result.err

// HEDEF (K12): konteyner kataloğundan KALDIRILIR — güç akışı field operasyonundan gelir.
// Konteynerde kalacak eşdeğeri: hazırlık kartı (contactors + start) — §2.10 fl_contactor_close.
```

**Veri (FL-06 önkoşul kapısı — ileriki faz):** ✅ CB `Is Closed`, ✅ HVAC `Equipment Status`, ✅ PCS `Status Word`/`Alarm Word` (field — Wattox A26/A28/A29); ⛔ FSS availability (K5 ile DI olur), ⛔ grid sinyali (S4 — konteyner: PM5340 `Frequency`/`Voltage L-N Avg`; field: Wattox A35 + Alarm 3 bitleri), ⛔ BSC kontaktör durumu (S5 — BSC State 30036 düz UINT16, bitfield yok).

### 2.5 FL-07 — Kapı Açık (P2-Major)

**Akış:** Kapı durumu izle → Batarya VEYA Panel kapısı AÇIK → kullanıcıyı uyar → ilgili oda ışıkları AÇ (kapı kapanınca kapat) → şarj/deşarj çalışıyorsa DURDUR → erişim logu.

**Algoritma (OTOMATİK — 4 kural):**

```pseudo
ALGORİTMA fl07_battery_door_open:
her snapshot'ta:
  eğer CONTROL-PANEL-IO-1."Battery Door Open" == true ise:
    YÜKSELEN KENAR →
      CONTROL-PANEL-IO-1 → "battery_light_on"   // COIL 0 ← 1
      BSC-1,BSC-2 → "stop"                      // HR 40010 ← 0x0003
      log auto_rule_fl07_door

ALGORİTMA fl07_battery_door_close:
  "Battery Door Open" == false →
    CONTROL-PANEL-IO-1 → "battery_light_off"    // COIL 0 ← 0
// panel kapısı: aynı desen (panel_light_on/off — COIL 1)
```

**Komut/Manevra Yapısı:**

```ts
// MEVCUT (eksik — hedefte genişler):
fl07_door_open: { mode: "parallel", steps: bscStop() }
//   ✗ ışık kontrolü + uyarı + erişim logu eksik

// HEDEF: kural seti §3.1 (fl07_*_door_open/close); gizli kart kurallar canlıya alınınca kaldırılır.
```

**Veri:** ✅ `control-panel-io-1`: DI 0 `Battery Door Open`, DI 1 `Panel Door Open`; COIL 0/1 ışıklar — HAZIR, eksik yok.

### 2.6 FL-08 — DC Kısa Devre Koruması (P1-Critical) — ✅ UYGULANABİLİR

**Akış:** DC metreyi sürekli izle → OR GATE: **V > 1500 VDC** VEYA **I > 1680 A** VEYA **P > 1784 kW** → DC şalter AÇ + BSC kontaktör AÇ + PCS durdur + Alarm + bilgilendir → servis gelene kadar bekle → koşul kalkınca normal işletime dönüş (matrix notu: ">1500 VDC <1000 VDC" — muhtemel reset eşiği; S6).

**Algoritma (OTOMATİK):**

```pseudo
ALGORİTMA fl08_scf_trip:
her snapshot'ta:
  koşullar = [ DC-METER-1."DC Voltage" > 1500,
               DC-METER-1."DC Current" > 1680,
               DC-METER-1."DC Power"  > 1784 ]
  eğer herhangi(koşullar) VE debounce(1000 ms) dolduysa:
    YÜKSELEN KENAR →
      BSC-1,BSC-2 → "open_contactors"   // HR 40010 ← 0x0004
      CB-1,CB-2   → "open"              // COIL 0 ← 1 (shunt trip)
      log auto_rule_fl08_scf + notify
      cooldown 3600000 ms               // 1 sa — servis penceresi
  NOT: v1'de otomatik dönüş YOK — reset eşiği (<1000 V) S6 teyidi sonrası eklenir.
```

**Algoritma (MANUEL — gizli kart):**

```pseudo
ALGORİTMA fl08_dc_fault (MANUEL):
operatör tetikler (gizli kart) →
  Mode: sequential, onFailure: stop
  adım 1: BSC-1,BSC-2 → "open_contactors"   // HEDEF (mevcut: stop — hata)
  adım 2: CB-1,CB-2   → "open"
  read-back: BSC Request Acknowledge 0x0002 / CB aux DI "Is Open" = true
```

**Komut/Manevra Yapısı:**

```ts
// MEVCUT (hatalı — düzeltilecek):
fl08_dc_fault: { mode: "parallel", steps: [...bscStop(), ...cbOpen()] }
//   ✗ bscStop → yanlış komut (0x0003); matrix: 0x0004 Open Contactor

// HEDEF (Faz 1.2):
fl08_dc_fault: {
  name: "fl08_dc_fault", mode: "sequential", onFailure: "stop",
  steps: [
    { deviceId: "BSC-1", command: "open_contactors" },
    { deviceId: "BSC-2", command: "open_contactors" },
    { deviceId: "CB-1",  command: "open" },
    { deviceId: "CB-2",  command: "open" },
  ],
}
// OTOMATİK karşılığı: §3.1 rules.json "fl08_scf_trip"
```

**Veri (K1):** `DC-METER-1` (DJSF1352-RN): FC03, addr 50/52/54 = V/I/P (float, kW) + alarm word 19. 1500V/shunt 9999A uyumlu. **PCS notu (K10):** matrix'in "PCS durdur" adımı konteyner kural setinde YOKTUR — field tier kural adayı (Wattox `stop` + S06 ← 0).

### 2.7 FL-09 — İletişim Kaybı (P1-Critical) — ⛔ DEFER (K7)

**Akış:** PPC bağlantısı koptu VEYA ekipman koptu → şarj/deşarj YÜRÜTME, bilgi + logla → idle bekle → koşul bitince devam.

**Algoritma (OTOMATİK):** ⛔ YAZILMAZ — veri kaynağı yok. Ekipman kopması = device-service `devices.status='offline'` + `device_offline` logu; bu MANAGEMENT snapshot'ına yansımıyor. Synthetic sinyal dönüştürmesi (§4.3) ayrı iş — K7.

**Komut/Manevra Yapısı (MEVCUT → HEDEF):**

```ts
// MEVCUT (eksik — defer süresince dokunulmaz):
fl09_comm_loss: { mode: "parallel", steps: bscStop() }
// HEDEF: synthetic sinyal kaynağı gelince kural yazılır; kart o zaman kaldırılır.
```

### 2.8 FL-11 — Toprak Direnci Hatası (P2-Major)

**Akış:** IMD verisini sürekli izle + yedekle → IMD iletişim kaybı VEYA izolasyon değeri ideal değil → koşul bitene kadar sistemi DURDUR → Alarm + veri logla.

**Algoritma (OTOMATİK):**

```pseudo
ALGORİTMA fl11_ground_fault:
her snapshot'ta:
  koşullar = [ IMD-1."Insulation Alarm" == true,     // Alarm1/Alarm2 bitleri — K4
               IMD-1."Device Error"   == true ]
  eğer herhangi(koşullar) VE debounce(2000 ms) dolduysa:
    YÜKSELEN KENAR →
      BSC-1,BSC-2 → "open_contactors"   // HR 40010 ← 0x0004
      CB-1,CB-2   → "open"              // COIL 0 ← 1
      log auto_rule_fl11_ground + notify
```

**Komut/Manevra Yapısı:**

```ts
// MEVCUT (hatalı — düzeltilecek):
fl11_ground_fault: { mode: "sequential", steps: [...bscStop(), ...cbOpen()] }
//   ✗ bscStop → matrix karşılığı 0x0004 Open Contactor

// HEDEF (Faz 1.2):
fl11_ground_fault: {
  name: "fl11_ground_fault", mode: "sequential", onFailure: "stop",
  steps: [
    { deviceId: "BSC-1", command: "open_contactors" },
    { deviceId: "BSC-2", command: "open_contactors" },
    { deviceId: "CB-1",  command: "open" },
    { deviceId: "CB-2",  command: "open" },
  ],
}
// OTOMATİK karşılığı: §3.1 (fl11_ground_fault kuralı)
```

**Veri (K4):** `IMD-1` gerçek register map ile: `Insulation Resistance` + Alarm1/Alarm2/Device Error (Bender D00272). R eşiği — S13 (v1: alarm bitleri esas). IMD offline durumu — K7 defer kapsamı.

### 2.9 FL-12 — FSS Modu (doküman yetersiz) — ⛔

Draw.io yalnızca başlık + lejant; matrix'te tek satır. FL-01/FL-06'da "FSS availability" önkoşulu. K5 ile FSS DI'ları hazır olacak; kural yazımı doküman gelince (S8).

### 2.10 Manuel Kartlar — Algoritma + Yapı + Sapma Notları

Ortak manuel akış (tüm kartlar):

```pseudo
ALGORİTMA <manuel kart> (MANUEL — ManeuverPanel):
operatör karttan tetikler (gerekirse input/timer) →
  adımlar → POST /api/commands/execute-multi (mode: parallel|sequential)
  her adım: CommandJobBuilder → COMMAND_DEVICE BullMQ job → device-service → IDevice.write
            → validate.reads read-back (eşitlik kontrolü)
  kart durum makinesi: idle → running → success | failed (+ rollback adımları varsa Geri Al)
```

| Kart | MEVCUT adımlar | Register eşlemesi | Sapma/HEDEF |
|:-----|:---------------|:------------------|:------------|
| FL-01 Başlatma (`fl01_start`) | `cbOpen` + `bscCharge(0)` + `dcOn` | CB COIL 0←1 · **BSC "charge" ⛔ YOK (K12)** · DC COIL 0←1 | Doküman: önkoşul kapısı + BSC `start` (HR 40010 ← 0x0002) → idle. HEDEF: `bscCharge(0)` → `start`; önkoşul kapısı ileriki faz |
| FL-03 Acil Durdur (`fl03_emergency_stop`) | `bscStop` + `dcOff` + `cbOpen` | BSC 40010←3 · DC COIL 1←1 · CB COIL 0←1 | Doküman: CB dry contact ile mekanik açılır (EMS fonksiyonu yok) + BSC **0x0001 Emergency** (HR 40010 ← 1). HEDEF: `bscStop` → `emergency`; `dcOff` dokümanda yok |
| FL-04 Kalibrasyon (`fl04_calibration_charge/discharge`) | `bscCharge(500)` / `bscDischarge(500)` | ⛔ BSC'de komut YOK (K12) | Kalibrasyon iç algoritma DC Block'ta; güç field PCS'ten. HEDEF: kartlar konteynerden KALDIRILIR; otomatik aday: "dönem kaçırıldı → blok" (takvim verisi — 4.9, ileriki faz) |
| FL-10 Bakım (`fl10_maintenance_shutdown`) | `bscStop` + `cbOpen` | BSC 40010←3 · CB COIL 0←1 | Doküman: BSC `open_contactors` (0x0004) + veri yedekle + safe shutdown. HEDEF: `bscStop` → `open_contactors` |
| DC Şalter Kapat (`fl_dc_breaker_close`) | `cbClose` | CB COIL 1←1 | ✅ doğru |
| Kontaktör Kapat (`fl_contactor_close`) | BSC `contactor_close` | HR 40010 ← 0x0005 | ✅ doğru (config komutu `close_contactors` — isim eşleşmesi Faz 1'de kontrol) |
| Durdur (`fl_idle`) | `bscStop` | HR 40010 ← 0x0003 | ✅ doğru |
| BSC Güç (`fl_bsc_power`) | BSC `charge`/`discharge` (input: mode, powerKw; timer; transform) | ⛔ BSC'de komut YOK (K12) | HEDEF: KALDIRILIR — güç field FL-02 operasyonu. `ControlPanel.tsx` `fl_idle` bağımlılığı Faz 1 temizliğinde |
| **Hazırlık (`bsc_prepare`) — YENİ HEDEF kayıt** | — | `close_contactors` (0x0005) + `start` (0x0002) | Field operasyonlarının (FL-02 şarj/deşarj — KOMUT-MANEVRA-OPERASYON §6.1) UZAK ADIMI bu manevradır: güç param'ı YOKTUR (K12 — güç PCS S06'dan). Kural/migrasyon (KURAL-MOTORU-V2) öncesi eklenmesi gerekmez |

---

## 3. Tetikleme Yapıları (rules.json + manuel katalog)

### 3.1 Otomatik — Taslak Kural Seti (rules.json)

> Uygulanabilir kurallar tam hazır; ⛔ işaretliler eksik tamamlanınca aynı dosyaya girecek.
> Aksiyon modeli = `command` + `log` + `notify` (K6). `maneuver` aksiyonu gelene kadar
> (KURAL-MOTORU-V2) blok aksiyon setleri satır içi yazılır; taşıma o gün yapılır (K-A2 notu).

```jsonc
// FL-05 TMS — normal kontrol (HVAC-1 çiftleri; HVAC-2..8 için aynı 4'lü — toplam 32 kural)
{ "name": "tms_cool_on_h1",  "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "gte", "threshold": 25 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "force_cool" }, { "action": "log", "eventCode": "auto_rule_tms_cool_on" } ], "cooldownMs": 60000 },
{ "name": "tms_cool_off_h1", "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "lt", "threshold": 23 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "on" }, { "action": "log", "eventCode": "auto_rule_tms_cool_off" } ], "cooldownMs": 60000 },
{ "name": "tms_heat_on_h1",  "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "lte", "threshold": 17 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "force_heat" }, { "action": "log", "eventCode": "auto_rule_tms_heat_on" } ], "cooldownMs": 60000 },
{ "name": "tms_heat_off_h1", "when": { "all": [{ "device": { "ids": ["HVAC-1"] }, "telemetry": "Current Temp", "op": "gte", "threshold": 20 }] },
  "then": [ { "action": "command", "deviceId": "HVAC-1", "command": "on" }, { "action": "log", "eventCode": "auto_rule_tms_heat_off" } ], "cooldownMs": 60000 },
// (HVAC-2..8 aynı çiftler; dehumid ⛔ — komut yok, §4.5)

// FL-05 TMS — korumalar (blok = satır içi aksiyon seti — K6; 3 kademeli debounce)
// Konteyner tier: PCS YOK (K10) → blok = BSC stop + HVAC force + log + notify
{ "name": "tms_overheat_protect", "cooldownMs": 900000,
  "when": { "any": [
    { "device": { "types": ["hvac"] }, "telemetry": "Current Temp", "op": "gt", "threshold": 29, "debounceMs": 900000 },
    { "device": { "types": ["bsc"] },  "telemetry": "Max Pack Temp", "op": "gt", "threshold": 50, "debounceMs": 300000 },
    { "device": { "types": ["bsc"] },  "telemetry": "Max Pack Temp", "op": "gt", "threshold": 75, "debounceMs": 45000 }
  ]},
  "then": [
    { "action": "command", "deviceTypes": ["hvac"], "command": "force_cool" },
    { "action": "command", "deviceIds": ["BSC-1", "BSC-2"], "command": "stop" },
    { "action": "log", "eventCode": "auto_rule_tms_overheat" },
    { "action": "notify" } ]},

// FL-05 overcold + humidity + temp-diff (aynı desen):
// - tms_overcold_protect: Oda<10 (15dk) / Min Pack Temp<15 (5dk) / <5 (45sn)
//   → HVAC force_heat + BSC stop + log auto_rule_tms_overcold + notify
// - tms_humidity_alarm:    Return Humidity >= 85 → BSC stop + log + notify (dehumid ⛔)
// - tms_temp_diff_protect: any rack "Rack Max Diff Temp R1..R8" >= 10 VEYA
//   "Rack Max Diff Temp Pack R1..R8" >= 5 → BSC stop + log + notify (30264/30265 per-rack)

// FL-02 — AUX kaybı (PM5340 — K3; eşik S11 varsayılan 180 V)
{ "name": "fl02_aux_loss", "cooldownMs": 300000,
  "when": { "all": [{ "device": { "ids": ["PM5340-1"] }, "telemetry": "Voltage L-N Avg", "op": "lt", "threshold": 180, "debounceMs": 5000 }] },
  "then": [
    { "action": "command", "deviceIds": ["CB-1", "CB-2"], "command": "open" },
    { "action": "command", "deviceIds": ["BSC-1", "BSC-2"], "command": "open_contactors" },
    { "action": "log", "eventCode": "auto_rule_fl02_aux_loss" },
    { "action": "notify" } ]},

// FL-07 — kapı (DI hazır — control-panel-io-1)
// - fl07_battery_door_open:  Battery Door Open eq true → battery_light_on + BSC-1/2 stop + log auto_rule_fl07_door
// - fl07_battery_door_close: Battery Door Open eq false → battery_light_off
// - fl07_panel_door_open/close: aynı desen (panel_light_on/off)

// FL-08 — DC kısa devre (DC-METER-1 — K1; debounce 1 sn — S6 varsayılanı)
{ "name": "fl08_scf_trip", "cooldownMs": 3600000,
  "when": { "any": [
    { "device": { "ids": ["DC-METER-1"] }, "telemetry": "DC Voltage", "op": "gt", "threshold": 1500, "debounceMs": 1000 },
    { "device": { "ids": ["DC-METER-1"] }, "telemetry": "DC Current", "op": "gt", "threshold": 1680, "debounceMs": 1000 },
    { "device": { "ids": ["DC-METER-1"] }, "telemetry": "DC Power", "op": "gt", "threshold": 1784, "debounceMs": 1000 }
  ]},
  "then": [
    { "action": "command", "deviceIds": ["CB-1", "CB-2"], "command": "open" },
    { "action": "command", "deviceIds": ["BSC-1", "BSC-2"], "command": "open_contactors" },
    { "action": "log", "eventCode": "auto_rule_fl08_scf" },
    { "action": "notify" } ]},

// FL-11 — toprak direnci (IMD-1 — K4)
// - fl11_ground_fault: IMD-1 "Insulation Alarm" eq true VEYA "Device Error" eq true
//   (debounce 2 sn) → CB-1/2 open + BSC-1/2 open_contactors + log auto_rule_fl11_ground + notify

// ⛔ FL-06 (EMS komutu — otomatik dışı; güç field operasyonu — K12), ⛔ FL-09 (offline
// sinyali yok — K7), ⛔ FL-12 (doküman yok): rules.json'da YOKTUR — fail-safe.
```

**Not:** `deviceTypes` / `deviceIds` çoklu hedef alanları mevcut kural şemasında
(`automation-rule.ts` — `command` aksiyonu `deviceId`/`deviceIds`/`deviceTypes`
seçicilerinden tam birini taşır). Faz 2'de şema doğrulanır; desteklenmiyorsa tek
cihazlı aksiyonlara ayrıştırılır (sapma notu düşülür).

### 3.2 Manuel — Trigger Yapıları (maneuvers.ts kataloğu)

> Kaynak: `apps/container-web/src/features/control/maneuvers.ts`. MEVCUT durum aynen;
> HEDEF sütunları §2 düzeltmeleridir (Faz 1'de uygulanır).

**Gizli set (`HIDDEN_MANEUVER_NAMES`):**

```ts
export const HIDDEN_MANEUVER_NAMES: ReadonlySet<string> = new Set([
  "fl_bsc_power",        // ⛔ HEDEF: kaldırılır (K12)
  "fl_idle",             // ControlPanel.tsx bağımlılığı — Faz 1 temizlik
  "fl02_aux_loss", "fl05_tms_block_charge", "fl06_charge", "fl06_discharge",
  "fl07_door_open", "fl08_dc_fault", "fl09_comm_loss", "fl11_ground_fault",
]);
// K-A5: kurallar canlıya alınınca gizli kartlar kaldırılır.
```

**Yardımcı adım üreticileri (MEVCUT):**

```ts
const bscStop  = () => BSC_IDS.map(id => ({ deviceId: id, command: "stop" }));              // HR 40010 ← 0x0003
const bscOpenContactors = () => BSC_IDS.map(id => ({ deviceId: id, command: "open_contactors" })); // HEDEF ekleme — 0x0004
const cbOpen   = () => CB_IDS.map(id  => ({ deviceId: id, command: "open" }));              // COIL 0 ← 1
const cbClose  = () => CB_IDS.map(id  => ({ deviceId: id, command: "close" }));             // COIL 1 ← 1
const dcOn     = () => DC_IDS.map(id  => ({ deviceId: id, command: "on" }));                // COIL 0 ← 1
const dcOff    = () => DC_IDS.map(id  => ({ deviceId: id, command: "off" }));               // COIL 1 ← 1
const hvacCool = () => HVAC_IDS.map(id => ({ deviceId: id, command: "force_cool" }));       // HR 514←1 + HR 10←10
const hvacHeat = () => HVAC_IDS.map(id => ({ deviceId: id, command: "force_heat" }));       // HR 514←1 + HR 28←500
const bscCharge = (kw) => BSC_IDS.map(id => ({ deviceId: id, command: "charge", params: { powerKw: kw } })); // ⛔ K12
```

**Katalog (`MANEUVERS`) — MEVCUT → HEDEF:**

```ts
export const MANEUVERS: Record<string, ManeuverConfig> = {
  // ── MANUEL GÖRÜNÜR KARTLAR ──────────────────────────────────────────────
  fl01_start: {                    // FL-01 Başlatma
    mode: "parallel",
    steps: [...cbOpen(), ...bscCharge(0), ...dcOn()],
    // HEDEF: bscCharge(0) ⛔ K12 → { deviceId, command: "start" }  (HR 40010 ← 0x0002)
  },
  fl03_emergency_stop: {           // FL-03 Acil Durdur
    mode: "sequential",
    steps: [...bscStop(), ...dcOff(), ...cbOpen()],
    // HEDEF: bscStop → "emergency" (HR 40010 ← 0x0001); dcOff dokümanda yok (dry contact notu)
  },
  fl04_calibration_charge:    { mode: "parallel", steps: bscCharge(500) },    // ⛔ K12 → KALDIRILIR
  fl04_calibration_discharge: { mode: "parallel", steps: bscDischarge(500) }, // ⛔ K12 → KALDIRILIR
  fl05_tms_cooling_force:     { mode: "parallel", steps: hvacCool() },        // ✅ kalır
  fl05_tms_heating_force:     { mode: "parallel", steps: hvacHeat() },        // ✅ kalır
  fl10_maintenance_shutdown: {        // FL-10 Bakım
    mode: "sequential",
    steps: [...bscStop(), ...cbOpen()],
    // HEDEF: bscStop → "open_contactors" (0x0004)
  },
  fl_dc_breaker_close: { mode: "parallel", steps: cbClose() },                // ✅ kalır
  fl_contactor_close:  { mode: "parallel",
    steps: BSC_IDS.map(id => ({ deviceId: id, command: "contactor_close" })) },
    // HEDEF: komut adı config ile hizalanır ("close_contactors") — 0x0005

  // ── GİZLİ KARTLAR (kurallar canlıya alınınca kaldırılır — K-A5) ──────────
  fl_idle:         { mode: "parallel", steps: bscStop() },                    // ControlPanel.tsx bağımlılığı
  fl_bsc_power:    { steps: BSC_IDS.map(id => ({ deviceId: id })) },          // ⛔ K12 → KALDIRILIR
  fl02_aux_loss: {
    mode: "sequential",
    steps: [...bscStop(), ...dcOff(), ...cbOpen()],
    // HEDEF: [...bscOpenContactors(), ...cbOpen()]  — dcOff kalkar
  },
  fl05_tms_block_charge: { mode: "parallel", steps: bscStop() },              // kural setiyle değişir (§2.3)
  fl06_charge:    { mode: "sequential", onFailure: "stop", steps: [...cbClose(), ...bscCharge(500)] },    // ⛔ K12
  fl06_discharge: { mode: "sequential", onFailure: "stop", steps: [...cbClose(), ...bscDischarge(500)] }, // ⛔ K12
  fl07_door_open: { mode: "parallel", steps: bscStop() },                     // kural setiyle değişir (§2.5)
  fl08_dc_fault: {
    mode: "parallel",
    steps: [...bscStop(), ...cbOpen()],
    // HEDEF: sequential [...bscOpenContactors(), ...cbOpen()]
  },
  fl09_comm_loss:  { mode: "parallel", steps: bscStop() },                    // defer (K7) — dokunulmaz
  fl11_ground_fault: {
    mode: "sequential",
    steps: [...bscStop(), ...cbOpen()],
    // HEDEF: [...bscOpenContactors(), ...cbOpen()]
  },
};
```

**Kart kontrolleri (`MANEUVER_CONTROLS`) — MEVCUT:**

```ts
export const MANEUVER_CONTROLS = {
  fl_bsc_power: {        // ⛔ K12 — kart kaldırılınca bu giriş de kalkar
    inputs: [
      { name: "mode", type: "select", options: [{ value: 0, label: "Şarj" }, { value: 1, label: "Deşarj" }] },
      { name: "powerKw", label: "Güç", unit: "kW", min: 0, max: 3568, step: 10, default: 50 },
    ],
    timer: true,         // Zamanlı çalıştırma (ManeuverCard timer)
    transform: (values, steps) => {
      const command = values.mode === 0 ? "charge" : "discharge";  // ⛔ K12 — BSC'de yok
      return steps.map(() => ({ ...values, command }));
    },
  },
};
```

---

## 4. Eksikler Envanteri

| # | Eksik | Etkilenen | Çözüm yolu | Durum |
|:--|:------|:----------|:-----------|:------|
| 4.1 | **AUX Analyser** cihaz config + simülatör | FL-02 | — | ✅ **ÇÖZÜLDÜ** — PM5340 tek AUX cihazı (K3); aux-analyser silinir |
| 4.2 | **Kapı kontaktları** + **ışık kontrolü** config | FL-07 | — | ✅ **ÇÖZÜLDÜ** — control-panel-io-1'de hazır |
| 4.3 | **PPC bağlantı durumu** + **ekipman offline** kural girdisi | FL-09 | synthetic telemetri tasarımı | ⛔ **DEFER** (K7) — ayrı iş |
| 4.4 | BSC global **30264/30265** telemetrisi | FL-05 | — | ✅ **ÇÖZÜLDÜ** — per-rack `Rack Max Diff Temp R1..R8`/`Pack R1..R8` config'te mevcut; kural "any rack" (S9 kapanır) |
| 4.5 | HVAC **dehumidification** komutu | FL-05 nem | HVAC register haritasında dehumid komut register'ı | ⛔ komut yok — kural YOK |
| 4.6 | **Blok kaldırma** komutu | FL-05/FL-08 dönüşü | — | ✅ **ÇÖZÜLDÜ** — field Wattox: operatör yeni komutuyla geri alma (`forbid_*`/`allow_*` ESKİ konteyner PCS'e aitti — K11) |
| 4.7 | **FSS** cihaz config + FL-12 dokümanı | FL-01/FL-06 önkoşulu, FL-12 | — | ✅ config tarafı çözüldü (K5); FL-12 dokümanı ⛔ (S8) |
| 4.8 | **EMS komut sinyali** (FL-06 tetikleyicisi) | FL-06 | Boss/EMS entegrasyon tasarımı (ayrı iş) | ⛔ kapsam dışı |
| 4.9 | **Kalibrasyon takvimi** verisi | FL-04 (otomasyon yönü) | Takvim/yapılandırma kaynağı — ileriki faz | ⛔ ileriki faz |
| 4.10 | Canonical tag eklemeleri | FL-05/FL-08 | `room_temp`, `humidity`, `Max/Min Pack Temp`, DC metre değerleri — opsiyonel | ⛔ defer — kurallar ad bazlı çalışır |
| 4.11 | **DC Metre** config + simülatör (DJSF1352) | FL-08 | FC03 float V/I/P + alarm word 19; yeni simülatör modülü | ⬜ **Faz 1.1** |
| 4.12 | **CB şalter rework** (SYW6GZ) | FL-02/08/11 + UI | register map + config + CBCard + manevralar | ⬜ **Faz 1.2** |
| 4.13 | **IMD gerçek register map** (Bender D00272) | FL-11 | Döküman indirme + map + config + simülatör | ⬜ **Faz 1.4** |
| 4.14 | **FSS DI'ları** (control-panel-io) | FL-07/FL-12 | DI + register map + config + simülatör | ⬜ **Faz 1.5** |
| 4.15 | **BSC→PCS connector B19/B20 kaynağı** (EMU-1 kaldırılınca kopar) | connector mapping | `bsc-pcs-mapping.json`: sabit (nominal) veya BSC SOC türetimi — devreye alım kararı A7 | ⬜ **Faz 1.1** (mapping güncellemesi) |
| 4.16 | **Legacy konteyner PCS** (eski `pcs-1.json` + `PcsSimulator` kaydı) | konteyner cihaz listesi/UI | Silme — K11 | ⬜ **Faz 1.6** |
| 4.17 | **BSC charge/discharge kartları** (fl_bsc_power, fl04_*, fl06_*) | konteyner kataloğu | Kaldırma — K12 (güç field FL-02 operasyonu) | ⬜ **Faz 1.2** (manevra temizliği) |
| 4.18 | `fl_contactor_close` komut adı hizalaması (config: `close_contactors`) | kart + config | isim eşleştirme kontrolü | ⬜ **Faz 1.2** |

---

## 5. Mühendis Ekibine Açık Sorular

| # | Soru | Etki | Durum |
|:--|:-----|:-----|:------|
| S1 | FL-02 "Upper Level EMS issues an order to shut down the PCS" — PCS kapatma EMS'ten mi beklenir, yoksa AUX kaybı algılanınca biz doğrudan açtırır mıyız? | FL-02 kural akışı | ⏳ AÇIK — v1: biz açtırırız (CB open + BSC open_contactors) |
| S2 | HVAC kontrol kuralları cihaz başına mı, "herhangi bir HVAC" bazlı mı? | FL-05 topoloji | ✅ **CEVAPLANDI (K8)** — cihaz başına |
| S3 | "Room Temperature" sensörü hangi kaynak? (Öneri: HVAC return air = `Current Temp` 0x1008) | FL-05 koruma eşikleri | ⏳ AÇIK — öneri kullanılır |
| S4 | FL-06 önkoşulundaki "Grid is available" hangi sinyalden? | FL-06 önkoşul kapısı | ⏳ AÇIK (FL-06 kapsam dışı) — adaylar: konteyner PM5340 `Frequency`/`Voltage L-N Avg`; field Wattox A35 + Alarm 3 grid fault bitleri |
| S5 | "BSC Contactors are closed" hangi telemetriden? | FL-06 önkoşul kapısı | ⏳ AÇIK — BSC State (30036) düz UINT16, bitfield sözleşmesi YOK; devreye alımda netleşir |
| S6 | FL-08 trip debounce süresi ve reset eşiği ("<1000 VDC" mi?)? | FL-08 kural parametreleri | ⏳ AÇIK — **varsayılan: debounce 1 sn; reset yok (cooldown)** |
| S7 | FL-08 ölçüm kaynağı: EMU mu, ayrı DC metre mi? | FL-08 veri kaynağı | ✅ **CEVAPLANDI (K1)** — ayrı DC metre; EMU kaldırılır |
| S8 | FL-12 FSS akış dokümanı ne zaman? | FL-12 + önkoşullar | ⏳ AÇIK — DI'lar hazır olacak, kural doküman bekler |
| S9 | 30264/30265 global register'ları BSC config'ine eklensin mi? | FL-05 sıcaklık farkı kuralı | ✅ **ÇÖZÜLDÜ** — per-rack 30264/30265 config'te mevcut; kural "any rack"; global register eklenmez |
| S10 | PCS forbid kaldırma kontratı? | "Blok" geri dönüşü | ✅ **ÇÖZÜLDÜ** — Wattox'ta `forbid_*` YOK; blok = `stop` + setpoint 0; geri alma operatör komutuyla |
| S11 | FL-02 AUX kayıp eşiği (PM5340 `Voltage L-N Avg`)? | FL-02 | ⏳ AÇIK — **varsayılan 180 V, debounce 5 sn** |
| S12 | SYW6GZ aux kontak/coil kablolama ayrıntısı (DI/DO adresleri)? | CB şalter modeli | ⏳ AÇIK — manual'dan işlenir; simulator modellenir |
| S13 | FL-11 IMD "izolasyon ideal değil" eşiği (R değeri)? | FL-11 kural parametresi | ⏳ AÇIK — v1: alarm bitleri esas; R eşiği sonra |

---

## 6. Kabul Kriterleri ve Görev Listesi

**Uygulama (developer onayı sonrası) — 6 aşamalı iş akışı devam eder:**

| Aşama | Görev | Kapsam |
|:------|:------|:-------|
| 1. SPEC | Bu doküman (REV.03) | ✅ **TAMAM — ONAY BEKLİYOR** |
| 2. JSDoc | dc-meter/şalter/IMD/FSS-DI sözleşmeleri (register map + simülatör davranışı) | Faz 1 içinde |
| 3. TEST | `automation-rules.spec.ts` — rules.json zod doğrulaması + her FL için senaryo testi (sentetik telemetri → RuleEvaluator ateşleme assert, fake timers; eşik sınırları: 29.9/30.0 gibi) + cihaz simülatör testleri | Faz 1-2 |
| 4. IMPL | Faz 1: cihaz katmanı (dc-meter yeni, CB şalter rework, aux-analyser silme, IMD gerçek map, FSS DI, connector mapping, legacy PCS silme, BSC şarj kartı temizliği) → Faz 2: `rules.json` (§3.1 tamamı) | Faz 1-2 |
| 5. SONUÇ | `MANAGEMENT-SERVICE-DOGRULAMA.md`'ye giriş + cihaz modülü DOGRULAMA'ları | Faz 4 |
| 6. KAPSAM | `MANAGEMENT-SERVICE-TEST-KAPSAMI.md` + `test-envanteri.md` güncelleme | Faz 4 |

**Faz listesi:**

| Faz | İçerik | Çıktı |
|:----|:-------|:------|
| 0 | SPEC (bu doküman) | ✅ tamam |
| 1.1 | dc-meter (DJSF1352): simülatör + config + registry; EMU silme; **bsc-pcs-mapping B19/B20 kaynak güncellemesi** | `packages/simulators/src/dc-meter/` + `dc-meter-1.json` + mapping |
| 1.2 | CB şalter rework: register map + config + CBCard UI + BscPage/DashBoardPage/ScadaDashboardPage + field mockDataGenerator + manevralar (K2 + K12 + 4.17/4.18 düzeltmeleri) | `packages/simulators/src/cb/` + config + UI |
| 1.3 | aux-analyser silme (PM5340 tek AUX) | config + simülatör silme |
| 1.4 | IMD gerçek register map (Bender D00272 indirilir) | `packages/simulators/src/imd/` + config + `docs/devices/` |
| 1.5 | FSS → control-panel-io DI'ları; fss silme | `packages/simulators/src/control-panel-io/` + config |
| 1.6 | Legacy konteyner PCS silme (eski `pcs-1.json` + `PcsSimulator` kaydı) — K11 | config + registry |
| 2 | rules.json (container tier) + `automation-rules.spec.ts` | `management-service/deployment/config/rules.json` + test |
| 3 | `e2e/automation-rules.spec.ts` + mevcut e2e uyumu | Playwright spec |
| 4 | DOGRULAMA + TEST-KAPSAMI + `graphify update .` | dokümanlar |

**Kabul kriterleri (uygulama gününde kanıtlanacak):**
- K-A1: Her uygulanabilir FL kuralı, dokümanda yazılı eşik/süre ile birebir eşleşir (senaryo testi).
- K-A2: Blok aksiyon seti command listesi olarak tamdır (BSC stop + HVAC force + log/notify; konteyner tier'da PCS YOK — K10). `maneuver` aksiyonu gelince (KURAL-MOTORU-V2) kurallar manevra referansına taşınır.
- K-A3: Kenar-tetik: koşul aktifken kural tekrarlanmaz; düşüş-yükselişte cooldown uygulanır (mevcut RuleEvaluator garantisi — testle sabitlenir).
- K-A4: Eksik FL'ler (⛔ FL-06/09/12) rules.json'da YOKTUR — yanlış veriyle kural çalışmaz (fail-safe).
- K-A5: Gizli manevra tanımları (`HIDDEN_MANEUVER_NAMES` içeriği) kurallar canlıya alınınca kaldırılır; `fl_idle`/`ControlPanel.tsx` legacy bağımlılığı netleştirilir.
- K-A6: Kapılar: yeni kod ≥%70 satır; kural seti spec'i ≥%90 branch; monorepo test yeşil.
- K-A7: **Cihaz tutarlılığı:** EMU/aux-analyser/fss/legacy-PCS config+simülatör referansı repo'da KALMAZ (kod + config + registry); dc-meter config hem `services/device-service/config/` hem `deployment/config-docker/` içindedir.
- K-A8: **Tier saflığı:** konteyner rules.json hiçbir PCS cihazına/komutuna referans VERMEZ (K10); konteyner config-docker'da `pcs-1.json` bulunmaz (K11).
- K-A9: **K12 saflığı:** konteyner kataloğunda BSC `charge`/`discharge` komut referansı KALMAZ (manevralar + MANEUVER_CONTROLS); şarj/deşarj yalnız field FL-02 operasyonundan gider.
- K-A10: **Register doğruluğu:** §2.0 sözlüğündeki her komut-register eşlemesi, uygulanan config'le birebir örtüşür (enerjici gözle kontrolü — DOGRULAMA'da satır satır kanıtlanır).

**Temizlik notu:** `apps/container-web/src/features/control/components/ControlPanel.tsx` hâlâ `MANEUVERS.fl_idle` kullanıyor (AGENTS.md'de "kaldırıldı" denmişti — dosya duruyor); kural uygulama gününde manevra temizliğiyle birlikte ele alınır.
