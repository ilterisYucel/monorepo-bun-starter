import type { DeviceType } from "./types";

export type {
  DeviceType,
  DeviceDefinition,
  ConnectionPoint,
  DefaultRegister,
  ProtocolType,
  AlarmRuleDefinition,
} from "./types";

export { DEVICE_LIBRARY, DEVICE_TYPES } from "./registry";
export { BATTERY_BANK_DEFINITION } from "./definitions/battery-bank";
export { PCS_DEFINITION } from "./definitions/pcs";
export { BREAKER_DEFINITION } from "./definitions/breaker";
export { SOLAR_PANEL_DEFINITION } from "./definitions/solar-panel";
export { HVAC_DEFINITION } from "./definitions/hvac";

export function getDeviceDefinition(type: DeviceType) {
  return DEVICE_LIBRARY[type];
}
