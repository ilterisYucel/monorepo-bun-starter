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
  // FSS kuru kontakları (K5 — EP203 paneli DI'lara taşındı):
  FSS_SYSTEM_OK: 2, // true = FSS sağlıklı (NC kuru kontak)
  FSS_FAULT: 3, // true = FSS arıza
  FSS_DISCHARGED: 4, // true = söndürme aktive edildi
  FSS_2ND_STAGE: 5, // true = 2. aşama aktive
} as const;
