# Ön-yüz Register Kataloğu → demo-field Backend Eşlemesi

> **Kaynak:** `gdems/dist/registers.json` (gdems demo-field ön-yüz register kataloğu:
> BSC 49, rack 48 offset, PCS 81, HVAC 36, 49 UI-mapping anahtarı, 54 cihaz).
> **Hedef:** `deployment/v2/dev` config'leri + simülatörler (demo-field backend).
> **Kapsam:** register/komut/sim katmanı. Ön-yüz (`apps/demo-field/src`) **bu paketin
> dışında** — ayrı bir ön-yüz güncellemesiyle bağlanacak.
> **Yöntem:** Her register (cihaz, adres, FC) için config telemetri/bitfield lookup.

## 1. Kapsama özeti (backend ✓)

| Grup | Katalog | Karşılanan | Not |
| :--- | ---: | ---: | :--- |
| BSC register | 49 | **49** | Değerler telemetri; `info`/`diag1-6` (30037/30043-48) bitfield |
| BSC rack offset | 48 | **48** | Tüm teşhis word'leri bitfield (`rack_id` tag'li 8 kopya); +130 dahil |
| PCS register | 81 | **81** | K01-04, A/D blok, fault/alarm word, S blok, BMS bloğu |
| HVAC register | 36 | **36** | Faz 1 sonrası `Compressor Action Count` (4136) + `Server Humidity` (8195) eklendi |
| UI mapping | 49 anahtar | backend hazır | Anahtar→telemetri eşlemesi UI güncellemesinde bağlanır |

**Ek (F2.1–F2.5) düzeltmeleri bu turda:** request-ack tablosu, heartbeat 40000–40009,
benign-ack (`accept`), `Rack Calibration Info` bitfield (M11), `BMS SW Name` 128-bit (L1),
rack nameplate değerleri (17 pack / 2 BMIC / 4 sensör / 24 hücre / 210 A relay).

## 2. UI-mapping anahtarları (49) — backend karşılığı hazır, bağlama ön-yüzde

`bank.*`, `rack.*`, `pcs.*`, `hvac.*`, `cmd.*` anahtarlarının tamamı için backend
telemetrisi mevcuttur:

- `bank.soc/soh/vdc/idc/state/online/chgLimit/disLimit/tmax/tmin/cellVmax/cellVmin/recal/info/heartbeat`
  → BSC telemetri + bitfield (30037/30043-48/30103-30157/30055-30065).
- `rack.tmax/rack.soc` → rack offset +89/+58.
- `pcs.*` → A/D/BMS/S blok telemetrileri.
- `hvac.*` → 0x1000 bilgi bloğu + setpointler.
- `cmd.pcs.*` (source/p/start/standby/stop/reset) → S blok komut register'ları;
  `cmd.bsc.cmd` → 40010; `cmd.bsc.hb` → 40000; `cmd.hvac.*` → 0x2000/0x2003/0x202.

> **UI sütunu:** "ön-yüz güncellemesiyle bağlanacak" — bu doküman yalnız backend
> hazır-olma durumunu doğrular.

## 3. Backend'de yapılan değişiklikler (Tur 1)

| ID | Değişiklik | Kanıt |
| :--- | :--- | :--- |
| **Faz 1** | HVAC `Compressor Action Count` (4136, iki geçişte artan sayaç) + `Server Humidity` (8195, 0x2003) | `hvac.test.ts`, canlı |
| **F2.1** | BSC request-ack tablosu: Start yalnız NotInitialized (aksi 0x06), Stop Emergency'den çıkarır, Event Clear 30 s cooldown (0x12), Open All zaten açık → 0x08, Close zaten online → 0x09, Reset akım akarken → 0x0A, Initializing → 0x07 | `bsc-simulator.test.ts` (+7), `bsc-handshake` |
| **F2.2** | `validate.expect.reads[].accept: number[]` (benign ack: 2/6/8/9/18) — şema + job + device-service + web-service + config | `validate-expect.test.ts`, config |
| **F2.3** | Heartbeat 40000–40009 (10 register, aynı sayaç) | `heartbeat-writer.test.ts`, canlı |
| **F2.4** | `Rack Calibration Info` b15-8 count / b7-0 request flag bitfield (M11); `BMS SW Name` 4×UINT32 = 128-bit (L1) | config schema |
| **F2.5** | Rack nameplate değerleri: 17 pack, 2 BMIC, 4 sıcaklık sensörü, 2 PCB, 24 hücre, 210 A relay, akım sensör tipi | `bsc-simulator.test.ts`, `device-telemetry` |

## 4. Tur 2'ye ertelenen (demo-field backend)

### Tur 2 (tamamlandı)

| ID | Konu |
| :--- | :--- |
| F2.6 | DIAG eşikleri (OTW 49/OTF1 58, UTW 0/UTF1 −10), nem 75, IMD 225/150 kΩ, Section Over SOC → charge limit 0, Over Offline Rack → limits 0, yangın (Fire DI) + FSS 1. aşama C&E (8 HVAC force_off + 2 BSC emergency) |
| F2.7 | `bsc_recovery` manevrası (Stop → Start → Event Clear → Close Contactors) |

### Sonraki işler (Tur 3+)

**FL-04 otomatik tetik: İPTAL.** Manuel `calibration` operasyonu çalışıyor ve testli;
BSC `Calibration Request` bayrağı (b7-0, F2.4 bitfield) yalnız **ön-yüz göstergesi**
olarak kalır — operatör görüp manuel çalıştırır. Otomatik tetik ileride ayrı bir
tasarımla (çapraz-tier köprü + operatör onayı) ele alınır; aceleyle eklenmez.

| Konu | Bekleyen |
| :--- | :--- |
| FL-01 PCS pre-charge | Wattox pre-charge register'ı (RFI cevabı bekleniyor) |
| EMS-BSC LOC 10 s zinciri | Kural motoruna staleness (heartbeat yaşı) operatörü |
| Rest 2 h / 8 h kapıları | Operasyon durumu izleme mekanizması |
| Ön-yüz bağlama | `apps/demo-field/src` ön-yüz güncellemesiyle |

**review_date:** 2026-10-13
