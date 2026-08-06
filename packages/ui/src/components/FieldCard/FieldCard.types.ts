export interface FieldCardProps {
  field: {
    id: string;
    name: string;
    status: "online" | "warning" | "offline";
    containerCount: number;
    onlineContainerCount: number;
    totalPowerMw?: number;
    avgSoc?: number;
    activeAlarms?: number;
  };
  onClick?: () => void;
  size?: "small" | "medium";
}

export type { FieldCardProps as FieldCardPropsType };
