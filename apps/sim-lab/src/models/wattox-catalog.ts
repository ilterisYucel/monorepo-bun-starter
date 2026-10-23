// Wattox MPCS Modbus Protocol V1.0 — Appendix 2 (PCS Fault Status Word) / Appendix 3 (Alarm).
// Alarm word 1..8 aynı bit isimlerini kullanır (dokümanda Appendix 3 = Appendix 2'nin
// ilk 8 kelimesi, "alarm" seviyesinde).

export const FAULT_BITS: string[][] = [
  // FW1 0x2FB5
  ["Battery polarity reversed", "Storage battery voltage too high", "Storage battery voltage too low", "Battery voltage too high", "Battery voltage too low", "BMS system fault", "BMS pre-charge fault", "BMS main contactor fault", "BMS insulation fault", "DC half-bus HW overvoltage", "DC full-bus SW overvoltage", "DC full-bus SW undervoltage", "DC half-bus voltage variation", "AC side HW overcurrent", "AC side SW overcurrent", "DC side HW overcurrent"],
  // FW2 0x2FB6
  ["DC side SW overcurrent", "IGBT Desat fault", "IGBT block fault", "IGBT over-temperature", "AC A-phase Hall disconnected", "AC B-phase Hall disconnected", "AC C-phase Hall disconnected", "DC current Hall disconnected", "Detection board model mismatch", "DC pre-charge contactor fault", "DC side switch fault", "AC pre-charge contactor fault", "AC side switch fault", "CBC overcurrent", "Device overload", "Grid AC overvoltage"],
  // FW3 0x2FB7
  ["Grid AC undervoltage", "Grid AC overfrequency", "Grid AC underfrequency", "Output phase loss", "Grid voltage sequence incorrect", "Phase lock error", "Grid voltage imbalance", "AC overvoltage (off-grid)", "AC undervoltage (off-grid)", "Islanding fault", "Current control deviation too large", "Bus soft-start failure", "AC DC component beyond limit", "AC switch closing voltage mismatch", "AD zero drift too large", "Low insulation resistance"],
  // FW4 0x2FB8
  ["Insulation detection failed", "Internal cavity over-temperature", "Internal cavity over-temp alarm", "Internal cavity temperature low", "Filter capacitor over-temperature", "Filter capacitor over-temp alarm", "Filter capacitor temperature low", "Aux transformer over-temperature", "Aux transformer over-temp alarm", "Aux transformer temperature low", "High ambient temperature", "High ambient temperature alarm", "Low ambient temperature", "IGBT A-phase over-temperature", "IGBT B-phase over-temperature", "IGBT C-phase over-temperature"],
  // FW5 0x2FB9
  ["IGBT temperature sampling error", "IGBT over-temperature alarm", "Reactor over-temperature", "Reactor over-temperature alarm", "Reactor temperature low", "Surge protection device fault", "Parallel communication fault", "Abnormal stop of the master", "Carrier synchronization failed", "Internal cavity fan fault", "Circulating fan fault", "Reactor fan fault", "IGBT fan fault", "Reserved", "CAN fault control↔comm board", "HMI communication fault"],
  // FW6 0x2FBA
  ["BMS communication fault", "Reserved", "Reserved", "Reserved", "Reserved", "EMS communication fault (dual network)", "EEPROM fault", "EEPROM alarm", "Black box error", "FPGA data exchange error", "RTC error", "220 V control power disconnected", "Leakage current Hall self-test failed", "Residual abrupt leakage overlimit", "Continuous residual leakage overlimit", "Local emergency stop fault"],
  // FW7 0x2FBB
  ["Remote emergency stop fault", "BMS emergency stop fault", "Phase-to-PE fault", "Capacitor voltage resonance fault", "High humidity", "Humidity detection disconnected", "Temperature too high", "Temperature detection disconnected", "Fuse fault", "Cabinet door fault", "Water pump locked-rotor", "Water pump speed signal absent", "Water pump idling", "Water cooling hydraulic fault", "Fan power sequence incorrect", "Fan power disconnected"],
  // FW8 0x2FBC
  ["Three-phase fan fault", "Heater contactor fault", "Water pump power disconnected", "SW version mismatch master/slave", "Dynamic environment fault", "DC midpoint sampling disconnected", "DC voltage sampling disconnected", "AC and DC voltage mismatch", "Grid voltage mismatch", "Heat exchanger fan fault", "DC breaker fan fault", "AC breaker fan fault", "Master/slave identification fault", "Power inconsistent master/slave", "IGBT temperature low", "Zero sequence loop current too large"],
  // FW9 0x2FBD
  ["FPGA side fault", "Fault of parallel devices in cabinet", "Fiber communication interrupted", "Fiber communication CRC fault", "Control mode inconsistent", "Capacitor harmonic overlimit", "Fan pump / water pump switch error", "PCS interaction fault", "Capacitor harmonic sampling disconnected", "Reserved", "Reserved", "Reserved", "Reserved", "Reserved", "Reserved", "Reserved"],
  // FW10 0x2FBE
  Array.from({ length: 16 }, () => "Reserved"),
];

/** Hangi arıza bitleri otomatik toparlanabilir (şebeke kaynaklı). Diğerleri reset ister. */
export const AUTO_RECOVER: ReadonlySet<string> = new Set([
  "2:15", "3:0", "3:1", "3:2", "3:3", "3:5", "3:6", "3:9", "6:0", "6:5",
]);

export const fbit = (word: number, bit: number): string => `${word}:${bit}`;
