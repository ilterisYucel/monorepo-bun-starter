---
status: active
space: architecture
tags: [mimari, manevra, field, pms, ppc, wattox, spec]
review_date: 2026-09-17
---

# Field Manevra Kataloğu — REV.01 (SPEC)

> **İş akışı aşaması:** 1/6 — SPEC (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **Kaynak:** `GD-PMS_Maneuver_Logic_Explanation.docx` REV.01 (25.08.2026, Green Diamond) — saha seviyesi PMS/PPC manevraları.
> **Kapsam:** Field uygulaması (saha PMS/PPC katmanı). Konteyner app'in mevcut manevra seti (draw.io 080726) AYRIDIR ve DEĞİŞMEZ — bu katalog field app içindir.
> **REV.01.1 (2026-09-17):** §3.2 — FL-02 Charge/Discharge operasyon eşlemesi (KOMUT-MANEVRA-OPERASYON §6.1).
> **REV.01.2 (2026-09-17):** K12 hizalaması — §3.4 kalibrasyon güç notu, §5 R-07 çapraz referans, §7 sunucu migrasyonu FL-02 = OPERASYON (`bsc_prepare` uzak adımları) olarak düzeltildi.
> **REV.01.3 (2026-09-17):** §3 yeniden yapılandırıldı — her FL için algoritma (pseudo-code) + komut/manevra veri yapısı (gerçek `buildFieldManeuvers` kayıtları) + register eşlemesi (KONTEYNER-MANEVRA-KATALOGU §2 formatı).
> **REV.01.4 (2026-09-17):** her FL'ye **Sistem Yapısı** kararı eklendi (KOMUT/MANEVRA/OPERASYON — KOMUT-MANEVRA-OPERASYON tanımlarıyla: 1 sistemde 1+ cihaz = MANEVRA; 2+ sistem = OPERASYON). FL-01/FL-03/FL-11 OPERASYON (uzak konteyner adımı + yerel PCS adımı — migrasyon hedefi); FL-04/05/06/07/10 MANEVRA (konteyner kendi tarafını yapar + logları sahaya raporlar). G-2 AUX kaynağı düzeltildi (konteyner PM5340).
> **REV.01.5 (2026-09-17):** operasyon kriteri keskinleştirildi — **başka sistemden yalnız OKUMA operasyon DEĞİLDİR; operasyon = başka sistemde komut/manevra ÇALIŞTIRMAKTIR.** FL-01 ve FL-03 MANEVRA'ya çekildi (konteynerden okuma + PCS komut); FL-11 OPERASYON netleşti (uzak adım konteyner bakım manevrası SAHADAN çalıştırılır).
> **İlişkili:** [PCS-WATTOX-MIMARISI.md](./PCS-WATTOX-MIMARISI.md) (aksiyon/veri register'ları), [MANAGEMENT-SERVICE-MIMARISI.md](./MANAGEMENT-SERVICE-MIMARISI.md) (otomasyon altyapısı).

---

## 1. Mimari Konum

```
ÜST EMS (gelecek)
        │
FIELD APP = SAHA PMS/PPC  ◄── bu dokümanın katmanı
   ├── device-service (Wattox PCS-1..PCS-N — konteyner başına 1 PCS)
   ├── web-service (ContainerProxy: konteyner→field bağlantı durumu)
   ├── management-service (otomasyon kuralları — field tier)
   └── field frontend (Control sayfası — manevra kartları)
        │  tünel (konteyner → field)
   KONTEYNERLER (BSC/DC Block, HVAC, CB...) — kendi manevralarıyla
        │
   MV ŞALT · AUX TRAFO · ÖLÇÜM HÜCRESİ (veri boşlukları — §6)
```

**"PPC" kavramı (kullanıcı düzeltmesi):** PPC = **konteyner → field bağlantısı** ("konteyner aleti field'e bağlı mı"). Veri kaynağı: field web-service `ContainerProxy` — `connected/stale/idle` + `lastSeenAt` (45 sn heartbeat sessizliği → stale). FL-07'nin tetikleyicisi budur.

## 2. Manevra Sınıflandırması (REV.01)

| FL | Manevra | Tetikleme | Frontend | Durum |
|:---|:--------|:----------|:---------|:------|
| FL-01 | Start-Up & Shut-Down | Manuel | KART | prosedür dolu; aksiyon/monitoring register'ları dokümanda BOŞ (Varies) |
| FL-02 | Charge / Discharge | Manuel | KART (grup seçimli) | dolu — dağıtım mantığı net |
| FL-03 | Idle / Standby | Manuel | KART | dolu |
| FL-04 | Calibration | Manuel + **zamanlı OTO başlatma** | KART (timer) | dolu; iç algoritma DC Block'ta |
| FL-05 | Emergency Stop | Manuel (buton/kart) | KART | dolu |
| FL-06 | Recovery | **OTO** | **GİZLİ** | dolu — kural tasarımı yapılabilir |
| FL-07 | Communication Loss | **OTO** | **GİZLİ** | **gövde BOŞ** — doküman beklenir |
| FL-08 | Black Start | Belirsiz | — | **gövde BOŞ** — doküman beklenir |
| FL-09 | Microgrid | Belirsiz | — | **gövde BOŞ** — doküman beklenir |
| FL-10 | Islanding / Grid Loss | **OTO** | **GİZLİ** | **gövde BOŞ** — doküman beklenir (veri kaynakları §3.10'da) |
| FL-11 | Maintenance Mode | Manuel | KART | dolu |

**Dokümanın kritik vurguları (§ çok önemli):**
- ⛔ **ASLA: kesici/ayırıcı toprak bıçaklı moddaysa şarj/deşarj manevrası KABUL EDİLMEYECEK** (interlock I-1)
- MV ekipmanda motor yoksa kullanıcıya bilgi ver, MANUEL yaptır (UI kuralı)
- Şarj/deşarj sırasında **charge/discharge power limit register'ları** kullanılır (B09/B10 — Wattox)
- FL-06/FL-07/FL-10 frontend'de GÖSTERİLMEZ (dokümanda açıkça yazılı)

## 3. FL Analizleri — Algoritma + Veri Yapıları + Register Eşlemesi

> Format: her FL için **Sistem Yapısı** (KOMUT | MANEVRA | OPERASYON — KOMUT-MANEVRA-OPERASYON
> tanımları: tek cihaz = komut; TEK SİSTEMDE 1+ cihaz = MANEVRA; İKİ+ SİSTEMDE erişim =
> OPERASYON), **Akış/Prosedür** (kaynak doküman), **Algoritma** (pseudo-code —
> manuel/otomatik), **Komut/Manevra Yapısı** (gerçek
> `apps/field/src/features/field-control/maneuvers.ts` kayıtları — UYGULANMIŞ durum),
> **Register Eşlemesi** (enerjici için: hangi komut hangi register'a ne yazar).
>
> **Tier sınırı:** field app = BİR sistem, konteyner uygulaması = BİR sistem. Konteyner
> tarafı otomatik aksiyonlarını KENDİ kataloğuyla yapar (KONTEYNER-MANEVRA-KATALOGU-REV03
> — referans, doğru kabul edilir) ve önemli logları/olayları sahaya tag'li raporlar.
> **Operasyon kriteri (REV.01.5):** konteynerde komut/manevra ÇALIŞTIRILMASI gereken
> akışlar OPERASYON'dur (uzak adım: konteyner manevrası; yerel adım: PCS komutları);
> konteynerden yalnız OKUMA yapılan akışlar MANEVRA'dır. Bugünkü implementasyon yerel
> manevradır; operasyon modeline geçiş KOMUT-MANEVRA-OPERASYON Faz A-C ile (bkz. §7).
>
> Ortak manuel akış (tüm kartlar — FieldManeuverPanel → execute-multi):
> ```pseudo
> operatör karttan tetikler (grup/powerKw/timer input'ları) →
>   adımlar → POST /api/commands/execute-multi (mode: parallel|sequential)
>   her adım: CommandJobBuilder → COMMAND_DEVICE job → field device-service → IDevice.write (Wattox)
>             → validate.reads read-back doğrulama
>   kart durum makinesi: idle → running → success | failed (+ rollbackSteps varsa Geri Al)
> ```

### 3.0 Cihaz Komut-Register Sözlüğü (Wattox PCS)

> `services/device-service/deployment/config-field/pcs-1.json` — UYGULANMIŞ komut seti.

**Komutlar:**

| Komut | Register | Değer | Not |
|:------|:---------|:------|:----|
| `start` | HR 3604 (S16) | 1 | FL-01 adayı (S9) |
| `stop` | HR 3605 (S17) | 1 | FL-05/07/10/11 |
| `standby` | HR 3607 (S19) | 1 | FL-03 (ayrı adım) / FL-04 ön koşul / FL-06 |
| `fault_reset` | HR 3606 (S18) | 1 | FL-06 (R-06) |
| `charge` | HR 3609 (S06) | **−powerKw** (S16) | şarj NEGATİF — FL-02 |
| `discharge` | HR 3609 (S06) | +powerKw (S16) | FL-02 |
| `set_power_zero` | HR 3609 (S06) | 0 | FL-03 idle — uygulanmış komut |
| `set_command_source` | HR 3584 (S01) | 1 | açılış hazırlığı (EMS kontrol) |

**Doğrulama/izleme register'ları (INPUT):**

| Register | Ad | Kullanım |
|:---------|:---|:---------|
| A26 (0x2F7D) | PCS Operation Status | durum doğrulama (0 Stop / 1 Standby / 2 Şarj / 3 Deşarj / 6 Fault) |
| A28 (0x2F43) | PCS Fault Status | müsaitlik + R-06 ön koşul |
| A29 (0x2F45) | PCS Alarm Status | müsaitlik |
| A40 (0x2F7E) | Grid Active Power | FL-02/FL-03 akış doğrulaması (ölçüm hücresi gelene kadar) |
| A53-A58 | AC/DC kesici + kontaktörler | FL-05/FL-11 doğrulama (0 kapalı / 1 açık) |
| A59 (0x2F60) | E-stop buton durumu | R-06 tetikleyici (bit0 local / bit1 remote / bit2 BMS) |
| B09/B10 (0x0308/0x0309) | Maks şarj/deşarj gücü | FL-02 dağıtım hesabı (I-3) — kaynak: BSC→PCS connector |
| Alarm word 3 (D13) | bit9 Islanding fault | FL-10 adayı |
| Alarm word 6/7 (D16/D17) | bit15/bit0-1 E-stop fault | R-06 ön koşul |

---

### 3.1 FL-01 — Start-Up & Shut-Down (manuel kart)

**Sistem Yapısı:** **MANEVRA** — konteynerlerden yalnız OKUMA (AUX = PM5340, cihaz
müsaitliği, olay raporları) + yerel PCS komutu; konteynerde komut/manevra
ÇALIŞTIRILMAZ (REV.01.5 kriteri). Aksiyon register'ları dokümanda BOŞ (S9) — MVP:
bilgilendirme + PCS `start` adayı.

**Akış:** Saha çapında müsaitlik kontrolü → her cihaz tek tek sorgulanır (iletişim sağlıklı, bloke fault/trip yok, Available/Ready) → AUX besleme (doküman: "aux trafo enerji analizörü" — bizde: konteyner **PM5340**, tünel telemetrisi) → grid durumu (MV istasyonu ölçümleri) → **Ready** → operasyonel komutlar kabul edilir. Tüm kontroller + geçişler event log'a zaman damgalı yazılır. Shut-down: ters akış.

**Algoritma (MANUEL):**

```pseudo
ALGORİTMA fl01_startup (MANUEL):
operatör karttan tetikler →
  Mode: parallel, onFailure: continue
  adım: PCS-1..N → "start"          // HR 3604 (S16) ← 1 — S9 adayı
  doğrulama: A26 (PCS Operation Status) — Ready durum makinesi
  NOT: "Ready" ön koşul kapısı (AUX/grid/MV verileri) EKSİK — G-1/G-3
       verileri gelene kadar yalnızca bilgilendirme; aksiyon register'ları dokümanda BOŞ (S9)

ALGORİTMA fl01_shutdown (MANUEL):
  adım: PCS-1..N → "stop"           // HR 3605 (S17) ← 1
```

**Komut/Manevra Yapısı (UYGULANMIŞ):**

```ts
fl01_startup:  { mode: "parallel", onFailure: "continue", steps: stepsFor("start", pcsIds) },
fl01_shutdown: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop",  pcsIds) },
```

**Veri:** ✅ AUX = konteyner **PM5340** — tünel telemetrisi (`Voltage L-N Avg`/`Frequency`) + konteyner olay raporlaması (konteyner kendi FL-02 AUX kuralını otomatik işletir, log sahaya akar) · ⛔ MV ölçüm hücresi YOK (G-3) · ✅ PCS A26/A28/A29 + D01-D18 · ✅ ContainerProxy bağlantı durumu · ✅ konteyner cihazları (tünel).

### 3.2 FL-02 — Charge/Discharge (manuel kart, grup seçimli)

**Sistem Yapısı:** **OPERASYON** — iki sistem: uzak konteyner hazırlığı + yerel PCS
setpoint (KOMUT-MANEVRA-OPERASYON §6.1). Bugün: yerel MANEVRA (yalnız PCS adımları) —
migrasyona kadar geçerli.

**Akış:** Operatör santral gücünü girer → DC Block bilgilendirilir + müsaitlik → trafo limitleri izlenir (varsa) → MV kesici pozisyonları doğrulanır (yol kapalı) → PCS hazırlığı → komut (S06 setpoint — şarj NEGATİF) → **dağıtım**: grup seçildiyse o gruba; seçilmediyse santral gücü **online+müsait PCS sayısına bölünür** (unavailable/fault/bakım hariç) → MV ölçüm hücresinden gerçek akış doğrulaması (PCS feedback'i TEK başına yeterli sayılmaz).

**Algoritma (MANUEL):**

```pseudo
ALGORİTMA fl02_charge (MANUEL):
operatör girdileri: group (-1 = santral; 0..N-1 = pcsIds[i]), powerKw
  adımlar = stepsFor("charge", pcsIds)
  eğer group >= 0 → adımlar = [pcsIds[group]]            // grup filtresi
  perDevice = floor(powerKw / adım sayısı)               // eşit dağıtım — distribute transform
  Mode: parallel, onFailure: continue
  her adım: PCS-i → "charge" params { powerKw: perDevice }   // S06 ← −perDevice (NEGATİF)
  doğrulama: A40 (grid aktif güç) işaret + B09/B10 limit aşımı kontrolü (I-3)
  rollback: başarısız adımlar → "stop"
// fl02_discharge: aynı akış; S06 ← +perDevice
```

**Komut/Manevra Yapısı (UYGULANMIŞ):**

```ts
fl02_charge:    { mode: "parallel", onFailure: "continue",
                  steps: stepsFor("charge", pcsIds), rollbackSteps: stepsFor("stop", pcsIds) },
fl02_discharge: { mode: "parallel", onFailure: "continue",
                  steps: stepsFor("discharge", pcsIds), rollbackSteps: stepsFor("stop", pcsIds) },
// MANEUVER_CONTROLS:
fl02_charge: { inputs: [groupInput, powerInput], transform: distribute },
// distribute: (values, steps) => steps.map(() => ({ powerKw: floor(values.powerKw / steps.length) }))
```

**Register eşlemesi:** `charge` → S06 ← **−powerKw** · `discharge` → S06 ← +powerKw · `stop` (rollback) → S17 ← 1. İzleme: A40, B09/B10.

**Operasyon eşlemesi (2026-09-17 kararı — REV.01.2 K12 hizalaması):** FL-02 iki ayrı sistemde komut çalıştırdığı için
(uzak: konteyner BSC hazırlığı tünel üzerinden; yerel: Wattox PCS setpoint) sunucu migrasyonunda
**OPERASYON** kaydı olarak kurgulanır — `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` §6.1
(`field_charge` örneği: `sequential` + `onFailure: "rollback"`; uzak adım
`bsc_prepare` = kontaktör + start — **güç param'ı konteynere GİTMEZ (K12: BSC'de charge
komutu YOK)**; güç param'ı YALNIZCA yerel `pcs_charge` adımında — S06 NEGATİF;
`divideTotal` çapraz-sistemde uygulanmaz, PCS dağıtımı yerel manevranın içindedir).
Migrasyona kadar mevcut frontend üretimi
(`buildFieldManeuvers` + `execute-multi`) geçerlidir.

### 3.3 FL-03 — Idle/Standby (manuel kart)

**Sistem Yapısı:** **MANEVRA** — yalnız PCS komutu + okuma; "DC Block'a Idle bildirimi"
pasif bildirimdir, konteynere uzak komut GÖNDERİLMEZ (REV.01.5 kriteri).

**Akış:** Güç komutunu sıfıra indir → gerçek akış eşiğin altına düştü mü doğrula → DC Block + PCS'lere Idle bildirimi → PCS enerjili kalır (standby: S19), şarj/deşarj komutu yok → izleme sürer → grup seçilmişse yalnızca o grup.

**Algoritma (MANUEL):**

```pseudo
ALGORİTMA fl03_idle (MANUEL):
operatör karttan tetikler →
  Mode: parallel, onFailure: continue
  adım: PCS-1..N → "set_power_zero"       // S06 ← 0 — UYGULANMIŞ davranış
  doğrulama: A40 |akış| < eşik (S10 — mühendise sorulacak)
  NOT: standby (S19 ← 1) ayrı bir adımdır — mevcut uygulama yalnızca setpoint sıfırlar;
       dokümanın "PCS enerjili kalır (standby)" adımı gerekirse sonradan eklenir (DOGRULAMA N3).
  NOT: "DC Block'a Idle bildirimi" pasif — konteyner akışın durduğunu kendi
       telemetrisinden görür; uzak komut YOK.
```

**Komut/Manevra Yapısı (UYGULANMIŞ):**

```ts
fl03_idle: { mode: "parallel", onFailure: "continue", steps: stepsFor("set_power_zero", pcsIds) },
```

**Register eşlemesi:** `set_power_zero` → S06 ← 0 · (aday) `standby` → S19 ← 1. Doğrulama: A40, A26.

### 3.4 FL-04 — Calibration (manuel + zamanlı OTO)

**Sistem Yapısı:** **MANEVRA** — iç algoritma DC Block'ta kendi çalışır (konteyner
kataloğu: "iç algoritma DC Block'ta" — uzak komut YOK; konteyner tamamlanma/fault
durumunu sahaya raporlar). Field tarafı yalnız PCS ön koşulu: `standby`. Güç akışı K12
gereği PCS S06'dandır (BSC'de charge komutu YOK).

**Akış:** Tetikler: ilk devreye alma / aylık periyodik / ≥3 ay kapalılık sonrası / manuel / rack içi hücre voltaj sapması (20 mV) → PMS: bildir → operatörden tarih/saat iste → **planlanan zamanda OTO başlat** (koşullar uygunsa) → izle → tamamlanma DC Block'tan raporlanır → başarı/fault kaydı. **Süre aşımı → fault + şarj/deşarj YASAK** (interlock I-2). İç algoritma DC Block'ta — PMS yalnızca yaşam döngüsü.

**Algoritma (MANUEL — uygulanmış davranış):**

```pseudo
ALGORİTMA fl04_calibration (MANUEL):
operatör tetikler (timerConfig — ManeuverCard "Zamanlı" kutusu) →
  Mode: parallel, onFailure: continue
  adım: PCS-1..N → "standby"       // S19 ← 1 — ön koşul: güç komutu YOK
  NOT (K12): kalibrasyon güç akışı YALNIZCA PCS S06'dan verilir (BSC'de charge komutu YOK);
       DC Block iç algoritması BSC tarafını kendisi yönetir.
```

**Algoritma (OTOMATİK aday — Aşama-2):** "planlanan zamanda OTO başlat" = zaman tetikli kural — mevcut şema koşul tabanlıdır; zamanlı kural ayrı karar (bkz. §5). Süre aşımı → I-2 interlock (komut reddi).

**Komut/Manevra Yapısı (UYGULANMIŞ):**

```ts
fl04_calibration: { mode: "parallel", onFailure: "continue", steps: stepsFor("standby", pcsIds) },
// MANEUVER_CONTROLS: fl04_calibration: { timerConfig: true }
```

**Register eşlemesi:** `standby` → S19 ← 1. İzleme: B15/B16 (hücre voltaj sapması), B13/B14 (sıcaklık).

### 3.5 FL-05 — Emergency Stop (manuel kart + fiziksel buton)

**Sistem Yapısı:** **MANEVRA** — konteyner kendi E-stop'unu KONTEYNER FL-03 ile yapar
(kendi kataloğu — referans) ve önemli logları sahaya tag'li raporlar; field yalnız PCS
tarafını durdurur (site çapı koordinasyon gerekirse operasyon adayı — §7 notu).

**Akış:** Konteyner E-stop → **etkilenen grup izole edilir**: PCS şarj/deşarj durdur + setpoint 0 (S17 + S06=0) → PCS kontaktörleri AÇ → MV kesici AÇ + toprak pozisyonu → doğrulama (PCS durdu A26=0, kontaktörler açık A54/56/58, kesici pozisyonda) → her şey loglanır.

**Algoritma (MANUEL):**

```pseudo
ALGORİTMA fl05_emergency_stop (MANUEL):
operatör karttan/butondan tetikler →
  Mode: parallel, onFailure: continue
  adım 1: PCS-1..N → "stop"           // S17 ← 1
  adım 2 (HEDEF): PCS-1..N → S06 ← 0  // setpoint sıfırlama — doküman "S17 + S06=0" der;
                                       // mevcut uygulama yalnızca stop üretir (set_power_zero ayrı kart)
  doğrulama: A26 == 0 (Stop), A54/A56/A58 kontaktörler AÇIK
  ⛔ MV kesici AÇ + toprak: motorlu değilse MANUEL talimat (I-4 — UI bilgisi)
```

**Komut/Manevra Yapısı (UYGULANMIŞ):**

```ts
fl05_emergency_stop: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop", pcsIds) },
```

**Register eşlemesi:** `stop` → S17 ← 1 · (HEDEF) S06 ← 0. Doğrulama: A26, A53-A58. İzleme: A59 (E-stop bitleri — R-06 tetikleyicisi).

### 3.6 FL-06 — Recovery (GİZLİ — OTO, R-06 UYGULANMIŞ)

**Sistem Yapısı:** **MANEVRA (kural R-06)** — field tarafı yalnız PCS (`fault_reset` +
`standby`); konteyner kendi durumunu kendi kataloğuyla yönetir ve sahaya raporlar.
Prosedürdeki "DC Block/AUX sağlıklı" ön koşulları konteyner TELEMETRİSİ/olaylarıyla
izlenir — uzak komut YOKTUR.

**Akış:** E-stop pasif + fault ack/reset → (tek grup ise yalnızca o grup; genel site E-stop ise tüm ekipman) → DC Block, PCS, MV, iletişim, AUX, koruma sistemleri sağlıklı → emergency durumundan çık → normal pozisyonlara döndür → Standby (S19). **Şarj/deşarj OTO geri GELMEZ** — operatör/üst sistemden yeni komut şart.

**Algoritma (OTOMATİK — RuleEvaluator kenar-tetik; `config-field/rules.json`):**

```pseudo
ALGORİTMA r06_recovery:
her management snapshot'ında:
  koşullar = [ PCS-1."Emergency Stop Button Status" == 0  debounce 2000 ms,
               PCS-1."PCS Fault Status" == 0 ]
  eğer hepsi(koşullar):
    YÜKSELEN KENAR →
      PCS-1 → "fault_reset"   // S18 ← 1
      PCS-1 → "standby"       // S19 ← 1
      log auto_rule_r06_recovery + notify
      cooldown 60000 ms
  İNTERLOCK: kural ASLA charge/discharge setpoint yazmaz (şarj OTO geri gelmez)
```

**Komut/Manevra Yapısı (UYGULANMIŞ — gizli kart + gerçek kural):**

```ts
// buildFieldManeuvers (gizli — UI'da gösterilmez):
fl06_recovery: { mode: "parallel", onFailure: "continue",
                 steps: [...stepsFor("fault_reset", pcsIds), ...stepsFor("standby", pcsIds)] },
```

```jsonc
// services/management-service/deployment/config-field/rules.json — ÇALIŞAN KURAL
{ "name": "r06_recovery", "enabled": true, "cooldownMs": 60000,
  "when": { "all": [
    { "device": { "ids": ["PCS-1"] }, "telemetry": "Emergency Stop Button Status", "op": "eq", "threshold": 0, "debounceMs": 2000 },
    { "device": { "ids": ["PCS-1"] }, "telemetry": "PCS Fault Status", "op": "eq", "threshold": 0 } ]},
  "then": [
    { "action": "command", "deviceId": "PCS-1", "command": "fault_reset" },
    { "action": "command", "deviceId": "PCS-1", "command": "standby" },
    { "action": "log", "level": "info", "eventCode": "auto_rule_r06_recovery", "message": "FL-06 Recovery: E-stop kalkti — sistem Standby'a dondu" },
    { "action": "notify" } ] }
```

**Register eşlemesi:** `fault_reset` → S18 ← 1 · `standby` → S19 ← 1. Tetikleyici veri: A59 (E-stop), A28 (fault), Alarm 6 bit15 / Alarm 7 bit0-1 (E-stop fault temizliği — ön koşul genişletmesi adayı).

### 3.7 FL-07 — Communication Loss (GİZLİ — OTO; gövde BOŞ)

**Sistem Yapısı:** **MANEVRA (kural R-07)** — aksiyon yalnız PCS `stop`; konteynere uzak
komut YOKTUR. Konteyner tarafı FL-09 (iletişim kaybı) zaten DEFER edilmiş durumda
(KONTEYNER-MANEVRA-KATALOGU REV.03 K7) — çakışma yok; konteyner bağlantı durumu
ContainerProxy'den izlenir.

**Akış:** PPC (= konteyner→field, ContainerProxy stale/idle) VEYA ekipman iletişim kaybı (PCS offline) → şarj/deşarj YÜRÜTME → bilgi + log → bağlantı dönünce normal işletime devam (idle bekle — yeni komut gerekir).

**Algoritma (OTOMATİK — taslak; doküman gelince netleşir):**

```pseudo
ALGORİTMA r07_comm_loss (TASLAK):
her snapshot'ta:
  koşullar = [ Container-N."Connection" == stale|idle (synthetic — §5 sinyal kararı),
               PCS-i offline ]
  eğer herhangi(koşullar):
    YÜKSELEN KENAR →
      ilgili PCS → "stop"          // S17 ← 1
      ilgili PCS → S06 ← 0
      log + notify
```

**Komut/Manevra Yapısı (UYGULANMIŞ — gizli kart):**

```ts
fl07_comm_loss: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop", pcsIds) },
```

**Register eşlemesi:** `stop` → S17 ← 1 · (taslak) S06 ← 0. Veri kaynağı: ContainerProxy durumu → synthetic `MANAGEMENT` job'ı (§5 — (a) seçeneği tercihli).

### 3.8 FL-08/FL-09 — Black Start / Microgrid (doküman beklenir)

Gövde BOŞ — algoritma YAZILMAZ. Wattox hazırlığı mevcut: grid-forming (S32), primer frekans/voltaj kontrolü (S33-S38), sanal atalet/sönüm (S39-S41), off-grid modu (S02=1) + off-grid parametreleri (S13/S14). Gövdeler gelince kural/komut seti bu register'larla kurulur.

### 3.9 FL-10 — Islanding / Grid Loss (GİZLİ — OTO; gövde BOŞ)

**Sistem Yapısı:** **MANEVRA (kural R-10)** — aksiyon yalnız PCS `stop`; konteynere uzak
komut YOKTUR (islanding/grid olayları konteyner tarafından da izlenip sahaya raporlanır
gerekirse — doküman gelince netleşir).

**Algoritma (OTOMATİK — taslak; veri kaynakları HAZIR):**

```pseudo
ALGORİTMA r10_islanding (TASLAK):
her snapshot'ta:
  koşullar = [ PCS-i Alarm word 3 bit9 (Islanding fault) == 1,
               PCS-i fault word 3 grid aşırı/düşük V/f bitleri ]
  eğer herhangi(koşullar):
    YÜKSELEN KENAR →
      ilgili PCS → "stop"          // S17 ← 1
      log + notify
```

**Komut/Manevra Yapısı (UYGULANMIŞ — gizli kart):**

```ts
fl10_islanding: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop", pcsIds) },
```

**Register eşlemesi:** `stop` → S17 ← 1. İzleme: Alarm 3 bit9, A35 (frekans), A43-A45 (gerilimler).

### 3.10 FL-11 — Maintenance Mode (manuel kart)

**Sistem Yapısı:** **OPERASYON** — "DC Block maintenance moduna al" konteynerde
komut/manevra ÇALIŞTIRMAYI gerektirir → uzak adım: konteyner
`fl10_maintenance_shutdown` (BSC `open_contactors` + CB `open` — konteyner kataloğunda
doğru kabul edilir) SAHADAN çalıştırılır; yerel adım: PCS `stop`. Bugün: yerel MANEVRA
(konteyner kartı operatör ayrıca basar) — migrasyonda operasyonlaşır.

**Akış:** Operatör grup/alan seçer → DC Block maintenance moduna alınır → PCS stop + kontaktör komutları → MV kesici AÇ + topraklama şalteri toprak pozisyonuna → doğrulama (DC Block maintenance, kontaktörler pozisyonda, kesici açık, topraklama aktif) → alan güvenli izole.

**Algoritma (HEDEF — operasyon):**

```pseudo
ALGORİTMA fl11_maintenance (OPERASYON):
operatör grup seçer →
  Mode: sequential
  adım 1 (UZAK): sistem "container-N" → manevra "fl10_maintenance_shutdown"
                  // BSC open_contactors (0x0004) + CB open (COIL 0 ← 1)
  adım 2 (YEREL): PCS-1..N → "stop"          // S17 ← 1
  doğrulama: A26 == 0, A53-A58 kontaktör/kesici pozisyonları
  ⛔ MV kesici + topraklama şalteri: motorlu değilse MANUEL talimat (I-4)
```

**Algoritma (BUGÜN — yerel manevra):**

```pseudo
ALGORİTMA fl11_maintenance (MANUEL — uygulanmış):
operatör grup seçer →
  Mode: parallel, onFailure: continue
  adım: PCS-1..N → "stop"          // S17 ← 1
  doğrulama: A26 == 0, A53-A58 kontaktör/kesici pozisyonları
  (konteyner bakım kartı operatör tarafından ayrıca çalıştırılır — migrasyonda
   yukarıdaki operasyonun uzak adımı olur)
```

**Komut/Manevra Yapısı (UYGULANMIŞ):**

```ts
fl11_maintenance: { mode: "parallel", onFailure: "continue", steps: stepsFor("stop", pcsIds) },
```

**Register eşlemesi:** `stop` → S17 ← 1. Doğrulama: A26, A53-A58.

## 4. Interlock'lar (otomatik engelleyiciler)

| Kod | Interlock | Kaynak | Uygulama katmanı |
|:----|:----------|:-------|:-----------------|
| I-1 | **Toprak bıçaklı kesici varken şarj/deşarj KABUL EDİLMEZ** (doküman: "ASLA AMA ASLA") | ⛔ MV şalt pozisyon verisi | komut doğrulama (web-service command-routes ön-kontrol) + kural (management-service) + UI engeli |
| I-2 | Kalibrasyon süre aşımı → şarj/deşarj YASAK | kalibrasyon durumu (DC Block) | komut doğrulama + kural |
| I-3 | Şarj/deşarj sırasında B09/B10 limitleri dağıtım hesabında zorunlu | B09/B10 | dağıtım mantığı (frontend transform + kural) |
| I-4 | Motorlu olmayan MV kesici → kullanıcıya manuel talimat (UI) | MV ekipman metadatası | UI + manevra akışı |

**Yürütme katmanındaki yeri (REV.02):** Interlock'lar sunucu hiyerarşisinde
komut doğrulama reddi olarak çalışır — yürütücü reddi "adım başarısız" görür,
`onFailure` uygulanır. Sözleşme: `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` §7.3.

## 5. Otomasyon Kuralları (field tier management-service)

| Kural | Tetikleyici | Aksiyon | Durum |
|:------|:------------|:--------|:------|
| R-06 | FL-06: E-stop düşen kenar + fault temiz + sağlık | fault_reset + standby + log/notify | Tasarım hazır — uygulanabilir |
| R-07 | FL-07: ContainerProxy stale/idle VEYA PCS offline | ilgili PCS stop + log | Gövde boş — doküman beklenir; sinyal kaynağı tasarımı gerekir |
| R-10 | FL-10: islanding/grid alarm bitleri | PCS stop + log | Gövde boş — doküman beklenir |
| R-I1 | I-1: toprak bıçağı aktif | şarj/deşarj reddi | MV verisi beklenir |

**Sinyal kaynağı kararı (R-07 için):** ContainerProxy durumunu MANAGEMENT akışına taşımak için iki seçenek: (a) field web-service, konteyner durum değişiminde synthetic `MANAGEMENT` job'ı yayınlar (deviceId="field", telemetry: `{name:"Container N Connection", value:0/1/2}`); (b) management-service'e `IContainerConnectionSource` enjeksiyonu. Aşama-2 kararı — (a) mevcut kuyruk kontratını bozmaz, tercih edilir. **Çapraz referans:** aynı synthetic-sinyal deseni konteyner tier FL-09 "ekipman offline" kural girdisi için de adaydır (`KONTEYNER-MANEVRA-KATALOGU-REV03` §4.3 — K7 defer) — iki taraf birlikte tasarlanırsa tek mekanizma kurulur.

## 6. Veri Boşlukları (yeni cihaz config'leri gerektirir)

| # | Eksik | Etkileyen | Not |
|:--|:------|:----------|:----|
| G-1 | MV şalt (kesici konum/komut, topraklama şalteri, motorlu/motorsuz) | FL-01/02/05/11 + I-1/I-4 | motorlu değilse UI'da manuel talimat |
| G-2 | ~~AUX trafo enerji analizörü~~ | FL-01 | ✅ **ÇÖZÜLDÜ (REV.01.4)** — AUX = konteyner PM5340 (K3); field tünel telemetrisi + konteyner olay raporlamasıyla okur; field tier'da ayrı AUX analizörü YOK |
| G-3 | MV ölçüm hücresi enerji analizörü | FL-01/02 (doğrulama) | geçici çözüm: PCS A40 |
| G-4 | Trafo ölçümleri | FL-02 | |
| G-5 | Kalibrasyon takvimi deposu | FL-04 + I-2 | DB/CRUD veya config |
| G-6 | FSS durumu | FL-01 önkoşulu (eski akışlar) | REV.01'de önkoşul listesinde değil ama izleme kapsamında |

## 7. Frontend Planı (field Control sayfası + ManeuverCard)

- **Kart seti:** FL-01, FL-02, FL-03, FL-04, FL-05, FL-11 (+ FL-06/07/10 GİZLİ — `HIDDEN_MANEUVER_NAMES` field benzeri).
- **Grup seçici:** yeni input tipi (`group`/`device-select`) — konteyner başına grup (PCS-1..PCS-N); seçim yoksa "tümü" (santral seviyesi).
- **Dağıtım transform'u:** santral gücü → online+müsait PCS listesine eşit bölme (`steps.map` deseni — mevcut `transform` altyapısı yeterli; PCS müsaitliği hook'tan).
- **Mevcut desen korunur:** `buildFieldManeuvers(pcsIds)` dinamik liste üretimi — N konteyner için ölçeklenir; `MANEUVER_CONTROLS` transform'ları buna göre genişler.
- **İnterlock UI'ı:** I-1 (toprak bıçağı → şarj/deşarj kartı pasif + uyarı), I-4 (motorlu kesici yok → "manuel yapın" bilgisi).
- **FL-04 timer:** ManeuverCard `timer` özelliği mevcut — takvim girişi eklenecek.
- **Sunucu migrasyonu (REV.02 — REV.01.5 ile HİZALANDI):** Katalog
  `maneuvers.json`/`operations.json`'a taşınırken konteynerde komut/manevra
  ÇALIŞTIRILAN akışlar **OPERASYON** kaydı olur (REV.01.5 kriteri: başka sistemden
  yalnız OKUMA operasyon DEĞİLDİR):
  - **FL-02** (uzak `bsc_prepare` + yerel `pcs_charge` — §3.2; K12: güç param'ı
    konteynere GİTMEZ),
  - **FL-11** (uzak konteyner `fl10_maintenance_shutdown` + yerel `stop`).
  Yalnız okuma + PCS komutu yapan akışlar **MANEVRA/kural** kalır:
  `FL-01/03/04/05/06/07/10` (FL-01/FL-03 konteynerden okur ama konteynerde komut
  ÇALIŞTIRMAZ; FL-04 iç algoritma DC Block'ta kendi çalışır; FL-05/06/07/10 yalnız
  PCS'tedir — konteyner kendi tarafını kendi kataloğuyla yapar + sahaya raporlar).
  Yerel PCS dağıtımı operasyonun İÇİNDEKİ `pcs_charge` manevrasında kalır:
  kayıt adımı `deviceTypes: ["pcs"]` (online+müsait çözümü yürütücüde), grup seçimi
  yürütme isteğindeki `deviceIds` kısıtı, `divideTotal` sunucu transform'u —
  `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` §5.1. Bu migrasyona kadar frontend üretimi
  (`buildFieldManeuvers` + `execute-multi`) geçerlidir.

## 8. Field Stack Wiring

- `deployment/docker-compose.field.{yml,dev.yml}`'e **device-service** eklenir (field tier — şu an yok): `SERVICE_TIER=field`, Wattox config mount (`config-field/`), `FIELD_ID` kimliği.
- Management-service field tier'da koşar (rules.json — R-06 başlangıç; R-07/R-10 doküman sonrası).
- Ölçeklenebilirlik: konteyner eklendikçe `pcs-<N>.json` config eklenir — kod değişmez (device-service config odaklı; frontend dinamik cihaz listesinden).

## 9. Kabul Kriterleri

| Kod | Kriter |
|:----|:-------|
| K-M1 | REV.01 kart seti field Control'da; FL-06/07/10 görünmez |
| K-M2 | FL-02 grup seçimi + eşit dağıtım transform'u (online PCS'ler) testli |
| K-M3 | Şarj NEGATİF setpoint konvansiyonu uçtan uca (UI→CommandJobBuilder→job) testli |
| K-M4 | R-06 kuralı: E-stop düşen kenar → fault_reset + standby; şarj/deşarj ASLA otomatik geri yüklenmez |
| K-M5 | I-1 interlock'u komut katmanında reddeder (MV verisi geldiğinde devreye girer — öncesi UI engeli) |
| K-M6 | Field compose'da device-service + PCS config'ler çalışır (gözle) |
| K-M7 | Kapılar: yeni kod ≥%70 satır; dağıtım/interlock ≥%90 branch |

## 10. Görev Listesi

| Görev | İçerik |
|:------|:-------|
| T-M1 | JSDoc + tipler: grup seçimi (`ManeuverConfig`/`MANEUVER_CONTROLS` uzantısı), dağıtım sözleşmesi |
| T-M2 | `field-control/maneuvers.ts` — REV.01 katalog + transform'lar + hidden set |
| T-M3 | Control sayfası: kart seti + grup seçici + interlock UI'ı |
| T-M4 | Field compose: device-service + config mount + env şablonları |
| T-M5 | R-06 kuralı (rules.json — field) + ContainerProxy→synthetic telemetry kaynağı (R-07 hazırlığı) |
| T-M6 | Testler: dağıtım transform, konvansiyon, interlock, R-06 (fake timers) |
| T-M7 | DOGRULAMA + TEST-KAPSAMI + test-envanteri güncelleme |

## 11. Aşama Eşlemesi

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-M1 |
| 3. TEST | T-M6 (kırmızı) |
| 4. IMPL | T-M2..T-M5 |
| 5. SONUÇ | `FIELD-MANEVRA-REV01-DOGRULAMA.md` |
| 6. KAPSAM | `FIELD-MANEVRA-REV01-TEST-KAPSAMI.md` + envanter |

## 12. Mühendis Ekibine Açık Sorular

| # | Soru | Etki |
|:--|:-----|:-----|
| S9 | FL-01 aksiyon/monitoring register'ları (dokümanda "Varies") — netleşecek mi? | FL-01 uygulaması |
| S10 | FL-03 "akış eşiği" değeri (idle doğrulama) | FL-03 |
| S11 | FL-05 PCS kontaktör açma — ayrı register mı, stop/standby ile mi? | FL-05 |
| S12 | FL-07/08/09/10 prosedür dokümanları ne zaman? | kural + kart seti |
| S13 | MV şalt/AUX/ölçüm hücresi cihaz dokümanları (G-1..G-4) | interlock'lar + FL-01/02 |
| S14 | Kalibrasyon takvimi kaynağı (operatör girişi mi, EMS'ten mi)? | FL-04 + I-2 |
