import type { ScadaIconName } from "@gd-monorepo/ui";

export type DeviceType =
  | "battery_bank"
  | "pcs"
  | "breaker"
  | "solar_panel"
  | "hvac";

export type ProtocolType = "modbus" | "canbus" | "serial" | "timeseries";

export interface DefaultRegister {
  name: string;
  address?: number;
  type?: "holding" | "input" | "coil" | "discrete";
  scale?: number;
  unit: string;
  pgn?: number;
  spn?: number;
  count?: number;
}

export interface ConnectionPoint {
  id: string;
  position: "left" | "right" | "top" | "bottom";
  type: "power" | "communication";
}

export interface AlarmRuleDefinition {
  name: string;
  condition: string;
  severity: "critical" | "warning" | "info";
}

export interface DeviceDefinition {
  type: DeviceType;
  displayName: string;
  category: "storage" | "power" | "protection" | "generation" | "cooling";
  icon: ScadaIconName;
  defaultSize: { width: number; height: number };
  supportedProtocols: ProtocolType[];
  defaultRegisters: {
    modbus: DefaultRegister[];
    canbus: DefaultRegister[];
  };
  connectionPoints: ConnectionPoint[];
  defaultAlarms: AlarmRuleDefinition[];
}
