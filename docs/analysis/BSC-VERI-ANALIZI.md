---
status: active
space: analysis
tags: [analiz, bsc, batarya]
review_date: 2026-08-24
---

# BSC & PCS (EMU) Veri Analizi

Tarih: 2026-08-13
Kaynak dökümanlar:
- BSC: `20250730_Flex_BSC_Modbusmap_JF1_Rev_AF.xlsx` (LGES, JF1 Rack, G3L_RBMS_Modbus_Map_v2.5d)
- PCS/EMU: `EMU Modbus TCP protocol_V0.0.2.xlsx` (Energy Station, Unit ID 1, port 502, big endian)

Config'ler: `configs/bsc.json`, `configs/pcs.json`, `configs/emu.json` (canonical) + uygulama kopyaları.

## Önemli Not

**LG'nin zorunlu tuttuğu BSC budur — sahada bundan başka BSC modeli kullanılmayacaktır.** Bu konfigürasyon tek standarttır; register haritası, komut protokolü ve zorunluluklar Rev AF dökümanına göre sabitlenmiştir.

## Doğrulama Özeti (diff sonuçları)

Resmi döküman ile config kıyaslandı (`B2C(BSC Data)`, `B2C(BSC Flag)`, `C2B(Controller Data)`, `B2C(Rack Data)`, `Request Ack. Table`):

| Konu | Durum | Aksiyon |
|---|---|---|
| Input register adresleri (30000–30169, rack blokları) | ✓ uyumlu | — |
| Register tip/scale (INT32 akım, UINT32 voltaj/limit, 0.01 SOC...) | ✓ uyumlu | — |
| Byte order (BIG_ENDIAN) | ✓ uyumlu | — |
| 30037 BSC Information bitfield'ı (ChargeStatus b4–5, PreVPC/VPC/SPC/TPC) | ✓ uyumlu | — |
| 30043 bitfield'ı | ✗ eksikti | Under SOC (b6–8), Over SOC (b9–11), Over Discharge Power (b12–14) eklendi |
| 30044 bitfield'ı | ✗ hatalıydı | Over Discharge Power çıkarıldı; sadece Over Charge Power (b0–2) kaldı |
| 30045/30047 bitfield'ları | ✗ hatalıydı | MFRD + Over Offline Rack 30045'ten 30047'ye taşındı |
| Rack diyagnostik bitfield'ları (30238–30251) | ✗ eksikti | 10 diyagnostik × 8 rack eklendi (Alarm b12/Warning b13/Fault1 b14/Fault2 b15) |
| 30223 Component Feedback Status | ✗ eksikti | 8 rack için eklendi (Fuse, BPU Fan, Pack Fan1/2, CB, MC±) |
| **Komutlar (C2B 40010)** | ✗ **hatalıydı** | charge/discharge kaldırıldı → resmi komut setine geçildi (aşağıda) |
| **40030/40031 Charge/Discharge Setpoint** | ✗ **uydurmaydı** | Resmi haritada yok (C2B 40028'de biter) — silindi |
| 40011–40017 Manual Racks / 40020–40028 Disabled Racks | ✓ uyumlu | — |
| Controller Heartbeat 40000 | ✓ uyumlu | — |
| pollIntervalMs | ✗ 2000'di | 1000'e çekildi (resmi: "updated/read every 1 second") |
| İsim farkları (örn. "BSC DC Charge Power Limit" ↔ "Charge Power Limit") | ~ kozmetik | Sistem içi metric adları korundu; resmi adlar bu dokümanda referans |

## Register Haritası

### B2C (BSC → Kontrolcü, Input Register, FC 0x04)

| Blok | Aralık | İçerik |
|---|---|---|
| Nameplate | 30000–30029 | SW versiyon, toplam rack sayısı (30005) |
| Request Ack. | 30030–30034 | Request Acknowledge (30030), Last Accepted Req (30031) |
| Essential | 30035–30069 | Heartbeat (30035), State (30036), Info bitfield (30037), Online Rack (30038), LOC/SOC/Over Power bitfield'ları (30043–30050), SOC (30055), SOH (30056), Anticipated V (30057), DC Voltage (30059), DC Current (30061), **Charge Power Limit (30063)**, **Discharge Power Limit (30065)** |
| Summary | 30070–30169 | Max/Avg/Min SOC, SOH, Cell Sum Voltage, Current, CellVoltage, Temperature + Rack/Pack/Cell lokasyonları; Recalibration Racks (30107) |
| Rack N Nameplate | 30170+(N-1)×150 | RBMS/Updater/Boot versiyonları, BMS seri no, sensör sayıları, Pack Type |
| Rack N Summary | 30220+(N-1)×150 | State, Status Flags (30221), Component Status (30222), Component Feedback (30223), Heartbeat (30224), SOC/SOH/limitler/voltaj/akım/sıcaklıklar (30228–30265), **diyagnostik bitfield'ları (30238–30251)**, MC Open Count (30270), Calibration Info (30271), Non-balancing Entry Period (30273) |

### B2C Flag (Discrete Input, FC 0x02)

Rack başına 6 flag bloğu: Disabled (1–N), Online (N+1–2N), Alarm (2N+1–3N), Warning (3N+1–4N), Fault (4N+1–5N), Non-Balancing (5N+1–6N). N = toplam rack sayısı (30005).

### C2B (Kontrolcü → BSC, Holding Register, FC 0x03/0x06/0x10)

| Adres | Register | Kural |
|---|---|---|
| 40000 | **Controller Heartbeat** | 0–255 döngüsü, **1 sn arayla yazılmalı** |
| 40010 | Command Request | aşağıdaki komut tablosu |
| 40011–40017 | Manual mode seçili rack flag'leri | sadece Close Contactors (manual) |
| 40020–40028 | Start komutunda devre dışı rack flag'leri | Start'tan önce yazılmalı |

## Komut Seti (40010 — düzeltilmiş)

| Komut | Değer | Not |
|---|---|---|
| Emergency | 0x0001 | En yüksek öncelik — tüm kontaktörler açılır |
| Start | 0x0002 | İzlemeyi başlat; rack init 30 sn timeout; devre dışı rack'ler önceden yazılır |
| Stop | 0x0003 | İzlemeyi durdur; akım akıyorsa reddedilir (0x000A) |
| Open All Contactors | 0x0004 | — |
| Close Contactors | 0x0005 | Manual modda rack seçimi gerekir; timeout = rack×400+5000 ms |
| Enter Manual Mode | 0x0006 | Kontaktörler açılarak girilir |
| Exit Manual Mode | 0x0007 | — |
| Event Clear | 0x0009 | 30 sn cooldown |
| Reset | 0x000A | RBMS+BSC reboot; CER kayıtları (PDVF/RDVF) temizlenmez |
| ~~Charge / Discharge~~ | ~~0x000B~~ | **YOK** — resmi haritada kaldırılmış. Güç kontrolü PCS'indir. |

- Her komut `Request Acknowledge (30030)` ile doğrulanır: `0x0001 In Progress` → `0x0002 Done`; red nedenleri `0x0005–0x0013`, `0x0030–0x0031` (config'de `validate.reads` olarak tanımlı).
- Config komutları: `emergency, start, stop, open_contactors, close_contactors, enter_manual, exit_manual, event_clear, reset` — hepsi `atomic: true`.

## LG Zorunlulukları

1. **Controller Heartbeat (40000):** 1 sn arayla yazılmalı. Yazılmazsa BSC "S-C LOC" tanısı koyar ve tüm kontaktörler/koruma elemanları açılır; heartbeat tekrar gelince temizlenir. Kontrolcü de iletişim hatası teşhis edip şarj/deşarjı durdurmalıdır.
2. **Güç limitleri (30063/30065):** Şarj/deşarj gücü, limitin **5 saniye içinde** altında tutulmalıdır; aksi halde Over Charge/Discharge Power Warning/Fault oluşur (30043/30044 bitfield'ları). PCS setpoint'leri bu limitlerle kısıtlanmalıdır.
3. **Komut protokolü:** Request Acknowledge doğrulaması + red nedenleri (ack tablosu) dikkate alınmalıdır.

## Tag Modeli (kural)

| Kaynak | Tag'ler | Örnek |
|---|---|---|
| Config (elle, doküman semantiği) | `rack_id`, `aggregation`, `variant`, `component` | `rack_id: "system"`, `aggregation: "max"` |
| Device-service (otomatik, çalışma zamanı) | `device_id` + tier tag'i | container-level: `container_id` (env `CONTAINER_ID`); field-level: `field_id` (env `FIELD_ID`) |

- Config dosyalarında `deviceId`/instance tag'i **bulunmaz** (kopyalardan temizlendi).
- **Uygulandı**: `TelemetryTagger` (`device-service/src/telemetry-tagger.ts`) — `readDevice` + komut-sonrası okuma çıkışını zenginleştirir; elle girilen tag'ler korunur, `device_id` her zaman eklenir, env varlığına göre `container_id`/`field_id` eklenir. Config tanımları `shared-utils`: `site.containerId` (env `CONTAINER_ID`), `site.fieldId` (env `FIELD_ID`). Compose'larda `CONTAINER_ID: ${CONTAINER_ID:-container-1}`.
- TelemetryData tags konvansiyonu snake_case: `device_id`, `container_id`, `field_id`, `rack_id`.

## Config Dosya Düzeni

- **Canonical kök: `configs/`** — model adıyla: `bsc.json`, `hvac.json` (eski `*-simulator.json` adları kaldırıldı).
- Uygulama kopyaları: `packages/services/device-service/config/` (bsc-1, bsc-2 — instance) ve `deployment/config-docker/` — canonical'den türetilir.
- Config'ler "uygulama bazlı" değildir; aynı cihaz config'i hangi tier'da koşarsa koşsun geçerlidir — tier farkı runtime tag'lerinde (`container_id`/`field_id`) ortaya çıkar.

## Field'a Çekilecek Veriler (proxy + hafif aggregate)

| Tier | Veri | Kullanım |
|---|---|---|
| **A — sürekli** | SOC, SOH, DC Voltage, DC Current, State, ChargeStatus (30037 b4–5), Online/Total Rack, Charge/Discharge Power Limit, alarm özetleri (BSC Alarm/Warning/Fault, Controller LOC, Over Charge/Discharge Power, Under/Over SOC) | Container kartı, topoloji şeridi, field grafikler |
| **B — istek üzerine** | Rack SOC/SOH/Temp/CellVoltage, diyagnostik bitfield'ları (30238–30251), Balancing Time, Calibration Info, Non-balancing Period, MC Open Count | Container lokal UI; field'da alarm kaynaklı detay |
| **C — nadiren** | Version, Serial Number, sensör sayıları, Pack Type | Asset raporu |

## Saha Enerji Akışı Tutarlılığı

- Gerçek BSC'de **"Power" register'ı yoktur.** Mock'taki `Power` adı gerçek modele oturmuyor.
- Karar (uygulandı): Şebeke kutusu **iki değeri** gösterir: (1) gerçek akış, (2) kullanılabilir güç (LG limit). Mock'ta `AvailableChargePower`/`AvailableDischargePower` eklendi.
- Yön: 30037 ChargeStatus bitfield'ı (00=None, 01=Charge, 10=Discharge, 11=Idle).
- Açık karar: "gerçek akış" kaynağı PCS dökümanıyla netleşecek (PCS ActivePower mı, BSC Voltage×Current mı).

## İş Kalemleri (açık)

| # | İş | Taraf | Durum |
|---|---|---|---|
| 1 | Device-service otomatik tag'leme (`device_id` + `container_id`/`field_id`) | Container + Field (ortak kod) | **Yapıldı** (`TelemetryTagger`) |
| 2 | Controller Heartbeat yazma (40000, 1 sn) | Container device-service | **Evdeki PC** — kodda henüz yok |
| 3 | Simulator güç modeli: charge/discharge komut + 40030/40031 kalıntılarını kaldır; güç PCS/setpoint dışı model | Simulators | **Evdeki PC** — register-map'te not düşüldü |
| 4 | Container manevraları: BSC'den charge/discharge çıkar; start/stop/emergency/event_clear kalır | container-web MANEUVERS | **Evdeki PC** |
| 5 | Field manevraları PCS komutlarıyla limit kontrolü (BSC 30063/30065 + PCS offset 21/22) | Field | Backend gelince (mock manevralar hazır) |
| 6 | Mock `Power` → gerçek register adlarına geçiş | Field UI mock | Kısmen yapıldı (PCS/EMU gerçek adlarda) |
| 7 | PCS/EMU config'leri + simülatörler | Ortak | **Yapıldı** (`configs/pcs.json`, `configs/emu.json`, `simulators/src/pcs|emu`) |
| 8 | Field compose'a device-service eklenmesi (PCS polling) | Deployment | Bekliyor (simülatörler hazır) |
| 9 | 32-bit kelime sırası devreye alma doğrulaması | Saha | İlk kurulumda yapılacak |

## PCS — Bekleyen

PCS dökümanı geldiğinde aynı yöntemle `configs/pcs.json` çıkarılacak: register haritası, komutlar (charge/discharge/stop güç setpoint'leri), limit davranışı; field device-service bu config ile PCS'leri poll edecek.

---

# PCS & EMU (EMU Modbus TCP V0.0.2)

## Cihaz Modeli

Fiziksel olarak tek Modbus slave vardır: **EMU** (Energy Management Unit — Unit ID 1, port 502). Register alanı üç blok içerir:

| Blok | Adresler | İçerik |
|---|---|---|
| EMU (istasyon) | Input 100–237, Holding 1–24+1000–1024, Coil 1–3 | İstasyon özeti, enerjiler, güç kontrolü |
| PCS Modules | Input/Holding `5000+300×(n−1)`, Coil `5000+(n−1)` | Konteyner başına PCS (n = 1..PCS sayısı) |
| Battery Racks | 15000–24999 | Reserved (bu sürümde kullanılmıyor) |
| PCS Groups | `25000+300×(n−1)` | Proje bazlı gruplama — **config'e alınmadı** |

**Config bölümlemesi:** Fiziksel tek slave olsa da bizim cihaz modelimizde **her PCS ayrı cihaz config'i** (`pcs-1.json`, `pcs-2.json`...) ve **EMU ayrı cihaz** (`emu-1.json`). Hepsi aynı IP:502/slaveId 1'e bağlanır (Modbus TCP çoklu bağlantı destekler). Simülatör modunda her config kendi portunda koşar.

## 32-bit Adres Konvansiyonu (önemli)

EMU dökümünde `uint32/int32` kayıtlar iki satır halinde listelenir: ilk satır boş (yüksek kelime), ikinci satırda isim+tip yazar. **Config'de `registerAddress` ilk (boş) satırın adresidir** — okuma oradan başlar (BSC dökümanıyla aynı davranış: big endian, yüksek kelime önce).

| Register | Config adresi |
|---|---|
| PCS a.c. frequency (uint32) | `5000+300×(n−1)+3` (dökümanda isim +4'te) |
| PCS a.c. active power (int32) | `+8` (isim +9'da) |
| EMU nominal capacity (uint32) | `100` (isim 101'de) |
| EMU a.c. active power setpoint (int32) | `20` (isim 21'de) |

⚠️ **Devreye alma doğrulaması:** Gerçek cihazda 32-bit register çiftlerinin kelime sırası (hi/lo) ilk okumada doğrulanmalıdır (beklenen değerler: V≈400V, f≈50Hz, PCS nominal 240kW).

## PCS Input Bloğu (FC 0x04)

`5000+300×(n−1)` tabanlı; config adları ve offset'ler:

| Offset | Ad | Tip | Scale | Not |
|---|---|---|---|---|
| 0–2 | AC Voltage AB/BC/CA | uint16 | 0.1 V | tag: `scope:"ac"`, `phase:"ab/bc/ca"` |
| 3 | AC Frequency | uint32 | 0.001 Hz | |
| 5–7 | Phase Current A/B/C | uint16 | 0.1 A | |
| 8 | AC Active Power | int32 | 0.1 kW | **+ deşarj, − şarj** |
| 11 | AC Reactive Power | int32 | 0.1 kvar | |
| 13 | AC Apparent Power | int32 | 0.1 kVA | |
| 14 | Power Factor | int16 | 0.001 | |
| 15/16 | DC Voltage / Current | int16 | 0.1 | tag: `scope:"dc"` |
| 17 | DC Power | int32 | 0.1 kW | |
| 19/20 | IGBT / Cabin Temperature | int16 | 0.1 °C | |
| 21/22 | Available Charge/Discharge Power | uint16 | 0.1 kW | LG-benzeri limit; setpoint'ler bunu aşmamalı |
| 23/24 | Available ind./cap. Reactive Power | uint16 | 0.1 kvar | |
| 25/27 | Total Charge/Discharge Energy | uint32 | 0.1 kWh | |
| 29/31 | Daily Charge/Discharge Energy | uint32 | 0.1 kWh | |
| 33/34 | Shutdown Code / Power On Blocking Code | uint16 | 1 | |
| 250–259 | Status Word 1–10 | uint16 | bitfield | |
| 260–289 | Alarm Word 1–30 | uint16 | bitfield | |

**Status Word 1** (offset 250) kritik bitler: b1 PCS Run, b5 Standby, b6 Hot Standby, **b7 Charge Status**, **b8 Discharge Status**, b9–b12 limit durumları.

**Alarm Word 1** (260): AC gerilim/frekans alt-üst, dengesizlik, LVRT/HVRT, faz sırası/eksik, anti-islanding, kısa devre vb. — Fault bitleri `logType: "error"`, Warning bitleri `logType: "warning"` olarak config'de tanımlı.

## PCS Holding Bloğu (FC 03/06/16) + Coil

| Offset | Register | Not |
|---|---|---|
| 0–11 | DC limit parametreleri (maks/min şarj-deşarj voltaj/akım/güç) | kurulum parametresi |
| 12 | Active Power Control Method | 0–5 (0 const DC akım … 3 const AC güç) |
| **15** | **AC Active Power Setpoint** | int16, 0.1 kW, ±240 — **asıl komut register'ı** |
| 16/17 | AC Reactive Power / PF Setpoint | |
| 18/19 | Charge/Discharge Forbidden | 1 = yasak |
| 20–22 | DC akım/voltaj/güç setpoint'leri | |
| Coil 5000+(n−1) | PCS On/Off | **0: ON, 1: OFF** |

## PCS Komutları (`configs/pcs.json`)

| Komut | Yazılan register | Değer | Doğrulama |
|---|---|---|---|
| `on` | Coil | 0 | coil read-back |
| `off` | Coil | 1 | coil read-back |
| `charge` | AC Active Power Setpoint | `-{{powerKw}}` (param 0–240 kW) | — |
| `discharge` | AC Active Power Setpoint | `{{powerKw}}` | — |
| `stop` | AC Active Power Setpoint | 0 | — |
| `forbid_charge` | Charge Forbidden | 1 | — |
| `forbid_discharge` | Discharge Forbidden | 1 | — |

- **İşaret kuralı: + = deşarj, − = şarj** (döküman tanımı).
- İmzalı template desteği eklendi: `command-routes.ts` `resolveTelemetries` artık `-{{param}}` önekini çözer.
- Write semantiği: `ModbusDevice.write()` mühendislik değerini config `scale`'ine göre ham register'a çevirir — komut değerleri kW cinsindendir.

## EMU (İstasyon) Bloğu

- **Input 100–152**: Nominal kapasite/enerji, **System SOC (104) / SOH (105)**, available şarj/deşarj enerji+güç+reaktif (109–120), **Station State (121: 0 initial, 1 shutdown, 2 standby, 3 hot standby, 4 charging, 5 discharging)**, PF, P/Q/S, AC frekans, DC P/I/V, günlük/aylık/yıllık/toplam enerjiler (137–152).
- **Input 200–203**: toplam/çalışan/uyarılı/arızalı PCS sayıları.
- **Input 218–227 Status Word 1–10** (bitfield): SW1: Allow Startup (b0), ACB1/2 durumu (b1–2), **EPO (b4)**; SW2: MV yük şalteri; SW3–5: **PCS#1–24 RS485/CAN iletişim durumları**.
- **Input 228–237 Alarm Word 1–10** (bitfield): aşırı sıcaklık, 690V SPD, trafo yağı (sıcaklık/basınç/seviye), ağır gaz trip, yardımcı SPD.
- **Holding 1–24**: istasyon kontrol yöntemleri + **a.c. active power setpoint (20, int32, ±200×PCS sayısı; + deşarj, − şarj)** + reaktif + PF.
- **Holding 1000–1024**: scheduling modları ve DC tarafı parametreleri (şarj/deşarj yasaklama dahil).
- **Coil 1–3**: istasyon On/Off (0: ON, 1: OFF), #1/#2 ACB (0 disconnect, 1 connect).
- **EMU komutları**: `station_on`, `station_off`.
- Kurulum parametreleri (1050–1396: koruma eşikleri, frekans eğrileri) **config'e alınmadı** — set-once veri; gerektiğinde ayrı config eklenir.

## BSC ↔ PCS İlişkisi (güç kontrol zinciri)

```
Field UI/manevra → field web-service → BullMQ → field device-service
   → PCS holding 5000+300(n-1)+15 (AC Active Power Setpoint, ±240 kW)
   → PCS → batarya (BSC) akışı
```

- **Setpoint limitleri:** PCS setpoint'i ≤ PCS `Available Charge/Discharge Power` (offset 21/22) **ve** BSC `BSC DC Charge/Discharge Power Limit` (30063/30065) ile kısıtlanmalıdır. BSC limiti 5 sn aşılırsa Over Charge/Discharge Power warning/fault oluşur.
- **Yasaklama:** BSC tarafında şarj/deşarj yasak gerekiyorsa PCS holding 18/19 (`Charge/Discharge Forbidden`) kullanılır.
- **Doğrulama kaynağı:** PCS Status Word 1 b7/b8 (charge/discharge) + BSC 30037 ChargeStatus b4–5.
- **Yön göstergesi:** Field UI'da "gerçek akış" = PCS AC Active Power (işaretli); "kullanılabilir" = PCS available power'ları + BSC limitleri (min olan esas).

## Konfig Dosya Düzeni (güncel)

| Dosya | İçerik |
|---|---|
| `configs/bsc.json` | BSC canonical (8 rack, resmi komut seti) |
| `configs/pcs.json` | PCS canonical (n=1 şablonu; n. instance `5000+300×(n−1)` ofsetiyle üretilir) |
| `configs/emu.json` | EMU istasyon canonical |
| `device-service/config/pcs-1..3.json`, `emu-1.json` | Instance kopyaları (port 5031–5033, 5030) |
| `device-service/deployment/config-docker/*` | Docker kopyaları |

- Simülatörler: `packages/simulators/src/pcs/` + `src/emu/` (input üretimi, setpoint kabulü, coil on/off, enerji sayaçları).
- **Taşıma katmanı (Strategy):** Config'de `transport.kind` ile açık seçim — `"tcp"` (varsayılan) / `"rtu"` / `"simulator"` (tip alanı: `bsc|pcs|emu|...`). `ModbusDevice` yalnızca `IModbusTransport` sözleşmesini görür; simülatör tick'i `SimulatorTransport.connect()` ile başlar, `disconnect()` ile durur.
- **Instance üretimi:** `bun run gen:pcs [N]` → `tools/gen-pcs-configs.mjs` canonical'den N adet `pcs-N.json` üretir (adres ofseti `5000+300×(n−1)` üretim anında registerAddress'lere gömülür — çalışma zamanı ofset mekanizması yoktur).
- **Persist policy (not):** "Tüm cihaz verisi config'de" ilkesi benimsendi — ileride bazı metriklerin kaydedilmemesi gerekirse per-metric `disabled`/persist flag'i eklenir (şimdilik tümü kaydedilir).

## Field'a Çekilecek Veriler (PCS/EMU — proxy + hafif aggregate)

| Tier | Veri | Kullanım |
|---|---|---|
| **A — sürekli** | EMU: System SOC/SOH, Station State, Active Power, available güçler, toplam enerjiler, PCS sayıları; PCS: AC Active Power (işaretli), Available Charge/Discharge Power, Status Word 1 (run/charge/discharge), Alarm Word 1–4 özeti | Dashboard statları, topoloji şeridi, PCS kartı |
| **B — istek üzerine** | PCS faz detayları (V/I/PF/DC), sıcaklıklar, enerji sayaçları, Shutdown/Blocking kodları; EMU günlük/aylık/yıllık enerjiler | PCS detay kartı, raporlar |
| **C — nadiren** | Holding kurulum parametreleri, koruma eşikleri | Konfigürasyon ekranı |

## TTC (Transformer Temperature Controller)

Dökümanda TTC Status&Alarm bit tablosu var (fan, aşırı sıcaklık trip/alarm, failure alarm) ancak **Input Register Table'da TTC register bloğu tanımlanmamış** — yalnızca 15000–24999 Battery Racks (reserved) aralığı var. TTC register adresleri netleşirse ayrı config çıkarılır.


---

# Devreye Alma (Commissioning) Kontrol Listesi

## Hardware eşlemesi (EMU ↔ PCS ↔ Konteyner)

- EMU tek Modbus ucu: **tek IP, tek port (502), tek Unit ID (1)**. PCS'ler EMU arkasında RS485/CAN ile bağlıdır; her PCS'in kendi RS485/CAN adresi vardır (PCS üzerindeki DIP switch/kurulum parametresi).
- EMU firmware'i "PCS adres n → register penceresi n" eşlemesini sabitler: `5000 + 300×(n−1)`. Bu eşleme **donanım/firmware seviyesinde** belirlenir — yazılımımızın çalışma zamanı eşleme mantığı yoktur; ofsetler `bun run gen:pcs [N]` ile üretim anında registerAddress'lere gömülür.
- **PCS penceresi n ≠ konteyner n olabilir.** EMU penceresi RS485 adresini, konteyner numarası ise saha yerleşimini ifade eder. Gerçek eşleme sahada doğrulanıp field DB'ye kaydedilmelidir (`pcs_id → container_id`).

## Kontrol listesi

| # | Kontrol | Nasıl |
|---|---|---|
| 1 | PCS sayısı çapraz kontrolü | EMU register 200 ("Number of PCSs") ↔ config'deki `pcs-N.json` sayısı. Manuel kontrol: devreye alma sırasında bir kez okunup karşılaştırılır (device-service jenerik kalır — cihaz tipine özel otomatik kontrol eklenmedi). |
| 2 | EMU iletişim durumu | EMU Status Word 3–5: `PCS#n RS485/CAN comm` bitleri — hangi pencerelerin canlı olduğunu teyit eder. |
| 3 | Pencere→PCS kimlik doğrulaması | Her pencereyi oku: AC active power yönünü, o konteynerin BSC ChargeStatus'u ile karşılaştır (şarj eden konteynerin PCS'i negatif güç gösterir). Enerji sayaçları da kimlik ipucudur. |
| 4 | 32-bit kelime sırası | Beklenen değerler: AC voltaj ≈ 400 V, frekans ≈ 50.000 Hz, nominal PCS gücü 240 kW. Sapma varsa kelime sırası (hi/lo) kontrol edilir. |
| 5 | EMU bağlantı limiti | 9 eşzamanlı TCP bağlantı (1 EMU + N PCS) kullanılır; EMU üreticisinden maksimum eşzamanlı Modbus TCP bağlantı sınırını teyit et. Gerekirse tek bağlantı paylaşımı eklenir. |
| 6 | Config deploy'u | Simülatör modda portlar ayrıdır; gerçek sahada tüm `connection` alanları aynı EMU IP:502'ye çevrilir (`deployment/config-docker` override'ları). `deviceId`'ler (PCS-1..N) UI eşlemesi için stabil kalmalıdır. |
| 7 | Firmware sürümü | EMU firmware sürümü V0.0.2 dışına çıkarsa (stride/base değişimi) `gen-pcs-configs` yeniden çalıştırılmalıdır. |
| 8 | BSC tarafı | Controller Heartbeat (40000, 1 sn) yazılıyor olmalı; aksi halde S-C LOC ile kontaktörler açılır. |
| 9 | Cihaz `type` alanı | Tüm config'lerde üst seviye `type` alanı zorunludur (`bsc`, `pcs`, `emu`, `hvac`, `cb`, `dc-output`, `energy-analyzer`, ...). Üretimde `transport.kind` "simulator" olmadığı için device-service cihaz tipini buradan alır (`c.type ?? c.transport?.type ?? "unknown"`). |
