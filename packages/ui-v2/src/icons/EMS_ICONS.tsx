import { DashboardIcon } from "./generated/DashboardIcon";
import { RackDetailsIcon } from "./generated/RackDetailsIcon";
import { ControlIcon } from "./generated/ControlIcon";
import { AnalyticsIcon } from "./generated/AnalyticsIcon";
import { ReportsIcon } from "./generated/ReportsIcon";
import { HistoryIcon } from "./generated/HistoryIcon";
import { EmergencyStopIcon } from "./generated/EmergencyStopIcon";
import { InfoIcon } from "./generated/InfoIcon";
import { SearchIcon } from "./generated/SearchIcon";
import { DownloadIcon } from "./generated/DownloadIcon";
import { RackGlyphIcon } from "./generated/RackGlyphIcon";
import { CloseIcon } from "./generated/CloseIcon";

/** EMS ekranlarında kullanılan tipli ikon map'i. */
export const EMS_ICONS = {
  dashboard: DashboardIcon,
  rackDetails: RackDetailsIcon,
  control: ControlIcon,
  analytics: AnalyticsIcon,
  reports: ReportsIcon,
  history: HistoryIcon,
  emergencyStop: EmergencyStopIcon,
  info: InfoIcon,
  search: SearchIcon,
  download: DownloadIcon,
  rackGlyph: RackGlyphIcon,
  close: CloseIcon,
} as const;

export type EmsIconName = keyof typeof EMS_ICONS;
