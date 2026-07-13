import type { DeviceDefinition, DeviceType } from "./types";
import { BATTERY_BANK_DEFINITION } from "./definitions/battery-bank";
import { PCS_DEFINITION } from "./definitions/pcs";
import { BREAKER_DEFINITION } from "./definitions/breaker";
import { SOLAR_PANEL_DEFINITION } from "./definitions/solar-panel";
import { HVAC_DEFINITION } from "./definitions/hvac";

export const DEVICE_LIBRARY: Record<DeviceType, DeviceDefinition> = {
  battery_bank: BATTERY_BANK_DEFINITION,
  pcs: PCS_DEFINITION,
  breaker: BREAKER_DEFINITION,
  solar_panel: SOLAR_PANEL_DEFINITION,
  hvac: HVAC_DEFINITION,
};

export const DEVICE_TYPES: DeviceType[] = Object.keys(DEVICE_LIBRARY) as DeviceType[];
