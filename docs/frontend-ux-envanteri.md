# GD-PMS Ön Yüz Tasarım Envanteri

**Versiyon:** 1.0
**Hedef Kitle:** UX Tasarımcıları
**Storybook:** [https://ilterisyucel.github.io/monorepo-bun-starter/](https://ilterisyucel.github.io/monorepo-bun-starter/)

Bu belge, GD-PMS bünyesindeki üç kullanıcı arayüzü uygulamasının mevcut sayfalarını, yerleşimlerini ve bileşenlerini UX tasarım ekibine referans olarak aktarmak amacıyla hazırlanmıştır.

---

## 1. Genel Mimari

GD-PMS saha yönetimini üç seviyede ele alan üç bağımsız React uygulamasından oluşur:

```
Boss-Level (superadmin)
Mobil öncelikli, çoklu saha genel bakış
"Tüm sahalarımın durumu ne?"
        │
        ▼
Field-Level (field)
Saha altındaki konteynerlerin izlenmesi
"Sahamda hangi konteynerler var?"
        │
        ▼
Container-Level (container-web)
Tek konteynerin derinlemesine izlenmesi ve kontrolü
"Bu konteynerin içinde neler oluyor?"
```

Üç uygulama da aynı `@gd-monorepo/ui` ortak bileşen kütüphanesini kullanır. Ortak özellikler: karanlık/aydınlık tema, Türkçe/İngilizce dil desteği.

---

## 2. Ortak UI Kütüphanesi (`@gd-monorepo/ui`)

Aşağıdaki bileşenlerin tamamı üç uygulama tarafından ortak kullanılmaktadır. UX tasarımcıları bu bileşenleri mevcut yapı taşları olarak değerlendirmelidir.

### 2.1 Cihaz Kartları

| Bileşen | Açıklama |
|:--------|:---------|
| `BSCCard` | Batarya konteyneri kartı: durum rozeti, SoC, voltaj, akım, güç, sıcaklık, hücre metrikleri |
| `RackCard` | Raf kartı: durum rozeti, SoC, voltaj, akım, güç, sıcaklık |
| `CBCard` | Kesici kartı: açık/kapalı/açtı görsel durumu, voltaj, akım, açma/kapama sayacı |
| `DCOutputCard` | DC çıkış kartı: açık/kapalı, gerçek ve set voltaj/akım |
| `HvacCard` | HVAC kartı: çalışıyor/beklemede/arıza rozeti, mod (soğutma/ısıtma/boşta), sıcaklıklar, nem, alarm sayısı |
| `FirePanelCard` | Yangın paneli kartı: yangın var/yok, arıza var/yok, röle durumları |
| `EnergyAnalyzerCard` | Enerji analizörü kartı: 3 faz gerilim/akım/güç, güç faktörü, THD, enerji sayaçları |
| `ContainerCard` | Konteyner özet kartı: durum noktası, SoC bar, güç, sıcaklık, cihaz sayısı |
| `FieldCard` | Saha özet kartı: durum, güç, SoC, konteyner sayısı |

### 2.2 SCADA Grafikleri (PixiJS)

Gerçek zamanlı animasyonlu endüstriyel görseller. Hepsi karanlık tema ile uyumlu.

| Bileşen | Açıklama |
|:--------|:---------|
| `BSC` | Batarya konteyneri şeması: raflar, baralar, kesiciler, DC çıkışlar, kablolar, akış okları, etiketler |
| `TMS` | Termal yönetim şeması: odalar, HVAC üniteleri, sıcaklık/nem paneli |
| `BESSDiagram` | Tam saha panoraması: BSC'ler, TMS, yangın paneli, enerji analizörü, trafo — tek tuval |
| `RackCell` | Raf hücresi: SoC seviyesine göre renklenen dikdörtgen, hover'da bilgi popover'ı |
| `CircuitBreaker` | Kesici: açık/kapalı/açtı görsel durumu |
| `DCOutput` | DC çıkış: açık/kapalı görsel durumu |
| `HvacUnit` | HVAC ünitesi: duruma göre dönen fan animasyonu |
| `PanelCard` | Sıcaklık/nem panel göstergesi |
| `FirePanel` | Yangın paneli durum grafiği |
| `EnergyAnalyzerGraphic` | Enerji analizörü grafiği |

### 2.3 Chart'lar

| Bileşen | Açıklama |
|:--------|:---------|
| `TelemetryChart` | Zaman serisi chart'ı: bir veya birden fazla cihaz, birden fazla metrik, zaman aralığı seçici, metrik çoklu seçim, nokta sayısı, cihaz filtresi |
| `SingleTelemetryChart` | Tek bir telemetri metriğinin bir veya birden fazla cihaz için chart'ı |
| `MultiLineChart` | Çoklu serili çizgi grafiği, olay işaret çizgileri |
| `TelemetryGauge` | SVG dairesel ibreli gösterge (240°), eşik renklendirmesi |
| `DeviceGauges` | Bir cihaz için responsive TelemetryGauge grid'i |

### 2.4 Kontrol ve Durum Bileşenleri

| Bileşen | Açıklama |
|:--------|:---------|
| `ManeuverCard` | Manevra yürütme kartı: boşta/çalışıyor/başarılı/başarısız durumları, parametre girdileri, adım listesi, zamanlayıcı, geri al butonu |
| `TelemetryInput` | Telemetri değer girişi: adım butonları, aralık barı, eşik çizgileri, birim |
| `SummaryCard` | KPI kartı: ikon + değer + etiket, duruma göre renk |
| `LogTerminal` | Log görüntüleyici: tür ikonları (başarı/hata/uyarı/bilgi), kaynak ikonları, otomatik kaydırma |
| `DeviceTable` | Cihaz envanter tablosu: ID, ad, tip, protokol, raf, model, durum, detay butonu |
| `DeviceDetailModal` | Cihaz detay modal penceresi |
| `StatusBadge` | Durum rozetleri: Online, Offline, Charge, Discharge, Idle |
| `ContainerConnectionBadge` | Konteyner bağlantı durumu rozeti |
| `MetricBar` | Yatay ilerleme çubuğu (%0-100) |
| `MetricDisplay` | MetricBar + değer + etiket birleşimi |
| `DeviceTelemetryProvider` | Cihaz başına izole gösterge bileşeni (altında `Gauge` ve `StatusBadge`) |
| `FieldMap` | Leaflet saha haritası, renkli daire işaretçiler |
| `PlayCanvasViewer` | 3D konteyner görselleştirme |

### 2.5 Atom Bileşenler

| Bileşen | Açıklama |
|:--------|:---------|
| `Card` | Genel kart konteyneri |
| `CardGrid` | 4 sütunlu responsive grid |
| `CardHeader` | Kart başlığı: isim + rozet alanı |
| `ChartGrid` | 2 sütunlu chart grid'i |
| `DataGrid` | 2 sütunlu veri grid'i |
| `DataRow` | İkon + etiket + değer satırı |
| `SectionHeader` | Bölüm başlığı ayracı |
| `Tabs` | Sekme konteyneri |

### 2.6 İkonlar

46 ikon. Tamamı Tabler Icons ailesinden.

| Kategori | İkonlar |
|:---------|:--------|
| Navigasyon | dashboard, bsc, hvac, analytics, energyAnalyzer, charts, reports, events, control, settings, scadaChart |
| Durum | statusOnline, statusOffline, statusIdle, logSuccess, logError, logWarning, logInfo |
| Cihaz | battery, batteryCharge, batteryDischarge, container, circuitBreaker, dcOutput, hvacUnit, fireAlarm |
| Aksiyon | refresh, add, trash, stop, continuous, timer, zoomIn, close, collapse, menu |
| Diğer | powerPlug, temperature, health, emergency, logo, user, logout, sourceCommand, sourceScheduler, sourceSystem |

### 2.7 Renk Sistemi

104 token. CSS (hex) ve PixiJS (0x) çift formatta.

| Grup | Sayı | Örnek |
|:-----|:----:|:------|
| Durum | 14 | Başarı (#10b981), Uyarı (#f59e0b), Hata (#ef4444), Bilgi (#3b82f6), Boşta |
| Yüzey | 14 | Arka plan, kart, popup, header, input, panel, iskelet, hover |
| Metin | 10 | Birincil, beyaz, soluk, devre dışı, mor, gri |
| Kenarlık | 5 | Varsayılan, çizgi, açık, hover |
| Gradyan | 9 | Gövde, orta, düşük, ekran, panel |
| Chart | 16 | chart1-chart16 (veri serisi renkleri) |
| Sıcaklık | 3 | Soğuk, serin, sıcak |
| Özel | 21 | Kablo, terminal, gölge, DC aktif/pasif, saydamlık varyantları |
| Vurgu | 2 | Açık, koyu |

---

## 3. Container-Level Uygulaması (`container-web`)

Tek bir enerji konteynerinin derinlemesine izlenmesi ve kontrolü. Uygulamanın en olgun ve en çok sayfaya sahip olanı.
**Toplam sayfa:** 13 (11 tamamlandı, 2 placeholder)

### Genel Yerleşim
- **Yan Çubuk:** Sabit 80px, 11 navigasyon ikonu (dashboard, scada, bsc, fire, energy-analyzer, hvac, control, events, reports, devices)
- **Sistem Başlığı:** Yatay durum çubuğu. Şarj/deşarj/boşta ikonu, konteyner ID, PPC bağlantı durumu (yeşil/kırmızı), canlı saat, güç tüketimi (renk kodlu: yeşil <100kW, sarı <300kW, kırmızı >300kW), ortam sıcaklığı ve nem.

### Sayfa Listesi

| # | Sayfa | Route | Durum |
|:--|:------|:------|:------|
| 1 | Giriş | `/login` | Tamamlandı |
| 2 | Ana Dashboard | `/`, `/dashboard` | Tamamlandı |
| 3 | SCADA Panorama | `/scada` | Tamamlandı |
| 4 | BSC Detay | `/bsc` | Tamamlandı |
| 5 | HVAC Detay | `/hvac` | Tamamlandı |
| 6 | Yangın Paneli | `/fire` | Tamamlandı |
| 7 | Enerji Analizörü | `/energy-analyzer` | Tamamlandı |
| 8 | Manevra Kontrol | `/control` | Tamamlandı |
| 9 | Sistem Chart'ları | `/system-charts` | Tamamlandı |
| 10 | Olaylar | `/events` | Tamamlandı |
| 11 | Raporlar | `/reports` | **Placeholder** |
| 12 | Cihazlar | `/devices` | Tamamlandı |
| 13 | Ayarlar | (sidebar popup) | Tamamlandı |

---

### 3.1 Giriş (`/login`)

Ortalanmış kart, tam ekran karanlık arka plan. Logo + "EMS" başlık, kullanıcı adı girişi, şifre girişi, giriş butonu. "veya" ayracı altında misafir girişi butonu. Demo giriş bilgileri ipucu. Rol seçimi yok — giriş yapan kullanıcının rolü otomatik belirlenir.

---

### 3.2 Ana Dashboard (`/`, `/dashboard`)

Konteynerin anlık durumunun özet görünümü.

**Yerleşim:**
1. **Cihaz Göstergeleri:** Her cihaz için `DeviceGauges` — SoC, SoH, Güç, Voltaj, Akım dairesel ibreli göstergeleri.
2. **LogTerminal:** Sistem olayları (sayfa altında).

**Veri:** Canlı.

---

### 3.3 SCADA Panorama (`/scada`)

Tüm SCADA görsellerinin toplandığı sayfa.

**Yerleşim:**
1. `BSC` PixiJS grafiği: 8 batarya rafı, baralar, kesiciler, DC çıkışlar, hareketli akış okları, özet paneli. Raf hücrelerine sağ tık → bilgi popover'ı (SoC, voltaj, akım, sıcaklık).
2. `TMS` PixiJS HVAC grafiği: odalar, fan animasyonlu HVAC üniteleri, sıcaklık/nem paneli.
3. `BESSDiagram` panoraması: tüm BSC'ler, TMS, yangın paneli, enerji analizörü, trafo (tek tuval, 1200px).
4. `LogTerminal` (sayfa altında).

**Veri:** Canlı.

---

### 3.4 BSC Detay (`/bsc`)

Batarya sisteminin tüm detayları. En kapsamlı sayfalardan biri.

**Yerleşim (yukarıdan aşağıya):**
1. `SectionHeader("BSC")`
2. **Özet Kartları (2'li):** BSC-1 ve BSC-2 için `BSCCard` (SoC, SoH, güç, voltaj)
3. **Raflar:** `SectionHeader("Raflar")`, `CardGrid` içinde `RackCard`'lar (Rack-1...Rack-8). Her kartta durum rozeti, SoC, voltaj, akım, güç, sıcaklık.
4. **BSC Chart'ları:** Her cihaz için `SingleTelemetryChart`, birleşik karşılaştırma chart'ı.
5. **Kesiciler:** `SectionHeader("Kesiciler")`, `CardGrid` içinde `CBCard`'lar (açık/kapalı/açtı).
6. **DC Çıkışlar:** `SectionHeader("DC Çıkışlar")`, `CardGrid` içinde `DCOutputCard`'lar.
7. **CB ve DC Chart'ları.**

**Etkileşim:** `RackCard` tıklama → `RackDetailModal`. Cihaz detay butonu → `DeviceDetailModal`.

**Veri:** Canlı.

---

### 3.5 HVAC Detay (`/hvac`)

Isıtma/soğutma ünitelerinin detaylı izlenmesi.

**Yerleşim:**
1. **Özet Kartları (4'lü grid):** Ortalama sıcaklık, ortalama nem, çalışan/toplam ünite sayısı, sistem durumu (normal/uyarı).
2. **Ünite Kartları:** `SectionHeader("HVAC Uniteleri")`, `CardGrid` içinde `HvacCard`'lar. Her kartta oda adı, durum rozeti (çalışıyor/beklemede/arıza), anlık sıcaklık, mod (soğutma/ısıtma/boşta), set sıcaklığı, besleme/dönüş sıcaklığı, nem, ekipman durumu, alarm sayısı.
3. **Chart'lar:** Her ünite için `SingleTelemetryChart`, tüm ünitelerin karşılaştırmalı chart'ı (olay işaret çizgileriyle).

**Veri:** Canlı.

---

### 3.6 Yangın Paneli (`/fire`)

Yangın alarm panelinin (EP203) izlenmesi.

**Yerleşim:**
1. **Durum Kartları (3'lü grid):** Sistem durumu (OK/UYARI), yangın tespiti (var/yok), arıza durumu (var/yok). Renk kodlu (yeşil/kırmızı).
2. `FirePanelCard`: EP203 röle durumları — 1. kademe, 2. kademe, boşaltıldı, susturma, bekletme, abort, otomatik mod, yerel yangın, reset.
3. **Chart:** Zaman serisi chart'ı.

**Veri:** Canlı.

---

### 3.7 Enerji Analizörü (`/energy-analyzer`)

PM5340 enerji analizörünün faz bazında detaylı izlenmesi.

**Yerleşim:**
1. **Özet Kartları (3'lü):** Frekans (Hz), toplam aktif güç (kW), aktif enerji (kWh).
2. `EnergyAnalyzerCard`: Her faz için (L1/L2/L3) faz-nötr ve faz-faz gerilim, akım, aktif/reaktif/görünür güç, güç faktörü, THD, nötr akımı, talep değerleri, enerji sayaçları.
3. **Chart:** Zaman serisi chart'ı.

**Veri:** Canlı.

---

### 3.8 Manevra Kontrol (`/control`)

Cihaz komutlarının gönderilmesi ve çoklu cihaz manevralarının yürütülmesi.

**Yerleşim:** Tam genişlik masonry grid (kartlar içerik boyuna göre akar).

**İçerik:** 18 `ManeuverCard`:
- Batarya manevraları: Şarj et, deşarj et, durdur
- Acil durdurma
- HVAC manevraları: Aç, kapat, soğutmaya zorla, ısıtmaya zorla
- Kesici manevraları: Aç, kapat, reset
- DC çıkış manevraları: Aç, kapat

**Her ManeuverCard şunları içerir:**
- Durum makinesi: boşta → "Çalıştır" butonu (Şimdi / Zamanla ayrık buton), çalışıyor → devre dışı "Çalışıyor...", başarılı → yeşil onay, başarısız → "Tekrar Dene" + "Geri Al" butonları
- Parametre girdileri: sayısal alanlar (örn. güç kW), min/max sınırlı
- Zamanlayıcı: "Zamanlı" checkbox → tarih/saat seçici → geri sayım
- Adım listesi: manevranın hangi cihazlara hangi komutları göndereceğinin önizlemesi

**Etkileşim:** Çalıştır butonu modal olmadan doğrudan komutu gönderir, sonuç kart üzerinde gösterilir.

**Veri:** Canlı.

---

### 3.9 Sistem Chart'ları (`/system-charts`)

Tüm BSC ve XRack sistem metriklerinin zaman serisi grafikleri.

**Yerleşim:** Tam genişlik `SingleTelemetryChart` (500px).

**Metrikler:** SOC, SOH, Voltage, Current, ChargePower, DischargePower, Temperature, BalanceTime vb.

**Chart kontrolleri:**
- Zaman aralığı seçici: 1dk / 1sa / 1gün / 1hafta / 1ay / 3ay / 6ay / 1yıl / özel tarih aralığı
- Metrik çoklu seçim (gruplandırılmış: temel / detay)
- Nokta sayısı: 60 / 120 / 240 / 500
- Cihaz filtresi dropdown
- Olay işaret çizgileri aç/kapat

**Veri:** Canlı.

---

### 3.10 Olaylar (`/events`)

Sistem olaylarının ve kullanıcı hareketlerinin log görüntüleyicisi.

**Yerleşim:** İki sütun.
- Sol: `LogTerminal` — "Sistem Event & Hataları" (uyarı ikonu, 800px)
- Sağ: `LogTerminal` — "Kullanıcı Hareketleri" (kullanıcı ikonu, 800px)

**Etkileşim:** Her terminal bağımsız: tip filtreleme (başarı/hata/uyarı/bilgi), otomatik kaydırma aç/kapat, log temizleme.

**Veri:** Canlı.

---

### 3.11 Raporlar (`/reports`) — **Placeholder**

**Mevcut durum:** Ortalanmış kart, belge ikonu, "Bu sayfa şu anda geliştirme aşamasındadır" mesajı.

**Planlanan:** PDF rapor üretimi, Excel export.

---

### 3.12 Cihazlar (`/devices`)

Konteynerdeki tüm cihazların envanter tablosu.

**Yerleşim:** Tam genişlik `DeviceTable`. Sütunlar: ID, Ad, Tip, Protokol, Raf, Model, Durum, Detay butonu. Türe göre gruplu sıralama (BSC → XRack → HVAC → CB → DC-Output).

**Etkileşim:** Detay butonu → `DeviceDetailModal` (telemetri kayıt haritası).

**Veri:** Canlı.

---

### 3.13 Ayarlar (Sidebar Popup)

Yan çubuktaki ayarlar ikonu ile açılan modal. İki sekme:

- **Seçenekler:** Dil seçimi (Türkçe/English toggle), Tema seçimi (Aydınlık/Karanlık toggle)
- **Kullanıcılar (sadece admin):** Kullanıcı listesi, yeni kullanıcı oluşturma formu (kullanıcı adı, ad soyad, şifre, rol seçimi)

**Veri:** Canlı.

---

## 4. Field-Level Uygulaması (`field`)

Tek bir saha altındaki tüm konteynerlerin toplu izlenmesi.

**Toplam sayfa:** 9 (7 tamamlandı, 2 placeholder)

**Not:** Şu anda tüm sayfalar örnek veri ile çalışmaktadır. Canlı veriye geçiş için backend geliştirmesi devam etmektedir.

### Genel Yerleşim

- **Yan Çubuk:** Katlanabilir (260px / 70px), geçiş animasyonlu. "SCS" logosu, 7 navigasyon ikonu (Dashboard, Konteynerler, Chart'lar, Kontrol, Olaylar, Raporlar, Cihazlar). Alt kısım: kullanıcı profili (avatar + isim + rol rozeti), acil durdurma butonu, çıkış.
- **Sistem Başlığı:** 4 kutulu grid — Saha ID, PPC bağlantısı (yeşil/kırmızı), online/toplam konteyner sayısı, canlı saat.
- **Acil durdurma:** Kontrol sayfasına yönlendirir, doğrudan komut göndermez.

### Sayfa Listesi

| # | Sayfa | Route | Durum |
|:--|:------|:------|:------|
| 1 | Giriş | `/login` | Tamamlandı |
| 2 | Saha Dashboard | `/field/:fieldId` | Tamamlandı (örnek veri) |
| 3 | Konteynerler | `/field/:fieldId/containers` | Tamamlandı (örnek veri) |
| 4 | Konteyner Detay | `/field/:fieldId/containers/:containerId` | Tamamlandı (örnek veri) |
| 5 | Chart'lar | `/field/:fieldId/charts` | Tamamlandı (örnek veri) |
| 6 | Manevra Kontrol | `/field/:fieldId/control` | **Placeholder** |
| 7 | Olaylar | `/field/:fieldId/events` | Tamamlandı (örnek veri) |
| 8 | Raporlar | `/field/:fieldId/reports` | **Placeholder** |
| 9 | Cihazlar | `/field/:fieldId/devices` | Tamamlandı (örnek veri) |

---

### 4.1 Giriş (`/login`)

Container-web'deki login ile aynı yapı. Ortalanmış kart, kullanıcı adı/şifre, giriş butonu. Misafir girişi yok.

---

### 4.2 Saha Dashboard (`/field/:fieldId`)

Saha altındaki tüm konteynerlerin özet durumu.

**Yerleşim:**
1. **KPI Kartları (4'lü grid):** `SummaryCard` — Toplam güç (MW), ortalama SoC (%), online/toplam konteyner, offline/alarm konteyner sayısı (kırmızı vurgulu)
2. **Konteyner Grid:** Responsive auto-fit grid. Her kart `ContainerCard`: durum noktası (yeşil/sarı/kırmızı), konteyner adı, SoC çubuğu, güç (kW), bağlı/bağlantısız rozeti.

**Etkileşim:** Kart tıklama → konteyner detay sayfasına.

**Veri:** Örnek (3 konteyner).

---

### 4.3 Konteynerler (`/field/:fieldId/containers`)

Sahadaki konteynerlerin grid görünümü.

**Yerleşim:** Grid içinde `ContainerCard`'lar. Her kart: isim, durum rozeti, bağlantı durumu, SoC, güç, sıcaklık, cihaz sayıları.

**Etkileşim:** Kart tıklama → konteyner detay sayfasına.

**Veri:** Örnek.

---

### 4.4 Konteyner Detay (`/field/:fieldId/containers/:containerId`)

Tek bir konteynerin içindeki cihazların detay görünümü.

**Yerleşim:**
1. **Başlık:** Geri butonu, konteyner adı, `ContainerConnectionBadge`
2. **Özet Mini Kartlar (3'lü):** SoC (%), Durum, Cihaz sayısı
3. **Cihaz Kartları (tipe göre gruplu):**
   - **BSC:** 3x2 grid mini metrik kutucukları — SoC, SoH, Voltaj, Akım, Güç, Sıcaklık (her biri ikonlu)
   - **CB:** Kapalı/Açık durumu, Açtı/Normal durumu
   - **DC Output:** Açık/Kapalı durumu, DC Voltaj, DC Akım
   - **HVAC:** Oda sayısı + ortalama sıcaklık

**Veri:** Örnek.

---

### 4.5 Chart'lar (`/field/:fieldId/charts`)

Saha seviyesinde telemetri grafikleri.

**Yerleşim:** Tam genişlik `TelemetryChart` (480px).

**Metrikler:** SOC, Power, Voltage, Current, MaxCellTemperature.

**Chart kontrolleri:** Zaman aralığı seçici, metrik seçimi, nokta sayısı, konteyner filtresi.

**Veri:** Örnek (288 noktalı zaman serisi).

---

### 4.6 Manevra Kontrol (`/field/:fieldId/control`) — **Placeholder**

**Mevcut durum:** Ortalanmış kart, "Saha seviyesi manevralar — ManevraPanel eklenecek" mesajı.

**Planlanan:** Saha seviyesinde toplu komut gönderme (tüm konteynerleri şarja al, deşarj et, acil durdur).

---

### 4.7 Olaylar (`/field/:fieldId/events`)

Saha altındaki konteynerlerin olay log'ları.

**Yerleşim:** İki sütun. Sol: Sistem Olayları, Sağ: Kullanıcı Hareketleri. Her biri `LogTerminal` (800px). Konteyner bazında filtreleme.

**Veri:** Örnek (15 sistem + 15 kullanıcı log'u).

---

### 4.8 Raporlar (`/field/:fieldId/reports`) — **Placeholder**

**Mevcut durum:** Ortalanmış kart, "Rapor sayfası henüz uygulanmadı" mesajı.

---

### 4.9 Cihazlar (`/field/:fieldId/devices`)

Konteyner seçimli cihaz envanter tablosu.

**Yerleşim:** Konteyner seçici dropdown + `DeviceTable`. 10 cihaz tanımı (BSC-1/2, CB-1/2, DC-1/2, HVAC-1/2/3/4).

**Veri:** Örnek.

---

## 5. Boss-Level Uygulaması (`superadmin`)

Yönetici seviyesinde çoklu saha genel bakış. Mobil öncelikli. PWA desteği mevcut.

**Toplam sayfa:** 3 (tamamı örnek veri ile)

### Genel Yerleşim

- **Başlık Çubuğu:** Sabit 48px. Sol: "CCC" logosu. Sağ: kullanıcı adı + "Çıkış" butonu. Yan çubuk yok.
- **Navigasyon:** İki seviyeli — Dashboard ↔ Saha Detay.

### Sayfa Listesi

| # | Sayfa | Route | Durum |
|:--|:------|:------|:------|
| 1 | Giriş | `/login` | Tamamlandı |
| 2 | Dashboard | `/dashboard` | Tamamlandı (örnek veri) |
| 3 | Saha Detay | `/fields/:id` | Tamamlandı (örnek veri) |

---

### 5.1 Giriş (`/login`)

Diğer uygulamalarla aynı yapı.

---

### 5.2 Dashboard (`/dashboard`)

Tüm sahaların harita ve liste görünümü.

**Yerleşim:**
1. **Saha Haritası (üst ~%40):** `FieldMap` (Leaflet). Türkiye üzerinde 3 saha işaretçisi. Renkli daireler, tıklanabilir.
2. **Saha Kartları Listesi (alt):** `FieldCard`'lar (`size="small"`). Her kart: saha adı, durum, güç (MW), SoC (%), konteyner sayısı. Tıklanabilir.

**Etkileşim:** Harita işaretçisi veya kart tıklama → saha detay sayfasına.

**Veri:** Örnek (3 saha).

---

### 5.3 Saha Detay (`/fields/:id`)

Seçilen sahanın özet ve konteyner durumu.

**Yerleşim:**
1. **Başlık:** Geri butonu, saha ID, yenileme butonu
2. **Özet Grid (2x2):** 4 `SummaryCard` — Toplam Güç, Ortalama SoC, Konteyner Sayısı, Alarm
3. **Konteyner Listesi:** Her satırda konteyner adı + `ContainerConnectionBadge` (bağlı/bağlantısız)

**Veri:** Örnek (4 konteyner).

---

## 6. Genel Durum Özeti

| Uygulama | Toplam Sayfa | Tamamlandı | Placeholder | Veri Durumu |
|:---------|:-----------:|:----------:|:-----------:|:------------|
| container-web | 13 | 11 | 2 | Canlı |
| field | 9 | 7 | 2 | Örnek veri |
| superadmin | 3 | 3 | 0 | Örnek veri |
| **Toplam** | **25** | **21** | **4** | |

### Placeholder Sayfalar

| # | Sayfa | Uygulama | Mevcut Durum |
|:--|:------|:---------|:-------------|
| 1 | Raporlar | container-web | "Geliştirme aşamasında" |
| 2 | Raporlar | field | "Henüz uygulanmadı" |
| 3 | Manevra Kontrol | field | "ManevraPanel eklenecek" |

*Not: superadmin uygulamasında placeholder sayfa yoktur.*

---

*Bu belge, GD-PMS ön yüz uygulamalarının mevcut durumunu UX tasarım ekibine referans olarak sunmak amacıyla hazırlanmıştır.*
