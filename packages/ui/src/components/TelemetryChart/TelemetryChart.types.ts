// packages/ui/src/components/TelemetryChart/types.ts
import type { TelemetryProvider } from "../../interfaces/telemetry-provider";
import type { EventAnnotationsProvider } from "../../interfaces/event-annotations";
export type { EventAnnotationsProvider } from "../../interfaces/event-annotations";

export interface TagFilterConfig {
  /** Verinin tags objesindeki anahtar (örn: "rackId", "deviceId") */
  tagKey: string;
  /** Kullanıcıya gösterilecek etiket (örn: "Raf Numarası", "Cihaz") */
  label: string;
}

export interface TelemetryChartLabels {
  range1m: string;
  range1h: string;
  range1d: string;
  range1w: string;
  range1M: string;
  range3M: string;
  range6M: string;
  range1y: string;
  rangeCustom: string;
  rangeFrom: string;
  rangeTo: string;
  pointsLow: string;
  pointsStandard: string;
  pointsHigh: string;
  pointsMax: string;
  timeRange: string;
  points: string;
  metric: string;
  all: string;
  none: string;
  selected: string;
  systemEvents: string;
  userActions: string;
  correctedEvents: string;
  loadFailed: string;
  loading: string;
  /** Boş grafikte gösterilen "veri bekleniyor" metni (tarama animasyonuyla birlikte) */
  waitingData: string;
  noData: string;
  /** Header'daki istatistik tablosu toggle etiketi */
  stats: string;
  pointsUnit: string;
  intervalPrefix: string;
  seconds: string;
  minutes: string;
  hours: string;
  days: string;
  onlyEssential: string;
  onlyDetail: string;
  categoryEssential: string;
  categoryDetail: string;
  searchPlaceholder: string;
  noResults: string;
}

export interface TelemetryChartProps {
  /** Telemetry verisi ve state'leri sağlayan provider (IoC) */
  provider: TelemetryProvider;
  
  /** Gösterilebilecek telemetry name'leri */
  telemetryNames: string[];
  
  /** Grafik başlığı */
  title: string;
  
  /** Y ekseni etiketi */
  yAxisLabel?: string;
  
  /** Grafik yüksekliği */
  height?: number;
  
  /** Renkler (opsiyonel) */
  colors?: string[];
  
  /** Legend gösterilsin mi? */
  showLegend?: boolean;

  /** Tag bazlı filtreleme seçenekleri (client-side). Her config bir dropdown oluşturur */
  tagFilters?: TagFilterConfig[];

  /** Olay/arıza anotasyonları (opsiyonel). Verilmezse checkbox'lar gösterilmez */
  eventAnnotations?: EventAnnotationsProvider;

  /** Çeviri etiketleri (app katmanından gelir) */
  labels?: TelemetryChartLabels;

  /** Yerel ayar kodu — tarih/saat formatlaması için (app katmanından gelir) */
  locale?: string;

  /** Varsayılan seçili metrik (verilmezse telemetryNames[0]) */
  defaultMetric?: string;

  /** Varsayılan tag filtre seçimleri (örn: { deviceId: ["bsc-1"], rack_id: ["1"] }) */
  defaultTagSelections?: Record<string, string[]>;

  /** Alt istatistik tablosu (Son/Min/Max/Ort) varsayılan görünürlüğü. Varsayılan: true */
  defaultShowStats?: boolean;
}