// packages/ui/src/core/TelemetryInput/TelemetryInput.types.ts

export interface TelemetryInputProps {
  /** Telemetry adı */
  name: string;
  /** Açıklama */
  description?: string;
  /** Mevcut değer */
  value: number;
  /** Değer değiştiğinde çağrılacak callback */
  onChange: (value: number) => void;
  /** Ölçüm birimi */
  unit: string;
  /** Cihaz ID'si (opsiyonel) */
  deviceId?: string;
  /** Tags (opsiyonel) - key-value pair olarak gösterilecek */
  tags?: Record<string, string>;
  /** Minimum değer */
  min?: number;
  /** Maksimum değer */
  max?: number;
  /** Artırma/azaltma adımı */
  step?: number;
  /** Ondalık basamak sayısı */
  decimals?: number;
  /** Disabled modu */
  disabled?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** Component boyutu */
  size?: "small" | "medium" | "large";
  /** Genişlik */
  width?: string | number;
  /** Ek CSS class'ı */
  className?: string;
}
