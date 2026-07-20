// CB Register Map — DC Circuit Breaker Modbus Interface

// ============================================================================
// COILS (0x) — Read/Write
// ============================================================================

export const COILS = {
  OPEN:  0,
  CLOSE: 1,
  RESET: 2,
} as const;

// ============================================================================
// DISCRETE INPUTS (1x) — Read Only
// ============================================================================

export const DISCRETE = {
  IS_CLOSED:  0,
  IS_TRIPPED: 1,
} as const;

// ============================================================================
// INPUT REGISTERS (3x) — Read Only
// ============================================================================

export const INPUT = {
  CURRENT:        0,  // uint16, scale 0.1 (A)
  VOLTAGE:        1,  // uint16, scale 0.1 (V)
  TEMP:           2,  // uint16, scale 0.1 (°C)
  TRIP_COUNT:     3,  // uint16
  OPERATE_COUNT:  4,  // uint16
} as const;

// ============================================================================
// HOLDING REGISTERS (4x) — Read/Write
// ============================================================================

export const HOLDING = {
  TRIP_THRESHOLD: 0,  // uint16, scale 0.1 (A) — default 5000 → 500.0A
  UV_THRESHOLD:   1,  // uint16, scale 0.1 (V)
  OV_THRESHOLD:   2,  // uint16, scale 0.1 (V)
} as const;
