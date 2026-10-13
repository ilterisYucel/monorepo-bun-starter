# Device Config & Register Düzeltme Raporu

> **Kaynak:** `Düzeltmeler.pdf` — "GD-EMS Backend Register Denetim Raporu" (159 bulgu: 22 kritik, 39 yüksek, 47 orta, 51 düşük) + üretici dokümanları (`docs/devices/**`).
> **Kapsam:** `configs/**` device config'leri, BSC→PCS mapping, UI mapping, deployment kopyaları, device-service/core/simülatör kod düzeltmeleri ve yazma-politikası rollout'u.
> **Durum:** Paket 1 (config + eşli simülatör) + Paket 2 (kritik kod) tamamlandı; PM5340 reset komut arayüzü ⛔ ertelendi.
> **Tarih:** 2026-10-12

---

## 1. Faz 0 — Teyitler (kullanıcı/üretici)

| # | Konu | Sonuç |
|:--|:-----|:------|
| T1 | Wattox BMS linki (PCS BMS portu/FC) | Demo'da pseudo; yalnız **FC03 oku / FC06 yaz** uyumu sağlandı — pseudo tasarım korundu |
| T2 | BSC topolojisi | **1 BSC = 8 rack, 1 konteyner = 2 BSC** doğrulandı |
| T3 | PM5340 resmi register listesi | Elde edildi (PM51xx/PM53xx R01) — adres kayması/PF/reset çözümlendi |
| T4 | 40010 sıfırlanmazsa komut tekrarı | El sıkışmasına `40010=0` finalize eklendi → soru kapandı (kod) |

---

## 2. Paket 1 — Config + eşli simülatör düzeltmeleri

| # | Düzeltme | Kanıt (sembol) |
|:--|:---------|:---------------|
| 1 | **FC04→FC03:** wattox-pcs, hvac, bender-imd, acrel-dc-meter, pm5340 telemetri+bitfield `HOLDING_REGISTER`; simülatörler FC03'e hizmet eder | `WattoxPcsAdapter#readHoldingRegisters`, `HvacSimulator#readHoldingRegister`, `ImdAdapter`/`DcMeterAdapter`/`EnergyAnalyzerSimulatorAdapter` |
| 2 | **BSC stride 200→150:** rack 2-8 telemetri (287) + rack bitfield blokları + UI mapping (435 satır) + `RACK_STRIDE=150` | `packages/simulators/src/bsc/register-map.ts#RACK_STRIDE` |
| 3 | **BSC→PCS mapping:** 30063/30065 `size:2`; voltaj limitleri 30124/30125 (rack ID) → **30118/30122**; B02 yasak/arıza bitleri (bit0/4/5/7) | `configs/mappings/bsc-pcs-mapping.json` |
| 4 | **BSC koruma komutları → Emergency(0x0001);** close timeout 3000→8200 ms | `deployment/v1/dev/container/rules/rules.json`, `configs/flex-bsc.json` |
| 5 | **BSC teşhis bitfield'leri:** her word'ün 4×4-bit grubu (+68…+82, +130); eksik word'ler (+76/79/82/130) | `configs/flex-bsc.json#bitfieldConfigs` |
| 6 | **HVAC:** `off`=2; 0x200 "Reset Command" → "Restore Factory Parameters"; force_cool/heat → forced mode (0x2100/2101/2104) + `force_off`; 15 alarm ismi dokümana; eksik alarmlar (0x31C/31E/325-27) | `configs/hvac.json#commands` |
| 7 | **PM5340:** tüm adresler −1 (1-tabanlı→PDU); PF → `4Q_FP_PF`; salt-okunur reset komutları kaldırıldı | `configs/pm5340.json` |
| 8 | **DC şalter:** konum NO/NC açıklamaları düzeltildi | `configs/dc-switch.json` |
| 9 | **UI mapping:** heartbeat satırları per-rack + stride; Over Discharge Power→30043, MFRD/Over Offline Rack→30047 | `docs/mappings/register-ui-mapping.{json,csv}` |
| 10 | **Deployment senkronu:** 10 device-configs dizini | `deployment/v1|v2/**/device-configs` |
| 11 | **Yazma politikası rollout:** `deadband:"auto"` + `maxStaleMs` (yavaş 60 s / orta 10 s); komut hedefleri ve float'lar hariç | `resolveWritePolicies` (`write-policy.ts`) |

---

## 3. Paket 2 — Kod düzeltmeleri

| # | Düzeltme | Dosya | Test |
|:--|:---------|:------|:-----|
| 1 | **Sentinel filtresi (M1):** 0x7FFF/0x8000/0xFFFF ve FLOAT NaN/Inf → ölçeklenip yayınlanmaz | `packages/core/src/modbus/device.ts#_isInvalidValue` | `device.test.ts` (4) |
| 2 | **BSC heartbeat (C4):** config-driven periyodik artan sayaç (0-255) yazımı | `services/device-service/src/heartbeat-writer.ts#HeartbeatWriter` | `heartbeat-writer.test.ts` (4) |
| 3 | **Komut finalize (C3):** doğrulama sonrası `Command Request=0`; **pulse (S1):** yazım sonrası bobini 0'a çek | `services/device-service/src/device-service.ts#executeCommand`, `CommandConfig#finalize/#pulse` | `device-service` süiti |
| 4 | **4Q_FP_PF decoder (P3):** Schneider PF kod çözümü | `packages/core/src/modbus/decoder.ts#decode4QPowerFactor` | `decoder.test.ts` (5) |
| 5 | **DC bus fallback (M12):** birincil 0 ise yedek adres (30059→30057) | `packages/simulators/src/bsc-pcs-connector/connector.ts#tick`, `mapping.ts#BscPcsSourceRef` | `connector.test.ts` (2) |
| 6 | **PCS start doğrulama (PCS#9):** `expect:1` → `nonzero` | `configs/wattox-pcs.json#commands.start` | — |
| 7 | **HVAC server-temp (H30):** forced-mode kontrolü nedeniyle mode-4 bağımlılığı kaldırıldı (`Monitor Temp Mode=0`) | `configs/hvac.json#commands`, `packages/simulators/src/hvac/hvac-simulator.ts` | `hvac.test.ts` |
| 8 | **Sim state-machine:** PCS reset→Stop (CtrlPhil); BSC rack +51 şarj/deşarj yönü dokümana | `packages/simulators/src/wattox-pcs/simulator.ts#writeSetting`, `packages/simulators/src/bsc/bsc-simulator.ts#updatePerRackRegisters` | `wattox-pcs.test.ts` |

---

## 4. Doğrulama

| Kapı | Sonuç |
|:-----|:------|
| `deviceConfigFileSchema` (tüm config + deployment kopyaları) | 134/134 geçerli |
| `nx run-many --target=build` (shared-types, core, commands, simulators, 4 servis) | ✅ 8 proje |
| `nx run <p>:typecheck` — yalnız değiştirilen dosyalar | ✅ yeni tip hatası yok (repo geneli önceden-kırmızı hatalar hariç) |
| Vitest (simulators+core+shared-types+commands+device/data/management/web+shared-utils) | **1334 geçti**, 1 kırmızı (aşağıda) |
| `resolveWritePolicies` (134 config) | 5297 politika, fail-fast yok |

**Bilinen önceden var olan kırmızı:** `packages/platform/commands/src/maneuver-migration.test.ts` — field `maneuvers.json` 11 bekliyor, 12 var. Bu refaktörle ilgisiz (dosya içeriği değişmedi), ayrı iş kalemi.

---

## 5. Kalan / ertelenen

| # | Konu | Durum |
|:--|:-----|:------|
| 1 | **PM5340 reset komut arayüzü** | ⛔ Defer — komut semaphore register'ı için adaylar (5001/5250/5680) net değil; yanlış adres yazımı gerçek sayaçta riskli. Doğrulanmış prosedür gelince yapılacak. Salt-okunur register'a yazan yanlış komutlar zaten kaldırıldı. |
| 2 | Teşhis/değerlendirme gerektiren orta/düşük bulgular | Kısmen: blokların çoğu düzeltildi; kalan UI/DOC kozmetikleri düşük öncelikli |
| 3 | Repo geneli pre-existing typecheck/lint hataları | Kapsam dışı (ui, ws-tunnel, tamper-logger, maneuver.ts vb.) |

---

## 6. Kod Referansları (sembol çapası)

- `packages/core/src/modbus/device.ts#_isInvalidValue` · `#_decodeRegisters` · `#_readGroupByType`
- `packages/core/src/modbus/decoder.ts#decode4QPowerFactor` · `#getRegisterCount`
- `services/device-service/src/heartbeat-writer.ts#HeartbeatWriter`
- `services/device-service/src/device-service.ts#start` · `#stop` · `#executeCommand`
- `packages/simulators/src/bsc-pcs-connector/connector.ts#tick` · `mapping.ts#parseSource`
- `packages/shared-types/src/commands/command.ts#CommandConfig` · `src/job.ts#CommandDeviceJob` · `src/config/device-config.ts#DeviceConfigFile`
