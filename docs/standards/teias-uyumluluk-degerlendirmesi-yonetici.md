---
status: active
space: standards
tags: [teias, uyumluluk, yonetici-ozeti]
review_date: 2026-08-24
---

# TEİAŞ Test Prosedürleri — Yazılım Uyumluluk Değerlendirmesi

> **Tarih:** 2026-07-22  
> **Referans:** TEİAŞ Yan Hizmetler Yönetmeliği — Test Prosedürleri  

---

## Özet

Yazılım, TEİAŞ test prosedürlerinde tanımlanan **veri okuma, komut gönderme ve kayıt tutma** gereksinimlerinin büyük kısmını mevcut haliyle karşılamaktadır. 34 maddelik değerlendirme sonucunda: **10 madde** tam olarak karşılanmakta, **11 madde** ek yazılım geliştirmesiyle karşılanabilir durumda, **2 madde** donanımsal/fiziksel sınırlar nedeniyle yazılım kapsamı dışında, **11 madde** ise PCS ve batarya donanımının sorumluluğundadır.

Geliştirme gerektiren maddeler için **toplam efor 28-42 gün** olarak öngörülmektedir. Kritik yol: AGC (IEC 60870-5-104) arabirimi ve zaman senkronizasyonu altyapısıdır.

---

## Değerlendirme Tablosu

| # | Gereksinim | Madde | Durum |
|---|-----------|-------|-------|
| 1 | 100 ms (10 Hz) örnekleme hızı ile veri okuma | EK2-genel | 🔴 Karşılanamaz |
| 2 | 10 Hz kayıt: Aktif Güç, Şebeke Frekansı, SOC, Enerji Kapasitesi, DC Güç, PFK Modu | EK2-genel | 🔴 Karşılanamaz |
| 3 | Ölçüm cihazı doğruluk sınıfı ≥%0,2, kalibrasyon sertifikası ≤3 yıl | EK2-genel | ⚪ Donanım |
| 4 | Simüle frekans sinyali enjeksiyonu yapılabilmesi | EK2-1 | 🟡 Geliştirme gerekli |
| 5 | PFK rezervinin %50'si ≤15 sn, tamamı ≤30 sn etkinleşmeli | Madde 7 | ⚪ PCS |
| 6 | PFK tepki gecikmesi ≤2 sn | Madde 7 | ⚪ PCS |
| 7 | Ölü bant ≤±10 mHz | Madde 7 | ⚪ PCS |
| 8 | Rezerv enerji/güç oranı ≥1,25 | Madde 7 | ⚪ Batarya |
| 9 | Çıkış ≥15 dk sürdürülmeli, TRP_A/B/C tolerans pencereleri | EK2-1.1 | ⚪ PCS |
| 10 | PFK hassasiyet: ±10 mHz'de rezervin %10'unu aşmama, ±20 mHz'de %9-%11 | EK2-1.2 | ⚪ PCS |
| 11 | 3 saat doğrulama testi veri kaydı ve SOC limit kontrolü | EK2-1.3 | 🟢 Karşılanıyor |
| 12 | SFK gecikme ≤30 sn, yüklenme hızı ≥%1,5 kurulu güç/sn | Madde 8 | ⚪ PCS |
| 13 | AGC arabirimi TEİAŞ onaylı olmalı (IEC 60870-5-104) | Madde 8 | 🟡 Geliştirme gerekli |
| 14 | Droop %2-%7 arası, TEİAŞ belirler | Madde 11 | 🟡 Geliştirme gerekli |
| 15 | Kurulu gücün %40'ına kadar reaktif kapasite sunabilme | Madde 11 | ⚪ PCS |
| 16 | Reaktif güç kapasite testi: %10 toleransla ulaşma, 10 dk kararlılık | EK2-3.1 | ⚪ PCS |
| 17 | Gerilim kontrolcüsü performans testi: droop %2, ±%1 basamak, tolerans eğrisi | EK2-3.2 | ⚪ PCS |
| 18 | Black start: ≤5 dk baraya enerji, ≥30 dk sürdürme, 1 veri/sn kayıt | EK2-4 | 🟡 Geliştirme gerekli |
| 19 | Zaman senkronizasyonu (cihazlara NTP veya Modbus ile saat yazma) | EK2-genel | 🟡 Geliştirme gerekli |
| 20 | Veri kalite flag'i (ölçüm geçerlilik durumu) | EK2-genel | 🟡 Geliştirme gerekli |
| 21 | SOE (Sequence of Events) — olayların sıra numarası ve tam zamanı ile loglanması | EK2-genel | 🟡 Geliştirme gerekli |
| 22 | Komut gönderme + read-back doğrulama (yazma sonrası register okuma) | EK2-1.1 | 🟢 Karşılanıyor |
| 23 | Tüm standart Modbus fonksiyon kodları (FC01-FC16) | EK2-genel | 🟢 Karşılanıyor |
| 24 | Çoklu byte order desteği (4 farklı endianness modu) | EK2-genel | 🟢 Karşılanıyor |
| 25 | Tüm standart veri tipleri (INT16, UINT32, FLOAT32, FLOAT64 vb.) | EK2-genel | 🟢 Karşılanıyor |
| 26 | Cihaz bağlantı kopmasında otomatik geri bağlanma | EK2-genel | 🟢 Karşılanıyor |
| 27 | Sürekli zaman serisi veri depolama (sıkıştırma + uzun dönem saklama) | EK2-genel | 🟢 Karşılanıyor |
| 28 | Hata loglama ve geriye dönük olay inceleme | EK2-genel | 🟢 Karşılanıyor |
| 29 | Her cihaza özel konfigürasyon imkanı | EK2-genel | 🟢 Karşılanıyor |
| 30 | SOC yönetimi — ölü bant içi sınırlı şarj/deşarj (EK1 Yöntem 1) | EK1-Y1 | 🟡 Geliştirme gerekli |
| 31 | SOC yönetimi — asimetrik fazla rezerv sağlama (EK1 Yöntem 3) | EK1-Y3 | 🟡 Geliştirme gerekli |
| 32 | SCADA/izleme arayüzü ile tüm sinyallerin canlı gösterimi | EK2-genel | 🟢 Karşılanıyor |
| 33 | Alarm durum yaşam döngüsü (aktif / onaylandı / temizlendi takibi) | EK2-genel | 🟡 Geliştirme gerekli |
| 34 | Frekans ve RoCoF (frekans değişim hızı) ölçümü | Madde 15 | 🟡 Geliştirme gerekli |

---

## Durum Bazında Açıklamalar

### 🟢 Mevcut Altyapı ile Karşılananlar (10 madde)

**Veri okuma ve haberleşme**
- Tüm standart Modbus fonksiyon kodları ve veri tipleri desteklenmektedir. Farklı cihaz üreticilerinin endianness formatlarına uyum sağlanabilir.

**Komut gönderme ve doğrulama**
- Cihaza komut gönderildikten sonra ilgili register'lar otomatik okunarak komutun başarılı olduğu doğrulanır. Yazma öncesi mevcut değerler yedeklenir, hata durumunda otomatik geri alma (rollback) yapılır.

**Veri kaydı ve saklama**
- Tüm telemetri verileri sürekli olarak zaman damgası ile kaydedilir. 7 günlük veri otomatik sıkıştırılır, yapılandırılabilir süre sonunda arşivlenir. 5 farklı zaman çözünürlüğünde (5 sn, 1 dk, 15 dk, 1 sa, 1 gün) özet veriye hızlı erişim sağlanır. 3 saatlik kesintisiz doğrulama testi kaydı bu altyapı ile sorunsuz yapılabilir.

**İzleme ve kullanıcı arayüzü**
- Web tabanlı SCADA arayüzü ile tüm cihaz sinyalleri canlı olarak izlenebilir, geçmiş veriler grafiklenebilir.

**Hata toleransı**
- Cihaz bağlantısı koptuğunda otomatik geri bağlanma, hata durumunda loglama ve geriye dönük inceleme altyapısı mevcuttur.

**Konfigürasyon**
- Her cihaz için ayrı konfigürasyon dosyası ile register haritası, ölçekleme, alarm bit'leri tanımlanabilir.

---

### 🟡 Yazılım Geliştirmesi ile Karşılanabilecekler (11 madde)

| # | Gereksinim | Yapılacak Geliştirme | Efor |
|---|---|---|---|
| 13 | AGC arabirimi (IEC 60870-5-104) | Sisteme IEC 60870-5-104 protokol desteği eklenmesi. TEİAŞ'ın belirlediği nokta listesine göre sinyal eşleştirmesi yapılması. TEİAş onay süreci için saha testi ve dokümantasyon. | 10-15 gün |
| 19 | Zaman senkronizasyonu | Sunucu tarafına NTP zaman senkronizasyonu entegrasyonu. Cihazlara Modbus üzerinden periyodik saat yazma komutu eklenmesi. Tüm kayıtlarda UTC zaman damgası kullanılması. | 2-3 gün |
| 20 | Veri kalite flag'i | Her telemetri ölçümüne geçerlilik durumu eklenmesi (bağlantı durumu, okuma hatası, zaman aşımına göre geçerli/şüpheli/geçersiz). | 1-2 gün |
| 21 | SOE (Sequence of Events) | Olayların oluş sırasına göre kronolojik loglanması için veritabanı şeması güncellemesi. Cihazlardaki SOE buffer'ının periyodik okunması. | 3-5 gün |
| 33 | Alarm yaşam döngüsü | Alarmlar için aktif → onaylandı → temizlendi durum takibi. Kullanıcının alarm onaylayabileceği arayüz ve API. | 4-6 gün |
| 4 | Simüle frekans sinyali | Test simülatörüne önceden tanımlı frekans profilleri (ör: ±200 mHz basamak, 15 dk süre) eklenmesi. Harici frekans jeneratöründen okuma desteği zaten mevcut. | 2-3 gün |
| 14 | Droop parametresi yazma | Cihaz konfigürasyonuna droop değeri yazma komutu eklenmesi. Mevcut komut altyapısı bunu destekliyor, sadece konfigürasyon tanımı yapılacak. | 0.5 gün |
| 18 | Black start yazılım desteği | Black start testi için özel manevra tanımı (izolasyon → enerjilendirme → yükleme adımları). 1 veri/sn kayıt hali hazırda mevcut. | 1 gün |
| 30 | SOC yönetimi (Yöntem 1) | Ölü bant içinde SOC dengeleme için manevra algoritması. Frekans okumasına göre dinamik güç setpoint hesaplaması. Asıl kontrol PCS tarafından yapılır, yazılım mod ve hedef değerleri iletir. | 2-3 gün |
| 31 | SOC yönetimi (Yöntem 3) | Frekans yönüne göre asimetrik güç limitleri tanımlanması. Mevcut manevra altyapısı üzerine eklenecek. | 1-2 gün |
| 34 | Frekans ve RoCoF ölçümü | Şebeke frekansı PCS'ten Modbus register olarak okunur (altyapı mevcut). RoCoF hesaplaması için ardışık ölçümlerden türev alma mantığı eklenecek. | 1 gün |

---

### 🔴 Donanımsal/Fiziksel Sınırlar Nedeniyle Karşılanamayanlar (2 madde)

#### #1 — 100 ms (10 Hz) Örnekleme Hızı

Bu gereksinimin yazılım tarafından karşılanamamasının nedeni yazılımsal bir eksiklik değil, fiziksel katmanlardaki sınırlardır:

| Katman | Sınır | Açıklama |
|---|---|---|
| **Cihaz (BSC/PCS)** | Register güncelleme periyodu | Endüstriyel Modbus cihazları internal register'larını tipik olarak 500 ms - 1 sn aralığında günceller. Yazılım 100 ms'de bir okuma yapsa bile cihaz aynı değeri dönecektir. |
| **Modbus TCP** | İletişim gecikmesi | 200+ register'lık bir okuma fiziksel olarak 50-150 ms sürer. 125 register'lık protokol sınırı nedeniyle birden fazla sorgu gerekir. |
| **Ethernet ağı** | Gidiş-geliş süresi | Endüstriyel ağda paket gecikmesi 5-20 ms arasıdır. |

**TEİAŞ standardı:** TEİAŞ testlerinde 10 Hz örnekleme **harici kayıt cihazı** (Class A güç kalitesi analizörü veya PMU) tarafından yapılır. Bu cihaz doğrudan gerilim/akım trafolarına bağlanır ve SCADA'dan bağımsız çalışır. SCADA yazılımının testteki rolü komut göndermek ve tamamlayıcı kayıt tutmaktır; 10 Hz ham veri toplamak değildir. **Bu gereksinim test organizasyonunda harici cihaz planlamasıyla karşılanır.**

#### #2 — 10 Hz Veri Kaydı

#1'deki aynı fiziksel sınırlar geçerlidir. Ayrıca veritabanına 100 ms aralıklarla sürekli yazma yapmak veritabanı performansını olumsuz etkiler.

**TEİAŞ standardı:** 10 Hz veri kaydı harici kayıt cihazı tarafından yapılır, raporu TEİAŞ'a bu cihazdan sunulur. SCADA kendi normal periyodunda (1-5 saniye) kayıt yapmaya devam eder. TEİAŞ asıl değerlendirmeyi harici cihazın raporu üzerinden yapar.

---

### ⚪ Yazılım Kapsamı Dışı — PCS/Batarya Donanımı Sorumluluğu (11 madde)

Aşağıdaki maddeler yazılımın değil, sahada kurulu PCS (güç elektroniği) ve batarya donanımının fiziksel performansıyla ilgilidir. Yazılımın tek rolü: PCS'e komut iletmek, veriyi okumak ve kaydetmek.

| # | Gereksinim | Sorumlu Donanım |
|---|---|---|
| 3 | Ölçüm cihazı doğruluk sınıfı ≥%0,2 | Harici güç kalitesi analizörü |
| 5 | PFK rezerv aktivasyon: %50 ≤15sn, %100 ≤30sn | PCS güç elektroniği tepki süresi |
| 6 | PFK tepki gecikmesi ≤2sn | PCS kontrol döngüsü |
| 7 | Ölü bant ≤±10 mHz | PCS frekans ölçüm hassasiyeti |
| 8 | Rezerv enerji/güç oranı ≥1,25 | Batarya kapasitesi (kWh) / PCS gücü (kW) |
| 9 | Çıkış ≥15 dk sürdürme + tolerans pencereleri | Batarya kapasitesi + PCS termal yönetim |
| 10 | PFK hassasiyet: ±10 mHz'de <%10 rezerv sapması | PCS frekans kontrol algoritması |
| 12 | SFK yüklenme hızı ≥%1,5/sn | PCS ramping performansı |
| 15 | Kurulu gücün %40'ına kadar reaktif kapasite | PCS inverter kapasitesi |
| 16 | Reaktif güç kapasite testi (%10 tolerans, 10 dk kararlılık) | PCS reaktif güç kontrolü |
| 17 | Gerilim kontrolcüsü testi (droop %2, tolerans eğrisi) | PCS gerilim kontrol algoritması |

---

## Öncelikli Aksiyon Planı

| Öncelik | # | Geliştirme Konusu | Efor | Not |
|---|---|---|---|---|
| **P0** | 13 | AGC arabirimi (IEC 60870-5-104) | 10-15 gün | SFK için TEİAŞ onayı zorunlu |
| **P0** | 19 | Zaman senkronizasyonu | 2-3 gün | Tüm kayıtların güvenilirliği için |
| **P1** | 20 | Veri kalite flag'i | 1-2 gün | Ölçüm geçerlilik takibi |
| **P1** | 21 | SOE olay kaydı | 3-5 gün | Kronolojik olay loglaması |
| **P1** | 33 | Alarm yaşam döngüsü | 4-6 gün | Alarm state machine |
| **P2** | 4 | Simüle frekans sinyali | 2-3 gün | Test simülatörüne profil ekleme |
| **P2** | 14 | Droop parametresi yazma | 0.5 gün | Konfigürasyon tanımı |
| **P2** | 18 | Black start manevrası | 1 gün | Test manevrası tanımı |
| **P2** | 30 | SOC yönetimi (Yöntem 1) | 2-3 gün | Ölü bant içi dengeleme |
| **P2** | 31 | SOC yönetimi (Yöntem 3) | 1-2 gün | Asimetrik rezerv |
| **P2** | 34 | Frekans ve RoCoF ölçümü | 1 gün | Türev hesaplama |

| Öncelik Grubu | Toplam Efor |
|---|---|
| P0 (Kritik) | 12-18 gün |
| P1 (Yüksek) | 8-13 gün |
| P2 (İyileştirme) | 8-11 gün |
| **Genel Toplam** | **28-42 gün** |

---

## Sonuç

Yazılım, TEİAŞ test prosedürleri kapsamındaki veri okuma, komut gönderme ve kayıt tutma görevlerini **büyük ölçüde karşılamaktadır.** Modbus haberleşme, komut doğrulama ve veri depolama altyapısı güçlü ve eksiksizdir.

**Yazılım geliştirme gerektiren 11 madde** bulunmaktadır. Toplam geliştirme eforu **28-42 gün** olarak öngörülmektedir. Kritik yol, Sekonder Frekans Kontrolü için zorunlu olan IEC 60870-5-104 protokolünün sisteme eklenmesi ve TEİAŞ onay sürecidir.

**10 Hz örnekleme ve kayıt** gereksinimi yazılımsal bir eksiklik değil, Modbus protokolünün ve endüstriyel cihazların fiziksel sınırlarından kaynaklanmaktadır. TEİAŞ testlerinde bu gereksinim standart olarak harici güç kalitesi analizörü ile karşılanır; SCADA yazılımından beklenmez. Test planlamasında harici kayıt cihazı bütçelenmelidir.

**Frekans tepkisi, reaktif güç, droop, black start** gibi fiziksel performans gereksinimleri PCS ve batarya donanımının sorumluluğundadır. Bu kapsamdaki 11 madde için yazılım herhangi bir engel teşkil etmemektedir.
