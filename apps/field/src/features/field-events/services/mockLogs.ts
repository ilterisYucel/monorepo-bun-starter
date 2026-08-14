import type { LogEntry } from "@gd-monorepo/shared-types";

const NOW = Date.now();

function log(
  minutes: number,
  type: LogEntry["type"],
  source: LogEntry["source"],
  message: string,
  details: string,
  containerId: string,
  extraTags?: Record<string, string>,
): LogEntry {
  return {
    id: `mock-${containerId}-${minutes}-${type}`,
    timestamp: new Date(NOW - minutes * 60 * 1000).toISOString(),
    type,
    source,
    message,
    details,
    tags: { container_id: containerId, ...extraTags },
  };
}

export const MOCK_SYSTEM_LOGS: LogEntry[] = [
  log(5, "error", "system", "CB-1 tripped", "Overcurrent detected, circuit breaker tripped", "container-1", { deviceId: "CB-1" }),
  log(10, "warning", "system", "BSC-2 low voltage", "Voltage dropped to 45.2V, below threshold", "container-1", { deviceId: "BSC-2" }),
  log(15, "info", "system", "HVAC cooling started", "Room temperature exceeded 28°C, cooling activated", "container-1", { deviceId: "HVAC-KONTROL" }),
  log(20, "success", "system", "BSC-1 charge complete", "Charge cycle completed, SoC reached 82%", "container-1", { deviceId: "BSC-1" }),
  log(25, "warning", "system", "DC-1 fault detected", "Output voltage fluctuation detected on DC Output 1", "container-1", { deviceId: "DC-1" }),
  log(4, "info", "system", "PCS-1 charge command received", "Charge command received via field device-service, PCS-1 ramping up", "container-1", { deviceId: "PCS-1" }),
  log(7, "success", "system", "PCS-1 efficiency nominal", "PCS-1 efficiency 96.4%, within nominal range", "container-1", { deviceId: "PCS-1" }),
  log(8, "error", "system", "CB-2 tripped", "Short circuit detected, breaker tripped", "container-2", { deviceId: "CB-2" }),
  log(12, "warning", "system", "BSC-1 high temp", "Max cell temperature reached 42°C", "container-2", { deviceId: "BSC-1" }),
  log(18, "info", "system", "Extract fan started", "Post-discharge ventilation activated", "container-2", { deviceId: "HVAC-KONTROL" }),
  log(22, "warning", "system", "BSC-2 discharge rate high", "Discharge rate exceeded expected range", "container-2", { deviceId: "BSC-2" }),
  log(30, "error", "system", "DC-1 offline", "DC Output 1 communication lost", "container-2", { deviceId: "DC-1" }),
  log(11, "warning", "system", "PCS-2 efficiency low", "PCS-2 efficiency dropped below 88%", "container-2", { deviceId: "PCS-2" }),
  log(35, "info", "system", "System idle", "Container 3 inactive, awaiting activation", "container-3", {}),
  log(40, "warning", "system", "BSC-1 offline", "Battery system not responding", "container-3", { deviceId: "BSC-1" }),
  log(45, "error", "system", "CB-1 offline", "Circuit breaker communication lost", "container-3", { deviceId: "CB-1" }),
  log(50, "info", "system", "DC-2 offline", "DC Output 2 powered off", "container-3", { deviceId: "DC-2" }),
  log(55, "warning", "system", "HVAC offline", "HVAC system not responding", "container-3", { deviceId: "HVAC-KONTROL" }),
  log(38, "error", "system", "PCS-3 offline", "PCS-3 communication lost, container-3 unreachable", "container-3", { deviceId: "PCS-3" }),
];

export const MOCK_USER_LOGS: LogEntry[] = [
  log(6, "info", "user", "admin: charge BSC-1", "Charge command sent to BSC-1, power=100kW", "container-1", {}),
  log(11, "success", "user", "teknik: discharge BSC-2", "Discharge command executed, power=50kW", "container-1", {}),
  log(16, "info", "user", "admin: stop BSC-1", "Stop command sent, charge cycle cancelled", "container-1", {}),
  log(21, "success", "user", "teknik: reset CB-1", "Reset command executed, breaker restored", "container-1", {}),
  log(26, "warning", "user", "admin: mode change", "Switched to Auto+Manual mode", "container-1", {}),
  log(3, "info", "user", "admin: field_charge_all", "Saha manevrası: tüm konteynerler şarja alındı (PCS-1, PCS-2, PCS-3)", "container-1", {}),
  log(9, "info", "user", "admin: charge BSC-2", "Charge command sent to BSC-2, power=80kW", "container-2", {}),
  log(13, "success", "user", "teknik: open CB-2", "Open command executed, breaker opened", "container-2", {}),
  log(19, "info", "user", "admin: on DC-2", "Power on command sent to DC Output 2", "container-2", {}),
  log(23, "success", "user", "teknik: off DC-1", "Power off command executed on DC Output 1", "container-2", {}),
  log(31, "info", "user", "admin: container-2 mode", "Switched to Manual mode for maintenance", "container-2", {}),
  log(2, "info", "user", "boss: field_discharge_all", "Saha manevrası: tüm konteynerler deşarja alındı", "container-2", {}),
  log(36, "info", "user", "admin: login", "Admin user logged in", "container-3", {}),
  log(42, "success", "user", "teknik: reset CB-1", "Reset command executed on offline CB", "container-3", {}),
  log(48, "info", "user", "admin: discharge BSC-1", "Discharge command sent, power=30kW", "container-3", {}),
  log(52, "success", "user", "teknik: on DC-1", "Power on command sent", "container-3", {}),
  log(58, "info", "user", "admin: logout", "Admin user logged out", "container-3", {}),
];

export function mockLogs(source: "system" | "user"): LogEntry[] {
  if (source === "system") return MOCK_SYSTEM_LOGS;
  return MOCK_USER_LOGS;
}
