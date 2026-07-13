import type { DeviceDefinition } from "../types";

export const PCS_DEFINITION: DeviceDefinition = {
  type: "pcs",
  displayName: "Guc Donusturucu (PCS)",
  category: "power",
  icon: "powerPlug",
  defaultSize: { width: 160, height: 120 },
  supportedProtocols: ["modbus", "canbus"],
  defaultRegisters: {
    modbus: [
      { name: "ActivePower", address: 400, type: "holding", scale: 0.001, unit: "kW" },
      { name: "ReactivePower", address: 402, type: "holding", scale: 0.001, unit: "kvar" },
      { name: "Efficiency", address: 404, type: "holding", scale: 0.1, unit: "%" },
      { name: "DCLinkVoltage", address: 406, type: "holding", scale: 0.1, unit: "V" },
      { name: "ACVoltage", address: 408, type: "holding", scale: 0.1, unit: "V" },
      { name: "EmergencyStop", address: 500, type: "holding", unit: "" },
    ],
    canbus: [
      { name: "ActivePower", pgn: 0xff10, spn: 300, scale: 0.001, unit: "kW" },
      { name: "DCLinkVoltage", pgn: 0xff10, spn: 301, scale: 0.1, unit: "V" },
    ],
  },
  connectionPoints: [
    { id: "dc_input", position: "left", type: "power" },
    { id: "ac_output", position: "right", type: "power" },
    { id: "comms", position: "top", type: "communication" },
  ],
  defaultAlarms: [
    { name: "Overload", condition: "ActivePower > 250", severity: "critical" },
    { name: "LowEfficiency", condition: "Efficiency < 85", severity: "warning" },
  ],
};
