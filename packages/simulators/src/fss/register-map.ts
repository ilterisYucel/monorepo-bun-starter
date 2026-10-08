// FSS Register Map — Sigma XT yangın söndürme paneli + VIGI-DT1 gaz dedektörleri
// (demo sözleşme; SPEC DEMO-KONSOL-UI-UYUM UC-10 / K-7).
//
// NOT: Resmî bir Sigma XT Modbus haritası YOKTUR — referans konsolda panel
// sinyalleri kablolu röle çıkışları olarak konteyner kontrolcüsüne DI olarak
// alınır; zone/dedektör detayları simülasyondan gelir. Bu harita o davranışı
// Modbus telemetrisine taşımak için TASARLANMIŞTIR; gerçek panel haritası
// geldiğinde YALNIZCA bu dosya + config güncellenir.

// ============================================================================
// INPUT REGISTERS (FC04) — Read Only (panel durumu + dedektör ölçümleri)
// ============================================================================

export const INPUT = {
  PANEL_STATUS: 0, // 0 normal · 1 fire · 2 fault · 3 disabled · 4 test
  FIRST_STAGE: 1, // 0/1
  SECOND_STAGE: 2, // 0/1 (≥2 zone)
  RELEASED: 3, // 0/1 (söndürme aktive)
  COUNTDOWN: 4, // saniye (release delay geri sayım)
  MODE: 5, // 0 auto · 1 manual only
  ZONE_1_STATE: 6, // 0 normal · 1 fire · 2 fault
  ZONE_2_STATE: 7,
  ZONE_3_STATE: 8, // gaz
  DET1_H2_LEL: 9, // %LEL ×10
  DET1_VOC: 10, // VOC index ×10
  DET1_RH: 11, // %
  DET1_TEMP: 12, // °C ×10
  DET2_H2_LEL: 13,
  DET2_VOC: 14,
  DET2_RH: 15,
  DET2_TEMP: 16,
  EXTRACT_FAN: 17, // 0/1
  VENTILATION: 18, // 0/1
  BUZZER: 19, // 0/1
  VENTS_OPEN: 20, // 0/1 (explosion vent)
  DISABLE_EXTRACT: 21, // 0/1 (mode menu dE · extinguishant control)
  DISABLE_MANUAL: 22, // 0/1 (dt · manual release)
  DISABLE_EXTRACT_FAN: 23, // 0/1 (dc · extract fan)
  DISABLE_STAGE1: 24, // 0/1 (dP · 1st stage relay output)
  DISABLE_STAGE2: 25, // 0/1 (dA · 2nd stage relay output)
  DISABLE_SOUNDERS: 26, // 0/1 (db · 1st stage sounders)
} as const;

// ============================================================================
// COILS (0x) — Read/Write (panel komutları)
// ============================================================================

export const COILS = {
  RESET: 0, // true = panel reset
  MODE_MANUAL: 1, // true = yalnız manuel (otomatik release YOK)
  EXTRACT_FAN: 2, // true = tahliye fanı
  VENTILATION: 3, // true = havalandırma
} as const;

// ============================================================================
// DISCRETE INPUTS (1x) — Read Only (kuru kontak teyidi)
// ============================================================================

export const DISCRETE = {
  SYSTEM_OK: 0, // true = sağlıklı (NC)
  FAULT: 1,
  DISCHARGED: 2,
  SECOND_STAGE: 3,
} as const;

export const PANEL_STATUS = {
  NORMAL: 0,
  FIRE: 1,
  FAULT: 2,
  DISABLED: 3,
  TEST: 4,
} as const;

export const ZONE_STATE = {
  NORMAL: 0,
  FIRE: 1,
  FAULT: 2,
} as const;
