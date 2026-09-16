// IMD Register Map — demo sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.4).
// Gerçek Modbus map'i geldiğinde YALNIZCA bu dosya + config güncellenir.

// ============================================================================
// INPUT REGISTERS (3x) — Read Only
// ============================================================================

export const INPUT = {
  INSULATION_RESISTANCE: 0, // uint16, scale 1 (kΩ) — sağlıklı: ~1000
  STATUS: 1, // uint16 bitfield: bit0 OK · bit1 Fault · bit2 Comm Lost
} as const;
