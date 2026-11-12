import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "critical" | "info" | "maint" | "neutral";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  uppercase?: boolean;
  className?: string;
}

export interface CountBadgeProps {
  value: number;
  className?: string;
}
