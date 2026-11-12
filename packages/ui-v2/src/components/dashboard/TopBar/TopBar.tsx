import { EMS_ICONS } from "../../../icons";
import {
  Bar,
  Clock,
  Emergency,
  Live,
  LiveDot,
  Right,
  Tab,
  Track,
} from "./TopBar.styles";
import type { TopBarProps } from "./TopBar.types";

/** Segmented sayfa navigasyonu + canlı/saat/acil durdurma. */
export const TopBar = ({
  tabs,
  active,
  onSelect,
  liveText = "Live · updated 1 s ago",
  clock = "23.10.2026 · 13:24",
  onEmergencyStop,
  className,
}: TopBarProps) => (
  <Bar className={className}>
    <Track role="tablist" aria-label="Sayfalar">
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          $active={tab.key === active}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </Tab>
      ))}
    </Track>
    <Right>
      <Live>
        <LiveDot aria-hidden="true" />
        {liveText}
      </Live>
      <Clock>{clock}</Clock>
      <Emergency type="button" onClick={onEmergencyStop}>
        <EMS_ICONS.emergencyStop size={16} aria-hidden="true" />
        Emergency stop
      </Emergency>
    </Right>
  </Bar>
);

TopBar.displayName = "TopBar";
