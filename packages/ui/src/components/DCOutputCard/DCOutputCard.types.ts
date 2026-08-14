export interface DCOutputCardLabels {
  online: string;
  offline: string;
  on: string;
  off: string;
  actualVoltage: string;
  actualCurrent: string;
  setVoltage: string;
  setCurrent: string;
  detail: string;
}

export interface DCOutputCardProps {
  name: string;
  status: "online" | "offline";
  isOn: boolean;
  actualVoltage: number | null;
  actualCurrent: number | null;
  setVoltage: number | null;
  setCurrent: number | null;
  onDetailClick?: () => void;
  labels?: DCOutputCardLabels;
}
