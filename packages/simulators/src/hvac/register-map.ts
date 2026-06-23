// HVAC Register Map — Heating, Ventilation, Air Conditioning Modbus Interface
// MC90HDNC1R-L cooling unit register definitions.

// ============================================================================
// HOLDING REGISTERS (4x) — Read/Write
// ============================================================================

export const HOLDING = {
  SLAVE_ADDRESS:          0x07,   // uint16
  BAUD_RATE:              0x08,   // uint16
  MONITOR_TEMP_MODE:      0x09,   // uint16 — 4=server temp
  COOLING_SETPOINT:       0x0A,   // uint16, scale 0.1 (°C)
  COOLING_HYSTERESIS:     0x0B,   // uint16
  COMPRESSOR_START_DELAY: 0x0C,   // uint16, scale 1 (s)
  RESTART_DELAY:          0x0D,   // uint16, scale 1 (s)
  HIGH_TEMP_ALARM:        0x0E,   // uint16, scale 0.1 (°C)
  HIGH_TEMP_HYSTERESIS:   0x0F,   // uint16
  LOW_TEMP_ALARM:         0x10,   // uint16, scale 0.1 (°C)
  LOW_TEMP_HYSTERESIS:    0x11,   // uint16
  HEATING_SETPOINT:       0x1C,   // uint16, scale 0.1 (°C)
  HEATING_HYSTERESIS:     0x1E,   // uint16

  // Remote control
  REMOTE_ON_OFF:          0x202,  // uint16 — 0=Off, 1=On
  RESET:                  0x200,  // uint16 — Write 0x0001 to reset all alarms

  // Server temperature settings
  SERVER_TEMP_MAX:        0x2000, // uint16, scale 0.1 (°C)
  SERVER_TEMP_MIN:        0x2001, // uint16, scale 0.1 (°C)
  SERVER_TEMP_AVG:        0x2002, // uint16, scale 0.1 (°C)
} as const;

// ============================================================================
// INPUT REGISTERS (3x) — Read Only
// ============================================================================

export const INPUT = {
  EQUIPMENT_STATUS:       0x1000, // uint16 — 1=Standby, 2=Running, 3=Fault
  ELECTRIC_HEATING_ON:    0x1001, // uint16 — 0=Off, 1=On
  INDOOR_FAN_STATUS:      0x1002, // uint16
  SUPPLY_TEMP:            0x1003, // uint16, scale 0.1 (°C)
  OUTDOOR_FAN_STATUS:     0x1004, // uint16
  RETURN_HUMIDITY:        0x1005, // uint16, scale 0.1 (%)
  COMPRESSOR_STATUS:      0x1006, // uint16
  CURRENT_TEMP:           0x1008, // uint16, scale 0.1 (°C) — room/server temp
  OUTSIDE_TEMP:           0x100C, // uint16, scale 0.1 (°C)
  CONDENSER_TEMP:         0x100E, // uint16, scale 0.1 (°C)
  EVAPORATOR_TEMP:        0x1010, // uint16, scale 0.1 (°C)
  INTERNAL_FAN_SPEED:     0x1012, // uint16, scale 1 (rpm)
  EXTERNAL_FAN_SPEED:     0x1014, // uint16, scale 1 (rpm)
  AC_INPUT_VOLTAGE:       0x1016, // uint16, scale 0.1 (V)

  // Runtime counters (uint32 split across 2 registers, big-endian)
  EQUIPMENT_RUNTIME_H:    0x101C, // uint32 — high word
  EQUIPMENT_RUNTIME_L:    0x101D, // uint32 — low word, scale 1 (hours)
  COMPRESSOR_RUNTIME_H:   0x1020, // uint32 — high word
  COMPRESSOR_RUNTIME_L:   0x1021, // uint32 — low word, scale 1 (hours)
  INTERNAL_FAN_RUNTIME_H: 0x1024, // uint32 — high word
  INTERNAL_FAN_RUNTIME_L: 0x1025, // uint32 — low word, scale 1 (hours)
} as const;

// ============================================================================
// ALARM INPUT REGISTERS (3x) — 1 = alarm active
// ============================================================================

export const ALARMS = {
  HIGH_TEMP:              0x300,
  HIGH_TEMP_2:            0x301,
  HIGH_TEMP_3:            0x302,
  HIGH_TEMP_4:            0x303,
  HIGH_TEMP_5:            0x304,
  HIGH_TEMP_6:            0x305,
  LOW_TEMP:               0x306,
  LOW_TEMP_2:             0x307,
  LOW_TEMP_3:             0x308,
  OVER_VOLTAGE:           0x309,
  UNDER_VOLTAGE:          0x30A,
  OVER_VOLTAGE_2:         0x30B,
  UNDER_VOLTAGE_2:        0x30C,
  COMPRESSOR_FAULT:       0x30D,
  FAN_FAULT:              0x30E,
  HEATER_FAULT:           0x30F,
  SENSOR_FAULT:           0x310,
  // 0x311 — gap
  HIGH_PRESSURE:          0x312,
  LOW_PRESSURE:           0x313,
  // 0x314–0x315 — gap
  CONDENSER_FAULT:        0x316,
  EVAPORATOR_FAULT:       0x317,
} as const;
