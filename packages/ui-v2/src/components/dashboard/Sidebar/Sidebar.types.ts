import type { EmsIconName } from "../../../icons";

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: EmsIconName;
}

export interface SidebarProps {
  items: SidebarNavItem[];
  active: string;
  onSelect?: (key: string) => void;
  version?: string;
  footer?: string;
  className?: string;
}
