import type { Rack } from "../../types/rack";

export interface RackCardLabels {
  online: string;
  offline: string;
  charging: string;
  discharging: string;
  idle: string;
  voltage: string;
  current: string;
  power: string;
  temperature: string;
  detail: string;
}

export interface RackCardProps extends Rack {
  onDetailClick?: () => void;
  labels?: RackCardLabels;
}