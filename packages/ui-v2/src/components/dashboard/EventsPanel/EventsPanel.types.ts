import type { AlertSeverity } from "../../core/Alerts";
import type { TabItem } from "../../primitives/Tabs";

export interface EventLogRow {
  id: string;
  time: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  status?: string;
}

export interface EventsLogProps {
  title?: string;
  events: EventLogRow[];
  tabs?: TabItem[];
  searchPlaceholder?: string;
  exportLabel?: string;
  onExport?: () => void;
  className?: string;
}

export interface StringStateCard {
  key: string;
  title: string;
  badge: { tone: "success" | "warning" | "critical" | "maint" | "neutral"; label: string };
  rows: Array<{
    key: string;
    label: string;
    value: string;
    tone?: "default" | "success" | "warning" | "critical";
  }>;
}

export interface StringStatesProps {
  cards: StringStateCard[];
  className?: string;
}
