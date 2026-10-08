/**
 * Demo register kataloğu (SPEC UC-8, FR-8.4) — referans kayıt haritalarından
 * KIRPILMIŞ, yalnız demo ekranlarında gösterilen kayıtlar. Gerçek harita
 * backend cihaz config'lerindedir; bu yalnız görüntüleme verisidir.
 */

export interface RegisterRow {
  group: "BSC" | "PCS" | "HVAC" | "AUX" | "FSS" | "IMD";
  name: string;
  address: string;
  note: string;
}

export const DEMO_REGISTERS: RegisterRow[] = [
  { group: "BSC", name: "SOC", address: "30042", note: "State of charge (%)" },
  { group: "BSC", name: "SOH", address: "30044", note: "State of health (%)" },
  { group: "BSC", name: "DC Voltage", address: "30051", note: "V" },
  { group: "BSC", name: "DC Current", address: "30052", note: "A" },
  { group: "BSC", name: "Charge power limit", address: "30063", note: "kW" },
  { group: "BSC", name: "Discharge power limit", address: "30065", note: "kW" },
  { group: "BSC", name: "Rack base", address: "30170 + 150·(R−1)", note: "Rack registers" },
  { group: "PCS", name: "Operation status", address: "0x2F7D", note: "0 off · 1 stby · 2 chg · 3 dis · 6 fault" },
  { group: "PCS", name: "Active power", address: "0x2F7E", note: "kW" },
  { group: "PCS", name: "Grid line voltage AB", address: "0x2F4F", note: "V" },
  { group: "PCS", name: "IGBT temperature", address: "0x2F54", note: "°C" },
  { group: "PCS", name: "AC breaker", address: "0x2F5B", note: "open/closed" },
  { group: "PCS", name: "Emergency stop", address: "0x2F60", note: "bits" },
  { group: "HVAC", name: "Equipment status", address: "0x1000", note: "0/1/3" },
  { group: "HVAC", name: "Supply air temp", address: "0x1003", note: "°C" },
  { group: "HVAC", name: "Compressor", address: "0x1006", note: "run/stop + %" },
  { group: "HVAC", name: "Return/room temp", address: "0x1008", note: "°C" },
  { group: "AUX", name: "Active power total", address: "PM5340", note: "kW" },
  { group: "AUX", name: "Voltage L-L avg", address: "PM5340", note: "V" },
  { group: "FSS", name: "Panel status", address: "IR 0", note: "0 normal · 1 fire · 2 fault" },
  { group: "FSS", name: "Released", address: "IR 3", note: "extinguishant released" },
  { group: "FSS", name: "Detector H₂", address: "IR 9/13", note: "%LEL ×10" },
  { group: "IMD", name: "Insulation resistance", address: "0x2000", note: "Ω (UInt32)" },
  { group: "IMD", name: "Insulation alarm", address: "0x2005", note: "0 OK · 4 Warning" },
];
