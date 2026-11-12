import type { ReactNode } from "react";

export interface TableColumn {
  key: string;
  label: string;
  width?: number | string;
  align?: "left" | "right" | "center";
}

export interface TableProps {
  columns: TableColumn[];
  rows: Array<Record<string, ReactNode>>;
  dense?: boolean;
  ariaLabel?: string;
  className?: string;
}
