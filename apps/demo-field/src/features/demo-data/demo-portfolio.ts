/**
 * Demo portföy künyesi (SPEC UC-11, K14). gdems `projects.js` portföyüne
 * hizalı iki proje:
 *
 * - **GD-1** (`live: true`) — tek backend `FIELD_ID`/`DEMO_TOPOLOGY`
 *   kimliği (GDE-202030, Polatlı, 30 MWe standalone). Canlı değerleri saha
 *   telemetrisinden gelir; `snapshot` KULLANILMAZ.
 * - **GD-2** (`live: false`) — statik demo künyesi (GDE-202050, Antalya,
 *   50 MWe, 60 MWp solar + BESS). Canlı API yoktur; kart/tip `snapshot`
 *   değerlerini gösterir ve "demo" işaretlidir.
 *
 * Saf veri modülüdür (IO yok). gdems↔demo künye farkı SPEC A6'da ertelendi.
 */

/** Kaynak türü — ada/güneş. */
export type DemoPortfolioSource = "none" | "solar";

/** Canlı olmayan proje için statik demo değerleri. */
export interface DemoPortfolioSnapshot {
  /** POI aktif gücü (MW, + = dışa aktarım / − = içe). */
  poiMW: number;
  /** Ortalama SOC (%). */
  soc: number;
  /** Ortalama SOH (%). */
  soh: number;
  /** Aktif arıza sayısı. */
  faults: number;
}

/** Tek portföy projesi (saf veri). */
export interface DemoPortfolioProject {
  id: string;
  name: string;
  /** Görünen konum (şehir, il). */
  location: string;
  city: string;
  lat: number;
  lon: number;
  /** Bağlantı gücü (MWe). */
  connMW: number;
  /** Nominal enerji (MWh). */
  energyMWh: number;
  /** BESS grup (ünite) sayısı. */
  groups: number;
  /** `true` ise canlı saha telemetrisi vardır. */
  live: boolean;
  source: DemoPortfolioSource;
  /** Solar kurulu gücü (MWp) — yalnız `source === "solar"`. */
  sourceCapMWp?: number;
  /** Canlı olmayan projeler için statik demo değerleri. */
  snapshot?: DemoPortfolioSnapshot;
}

/** Demo portföyü — iki proje, tam olarak biri canlı (K14). */
export const DEMO_PORTFOLIO: DemoPortfolioProject[] = [
  {
    id: "GDE-202030",
    name: "GD-1",
    location: "Polatlı, Ankara",
    city: "Polatlı, Ankara",
    lat: 39.58,
    lon: 32.15,
    connMW: 30,
    energyMWh: 32.112,
    groups: 9,
    live: true,
    source: "none",
  },
  {
    id: "GDE-202050",
    name: "GD-2",
    location: "Antalya",
    city: "Antalya",
    lat: 37.03,
    lon: 30.6,
    connMW: 50,
    energyMWh: 64.224,
    groups: 18,
    live: false,
    source: "solar",
    sourceCapMWp: 60,
    snapshot: { poiMW: 41.2, soc: 63.5, soh: 97.9, faults: 0 },
  },
];

/** Id ile portföy projesini bulur; yoksa `undefined`. */
export function findPortfolioProject(
  id: string,
): DemoPortfolioProject | undefined {
  return DEMO_PORTFOLIO.find((p) => p.id === id);
}
