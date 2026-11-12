export type BessStatus = "normal" | "warning" | "alarm" | "maint";

export interface BessBank {
  /** "A" | "B" */
  label: string;
  voltage: number;
  soc: number;
  soh: number;
  temperature: number;
}

export interface BessUnit {
  id: string;
  status: BessStatus;
  /** "DISCHARGE · 2/2 PCS", "ISOLATED · PCS FAULT" ... */
  stateLabel: string;
  pcs: string;
  banks: BessBank[];
}

export type BessCardVariant = "v1" | "v2" | "v3";

export interface BessContainerCardProps {
  variant?: BessCardVariant;
  unit: BessUnit;
  onOpen?: () => void;
  className?: string;
}
