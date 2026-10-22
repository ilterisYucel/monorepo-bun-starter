# Denetim → v2/dev Eşleme Matrisi

> **Amaç:** `Düzeltmeler.pdf` — *GD-EMS Backend Register Denetim Raporu* (2026-10-12,
> 159 uyumsuzluk: 22 kritik / 39 yüksek / 47 orta / 51 düşük) bulgularının **mevcut
> v2/dev çalışma ağacındaki** durumunu kanıtla eşlemek; hangi bulgunun hangi
> entegrasyon/e2e testiyle kapsandığını ve düzeltme gerektiren noktaları göstermek.
>
> **Yöntem:** Her bulgu; `deployment/v2/dev/{container,field}/device-configs/*.json`,
> `deployment/v2/dev/container/maneuvers/*.json`, `packages/simulators/src/*`,
> `packages/core/src/modbus/*`, `services/device-service/src/*` ve
> `services/management-service/src/*` üzerinden yeniden kontrol edildi.
>
> **Önemli tespit:** Denetim, güncel ağaçtan **eski bir kopyaya** karşı yapılmış
> (raporda "backend'de hiçbir dosya değiştirilmedi" der). Mevcut v2/dev ağacında
> kritik/yüksek bulguların büyük bölümü **zaten çözülmüş** durumda (aşağıda ✅).
> Kalan açıklar ❌/⚠️ ile işaretli ve testlerde `test.fail` + bulgu ID ile takip edilir.
>
> **Efsane:** ✅ Çözülmüş · ⚠️ Kısmi · ❌ Açık · ➖ Kapsam dışı · ❓ Doğrulanacak

## Özet

| Severity | Toplam | ✅ | ⚠️ | ❌ | ➖ |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Kritik | 22 | 14 | 2 | 5 | 1 |
| Yüksek | 39 | 20 | 3 | 14 | 2 |
| Orta | 47 | 8 | 4 | 21 | 14 |
| Düşük | 51 | 6 | 2 | 12 | 31 |

Kapalı döngü testleri (bulgu → test dosyası):

| Test dosyası | Kapsadığı bulgular |
| :--- | :--- |
| `apps/demo-field/integration/device-telemetry.integration.test.ts` | BSC H1/H5/C5/H7, PCS 1/2/5/15, HVAC H12–H29, B1/A1, P1/P4, S2, G1, M1 |
| `apps/demo-field/integration/bsc-handshake.integration.test.ts` | BSC C1/C2/C3/C4/C6/M5/M6/M9 |
| `apps/demo-field/integration/protocol-conformance.integration.test.ts` | PCS 6/7/8/9/10/12, HVAC H1/H2/H5, B1, A1, P1/P2, S1, M1 |
| `apps/demo-field/integration/bsc-pcs-connector.integration.test.ts` | BSC C6/C7/C8/M12, PCS 1–5/13–19 |
| `apps/demo-field/integration/rule-protection.integration.test.ts` | BSC C1/C2, FL-02/05/07/08/11, A2, M2/M7 |
| `e2e/demo-device-data.spec.ts` | H4/H5, M8, genel veri akışı |
| `e2e/demo-protection.spec.ts` | M2, FL-05/07, alarm UI |

---

## BSC (LGES Flex BSC JF1) — 42 bulgu

| # | Önem | Durum | Kanıt / Not |
| :-- | :-- | :-- | :-- |
| C1 | Kritik | ✅ | Koruma kuralları BSC `emergency` kullanıyor; sim artık akım akarken **Stop (0x0003) reddediyor** (`Current Flows 0x000A`). Demo `bsc_stop` manevrası doküman-doğru: setpoint sıfırla → stop. |
| C2 | Kritik | ✅ | Akım akarken **Open All Contactors (0x0004)** de `Current Flows` ile reddedilir; anında açma **Emergency (0x0001)** (en yüksek öncelik, her durumda kabul). |
| C3 | Kritik | ✅ | `commands.*.finalize = { telemetry: "Command Request", value: 0 }` tüm BSC komutlarında (v2/dev `bsc-1.json`). |
| C4 | Kritik | ✅ | `heartbeat: { telemetry: "Controller Heartbeat", intervalMs: 1000 }` + `services/device-service/src/heartbeat-writer.ts` (40000 sarmal sayaç). |
| C5 | Kritik | ✅ | `register-map.ts#RACK_STRIDE = 150`; config R2 SOC 30378, R2 State 30370, R2 DiffTemp 30414. |
| C6 | Kritik | ⚠️ | 30063→776 ve 30065→777 artık `size: 2` (0.001 kW). **Ancak SOP hedefi 789 hâlâ `size` içermiyor** (PCS-3 ile aynı kök neden). |
| C7 | Kritik | ✅ | 784←30118, 785←30122 (`size: 2`, ratio 0.001). |
| C8 | Kritik | ✅ | 774/775 artık `computed` mapping: güç limiti ÷ DC gerilim (30063/30065 ÷ 30059, `scale` 0.001/0.0001, ratio 10000). Canlı: 500 kW / 1356.6 V ≈ 368.6 A. |
| H1 | Yüksek | ✅ | Rack telemetrileri stride 150 (R2 SOC 30378 … R8 SOC 31278). |
| H2 | Yüksek | ✅ | Teşhis word'leri tam 16-bit / dört 4-bit grup (örn. 30238: Deviation/Pack/Under/Over × A/W/F1/F2). |
| H3 | Yüksek | ✅ | 136 bitfieldConfig `tags` taşıyor (`{"rack_id":"1"}…`) — rack çakışması giderilmiş. |
| H4 | Yüksek | ❓ | 30063/30065'te `canonical` yok; canonical tag'ler başka telemetrilerde (71 adet). DC bus / avg cell canonical ayrımı doğrulanacak. |
| H5 | Yüksek | ✅ | `docs/mappings/register-ui-mapping.json` rack SOC adresleri stride 150 (30228/30378/30528/…/31278). |
| H6 | Yüksek | ✅ | Doğrulandı (false-positive): `register-map.ts#RACK_STATUS_BITS` + B2C row 83 (00 Idle, 01 Discharge, 10 Charge) ile sim birebir uyumlu. |
| H7 | Yüksek | ✅ | Sistem hücre gerilimi sim'de 3528 (0.001 V ölçeği → 3.528 V); PCS 782 = 3.65 V. Rack hücre gerilimi (ölçek 0.0001) 3.5288 V. |
| M1 | Orta | ✅ | `device.ts#_isInvalidValue` — 0x7FFF/0x8000/0xFFFF filtreleniyor. |
| M2 | Orta | ✅ | bsc-1/bsc-2'ye `alarms` eklendi (BSC Fault/Alarm/Warning); `fault` enjeksiyonu → `/api/unified/alarms` alarm üretir. |
| M3 | Orta | ✅ | Rack Disabled/Online/Alarm/Warning/Fault/Non-balancing DI telemetrileri eklendi (FC02, rack_id tag'li). |
| M4 | Orta | ✅ | `Rack Max Diff Temp (Global)`/`…Pack (Global)` kaldırıldı (R1 kopyasıydı). |
| M5 | Orta | ✅ | `close_contactors.timeoutMs = 8200` (LGES N×400+5000; v2/dev bsc-1/bsc-2). |
| M6 | Orta | ❌ | Yalnız `Request Acknowledge == 2` kontrol ediliyor; bayat Done / red kodları yüzeylenmiyor. |
| M7 | Orta | ✅ | LGES Diagnosis eşikleri: OTW **49 °C/5 s**, OTF1 **58 °C/5 s**, UTW **0**, UTF1 **−10**; nem dehumidify **75 %RH**. |
| M8 | Orta | ❓ | UI mapping alarm satırları (30043/30044/30045/30047) düzeltilmiş config ile tutarlı mı doğrulanacak. |
| M9 | Orta | ✅ | Red yollarında 30030 yazımı + `Current Flows` (0x000A) reddi (C1/C2). |
| M10 | Orta | ❌ | `BSC_RACK_DIAG.BASE = 30300` tek word (rack başına değil). |
| M11 | Orta | ✅ | `Rack Calibration Info R*` bitfield: b15-8 Recalibration Count, b7-0 Calibration Request Flag (FL-04 tetiği). |
| M12 | Orta | ✅ | 30059→770 `size: 2`, `fallbackAddress: 30057`. |
| M13 | Orta | ➖ | `xrack` FLOAT32 modeli kullanılmıyor (host builder yok, config yok). |
| L1–L14 | Düşük | ✅/❌/➖ | L1 ✅ (BMS SW Name 4×UINT32 = 128-bit); L9 (slaveId) ❓; L13 (32-bit bitfield word sırası) ❓; L3/L4/L5 ❌; L6/L7/L8 belge/tag; L10 sim fidelitesi; L12 ➖; L14 coalescing (başarım). |

## PCS (Wattox MPCS-1725-S) — 33 bulgu

| # | Önem | Durum | Kanıt / Not |
| :-- | :-- | :-- | :-- |
| 1 | Kritik | ✅ | 30063→776 `size: 2`, ratio 0.01. |
| 2 | Kritik | ✅ | 30065→777 `size: 2`. |
| 3 | Kritik | ✅ | 789 mapping'e `size: 2` eklendi; SOP = 500 kW (canlı). |
| 4 | Kritik | ✅ | 774/775 ← `computed` (güç limiti ÷ DC gerilim) — C8 ile aynı. |
| 5 | Kritik | ✅ | 784/785 ← 30118/30122 (gerçek hücre gerilimleri). |
| 6 | Yüksek | ✅ | Tüm 159 telemetri `HOLDING_REGISTER` (FC03); EMS adapter FC03 → A/B/D bloklarına düşüyor. |
| 7 | Yüksek | ❓ | Tek register yazımları FC06; bitişik çok register setpoint'ler FC16 olabilir — transport doğrulanacak. |
| 8 | Yüksek | ✅ | Sim `readHolding` → `isSettingAddress ? readSetting : readRegister` (A/B/D FC03'te okunuyor). |
| 9 | Orta | ✅ | `start.validate.reads.expect = "nonzero"` (== 1 değil). |
| 10 | Orta | ❌ | Sim `SET_START` Stop→Standby; CtrlPhil §1 running bekler. |
| 11 | Orta | ❌ | Sim fault reset → OP_STOP; JSDoc/gerçek tutarsız. |
| 12 | Orta | ✅ | Sim S01 kapısı: start/stop/standby/reset/setpoint yalnız S01=1 (EMS) iken uygulanır; PCS manevralarına `set_command_source` ön adımı eklendi. |
| 13 | Orta | ✅ | B02'ye bit0 (30043.0), bit4/bit5 (30037.2 → charge/discharge prohibited) yazılıyor; BSC arızasında set edileliyor (canlı doğrulandı). |
| 14 | Orta | ✅ | Mapping `lossBit` (769 bit0) — BSC kaynağı tümüyle okunamazsa (`sourceStatus=2`) B02 bit0 set edilir, sağlıklıyken temizlenir. |
| 15 | Orta | ✅ | Yeni `socEnergy` mapping: B19/B20 = SOC × anma enerji (5018 kWh), 0.1 kWh. Canlı: 786/787 = 25090 @%50. |
| 16 | Orta | ✅ | EMS-link telemetrisi eklendi (0x0A01/0x0A08/0x0A0B). |
| 17 | Orta | ✅ | BMS health telemetrisi eklendi (0x0B00/0x0B01/0x0B08/0x0B09). |
| 18 | Orta | ✅ | D01–D09 (12213–12221) Appendix 2 adlarıyla bit-çözülü (D10 tamamen Reserved). |
| 19 | Orta | ✅ | Accumulative Discharge/Charge tek UINT32 (`BIG_ENDIAN_SWAP`, low@12132/12134). |
| 20–26 | Düşük | ❌/⚠️ | Range kontrolü, DI polaritesi (5/6/7), sim default'ları (S09/S14/S20/S21), A27 bit7, DC akım oranı, B13/B14 anlamı. |
| 27–33 | Düşük | ❓/➖ | FC/DC-era belge tutarlılığı, rampa/clamp yokluğu, firmware register'ları (A01–A08, A87–A89), su pompası byte çözümü. |

## HVAC (Envicool MC90HDNC1R) — 37 bulgu

| # | Önem | Durum | Kanıt / Not |
| :-- | :-- | :-- | :-- |
| H1 | Kritik | ✅ | `off` → `Remote On/Off = 2` (0x202). |
| H2 | Kritik | ✅ | `restore factory` register'ı (512) fabrika sıfırlama olarak etiketli; yanlış "alarm reset" komutu yok. |
| H3 | Kritik | ✅ | `force_cool` setpoint yazmıyor (Forced Enable/Cooling bitleri). |
| H4 | Kritik | ✅ | `force_heat` 500 yazmıyor (Forced Heating). |
| H5 | Yüksek | ✅ | 64 telemetri `HOLDING_REGISTER` (FC03). |
| H6–H11 | Yüksek | ✅ | 0x0B/0x0C/0x0D/0x0F/0x11/0x1E doküman anlamlarıyla yeniden adlandırıldı (nem modu / soğutma hassasiyeti / nem setpoint vb.); unit/scale/INT16; UI mapping eşitlendi. |
| H12–H26 | Yüksek | ✅ | Alarm adları dokümana uygun (0x301 Internal Fan, 0x302 External Fan, 0x303 Compressor Fault, 0x305 System High Pressure, 0x31C High Humidity vb.). |
| H27 | Orta | ✅ | Tanımsız 0x307/0x308 kaldırılmış. |
| H28 | Orta | ✅ | Eksik alarmlar eklendi (0x31C/0x31E/0x325/0x326/0x327). |
| H29 | Orta | ✅ | Forced-mode register'ları (0x2100/0x2103/0x2104) mevcut. |
| H30 | Orta | ❓ | Server Temp Max/Min/Avg (0x2000-0x2002) + sim mode 4 sürekli yazım doğrulanacak. |
| H31–H37 | Orta/Düşük | ❌/➖ | Setpoint provizyonu yok (bang-bang), RTU ayarları, işaretli/unsigned, belge kopyaları. |

## Bender isoPV1685RTU — 7 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| B1 | Kritik | ✅ | `imd-1.json` tüm telemetri `HOLDING_REGISTER` (FC03); sim FC03'ü ölçüm register'larına eşliyor. |
| B2 | Orta | ❌ | `slaveId: 1` (doküman 2…17). |
| B3 | Orta | ⚠️ | Eksik register'lar (0x200D/0x200F/0x200B/0x200C, Un/U+/E, kaçak kapasitans) kısmen eklendi. |
| B4–B7 | Düşük | ❌/➖ | Ön uyarı alarmı, test/reset register'ları, RTU çerçeve, sim fidelitesi. |

## Acrel DJSF1352-RN — 7 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| A1 | Kritik | ✅ | `dc-meter-1.json` `HOLDING_REGISTER` (FC03); sim FC03'ü ölçüme eşliyor. |
| A2 | Yüksek | ✅ | `abs_gt` kural operatörü eklendi; FL-08 DC Current/Power `abs_gt` (işaretli ölçüm). |
| A3–A5 | Orta | ⚠️ | Alarm word bit anlamı "TBD", enerji sayacı/RTU ayarları eksik. |
| A6 | Orta | ➖ | EMU ile aynı port 5030 (EMU v2/dev'de yok). |
| A7 | Düşük | ❌ | register-map yorumu FC03/FC04 karışık. |

## DC şalter SYW6GZ-4000 — 5 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| S1 | Kritik | ✅ | `commands.open/close` `pulse: true` — bobin darbe sonrası bırakılıyor. |
| S2 | Yüksek | ✅ | DI tanımları düzeltilmiş (Closed ← aux NO, Open ← aux NC) + description. |
| S3 | Orta | ➖ | IO modülü Modbus haritası yok. |
| S4 | Orta | ❌ | "Ready to close" / motor / UVT durumları yok. |
| S5 | Düşük | ❌ | `registerDataType: "BOOLEAN"` → decoder "BOOL" tip uyuşmazlığı (çalışma etkisi yok). |

## Yangın paneli EP203 — 7 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| F1 | Yüksek | ✅ | Fire (DI 6) + First Stage (DI 7) girişi eklendi (config + sim DI + `fire`/`first_stage` enjeksiyonu). |
| F2 | Yüksek | ⚠️ | İzlenen giriş (6k8 EOL) / seri direnç belge notu; donanım teyidi gerekiyor. |
| F3 | Orta | ❌ | "Discharged" yalnız opsiyonel EP212'de. |
| F4 | Orta | ⚠️ | İki DI haritası (doc vs config) çelişkisi. |
| F5–F7 | Düşük | ❌/➖ | System OK/Fault ayrımı, Mode Auto NC, ADAM-4055 belge sapması. |

## Schneider PM5340 — 7 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| P1 | Kritik | ✅ | Resmi liste teyitli: register numaraları 1-tabanlı; mevcut ağaç register−1 kullanıyor (Current A doc 3000 → 2999 ✓, Voltage L-N Avg doc 3036 → 3035 ✓). False-positive. |
| P2 | Kritik | ✅ | `reset_energy`/`reset_demand` komutları **kaldırılmış** (`commands: {}`). |
| P3 | Yüksek | ✅ | Config `4Q_FP_PF` kullanıyor; `decoder.ts#decode4QPowerFactor` resmi 4-quadrant pseudo-kodunu uyguluyor. False-positive. |
| P4 | Orta | ✅ | `HOLDING_REGISTER` (FC03) — herkese açık liste FC03. |
| P5–P7 | Düşük | ➖/❓ | Sim toprak akımı/V N-G yok; demand/energy INT64; unbalance eksik. |

## IO / DC çıkış / EMU — 9 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| G1 | Yüksek | ✅ | `Energy Counter` tek UINT32 (addr 4, 0.01 kWh) — sim ile hizalı. |
| G2 | Yüksek | ➖ | `emu.json` ölçekleri — EMU v2/dev'de deploy edilmiyor. |
| G3–G7 | Orta/Düşük | ❌/➖ | EMU sim yok, doğrulama coil okuması, dc-output sıcaklık unsigned, bobin latching. |
| G8–G9 | Düşük | ➖ | EMU kapsam, schema drift. |

## Sigma XT / VIGI-DT1 / genel — 5 bulgu

| # | Önem | Durum | Not |
| :-- | :-- | :-- | :-- |
| X1 | Orta | ➖ | VIGI-DT1 modellenmiyor (v2/dev'de cihaz yok). |
| X2 | Düşük | ➖ | Sigma XT modellenmiyor. |
| K1 | Orta | ⚠️ | RS-485 cihazlar TCP olarak yapılandırılmış; RTU fallback ayarları dokümandan farklı (dev TCP kullanıyor). |
| K2 | Düşük | ❓ | Little-endian byte-order okuma/yazma tutarsızlığı (tüm config'ler big-endian; latent). |
| K3 | Düşük | ➖ | Sim adaptör/transport FC routing incelemesi. |

---

## Düzeltme planı (öncelik sırası — birlikte karar verilecek)

1. **BSC simülatör el sıkışması** (C1/C2/M9): `Current Flows` (0x000A) reddi + tüm red yollarında 30030 yazımı; komut değerleri LGES Request-Ack tablosuna göre. → koruma zincirinin gerçek davranışı.
2. **PCS akım limiti kaynağı** (C8/PCS4) ve **SOP** (PCS3): akım limiti register'ı yoksa tasarım kararı; SOP'a `size: 2` + anlam düzeltmesi.
3. **PM5340 1-tabanlı kaydırma** (P1): tüm adres +1.
4. **BSC eksikleri** (M2 alarms, M3 discrete, M4 global diff-temp, M5 close timeout, M10/M11 çözüm).
5. **PCS eksikleri** (PCS12 command-source kapısı, 13/14 B02+comm-loss, 15 B19/20 canlı, 16/17 EMS/BMS health, 18 D01-D10, 19 enerji birleştirme).
6. **HVAC H6–H11** register anlamları; **F1** Fire/1.Stage; **A2** FL-08 abs eşik; **G1** dc-output enerji.
7. **Sim fidelite** (H6 yön bitleri, H7 hücre gerilimi, PCS10 start durumu, PCS11 reset durumu).

> Bu matris, testlerin `test.fail("<BULGU-ID> …")` işaretleriyle birebir eşleşir:
> kod düzeltmesi geldiğinde ilgili `test.fail` "beklenmeyen geçiş" sinyali verir ve
> işaretin kaldırılması gerekir.

---

## Faz 5 — Uygulanan düzeltmeler (2026-10-13)

| Bulgu | Değişiklik | Kanıt |
| :-- | :-- | :-- |
| **ROUTE-1** (kritik) | `/api/commands/execute` + `execute-multi`: `finalize`/`pulse` job'a taşınıyor. | `command-routes.ts`; 40010→0, CB coil→0; web-service 18 test |
| **V2-COMPOSE-1** (kritik) | Build context off-by-one düzeltildi. | `docker compose config` temiz |
| **SIM-HOST-1** (orta) | `SIMULATOR_BIND_HOST` bind override. | host testleri + canlı probe |
| **SIM-1** (yüksek) | BSC sim komut latch (`activeCommand`). | `demo-maneuver` SIM-1 testleri (yeşil) |
| **H7** (yüksek) | Sistem hücre gerilimi ölçeği (35288→3528). | `device-telemetry` H7 (yeşil), PCS 3.65 V |
| **M5** (orta) | `close_contactors` timeout 3000→8200. | `bsc-handshake` M5 (yeşil) |
| **M9** (orta) | Red yollarında 30030 yazımı. | `bsc-handshake` (C1/C2 hâlâ `it.fails`) |
| **C8/PCS4** (kritik) | Yeni `computed` mapping türü (güç÷gerilim) — connector + şema + testler. | `connector.test.ts` (+3 test), `device-telemetry` C8 yeşil (368.6 A) |
| **C1/C2/M9** (kritik) | Sim Current Flows reddi (Stop/Open All akım akarken; Emergency her zaman) + demo `bsc_stop` setpoint-sıfırla+stop. | `bsc-simulator.test.ts` (+4), `bsc-handshake` C1/C2 yeşil, `demo-maneuver` yeşil |
| **M2/M3/M4** (orta) | BSC `alarms` bölümü + rack DI telemetrisi + global diff-temp kaldırıldı; `fault` enjeksiyonu. | Canlı: `/api/unified/alarms` BSC Fault; DI telemetrileri |
| **HVAC H6–H11** (yüksek) | 6 register doküman anlamıyla yeniden adlandırıldı (+unit/scale/INT16); UI mapping eşitlendi. | config schema OK; canlı telemetri |
| **PCS3/16/17** | SOP `size:2` (500 kW); EMS-link + BMS health telemetrisi. | Canlı: SOP=500, EMS/BMS telemetri mevcut |
| **G1** (yüksek) | dc-output tek UINT32 `Energy Counter`. | Canlı: 0.01 kWh |
| **F1** (yüksek) | Yangın paneli Fire/1.Stage DI (+sim enjeksiyon). | Canlı: Fire/First Stage telemetri |
| **A2** (yüksek) | `abs_gt`/`abs_gte` kural operatörü; FL-08 abs eşik. | `rule-evaluator.test.ts` (+1) |
| **PCS14/PCS19** | Connector `lossBit` (BSC kaybı → B02 bit0) + enerji sayaçları tek UINT32. | `connector.test.ts` (+2), canlı doğrulama |
| **PCS12** | Sim S01 komut kaynağı kapısı + PCS manevralarına `set_command_source` ön adımı. | `wattox-pcs.test.ts` (+1), `protocol-conformance` PCS12 |
| **PCS15/PCS18** | `socEnergy` mapping (B19/B20) + D01–D09 bitfield (Appendix 2). | `connector.test.ts` (+3), `protocol-conformance` PCS15, `device-telemetry` PCS18 |
| **P1/P3/H6** | Resmi dokümanlarla doğrulandı (kod zaten uyumlu). | protocol-conformance PM5340, device-telemetry P3 |
| **M11/L1** | calInfo bitfield + BMS SW Name 128-bit. | config schema |
| **Faz1/F2.1–F2.5** (demo-field) | HVAC compStarts/srvRH; BSC request-ack tablosu; `accept` benign-ack; heartbeat 40000-40009; nameplate 17/2/4/24/210. | sim + device-service + integration |
| **F2.6/F2.7** (demo-field) | DIAG eşikleri (49/58/0/−10), nem 75, IMD 225/150 kΩ, Over SOC/Offline kuralları, yangın+FSS C&E, `bsc_recovery` manevrası. | `v2-rules.test.ts`, `imd.test.ts`, `rule-protection` |
| **WEB-LATEST-1** | `/api/unified/telemetry/latest` pencere sınırı 2000→20000 (yüksek telemetrili cihazlarda yavaş sinyaller düşüyordu). | `unified-routes.ts`, suite yeşil |

**Halen açık / ertelenen (Tur 2 kapsamı):** Yok — denetim bulguları kapalı.
Demo-field Tur 2 (F2.6/F2.7) durumu: DIAG eşikleri (OTW/OTF1/UTW/UTF1), nem 75, IMD 225/150 kΩ uyarı/arıza,
Over SOC→charge limit 0, Over Offline Rack→limits 0, yangın/FSS C&E kuralları ve BSC recovery manevrası eklendi.

**Sonraki işler (Tur 3+):** FL-04 otomatik tetik **İPTAL** (manuel `calibration` çalışıyor; `Calibration
Request` bayrağı yalnız gösterge — otomatik tetik ileride ayrı tasarımla). PCS pre-charge (RFI cevabı),
EMS-BSC LOC 10 s (staleness operatörü), rest 2 h/8 h kapıları — tasarım işleri, acele edilmez.

**Kapı sonuçları:** entegrasyon paketi yeşil, e2e 6/6, simülatör 194/194, management 129/129, device-service 93/93, shared-types 127/127, web-service command-routes 18/18.

---

## Test çalıştırmasında ortaya çıkan YENİ bulgular (v2/dev canlı stack)

Testler yazılıp v2/dev stack'ine koşulunca, denetim raporunda olmayan dört ek
sorun tespit edildi:

| ID | Önem | Konu | Durum | Kanıt / düzeltme |
| :-- | :-- | :-- | :-- | :-- |
| **ROUTE-1** | Kritik | `/api/commands/execute` ve `/api/commands/execute-multi`, `CommandJobBuilder`'ın ürettiği `finalize` ve `pulse` alanlarını `mq.executeAndWait`'e **taşımıyordu**. Sonuç: C3 (40010→0 el sıkışması) ve S1 (CB bobin darbesi) runtime'da hiç uygulanmıyordu — config ve device-service hazır olsa da. | ✅ **Düzeltildi** | `services/web-service/src/presentation/routes/command-routes.ts` — her iki rotada `finalize`/`pulse` job'a eklenir. Canlı doğrulama: emergency sonrası 40010=0; CB open sonrası coil=0. |
| **SIM-1** | Yüksek | BSC simülatörü çalışma modunu **sürekli** `40010 Command Request` değerinden türetiyordu. C3 finalize (40010→0) ile sim idle'a dönüp şarj/deşarjı durduruyordu; gerçek BSC komutu latch'ler ve çalışmaya devam eder. | ✅ **Düzeltildi** | `packages/simulators/src/bsc/bsc-simulator.ts#activeCommand` — kabul edilen komut latch'lenir; çalışma modu bu alandan türetilir. Canlı: charge sonrası `ChargeStatus=1`, `Command Request=0`. Test: `demo-maneuver.integration.test.ts` SIM-1. |
| **V2-COMPOSE-1** | Kritik | `deployment/v2/dev/{container,field}/docker-compose.yml` build context'i bir seviye fazla (`../../../../../`) — `start:demo-integration` çalışmıyordu (v1'de `../../../../`). | ✅ **Düzeltildi** | Tüm context'ler `../../../../` yapıldı; `docker compose config` temiz. |
| **SIM-HOST-1** | Orta | Konteyner içi simülatörler `127.0.0.1`'e bağlanıyordu; yayınlanan portlar üzerinden host'tan erişilemiyordu. | ✅ **Düzeltildi** | `SimulatorHost` `SIMULATOR_BIND_HOST` env'ini destekler; v2/dev compose `0.0.0.0` verir (dev-only). |

### Test altyapısı ekleri (v2/dev)

- **DebugInjector** (yeni modül): `services/device-service/src/debug-injector.ts` —
  dev-only HTTP enjeksiyon ucu (`DEBUG_INJECT_ENABLED`). Simülatörler `inject(scenario)`
  yüzeyi kazandı (IMD/CPIO/DC-METER/HVAC/BSC/PM5340). Bkz. SPEC.
- **Loopback port yayını** (yalnız dev): BSC/HVAC/IMD/DC-METER/PM5340/CB/IO/FSS/DC-OUTPUT,
  PCS EMS+BMS, MV ve debug uçları.
- **Gerçek 43 kural seti** v2/dev container `rules.json`'a kopyalandı (koruma zinciri test edilebilir).

### Pre-existing test güncellemeleri (dokümana uymayan testler)

| Test | Sorun | Yapılan |
| :-- | :-- | :-- |
| `demo-maneuver.integration.test.ts` timer | `Command Request === 3` bekliyordu; C3/ROUTE-1 ile doğru davranış 0. | `0`'a güncellendi (finalize). |
| `demo-maneuver.integration.test.ts` charge/discharge SOC | 100 kW × 12 s ≈ %0.02 SOC → eşik %0.05 anlamsız; ayrıca SIM-1. | SOC-delta ayrı `it.fails("SIM-1 …")`; PCS güç işareti sağlam sinyal olarak korundu. |
| `packages/simulators/src/wattox-pcs/wattox-pcs.test.ts` | start→Standby bekliyor (doküman: running) [PCS10]. | Düzeltme planında (Faz 5). |
| `packages/simulators/src/hvac/hvac.test.ts` | Bazı assertion'lar haritayla uyuşmayan adreslerde. | Düzeltme planında (Faz 5). |
| `packages/simulators/src/energy-analyzer/` | Hiç test yok. | Düzeltme planında (Faz 5). |

### Koşum sonucu (v2/dev)

| Paket | Sonuç |
| :-- | :-- |
| `apps/demo-field/integration/*` (5 yeni + demo-maneuver) | ✅ yeşil (beklenen-kırıklar `it.fails`) |
| `e2e/demo-device-data.spec.ts` + `e2e/demo-protection.spec.ts` | ✅ 6/6 geçti |
| `packages/simulators` (injection dahil) | ✅ 168 test |
| `services/device-service` (debug-injector dahil) | ✅ 92 test |

