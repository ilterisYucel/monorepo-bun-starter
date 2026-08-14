# GD-PMS Monorepo — UI v2 Yeniden Yapılandırma Planı

> **Tarih:** 2026-08-11  
> **Durum:** Plan aşaması, henüz implementasyon başlamadı  
> **Mimari İlkeler:** FSD, Dependency Inversion, Atomic Design, Polymorphism  
> **Rollback:** `USE_SIDEBAR_V2 = false` ile eski Sidebar ve sayfalara anında dönüş

---

## İçindekiler

1. [Mimari İlkeler](#1-mimari-ilkeler)
2. [Step Tabanlı Responsive Sistem](#2-step-tabanlı-responsive-sistem-referans-analiz)
3. [Menü Yapısı & SidebarV2](#3-menü-yapısı--sidebarv2)
4. [Route Haritası & Geri Dönüş Stratejisi](#4-route-haritası--geri-dönüş-stratejisi)
5. [Dashboard — Tek Hat SCADA Şeması](#5-dashboard--tek-hat-scada-şeması)
6. [BSC Sayfası](#6-bsc-sayfası)
7. [HVAC Sayfası](#7-hvac-sayfası)
8. [Diğer Sayfalar](#8-diğer-sayfalar)
9. [Bileşen Envanteri](#9-bileşen-envanteri)
10. [Veri Akışı — Dependency Inversion](#10-veri-akışı--dependency-inversion)
11. [Uygulama Sırası](#11-uygulama-sırası)
12. [Riskler & Notlar](#12-riskler--notlar)

---

## 1. Mimari İlkeler

| # | İlke | Uygulama |
|---|------|----------|
| 1 | Önyüzler **FSD** ile geliştirilir | `features/<name>/` altında hooks, services, types, components |
| 2 | **Dependency Inversion** — her şey kontrata bağlı | UI paketi sadece interface görür, implementasyon app katmanında |
| 3 | UI katmanları **Atomic Design** ile | atoms → molecules → organisms → pages |
| 4 | **Polymorphism** — interface'ler ile | `ITelemetryTransport`, `TelemetryProvider`, `LogProvider`, `IDeviceDetailProvider` |
| 5 | Yeniden kullanılabilir componentler `@packages/ui`'de | Kartlar, chart'lar, grafik elementleri, atom'lar |
| 6 | İcon + renk = design code, `@packages/ui`'den | `SCADA_ICONS`, `COLORS`/`COLOR`, yeni eklemeler `packages/ui`'ye |
| 7 | Geri dönüş stratejisi | Eski Sidebar ve route'lar yorumda korunur, v2 bağımsız dosyalardadır |

---

## 2. Step Tabanlı Responsive Sistem (Referans Analiz)

### 2.1 Mevcut BSC `calculateStepConfig`

```ts
// BSCGraphic.utils.ts — TEK değişkenle tüm responsive'lik:
const step = width / 20;

return {
  step,                          // temel birim
  rackWidth:   1.55 * step,      // raf genişliği  = step × 1.55
  rackHeight:  5.5  * step,      // raf yüksekliği = step × 5.5
  rackGap:     0.12 * step,      // raf arası boşluk
  outputRadius: 0.78 * step,     // DC çıkış yarıçapı
  startX:      1.0  * step,      // başlangıç X ofseti
  startY:      1.3  * step,      // başlangıç Y ofseti
};
```

**Tüm pozisyonlar, boyutlar ve font'lar `step`ten türetilir:**

```
yazı font'ları:    Math.max(7,  step × 0.19)  → min 7px
                   Math.max(9,  step × 0.20)  → min 9px
                   Math.max(11, step × 0.28)  → min 11px
                   Math.max(13, step × 0.36)  → min 13px
başlık font'u:     Math.max(15, step × 0.40)  → min 15px

elemanlar:
  bus bar Y:       startY ± 0.3 × step
  breaker:         startX + 0.3 × step  (boşluk)
                   uzunluk = 2.0 × step
  convergence:     lastRackRight + 0.5 × step
  output:          breakerEnd + outputRadius
```

**Resize davranışı:** `ResizeObserver` → 350ms debounce → `resizeKey++` → PixiJS Application remount

### 2.2 Mevcut TMS `calculateStepConfig`

```ts
// TMSGraphic.utils.ts — yine step = width / 20:
const step = width / 20;

return {
  step,
  panelWidth:   2.2 * step,
  roomWidth:    (availableWidth) / roomCount,  // kalan alanı böl
  roomHeight:   7.5 * step,
  startX:       0.5 * step,
  startY:       0.8 * step,
};
```

**Bu kalıp tüm yeni bileşenlerde korunacak.**

---

## 3. Menü Yapısı & SidebarV2

### 3.1 Menü Sıralaması

```
📊  Dashboard           → /dashboard
🔋  BSC                 → /bsc
🔥  Yangın Paneli       → /fire
⚡  Enerji Analizörü    → /energy-analyzer
❄️  HVAC               → /hvac
🎛️  Kontrol            → /control
📈  Sistem Grafikleri   → /system-charts
📅  Olaylar             → /events
📋  Raporlar            → /reports
📊  Analitik            → /analytics        (boş placeholder)
💻  Cihazlar            → /devices          (boş placeholder)
```

### 3.2 SidebarV2 Spesifikasyonu

```
   ┌──────────┐
   │          │
   │  ⚡ CCC  │  ← Logo, 28px, COLORS.info
   │          │
   │  ┌────┐  │
   │  │ 📊 │  │  ← 22px icon
   │  │Dash│  │  ← 10px label (textMuted/textPrimary)
   │  └────┘  │
   │  ┌────┐  │
   │  │ 🔋 │  │
   │  │BSC │  │
   │  └────┘  │
   │    ...    │     ← 11 menü öğesi
   │          │
   │  ──────  │     ← separator (borderDefault)
   │  ┌────┐  │
   │  │ 👤 │  │     ← tıklayınca popover: Ad + Rol + Yetki
   │  └────┘  │
   │  ┌────┐  │
   │  │ ⚙️ │  │     ← settings
   │  └────┘  │
   │  ┌────┐  │
   │  │ 🛑 │  │     ← emergency stop (kırmızı, COLORS.error)
   │  └────┘  │
   │  ┌────┐  │
   │  │ 🚪 │  │     ← logout / login
   │  └────┘  │
   └──────────┘
     80px sabit
```

**Özellikler:**

| Özellik | Değer |
|---------|-------|
| Genişlik | 80px (sabit, toggle yok) |
| İcon boyutu | 22px |
| Label font | 10px |
| NavItem layout | `flex-direction: column`, `justify-content: center`, `align-items: center`, `gap: 4px` |
| NavItem boyutu | 80px × 56px |
| Aktif arka plan | `COLORS.info`, icon beyaz, label `COLORS.textPrimary` |
| Pasif | `transparent`, icon `textMuted`, label `textMuted` |
| Hover | `COLORS.borderDefault`, `COLORS.textPrimary` |
| Border radius | 10px |
| Kullanıcı popover | Tıklamayla toggle (hover değil). İçerik: Ad(13px) + Rol Badge + Yetki seviyesi |
| Popover pozisyon | `left: calc(100% + 12px)`, `top: auto` (popper mantığı) |
| Emergency stop | Kırmızı (`COLORS.error`), aynı `fl03_emergency_stop` maneuver mantığı |
| Guest kullanıcı | Sadece Dashboard gösterilir |

**Dosyalar:**
- `apps/container-web/src/layouts/SidebarV2.tsx` (yeni)
- `apps/container-web/src/layouts/SidebarV2.styles.ts` (yeni)
- `apps/container-web/src/layouts/MainLayout.tsx` (güncellenecek)

**MainLayout.tsx değişikliği:**

```tsx
const USE_SIDEBAR_V2 = true;

{USE_SIDEBAR_V2 ? (
  <SidebarV2 currentPage={currentPage} onPageChange={handlePageChange} />
) : (
  <Sidebar
    currentPage={currentPage}
    onPageChange={handlePageChange}
    collapsed={sidebarCollapsed}
    onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
  />
)}
```

### 3.3 PageTypeV2 Union

```ts
export type PageTypeV2 =
  | "dashboard" | "bsc" | "fire" | "energy-analyzer" | "hvac"
  | "control" | "system-charts" | "events" | "reports"
  | "analytics" | "devices";
```

### 3.4 Menü Öğeleri

```ts
const menuItemsV2 = [
  { id: "dashboard",       icon: SCADA_ICONS.dashboard,       navKey: "nav.dashboard" },
  { id: "bsc",             icon: SCADA_ICONS.bsc,             navKey: "nav.bsc" },
  { id: "fire",            icon: SCADA_ICONS.fireAlarm,       navKey: "nav.fire" },
  { id: "energy-analyzer", icon: SCADA_ICONS.energyAnalyzer,   navKey: "nav.energyAnalyzer" },
  { id: "hvac",            icon: SCADA_ICONS.hvac,            navKey: "nav.hvac" },
  { id: "control",         icon: SCADA_ICONS.control,         navKey: "nav.control" },
  { id: "system-charts",   icon: SCADA_ICONS.charts,          navKey: "nav.analytics" },
  { id: "events",          icon: SCADA_ICONS.events,          navKey: "nav.events" },
  { id: "reports",         icon: SCADA_ICONS.reports,         navKey: "nav.reports" },
  { id: "analytics",       icon: SCADA_ICONS.analytics,       navKey: "nav.analytics" },
  { id: "devices",         icon: SCADA_ICONS.container,       navKey: "nav.devices" },
];
```

---

## 4. Route Haritası & Geri Dönüş Stratejisi

### 4.1 Route'lar

| Route | Sayfa | Dosya | Durum |
|-------|-------|-------|-------|
| `/login` | LoginPage | `LoginPage.tsx` | Aynen |
| `/` , `/dashboard` | DashboardPage v2 | `DashBoardPageV2.tsx` | **Yeni** |
| `/bsc` | BscPage | `BscPage.tsx` | **Yeni** |
| `/fire` | FirePanelPage | `FirePanelPage.tsx` | Aynen |
| `/energy-analyzer` | EnergyAnalyzerPage | `EnergyAnalyzerPage.tsx` | Aynen |
| `/hvac` | HvacPage | `HvacPage.tsx` | **Yeni** |
| `/control` | ControlPage | `ControlPage.tsx` | Aynen |
| `/system-charts` | SystemChartsPage | `SystemChartsPage.tsx` | Aynen |
| `/events` | EventsPage | `EventsPage.tsx` | Aynen |
| `/reports` | ReportsPage | `ReportsPage.tsx` | Aynen |
| `/analytics` | AnalyticsPage | `AnalyticsPage.tsx` | **Yeni (boş)** |
| `/devices` | DevicesPage | `DevicesPage.tsx` | **Boş placeholder** |

### 4.2 routes.tsx Yapısı

```tsx
// ═══════════════════════════════════════════════════════════════════
// V1 ROUTES — geri dönüş için korunuyor
// ═══════════════════════════════════════════════════════════════════
/*
{
  path: "/racks",
  element: (
    <PrivateRoute roles={["admin", "teknik"]}>
      <LayoutWrapper pageType="racks">
        <RacksPage />
      </LayoutWrapper>
    </PrivateRoute>
  ),
},
{
  path: "/",
  element: (
    <LayoutWrapper pageType="dashboard">
      <DashboardPage />
    </LayoutWrapper>
  ),
},
*/

// ═══════════════════════════════════════════════════════════════════
// V2 ROUTES — aktif
// ═══════════════════════════════════════════════════════════════════
{
  path: "/bsc",
  element: (
    <PrivateRoute roles={["admin", "teknik"]}>
      <LayoutWrapperV2 pageType="bsc">
        <BscPage />
      </LayoutWrapperV2>
    </PrivateRoute>
  ),
},
{
  path: "/",
  element: (
    <LayoutWrapperV2 pageType="dashboard">
      <DashboardPageV2 />
    </LayoutWrapperV2>
  ),
},
// ... diğer v2 route'lar
```

### 4.3 Geri Dönüş

```tsx
// MainLayout.tsx
const USE_SIDEBAR_V2 = true;  // false → eski Sidebar + V1 route'lar
```

`LayoutWrapperV2` → `MainLayout` ile `SidebarV2` kullanır  
`LayoutWrapper` → `MainLayout` ile eski `Sidebar` kullanır (korunur)

---

## 5. Dashboard — Tek Hat SCADA Şeması

### 5.1 Genel Tasarım

Dashboard, **tek bir PixiJS canvas** içinde aşağıdakileri gösteren birleşik bir SCADA şemasıdır:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚡  BSC & HVAC  SİSTEM  SCADA  ═══════════════════════════  [🔍] [🔄]  │
│                                                                           │
│  ┌───────────────  BSC SİSTEMİ  ──────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   ═══════════════════════════════════════  BUS BAR (+)              │  │
│  │                                                                      │  │
│  │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │  │
│  │   │R01  │ │R02  │ │R03  │ │R04  │ │R05  │ │R06  │ │R07  │ │R08  │ │  │
│  │   │ONLN │ │ONLN │ │ONLN │ │OFFLN│ │ONLN │ │ONLN │ │ONLN │ │ONLN │ │  │
│  │   │CHRG │ │CHRG │ │CHRG │ │IDLE │ │CHRG │ │CHRG │ │CHRG │ │CHRG │ │  │
│  │   │78%  │ │82%  │ │75%  │ │ --  │ │80%  │ │79%  │ │81%  │ │77%  │ │  │
│  │   │398V │ │397V │ │399V │ │0V   │ │398V │ │397V │ │398V │ │396V │ │  │
│  │   │62A  │ │60A  │ │58A  │ │0A   │ │61A  │ │59A  │ │63A  │ │57A  │ │  │
│  │   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ │  │
│  │                           ↘                                         │  │
│  │                    ┌──────────────┐                                 │  │
│  │                    │     CB-1     │   ← CircuitBreaker              │  │
│  │                    │ Closed/Open  │                                 │  │
│  │                    └──────┬───────┘                                 │  │
│  │                           │                                         │  │
│  │                    ┌──────┴───────┐                                 │  │
│  │                    │   DC-1       │   ← DCOutput                    │  │
│  │                    │ 398V / 75A   │                                 │  │
│  │                    └──────────────┘                                 │  │
│  │                                                                      │  │
│  │   ═══════════════════════════════════════  BUS BAR (-)              │  │
│  │                                                                      │  │
│  │   ┌───────────────  SİSTEM ÖZETİ (BSC-1)  ───────────────────┐      │  │
│  │   │  SoC: ████████████░░░░ %78   SoH: ██████████████░░ %92   │      │  │
│  │   │  Güç: ▶ 245 kW     Voltaj: 398 V     Akım: 62 A         │      │  │
│  │   │  Durum: ⚡ CHARGE   Aktif Raf: 7/8                           │      │  │
│  │   └─────────────────────────────────────────────────────────┘      │  │
│  │                                                                      │  │
│  │   (BSC-2 için aynı blok tekrarlanır...)                             │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌───────────────  HVAC SİSTEMİ  ─────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │   │   O1     │ │   O2     │ │   O3     │ │   O4     │ │  PANEL  │ │  │
│  │   │  24.5°C  │ │  23.8°C  │ │  25.1°C  │ │  24.0°C  │ │ 28.3°C  │ │  │
│  │   │ ➤23.0°C │ │ ➤23.0°C  │ │ ➤23.0°C  │ │ ➤23.0°C  │ │ %52 RH  │ │  │
│  │   │ 💧 %45   │ │ 💧 %48   │ │ 💧 %42   │ │ 💧 %50   │ │         │ │  │
│  │   │          │ │          │ │          │ │          │ │         │ │  │
│  │   │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │         │ │  │
│  │   │ │COOL  │ │ │ │COOL  │ │ │ │COOL  │ │ │ │IDLE  │ │ │         │ │  │
│  │   │ │❄️ Nor│ │ │ │❄️ Nor│ │ │ │❄️ Nor│ │ │ │⚠️Fl│ │ │ │         │ │  │
│  │   │ │📤18°C│ │ │ │📤18°C│ │ │ │📤18°C│ │ │ │📤--°C│ │ │ │         │ │  │
│  │   │ │📥25°C│ │ │ │📥24°C│ │ │ │📥25°C│ │ │ │📥--°C│ │ │ │         │ │  │
│  │   │ │⚠️ 0  │ │ │ │⚠️ 0  │ │ │ │⚠️ 0  │ │ │ │⚠️ 2  │ │ │ │         │ │  │
│  │   │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ │         │ │  │
│  │   │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ │         │ │  │
│  │   │ │WARM  │ │ │ │IDLE  │ │ │ │WARM  │ │ │ │COOL  │ │ │ │         │ │  │
│  │   │ │🔥 Nor│ │ │ │-- -- │ │ │ │🔥 Nor│ │ │ │❄️ Nor│ │ │ │         │ │  │
│  │   │ │📤28°C│ │ │ │📤--°C│ │ │ │📤28°C│ │ │ │📤18°C│ │ │ │         │ │  │
│  │   │ │📥22°C│ │ │ │📥--°C│ │ │ │📥22°C│ │ │ │📥24°C│ │ │ │         │ │  │
│  │   │ │⚠️ 1  │ │ │ │⚠️ 0  │ │ │ │⚠️ 0  │ │ │ │⚠️ 0  │ │ │ │         │ │  │
│  │   │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ │         │ │  │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  ╔═══════════════════════  SİSTEM TERMİNALİ  ═════════════════════╗  │ │
│  │  ║ [12:34:56] INFO  BSC-1: Charge started                         ║  │ │
│  │  ║ [12:34:55] WARN  CB-2: Breaker opened                         ║  │ │
│  │  ║ [12:34:50] OK    HVAC-K1: Temp 24.5°C → 23.0°C               ║  │ │
│  │  ║ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂  ║  │ │
│  │  ╚═════════════════════════════════════════════════════════════════╝  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 BSC Bölümü — Kullanılan Mevcut Elementler

| Element | Mevcut | Gösterdiği Veri | Güncelleme |
|---------|--------|-----------------|------------|
| `RackCell` | ✅ | R01-R08, ONLINE/OFFLINE, CHARGE/DISCHARGE/IDLE, SoC%, Voltaj, Akım | **Aynen** (zaten detaylı) |
| `CableBus` | ✅ | + ve - bus bar çizgileri, güç akış animasyonu | **Aynen** |
| `Cable` | ✅ | Convergence → CB, CB → DC arası güç akışı | **Aynen** |
| `CircuitBreaker` | ✅ | CB etiketi, Online/Offline, Closed/Open | **Aynen** |
| `DCOutput` | ✅ | DC etiketi, Voltaj, Akım, glow animasyonu | **Aynen** |

### 5.3 BSC Bölümü — Yeni Eklenecek: Sistem Özet Bloğu

Her BSC ünitesi için, raf sırasının altına veya yanına bir **sistem özet paneli** eklenir. Bu panel, BSC`Graphics`'teki header alanına veya her BSCCanvas'ın altına çizilir:

```
┌──────────────────────────────────────────────┐
│  BSC-1  SİSTEM ÖZETİ                         │
│                                               │
│  SoC: ████████████░░░░░░ %78                 │
│  SoH: ██████████████░░░░ %92                 │
│                                               │
│  Sistem Gücü:   ▶ 245 kW  (CHARGE)           │
│  Voltaj:        398 V                         │
│  Akım:          62 A                          │
│  Aktif Raf:     7 / 8                         │
└──────────────────────────────────────────────┘
```

**Bu veriler mevcutta `averages` objesinden geliyor:**

```ts
// useDashboardData hook'unda mevcut:
const averages = extractSystemLevel(mergedTelemetries);
// → { avgSoC, avgSoH, avgVoltage, avgCurrent, avgPower }
```

Ayrıca `bscUnits` içindeki her `BSCUnit` için:
- `deviceId`
- `racks.length` → toplam raf sayısı
- `racks.filter(r => r.status === "online").length` → aktif raf sayısı
- `flowDirection` → CHARGE / DISCHARGE / IDLE

**PixiJS Implementasyonu:** `BSC` component içinde, her `BSCV2Canvas`'ın alt kısmına ek bir `pixiContainer` ile çizilir. `StepConfig`'e `summaryPanelHeight` alanı eklenir.

### 5.4 HVAC Bölümü — Mevcut Element Genişletmeleri

#### RoomData Genişletmesi

```ts
// Mevcut:
interface RoomData {
  temp: number;
  hvacs: [HvacData, HvacData];
}
interface HvacData {
  status: "online" | "offline";
  mode: "cooling" | "warming" | "idle";
}

// Genişletilmiş:
interface RoomData {
  temp: number;
  humidity?: number;       // ← YENİ: oda nemi %
  setTemp?: number;        // ← YENİ: hedef sıcaklık
  hvacs: [HvacData, HvacData];
}

interface HvacData {
  status: "online" | "offline";
  mode: "cooling" | "warming" | "idle";
  equipmentStatus?: string; // ← YENİ: "Normal" | "Fault" | ...
  alarmCount?: number;      // ← YENİ: aktif alarm sayısı
  supplyTemp?: number;      // ← YENİ: üfleme sıcaklığı °C
  returnTemp?: number;      // ← YENİ: dönüş sıcaklığı °C
}
```

#### RoomCard Genişletmesi

```
┌──────────────┐
│              │
│     O1       │  ← oda etiketi (mevcut)
│   24.5°C     │  ← sıcaklık (mevcut)
│   ➤ 23.0°C  │  ← YENİ: set sıcaklık (küçük font, gri)
│   💧 %45 RH  │  ← YENİ: nem (küçük font, mavi)
│              │
└──────────────┘
```

Yeni alanlar `step * 0.17` font boyutuyla, mevcut sıcaklık değerinin altına eklenir.

#### HvacUnit Genişletmesi

```
┌──────────────┐
│   COOL       │  ← mode (mevcut, büyük font)
│   ❄️ Normal  │  ← YENİ: equipment status
│   📤 18.2°C  │  ← YENİ: supply temp
│   📥 25.1°C  │  ← YENİ: return temp
│   ⚠️ 0       │  ← YENİ: alarm sayısı
└──────────────┘
```

Font boyutu: `Math.max(6, step * 0.15)`, alarm > 0 ise `COLOR.warning` renginde.

#### PanelCard Genişletmesi

```
┌──────────┐
│  PANEL   │  ← mevcut
│ 28.3°C   │  ← mevcut
│ 💧 %52 RH │  ← YENİ: panel nemi
└──────────┘
```

### 5.5 StepConfig (DashboardSCADA)

```ts
interface DashboardStepConfig {
  step: number;
  // BSC
  bscSectionHeight: number;     // BSC bölümü toplam yükseklik
  summaryPanelHeight: number;   // sistem özet paneli yüksekliği
  // TMS/HVAC
  tmsSectionHeight: number;     // HVAC bölümü toplam yükseklik
  // Terminal
  terminalHeight: number;       // terminal bölümü yüksekliği
  // Ortak
  fontSizeSmall: number;        // min 7, step * 0.17
  fontSizeNormal: number;       // min 9, step * 0.20
  fontSizeLarge: number;        // min 11, step * 0.28
  fontSizeHeader: number;       // min 13, step * 0.36
}
```

```ts
function calculateDashboardConfig(width: number): DashboardStepConfig {
  const step = width / 20;
  // ... BSC, TMS, Terminal hesaplamaları step'ten türetilir
}
```

### 5.6 Kullanılan Veri Kaynakları

```
DashboardPageV2
  ├── useChargeStatus()           → flowDirection
  ├── useDashboardData()          → racks[], averages{avgSoC, avgSoH, avgVoltage, avgCurrent, avgPower}
  ├── useHvacData()               → units[], averages{avgCurrentTemp, avgReturnHumidity}
  ├── useRealtimeStream()         → breakerStatuses, dcOutputs
  ├── useDevicesStore()           → bscDevices (id, rack_count, type)
  └── useFilteredLogProvider()    → LogTerminal için
```

**DashboardV2, BSC ve TMS komponentlerini tek canvas içinde render eden yeni bir `DashboardSCADA` PixiJS komponenti olacak şekilde birleştirir:**

```
DashBoardPageV2.tsx
  └── DashboardSCADA (yeni PixiJS sistem grafiği)
        ├── BSC bölümü (RackCell × N, CableBus, Cable, CircuitBreaker, DCOutput)
        │     └── Sistem Özet Paneli (her BSC için)
        ├── HVAC bölümü (RoomCard × N, HvacUnit × 2N, PanelCard)
        └── TerminalDisplay (PixiJS log terminal)
  └── LogTerminal (mevcut React komponenti, canvas dışında)
```

> Alternatif: BSC ve TMS mevcut sistem grafikleri ayrı ayrı korunur, Dashboard sayfası bunları alt alta render eder + LogTerminal ekler. Sistem özet verileri ilgili grafiklerin içine gömülür.

### 5.7 Alternatif Yaklaşım — Ayrı Grafikler (Daha Az Riskli)

Mevcut BSC ve TMS component'lerini ayrı ayrı korumak, onları sadece genişletmek:

```
DashBoardPageV2.tsx
  ├── BSC (güncellenmiş — sistem özet panelleri eklenmiş)
  ├── TMS (güncellenmiş — RoomCard/HvacUnit/PanelCard genişletilmiş)
  └── LogTerminal
```

Bu yaklaşım:
- Mevcut kodu minimum değiştirir
- Her grafik kendi resize mekanizmasına sahiptir
- Risk daha düşüktür
- İki grafik arasına SummaryCard da eklenebilir (opsiyonel)

---

## 6. BSC Sayfası

### 6.1 Sayfa Düzeni

**TABSIZ — tüm bölümler alt alta:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ════════════════  BSC CİHAZLARI  ══════════════════════════════════ │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ BSCCard  │ │ BSCCard  │ │ BSCCard  │ │ BSCCard  │   ← 4'lü grid │
│  │ BSC-1    │ │ BSC-2    │ │ BSC-3    │ │ BSC-4    │                │
│  │          │ │          │ │          │ │          │                │
│  │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│   ← detail btn│
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
│                                                                       │
│  ┌───────────────────────┐ ┌───────────────────────┐                 │
│  │ SingleTelemetryChart  │ │ SingleTelemetryChart  │  ← 2'li grid   │
│  │ BSC-1                 │ │ BSC-2                 │                │
│  └───────────────────────┘ └───────────────────────┘                 │
│  ┌───────────────────────┐ ┌───────────────────────┐                 │
│  │ SingleTelemetryChart  │ │ SingleTelemetryChart  │                 │
│  │ BSC-3                 │ │ BSC-4                 │                 │
│  └───────────────────────┘ └───────────────────────┘                 │
│                                                                       │
│  ┌──────────────────────────────────────┐                            │
│  │  Unified TelemetryChart (Tüm BSC)    │  ← tam genişlik            │
│  └──────────────────────────────────────┘                            │
│                                                                       │
│  ════════════════  CIRCUIT BREAKER'LAR  ═══════════════════════════ │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ CBCard   │ │ CBCard   │ │ CBCard   │ │ CBCard   │   ← 4'lü grid │
│  │ CB-1     │ │ CB-2     │ │ CB-3     │ │ CB-4     │                │
│  │          │ │          │ │          │ │          │                │
│  │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│                │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
│                                                                       │
│  ┌───────────────────────┐ ┌───────────────────────┐                 │
│  │ SingleTelemetryChart  │ │ SingleTelemetryChart  │                 │
│  │ CB-1                  │ │ CB-2                  │                 │
│  └───────────────────────┘ └───────────────────────┘                 │
│                                                                       │
│  ┌──────────────────────────────────────┐                            │
│  │  Unified TelemetryChart (Tüm CB)     │                            │
│  └──────────────────────────────────────┘                            │
│                                                                       │
│  ════════════════  DC OUTPUT'LAR  ══════════════════════════════════ │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │DCOutCard │ │DCOutCard │ │DCOutCard │ │DCOutCard │   ← 4'lü grid │
│  │ DC-1     │ │ DC-2     │ │ DC-3     │ │ DC-4     │                │
│  │          │ │          │ │          │ │          │                │
│  │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│                │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
│                                                                       │
│  ┌───────────────────────┐ ┌───────────────────────┐                 │
│  │ SingleTelemetryChart  │ │ SingleTelemetryChart  │                 │
│  │ DC-1                  │ │ DC-2                  │                 │
│  └───────────────────────┘ └───────────────────────┘                 │
│                                                                       │
│  ┌──────────────────────────────────────┐                            │
│  │  Unified TelemetryChart (Tüm DC)     │                            │
│  └──────────────────────────────────────┘                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Kart Spesifikasyonları

#### BSCCard (Mevcut — `packages/ui/src/components/BSCCard/`)

Mevcut haliyle korunur. Zaten `onDetailClick` prop'u var. Sayfada bu prop, `DeviceDetailModal`'ı açar.

```
┌─────────────────────┐
│ BSC-1  🟢Online     │  ← Header (name + status badge)
│        🟢Charge     │  ← charge status badge
│                      │
│ ┌──────┐ ┌──────┐   │
│ │ %78  │ │ %92  │   │  ← SoC / SoH (metric bars)
│ │ SoC  │ │ SoH  │   │
│ └──────┘ └──────┘   │
│                      │
│ 📦 Raf: 7/8 Aktif   │  ← info row
│ ⚡ Sistem: 245 kW   │
│                      │
│ ┌──────────────────┐ │
│ │ 🔋 Voltaj  398V │ │  ← DataGrid (2 sütun, 11 data)
│ │ 🔌 Akım     62A │ │
│ │ ⚡ Şarj G. 245kW│ │
│ │ ⚡ Deşarj G.  0kW│ │
│ │ 🔋 Bekl.V. 400V│ │
│ │ 🌡️ Sıcaklık 28°│ │
│ │ 📋 Versiyon 1.0 │ │
│ │ 📊 Durum    Aktif│ │
│ │ 💓 HB        123 │ │
│ │ 📨 Komut Y.  OK  │ │
│ │ 📨 Son Komut ... │ │
│ └──────────────────┘ │
│                      │
│ [📋 Cihaz Detayları]│  ← onDevicesDetailClick
└─────────────────────┘
```

#### CBCard (Yeni — `packages/ui/src/components/CBCard/`)

```
┌─────────────────────┐
│ CB-1   🟢Online     │  ← Header (name + status)
│        🟢Closed     │  ← position badge
│                      │
│ ┌──────────────────┐ │
│ │ ⚡ Voltaj   398V │ │  ← DataGrid (2 sütun)
│ │ 🔌 Akım      62A │ │
│ │ 🔢 Trip Say   12 │ │
│ │ 🔢 Kapatma   156 │ │
│ │ 🟢 Trip Dur. OK │ │
│ └──────────────────┘ │
│                      │
│ [📋 Cihaz Detayları]│
└─────────────────────┘
```

Props:
```ts
interface CBCardProps {
  name: string;
  status: "online" | "offline";
  isClosed: boolean;
  isTripped: boolean;
  voltage: number | null;
  current: number | null;
  tripCount?: number;
  closeCount?: number;
  onDetailClick?: () => void;
  labels?: CBCardLabels;
}
```

#### DCOutputCard (Yeni — `packages/ui/src/components/DCOutputCard/`)

```
┌─────────────────────┐
│ DC-1   🟢Online     │  ← Header (name + status)
│        🟢On         │  ← on/off badge
│                      │
│ ┌──────────────────┐ │
│ │ ⚡ Gerçek V 398V │ │  ← DataGrid (2 sütun)
│ │ 🔌 Gerçek A  75A │ │
│ │ ⚡ Ayar V   400V │ │
│ │ 🔌 Ayar A    80A │ │
│ └──────────────────┘ │
│                      │
│ [📋 Cihaz Detayları]│
└─────────────────────┘
```

Props:
```ts
interface DCOutputCardProps {
  name: string;
  status: "online" | "offline";
  isOn: boolean;
  actualVoltage: number | null;
  actualCurrent: number | null;
  setVoltage?: number;
  setCurrent?: number;
  onDetailClick?: () => void;
  labels?: DCOutputCardLabels;
}
```

### 6.3 DeviceDetailModal (Yeni — `packages/ui/src/components/DeviceDetailModal/`)

```
┌──────────────────────────────────────────────────────────┐
│  BSC-1 — Cihaz Detayları                           [✕]   │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ DeviceTable (mevcut komponent)                       │ │
│  │                                                      │ │
│  │  #  │ Cihaz ID  │ Tip  │ Durum  │ Son Veri          │ │
│  │ ───┼───────────┼──────┼────────┼────────────────── │ │
│  │  1 │ BSC-1     │ bsc  │ online │ 2026-08-11 12:34  │ │
│  │  2 │ CB-1      │ cb   │ online │ 2026-08-11 12:34  │ │
│  │  3 │ DC-1      │ dc   │ online │ 2026-08-11 12:34  │ │
│  │ ...│           │      │        │                    │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Props:
```ts
interface DeviceDetailModalProps {
  deviceId: string;
  provider: IDeviceDetailProvider;
  open: boolean;
  onClose: () => void;
}
```

### 6.4 Chart Yerleşimi

**SingleTelemetryChart (cihaz başına):**
- Her BSC/CB/DC cihaz için bir adet
- 2 sütun grid'de gösterilir
- Height: 350px
- `defaultTagSelections` ile o cihaza filtrelenir

**Unified TelemetryChart (bölüm başına):**
- Tüm BSC'ler için bir adet
- Tüm CB'ler için bir adet
- Tüm DC'ler için bir adet
- Tam genişlik, height: 550px
- Tag filter: deviceId, rack_id (BSC için)

---

## 7. HVAC Sayfası

### 7.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ════════════════  HVAC ÜNİTELERİ  ════════════════════════════════ │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │HvacCard  │ │HvacCard  │ │HvacCard  │ │HvacCard  │   ← 4'lü grid │
│  │K1-Oda-1  │ │K1-Oda-2  │ │K2-Oda-1  │ │K2-Oda-2  │                │
│  │          │ │          │ │          │ │          │                │
│  │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│ │[Cihazlar]│                │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
│                                                                       │
│  ┌───────────────────────┐ ┌───────────────────────┐                 │
│  │ SingleTelemetryChart  │ │ SingleTelemetryChart  │  ← 2'li grid   │
│  │ K1-Oda-1              │ │ K1-Oda-2              │                │
│  └───────────────────────┘ └───────────────────────┘                 │
│  ┌───────────────────────┐ ┌───────────────────────┐                 │
│  │ SingleTelemetryChart  │ │ SingleTelemetryChart  │                 │
│  │ K2-Oda-1              │ │ K2-Oda-2              │                 │
│  └───────────────────────┘ └───────────────────────┘                 │
│                                                                       │
│  ┌──────────────────────────────────────┐                            │
│  │  Unified TelemetryChart (Tüm HVAC)   │  ← tam genişlik            │
│  └──────────────────────────────────────┘                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 HvacCard (Yeni — `packages/ui/src/components/HvacCard/`)

```
┌─────────────────────┐
│ K1-Oda-1  🟢Çalışıyor│  ← Header (name + status badge)
│           ❄️Soğutma │  ← mode badge
│                      │
│     ┌──────────┐     │
│     │  24.5°C  │     │  ← büyük sıcaklık display (42px, info rengi)
│     │  Mevcut  │     │
│     └──────────┘     │
│                      │
│ ┌──────────────────┐ │
│ │ 🎯 Set     23.0°│ │  ← DataGrid (2 sütun)
│ │ 📤 Supply  18.2°│ │
│ │ 📥 Return  25.1°│ │
│ │ 💧 Return N  %45│ │
│ │ 💧 Supply N  %40│ │
│ │ 🟢 Ekipman Normal│ │
│ │ ⚠️ Alarm     0  │ │
│ └──────────────────┘ │
│                      │
│ [📋 Cihaz Detayları]│
└─────────────────────┘
```

Props:
```ts
interface HvacCardProps {
  name: string;
  room: string;
  status: "standby" | "running" | "fault";
  currentTemp: number | null;
  setTemp?: number | null;
  supplyTemp?: number | null;
  returnTemp?: number | null;
  returnHumidity?: number | null;
  supplyHumidity?: number | null;
  equipmentStatus?: string;
  mode: "cooling" | "warming" | "idle";
  alarmCount?: number;
  coolingSetpoint?: number | null;
  heatingSetpoint?: number | null;
  onDetailClick?: () => void;
  labels?: HvacCardLabels;
}
```

### 7.3 HVAC Sayfası Veri Kaynakları

```
HvacPage
  ├── useHvacData()              → units[], averages
  ├── useTelemetryProvider()     → per-unit + unified chart providers
  └── useEventAnnotations()      → grafik anotasyonları
```

---

## 8. Diğer Sayfalar

### 8.1 FirePanel, EnergyAnalyzer

- **Sayfa içeriği aynen korunur**
- Sayfa başındaki `StatusCard` styled component'leri, `packages/ui`'den `SummaryCard` atomu ile değiştirilir (refactor)
- FirePanel için `SummaryCard` variant'ları: `ok`, `alarm`, `fault`
- EnergyAnalyzer için: `ok`

### 8.2 Control, Events, SystemCharts, Reports

- **Aynen korunur**
- Route ve sidebar bağlantıları güncellenir

### 8.3 Analytics, Devices

- **Boş placeholder**: `🚧 Yapım Aşamasında` mesajı + ikon
- İleride kullanılmak üzere route'lar hazır

---

## 9. Bileşen Envanteri

### 9.1 Atomik Bileşenler (packages/ui)

| Bileşen | Dizin | Kaynak | Varyantlar |
|---------|-------|--------|------------|
| **SummaryCard** | `components/SummaryCard/` | FirePanel `StatusCard` | `ok`, `alarm`, `fault`, `info` |
| **StatusBadge** | `components/atoms/StatusBadge/` | BSCCard badge'leri | `online`, `offline`, `charge`, `discharge`, `idle` |
| **DataRow** | `components/atoms/DataRow/` | BSCCard `DataItem` | — |
| **DataGrid** | `components/atoms/DataGrid/` | BSCCard `DataGrid` | 2-sütun grid |
| **MetricBar** | `components/atoms/MetricBar/` | BSCCard `MetricBar` | — |
| **MetricDisplay** | `components/atoms/MetricDisplay/` | BSCCard `MetricBlock` | — |
| **Card** | `components/atoms/Card/` | BSCCard `Card` | — |
| **CardHeader** | `components/atoms/CardHeader/` | BSCCard `Header` | — |
| **CardGrid** | `components/atoms/CardGrid/` | Yeni | responsive 4→3→2→1 |
| **ChartGrid** | `components/atoms/ChartGrid/` | Yeni | responsive 2→1 |
| **SectionHeader** | `components/atoms/SectionHeader/` | Yeni | ═══ BAŞLIK ═══ |

### 9.2 Molekül Bileşenler (packages/ui)

| Bileşen | Dizin | Durum |
|---------|-------|-------|
| `BSCCard` | `components/BSCCard/` | **Mevcut** — `onDetailClick` prop'u zaten var |
| `CBCard` | `components/CBCard/` | **Yeni** |
| `DCOutputCard` | `components/DCOutputCard/` | **Yeni** |
| `HvacCard` | `components/HvacCard/` | **Yeni** |
| `DeviceDetailModal` | `components/DeviceDetailModal/` | **Yeni** |
| `RackCard` | `components/RackCard/` | Mevcut (BSC sayfasında kullanılabilir) |

### 9.3 PixiJS Element Değişiklikleri

| Element | Durum | Değişiklik |
|---------|-------|------------|
| `RackCell` | Mevcut | **Aynen** (zaten detaylı: R01, status, charge, SoC%, V, A) |
| `CableBus` | Mevcut | **Aynen** |
| `Cable` | Mevcut | **Aynen** |
| `CircuitBreaker` | Mevcut | **Aynen** |
| `DCOutput` | Mevcut | **Aynen** |
| `RoomCard` | **Genişletilecek** | Set temp, nem ekle |
| `HvacUnit` | **Genişletilecek** | Supply/Return temp, alarm sayısı, ekipman durumu ekle |
| `PanelCard` | **Genişletilecek** | Nem ekle |

### 9.4 Yeni İcon'lar

```ts
// packages/ui/src/icons/types.ts — ScadaIconName union'a eklenecek:
"bsc"              // BSC menü ikonu (mevcut "battery" farklı olabilir)
"hvac"             // HVAC menü ikonu
"analytics"        // Analytics menü ikonu
"hvacUnit"         // HVAC ünite detay ikonu
"circuitBreaker"   // CB ikonu
"dcOutput"         // DC Output ikonu
```

> İcon'lar `react-icons/tb`'den seçilir, `nav-icons.tsx`'e eklenir.

### 9.5 Yeni Kontrat

```ts
// packages/ui/src/interfaces/device-detail-provider.ts
export interface IDeviceDetailProvider {
  devices(deviceId: string): Promise<Device[]>;
}
```

### 9.6 Tip Genişletmeleri

```ts
// packages/ui/src/graphics/types/tms.ts — mevcut tiplere eklenecek alanlar:
export interface RoomData {
  temp: number;
  humidity?: number;
  setTemp?: number;
  hvacs: [HvacData, HvacData];
}

export interface HvacData {
  status: "online" | "offline";
  mode: "cooling" | "warming" | "idle";
  equipmentStatus?: string;
  alarmCount?: number;
  supplyTemp?: number;
  returnTemp?: number;
}
```

---

## 10. Veri Akışı — Dependency Inversion

```
┌──────────────────────────────────────────────────────────────┐
│  packages/ui (UI Katmanı)                                    │
│                                                               │
│  ⚠️ Hiçbir UI bileşeni TanStack Query, Zustand import ETMEZ │
│  ⚠️ Hiçbir UI bileşeni doğrudan API çağrısı YAPMAZ          │
│                                                               │
│  BSCCard          ← props (name, soc, soh, ...)              │
│  CBCard           ← props (name, status, isClosed, ...)      │
│  DCOutputCard     ← props (name, isOn, voltage, ...)         │
│  HvacCard         ← props (name, currentTemp, ...)           │
│  SummaryCard      ← props (icon, value, label, variant)      │
│  TelemetryChart   ← props (provider: TelemetryProvider)      │
│  SingleTelemetryChart ← props (provider: TelemetryProvider)  │
│  LogTerminal      ← props (provider: LogProvider)            │
│  DeviceDetailModal ← props (provider: IDeviceDetailProvider)  │
│  BSC (PixiJS)     ← props (bscUnits, flowDirection)          │
│  TMS (PixiJS)     ← props (rooms, panel_temp, status)        │
│  RoomCard (PixiJS)← props (room: RoomData, pos, config)      │
│  HvacUnit (PixiJS)← props (hvac: HvacData, pos, config)      │
│  RackCell (PixiJS)← props (rack: Rack, x, y, config)         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                  implements ↑ (kontratlar / interface'ler)
                           │
┌──────────────────────────┴───────────────────────────────────┐
│  apps/container-web (App Katmanı)                            │
│                                                               │
│  useTelemetryProvider()      → TelemetryProvider implement.  │
│  useLogProvider()            → LogProvider implement.        │
│  useDashboardData()          → racks[], averages{}           │
│  useHvacData()               → units[], averages{}           │
│  useChargeStatus()           → flowDirection                 │
│  useRealtimeStream()         → breaker/DC status             │
│  useDevicesStore()           → device list (Zustand)         │
│  useEventAnnotations()       → chart annotations             │
│  hvacUnitsToTmsProps()       → RoomData[] dönüşümü           │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. Uygulama Sırası

### Faz 1 — Icon'lar + Atomik Bileşenler (packages/ui)
1. Yeni icon'ları ekle (`types.ts` + `nav-icons.tsx`)
2. `SummaryCard` atomu — FirePanel/EnergyAnalyzer StatusCard soyutlaması
3. `StatusBadge`, `DataRow`, `DataGrid`, `MetricBar`, `MetricDisplay`
4. `Card`, `CardHeader`, `CardGrid`, `ChartGrid`, `SectionHeader`
5. Barrel export'ları güncelle

### Faz 2 — Kart Bileşenleri (packages/ui)
6. `CBCard` — atomik bileşenlerle, BSCCard pattern'inde
7. `DCOutputCard`
8. `HvacCard`
9. `DeviceDetailModal`
10. Barrel export'ları güncelle
11. Storybook'a ekle

### Faz 3 — Tip + PixiJS Element Genişletmeleri (packages/ui)
12. `RoomData`, `HvacData` tiplerini genişlet (`graphics/types/tms.ts`)
13. `RoomCard` — set temp, nem alanları ekle (`drawers` güncelle)
14. `HvacUnit` — supply/return temp, alarm count, equipment status ekle
15. `PanelCard` — nem alanı ekle
16. `BSC` component'ine sistem özet paneli ekle (`StepConfig` genişlet, yeni drawer)
17. `hvacUnitsToTmsProps()` adapter'ı güncelle (yeni alanları RoomData'ya map'le)

### Faz 4 — SidebarV2 (apps/container-web)
18. `SidebarV2.tsx` + `SidebarV2.styles.ts`
19. `PageTypeV2` union tanımla
20. `MainLayout.tsx` — `USE_SIDEBAR_V2` flag'i + `LayoutWrapperV2`
21. `useEffect` → path mapping güncelle

### Faz 5 — Sayfalar (apps/container-web)
22. `BscPage.tsx` + `BscPage.styles.ts`
23. `HvacPage.tsx` + `HvacPage.styles.ts`
24. `DashBoardPageV2.tsx` + `DashboardPageV2.styles.ts`
25. `AnalyticsPage.tsx` (boş placeholder)

### Faz 6 — Route Bağlama & Refactor (apps/container-web)
26. `routes.tsx` — eski route'lar yoruma al, v2'leri ekle
27. FirePanel, EnergyAnalyzer — StatusCard → SummaryCard refactor
28. Devices — boş placeholder'a çevir
29. i18n — tüm yeni string'leri `TR_DICT`'e ekle
30. `SystemHeader` — `PageTypeV2`'ye göre breadcrumb/başlık güncelle

### Faz 7 — Doğrulama
31. `bun run build` — tüm projeler derleniyor mu?
32. Tüm sayfalar gezinme testi
33. `USE_SIDEBAR_V2 = false` geri dönüş testi
34. Responsive test: 1920, 1440, 1280, 1024, 768
35. WebSocket bağlantısı kopma testi

---

## 12. Riskler & Notlar

| # | Risk | Önlem |
|---|------|-------|
| 1 | PixiJS performansı (çok element) | Mevcut 6fps throttle (`usePixiTickerEffect`) korunur |
| 2 | Resize sırasında canvas takılması | 350ms debounce (`usePixiResize`), `prevDimsRef` karşılaştırması |
| 3 | WebSocket yükü (çok TelemetryProvider) | Provider'lar sadece görünür chart'lar için aktif |
| 4 | Geri dönüşte regresyon | Eski kod yoruma alınır, silinmez. Flag ile anında geçiş |
| 5 | i18n eksiklikleri | Her yeni string `TR_DICT`'e eklenmeli, EN karşılığı yazılmalı |
| 6 | Storybook eksikliği | Yeni bileşenler `.stories.tsx` ile eklenmeli |
| 7 | Mevcut sayfalarda kırılma | Değişmeyen sayfaların import'ları korunur, sadece sidebar bağlantısı güncellenir |
| 8 | `RoomData`/`HvacData` genişletmesi | Optional alanlar (`?`) ile geriye dönük uyumlu tutulur |

---

## Ek A: Dosya Yapısı Özeti

```
packages/ui/src/
├── components/
│   ├── atoms/
│   │   ├── SummaryCard/          (yeni)
│   │   ├── StatusBadge/          (yeni)
│   │   ├── DataRow/              (yeni)
│   │   ├── DataGrid/             (yeni)
│   │   ├── MetricBar/            (yeni)
│   │   ├── MetricDisplay/        (yeni)
│   │   ├── Card/                 (yeni)
│   │   ├── CardHeader/           (yeni)
│   │   ├── CardGrid/             (yeni)
│   │   ├── ChartGrid/            (yeni)
│   │   └── SectionHeader/        (yeni)
│   ├── BSCCard/                  (mevcut)
│   ├── CBCard/                   (yeni)
│   ├── DCOutputCard/             (yeni)
│   ├── HvacCard/                 (yeni)
│   ├── DeviceDetailModal/        (yeni)
│   └── ... (diğer mevcut)
├── graphics/
│   ├── elements/
│   │   ├── RoomCard/             (genişletilecek)
│   │   ├── HvacUnit/             (genişletilecek)
│   │   ├── PanelCard/            (genişletilecek)
│   │   └── ... (diğer mevcut)
│   ├── system/
│   │   ├── BSC/                  (genişletilecek — sistem özet paneli)
│   │   └── TMS/                  (mevcut)
│   └── types/
│       └── tms.ts                (genişletilecek)
├── icons/
│   ├── types.ts                  (yeni icon isimleri eklenecek)
│   └── nav-icons.tsx             (yeni icon mapping'leri)
└── interfaces/
    └── device-detail-provider.ts (yeni)

apps/container-web/src/
├── layouts/
│   ├── Sidebar.tsx               (mevcut, korunacak)
│   ├── Sidebar.styles.ts         (mevcut, korunacak)
│   ├── SidebarV2.tsx             (yeni)
│   ├── SidebarV2.styles.ts       (yeni)
│   └── MainLayout.tsx            (güncellenecek)
├── pages/
│   ├── DashBoardPageV2.tsx       (yeni)
│   ├── BscPage.tsx               (yeni)
│   ├── HvacPage.tsx              (yeni)
│   ├── AnalyticsPage.tsx         (yeni)
│   └── ... (diğer mevcut)
└── app/
    └── routes.tsx                 (güncellenecek)
```
