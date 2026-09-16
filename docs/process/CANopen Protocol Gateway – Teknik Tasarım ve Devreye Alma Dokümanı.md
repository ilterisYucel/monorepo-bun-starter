CANopen Protocol Gateway – Teknik Tasarım ve Devreye Alma Dokümanı
Versiyon: 1.0
Tarih: 15.09.2026
Konu: LG Flex BSC (Modbus TCP) ile Wattox MPCS (CANopen) Arasında Protokol Geçidi Yazılımı Tasarımı
Dil: JavaScript / C++ / Rust (Python kullanılmayacak)

1. Amaç ve Kapsam
Bu dokümanın amacı, LG Flex BSC ile Wattox MPCS arasında doğrudan kurulamayan CANopen bağlantısını, bir Protocol Gateway (Protokol Geçidi) yazılımı ve gerekli donanım ile sağlamaktır.
Gateway:

BSC'den Modbus TCP Client olarak veri okur (BSC Server rolünde).
Okuduğu verileri CANopen PDO Producer olarak PCS'e yayınlar.
PCS'ten CANopen Heartbeat Consumer olarak PCS'in canlılık sinyalini alır.
PCS'ten gelen hata/durum bilgilerini Modbus TCP Client olarak BSC'ye yazar (BSC'de uygun register varsa).
BSC'ye Controller Heartbeat yazar (BSC'nin S-C LOC vermemesi için zorunlu).


2. Sistem Mimarisi
2.1 Genel Şema
┌─────────────────────────────────────────────────────────────────────────┐
│                          Protocol Gateway                               │
│                                                                         │
│  ┌──────────────────┐        ┌──────────────────┐                       │
│  │  Modbus TCP      │        │  CANopen         │                       │
│  │  Client          │        │  Producer /      │                       │
│  │  (BSC'ye karşı)  │        │  Consumer        │                       │
│  │                  │        │  (PCS'e karşı)   │                       │
│  └────────┬─────────┘        └────────┬─────────┘                       │
│           │                           │                                 │
│           ▼                           ▼                                 │
│      ┌─────────┐                 ┌─────────┐                            │
│      │   BSC   │                 │   PCS   │                            │
│      │(Server) │                 │(CANopen)│                            │
│      └─────────┘                 └─────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘

2.2 Veri Akışı















































YönKaynakHedefProtokolVeriOkumaBSCGatewayModbus TCPSOC, SOH, voltaj, akım, güç limitleri, sıcaklık, diagnozlarYazmaGatewayBSCModbus TCPController Heartbeat (40000)YazmaGatewayPCSCANopen PDOB01–B23 BMS verileriOkumaPCSGatewayCANopen HeartbeatPCS canlılık sinyaliOkumaPCSGatewayCANopen EMCY/PDOPCS hata bilgileri

3. Donanım Gereksinimleri
3.1 Seçenek A: Mevcut IPC / RevPi Üzerinde Çalıştırma

CPU: EMS'in çalıştığı IPC veya RevPi.
CAN Arayüzü: USB-CAN adaptör (PEAK PCAN-USB, Kvaser Leaf Light, CANable).
Avantaj: Ek CPU maliyeti yok.
Dezavantaj: Kaynak paylaşımı, izolasyon riski.

3.2 Seçenek B: Ayrı Gateway Cihazı

CPU: Raspberry Pi 4/5, endüstriyel mini PC veya RevPi Core.
CAN Arayüzü: CAN HAT (RPi için) veya USB-CAN adaptör.
İşletim Sistemi: Linux (Debian / Ubuntu / Raspbian).
Avantaj: İzole çalışma.

3.3 Donanım Listesi









































BileşenÖrnek ModelAdetNotCPURaspberry Pi 4 / endüstriyel mini PC1Linux desteği şartCAN AdaptörüPEAK PCAN-USB / Kvaser Leaf Light1Endüstriyel ortamCAN Sonlandırma120 Ω direnç2Hattın her iki ucuKabloCAN_H, CAN_L, GND-Twisted pair, blendajlıGüç Kaynağı24V DC1Saha gerilimi
3.4 CAN Bağlantı Şeması
Gateway (CAN_H) ────────┬─────── CAN_H (PCS)
                        │
Gateway (CAN_L) ────────┼─────── CAN_L (PCS)
                        │
Gateway (GND)   ────────┴─────── GND (PCS)

Her iki uçta 120 Ω sonlandırma.


4. BSC'den Okunacak Veriler (Modbus TCP Client – Okuma)
Bağlantı Bilgileri:

BSC IP: Yapılandırılabilir
Port: 502
Slave ID: 1
Function Code: 0x04 (Read Input Registers)
Poll Periyodu: 1 saniye

4.1 BSC Essential Data (Zorunlu)


















































#Veri AdıBSC Adresi (Dec)Adres (Hex)TipÖlçekBirim1BSC Heartbeat300670x7573uint161-2BSC State300680x7574uint16-enum3BSC Information300770x757Dbit16-flags4No. of Online Racks300920x758Cuint161ea
4.2 BSC Summary Data (Zorunlu)











































































































































































































#Veri AdıBSC Adresi (Dec)Adres (Hex)TipÖlçekBirim5BSC SOC302290x7625uint160.01%6BSC SOH302300x7626uint160.01%7BSC DC Voltage302320x7628uint320.0001V8BSC DC Current302340x762Asint320.001A9BSC DC Charge Power Limit302360x762Cuint320.001kW10BSC DC Discharge Power Limit302380x762Euint320.001kW11Max SOC301000x7594uint160.01%12Average SOC301010x7595uint160.01%13Min SOC301020x7596uint160.01%14Max SOH301080x759Cuint160.01%15Average SOH301090x759Duint160.01%16Min SOH301100x759Euint160.01%17Max Cell Voltage301400x75BCuint160.001V18Average Cell Voltage301410x75BDuint160.001V19Min Cell Voltage301420x75BEuint160.001V20Max Pack Temperature301520x75C8sint160.1°C21Average Pack Temperature301530x75C9sint160.1°C22Min Pack Temperature301540x75CAsint160.1°C23Max Cell Sum Voltage301180x75A6uint320.0001V24Average Cell Sum Voltage301190x75A7uint320.0001V25Min Cell Sum Voltage301200x75A8uint320.0001V
4.3 BSC Diagnostic Data (Zorunlu)













































































#Veri AdıBSC Adresi (Dec)Adres (Hex)TipAçıklama26BSC Alarm Flag30077 bit0-bit0: Normal, 1: Alarm27BSC Warning Flag30077 bit1-bit0: Normal, 1: Warning28BSC Fault Flag30077 bit2-bit0: Normal, 1: Fault29Controller-BSC LOC300970x7591bit16b0: Alarm, b1: Warning, b2: Fault30Under SOC300970x7591bit16b6: Alarm, b7: Warning, b8: Fault31Over SOC300970x7591bit16b9: Alarm, b10: Warning, b11: Fault32Over Discharge Power300970x7591bit16b12: Alarm, b13: Warning, b14: Fault33Over Charge Power301130x75A1bit16b0: Alarm, b1: Warning, b2: Fault

5. BSC'ye Yazılacak Veriler (Modbus TCP Client – Yazma)
Function Code: 0x06 (Write Single Register) veya 0x10 (Write Multiple Registers)
5.1 Zorunlu Yazma























#Veri AdıBSC Adresi (Dec)Adres (Hex)TipPeriyotAçıklama1Controller Heartbeat400000x9C40uint161 saniyeBSC'nin S-C LOC vermemesi için zorunlu
5.2 Opsiyonel Yazma (Gateway Karar Verirse)





















#Veri AdıBSC Adresi (Dec)Adres (Hex)TipAçıklama2Command Request400100x9C4Auint160x0001: Emergency, 0x0002: Start, 0x0003: Stop, 0x0004: Open Contactors, 0x0005: Close Contactors, 0x0009: Event Clear
5.3 BSC'ye Yazılamayan Veriler
BSC dökümanında PCS'ten gelen Heartbeat veya hata bilgilerini BSC'ye yazmak için özel register yoktur. Bu veriler EMS'e / TimescaleDB'ye yazılır.

6. CANopen PDO Eşleme Tablosu (PCS'e Yazılacak)
Wattox Modbus Dökümanı Bölüm 4.2 – BMS Parameters (B01–B23) PCS'in BMS'ten beklediği tüm verileri tanımlar. Gateway bu verileri CANopen PDO olarak PCS'e gönderecek.
6.1 Wattox'un Beklediği BMS Verileri (B01–B23)





























































































































































































































KodVeri AdıWattox AdresiVeri TipiÖlçekBirimKaynak (BSC Register)B01Running status of battery pack0x0300uint161-BSC State (30068)B02BMS status word0x0301uint16--BSC Information (30077)B03Total voltage of battery pack0x0302uint160.1VBSC DC Voltage (30232)B04Total current of battery pack0x0303sint160.1ABSC DC Current (30234)B05Battery pack SOC0x0304uint160.1%BSC SOC (30229)B06Battery pack SOH0x0305uint160.1%BSC SOH (30230)B07Max charging current0x0306uint160.1ACharge Power Limit ÷ VoltageB08Max discharging current0x0307uint160.1ADischarge Power Limit ÷ VoltageB09Max charging power0x0308uint160.1kWCharge Power Limit (30236)B10Max discharging power0x0309uint160.1kWDischarge Power Limit (30238)B11Max SOC of battery cell0x030Auint160.1%Max SOC (30100)B12Min SOC of battery cell0x030Buint160.1%Min SOC (30102)B13Highest temperature of battery cell0x030Csint160.1°CMax Pack Temp (30152)B14Lowest temperature of battery cell0x030Dsint160.1°CMin Pack Temp (30154)B15Maximum voltage of battery cell0x030Euint160.001VMax Cell Voltage (30140)B16Minimum voltage of battery cell0x030Fuint160.001VMin Cell Voltage (30142)B17Upper voltage limit of battery pack0x0310uint160.1VEMS'te sabitB18Lower voltage limit of battery pack0x0311uint160.1VEMS'te sabitB19Available charge energy0x0312uint160.1kWhSOC × Nominal EnerjiB20Available discharge energy0x0313uint160.1kWhSOC × Nominal EnerjiB21Rated energy of battery pack0x0314uint160.001MWhEMS'te sabitB22Battery pack SOP0x0315sint160.1kWGüç limitlerinden hesaplanırB23DC-side system status0x0316sint16--BSC State + Information
6.2 BMS Status Word (B02) Detayı – Wattox Appendix 1




























































BitAnlamKaynak0BMS no communicationGateway heartbeat kontrolü1BMS faultBSC Fault Flag (30077 bit2)2SOC above upper limitBSC Over SOC (30097 bit9-11)3SOC below lower limitBSC Under SOC (30097 bit6-8)4BMS charge prohibitedBSC Charge Power Limit = 05BMS discharge prohibitedBSC Discharge Power Limit = 06InitializingBSC State (30068) = 0x00027BMS alarmBSC Alarm Flag (30077 bit0)8BMS charge and discharge prohibitedBSC Fault Flag = 19-15Reserved-
6.3 CANopen PDO Yapısı

KRİTİK: Aşağıdaki PDO yapısı örnektir. Gerçek PDO haritası (CAN ID, byte sırası, periyot) Wattox'tan alınacak CANopen protokol dokümanına göre netleştirilecektir.
















































PDOCAN IDİçerikPeriyotTPDO1 (Gateway → PCS)0x180 + NodeIDB03, B04, B05, B06100 msTPDO2 (Gateway → PCS)0x280 + NodeIDB09, B10, B07, B08100 msTPDO3 (Gateway → PCS)0x380 + NodeIDB15, B16, B13, B14500 msTPDO4 (Gateway → PCS)0x480 + NodeIDB01, B02, B23100 msTPDO5 (Gateway → PCS)0x580 + NodeIDB11, B12, B17, B18500 msTPDO6 (Gateway → PCS)0x680 + NodeIDB19, B20, B21, B221000 ms

7. PCS'ten Okunacak Veriler (CANopen Consumer)
Gateway, PCS'ten aşağıdaki verileri CANopen üzerinden okur:





























































#Veri AdıCANopen ObjesiTipAçıklama1PCS Heartbeat0x1017uint16PCS canlılık sinyali2PCS NMT State0x1F80uint80: Initializing, 1: Pre-op, 2: Operational, 3: Stopped3PCS Fault Status Word 10x2FB5uint16Genel arıza durumu4PCS Fault Status Word 70x2FBBuint16b0: BMS communication fault5PCS Alarm Status Word 10x2FBFuint16Genel alarm durumu6PCS Alarm Status Word 70x2FC5uint16b0: BMS communication fault alarm7PCS Emergency Stop Status0x2F60uint16b0: Local, b1: Remote, b2: BMS emergency stop

8. Yazılım Mimarisi (JavaScript / C++ / Rust)
8.1 Modül Yapısı
gateway/
├── main.js / main.cpp / main.rs
├── config.yaml
├── modbus/
│   ├── client.js / client.cpp / client.rs
│   └── mapping.js / mapping.cpp / mapping.rs
├── canopen/
│   ├── producer.js / producer.cpp / producer.rs
│   ├── consumer.js / consumer.cpp / consumer.rs
│   └── pdo_mapping.js / pdo_mapping.cpp / pdo_mapping.rs
├── logger/
│   └── logger.js / logger.cpp / logger.rs
└── health/
    └── watchdog.js / watchdog.cpp / watchdog.rs

8.2 Önerilen Kütüphaneler





























DilModbus KütüphanesiCANopen KütüphanesiCAN ArayüzüJavaScript (Node.js)modbus-serial, jsmodbusnode-canopensocketcanC++libmodbusCanFestival, Lely CANopenSocketCANRusttokio-modbuscanopen-rssocketcan-rs
8.3 Ana Döngü (Pseudocode)
Her 1 saniyede:
  1. BSC'den Modbus TCP ile veri oku (30067–30238 arası)
  2. BSC'ye Controller Heartbeat yaz (40000)
  3. Okunan verileri CANopen PDO'larına dönüştür
  4. CANopen PDO'larını PCS'e gönder
  5. PCS'ten CANopen Heartbeat ve hata bilgilerini oku
  6. PCS hata bilgilerini EMS'e / TimescaleDB'ye yaz
  7. Hata varsa logla ve gerekirse BSC'ye komut gönder (Stop, Emergency)

8.4 Veri Dönüşüm Örnekleri








































BSC VerisiBSC DeğeriÖlçekDönüşümCANopen DeğeriBSC SOC84100.018410 × 0.01 = 84.10%841 (0.1 ölçek)BSC DC Voltage75205890.00017520589 × 0.0001 = 752.0589V7521 (0.1 ölçek)BSC DC Current784970.00178497 × 0.001 = 78.497A785 (0.1 ölçek)Charge Power Limit726410.00172641 × 0.001 = 72.641kW726 (0.1 ölçek)
8.5 Hata Yönetimi

































DurumAksiyonBSC Fault Flag = 1PCS'e Stop komutu gönderBSC EmergencyPCS'e Emergency komutu gönderPCS BMS Communication FaultEMS'e alarm gönder, loglaPCS Heartbeat kaybıBSC'ye Stop komutu gönderModbus TCP bağlantı kopmasıYeniden bağlan, loglaCANopen bağlantı kopmasıYeniden başlat, logla

9. Devreye Alma Adımları
9.1 Donanım Kurulumu

Gateway CPU'sunu sahaya yerleştir.
CAN adaptörünü USB veya HAT üzerinden bağla.
CAN hattını PCS'e bağla (CAN_H, CAN_L, GND).
Her iki uca 120 Ω sonlandırma direnci tak.
Güç kaynağını bağla (24V DC).

9.2 İşletim Sistemi ve Sürücü Kurulumu
sudo ip link set can0 type can bitrate 500000sudo ip link set can0 upip -details link show can0
9.3 Servis Yönetimi
sudo cp gateway.service /etc/systemd/system/sudo systemctl enable gateway.servicesudo systemctl start gateway.service
9.4 Yapılandırma Dosyası (config.yaml)
modbus:  host: 192.168.1.100  port: 502  slave_id: 1  poll_interval: 1000
canopen:  interface: can0  bitrate: 500000  node_id: 10  heartbeat_interval: 1000
pcs:  node_id: 20  pdo_mapping:    - modbus: 30229      pdo: 0x180      offset: 0      scale: 0.1    - modbus: 30230      pdo: 0x180      offset: 2      scale: 0.1    - modbus: 30232      pdo: 0x180      offset: 4      scale: 0.1    - modbus: 30234      pdo: 0x180      offset: 6      scale: 0.1    # ... diğer eşlemeler
9.5 Devreye Alma Kontrol Listesi

 CAN hattı doğru bağlandı mı?
 120 Ω sonlandırma dirençleri takıldı mı?
 CAN bitrate PCS ile uyumlu mu?
 Gateway Node ID PCS ile çakışmıyor mu?
 Modbus TCP bağlantısı BSC ile kuruldu mu?
 BSC'den B01–B23 için gerekli tüm veriler okunuyor mu?
 Controller Heartbeat (40000) BSC'ye yazılıyor mu?
 PDO haritası Wattox dokümanına uygun mu?
 PCS heartbeat'i gateway tarafından alınıyor mu?
 Gateway heartbeat'i PCS tarafından alınıyor mu?
 PCS, B01–B23 verilerini doğru okuyup çalışıyor mu?
 Hata durumunda gateway loglama yapıyor mu?
 systemd servisi otomatik başlıyor mu?


10. Riskler ve Önlemler





































RiskÖnlemPCS, BMS CANopen olmadan çalışmıyorWattox'tan yazılı teyit alınacakPDO haritası Wattox'tan alınamıyorNDA imzalanıp protokol dokümanı talep edilecekCAN hattında gürültüBlendajlı kablo, doğru sonlandırma, endüstriyel adaptörGateway CPU arızasıYedekli gateway veya watchdogModbus TCP bağlantı kopmasıOtomatik yeniden bağlanmaPCS heartbeat kaybıGateway PCS'i güvenli moda alacakBSC heartbeat kaybıGateway BSC'ye heartbeat yazmaya devam edecek

11. Wattox'tan Talep Edilecek Dokümanlar

CANopen protokol dokümanı (PDO/SDO haritası, CAN ID'ler, byte sırası)
PCS'in beklediği Node ID ve baud rate
Heartbeat yapılandırması (üretici/süre)
BMS CANopen olmadan çalışma modu var mı?
PCS'in BMS'ten beklediği minimum veri seti (B01–B23'ün tamamı mı?)


12. LG'den Talep Edilecek Bilgiler

BSC'de CANopen portu var mı? (Dökümanda yok, teyit şart)
BSC'de Controller Heartbeat dışında yazılabilecek register var mı?
BSC'nin Modbus TCP Server eşzamanlı bağlantı limiti nedir?
BSC'nin BSC Information (30077) bit yapısı tam olarak nedir?


13. Sonuç
Bu doküman, LG Flex BSC ile Wattox MPCS arasında CANopen bağlantısını sağlayacak Protocol Gateway'in tasarımını, veri haritalamasını ve devreye alma adımlarını tanımlar.
Kritik Bağımlılıklar:

Wattox'tan CANopen PDO haritası alınmalı.
Wattox'tan "BMS CANopen olmadan çalışır mı?" teyidi alınmalı.
LG'den "BSC'de CANopen portu var mı?" teyidi alınmalı.

Bu üç konu netleştikten sonra devreye alma güvenle yapılabilir.

Hazırlayan: İlteriş Kutluğ Kağan Yücel
Onaylayan: İlteriş Kutluğ Kağan Yücel
Tarih: 15.09.2026