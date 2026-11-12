import type { StatusTone } from "../../primitives/StatusPill";

export type KpiVariant = "a" | "b";

export interface KpiWidgetProps {
  variant?: KpiVariant;
  label: string;
  value: number | string;
  unit?: string;
  /** 0–100; radial/bars için doluluk. */
  percent?: number;
  min?: string;
  max?: string;
  detailLabel?: string;
  detailValue?: string;
  tone?: StatusTone;
  className?: string;
}
