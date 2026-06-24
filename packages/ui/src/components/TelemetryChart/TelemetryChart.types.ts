// packages/ui/src/components/TelemetryChart/types.ts
import type { TelemetryProvider } from "../../interfaces/telemetry-provider";
import type { EventAnnotationsProvider } from "../../interfaces/event-annotations";

export interface TagFilterConfig {
  /** Verinin tags objesindeki anahtar (örn: "rackId", "deviceId") */
  tagKey: string;
  /** Kullanıcıya gösterilecek etiket (örn: "Raf Numarası", "Cihaz") */
  label: string;
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
}