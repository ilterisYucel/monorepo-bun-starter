import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "critical" | "info" | "neutral";

export interface StatusPillProps {
  tone?: StatusTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}
