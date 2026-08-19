# EPİAŞ Şeffaflık Platformu — Veri Kullanım Analizi ve Erişim Durumu

## 1. Özet

BESS (batarya enerji depolama) sahalarının şarj/deşarj karar desteği ve varlık yönetimi ekranları için EPİAŞ Şeffaflık Platformu REST servisleri incelendi. İnceleme kapsamı: EPİAŞ'ın 584 sayfalık teknik servis dokümanı, platformun kayıt/giriş altyapısı ve canlı ortama yapılan test istekleri.

Ana sonuçlar:

- **Veri içeriği açısından tamamı açıktır.** Şeffaflık Platformu'nda yayımlanan tüm veriler (fiyatlar, tahminler, üretim/tüketim, kesintiler) mevzuat gereği kamuya açık veridir; **ücretli bir veri katmanı veya sözleşmeye bağlı bir veri seti yoktur.**
- **Erişim tek koşula bağlıdır: kayıt + kullanıcı girişi.** Platform web arayüzü herkese açıktır; programatik erişim (API) için EPİAŞ'ın kayıt formundan üyelik oluşturulması ve her istekte kısa ömürlü bir giriş anahtarı (TGT) taşınması gerekir. Kayıt ücretsizdir; lisans bilgisi isteğe bağlı alandır.
- **Eski erişim modeli (API anahtarı + şartname + IP beyanı) güncel değildir.** 2024 ortasında tüm API erişimi CAS tabanlı giriş sistemine (TGT) taşınmıştır; canlı sistemde anahtarsız isteğin reddedildiği tarafımızca test edilmiştir.
- BESS karar senaryoları için gereken tüm fiyat serileri (PTF, GİP, SMF, dengesizlik) ve tamamlayıcı veriler (talep tahmini, gerçek zamanlı tüketim, kesintiler) bu platformdan çekilebilir.

## 2. Platform Hakkında

EPİAŞ Şeffaflık Platformu (`seffaflik.epias.com.tr`), işlettiği piyasalara (GÖP, GİP, DGP, VEP, YEK-G) ait verileri fırsat eşitliği çerçevesinde yayımlayan merkezi veri platformudur. Web arayüzünde görülen tüm veriler, aynı içerikle açık REST servisleri üzerinden de sunulur.

| Konu | Durum |
|---|---|
| Servis ailesi | `electricity-service` (elektrik piyasaları), v1 — ~300 veri servisi |
| İstek/cevap formatı | JSON veya XML |
| Tarih formatı | ISO-8601, **Türkiye saati** — `2023-11-14T17:30:00+03:00` |
| Sayfalama | İstek gövdesinde `page` bilgisi (sayfa no, satır sayısı, sıralama) |
| Zaman dilimi uyarısı | Veriler TR saatine göredir; eski verilerde yaz/kış saati farkı (DST) dikkate alınmalıdır |

Fiyat ve miktar servislerinin büyük bölümü `startDate` / `endDate` aralığıyla çalışır; aralık sorgusu zorunludur.

## 3. Erişim Modeli

### 3.1 Kayıt

API erişimi için EPİAŞ Şeffaflık Platformu kayıt formundan üyelik oluşturulur:

- Kayıt adresi: `https://kayit.epias.com.tr/epias-transparency-platform-registration-form`
- Formda istenen bilgiler:
  - Kişisel: ad, soyad, **TC kimlik numarası**, telefon, e-posta, adres
  - Kurumsal: firma/ünvan bilgileri, vergi dairesi
  - İsteğe bağlı: lisans bilgileri (lisans no/tarih/tip — birden çok eklenebilir) ve santral bilgileri
  - Yönetici yetkili bilgileri
- Lisans alanları zorunlu değildir; lisansı olmayan kurumlar da kayıt olabilir. Kayıt ücretsizdir.

### 3.2 Giriş ve İstek Doğrulaması (CAS TGT)

Kayıt sonrası her API isteği, giriş sisteminden alınan kısa ömürlü bir anahtar ile yapılır:

1. Kullanıcı adı (kayıt e-postası) ve şifre ile `POST https://giris.epias.com.tr/cas/v1/tickets` adresine istek atılır (test ortamı: `https://giris-prp.epias.com.tr`).
2. Başarılı cevap (HTTP 201) bir **TGT** (Ticket Granting Ticket) değeri döner.
3. Sonraki tüm veri servisi isteklerinde `TGT` header'ı olarak bu değer gönderilir.
4. TGT'nin ömrü dokümanda **2 saat** olarak belirtilir (pratikte kullanan topluluk kütüphaneleri 8 saate kadar kullanmaktadır — teyit edilecektir). Süre dolduğunda aynı yöntemle yenisi alınır. Sık TGT üretimi sistem tarafından kısıtlanabildiğinden (throttle), TGT'nin önbelleğe alınıp süresi dolana kadar yeniden kullanılması gerekir.

### 3.3 Canlı Sistem Testi (Ağustos 2026)

- Anahtarsız (TGT'siz) bir PTF sorgusu canlı ortama gönderildi; sistem isteği `401 AUTH002 — "Kimlik doğrulama bilgisi bulunamadı"` ile reddetti. **TGT kullanımı zorunludur.**
- Test, geliştirme ortamımızdan (yurt dışı IP) yapıldı ve API'ye erişilebildi — **coğrafi erişim kısıtı yoktur.** (Kısıt, varsa, giriş bilgileriyle ilişkilidir; IP bazlı ek beyan gerekip gerekmediği açık sorulardandır.)

### 3.4 Ücret

Dokümanda ve platform kaynaklarında ücretli veri/üyelik katmanı bulunmamaktadır. Şeffaflık Platformu verileri düzenleyici şeffaflık yükümlülüğü kapsamında yayımlandığından veri erişimi ücretsizdir. Kayıt formundaki kullanım koşullarının kayıt sırasında teyidi önerilir.

## 4. Piyasa Kavramları (Kısa Sözlük)

| Kavram | Anlamı | BESS için önemi |
|---|---|---|
| **GÖP** (Gün Öncesi Piyasa) | Ertesi günün her saati için arz-talep eşleşmesiyle fiyatın oluştuğu piyasa | Arbitraj planlamasının temel piyasası |
| **PTF / MCP** (Piyasa Takas Fiyatı) | GÖP'te oluşan saatlik takas fiyatı (TL/MWh; EUR ve USD karşılığı da yayımlanır) | **Ana sinyal:** ucuz saatlerde şarj, pahalı saatlerde deşarj |
| **K.PTF** | PTF'nin kesinleşmemiş (ara) hali; yayın durumu ayrıca sorgulanır | Fiyat bilgisini en erken elde etme |
| **GİP** (Gün İçi Piyasa) | Teslimat saatine kadar sürekli ticaret yapılan piyasa; ağırlıklı ortalama ve min/maks eşleşme fiyatları yayımlanır | Saat içi pozisyon düzeltme, plan sapmasını kapatma |
| **DGP** (Dengeleme Güç Piyasası) | Gerçek zamanlı sistem dengesi için talimatların verildiği piyasa: **YAT** (yük atma — sistemde fazla), **YAL** (yük alma — sistemde açık) | BESS hızlı yanıt kabiliyetiyle dengeleme geliri |
| **SMF** (Sistem Marjinal Fiyatı) | DGP'de net talimat hacmine karşılık gelen fiyat (yayını ~4 saat gecikmelidir) | Dengeleme piyasası fiyat seviyesi |
| **Dengesizlik** | Planlanan üretim/tüketimden gerçekleşen sapma; tutar/miktar/maliyet servisleri yayımlanır | Sapma maliyetini izleme ve minimize etme |
| **AUF** (Azami Uzlaştırma Fiyatı) | Dengesizlik uzlaştırmasında uygulanabilecek tavan fiyat | Uç senaryolarda maruz kalınabilecek maliyet sınırı |
| **VEP** (Vadeli Elektrik Piyasası) | Forward kontratların işlem gördüğü piyasa; günlük gösterge fiyatı (GGF) yayımlanır | Uzun vadeli fiyat beklentisi ve riskten korunma (hedge) |
| **EAK** (Emre Amade Kapasite) | Üreticilerin kullanılabilir durumdaki kapasitesi | Arz tarafı yeterliliği göstergesi |
| **KGÜP / KUDÜP / UEVM** | Kesinleşmiş üretim planları ve uzlaştırmaya esas veriş miktarları | Üretim tarafı beklentisinin doğrulanması |

## 5. İş Senaryosu Eşleme

| Senaryo | Kullanılacak veriler | Karar/eylem |
|---|---|---|
| **1. Gün öncesi arbitraj planlaması** | Saatlik PTF + talep tahmini + RES üretim tahmini | Ertesi günün ucuz saatlerine şarj, pahalı saatlerine deşarj programı kurulması |
| **2. Saat içi düzeltme** | GİP ağırlıklı ortalama + min/maks eşleşme fiyatları + gerçek zamanlı tüketim | Gün içinde fiyat/plan değişimlerine göre programın revize edilmesi |
| **3. Dengeleme katılımı** | YAT/YAL talimat miktarları + SMF | BESS'in dengeleme talimatlarına karşılık vermesi (sistem açıkken deşarj, fazlayken şarj) |
| **4. Sapma izleme** | Dengesizlik tutarı/miktarı | Gerçekleşen-yıllık sapma maliyetinin izlenmesi, program sapmalarının raporlanması |
| **5. Varlık yönetimi (patron/saha admin ekranı)** | Dashboard özet servisleri + PTF ortalamaları + VEP göstergeleri | Portföyün fiyat karşısındaki durumu: "şu saatte şarj edip en yüksek fiyata satmak" senaryosunun güncel fiyatlarla gösterimi |
| **6. Saha operasyonu** | Planlı/plansız kesinti bildirimleri | Bakım ve kesinti dönemlerinin şarj/deşarj programına yansıtılması |

## 6. Veri Kataloğu

Tablolardaki tüm istekler `https://seffaflik.epias.com.tr/electricity-service` adresine, ilgili yol ile ve `TGT` header'ı taşıyarak yapılır. Fiyat/miktar servisleri tarih aralığı (`startDate`/`endDate`, TR saati) alır.

### 6.1 Piyasa Fiyatları (öncelikli grup)

| Veri | İstek noktası | Öngörülen kullanım |
|---|---|---|
| Saatlik PTF (TL/MWh + EUR/USD) | `POST /v1/markets/dam/data/mcp` | Senaryo 1, 5 — arbitraj planlaması ve fiyat gösterimi |
| Kesinleşmemiş PTF (K.PTF) | `POST /v1/markets/dam/data/interim-mcp` | Senaryo 1 — fiyatın erken elde edilmesi |
| K.PTF yayın durumu | `GET /v1/markets/dam/data/interim-mcp-published-status` | Senaryo 1 — verinin kesinleşip kesinleşmediğinin kontrolü |
| GİP ağırlıklı ortalama fiyat | `POST /v1/markets/idm/data/weighted-average-price` | Senaryo 2 — saat içi fiyat seviyesi |
| GİP min-maks eşleşme fiyatı | `POST /v1/markets/idm/data/min-max-matching-price` | Senaryo 2 — saat içi fiyat bandı |
| GİP min-maks alış/satış teklif fiyatı | `POST /v1/markets/idm/data/min-max-bid-price`, `POST /v1/markets/idm/data/min-max-sales-offer-price` | Senaryo 2 — teklif tarafı likiditesi |
| SMF | `POST /v1/markets/bpm/data/system-marginal-price` | Senaryo 3 — dengeleme fiyatı (~4 saat gecikmeli yayımlanır) |
| YAT / YAL talimat miktarları | `POST /v1/markets/bpm/data/order-summary-down`, `POST /v1/markets/bpm/data/order-summary-up` | Senaryo 3 — sistem yönü sinyali (~4 saat gecikmeli) |
| AUF | `POST /v1/markets/data/maximum-settlement-price` | Senaryo 4 — sapma tavan fiyatı |
| Dengesizlik tutarı | `POST /v1/markets/imbalance/data/imbalance-amount` | Senaryo 4 — borç/alacak izleme |
| Dengesizlik maliyeti / miktarı | `POST /v1/renewables/data/imbalance-cost`, `POST /v1/renewables/data/imbalance-quantity` | Senaryo 4 — sapma analizi |
| VEP kontrat fiyat özetleri | `POST /v1/markets/pfm/data/contract-price-summary` | Senaryo 5 — forward fiyat seviyeleri |
| VEP günlük gösterge fiyatı (GGF) | `POST /v1/markets/pfm/data/ggf` | Senaryo 5 — uzun vadeli fiyat göstergesi |
| Piyasa mesaj sistemi | `POST /v1/markets/data/market-message-system` | Tüm senaryolar — piyasa işleyiş duyuruları |

### 6.2 Tüketim ve Talep

| Veri | İstek noktası | Öngörülen kullanım |
|---|---|---|
| Gerçek zamanlı tüketim | `POST /v1/consumption/data/realtime-consumption` | Senaryo 2, 5 — sistem yükünün anlık takibi |
| Talep tahmini | `POST /v1/consumption/data/demand-forecast` | Senaryo 1, 5 — 2018–2027 arası yıllık brüt talep tahmini (TEAİŞ raporlarından) |
| Yük tahmin planı | `POST /v1/consumption/data/load-estimation-plan` | Senaryo 1 — günlük yük planı |
| Uzlaştırmaya esas çekiş miktarı (UEÇM) | `POST /v1/consumption/data/uecm` | Senaryo 5 — tüketim tarafı uzlaştırma verisi |

### 6.3 Üretim

| Veri | İstek noktası | Öngörülen kullanım |
|---|---|---|
| Gerçek zamanlı üretim | `POST /v1/generation/data/realtime-generation` | Senaryo 1, 5 — kaynak karışımı (RES payı fiyatı doğrudan etkiler) |
| Üretim tahmini (YEKDEM) | `POST /v1/renewables/data/generation-forecast` | Senaryo 1 — RES üretim beklentisi; fiyat tahminine girdi |
| Kesinleşmiş günlük üretim planı (KGÜP) | `POST /v1/generation/data/dpp` | Senaryo 1 — üretim tarafı planının doğrulanması |
| Emre amade kapasite (EAK) | `POST /v1/generation/data/aic` | Senaryo 5 — arz yeterliliği göstergesi |

### 6.4 Kesinti ve İletim

| Veri | İstek noktası | Öngörülen kullanım |
|---|---|---|
| Planlı kesinti bilgileri | `POST /v1/consumption/data/planned-power-outage-info` | Senaryo 6 — bakım planlaması |
| Plansız kesinti bilgileri | `POST /v1/consumption/data/unplanned-power-outage-info` | Senaryo 6 — arıza takibi |
| Hat kapasiteleri | `POST /v1/transmission/data/line-capacities` | İsteğe bağlı — kısıt kaynaklı bölgesel fiyat ayrışması sinyali |
| İletim sistemi kayıp katsayısı (ISKK) | `POST /v1/transmission/data/iskk-list` | İsteğe bağlı — maliyet hesabı |
| Enterkonneksiyon kapasite tahminleri (ay/yıl öncesi) | `POST /v1/transmission/data/tcat-pre-month-forecast`, `POST /v1/transmission/data/tcat-pre-year-forecast` | İsteğe bağlı — ithalat/ihracat kapasite beklentisi |
| Enterkonneksiyon arıza/bakım bildirimleri | `POST /v1/transmission/data/international-line-events` | İsteğe bağlı — sınır hattı durumu |

### 6.5 Dashboard Özet Servisleri (patron/saha admin görünümü)

Tek istekte özet kartı dönen, parametresiz servisler:

| Veri | İstek noktası |
|---|---|
| Dengeleme piyasası özeti | `GET /v1/dashboard/balancing-power-market` |
| GÖP özeti | `GET /v1/dashboard/day-ahead-market` |
| GİP özeti | `GET /v1/dashboard/intra-day-market` |
| Gerçek zamanlı tüketim / üretim | `GET /v1/dashboard/realtime-consumption`, `GET /v1/dashboard/realtime-generation` |
| Ağırlıklı ortalama fiyat | `GET /v1/dashboard/weighted-average-price` |
| Spot gaz piyasası | `GET /v1/dashboard/spot-gas-market` |
| Piyasa mesaj sistemi özeti | `GET /v1/dashboard/market-message-system` |

### 6.6 Zorunlu Olmayan, İleride Gerekebilecek Veriler

| Veri | İstek noktası | Ne zaman gerekebilir |
|---|---|---|
| YEK-G belge/itfa/ihraç verileri | `POST /v1/markets/yek-g/data/...` grubu | Yeşil sertifika (YEK-G) ticareti gündeme gelirse |
| Baraj doluluk/hacim verileri | `POST /v1/dams/data/...` grubu | Hidro üretim beklentisiyle fiyat tahmini zenginleştirilirse |
| PFK/SFK frekans rezerv fiyatları | `POST /v1/markets/...` (yan hizmetler grubu) | BESS'in frekans kontrol hizmetlerine katılımı değerlendirilirse |
| Santral bazlı üretim/listeler | `POST /v1/generation/data/powerplant-list`, `POST /v1/generation/data/realtime-generation-bulk` | Rakip/piyasa üretim takibi gerekirse |
| VEP teklif fiyatları ve açık pozisyonlar | `POST /v1/markets/pfm/data/offer-price`, `POST /v1/markets/pfm/data/open-position` | VEP üzerinden hedge işlemleri planlanırsa |
| GDDK tutarı ve sayaç verileri | `POST /v1/markets/gddk/data/...` grubu | Dağıtım tarafı dengesizlik kalemleri gerekirse |
| Sıfır bakiye düzeltme tutarı | `POST /v1/transmission/data/zero-balance` | Uzlaştırma detaylarına inilirse |
| Kapasite talepleri | `POST /v1/transmission/data/capacity-demand` | İthalat/ihracat kapasite katılımı gerekirse |

## 7. Açık Erişim ve Başvuru Matrisi

| Konu | Durum | Gerekli aksiyon |
|---|---|---|
| Veri içeriği (tüm fiyat/tahmin/kesinti verileri) | **Açık** — ücret yok, sözleşme yok | — |
| Platform web arayüzü | **Açık** — giriş gerektirmez | — |
| API erişimi | **Kayıt + giriş gerekli** | Kayıt formunun doldurulması (ad/soyad/TC/iletişim + kurum bilgileri; lisans isteğe bağlı) |
| Kimlik doğrulama | **CAS TGT** — 2 saat ömürlü giriş anahtarı | Kullanıcı adı/şifrenin güvenli saklanması, TGT'nin önbelleklenmesi |
| Ek başvuru / sözleşme / ücretli katman | **Bulunmuyor** (eski "web servis şartnamesi + IP beyanı" modeli kaldırılmış görünüyor) | Kayıt formunun kullanım koşullarında teyit |
| Kayıt onay süreci | **Netleştirilecek** — formun anında mı yoksa onaylı mı aktifleştiği bilinmiyor | Kayıt sonrası ilk girişte test |
| IP bazlı kısıt | **Netleştirilecek** — güncel dokümanda IP beyanı yok; eski modelde vardı | Giriş sonrası farklı ağlardan test |

## 8. Önerilen İlk Faz Veri Seti

İlk aşamada aşağıdaki serilerin çekilmesi öngörülmektedir (çekim sıklıkları sistem tarafında ayarlanabilir):

| # | Seri | İstek noktası | Önerilen çekim sıklığı |
|---|---|---|---|
| 1 | Saatlik PTF (TL/EUR/USD) | `POST /v1/markets/dam/data/mcp` | Saatlik (gün sonrası fiyat açıklandığında tam gün çekilir) |
| 2 | GİP ağırlıklı ortalama fiyat | `POST /v1/markets/idm/data/weighted-average-price` | Saatlik |
| 3 | GİP min-maks eşleşme fiyatı | `POST /v1/markets/idm/data/min-max-matching-price` | Saatlik |
| 4 | SMF | `POST /v1/markets/bpm/data/system-marginal-price` | 4 saatte bir |
| 5 | Dengesizlik tutarı | `POST /v1/markets/imbalance/data/imbalance-amount` | Günlük |
| 6 | Talep tahmini | `POST /v1/consumption/data/demand-forecast` | Aylık (yıllık veridir) |
| 7 | Gerçek zamanlı tüketim | `POST /v1/consumption/data/realtime-consumption` | 15 dakikada bir |
| 8 | Planlı + plansız kesintiler | `POST /v1/consumption/data/planned-power-outage-info`, `POST /v1/consumption/data/unplanned-power-outage-info` | 15 dakikada bir |
| 9 | Dashboard özetleri (GÖP, GİP, ağırlıklı ortalama) | `GET /v1/dashboard/day-ahead-market`, `GET /v1/dashboard/intra-day-market`, `GET /v1/dashboard/weighted-average-price` | Dakika seviyesinde |

Çekilen seriler sistemimizde ayrı bir zaman serisi deposuna yazılır; boss web ekranlarında mevcut grafik bileşenleriyle gösterilir. Her seri bağımsız planlanır — bir serideki hata diğerlerini etkilemez.

## 9. Riskler ve Açık Sorular

| Konu | Açıklama | Aksiyon |
|---|---|---|
| TGT ömrü belirsizliği | Doküman 2 saat diyor; pratikte 8 saate kadar kullanıldığı bildiriliyor | İlk entegrasyonda ölçülerek önbellek süresi sabitlenecek |
| TGT yenileme kısıtı (throttle) | Sık TGT üretimi engellenebiliyor | Tek TGT önbelleği + süre dolunca yenileme stratejisi |
| Kayıt onay süreci | Form sonrası hesabın ne zaman aktifleştiği bilinmiyor | Kayıt aşamasında test edilecek |
| IP kısıtı | Eski modelde IP beyanı vardı; güncel dokümanda yok | Farklı ağlardan test edilecek |
| Zaman dilimi | Tüm tarihler TR saatidir; eski verilerde DST (+02:00) dönemleri vardır | Saklama öncesi UTC'ye çevrilecek; DST farkı korunacak |
| SMF/YAT/YAL gecikmesi | Yayın ~4 saat gecikmelidir | Gösterimde "son veri zamanı" etiketi kullanılacak |
| Yayın saatleri | PTF/K.PTF'nin gün içi açıklanma saati dokümanda yok | Canlı izleme ile öğrenilecek |
| Kota/rate limit | Dokümanda istek limiti belirtilmemiş | Yük testi ile gözlemlenecek |

## 10. Kaynaklar

- EPİAŞ Şeffaflık Platformu elektrik servisleri teknik dokümanı (584 sayfa): `https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.pdf`
- Kayıt formu: `https://kayit.epias.com.tr/epias-transparency-platform-registration-form`
- Giriş (CAS) — canlı: `https://giris.epias.com.tr` · test: `https://giris-prp.epias.com.tr`
