import type { ReactNode } from "react";

export type SummaryCardVariant = "ok" | "alarm" | "fault" | "info" | "bsc" | "cb" | "dc" | "hvac";

export interface SummaryCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  variant: SummaryCardVariant;
}
