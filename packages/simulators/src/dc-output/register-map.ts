// DC Output Register Map — DC Power Supply Modbus Interface

// ============================================================================
// COILS (0x) — Read/Write
// ============================================================================

export const COILS = {
  ON:  0,
  OFF: 1,
} as const;

// ============================================================================
// DISCRETE INPUTS (1x) — Read Only
// ============================================================================

export const DISCRETE = {
  IS_ON: 0,
  FAULT: 1,
} as const;

// ============================================================================
// INPUT REGISTERS (3x) — Read Only
// ============================================================================

export const INPUT = {
  ACTUAL_VOLTAGE:    0,  // uint16, scale 0.1 (V)
  ACTUAL_CURRENT:    1,  // uint16, scale 0.1 (A)
  ACTUAL_POWER:      2,  // uint16, scale 1 (W)
  TEMP:              3,  // uint16, scale 0.1 (°C)
  ENERGY_COUNTER_H:  4,  // uint32 high word, scale 0.01 (kWh)
  ENERGY_COUNTER_L:  5,  // uint32 low word
} as const;

// ============================================================================
// HOLDING REGISTERS (4x) — Read/Write
// ============================================================================

export const HOLDING = {
  VOLTAGE_SETPOINT: 0,  // uint16, scale 0.1 (V) — default 480 → 48.0V
  CURRENT_LIMIT:    1,  // uint16, scale 0.1 (A) — default 1000 → 100.0A
  OV_THRESHOLD:     2,  // uint16, scale 0.1 (V)
  OC_THRESHOLD:     3,  // uint16, scale 0.1 (A)
} as const;
