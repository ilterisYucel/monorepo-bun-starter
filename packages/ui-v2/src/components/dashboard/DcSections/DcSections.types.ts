export type DcRowTone = "default" | "success" | "warning" | "critical";

export interface DcRow {
  label: string;
  value: string;
  tone?: DcRowTone;
}

export interface DcSectionData {
  key: string;
  title: string;
  subtitle: string;
  badge: { tone: "success" | "warning" | "critical" | "maint" | "neutral"; label: string };
  rows: DcRow[];
  footer: string;
}

export interface DcSectionsProps {
  sections: DcSectionData[];
  className?: string;
}
