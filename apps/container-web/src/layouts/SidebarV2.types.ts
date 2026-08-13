export type PageTypeV2 =
  | "dashboard" | "scada" | "bsc" | "fire" | "energy-analyzer" | "hvac"
  | "control" | "system-charts" | "events" | "reports"
  | "analytics" | "devices";

export interface SidebarV2Props {
  currentPage: PageTypeV2;
  onPageChange: (page: PageTypeV2) => void;
}
