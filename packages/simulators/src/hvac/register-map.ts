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
  SERVER_RH:              0x2003, // uint16, scale 0.1 (%RH) — server nem kontrolü

  // Forced (manual) mode — doküman §7.3
  FORCED_ENABLE:          0x2100, // uint16 — 0 off / 1 on (önce etkinleştir)
  FORCED_COOLING:         0x2101, // uint16 — 0 off / 1 on
  FORCED_AIR_SUPPLY:      0x2102, // uint16 — 0 off / 1 on
  FORCED_STANDBY:         0x2103, // uint16 — 0 off / 1 on
  FORCED_HEATING:         0x2104, // uint16 — 0 off / 1 on
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
  COMPRESSOR_ACTION_H:    0x1028, // uint32 — high word, kompresör çalıştırma sayısı
  COMPRESSOR_ACTION_L:    0x1029, // uint32 — low word
} as const;

// ============================================================================
// ALARM INPUT REGISTERS (3x) — 1 = alarm active
// ============================================================================

export const ALARMS = {
  HIGH_TEMP:              0x300, // High temperature alarm
  INTERNAL_FAN_FAIL:      0x301, // Internal fan failure
  EXTERNAL_FAN_FAIL:      0x302, // External fan failure
  COMPRESSOR_FAULT:       0x303, // Compressor fault
  CABINET_RETURN_TEMP_FAIL: 0x304, // Cabinet return air temp probe failure
  SYSTEM_HIGH_PRESSURE:   0x305, // System high pressure alarm
  LOW_TEMP:               0x306, // Low temperature alarm
  AC_OVERVOLTAGE:         0x309, // AC overvoltage alarm
  AC_UNDERVOLTAGE:        0x30A, // AC undervoltage alarm
  AC_POWER_FAILURE:       0x30B, // AC power failure alarm
  EVAPORATOR_TEMP_FAIL:   0x30C, // Evaporator temp sensor failure
  CONDENSER_TEMP_FAIL:    0x30D, // Condenser temp sensor failure
  AMBIENT_TEMP_FAIL:      0x30E, // Ambient temp sensor failure
  EVAPORATOR_FREEZE:      0x30F, // Evaporator freeze alarm
  FREQUENT_HIGH_PRESSURE: 0x310, // Frequent high pressure alarm
  SYSTEM_LOW_PRESSURE:    0x312, // System low pressure alarm
  FREQUENT_LOW_PRESSURE:  0x313, // Frequent low pressure alarm
  EXT_EXP_1_FAIL:         0x316, // External expansion 1 T/H failure (not involving)
  EXT_EXP_2_FAIL:         0x317, // External expansion 2 T/H failure (not involving)
  HIGH_HUMIDITY:          0x31C, // High humidity alarm
  HUMIDITY_SENSOR_FAIL:   0x31E, // Humidity sensor failure
  EXHAUST_OVER_TEMP:      0x325, // Exhaust over-temperature alarm
  EXHAUST_TEMP_FAIL:      0x326, // Exhaust temp sensor fault
  EXHAUST_OVER_TEMP_LOCK: 0x327, // Exhaust over-temperature lockout
} as const;

/** Eski isim uyumluluğu — dinamik testler HIGH_TEMP/LOW_TEMP/OVER_VOLTAGE/UNDER_VOLTAGE kullanır. */
export const OVER_VOLTAGE = ALARMS.AC_OVERVOLTAGE;
export const UNDER_VOLTAGE = ALARMS.AC_UNDERVOLTAGE;
export const OVER_VOLTAGE_2 = ALARMS.AC_POWER_FAILURE;
export const UNDER_VOLTAGE_2 = ALARMS.EVAPORATOR_TEMP_FAIL;
export const FAN_FAULT = ALARMS.INTERNAL_FAN_FAIL;
export const HEATER_FAULT = ALARMS.EVAPORATOR_FREEZE;
export const SENSOR_FAULT = ALARMS.CABINET_RETURN_TEMP_FAIL;
export const HIGH_PRESSURE = ALARMS.SYSTEM_HIGH_PRESSURE;
export const LOW_PRESSURE = ALARMS.SYSTEM_LOW_PRESSURE;
export const CONDENSER_FAULT = ALARMS.EXT_EXP_1_FAIL;
export const EVAPORATOR_FAULT = ALARMS.EXT_EXP_2_FAIL;
