import type { DeviceDefinition } from "../types";

export const BATTERY_BANK_DEFINITION: DeviceDefinition = {
  type: "battery_bank",
  displayName: "Batarya Grubu (8li)",
  category: "storage",
  icon: "battery",
  defaultSize: { width: 240, height: 160 },
  supportedProtocols: ["modbus", "canbus"],
  defaultRegisters: {
    modbus: [
      { name: "SOC", address: 100, type: "holding", scale: 0.1, unit: "%" },
      { name: "SOH", address: 101, type: "holding", scale: 0.1, unit: "%" },
      { name: "Voltage", address: 102, type: "holding", scale: 0.01, unit: "V" },
      { name: "Current", address: 104, type: "holding", scale: 0.1, unit: "A" },
      { name: "Temperature", address: 106, type: "holding", scale: 0.1, unit: "°C" },
      { name: "ChargeStatus", address: 108, type: "holding", unit: "" },
      { name: "CellVoltages", address: 200, type: "holding", count: 8, unit: "V" },
      { name: "Battery Ready", address: 300, type: "holding", unit: "" },
    ],
    canbus: [
      { name: "SOC", pgn: 0xff01, spn: 100, scale: 0.1, unit: "%" },
      { name: "SOH", pgn: 0xff01, spn: 101, scale: 0.1, unit: "%" },
      { name: "Voltage", pgn: 0xff02, spn: 200, scale: 0.01, unit: "V" },
      { name: "Current", pgn: 0xff02, spn: 201, scale: 0.1, unit: "A" },
    ],
  },
  connectionPoints: [
    { id: "power_in", position: "left", type: "power" },
    { id: "power_out", position: "right", type: "power" },
    { id: "comms", position: "top", type: "communication" },
  ],
  defaultAlarms: [
    { name: "LowSOC", condition: "SOC < 20", severity: "critical" },
    { name: "HighTemp", condition: "Temperature > 45", severity: "warning" },
    { name: "CellImbalance", condition: "max(CellVoltages) - min(CellVoltages) > 0.1", severity: "warning" },
  ],
};
