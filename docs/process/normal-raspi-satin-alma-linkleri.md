# NORMAL RASPBERRY PI için SATIN ALMA TALEP LİSTESİ — Tedarik Linkleri

I/O tarafı için süreç ve stok durumuna göre **"SEÇENEK 1 (GMTCNT)"** veya **"SEÇENEK 2 (FATEK)"** alternatiflerinden sadece biri set olarak tercih edilecektir.

---

## 1. ANA İŞLEM, DEPOLAMA VE ENDÜSTRİYEL KORUMA BİRİMLERİ (RPI SET)

| Sıra No | Ürün Tanımı | Marka / Model | Miktar | Not / Açıklama | Türkiye Tedarik Linki | Yurt Dışı Alternatif |
|:---:|:---|:---|:---:|:---|:---|:---|
| 1.1 | Mikrobilgisayar Kartı (8GB) | Raspberry Pi 5 - 8GB RAM | 1 Adet | EMS Ana Yazılımı ve Veritabanı İçin | [Robotistan — Raspberry Pi 5 8GB](https://www.robotistan.com/raspberry-pi-5-8-gb) · [Samm Market — Raspberry Pi](https://market.samm.com/raspberry-pi) | [Farnell TR — Raspberry Pi 5](https://tr.farnell.com/buy-raspberry-pi) |
| 1.2 | Resmi Fanlı Soğutucu Blok | Raspberry Pi 5 Official Active Cooler | 1 Adet | Pi 5 işlemci soğutması için şarttır | [Robotistan — Active Cooler](https://www.robotistan.com/raspberry-pi5-icin-aktif-sogutucu) · [Robotsepeti — Active Cooler](https://www.robotsepeti.com/raspberry-pi-5-aktif-sogutucu-heatsink) | — |
| 1.3 | M.2 NVMe SSD Bağlantı Arayüzü | Waveshare PCIe TO M.2 HAT+ | 1 Adet | Pi 5'e SSD takabilmek için ara kart | [Samm Market — Waveshare sayfası](https://market.samm.com/raspberry-pi-5-icin-pcie-to-m2-adaptor) (Waveshare TR distribütörü — "PCIe TO M.2 HAT+" arayın) | [Waveshare — PCIe TO M.2 HAT+](https://www.waveshare.com/pcie-to-m.2-hat-plus.htm) |
| 1.4 | NVMe M.2 Katı Hal Sürücüsü (SSD) | Samsung 980 NVMe M.2 SSD (1TB) | 1 Adet | Yoğun Zaman Damgalı Veritabanı Yazımları İçin | [Vatan — 1TB NVMe M.2 kategorisi](https://www.vatanbilgisayar.com/samsung-1tb-990-evo-plus-nvme-m-2-ssd-okuma-hizi-7150mb-yazma-hizi-6300mb.html) (Samsung 980 filtreleyin; eşdeğer: 990 EVO Plus / WD SN770) | — |
| 1.5 | DIN Ray Uyumlu Endüstriyel Metal Kasa | Waveshare Industrial Grade Metal Case (Type D) for Pi 5 | 1 Adet | Pano montajı ve elektriksel gürültü koruması | [Amazon Türkiye](https://www.amazon.com.tr/Waveshare-Raspberry-End%C3%BCstriyel-%C5%9Eapkalar%C4%B1n-Tak%C4%B1lmas%C4%B1n%C4%B1/dp/B0DGQFR5CM) (model kodu: PI5-CASE-D) | [Waveshare — Metal Case (D)](https://www.waveshare.com/pi5-case-d.htm) |
| 1.6 | Gerçek Zamanlı Saat Pili | Raspberry Pi 5 Real Time Clock (RTC) Battery | 1 Adet | Enerji kesintilerinde zaman damgalarının sapmaması için | [Samm Market](https://market.samm.com/raspberry-pi-5-rtc-pili) (resmi RTC Battery / Panasonic ML-2020) | [Raspberry Pi — RTC Battery (SC1163)](https://www.raspberrypi.com/products/rtc-battery)¹ |
| 1.7 | Pano Tipi Endüstriyel Ethernet Switch | Mean Well RS-118N veya Phoenix Contact SF NB Serisi | 1 Adet | Pano içi cihazların lokal ağ haberleşmesi için | [Direnc.net — Phoenix Contact](https://www.direnc.net/phoenix-contact) · [Direnc.net — Mean Well](https://www.direnc.net/mean-well) (model kodu ile stok sorunuz) | — |
| 1.8 | Pano Tipi Güç Kaynağı | Mean Well MDR-60-24 (24V DC, 2.5A) | 1 Adet | Sistem genel 24V DC beslemesi için | [GSL — Mean Well MDR-060-24](https://store.gsl.com.tr/urun/mw-mdr-060-24) · [Direnc.net — Mean Well](https://www.direnc.net/mean-well) · [e-komponent — Mean Well](https://www.e-komponent.com/mean-well-usa-inc) | — |
| 1.9 | İzoleli DC-DC Konvertör (Güç Dönüştürücü) | 24V to 5V 5A (25W) USB-C çıkışlı veya klemensli endüstriyel regülatör | 1 Adet | Panodaki 24V'u Pi 5'in ihtiyaç duyduğu izoleli 5V'a düşürmek için | [Direnc.net — Power Modüller](https://www.direnc.net/power-moduller) · [Direnc.net — 5V DC-DC Buck Modül](https://www.direnc.net/24a-5v-dc-dc-buck-voltaj-donusturucu-modulu) (endüstriyel tercih: Mean Well SD-50A-5) | — |

---

## 2. HABERLEŞME VE I/O BLOKLARI

**Satın Alma Notu:** Aşağıdaki Seçenek 1 veya Seçenek 2'den hangisinin fiyat/stok durumu daha uygunsa o setin tamamı tedarik edilmelidir. Modellerin **"Transistör Çıkışlı (T)"** olması milisaniyelik acil kapatma komutları için zorunludur, **"Röle Çıkışlı (R)"** modeller kabul edilmeyecektir.

### ALTERNATİF SEÇENEK 1: GMTCNT SETİ (Yerli Menşeli)

| Sıra No | Ürün Tanımı | Marka / Model | Miktar | Teknik Özellik / Açıklama | Türkiye Tedarik Linki | Yurt Dışı Alternatif |
|:---:|:---|:---|:---:|:---|:---|:---|
| 2.1.A | Dahili Modbus TCP Destekli Ana CPU | GMTCNT - GLC-496T | 1 Adet | Modbus TCP Ağ Geçidi ve dahili I/O | [BNB Otomasyon — GLC-496T](https://www.bnbotomasyon.com/urun/gmtcnt-glc-496t-plc-cpu-modulu) · [Kartal Otomasyon — GLC-496T](https://www.kartalotomasyon.com.tr/urun/gmtcnt-glc-496-serisi-plc-cpu-modulu-496t-serisi) · [Turan Online — GLC-496T](https://www.turanonline.com/urun/glc-496t) · [CNG Mühendislik](https://www.cngmuhendislik.com/product/gmtcnt-glc-496t/) · [Han Endüstri](https://www.hanendustri.com/gmtcnt-glc-496t/) · [Demsey Otomasyon](https://www.demseyotomasyon.com/glc-496t-gmtcnt-24vdc-pnp-rs485-cpu-plc) · [Vega Otomasyon](https://www.vegaotomasyon.com.tr/glc-496t.aspx) | Üretici: [GMTCNT](https://gmtcontrol.com/) (Türkiye) |
| 2.2.A | Dijital Giriş/Çıkış Genişleme Modülü | GMTCNT - GL10-1616T | 1 Adet | 16 Dijital Giriş / 16 Transistör Çıkış | [BNB Otomasyon — GMTCNT marka sayfası](https://www.bnbotomasyon.com/marka/gmtcnt) (model kodu ile arayın) · [OES Otomasyon — GMTCNT](https://www.oesotomasyon.com/category/gmtcnt) · [Emos Marketing — GMTCNT](https://www.emosmarketing.com/meta-etiket/gmt-plc-fiyat) | Üretici: [GMTCNT — PLC CPU ve Genişleme Modülleri](https://gmtcontrol.com/plc-cpu-ve-genisleme-modulleri/) |
| 2.3.A | Analog Giriş/Çıkış Genişleme Modülü | GMTCNT - GL10-0404V | 5 Adet | Her biri 4 Analog Giriş (0-10V/4-20mA) / 4 Analog Çıkış | Yukarıdaki satıcılarla aynı (model kodu: GL10-0404V) | Üretici: [GMTCNT](https://gmtcontrol.com/plc-cpu-ve-genisleme-modulleri/) |

**GMTCNT notu:** GMTCNT yerli üreticidir (gmtcontrol.com — İstanbul). Satıcı sitelerinde bulunmayan modüller için üretici bayi ağından veya [Turan Mühendislik GMTCNT fiyat listeleri](https://www.turanmuhendislik.com.tr/fiyat-listeleri/gmtcnt) üzerinden doğrudan tedarik istenebilir.

### ALTERNATİF SEÇENEK 2: FATEK SETİ (Tayvan Menşeli)

| Sıra No | Ürün Tanımı | Marka / Model | Miktar | Teknik Özellik / Açıklama | Türkiye Tedarik Linki | Yurt Dışı Alternatif |
|:---:|:---|:---|:---:|:---|:---|:---|
| 2.1.B | Ana Kontrol Ünitesi (220V AC Beslemeli) | FBs-44MCT2-AC | 1 Adet | 28 Dijital Giriş / 16 Transistör Çıkış ana gövde | [ESA Otomasyon — FATEK FBs Serisi](https://www.esaotomasyon.com/urun/plc/fbs-serisi-gelismis-kompakt-plc/) (TR distribütörü — modelle teklif alın) · [AVS Online — FATEK marka sayfası](https://www.avsonlinesatis.com/marka/fatek) | [Auto2mation — FATEK](https://auto2mation.com/fatek) |
| 2.2.B | Modbus TCP (Ethernet) Haberleşme Kartı | FBs-CBEH | 1 Adet | Ana ünitenin içine takılan ethernet modülü | [ESA Otomasyon — FATEK FBs Serisi](https://www.esaotomasyon.com/urun/plc/fbs-serisi-gelismis-kompakt-plc/) · [AVS Online — FATEK](https://www.avsonlinesatis.com/marka/fatek) | [Auto2mation — FATEK](https://auto2mation.com/fatek) |
| 2.3.B | Dijital Çıkış Genişleme Modülü | FBs-8EYT | 1 Adet | Eksik kalan dijital çıkışları tamamlamak için (8 Çıkış) | [ESA Otomasyon — FATEK FBs Serisi](https://www.esaotomasyon.com/urun/plc/fbs-serisi-gelismis-kompakt-plc/) · [AVS Online — FATEK](https://www.avsonlinesatis.com/marka/fatek) | [Auto2mation — FATEK](https://auto2mation.com/fatek) |
| 2.4.B | Analog Giriş Modülü | FBs-6AD | 4 Adet | Her biri 6 Kanal Analog Giriş (Toplam 24 giriş) | [ESA Otomasyon — FATEK FBs Serisi](https://www.esaotomasyon.com/urun/plc/fbs-serisi-gelismis-kompakt-plc/) · [AVS Online — FATEK](https://www.avsonlinesatis.com/marka/fatek) | [Auto2mation — FATEK](https://auto2mation.com/fatek) (FBs-6AD stokta görülüyor) |
| 2.5.B | Analog Çıkış Modülü | FBs-4DA | 5 Adet | Her biri 4 Kanal Analog Çıkış (Toplam 20 çıkış) | [ESA Otomasyon — FATEK FBs Serisi](https://www.esaotomasyon.com/urun/plc/fbs-serisi-gelismis-kompakt-plc/) · [AVS Online — FATEK](https://www.avsonlinesatis.com/marka/fatek) | [Auto2mation — FATEK](https://auto2mation.com/fatek) |

**FATEK notu:** FATEK modülleri Türkiye'de genellikle distribütör stokundan teklif usulü temin edilir; perakende listelerde anlık görünmeyebilir. ESA Otomasyon Türkiye FATEK distribütörüdür — [fatek.com](https://www.fatek.com/en/product.php?act=list) ürün sayfasından model kodları doğrulanabilir. Ayrıca [Temel Otomasyon](https://www.temelotomasyon.com/fatek/fatek-power-supply) FATEK ürün grubu taşımaktadır.

---

## Tedarik Notları

- **GMTCNT (Seçenek 1) avantajı:** Yerli üretim — kur farkı/gümrük yok, hızlı stok ve yedek parça erişimi, 6+ Türkiye satıcısı stokta ürün listeliyor.
- **FATEK (Seçenek 2) dikkat:** Türkiye'de stoklu perakende satış sınırlı; distribütör teklifi gerekebilir. Transistör çıkışlı (T) model şartını teklifte açıkça belirtin.
- **Robotistan stok notu:** Pi 5 8GB ve Active Cooler dönem dönem tükenebilir (sayfa "Out Of Stock" gösterebilir); alternatif: SamM Market (Raspberry Pi + Waveshare resmi distribütörü).
- **1.4 SSD:** Samsung 980 (PCIe 3.0) üretimden kalkma eğiliminde; aynı amaç için eşdeğerleri: Samsung 990 EVO Plus, WD Blue SN580/SN770 (Pi 5 tek şerit PCIe olduğundan performans farkı yok).
- **1.7 Switch:** "Mean Well RS-118N" model adı tedarikçide bulunamazsa alternatif: Phoenix Contact FL SF NB serisi (Direnc.net Phoenix Contact sayfasından stok sorunuz).
