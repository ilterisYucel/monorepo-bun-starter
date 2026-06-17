// packages/ui/src/core/TelemetryGauge/TelemetryGauge.types.ts

export type GaugeSizes = "small" | "medium" | "large";

export interface TelemetryGaugeProps {
  /** Gauge değeri */
  value: number;
  /** Minimum değer — verilmezse progress bar ve limitler gizlenir */
  min?: number;
  /** Maksimum değer — verilmezse progress bar ve limitler gizlenir */
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
  /** Görünüm varyantı */
  variant?: "linear" | "circular";
}
