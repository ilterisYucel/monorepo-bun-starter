// src/ui/Gauge/Gauge.tsx
import React from "react";
import "./Gauge.css";

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

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  decimals = 1,
  color = "#3b82f6",
  backgroundColor = "#1f1f2e",
  size = "medium",
  icon,
}) => {
  // Yüzde hesapla (çember veya çubuk için)
  const percentage = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100),
  );

  // Formatlı değer
  const formattedValue = value.toFixed(decimals);

  // CSS değişkenleri
  const gaugeStyle = {
    "--gauge-value": `${percentage}%`,
    "--gauge-color": color,
    "--gauge-bg": backgroundColor,
  } as React.CSSProperties;

  const sizeClass = `gauge-${size}`;

  return (
    <div className={`gauge ${sizeClass}`} style={gaugeStyle}>
      {icon && <div className="gauge-icon">{icon}</div>}

      <div className="gauge-label">{label}</div>

      <div className="gauge-value">
        <span className="value">{formattedValue}</span>
        <span className="unit">{unit}</span>
      </div>

      {/* Çubuk tipi gösterge */}
      <div className="gauge-bar-container">
        <div className="gauge-bar-fill" style={{ width: `${percentage}%` }} />
      </div>

      {/* Min/Max etiketleri */}
      <div className="gauge-limits">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
