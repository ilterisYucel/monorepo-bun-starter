---
status: active
space: decisions
tags: [karar, aws, odeme]
review_date: 2026-08-24
---

# AWS Hesap Açılışı: Kredi Kartı Talebinin Gerekçesi ve IAM Devri Alternatifinin Teknik Risk Analizi

**Hazırlayan:** Yazılım ve Altyapı Birimi
**Hedef Kitle:** Muhasebe ve Mali İşler Departmanı
**Tarih:** Ağustos 2026
**Sınıflandırma:** İç Yazışma — Gizli

## 1. Yönetici Özeti

Bulut altyapısı üzerinde proje ortamlarının kurulabilmesi için bir AWS (Amazon Web Services) hesabı açılması zorunludur. AWS'in ticari politikası gereği, **istisnasız tüm hesap türlerinde** — bireysel, kurumsal ve ücretsiz kullanım (Free Tier) hesapları dahil — hesap açılış akışında geçerli bir kredi kartının ödeme yöntemi olarak kaydedilmesi **atlanamaz bir adımdır**. Kart talebi bir satın alma yetkisi arayışı değil; AWS'in kimlik doğrulama, dolandırıcılık önleme ve fatura tahsilat mekanizmasının zorunlu girdisidir.

Alternatif senaryo olan "hesabın şirket tarafından açılıp yazılım ekibine IAM rolü devredilmesi" modeli ise **aynı kart zorunluluğunu ortadan kaldırmamakta**; buna ek olarak sürece 14 adımlık ek teknik konfigürasyon, 5–7 iş günü gecikme, muhasebe departmanına sürekli teknik sorumluluk ve ölçülebilir bilgi güvenliği riski eklemektedir.

**Öneri:** Kart bilgilerinin yalnızca AWS faturalama konsoluna kaydedilmesi suretiyle hesabın yazılım ekibi tarafından açılması; tüm AWS faturalarının her ay PDF olarak muhasebeye ibraz edilmesi; bütçe alarmları ve maliyet limitleri ile harcama kontrolünün ilk açılışta kurulmasıdır.

## 2. AWS Neden Kredi Kartı İster?

### 2.1 Fatura Modeli: Kullandıkça Öde (Pay-as-you-go)

AWS hizmetleri abonelik veya ön ödemeli paket modeliyle değil, **kullanım bazlı** faturalandırılır. Aylık fiili tüketim, fatura dönemi sonunda hesaplanır ve hesaba kayıtlı ödeme yönteminden tahsil edilir. Bu modelde AWS'in ticari riski, hizmet tüketimi gerçekleştikten *sonra* tahsilat yapmasıdır; dolayısıyla geçerli bir ödeme aracının hesaba tanımlı olması, **hesabın varlık koşuludur** — kart kaydı olmayan bir AWS hesabı aktifleştirilmez.

### 2.2 Açılışta Kart Kaydı Zorunludur (İstisna Yoktur)

- AWS hesap açılış akışındaki "Ödeme Yöntemi" (Payment Method) adımı atlanamaz; bu adım tamamlanmadan tek bir servis dahi açılamaz.
- **Free Tier (12 aylık sınırlı ücretsiz kullanım)** hesaplarında dahi kart kaydı zorunludur. Ücretsiz limitler aşıldığında veya 12 ay dolduğunda tahsilat yine tanımlı karttan yapılır.
- Açılış sırasında kart üzerinde **1 ABD Doları tutarında geçici provizyon** (authorization hold) oluşturulur. Bu tutar **tahsil edilmez**; 3–7 iş günü içinde otomatik serbest kalır. İşlevi yalnızca kartın geçerliliğini doğrulamaktır (bkz. Ek A).
- Kart kaydı ve telefon numarası doğrulaması, AWS'in **dolandırıcılık önleme (anti-fraud)** politikasının zorunlu bileşenleridir. Bu iki adım olmadan hesap üretilmez.

### 2.3 "Kurumsal Faturalı Hesap" Alternatifi Bu Ölçekte Mümkün Değildir

AWS'in Türkiye'de kartsız faturalı (invoice) tahsilat modeli yalnızca **AWS Enterprise Agreement** kapsamındaki kurumsal müşterilere sunulur. Bu modelin koşulları:

- Yıllık taahhüt ve minimum harcama eşiği gerektirir,
- Sözleşme müzakeresi ve veri işleme sözleşmesi (DPA) imzalanması gibi hukuk süreçlerini içerir,
- Başvuru aşamasında dahi bir ödeme yöntemi kaydı talep eder.

Bölüm 3.3'te sunulan aylık maliyet tahmini göz önüne alındığında, bu yol proje ölçeği için işletmesel olarak anlamlı değildir.

## 3. Kart Bilgilerinin Kullanımı ve Güvenlik Çerçevesi

### 3.1 Kart Nerede ve Nasıl Saklanır?

- Kart bilgisi **yalnızca** AWS Faturalama Konsolu'na (aws.amazon.com) kaydedilir.
- AWS, kart verilerini **PCI-DSS (Payment Card Industry Data Security Standard) Seviye 1** hizmet sağlayıcı sertifikasyonu altında, tokenizasyon yöntemiyle saklar. Kart numarasının tamamı AWS personeli dahil hiç kimse tarafından görüntülenemez.
- Kart bilgisi **şirketimizin hiçbir sunucusuna, yazılımına, veritabanına veya dokümanına girilmez ve kaydedilmez.** Yazılım ekibinin kart verisine kalıcı erişimi yoktur; veri yalnızca açılış anında ilgili forma işlenir.
- KVKK (6698 sayılı Kanun) kapsamında kart verisi yalnızca AWS hesabı içinde, fatura tahsilatı amacıyla işlenir; bu işleme ilişkin sorumluluk, kart sahibinin onayı ile hesap sahibine aittir.

### 3.2 Harcama Kontrol Mekanizmaları

- **AWS Budgets:** Aylık bütçe eşikleri tanımlanır. Örnek: 50 USD eşiğinde bilgilendirme, 100 USD eşiğinde kritik uyarı e-postası muhasebeye iletilir.
- **Cost Anomaly Detection:** Beklenmeyen harcama artışları (yanlış yapılandırma, kötüye kullanım) otomatik tespit edilir ve alarm üretir.
- **Servis limitleri:** Kritik hizmetlerde aşılamaz kaynak sınırları tanımlanır.
- **Aylık ibraz:** Tüm faturalar PDF olarak indirilir, kalem kalem muhasebeye iletilir. Harcamanın tamamı denetlenebilir ve kayıt altındadır.

### 3.3 Tahmini Aylık Maliyet

| Hizmet | Örnek Kaynak | Tahmini Aylık Maliyet (USD) |
|---|---|---|
| Amazon EC2 (sunucu) | 2 × t3.small, 7/24 | 25–35 |
| Amazon RDS (veritabanı) | db.t3.small (TimescaleDB) | 35–55 |
| Amazon S3 (nesne depolama) | 50 GB + yedekleme | 2–5 |
| Amazon CloudWatch (izleme) | Standart metrikler + alarmlar | 3–7 |
| Veri transferi | Düşük trafik profili | 1–5 |
| **Toplam** | | **≈ 70–110** |

Not: Free Tier kapsamında ilk 12 ay bu maliyetin önemli bir bölümü sıfırdır; tablo üst sınır senaryosudur.

## 4. Alternatif Senaryo: Hesabın Şirket Tarafından Açılıp IAM Rolü Devredilmesi

Bu senaryonun ilk ve en kritik gerçeği şudur: **şirket adına hesap açılırken de aynı kredi kartı kaydı zorunludur.** Dolayısıyla bu yol kart sorununu çözmez; yalnızca sürece aşağıdaki teknik katmanları ekler.

### 4.1 Uçtan Uca Süreç Adımları (14 Adım)

| # | Adım | İçerik | Sorumlu | Tahmini Süre |
|---|---|---|---|---|
| 1 | Hesap başvurusu | Şirket unvanı, vergi kimlik numarası ve adres bilgileriyle AWS hesap formunun doldurulması | Muhasebe | 1 saat |
| 2 | Telefon doğrulaması | AWS otomatik araması ile PIN kodunun doğrulanması | Muhasebe | 15 dk |
| 3 | **Kart kaydı (zorunlu)** | Şirket kartının ödeme yöntemi olarak kaydedilmesi — Senaryo A'dakiyle birebir aynı adım | Muhasebe | 15 dk |
| 4 | Root hesap güvenliği | Root (kök) kullanıcı parolasının oluşturulması ve kilitli kasada saklama prosedürünün kurulması | Muhasebe | 1 saat |
| 5 | MFA aktivasyonu | Root hesap için çok faktörlü kimlik doğrulama (donanım anahtarı veya TOTP) kurulumu | Muhasebe | 1 saat |
| 6 | AWS Organizations | Çoklu hesap yapısının kurulması, yönetim (management) hesabının ve yapısal birimlerin (OU) tanımlanması | Teknik ekip + Muhasebe onayı | 1 gün |
| 7 | IAM kullanıcı ve rol tanımı | Teknik ekip için IAM Identity Center kullanıcıları ile rol tanımlarının oluşturulması | Teknik ekip | Yarım gün |
| 8 | Least-privilege politika tasarımı | EC2, RDS, S3, CloudWatch, IAM, Billing dahil tüm servisler için ayrıntılı izin matrisinin (JSON policy) yazılması ve gözden geçirilmesi | Teknik ekip | 2–3 gün |
| 9 | Trust policy tanımı | Rol devri (role assumption) için güven zincirinin (trust relationship) ve koşulların tanımlanması | Teknik ekip | 1 gün |
| 10 | Kimlik bilgisi dağıtımı | Erişim anahtarları ve rol ARN'lerinin şifreli kanaldan dağıtılması, saklama prosedürü | Teknik ekip | 1 saat |
| 11 | Denetim kayıtları | CloudTrail ve AWS Config'in tüm bölgelerde aktifleştirilmesi, log saklama politikasının tanımı | Teknik ekip | 1 gün |
| 12 | Test ve doğrulama | İzin matrisinin her satırının pozitif/negatif testi; yetkisiz erişim denemelerinin doğrulanması | Teknik ekip | 1 gün |
| 13 | Dokümantasyon | Süreç ve erişim envanterinin, sorumluluk matrisinin (RACI) kayıt altına alınması | Teknik ekip | Yarım gün |
| 14 | Muhasebe üzerindeki sürekli yük | Root parola yenileme, MFA cihazı yönetimi, Billing erişimi, faturaların teknik ekibe iletilmesi | Muhasebe | Sürekli |

### 4.2 Zaman ve İş Yükü Etkisi

| Kalem | Senaryo A: Kart + hesap teknik ekipte | Senaryo B: Şirket hesabı + IAM devri |
|---|---|---|
| Toplam kurulum süresi | 1 iş günü | 5–7 iş günü |
| Muhasebe iş yükü | 15 dakika (kart bilgisi iletimi) | ≥ 4 saat kurulum + sürekli teknik yük |
| Teknik ekip iş yükü | 1 gün (ortam kurulumu) | 7–9 gün (IAM tasarım + test + dokümantasyon) |
| Ek mühendislik maliyeti | — | 6–8 iş günü × mühendis adam-gün bedeli |
| Proje etkisi | Yok | Kabul takviminde doğrudan kayma |

### 4.3 Teknik ve Hukuki Riskler

- **IAM yanlış yapılandırması:** Bulut ortamlarında en sık görülen güvenlik açığı sınıfıdır. Aşırı yetkili (over-privileged) bir politika, hatalı veya kötü niyetli erişimde veri ihlaline yol açar. KVKK m.12 ile ISO/IEC 27001 Ek A (5.15, 5.18) uyarınca erişim haklarının tasarımı, gözden geçirilmesi ve sürekliliği **hesabın sahibi olan tarafın (root sahibi = muhasebe) hukuki yükümlülüğüdür.**
- **Root hesabın kilitlenmesi veya parola/MFA kaybı:** AWS hesap kurtarma süreci, kimlik belgeleri ve faturalı adres teyidi gerektirir; bazı durumlarda noter onaylı belge istenir. Kurtarma tamamlanana kadar tüm üretim ortamı erişilemez durumda kalır.
- **Denetim izi sorumluluğu:** CloudTrail kayıtları mali ve teknik denetimlerde harcama kanıtı olarak kullanılır. Konfigürasyon eksikliğinde harcamaların hangi birim tarafından yapıldığı kanıtlanamaz hale gelir.
- **Çifte sorumluluk bulanıklığı:** Root hesap muhasebede, günlük kullanım teknik ekipte olduğunda; güvenlik olayı müdahalesinde karar zinciri yavaşlar ve sorumluluk paylaşımı belirsizleşir.
- **Proje gecikmesi:** 5–7 iş günü ek süre; bağımlı iş paketlerini, saha kabul takvimini ve müşteriye taahhüt edilen teslimat tarihlerini doğrudan etkiler.

## 5. Senaryo Karşılaştırması

| Kriter | Senaryo A: Kart bilgisi + hesap teknik ekipte | Senaryo B: Şirket hesabı + IAM devri |
|---|---|---|
| Kredi kartı gereksinimi | Gerekli — tek seferlik kayıt | Gerekli — **değişmez, aynı kart istenir** |
| Kurulum süresi | 1 iş günü | 5–7 iş günü |
| Muhasebe iş yükü | 15 dakika | ≥ 4 saat + sürekli teknik yük |
| Fatura denetimi | Aylık PDF ibrazı | Aylık PDF ibrazı |
| Güvenlik sorumluluğu | Teknik ekipte (uzmanlık alanı) | **Muhasebede** (root sahipliği) |
| Kilitlenme / kesinti riski | Düşük | Orta–Yüksek |
| Uyumluluk riski (KVKK, ISO 27001) | Düşük | Orta |
| Toplam maliyet etkisi | Referans | +6–8 iş günü mühendislik maliyeti |

## 6. Sonuç ve Talep

Her iki senaryoda da kredi kartı kaydı zorunludur. Senaryo B, Senaryo A'ya kıyasla **hiçbir maliyet avantajı sağlamamakta**; yalnızca süre, risk ve muhasebe departmanı üzerinde sürekli teknik sorumluluk eklemektedir. Kart bilgisinin paylaşılmasındaki çekince haklı olmakla birlikte, Bölüm 3.1'de açıklanan güvenlik çerçevesi (PCI-DSS Seviye 1, tokenizasyon, kurumsal sistemlere kaydedilmeme garantisi) bu çekinceyi karşılamaktadır.

**Talep edilenler:**

1. Şirket kredi kartına ait kart numarası, son kullanma tarihi ve CVV bilgilerinin, muhasebe tarafından güvenli kanaldan ve **yalnızca** hesap açılışını gerçekleştirecek yetkili personele iletilmesi.
2. Hesabın yazılım ekibi tarafından açılması ve kartın yalnızca AWS Faturalama Konsolu'na kaydedilmesi.
3. Aylık AWS faturalarının PDF olarak, kalem kalem muhasebeye ibraz edilmesi.
4. Açılışla birlikte bütçe alarmlarının (50/100 USD eşikleri) ve harcama anomali tespitinin kurulması.

## 7. Ekler

### Ek A — Açılışta 1 USD Provizyonu Hakkında

AWS hesap açılışında kart üzerinde 1 ABD Doları tutarında geçici rezervasyon (authorization hold) oluşur. Bu tutar **tahsil edilmez**; ekstrede bekleyen provizyon olarak görünür ve 3–7 iş günü içinde otomatik serbest kalır. Ekstrede "AWS" ibareli bu satırın harcama olarak deftere işlenmemesi ve ay sonu mutabakatında dikkate alınması önerilir.

### Ek B — Referanslar ve Dayanaklar

- **AWS Customer Agreement (Faturalama Politikaları):** Geçerli bir ödeme yöntemi kaydının hesap açılış koşulu olduğu hükmü.
- **PCI-DSS Seviye 1 Sertifikası (AWS):** Kart verilerinin saklanması ve işlenmesine ilişkin uyumluluk.
- **ISO/IEC 27001 ve ISO/IEC 27017:** Bilgi güvenliği yönetimi ve bulut hizmetleri güvenlik kontrolleri; erişim kontrolü yükümlülükleri (Ek A, 5.15/5.18).
- **KVKK (6698 sayılı Kanun), m.12:** Veri güvenliğine ilişkin teknik ve idari tedbirlerin alınması yükümlülüğü.
