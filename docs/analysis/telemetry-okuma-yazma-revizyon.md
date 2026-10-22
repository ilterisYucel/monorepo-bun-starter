# Telemetry Toplama Revizyonu

## Temel Bilgiler
- Elimizde telemetry toplamamız gereken çok fazla donanım var.
- Bu donanımların sağladığı verilerin bazıları çok önemli ve sık değişiyor. Örneğin BSC SOC değeri, sistemin ana kullanım senaryosu alan charge/discharge manevrasında sık sık değişiyor. HVAC ünitelerinin sağladığı bazı değerler sık sık değişiyor. Bazı değerleri komutlarla, manevralarla ve operasyonlarla yazıyoruz ve değerlerinin bilinmesi önemli. Ancak bazı değerler neredeyse çok az değişiyor.
- Ön tanımlı olarak TimeScaleDB kullanıyoruz. Çünkü normal postgresql yeteneklerine de ihtiyacımız var. TimeScaleDB açık kaynaklı ve ilerleyen vadede projenin sürdürebilirliği açısından önemli. İstediğimiz zaman Influx veya başka bir çözüme geçmek için veri tabanı erişimini kontrat ile sabitledik. Ancak TimeScaleDB ile kalma kararımız var.
- Şu anki sistemde 5 temel servisimiz var. Bunlardan 3 katmanda uygulama üretiyoruz. Konteyner uygulaması, saha uygulaması ve patron uygulaması.
- Device servisimiz IDevice servisini implement etmiş Device sınıflarından veri okuyup bunları BullMQ jobları ile diğer servislere ileten bir orkestrator servis. Modbus/Canbus/MQTT ile veri veren cihazların, sağlanan konfigürasyona göre IDevice implementasyonu instance'sini yaratıyor. Cihazların polling konfigürasyonuna göre read metodu ile veri okuyor. Okurken Izgara düzeninde okuma zamanlarını hizalıyor. Cihazın verilerini yazılmak veya kullanılmak üzere farklı servislere iletiyor. Cihazlara gelen komutları da cihazın write/writeAtomic metodları ile cihaz sınıflarına yazıyor.
- Otomatik çalışan fonksiyonlarımız var (management servis). Örneğin şu değer şu olduğunda ve şu olmadığında şunu çalıştır gibi ve çok milyon dolarlık elektrik donanımları olduğundan hız ve güvenilirlik hayati önemde.
## Sorunlar
- Device service şu anda bir cihazdan okunması gereken tüm verileri aynı polling süresi içinde okuyup diğer servislere iletiyor.
- Bu özellikle TimescaleDB'de çok fazla veri birikmesine neden oluyor. Bunlardan bazıları gereksiz sıklıkta. Bu web-service'nin verileri sorgulama hızını verilerin ön yüze ve socket tunnel üzerinden diğer uygulamalara iletilme hızını çok düşürüyor. Şu an öngöremediğim diğer teknik sorunlara da neden olabilir.
- Bu sorunlara kalıcı bir çözüm bulunmalıdır.

## Öneriler
1. Device konfigürasyonlarına her okunacak telemetry için ayrı okuma polling'i tanımlamak. x telemetry 1 sn'de y telemetry 15 sn'de okunabilir. 
2. Device konfigürasyonlarına her telemetry için farklı bir yazma polling'i tanımlamak. x ve y telemetry 1 sn'de okunur ama x 1 sn'de 1 yazma job'una eklenir y 15 sn'de.
3. Ya Device sınıfı içerisinde ya da Device service'de bir cache tutulur. Eğer bir önceki okumadan farklı bir değer gelmemişse o telemetry yazma job'una dahil edilmez. TTL ile de arada bir garanti yazılması garanti edilir. Bazı önemli değerlerde bu atlanır onlar her okunduğunda yazılır.
4. Bu iş data-servise taşere edilip, data-servis üzerinden bir yaklaşım geliştirilebilir?

## Çözümleri değerlendirirken 
1. Bu Telemetry'ler TEIAŞ standartlarına göre geliştirilen sistemlerde kullanılacaktır. Availability oranları yüzde 95 ve üzeri sistemler tasarlanmaktadır. Bazı veriler ulusal ve uluslarası standartlara göre kayıt altına alınmalı veri kaybı olmamalıdır. Bir sorun olduğunda yazılımda değil donanımda sorun olduğunda kanıt olarak sunulması gerekmektedir.
2. Bu Telemetry'ler kart komponentlerinde 2/3B simülasyon çizimlerinde, gaugelerde ve nokta sayısı, zaman aralığı ile sorgulama özelliğinin olduğu chart komponentlerinde görselleştirilmektedir. Grafana line chartları standartlarında chart'lar geliştiriliyor. 
3. Aletlerlerden alarm ve hata durumları ile ilgili veriler alınıp parse edilip tamper logger ile db'ye kayıt edilmekte ve chartlar üzerinde çizgi, teknik ekiplere hata tablosu ve ilerleyen düzeyde harici kaynaklardan bildirim olarak gönderilecektir. Bu durumlar anlık tepki verilmesi gereken durumlardır.
4. Standartlarda okuma ve db'ye kaydetme süresi iç ağlarda 50ms'ye kadar komutu işleme süresi 20 ms'ye kadar düşebilmektedir.
5. InfluxDB ve diğer çözümlerin, TimescaleDB'ye özel ancak çok bilinmeyen özelliklerin, küresel EMS/PMS çözümlerinin deneyimleri, stratejileri önemlidir.
6. Sistem için belirlediğimiz mimari kararlar (config tabanlı servisler, ön yüz ve arka yüzde araçlardan bağımsız konrat tabanlı iletişim, kodlama standartları, güvenlik standartları) önemlidir.
