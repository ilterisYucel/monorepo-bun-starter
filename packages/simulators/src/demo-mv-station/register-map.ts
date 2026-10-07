// Demo MV istasyon simülatörü register haritası (SPEC UC-9 / T-37).
// Hücreler: H01/H02/H04/H05 kesici; toprak ayırıcıları H01/H04/H05.

/** INPUT_REGISTER — okunan telemetri (1=kapalı, 0=açık / ölçekli değerler). */
export const INPUT_REGS = {
  H01_BREAKER: 0,
  H02_BREAKER: 1,
  H04_BREAKER: 2,
  H05_BREAKER: 3,
  H01_EARTH: 4,
  H04_EARTH: 5,
  H05_EARTH: 6,
  KV_X10: 7,
  HZ_X100: 8,
} as const;

/** COIL — komut darbeleri (yazım). */
export const COILS = {
  H01_OPEN: 0,
  H01_CLOSE: 1,
  H02_OPEN: 2,
  H02_CLOSE: 3,
  H04_OPEN: 4,
  H04_CLOSE: 5,
  H05_OPEN: 6,
  H05_CLOSE: 7,
  H01_ES_OPEN: 8,
  H01_ES_CLOSE: 9,
  H04_ES_OPEN: 10,
  H04_ES_CLOSE: 11,
  H05_ES_OPEN: 12,
  H05_ES_CLOSE: 13,
} as const;
