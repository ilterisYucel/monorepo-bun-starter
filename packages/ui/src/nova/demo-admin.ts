/**
 * Demo Admin statik verisi (SPEC UC-8, FR-8.2/FR-8.4). Backend settings/mapping
 * API'si yok → read-only içerik (D-6). Kayıt kataloğu referans kayıt
 * haritalarından KIRPILMIŞTIR (demo UI'da gösterilen kayıtlar).
 */

export interface AdminMappingRow {
  element: string;
  device: string;
  register: string;
}

/** Ekran öğesi → kayıt eşlemesi (referans `default-mapping` kırpılmış). */
export const ADMIN_MAPPING: AdminMappingRow[] = [
  { element: "Battery SOC", device: "BSC", register: "30042 · SOC" },
  { element: "Battery SOH", device: "BSC", register: "30044 · SOH" },
  { element: "DC voltage", device: "BSC", register: "30051 · DC Voltage" },
  { element: "Rack max temp", device: "BSC rack", register: "30170 + 150·(R−1) · Max Pack Temp" },
  { element: "PCS operation status", device: "PCS", register: "0x2F7D · Operation Status" },
  { element: "PCS active power", device: "PCS", register: "0x2F7E · Grid Active Power" },
  { element: "PCS IGBT temp", device: "PCS", register: "0x2F54 · IGBT Temperature" },
  { element: "HVAC status", device: "HVAC", register: "0x1000 · Equipment Status" },
  { element: "HVAC compressor", device: "HVAC", register: "0x1006 · Compressor" },
  { element: "AUX active power", device: "PM5340", register: "Active Power Total" },
  { element: "FSS system OK", device: "CONTROL-PANEL-IO", register: "DI 2 · System OK" },
  { element: "FSS panel status", device: "FSS", register: "IR 0 · Panel Status" },
  { element: "Insulation resistance", device: "IMD", register: "0x2000 · Insulation Resistance" },
  { element: "MV breaker H01", device: "MV", register: "H01 Breaker" },
];

/** Demo device listesi (read-only). */
export const ADMIN_DEVICES: Array<{ id: string; type: string; protocol: string; note: string }> = [
  { id: "BSC-1", type: "battery", protocol: "MODBUS", note: "LGES Flex BSC JF1 · bank A" },
  { id: "BSC-2", type: "battery", protocol: "MODBUS", note: "LGES Flex BSC JF1 · bank B" },
  { id: "PCS-1", type: "pcs", protocol: "MODBUS", note: "Wattox MPCS-1725-S · bank A" },
  { id: "PCS-2", type: "pcs", protocol: "MODBUS", note: "Wattox MPCS-1725-S · bank B" },
  { id: "DEMO-MV-1", type: "mv", protocol: "MODBUS", note: "MV station H01–H05" },
  { id: "HVAC-1…8", type: "hvac", protocol: "MODBUS", note: "Envicool MC90HDNC1R" },
  { id: "PM5340-1", type: "aux", protocol: "MODBUS", note: "Schneider PM5340 energy analyzer" },
  { id: "CONTROL-PANEL-IO-1", type: "io", protocol: "MODBUS", note: "Door contacts + FSS dry contacts" },
  { id: "IMD-1", type: "imd", protocol: "MODBUS", note: "Bender isoPV1685RTU" },
  { id: "DC-METER-1", type: "dc-meter", protocol: "MODBUS", note: "DC voltage/current/power" },
  { id: "FSS-1", type: "fss", protocol: "MODBUS", note: "Sigma XT panel + VIGI-DT1" },
];
