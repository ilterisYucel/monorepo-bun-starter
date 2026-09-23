---
status: active
space: architecture
tags: [test-kapsami, konteyner, manevra, katalog, cihaz, rev03]
review_date: 2026-09-22
---

# Konteyner Manevra Kataloğu REV.03 — Test Kapsamı (Aşama 6/6)

Bağlı tasarım: [KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md](./KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md)
Doğrulama: [KONTEYNER-MANEVRA-KATALOGU-REV03-DOGRULAMA.md](./KONTEYNER-MANEVRA-KATALOGU-REV03-DOGRULAMA.md)
Kapsam: **İP-1 — Faz 1.1-1.6 (cihaz katmanı)** + **İP-2 — Faz 2-3 (rules.json FL seti + e2e)**. Bu doküman, testlerin kapsadığı DURUMLARIN senaryo matrisidir; test genişletileceği zaman boşluk listesi birincil girdidir.

## 1. Senaryo Matrisi

### İP-2 — Kural seti (rules.json, 43 kural)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Kural envanteri | yükleme | zod-valid; 43 kural; fail-fast | `container-rules.test.ts` "kural envanteri" |
| K-A4 fail-safe | ad taraması | fl06/fl09/fl12 YOK | "K-A4" |
| K-A8/K-A9 | aksiyon taraması | PCS/charge/discharge YOK | "K-A8/K-A9" |
| tms_cool_on_h1 | HVAC-1 ≥25 | force_cool + log; cooldown 60s | "FL-05 normal" 1 |
| tms_cool_off_h1 | <23 | on | "FL-05 normal" 2 |
| tms_heat_on_h1 / off | ≤17 / ≥20 | force_heat / on | "FL-05 normal" 3-4 |
| 32 kural tamlığı | HVAC-1..8 × 4 | tümü mevcut | "FL-05 normal" 5 |
| tms_overheat_protect | 3 kademeli (29/15dk, 50/5dk, 75/45sn) | 8 force_cool + 2 stop + log + notify; cooldown 15dk | "FL-05 korumalar" 1 |
| tms_overcold_protect | 10/15dk, 15/5dk, 5/45sn | 8 force_heat + 2 stop | "FL-05 korumalar" 2 |
| tms_humidity_alarm | nem ≥85 | BSC stop ×2 + log + notify | "FL-05 korumalar" 3 |
| tms_temp_diff_protect | per-rack 16 koşul (≥10/≥5) | BSC stop ×2 | "FL-05 korumalar" 4 |
| fl02_aux_loss | PM5340 <180 V, debounce 5s | CB open ×2 + BSC open_contactors ×2; cooldown 5dk | "FL-02" |
| fl07 kapılar | DI 1/0 (eq) | ışık AÇ/söndür + BSC stop (open) | "FL-07" 1-2 |
| fl08_scf_trip | V>1500/I>1680/P>1784, debounce 1s | CB open + BSC open_contactors; cooldown 1sa | "FL-08" |
| fl11_ground_fault | Alarm/DeviceError ≠0, debounce 2s | CB open + BSC open_contactors | "FL-11" |
| Kenar-tetik | eşik altı → üstü | tek ateşleme; aynı snapshot boş | "kenar-tetik" 1-3 |
| Per-condition debounce | hızlı kademe (45s) + yavaş kademe kapalı | 45s'te ateşler (yavaşı beklemez) | `rule-evaluator.test.ts` "per-condition" |

### İP-2 — Kural zinciri integration (K9 — gerçek config'lerle)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| FL-08 uçtan uca | 1600 V + 1s | 4 job (register değerleri birebir) + auto_rule_fired/action_ok/fl08 audit | `automation-rules.spec.ts` FL-08 |
| FL-02 uçtan uca | 170 V + 5s | 4 job | FL-02 |
| FL-05 koruma | 51°C + 5dk | 8 force_cool + 2 stop | FL-05 koruma |
| FL-05 normal | 24→25.2°C | force_cool job'ı (Remote On/Off 1 + Setpoint 10) | FL-05 normal |
| FL-07 | kapı 1 | ışık true + 2× stop(3) | FL-07 1 |
| FL-07 kenar | kapı 0 | ışık false (kapatma kuralı) | FL-07 2 |
| FL-11 | Alarm 4 + 2s | 4 job | FL-11 |
| Fail-safe | BSC State 9 | 0 job | fail-safe |

### dc-meter (DJSF1352 — K1)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Nominal okuma | başlangıç (tick sonrası) | V=750.0 / I=100.0 / P=75.0 — FLOAT32 BE kelime çifti | `dc-meter.test.ts` "başlangıç durumu" 1-3 |
| Alarm word | normal çalışma | 0 | `dc-meter.test.ts` "Alarm Word 0" |
| Eşik senaryosu | `setMeasurements({voltage:1600})` | yalnız voltage değişir; diğerleri nominal | "ölçüm enjeksiyonu" 1-2 |
| Akım/güç senaryosu | 1700 A / 1800 kW enjeksiyon | bağımsız okunur | "ölçüm enjeksiyonu" 3 |
| Alarm enjeksiyonu | `alarmWord: 0x0001` | ham değer okunur | "ölçüm enjeksiyonu" 4 |
| Bilinmeyen adres | 99 | 0 | "okuma sınırları" |
| Adapter sözleşmesi | holding/coil/discrete okuma | 0/false — komut YOKTUR | "DcMeterAdapter" 10-12 |

### CB şalter (SYW6GZ — K2)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Başlangıç | tick sonrası | Is Closed=true, Is Open=false | `cb.test.ts` "başlangıç durumu" |
| Açma | COIL 0 (shunt trip) + tick | Is Open=true, Is Closed=false | "aç/kapat" 1 |
| Kapama | COIL 1 + tick | Is Closed=true | "aç/kapat" 2 |
| False yazım | writeCoil(false) | yok sayılır | "aç/kapat" 3 |
| İdempotent komut | açıkken aç / kapalıyken kapat | konum değişmez | "aç/kapat" 4 |
| Kaldırılan semantik | input/holding register okuma | 0 (trip/akım/sıcaklık/eşik YOK) | "kaldırılan semantik" 1-2 |
| Reset coil | COIL 2 (eski) | yok sayılır | "kaldırılan semantik" 3 |
| Bilinmeyen DI | 9 | false | "kaldırılan semantik" 4 |

### IMD (isoPV1685RTU — K4)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Sağlıklı direnç | başlangıç | ~1 MΩ (UInt32 BE, Ω) | `imd.test.ts` 1 |
| Alarm/Prewarning | sağlıklı | 0 (OK) | `imd.test.ts` 2-3 |
| Device Error | sağlıklı | 0 | `imd.test.ts` 4 |
| İzolasyon arızası | `setFault(true)` | Alarm=4 (Warning), direnç <100 kΩ | `imd.test.ts` 5-6 |
| Arıza kalkışı | `setFault(false)` | Alarm 0, direnç sağlıklı | `imd.test.ts` 7 |
| Cihaz hatası | `setDeviceError(1/0)` | kod taşınır/temizlenir | `imd.test.ts` 8-9 |
| Bilinmeyen adres | 999 | 0 | `imd.test.ts` 10 |

### Control-panel-io (K5 — FSS DI eklemesi)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Kapı/ışık başlangıcı | — | kapalı/sönük | `control-panel-io.test.ts` 1 |
| FSS başlangıcı | — | System OK=true, diğerleri false | 2 |
| Kapı senaryoları | `setDoorState` | batarya/panel DI | 3-4 |
| Işık komutları | COIL write | read-back yansır; bağımsızlık | 5-7 |
| FSS arıza | `setFssState({fault:true})` | Fault=true, System OK=false | 8 |
| FSS söndürme | `setFssState({discharged:true})` | Discharged=true, System OK=false | 9 |
| FSS 2. aşama | `setFssState({secondStage:true})` | 2nd Stage=true | 10 |
| FSS temizlik | fault+discharged kalkınca | System OK geri döner | 11 |
| Sınırlar | bilinmeyen DI/COIL | false / yok sayılır | 12-13 |

### Manevra kataloğu (K12/4.17/4.18)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Kaldırılan kartlar | fl_bsc_power/fl04_*/fl06_* | MANEUVERS'ta YOK | `maneuvers.test.ts` 1 |
| K12 saflığı | tüm adımlar | command ≠ charge/discharge | `maneuvers.test.ts` 4 |
| fl01_start | BSC adımları | command=start (0x0002) | 5 |
| fl03 acil | adımlar | emergency + open; stop/off YOK | 6 |
| Koruma manevraları | fl02/fl08/fl10/fl11 | open_contactors + open; fl02/fl08/fl11 sequential | 7-10 |
| fl_contactor_close | adımlar | close_contactors (4.18) | 11 |
| Kontroller | MANEUVER_CONTROLS | fl_bsc_power YOK | 15 |

### Registry/config/şema (K-A7/K-A8)

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| Kayıtlı simülatörler | it.each | control-panel-io/imd/dc-meter transport üretir | `simulator-registry.test.ts` |
| Silinen tipler | aux-analyser/fss/pcs/emu | kayıt YOK (it.each'te yok) | aynı dosya |
| Config envanteri | gerçek dizin yükleme | EMU/FSS/AUX/PCS yok; DC-METER-1 var | `config-loader.test.ts` |
| B19/B20 | mapping | constant (786/787) | `config-connector.test.ts` |
| Tier saflığı | rules.json blok seti | PCS referansı YOK; yalnız stop | `container-rules.test.ts` |
| Şema enum | simulator tipleri | emu/pcs yok; dc-meter var | `device-config.test.ts` |

## 2. KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Ne zaman |
|:--|:-------|:------|:---------|
| G-1 | dc-meter simülatörünün FLOAT32 **yazma** yolu | cihaz salt okuma — yazma yok | gerekmez |
| G-2 | CB simülatörünün operasyon sayacı/öncelik davranışı | şalterde sayaç semantiği yok (K2) | gerekmez |
| G-3 | dc-meter alarm word **bit semantiği** | manual netleşmedi (S-5 sapması) | manual gelince |
| G-4 | **e2e/automation-rules.spec.ts koşumu** (Playwright — HVAC 25.0→soğuma zinciri) | docker stack gerektirir; local vitest kapsamında değil | CI e2e turunda (`bun run test:e2e`) |
| G-5 | E2E: cihaz listesi dc-meter satırı, CB "Atmış" UI kalıntısı görsel kontrolü | docker stack; `field-flow.spec.ts` cihaz sayısı aynı (22) | e2e turunda |
| G-6 | `ControlPanel.tsx` (fl_idle) kaldırma | S-6 sapması — kural canlıya alındı; kart hâlâ legacy ControlPanel'e bağlı | ControlPanel kaldırma turunda |
| G-7 | Field dashboard istasyon durumunun yerine geçecek gösterge | S-1 sapması — kaynak yok | üst EMS/grid sinyali gelince |
| G-8 | Kural aksiyon şemasında çoklu cihaz desteği (`deviceIds`/`deviceTypes`) | S-7 — tek cihazlı ayrıştırma yeterli (YAGNI) | ihtiyaç doğarsa |
| G-9 | FL-09 (iletişim kaybı) kuralı | K7 defer — synthetic sinyal yok | sinyal kaynağı gelince |

## 3. Kapsanan Durum Özeti

- dc-meter: 12 durum · CB: 9 · IMD: 10 · control-panel-io: 13 · maneuvers: 16 · registry/loader/connector/şema: 12+ — İP-1 toplamı **72 durum**.
- İP-2: kural envanteri/eşik/kenar-tetik 22 durum (`container-rules.test.ts`) + zincir integration 8 durum (`automation-rules.spec.ts`) + evaluator 17 durum (per-condition dahil) — İP-2 toplamı **47 durum**.
- Silinen test dosyaları: `emu.test.ts`, `pcs.test.ts`, `aux-analyser.test.ts`, `fss.test.ts` — davranışları silinen cihazlara aitti; yerine gelen modüllerde karşılıkları matriste.

`review_date: 2026-09-22`
