export interface CBCardLabels {
  online: string;
  offline: string;
  closed: string;
  open: string;
  tripped: string;
  normal: string;
  voltage: string;
  current: string;
  tripCount: string;
  closeCount: string;
  detail: string;
}

export interface CBCardProps {
  name: string;
  status: "online" | "offline";
  isClosed: boolean;
  isTripped: boolean;
  voltage: number | null;
  current: number | null;
  tripCount: number;
  closeCount: number;
  onDetailClick?: () => void;
  labels?: CBCardLabels;
}
