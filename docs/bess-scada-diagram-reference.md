BESSDiagram — SCADA Tek Hat Şeması ASCII Referans
====================================================

step = width / 28,  PAD = 2

┌──────────────────────────────────────────────────────────────────────────────┐
│F│ CP=Konteyner Çerçevesi (drawContainerFrame)                               │
│ │                                                                           │
│H│ ┌── HEADER BAR ──────────────────────────────────────────────────────────┐│
│ │ │ SCADA ═══ CHARGE  │  EA: 50.1Hz | 125kW │  YANGIN: NORMAL        ▶   ││
│ │ └────────────────────────────────────────────────────────────────────────┘│
│ │                                                                           │
│P│ GRID┌─┐═══╗                                                               │
│O│  G  │G│   ║                                                               │
│W│     └─┘   ║   ┌──── ENERJİ ANALİZÖRÜ (E) ────┐                           │
│E│           ╚═══│ TITLE: PM5340                 │──╗                        │
│R│               │ ┌─── LCD ─────────────────┐   │  ║  DC BUS                │
│ │               │ │ V:398V   I:125A        │   │  ╠══════════════════════╗  │
│ │               │ │ P:150kW  f:50.0Hz      │   │  ║                      ║  │
│ │               │ │ E:2543kWh              │   │  ║   ┌─ BSC-1 (R) ───┐  ║  │
│ │               │ └────────────────────────┘   │  ║   │R01 R02...R08  │  ║  │
│ │               │ [SIFIRLA]    [TALEP]        │──╝   │   C B   D C   │  ◀╝  │
│ │               └─────────────────────────────┘      │ SoC■ SoH■ 📦8/8│     │
│P│                                                     └────────────────┘     │
│O│                                                                           │
│W│                                       ┌─ BSC-2 (R) ───────────────────┐   │
│E│                                       │ R01 R02...R08    C B   D C   │   │
│R│                                       │ SoC:78% SoH:95%  750V 245kW  │   │
│ │                                       └────────────────────────────────┘   │
│ │ ──HVAC SİSTEMİ──────────────────────────────────────────────────────────  │
│ │ ┌──Oda1──┐┌──Oda2──┐┌──Oda3──┐┌PANEL┐┌─── YANGIN PANOSU (FP) ────┐     │
│ │ │HV1│HV2││HV1│HV2││HV1│HV2││27°C ││●FAULT ●FIRE ●1ST ●2ST ●DIS ●EX│     │
│ │ │ 23.5° ││ 24.1° ││ 23.8° ││42%RH││[MAN] [HLD] [ABT] [MOD]        │     │
│ │ └───────┘└───────┘└───────┘└─────┘│KIP: AUTO          HAZIR        │     │
│ │                                    └─────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘


BİLEŞEN HARF KODLARI
─────────────────────
 Harf   Bileşen                          Kaynak Dosya
 ────   ───────                          ────────────
  F     Container Frame                  BESSDiagram.drawers.ts  → drawContainerFrame
  H     Header Bar                       BESSDiagram.tsx         → pixiGraphics roundRect
  G     Grid Symbol                      BESSDiagram.drawers.ts  → drawGridSymbol
  E     EnergyAnalyzerGraphic            elements/EnergyAnalyzerGraphic/EnergyAnalyzerGraphic.tsx
  R     BSC Unit (Rack×8 + CB + DC)      elements/RackCell, CircuitBreaker, DCOutput
  HV    HVAC Rooms (RoomCard + HvacUnit) elements/RoomCard, HvacUnit
  P     PanelCard                        elements/PanelCard
  FP    FirePanel                        elements/FirePanel/FirePanel.tsx
  ═     Kablolar / Bus Bar              BESSDiagram.drawers.ts  → drawBusBar + inline cable draws
  ▶     Flow Arrow                       BESSDiagram.tsx         → pixiText "▶/◀"


BOYUTLANDIRMA ANAHTARLARI (BESSDiagram.utils.ts)
─────────────────────────────────────────────────
 Değişken           Değer           Açıklama
 ────────           ─────           ────────
 PAD                2               Kenar boşluğu (px)
 step               w / 28          Temel ölçek birimi
 headerHeight       1.2 × step      Header bar yüksekliği
 gridWidth          1.8 × step      Grid sembolü genişliği
 gridHeight         1.2 × step      Grid sembolü yüksekliği
 eaWidth            5.0 × step      Enerji Analizörü genişliği
 eaHeight           2.8 × step      Enerji Analizörü yüksekliği
 rackWidth          1.8 × step      Raf genişliği
 rackHeight         3.6 × step      Raf yüksekliği
 rackGap            0.08 × step     Raflar arası boşluk
 cbLength           2.0 × step      Circuit Breaker genişliği
 dcRadius           0.65 × step     DC Output yarıçapı
 summaryHeight      1.4 × step      Summary bar yüksekliği
 roomWidth          hesaplanan       Oda genişliği (dinamik)
 roomHeight         4.5 × step      Oda yüksekliği
 fireWidth          7.0 × step      Yangın panosu genişliği
 fireHeight         3.2 × step      Yangın panosu yüksekliği
 panelWidth         2.0 × step      PanelCard genişliği


KOORDİNAT HESAPLARI
───────────────────
 Bileşen   X                              Y
 ───────   ─                              ─
 F         0                              0  (w × h tam canvas)
 H         2                              s × 0.3
 G         2                              headerHeight + 2 + s×0.3
 E         gridStartX + gridWidth + 4     gridY - s×0.1
 R (n)     2                              bscStartY + n × (rackHeight + summaryHeight + s×1.0)
 HV(n)     2 + n × roomWidth              hvacStartY
 P         rooms sonu + panelGap          hvacStartY
 FP        P sonu + panelWidth + 4        hvacStartY
 ≡ Bus     eaRightX → R.rackXs[0]         eaCenterY, rackBusY (yatay/çapraz)
 ▶         w - s×1.2                      s×0.55


DOSYA HARİTASI
──────────────
 packages/ui/src/graphics/
   system/BESSDiagram/
     BESSDiagram.tsx          → Ana birleşik PixiJS canvas
     BESSDiagram.types.ts     → BESSDiagramProps, BESSConfig, BSCUnitWithSummary
     BESSDiagram.utils.ts     → calculateBESSConfig(), getBSCLayout(), calcBSCPositions()
     BESSDiagram.drawers.ts   → drawGridSymbol, drawBusBar, drawContainerFrame
     index.ts

   elements/
     RackCell/                → RackCell.tsx, RackCell.drawers.ts
     CircuitBreaker/          → CircuitBreaker.tsx, CircuitBreaker.drawers.ts
     DCOutput/                → DCOutput.tsx, DCOutput.drawers.ts
     RoomCard/                → RoomCard.tsx, RoomCard.drawers.ts
     HvacUnit/                → HvacUnit.tsx, HvacUnit.drawers.ts
     PanelCard/               → PanelCard.tsx, PanelCard.drawers.ts
     FirePanel/               → FirePanel.tsx, FirePanel.drawers.ts
     EnergyAnalyzerGraphic/   → EnergyAnalyzerGraphic.tsx, EnergyAnalyzerGraphic.drawers.ts
     Cable/                   → Cable.drawers.ts  (drawCableBody, drawCableArrows)

 apps/container-web/src/
   pages/
     ScadaDashboardPage.tsx   → BESSDiagram + LogTerminal kullanan sayfa
   features/
     fire-panel/              → useFirePanelData, firePanelApi, types
     energy-analyzer/         → useEnergyAnalyzerData, energyAnalyzerApi, types
     dashboard/               → useDashboardData (BSC rack verisi)
     hvac/                    → useHvacData, hvacUnitsToTmsProps
   app/
     routes.tsx               → /scada route tanımı
   layouts/
     SidebarV2.tsx            → SCADA sidebar menü girişi
     SidebarV2.types.ts       → PageTypeV2 "scada"
