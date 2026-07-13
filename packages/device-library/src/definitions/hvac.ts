import type { DeviceDefinition } from "../types";

export const HVAC_DEFINITION: DeviceDefinition = {
  type: "hvac",
  displayName: "Sogutma Unitesi",
  category: "cooling",
  icon: "temperature",
  defaultSize: { width: 120, height: 90 },
  supportedProtocols: ["modbus"],
  defaultRegisters: {
    modbus: [
      { name: "AmbientTemp", address: 800, type: "holding", scale: 0.1, unit: "°C" },
      { name: "FanSpeed", address: 802, type: "holding", scale: 1, unit: "RPM" },
      { name: "Mode", address: 804, type: "holding", unit: "" },
      { name: "Status", address: 806, type: "holding", unit: "" },
    ],
    canbus: [],
  },
  connectionPoints: [
    { id: "comms", position: "top", type: "communication" },
  ],
  defaultAlarms: [
    { name: "HighAmbientTemp", condition: "AmbientTemp > 40", severity: "warning" },
    { name: "FanFailure", condition: "FanSpeed == 0", severity: "critical" },
  ],
};
