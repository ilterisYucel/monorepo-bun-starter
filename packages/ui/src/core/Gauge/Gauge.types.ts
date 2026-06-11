// packages/ui/src/core/Gauge/types.ts

export interface GaugeProps {
  /** Gauge değeri */
  value: number;
  /** Minimum değer */
  min?: number;
  /** Maksimum değer */
  max?: number;
  /** Gauge başlığı */
  label: string;
  /** Birim (V, A, kW, %, °C) */
  unit: string;
  /** Değerin ondalık basamak sayısı */
  decimals?: number;
  /** Gauge rengi (CSS değişkeni veya sabit renk) */
  color?: string;
  /** Arka plan rengi */
  backgroundColor?: string;
  /** Boyut (small, medium, large) */
  size?: "small" | "medium" | "large";
  /** İkon (emoji veya React node) */
  icon?: React.ReactNode;
}