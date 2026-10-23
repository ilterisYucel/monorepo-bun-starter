# Fiziksel Saha Simülatörü (`packages/simulators/src/physical` + `apps/sim-lab`)

> **Durum:** ✏️ Geliştirici incelemesi bekliyor (AGENTS.md SPEC onay kapısı). Mevcut
> `SimulatorHost` simülatörlerine ve `deployment/v2` akışına dokunmaz; ayrı bir modül ve
> uygulama olarak eklenmiştir.
>
> **Amaç:** EMS/PMS'i gerçek saha olmadan, gerçek cihaz gibi davranan Modbus TCP
> sunucularına karşı uçtan uca test etmek. Saha şekli bir JSON dosyasından üretilir
> (ör. GD-1: 9 konteyner, 18 BSC, 18 PCS, 72 HVAC → 226 ayrı Modbus sunucusu); her
> register'ın değeri cihaz modelinden gelir ve arayüzden tek/çok cihazda değiştirilebilir.

---

## 1. Neden ayrı bir modül?

Mevcut `packages/simulators` sınıfları (README §5) **kolaylık modeli**dir: komut yazıldığı
an etki eder, ölçümler çoğunlukla sabittir (BSC 3.5288 V / 23 °C, PCS 1500 V, HVAC sabit
nem) ve cihazlar birbirinden bağımsızdır. Bu, `demo-field` entegrasyon testlerinin
güvendiği bir sözleşmedir (`AGENTS-DEVICE-SERVICE.md` — "anında uygula"); o yüzden
değiştirilmedi.

Fiziksel modül **sözleşme modeli** (README §10.3 K-2/B) yönünde ilerler:

| Konu | Kolaylık simülatörleri | Fiziksel saha simülatörü |
| :--- | :--- | :--- |
| Batarya | SOC ↔ gerilim tablosu, sabit hücre | 408S hücre dizisi (SOC/kapasite/direnç dağılımı), Thevenin bara çözümü, RC polarizasyon, paket termal modeli, hücre dengeleme |
| BSC | komut anında, Ack hemen Done | Rev AF Ack tablosu + Sequence sayfası (In Progress → Done → 3 s sonra None), RevAH durum geçişleri, sıralı kontaktör kapama, LGES Diagnosis v1.1.0 eşikleri ve aksiyonları (TPC/SPC/VPC, OTW/OVW/…, MCOF, CER) |
| PCS | setpoint = güç anında | Wattox kontrol felsefesi durum makinesi (self-check → stop → soft start → standby/run → fault → reset → stop), güç rampası (S11), verim eğrisi, sıcaklık/irtifa derating, IGBT/reaktör ısıl modeli, şebeke/BMS/EMS haberleşme korumaları, Appendix 2/3 tüm fault/alarm bitleri |
| HVAC | sabit rampa, nem/gerilim güncellenmez | MC90 kontrol modu (0x09) dahil gerçek kontrol, kompresör gecikmeleri, yüksek basınç kilidi, ısıl zon (raflarla ısı alışverişi), 0xFFFF "not involving" adresleri |
| Bağlar | yok (konnektör TCP ile) | BSC ↔ DC şalter ↔ PCS ↔ OG fider zinciri; HVAC zonu ↔ raflar; IMD ↔ PCS izolasyonu; BSC→PCS BMS bloğu (repo eşleme dosyası birebir) |
| Ölçek | config başına 1 cihaz | site dosyasından N konteyner, tek süreçte yüzlerce sunucu |

---

## 2. Bileşenler

```
packages/simulators/src/physical/
  core/        util · events (olay günlüğü + uyumluluk uyarıları) · profile (uyumlu / gercek)
  models/      battery/{cell, diagnostics, rack} · bsc · pcs-wattox · wattox-catalog · hvac-mc90 · environment
  faces/       bsc-face (Rev AF) · wattox-face (EMS + BMS yüzü, A/B/C/D/S blokları) · misc-faces (HVAC, konnektör, legacy)
  modbus/      lab-server (jsmodbus; FC politikası, haberleşme arızası enjeksiyonu, trafik kaydı)
  link/        bms-link (BSC → PCS 0x0300 bloğu; internal | mapping)
  registers/   register-catalog (EMS config → nokta + kodlama) · register-overlay (üstyazım) · register-series (zaman serisi)
  faults/      catalog (~60 arıza tanımı + FaultManager, toplu enjeksiyon)
  scenarios/   engine (adımlar + kabul kontrolleri) · builtin (10 hazır senaryo)
  site/        site-config (site spec → cihazlar) · plant (yürütücü) · ems-export (EMS config + compose overlay)
  conformance/ ems-read-path.test.ts (packages/core ModbusDevice ile gerçek TCP okuma)
apps/sim-lab/
  sites/       gd1.site.json · tek-konteyner.site.json
  src/main.ts  CLI · src/http/{api,snapshot}.ts · public/index.html (arayüz)
  src/tools/   export-ems-config · ems-probe · smoke-test
```

---

## 3. Site dosyası (saha tanımı)

Kullanıcı yalnız sahanın **şeklini** yazar; register listeleri her zaman kök `configs/`
şablonlarından gelir (`AGENTS-DEVICE-CONFIG.md`: kök = source of truth; projede yalnız
`deviceId`/`name`/`connection` değişir).

```json
{
  "name": "GD-1",
  "templatesDir": "../../../configs",
  "network": { "bindHost": "0.0.0.0", "emsHost": "host.docker.internal",
               "containerPortBase": 20000, "containerPortStride": 100, "fieldPortBase": 30000 },
  "containers": { "count": 9, "bscPerContainer": 2, "racksPerBsc": 8, "hvacPerContainer": 8,
                  "hvacZoneMap": "per-bus",
                  "aux": { "cb": true, "dcMeter": true, "dcOutput": 2, "pm5340": true, "imd": true, "fss": true, "controlPanelIo": true } },
  "pcs": { "perContainer": 2 },
  "mv": { "stations": [ { "id": "DEMO-MV-1", "incomer": ["H01"], "feeders": { "H04": [1,2,3,4,5], "H05": [6,7,8,9] } } ] },
  "initial": { "soc": 55, "tempC": 24, "containerSoc": { "3": 80 } },
  "sim": { "profile": "uyumlu", "speed": 1, "startHour": 10, "http": { "port": 8090 },
           "hvac": { "coolingKw": 9, "heaterKw": 2 }, "physicsStepS": 0.5 }
}
```

| Kural | Ayrıntı |
| :--- | :--- |
| Şablon eşlemesi | bsc → `flex-bsc.json`, wattox-pcs → `wattox-pcs.json`, hvac → `hvac.json`, cb → `dc-switch.json`, dc-meter → `acrel-dc-meter.json`, dc-output → `dc-output.json`, energy-analyzer → `pm5340.json`, imd → `bender-imd.json`, fss → `fss.json`, control-panel-io → `control-panel-io.json`, demo-mv-station → `demo-mv-station.json`; konnektör izleme cihazı `sim/flex-bsc-sim-with-wattox.json`'dan, BSC→PCS eşleme `mappings/bsc-2-pcs-mapping.json`'dan (deviceId'ler her BSC'ye çevrilir) |
| Cihaz anahtarı | konteyner cihazı `C<n>.<deviceId>` (ör. `C3.BSC-1`, `C3.HVAC-5`), saha cihazı `<deviceId>` (`PCS-7`, `DEMO-MV-1`). EMS config'indeki `deviceId` konteyner içinde tekrar eder (BSC-1, HVAC-1 …) — v2 deployment ile aynı |
| PCS eşleşmesi | `PCS-((c−1)·perContainer + b)` ↔ `C<c>.BSC-<b>`; PCS'nin OG fideri, konteynerin fider listesinden |
| HVAC zonu | `per-bus`: klimalar BSC'lere eşit bölünür, her klima ardışık rafları soğutur (GD-1: bara başına 4 klima × 2 raf). `rack-index`: HVAC-k ↔ her BSC'nin k. rafı |
| Doğrulama | sayılar/aralıklar, PCS ↔ BSC eşitliği, port çakışması (fail-fast) |

### 3.1 Port şeması

| Cihaz | Port |
| :--- | :--- |
| Konteyner *n* tabanı | `containerPortBase + (n−1)·containerPortStride` |
| BSC-b · konnektör-b | taban + b · taban + 5 + b |
| HVAC-h | taban + 10 + h |
| CB-b · DC metre · DC çıkış-k | taban + 30 + b · taban + 41 · taban + 41 + k |
| PM5340 · IMD · FSS · panel IO | taban + 51 · +52 · +53 · +54 |
| PCS-n EMS yüzü · BMS yüzü | `fieldPortBase + n` · `fieldPortBase + 100 + n` |
| OG köşk | `fieldPortBase + 201 …` |

Portlar Linux geçici port aralığının (32768+) ve Windows'un (49152+) altında tutulur.

---

## 4. Register üstyazımı, toplu işlem ve zaman serisi

Her cihaz yüzü bir `RegisterOverlay` ile sarılır. Katalog, cihazın EMS config'indeki
telemetri + bitfield girişlerinden kurulur; böylece kullanıcı register'ı **EMS'in gördüğü
ad/birim/ölçekle** değiştirir, simülatör ham kelimeyi doğru tip ve byte sırasıyla üretir
(`packages/core` decoder'ı ile aynı kurallar: `BIG_ENDIAN`, `BIG_ENDIAN_SWAP`, …).

| Mod | Ne yapar | Ne zaman |
| :--- | :--- | :--- |
| `hold` | Değer Modbus yanıtına basılır; model değişmez. Süreli olabilir (sim saniyesi). Bitfield noktası yalnız kendi bitlerini maskeler | "Cihaz bu değeri raporluyor" — sensör sapması, bozuk ölçüm, EMS alarm/kural tetikleme testi |
| `write` | EMS gibi yazılır (FC06/FC16, holding/coil) → cihaz mantığı tepki verir | Komut/setpoint testleri (BSC 40010, PCS 0x0E19, HVAC 0x0A …) |
| `clear` | Üstyazım kaldırılır (`*` = cihazdaki tümü) | — |

**Seçici** (tek, çok, tüm cihazlar): virgülle ayrılmış ifadeler — tam anahtar (`C3.BSC-1`),
glob (`C*.HVAC-*`, `PCS-1?`), `type:hvac`, `container:4`, `BSC-1` (tüm konteynerlerdeki
BSC-1), `all`. Raf arızalarında `C*.BSC-1/R3` veya `C2.BSC-*/*`.

**Zaman serisi (CSV):**

```csv
t,target,register,value,mode
0,"C*.HVAC-*",Current Temp,24,hold
300,"C*.HVAC-*",Current Temp,38,hold
300,PCS-3,holding:0x0E19,-800,write
600,"C*.HVAC-*",Current Temp,,clear
```

- `t`: saniye | `HH:MM:SS` | ISO zaman damgası (ilk satıra göre göreli; gerçek kayıt dosyası doğrudan oynatılabilir)
- zaman tabanı: sim saati (hız çarpanıyla ölçeklenir) veya duvar saati; ara değer: basamak veya doğrusal (rampa); döngü
- arayüzde üreteç: rampa / basamak / sinüs / rastgele yürüyüş

---

## 5. Gerçeklik profilleri

| Ayar | `uyumlu` (varsayılan) | `gercek` |
| :--- | :--- | :--- |
| Desteklenmeyen FC (ör. PCS'ye FC04) | yanıtla + uyumluluk uyarısı | 0x01 Illegal Function |
| Tanımsız adres | 0 | 0x02 Illegal Data Address |
| Geçersiz değer yazımı (HVAC 0x202=0 vb.) | kabul + uyarı | 0x03 Illegal Data Value |
| BSC controller heartbeat denetimi | kapalı | açık (10 s alarm, 20 s LOC → limitler 0, kontaktörler açılır) |
| Zamanlama | hızlı (EMS zaman aşımlarına sığar) | saha tipik (PCS self-check 8 s + soft start 12 s — **varsayım**) |
| BSC→PCS BMS bloğu | internal (B01–B23 doğru anlam) | mapping (repo eşleme dosyası birebir) |
| PCS komut kaynağı (S01) | yok sayılır | HMI'de iken EMS komutları uygulanmaz |
| HVAC zorunlu modlar (0x2101–0x2104) | uygulanır | etkisiz (MC A3 §7.3 "not involving") |

---

## 6. EMS ile kullanım

```bash
bun run apps/sim-lab/src/main.ts --site apps/sim-lab/sites/gd1.site.json        # 226 sunucu + arayüz :8090
bun run apps/sim-lab/src/tools/export-ems-config.ts --site apps/sim-lab/sites/gd1.site.json
#   → deployment/simlab/gd-1/{container-1..9, field}/device-configs + topology.json + docker-compose.simlab.yml
docker compose --env-file deployment/v2/dev/field/.env -f deployment/v2/dev/field/docker-compose.yml \
               -f deployment/simlab/gd-1/field/docker-compose.simlab.yml up -d --build
docker compose --env-file deployment/v2/dev/container/.env -f deployment/v2/dev/container/docker-compose.yml \
               -f deployment/simlab/gd-1/container-1/docker-compose.simlab.yml up -d --build
```

Export edilen config'lerde `transport` yoktur → device-service kendi `SimulatorHost`'unu
açmaz, gerçek cihaz gibi `host.docker.internal:<port>` adresini TCP ile okur. BSC
`connector.device` korunur (konnektör izleme register'ları Sim-Lab'dan okunur),
`connector.sim` silinir (BSC→PCS aktarımını sahadaki ara katman gibi Sim-Lab yapar).
v2 container compose'u sabit `container_name` kullandığından aynı makinede tek konteyner
stack'i çalışır; diğer konteynerlerin cihazları Sim-Lab'da EMS'siz çalışmaya devam eder.

**EMS probu** (`src/tools/ems-probe.ts`) docker olmadan device-service'in okuma sınıfıyla
(`@gd-monorepo/core` `ModbusDevice`) tüm cihazları okur; `--commands` ile config
`commands` bölümünü (BSC start → close, PCS komut kaynağı → start → deşarj → sıfır → stop)
EMS gibi yazıp `validate` koşullarını zaman aşımı içinde bekler.

---

## 7. Doğrulama

| Katman | Dosya | Kapsam |
| :--- | :--- | :--- |
| Birim / fizik | `physical/site/plant.test.ts` (vitest) | site üretimi (GD-1 sayıları, port benzersizliği, şablon sadakati, zon eşlemesi, eşleme dosyası), seçici, BSC Ack/durum geçişleri (Rev AF + RevAH), enerji dengesi, OG fider kesilmesi, HVAC değer doğrulama, hold/bitfield/write/toplu/süreli/seri |
| EMS okuma yolu | `physical/conformance/ems-read-path.test.ts` | 11 cihaz tipinin config'teki TÜM telemetrisi `ModbusDevice` ile gerçek TCP'den, iki profilde okunur; sentinel düşen noktalar vendor'ın "invalid / not involving" listesiyle sınırlı; okunan değerler model durumuyla tutarlı; üstyazım EMS'e görünür |
| Uçtan uca | `apps/sim-lab/src/tools/smoke-test.ts` | GD-1'in 226 sunucusu, 190 EMS cihazının hepsi okunur, BSC+PCS komut zinciri, toplu üstyazım |

---

## 8. Varsayımlar ve açık sorular

| # | Varsayım | Kaynak / durum |
| :-- | :--- | :--- |
| V-1 | HVAC soğutma kapasitesi 9 kW, ısıtıcı 2 kW | MC90 kılavuzu modelden modele değişir — sahadaki etiket değeri girilmeli |
| V-2 | GD-1 zon eşlemesi: bara başına 4 klima, her klima 2 raf | Konsol çalışmasındaki yerleşim; LGES/proje çizimiyle teyit |
| V-3 | PCS self-check 8 s + soft start 12 s (gerçek profil) | Wattox kontrol felsefesi süreyi vermiyor; sahada ölçülmeli. EMS `start` komutu 3 s zaman aşımıyla bu profilde başarısız olur (bkz. VENDOR-UYUM-DENETIMI.md B-6) |
| V-4 | Raf ısıl kütlesi ~1.9 MJ/K, paket ısı üretimi 1CP'de 162.8 W | JF1 1CP Thermal Simulation v1.0 |
| V-5 | Raf gerilim penceresi 1101.6–1468.8 V (408 × 2.7/3.6 V) | JF1 Cycle Test Result v1.0 |
| V-6 | BSC Initializing süresi raf başına ~1.5 s + 6 s (gerçek profil) | Rev AF/RevAH süre vermiyor; config `start` zaman aşımı 35 s |
