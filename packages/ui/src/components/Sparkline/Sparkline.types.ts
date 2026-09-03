/**
 * Sparkline noktası — tek serili alan grafiği veri şekli.
 * `time`: ISO 8601 tarih/zaman string'i (geçersiz tarih noktaları atlanır).
 * `value`: sayısal değer (sayısal olmayanlar null sayılır — uPlot spanGaps).
 */
export interface SparklinePoint {
  time: string;
  value: number;
}

/**
 * Sparkline props — eksensiz, tek serili alan grafiği.
 * `color`: hex string (örn. COLORS.success); alan dolgusu dikey gradient:
 * üstte %35 opaklık → altta %2 opaklık.
 * `height`: px; varsayılan 46 (konteyner kartı satırı).
 */
export interface SparklineProps {
  data: SparklinePoint[];
  color: string;
  height?: number;
}
