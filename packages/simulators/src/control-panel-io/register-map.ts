// Control Panel IO Register Map — demo sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.3).
// Gerçek IO adresleri geldiğinde YALNIZCA bu dosya + config güncellenir.

// ============================================================================
// COILS (0x) — Read/Write (ışık röleleri)
// ============================================================================

export const COILS = {
  BATTERY_LIGHT: 0, // true = batarya odası ışığı AÇ
  PANEL_LIGHT: 1, // true = panel odası ışığı AÇ
} as const;

// ============================================================================
// DISCRETE INPUTS (1x) — Read Only (kapı kontaktları)
// ============================================================================

export const DISCRETE = {
  BATTERY_DOOR_OPEN: 0, // true = batarya kapısı açık
  PANEL_DOOR_OPEN: 1, // true = panel kapısı açık
} as const;
