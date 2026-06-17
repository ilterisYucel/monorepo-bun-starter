export interface DeviceGaugeItem {
  value: number;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  icon?: React.ReactNode;
  decimals?: number;
}

export interface DeviceGaugesProps {
  deviceId: string;
  gauges: DeviceGaugeItem[];
  color?: string;
  size?: "small" | "medium" | "large";
  variant?: "linear" | "circular";
  width?: number | string;
  gap?: number;
}
