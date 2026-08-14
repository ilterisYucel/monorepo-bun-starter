/**
 * English translation dictionary — UI layer (generic).
 *
 * Contains only domain-independent keys shared across all apps.
 * App-specific keys (fire.*, settings.*, maneuver.*, etc.)
 * are defined in each app's own i18n/en.ts file.
 *
 * Key categories:
 *   common.*   — general terms
 *   chart.*    — chart controls & legend
 *   status.*   — connection & system status
 *   error.*    — error messages
 */

export const EN_DICT = {
  // =========================================================================
  // Common
  // =========================================================================
  "common.online": "Online",
  "common.offline": "Offline",
  "common.loading": "Loading...",
  "common.noData": "No data yet",
  "common.waitingData": "Waiting for data...",
  "common.detail": "Show Details",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.close": "Close",
  "common.all": "All",
  "common.none": "None",
  "common.selected": "{count} selected",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.underConstruction": "Under Construction",
  "common.role.admin": "Admin",
  "common.role.teknik": "Technical",
  "common.role.guest": "Guest",
  "common.role.boss": "Manager",

  // =========================================================================
  // Chart
  // =========================================================================
  "chart.range.1m": "Last 1 Minute",
  "chart.range.1h": "Last 1 Hour",
  "chart.range.1d": "Last 1 Day",
  "chart.range.1w": "Last 1 Week",
  "chart.range.1M": "Last 1 Month",
  "chart.range.3M": "Last 3 Months",
  "chart.range.6M": "Last 6 Months",
  "chart.range.1y": "Last 1 Year",
  "chart.range.custom": "Custom Range",
  "chart.range.from": "From",
  "chart.range.to": "To",

  "chart.control.timeRange": "Time Range",
  "chart.control.points": "Data Points",
  "chart.control.points.low": "60 (Low)",
  "chart.control.points.standard": "120 (Standard)",
  "chart.control.points.high": "240 (High)",
  "chart.control.points.max": "500 (Maximum)",

  "chart.control.systemEvents": "System Events",
  "chart.control.userActions": "User Actions",
  "chart.control.correctedEvents": "Corrected Events",
  "chart.control.metric": "Metric",
  "chart.control.onlyEssential": "Essential Only",
  "chart.control.onlyDetail": "Detail Only",
  "chart.control.categoryEssential": "Essential Metrics",
  "chart.control.categoryDetail": "Other Metrics",
  "chart.control.searchPlaceholder": "Search metrics...",
  "chart.control.noResults": "No results found",
  "chart.control.stats": "Statistics",

  "chart.subtitle.points": "{count} points",
  "chart.subtitle.interval": "~{label} interval",

  "chart.unit.seconds": "s",
  "chart.unit.minutes": "m",
  "chart.unit.hours": "h",
  "chart.unit.days": "d",

  "chart.legend.series": "Series",
  "chart.legend.last": "Last",
  "chart.legend.min": "Min",
  "chart.legend.max": "Max",
  "chart.legend.avg": "Avg",

  "chart.yAxisLabel": "Value",

  // =========================================================================
  // Status
  // =========================================================================
  "status.active": "Active",
  "status.warning": "Warning",
  "status.connected": "Connected",
  "status.disconnected": "Disconnected",
  "status.normal": "Normal",
  "status.error": "Error",
  "status.open": "Open",
  "status.closed": "Closed",
  "status.tripped": "Tripped",
  "status.inactive": "Inactive",

  // =========================================================================
  // Error
  // =========================================================================
  "error.loadFailed": "Loading failed",
  "error.notFound": "Not found",
  "error.unauthorized": "Unauthorized access",
  "error.generic": "An error occurred",
  "error.reload": "Reload",
} as const;
