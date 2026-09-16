// AUX Analyser Register Map — demo sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.1).
// Gerçek Modbus map'i geldiğinde YALNIZCA bu dosya + config güncellenir.

// ============================================================================
// INPUT REGISTERS (3x) — Read Only
// ============================================================================

export const INPUT = {
  AUX_VOLTAGE: 0, // uint16, scale 0.1 (V) — nominal 230.0
  AUX_CURRENT: 1, // uint16, scale 0.1 (A)
  AUX_FREQUENCY: 2, // uint16, scale 0.01 (Hz) — nominal 50.00
  ENERGY_STATUS: 3, // uint16 bitfield: bit0 AUX OK · bit1 AUX Loss
} as const;
