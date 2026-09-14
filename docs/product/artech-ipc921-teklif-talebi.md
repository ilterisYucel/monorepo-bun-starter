# Artech IPC-921 Ultra Core Serisi — Teklif Talebi

## 1. Talep Özeti

Green Diamond Enerji A.Ş. olarak, enerji depolama sistemleri (EDS) konteynerlerimizde 7/24 kesintisiz çalışacak endüstriyel izleme ve kontrol uygulamamızın **cihaz ve yazılım testleri (pilot/test fazı)** için Artech **IPC-921 Ultra Core Serisi** (21.5" IP65 endüstriyel dokunmatik panel PC) için teknik ihtiyaç bildirimimizi ve teklif talebimizi iletiriz.

İhtiyaç bildiriminde yer alan iş yükü ve veri profili, teklifin doğru konfigürasyonla hazırlanabilmesi için gerekli **minimum teknik bilgiyle** sınırlı tutulmuştur. Uygulama yazılımımızın mimarisi, ürün adları ve veri modeli gibi detaylar tedarikçi ile paylaşılmamaktadır.

## 2. Kullanım Senaryosu

- **Ortam:** Enerji depolama konteyneri içi, pano/duvar montajı
- **Çalışma rejimi:** 7/24 kesintisiz
- **Faz:** Cihaz donanımının saha koşullarındaki davranışı ve üzerinde çalışacak yazılımımızın testi
- **Ağ modeli:** Tek yönlü (outbound) bağlantı; cihaza dışarıdan gelen (inbound) bağlantı gereksinimi yoktur

## 3. Donanım Gereksinimleri

| Bileşen | Gereksinim |
|---|---|
| İşlemci | iCore 12. nesil (seri standardı) |
| Bellek (RAM) | **Minimum 8 GB, ideal 16 GB** DDR4; ileride 32 GB'a yükseltilebilirlik tercih sebebidir |
| Depolama | **1 TB SSD** (M.2 veya 2.5") — tip (NVMe/SATA), marka/model ve TBW değeri teklifte belirtilmelidir |
| Ethernet | 2× 10/100/1000 BaseT (seri standardı) |
| Seri portlar | 3× RS232/RS422/RS485 (seri standardı) |
| Besleme | 12–24 VDC |
| Soğutma | Fansız |
| Koruma | IP65 ön panel, paslanmaz çelik gövde |
| Genişleme | Mini PCIe (LTE / ek ağ kartı opsiyonlarının değerlendirilmesi için) |

## 4. İşletim Sistemi Gereksinimi

Sistem, **GNU/Linux tabanlı iki dağıtım** üzerinde çalışacaktır: **Debian** ve **Pardus**.

Tedarikçiden beklenenler:

- Dokunmatik panel (projected capacitive), grafik, ses, LAN ve watchdog birimlerinin her iki dağıtımda sürücü desteği ve uyumluluk taahhüdü
- BIOS/firmware tarafında Linux kurulum ve çalışmayı engelleyen bir kısıt bulunmaması
- Doğrulanmış dağıtım/çekirdek sürümlerinin teklifle birlikte bildirilmesi

## 5. Veri Yoğunluğu ve İş Yükü Profili

Cihaz, sahada ölçüm yapan cihazlardan sürekli veri toplayan bir izleme/kontrol altyapısını çalıştıracaktır. Boyutlandırmaya esas iş yükü:

- **~2.700 veri noktası/saniye** sürekli veri alımı
- Örnekleme aralığı: **1–2 saniye**
- **7/24 kesintisiz** yerel zaman serisi yazımı (depolama üzerinde sürekli yazma yükü)
- Yıllık veri hacmi: **~1 TB** (sıkıştırma ve 90 günlük ham veri saklama politikası ile)

Bu profil, **1 TB SSD talebinin gerekçesidir**; sürekli yazma yükü nedeniyle SSD dayanıklılık (TBW) değeri kritik önemdedir.

## 6. Ağ Gereksinimleri

- Mimari gereği bağlantı **tek yönlü (outbound)** kurulur; cihaza gelen (inbound) port/bağlantı gereksinimi yoktur.
- Bu nedenle **ek bir ağ kartı konfigürasyonu gerekmemektedir**; seri üzerindeki 2× GbE port yeterlidir:
  - **Port 1:** Saha cihaz ağı (endüstriyel cihaz/sensör LAN'ı)
  - **Port 2:** Uplink (WAN — saha ağı / 4G-LTE modem çıkışı)
- Tedarikçiden öneri istenen konular:
  - İki Ethernet portunun ağ seviyesinde izolasyonu için mevcut BIOS/sürücü imkânları
  - Mini PCIe üzerinden LTE modem / ek ağ arayüzü seçenekleri
  - Linux altında çift port çalışmasına dair bilinen kısıtlar (varsa)

## 7. Çalışma Ortamı ve Sıcaklık

- Ürünün mevcut **0–60 °C** çalışma aralığı konteyner içi genel kullanım için uygundur.
- Ancak saha koşullarında ortam sıcaklığı **kış aylarında 0 °C altına inebilmektedir**; bu nedenle eksi sıcaklıkta çalışma senaryosu da değerlendirilmektedir.
- Tedarikçi, cihazların eksi sıcaklıklarda çalışabilmesi için AR-GE yapacağını tarafımıza iletmiştir. Bu kapsamda talep edilen: **hedef çalışma aralığı** (ör. −20 °C), **tamamlanma takvimi** ve AR-GE sonucunun mevcut/satın alınacak cihazlara uygulanabilirliği.
- **İş birliği modeli:** Cihaz tarafımızca **satın alınacaktır**. AR-GE süreci devam ederken ve test aşamasında, tarafımız konteyner içine **ısıtıcı ekipman** yerleştirerek cihazı kendi cihaz ve yazılım testlerinde kullanmaya devam edecektir. AR-GE tamamlandığında ısıtıcısız (doğrudan eksi sıcaklıkta) çalışma hedeflenmektedir.

## 8. Garanti ve Satış Sonrası

- **Tedarikçi teyidi:** 5 yıl garanti.
- Yedek parça temin garantisinin kapsamı ve süresinin teklifte açıkça belirtilmesi istenir.

## 9. Teklifte İstenen Bilgiler

1. Birim fiyat ve olası adet aralıkları için fiyat kademeleri
2. **Minimum temin süresi** (siparişten teslime kadar)
3. Yedek parça temin garantisi kapsamı ve süresi
4. Eksi sıcaklık AR-GE: hedef çalışma aralığı, takvim ve AR-GE sonrası uygulanabilirlik
5. Linux (Debian/Pardus) sürücü desteği taahhüdü ve doğrulanmış sürümler
6. SSD: tip (NVMe/SATA), marka/model, TBW dayanıklılık değeri; ikinci disk yuvası imkânı (işletim sistemi / veri ayrımı için)
7. RAM: 16 GB konfigürasyon detayı (2×8 GB / 1×16 GB) ve 32 GB'a büyüme yolu
8. Mini PCIe üzerinden LTE modem / ek ağ arayüzü opsiyonları ve fiyatları
9. CE ve varsa diğer sertifikalar
10. Opsiyonel WLAN (802.11 b/g/n) durumu ve fiyatı

## 10. İletişim

- **Firma:** Green Diamond Enerji A.Ş.
- **Web:** www.gdenerji.com
- **E-posta:** info@gdenerji.com
- **Telefon:** 0312 241 99 88
- **Adres:** Ehlibeyt Mah. Mevlana Blv. Nev201 Kule No: 201 C Blok Kat: 28 Ofis: 123-124, Ankara
