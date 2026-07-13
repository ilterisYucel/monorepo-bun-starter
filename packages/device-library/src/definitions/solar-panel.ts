import type { DeviceDefinition } from "../types";

export const SOLAR_PANEL_DEFINITION: DeviceDefinition = {
  type: "solar_panel",
  displayName: "Gunes Paneli",
  category: "generation",
  icon: "continuous",
  defaultSize: { width: 180, height: 100 },
  supportedProtocols: ["modbus", "canbus"],
  defaultRegisters: {
    modbus: [
      { name: "Irradiance", address: 700, type: "holding", scale: 1, unit: "W/m²" },
      { name: "PanelTemp", address: 702, type: "holding", scale: 0.1, unit: "°C" },
      { name: "Production", address: 704, type: "holding", scale: 0.01, unit: "kWh" },
      { name: "MPPT_Voltage", address: 706, type: "holding", scale: 0.1, unit: "V" },
    ],
    canbus: [
      { name: "Irradiance", pgn: 0xff20, spn: 400, scale: 1, unit: "W/m²" },
      { name: "Production", pgn: 0xff20, spn: 401, scale: 0.01, unit: "kWh" },
    ],
  },
  connectionPoints: [
    { id: "dc_output", position: "right", type: "power" },
    { id: "comms", position: "top", type: "communication" },
  ],
  defaultAlarms: [
    { name: "LowProduction", condition: "Production < 1", severity: "warning" },
    { name: "HighPanelTemp", condition: "PanelTemp > 70", severity: "warning" },
  ],
};
