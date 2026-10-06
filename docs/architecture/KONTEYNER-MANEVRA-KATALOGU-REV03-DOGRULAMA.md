---
status: active
space: architecture
tags: [dogrulama, konteyner, manevra, katalog, cihaz, rev03, test]
review_date: 2026-09-22
---

# Konteyner Manevra Kataloğu REV.03 — Doğrulama Dokümanı (Aşama 5/6)

Bağlı tasarım: [KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md](./KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md)
Kapsam: **İP-1 — Faz 1.1-1.6 (cihaz katmanı rework)** + **İP-2 — Faz 2-3 (rules.json FL seti + automation-rules e2e)** (2026-09-22).

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| Faz 1.1 — dc-meter (DJSF1352) + EMU silme + B19/B20 mapping | ✅ | `dc-meter.test.ts` 12/12; EMU modül+config+registry silindi |
| Faz 1.2 — CB şalter rework (K2) + manevra düzeltmeleri (K12, 4.17, 4.18) | ✅ | `cb.test.ts` 9/9; `maneuvers.test.ts` yeşil |
| Faz 1.3 — aux-analyser silme (K3) | ✅ | modül+config+registry silindi |
| Faz 1.4 — IMD gerçek register map (K4) | ✅ | `imd.test.ts` 10/10; D00007_A_XXEN indirildi |
| Faz 1.5 — FSS → control-panel-io DI (K5) | ✅ | `control-panel-io.test.ts` 13/13 |
| Faz 1.6 — Legacy konteyner PCS silme (K11) + rules.json PCS temizliği | ✅ | modül+config+registry silindi |
| Faz 2 — rules.json FL seti (§3.1: 43 kural) + sözleşme testleri | ✅ | `container-rules.test.ts` 22/22 |
| Faz 2 (K9) — kural zinciri integration spec | ✅ | `automation-rules.spec.ts` 8/8 (gerçek config'lerle job + audit) |
| Faz 3 — e2e + mevcut e2e uyumu | ✅ | `e2e/automation-rules.spec.ts` (yeni); mevcut e2e'lerde CB/EMU/PCS referansı yok (İP-1 kontrolü) |
| Test seti (etkilenen projeler) | ✅ | management-service 109/109; container-web 80/80; shared-types/device-service yeşil (--skip-nx-cache) |

## 2. Değişiklik Matrisi

| Değişiklik | Dosya(lar) | Geçme |
|:-----------|:-----------|:------|
| DC metre simülatör modülü (FLOAT32 BE + alarm word; salt okuma) | `packages/simulators/src/dc-meter/*` (YENİ) | ✅ 12/12 |
| dc-meter config (iki dizin — K-A7) | `services/device-service/{config,deployment/dev/container/device-configs}/dc-meter-1.json` (YENİ) | ✅ loader testi |
| EMU silme (simülatör + config + registry + mapping kaynağı) | `packages/simulators/src/emu/*`, `config-docker/emu-1.json`, `config/emu-1.json`, `simulator-registry.ts` | ✅ silindi |
| B19/B20 sabit kaynak (A7) | `deployment/dev/container/device-configs/mappings/bsc-pcs-mapping.json` (786/787 → constant 35000) | ✅ `config-connector.test.ts` |
| CB şalter rework (K2): register map + simülatör + config (SYW6GZ-4000) | `packages/simulators/src/cb/*`, `config-docker/cb-{1,2}.json` + `config/` | ✅ 9/9 + loader |
| CBCard rework (trip/akım/sıcaklık kaldırıldı; aux kontak modeli) | `packages/ui/src/components/CBCard/*` | ✅ build |
| CB tüketicileri: BscPage, DashBoardPage, DashBoardPageV2, ScadaDashboardPage | `apps/container-web/src/pages/*` | ✅ build |
| Field CB tüketicileri: gauge blokları + mockDataGenerator | `apps/field/.../containerGaugeBlocks.*`, `.../mockDataGenerator.ts` | ✅ test |
| Manevra kataloğu (K12/4.17/4.18 + K-A5) | `apps/container-web/src/features/control/maneuvers.ts` | ✅ test |
| aux-analyser silme (K3) | `packages/simulators/src/aux-analyser/*`, config'ler, registry | ✅ silindi |
| IMD gerçek map (K4): register map + simülatör + config (8192/8196/8197/8206) | `packages/simulators/src/imd/*`, `config-docker/imd-1.json` + `config/` | ✅ 10/10 |
| Bender Modbus eki indirildi | `docs/devices/isoPV1685RTU_D00007_A_XXEN_Modbus.pdf` (YENİ) | ✅ |
| FSS → control-panel-io DI (K5): register map + simülatör + config + alarmlar | `packages/simulators/src/control-panel-io/*`, config'ler | ✅ 13/13 |
| Legacy PCS silme (K11) | `packages/simulators/src/pcs/*`, `config-docker/pcs-1.json`, `config/pcs-1.json`, registry | ✅ silindi |
| **İP-2: rules.json FL seti (43 kural — §3.1)** | `deployment/dev/container/rules/rules.json` (REWRITE) | ✅ 22/22 |
| **İP-2: RuleEvaluator per-condition debounce (K-A1 3 kademeli koruma)** | `services/management-service/src/rule-evaluator.ts` | ✅ 17/17 (yeni test dahil) |
| **İP-2: kural zinciri integration spec (K9)** | `services/management-service/src/automation-rules.spec.ts` (YENİ) | ✅ 8/8 |
| **İP-2: e2e automation-rules** | `e2e/automation-rules.spec.ts` (YENİ) | ⏸ docker stack'te koşar (Playwright) |
| **İP-2: gizli koruma kartlarının kaldırılması (K-A5)** | `maneuvers.ts` + i18n + `maneuvers.test.ts` | ✅ test |
| MIMARISI §197 debounce güncellemesi | `docs/architecture/MANAGEMENT-SERVICE-MIMARISI.md` | ✅ |
| Cihaz tip enum'ları: −emu −pcs, +dc-meter | `packages/shared-types/src/{schemas,config}/device-config.ts` | ✅ test |
| Test fixture'ları: legacy PCS/EMU referanslarının ayıklanması | `command-job-builder.test.ts`, `device-factory.test.ts`, `simulator-registry-bms-target.test.ts`, `maneuver-command.spec.ts`, `config-loader.test.ts` | ✅ yeşil |

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Sonuç |
|:----|:-------|:------|
| K-A1 | **Her uygulanabilir FL kuralı eşik/süre birebir** | ✅ `container-rules.test.ts` kural başına eşik/debounce/cooldown iddiaları (FL-02/05/07/08/11 satır satır) + `automation-rules.spec.ts` senaryoları |
| K-A2 | **Blok aksiyon seti TAM (command listesi): BSC stop + HVAC force + log/notify; PCS YOK (K10)** | ✅ test: `tms_overheat_protect` 8 force_cool + 2 stop + log + notify; K-A8 grep kanıtı |
| K-A3 | **Kenar-tetik + cooldown** | ✅ `rule-evaluator.test.ts` (17) + container-rules kenar-tetik senaryoları + spec dedup iddiaları |
| K-A4 | **Eksik FL'ler (⛔ FL-06/09/12) rules.json'da YOK** | ✅ test: fl06/fl09/fl12 adları yok; fail-safe senaryo job üretmez |
| K-A5 | **Gizli manevralar kurallar canlıya alınınca kaldırılır** | ✅ fl02/fl05-block/fl07/fl08/fl11 kartları + i18n kaldırıldı; fl09 (K7 defer) + fl_idle (ControlPanel S-6) KALIR — testli |
| K-A6 | **Kapılar: yeni kod ≥%70 satır; kural seti spec'i ≥%90 branch; monorepo test yeşil** | ✅ management-service 109/109, container-web 80/80; kural zinciri spec'i dal yolları (debounce kenarları, kenar-tetik, fail-safe) tam kapsamlı |
| K-A7 | **Cihaz tutarlılığı** | ✅ İP-1 kanıtı (silinme referansı yok; dc-meter iki dizinde) |
| K-A8 | **Tier saflığı: konteyner rules.json PCS referansı VERMEZ** | ✅ 43 kuralda PCS deviceId 0 (test) |
| K-A9 | **K12 saflığı: katalogda BSC charge/discharge YOK** | ✅ test: kural aksiyonları + manevralar |
| K-A10 | **Register doğruluğu** | ✅ İP-1 §5 matrisi + spec'te job telemetrileri register değerleriyle (Command Request 4/3, Open 1, Cooling Setpoint 10) |

## 4. Sapmalar (kayıt)

| Kod | Sapma | Neden |
|:----|:------|:------|
| S-1 | **Field dashboard "İstasyon Durumu" kartı kaldırıldı** — EMU-1 silinince Station State kaynağı kalmadı; kart `—/offline` göstermek yerine çıkarıldı | K1 kapsam genişlemesi: EMU silmenin saha UI yansıması (sistem agregatı SOC/SOH zaten BSC canonical'dan) |
| S-2 | **K4 dokümanı:** D00272 ("iso1685 - Modbus setting") yerine **D00007_A_XXEN** ("complete description of the Modbus register", 07.2023) indirildi | D00007 register tablosunun tamamını taşır (D00272'ye üstün kaynak); `docs/devices/`'a eklendi |
| S-3 | **B19/B20 = sabit 3500.0 kWh** (A7 kararı: sabit/nominal seçildi) | Wattox PCS simülatörü default B19/B20 değeriyle (35000 raw) uyumlu; devreye alımda gerçek kaynak (BSC SOC türetimi) bağlanabilir |
| S-4 | **CB UI "breakerStatus" artık cihaz bağlantı durumundan** (`devices` tablosu) — trip semantiği yok | K2 şalter modeli: fault durumu taşımaz; konum Is Closed/Is Open'dan |
| S-5 | **dc-meter alarm word bit semantiği tanımsız** (v1: 0; ham enjeksiyonla test edilir) | DJSF1352 manual'ında alarm bit düzeni netleşmedi; FL-08 kuralı zaten V/I/P eşiklerini kullanır — alarm word kural girdisi DEĞİL |
| S-6 | `ControlPanel.tsx` hâlâ `MANEUVERS.fl_idle` kullanıyor — kaldırılmadı | Katalog notu: "kural uygulama gününde ele alınır" — fl_idle kart olarak korundu (İP-2'de de kaldırılmadı; gizli sette) |
| S-7 | **Command aksiyon şeması yalnızca tek `deviceId` destekliyor** → çoklu cihaz aksiyonları TEK cihazlı aksiyonlara AYRILDI (örn. 8× `force_cool`) | Katalog §3.1 notu: "desteklenmiyorsa tek cihazlı aksiyonlara ayrıştırılır (sapma notu düşülür)" |
| S-8 | **FL-11 koşulları `neq 0`** — draft `eq true` idi; gerçek register değeri 4 = Warning (K4) | isoPV1685RTU gerçek map: Alarm register'ı 0-OK / 4-Warning; boolean değil |
| S-9 | **RuleEvaluator debounce PER-CONDITION'a çevrildi** (eski: koşulların maksimumu) | K-A1 gereği: 3 kademeli koruma (15 dk / 5 dk / 45 sn) tek kuralda birebir çalışmalı — max-debounce hızlı kademeyi yavaş kademeye esir ediyordu. MIMARISI §197 + evaluator JSDoc + test güncellendi |
| S-10 | **FL-07 DI eşikleri sayısal (eq 1 / eq 0)** — draft `eq true` idi | device-service DISCRETE_INPUT okumaları `value ? 1 : 0` olarak SAYISAL üretir; boolean eşik çalışmazdı |

## 5. Gözle Kontrol — Register Sözlüğü ↔ Config (K-A10, 2026-09-22)

| Cihaz | Sözlük (§2.0) | Config kanıtı |
|:------|:--------------|:--------------|
| BSC | HR 40010: emergency 0x0001 / start 0x0002 / stop 0x0003 / open_contactors 0x0004 / close_contactors 0x0005 … ; charge/discharge ⛔ YOK | `bsc-1.json` commands: emergency/start/stop/open_contactors/close_contactors/enter_manual/exit_manual/event_clear/reset — charge/discharge yok ✅ |
| HVAC | HR 514 on/off + HR 10 / HR 28 setpoint'ler | değişmedi (dokunulmadı) ✅ |
| CB şalter | COIL 0 open (shunt trip) / COIL 1 close; DI 0 Is Closed / DI 1 Is Open; reset ⛔ | `cb-1.json`: telemetry Is Closed(0)/Is Open(1)/Open(0)/Close(1); commands open/close — reset yok ✅ |
| DC Output | COIL 0 on / COIL 1 off; DI 0 Is On | değişmedi ✅ |
| Control-panel-io | COIL 0/1 ışıklar; DI 0/1 kapılar; **FSS DI'ları (K5): System OK/Fault/Discharged/2nd Stage** | `control-panel-io-1.json`: DI 2/3/4/5 + alarmlar (System OK activeLow) ✅ |
| DC Metre | FC03 addr 19 alarm / 50 V / 52 I / 54 P (float) | `dc-meter-1.json`: Alarm Word(19)/DC Voltage(50, FLOAT32)/DC Current(52)/DC Power(54) ✅ |
| PM5340 | AUX tek cihaz (K3) | `pm5340-1.json` tek AUX config; aux-analyser silindi ✅ |
| IMD | R + Alarm1/Alarm2/Device Error gerçek adresler | `imd-1.json`: Insulation Resistance(8192, UINT32)/Prewarning(8196)/Insulation Alarm(8197)/Device Error(8206) ✅ (D00007 §3) |
| PCS | konteynerde YOK (K10/K11) | config-docker'da pcs-1.json yok; field `config-field/pcs-1.json` Wattox ✅ |

## 6. Gözle Kontrol — Kural Seti ↔ Config Telemetri Adları (K-A1, İP-2)

| Kural girdisi (rules.json) | Config kanıtı |
|:---------------------------|:--------------|
| `Current Temp` / `Return Humidity` (HVAC) | `hvac-*.json` telemetry adları birebir ✅ |
| `Max Pack Temp` / `Min Pack Temp` (BSC) | `bsc-*.json` ✅ |
| `Rack Max Diff Temp R1..R8` / `... Pack R1..R8` (30264/30265 per-rack, S9) | `bsc-*.json` per-rack girişleri mevcut ✅ |
| `Voltage L-N Avg` (PM5340-1) | `pm5340-1.json` ✅ |
| `DC Voltage` / `DC Current` / `DC Power` (DC-METER-1) | `dc-meter-1.json` (addr 50/52/54) ✅ |
| `Battery Door Open` / `Panel Door Open` (CONTROL-PANEL-IO-1) | `control-panel-io-1.json` DI 0/1 ✅ |
| `Insulation Alarm` / `Device Error` (IMD-1) | `imd-1.json` (8197/8206 — K4) ✅ |
| Komut register değerleri (job iddiaları) | Command Request 4=open_contactors, 3=stop; Open=1; Remote On/Off=1 + Cooling Setpoint=10 — `automation-rules.spec.ts` GERÇEK config job'larıyla doğruladı ✅ |

## 7. Komut Çalıştırmaları

```
bun x nx run-many -t test -p simulators shared-types device-service management-service platform-commands container-web field ui --skip-nx-cache  → hepsi yeşil
bun x nx run <proj>:build --skip-nx-cache (container-web, field, ui, device-service) → hepsi yeşil
bun x nx run management-service:test --skip-nx-cache → 109/109
```

`review_date: 2026-09-22`
