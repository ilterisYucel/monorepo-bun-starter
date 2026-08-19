import type { DeviceDefinition } from "../types";

export const BREAKER_DEFINITION: DeviceDefinition = {
  type: "breaker",
  displayName: "Akim Kesici",
  category: "protection",
  icon: "stop",
  defaultSize: { width: 100, height: 80 },
  supportedProtocols: ["modbus"],
  defaultRegisters: {
    modbus: [
      { name: "BreakerStatus", address: 600, type: "holding", unit: "" },
      { name: "Trip", address: 601, type: "holding", unit: "" },
    ],
    canbus: [],
  },
  connectionPoints: [
    { id: "input", position: "left", type: "power" },
    { id: "output", position: "right", type: "power" },
  ],
  defaultAlarms: [
    { name: "BreakerTripped", condition: "Trip == 1", severity: "critical" },
  ],
};
