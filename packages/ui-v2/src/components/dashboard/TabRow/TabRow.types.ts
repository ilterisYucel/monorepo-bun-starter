import type { StatusTone } from "../../primitives/StatusPill";

export interface TabRowPill {
  tone: StatusTone;
  label: string;
}

export interface TabRowProps {
  title: string;
  subtitle: string;
  pills: TabRowPill[];
  className?: string;
}
