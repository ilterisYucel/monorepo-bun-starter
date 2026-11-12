import type { ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  countTone?: "critical" | "warning" | "neutral";
}

export type TabsVariant = "segmented" | "chips";

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: TabsVariant;
  ariaLabel?: string;
  className?: string;
}

export type TabCountTone = NonNullable<TabItem["countTone"]>;
