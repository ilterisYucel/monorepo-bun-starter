export interface HvacCardLabels {
  running: string;
  standby: string;
  fault: string;
  cooling: string;
  warming: string;
  idle: string;
  currentTemp: string;
  setTemp: string;
  supplyTemp: string;
  returnTemp: string;
  returnHumidity: string;
  supplyHumidity: string;
  equipment: string;
  normal: string;
  alarms: string;
  detail: string;
}

export interface HvacCardProps {
  name: string;
  room: string;
  status: "standby" | "running" | "fault";
  currentTemp: number | null;
  mode: "cooling" | "warming" | "idle";
  setTemp?: number | null;
  supplyTemp?: number | null;
  returnTemp?: number | null;
  returnHumidity?: number | null;
  supplyHumidity?: number | null;
  equipmentStatus?: string | null;
  alarmCount?: number;
  onDetailClick?: () => void;
  labels?: HvacCardLabels;
}
