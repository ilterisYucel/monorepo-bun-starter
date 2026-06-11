// packages/ui/src/components/TelemetryChart/types.ts
import type { TelemetryProvider } from "../../interfaces/telemetry-provider";

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
}