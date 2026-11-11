# Test Envanteri (otomatik)

> Üretim: `bun run test:inventory` — 2026-11-11
> Tarandı: 224 test dosyası, 1938 test bloğu.

<!-- OTOMATIK — bun run test:inventory ile üretilir; elle DÜZENLENMEZ -->

### `apps/editor/src/features/editor/device-catalog/catalog.test.ts` (4 test)

1. (device-catalog) **"5 built-in cihaz tipi sunar"**
2. (device-catalog) **"her DeviceType icin tanim var ve type alani kendi anahtariyla eslesiyor"**
3. (device-catalog) **"tum tanimlar en az bir protokol ve bir ikon bildirir"**
4. (device-catalog) **"getDeviceDefinition bilinen tip icin tanim dondurur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/sim-lab/src/plant.test.ts` (5 test)

1. (BSC Rev AF) **"Start → Normal, Close → 8 raf online"**
2. (BSC Rev AF) **"Akım akarken Stop reddedilir (0x0A)"**
3. (BSC Rev AF > PCS ⇄ BSC enerji dengesi) **"Deşarjda SOC düşer, akım PCS gücüyle tutarlı"**
4. (BSC Rev AF > PCS ⇄ BSC enerji dengesi) **"Şarj sonunda VPC limiti daraltır"**
5. (BSC Rev AF > PCS ⇄ BSC enerji dengesi > MC90 klima) **"0 ile kapatma gerçek profilde reddedilir, 2 ile kapanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/bsc-handshake.integration.test.ts` (10 test)

1. (BSC komut el sıkışması) **"C3: komut sonrası 40010 finalize ile 0'a döner"**
2. (BSC komut el sıkışması) **"C4: heartbeat 40000 saniyelik artan sayaç olarak yazılır"**
3. (BSC komut el sıkışması) **"kabul edilen komut Request Acknowledge = Done (0x0002) olur"**
4. (BSC komut el sıkışması) **"C1/C2/M9: akım akarken stop 'Current Flows' (0x000A) ile reddedilir"**
5. (BSC komut el sıkışması) **"C2: akım akarken EMERGENCY (0x0001) kabul edilir (en yüksek öncelik)"**
6. (BSC komut el sıkışması) **"M5: close_contactors timeoutMs N×400+5000 (8 rack → 8200 ms)"**
7. (BSC komut el sıkışması > BSC request-ack tablosu (canlı, Sequence/Diagnosis)) **"Start Normal'de → 0x06 (BMS Already Connected)"**
8. (BSC komut el sıkışması > BSC request-ack tablosu (canlı, Sequence/Diagnosis)) **"Event Clear ikinci kez → 0x12 (Within Cooldown)"**
9. (BSC komut el sıkışması > BSC request-ack tablosu (canlı, Sequence/Diagnosis)) **"Emergency → Stop Emergency'den çıkarır (0 = Not Initialized)"**
10. (BSC komut el sıkışması > BSC request-ack tablosu (canlı, Sequence/Diagnosis)) **"heartbeat 40000-40009 birlikte artar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/bsc-pcs-connector.integration.test.ts` (7 test)

1. (BSC→PCS batarya verisi eşleme) **"PCS BMS SOC geçerli aralıkta ve sağlıklı BSC SOC ile tutarlı"**
2. (BSC→PCS batarya verisi eşleme) **"M12: toplam gerilim online rack'lerden gelir (~1300 V)"**
3. (BSC→PCS batarya verisi eşleme) **"C6/PCS1-2: güç limitleri BSC limitinden (uint32 size:2) eşlenir"**
4. (BSC→PCS batarya verisi eşleme) **"C7: gerilim limitleri rack ID değil gerçek gerilim (~1300 V)"**
5. (BSC→PCS batarya verisi eşleme) **"C8/PCS4: akım limiti güç÷gerilim (computed) ile eşlenir"**
6. (BSC→PCS batarya verisi eşleme) **"PCS3: SOP BSC şarj limitinden (uint32 size:2) eşlenir"**
7. (BSC→PCS batarya verisi eşleme) **"PCS13: charge/discharge yasağı bitleri (B02) BSC arızasında set edilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/commands-operations-edge.integration.test.ts` (14 test)

1. (B1 — komut katmanı edge-case'ler) **"bilinmeyen cihaz → 404"**
2. (B1 — komut katmanı edge-case'ler) **"bilinmeyen komut → 404"**
3. (B1 — komut katmanı edge-case'ler) **"eksik zorunlu param → 400"**
4. (B1 — komut katmanı edge-case'ler) **"raw telemetries komutu → 200"**
5. (B1 — komut katmanı edge-case'ler) **"benign ack: zaten Normal iken Start → success (0x06 kabul)"**
6. (B1 — komut katmanı edge-case'ler) **"pulse: CB-1 open sonrası coil serbest kalır (0)"**
7. (B1 — komut katmanı edge-case'ler) **"execute-multi onFailure=stop: ilk adım hata → ikinci atlanır"**
8. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler) **"bilinmeyen operasyon → 404"**
9. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler) **"divideTotal floor: charge powerKw=25 → PCS-1 S06 = -12 kW"**
10. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler) **"timer: charge + 3 sn → PCS gücü 0'a iner"**
11. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler) **"rollback: ulaşılamayan system → başarısız uzak adım + rollback"**
12. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler) **"MV interlock: H01 toprak kalıcı kilitli (komut reddedilir)"**
13. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler > B3 — manevra katmanı edge-case'ler) **"bsc_recovery: Emergency → Normal (Stop→Start→EventClear→Close)"**
14. (B1 — komut katmanı edge-case'ler > B2 — operasyon katmanı edge-case'ler > B3 — manevra katmanı edge-case'ler) **"bsc_stop idempotent: iki kez çalıştırılabilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/data-pipeline.integration.test.ts` (6 test)

1. (C — yazma hattı (gerçek Timescale verisi)) **"C1 dedup: sabit telemetri (BSC SOH) her poll'da yazılmaz (≤2 satır/30 sn)"**
2. (C — yazma hattı (gerçek Timescale verisi)) **"C2 TTL: sabit BSC SOH maxStaleMs sonrası yine üretilir (≥2 satır/70 sn)"**
3. (C — yazma hattı (gerçek Timescale verisi)) **"C3 latest: sessiz sinyal unified/latest'ta döner"**
4. (C — yazma hattı (gerçek Timescale verisi)) **"C4 downsampled: 5 dk pencere zaman-kovası verisi döner"**
5. (C — yazma hattı (gerçek Timescale verisi)) **"C5 fire-and-forget: komut yanıtı hızlı (P95 < 500 ms)"**
6. (C — yazma hattı (gerçek Timescale verisi)) **"C6 satır bütünlüğü: canonical tag + unit Timescale satırında"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/demo-maneuver.integration.test.ts` (10 test)

1. (demo manevra kataloğu (AK-10.1/10.2)) **"6 demo operasyonu yüklü; mevcut katalog korunuyor"**
2. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1)) **"girilen güç PCS S06 → connector → BSC SOC'yi şarj yönünde değiştirir"**
3. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"charge → PCS gücü negatif; standby durdurur"**
4. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"SIM-1: charge sonrası BSC şarj modu latch'lenir (ChargeStatus=1, komut kutusu 0)"**
5. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"discharge → PCS gücü pozitif"**
6. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"SIM-1: discharge sonrası BSC deşarj modu latch'lenir (ChargeStatus=2)"**
7. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"full_charge / full_discharge operasyonları tamamlanır"**
8. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4)) **"calibration çok adımlı operasyon tamamlanır"**
9. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4) > zamanlı durdurma (Q3)) **"charge + timer 5 sn → PCS gücü 0'a iner"**
10. (demo manevra kataloğu (AK-10.1/10.2) > powerKw fiziksel zincire yayılır (Q1) > şarj/deşarj fiziksel etki (AK-10.4) > zamanlı durdurma (Q3) > MV interlock (AK-10.5)) **"kesici kapalıyken toprak kapatma reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/device-telemetry.integration.test.ts` (38 test)

1. (telemetri akışı — tüm cihazlar) **"konteyner linki 20+ cihazdan telemetri taşır"**
2. (telemetri akışı — tüm cihazlar) **"field tier PCS-1/PCS-2/MV-1 telemetrisi dolu"**
3. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC)) **"BSC SOC kanonik tag ile gelir ve 0-100 aralığında"**
4. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC)) **"H1/H5/C5: rack 2-8 stride 150 adreslerinden okunur (R2/R5/R8 SOC dolu)"**
5. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC)) **"H2: rack teşhis bitfield'leri 4-bit gruplarıyla çözülür (Deviation Voltage Fault2)"**
6. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC)) **"H3: bitfield'lerde rack ayrımı var (rack_id tag'i taşınır)"**
7. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC)) **"BSC rack hücre gerilimi gerçekçi (~3.5 V)"**
8. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC)) **"M1: geçersiz sensör değeri (0x7FFF/0xFFFF) telemetri olarak yayınlanmaz"**
9. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"PCS-1 güç/gerilim/akım telemetrisi akar"**
10. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"C7: PCS gerilim limitleri rack numarası değil gerçek gerilim (~1300 V)"**
11. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"C6/PCS1-2: PCS güç limitleri tanımlı (eşleme bsc-pcs-connector'da doğrulanır)"**
12. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"C8/PCS4: PCS akım limitleri tanımlı (eşleme bsc-pcs-connector'da doğrulanır)"**
13. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"PCS3: Battery Pack SOP tanımlı (eşleme bsc-pcs-connector'da doğrulanır)"**
14. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"H7: PCS hücre gerilimi ~3.5 V (sistem hücre gerilimi ölçeği 0.001)"**
15. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS)) **"PCS15: Available Charge/Discharge Energy telemetrisi tanımlı (canlı değer protokol probunda)"**
16. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R)) **"H5: HVAC sıcaklık/nem durum telemetrisi FC03 ile okunur"**
17. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R)) **"Equipment Status geçerli aralıkta (0-4)"**
18. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU)) **"B1: izolasyon direnci FC03 ile ~1 MΩ okunur"**
19. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU)) **"alarm/cihaz hatası sağlıklı durumda 0"**
20. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç)) **"A1: DC V/I/P FC03 ile ölçülür (750 V / 100 A / 75 kW)"**
21. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340) **"P4: faz gerilimleri FC03 ile okunur (~230 V L-N)"**
22. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340) **"P3: 4Q_FP_PF kod çözümü → PF [-1..1]"**
23. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000) **"S2: kapalı şalterde Is Closed=1, Is Open=0"**
24. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000) **"S1: açma/kapama bobinleri darbe sonrası bırakılır (coil 0)"**
25. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO) **"kapı kontağı ve sistem durumu okunur"**
26. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO) **"F1: Fire / 1. Stage girişi tanımlı (LGES cause-and-effect)"**
27. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS) **"G1: DC çıkış durum telemetrisi akar"**
28. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS) **"FSS panel durumu akar"**
29. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu)) **"kesici ve toprak konumları okunur"**
30. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)) **"M3: rack DI bayrakları telemetride (Online/Alarm/Fault)"**
31. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)) **"M4: icat edilen global diff-temp metriği kaldırıldı"**
32. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)) **"G1: dc-output tek birleşik enerji sayacı"**
33. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)) **"PCS3: Battery Pack SOP tanımlı"**
34. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)) **"PCS16/17: EMS-link ve BMS health telemetrisi config'te tanımlı"**
35. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17)) **"M2: BSC fault enjeksiyonu → device alarm üretir"**
36. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17) > PCS18 — arıza sözcükleri (D01–D09) bit-çözümü) **"Appendix 2 adlarıyla bitfield'ler tanımlı"**
37. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17) > PCS18 — arıza sözcükleri (D01–D09) bit-çözümü > Faz 1 / F2.5 — nameplate & HVAC ekleri) **"F2.5: BSC rack nameplate değerleri (17 pack / 4 sensör / 24 hücre / 210 A)"**
38. (telemetri akışı — tüm cihazlar > BSC (LGES Flex BSC) > PCS (Wattox MPCS) > HVAC (Envicool MC90HDNC1R) > IMD (Bender isoPV1685RTU) > Acrel DJSF1352-RN (DC sayaç) > Schneider PM5340 > DC şalter SYW6GZ-4000 > Yangın paneli EP203 / IO > DC çıkış ve FSS > DEMO-MV-1 (MV istasyonu) > Denetim düzeltmeleri (M2/M3/M4/G1/PCS3/16/17) > PCS18 — arıza sözcükleri (D01–D09) bit-çözümü > Faz 1 / F2.5 — nameplate & HVAC ekleri) **"Faz 1: HVAC Compressor Action Count + Server Humidity tanımlı"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/protocol-conformance.integration.test.ts` (10 test)

1. (FC03 okuma şartı (vendor dokümanı)) **"PCS: A bloğu FC03 ile okunur (Operation Status 0x2F7D)"**
2. (FC03 okuma şartı (vendor dokümanı)) **"B1: IMD izolasyon direnci FC03 ile okunur"**
3. (FC03 okuma şartı (vendor dokümanı)) **"A1: DC sayaç gerilimi FC03 ile okunur (float32 çifti)"**
4. (FC03 okuma şartı (vendor dokümanı)) **"H5: HVAC bilgi bloğu (0x1000) FC03 ile okunur"**
5. (FC03 okuma şartı (vendor dokümanı)) **"H1/H2: HVAC uzaktan kapatma (0x202) ve reset (0x200) register'ları erişilebilir"**
6. (FC03 okuma şartı (vendor dokümanı)) **"BSC: hem FC03 (holding 40010) hem FC04 (input 30030) erişilebilir"**
7. (FC03 okuma şartı (vendor dokümanı)) **"DEMO-MV: kesici/toprak konumları FC04 ile okunur"**
8. (FC03 okuma şartı (vendor dokümanı) > PM5340 adres tabanı) **"faz A L-N gerilimi config adresinden (~230 V) okunur"**
9. (FC03 okuma şartı (vendor dokümanı) > PM5340 adres tabanı > PCS12 — komut kaynağı (S01) kapısı) **"S01=0 (HMI) iken EMS start yok sayılır; S01=1 sonrası kabul edilir"**
10. (FC03 okuma şartı (vendor dokümanı) > PM5340 adres tabanı > PCS12 — komut kaynağı (S01) kapısı > PCS15 — available energy (SOC × anma enerji)) **"B19/B20 = SOC×rated (canlı, BMS bloğu)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/station-containers.integration.test.ts` (2 test)

1. (UC-13 station-tagged konteynerler) **"topoloji 2 istasyon + konteynerleri tanımlar; ikisi de connected + telemetri akıyor"**
2. (UC-13 station-tagged konteynerler) **"veri istasyon-bazlı ayrışır: c2 BSC-1 overheat → bess2 ~80, bess1 nominal"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/integration/station-operations.integration.test.ts` (4 test)

1. (UC-13 istasyon bazlı operasyon yürütme (2 konteyner)) **"iki konteyner istasyon etiketli ve bağlı (bess1=container-1, bess2=container-2)"**
2. (UC-13 istasyon bazlı operasyon yürütme (2 konteyner)) **"bess1 standby → uzak bsc_stop container-1'de yürür"**
3. (UC-13 istasyon bazlı operasyon yürütme (2 konteyner)) **"bess2 standby → uzak bsc_stop container-2'de yürür"**
4. (UC-13 istasyon bazlı operasyon yürütme (2 konteyner)) **"systems verilmezse config varsayılanı (container-1) kullanılır (geriye dönük)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/buildDevices.test.ts` (7 test)

1. (buildDevices (UC-9, AK-9.1/9.3)) **"HVAC satırlarından durum/mode/sıcaklık/alarm türetir"**
2. (buildDevices (UC-9, AK-9.1/9.3)) **"HVAC telemetrisi yoksa undefined (güvenli varsayılan)"**
3. (buildDevices (UC-9, AK-9.1/9.3)) **"PM5340 satırlarından AUX ölçümü"**
4. (buildDevices (UC-9, AK-9.1/9.3)) **"CONTROL-PANEL-IO kuru kontaklarından FSS durumu"**
5. (buildDevices (UC-9, AK-9.1/9.3)) **"FSS disablements + vents okunur"**
6. (buildDevices (UC-9, AK-9.1/9.3)) **"FSS telemetrisi yoksa undefined"**
7. (buildDevices (UC-9, AK-9.1/9.3)) **"IMD ve DC ölçümü"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/buildTrendSeries.test.ts` (8 test)

1. (buildTrendSeries (FR-6.1 / AK-6.1)) **"SOC'yi zaman kovasında ortalar"**
2. (buildTrendSeries (FR-6.1 / AK-6.1)) **"gücü toplar (kW→MW)"**
3. (buildTrendSeries (FR-6.1 / AK-6.1)) **"sıcaklıkta maks değeri alır"**
4. (buildTrendSeries (FR-6.1 / AK-6.1)) **"PCS 'Highest Cell Temperature' kanoniksiz de sıcaklık serisine girer"**
5. (buildTrendSeries (FR-6.1 / AK-6.1)) **"TREND_SOURCE_NAMES 3 field-tier kaynağı içerir"**
6. (buildTrendSeries (FR-6.1 / AK-6.1)) **"boş veride boş seriler döner (AK-6.3)"**
7. (buildTrendSeries (FR-6.1 / AK-6.1)) **"K-18: trendBands — güç min ±1 MW"**
8. (buildTrendSeries (FR-6.1 / AK-6.1)) **"K-18: trendBands — büyük yükte güç bandı büyür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demo-permissives.test.ts` (6 test)

1. (derivePermissives (UC-5, referans sim.permissives)) **"referans madde başlıklarını üretir (8 madde + FSS)"**
2. (derivePermissives (UC-5, referans sim.permissives)) **"sağlıklı durumda tüm kontroller ok"**
3. (derivePermissives (UC-5, referans sim.permissives)) **"toprak kapalı → hard fail (yalnız earthing hard)"**
4. (derivePermissives (UC-5, referans sim.permissives)) **"PCS arızası → PCS ready + fault/maintenance fail (hard değil)"**
5. (derivePermissives (UC-5, referans sim.permissives)) **"istem isteği available üstünde → madde 8 fail"**
6. (derivePermissives (UC-5, referans sim.permissives) > deriveStartupChecks (FL-01)) **"5 site availability satırı üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demo-portfolio.test.ts` (6 test)

1. (demo-portfolio (UC-11)) **"AK-11.2: iki proje tanımlıdır"**
2. (demo-portfolio (UC-11)) **"AK-11.3: tam olarak bir proje canlıdır"**
3. (demo-portfolio (UC-11)) **"canlı proje kimliği DEMO_TOPOLOGY ile hizalıdır"**
4. (demo-portfolio (UC-11)) **"proje id'leri benzersizdir"**
5. (demo-portfolio (UC-11)) **"statik proje canlı değildir ve solar kaynak taşır"**
6. (demo-portfolio (UC-11)) **"findPortfolioProject id ile bulur, yoksa undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demo-stations.test.ts` (13 test)

1. (demo-stations) **"2 istasyon × 9 ünite: BESS#1–9 ve BESS#10–18 (gdems stationTopo)"**
2. (demo-stations) **"K-18: her istasyon kendi PCS çiftini ve MV simülatörünü kullanır"**
3. (demo-stations) **"AK-11.6: collector MV STATION ve hücre eşlemesi"**
4. (demo-stations) **"stationForUnit doğru istasyonu döner"**
5. (demo-stations) **"AK-11.5: stationTopo çizimi değiştirmez — 2 fider, üniteler yeniden numaralı"**
6. (demo-stations) **"stateForStation üniteleri ve iki fiderin gücünü süzer"**
7. (demo-stations) **"stationTopo orijinal DEMO_TOPOLOGY'yi bozmaz"**
8. (demo-stations > kollektör tipi + illüstratif PV (AK-11.9)) **"collectorType kuralı: >50 MW → Metal Clad, aksi MV station"**
9. (demo-stations > kollektör tipi + illüstratif PV (AK-11.9)) **"demoPlantTotals: BESS 62.1 (18 × 2 × 1.725) + PV ≈ 43.4 → Metal Clad"**
10. (demo-stations > kollektör tipi + illüstratif PV (AK-11.9)) **"DEMO_SOURCE: 2 PV istasyonu × 7 inverter"**
11. (demo-stations > kollektör tipi + illüstratif PV (AK-11.9) > stationsForContainers (UC-13)) **"station etiketine göre konteynerleri istasyonlara atar"**
12. (demo-stations > kollektör tipi + illüstratif PV (AK-11.9) > stationsForContainers (UC-13)) **"eksik etiketli istasyon ilk konteynere düşer (fallback)"**
13. (demo-stations > kollektör tipi + illüstratif PV (AK-11.9) > stationsForContainers (UC-13)) **"etiket yoksa tüm konteynerler her istasyona (legacy)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demo-teias.test.ts` (5 test)

1. (demo-teias (UC-6, FR-6.3)) **"telemetri 20 satır + komut 8 satır"**
2. (demo-teias (UC-6, FR-6.3)) **"SoH enerji + anlık SOC + reaktif türetir"**
3. (demo-teias (UC-6, FR-6.3)) **"available power PCS limitlerinden (MW)"**
4. (demo-teias (UC-6, FR-6.3)) **"LFSM-U/O frekansa göre"**
5. (demo-teias (UC-6, FR-6.3)) **"charging/discharging durumu P işaretinden"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demo-topology.test.ts` (7 test)

1. (demo-topology (UC-1/T-1, K1)) **"istasyon şablonu 9 ünite (A/H04 1–5, B/H05 6–9); toplam 2×9 = 18"**
2. (demo-topology (UC-1/T-1, K1)) **"fider yönü gdems ile aynı: A→H04, B→H05"**
3. (demo-topology (UC-1/T-1, K1)) **"hücre motor/esMotor/auxTr bayraklarını taşır"**
4. (demo-topology (UC-1/T-1, K1)) **"RMU toprak ayırıcısını (ES) ve motorlu H02'yi taşır"**
5. (demo-topology (UC-1/T-1, K1)) **"konteyner künyesini (bus/rack/sections/aux/fss) taşır"**
6. (demo-topology (UC-1/T-1, K1)) **"limitlerde tripC/zeroPowerMW taşır"**
7. (demo-topology (UC-1/T-1, K1)) **"hücre aksiyonunu demo-MV komut adına eşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demoApi.test.ts` (3 test)

1. (demoApi execute — systems passthrough (UC-13)) **"executeOperation systems gönderir"**
2. (demoApi execute — systems passthrough (UC-13)) **"executeManeuver systems gönderir"**
3. (demoApi execute — systems passthrough (UC-13)) **"systems yokken gönderilmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/demoManeuverApi.test.ts` (2 test)

1. (demoManeuverApi (UC-7, FR-7.1)) **"FL-01…FL-05 kayıtları demo kataloğunda listelenir"**
2. (demoManeuverApi (UC-7, FR-7.1)) **"kapsam gerçek PCS cihaz setine indirgenir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/deriveKpis.test.ts` (4 test)

1. (deriveKpis (FR-4.1 / AK-4.1)) **"ortalama SOC/SOH ve mod türetir"**
2. (deriveKpis (FR-4.1 / AK-4.1)) **"UC-13: BSC ChargeStatus varsa mod istasyon bazlıdır (PCS paylaşımlı olsa da)"**
3. (deriveKpis (FR-4.1 / AK-4.1) > deriveAlerts (FR-4.2 / AK-4.2)) **"severite sırasına göre sıralar ve alarmı öne alır"**
4. (deriveKpis (FR-4.1 / AK-4.1) > deriveAlerts (FR-4.2 / AK-4.2)) **"uyarı yoksa boş döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/mapFieldToMimicState.test.ts` (21 test)

1. (fanOutUnits (FR-2.1)) **"verilen sayıda ünite üretir ve deterministiktir"**
2. (fanOutUnits (FR-2.1)) **"PCS gücünü BÖLMEZ (her grup PCS'i aynı setpoint'i taşır); kopyalar işaretli"**
3. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"legacy (etketsiz) tek prototipi iki istasyona fan-out eder (2×9 = 18)"**
4. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"her fiderin son ünitesinde H03 (hat sonu) yoktur"**
5. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"banka A→BSC-1, banka B→BSC-2 eşler (birebir — sunumsal offset yok)"**
6. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"PCS durum kodlarını eşler (2→chg, 3→dis)"**
7. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"istasyon toplam gücünü korur (POI işaretli)"**
8. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"hücre ΔV türetir (3.400−3.350 V → 50 mV)"**
9. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"raf başına SOC/V/I türetir (UC-5, FR-5.2)"**
10. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"BSC state (30036) ve çevrimiçi raf (30038) telemetrisini banka durumuna taşır"**
11. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"demo-MV telemetrisinden station pozisyonu okur"**
12. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"MV telemetrisi yokken fail-closed: kesici AÇIK + ölçüm 0 (uydurma nominal yok)"**
13. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"fider CT: H04 = fider A, H05 = fider B (topolojiden; eskiden ters)"**
14. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6)) **"boş konteynerde boş ünite listesi döner"**
15. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9)) **"AK-9.1: HVAC/AUX/FSS/IMD/DC ünite durumuna bağlanır"**
16. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9)) **"AK-9.2: fan-out yeni cihazları tüm ünitelere kopyalar; ambient outside temp"**
17. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9)) **"AK-9.3: cihaz telemetrisi yoksa alanlar tanımsız, throw yok"**
18. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9) > UC-13 istasyon-bazlı fan-out) **"iki konteyner topolojiye göre iki istasyona bölünür; SOC ayrışır"**
19. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9) > UC-13 istasyon-bazlı fan-out) **"etiket yoksa legacy tek prototip (güç korunumu) korunur"**
20. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9) > UC-13 istasyon-bazlı fan-out) **"K-18: istasyon PCS çifti — station1 PCS-1/2, station2 PCS-3/4"**
21. (fanOutUnits (FR-2.1) > mapFieldToMimicState (FR-2.2..FR-2.6) > mapFieldToMimicState — container cihazları (UC-9) > UC-13 istasyon-bazlı fan-out) **"UC-13: BSC ChargeStatus bankaya taşınır (istasyon modu için)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/features/demo-data/useTargetSocWatcher.test.ts` (3 test)

1. (useTargetSocWatcher saf türevleri (UC-5)) **"socOf scope ortalamasını verir"**
2. (useTargetSocWatcher saf türevleri (UC-5)) **"targetReached yönü doğru uygular"**
3. (useTargetSocWatcher saf türevleri (UC-5)) **"matchingRunStarted setAt'ten sonra başlayan yön run'ını arar (yarış koruması)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/lib/demo-theme.test.tsx` (2 test)

1. (useDemoTheme) **"localStorage dark → mount anında (senkron) data-theme dark uygular"**
2. (useDemoTheme) **"setTheme('light') → değişkenleri ve localStorage'ı günceller"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/lib/site-field.test.ts` (2 test)

1. (postLoginDestination) **"fieldId varsa portföy sayfasına yönlendirir (UC-11)"**
2. (postLoginDestination) **"fieldId boşsa açık hata döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/pages/DemoDevicesPage.test.tsx` (3 test)

1. (DemoDevicesPage — istasyon bazlı ağaç) **"istasyon 2: Battery groups BESS#10–18 listelenir"**
2. (DemoDevicesPage — istasyon bazlı ağaç) **"istasyon 2: BESS#10 seçilince battery alt sekmeleri açılır"**
3. (DemoDevicesPage — istasyon bazlı ağaç) **"istasyon 1: BESS#1–9 listelenir (regresyon)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/pages/DemoFieldPage.test.tsx` (4 test)

1. (DemoFieldPage — site layout (UC-4)) **"ortak üst blok + site yerleşimini render eder"**
2. (DemoFieldPage — site layout (UC-4)) **"hata durumunda uyarı gösterir ama sayfa render olur"**
3. (DemoFieldPage — site layout (UC-4)) **"istasyon seçici var (2 istasyon × 9 ünite; çizim aktif istasyonu gösterir)"**
4. (DemoFieldPage — site layout (UC-4)) **"DemoMimic mount olurken tema değişkenlerini light'a EZMEZ (dark korunur)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `apps/site/src/pages/DemoProjectsPage.test.tsx` (3 test)

1. (DemoProjectsPage (UC-11)) **"AK-11.1/11.2: başlık, iki proje ve haritayı render eder"**
2. (DemoProjectsPage (UC-11)) **"AK-11.6: PTF kartı, Asset management ve Market paneli görünür"**
3. (DemoProjectsPage (UC-11)) **"harita lejantı ve New project yer tutucusu vardır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/messaging/bullmq-adapter.test.ts` (18 test)

1. (BullMQAdapter openQueue (jenerik)) **"kuyruk + QueueEvents kurulur; retryOptions işlenir"**
2. (BullMQAdapter openQueue (jenerik)) **"aynı ad iki kez açılırsa tek Queue örneği döner (önbellek)"**
3. (BullMQAdapter openQueue (jenerik)) **"QueueEvents failed handler'ı konsola yazılır"**
4. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"add: jobName + data + jobId/delay/priority iletimi"**
5. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"addRepeatable: every + startDate + jobId"**
6. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"addRepeatablePattern: pattern + jobId"**
7. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: nesne sonuç spread edilir (success:true varsayılan)"**
8. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: worker success:false sonucu EZER"**
9. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: nesne olmayan sonuç → { success: true }"**
10. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"executeAndWait: timeout/hatada → { success: false, reason }"**
11. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"registerWorker: doğru ad + concurrency; onCompleted/onFailed bağlanır"**
12. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"worker error eventi konsola yazılır"**
13. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"stats: sayaçlar döner; reddedilen sayaç 0 sayılır"**
14. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik)) **"jobCounts delegate eder"**
15. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"queueStatus: açık tüm kuyrukları kuyruk adıyla döner"**
16. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"health: ping false → false; ping true → true"**
17. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"health: ping hatası → false (throw yok)"**
18. (BullMQAdapter openQueue (jenerik) > BullMQQueue facade (jenerik) > BullMQAdapter queueStatus/health/close (jenerik)) **"close: tüm worker + QueueEvents + Queue close'ları çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/messaging/redis.test.ts` (8 test)

1. (RedisConnection (T3)) **"şifresiz config: URL redis://host:port + database opsiyonu"**
2. (RedisConnection (T3)) **"şifreli config: URL şifre taşır"**
3. (RedisConnection (T3)) **"connect yalnızca bir kez client.connect çağırır (idempotent)"**
4. (RedisConnection (T3)) **"disconnect yalnızca bağlıyken quit çağırır"**
5. (RedisConnection (T3)) **"ping PONG → true"**
6. (RedisConnection (T3)) **"ping hatası → false (throw DEĞİL — kademeli bozulma)"**
7. (RedisConnection (T3)) **"connectionConfig yapılandırmayı döner"**
8. (RedisConnection (T3)) **"client ham redis client'ı döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/client-rtu.test.ts` (7 test)

1. (ModbusRtuClient (T3)) **"config varsayılanlarıyla port kurulur (connect anında)"**
2. (ModbusRtuClient (T3)) **"connect open eventi ile bağlanır"**
3. (ModbusRtuClient (T3)) **"connect error eventi → 'Modbus RTU connection failed'"**
4. (ModbusRtuClient (T3)) **"connect timeout → port kapatılır + path bağlamlı hata"**
5. (ModbusRtuClient (T3)) **"bağlı değilken okuma 'Not connected' fırlatır"**
6. (ModbusRtuClient (T3)) **"close eventi bağlantıyı düşürür"**
7. (ModbusRtuClient (T3)) **"bağlıyken port error eventi bağlantıyı düşürür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/client.test.ts` (8 test)

1. (ModbusTcpClient (T3)) **"connect başarılı: bağlı durum + reconnect sayacı sıfırlanır"**
2. (ModbusTcpClient (T3)) **"connect error eventi → 'Modbus connection failed' hatası"**
3. (ModbusTcpClient (T3)) **"connect timeout (varsayılan 3000 ms) → socket destroy + hata"**
4. (ModbusTcpClient (T3)) **"bağlı değilken read/write 'Not connected' fırlatır"**
5. (ModbusTcpClient (T3)) **"readHoldingRegisters jsmodbus sonucunu döner; hata sarılır"**
6. (ModbusTcpClient (T3)) **"socket close eventi bağlantıyı düşürür"**
7. (ModbusTcpClient (T3)) **"bağlıyken socket error eventi bağlantıyı düşürür"**
8. (ModbusTcpClient (T3)) **"reconnect: cleanup + bekleme sonrası yeniden connect"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/decoder.test.ts` (20 test)

1. (BinaryPayloadDecoder > constructor + byte order) **"stores registers in BIG_ENDIAN order (no transform)"**
2. (BinaryPayloadDecoder > constructor + byte order) **"reverses bytes for LITTLE_ENDIAN"**
3. (BinaryPayloadDecoder > constructor + byte order) **"swaps words for BIG_ENDIAN_SWAP"**
4. (BinaryPayloadDecoder > constructor + byte order) **"does 4-byte reverse for LITTLE_ENDIAN_SWAP"**
5. (BinaryPayloadDecoder > constructor + byte order > decodeUint16) **"decodes single unsigned 16-bit"**
6. (BinaryPayloadDecoder > constructor + byte order > decodeUint16) **"decodes 0xFFFF as 65535"**
7. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16) **"decodes positive value"**
8. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16) **"decodes negative value (two's complement)"**
9. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32) **"decodes two registers into 32-bit unsigned"**
10. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32) **"decodes max value"**
11. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32) **"decodes positive 32-bit"**
12. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32) **"decodes negative 32-bit"**
13. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32) **"decodes float 32 from two registers"**
14. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32) **"decodes 0.0"**
15. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32) **"decodes negative float"**
16. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64) **"decodes float 64 from four registers"**
17. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64) **"decodes 0.0"**
18. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64 > sequential position advancement) **"advances position across multiple decodes"**
19. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64 > sequential position advancement > getRegisterCount > decode4QPowerFactor (Schneider 4Q FP PF) > scale/offset pattern (integration example)) **"applies scale and offset after decoding"**
20. (BinaryPayloadDecoder > constructor + byte order > decodeUint16 > decodeInt16 > decodeUint32 > decodeInt32 > decodeFloat32 > decodeFloat64 > sequential position advancement > getRegisterCount > decode4QPowerFactor (Schneider 4Q FP PF) > scale/offset pattern (integration example)) **"handles negative offset"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/device.test.ts` (31 test)

1. (ModbusDevice.read() ISP sözleşmesi) **"register + bitfield çıktılarını birleşik döner"**
2. (ModbusDevice.read() ISP sözleşmesi) **"bitfield bit değeri mask ile çıkarılır"**
3. (ModbusDevice.read() ISP sözleşmesi) **"bitfield config yoksa yalnızca register telemetrileri döner"**
4. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF)) **"UINT16 0xFFFF sentinel değeri sonuçtan çıkarılır, diğerleri korunur"**
5. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF)) **"INT16 0x7FFF ve 0x8000 sentinel değerleri çıkarılır"**
6. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF)) **"FLOAT32 NaN sentinel değeri çıkarılır"**
7. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF)) **"normal değerler korunur (regresyon)"**
8. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write()) **"scale/offset uygulanmış ham değeri HOLDING register'ına yazar"**
9. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write()) **"COIL telemetrisini writeCoils ile boolean olarak yazar"**
10. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write()) **"boş girdi → transport'a yazma çağrısı YAPILMAZ"**
11. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write()) **"config'te olmayan isim yok sayılır (kademeli bozulma)"**
12. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"başarılı yazımda backup okur, yazar, rollback ÇAĞRILMAZ"**
13. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"ikinci grupta hata → ilk grup ESKİ değerine geri yüklenir + orijinal hata fırlar"**
14. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"rollback sırasında hata olursa ORİJİNAL hata fırlar (rollback hatası yutulur)"**
15. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"COIL yazımı başarılı + holding başarısız → coil ESKİ değerine döner"**
16. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"FLOAT32 değerleri BE register çifti olarak yazılır ve rollback round-trip korunur"**
17. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional)) **"yalnızca INPUT_REGISTER girdi → no-op (backup dahi okunmaz)"**
18. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"bitişik adresler priority farkına rağmen tek istekte okunur"**
19. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"okuma sırası: HOLDING, INPUT, COIL, DISCRETE, bitfield"**
20. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"coil/discrete okumalarında sıra korunur"**
21. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"tüm sonuçlar aynı poll timestamp'ini taşır"**
22. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"yalnızca bitfield'lı cihazda read() bitfield sonuçlarını döner"**
23. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"aynı isimli girdilerde tag alt küme eşleşmesi doğru olanı seçer"**
24. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel)) **"32-bit tam genişlik bitfield doğru çözülür"**
25. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C)) **"bitfield bit aralığı 31 üstü reddedilir"**
26. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C)) **"bitEnd < bitStart reddedilir"**
27. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C)) **"bitfield registerType COIL reddedilir"**
28. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C)) **"COIL backup'u readCoils'tan okunur; aynı adresli HOLDING ile karışmaz"**
29. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C)) **"rollback ham register'ları aynen geri yazar (float kayma yok)"**
30. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C) > ModbusDevice yazma limiti (Faz C)) **"125 register üstü yazma grubu reddedilir"**
31. (ModbusDevice.read() ISP sözleşmesi > ModbusDevice.read() sentinel filtresi (M1 — 0x7FFF/0x8000/0xFFFF) > ModbusDevice.write() > ModbusDevice.writeAtomic() (TEİAŞ #22 — transactional) > ModbusDevice okuma gruplaması (Faz B — adres sıralı + paralel) > ModbusDevice config doğrulaması (Faz C) > ModbusDevice writeAtomic ham backup (Faz C) > ModbusDevice yazma limiti (Faz C) > ModbusDevice bağlantı cooldown (mevcut davranış karakterizasyonu)) **"kopuk bağlantıda reconnect dener; 10 sn içinde ikinci deneme reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/serial-socket-adapter.test.ts` (5 test)

1. (SerialSocketAdapter) **"isOpen port durumunu yansıtır"**
2. (SerialSocketAdapter) **"'open' / 'error' / 'close' olayları aktarılır"**
3. (SerialSocketAdapter) **"'data' Uint8Array → Buffer olarak iletilir"**
4. (SerialSocketAdapter) **"write → port.write + callback başarı/hata iletir"**
5. (SerialSocketAdapter) **"close best-effort — hata yutulur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/modbus/utils.test.ts` (1 test)

1. (randomFloat) **"[0,1) aralığında döner — 100 örneklem"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/core/src/timeseries/implementations/timescaledb/timescaledb-adapter.test.ts` (17 test)

1. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"multi-row INSERT + BEGIN/COMMIT üretir; tablo adı device_ önekli"**
2. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"K-21: getLatestPerName DISTINCT ON (name) + pencere parametresi (latest modu)"**
3. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"boş girdi → havuz işlemi YAPILMAZ"**
4. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"tablo hazırlığı başarısız cihazın batch'i ATLANIR (INSERT denenmez, throw yok)"**
5. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"INSERT hatası → ROLLBACK; write REJECT eder (retry ön koşulu — K10)"**
6. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"ensureTableExists tablo DDL'ini yalnızca bir kez çalıştırır (tablo önbelleği)"**
7. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3)) **"ensureTableExists → retention politikasını da kurar (her tier; tablo başına bir kez)"**
8. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)) **"aggregate: bucket'lar sorgunun from zamanına hizalanır (origin=$1)"**
9. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı)) **"getDownsampledData: bucket'lar from ISO zamanına hizalanır (origin literal)"**
10. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6)) **"aynı isim farklı rack → ayrı seriler; meta'dan unit/tags yapıştırılır"**
11. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6)) **"rack filtresi parametreli sorgu üretir"**
12. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6)) **"tag verilmezse name-only gruplama (jenerik)"**
13. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6)) **"geçersiz tag anahtarı yok sayılır (name-only; enjeksiyon yok)"**
14. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6) > TimescaleDBAdapter — gapfill/locf (K7)) **"locfCarryMs=0 → gapfill YOK (mevcut davranış)"**
15. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6) > TimescaleDBAdapter — gapfill/locf (K7)) **"locfCarryMs>0 → gapfill+locf; taşıma sınırı dışı boşluk düşer"**
16. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6) > TimescaleDBAdapter — gapfill/locf (K7) > TimescaleDBAdapter — chunk & çok-cihaz hata (Faz D)) **">200 satır → birden fazla INSERT (batch dilimi)"**
17. (TimescaleDBAdapter — write/INSERT akışı (2026-08-30 T3) > TimescaleDBAdapter — bucket origin hizalaması (Grafana kuralı) > TimescaleDBAdapter — getDownsampledData uzun-format (Faz-1, K2/K6) > TimescaleDBAdapter — gapfill/locf (K7) > TimescaleDBAdapter — chunk & çok-cihaz hata (Faz D)) **"çok-cihaz: bir cihazın yazımı hata → write REJECT eder (allSettled)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/epias-client/src/client.test.ts` (6 test)

1. (EpiasClient) **"fetchJson — once CAS'ten TGT alir, istege TGT header'i ekler"**
2. (EpiasClient) **"ptf — tarihler +03:00 formatina cevrilir"**
3. (EpiasClient) **"401 alinirsa bilet gecersiz kilinir ve istek bir kez tekrarlanir"**
4. (EpiasClient) **"ayni client, bilet gecerliyken tek TGT kullanir"**
5. (EpiasClient > toEpiasIso) **"UTC tarihi Turkiye saati +03:00 olarak bicimler"**
6. (EpiasClient > toEpiasIso) **"kis aylarinda da sabit +03:00 kullanir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/epias-client/src/ticket-store.test.ts` (9 test)

1. (EpiasTicketStore) **"ilk istekte CAS'ten bilet alir ve dosyaya yazar"**
2. (EpiasTicketStore) **"CAS HTML yanitindan TGT'yi ayiklar (canli form cevabi)"**
3. (EpiasTicketStore) **"TGT'siz HTML → hata firlatir (ticket cache'e girmez)"**
4. (EpiasTicketStore) **"gecerli bilet varken CAS'e tekrar istek atmaz (throttle korumasi)"**
5. (EpiasTicketStore) **"omru dolan bilet yenilenir"**
6. (EpiasTicketStore) **"bilet dosyada kalicidir — yeni store ornegi ayni bileti kullanir"**
7. (EpiasTicketStore) **"es zamanli isteklerde tek CAS cagrisi yapilir"**
8. (EpiasTicketStore) **"invalidate sonrasi bilet yeniden alinir"**
9. (EpiasTicketStore) **"CAS 201 disinda cevap donerse hata firlatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/logger/src/logger.test.ts` (15 test)

1. (Logger — UC-1 temel loglama ve format) **"AK-1.1 — info kaydı ts/level/service/message/context taşır"**
2. (Logger — UC-1 temel loglama ve format) **"AK-1.1 — context'siz kayıt da üretilir"**
3. (Logger — UC-1 temel loglama ve format) **"AK-1.2 — eşiğin altındaki seviye sink'e ulaşmaz"**
4. (Logger — UC-1 temel loglama ve format) **"AK-1.3 — level verilmezse info varsayılan olur"**
5. (Logger — UC-1 temel loglama ve format) **"AK-1.4 — level altı çağrıda sink'e kayıt üretilmez (no-op)"**
6. (Logger — UC-1 temel loglama ve format) **"boş service constructor'da throw eder"**
7. (Logger — UC-1 temel loglama ve format) **"edge — fonksiyon/sembol içeren context güvenle elenir"**
8. (Logger — UC-1 temel loglama ve format) **"edge — döngüsel context throw etmez, kayıt üretilir"**
9. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"AK-3.2 — child component taşır, service parent'ınkidir"**
10. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"AK-3.1 — parent'a sonradan eklenen sink child kayıtlarını da alır"**
11. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"child parent'ın level'ini devralır"**
12. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger) **"edge — boş component kaydı etiketsiz üretir"**
13. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger > Logger — close ve hata izolasyonu) **"AK-2.2 — bir sink throw edince diğeri yazar, logger throw etmez"**
14. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger > Logger — close ve hata izolasyonu) **"AK-2.2 — async sink reddederse logger throw etmez"**
15. (Logger — UC-1 temel loglama ve format > Logger — UC-3 child logger > Logger — close ve hata izolasyonu) **"close tüm sink'lerin close'unu çağırır, hata yutulur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/logger/src/sinks.test.ts` (8 test)

1. (Logger — UC-2 sink yönetimi) **"AK-2.1 — removeSink sonrası kayıt yalnız kalan sink'e gider"**
2. (Logger — UC-2 sink yönetimi) **"edge — aynı sink iki kez eklenirse tek sayılır"**
3. (Logger — UC-2 sink yönetimi) **"edge — listede olmayan sink'i çıkarmak no-op'tur"**
4. (Logger — UC-2 sink yönetimi > FileSink — UC-2) **"AK-2.3 — JSON satırları append eder; close stream'i kapatır"**
5. (Logger — UC-2 sink yönetimi > FileSink — UC-2) **"edge — üst dizin yoksa oluşturur"**
6. (Logger — UC-2 sink yönetimi > FileSink — UC-2) **"close sonrası yazma reddedilir"**
7. (Logger — UC-2 sink yönetimi > FileSink — UC-2 > ConsoleSink) **"insan-okur tek satırı seviye metoduna yazar"**
8. (Logger — UC-2 sink yönetimi > FileSink — UC-2 > ConsoleSink) **"seviyeyi doğru console metoduna eşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/command-job-builder.test.ts` (16 test)

1. (CommandJobBuilder.build) **"config yok → err device_not_found"**
2. (CommandJobBuilder.build) **"komut tanımsız → err command_not_found"**
3. (CommandJobBuilder.build) **"zorunlu param eksik → err missing_param (context.paramName taşır)"**
4. (CommandJobBuilder.build) **"zorunlu olmayan param eksik → ok"**
5. (CommandJobBuilder.build) **"{{param}} sayısal çözülür; -{{param}} negatif uygular; şablon olmayan aynen kalır"**
6. (CommandJobBuilder.build) **"atomic belirtilmemişse true; false belirtilmişse false"**
7. (CommandJobBuilder.build) **"gerçek config (source of truth): BSC rack diff-temp 30264/30265 + DC-METER voltage + stop (K1)"**
8. (CommandJobBuilder.build) **"validate eşlemesi: reads + timeoutMs + minWaitMs"**
9. (CommandJobBuilder.build) **"validate yoksa job.validate undefined; timeoutMs defaultu yalnızca validate ile birlikte anlamlı"**
10. (CommandJobBuilder.build) **"jobId formatı: deviceId-command-timestamp (enjekte now)"**
11. (CommandJobBuilder.build) **"telemetri çıktısına timestamp + deviceId + description eklenir"**
12. (CommandJobBuilder.build) **"job type COMMAND_DEVICE ve deviceId doğru"**
13. (CommandJobBuilder.build > DeviceConfigFileSource) **"mevcut dosyayı yükler"**
14. (CommandJobBuilder.build > DeviceConfigFileSource) **"olmayan cihaz → undefined"**
15. (CommandJobBuilder.build > DeviceConfigFileSource) **"büyük/küçük harf uyumlu arama: önce lowercase, sonra orijinal"**
16. (CommandJobBuilder.build > DeviceConfigFileSource) **"bozuk JSON atlanır → undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/maneuver-migration.test.ts` (12 test)

1. (konteyner maneuvers.json (A3 migrasyon)) **"fail-fast yüklenir — 12 kayıt"**
2. (konteyner maneuvers.json (A3 migrasyon)) **"registry isimle çözer (bsc_prepare, fl03, fl05 force)"**
3. (konteyner maneuvers.json (A3 migrasyon)) **"K12: hiçbir adımda BSC charge/discharge komutu YOK"**
4. (konteyner maneuvers.json (A3 migrasyon)) **"bsc_prepare güç param'ı TAŞIMAZ (K12 sözleşmesi)"**
5. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"fail-fast yüklenir — 12 kayıt"**
6. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"deviceTypes seçicili adımlar (PCS tip çözümlemesi yürütücüde)"**
7. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"fl06/fl07/fl10 gizli; fl01/fl03/fl04/fl05 görünür"**
8. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01)) **"FL-02 kartları manevra kaydında YOK — OPERASYON'a taşındı (§7)"**
9. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"fail-fast yüklenir — 3 operasyon"**
10. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"field_charge: uzak bsc_prepare ×2 + yerel pcs_charge; rollback ters set"**
11. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"field_maintenance (FL-11): uzak bakım kapatması + yerel stop"**
12. (konteyner maneuvers.json (A3 migrasyon) > field maneuvers.json (A3 migrasyon — REV.01) > field operations.json (A3 migrasyon — §6.1)) **"registry operasyon isimlerini çözer"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/maneuver-registry.test.ts` (11 test)

1. (ManeuverRegistry) **"bilinen manevra ismini çözer — ok(kayıt)"**
2. (ManeuverRegistry) **"bilinen operasyon ismini çözer — ok(kayıt)"**
3. (ManeuverRegistry) **"bilinmeyen isim → err({kind: not_found}) — throw YOK"**
4. (ManeuverRegistry) **"tür ayrımı: manevra ismi operasyon türünde çözülmez"**
5. (ManeuverRegistry) **"boş kayıt seti — her isim not_found"**
6. (ManeuverRegistry) **"aynı isimde iki DOSYA manevrası → kurulumda THROW (fail-fast)"**
7. (ManeuverRegistry) **"manevra ve operasyon aynı isimde olabilir (ayrı ad uzayları)"**
8. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"DB kaydı dosya kaydını GÖLGELER (öncelik DB)"**
9. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"disabled DB kaydı → err({kind: disabled}) — dosyaya DÜŞMEZ"**
10. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"DB'de yoksa dosyaya düşer"**
11. (ManeuverRegistry > ManeuverRegistry — hibrit (DB > dosya, §11.1)) **"list: enabled DB kayıtları + gölgelenmeyen dosya kayıtları"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/commands/src/operation-executor.test.ts` (31 test)

1. (OperationExecutor — preconditions hook (K10)) **"hook yokken davranış birebir (yürütür)"**
2. (OperationExecutor — preconditions hook (K10)) **"hook izin verirse yürütür"**
3. (OperationExecutor — preconditions hook (K10)) **"hook reddederse rejected + reason; begin/kanal ÇALIŞMAZ"**
4. (OperationExecutor — preconditions hook (K10)) **"hook throw ederse precondition_error"**
5. (OperationExecutor — preconditions hook (K10)) **"hook adı ve params'ı alır"**
6. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"kayıt yok → rejected; begin/kanal ÇALIŞMAZ"**
7. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"deviceTypes çözümleme + divideTotal: 200 kW → 2 PCS × 100 kW"**
8. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"grup kısıtı (deviceIds) seçici çözümünü KESER"**
9. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"çözüm boş → adım başarısız → failed (kademeli bozulma)"**
10. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"sequential + onFailure stop: ilk hata kalan adımları ATLAR"**
11. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"onFailure continue: hata sonrası devam; sonuç failed"**
12. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"rollback: yalnızca BAŞARILI adımların kompanzasyonu, ters sıra"**
13. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme) **"rollback best-effort: kompanzasyon hatası diğerlerini durdurmaz"**
14. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"begin FAIL-CLOSED: throw → rejected (run_persist_failed), kanal çalışmaz"**
15. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"başarılı koşu: begin(running) → finish(completed) + audit zinciri"**
16. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"finish best-effort: throw → sonuç yine döner + operation_state_update_failed"**
17. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"timer: başarılı adımda stop planlanır (best-effort + timer_scheduled)"**
18. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"timer: ana komut BAŞARISIZSA planlama YAPILMAZ"**
19. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer) **"timer schedule hatası → timer_schedule_failed; akış durmaz"**
20. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme) **"manevra adımı + ham zincir adımı sırayla çalışır"**
21. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme) **"uzak adım (system) B1'de kanal YOK → fail (kademeli bozulma)"**
22. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme) **"operasyon onFailure rollback: üst rollback listesi çalışır"**
23. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"remoteChannel VARSA uzak adım kanala delege edilir (param aktarımıyla)"**
24. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"uzak adıma timer iletilir (options.timer → 4. argüman)"**
25. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"uzak adım fail → operasyon failed (kademeli)"**
26. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"UC-13: remoteSystem verilince uzak adım o konteynere yönlenir (config system override)"**
27. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"UC-13: remoteSystem koşu kaydına (steps.remoteSystem) yazılır — istasyon ayrımı"**
28. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"UC-13: uzak adım yanıt vermezse remote_timeout ile failed (run kilitlenmez)"**
29. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C)) **"uzak rollback adımı: yalnızca BAŞARILI adımlar kompanse edilir (ok → rollback_step_ok)"**
30. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C) > OperationExecutor — UI zamanlı çalıştırma (§10)) **"options.timer TÜM yerel ana adımlara uygulanır; rollback adımlarına UYGULANMAZ"**
31. (OperationExecutor — preconditions hook (K10) > OperationExecutor — manevra yürütme > OperationExecutor — kalıcılık + timer > OperationExecutor — operasyon yürütme > OperationExecutor — uzak adım kanalı (Faz C) > OperationExecutor — UI zamanlı çalıştırma (§10)) **"kayıt adımının kendi timer'ı options.timer'ı EZER"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/logging/src/event-codes.test.ts` (3 test)

1. (GD-PMS olay sözlüğü) **"kayıtlı kodlar doğrulanır"**
2. (GD-PMS olay sözlüğü) **"bilinmeyen kodlar reddedilir"**
3. (GD-PMS olay sözlüğü) **"küme boş değildir ve benzersizdir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/logging/src/logger-config.test.ts` (8 test)

1. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"üç tier için de tanımlıdır"**
2. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"container: console + file (timescale YOK)"**
3. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"site: console + file + timescale"**
4. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"boss: console + file + timescale"**
5. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS) **"tüm tier'ların signingKeyPath'i doludur"**
6. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS > loggerConfigForTier) **"override'sız tier varsayılanını döner"**
7. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS > loggerConfigForTier) **"override alanları tier varsayılanını ezer"**
8. (LoggerConfig tier varsayılanları (T0.5) > TIER_LOGGER_DEFAULTS > loggerConfigForTier) **"sink listesi override edilebilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/platform/messaging/src/platform-message-queue.test.ts` (24 test)

1. (PlatformMessageQueue retry haritası (T0.12)) **"harita politika değerlerini taşır"**
2. (PlatformMessageQueue retry haritası (T0.12)) **"READ_DEVICE kuyruğu attempts:1 ile açılır (poll = doğal retry)"**
3. (PlatformMessageQueue retry haritası (T0.12)) **"WRITE_TELEMETRY kuyruğu attempts:1 (retry yok) ile açılır"**
4. (PlatformMessageQueue retry haritası (T0.12)) **"her tip kendi seçenekleriyle açılır"**
5. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu) **"queueNames override: Queue + QueueEvents + Worker özel adla açılır"**
6. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu) **"retryOptions override kuyruğa işlenir (tip başına TAM değiştirme)"**
7. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu) **"bilinmeyen JobType anahtarları yok sayılır"**
8. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"addJob delay seçeneğini iletir"**
9. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"executeAndWait: başarılı nesne sonucu döner"**
10. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"executeAndWait: nesne olmayan sonuç → { success: true }"**
11. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"executeAndWait: timeout/hatada → { success: false, reason }"**
12. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"addRepeatableJob: pattern + jobId formatı"**
13. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"addRepeatableJobEvery: startDate'li ve startDate'siz"**
14. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"registerWorkerFor: doğru ad + concurrency; onCompleted/onFailed bağlanır"**
15. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"registerWorker: 6 tip için worker kurulur"**
16. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"worker error eventi konsola yazılır"**
17. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"queueStatus: kuyruklar JobType adıyla döner"**
18. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"queueStatus: reddedilen sayaç 0 sayılır (allSettled — kademeli bozulma)"**
19. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"queueStats: bilinen tip durum döner, bilinmeyen tip null"**
20. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: ping false → false"**
21. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: ping true + READ_DEVICE kuyruğu → true"**
22. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: ping true + kuyruk yok → true"**
23. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"health: getJobCounts hatası → false"**
24. (PlatformMessageQueue retry haritası (T0.12) > PlatformMessageQueue config enjeksiyonu > PlatformMessageQueue yüzeyi (IMessageQueue)) **"close: tüm worker/queueEvents/queue close'ları çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/context.test.ts` (5 test)

1. (FilePluginStateStore) **"yazma/okuma/silme turu calisir"**
2. (FilePluginStateStore) **"bozuk dosya durumunda bos obje doner"**
3. (FilePluginStateStore > JsonFilePluginConfigSource + PluginContextFactory) **"config dosyasini yukler ve context olusturur"**
4. (FilePluginStateStore > JsonFilePluginConfigSource + PluginContextFactory) **"config dosyasi yoksa bos obje doner"**
5. (FilePluginStateStore > JsonFilePluginConfigSource + PluginContextFactory) **"{env:VAR} referanslarini ortam degiskeninden okur (sir repo'da tutulmaz)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/http/http-client.test.ts` (7 test)

1. (HttpClient) **"getJson — baseUrl ile birlesik URL ve header'lar ile istek atar"**
2. (HttpClient) **"postJson — JSON govde ve Content-Type header'i ekler"**
3. (HttpClient) **"postForm — form-encoded govde uretir"**
4. (HttpClient) **"5xx hatasinda yeniden dener, basarili denemeyi dondurur"**
5. (HttpClient) **"4xx hatasinda yeniden denemez, HttpError firlatir"**
6. (HttpClient) **"ag hatasinda maxRetries kadar yeniden dener"**
7. (HttpClient) **"HttpError govdeyi ve durumu tasir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/loader.test.ts` (5 test)

1. (PluginLoader) **"statik kaynaktaki pluginleri kaydeder"**
2. (PluginLoader) **"dizin kaynagindan plugin yukler (runtime plugin)"**
3. (PluginLoader) **"olmayan dizinde bos doner ve hata firlatmaz"**
4. (PluginLoader) **"ayni isim statik ve dizin kaynagindan gelirse ilki kazanir"**
5. (PluginLoader) **"manifest'siz dizin girisini atlar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/registry.test.ts` (5 test)

1. (PluginRegistry) **"plugin kaydeder ve sorgular"**
2. (PluginRegistry) **"ayni isimdeki ikinci kaydi reddeder"**
3. (PluginRegistry) **"SDK versiyon uyumsuzlugunu reddeder"**
4. (PluginRegistry) **"deactivateAll tum pluginleri deactivate eder ve temizler"**
5. (PluginRegistry) **"health tum pluginleri toplar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugin-sdk/src/sdk-version.test.ts` (4 test)

1. (SemVerRange) **"aralik icindeki versiyonlari kabul eder"**
2. (SemVerRange) **"aralik disindaki versiyonlari reddeder"**
3. (SemVerRange) **"tek kosullu araliklari destekler"**
4. (SemVerRange) **"gecersiz ifadelerde firlatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/plugins/epias-market-prices/src/plugin.test.ts` (9 test)

1. (EpiasMarketPricesPlugin) **"manifest ve schedule dondurur"**
2. (EpiasMarketPricesPlugin) **"fetch — satirlari MarketDataPoint'e cevirir, TGT header ekler ve cursor yazar"**
3. (EpiasMarketPricesPlugin) **"hourField verilirse timestamp = date + (hour-1) saat (TR saati)"**
4. (EpiasMarketPricesPlugin) **"hourField gecersizse satir atlanir"**
5. (EpiasMarketPricesPlugin) **"fetch — pencere verilmezse cursor'dan devam eder"**
6. (EpiasMarketPricesPlugin) **"iki fetch ayni TGT'yi kullanir — CAS'e tek istek atilir"**
7. (EpiasMarketPricesPlugin) **"gecersiz konfigurasyonda activate firlatir"**
8. (EpiasMarketPricesPlugin) **"bozuk satirlari sessizce atlar"**
9. (EpiasMarketPricesPlugin) **"activate'ten once fetch firlatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/result/src/domain-error.test.ts` (8 test)

1. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"tüm alanları korur"**
2. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"boş message kabul etmez — constructor doğrular"**
3. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"boş code kabul etmez"**
4. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"varsayılanlar: context boş, cause yok"**
5. (DomainError hiyerarşisi (T0.2) > DomainError tabanı) **"Error zincirinin parçasıdır"**
6. (DomainError hiyerarşisi (T0.2) > DomainError tabanı > alt sınıf kind/retryable sabitlemesi) **"${c.name} → kind=${c.kind}, retryable=${c.retryable}"**
7. (DomainError hiyerarşisi (T0.2) > DomainError tabanı > alt sınıf kind/retryable sabitlemesi) **"alt sınıflar context/cause seçeneklerini kabul eder"**
8. (DomainError hiyerarşisi (T0.2) > DomainError tabanı > alt sınıf kind/retryable sabitlemesi) **"kind üzerine yazılamaz — alt sınıf kimliği korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/result/src/result.test.ts` (19 test)

1. (Result<T,E> (T0.2) > ok()) **"başarı durumu taşır"**
2. (Result<T,E> (T0.2) > ok()) **"null kabul etmez — constructor doğrular"**
3. (Result<T,E> (T0.2) > ok()) **"undefined kabul etmez — constructor doğrular"**
4. (Result<T,E> (T0.2) > ok() > err()) **"hata durumu taşır"**
5. (Result<T,E> (T0.2) > ok() > err()) **"undefined hata kabul etmez"**
6. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"err üzerinde unwrap fırlatır"**
7. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"ok üzerinde error() fırlatır"**
8. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"unwrapOr hata durumunda fallback döner"**
9. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları) **"unwrapOr başarı durumunda değeri döner"**
10. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map) **"ok üzerinde dönüşüm uygular"**
11. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map) **"err üzerinde dönüşüm uygulamaz — hatayı korur"**
12. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen) **"ok üzerinde zincirler ve yeni Result döner"**
13. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen) **"err üzerinde zincirlemez — hatayı korur"**
14. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match) **"ok kolunu çalıştırır"**
15. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match) **"err kolunu çalıştırır"**
16. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"map/andThen mevcut nesneyi değiştirmez"**
17. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"her üretim yeni örnektir"**
18. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"okVoid değersiz başarı üretir (komut tipi işlemler)"**
19. (Result<T,E> (T0.2) > ok() > err() > unwrap / error sınırları > map > andThen > match > immutability) **"okVoid hata taşıyamaz — err ayrı factory'dir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/automation-rule.test.ts` (26 test)

1. (automationRulesSchema) **"geçerli kural dosyasını kabul eder (command + log + notify)"**
2. (automationRulesSchema) **"when.all ile çoklu koşul kabul eder"**
3. (automationRulesSchema) **"when.any kabul eder"**
4. (automationRulesSchema) **"device seçicisi ids + types birlikte kabul eder"**
5. (automationRulesSchema) **"device seçicisi olmadan koşul kabul eder (tüm cihazlar)"**
6. (automationRulesSchema) **"enabled/cooldownMs/debounceMs opsiyoneldir"**
7. (automationRulesSchema) **"debounceMs 0 kabul eder (anında kenar)"**
8. (automationRulesSchema) **"when hem eksik hem boş → red"**
9. (automationRulesSchema) **"all boş dizi → red"**
10. (automationRulesSchema) **"op enum dışı değer → red"**
11. (automationRulesSchema) **"threshold sayı değilse → red"**
12. (automationRulesSchema) **"device.ids boş dizi → red"**
13. (automationRulesSchema) **"device.types boş dizi → red"**
14. (automationRulesSchema) **"then boş → red"**
15. (automationRulesSchema) **"bilinmeyen aksiyon tipi → red"**
16. (automationRulesSchema) **"maneuver/operation aksiyonları: name zorunlu, params opsiyonel (KURAL-MOTORU-V2)"**
17. (automationRulesSchema) **"container-command aksiyonu: containerId + deviceId + command zorunlu"**
18. (automationRulesSchema) **"command aksiyonu command adı zorunlu, params opsiyonel"**
19. (automationRulesSchema) **"log aksiyonu level enum zorunlu, eventCode/message opsiyonel"**
20. (automationRulesSchema) **"notify aksiyonu boş obje olarak kabul eder"**
21. (automationRulesSchema) **"cooldownMs negatif → red"**
22. (automationRulesSchema) **"debounceMs negatif → red"**
23. (automationRulesSchema) **"bilinmeyen üst seviye anahtar → red (strict)"**
24. (automationRulesSchema) **"bilinmeyen koşul anahtarı → red (strict)"**
25. (automationRulesSchema) **"rules boş dizi → red"**
26. (automationRulesSchema) **"çıktı tipi sözleşmeyi taşır (derleme kontratı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/commands/maneuver-record.test.ts` (23 test)

1. (commandStepSchema (REV.02 §5.1)) **"deviceId'li adım kabul edilir"**
2. (commandStepSchema (REV.02 §5.1)) **"deviceIds / deviceTypes seçicileri kabul edilir"**
3. (commandStepSchema (REV.02 §5.1)) **"ham telemetries adımı (komutsuz) kabul edilir"**
4. (commandStepSchema (REV.02 §5.1)) **"hiçbir hedef seçici YOK → RED (tam biri zorunlu)"**
5. (commandStepSchema (REV.02 §5.1)) **"iki seçici birden → RED (tam biri zorunlu)"**
6. (commandStepSchema (REV.02 §5.1)) **"command ve telemetries İKİSİ DE yok → RED"**
7. (commandStepSchema (REV.02 §5.1)) **"timer (REV.03 §10): durationMs pozitif + opsiyonel stopCommand"**
8. (commandStepSchema (REV.02 §5.1)) **"bilinmeyen anahtar RED (strict)"**
9. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"geçerli kayıt kabul edilir (ui meta dahil)"**
10. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"steps boş → RED"**
11. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"onFailure 'rollback' + rollbackSteps YOK → RED (§7.1 fail-fast)"**
12. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"rollbackSteps VARSA onFailure rollback kabul edilir"**
13. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1)) **"bilinmeyen üst seviye anahtar RED (strict)"**
14. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"uzak adım (system + maneuver) kabul edilir"**
15. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"yerel manevra adımı kabul edilir"**
16. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"yerel ham komut zinciri adımı kabul edilir"**
17. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"system'i OLMAYAN manevra adımı ile boş nesne RED"**
18. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"geçerli operasyon: field_charge deseni (§6.1)"**
19. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6)) **"onFailure 'rollback' + üst seviye rollback YOK → RED"**
20. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"maneuvers.json kök şeması: maneuvers min 1; bilinmeyen anahtar RED"**
21. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"loadManeuversFile: bozuk JSON → throw"**
22. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"loadManeuversFile: şema ihlali → throw (fail-fast)"**
23. (commandStepSchema (REV.02 §5.1) > maneuverRecordSchema (§5 + §7.1) > operationStepSchema / operationRecordSchema (§6) > dosya kökleri + fail-fast yükleyiciler) **"loadOperationsFile: geçerli dosya parse edilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/commands/validate-expect.test.ts` (9 test)

1. (isRelationExpect) **"ilişki sözcüklerini tanır"**
2. (isRelationExpect) **"diğer string/sayı/boolean değerleri tanımaz"**
3. (isRelationExpect > expectHolds) **"negative: yalnızca negatif sayılar tutar"**
4. (isRelationExpect > expectHolds) **"positive: yalnızca pozitif sayılar tutar"**
5. (isRelationExpect > expectHolds) **"zero: yalnızca 0 tutar"**
6. (isRelationExpect > expectHolds) **"nonzero: 0 dışı sayılar tutar"**
7. (isRelationExpect > expectHolds) **"birebir eşitlik değişmez (sayı/string/boolean)"**
8. (isRelationExpect > expectHolds) **"BOOLEAN register sayısal çözümü: 0/1 ↔ true/false eşleşir"**
9. (isRelationExpect > expectHolds > expectHolds — accept listesi (benign ack, R2)) **"accept listesindeki değer TRUE; liste dışı FALSE"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/alarm.test.ts` (8 test)

1. (device alarm kuralı şeması) **"alarms bölümünü kabul eder"**
2. (device alarm kuralı şeması) **"geçersiz severity reddedilir"**
3. (device alarm kuralı şeması) **"telemetry boş olamaz"**
4. (device alarm kuralı şeması) **"activeLow opsiyoneldir (varsayılan false)"**
5. (device alarm kuralı şeması) **"alarms yoksa config yine geçerli (geriye uyumlu)"**
6. (device alarm kuralı şeması > bitfield alarmLimit/logType temizliği) **"alarmLimit artık şemada yok — strip edilir"**
7. (device alarm kuralı şeması > bitfield alarmLimit/logType temizliği) **"logType artık şemada yok — strip edilir"**
8. (device alarm kuralı şeması > bitfield alarmLimit/logType temizliği) **"çıktı tipi alarmLimit/logType taşımaz (derleme kontratı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/device-config.test.ts` (31 test)

1. (bitfieldFieldSchema) **"accepts valid input"**
2. (bitfieldFieldSchema) **"rejects bitStart > bitEnd"**
3. (bitfieldFieldSchema) **"rejects bitStart > 15"**
4. (bitfieldFieldSchema) **"rejects empty name"**
5. (bitfieldFieldSchema) **"accepts optional fields omitted"**
6. (bitfieldFieldSchema) **"accepts with all optional fields"**
7. (bitfieldFieldSchema) **"logType artık şemada yok (T0.11) — bilinmeyen anahtar strip edilir"**
8. (bitfieldFieldSchema > bitfieldConfigSchema) **"accepts valid config"**
9. (bitfieldFieldSchema > bitfieldConfigSchema) **"rejects empty fields array"**
10. (bitfieldFieldSchema > bitfieldConfigSchema) **"rejects invalid registerType"**
11. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts valid device config without optional fields"**
12. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts config with optional fields"**
13. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects empty deviceId"**
14. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects empty telemetry array"**
15. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects invalid protocol"**
16. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"rejects invalid transport kind"**
17. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts simulator transport (tip açık string — kayıt defteri çalışma zamanında doğrular)"**
18. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema) **"accepts tcp and rtu transport kinds"**
19. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01)) **"accepts and preserves opaque details"**
20. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01)) **"top-level rackCount artık şemada yok — strip edilir"**
21. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01)) **"details opsiyoneldir"**
22. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"deadband (pozitif) + maxStaleMs kabul edilir"**
23. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"deadband: 0 reddedilir (pozitif zorunlu)"**
24. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"negatif deadband reddedilir"**
25. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"deadband tanımlı ama maxStaleMs yok → fail-fast"**
26. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"maxStaleMs tek başına kabul edilir (deadband yok — no-op)"**
27. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **""auto" integer register türünde kabul edilir"**
28. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **""auto" FLOAT32 türünde reddedilir"**
29. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **""auto" MQTT protokolünde reddedilir"**
30. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"politika alanları yoksa kabul edilir (always-write)"**
31. (bitfieldFieldSchema > bitfieldConfigSchema > deviceConfigFileSchema > deviceConfigFileSchema — details (REV.01) > deviceConfigFileSchema — yazma politikası (deadband/maxStaleMs)) **"aynı name iki kez → fail-fast"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/server-config.test.ts` (11 test)

1. (authConfigSchema) **"accepts valid config"**
2. (authConfigSchema) **"rejects short jwtSecret (< 16 chars)"**
3. (authConfigSchema) **"rejects zero accessTokenExpirySeconds"**
4. (authConfigSchema) **"rejects negative refreshTokenExpirySeconds"**
5. (authConfigSchema) **"rejects non-integer expiry"**
6. (authConfigSchema) **"accepts exactly 16 char jwtSecret"**
7. (authConfigSchema > serverConfigSchema) **"accepts valid config"**
8. (authConfigSchema > serverConfigSchema) **"rejects empty host"**
9. (authConfigSchema > serverConfigSchema) **"rejects port 0"**
10. (authConfigSchema > serverConfigSchema) **"rejects port > 65535"**
11. (authConfigSchema > serverConfigSchema) **"rejects negative port"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/service-config.test.ts` (15 test)

1. (redisConfigSchema) **"accepts minimal config"**
2. (redisConfigSchema) **"accepts full config"**
3. (redisConfigSchema) **"rejects empty host"**
4. (redisConfigSchema) **"rejects port 0"**
5. (redisConfigSchema) **"rejects port > 65535"**
6. (redisConfigSchema) **"rejects negative db index"**
7. (redisConfigSchema > postgresConfigSchema) **"accepts valid config"**
8. (redisConfigSchema > postgresConfigSchema) **"accepts with optional ssl and maxConnections"**
9. (redisConfigSchema > postgresConfigSchema) **"rejects empty database"**
10. (redisConfigSchema > postgresConfigSchema) **"rejects empty password"**
11. (redisConfigSchema > postgresConfigSchema) **"rejects zero maxConnections"**
12. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"accepts minimal config"**
13. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"accepts full config with optional sections"**
14. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"rejects missing redis"**
15. (redisConfigSchema > postgresConfigSchema > serviceConfigFileSchema) **"rejects invalid redis config"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-types/src/schemas/validate.test.ts` (4 test)

1. (validateOrThrow) **"returns parsed data on valid input"**
2. (validateOrThrow) **"throws with label in error message on invalid input"**
3. (validateOrThrow) **"throws with detailed Zod validation errors"**
4. (validateOrThrow) **"handles nested schema errors"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-utils/src/config/definitions.test.ts` (8 test)

1. (log config definitions (T0.5/T0.6)) **"logLevel varsayılanı info'dur"**
2. (log config definitions (T0.5/T0.6)) **"logLevel env ile okunur"**
3. (log config definitions (T0.5/T0.6)) **"logLevel geçersiz değerde fırlatır"**
4. (log config definitions (T0.5/T0.6)) **"logSigningKeyPath varsayılanı doludur"**
5. (log config definitions (T0.5/T0.6)) **"logFilePath varsayılanı undefined — tier varsayılanına düşer"**
6. (log config definitions (T0.5/T0.6)) **"serviceTier geçersiz değerde fırlatır"**
7. (log config definitions (T0.5/T0.6)) **"tüm tanımlar benzersiz anahtara sahiptir"**
8. (log config definitions (T0.5/T0.6)) **"bmsTarget tanımları: varsayılan undefined; env ile okunur; port sayıya dönüşür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-utils/src/config/device-config-drift.test.ts` (7 test)

1. (compareDeviceConfig) **"özdeş config → issue yok"**
2. (compareDeviceConfig) **"kopyada eksik telemetri → error (missing)"**
3. (compareDeviceConfig) **"kopyada fazla telemetri → allowlist'siz error (extra)"**
4. (compareDeviceConfig) **"allowlist'li fazla telemetri → warn (izinli demo eki)"**
5. (compareDeviceConfig) **"bitfield eksik/extra yakalanır (isim bazlı)"**
6. (compareDeviceConfig) **"aynı isim çoklu bitfield (rack) → multiset eşleşir"**
7. (compareDeviceConfig) **"connection/deviceId/name farkı sapma SAYILMAZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/shared-utils/src/config/loader.test.ts` (10 test)

1. (ConfigLoader (T3)) **"kaynak önceliği: ObjectSource EnvSource'u ezer"**
2. (ConfigLoader (T3)) **"kaynak yoksa default değer kullanılır"**
3. (ConfigLoader (T3)) **"EnvSource sayısal değerleri number'a çevirir"**
4. (ConfigLoader (T3)) **"validate hatası load()'da anahtar bağlamıyla fırlar"**
5. (ConfigLoader (T3)) **"get bilinmeyen anahtarda fırlar"**
6. (ConfigLoader (T3)) **"birim normalizasyonu: duration-ms ve bytes"**
7. (ConfigLoader (T3)) **"geçersiz duration-ms fırlatır"**
8. (ConfigLoader (T3)) **"redacted: secret tanımlar maskelenir, diğerleri görünür"**
9. (ConfigLoader (T3)) **"reload: değişen değer onChange'e bildirilir"**
10. (ConfigLoader (T3)) **"health: erişilebilir kaynaklar healthy döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/connector.test.ts` (30 test)

1. (parseBscPcsMapping) **"geçerli dosyayı parse eder (üç kind)"**
2. (parseBscPcsMapping) **"bilinmeyen kind → throw"**
3. (parseBscPcsMapping) **"register mapping'de from/ratio eksik → throw"**
4. (parseBscPcsMapping) **"bit mapping'de from.bit eksik → throw"**
5. (parseBscPcsMapping) **"BMS bloğu dışı to → throw"**
6. (parseBscPcsMapping) **"bilinmeyen anahtar → throw (strict)"**
7. (parseBscPcsMapping) **"boş mappings → throw"**
8. (parseBscPcsMapping > BscPcsConnectorAdapter) **"tick: register dönüşümleri yazılır (ratio/offset, yuvarlama; bitişik koşular)"**
9. (parseBscPcsMapping > BscPcsConnectorAdapter) **"M12: birincil 0 ise fallback adresine düşer (DC bus 30059→30057)"**
10. (parseBscPcsMapping > BscPcsConnectorAdapter) **"M12: birincil doluysa fallback KULLANILMAZ"**
11. (parseBscPcsMapping > BscPcsConnectorAdapter) **"C8: computed mapping — akım limiti = güç limiti ÷ DC gerilim"**
12. (parseBscPcsMapping > BscPcsConnectorAdapter) **"C8: computed payda 0 ise yedek adrese düşer"**
13. (parseBscPcsMapping > BscPcsConnectorAdapter) **"C8: computed denominator eksik → parse throw"**
14. (parseBscPcsMapping > BscPcsConnectorAdapter) **"PCS14: BSC kaynağı tamamen okunamazsa lossBit set edilir"**
15. (parseBscPcsMapping > BscPcsConnectorAdapter) **"PCS14: sağlıklı kaynakta lossBit 0'a temizlenir"**
16. (parseBscPcsMapping > BscPcsConnectorAdapter) **"PCS15: socEnergy discharge = SOC×rated (0.1 kWh)"**
17. (parseBscPcsMapping > BscPcsConnectorAdapter) **"PCS15: socEnergy charge = (1−SOC)×rated"**
18. (parseBscPcsMapping > BscPcsConnectorAdapter) **"PCS15: socEnergy mode geçersiz → parse throw"**
19. (parseBscPcsMapping > BscPcsConnectorAdapter) **"değişmeyen değerler ikinci tick'te yazılmaz"**
20. (parseBscPcsMapping > BscPcsConnectorAdapter) **"kaynak değişince intervalMs sonrası yeniden yazılır"**
21. (parseBscPcsMapping > BscPcsConnectorAdapter) **"kaynak hatası kademeli — diğer eşleşmeler devam eder"**
22. (parseBscPcsMapping > BscPcsConnectorAdapter) **"yazım hatası → link 0 + fail sayacı; sonraki tick yeniden bağlanır"**
23. (parseBscPcsMapping > BscPcsConnectorAdapter) **"kaynak yoksa yazım yapılmaz ve kaynak durumu 2 olur"**
24. (parseBscPcsMapping > BscPcsConnectorAdapter) **"bit eşlemesi hedef kelimenin diğer bitlerini bozmaz"**
25. (parseBscPcsMapping > BscPcsConnectorAdapter) **"yazma girişimi yok sayılır"**
26. (parseBscPcsMapping > BscPcsConnectorAdapter > BscPcsConnectorAdapter — ters kanal (PCS→BSC)) **"toplam güç BSC girdisine yazılır; kaynak durumu 0"**
27. (parseBscPcsMapping > BscPcsConnectorAdapter > BscPcsConnectorAdapter — ters kanal (PCS→BSC)) **"kısmi erişim → durum 1"**
28. (parseBscPcsMapping > BscPcsConnectorAdapter > BscPcsConnectorAdapter — ters kanal (PCS→BSC)) **"hiç erişim → durum 2, güç 0"**
29. (parseBscPcsMapping > BscPcsConnectorAdapter > BscPcsConnectorAdapter — ters kanal (PCS→BSC)) **"powerLink yoksa güç girdisi çağrılmaz (geriye uyum)"**
30. (parseBscPcsMapping > BscPcsConnectorAdapter > BscPcsConnectorAdapter — ters kanal (PCS→BSC) > BscPcsConnectorAdapter — powerScale) **"okunan toplam güç scale ile çarpılıp BSC'ye yazılır (demo 2 PCS → 9 grup)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/pcs-power-reader.test.ts` (3 test)

1. (TcpPcsPowerReader) **"PCS S16 gücünü işaretli okur (negatif = şarj)"**
2. (TcpPcsPowerReader) **"birden fazla PCS toplanır"**
3. (TcpPcsPowerReader) **"erişilemeyen PCS katkı 0; available kısmi"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/source-reader.test.ts` (4 test)

1. (TcpSourceReader) **"tek register'ı TCP'den okur"**
2. (TcpSourceReader) **"size>1 kelimeleri big-endian birleştirir"**
3. (TcpSourceReader) **"bilinmeyen deviceId → throw"**
4. (TcpSourceReader) **"combineWords signed işaretleme"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc-pcs-connector/tcp-target.test.ts` (4 test)

1. (TcpBmsTarget) **"BMS-yüzü bridge'e FC 0x10 yazar; simülatör deposu güncellenir"**
2. (TcpBmsTarget) **"sunucu kapalıyken connect throw eder"**
3. (TcpBmsTarget) **"close sonrası yeniden connect + yazım çalışır (retry deseni)"**
4. (TcpBmsTarget) **"BMS bloğu dışına yazım → Modbus exception throw"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/bsc/bsc-simulator.test.ts` (27 test)

1. (BSCSimulator (T4)) **"otomatik init: 6 tick sonrası NORMAL duruma geçer"**
2. (BSCSimulator (T4)) **"START komutu → charge status bitleri (BSC_INFO 30037)"**
3. (BSCSimulator (T4)) **"START + demo deşarj setpoint → discharge status bitleri (BSC_INFO 30037)"**
4. (BSCSimulator (T4)) **"SIM-1: komut kutusu (40010) 0'a yazılsa da yürütme latch'lenir (şarj sürer)"**
5. (BSCSimulator (T4)) **"C1: akım akarken STOP 'Current Flows' (0x000A) ile reddedilir; şarj sürer"**
6. (BSCSimulator (T4)) **"C1: setpoint sıfırlanınca STOP kabul edilir (DONE)"**
7. (BSCSimulator (T4)) **"C2: akım akarken OPEN_ALL reddedilir; EMERGENCY kabul edilir (en yüksek öncelik)"**
8. (BSCSimulator (T4)) **"EMERGENCY komutu durumu EMERGENCY'ye geçirir"**
9. (BSCSimulator (T4)) **"EMERGENCY sonrası offline rack'ler SOC 0 + STATE 0 gösterir (bayat değer yok)"**
10. (BSCSimulator (T4)) **"deşarj SOC'yi %0'ın altına düşüremez (rack SOC uint16, scale 0.01)"**
11. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5)) **"şarjda SOC %97'yi aşamaz (clamp)"**
12. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5)) **"deşarjda SOC %3,5'in altına inemez (clamp)"**
13. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Start Normal'de → BMS Already Connected (0x06)"**
14. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Initializing'de komut → Under Initializing (0x07)"**
15. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Emergency'den yalnız Stop çıkar → Not Initialized"**
16. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Event Clear 30 s cooldown → ikinci kez Within Cooldown (0x12)"**
17. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Open All zaten açık → Contactors Already Open (0x08)"**
18. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Close zaten online → BSC Already Online (0x09)"**
19. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis)) **"Reset akım akarken → Current Flows (0x0A)"**
20. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md)) **"17 pack / 2 BMIC / 4 sıcaklık / 24 hücre / 210 A relay"**
21. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20)) **"simSpeedMultiplier SOC entegrasyonunu ölçekler; tick ritmi değişmez"**
22. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20) > BSCSimulator — Rev AF 0x000B) **"0x000B (removed) reddedilir: Ack = Invalid Request"**
23. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20) > BSCSimulator — Rev AF 0x000B > BSCSimulator dış güç girdisi (PCS-BSC-GUC-LINKI UC-1)) **"AK-1.2: 1 saat 500 kW şarj → ΔSOC = P·h·η / kapasite (η=0.975)"**
24. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20) > BSCSimulator — Rev AF 0x000B > BSCSimulator dış güç girdisi (PCS-BSC-GUC-LINKI UC-1)) **"deşarjda η bölen olarak uygulanır (P·h/η)"**
25. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20) > BSCSimulator — Rev AF 0x000B > BSCSimulator dış güç girdisi (PCS-BSC-GUC-LINKI UC-1)) **"AK-1.4: sonlu olmayan girdi 0 kabul edilir (SOC değişmez)"**
26. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20) > BSCSimulator — Rev AF 0x000B > BSCSimulator dış güç girdisi (PCS-BSC-GUC-LINKI UC-1)) **"AK-1.3: SOC %97'de şarj limiti 0 → SOC artmaz"**
27. (BSCSimulator (T4) > BSCSimulator SOC limitleri (97 / 3,5) > BSCSimulator — request-ack tablosu (Sequence/Diagnosis) > BSCSimulator — rack nameplate değerleri (hardware.md) > BSCSimulator — demo hız çarpanı (K-20) > BSCSimulator — Rev AF 0x000B > BSCSimulator dış güç girdisi (PCS-BSC-GUC-LINKI UC-1) > BSCSimulator — soc enjeksiyonu (test determinizmi)) **"soc:<yüzde> tüm rack SOC'sini ayarlar; geçersiz değer false"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/cb/cb.test.ts` (9 test)

1. (CbSimulator (DC Şalter — K2) > başlangıç durumu) **"kapalı başlar: Is Closed = true, Is Open = false"**
2. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"OPEN coil → şalter açılır (Is Open = true)"**
3. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"CLOSE coil → şalter kapanır (Is Closed = true)"**
4. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"writeCoil false değerini yok sayar"**
5. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları)) **"açıkken aç, kapalıyken kapat — konum değişmez (idempotent)"**
6. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"input register okumaları 0 döner (trip/akım/sıcaklık YOK)"**
7. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"holding register okumaları 0 döner (eşikler YOK)"**
8. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"RESET coil'i yok sayılır (trip semantiği kalktı)"**
9. (CbSimulator (DC Şalter — K2) > başlangıç durumu > aç/kapat (coil komutları) > kaldırılan semantik (K2)) **"bilinmeyen discrete input false döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/contracts.test.ts` (3 test)

1. (ISimulator sözleşmesi) **"tüm simülatörler deviceId + start/stop sağlar"**
2. (ISimulator sözleşmesi) **"inject desteklemeyen simülatörde tanımsızdır"**
3. (ISimulator sözleşmesi) **"boş deviceId fail-fast"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/control-panel-io/control-panel-io.test.ts` (13 test)

1. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state) **"kapılar kapalı, ışıklar sönük başlar"**
2. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state) **"FSS sağlıklı başlar: System OK=true, Fault/Discharged/2nd=false"**
3. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API)) **"setDoorState batarya kapısını açar"**
4. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API)) **"setDoorState panel kapısını açar"**
5. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write)) **"battery light AÇ → coil true, read-back yansır"**
6. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write)) **"battery light KAPAT → coil false"**
7. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write)) **"panel light bağımsız yönetilir"**
8. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState fault → Fault=true, System OK=false"**
9. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState discharged → Discharged=true, System OK=false"**
10. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState secondStage → 2nd Stage=true"**
11. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI)) **"setFssState temizlenince System OK geri döner"**
12. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI) > okuma sınırları) **"bilinmeyen DI adresi false döner"**
13. (ControlPanelIoSimulator (FL-07 kapı + ışık + FSS DI — K5) > initial state > kapı state (demo senaryo API) > ışık komutları (COIL write) > FSS kuru kontakları (K5 — EP203 → IO DI) > okuma sınırları) **"bilinmeyen coil adresi yazılmaz"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/dc-meter/dc-meter.test.ts` (13 test)

1. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"DC Voltage 750.0 V — FLOAT32 BE kelime çifti"**
2. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"DC Current 100.0 A — FLOAT32 BE kelime çifti"**
3. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"DC Power 75.0 kW — FLOAT32 BE kelime çifti"**
4. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal)) **"Alarm Word 0 (normal çalışma)"**
5. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"setMeasurements voltage 1600 → eşik üstü değer okunur"**
6. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"yalnızca verilen alanlar değişir — diğerleri nominal kalır"**
7. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"current/power ayrı ayrı enjekte edilebilir (1680 A / 1784 kW senaryoları)"**
8. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu)) **"alarm word ham değer olarak enjekte edilebilir"**
9. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları) **"bilinmeyen adres 0 döner"**
10. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"readInputRegisters ardışık kelimeler döner (float çifti)"**
11. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"FC03 holding okuma veriyi döner (doküman §7.3.3 — 03H okuma)"**
12. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"holding yazımı yok sayılır — komut YOKTUR"**
13. (DcMeterSimulator (FL-08 DC kısa devre koruması) > başlangıç durumu (nominal) > ölçüm enjeksiyonu (FL-08 eşik senaryosu) > okuma sınırları > DcMeterAdapter (salt okuma sözleşmesi)) **"coil/discrete okumaları boş — I/O YOKTUR"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/dc-output/dc-output.test.ts` (10 test)

1. (DcOutputSimulator > initial state) **"has default voltage and discrete inputs"**
2. (DcOutputSimulator > initial state > on/off via coils) **"handles coil toggling"**
3. (DcOutputSimulator > initial state > on/off via coils) **"on/off cycle works"**
4. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift) **"voltage drifts toward setpoint when on"**
5. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift) **"voltage decays when off"**
6. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault) **"triggers fault when voltage exceeds ovThreshold * 10"**
7. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter) **"accumulates energy when output is on"**
8. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter > temperature) **"drifts toward target when on"**
9. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter > temperature > setpoints via holding registers) **"reads back written setpoints"**
10. (DcOutputSimulator > initial state > on/off via coils > voltage and current drift > overvoltage fault > energy counter > temperature > setpoints via holding registers) **"can change setpoints at runtime"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/demo-mv-station/demo-mv-simulator.test.ts` (6 test)

1. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"başlangıç: kesiciler kapalı, topraklar açık (AK-9.1)"**
2. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"kesici kapalıyken toprak kapanmaz (AK-9.2)"**
3. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"kesici açıkken toprak kapanır, sonra kesici kapanmaz"**
4. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"H01 toprak ayırıcısı her zaman kilitli"**
5. (DemoMvStationSimulator (SPEC UC-9 / T-38)) **"toprak açma serbest"**
6. (DemoMvStationSimulator (SPEC UC-9 / T-38) > DemoMvStationSimulator — GridLink yayını (SEBEKE-YOLU-ESLESMESI UC-1)) **"AK-1.2: şalter değişimi bus'a yayınlanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/fss/fss-simulator.test.ts` (8 test)

1. (FssSimulator (UC-10)) **"AK-10.1: başlangıç sağlıklı panel"**
2. (FssSimulator (UC-10)) **"AK-10.1: 1 zone → first stage + countdown; 2 zone → second stage"**
3. (FssSimulator (UC-10)) **"AK-10.1: countdown dolar → released (EEE)"**
4. (FssSimulator (UC-10)) **"manual mode → otomatik release YOK"**
5. (FssSimulator (UC-10)) **"gaz alarmı → tahliye + havalandırma açılır"**
6. (FssSimulator (UC-10)) **"reset → sağlıklıya döner; bilinmeyen adres 0/false"**
7. (FssSimulator (UC-10)) **"zone state'i fire/normal arasında geçer"**
8. (FssSimulator (UC-10)) **"disablement register'ları ayarlanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/grid-link/bus.test.ts` (3 test)

1. (GridLinkBus) **"AK-1.1: kapalı hücrelerde fider enerjilidir"**
2. (GridLinkBus) **"H01 veya H02 açıkken fider enerjisizdir (zincir)"**
3. (GridLinkBus) **"fiderler birbirinden bağımsızdır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/grid-link/pcs-deenergized.test.ts` (3 test)

1. (WattoxPcsSimulator — şebeke yolu) **"AK-2.1/2.2: kesici açılınca standby + güç 0 + Vac 0"**
2. (WattoxPcsSimulator — şebeke yolu) **"AK-2.3: yeniden enerjide güç otomatik uygulanmaz"**
3. (WattoxPcsSimulator — şebeke yolu) **"de-enerjiliyken setpoint yazımı çıkış üretmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/host-connector-target.test.ts` (3 test)

1. (resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)) **"env hedefi uygulanır (mevcut davranış)"**
2. (resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)) **"connector.sim.target env'i EZER (per-connector port)"**
3. (resolveBscPcsTarget (SPEC T-36 / AK-8.3/8.4)) **"ikisi de tanımsızsa dosya hedefi korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/host.test.ts` (8 test)

1. (SimulatorHost — UC-3) **"AK-3.1 — yalnız simulator config'ler için sunucu açar; TCP okunur"**
2. (SimulatorHost — UC-3) **"AK-3.2 — deviceId→port indeksi kurulur"**
3. (SimulatorHost — UC-3) **"edge — bilinmeyen simülatör tipi fail-fast"**
4. (SimulatorHost — UC-3) **"edge — port çakışması fail-fast (kısmen açılanlar kapanır)"**
5. (SimulatorHost — UC-3) **"edge — stopAll idempotent"**
6. (SimulatorHost — UC-3) **"AK-10.3 — fss builder kaydedilir, diğer builder'lar etkilenmez"**
7. (SimulatorHost — UC-3 > SimulatorHost — şebeke yolu eşleşmesi (SEBEKE-YOLU-ESLESMESI UC-3)) **"AK-3.3: fider kesici açılınca bağlı PCS de-enerjili olur"**
8. (SimulatorHost — UC-3 > SimulatorHost — şebeke yolu eşleşmesi (SEBEKE-YOLU-ESLESMESI UC-3) > SimulatorHost — istasyon başına 1 MV (2 fider)) **"her MV kendi bus'ına yayınlar; fider kesicisi yalnız bağlı PCS'i düşürür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/hvac/hvac.test.ts` (15 test)

1. (HvacSimulator > initial state) **"starts in standby"**
2. (HvacSimulator > initial state) **"has default temperature"**
3. (HvacSimulator > initial state > remote on/off) **"turns on when remoteOn is set"**
4. (HvacSimulator > initial state > remote on/off) **"turns off when remoteOn is cleared"**
5. (HvacSimulator > initial state > remote on/off > cooling mode) **"cools when temperature is above coolingSetpoint + deadband"**
6. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode) **"produces heat when remote is on with high setpoint"**
7. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms) **"has alarm registers that are readable"**
8. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset) **"resets alarm state"**
9. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift) **"changes temperature over time when running"**
10. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds) **"reports fan speeds when running"**
11. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds) **"reports fan speed values"**
12. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds > Monitor Temp Mode (0x09)) **"yazılabilir ve okunur — mode-4 server-temp bağımlılığı kaldırılır (H30)"**
13. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds > Monitor Temp Mode (0x09) > HvacSimulatorAdapter — FC03 holding okuma (doküman)) **"bilgi (0x1000) ve alarm (0x300) blokları holding ile okunur"**
14. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds > Monitor Temp Mode (0x09) > HvacSimulatorAdapter — FC03 holding okuma (doküman) > HvacSimulator — Faz 1 ekleri (compressor action / server RH)) **"server humidity (0x2003) yaz/oku"**
15. (HvacSimulator > initial state > remote on/off > cooling mode > heating mode > alarms > reset > temperature drift > fan speeds > Monitor Temp Mode (0x09) > HvacSimulatorAdapter — FC03 holding okuma (doküman) > HvacSimulator — Faz 1 ekleri (compressor action / server RH)) **"kompresör çalıştırma sayacı 0→çalışma geçişinde artar (0x1028)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/imd/imd.test.ts` (14 test)

1. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"izolasyon direnci ~1 MΩ (Ω cinsinden UInt32 BE)"**
2. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"Insulation Alarm 0 (OK)"**
3. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"Insulation Prewarning 0 (OK)"**
4. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı)) **"Device Error 0 (hata yok)"**
5. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu)) **"setFault(true) → Alarm 4 (Warning), direnç eşik altına düşer"**
6. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu)) **"setFault(true) → Prewarning 4 (Warning)"**
7. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu)) **"setFault(false) → Alarm 0'a döner, direnç sağlıklı seviyeye"**
8. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error)) **"setDeviceError(1) → Device Error register'ı kod taşır"**
9. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error)) **"setDeviceError(0) → temizlenir"**
10. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error) > okuma sınırları) **"bilinmeyen adres 0 döner"**
11. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error) > okuma sınırları > ImdAdapter — FC03 holding okuma (doküman D00007)) **"readHoldingRegisters ölçüm değerini döner (FC03 zorunlu)"**
12. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error) > okuma sınırları > ImdAdapter — FC03 holding okuma (doküman D00007) > ImdSimulator — LGES eşikleri (F2.6): 225 kΩ uyarı / 150 kΩ arıza) **"200 kΩ → yalnız Prewarning; Insulation Alarm 0"**
13. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error) > okuma sınırları > ImdAdapter — FC03 holding okuma (doküman D00007) > ImdSimulator — LGES eşikleri (F2.6): 225 kΩ uyarı / 150 kΩ arıza) **"100 kΩ (fault) → Insulation Alarm aktif"**
14. (ImdSimulator (FL-11 toprak direnci — gerçek map, K4) > başlangıç durumu (sağlıklı) > izolasyon arızası enjeksiyonu (FL-11 senaryosu) > cihaz hatası enjeksiyonu (Device Error) > okuma sınırları > ImdAdapter — FC03 holding okuma (doküman D00007) > ImdSimulator — LGES eşikleri (F2.6): 225 kΩ uyarı / 150 kΩ arıza) **"healthy → temiz (uyarı/arıza 0)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/injection.test.ts` (7 test)

1. (simülatör inject sözleşmesi) **"IMD: fault/healthy/device_error uygular, bilinmeyeni reddeder"**
2. (simülatör inject sözleşmesi) **"ControlPanelIo: kapı senaryolarını uygular"**
3. (simülatör inject sözleşmesi) **"DcMeter: overcurrent ölçümü yazar"**
4. (simülatör inject sözleşmesi) **"HVAC: hot/nominal uygular"**
5. (simülatör inject sözleşmesi) **"BSC: overheat/diff_temp/fault/nominal uygular"**
6. (simülatör inject sözleşmesi) **"WattoxPcs: fault/door_open/nominal uygular"**
7. (simülatör inject sözleşmesi) **"EnergyAnalyzer: aux_loss/nominal uygular"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/physical/conformance/ems-read-path.test.ts` (4 test)

1. **"${t}: config'teki tüm telemetri hatasız okunur"**
2. (EMS'in okuduğu değerler model durumuyla tutarlı) **"BSC: SOC, online raf, DC gerilim, raf 2 durumu (adım 150)"**
3. (EMS'in okuduğu değerler model durumuyla tutarlı) **"PCS: işletme durumu, şebeke aktif güç, BMS bloğundan SOC"**
4. (EMS'in okuduğu değerler model durumuyla tutarlı) **"üstyazım EMS tarafından görülür (hold → ModbusDevice okur)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/physical/site/plant.test.ts` (19 test)

1. (Saha üretimi (site spec → cihazlar)) **"GD-1 şekli: 9 konteyner → 18 BSC, 18 PCS, 72 HVAC, benzersiz portlar"**
2. (Saha üretimi (site spec → cihazlar)) **"register listesi kök configs'ten gelir; yalnız deviceId/name/connection değişir"**
3. (Saha üretimi (site spec → cihazlar)) **"HVAC zon eşlemesi per-bus: bara başına 4 klima, her klima 2 raf"**
4. (Saha üretimi (site spec → cihazlar)) **"BSC→PCS eşleme dosyası her BSC için kendi deviceId'sine çevrilir"**
5. (Saha üretimi (site spec → cihazlar)) **"geçersiz spec reddedilir"**
6. (Saha üretimi (site spec → cihazlar) > Seçici) **"glob, type:, container:, deviceId"**
7. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH) **"Start → In Progress → Initializing → Done; raflar hazır olunca Normal; Close → 8 raf online"**
8. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH) **"Akım akarken Stop reddedilir (0x0A Current Flows)"**
9. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH) **"Initializing sırasında Stop kabul edilir → Not Initialized (geçiş #2)"**
10. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH) **"Emergency yalnız Stop/Reset ile çıkar; Start → 0x06 BMS Already Connected"**
11. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi) **"Deşarjda SOC düşer, DC güç PCS DC gücüyle tutarlı"**
12. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi) **"OG fider H04 açılınca PCS şebekeyi kaybeder ve fault'a düşer"**
13. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima) **"0 ile kapatma gerçek profilde reddedilir, 2 ile kapanır"**
14. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima > Register üstyazımı / toplu / seri) **"hold: EMS yanıtı değişir, model değişmez; release ile geri döner"**
15. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima > Register üstyazımı / toplu / seri) **"bitfield hold yalnız kendi bitini değiştirir"**
16. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima > Register üstyazımı / toplu / seri) **"write: EMS gibi yazılır, cihaz mantığı tepki verir (BSC Start)"**
17. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima > Register üstyazımı / toplu / seri) **"toplu: tüm klimaların soğutma setpoint'i tek işlemde"**
18. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima > Register üstyazımı / toplu / seri) **"süreli hold kendiliğinden kalkar"**
19. (Saha üretimi (site spec → cihazlar) > Seçici > BSC Rev AF + SW Manual RevAH > PCS ⇄ BSC enerji dengesi > MC90 klima > Register üstyazımı / toplu / seri) **"seri: doğrusal rampa ara değer üretir ve birden çok hedefe uygulanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/server/modbus-server-bridge.test.ts` (13 test)

1. (ModbusServerBridge — UC-1) **"AK-1.1 — FC 03/04/01/02 adapter'dan anlık değer döner"**
2. (ModbusServerBridge — UC-1) **"AK-1.1 — çoklu holding okuma sıralı değer döner"**
3. (ModbusServerBridge — UC-1) **"AK-1.2 — korunan holding aralığına yazım 0x02 döner, adapter'a GİTMEZ"**
4. (ModbusServerBridge — UC-1) **"AK-1.2 — korunmayan holding adresine yazım adapter'a gider"**
5. (ModbusServerBridge — UC-1) **"AK-1.2 — çoklu holding yazımı korunan aralıkla kesişirse reddedilir"**
6. (ModbusServerBridge — UC-1) **"AK-1.2 — coil koruması korunan coil adresine yazımı reddeder"**
7. (ModbusServerBridge — UC-1) **"AK-1.4 — readProtected dışı holding okuma 0x02, korunmayan adres okunur"**
8. (ModbusServerBridge — UC-1) **"AK-1.4 — readProtected ranges yoksa tüm holding tablosu korunur"**
9. (ModbusServerBridge — UC-1) **"AK-1.4 — readProtected coil tablosunda da okumayı reddeder"**
10. (ModbusServerBridge — UC-1) **"AK-1.3 — adapter hatası (aralık dışı) exception döner, server ayakta kalır"**
11. (ModbusServerBridge — UC-1) **"yazma — tek register/çoklu register/coil adapter'a iletilir (FC 06/10/05/0F)"**
12. (ModbusServerBridge — UC-1) **"edge — port doğrulaması: port<=0 throw eder"**
13. (ModbusServerBridge — UC-1) **"edge — stop() idempotent; start/stop/start yeniden açılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/server/simulator-server.test.ts` (3 test)

1. (SimulatorServer — UC-2 self-host) **"AK-2.1 — network config ile start() sonrası TCP'den okuma"**
2. (SimulatorServer — UC-2 self-host) **"AK-2.2 — stop idempotent; start sonrası yeniden açılır"**
3. (SimulatorServer — UC-2 self-host) **"network yoksa start() no-op'tur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/wattox-pcs/bms-face.test.ts` (5 test)

1. (Wattox BMS yüzü (ModbusServerBridge)) **"BMS bloğu FC 03 okuması anlık değeri döner"**
2. (Wattox BMS yüzü (ModbusServerBridge)) **"BMS bloğu FC 06 yazımı simülatör deposuna uygulanır"**
3. (Wattox BMS yüzü (ModbusServerBridge)) **"BMS bloğu FC 10 çoklu yazım uygulanır"**
4. (Wattox BMS yüzü (ModbusServerBridge)) **"AK-2.3 — BMS bloğu DIŞI yazım 0x02 (767 ve 791)"**
5. (Wattox BMS yüzü (ModbusServerBridge)) **"AK-2.4 — BMS bloğu DIŞI okuma 0x02"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/simulators/src/wattox-pcs/wattox-pcs.test.ts` (19 test)

1. (WattoxPcsSimulator) **"ilk değerler: nominal (Stop, 50 Hz, anma güç, şebeke voltajı)"**
2. (WattoxPcsSimulator) **"start komutu: Stop → Standby; komut register'ı yazılanı tutar"**
3. (WattoxPcsSimulator) **"negatif setpoint → Charging; grid aktif güç birebir setpoint (şarj negatif)"**
4. (WattoxPcsSimulator) **"pozitif setpoint → Discharging"**
5. (WattoxPcsSimulator) **"sıfır setpoint → Standby (sıfır güç)"**
6. (WattoxPcsSimulator) **"stop komutu: Stop + setpoint sıfırlanır"**
7. (WattoxPcsSimulator) **"standby komutu: herhangi bir işletme durumundan Standby"**
8. (WattoxPcsSimulator) **"fault set → fault durumu + Fault; reset → temiz + Stop"**
9. (WattoxPcsSimulator) **"alarm word 3 bit9 (islanding) → alarm durumu 1"**
10. (WattoxPcsSimulator) **"fault word adresleri D01-D10 sıralı okunur"**
11. (WattoxPcsSimulator) **"E-stop bitleri: local/remote/BMS"**
12. (WattoxPcsSimulator) **"EMS yüzü BMS bloğunu değiştiremez (RO); setBmsRegister yazar"**
13. (WattoxPcsSimulator) **"BMS bloğu dışına setBmsRegister reddedilir (throw)"**
14. (WattoxPcsSimulator) **"komut kaynağı register'ı yazılabilir (EMS=1)"**
15. (WattoxPcsSimulator) **"tick: güç setpoint'e yakınsar (anında uygulama — tick kararlı kalır)"**
16. (WattoxPcsSimulator) **"BMS varsayılanları: SOC %50.0, pack voltaj 1500.0 V"**
17. (WattoxPcsSimulator) **"çoklu register okuma (FC 0x03 aralığı)"**
18. (WattoxPcsSimulator) **"FC03 holding okuma sorgu bloklarını döner (doküman FC03 zorunlu)"**
19. (WattoxPcsSimulator > WattoxPcsSimulator — PCS12 komut kaynağı (S01)) **"S01=0 (HMI) iken start/setpoint yok sayılır; S01=1 (EMS) sonrası uygulanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/colors/tokens.test.ts` (8 test)

1. (hexToNumber) **"converts hex string to number"**
2. (hexToNumber) **"handles alpha hex colors"**
3. (hexToNumber) **"handles white"**
4. (hexToNumber) **"handles black"**
5. (hexToNumber > COLORS tokens) **"all status tokens are valid hex"**
6. (hexToNumber > COLORS tokens) **"all background tokens are valid hex"**
7. (hexToNumber > COLORS tokens) **"all text tokens are valid hex"**
8. (hexToNumber > COLORS tokens) **"no two tokens share the same value for common groups"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/colors/tokensDark.test.ts` (3 test)

1. (dark tokens (referans paleti, K-2)) **"dark alarm + yüzey değerlerini taşır"**
2. (dark tokens (referans paleti, K-2)) **"light ile aynı anahtar kümesine sahiptir"**
3. (dark tokens (referans paleti, K-2)) **"tüm token'lar için sayısal karşılık üretilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/colors/tokensLight.test.ts` (4 test)

1. (light tokens (nova paleti)) **"alarm token'ı nova light değerini taşır"**
2. (light tokens (nova paleti)) **"tüm token'lar için sayısal karşılık üretilir"**
3. (light tokens (nova paleti) > hexToRgbTriple) **"hex'i CSS üçlüsüne çevirir"**
4. (light tokens (nova paleti) > hexToRgbTriple) **"geçersiz hex'te hata fırlatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/FieldCard/FieldCard.test.tsx` (3 test)

1. (FieldCard @ui) **"saha adını ve metrikleri gösterir"**
2. (FieldCard @ui) **"durum etiketini çevirir (online → Çevrimiçi)"**
3. (FieldCard @ui) **"tıklamada onClick çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/FieldMap/FieldMap.test.tsx` (7 test)

1. (FieldMap @ui) **"her saha için marker render eder"**
2. (FieldMap @ui) **"popup saha kartını gösterir (FieldCard deseni — ad/durum/değerler)"**
3. (FieldMap @ui) **"detay butonu onOpenDetail(fieldId) çağırır"**
4. (FieldMap @ui) **"onOpenDetail verilmezse detay butonu render edilmez (yalnız kart kalır)"**
5. (FieldMap @ui) **"boş olmayan saha listesinde fitBounds çağrılır"**
6. (FieldMap @ui) **"tip glifi status renkli daire üstüne işlenir (wind/hydro + renkler)"**
7. (FieldMap @ui) **"tip verilmezse general glifi kullanılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/LogTerminal/LogTerminal.test.tsx` (5 test)

1. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"alarm satırında kutucuk render edilir"**
2. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"resolved=false kutucuk boş ve tıklanınca resolveAlarm çağrılır"**
3. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"resolved=true kutucuk işaretli + disabled + çözen gösterilir"**
4. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"resolveAlarm yoksa kutucuk disabled (saf UI kullanımı)"**
5. (LogTerminal alarm kutucuğu (Faz 0 eki)) **"alarm'sız satırda kutucuk YOKTUR"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/RackCard/RackCard.test.tsx` (5 test)

1. (RackCard (T4)) **"temel metrikleri gösterir (SoC/SoH/Güç/Voltaj)"**
2. (RackCard (T4)) **"SoC % değeri 0-100 arasına kırpılır"**
3. (RackCard (T4)) **"onDetailClick verilirse Detay butonu render edilir ve çağrılır"**
4. (RackCard (T4)) **"onDetailClick verilmezse buton render edilmez"**
5. (RackCard (T4)) **"offline durumda offline etiketi görünür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/components/Sparkline/Sparkline.test.tsx` (7 test)

1. (Sparkline @ui-chart) **"boş data'da uPlot kurulmaz"**
2. (Sparkline @ui-chart) **"veriyle uPlot kurulur ve sparkline opts'ları taşır"**
3. (Sparkline @ui-chart) **"fill fonksiyonu dikey CanvasGradient döner (üst 0.35 → alt 0.02)"**
4. (Sparkline @ui-chart) **"data değişince yeni instance kurulmaz — setData çağrılır"**
5. (Sparkline @ui-chart) **"girdi mutate edilmez ve veri zamana göre sıralanır"**
6. (Sparkline @ui-chart) **"geçersiz tarihli ve sayısal olmayan noktalar seriden atlanır"**
7. (Sparkline @ui-chart) **"unmount'ta destroy çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/core/TelemetryGauge/TelemetryGauge.test.tsx` (5 test)

1. (TelemetryGauge tema) **"circular: success temasında arc, success paletinin mid tonudur"**
2. (TelemetryGauge tema) **"circular: varsayılan tema info'dur (mevcut davranış)"**
3. (TelemetryGauge tema) **"circular: %80 ve üzeri koyu tonu kullanır"**
4. (TelemetryGauge tema) **"linear: varsayılan bar rengi tema mid tonudur"**
5. (TelemetryGauge tema) **"linear: açık color prop'u temayı ezer"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/core/TranslationProvider/TranslationProvider.test.tsx` (5 test)

1. (TranslationProvider (T4)) **"varsayılan dilde çeviri + interpolasyon"**
2. (TranslationProvider (T4)) **"eksik anahtar anahtarın kendisini döner (fallback)"**
3. (TranslationProvider (T4)) **"extraKeys uygulama anahtarları UI sözlüğünü override eder"**
4. (TranslationProvider (T4)) **"setLocale dili değiştirir"**
5. (TranslationProvider (T4)) **"Provider dışında useTranslation hata fırlatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/hooks/useTelemetryStream.test.ts` (4 test)

1. (useTelemetryStream — çok-abone) **"mount'ta addDevices + connect; unmount'ta removeDevices (disconnect DEĞİL)"**
2. (useTelemetryStream — çok-abone) **"observer verisi hook çıktısına yansır"**
3. (useTelemetryStream — çok-abone) **"abone OLUNMAYAN cihazın verisi buffer'a alınmaz (filtreleme)"**
4. (useTelemetryStream — çok-abone) **"names verilirse addDevices'e iletilir (sunucu filtresi)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/icons/demo-icons.test.tsx` (3 test)

1. (NOVA demo ikonları (T-32 / AK-7.2)) **"SCADA_ICONS'a nova* anahtarlarıyla kaydedilir"**
2. (NOVA demo ikonları (T-32 / AK-7.2)) **"tam 29 nova ikonu içerir"**
3. (NOVA demo ikonları (T-32 / AK-7.2)) **"mevcut Tabler ikonları korunur (Open-Closed)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/logging/client-logger.test.ts` (10 test)

1. (ClientLogger (T0.8)) **"batchSize dolunca tek send ile flush eder"**
2. (ClientLogger (T0.8)) **"interval geçince flush eder"**
3. (ClientLogger (T0.8)) **"send başarısızsa retry eder — aynı olaylar tekrar gönderilir"**
4. (ClientLogger (T0.8)) **"maxRetries aşılınca drop + sayaç"**
5. (ClientLogger (T0.8)) **"pending() bekleyen olay sayısını döner"**
6. (ClientLogger (T0.8)) **"close() kalan batch'i flush eder ve timer durur"**
7. (ClientLogger (T0.8)) **"boş transport kabul edilmez"**
8. (ClientLogger (T0.8) > installGlobalErrorHandlers (T0.8)) **"window.onerror olayını logger'a iletir"**
9. (ClientLogger (T0.8) > installGlobalErrorHandlers (T0.8)) **"unhandledrejection'ı logger'a iletir"**
10. (ClientLogger (T0.8) > installGlobalErrorHandlers (T0.8)) **"temizleme fonksiyonu listener'ları kaldırır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoAdminView.test.tsx` (5 test)

1. (DemoAdminView (UC-8)) **"5 sekme + mapping tablosu + canlı değer gösterir"**
2. (DemoAdminView (UC-8)) **"Containers sekmesi hub durum tablosunu gösterir (register formu YOK)"**
3. (DemoAdminView (UC-8)) **"Register catalogue araması + poll planları"**
4. (DemoAdminView (UC-8)) **"Modbus trace sekmesi gerçek yazma izi notunu gösterir"**
5. (DemoAdminView (UC-8)) **"gerçek yazma izi verilirse adresli satırları gösterir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoAssetTable.test.tsx` (3 test)

1. (DemoAssetTable (UC-11)) **"AK-11.6: proje satırlarını ve Portfolio toplamını gösterir"**
2. (DemoAssetTable (UC-11)) **"pozitif POI dışa aktarım (c-dis) sınıfı alır"**
3. (DemoAssetTable (UC-11)) **"toplam satırı bağlantı gücünü toplar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoManeuverWizard.test.tsx` (3 test)

1. (DemoManeuverWizard (FR-5.1/5.3/5.4)) **"hidden kaydı göstermez (AK-5.1)"**
2. (DemoManeuverWizard (FR-5.1/5.3/5.4)) **"onay akışıyla scope + params gönderir (AK-5.3/5.4)"**
3. (DemoManeuverWizard (FR-5.1/5.3/5.4)) **"kapsam temizlenince gönderim devre dışı (edge)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoOperationsView.test.tsx` (8 test)

1. (parseRunSteps / runLabel (UC-5 — sequences veri modeli)) **"steps.definition.steps dizisini okur ve run durumundan adım durumu türetir"**
2. (parseRunSteps / runLabel (UC-5 — sequences veri modeli)) **"legacy dizi şeklini de destekler"**
3. (parseRunSteps / runLabel (UC-5 — sequences veri modeli)) **"run adını FL etiketine çevirir"**
4. (parseRunSteps / runLabel (UC-5 — sequences veri modeli)) **"UC-13: 90 sn'den eski 'running' run bayat sayılır (zombie koruması)"**
5. (parseRunSteps / runLabel (UC-5 — sequences veri modeli) > DemoOperationsView render (UC-5)) **"sekansı FL etiketi + DONE + adım satırıyla gösterir"**
6. (parseRunSteps / runLabel (UC-5 — sequences veri modeli) > DemoOperationsView render (UC-5)) **"FL-02 formunda Control mode seg'i vardır (Active power / P-Q / PF)"**
7. (parseRunSteps / runLabel (UC-5 — sequences veri modeli) > DemoOperationsView render (UC-5)) **"MV Station başlığı aktif istasyon adını gösterir (station değişiminde değişir)"**
8. (parseRunSteps / runLabel (UC-5 — sequences veri modeli) > DemoOperationsView render (UC-5)) **"units mount'tan sonra gelirse varsayılan kapsam senkronlanır (Send etkin)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoPackSchematic.test.tsx` (3 test)

1. (DemoPackSchematic) **"4 × CMA 3P6S şeması + 72 hücre + FRONT bloğu render eder"**
2. (DemoPackSchematic) **"spec tablosu + not-in-map listesi + live kayıt bölümü"**
3. (DemoPackSchematic) **"packIndex ile pack başlığı değişir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoPlantOverview.test.tsx` (9 test)

1. (DemoPlantOverview) **"AK-11.1: collector tek hat Q01/Q02 ve istasyon kutuları"**
2. (DemoPlantOverview) **"AK-11.2: istasyon kartı isim + BESS aralığı + ünite kutucukları"**
3. (DemoPlantOverview) **"AK-11.4: Manual aktif, Peak shaving disabled"**
4. (DemoPlantOverview) **"AK-11.5: istasyon kartı tıklaması onStationSelect(index) çağırır"**
5. (DemoPlantOverview) **"AK-11.7: seri yokken günlük enerji '—'"**
6. (DemoPlantOverview) **"AK-11.7: seri varsa günlük enerji hesaplanır"**
7. (DemoPlantOverview) **"AK-11.9: illüstratif PV kutuları + collector Metal Clad"**
8. (DemoPlantOverview) **"AK-11.10: PV kutusu tıklaması onSourceSelect(key) çağırır"**
9. (DemoPlantOverview) **"AK-11.11: peak shaving grafiği + peakSum görünür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoPortfolioMap.test.tsx` (5 test)

1. (DemoPortfolioMap (UC-11)) **"AK-11.2: iki proje marker'ı render eder"**
2. (DemoPortfolioMap (UC-11)) **"AK-11.3: statik proje 'demo' işaretlidir"**
3. (DemoPortfolioMap (UC-11)) **"AK-11.4: hover'da tip kartı satırları görünür"**
4. (DemoPortfolioMap (UC-11)) **"AK-11.5: canlı proje tıklaması onOpen çağırır, statik çağırmaz"**
5. (DemoPortfolioMap (UC-11)) **"zoom kontrolleri mevcuttur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoProjectCard.test.tsx` (5 test)

1. (DemoProjectCard (UC-11)) **"AK-11.2: ad, alt başlık ve 3 KPI gösterir"**
2. (DemoProjectCard (UC-11)) **"AK-11.5: canlı kart buton, tıklama onOpen çağırır"**
3. (DemoProjectCard (UC-11)) **"AK-11.3: statik kart 'demo' işaretli ve buton değil"**
4. (DemoProjectCard (UC-11) > DemoPtfCard (UC-11, FR-11.6)) **"AK-11.6: saatlik PTF kartını ve özet değerleri gösterir"**
5. (DemoProjectCard (UC-11) > DemoPtfCard (UC-11, FR-11.6)) **"seri boşsa 'No market data' gösterir (uydurma yok)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoRegMode.test.tsx` (4 test)

1. (DemoRegMode) **"AK-12.2: val modunda düz metin (sarma yok)"**
2. (DemoRegMode) **"AK-12.2: tip modunda .rv + data-rsk ve inline çip üretir"**
3. (DemoRegMode) **"AK-12.1: segment modu değiştirir ve localStorage'a yazar"**
4. (DemoRegMode) **"AK-12.1: localStorage'dan mod geri yüklenir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoSourceStationView.test.tsx` (1 test)

1. (DemoSourceStationView) **"AK-11.10: başlık + srcKpi + 7 inverter çizimi"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoStationBar.test.tsx` (3 test)

1. (DemoStationBar) **"tek istasyonda render etmez"**
2. (DemoStationBar) **"istasyon adı + grup aralığı + seg + arıza gösterir"**
3. (DemoStationBar) **"seçim callback çağırır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/DemoTrendChart.test.tsx` (7 test)

1. (DemoTrendChart (UC-3)) **"AK-3.1: faz gölgelemesi + etiketi çizer"**
2. (DemoTrendChart (UC-3)) **"AK-3.2: band + area + limit çizilir"**
3. (DemoTrendChart (UC-3)) **"K-19: area tabanı serinin İLK değeridir (sıfır değil) — değişim vurgusu"**
4. (DemoTrendChart (UC-3)) **"AK-3.3: hover crosshair + nokta + tooltip"**
5. (DemoTrendChart (UC-3)) **"seri boşsa 'No data' gösterir"**
6. (DemoTrendChart (UC-3)) **"yTicks verilirse y-ekseni o min/max/step tiklerini etiketler"**
7. (DemoTrendChart (UC-3) > nearestIndex) **"en yakın örneği bulur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/apply-nova-vars.test.ts` (3 test)

1. (apply-nova-vars (K-2)) **"light haritası light token değerlerini taşır"**
2. (apply-nova-vars (K-2)) **"dark haritası referans dark değerlerini taşır (AK-1.2)"**
3. (apply-nova-vars (K-2)) **"dark tema bir elemana uygulanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/demo-admin-live.test.ts` (10 test)

1. (demo-registers (UC-8 veri bütünlüğü)) **"her mapping register'ı katalogda var"**
2. (demo-registers (UC-8 veri bütünlüğü)) **"mapping 49 · cihaz 54 · poll planları dolu"**
3. (demo-registers (UC-8 veri bütünlüğü)) **"addrText rack ve PCS adreslerini doğru yazar"**
4. (demo-registers (UC-8 veri bütünlüğü)) **"faultBits kelime 2'de IGBT over-temperature taşır"**
5. (demo-registers (UC-8 veri bütünlüğü) > adminLiveValue (referans liveValue)) **"bank/pcs/hvac canlı değerleri üretir"**
6. (demo-registers (UC-8 veri bütünlüğü) > adminLiveValue (referans liveValue)) **"bilinmeyen register → —"**
7. (demo-registers (UC-8 veri bütünlüğü) > adminLiveValue (referans liveValue) > commandTraceRows (B-2 türetim)) **"BSC komutunu register/adres ile satırlaştırır"**
8. (demo-registers (UC-8 veri bütünlüğü) > adminLiveValue (referans liveValue) > commandTraceRows (B-2 türetim)) **"PCS komutunu adresle eşler + log satırlarını ekler"**
9. (demo-registers (UC-8 veri bütünlüğü) > adminLiveValue (referans liveValue) > commandTraceRows (B-2 türetim)) **"operasyon adımlarındaki maneuver adını da eşler (pcs_standby)"**
10. (demo-registers (UC-8 veri bütünlüğü) > adminLiveValue (referans liveValue) > commandTraceRows (B-2 türetim) > thermalRow) **"Qgen P² ile ölçeklenir, soğutma kompresör sayısından"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/demo-bess-data.test.ts` (7 test)

1. (demo-bess-data (UC-4, D-1 türetim)) **"pack hücreleri 24 adet ve deterministik"**
2. (demo-bess-data (UC-4, D-1 türetim)) **"4 sıcaklık sensörü ve PCB türetir"**
3. (demo-bess-data (UC-4, D-1 türetim)) **"rackPacks 17 pack döner ve numaralar 1..17"**
4. (demo-bess-data (UC-4, D-1 türetim)) **"TC haritası 18 sensör + pack işaretleri"**
5. (demo-bess-data (UC-4, D-1 türetim)) **"rack register tablosu: v14 katalog (43 satır), yalnız canlı değer, adresler"**
6. (demo-bess-data (UC-4, D-1 türetim)) **"packFill bant altı mavi, üstü kırmızı, ortada kademeli"**
7. (demo-bess-data (UC-4, D-1 türetim)) **"busbarZoneHistory deterministik 4h örnek + cooling/heating fazları"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/demo-market.test.tsx` (9 test)

1. (demo-market (UC-9, FR-9.4 — TEİAŞ)) **"PFK P–f: ölü bantta 0, ±200 mHz'de tam rezerv"**
2. (demo-market (UC-9, FR-9.4 — TEİAŞ)) **"AK-9.4: R=10 MW → Δf/ΔP eğimi 50 MW/Hz + 1,25 h enerji kontrolü"**
3. (demo-market (UC-9, FR-9.4 — TEİAŞ)) **"P–Q kabiliyeti eşiği (0,4 / 1,0 pu)"**
4. (demo-market (UC-9, FR-9.4 — TEİAŞ)) **"frekans aralığı tablosu"**
5. (demo-market (UC-9, FR-9.4 — TEİAŞ) > DemoMarketView (UC-6, FR-6.1/6.2/6.3)) **"seri boşsa 'No market data' gösterir (uydurma yok)"**
6. (demo-market (UC-9, FR-9.4 — TEİAŞ) > DemoMarketView (UC-6, FR-6.1/6.2/6.3)) **"fiyat serisi → kartlar + fiyat grafiği + TEİAŞ panelleri"**
7. (demo-market (UC-9, FR-9.4 — TEİAŞ) > DemoMarketView (UC-6, FR-6.1/6.2/6.3) > DemoTrendChart padLeft (UC-9 düzeltme)) **"varsayılan sol pay DEĞİŞMEZ (diğer grafikler birebir)"**
8. (demo-market (UC-9, FR-9.4 — TEİAŞ) > DemoMarketView (UC-6, FR-6.1/6.2/6.3) > DemoTrendChart padLeft (UC-9 düzeltme)) **"padLeft y-ekseni etiket konumunu kaydırır"**
9. (demo-market (UC-9, FR-9.4 — TEİAŞ) > DemoMarketView (UC-6, FR-6.1/6.2/6.3) > DemoTrendChart padLeft (UC-9 düzeltme)) **"maxWidth azami genişliği uygular; varsayılan uygulamaz"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/demo-plant.test.ts` (12 test)

1. (derivePlantOverview) **"AK-11.3: POI/kV/akım ve feeder değerlerini türetir"**
2. (derivePlantOverview) **"AK-11.2: ünite MW işareti (şarj negatif), SOC ort, Tmax maks"**
3. (derivePlantOverview > dailyEnergy) **"AK-11.6: 1 saat sabit 10 MW → 10 MWh exported"**
4. (derivePlantOverview > dailyEnergy) **"negatif güç imported sayılır"**
5. (derivePlantOverview > dailyEnergy) **"boş/kısa seri → hasData false"**
6. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview) **"AK-11.6: istasyon MW/SOC/durum türevleri"**
7. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview) **"AK-11.3: collector overview POI/kV ve 2 istasyon"**
8. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview) **"boş istasyon ünite listesi throw etmez"**
9. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview > deriveSourceStations) **"illüstratif PV istasyonlarını per-unit eşit böler"**
10. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview > deriveSourceStations > buildPeakSeries / peakEnergySums (FR-11.11)) **"gün serisi 97 örnek (15 dk) + gece 0 / gündüz üretim"**
11. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview > deriveSourceStations > buildPeakSeries / peakEnergySums (FR-11.11)) **"enerji toplamları: production > shaved > 0, released 0, curtailed > 0"**
12. (derivePlantOverview > dailyEnergy > deriveStationView / deriveCollectorOverview > deriveSourceStations > buildPeakSeries / peakEnergySums (FR-11.11)) **"solar < threshold → shaved 0"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/demo-portfolio-map.test.ts` (8 test)

1. (geo-europe (UC-11, K16)) **"projeksiyon lon artışında x'i büyütür, lat artışında y'yi küçültür"**
2. (geo-europe (UC-11, K16)) **"GEO ülke listesi + tuval boyutu taşır"**
3. (geo-europe (UC-11, K16) > demo-portfolio-map (UC-11)) **"MAP_HOME Türkiye'yi kapsar"**
4. (geo-europe (UC-11, K16) > demo-portfolio-map (UC-11)) **"homeViewBox projeksiyon köşelerinden türetilir (x<y hizası)"**
5. (geo-europe (UC-11, K16) > demo-portfolio-map (UC-11)) **"clampViewBox aspect'i ayarlar ve harita sınırında kırpar"**
6. (geo-europe (UC-11, K16) > demo-portfolio-map (UC-11)) **"zoomViewBox yakınlaştırınca w küçülür, uzaklaştırınca büyür"**
7. (geo-europe (UC-11, K16) > demo-portfolio-map (UC-11)) **"zoomViewBox ZMAX sınırını aşmaz"**
8. (geo-europe (UC-11, K16) > demo-portfolio-map (UC-11)) **"fitViewBox tüm noktaları kapsar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/demo-readiness.test.tsx` (8 test)

1. (demo-readiness (UC-7, FR-7.3, K7)) **"DEMO_REST_MINUTES 120 dk'dır (LGES: 2 saat dinlenme)"**
2. (demo-readiness (UC-7, FR-7.3, K7)) **"lastFullRunFinishedAt en yeni tam şarj/deşarj bitişini seçer"**
3. (demo-readiness (UC-7, FR-7.3, K7)) **"deriveRestState eşik dolunca complete olur"**
4. (demo-readiness (UC-7, FR-7.3, K7)) **"thermalReady tüm bankalar bantta ise true"**
5. (demo-readiness (UC-7, FR-7.3, K7)) **"AK-7.3: 120 dk önce biten full_charge + bant içi raflar → dinlenme tamam + hazır"**
6. (demo-readiness (UC-7, FR-7.3, K7) > DemoReadyCard / DemoSequence (UC-7)) **"AK-2.3: kart 'REST TIME COMPLETE' + grup READY gösterir"**
7. (demo-readiness (UC-7, FR-7.3, K7) > DemoReadyCard / DemoSequence (UC-7)) **"restPhasesForRuns tam şarj bitişinden rest fazı üretir"**
8. (demo-readiness (UC-7, FR-7.3, K7) > DemoReadyCard / DemoSequence (UC-7)) **"AK-7.2: DemoSequence adımları durumlarıyla listeler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/mimic-source-map.test.ts` (9 test)

1. (mimic-source-map) **"bank t1 → SOC·SOH calc, doğru fiziksel cihaz + grup"**
2. (mimic-source-map) **"bank t2 → DC voltage · max pack temperature"**
3. (mimic-source-map) **"pcs ps/pp/pt → PCS register'ları"**
4. (mimic-source-map) **"rack → 30170 tabanlı rack register"**
5. (mimic-source-map) **"ust → grup durumu calc"**
6. (mimic-source-map) **"POI/AUX/feeder/meter → nomap saha cihazları"**
7. (mimic-source-map) **"bilinmeyen id → null"**
8. (mimic-source-map) **"tipHtml ile mimik kaynağı kart üretir"**
9. (mimic-source-map) **"özel cihaz haritası kullanılabilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/nova-components.test.tsx` (21 test)

1. (DemoCellDialog (FR-4.4 / AK-4.4)) **"ölçü hücresinde V/Hz/I gösterir"**
2. (DemoCellDialog (FR-4.4 / AK-4.4)) **"toprak kapalıyken kesici kapatmayı kilitler (AK-4.5)"**
3. (DemoCellDialog (FR-4.4 / AK-4.4)) **"geçerli komutta onCommand'ı çağırır"**
4. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3)) **"2 PCS ve 2 banka tablosu gösterir"**
5. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3)) **"referans kart bölümlerini gösterir (RMU / PCS model / AC V / batarya satırları)"**
6. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3)) **"seçim yoksa 'Select a unit.' gösterir"**
7. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1)) **"pack ölçümleri + hücre çubukları + sıcaklık sensörleri + tüm pack tablosu"**
8. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1)) **"pack tablosunda tıklama onSelect'i tetikler"**
9. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3)) **"AK-4.1: 2 DC bara × 8 raf gösterir"**
10. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3)) **"AK-4.2: 2 PCS ve DC kesici gösterir"**
11. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3)) **"AK-4.3: 4 HVAC bölümü ve FSS paneli gösterir"**
12. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3)) **"dummy konteyner-butonu render edilir ve onOpen çağırır"**
13. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5)) **"AK-5.1: Devices bölüm sekmeleri tanımlıdır"**
14. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5)) **"AK-5.2: batarya bölümü raf SOC/V/I/sıcaklık hücrelerini gösterir"**
15. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2)) **"AK-6.1: aktif filtre yalnızca aktif alarmları gösterir"**
16. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2)) **"çözülmüş filtre resolve butonu göstermez"**
17. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2)) **"AK-6.2: notu onConfirm'e iletir"**
18. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2) > DemoBessScada (UC-4, FR-4.3)) **"AK-4.3: TR/PCS/DC CB/BUS/raf/HVAC/FSS çizilir"**
19. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2) > DemoBessScada (UC-4, FR-4.3) > DemoFaultsView (UC-7, FR-7.1/7.2)) **"AK-7.1: Active filtresi yalnız aktif alarmı gösterir"**
20. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2) > DemoBessScada (UC-4, FR-4.3) > DemoFaultsView (UC-7, FR-7.1/7.2)) **"AK-7.2: not girip çözme çağrısı yapılır"**
21. (DemoCellDialog (FR-4.4 / AK-4.4) > DemoUnitDetail (FR-4.3 / AK-4.3) > DemoPackDetail (UC-4, D-1) > DemoContainerScada (UC-4, FR-4.1..4.3) > DemoDevicePanels (UC-4, FR-4.1..4.5) > DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2) > DemoBessScada (UC-4, FR-4.3) > DemoFaultsView (UC-7, FR-7.1/7.2) > DemoEventLog (UC-8, FR-8.1)) **"severity filtresi yalnızca ilgili kayıtları gösterir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/nova-mimic.test.ts` (14 test)

1. (nova-mimic saf yardımcılar (T-14)) **"computeEnergization fiderleri anahtarlardan hesaplar"**
2. (nova-mimic saf yardımcılar (T-14)) **"bankSeverity eşiklerini uygular"**
3. (nova-mimic saf yardımcılar (T-14)) **"tempFill sıcak/soğuk renk üretir"**
4. (nova-mimic saf yardımcılar (T-14)) **"defaultUnitStatus arıza durumunu bildirir"**
5. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars) **"token'lardan CSS değişkeni üretir"**
6. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars) **"bir elemana uygular"**
7. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1)) **"6 ünite çizer ve destroy temizler"**
8. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1)) **"AUX hücresi: AUX TR + L iletken + AUX PANEL kutusu çizilir"**
9. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1) > K-22: istasyon üniteleri iki sütuna sarmalanır) **"listNovaUnits: 9 ünite → 5 sol + 4 sağ; 6. ünite wrap, son ünite 9"**
10. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1) > K-22: istasyon üniteleri iki sütuna sarmalanır) **"listNovaUnits: kolon sınırı (5) sarmaz; çok fiderli topo sarmaz"**
11. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1) > K-22: istasyon üniteleri iki sütuna sarmalanır) **"createNovaMimic: 2. sütun + çapraz bağlantı çizilir, son ünitede H03 yok"**
12. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1) > K-22: istasyon üniteleri iki sütuna sarmalanır > nova-mimic akış/motor/ES (UC-2, AK-2.1..2.3)) **"AK-2.1: deşarjda (poiMW>0) akış flow-discharge, şarjda (poiMW<0) flow-charge sınıfı taşır"**
13. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1) > K-22: istasyon üniteleri iki sütuna sarmalanır > nova-mimic akış/motor/ES (UC-2, AK-2.1..2.3)) **"AK-2.2: motorlu hücrede M işareti render edilir"**
14. (nova-mimic saf yardımcılar (T-14) > applyNovaLightVars > createNovaMimic (AK-3.1) > K-22: istasyon üniteleri iki sütuna sarmalanır > nova-mimic akış/motor/ES (UC-2, AK-2.1..2.3)) **"AK-2.3: RMU toprak ayırıcısı kapalıyken görünür"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/nova/register-sources.test.ts` (9 test)

1. (register-sources) **"mapping anahtarı ile register id'yi çözer (bank.soc → bsc.soc)"**
2. (register-sources) **"AK-12.2: BSC kaynağı device/adres/FC/screen mapping taşır"**
3. (register-sources) **"PCS kaynağı holding register + Wattox modeli"**
4. (register-sources) **"rack kaynağı 30170 + 150·(pos−1) + offset adresini üretir"**
5. (register-sources) **"AK-12.3: calc kaynağı girdi register listesini gösterir"**
6. (register-sources) **"AK-12.4: nomap/model işaretleri"**
7. (register-sources) **"bilinmeyen register id → nomap'e düşer"**
8. (register-sources) **"sourceKey kararlıdır ve sourceByKey roundtrip yapar"**
9. (register-sources) **"sourceText tek satır özet üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/HttpPollingTransport.test.ts` (6 test)

1. (HttpPollingTransport (T2)) **"connect: ilk fetch + interval kurulur; state connected yayınlanır"**
2. (HttpPollingTransport (T2)) **"başarılı fetch onData'yı besler (telemetries fallback data)"**
3. (HttpPollingTransport (T2)) **"HTTP 500 → onError; state BOZULMAZ (kademeli bozulma)"**
4. (HttpPollingTransport (T2)) **"getToken Authorization header olarak eklenir"**
5. (HttpPollingTransport (T2)) **"disconnect: interval durur + state idle"**
6. (HttpPollingTransport (T2)) **"subscribe geri dönüşü observer'ı çıkarır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/MockTransport.test.ts` (8 test)

1. (MockTransport) **"starts in idle state"**
2. (MockTransport) **"transitions to connected on connect()"**
3. (MockTransport) **"generates data for each definition per tick"**
4. (MockTransport) **"generates values within min/max range"**
5. (MockTransport) **"stops generating after disconnect"**
6. (MockTransport) **"unsubscribe stops receiving data"**
7. (MockTransport) **"multiple observers all receive data"**
8. (MockTransport) **"respects custom intervalMs"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/WebSocketTransport.test.ts` (13 test)

1. (WebSocketTransport (T2)) **"connect → open: connected + deviceId başına subscribe mesajı"**
2. (WebSocketTransport (T2)) **"token varsa query'ye eklenir"**
3. (WebSocketTransport (T2)) **"initial ve telemetry mesajları onData'yı besler"**
4. (WebSocketTransport (T2)) **"malform mesaj onError üretir (bağlantı kopmaz)"**
5. (WebSocketTransport (T2)) **"açılmadan kapanma → error + rejected; reconnect YOK"**
6. (WebSocketTransport (T2)) **"açıldıktan sonra kapanma → üstel backoff reconnect (tavan 30 sn)"**
7. (WebSocketTransport (T2)) **"disconnect: cancelled — kapanma sonrası reconnect OLMAZ, state idle"**
8. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"addDevices açık sokette subscribe gönderir (yeni soket açmaz)"**
9. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"aynı deviceId referans sayılır — bir abone çıkınca unsubscribe GİTMEZ"**
10. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"connect idempotent: açık sokette ikinci connect yeni soket açmaz"**
11. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu)) **"reconnect sonrası tüm abonelikler yeniden gönderilir"**
12. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu) > WebSocketTransport — names filtresi (panel spec)) **"addDevices names verilirse subscribe mesajına ekler"**
13. (WebSocketTransport (T2) > WebSocketTransport — multipleks (component izolasyonu) > WebSocketTransport — names filtresi (panel spec)) **"reconnect sonrası names korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `packages/ui/src/transports/transport-contract.test.ts` (7 test)

1. (ITelemetryTransport contract) **"starts idle and transitions to connected"**
2. (ITelemetryTransport contract) **"transitions back to idle on disconnect"**
3. (ITelemetryTransport contract) **"notifies observer of connection state changes"**
4. (ITelemetryTransport contract) **"unsubscribe stops notifications"**
5. (ITelemetryTransport contract) **"onData callback delivers telemetry batches"**
6. (ITelemetryTransport contract) **"onError callback receives errors from transport"**
7. (ITelemetryTransport contract) **"multiple observers all receive notifications"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/data-service/src/data-service.test.ts` (13 test)

1. (DataService > start()) **"registers WRITE_TELEMETRY worker with onFailed boundary"**
2. (DataService > start() > worker processing) **"writes telemetry to timescale on WRITE_TELEMETRY job"**
3. (DataService > start() > worker processing) **"telemetri akışından system_logs'a YAZIM YOKTUR (Açık 2 kapanışı)"**
4. (DataService > start() > worker processing) **"write hatası → TransientError fırlatılır (retry tetiklenir)"**
5. (DataService > start() > worker processing) **"skips processing when service is stopped"**
6. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11)) **"denemeler tükenince jobId + deviceId'lerle loglanır"**
7. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11)) **"logger yoksa onFailed sessizdir (geriye uyumluluk)"**
8. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop()) **"closes all connections"**
9. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false when stopped"**
10. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns true when all services healthy"**
11. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false when message queue is unhealthy"**
12. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false when timescale is unhealthy"**
13. (DataService > start() > worker processing > onFailed sınır logu (T0.7/T0.11) > stop() > health()) **"returns false on exception"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/alarm-state-repository.test.ts` (7 test)

1. (AlarmStateRepository (Faz 0 eki)) **"initialize DDL'i oluşturur"**
2. (AlarmStateRepository (Faz 0 eki)) **"activate UPSERT üretir — yeni oluşumda resolved sıfırlanır"**
3. (AlarmStateRepository (Faz 0 eki)) **"deactivate yalnızca aktif satırı kapatır"**
4. (AlarmStateRepository (Faz 0 eki)) **"resolve — aktif satır bulunursa true"**
5. (AlarmStateRepository (Faz 0 eki)) **"resolve — aktif satır yoksa false (409 kaynağı)"**
6. (AlarmStateRepository (Faz 0 eki)) **"resetAll cihazların bayat aktiflerini kapatır"**
7. (AlarmStateRepository (Faz 0 eki)) **"listActive / recentEnded sorguları tabloyu okur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/alarm-transition-detector.test.ts` (16 test)

1. (alarmSamples (kural → örnek)) **"kural telemetri adıyla eşleşir"**
2. (alarmSamples (kural → örnek)) **"value !== 0 → aktif (varsayılan)"**
3. (alarmSamples (kural → örnek)) **"activeLow: value === 0 → aktif"**
4. (alarmSamples (kural → örnek)) **"telemetri üretilmediyse örnek yok (geçiş yok — durum korunur)"**
5. (alarmSamples (kural → örnek)) **"kural yoksa örnek yok"**
6. (alarmSamples (kural → örnek)) **"aynı isimli birden fazla satır OR ile birleşir (rack başına alanlar)"**
7. (alarmSamples (kural → örnek)) **"aynı isimli TÜM satırlar pasifse alarm pasiftir"**
8. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"yükselen kenar → tek set"**
9. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"aktifken tekrar eden okuma sessizdir"**
10. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"düşen kenar → clear"**
11. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"clear sonrası yeni aktif → yeniden tek set"**
12. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"cihazlar birbirinden izoledir"**
13. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"reset cihazın tüm alarm durumlarını unutur"**
14. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"reset yalnızca hedef cihazı etkiler"**
15. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"aynı pollda birden fazla yükselen kenar toplu döner"**
16. (alarmSamples (kural → örnek) > AlarmTransitionDetector (dedup state machine)) **"hiç aktif olmamış alarmda pasif örnek geçiş üretmez (kenar yok)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/config-loader.test.ts` (4 test)

1. (DeviceConfigLoader > constructor) **"throws when configDir is empty"**
2. (DeviceConfigLoader > constructor > parseFile (via public API)) **"throws when directory does not exist"**
3. (DeviceConfigLoader > constructor > parseFile (via public API) > load() — source of truth (kök configs/)) **"tüm cihaz config dosyalarını yükler ve şemadan geçirir"**
4. (DeviceConfigLoader > constructor > parseFile (via public API) > load() — source of truth (kök configs/)) **"service.json yüklenir (global servis konfigürasyonu)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/debug-injector.test.ts` (1 test)

1. (DebugInjector) **"start → /health 200, bilinmeyen yol 404, stop idempotent"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/device-factory.test.ts` (7 test)

1. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"transport olmayan config varsayılan TCP ile çalışır"**
2. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"rtu transport'lu config cihaz üretir (bağlantı kurmaz)"**
3. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"kind:'simulator' config yine TCP cihaz üretir (simulator dalı YOK)"**
4. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"canonical alanı tags.canonical olarak taşınır (AGENTS MANDATORY sözleşmesi)"**
5. (DeviceFactory — transport seçimi (yalnız TCP/RTU)) **"canonical verilmeyen telemetride tags.canonical YOKTUR"**
6. (DeviceFactory — transport seçimi (yalnız TCP/RTU) > DeviceFactory — connector device-subset türetimi) **"connector bölümü varsa 2. MODBUS cihazı üretir"**
7. (DeviceFactory — transport seçimi (yalnız TCP/RTU) > DeviceFactory — connector device-subset türetimi) **"connector bölümü yoksa undefined döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/device-scheduler.test.ts` (8 test)

1. (DeviceScheduler > scheduleRead()) **"creates repeatable job with correct name and interval"**
2. (DeviceScheduler > scheduleRead()) **"uses deviceId in job name"**
3. (DeviceScheduler > scheduleRead() > scheduleManagement()) **"creates management job with default interval"**
4. (DeviceScheduler > scheduleRead() > scheduleManagement()) **"uses configured managementIntervalMs"**
5. (DeviceScheduler > scheduleRead() > scheduleManagement() > publishTelemetry()) **"adds job when telemetry data is provided"**
6. (DeviceScheduler > scheduleRead() > scheduleManagement() > publishTelemetry()) **"skips when telemetry data is empty"**
7. (DeviceScheduler > scheduleRead() > scheduleManagement() > publishTelemetry()) **"WRITE job alt kümeyi, MANAGEMENT/WS tam veriyi taşır"**
8. (DeviceScheduler > scheduleRead() > scheduleManagement() > publishTelemetry()) **"boş alt kümede WRITE job atılmaz, MANAGEMENT/WS devam eder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/device-service.test.ts` (26 test)

1. (device-service T0.11 sözleşmesi (hata yolları + log)) **"start(): yalnız READ_DEVICE/COMMAND_DEVICE worker kaydeder (çoklu-tüketici koruması)"**
2. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"read hatası processor'ı REJECT ETMEZ — poll devam eder"**
3. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"online→offline geçişinde 1× error log + devices.status='offline'"**
4. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"sürekli hata 60 sn içinde yeni log üretmez (spam önleme)"**
5. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"60 sn sonra debug hatırlatma üretir"**
6. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"offline→online geçişinde info log + status='online'"**
7. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı)) **"logger yoksa eski davranış korunur (console.warn)"**
8. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11)) **"write hatası → audit command_rejected + app modbus_write_failed"**
9. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11)) **"başarılı yazma → audit command_executed"**
10. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11)) **"audit fail-closed: command_rejected logu başarısızsa job düşer"**
11. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"'positive' sağlanıyorsa → validated: true"**
12. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"ilişki sağlanmıyorsa timeout sonuna kadar poll → success: false, validated: false"**
13. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"ilişki dışı string birebir eşitlik olarak kalır"**
14. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3)) **"okuma her denemede hata verirse → validated:false + reason okuma hatasını içerir"**
15. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz) **"logger varsa request_rejected loglanır, publish yok"**
16. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"yükselen kenar → activate UPSERT + tek device_alarm logu"**
17. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"aktifken tekrar eden okumalar SESSİZDİR (dedup)"**
18. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"düşen kenar → deactivate + device_alarm_cleared logu"**
19. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"çözülme sonrası yeniden oluşum → yeniden tek log"**
20. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"logger yoksa durum tablosu yine çalışır"**
21. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"sql yoksa yalnızca log çalışır (tablo yazımı atlanır)"**
22. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"alarm kuralları yoksa hiçbir alarm işlemi yapılmaz"**
23. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"start() restart sonrası bayat aktifleri kapatır + dedup sıfırlar"**
24. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"durum tablosu hatası imzalı logu ATLAMAZ (katman bağımsızlığı)"**
25. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"log hatası UPSERT'i ATLAMAZ + poll'u kesmez"**
26. (device-service T0.11 sözleşmesi (hata yolları + log) > readDevice hata yolu (Açık 1 kapanışı) > executeCommand audit (T0.11) > validate.expect ilişki sözcükleri (PCS-WATTOX T-P3) > bilinmeyen cihaz > cihaz alarm orkestrasyonu (Faz 0 eki)) **"iki eşzamanlı geçiş → 2 UPSERT + 2 log (allSettled)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/heartbeat-writer.test.ts` (5 test)

1. (HeartbeatWriter) **"writeBeat artan sayaç ve telemetri adını yazar"**
2. (HeartbeatWriter) **"sayaç 255 sonrası 0'a döner (0-255 döngü)"**
3. (HeartbeatWriter) **"yazım hatası onError'a gider, servisi düşürmez"**
4. (HeartbeatWriter) **"R2.3: extraTelemetries (40001–40009) aynı sayaçla yazılır"**
5. (HeartbeatWriter) **"start/stop idempotent — interval periyodik yazar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/telemetry-tagger.test.ts` (5 test)

1. (TelemetryTagger) **"korur elle girilen tag'leri ve device_id ekler"**
2. (TelemetryTagger) **"container-level app'te container_id ekler"**
3. (TelemetryTagger) **"field-level app'te field_id ekler, container_id eklemez"**
4. (TelemetryTagger) **"kimlik yoksa sadece device_id ekler"**
5. (TelemetryTagger) **"tags olmayan telemetriye de tag ekler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/telemetry-write-filter.test.ts` (11 test)

1. (TelemetryWriteFilter) **"politikasız isim her zaman dahil (always-write)"**
2. (TelemetryWriteFilter) **"ilk görüş (state yok) dahil edilir"**
3. (TelemetryWriteFilter) **"markWritten sonrası eşik altı değişim haric tutulur"**
4. (TelemetryWriteFilter) **"eşik üstü değişim dahil edilir"**
5. (TelemetryWriteFilter) **"TTL doldu → değişmese de dahil edilir (son yazımdan)"**
6. (TelemetryWriteFilter) **"sayısal olmayan değer politikalı isimde güvenli tarafta dahil edilir"**
7. (TelemetryWriteFilter) **"cihazlar izole — biri diğerinin state'ini etkilemez"**
8. (TelemetryWriteFilter) **"girdi sırası korunur, yalnız gerekenler döner"**
9. (TelemetryWriteFilter > TelemetryWriteFilter — sınır/edge (Faz D)) **"TTL sınır eşitliği: now - at == maxStaleMs → yazılır"**
10. (TelemetryWriteFilter > TelemetryWriteFilter — sınır/edge (Faz D)) **"NaN değer güvenli tarafta yazılır (sayısal değil)"**
11. (TelemetryWriteFilter > TelemetryWriteFilter — sınır/edge (Faz D)) **"yeni filtre örneği state sıfır → ilk görüş yazılır (restart)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/device-service/src/write-policy.test.ts` (6 test)

1. (resolveWritePolicies) **"sayısal deadband + maxStaleMs çözülür"**
2. (resolveWritePolicies) **""auto" → scale değerine çözülür"**
3. (resolveWritePolicies) **"deadband tanımsız girdi haritaya alınmaz (always-write)"**
4. (resolveWritePolicies) **"deadband: auto ama scale yok/sıfır → fail-fast"**
5. (resolveWritePolicies) **"savunmacı: deadband var maxStaleMs yok → fail-fast"**
6. (resolveWritePolicies) **"karışık girdilerde yalnız politikalılar döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/integration-service/src/external-series-writer.test.ts` (5 test)

1. (ExternalSeriesWriter) **"init tablo, hypertable ve index olusturur"**
2. (ExternalSeriesWriter) **"write upsert SQL uretir ve parametreleri sirali gecer"**
3. (ExternalSeriesWriter) **"bos listede write hicbir SQL calistirmaz"**
4. (ExternalSeriesWriter) **"query satirlari MarketDataPoint'e cevirir"**
5. (ExternalSeriesWriter) **"close baglantiyi kapatir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/integration-service/src/integration-service.test.ts` (12 test)

1. (IntegrationService) **"start — integration pluginlerini aktive eder ve interval job planlar"**
2. (IntegrationService) **"start — integration olmayan pluginleri atlar"**
3. (IntegrationService) **"start — cron mode'da cron job planlar"**
4. (IntegrationService) **"start — manual mode'da zamanlama kaydetmez"**
5. (IntegrationService) **"worker isi — fetch eder ve yazar"**
6. (IntegrationService) **"runPlugin — manuel calistirir ve yazilan sayiyi dondurur"**
7. (IntegrationService) **"runPlugin — bilinmeyen pluginde firlatir"**
8. (IntegrationService) **"stop — pluginleri deactivate eder ve kaynaklari kapatir"**
9. (IntegrationService) **"2026-08-30 (T3): worker — bilinmeyen plugin job'ı YOK SAYILIR (kademeli bozulma)"**
10. (IntegrationService) **"2026-08-30 (T3): worker — plugin fetch HATASI job'ı düşürür, yazım YAPILMAZ (hata akışı yukarı fırlar)"**
11. (IntegrationService) **"2026-08-30 (T3): worker — boş fetch sonucu BOŞ listeyle yazıma gider (writer no-op'tur)"**
12. (IntegrationService) **"2026-08-30 (T3): runPlugin — fetch hatası çağırana fırlar (yutulmaz)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/action-executor.test.ts` (22 test)

1. (ActionExecutor) **"kural ateşleme logu: auto_rule_fired (info, context.rule)"**
2. (ActionExecutor) **"command aksiyonu başarı → executeAndWait + auto_rule_action_ok"**
3. (ActionExecutor) **"validate olmayan komutta timeout varsayılan 3000 + tampon"**
4. (ActionExecutor) **"command aksiyonu job başarısız → auto_rule_action_failed"**
5. (ActionExecutor) **"command aksiyonu çözümleme hatası → fail (throw yok, akış durmaz)"**
6. (ActionExecutor) **"zorunlu param eksik command → fail; sonraki aksiyon devam eder"**
7. (ActionExecutor) **"log aksiyonu: config eventCode + level; logger yoksa console fallback"**
8. (ActionExecutor) **"log aksiyonu logger hatası → fail; akış devam eder"**
9. (ActionExecutor) **"container-command başarı → kanal trace'iyle çağrılır + auto_rule_action_ok"**
10. (ActionExecutor) **"container-command kanal fail → auto_rule_action_failed (akış durmaz)"**
11. (ActionExecutor) **"container-command kanal YOK → fail (kademeli bozulma)"**
12. (ActionExecutor) **"notify aksiyonu: eventCode auto_rule_<name> ile loglanır; başarı sonucu ok"**
13. (ActionExecutor) **"logger yoksa notify ATLANIR (ok sonuç)"**
14. (ActionExecutor) **"notify logu hatası → fail sonucu (akış durmaz)"**
15. (ActionExecutor) **"beklenmeyen mq throw → fail sonucu, akış devam eder"**
16. (ActionExecutor) **"sonuç logu hatası aksiyon sonucunu değiştirmez (best-effort)"**
17. (ActionExecutor) **"logger yoksa log aksiyonu console fallback: error ve info seviyeleri"**
18. (ActionExecutor) **"sonuç listesi aksiyon sırasını korur"**
19. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"kanal YOKSA fail (channel_not_configured) — akış durmaz"**
20. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"ok sonucu → auto_rule_action_ok + trace auto:<kural>"**
21. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"202 (started) → ok + started context taşınır"**
22. (ActionExecutor > ActionExecutor — maneuver/operation aksiyonları (KURAL-MOTORU-V2)) **"fail (409 disabled — UC-4) → auto_rule_action_failed + reason; sonraki aksiyon devam"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/automation-rules.spec.ts` (8 test)

1. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1)) **"V>1500 + debounce 1 sn → CB open + BSC emergency (tüm aktif cihazlar) + audit"**
2. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1)) **"Voltage L-N Avg < 180 + debounce 5 sn → şalter AÇ + kontaktör AÇ (tüm aktif cihazlar)"**
3. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak) **"Max Pack Temp > 50 + debounce 5 dk → tüm HVAC force_cool + tüm BSC emergency"**
4. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis) **"HVAC-1 25.2°C → force_cool job'ı GERÇEK config'ten üretilir"**
5. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io)) **"Battery Door Open 1 → ışık AÇ + tüm BSC emergency"**
6. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io)) **"kenar-tetik: kapı kapalıyken KAPATMA kuralı ateşler (ışık söner)"**
7. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io) > FL-11 — toprak direnci (IMD-1)) **"Insulation Alarm 4 + debounce 2 sn → CB open + kontaktör AÇ (tüm aktif cihazlar)"**
8. (otomasyon kural zinciri (K9 — gerçek config'lerle) > FL-08 — DC kısa devre (DC-METER-1) > FL-02 — AUX kaybı (PM5340-1) > FL-05 koruma — aşırı sıcak > FL-05 normal — HVAC hysteresis > FL-07 — kapı DI (control-panel-io) > FL-11 — toprak direnci (IMD-1) > fail-safe (K-A4)) **"FL-06/09/12 senaryosu kural üretmez — job listesi boş"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/container-command-channel.test.ts` (6 test)

1. (HttpContainerCommandChannel) **"URL + gövde + trace başlığı doğru"**
2. (HttpContainerCommandChannel) **"internalToken verilirse x-internal-token başlığı gider"**
3. (HttpContainerCommandChannel) **"sonuçlarda success=false → ok=false + reason"**
4. (HttpContainerCommandChannel) **"HTTP 503 → ok=false, throw YOK"**
5. (HttpContainerCommandChannel) **"network hatası → ok=false + String(error)"**
6. (HttpContainerCommandChannel) **"baseUrl/fillId eksik → constructor reddeder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/container-rules.test.ts` (20 test)

1. (konteyner rules.json — kural envanteri) **"zod-valid + fail-fast yüklenir; 47 kural"**
2. (konteyner rules.json — kural envanteri) **"K-A4: FL-06/09/12 kural adı YOKTUR (fail-safe)"**
3. (konteyner rules.json — kural envanteri) **"K-A8/K-A9: hiçbir aksiyon PCS'e veya BSC charge/discharge'a gitmez"**
4. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_cool_on_h1: Current Temp ≥ 25 → force_cool + log; cooldown 60 sn"**
5. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_cool_off_h1: < 23 → on"**
6. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_heat_on_h1: ≤ 17 → force_heat"**
7. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"tms_heat_off_h1: ≥ 20 → on"**
8. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis)) **"HVAC-1..8 için dörtlü tamam (32 kural)"**
9. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_overheat_protect: 3 kademeli debounce + HVAC force + BSC emergency"**
10. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_overcold_protect: 3 kademeli + force_heat + BSC emergency"**
11. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_humidity_alarm: Return Humidity ≥ 75 → BSC emergency + log + notify"**
12. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK)) **"tms_temp_diff_protect: per-rack R1..R8 (≥10 rack / ≥5 pack) → BSC emergency"**
13. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340)) **"eşik 180 V + debounce 5 sn; CB open ×2 + BSC open_contactors ×2"**
14. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI)) **"batarya kapısı AÇIK → ışık + BSC emergency; KAPALI → ışık söndür"**
15. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI)) **"panel kapısı kuralları aynı desen (panel_light_on/off)"**
16. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1)) **"V>1500 / I>1680 / P>1784 (debounce 1 sn) → şalter AÇ + kontaktör Emergency"**
17. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map)) **"Insulation Alarm / Device Error aktif (≠0, debounce 2 sn) → koruma"**
18. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map) > kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)) **"FL-08: eşik altı ATEŞLEMEZ; eşik üstü + debounce → tek ateşleme"**
19. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map) > kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)) **"FL-05 normal: HVAC-1 25.1°C → tms_cool_on_h1 tek ateşleme"**
20. (konteyner rules.json — kural envanteri > FL-05 normal kontrol (32 kural — hysteresis) > FL-05 korumalar (blok seti — K10: PCS YOK) > FL-02 AUX kaybı (PM5340) > FL-07 kapı kuralları (control-panel-io DI) > FL-08 DC kısa devre (DC-METER-1) > FL-11 toprak direnci (IMD-1 — K4 gerçek map) > kenar-tetik davranışı (RuleEvaluator + gerçek kurallar)) **"FL-07: kapı DI 1 → fl07_battery_door_open ateşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/cycle-snapshot-store.test.ts` (10 test)

1. (CycleSnapshotStore) **"record + snapshot: değer adıyla okunur, unit ve recordedAt taşınır"**
2. (CycleSnapshotStore) **"yeni kayıt eskisini ezer (aynı anahtar)"**
3. (CycleSnapshotStore) **"maxAgeMs aşan giriş snapshot'a girmez"**
4. (CycleSnapshotStore) **"bayat giriş depodan temizlenir — sonraki snapshot tutarlı"**
5. (CycleSnapshotStore) **"olmayan cihaz/anahtar → undefined"**
6. (CycleSnapshotStore) **"canonical etiketiyle erişim: key ad değilse tags.canonical indeksine düşer"**
7. (CycleSnapshotStore) **"canonical indeksi de yeni kayıtla güncellenir"**
8. (CycleSnapshotStore) **"boş store → boş snapshot"**
9. (CycleSnapshotStore) **"snapshot anlık görüntüdür — sonraki record'lar dönen nesneyi etkilemez"**
10. (CycleSnapshotStore) **"çok cihaz: deviceIds tümünü listeler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/device-catalog.test.ts` (7 test)

1. (DeviceCatalog) **"seçici yoksa tüm cihazlar"**
2. (DeviceCatalog) **"ids seçicisi birebir döner"**
3. (DeviceCatalog) **"types seçicisi eşleşen cihazları döner"**
4. (DeviceCatalog) **"ids + types birleşim (çift kayıt yok)"**
5. (DeviceCatalog) **"bilinmeyen type → yalnızca ids varsa onlar"**
6. (DeviceCatalog) **"type olmayan cihaz yalnızca ids ile seçilir"**
7. (DeviceCatalog) **"bilinmeyen id sessizce yok sayılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/field-rules.test.ts` (6 test)

1. (field rules.json (R-06 + SOC örneği)) **"geçerli: r06_recovery + soc_discharge_example + demo dinlenme kuralları"**
2. (field rules.json (R-06 + SOC örneği)) **"tetikleyici: E-stop 0 + fault 0 (all)"**
3. (field rules.json (R-06 + SOC örneği)) **"aksiyonlar: maneuver(fl06_recovery) + log + notify — KOMUT aksiyonu YOK (KURAL-MOTORU-V2)"**
4. (field rules.json (R-06 + SOC örneği)) **"debounce: E-stop düşen kenarı 2 sn doğrulanır"**
5. (field rules.json (R-06 + SOC örneği)) **"SOC örneği: operation(field_discharge) + params delegasyonu"**
6. (field rules.json (R-06 + SOC örneği)) **"demo dinlenme: SOC ≥97 / ≤3.5 → standby operation (enabled)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/management-service.test.ts` (6 test)

1. (ManagementService) **"start: MANAGEMENT worker kaydedilir; job telemetrisi snapshot'a yazılır"**
2. (ManagementService) **"runCycle: koşul sağlanınca kural ateşlenir ve executor çağrılır"**
3. (ManagementService) **"tick döngüsü: interval sonrası değerlendirme kendiliğinden çalışır"**
4. (ManagementService) **"worker yalnızca MANAGEMENT tipini kaydeder (non-MANAGEMENT job yok sayılır)"**
5. (ManagementService) **"stop: döngü durur, mq.close çağrılır; çift stop güvenli"**
6. (ManagementService) **"health: çalışıyorsa mq.health yansır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/maneuver-operation-channel.test.ts` (7 test)

1. (HttpManeuverOperationChannel) **"POST yolu + gövde + başlıklar birebir"**
2. (HttpManeuverOperationChannel) **"maneuver türü doğru önek üretir"**
3. (HttpManeuverOperationChannel) **"rolled_back → ok (kompanzasyon tamamlandı — terminal)"**
4. (HttpManeuverOperationChannel) **"failed/rejected → ok:false + reason (409 operation_disabled — UC-4)"**
5. (HttpManeuverOperationChannel) **"202 → ok + started (arka planda sürüyor)"**
6. (HttpManeuverOperationChannel) **"network hatası / 503 → ok:false (throw YOK)"**
7. (HttpManeuverOperationChannel) **"timeout → ok:false + reason timeout (AbortController)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/ppc-rule.spec.ts` (4 test)

1. (PPC sinyal zinciri (WS3 + D4)) **"bağlantı koptu (0) → kural ateşler + kanala auto:<rule> trace ile gider"**
2. (PPC sinyal zinciri (WS3 + D4)) **"stale eşlemesi (2) de tetikler; bağlı (1) ATEŞLEMEZ"**
3. (PPC sinyal zinciri (WS3 + D4)) **"kenar-tetik: aynı snapshot ikinci kez değerlendirilmez"**
4. (PPC sinyal zinciri (WS3 + D4)) **"kanal fail (ok=false) → aksiyon fail sonucu; sonraki aksiyon DEVAM eder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/rule-config-loader.test.ts` (9 test)

1. (RuleConfigLoader.loadRules) **"geçerli dosyayı yükler (tipli)"**
2. (RuleConfigLoader.loadRules) **"dosya yok → throw"**
3. (RuleConfigLoader.loadRules) **"bozuk JSON → throw"**
4. (RuleConfigLoader.loadRules) **"şema reddi (then boş) → throw"**
5. (RuleConfigLoader.loadRules) **"bilinmeyen anahtar → throw (strict şema)"**
6. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"dizindeki cihaz config'lerinden katalog üretir"**
7. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"bozuk cihaz dosyası atlanır (best-effort)"**
8. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"dizin yoksa boş katalog"**
9. (RuleConfigLoader.loadRules > RuleConfigLoader.loadCatalog) **"type alanı olmayan cihaz da kataloga girer (type undefined)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/rule-evaluator.test.ts` (21 test)

1. (RuleEvaluator) **"yükselen kenarda bir kez döner; aktifken tekrarlamaz"**
2. (RuleEvaluator) **"düşüş sonrası yeniden yükseliş yeni kenardır (cooldown yoksa ateşler)"**
3. (RuleEvaluator) **"debounce: süre dolmadan aktifleşme olmaz; dolunca ateşler"**
4. (RuleEvaluator) **"per-condition debounce: hızlı kademe yavaş kademeyi BEKLEMEZ (REV03 K-A1)"**
5. (RuleEvaluator) **"debounce sırasında düşüş sayaç sıfırlar — yeniden tam süre gerekir"**
6. (RuleEvaluator) **"cooldown içinde yeni kenar bastırılır; sonrası ateşler"**
7. (RuleEvaluator) **"when.any: bir koşul sağlansa yeterli"**
8. (RuleEvaluator) **"when.all: bir koşul false ise ateşleme yok"**
9. (RuleEvaluator) **"enabled: false kural hiç ateşlemez"**
10. (RuleEvaluator) **"device seçicisi hedef dışındaki cihaz değerini yok sayar"**
11. (RuleEvaluator) **"koşul hedef sette en az bir cihazda sağlanırsa TRUE"**
12. (RuleEvaluator) **"veri yok → koşul FALSE (bayat veriyle asla tetiklenmez)"**
13. (RuleEvaluator) **"sayısal op string değerde false (karşılaştırma yapılmaz)"**
14. (RuleEvaluator) **"eq sayısal eşitlikte çalışır"**
15. (RuleEvaluator) **"aynı snapshot ile ikinci çağrı boş döner (tekrarlı tick güvenliği)"**
16. (RuleEvaluator) **"bağımsız kurallar aynı cycle'da birlikte döner"**
17. (RuleEvaluator) **"gte/lt/lte/neq operatorleri"**
18. (RuleEvaluator > RuleEvaluator — A2 abs operatörleri) **"abs_gt/abs_gte işaretli değerde büyüklük eşiğini uygular"**
19. (RuleEvaluator > RuleEvaluator — A2 abs operatörleri > RuleEvaluator — armAfterFalse (NEW-7)) **"başlangıçta koşul zaten TRUE ise ateşlemez"**
20. (RuleEvaluator > RuleEvaluator — A2 abs operatörleri > RuleEvaluator — armAfterFalse (NEW-7)) **"boş snapshot kuralı KURMAZ; değer gelip TRUE ise yine ateşlemez"**
21. (RuleEvaluator > RuleEvaluator — A2 abs operatörleri > RuleEvaluator — armAfterFalse (NEW-7)) **"gerçek FALSE görüldükten sonraki yükselen kenarda ateşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/management-service/src/v2-rules.test.ts` (6 test)

1. (v2/dev container kuralları (F2.6)) **"fail-fast yüklenir (47 kural)"**
2. (v2/dev container kuralları (F2.6)) **"tms_overheat_protect: OTW 49 (5 s) / OTF1 58 (5 s)"**
3. (v2/dev container kuralları (F2.6)) **"tms_overcold_protect: UTW 0 / UTF1 −10"**
4. (v2/dev container kuralları (F2.6)) **"tms_humidity_alarm: 75 %RH"**
5. (v2/dev container kuralları (F2.6)) **"bsc_over_soc / bsc_over_offline_rack: BSC güç komutu İÇERMEZ (yalnız log)"**
6. (v2/dev container kuralları (F2.6)) **"fire_emergency / fss_first_stage: 8 HVAC force_off + 2 BSC emergency"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/commands/execute-command-use-case.test.ts` (3 test)

1. (ExecuteCommandUseCase) **"executor'a derlenmiş seçenekleri geçirir (systems → remoteSystem)"**
2. (ExecuteCommandUseCase) **"executor reddederse hata yutulmadan yayılır"**
3. (ExecuteCommandUseCase) **"15 sn içinde terminal sonuç gelmezse 'timeout' döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/commands/operation-definitions-use-case.test.ts` (10 test)

1. (OperationDefinitionsUseCase) **"geçerli tanımı oluşturur + audit yazar"**
2. (OperationDefinitionsUseCase) **"audit fail-closed: audit hatası → persist_failed, store'a YAZILMAZ"**
3. (OperationDefinitionsUseCase) **"mevcut tanım → already_exists"**
4. (OperationDefinitionsUseCase) **"şema hatası → invalid (store'a yazılmaz)"**
5. (OperationDefinitionsUseCase) **"güncelleme + audit yazılır"**
6. (OperationDefinitionsUseCase) **"güncellemede ad uyuşmazlığı → invalid (store'a yazılmaz)"**
7. (OperationDefinitionsUseCase) **"güncelleme audit fail-closed: audit hatası → persist_failed, store'a YAZILMAZ"**
8. (OperationDefinitionsUseCase) **"devre dışı bırakma → deleted + audit"**
9. (OperationDefinitionsUseCase) **"devre dışı bırakmada bulunamayan kayıt → not_found"**
10. (OperationDefinitionsUseCase) **"devre dışı bırakma audit fail-closed: audit hatası → persist_failed, store'a YAZILMAZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/telemetry/get-container-telemetry-use-case.test.ts` (4 test)

1. (GetContainerTelemetryUseCase) **"latestSnapshot tüm konteyner kimliklerini anahtarlar"**
2. (GetContainerTelemetryUseCase) **"downsampled portun allHistorical'ine delege eder"**
3. (GetContainerTelemetryUseCase) **"historical yoksa boş dizi döner"**
4. (GetContainerTelemetryUseCase) **"knownContainerIds porttan gelir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/telemetry/get-field-containers-use-case.test.ts` (4 test)

1. (GetFieldContainersUseCase) **"taze snapshot doluysa onu kullanır; lastSeenAt ISO döner"**
2. (GetFieldContainersUseCase) **"taze snapshot boşsa cache'teki son değere düşer"**
3. (GetFieldContainersUseCase) **"bir konteynerin hatası diğerlerini engellemez"**
4. (GetFieldContainersUseCase) **"executeCached dış sorgu yapmaz (özet ekranı)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/change-password-use-case.test.ts` (4 test)

1. (ChangePasswordUseCase (T1.6)) **"kullanıcı yoksa fail"**
2. (ChangePasswordUseCase (T1.6)) **"eski şifre yanlışsa fail — hash değişmez"**
3. (ChangePasswordUseCase (T1.6)) **"yeni şifre eskiyle aynıysa fail"**
4. (ChangePasswordUseCase (T1.6)) **"başarı — hash + bayrak düşürme + yeni token'lar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/login-use-case.test.ts` (16 test)

1. (LoginUseCase) **"returns tokens and user on successful login"**
2. (LoginUseCase) **"fails when user is not found"**
3. (LoginUseCase) **"fails when password hash is missing"**
4. (LoginUseCase) **"fails when password does not match"**
5. (LoginUseCase) **"stores refresh token on success"**
6. (LoginUseCase) **"passes the user to signAccess and signRefresh"**
7. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"başarısız giriş security kanalında login_failed loglar — password YOK"**
8. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"bilinmeyen kullanıcı da security login_failed loglar"**
9. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"başarılı giriş audit kanalında login_succeeded loglar"**
10. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"fail-closed: audit sink kapalıyken geçerli giriş REDDEDİLİR"**
11. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed)) **"fail-closed: başarısız girişte log hatası crash etmez — yanıt yine başarısız"**
12. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış) **"MFA aktif kullanıcıda access/refresh ÜRETİLMEZ — mfaRequired + mfaToken döner"**
13. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış) **"MFA kapalı kullanıcıda normal token akışı korunur"**
14. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış > T6.6 — hesap kilidi) **"kilitli hesapta DOĞRU şifre de reddedilir"**
15. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış > T6.6 — hesap kilidi) **"eşik geçişinde login_locked security logu atılır (tek sefer)"**
16. (LoginUseCase > T0.11 — login güvenlik logu (K0.3 fail-closed) > T6.1 — MFA gerekli akış > T6.6 — hesap kilidi) **"başarılı girişte sayaç temizlenir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/mfa-enroll-use-case.test.ts` (9 test)

1. (MfaEnrollUseCase.enroll (T6.1)) **"sır üretir, saklar ve otpauth URI döner"**
2. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"doğru kod: MFA aktifleşir, 10 kurtarma kodu döner, hash'ler saklanır"**
3. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"yanlış kod: fail + mfa_login_failed logu; enableMfa ÇAĞRILMAZ"**
4. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"fail-closed: mfa_enrolled audit logu yazılamazsa MFA AÇILMAZ"**
5. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"kayıt yoksa (sır yok) fail"**
6. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"T1.6: kilitli kullanıcıda kod DENENMEZ (confirm — brute-force koruması)"**
7. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1)) **"T1.6: yanlış kod throttle sayacını artırır"**
8. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1) > MfaEnrollUseCase.reset (T6.1)) **"MFA'yı düşürür + mfa_reset audit logu"**
9. (MfaEnrollUseCase.enroll (T6.1) > MfaEnrollUseCase.confirm (T6.1) > MfaEnrollUseCase.reset (T6.1)) **"fail-closed: audit logu yazılamazsa reset YAPILMAZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/mfa-login-use-case.test.ts` (9 test)

1. (MfaLoginUseCase (T6.1)) **"geçerli TOTP kodu ile token üretir"**
2. (MfaLoginUseCase (T6.1)) **"mfa token geçersizse fail — TOTP denenmez"**
3. (MfaLoginUseCase (T6.1)) **"TOTP geçersizse kurtarma kodu dener; başarılı kurtarma yanar"**
4. (MfaLoginUseCase (T6.1)) **"TOTP + kurtarma ikisi de geçersiz → fail + mfa_login_failed security logu"**
5. (MfaLoginUseCase (T6.1)) **"kullanıcıda TOTP sırrı yoksa fail (MFA pasif)"**
6. (MfaLoginUseCase (T6.1)) **"T1.6: kilitli kullanıcıda TOTP/kurtarma DENENMEZ (brute-force koruması)"**
7. (MfaLoginUseCase (T6.1)) **"T1.6: başarısız kod throttle sayacını artırır"**
8. (MfaLoginUseCase (T6.1)) **"T1.6: başarılı doğrulama sayacı temizler (recordSuccess)"**
9. (MfaLoginUseCase (T6.1)) **"T1.6: throttle hatası fail-closed (doğrulama reddedilir)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/refresh-token-use-case.test.ts` (5 test)

1. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"verifyRefresh BAŞARISIZ → err; reuse tespiti YAPILMAZ (repo'ya hiç dokunulmaz)"**
2. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"imza geçerli + hash DB'de YOK → K5 reuse: clearRefreshToken(sub) + err"**
3. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"hash DB'de VAR ama kullanıcı eşleşmiyor → reuse yolu (clearRefreshToken)"**
4. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"başarılı refresh → yeni çift üretilir + storeRefreshToken yeni token ile (rotasyon)"**
5. (RefreshTokenUseCase (K4 + K5 — 2026-09-23)) **"rotasyon sonrası eski token yeniden sunulursa → reuse → iptal (K4+K5 birlikte)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/application/use-cases/user-use-cases.test.ts` (4 test)

1. (DeleteUserUseCase) **"deletes user when id is different from current user"**
2. (DeleteUserUseCase) **"fails when trying to delete self"**
3. (DeleteUserUseCase > CreateUserUseCase) **"creates user when username is available"**
4. (DeleteUserUseCase > CreateUserUseCase) **"fails when username already exists"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/config/default.test.ts` (18 test)

1. (seedUsers (T1.6 + 2026-08-30)) **"container tier: dev default'ları + admin/boss mustChangePassword true, guest FALSE (otomatik guest)"**
2. (seedUsers (T1.6 + 2026-08-30)) **"site tier: SEED_*_PASSWORD yoksa fırlatır (fail-fast)"**
3. (seedUsers (T1.6 + 2026-08-30)) **"site tier: env şifreleri kullanılır; guest bayrağı false kalır"**
4. (seedUsers (T1.6 + 2026-08-30)) **"site tier: 8 karakterden kısa env değeri de fırlatır"**
5. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6)) **"site tier + dev secret → fırlatır"**
6. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6)) **"site tier + geçerli secret → ok"**
7. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6)) **"container tier + dev secret → ok (dev ortamı)"**
8. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env)) **"site tier + geçerli UUID → config döner"**
9. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env)) **"site tier + FIELD_ID yoksa fail-fast fırlatır"**
10. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env)) **"site tier + geçersiz UUID fail-fast fırlatır"**
11. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env)) **"site tier + FIELD_NAME env'den isim alır"**
12. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env)) **"container tier → undefined (FIELD_ID opsiyonel)"**
13. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env)) **"boss tier → undefined (çok saha ileride)"**
14. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"site tier varsayılan: admin,teknik"**
15. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"MFA_ENABLED=false → [] (debug)"**
16. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"MFA_ENABLED=false + AUTH_MFA_REQUIRED_ROLES dolu → yine [] (bayrak öncelikli)"**
17. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"AUTH_MFA_REQUIRED_ROLES boş string → []"**
18. (seedUsers (T1.6 + 2026-08-30) > authConfig (T1.6) > siteFieldConfig (FIELD_ID env) > mfaRequiredRoles (MFA_ENABLED flag)) **"container tier her zaman []"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/bun-password-hasher.test.ts` (4 test)

1. (BunPasswordHasher @nis2-security) **"hash Bun.password.hash'e delege eder"**
2. (BunPasswordHasher @nis2-security) **"verify Bun.password.verify'e delege eder — true sonucu aynen döner"**
3. (BunPasswordHasher @nis2-security) **"verify false sonucu false döner"**
4. (BunPasswordHasher @nis2-security) **"verify THROW ederse false döner (kontrat — login 500 koruması)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/jose-token-signer.test.ts` (4 test)

1. (JoseTokenSigner) **"sign → verify round-trip: payload korunur"**
2. (JoseTokenSigner) **"farklı secret ile doğrulanan token reddedilir"**
3. (JoseTokenSigner) **"bozuk token undefined döner (throw yok)"**
4. (JoseTokenSigner) **"süresi dolmuş token reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/otplib-totp-service.test.ts` (7 test)

1. (OtpLibTotpService.generateSecret (T6.1)) **"her çağrıda yeni bir sır döner (base32)"**
2. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1)) **"otpauth://totp URI'si issuer ve kullanıcıyı taşır"**
3. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"RFC 6238 vektörü: T=59 → 94287082 (6 haneli: 287082) geçerli"**
4. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"pencere içi komşu adımlar geçerlidir (±30 sn)"**
5. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"pencere dışı reddedilir"**
6. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"yanlış kod reddedilir"**
7. (OtpLibTotpService.generateSecret (T6.1) > OtpLibTotpService.otpauthUri (T6.1) > OtpLibTotpService.isCodeValid (T6.1)) **"sayısal olmayan/boş kod throw etmez — false döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/redis-login-throttle.test.ts` (5 test)

1. (RedisLoginThrottle (T6.6) @nis2-security) **"ilk başarısız giriş: sayaç penceresi kurulur, kilit YOK"**
2. (RedisLoginThrottle (T6.6) @nis2-security) **"eşik aşılınca kilit kurulur (SET + EX — EXPIRE var olmayan anahtarı yaratmaz)"**
3. (RedisLoginThrottle (T6.6) @nis2-security) **"recordSuccess sayaç ve kilidi temizler"**
4. (RedisLoginThrottle (T6.6) @nis2-security) **"isLocked mevcut kilit anahtarını okur"**
5. (RedisLoginThrottle (T6.6) @nis2-security) **"Redis hatası fırlatılır (fail-open YOK)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/redis-totp-throttle.test.ts` (5 test)

1. (RedisTotpThrottle (T1.6) @nis2-security) **"ilk başarısız deneme: sayaç penceresi kurulur, kilit YOK"**
2. (RedisTotpThrottle (T1.6) @nis2-security) **"eşik aşılınca kilit kurulur (SET + EX)"**
3. (RedisTotpThrottle (T1.6) @nis2-security) **"recordSuccess sayaç ve kilidi temizler"**
4. (RedisTotpThrottle (T1.6) @nis2-security) **"isLocked mevcut kilit anahtarını okur"**
5. (RedisTotpThrottle (T1.6) @nis2-security) **"Redis hatası fırlatılır (fail-open YOK)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/service-token.test.ts` (3 test)

1. (sha256Hex (Faz 1)) **"bilinen vektörü üretir (RFC 6234: abc)"**
2. (sha256Hex (Faz 1)) **"deterministik ve 64 hex karakterdir"**
3. (sha256Hex (Faz 1)) **"farklı girdiler farklı özet üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/auth/token-adapter.test.ts` (16 test)

1. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"signAccess → verifyAccess round-trip kimliği korur"**
2. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"verifyAccess başarısız token'da fırlatır"**
3. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"refresh token'ı access olarak doğrulanamaz"**
4. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"verifyAccess fieldIds döndürür (T1.3)"**
5. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"fieldIds'siz kullanıcıda alan undefined/boş kalır"**
6. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"verifyRefresh jti/sub döner"**
7. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: mfaEnabled claim'i round-trip korunur"**
8. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: signMfa → verifyMfa sub döner; access olarak KULLANILAMAZ"**
9. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: access token mfa olarak doğrulanamaz"**
10. (token-adapter karakterizasyon (mevcut davranış) @nis2-security) **"T6.1: bozuk mfa token fırlatır"**
11. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"süresi dolmuş (exp geçmiş) access token reddedilir"**
12. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"YANLIŞ secret ile imzalanmış GEÇERLİ biçimli JWT reddedilir (sahte imza)"**
13. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"alg:none token reddedilir (algoritma karıştırma)"**
14. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"HS512 ile imzalanmış token HS256 doğrulamasında reddedilir"**
15. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"mustChangePassword claim'i sign→verify round-trip korunur (rbac güvenir)"**
16. (token-adapter karakterizasyon (mevcut davranış) @nis2-security > token-adapter güvenlik ekleri (2026-08-30 — T1.2)) **"süresi dolmuş refresh token reddedilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/commands/command-channel.test.ts` (9 test)

1. (CommandChannel) **"execute: isimli komut job üretir + executeAndWait; sonuç ok"**
2. (CommandChannel) **"execute: çözümleme hatası (bilinmeyen komut) → fail — throw YOK"**
3. (CommandChannel) **"execute: ham telemetries fallback'i (komutsuz adım)"**
4. (CommandChannel) **"execute: kuyruk hatası → fail sonucu (throw YOK — kademeli)"**
5. (CommandChannel) **"execute: executeAndWait success=false → fail + reason taşınır"**
6. (CommandChannel) **"schedule: stop komutu builder'dan çözülür + addJob delay"**
7. (CommandChannel) **"schedule: bilinmeyen komut → THROW (best-effort çağıran audit'ler)"**
8. (CommandChannel > DeviceRegistryTargets) **"resolveAvailable: tipe göre filtreler"**
9. (CommandChannel > DeviceRegistryTargets) **"filterAvailable: online kesişimi (sıra korunur)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/commands/load-maneuver-records.test.ts` (4 test)

1. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"demo dosyaları yokken yalnız mevcut katalog yüklenir (AK-10.7)"**
2. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"demo dosyaları mevcutsa eklemeli birleştirir (AK-10.1)"**
3. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"bozuk demo dosyası fail-fast fırlatır"**
4. (loadTierManeuverRecords (SPEC T-41 / FR-10.1)) **"hiçbir dosya yoksa boş döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/hub-tunnel/hub-consumer-client.test.ts` (4 test)

1. (HubConsumerClient) **"AK-1.1: peers() tipli liste döner + auth başlığı taşır"**
2. (HubConsumerClient) **"openSession POST /sessions"**
3. (HubConsumerClient) **"access programatik erişim URL'i kurar"**
4. (HubConsumerClient) **"ok olmayan yanıt HubConsumerError fırlatır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/hub-tunnel/plugin.test.ts` (2 test)

1. (hubTunnelPlugin) **"iki config alanıyla takılır ve hubTunnel decorator'ını sunar"**
2. (hubTunnelPlugin) **"decorator enjekte edilen fetch ile çalışır (app-agnostik)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/interlock/demo-earthing-interlock.spec.ts` (4 test)

1. (DemoEarthingInterlock + OperationExecutor (UC-10)) **"AK-10.2: H05 toprak kapalı → charge reddedilir (interlock_earthed)"**
2. (DemoEarthingInterlock + OperationExecutor (UC-10)) **"AK-10.3: toprak açık → charge completed"**
3. (DemoEarthingInterlock + OperationExecutor (UC-10)) **"toprak kapalı ama adım şarj/deşarj değil → izin (stop)"**
4. (DemoEarthingInterlock + OperationExecutor (UC-10)) **"MV telemetrisi okunamazsa nötr (izin) — kademeli"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/device-registry.test.ts` (3 test)

1. (DeviceRegistry — refresh TTL cache) **"ttl içindeki ardışık refresh tek sorgu yapar"**
2. (DeviceRegistry — refresh TTL cache) **"force=true ttl'i atlar"**
3. (DeviceRegistry — refresh TTL cache) **"online() önbellekten döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/log-event-feed.test.ts` (1 test)

1. (LogEventFeed (adapter)) **"whitelist+after+limit ile sorgular ve satırı port tipine eşler"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/log-repository.test.ts` (4 test)

1. (LogRepository (A1)) **"initialize hem system_logs hem log_events DDL'ini oluşturur"**
2. (LogRepository (A1)) **"query UNION üretir — iki kaynağı birleştirir"**
3. (LogRepository (A1)) **"query filtreleri UNION dışına uygulanır"**
4. (LogRepository (A1)) **"insert system_logs'a yazar (client olayları — geçiş)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/operation-def-store.test.ts` (6 test)

1. (OperationDefStore) **"initialize DDL oluşturur (operation_defs)"**
2. (OperationDefStore) **"create: (kind, name) varsa THROW — rota 409 üretir"**
3. (OperationDefStore) **"create: yoksa INSERT eder (enabled TRUE)"**
4. (OperationDefStore) **"update: upsert (ON CONFLICT DO UPDATE)"**
5. (OperationDefStore) **"setEnabled: yoksa THROW; varsa UPDATE (soft)"**
6. (OperationDefStore) **"findByKindAndName: satır eşlenir; yoksa undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/operation-run-store.test.ts` (6 test)

1. (OperationRunStore) **"initialize DDL oluşturur (operation_runs + indeksler)"**
2. (OperationRunStore) **"begin: running INSERT — parametreler birebir"**
3. (OperationRunStore) **"begin: DB hatası THROW eder (fail-closed — yürütücü reddeder)"**
4. (OperationRunStore) **"finish: terminal durum UPDATE — params birebir; hata throw"**
5. (OperationRunStore) **"findById: satır eşlenir; yoksa undefined"**
6. (OperationRunStore) **"listRecent: started_at DESC limit; boş liste"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/site-field-seed.test.ts` (2 test)

1. (ensureSiteField) **"FIELD_ID + isim ile UPSERT çalıştırır (ON CONFLICT DO NOTHING)"**
2. (ensureSiteField) **"boş isim yerine varsayılan kullanılmaz — config'in sorumluluğu"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/persistence/user-repository.test.ts` (12 test)

1. (UserRepository (developer rolü migration — 2026-08-30)) **"initialize users DDL'ini oluşturur (developer CHECK dahil)"**
2. (UserRepository (developer rolü migration — 2026-08-30)) **"initialize eski kurulumlar için role CHECK constraint'ini yeniler (idempotent)"**
3. (UserRepository (developer rolü migration — 2026-08-30)) **"create satırı döndürür; satır gelmezse hata fırlatır"**
4. (UserRepository (developer rolü migration — 2026-08-30)) **"findById yoksa undefined döner"**
5. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"totpSecretByUserId: satır yok/null ise undefined"**
6. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"setTotpSecret: yeni sır yazılırken mfa_enabled FALSE'a düşer (yeniden kayıt sözleşmesi)"**
7. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"enableMfa satır döndürür; satır yoksa hata fırlatır"**
8. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"disableMfa: mfa_enabled FALSE + sır NULL + kurtarma kodları silinir; satır yoksa hata"**
9. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"storeRecoveryCodes: önce tüm eski kodlar silinir, sonra her hash INSERT edilir"**
10. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)) **"consumeRecoveryCode: kullanılmamış kod 1 satır etkiler → true; kullanılmış → false (tek kullanımlık SQL koşulu)"**
11. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu) > UserRepository refresh token hash (K4 — 2026-09-23)) **"storeRefreshToken DB'ye SHA-256 hash yazar — düz metin DEĞİL (AK-4.1)"**
12. (UserRepository (developer rolü migration — 2026-08-30) > UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu) > UserRepository refresh token hash (K4 — 2026-09-23)) **"findByRefreshToken gelen token'ı hash'leyip eşleştirir (AK-4.1)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/realtime/realtime-manager.test.ts` (11 test)

1. (RealtimeManager (Faz 5.1 B1)) **"büyük parti (isim sayısı > RING_BUFFER_MAX) tamamen korunur — B1 regresyonu"**
2. (RealtimeManager (Faz 5.1 B1)) **"küçük partiler RING_BUFFER_MAX'ta kesilir (geçmiş korunur)"**
3. (RealtimeManager (Faz 5.1 B1)) **"tek kayıt writeToRingBuffer trim sınırında kalır"**
4. (RealtimeManager (Faz 5.1 B1)) **"ringBuffer en-yeni-önce sıralı JSON nesneleri döner"**
5. (RealtimeManager (Faz 5.1 B1)) **"ringBuffer bozuk JSON'u ham string olarak döndürür"**
6. (RealtimeManager (Faz 5.1 B1)) **"broadcast yalnızca OPEN soketlere JSON gönderir"**
7. (RealtimeManager (Faz 5.1 B1)) **"subscribe/unsubscribe abone defterini tutarlı tutar"**
8. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"names ile broadcast yalnız istenen isimleri yollar"**
9. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"names yoksa tüm satırlar gider (geriye uyumlu)"**
10. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"eşleşen isim yoksa gönderim atlanır"**
11. (RealtimeManager (Faz 5.1 B1) > RealtimeManager — isim filtresi (panel spec)) **"sendInitialData yalnız istenen isimlerin en yenisini yollar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/infrastructure/realtime/ws-routes.test.ts` (7 test)

1. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"token'sız handshake 401 ile reddedilir"**
2. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"geçersiz token 401 ile reddedilir"**
3. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"geçerli access token bağlanır; subscribe → subscribed + initial data"**
4. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"agent imzalı oturum token'ı kabul edilir"**
5. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"unsubscribe → unsubscribed karşılığı döner"**
6. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"malform JSON mesajı error tipi yanıt üretir (bağlantı kopmaz)"**
7. (ws-routes /ws/telemetry (T1.5) @nis2-security) **"kapanışta realtime.unsubscribeAll çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/error-handler.test.ts` (7 test)

1. (error-handler (T0.6) > DomainError eşlemesi) **"${c.name} → ${c.status}"**
2. (error-handler (T0.6) > DomainError eşlemesi) **"ZodError → 400 (mevcut davranış korunur)"**
3. (error-handler (T0.6) > DomainError eşlemesi) **"bilinmeyen hata → 500 genel mesaj — stack sızmaz"**
4. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"beklenen hata app kanalında warn ile loglanır"**
5. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"unauthorized güvenlik kanalında loglanır"**
6. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"beklenmeyen hata app kanalında error ile loglanır"**
7. (error-handler (T0.6) > DomainError eşlemesi > sınır logu — bir kez) **"log() hatası istemciye yansımaz (yanıt yine de gönderilir)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/log-rate-limiter.test.ts` (4 test)

1. (LogRateLimiter (T0.8)) **"limit altında izin verir"**
2. (LogRateLimiter (T0.8)) **"limit aşılınca reddeder"**
3. (LogRateLimiter (T0.8)) **"farklı anahtarlar birbirini etkilemez"**
4. (LogRateLimiter (T0.8)) **"pencere dolunca sıfırlanır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/rbac.test.ts` (40 test)

1. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"PUBLIC_PREFIXES JWT'siz geçer"**
2. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"Bearer yoksa 401"**
3. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"geçersiz token → 401"**
4. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/auth/users yalnızca admin'e açık — teknik 403"**
5. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/auth/users admin için açık"**
6. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: /api/fields guest için AÇIK (saha dashboard salt-okunur)"**
7. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: /api/fields developer için AÇIK"**
8. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/fields boss için açık"**
9. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/admin/fields izin satırı kaldırıldı (2026-08-28) — rbac serbest, uç yok (404)"**
10. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"/api/data/ beş role de açık (guest + developer dahil)"**
11. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: developer /api/commands için KAPALI (403) — salt-okunur rol"**
12. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-30: developer /api/auth/users için KAPALI (403)"**
13. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/commands guest için KAPALI (403) — delik kapatıldı"**
14. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/commands teknik için AÇIK"**
15. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/commands admin için AÇIK"**
16. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"2026-08-28: /api/fields mutasyon izin satırı kaldırıldı — rbac 403 ÜRETMEZ (uçlar kaldırıldı, gerçek sistemde 404)"**
17. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"T1.4: /api/fields GET teknik için AÇIK (okuma korunur)"**
18. (rbac karakterizasyon (mevcut davranış) @nis2-security) **"izinsiz yol (tabloda yok) doğrulanmış kullanıcıya açıktır"**
19. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"geçerli container_session cookie'si Bearer'sız erişir"**
20. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"sessionCookieName: field_session — boss field oturumu Bearer'sız erişir"**
21. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"field tünel yolları JWT'siz erişilir (cookie doğrulama route'ta — Boss Faz 3)"**
22. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"geçersiz oturum cookie'si → 401 (fail-closed)"**
23. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"oturum kullanıcısına rol izinleri uygulanır (guest → komut 403)"**
24. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"oturum kullanıcısında mustChangePassword uygulanmaz"**
25. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"2026-08-30: guest mustChangePassword enforcement'ından MUAFTIR (otomatik misafir girişi)"**
26. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"mustChangePassword olan teknik 403 alır (T1.6 korunur)"**
27. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"cookie yoksa Bearer akışı korunur"**
28. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"T3.3: /api/fields/ POST (session) teknik'e açık; 2026-08-30: guest/developer da AÇIK (birebir tünel eşlemesi)"**
29. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları)) **"tünel yolları PUBLIC'dir (cookie auth route katmanında)"**
30. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"MFA kaydı olmayan admin veri uçlarına 403 alır (MFA kaydi gerekli)"**
31. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"MFA allowlist yolları (enroll/confirm/logout/session) açık kalır"**
32. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"MFA kayıtlı admin (mfaEnabled=true) veri uçlarına girer"**
33. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"zorunlu liste dışındaki roller etkilenmez (boss/guest)"**
34. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement)) **"mfaRequiredRoles boşsa enforcement KAPALI (container tier davranışı)"**
35. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"session kullanıcısında MFA enforcement UYGULANMAZ (pinleme — regresyon koruması)"**
36. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"PUBLIC_PREFIX segment sınırı: benzer ama farklı yollar JWT'siz 401 döner"**
37. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"PUBLIC yollar query param'la da geçer (401 DEĞİL — rota yoksa 404)"**
38. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"mustChangePassword + MFA zorunluluğu birlikte: ÖNCE şifre değişimi 403 döner (öncelik pinleme)"**
39. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"session yolu method eşleşmezse rbac serbesttir (uç yoksa 404 — pinleme)"**
40. (rbac karakterizasyon (mevcut davranış) @nis2-security > rbac Faz 3 (oturum auth + tünel yolları) > rbac Faz 6 T6.1 (MFA enrollment enforcement) > rbac sınır durumları (2026-08-30 — T1.4)) **"developer MFA zorunlu listesinde değilse enforcement'dan etkilenmez"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/middleware/request-context.test.ts` (9 test)

1. (RequestContext (T0.6)) **"run içinde current() id'yi döner"**
2. (RequestContext (T0.6)) **"run dışında current() undefined döner"**
3. (RequestContext (T0.6)) **"run dönüş değerini aynen iletir"**
4. (RequestContext (T0.6)) **"run async fn'i destekler"**
5. (RequestContext (T0.6)) **"iç içe run içteki id'yi kullanır, dışarıda dıştaki geçerli kalır"**
6. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"başlık yoksa id üretir, yanıta yazar ve bağlama kurar"**
7. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"gelen X-Request-Id başlığını kullanır ve yankılar"**
8. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"boş başlık üretilmiş id ile değiştirilir"**
9. (RequestContext (T0.6) > createRequestIdHook (T0.6)) **"üretim fonksiyonu yoksa UUID formatı üretir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/alarm-routes.test.ts` (8 test)

1. (alarm-routes (Faz 0 eki)) **"GET /alarms — aktif + kapananlar birleşik döner"**
2. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — teknik: audit log + DB güncellemesi"**
3. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — not audit context'ine yazılır"**
4. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — admin de çözebilir"**
5. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — guest 403"**
6. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — aktif olmayan alarm 409"**
7. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — audit log fail-closed: yazılamazsa 500 + DB'ye GİDİLMEZ"**
8. (alarm-routes (Faz 0 eki)) **"POST /alarms/resolve — eksik gövde 400"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/auth-routes.test.ts` (31 test)

1. (Auth Routes (Fastify integration) > POST /login) **"returns 200 with tokens on valid credentials"**
2. (Auth Routes (Fastify integration) > POST /login) **"returns 400 when username is empty"**
3. (Auth Routes (Fastify integration) > POST /login) **"returns 400 when password is empty"**
4. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"returns 200 with new tokens"**
5. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"returns 401 when refresh token is invalid"**
6. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"K5: imza geçerli + DB'de yok → 401 + clearRefreshToken (reuse tespiti)"**
7. (Auth Routes (Fastify integration) > POST /login > POST /refresh) **"returns 400 when refreshToken is empty"**
8. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users) **"returns 200 with user list"**
9. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id) **"returns 200 with user by id"**
10. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id) **"returns 404 when user not found"**
11. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"returns 201 on successful create"**
12. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"returns 400 when role is invalid"**
13. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"2026-08-30: developer rolü GEÇERLİDİR (201)"**
14. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users) **"returns 400 when password is too short"**
15. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id) **"returns 200 on successful delete"**
16. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout) **"route is registered"**
17. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6)) **"geçerli istek → 200 + yeni token'lar"**
18. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6)) **"kısa yeni şifre → 400 (zod)"**
19. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6)) **"yanlış eski şifre → 400"**
20. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4)) **"kimlik çözülmüşse kullanıcı + tunnel bayrağı döner (cookie yok → false)"**
21. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4)) **"container_session cookie'si varsa tunnel true"**
22. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4)) **"kimlik çözülmemişse 401"**
23. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — başarılı akışta 200 + token döner"**
24. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — use case fail → 401"**
25. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — T1.6: TOTP deneme kilidi → 429"**
26. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /login/mfa — bozuk gövde → 400"**
27. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/enroll — 200 + secret/uri döner"**
28. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/confirm — 200 + kurtarma kodları döner"**
29. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/reset — admin değilse 403; admin ise 200"**
30. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"POST /mfa/reset — userId yoksa 400"**
31. (Auth Routes (Fastify integration) > POST /login > POST /refresh > GET /users > GET /users/:id > POST /users > DELETE /users/:id > POST /logout > POST /change-password (T1.6) > GET /session (T4.4) > Auth Routes — Faz 6 T6.1 (MFA uçları)) **"T6.6: login kilitli hesap → 429"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/command-routes.test.ts` (18 test)

1. (command-routes (T0.6)) **"POST /execute — geçersiz gövde → 400 (zod)"**
2. (command-routes (T0.6)) **"POST /execute — bilinmeyen cihaz → 404"**
3. (command-routes (T0.6)) **"POST /execute — zorunlu param eksik → 400"**
4. (command-routes (T0.6)) **"POST /execute — başarılı → 200"**
5. (command-routes (T0.6)) **"POST /execute — mq başarısız → 422"**
6. (command-routes (T0.6)) **"POST /execute-multi — parallel başarılı → 200"**
7. (command-routes (T0.6)) **"POST /execute-multi — onFailure=stop sequential ilk hatada durur"**
8. (command-routes (T0.6)) **"GET /:deviceId/commands — config yoksa boş liste"**
9. (command-routes (T0.6)) **"GET /:deviceId/commands → 200 {commands}"**
10. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"başarılı adımda stop job'ı delay ile planlanır + timer_scheduled audit"**
11. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"timer.stopCommand özel komutu çözümlenir"**
12. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"komut BAŞARISIZSA planlama YAPILMAZ"**
13. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"logger yoksa console bilgi çıktısı (geriye uyumlu)"**
14. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı)) **"planlama hatası → timer_schedule_failed audit"**
15. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı) > command-routes — Modbus yazma izi (İş 1)) **"başarılı komut → tabloya adres+değer yazılır"**
16. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı) > command-routes — Modbus yazma izi (İş 1)) **"başarısız komut → success=false satırı"**
17. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı) > command-routes — Modbus yazma izi (İş 1)) **"GET /writes → depodan liste"**
18. (command-routes (T0.6) > zamanlı stop planlama (REV.03 §10 — timer alanı) > command-routes — Modbus yazma izi (İş 1)) **"depo yoksa /writes boş döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/data-routes.test.ts` (13 test)

1. (data-routes karakterizasyon (mevcut davranış)) **"GET /devices → 200 {devices}"**
2. (data-routes karakterizasyon (mevcut davranış)) **"GET /devices — hata → 500 genel mesaj"**
3. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/latest → 200 {telemetries}"**
4. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/range — from/to yoksa 400"**
5. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/range → 200 {telemetries}"**
6. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/downsampled — from/to yoksa 400"**
7. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/aggregate — fn geçersizse 400"**
8. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/aggregate → 200 {buckets}"**
9. (data-routes karakterizasyon (mevcut davranış)) **"GET /:deviceId/aggregate — hata → 500"**
10. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"geçersiz tags JSON → ValidationError → 400 (önceki davranış: 500)"**
11. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"geçerli tags JSON ayrıştırılır ve sorguya iletilir"**
12. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"route içinde console hata logu yoktur — altyapı hatası sınıra ulaşır"**
13. (data-routes karakterizasyon (mevcut davranış) > data-routes T0.6 sözleşmesi (DomainError propagasyonu)) **"sınır logu altyapı hatasını request_failed olarak kaydeder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/demo-maneuver-integration.spec.ts` (2 test)

1. (demo-maneuver-integration.spec — FL-01…FL-05 zinciri (Z)) **"config FL-01…FL-05 kayıtlarını taşır"**
2. (demo-maneuver-integration.spec — FL-01…FL-05 zinciri (Z)) **"${c.name}: beklenen komutları çözer ve completed olur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/device-routes.test.ts` (2 test)

1. (device-routes (T0.6 + Faz 5.1 B3)) **"GET /devices → 200 {devices}"**
2. (device-routes (T0.6 + Faz 5.1 B3)) **"DB hatası → 200 {devices: []} (Faz 5.1 B3 — kademeli bozulma)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/event-routes.test.ts` (7 test)

1. (eventRoutes (UC-4)) **"yetkisiz istek → 403"**
2. (eventRoutes (UC-4)) **"after+limit geçirir; eventId/level/category bağlam eşlenir"**
3. (eventRoutes (UC-4)) **"after yoksa epoch; correlation yoksa seq kullanılır"**
4. (eventRoutes (UC-4)) **"geçersiz after → 400"**
5. (eventRoutes (UC-4)) **"limit 1..1000 aralığına kırpılır"**
6. (eventRoutes (UC-4)) **"iç token ile erişir (hub programatik yolu)"**
7. (eventRoutes (UC-4)) **"feed yoksa boş liste döner (kademeli)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/field-container-commands.test.ts` (10 test)

1. (field-container-commands (D3 — hub)) **"yetki yok (token/user yok) → 403; hub'a istek gitmez"**
2. (field-container-commands (D3 — hub)) **"yanlış internal token → 403 (fail-closed)"**
3. (field-container-commands (D3 — hub)) **"Bearer admin → kabul; guest → 403"**
4. (field-container-commands (D3 — hub)) **"hub access: peerId/serviceId/path + trace + system user başlıkları"**
5. (field-container-commands (D3 — hub)) **"upstream 200 → gövde aynen"**
6. (field-container-commands (D3 — hub)) **"upstream 422 → durum kodu + gövde aynen"**
7. (field-container-commands (D3 — hub)) **"audit field_container_command — traceId bağlamda"**
8. (field-container-commands (D3 — hub)) **"audit hatası akışı KESMEZ (best-effort)"**
9. (field-container-commands (D3 — hub)) **"hub erişim hatası → 502"**
10. (field-container-commands (D3 — hub)) **"x-gd-trace-id yoksa üretilir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/field-routes.test.ts` (13 test)

1. (field-routes karakterizasyon (mevcut davranış)) **"T1.3: boş fieldIds'li teknik /:fieldId/containers erişEMEZ (403)"**
2. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/summary → 200 yapı"**
3. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/containers → 200 + connectionStatus"**
4. (field-routes karakterizasyon (mevcut davranış)) **"T2.4: containers → gerçek lastSeenAt + stale durumu"**
5. (field-routes karakterizasyon (mevcut davranış)) **"T2.4: containers → lastSeenAt yoksa alan yok"**
6. (field-routes karakterizasyon (mevcut davranış)) **"T2.4: summary → gerçek lastSeenAt + stale ≠ connected"**
7. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/telemetry/latest → 200"**
8. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/telemetry/downsampled — proxy yoksa {} (kademeli)"**
9. (field-routes karakterizasyon (mevcut davranış)) **"2026-08-28: saha registry uçları KALDIRILDI — POST/PUT/DELETE 404"**
10. (field-routes karakterizasyon (mevcut davranış)) **"2026-08-28: saha listesi ucu KALDIRILDI — GET / 404"**
11. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/containers — liste hub peer'larından (containerIds) türetilir"**
12. (field-routes karakterizasyon (mevcut davranış)) **"GET /:fieldId/telemetry/latest — anahtarlar hub container id'leridir"**
13. (field-routes karakterizasyon (mevcut davranış)) **"containerProxy yoksa containers boş dizi döner"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/health-route.test.ts` (2 test)

1. (health-route (T0.10)) **"sağlıklı logger → status ok + log yansıması"**
2. (health-route (T0.10)) **"error drop sonrası → status degraded + sayaç"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/hub-session-routes.test.ts` (2 test)

1. (hub-session-routes) **"AK-4.1/T-11: oturum açar, cookie set eder, redirect döner"**
2. (hub-session-routes) **"kimlik yoksa 401"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/log-routes.test.ts` (10 test)

1. (log-routes (T0.6)) **"GET / → 200 {logs}"**
2. (log-routes (T0.6)) **"GET / — sorgu parametreleri repo'ya iletilir"**
3. (log-routes (T0.6)) **"POST / → 201"**
4. (log-routes (T0.6)) **"POST / — eksik alan → 400 (mevcut davranış korunur)"**
5. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"POST / { events: [...] } → 201 {accepted}"**
6. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"POST / events boşsa 400"**
7. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"rate-limit aşılınca 429"**
8. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"rateLimiter yoksa limitsizdir (geriye uyumlu)"**
9. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"GET / — altyapı hatası sınıra ulaşır, route console.error kullanmaz"**
10. (log-routes (T0.6) > T0.8 — batch + rate-limit) **"sınır logu altyapı hatasını correlationId ile kaydeder"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/maneuver-routes.test.ts` (19 test)

1. (maneuver/operation rotaları — yetki) **"yetki yok → 403 (tüm uçlar)"**
2. (maneuver/operation rotaları — yetki) **"Bearer admin/teknik kabul; guest 403"**
3. (maneuver/operation rotaları — yetki) **"geçerli iç token kabul; yanlış token 403 (fail-closed)"**
4. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"GET /maneuvers + /operations registry listesini döner"**
5. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"POST /maneuvers/:name/execute: executor argümanları + 200"**
6. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"UC-4: x-gd-operation-id kökeni → trigger boss:<id> + createdBy boss"**
7. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"UC-13: systems → executor'a remoteSystem olarak geçer (uzak adım hedefi)"**
8. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"HTTP eşlemesi: not_found 404 / missing_param 400 / persist 503 / failed 422"**
9. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"rolled_back → 200 (terminal durum alanıyla)"**
10. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma) **"GET /operations/runs + /runs/:id (yok → 404)"**
11. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"teknik/guest tanım YÖNETİMİNE erişemez (403) — yürütme erişebilir"**
12. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"bozuk tanım → 400 (persist anında zod — kaydedilmez)"**
13. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"mükerrer kayıt → 409; audit + persist zinciri"**
14. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"audit FAIL-CLOSED: audit yazılamazsa tanım REDDEDİLİR (§11.2)"**
15. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"PUT: isim uyuşmazlığı 400; başarılı güncelleme 200"**
16. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"DELETE: yumuşak silme (enabled=false); yoksa 404"**
17. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2)) **"operasyon tanımı: bozuk şema 400; geçerli 201"**
18. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2) > yürütme rotaları — 15 sn → 202 (KURAL-MOTORU-V2 §3.2)) **"uzun yürütme → 202 {status:running}; yürütme arka planda sürer"**
19. (maneuver/operation rotaları — yetki > manevra/operasyon rotaları — yürütme + okuma > tanım YÖNETİMİ rotaları (yalnız admin — §11.2) > yürütme rotaları — 15 sn → 202 (KURAL-MOTORU-V2 §3.2)) **"hızlı yürütme → normal sonuç (202 DEĞİL)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/notification-routes.test.ts` (5 test)

1. (notification-routes (Faz 5)) **"GET / → 200 liste"**
2. (notification-routes (Faz 5)) **"limit 500 üstü sınıra çekilir"**
3. (notification-routes (Faz 5)) **"after parametresi aktarılır (son görülme sınırı)"**
4. (notification-routes (Faz 5)) **"GET /unread-count?since → { count }"**
5. (notification-routes (Faz 5)) **"since yoksa 400"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/operation-boss-routes.test.ts` (5 test)

1. (operationBossRoutes (C2b)) **"admin → requester.send (uuid operationId + params + trace) → 200 {result}"**
2. (operationBossRoutes (C2b)) **"teknik kabul; guest/anonim 403; iç token kabul"**
3. (operationBossRoutes (C2b)) **"requester yoksa 503 (tier uyuşmazlığı)"**
4. (operationBossRoutes (C2b)) **"timeout (undefined) → 503 operation_timeout"**
5. (operationBossRoutes (C2b)) **"rejected sonuç AYNEN döner (200 + status)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/status-route.test.ts` (1 test)

1. (status-route) **"her zaman offline durum bildirir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/topology-routes.test.ts` (4 test)

1. (topology-routes) **"AK: topoloji dosyası varsa istasyon modelini döner"**
2. (topology-routes) **"dosya yoksa 404 (frontend statik fallback)"**
3. (topology-routes) **"yetkisiz istek 401"**
4. (topology-routes) **"readFieldTopology: bozuk JSON → undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/presentation/routes/unified-routes.test.ts` (23 test)

1. (unified-routes (T0.6)) **"GET /telemetry/latest → 200 {telemetries}"**
2. (unified-routes (T0.6)) **"GET /timeseries/external → 200 {points} (AK-9.2)"**
3. (unified-routes (T0.6)) **"GET /timeseries/external — eksik/geçersiz param 400 (whitelist)"**
4. (unified-routes (T0.6)) **"GET /timeseries/external — tablo yoksa boş döner (uydurma yok)"**
5. (unified-routes (T0.6)) **"GET /telemetry/latest — kısmi başarı: cihaz hatası warn + boş sonuç (allSettled korunur)"**
6. (unified-routes (T0.6)) **"GET /telemetry/downsampled — from/to yoksa 400"**
7. (unified-routes (T0.6)) **"GET /telemetry/downsampled → 200"**
8. (unified-routes (T0.6)) **"GET /telemetry/downsampled?tag=rack_id → getDownsampledData tag taşır (jenerik)"**
9. (unified-routes (T0.6)) **"GET /telemetry/downsampled — geçersiz tag anahtarı → 400"**
10. (unified-routes (T0.6)) **"GET /telemetry/:deviceId → 200 {deviceId, interval, dataPointCount, data}"**
11. (unified-routes (T0.6)) **"GET /devices/:deviceId/telemetry-config — config yoksa 404"**
12. (unified-routes (T0.6)) **"GET /devices/:deviceId/telemetry-config → 200"**
13. (unified-routes (T0.6)) **"GET /timeseries/hypertables → 200 {hypertables}"**
14. (unified-routes (T0.6)) **"GET /timeseries/hypertables/:name → 200"**
15. (unified-routes (T0.6)) **"GET /timeseries/materialized-views → 200"**
16. (unified-routes (T0.6)) **"POST /timeseries/materialized-views — hypertable yoksa 400"**
17. (unified-routes (T0.6)) **"POST /timeseries/materialized-views → 200"**
18. (unified-routes (T0.6)) **"GET /projects → 200 {projects}"**
19. (unified-routes (T0.6)) **"POST /projects → 201 {id}"**
20. (unified-routes (T0.6)) **"PUT /projects/:id → 200"**
21. (unified-routes (T0.6)) **"DELETE /projects/:id → 200 {success}"**
22. (unified-routes (T0.6)) **"altyapı hatası sınıra ulaşır — console.error yok, 500"**
23. (unified-routes (T0.6) > unified-routes — latest-per-name) **"AK: getLatestPerName pencere + names filtresiyle çağrılır"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/boss/infrastructure/field-event-collector.test.ts` (7 test)

1. (FieldEventCollector (UC-5 — HTTP pull)) **"field peer'ı keşfeder, backlog cursor'ı ile çeker ve dedupe INSERT yazar"**
2. (FieldEventCollector (UC-5 — HTTP pull)) **"whitelist dışı olay yok sayılır"**
3. (FieldEventCollector (UC-5 — HTTP pull)) **"ikinci tur cursor - 2 sn örtüşmesinden devam eder"**
4. (FieldEventCollector (UC-5 — HTTP pull)) **"peer erişilemezse tur atlanır, cursor ilerlemez"**
5. (FieldEventCollector (UC-5 — HTTP pull)) **"bağlı olmayan field peer'ı atlanır"**
6. (FieldEventCollector (UC-5 — HTTP pull)) **"demoSeed açıkken ensureSchema 3 örnek bildirim eker (idempotent)"**
7. (FieldEventCollector (UC-5 — HTTP pull)) **"demoSeed kapalıyken ensureSchema seed EKMEZ"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/boss/infrastructure/field-event-reader.test.ts` (2 test)

1. (FieldEventReader (adapter)) **"JOIN ile saha adını taşır + ISO dönüşümü"**
2. (FieldEventReader (adapter)) **"countSince sonrasını sayar"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/boss/infrastructure/operation-requester.test.ts` (8 test)

1. (OperationRequester (UC-4 — HTTP relay)) **"hub access POST'u system kimliği + köken başlıklarıyla atar; 200 sonucu eşler"**
2. (OperationRequester (UC-4 — HTTP relay)) **"200 + outcomes → results özetine dönüşür"**
3. (OperationRequester (UC-4 — HTTP relay)) **"202 (uzun koşu) → failed/still_running (terminal-only)"**
4. (OperationRequester (UC-4 — HTTP relay)) **"422 → failed + gövdedeki reason"**
5. (OperationRequester (UC-4 — HTTP relay)) **"404/403 → rejected + gövdedeki error"**
6. (OperationRequester (UC-4 — HTTP relay)) **"5xx → failed (remote_http_<status>)"**
7. (OperationRequester (UC-4 — HTTP relay)) **"ağ hatası → undefined"**
8. (OperationRequester (UC-4 — HTTP relay)) **"timeout → undefined"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/container/infrastructure/session/session-user-map.test.ts` (3 test)

1. (SessionUserMap) **"toTunnelUser yalnızca tünel alanlarını taşır"**
2. (SessionUserMap) **"toWebUser geçici oturum kullanıcısı üretir"**
3. (SessionUserMap) **"round-trip: role korunur"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/container/infrastructure/session/stateless-session-authenticator.test.ts` (4 test)

1. (StatelessSessionAuthenticator (container tier)) **"cookie'den token'ı çözer ve payload'ı User'a eşler"**
2. (StatelessSessionAuthenticator (container tier)) **"stateful değildir — aynı token yerel kayıt olmadan tekrar doğrulanır"**
3. (StatelessSessionAuthenticator (container tier)) **"cookie yok → undefined (verify çağrılmaz)"**
4. (StatelessSessionAuthenticator (container tier)) **"geçersiz token → undefined (fail-closed)"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/site/infrastructure/container-telemetry/container-connection-telemetry-publisher.test.ts` (4 test)

1. (ContainerConnectionTelemetryPublisher) **"connected → value 1 MANAGEMENT job'ı (deviceId=field)"**
2. (ContainerConnectionTelemetryPublisher) **"durum eşlemesi: idle→0, stale→2, error→0"**
3. (ContainerConnectionTelemetryPublisher) **"addJob reddi yutulur — throw YOK (best-effort)"**
4. (ContainerConnectionTelemetryPublisher) **"diğer observer callback'leri no-op"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/site/infrastructure/container-telemetry/hub-container-view.test.ts` (9 test)

1. (HubContainerView — hub relay HTTP) **"presence: connectionStatus + lastSeenAt hub keşfinden"**
2. (HubContainerView — hub relay HTTP) **"AK-1.1: latestQuery container'ın generic latest endpoint'ini çağırır"**
3. (HubContainerView — hub relay HTTP) **"AK-1.3: TTL içinde ikinci sorgu cache'ten döner"**
4. (HubContainerView — hub relay HTTP) **"AK-1.2: historical downsampled endpoint'ini pencereyle çağırır"**
5. (HubContainerView — hub relay HTTP) **"allHistorical: konteyner başına downsampled toplar (Record)"**
6. (HubContainerView — hub relay HTTP) **"allHistorical: hata alan konteyner sonuçtan düşer (kısmi başarı)"**
7. (HubContainerView — hub relay HTTP) **"AK-1.4: erişim hatasında boş dizi; son cache değeri fallback"**
8. (HubContainerView — hub relay HTTP) **"bağlı olmayan konteyner sorgusu boş döner"**
9. (HubContainerView — hub relay HTTP) **"yeniden bağlanan peer'ın cache'i geçersizleşir"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/site/infrastructure/container-telemetry/hub-ttl-cache.test.ts` (3 test)

1. (HubTtlCache) **"TTL içinde değeri döner; süre geçince get undefined"**
2. (HubTtlCache) **"peek TTL'e bakmaz (son değer fallback)"**
3. (HubTtlCache) **"delete + clear"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

### `services/web-service/src/tiers/site/infrastructure/hub-maneuver-channel.test.ts` (4 test)

1. (HubManeuverChannel) **"AK-3.1: 200 → ok; doğru yol ve gövde"**
2. (HubManeuverChannel) **"AK-3.2: 503/404 → system_unreachable"**
3. (HubManeuverChannel) **"diğer hatalar → gövdedeki reason"**
4. (HubManeuverChannel) **"ağ hatası → system_unreachable"**

[DOSYA NOTU] <kapsanmayan dallar — KAPANIŞ §B.2'ye taşınır; boşsa satır silinir>

