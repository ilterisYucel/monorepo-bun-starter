# Vendor Uyum Denetimi — Modbus config'leri ve simülatörler

> Tarih: 2026-10-23 · Kapsam: kök `configs/` + `deployment/v2/dev/*/device-configs` + `packages/simulators`
> Kaynaklar (`docs/simulators/vendor-documentation/`, repoya commit edilmez):
> - **BSC:** `20250730_Flex_BSC_Modbusmap_JF1_Rev_AF.xlsx` (B2C BSC/Rack/Flag, C2B, Sequence, Request Ack. Table) ·
>   `260119_Flex BSC_SW User Manual_RevAH_Eng.pdf` (durum tanımları ve geçişleri) ·
>   `JF1 1CP Battery Thermal Simulation_v1.0.pdf` · `260317_JF1 Cycle Test Result_v1.0.pdf`
> - **PCS:** `Wattox MPCS Series … Modbus Communication Protocol-V1.0.pdf` (A/B/C/D/S blokları, Appendix 1–3) ·
>   `Wattox PCS Control and Operation Philosophy.pdf` · ürün özellikleri (1725 kW, 1000–1500 V DC, 1807 A, 690 V AC)
> - **HVAC:** `MC90HDNC1R-L (Stop bit 2) -Modbus Protocol 20241016.pdf` (MC Series A3) · kullanım kılavuzu A1
>
> Yöntem: xlsx/PDF tabloları ayrıştırılıp config girdileriyle **programatik** karşılaştırıldı
> (adres, tablo/FC, veri tipi, ölçek, bitfield bit aralığı ve adı). Davranışlar
> (komut/Ack, durum makineleri) simülatör testleriyle sabitlendi.

---

## 1. Özet

| Cihaz | Sonuç | Yapılan değişiklik |
| :--- | :--- | :--- |
| Flex BSC (`flex-bsc.json`, 480 telemetri + 153 bitfield) | ✅ Rev AF ile register düzeyinde uyumlu: FC04/FC02/FC03, raf adımı 150, tip/ölçek, diag bit grupları | Yok |
| Wattox PCS (`wattox-pcs.json`) | Kök config deployment kopyasının **gerisindeydi** (drift 145 hata/PCS): fault word bitleri yok, kümülatif enerji 16-bit iki parça, C bloğu eksik | Kök ← doğrulanmış deployment içeriği (164 telemetri, 9 fault word × bitler, UINT32 `BIG_ENDIAN_SWAP` enerji, C02/C08/C11/C39/C40/C46/C47); `configs/sim/wattox-pcs-sim.json` yeniden türetildi |
| MC90 HVAC (`hvac.json`) | Kökte 0x0B/0x0C/0x0D/0x0F/0x11/0x1E yanlış ad/ölçek (deployment'ta düzeltilmişti); her yerde 0x1016 INT16, 0x1028 INPUT_REGISTER | Kök ← deployment; 0x1016 → UINT16, 0x1028 → HOLDING_REGISTER (cihaz yalnız FC03), 0x2101–0x2104 açıklamasına "not involving" notu (kök + 16 deployment dosyası) |
| BSC→PCS eşleme (`mappings/*.json`) | Kök `bsc-pcs-mapping.json` eski: B07/B08 akım limiti ölçülen raf akımından, B19/B20 sabit, `lossBit` yok. Tüm kopyalarda B17/B18 (gerilim **limiti**) ölçülen maks./min. raf geriliminden | Kök ← deployment sürümü; B17/B18 = sabit 14688 / 11016 (0.1 V → 1468.8 V / 1101.6 V, JF1 408 × 3.6 V / 2.7 V) — 6 dosya |

`bun tools/device-config-drift.mjs`: **814 → 10 hata**. Kalan 10 hata `control-panel-io`
(DI 6/7 Fire/First Stage) ve `dc-output` (Energy Counter tek UINT32 / iki UINT16) —
vendor dokümanı klasörde olmadığı için dokunulmadı; geliştiricinin hangisinin doğru
olduğunu seçmesi gerekir.

---

## 2. Ayrıntılı bulgular

### 2.1 Flex BSC

| # | Bulgu | Değerlendirme |
| :-- | :--- | :--- |
| B-1 | BMS SW Name (uint128, 8 kelime) config'te 4 × UINT32 olarak okunuyor | Tip sisteminde uint128 yok — kabul edilebilir; ad metni 4 parçadan birleştirilmeli |
| B-2 | 40001–40009 "Controller Heartbeat 2…10" yazılıyor | Rev AF: 40001–40009 Reserved, ancak "40000~40009 need to be updated every 1 second" notu var — uyumlu |
| B-3 | `start` komutu Ack=2 (Done) bekliyor, 35 s | Rev AF Sequence: Start → In Progress → **BSC State: Initializing** → Done. Done, Normal'i değil Initializing'e geçişi teyit eder; EMS Close'dan önce 30036 = 3 (Normal) beklemeli. Simülatör bu sıraya alındı |
| B-4 | `close_contactors` 8.2 s zaman aşımı | Sequence: Done, online raf > 0 olunca. Sim kapama süresi raf başına ~0.4 s (Rev AF zaman aşımı formülü N×400 ms + 5 s'den) — 8 raf ≈ 3.4 s, sığar |
| B-5 | RevAH durum geçişi #2: Initializing'de **Stop kabul edilir** → Not Connected | Eski simülatör bu durumda "Under Initializing" ile reddediyordu; fiziksel model düzeltildi (test: `plant.test.ts`) |

### 2.2 Wattox PCS

| # | Bulgu | Değerlendirme |
| :-- | :--- | :--- |
| P-1 | Tüm bloklar FC03 (holding) — config tüm girdileri HOLDING_REGISTER okuyor | ✅ |
| P-2 | Fault word 1–9 bitleri (Appendix 2) ve alarm word 1–8 bitleri (Appendix 3) | ✅ deployment'ta tam; kök artık aynı |
| P-3 | A81–A84 kümülatif enerji "Low/High" çiftleri | ✅ UINT32 + `BIG_ENDIAN_SWAP` (düşük kelime önce) — `packages/core` decoder'ı ile simülatör aynı sırayı üretir |
| P-4 | C bloğu (C01–C73) | Fiziksel PCS yüzü tüm C adreslerini yanıtlar (Sim-Lab'ın önceki sürümünde C02/C08/C11/C46/C47 "gerçek" profilde 0x02 veriyordu; EMS bitişik holding grubunu tek istekte okuduğu için tüm grup düşüyordu — EMS okuma yolu testi yakaladı) |
| P-5 | `start` komutu: 3 s içinde "PCS Operation Status ≠ 0" | ⚠️ Kontrol felsefesi: Start → soft start (DC/AC röle gerilim farkı + yapışma kontrolleri, ön şarj) → çalışma. Süre dokümanda yok. Soft start 3 s'den uzunsa EMS komutu **başarısız** raporlar. Sim "gercek" profilinde (8 s self-check + 12 s soft start varsayımı) `ems-probe --commands` bunu yakalar: `start` ve ardından gelen `discharge` zaman aşımına düşer. **Aksiyon:** sahada süreyi ölçün; ya `timeoutMs` artırılmalı ya da validate "soft start"ı da kabul etmeli |
| P-6 | Şarj = negatif setpoint, deşarj = pozitif | ✅ (kontrol felsefesi §1.2) |

### 2.3 MC90 HVAC

| # | Bulgu | Değerlendirme |
| :-- | :--- | :--- |
| H-1 | Cihaz yalnız FC03/FC06/FC10 — config tüm girdileri HOLDING okuyor | ✅ (eski simülatör dokümanı "INPUT (3x)" diyordu — düzeltildi) |
| H-2 | Kullanılmayan adresler 0xFFFF (A3 §7.1 not 5) → EMS sentinel kuralıyla düşer | Beklenen davranış: 0x316/0x317 (harici genleşme T/H) "not involving" |
| H-3 | 0x2000–0x2002 sunucu sıcaklıkları EMS yazana kadar 32767 → INT16 sentinel → telemetri yok | Beklenen; kontrol modu 4 seçiliyse EMS bu adresleri periyodik yazmalı (yazmazsa sim uyumluluk uyarısı verir) |
| H-4 | ⚠️ Kural motoru `force_cool` komutunu kullanıyor (0x2100=1, 0x2101=1) | A3 §7.3: 0x2101–0x2104 MC90HDNC1R-L için **"not involving"**. Gerçek cihazda yazım kabul edilir ama etkisizdir → TMS kuralları sahada soğutmayı tetiklemez. **Aksiyon:** kural, soğutma setpoint'ini (0x0A) düşürmeli veya kontrol modu 4 + sunucu sıcaklığı yazımıyla çalışmalı. Sim "gercek" profili zorunlu modu yok sayar |
| H-5 | `on` komutu kontrol modunu 0'a (dönüş havası) çekiyor | Batarya sıcaklığına göre kontrol isteniyorsa 4 yazılmalı (A3 §7.2 not 3). Proje kararı |

### 2.4 EMS çekirdeği (`packages/core`) — simülatör testleri sırasında görülen

| # | Bulgu |
| :-- | :--- |
| C-1 | `decoder.ts` (okuma) ile `device.ts#applyByteOrderToBuffer` (yazma) `LITTLE_ENDIAN` ve `LITTLE_ENDIAN_SWAP` için 32-bit değerlerde farklı byte sırası uygular (okuma: DCBA / CDAB, yazma: BADC / BADC). Bugünkü config'lerde bu sıralar kullanılmıyor; kullanılırsa okunan ve yazılan değer tutmaz |
| C-2 | Okuma grupları yalnız bitişik adreslerden kurulur (`groupByAddress`) — boşluk okunmaz; bu nedenle "Reserved" adresler sorun çıkarmaz. Aynı adreste iki telemetri yeni grup açar (fazladan istek) |

---

## 3. Simülatör kodu doğrulaması

| Test | Sonuç |
| :--- | :--- |
| `packages/simulators` vitest (mevcut 223 + yeni 44) | 267/267 ✓ |
| EMS okuma yolu (`ModbusDevice`, gerçek TCP, iki profil, 11 cihaz tipi) | ✓ — sentinel düşüşleri yalnız H-2/H-3 noktaları |
| GD-1 uçtan uca (`smoke-test.ts`): 226 sunucu, 190 EMS cihazı okundu, BSC+PCS komut zinciri 9/9 (uyumlu profil) | ✓ |
| Aynı zincir, gerçek profil | 7/9 — P-5 bulgusu (beklenen) |
| `device-service` vitest (config değişikliği sonrası) | 96/96 ✓ |
