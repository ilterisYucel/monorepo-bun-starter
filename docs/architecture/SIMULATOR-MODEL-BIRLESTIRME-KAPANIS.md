---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, simulators, sim-lab, adaptor, esdegerlik]
review_date: 2026-11-13
---

# Simülatör Model Birleştirme — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer, mode: all).
> **SPEC:** `~/.opencode/plan/SIMULATOR-MODEL-BIRLESTIRME-MIMARISI.md` — ✅ Approved (2026-11-12), AK/FR kaynağı. Review onayıyla SPEC'in `docs/architecture/`'a taşınması gerekiyor (bu KAPANIŞ yazılırken SPEC hâlâ plan konumunda).
> **Kapsam:** UC-1 fark envanteri + eşdeğerlik iskelesi · UC-2 BSC adaptörü · UC-3 PCS adaptörü · UC-4 HVAC adaptörü · UC-5 connector/aux/host/bekçi.
> **Tur sınırı:** çalışma ağacında SIMULATOR-PIPE ve DEVICE-SERVICE-SADELESTIRME turlarının değişen dosyaları da duruyor (`physical/link/*`, `site-config.ts`, `site/plant.test.ts`, `ems-read-path.test.ts`, `bsc-face.ts` nameplate düzeltmesi). Bu KAPANIŞ yalnız birleştirme yüzeyini doğrular; pipe kanıtları [SIMULATOR-PIPE-KAPANIS.md](./SIMULATOR-PIPE-KAPANIS.md), device-service kanıtları [DEVICE-SERVICE-SADELESTIRME-KAPANIS.md](./DEVICE-SERVICE-SADELESTIRME-KAPANIS.md).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya#sembol | Değişiklik | Neden (SPEC ref) |
|:--|:-------------|:-----------|:-----------------|
| 1 | `packages/simulators/src/physical/conformance/equivalence.ts#runEquivalence` | (yeni) eşdeğerlik harness'i — aynı komut/okuma sekansını iki yüzde koşturur, adım başına fark satırı üretir; desteklenmeyen adres `-` olur ve harness durmaz | FR-1.1 / AK-1.1 / K1 |
| 2 | `packages/simulators/src/physical/conformance/equivalence.ts#BSC_SEQUENCE` | (yeni) BSC sekansı (State→START→Ack→Normal→CLOSE→online rack→SOC→STOP) | FR-1.1 / T-2 |
| 3 | `packages/simulators/src/physical/conformance/equivalence.ts#PCS_SEQUENCE` | (yeni) PCS sekansı — S01=EMS başta (komut kapısı), START→setpoint −50 kW→STANDBY | FR-1.1 / FR-3.2 / T-2 |
| 4 | `packages/simulators/src/physical/conformance/equivalence.ts#HVAC_SEQUENCE` | (yeni) HVAC sekansı — Remote On/Off, sunucu sıcaklıkları, alarm okuması (`table:"input"`) | FR-1.1 / T-2 |
| 5 | `packages/simulators/src/physical/conformance/bsc-sides.ts#bscLegacySide` | (yeni) legacy `BSCSimulator` yüzü (okuma FC04/FC03 ayrımıyla) | FR-1.1 |
| 6 | `packages/simulators/src/physical/conformance/bsc-sides.ts#bscPhysicalSide` | (yeni) fiziksel `Bsc` + `bscFace` yüzü (`uyumlu` profil, stride 200) | FR-1.1 / A2 |
| 7 | `packages/simulators/src/physical/conformance/pcs-sides.ts#pcsPhysicalSide` | (yeni) fiziksel PCS yüzü + **connector rolü**: BMS `+0x08/+0x09` izinli güç yayınlanır (link canlı kalmasa model fault'a düşüyor) | FR-1.1 / K4 |
| 8 | `packages/simulators/src/physical/conformance/hvac-sides.ts#hvacPhysicalSide` | (yeni) fiziksel `Mc90Hvac` + `hvacFace` yüzü (zon/dış ortam sıcaklığı ile step) | FR-1.1 |
| 9 | `packages/simulators/src/bsc/bsc-legacy-adaptor.ts#BscLegacyAdaptor` | (yeni) BSC adaptörü: config→model, legacy modbus yüzü↔`bscFace` köprüsü, 1 sn'lik tick, self-host sunucu (start/stop/port), `applyPowerKw` işaret çevrimi, `inject` yaklaşım eşlemesi | K1/K6/K7 / FR-2.1 / FR-2.2 / A1 |
| 10 | `packages/simulators/src/wattox-pcs/pcs-legacy-adaptor.ts#PcsLegacyAdaptor` | (yeni) PCS adaptörü: EMS yüzü + BMS yüzü (`ModbusServerBridge`, blok dışı korumalı), gridLink→`pcs.grid`, `feedBmsLink`, DC bara köprüsü | K1/K4/K7 / FR-3.1 / FR-3.2 / FR-5.1 |
| 11 | `packages/simulators/src/hvac/hvac-legacy-adaptor.ts#HvacLegacyAdaptor` | (yeni) HVAC adaptörü: `hvacFace` köprüsü, zon/dış ortam girişi, self-host sunucu | K1/K7 / FR-4.1 |
| 12 | `packages/simulators/src/bsc/bsc-modbus-adapter.ts#IBscSimulatorSurface` | (değişiklik) köprünün somut `BSCSimulator` bağımlılığı yapısal arayüze indirildi — aynı köprü hem legacy hem adaptör servis eder | K1 / FR-2.2 |
| 13 | `packages/simulators/src/physical/site/aux-ports.ts#InsulationPort` | (yeni) `imd.<konteyner>.alarm` sinyalini okuyup PCS izolasyonunu ayarlar; fault override'da yükseltme yok | K4 / FR-5.2 / AK-5.2 |
| 14 | `packages/simulators/src/physical/site/aux-ports.ts#DcMeterPort` | (yeni) `dc.string.<dizi>.voltage/current/power` sinyallerini DC metre ölçümüne çevirir; sinyal yoksa cihaza dokunmaz (mock default) | K4 / FR-5.2 |
| 15 | `packages/simulators/src/physical/site/plant.ts#Plant.physics` | (değişiklik) imperatif aux yamaları → `pipes.publish` + port çağrısı; DC metre guard'ı (`activeFaultTarget`) korundu | FR-5.2 / T-10 |
| 16 | `packages/simulators/src/host.ts#SimulatorHost.registerDefaults` | (değişiklik) `bsc` / `wattox-pcs` / `hvac` builder'ları artık adaptör kuruyor (legacy sınıflar değil) | K1/K6 / FR-5.3 / T-11 |
| 17 | `packages/simulators/src/physical/faults/catalog.ts` (G11 ekleri) | (yeni defs) `imd.prewarning`, `io.fire`, `dcmeter.overcurrent` — önceki turun compat senaryo eşlemeleriyle bağlantılı | K4 (yardımcı) |
| 18 | `packages/simulators/src/physical/conformance/equivalence.test.ts` | (yeni) harness sözleşmesi (fark 0 / fark satırı / `-` davranışı / rapor) + sekans snapshot'ları + BSC AK-1.1 vakası | AK-1.1 / AK-1.2 |
| 19 | `packages/simulators/src/bsc/bsc-legacy-adaptor.test.ts` | (yeni) AK-2.1 (adaptör↔fiziksel fark 0), AK-2.2 (bağımsız sunucu FC04), purity (SC-1), girdi doğrulama, tick varsayılanları | AK-2.1 / AK-2.2 |
| 20 | `packages/simulators/src/wattox-pcs/pcs-legacy-adaptor.test.ts` | (yeni) AK-3.1 (fark 0), AK-3.2 (şarj negatif), BMS yüzü blok içi/dışı, purity | AK-3.1 / AK-3.2 |
| 21 | `packages/simulators/src/hvac/hvac-legacy-adaptor.test.ts` | (yeni) AK-4.1 (fark 0), Remote On/Off okunabilirliği, setpoint doğrulama modelden, purity | AK-4.1 |
| 22 | `packages/simulators/src/physical/site/aux-ports.test.ts` | (yeni) port sözleşmeleri: sinyal var/yok, alarm/temiz/override | AK-5.2 |
| 23 | `packages/simulators/src/bsc/bsc-modbus-adapter.test.ts` | (yeni) köprü tekli/batch iletim sözleşmesi (yapısal yüzey) | FR-2.2 |
| 24 | `packages/simulators/src/host.test.ts` | (değişiklik) BSC adaptör vakası (register + `inject`) eklendi; şebeke gerilimi beklentisi 4000→6900 (S3) | AK-5.3 / SC-4 |
| 25 | `docs/simulators/MEVCUT-DURUM-VE-EKSIKLER.md` §1.5 | (doküman) ölçülen fark envanteri (BSC 1/12, PCS 0/11, HVAC 3/10) + T-10/T-11/T-12 notları | FR-1.2 / AK-1.2 / T-1 |

**Diff özeti (bu turun yüzeyi):** 9 izlenen dosya değişti + 12 yeni dosya (3 adaptör, 4 yan-yüz, 5 test) + 1 snapshot klasörü. Legacy sınıflar (`bsc/bsc-simulator.ts`, `wattox-pcs/simulator.ts`, `hvac/hvac-simulator.ts`) **bu turda değişmedi** — bkz. S1.

### A.2 Test Kanıtları

> Taze koşular bu reviewer oturumunda yapıldı (2026-11-13). `--skip-nx-cache` ile önbelleksiz.

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| simulators (tam) | `bunx nx run simulators:test --skip-nx-cache` | **329/329 yeşil**, 35 dosya |
| sim-lab bekçi zinciri | `npx vitest run` (apps/sim-lab) | **21/21 yeşil**, 3 dosya — paket değişiminden sonra da yeşil (AK-5.4) |
| Eşdeğerlik + adaptörler + köprü + host | `npx vitest run` (7 dosya: `equivalence`, 3 adaptör, `aux-ports`, `bsc-modbus-adapter`, `host`) | **46/46 yeşil** |
| device-service saflık bekçisi | `bunx nx run device-service:test --skip-nx-cache` | **105/105 yeşil** (13 dosya) — `no-simulator-surface.test.ts` dâhil (A.5 Purity 4) |
| Site entegrasyonu (regresyon, tam set) | `npx vitest run --config vitest.integration.config.ts` (10 dosya, tek oturum; sim-lab imajı `--build` ile yenilenmiş) | **102 pass / 5 fail / 1 skip** (108) — S10 |
| Site entegrasyonu (yineleme) | aynı config, 4 dosya (station-operations + bsc-handshake + commands-operations-edge + demo-maneuver) | **37 pass / 1 fail** — tam set'teki 5 hatadan 4'ü **yinelemedi** (sıra/başka suite kirliliği); kalan: `bsc_recovery` |
| Site entegrasyonu (yalıtılmış) | `integration/commands-operations-edge.integration.test.ts` tek başına | **13 pass / 1 fail** — aynı test (`bsc_recovery`) deterministik; **manuel repro geçiyor**: `reset→start→close` sonrası `emergency` → `200 success/validated`, `BSC State = 6` (≈1 sn) |
| Typecheck — simulators | `npx tsc --noEmit` (packages/simulators) | ❌ 12 hata — **yalnız** `fss/fss-simulator.ts` (11) + `physical/conformance/ems-read-path.test.ts` (1); bu turun dosyalarında hata YOK (S9) |
| Typecheck — sim-lab | `npx tsc --noEmit` (apps/sim-lab) | ❌ 10 hata — **yalnız** `apps/sim-lab/src/plant.ts` (kopya zincir, bu turda değişmedi; S9) |
| Mutasyon | `bun run test:mutation` | ⚠️ **koşulmadı** — developer kararı ("mutasyonu atla şimdilik"); build turunda ölçülenler: BSC %74,3 · PCS %69,0 · HVAC %61,1 · `bsc-modbus-adapter` %77,2 (eşik %80) |
| Canlı stack | `docker compose up -d --build sim-lab` + `bun tools/stack-ready.mjs` | exit 0 — 6 uç 200 (adaptör/aux kodu imaja girdi) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Harness iki yüzü aynı sekansla koşturur, fark satırları listelenir | `equivalence.test.ts` (BSC vakası + harness sözleşmesi) | 🟢 |
| AK-1.2 | Farklar envantere etiketli işlenir (kasıtlı/kapatılacak) | `docs/simulators/MEVCUT-DURUM-VE-EKSIKLER.md` §1.5 | 🟢 |
| AK-2.1 | BSC adaptörü ↔ fiziksel yüz `uyumlu` profilde fark 0 | `bsc-legacy-adaptor.test.ts` | 🟢 |
| AK-2.2 | Adaptör kendi modbus sunucusuyla bağımsız açılır | `bsc-legacy-adaptor.test.ts` (FC04 ile `30036/30030/30038`) | 🟢 |
| AK-3.1 | PCS adaptörü ↔ fiziksel yüz fark 0 | `pcs-legacy-adaptor.test.ts` | 🟢 |
| AK-3.2 | Şarj negatif / deşarj pozitif işaret konvansiyonu korunur | `pcs-legacy-adaptor.test.ts` (0x2f7e = −100 kW) | 🟢 |
| AK-4.1 | HVAC adaptörü ↔ fiziksel yüz fark 0 | `hvac-legacy-adaptor.test.ts` | 🟢 |
| AK-5.1 | Connector akışı link katmanında (retry dâhil) | Plant yolu `BmsLink` (önceki PIPE turu); retry kanıtı `bsc-pcs-connector/tcp-target.test.ts` — **host connector yolu bu turda taşınmadı** (S6) | 🟡 |
| AK-5.2 | Aux ölçümleri pipe sinyallerinden gelir, `plant.ts#physics`'te cihaza özel yama yok | `aux-ports.test.ts` + `plant.ts#physics`; guard (`activeFaultTarget`) hâlâ Plant'te (S7) | 🟡 |
| AK-5.3 | Host bağımsız/çoklu ünite kullanımı korunur | `host.test.ts` 9/9 (3 builder adaptörde) | 🟢 |
| AK-5.4 | Bekçi zincir CI'da koşar / rol belgeli | `vitest.workspace.ts` (`apps/sim-lab`) + `.github/workflows/test.yml` (job "Vitest Workspace", `bun run test`) + §1.5 notu | 🟢 |

**SC durumu:** SC-2 🟢 (üç cihazda `uyumlu` eşdeğerlik farkı 0 — harness koşusu). **SC-3 🟡** — birim tarafı tam yeşil (simulators 329/329, bekçi sim-lab 21/21), **site entegrasyonu tam set 102/5/1** ve 5 hatadan yalnız 1'i ayrıştırılabilir durumda (S10). SC-4 🟢 (`host.test.ts` 9/9). **SC-1 🟡** — davranış tek kaynağı üretim yollarında (host + Plant) sağlandı; legacy sınıflar hâlâ durum makinesi taşıyor ve eşdeğerlik testlerinin **tabanı** olarak yaşıyor (S1).

### A.4 Sapmalar

| Kod | Sapma | Etki | Karar gerekir mi |
|:----|:------|:-----|:----------------|
| S1 | SPEC "Involved Files" legacy sınıfların **kendisinin** adaptör olacağını söylüyor (`bsc/bsc-simulator.ts` → "Adaptör olur"); implementasyon **ayrı sınıflar** yarattı (`bsc-legacy-adaptor.ts`, `pcs-legacy-adaptor.ts`, `hvac-legacy-adaptor.ts`), legacy sınıflar olduğu gibi duruyor | SC-1 tam kapanmaz; iki yazım yolu korunur; silme ayrı onay ister (A3 ruhu) | Evet — silme turu ya SPEC revizyonu (R-1) |
| S2 | T-5'te `WattoxPcsLegacyAdaptor` yazıyor; implement `PcsLegacyAdaptor` | İsim tutarsızlığı (arama/CI yorumu) | Hayır — KAPANIŞ notu yeterli; SPEC revizyonunda düzeltilir (R-2) |
| S3 | Host'ta PCS şebeke gerilimi bekletmesi `4000` (400,0 V legacy stub) → `6900` (690 V, fiziksel anma). `host.test.ts` güncellendi | Gözlemlenebilir register değeri değişti; EMS tarafında gerçek voltaj okunuyor (düzeltme yönünde) | Evet — `SEBEKE-YOLU-ESLESMESI` SPEC'i 400,0 V iddia ediyorsa revizyon |
| S4 | `BscLegacyAdaptor.inject` **yaklaşık** eşleme: `overheat`→`tempSensorFault{80}`, `diff_temp`→`tempSensorFault{127}` (legacy 15 °C fark üretiyordu), `fault`→`SOCPF` zorlaması | Legacy ile sayısal eşdeğerlik yok; harness bu yolu kapsamıyor (B.2) | Evet — enjeksiyon sözleşmesi netleşmeli (R-3) |
| S5 | `simSpeedMultiplier` adaptörde yok; host artık bu config alanını **yoksayıyor** | Demo hız çarpanı yalnız Plant (`spec.sim.speed`) üzerinden çalışıyor; host tabanlı demo kurulumlarında SOC entegrasyonu yavaşlar | Düşük — host'u kimse üretimde kullanmıyor; yine de config→sessiz düşüş (R-4) |
| S6 | T-9'un "connector'un link katmanına oturtulması" host yolu için uygulanmadı (`bsc-pcs-connector/connector.ts` değişmedi); Plant zaten `BmsLink` kullanıyordu | AK-5.1 🟡; bağımsız ünite çifti hâlâ TCP connector ile (ki bu SPEC'in "TCP master korunur" şartıyla uyumlu) | Hayır — SPEC metni iki yolu ayırmıyor; netleştirme önerisi (R-5) |
| S7 | `plant.ts#physics` içinde DC metre guard'ı (`activeFaultTarget`) kaldı — sinyal yayını porttan önce geliyor | FR-5.2 kısmen: yama kalktı, guard kaldı | Hayır — enjeksiyon korunumu bilinçli (FL-08) |
| S8 | Mutasyon kapısı koşulmadı (developer kararı) | Geçit kanıtsız; build turunda ölçülen %61–77, eşiğin altında | Evet — kapanış öncesi ya test turu ya eşik kararı (B.2) |
| S9 | `simulators:typecheck` ve `sim-lab:typecheck` hedefleri kırmızı — hatalar **bu turun dosyalarında değil** (`fss-simulator.ts`, `ems-read-path.test.ts`, `apps/sim-lab/src/plant.ts`) | Kapı güvenilirliği (DEVICE-SERVICE-SADELESTIRME KAPANIŞ'ındaki G9 ile aynı kök) | Evet — tip hijyeni turu |
| S10 | **Site entegrasyonunda 5 hata (tam set)** — `bsc_recovery` (deterministik, yalıtılmış koşuda da), `full_charge/full_discharge` zaman aşımı, `bsc-handshake` "akım akarken stop", `station_stop` ×2 (422). Yinelemede 4'ü kayboldu; `bsc_recovery` manuel repro'da geçiyor | Bu turun **birleştirme koduna bağlanmış kanıt yok** (manuel zincir çalışıyor; hatanın olduğu adım testin `normalizeContainer` ön koşulu). Kalıcı görüntü: paylaşımlı stack'te suite sırası + eski SOC/teşhis durumu. Not: aynı suite G11 turunda yalıtılmış koşuda 14/14 geçmişti — kesin ayrım için imajın SPEC öncesi duruma döndürülmesi gerekir | Evet — B.2'de "entegrasyon kirliliği" boşluğu; developer kararına bağlı ayrıştırma turu |

### A.5 Gözle Kontrol Maddeleri

- [x] **Purity 1 (SPEC §5.1):** üç adaptörde de durum geçişi/komut yorumu yok — yalnız köprü; `bsc-legacy-adaptor.ts` içinde `state`/`ack` alanı yok (test: "purity (SC-1)") — PCS/HVAC için de doğrulanıyor.
- [x] **Purity 2 (K4):** aux cihazlara ikinci model yazılmadı — `dc-meter`/`imd` legacy sınıfları yerinde, bağlantı sinyal.
- [x] **Purity 3 (K3):** `uyumlu` profil kolaylık sözleşmesi bozulmadı — harness ve host testleri `uyumlu` ile geçiyor.
- [x] **Purity 4 (K6):** `SimulatorHost` API yüzeyi (`start/stop/portFor/inject/port`) değişmedi; device-service'e dönüş yok (`no-simulator-surface.test.ts` hâlâ yeşil).
- [x] **K7 (uyumsuzluk):** `BSCSimulatorAdapter` yapısal yüzeze indi — tek köprü iki yüzü servis eder.
- [x] **Elegant Object / konvansiyon:** named export yalnız; `*Config` soneki (`BscLegacyAdaptorConfig`); constructor'ta girdi doğrulama (boş `deviceId`, `rackCount < 1`); komut/sorgu ayrımı (`tick`/`start`/`stop` → void, `port`/`readX` → değer); dosya adları kebab-case; yorumlar Türkçe.
- [x] **Async loop kuralı:** yeni kodda `for...of` + `await` yok (tick döngüleri senkron).
- [x] **Kod referansı:** tüm işaretler `#sembol` çapaslı; satır numarası yok.
- [x] **Bekçi rolü:** `apps/sim-lab` kopya zinciri değiştirilmeden yeşil (21/21) — K2'nin beklenen davranışı.

### A.6 Genel Durum Özeti

- **Kapanır:** UC-1, UC-2, UC-3, UC-4 tam; UC-5 dört görevin ikisi tam (T-11, T-12), ikisi kısmi (T-9, T-10).
- **Açık:** SC-1 (legacy sınıfların silinmesi — S1), AK-5.1 host connector yolu (S6), mutasyon geçidi (S8), tip hijyeni (S9), entegrasyon kirliliği/`bsc_recovery` (S10), S3 için şebeke gerilimi kararı, S4 için enjeksiyon sözleşmesi kararı.
- **Kapanış önerisi:** birleştirme yüzeyi (harness + 3 adaptör + host + aux portları) **birim düzeyinde kanıtlı ve yeşil**; site entegrasyonundaki 5 hata bu turun koduna bağlanamadı (manuel zincir çalışıyor) — ancak **koşullu kapanış**: S10 ayrıştırma turu + mutasyon kararı netleşmeden merge önerilmez.
- **Kabul kriteri sayımı:** 11 AK → **9 🟢 / 2 🟡** (`AK-5.1`, `AK-5.2` 🟡). SC: **3 🟢 / 1 🟡** (SC-1).
- **NIS-2 uyumluluk boşlukları:**
  1. `PcsLegacyAdaptor` BMS yüzünü **`0.0.0.0`** üzerinde dinliyor (varsayılan) — legacy `createWattoxBmsBridge` davranışının birebir kopyası; SPEC'te bu yüz için **tehdit modeli / güvenlik kabul kriteri yok**. Yayın politikası DEVICE-SERVICE-SADELESTIRME SPEC'inin R-4/§11 A3 (god mode auth) kararıyla birlikte ele alınmalı; bağımsız ünite çifti dış ağa açılıyorsa BMS yazımı kimlik doğrulamasız kalır.
  2. OWASP ASVS L2 eşlemesinde bu paket "dev/test simülatörü" olduğundan SAST/aut hepsi kapsam dışı tutuluyor; SPEC'te bu muafiyet **yazılı değil** — İleri İş maddesi olarak eklenmeli.
- **Önerilen karar (developer):** (i) S10 ayrıştırma turu (imaj SPEC öncesine döndürülüp `bsc_recovery` karşılaştırması **veya** suite-bazlı tam sıfırlama), (ii) S8 mutasyon kararı, (iii) S9 tip hijyeni. Üçü kapanmadan merge önerilmez; SPEC taşıma işlemi de bu kararlardan sonra yapılmalı.
- **Tur sınırı:** çalışma ağacındaki PIPE/SİMPLIFİKASYON dosyaları bu KAPANIŞ'ın kanıt alanı dışı.

### SPEC Revizyon Önerileri

> SPEC sözleşmedir; aşağıdakiler **öneri**dir — uygulanırsa plan modunda revizyon + onay kapısı işler.

| # | Öneri | Gerekçe |
|:--|:------|:--------|
| R-1 | "Involved Files"i gerçekle eşitle: ya `*LegacyAdaptor` sınıflarını birincil yüz olarak yazıma geçir ya da "legacy sınıf yerinde kalır, eşdeğerlik tabanı olur" kararını K-x olarak ekle; SC-1'i "üretim yollarında tek kaynak + legacy silme ayrı onay" şeklinde ikiye böl | S1 — SC-1 bugün kapanmıyor |
| R-2 | T-5 adını `PcsLegacyAdaptor` olarak düzelt (dosya: `wattox-pcs/pcs-legacy-adaptor.ts`) | S2 — isim/dosya tutarsızlığı |
| R-3 | `inject` senaryolarının adaptördeki sözleşmesini tanımla (hangi legacy senaryo hangi fiziksel enjeksiyona eşlenir; hangileri desteklenmez) veya `inject`'i destek-dışı ilan et | S4 — sayısal eşdeğerlik yok, harness kapsamıyor |
| R-4 | `simSpeedMultiplier`-ın adaptörde karşılığı olmadığını ve host config'lerinde sessiz düşeceğini yaz (ya da `speedFactor` eşdeğeri ekle) | S5 |
| R-5 | T-9'u iki yola ayır: "Plant → `BmsLink` (kapanmıştır)" ve "host TCP connector → korundu/kapsam dışı"; AK-5.1 kanıtını hangi yolun taşıdığını belirt | S6 |
| R-6 | Şebeke gerilimi beklentisini (0x2f4f → 6900 = 690,0 V anma) SPEC/analiz dokümanına işle; legacy stub değeri (400,0 V) yanlış referans olarak kalmasın | S3 |

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen | Test ref |
|:------|:------|:---------|:---------|
| BSC iki yüz | START→CLOSE→STOP sekansı, `uyumlu` | Aynı register değerleri (ack/state/online rack) | `equivalence.test.ts` (AK-1.1), `bsc-legacy-adaptor.test.ts` |
| BSC adaptör | Adaptör ↔ fiziksel yüz | Fark satırı 0 | `bsc-legacy-adaptor.test.ts#AK-2.1` |
| BSC bağımsız ünite | `network` ile start | FC04 ile `30036=1`, `30030=0`, `30038=0` | `bsc-legacy-adaptor.test.ts#AK-2.2` |
| BSC girdi doğrulama | boş `deviceId` / `rackCount 0` | Fail-fast mesaj | `bsc-legacy-adaptor.test.ts` |
| BSC dış güç | `applyPowerKw(−kw)` | Şarj yönünde DC akım (işaret çevrimi) | `bsc-legacy-adaptor.test.ts` (tick/varsayılan vakası) |
| PCS iki yüz | S01=EMS→START→setpoint→STANDBY | Fark 0 (op 2/1, güç 65486) | `pcs-legacy-adaptor.test.ts#AK-3.1` |
| PCS işaret | şarj setpoint'i | Grid Active Power negatif | `pcs-legacy-adaptor.test.ts#AK-3.2` |
| PCS BMS yüzü | blok içi yaz/ok; blok dışı | Değer döner / `0` ve bridge `0x02` | `pcs-legacy-adaptor.test.ts` |
| HVAC iki yüz | Remote On/Off + alarm okuması | Fark 0 | `hvac-legacy-adaptor.test.ts#AK-4.1` |
| HVAC setpoint | aralık dışı (100 °C) | Model 70–500 bandına çeker | `hvac-legacy-adaptor.test.ts` |
| Aux izolasyon | IMD alarm sinyal true/false | PCS 60 kΩ / 3200 kΩ; override'da dokunmaz | `aux-ports.test.ts` |
| Aux DC metre | üç sinyal var / yok | Ölçüm yazılır / yazılmaz (mock default) | `aux-ports.test.ts` |
| Host | 3 cihaz adaptörle start | Port açılır, register okunur, `inject` çalışır | `host.test.ts` (9/9) |
| Bekçi | paket modeli değişti, kopya zincir aynı | sim-lab 21/21 yeşil | `apps/sim-lab` vitest koşusu |
| Regresyon (tam set) | sim-lab imajı `--build` ile yenilenmiş stack, 10 dosya tek oturum | 102 pass / 5 fail / 1 skip (S10) | `kapanis-integration.log` |
| Regresyon (yineleme) | 4 dosya | 37 pass / 1 fail — 4 hata yinelemedi | `kapanis-int-repeat.log` |
| Regresyon (yalıtılmış) | edge suite tek başına | 13 pass / 1 fail (`bsc_recovery`) | `kapanis-edge-only.log` |
| Manuel zincir | `reset→start→close→emergency` API çağrıları | `200 validated`, State 6 | reviewer oturumu (canlı) |

### B.2 KAPSANMAYAN Boşluklar

| Boşluk | Risk | İleri iş |
|:-------|:-----|:---------|
| **Mutasyon geçidi koşulmadı** (S8) | Davranış mutantları canlı kalabilir; adaptörlerde ölçülen %61–77 | Test derinleştirme turu **veya** conformance/adaptör dosyaları için eşik kararı (DEVICE-SERVICE-SADELESTIRME G5 ile ortak karar) |
| `gercek` profil eşdeğerliği | SPEC A2 gereği baz `uyumlu`; `gercek` profil farkları envantere işlenmedi | İstenirse ikinci sekans koşusu (`profile: "gercek"`) — kasıtlı fark listesi çıkar |
| Harness'in kapsamadığı BSC davranışları: teşhis seti, heartbeat→LOC, ack durum makinesi ayrıntısı, raf hücre modeli | "Tek kaynak" iddiası yalnız ölçülen 12 adıma dayanır | Sırayla sekans genişletme (teşhis + LOC öncelikli — AK-2.3/DEVICE-SERVICE G7 ile kesişiyor) |
| `BscLegacyAdaptor.inject` eşlemesinin legacy ile sayısal farkı (S4) | Dev/debug senaryoları host üzerinden farklı değer üretir | Enjeksiyon sözleşmesi kararı (R-3) + test |
| `simSpeedMultiplier` yoksayımı (S5) | Host tabanlı demo kurulumunda SOC entegrasyonu yavaş | R-4 kararı |
| Host connector yolunun link katmanına taşınması (S6) | Bağımsız ünite çifti iki farklı bağlantı yolu taşır | R-5 kararı; taşınırsa retry testi yeniden koşulur |
| `apps/sim-lab` kopya zincirinin tiplerinin kırmızı olması (S9) | Kapı güvenilirliği; bekçi yalnız runtime | Tip hijyeni turu (ayrı iş) |
| **Entegrasyon kirliliği (S10):** paylaşımlı stack'te suite sırası/önceki durum, `bsc_recovery` ön koşulunu kırıyor; 4/5 hata yinelemedi | Yanlış pozitif/negatif regresyon okuması | Suite başına tam durum sıfırlama (reset + SOC/teşhis temizliği) ya dosya-bazlı izole oturumlar; ayrıştırma turu |
| BMS/EMS sunucu yüzlerinin ağ yayını (NIS-2 boşluğu) | Yanlışlıkla dışa açık BMS yazımı | SECURITY SPEC / R-4 (DEVICE-SERVICE-SADELESTIRME) ile birleşik karar |

**Mutasyon öldürme oranı:** **veri yok** — bu kapanış turunda `bun run test:mutation` developer kararıyla koşulmadı. Build turunda ölçülenler (referans, taze değil): `bsc-legacy-adaptor.ts` %74,29 (51+1 killed / 17 survived), `bsc-modbus-adapter.ts` %77,19, `pcs-legacy-adaptor.ts` %68,97, `hvac-legacy-adaptor.ts` %61,11. Eşik %80 → geçit **kırmızı**.

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-13 | Koşullu kapanış: site entegrasyonu tam set 102/5/1, yineleme 37/1, yalıtılmış 13/14 — `bsc_recovery` deterministik ama manuel repro geçiyor → **S10** eklendi (entegrasyon kirliliği / ayrıştırma turu gerekir) | (SPEC değişmedi) |
| 2026-11-13 | İlk kapanış: UC-1..UC-4 tamam, UC-5 kısmi (T-11/T-12 tamam; T-9/T-10 kısmi). 11 AK = 9 🟢 / 2 🟡, SC = 3 🟢 / 1 🟡 (SC-1); S1–S9 sapmaları, R-1–R-6 önerileri, B.2 boşlukları; mutasyon geçidi atlandı (S8); NIS-2 uyumluluk boşluğu (BMS `0.0.0.0` yayın) kayda geçirildi | (SPEC değişmedi — öneriler bekliyor; SPEC hâlâ `~/.opencode/plan/`'da, review onayıyla `docs/architecture/`'a taşınacak) |
