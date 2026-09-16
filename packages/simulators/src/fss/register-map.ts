// FSS Register Map — demo sözleşme (SANAL-IO-CIHAZ-AILESI-MIMARISI.md §2.2).
// Gerçek sinyal listesi geldiğinde YALNIZCA bu dosya + config güncellenir.

// ============================================================================
// DISCRETE INPUTS (1x) — Read Only
// ============================================================================

export const DISCRETE = {
  SYSTEM_OK: 0, // true = sağlıklı
  FAULT: 1, // true = arıza
  DISCHARGED: 2, // true = söndürme aktive edildi
} as const;
