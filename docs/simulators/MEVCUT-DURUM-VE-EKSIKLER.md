# GD PMS/EMS simülatörleri — mevcut durum, eksikler ve Sim-Lab

Tarih: 2026-10-19 · Kapsam: `monorepo-bun-starter` (GD EMS/PMS). Tessera/Mozaic bu belgenin konusu değildir.

Bu belge üç soruya cevap verir:

1. `packages/simulators` bugün nasıl çalışıyor?
2. Gerçek cihazlara (LGES JF1 BSC Rev AF, Wattox MPCS-1725-S, MC90HDNC1R-L) göre nerede eksik?
3. Simülatörün ortaya çıkardığı EMS/config uyumsuzlukları neler, Sim-Lab bunları nasıl ele alıyor?

Kaynaklar: LGES BSC Modbus Rev AF ve Diagnosis Spec v1.1.0 (`LGES_DATA_ARCHIVE`), Wattox MPCS Modbus Protocol V1.0 ve datasheet (`Products/PCS/WATTOX`), MC90HDNC1R-L Modbus dokümanı (`GD-EMS`), repo içindeki `deployment/dev/*/device-configs`.

---

## 1. Bugünkü yapı (`packages/simulators`)

```
device-service (docker)
 └─ run.ts → SimulatorHost(deviceConfigs)
      ├─ transport.kind === "simulator" olan her config için builder → SimulatorServer (jsmodbus TCP)
      │     bsc, hvac, wattox-pcs, cb, dc-output, dc-meter, energy-analyzer, control-panel-io, imd, demo-mv-station
      └─ BSC config'inde connector varsa → BscPcsConnectorAdapter
            BSC'den TCP ile okur → mapping.json (ratio/offset/bit) → PCS BMS portuna (15502/15503) yazar
 └─ DeviceService → aynı portlara normal Modbus TCP istemcisi olarak bağlanır
```

- Her simülatör kendi `tick(seconds)` döngüsüyle register değerlerini günceller. Cihazlar arasında fiziksel bağ yoktur: PCS'in gücü BSC'nin akımını değiştirmez, klima rafı soğutmaz.
- Senaryo/arıza enjeksiyonu için yalnız birkaç programatik API var (ör. Wattox `setFaultWord`, `setDoorOpen`). Bunlara erişen bir arayüz yok.

### 1.1 BSC simülatörü (`bsc/bsc-simulator.ts`)

| Konu | Bugün | Gerçek BSC (Rev AF) |
|---|---|---|
| Başlatma | 3. tick'te Initializing, 6. tick'te Normal; Start komutu beklenmez | Start (40010=2) → Initializing → Normal; raflar **Close Contactors** (5) ile sırayla kapanır |
| Güç/akım | 40030/40031 "setpoint" register'larından güç alır (`powerKw = sp × 0.01`) ve doğrudan kWh ekler | 40030/40031 ve 0x0B komutu Rev AF'te **yok**. BSC güç vermez; akım PCS'ten gelir, raflar paralel Thevenin baraya bağlıdır |
| Ack | Komutlar anında Done | In Progress → Done → 3 s sonra None; durum-bağımlı ret kodları (Current Flows 0x0A, Under Initializing vb.) |
| Heartbeat | 5 tick sessizlikte yalnız alarm biti | 10 s alarm, 20 s fault (BSCEMSLOC) → limitler 0, kontaktörler açılır |
| Limitler | Sabit / basit | n_uygun × min(raf limiti); SPC/VPC/PreVPC/TPC daralmaları |
| Teşhis | Yok denecek kadar az | Raf (OVW/OVF, UVW/UVF, ΔV, OCC, OT/UT, DT, RBSCLOC, RPLOC, MCOF, TSE, CSE, MFRD, OORW…) ve bölüm (SODP/SOCP, SUSOC/SOSOC, SLF…) teşhisleri, Event Clear 30 s bekleme |
| Raf modeli | SOC→gerilim tablosu, tek değer | 408S3P hücre dizisi, hücre yayılımı, dengeleme, 17 paket sıcaklığı, kontaktör sırası |
| Diğer | Her tick'te `console.log` (log taşması) | — |

### 1.2 HVAC simülatörü (`hvac/hvac-simulator.ts`)

| Konu | Bugün | Gerçek MC90HDNC1R-L |
|---|---|---|
| Fonksiyon kodu | Input + holding karışık | Yalnız FC03/FC06/FC10 |
| Açma/kapama | `remoteOn` boolean | 0x202: 1 = aç, 2 = kapat (0 geçersiz) |
| Kontrol | Sıcaklık setpoint+10 °C'yi geçerse 0.5 °C/s doğrusal düşüş; üfleme = dönüş − 50 °C | Mod 4: EMS'in 0x2000/0x2001'e yazdığı batarya maks/min sıcaklığına göre; histerezis, kompresör başlama gecikmesi ve min. duruş süresi, düşük dönüş koruması, ısıtıcı |
| Termal bağ | Yok (klima rafı etkilemez) | Zon havası raf sıcaklığını belirler |
| Alarmlar | EMS etiketleriyle | Gerçek alarm haritası 0x300–0x327 farklı; kullanılmayan adresler 0xFFFF |
| Setpoint doğrulama | Yok | Soğutma 7–50 °C, ısıtma −40–35 °C, soğutma > ısıtma |

### 1.3 Wattox PCS simülatörü (`wattox-pcs/simulator.ts`)

| Konu | Bugün | Gerçek MPCS-1725-S |
|---|---|---|
| Durum makinesi | Komutlar anında: start → Run, fault word ≠ 0 → Fault, reset → Standby | Self-check → Stop → soft start (DC ön şarj, DC kesici, AC ön şarj, şebeke kontrolü, AC kesici) → Standby/Run → Fault; reset Stop'a döner |
| Güç | Setpoint yazıldığı anda P = setpoint | Rampa (S11), izin verilen limitler (BMS bloğu + derating), verim eğrisi, DC akım limiti |
| Protokol | FC04 de yanıtlanıyor | Protokol V1.0 yalnız FC03/FC06 |
| Komut kaynağı | Yok sayılıyor | S01 (0x0E00): 1 = EMS; yerel modda EMS komutları etkisiz |
| Korumalar | Yok | Şebeke V/Hz, DC gerilim, BMS bağlantı zaman aşımı, EMS zaman aşımı, sıcaklık, kapı, izolasyon, aşırı yük |
| Termal | Yok | IGBT/reaktör/iç hacim sıcaklıkları, derating |

### 1.4 BSC→PCS konnektör ve diğer simülatörler

Konnektörün çalışma mantığı doğrudur, ancak kullandığı mapping dosyasında anlam hataları var (bkz. §3). CB, DC çıkış, DC metre, enerji analizörü, kontrol paneli I/O, IMD ve OG demo istasyonu simülatörleri EMS testleri için yeterlidir. Sim-Lab bunları olduğu gibi kullanır ve yalnız fiziksel değerlerini (akım, gerilim, izolasyon, kesici durumu) tesisle bağlar.

---

## 2. Sim-Lab: ne değişti?

`apps/sim-lab` yeni bir uygulamadır. `packages/simulators`'ı **değiştirmez**. EMS'in açısından iki taraf da aynıdır: aynı portlarda aynı register haritası. Fark arkada çalışan modeldedir.

```
                 ┌─────────────────────── Sim-Lab (host üzerinde, bun) ───────────────────────┐
EMS / PMS ──TCP──▶ BSC-1 :15501  BSC-2 :15510   PCS-1 :502 (+BMS :15502)  PCS-2 :503 (+:15503) │
(device-service)  │ HVAC-1..8 :15511–15518   CB, DC, DC-METER, PM5340, IO, IMD, DEMO-MV (mevcut) │
                  │                                                                              │
                  │  Plant: Şebeke/OG → PCS ⇄ DC bara ⇄ BSC (8 raf × 408S3P) ⇄ zon havası ⇄ HVAC │
                  │  0.5 s fizik adımı · hızlandırma 1–600× · olay günlüğü · uyumluluk denetimi  │
                  └────────────── HTTP :8090 arayüz (arıza, senaryo, register, trafik) ───────────┘
```

Öne çıkanlar:

- **Fiziksel bağ.** PCS'in DC akımı BSC barasından çekilir, raflar paralel Thevenin modeliyle akımı paylaşır. Raf ısısı zon havasına geçer, klima zonu soğutur. BSC limitleri BMS bloğu üzerinden PCS'e ulaşır.
- **Gerçek protokol davranışı.** Ack yaşam döngüsü, ret kodları, heartbeat LOC, fonksiyon kodu kısıtları, 0xFFFF boş adresler, geçersiz değer reddi.
- **Arıza enjeksiyonu** (60 tip) ve **senaryo motoru** (10 hazır senaryo, JSON ile yenileri). Senaryolar `expect` adımlarıyla beklenen sonucu kendisi doğrular.
- **İki profil.** *Uyumlu* profilde bugünkü EMS'in yaptığı ama gerçek cihazın reddedeceği işlemler tolere edilir ve "uyumluluk uyarısı" olarak kaydedilir. *Gerçek cihaz* profilinde cihazın vereceği tepki verilir.

Kullanım için: [`apps/sim-lab/README.md`](../../apps/sim-lab/README.md).

---

## 3. Ortaya çıkan EMS / config uyumsuzlukları

Sim-Lab açılışta ve çalışırken bunları tespit edip arayüzün **Uyumluluk** sekmesine yazar. Her biri gerçek sahada sorun çıkarır.

### 3.1 BSC

| # | Bulgu | Sahadaki sonuç | Öneri |
|---|---|---|---|
| B1 | `bsc-1.json`/`bsc-2.json` raf telemetrisi **200** adımla, aynı dosyadaki raf bitfield'ları **150** adımla tanımlı | Rev AF: raf N = 30170 + (N−1)×150. Raf 2–8 verileri yanlış adresten okunur | Telemetriyi 150 adıma çevirin. Sim-Lab "Ayarlar → BSC raf blok adımı" ile iki adımı da sunabilir |
| B2 | EMS 40000 (controller heartbeat) yazmıyor (kodda yazım yok) | 20 s sonra BSCEMSLOC: limitler 0, tüm kontaktörler açılır | EMS ≤ 1 s periyotla 40000'i artırarak yazmalı |
| B3 | 40030/40031 güç setpoint'leri ve 0x0B komutu kullanılıyor | Rev AF'te yoklar; BSC güç almaz, gücü PCS belirler | EMS güç kontrolünü yalnız PCS üzerinden yapmalı |
| B4 | Close Contactors sonrası doğrulama süreleri | Gerçek kapanma süresi N×400 ms + 5 s'e kadar; Event Clear sonrası 30 s bekleme | EMS zaman aşımlarını buna göre ayarlamalı |

### 3.2 BSC → PCS mapping (`mappings/bsc-*-pcs-mapping.json`)

| # | Hedef | Bugün | Sonuç |
|---|---|---|---|
| M1 | 0x308, 0x309, 0x315 (güç limitleri) | 30063/30065'in yalnız yüksek kelimesi | uint32'nin üst kelimesi ≈ 0 → PCS limiti ~0 kW görür |
| M2 | 0x306, 0x307 (akım limitleri) | 30128 = ölçülen maks. raf akımı | Limit yerine ölçüm gider |
| M3 | 0x310, 0x311 (paket gerilim limitleri) | 30124/30125 = raf ID | Raf numarası gerilim limiti olarak yazılır |
| M4 | 0x312, 0x313 (kullanılabilir enerji) | Sabit 35000 | SOC ile değişmez |

Sim-Lab'da "BSC → PCS BMS bağlantısı" ayarı varsayılan olarak **doğru eşlemeyi** (Wattox B01–B23) kullanır. "Repo mapping dosyası birebir" seçilirse hatalar PCS'e olduğu gibi yansır.

### 3.3 PCS (Wattox)

| # | Bulgu | Gerçek cihaz |
|---|---|---|
| P1 | EMS telemetriyi FC04 (Read Input) ile okuyor | Protokol V1.0 yalnız FC03/FC06 → 0x01 Illegal Function. Sim-Lab katı modda bunu uygular |
| P2 | Komut kaynağı (S01) kontrol edilmiyor | Yerel modda EMS komutları etkisiz kalır; EMS bunu görmeli |
| P3 | Start sonrası kısa doğrulama | Soft start saha tipik ~12 s; "Zamanlama: saha tipik" seçiliyken EMS'in 3 s doğrulaması başarısız olur |

### 3.4 HVAC (MC90)

| # | Bulgu | Gerçek cihaz |
|---|---|---|
| H1 | EMS kapatmak için 0x202'ye 0 yazıyor | 2 = kapat; 0 reddedilir |
| H2 | `force_cool` / `force_heat` aralık dışı setpoint yazıyor | Soğutma 7–50, ısıtma −40–35, soğutma > ısıtma şartı |
| H3 | Mod 4 ama 0x2000/0x2001'e batarya sıcaklığı yazılmıyor | Klima batarya sıcaklığını bilmeden dönüş havasına göre çalışır |
| H4 | EMS alarm etiketleri gerçek 0x300–0x327 haritasıyla uyuşmuyor | Yanlış alarm adı gösterilir |

---

## 4. Varsayımlar (onay bekleyen)

| Varsayım | Değer | Nerede değişir |
|---|---|---|
| Klima kapasitesi | 9 kW soğutma, 2 kW ısıtma | `simlab.config.json → hvac` |
| Klima ↔ raf eşlemesi | HVAC-k, her BSC'nin k. rafının zonunu soğutur | `plant.ts` |
| OG fider eşlemesi | H01 giriş, PCS-1 → H04, PCS-2 → H05 | `simlab.config.json → mv` |
| PCS güç rampası birimi | S11 ham / 100 = %Pn/s | `pcs-wattox.ts` |
| PCS EMS/BMS zaman aşımları | C24/C61 config'ten, varsayılan kapalı / 10 s | Arıza sekmesi |
| Raf kapanma gerilim farkı | ±10 V | `bscCloseDeviationV` |
| Düşük dönüş koruması | set−8 °C'de durdur, set−6 °C'de serbest | `hvac-mc90.ts` |
| Termal kalibrasyon | Paket ısı kapasitesi, zon UA = 28 W/K, PCS IGBT +1 K/kW | `cell.ts`, `environment.ts`, `pcs-wattox.ts` |

Sahadan ölçüm geldikçe bu değerler güncellenmelidir.
