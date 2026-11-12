import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "top" | "nested";
export type CardStatus = "normal" | "warning" | "critical" | "maint";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  status?: CardStatus;
  padding?: number;
  children: ReactNode;
}
