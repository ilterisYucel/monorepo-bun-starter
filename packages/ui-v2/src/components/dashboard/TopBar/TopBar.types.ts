export interface TopBarTab {
  key: string;
  label: string;
}

export interface TopBarProps {
  tabs: TopBarTab[];
  active: string;
  onSelect: (key: string) => void;
  liveText?: string;
  clock?: string;
  onEmergencyStop?: () => void;
  className?: string;
}
