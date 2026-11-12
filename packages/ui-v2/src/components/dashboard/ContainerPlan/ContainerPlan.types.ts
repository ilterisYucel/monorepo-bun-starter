export type PlanDotTone = "success" | "warning" | "critical" | "neutral";

export interface PlanChip {
  label: string;
  pct: number;
}

export interface RoomPlan {
  key: string;
  label: string;
  range: string;
  temperature: number;
  overTemp?: boolean;
  dots: PlanDotTone[];
  scalePct: number;
  supply: number;
  ret: number;
  humidity: number;
  chips: PlanChip[];
}

export interface ContainerPlanPanel {
  temperature: number;
  subtitle: string;
  scalePct: number;
  footerLeft: string;
  footerRight: string;
}

export interface ContainerPlanProps {
  title?: string;
  panel: ContainerPlanPanel;
  rooms: RoomPlan[];
  className?: string;
}
