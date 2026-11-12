export interface DrawerRack {
  id: string;
  soc: number;
  soh: number;
  temperature: number;
  voltage: number;
  current: number;
  cellTempMax: number;
  cellTempMin: number;
  cellVoltageMax: number;
  cellVoltageMin: number;
}

export interface PackCell {
  cma: string;
  index: number;
  value: number;
  tone?: "normal" | "warning" | "critical";
}

export interface PackDetail {
  id: string;
  cells: PackCell[];
  hardware: Array<{ label: string; value: string }>;
}

export interface RmuPosition {
  id: string;
  state: string;
  tone: "success" | "warning" | "critical";
}

export interface PcsRow {
  id: string;
  state: string;
  power: string;
  acVoltage: string;
  tone: "success" | "warning" | "critical";
}

export interface BankReading {
  id: string;
  soc: number;
  soh: number;
  voltage: number;
  temperature: number;
  current: number;
  high?: boolean;
}

export interface ContainerDrawerProps {
  title: string;
  stateBadge: { tone: "success" | "warning" | "critical" | "info" | "maint" | "neutral"; label: string };
  modeBadge?: { tone: "success" | "warning" | "critical" | "info" | "maint" | "neutral"; label: string };
  feeder: string;
  actions?: string[];
  rack: DrawerRack;
  pack: PackDetail;
  rmu: RmuPosition[];
  pcs: PcsRow[];
  banks: BankReading[];
  onClose?: () => void;
  onOpenEms?: () => void;
  onEmergencyStop?: () => void;
  footerNote?: string;
  className?: string;
}
