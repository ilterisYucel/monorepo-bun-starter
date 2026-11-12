export type AlertSeverity = "critical" | "warning" | "info" | "cold" | "maint";
export type AlertsVariant = "a" | "b" | "c";

export interface AlertItem {
  id: string;
  time: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  status?: string;
  unacknowledged?: boolean;
}

export interface AlertsProps {
  variant?: AlertsVariant;
  title?: string;
  items: AlertItem[];
  className?: string;
}
