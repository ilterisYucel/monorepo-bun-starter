---
status: active
space: architecture
tags: [mimari, boss, ux, epias, tunel, wireguard, mobil]
review_date: 2026-09-07
---

# Boss Uygulama Mimarisi — UX Çalışması ve Sayfa Tasarımı

Tarih: 2026-09-07
Durum: Onaylanmış tasarım — geliştirme bekliyor
İlgili dokümanlar: [field-superadmin-architecture.md](./field-superadmin-architecture.md), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md), [WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md), [ROLLER-VE-FIELD-UI-PLAN](../roadmap/roller-ve-field-ui-plan.md), [EPIAS-VERI-ANALIZI](../analysis/EPIAS-VERI-ANALIZI.md)
Doğrulama dokümanı: [BOSS-UYGULAMA-DOGRULAMA.md](./BOSS-UYGULAMA-DOGRULAMA.md)

---

## 1. Amaç ve Gereksinimler

Boss uygulaması, çatı şirketin elinde tuttuğu tüm sahaları tek camdan yöneten **patron odaklı** bir uygulamadır. Mevcut `apps/superadmin` iskeleti (PWA, `MobileShell`, boss login, `FieldMap`/`FieldCard`) üzerine inşa edilir; sıfırdan uygulama açılmaz.

| # | Gereksinim |
|---|------------|
| G1 | **Mobile-first** uygulama; ileride Ionic/Cordova ile mobil paket olarak çıkarılır |
| G2 | Harita üzerinde tüm sahaların genel durumu gösterilir |
| G3 | **Varlık yönetimi (Assets Management)** boss'tadır; EPİAŞ verileri (gün öncesi PTF, GİP vb.) grafiklerde gösterilir |
| G4 | Boss, **ws-tunnel uplink** (field→boss outbound WS) ile field uygulamalarına bağlanır; konteyner görünümü field uygulaması üzerinden açılır — **boss→konteyner doğrudan bağlantı YOKTUR** (bkz. §7.4) |
| G5 | Field uygulamaları WireGuard/NAT arkasında olabilir; uplink bu derdi çözer — WireGuard bağlantı arayüzü **yedek/istisnai yol** olarak kalır (teknik yeterliliği zayıf patronlar için) |
| G6 | Dil ve tema seçenekleri bulunur (tema: ileri faza ertelendi — bkz. §2 D8) |
| G7 | Field uygulamaları genel durum verisini cloud'a aktarır; harita popup'larında gösterilir; tunnel ile geçilen sayfalarda gauge'ler/summary kartlar bulunur |
| G8 | Lab ortamı: 1 konteyner + 1 field uygulaması + boss stack — bu zincir korunur |
| G9 | **Tek rol: `boss`.** İleride field bildirimleri de bu uygulamaya aktarılır |

## 2. Kararlar (Tartışma Kaydı)

| # | Karar | Seçim |
|---|-------|-------|
| D1 | Kabuk navigasyonu | Responsif: desktop'ta icon-rail **sidebar**, küçük ekranda **hamburger drawer** (alt tab bar reddedildi — desktop'ta kötü durur) |
| D2 | Tunnel geçiş UX | **iframe gömme** (yeni sekme değil); hedef **field uygulaması**, boss subpath (`/fields/:fid/ui/*`) üzerinden |
| D3 | Tema (açık/koyu) | **İleri faza ertelendi** — bu faz koyu tema sabit; tema katmanı global bir iş olarak planlanır |
| D4 | WireGuard arayüz kapsamı | Host tanımla + bağlantı kur/dur + durum rozeti; `.conf` üretimi backend'de |
| D5 | EPİAŞ ilk veri seti | PTF (gün öncesi) + GİP ağırlıklı ortalama + GÖP/GİP dashboard özetleri |
| D6 | Full-screen iframe | Field-level app'teki gibi **tam ekran** açılır; mobilde (boy > en) **landscape'e zorlanır** — bkz. §5 |
| D7 | Field erişim mimarisi | **Seçenek B: field→boss ws-tunnel uplink** — konteyner→field modelinin üst katman kopyası (outbound WS, register/heartbeat/telemetry); boss'ta field registry + session gateway + tunnel proxy — bkz. §7.4 |

## 3. Kabuk (Shell) Tasarımı

Temel: `apps/superadmin`'in `MobileShell`'i, field/container-web'in `SidebarV2` deseniyle birleştirilir.

### 3.1 Desktop (≥ 1024px) — icon-rail sidebar

```
+-------------------------------------------------------------------------+
| SystemHeader: GD-PMS BOSS | 3 saha · 4/4 online | 🔔 | TR | 👤 patron  |
+------+------------------------------------------------------------------+
|  🗺  |                                                                  |
|  ▤  |   İçerik alanı (PageContent)                                      |
|  💹  |   Harita / Varlıklar / Piyasa / Bildirimler / Ayarlar             |
|  🔔  |   veya stack'lenen detay sayfaları (Saha → Uzaktan Görünüm)       |
|  ⚙  |                                                                  |
+------+------------------------------------------------------------------+
 80px
```

- Sidebar: 80px icon-rail (field/container-web `SidebarV2` paterni). Nav item'ları: Harita, Varlıklar, Piyasa, Bildirimler, Ayarlar.
- Footer: kullanıcı rozeti + çıkış.
- Tek rol olduğundan **nav-görünürlük filtrelemesi yoktur** (field `nav-visibility.ts` paternine gerek kalmaz).

### 3.2 Mobile (< 1024px) — hamburger drawer

```
┌───────────────────────┐
│ ≡  GD-PMS BOSS   👤   │  ← SystemHeader (48px, hamburger solda)
├───────────────────────┤
│                       │
│  İçerik alanı         │
│  (tek sütun, max-width │
│   480px içerik)       │
│                       │
└───────────────────────┘

Drawer açıkken:
┌───────────────────────┐
│ ≡  GD-PMS BOSS   👤   │
├───────────┬───────────┤
│ 🗺 Harita │  (karanlık│
│ ▤ Varlık  │   overlay)│
│ 💹 Piyasa │           │
│ 🔔 Bildir.│           │
│ ⚙ Ayarlar │           │
└───────────┴───────────┘
```

- Hamburger → soldan açılan drawer; aynı nav item'ları, dokunma hedefi ≥ 44px (PWA dokunma standardı).
- İçerik tek sütun; kart grid'leri ekran genişliğine sarılır.
- Breakpoint konvansiyonu: mevcut uygulamalardaki `@media (max-width: 1024px)` eşiği (container-web deseni).

## 4. Sayfa Envanteri

Rotalar:

| Rota | Sayfa |
|------|-------|
| `/login`, `/change-password` | Giriş / şifre (mevcut) |
| `/dashboard` | **Harita** (varsayılan sayfa) |
| `/fields/:fieldId` | **Saha Detay** |
| `/fields/:fieldId/remote` | **Saha Uzaktan Görünüm (field app)** |
| `/assets` | **Varlıklar** |
| `/market` | **Piyasa** |
| `/notifications` | **Bildirimler** (placeholder) |
| `/settings` | **Ayarlar** |

### 4.1 Harita — `/dashboard` (varsayılan)

Veri: `GET /api/admin/fields` — `FieldPoller` 30 sn'de bir field summary'lerini `admin_fields` tablosuna yazar.

```
+-------------------------------------------------------------------------+
| HARİTA                                                                  |
| ┌─────────────────────────────────────────────────────────────────────┐ |
| │                                                                     │ |
| │                     ⚑ (Leaflet, tüm yükseklik)                       │ |
| │   ┌──────────────────────────────┐                                  │ |
| │   │ İstanbul-1        ● 3/4      │   ← popup: saha mini özeti        │ |
| │   │ Güç 2.4 MW · SoC %62 · 1⚠   │                                  │ |
| │   │ [Detay →]                   │                                  │ |
| │   └──────────────────────────────┘                                  │ |
| └─────────────────────────────────────────────────────────────────────┘ |
| ▸ [FieldCard][FieldCard][FieldCard][FieldCard]  …  ← yatay kaydırma     |
+-------------------------------------------------------------------------+
```

- Popup içeriği: `SummaryCard` kümesi (online/toplam konteyner, toplam güç, ort. SoC, aktif alarm) + "Detay" bağlantısı.
- Alt şerit: `FieldCard` yatay kaydırılabilir liste (mobilde kart kaydırması); karta tıklayınca Saha Detay.

### 4.2 Saha Detay — `/fields/:fieldId`

Veri: `GET /api/admin/fields/:id` (FieldPoller satırı) + saha konteyner listesi.

```
+-------------------------------------------------------------------------+
| ← Geri    SAHA DETAY — İstanbul-1    [⛶ Field Uygulamasını Aç] [✎ Düzenle]|
+-------------------------------------------------------------------------+
| ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                        |
| │ 2.4 MW  │ │ SoC %62 │ │ 3/4     │ │ 1 aktif │                        |
| │ Top.Güç │ │ Ort.SoC │ │ Online  │ │ Alarm   │                        |
| └─────────┘ └─────────┘ └─────────┘ └─────────┘   ← SummaryCard ×4      |
+-------------------------------------------------------------------------+
| KONTEYNERLER                                                           |
| ┌─────────────────────┐ ┌─────────────────────┐                        |
| │ container-01  ● bağlı│ │ container-02 ● bağlı│  ← ContainerCard +     |
| │ PCS 500 kW  SoC %58 │ │ PCS 500 kW  SoC %66 │    ConnectionBadge     |
| └─────────────────────┘ └─────────────────────┘                        |
| Konteyner UI'sı field uygulaması İÇİNDE açılır (bkz. §4.3)             |
+-------------------------------------------------------------------------+
```

- SummaryCard'lar: toplam güç, ort. SoC, online konteyner, aktif alarm.
- **"Field Uygulamasını Aç"** → §4.3 uzaktan görünüme geçer; konteyner UI'sı field uygulaması içindeki kendi tünelinden açılır (boss→konteyner doğrudan YOKTUR — bkz. §7.4).
- WG durum rozeti: saha WG host'u tanımlıysa bağlı/kopuk (bkz. §7.5).

### 4.3 Saha Uzaktan Görünüm (field app) — `/fields/:fieldId/remote`

Veri: field summary payload genişletmesi (gauge verileri) + **ws-tunnel uplink ile field uygulaması** (§7.4). Tam ekran/landscape davranışı §5'te.

```
+-------------------------------------------------------------------------+
| ← Geri   SAHA — İstanbul-1 (UZAKTAN)             [⛶ Tam Ekran]          |
+-------------------------------------------------------------------------+
| ┌──────┐ ┌──────┐ ┌──────┐ ┌─────────────┐                             |
| │SoC   │ │Güç   │ │Sıcak │ │ ⚠ 2 alarm   │                             |
| │ %62  │ │2.4MW │ │31°C  │ │ (ileri faz) │  ← DeviceGauges + Summary    |
| └──────┘ └──────┘ └──────┘ └─────────────┘                             |
+-------------------------------------------------------------------------+
| ┌─────────────────────────────────────────────────────────────────────┐ |
| │                                                                     │ |
| │      field-level uygulama (iframe — uplink tünelinden, /ui/*)        │ |
| │      konteyner UI'sı BURADA field app'in kendi tünelinden açılır     │ |
| │                                                                     │ |
| └─────────────────────────────────────────────────────────────────────┘ |
+-------------------------------------------------------------------------+
```

- Gauge'ler field snapshot'ından (`admin_fields` genişletilmiş payload): SoC, güç, sıcaklık + alarm sayısı.
- Iframe `src` = boss subpath `/fields/:fid/ui/*` — istekler **uplink tünelinden** field web-service'e akar (§7.4); SPA statikleri + API + WS aynı kanaldan köprülenir.
- Konteyner kartlarına tıklayınca field uygulaması **kendi** konteyner tüneliyle container UI'yı açar (iç içe tam ekran — KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md R3 deseni).
- **"Tam Ekran"** ile §5'teki davranış.

### 4.4 Varlıklar — `/assets`

Veri: `GET/POST/PUT/DELETE /api/admin/fields` (mevcut boss-tier route'ları).

```
+-------------------------------------------------------------------------+
| VARLIKLAR                                        [+ Yeni Saha]          |
| ┌─────────────────────────────┐  [Filtre: durum ▾]                     |
| │ 🔍 Ara…                     │                                        |
| └─────────────────────────────┘                                        |
| ┌───────────┐ ┌───────────┐ ┌───────────┐                              |
| │ İstanbul-1│ │ Ankara-1  │ │ İzmir-1   │   ← FieldCard grid (arama/    |
| │ ● 3/4     │ │ ● 2/2     │ │ ○ kopuk   │      filtre uygulanmış)      |
| └───────────┘ └───────────┘ └───────────┘                              |
+-------------------------------------------------------------------------+
| VARLIK ENVANTERİ (saha seçili)                                         |
|  Cihaz          | Tip   | Kapasite | Durum                             |
|  container-01   | PCS   | 500 kW   | ● bağlı                           |
|  container-02   | PCS   | 500 kW   | ● bağlı                           |
+-------------------------------------------------------------------------+
```

- Saha kayıt formu: ad, konum (haritadan pin), API URL, WireGuard host eşlemesi.
- Envanter tablosu: konteyner/cİhaz varlıkları (kapasite, tip, durum).

### 4.5 Piyasa — `/market`

Veri: yeni `GET /api/market/*` kontratları (boss web-service → `external_series`; integration-service zaten boss stack'te EPİAŞ çekiyor — bkz. §7.3).

```
+-------------------------------------------------------------------------+
| PİYASA — EPİAŞ                                   [Son veri: 14:30 TR]  |
+-------------------------------------------------------------------------+
| ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                     |
| │ GÖP Özeti    │ │ GİP Özeti    │ │ WAP Ortalama │                     |
| │ PTF 2.450 ₺  │ │ 2.380 ₺      │ │ 2.41 ₺       │  ← SummaryCard       |
| └──────────────┘ └──────────────┘ └──────────────┘                     |
+-------------------------------------------------------------------------+
| PTF — GÜN ÖNCESİ (24 saat)                                             |
|  ▂▂▅▇▇▃▁▁▂▅▇▇▅▃▂▁▁▂▅▇ …   yeşil = şarj bandı, kırmızı = deşarj bandı  |
|  (bar grafik — MultiLineChartV2, fırsat bandı eşik çizgisiyle)          |
+-------------------------------------------------------------------------+
| GİP — AĞIRLIKLI ORTALAMA (line)                                        |
|  ╱╲___╱‾‾╲_╱‾‾ …                                                     |
+-------------------------------------------------------------------------+
```

- TR saati gösterimi; her grafikte **"son veri zamanı"** etiketi (SMF gecikmesi konvansiyonu — EPIAS analizi §9).
- Şarj/deşarj fırsat bandı: PTF < gün ortalaması → şarj uygun, PTF > ort. → deşarj uygun (renk bantları).

### 4.6 Bildirimler — `/notifications` (placeholder)

```
+-------------------------------------------------------------------------+
| BİLDİRİMLER                                                            |
| ┌─────────────────────────────────────────────────────────────────────┐ |
| │  ⚠ Saha alarmları   ·   📋 Denetim akışı      (ileri faz)           │ |
| │  Field bildirim aktarımı geldiğinde LogTerminal + rozetler          │ |
| └─────────────────────────────────────────────────────────────────────┘ |
+-------------------------------------------------------------------------+
```

Bu fazda statik placeholder; field→boss bildirim aktarımı Faz 5'te (§8).

### 4.7 Ayarlar — `/settings`

Veri: `settingsStore` (locale — çalışır durumda), WireGuard host CRUD (Faz 4'te yeni backend).

```
+-------------------------------------------------------------------------+
| AYARLAR                                [Tabs: Genel | Ağ | Hesap]       |
+-------------------------------------------------------------------------+
| GENEL                                                                  |
|  Dil:        [ TR ● | EN ○ ]                                           |
|  Tema:       Koyu (açık/koyu ileri faz — D3)                           |
+-------------------------------------------------------------------------+
| AĞ — WIREGUARD HOSTLARI                                                |
|  ┌─────────────────────────────────────────────────────┐ ┌──────────┐  |
|  │ wg-ist-1  endpoint 5.5.5.5:51820   ● Bağlı         │ │ [Durdur] │  |
|  └─────────────────────────────────────────────────────┘ └──────────┘  |
|  ┌─────────────────────────────────────────────────────┐ ┌──────────┐  |
|  │ wg-ank-1  endpoint 6.6.6.6:51820   ○ Kapalı        │ │ [Bağlan] │  |
|  └─────────────────────────────────────────────────────┘ └──────────┘  |
|  [+ Yeni Host: ad, endpoint, public key, PSK]                          |
+-------------------------------------------------------------------------+
| HESAP                                                                  |
|  Şifre değiştir  ·  Çıkış                                             |
+-------------------------------------------------------------------------+
```

## 5. Tam Ekran IFRAME ve Landscape Zorlama (D6)

Field ve container uygulamaları **desktop-first** tasarımdır (80px rail, yoğun SCADA grid'leri). Bu uygulamalara mobile-first responsive uyarlama yapmak yerine, boss uygulamasında uzaktan görünüm geçişlerinde aşağıdaki davranış uygulanır — **en garantili yol budur**:

1. **Açılış:** Saha Uzaktan Görünüm sayfasında (§4.3) "Tam Ekran" → **field uygulaması iframe'i** tüm ekranı kaplar — browser `Fullscreen API` (`requestFullscreen`). Field app içinden açılan konteyner UI'sı da (iç içe tam ekran) bu davranıştan yararlanır.
2. **Mobil portrait (boy > en):** `matchMedia("(orientation: portrait)")` tespiti; bu cihazlarda uzaktan görünüm açılırken `screen.orientation.lock("landscape")` denenir (Android Chrome tam destek; iOS Safari 16.4+ kısmi). Lock başarısız olursa **"Cihazı yatay çevirin"** overlay'i gösterilir.
3. **Otomatik zorlama:** Uzaktan görünüm sayfasına portrait mobilde girildiğinde tam ekran + landscape akışı kendiliğinden başlar; kullanıcıya ayrıca elle "Tam Ekran" butonu sunulur.
4. **Geri dönüş:** Tam ekrandan çıkışta (`exitFullscreen`) boss kabuğuna dönülür; oryantasyon kilidi bırakılır.
5. **Güvenlik:** Iframe `allow="fullscreen"` + `sandbox` (scripts, same-origin, forms; `allow-same-origin` oturum cookie akışı için gereklidir — bkz. §7.4).

Not: Bu karar yalnızca **uzaktan görünüm iframe'i** içindir; boss uygulamasının kendi sayfaları mobile-first responsive kalır (D1).

## 6. Tasarım Dili Uyumu

| Katman | Kural |
|--------|-------|
| Renkler | Yalnızca `COLORS` token'ları (104 token); hardcoded hex YASAK |
| İkonlar | `SCADA_ICONS`; **eksik 3 ikon eklenir:** `map`, `notification`, `market` (`types.ts` → `nav-icons.tsx`, TbMap2/TbBell/TbCoins) |
| Kartlar | `FieldCard`, `SummaryCard`, `ContainerCard`, `ContainerConnectionBadge` hazır (superadmin için zaten üretildi) |
| Gauge/grafik | `DeviceGauges`, `TelemetryGauge`; zaman serisi: uPlot (`MultiLineChartV2`, `Sparkline`) — Recharts yok (2026-09-02 taşındı) |
| i18n | `TranslationProvider` + `BOSS_TR/EN_DICT` (mevcut); yeni sayfa anahtarları `boss.*` ad alanında |
| Stil | Emotion `*.styles.ts` + `COLORS` (superadmin'in mevcut inline-style yaklaşımı yerine field/container-web konvansiyonu) |
| Form | Mevcut superadmin login form deseni; yeni formlarda `TelemetryInput` tarzı atom'lar değerlendirilir |

## 7. Veri Akışı ve Backend Kontratları

### 7.1 Mevcut altyapı (değişiklik gerekmez)

- `apps/superadmin` iskeleti: PWA, `MobileShell`, `AuthStore`, boss login (`boss123` seed, `mustChangePassword`).
- `services/web-service` `SERVICE_TIER=boss`: `FieldPoller` (30 sn, `admin_fields`), `/api/admin/fields` CRUD.
- `docker-compose.boss.dev.yml`: timescaledb + redis + web-service(5003) + superadmin(5175) + integration-service (EPİAŞ plugin'i).
- `packages/ui`: `FieldMap` (Leaflet TR), `FieldCard`, `ContainerConnectionBadge`.

### 7.2 Field summary payload genişletmesi

Field uygulamalarının cloud'a ittiği "genel durum verisi" bugün `GET /api/fields/:id/summary` ile taşınıyor (FieldPoller'ın çektiği endpoint). Boss gauge'leri ve harita popup'ları için payload şu alanları kapsayacak şekilde genişletilir:

```ts
interface FieldSummary {
  fieldId: string;
  containerCount: number;
  onlineContainers: number;
  totalPowerMw: number;      // mevcut
  avgSocPercent: number;     // mevcut
  activeAlarms: number;      // mevcut
  // YENİ — konteyner başına gauge verisi (boss §4.3 için):
  containers?: Array<{
    containerId: string;
    connected: boolean;
    socPercent: number;
    powerKw: number;
    temperatureC: number;
    activeAlarms: number;
  }>;
  updatedAt: string;
}
```

- Değişiklik yeri: field tier summary route + `FieldPoller` satır eşlemesi (`admin_fields`'e JSON kolon veya ek kolonlar — implementasyonda kararlaştırılır; önerilen: `containers_summary JSONB`).
- Geriye dönük uyumluluk: yeni alanlar opsiyonel; eski field sürümleri boş dizi üretir, boss UI kademeli bozulur (gauge yerine "veri yok").

### 7.3 EPİAŞ veri kontratı — `GET /api/market/*` (yeni)

Boss web-service'e eklenecek endpoint'ler (veri kaynağı: boss stack'teki `external_series` TimescaleDB tablosu — `EpiasMarketPricesPlugin` zaten saatte bir yazıyor):

| Endpoint | Seri | Gösterim |
|----------|------|----------|
| `GET /api/market/ptf?from&to` | Gün öncesi PTF (TL/MWh) | §4.5 bar grafik + fırsat bandı |
| `GET /api/market/gip-weighted-average?from&to` | GİP ağırlıklı ortalama | §4.5 line grafik |
| `GET /api/market/summary` | GÖP/GİP dashboard özetleri | §4.5 SummaryCard'lar |

- Tüm cevaplar TR saati; her seriye `lastUpdatedAt` alanı ("son veri zamanı" etiketi için).
- Güvenlik: `/api/market/*` boss rolüne açık; rbac matrisine satır eklenir.
- TGT yaşam döngüsü kullanıcıya görünmez — integration-service'in `EpiasTicketStore`'u (dosya önbellekli, throttle korumalı) zaten yönetiyor.

### 7.4 ws-tunnel akışı — field uplink (G4, D7)

#### 7.4.1 Yön kısıtı (neden boss→konteyner doğrudan YOK)

- Tünel bileşenleri yalnızca field tier'da register edilir: `services/web-service/src/config/container.ts:290` (`sessionGateway`, `tier === "field"`), `:306` (`tunnelProxy`, `tier === "field"`). Boss tier'da bunların hiçbiri yoktur — yalnızca `fieldPoller` (`container.ts:321`, 30 sn HTTP poll).
- Fiziksel yön tektir: **konteyner → field** outbound WSS (KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md R4/R5). Boss, field'ın üstünde bir katmandır ve konteynerlere giden inbound kanalı yoktur.
- Sonuç: boss'tan konteynere doğrudan bağlantı **mimari gereği imkânsızdır**; konteyner görünümüne ancak field uygulaması üzerinden ulaşılır.

#### 7.4.2 Seçilen model (D7): field→boss ws-tunnel uplink

Konteyner→field modelinin **birebir üst katman kopyası** kurulur; aynı paketler ve aynı sözleşmeler yeniden kullanılır:

```
                                 outbound WSS uplink (bağlantıyı FIELD başlatır)
              field web-service ────────────────────────────────> boss web-service
               ▲   register {fieldId} / heartbeat / telemetry push / olay frame'leri
               │   (stream + kontrol mesajları bu kanaldan ÇİFT YÖNLÜ akar)
               │
               └── konteynerler (mevcut ws-tunnel, DEĞİŞMEZ)

boss UI ──HTTP──> boss web-service (tunnel proxy) ──stream frames──> field web-service ──> field app SPA
   /fields/:fid/ui/*   (open-session → cookie → stream)                                API + WS köprüsü
```

**Yeni bileşenler:**

| Bileşen | Katman | Görevi | Temeli |
|---------|--------|--------|--------|
| `FieldUplinkConnector` | field web-service | Boss cloud'a **outbound** WSS açar (ana+yedek URL, backoff, generation koruması); `register {fieldId, protocolVersion}` → `register-ack`; heartbeat; field summary/olay frame'lerini **push** eder | `FieldConnector` deseni (`packages/ws-tunnel/src/connector/`) |
| `FieldRegistry` | boss web-service (tier=boss) | Kayıtlı field'ların durum kaydı (connected/stale/idle); token hash doğrulaması (fail-closed); `lastSeenAt` | `ContainerProxy` deseni (registry + gözlemciler) |
| `FieldSessionGateway` + `FieldTunnelProxy` | boss web-service (tier=boss) | `POST /api/fields/:fid/session` (oturum açma, boss rolü, audit fail-closed) + `/fields/:fid/ui/*` HTTP/WS köprüsü (stream multiplex, kredi, allowlist) | `ContainerSessionGateway` + `TunnelProxy` (`packages/ws-tunnel/src/proxy/`) |

**Kurallar (üst katmana uyarlanmış sözleşme):**

1. **Tek yön:** field, boss'a **outbound WSS** açar (konteynerin field'a açtığı gibi); ters yönde (boss→field) inbound TCP/HTTP YOKTUR. Kayıt token'ı (`FIELD_UPLINK_TOKEN`) hash olarak boss PG'de tutulur — sır düz metin saklanmaz.
2. **Oturum:** boss kullanıcısı `open-session` başlatır → field kendi secret'iyle kısa ömürlü JWT üretir (`type:"field-session"` etiketi — container oturum token'larıyla karışmaz) → boss tarafı cookie'yi path-scoped saklar (`/fields/<fid>/ui`). Boss kullanıcısı field DB'sine ASLA yazılmaz.
3. **Allowlist:** `/api/*`, `/ws/*`, `/assets/*`, `/favicon*`, `/`; YASAKLILAR: boss oturum/kullanıcı yönetimi uçları (field tarafı: `/api/auth/users` vb.).
4. **Limitler:** 1 etkileşimli oturum/saha, 16 eşzamanlı stream, pencere 256 KiB, TTL 4 sa, idle 15 dk (konteyner sözleşmesiyle aynı).
5. **Yan fayda (G9):** field→boss alarm/audit bildirim frame'leri **aynı kanaldan** akar — bildirim aktarımı için ayrı altyapı gerekmez (bkz. §7.6).
6. **WG'nin rolü (§7.5):** uplink sayesinde field'ın WG/NAT arkasında olması boss erişimini engellemez; WG yalnızca yedek/istisnai yol olarak kalır.

**Kademeli bozulma:** uplink kapalıyken boss yine `FieldPoller` HTTP'den özet verileri görür (mevcut davranış); yalnızca uzaktan görünüm devre dışı olur.

#### 7.4.3 Paket yeniden kullanımı — ürün tescil notu

Bu ikinci kurulum, `@gd-monorepo/ws-tunnel`'ın **üretimdeki ikinci bağımsız deployment'ıdır** — paketin ayrı ürün niteliğinin ilk canlı kanıtı (loopback demo ötesinde). Aynı zamanda ilk kurulumdan miras kalan uygulama-bazlı kırılganlıkların görünür olduğu andır: register şemasındaki `containerId` alanı, `FIELD_*` isim ailesi, sabit `container_session` cookie adı, sabit path allowlist.

**Karar:** register şeması nötr **`peerId`**'ye genellenir (protokol v2, eski v1 geriye uyumlu); isimler `TUNNEL_*`'a taşınır (deprecated alias'lar kalır); cookie adı ve allowlist config'e taşınır. Tam envanter, adımlama ve açık kararlar: [WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md). Arındırma uplink'i bloklamaz — paralel görevdir.

### 7.5 WireGuard modülü (G5 — Faz 4, yedek yol)

Uplink (§7.4) birincil erişim yoludur; WireGuard **yedek/istisnai yol** olarak kalır (örn. uplink'in kurulamadığı sahalar veya özel ağ senaryoları).

- **Veri:** boss PG'de `wg_hosts` tablosu (ad, endpoint, public key, PSK — secret kolon, loglanmaz) + `wg_connection_state`.
- **Backend:** boss web-service'e `WireGuardConnection` modülü: host CRUD, `connect/disconnect` (host üzerinde `wg-quick`; boss servis konteynerı `NET_ADMIN` + `/dev/net/tun` erişimiyle veya WG sidecar — implementasyonda kararlaştırılır), bağlantı sonrası saha `api_url`'ine HTTP prob ile durum doğrulama.
- **UI:** §4.7'deki host listesi; "Bağlan" → backend konfig üretir + bağlar → prob geçerse ● Bağlı. Patron yalnızca 4 alan doldurur: ad, endpoint, public key, PSK.
- **Güvenlik:** PSK redaction (loglarda asla görünmez), işlemler audit loguna girer.

### 7.6 Bildirim aktarımı (G9 — Faz 5)

Field alarm/audit geçişleri **uplink kanalından** boss'a taşınır (§7.4.2):

1. **Kaynak (field tier):** `UplinkEventRelay` — `log_events` (TamperLogger zinciri; field stack'teki TÜM servisler aynı tabloya yazar) `seq` cursor'ıyla 10 sn'de bir delta okur; whitelist'teki geçişler `event` frame'i olarak push edilir. İlk tur son 1 saatlik backlog gönderir; `eventId = <fieldId>:<seq>`.
2. **Whitelist:** `device_alarm`, `device_alarm_cleared`, `alarm_resolved`, `session_open`, `session_end` — yalnızca patronun kararında değer taşıyan geçişler (tam log akışı gürültü).
3. **Taşıma:** ws-tunnel `EventMessage` (v2 additif — jenerik olay bildirimi; `TUNNEL_MESSAGE_TYPES`'a satır).
4. **Hedef (boss tier):** `FieldEventCollector` — registry gözlemcisi; `field_events` tablosuna `(field_id, event_id)` UPSERT dedupe (backlog yeniden gönderimi güvenli).
5. **UI:** `GET /api/notifications?limit&after` + `GET /api/notifications/unread-count?since` (rbac admin/boss); NotificationsPage + nav rozeti (15 sn tazeleme; okundu durumu client-side "son görülme" — tek rol patron).
6. **Dürüstlük:** boss kopyası bilgilendirme amaçlı — tamper-evidence otoritesi field'ın `log_events` zincirinde kalır (imza field secret'iyle; boss yalnızca alan kopyasını görür).

## 8. Faz Planı

| Faz | Kapsam | Kabul kriteri |
|-----|--------|---------------|
| **Faz 1 — Kabuk + Harita + Varlıklar** | Responsif kabuk (sidebar/drawer), icon eklemeleri, Harita (FieldPoller verisi), Saha Detay, Varlıklar CRUD | Boss login → haritada tüm sahalar canlı; saha kaydı/düzenleme/silme çalışır; 1024px altında drawer |
| **Faz 2 — Piyasa** | `/api/market/*` + §4.5 sayfası + rbac satırı | PTF 24h grafik + özet kartlar canlı veriyle; "son veri" etiketi |
| **Faz 3 — Field Uplink + Saha Uzaktan Görünüm** | `FieldUplinkConnector` (field tier), `FieldRegistry` + `FieldSessionGateway` + `FieldTunnelProxy` (boss tier), §7.2 payload genişletmesi, §4.3 sayfası, §5 tam ekran/landscape akışı, ws-tunnel arındırması ([WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md)) | Lab stack'te (WG'siz): boss iframe → field uygulaması uplink tünelinden açılır; içinde konteyner UI açılır; mobil portrait → landscape zorlaması |
| **Faz 4 — WireGuard (yedek yol)** | `wg_hosts` + bağlantı modülü + §4.7 Ağ sekmesi | Host tanımla → bağlan → prob → rozet; PSK loglanmaz |
| **Faz 5 — Bildirimler + Tema + Mobil paket** | §4.6 gerçek veri (alarm/audit aktarımı — uplink kanalından, §7.6), açık/koyu tema, Ionic/Cordova paketleme | Bildirim akışı canlı; tema değiştirilebilir; mobil paket derlenir |

Faz kapanışlarında [BOSS-UYGULAMA-DOGRULAMA.md](./BOSS-UYGULAMA-DOGRULAMA.md)'ya giriş zorunludur (repo sözleşmesi — satır referanslı değişiklik kaydı, testler, kabul kriteri kanıtları).

## 9. Açık Sorular ve Riskler

| # | Konu | Durum |
|---|------|-------|
| A1 | Field summary payload genişletmesi: JSONB kolon mu ayrı tablo mu | Faz 3'te kararlaştırılır |
| A2 | WG backend nerede koşar (web-service `NET_ADMIN` mi, sidecar mı) | Faz 4'te kararlaştırılır |
| A3 | `screen.orientation.lock` iOS kısıtları — rotate overlay yeterli mi | Faz 3'te cihaz matrisiyle doğrulanır |
| A4 | EPİAŞ dashboard özetlerinin `external_series`'e yazılmıyor oluşu (plugin seri seti) | Faz 2 başında kontrol; gerekirse plugin seri listesine eklenir |
| A5 | Field app içi login: boss, uzaktan görünüm iframe'inde field uygulamasına **boss rolüyle** giriş yapar; tek-login (SSO) iyileştirme adayı | Faz 3 sonrası değerlendirilir |
| A6 | Prod `docker-compose.boss.yml` henüz yok (yalnızca dev) | Faz kapanışlarında dev ortamda doğrulama; prod compose Faz 5 öncesi |
| A7 | Uplink protokol sürümü/geriye uyumluluk (eski field sürümleri uplink'siz çalışmaya devam eder) | Faz 3 tasarımında sürüm alanıyla sabitlenir |
| A8 | Çift katmanlı oturum token'ları: `field-session` etiketi `container-session` ile karışmamalı (`ITokenSigner` sözleşmesi) | Faz 3'te doğrulanır |
| A9 | ws-tunnel arındırması: `peerId` genellemesi (protokol v2), `TUNNEL_*` nötr isimler, cookieName/allowlist config'i (F1-F7 envanteri) | Faz 3 tasarımında — uplink'i bloklamaz; bkz. [WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md) |

## 10. Kaynaklar

- [EPIAS-VERI-ANALIZI.md](../analysis/EPIAS-VERI-ANALIZI.md) — EPİAŞ erişim modeli, veri kataloğu, ilk faz serileri
- [field-superadmin-architecture.md](./field-superadmin-architecture.md) — üç katmanlı federasyon, FieldPoller
- [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) — tünel/oturum sözleşmesi, tam ekran deseni (R3)
- `apps/superadmin`, `apps/field` (`nav-visibility.ts`, `SidebarV2` paternleri), `packages/ui` (FieldMap/FieldCard/SummaryCard/DeviceGauges/MultiLineChartV2)
