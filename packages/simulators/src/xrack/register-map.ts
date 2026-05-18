export const HOLDING_REGISTERS = {
  // Voltage (FLOAT32 = 2 register) - her rack için 2 register
  VOLTAGE_START: 40001, // 40001-40032 arası (16 rack * 2)

  // Current (FLOAT32 = 2 register)
  CURRENT_START: 40101, // 40101-40132 arası

  // SoC (FLOAT32 = 2 register)
  SOC_START: 40201, // 40201-40232 arası

  // Status (UINT16 = 1 register)
  STATUS_START: 40301, // 40301-40316 arası

  // ChargeStatus (UINT16 = 1 register) - TEK
  CHARGE_STATUS: 40401,

  GLOBAL_POWER_START: 40410,

  // Power (FLOAT32 = 2 register)
  POWER_START: 40501, // 40501-40532 arası
} as const;

export const INPUT_REGISTERS = {
  // Temperature (FLOAT32 = 2 register)
  TEMPERATURE_START: 30001, // 30001-30032 arası

  // SoH (FLOAT32 = 2 register)
  SOH_START: 30051, // 30051-30082 arası
} as const;

export const COILS = {
  RESET: 1,
  EMERGENCY_STOP: 2,
} as const;
