// BSC Register Map — LG Energy Solution BSC Modbus Interface
// Source: MAP_PLANNING_MC_090626_V1.xlsx
// Organization matches the Excel sheet categories for easy verification.

// ============================================================================
// INPUT REGISTERS (3x) — Read Only
// ============================================================================

// --- NAMEPLATE (30000–30031) ---
export const NAMEPLATE = {
  SW_VERSION:             30000, // uint32 (30000–30001) — BSC S/W Version (BCD)
  TOTAL_RACK_NO:          30005, // uint16 — Number of total racks
  REQUEST_ACKNOWLEDGE:    30030, // uint16 (enum) — Command response status
  LAST_ACCEPTED_REQ:      30031, // uint16 — Last accepted command
} as const;

// --- ESSENTIAL (30035–30038) ---
export const ESSENTIAL = {
  HEARTBEAT:              30035, // uint16 — BSC Heartbeat (0–65535, +1/sec)
  BSC_STATE:              30036, // uint16 (enum) — BSC operating state
  BSC_INFO:               30037, // bit16  — BSC alarms/warnings/faults + charge status
  ONLINE_RACK_NO:         30038, // uint16 — Number of online racks
} as const;

// --- DIAGNOSTICS — CONTROLLER LOC + BITFIELD BLOCK (30043–30050) ---
export const DIAGNOSTICS = {
  CONTROLLER_LOC:         30043, // bit16 — S-C communication loss of connection
  BITFIELD_2:             30044, // bit16 — Over Charge/Discharge Power
  BITFIELD_3:             30045, // bit16 — SLF, MFRD, Over Offline Rack
  BITFIELD_4:             30046, // bit16 — Reserved
  BITFIELD_5:             30047, // bit16 — Reserved
  BITFIELD_6:             30048, // bit16 — RBMS SW Version Mismatch
  BITFIELD_7:             30049, // bit16 — Reserved
  BITFIELD_8:             30050, // bit16 — Reserved
} as const;

// --- SYSTEM SUMMARY (30055–30066) ---
export const SYSTEM_SUMMARY = {
  BSC_SOC:                30055, // uint16, scale 0.01 (%) — System SOC among online racks
  BSC_SOH:                30056, // uint16, scale 0.01 (%) — Average SOH
  DC_VOLTAGE_ANTICIPATED: 30057, // uint32 (30057–30058), scale 0.0001 (V) — when no online rack
  DC_VOLTAGE:             30059, // uint32 (30059–30060), scale 0.0001 (V) — Average voltage
  DC_CURRENT:             30061, // sint32 (30061–30062), scale 0.001 (A) — Total DC current
  CHARGE_POWER_LIMIT:     30063, // uint32 (30063–30064), scale 0.001 (kW)
  DISCHARGE_POWER_LIMIT:  30065, // uint32 (30065–30066), scale 0.001 (kW)
} as const;

// --- SUMMARY — SOC/SOH/TEMP/CELL (30100–30157) ---
export const SUMMARY_STATS = {
  MAX_SOC:                30100, // uint16, scale 0.01
  AVG_SOC:                30101, // uint16, scale 0.01
  MIN_SOC:                30102, // uint16, scale 0.01
  RACK_MAX_SOC:           30103, // uint16 — Rack ID of max SOC
  RACK_MIN_SOC:           30105, // uint16 — Rack ID of min SOC
  RECALIBRATION_NO:       30107, // uint16 — Number of recalibration racks
  MAX_SOH:                30109, // uint16, scale 0.01
  AVG_SOH:                30110, // uint16, scale 0.01
  MIN_SOH:                30111, // uint16, scale 0.01
  RACK_MAX_SOH:           30112, // uint16 — Rack ID of max SOH
  RACK_MIN_SOH:           30114, // uint16 — Rack ID of min SOH
  MAX_CELL_SUM_VOLTAGE:   30118, // uint32 (30118–30119), scale 0.0001 (V)
  AVG_CELL_SUM_VOLTAGE:   30120, // uint32 (30120–30121), scale 0.0001 (V)
  MIN_CELL_SUM_VOLTAGE:   30122, // uint32 (30122–30123), scale 0.0001 (V)
  RACK_MAX_VOLTAGE:       30124, // uint16 — Rack ID of max cell sum voltage
  RACK_MIN_VOLTAGE:       30125, // uint16 — Rack ID of min cell sum voltage
  MAX_CURRENT:            30128, // sint32 (30128–30129), scale 0.001 (A)
  AVG_CURRENT:            30130, // sint32 (30130–30131), scale 0.001 (A)
  MIN_CURRENT:            30132, // sint32 (30132–30133), scale 0.001 (A)
  RACK_MAX_CURRENT:       30134, // uint16 — Rack ID of max current
  RACK_MIN_CURRENT:       30135, // uint16 — Rack ID of min current
  MAX_CELL_VOLTAGE:       30138, // uint16, scale 0.001 (V)
  AVG_CELL_VOLTAGE:       30139, // uint16, scale 0.001 (V)
  MIN_CELL_VOLTAGE:       30140, // uint16, scale 0.001 (V)
  RACK_MAX_CELL_V:        30141, // uint16 — Rack ID of max cell voltage
  PACK_MAX_CELL_V:        30142, // uint16 — Pack ID of max cell voltage
  CELL_MAX_CELL_V:        30143, // uint16 — Cell ID of max cell voltage
  RACK_MIN_CELL_V:        30144, // uint16 — Rack ID of min cell voltage
  PACK_MIN_CELL_V:        30145, // uint16 — Pack ID of min cell voltage
  CELL_MIN_CELL_V:        30146, // uint16 — Cell ID of min cell voltage
  MAX_PACK_TEMP:          30149, // sint16, scale 0.1 (°C)
  AVG_PACK_TEMP:          30150, // sint16, scale 0.1 (°C)
  MIN_PACK_TEMP:          30151, // sint16, scale 0.1 (°C)
  RACK_MAX_TEMP:          30152, // uint16 — Rack ID of max pack temperature
  PACK_MAX_TEMP:          30153, // uint16 — Pack ID of max pack temperature
  SENSOR_MAX_TEMP:        30154, // uint16 — Sensor ID of max pack temperature
  RACK_MIN_TEMP:          30155, // uint16 — Rack ID of min pack temperature
  PACK_MIN_TEMP:          30156, // uint16 — Pack ID of min pack temperature
  SENSOR_MIN_TEMP:        30157, // uint16 — Sensor ID of min pack temperature
} as const;

// ============================================================================
// PER-RACK BASE ADDRESS & STRIDE
// ============================================================================

/** Starting address of first rack's nameplate block */
export const RACK_NAMEPLATE_BASE = 30170;

/** Per-rack register block size — prevents overlap between racks */
export const RACK_STRIDE = 200;

/**
 * Per-rack register offsets within {RACK_NAMEPLATE_BASE + (rackId-1) * RACK_STRIDE}.
 * Nameplate occupies offsets 0–32, Summary occupies offsets 50–100.
 */

// --- Nameplate (offsets 0–32 within rack block) ---
export const RACK_NAMEPLATE = {
  RBMS_SW_VERSION:         0,  // uint32 (0–1) — BCD
  UPDATER_VERSION:         2,  // uint32 (2–3) — BCD
  BOOT_SELECTOR_VERSION:   4,  // uint32 (4–5) — BCD
  RBMS_SW_CHECKSUM:        6,  // uint32 (6–7)
  BMS_SW_NAME:             8,  // uint128 (8–15) — "G3X_RBMS"
  BMS_SERIAL_NUMBER:      16,  // uint32 (16–17)
  BMS_HW_VERSION:         18,  // uint32 (18–19) — BCD
  CURRENT_SENSOR_TYPE:    20,  // uint16
  RELAY_CLOSE_CURRENT:    22,  // uint16, scale 1 (A)
  PACK_COUNT:             23,  // uint16
  BMIC_COUNT:             24,  // uint16
  TEMP_SENSOR_COUNT:      25,  // uint16
  PCB_TEMP_SENSOR_COUNT:  27,  // uint16
  PACK_VOLTAGE_SENSOR_COUNT: 28, // uint16
  VOLTAGE_SENSOR_COUNT:   29,  // uint16
  PACK_TYPE:              32,  // uint16
} as const;

// --- Summary (offsets 50+ within rack block) ---
// Summary base within each rack block: RACK_NAMEPLATE_BASE + 50 = 30220
export const RACK_SUMMARY_BASE_OFFSET = 50;

export const RACK_SUMMARY = {
  STATE:                    0,  // uint16 (enum) — 0x09=Normal
  STATUS_FLAGS:             1,  // bit16  — charge/discharge/balancing/fault/warning
  COMPONENT_STATUS:         2,  // bit16  — fans/contactors/PC
  COMPONENT_FEEDBACK:       3,  // bit16  — feedback status
  HEARTBEAT:                4,  // uint16
  LIVE_UNIT_COUNT:          5,  // uint16
  BALANCING_TIME:           6,  // uint32 (6–7), scale 1 (s)
  SOC:                      8,  // uint16, scale 0.01 (%)
  SOH:                      9,  // uint16, scale 0.01 (%)
  CHARGE_POWER_LIMIT:      10,  // uint32 (10–11), scale 0.001 (kW)
  DISCHARGE_POWER_LIMIT:   12,  // uint32 (12–13), scale 0.001 (kW)
  CELL_SUM_VOLTAGE:        14,  // uint32 (14–15), scale 0.0001 (V)
  CURRENT:                 16,  // int32  (16–17), scale 0.001 (A)
  DIAG_RACK_VOLTAGE:       18,  // bit16 — PDVF/RDVF/Under Voltage/Over Voltage
  DIAG_OVER_CHARGE_CURRENT:19,  // bit16 — Over Charge Current / Sudden Voltage Drop
  DIAG_TEMPERATURE:        20,  // bit16 — Under/Over Temperature
  DIAG_OVER_CHARGE_POWER:  21,  // bit16 — Over Charge Power / Deviation Temperature
  DIAG_SOC_SOH:            22,  // bit16 — Under SOH, Under/Over SOC, Over Discharge Power
  DIAG_COMMS:              23,  // bit16 — Rack-BSC LOC, Rack-Pack LOC, Frequent Balancing, Cycle
  DIAG_RESERVED_24:        24,  // uint16 — Reserved
  DIAG_RESERVED_25:        25,  // uint16 — Reserved
  DIAG_SENSOR_CONTACTOR:   26,  // bit16 — Contactor Feedback, Temp Sensor, Current Sensor Error
  DIAG_CONTACTOR_OPEN:     27,  // bit16 — Contactor Open Failure, PBMS Fault, Pack Fan Error
  DIAG_POWER_1:            28,  // bit16 — 3.3V / 1.25V / CT 13.3V / CT 5V
  DIAG_POWER_2:            29,  // bit16 — SMPS 24V / Vpre 6.5V / Vcca 5V
  DIAG_POWER_3:            30,  // bit16 — SBC 5V / MC2 24V / MC1 24V
  DIAG_MC_OVER_COUNT:      31,  // bit16 — MC Open Over Count / SBC Fail Safe
  DIAG_MISC:               32,  // bit16 — RBMS Updater Version Mismatch
  DIAG_RESERVED_33:        33,  // uint16 — Reserved
  MAX_CELL_VOLTAGE:        34,  // uint16, scale 0.0001 (V)
  MIN_CELL_VOLTAGE:        35,  // uint16, scale 0.0001 (V)
  AVG_CELL_VOLTAGE:        36,  // uint16, scale 0.0001 (V)
  MAX_CELL_LOCATION:       37,  // uint16 — hi=Pack, lo=Cell
  MIN_CELL_LOCATION:       38,  // uint16 — hi=Pack, lo=Cell
  MAX_PACK_TEMPERATURE:    39,  // sint16, scale 0.1 (°C)
  MIN_PACK_TEMPERATURE:    40,  // sint16, scale 0.1 (°C)
  AVG_PACK_TEMPERATURE:    41,  // sint16, scale 0.1 (°C)
  MAX_TEMP_LOCATION:       42,  // uint16 — hi=Pack, lo=Sensor
  MIN_TEMP_LOCATION:       43,  // uint16 — hi=Pack, lo=Sensor
  MAX_DIFF_TEMP_RACK:      44,  // uint16, scale 0.1 (°C)
  MAX_DIFF_TEMP_PACK:      45,  // uint16, scale 0.1 (°C)
  MC_OPEN_COUNT:           50,  // uint16
  CALIBRATION_INFO:        51,  // uint16 — recalibration count + request flag
  NON_BALANCING_PERIOD:    53,  // uint16 — days
} as const;

// --- BSC-level Rack Diagnostics (30000–30019, shared across all racks) ---
export const BSC_RACK_DIAG = {
  BASE:                   30300, // bit16 — Rack Connection Fault, Current Imbalanced, Rack-BSC LOC
  RESERVED_1:             30301, // uint16 — Reserved
} as const;

// ============================================================================
// DISCRETE INPUTS (1x) — Rack Status Flags
// ============================================================================

// Rack flags are Coils, not Discrete Inputs in the real BSC
// These are address offsets from rack 1 — the actual addresses depend on total rack count N:
//   Rack#n Disabled:  n
//   Rack#n Online:    N + n
//   Rack#n Alarm:     2N + n
//   Rack#n Warning:   3N + n
//   Rack#n Fault:     4N + n
//   Rack#n Non-Balancing: 5N + n

export const RACK_FLAGS = {
  DISABLED_OFFSET:         0,
  ONLINE_OFFSET:           0, // + N (rack count), computed at runtime
  ALARM_OFFSET:            0, // + 2N
  WARNING_OFFSET:          0, // + 3N
  FAULT_OFFSET:            0, // + 4N
  NON_BALANCING_OFFSET:    0, // + 5N
} as const;

// ============================================================================
// HOLDING REGISTERS (4x) — Read/Write (Controller → BSC)
// ============================================================================

export const CONTROLLER = {
  HEARTBEAT:              40000, // uint16 — Controller heartbeat (0–255, +1/sec)
  COMMAND_REQUEST:        40010, // uint16 (enum) — Control command
  // Selected racks for manual-mode close contactors (40011–40017)
  MANUAL_RACKS_1_16:      40011, // bit16
  MANUAL_RACKS_17_32:     40012, // bit16
  MANUAL_RACKS_33_48:     40013, // bit16
  MANUAL_RACKS_49_64:     40014, // bit16
  MANUAL_RACKS_65_80:     40015, // bit16
  MANUAL_RACKS_81_96:     40016, // bit16
  MANUAL_RACKS_97_99:     40017, // bit16
  // Disabled rack flags for Start command (40020–40028)
  DISABLED_RACKS_1_16:    40020, // bit16
  DISABLED_RACKS_17_32:   40021, // bit16
  DISABLED_RACKS_33_48:   40022, // bit16
  DISABLED_RACKS_49_64:   40023, // bit16
  DISABLED_RACKS_65_80:   40024, // bit16
  DISABLED_RACKS_81_96:   40025, // bit16
  DISABLED_RACKS_97_99:   40026, // bit16
  DISABLED_RESERVED_1:    40027, // uint16 — Reserved
  DISABLED_RESERVED_2:    40028, // uint16 — Reserved
} as const;

// ============================================================================
// ENUM VALUE MAPS
// ============================================================================

/** BSC State (ESSENTIAL.BSC_STATE — address 30036) */
export const BSC_STATE = {
  NONE:             0x0000,
  NOT_INITIALIZED:  0x0001,
  INITIALIZING:     0x0002,
  NORMAL:           0x0003,
  NPS:              0x0004, // Normal Power Saving
  MANUAL:           0x0005,
  EMERGENCY:        0x0006,
} as const;

/** Command Request values (CONTROLLER.COMMAND_REQUEST — address 40010) */
export const COMMAND = {
  NONE:                    0x0000,
  EMERGENCY:               0x0001,
  START:                   0x0002,
  STOP:                    0x0003,
  OPEN_ALL_CONTACTORS:     0x0004,
  CLOSE_CONTACTORS:        0x0005,
  ENTER_MANUAL:            0x0006,
  EXIT_MANUAL:             0x0007,
  EVENT_CLEAR:             0x0009,
  RESET:                   0x000A,
} as const;

/** Request Acknowledge values (NAMEPLATE.REQUEST_ACKNOWLEDGE — address 30030) */
export const ACKNOWLEDGE = {
  NONE:                     0x0000,
  IN_PROGRESS:              0x0001,
  DONE:                     0x0002,
  BMS_NOT_CONNECTED:        0x0005,
  BMS_ALREADY_CONNECTED:    0x0006,
  UNDER_INITIALIZING:       0x0007,
  CONTACTORS_ALREADY_OPEN:  0x0008,
  BSC_ALREADY_ONLINE:       0x0009,
  CURRENT_FLOWS:            0x000A,
  BSC_MANUAL_MODE:          0x000B,
  BSC_EMERGENCY_MODE:       0x000C,
  BSC_NPS_MODE:             0x000D,
  BSC_NORMAL_MODE:          0x000E,
  BSC_WARNING_FAULT:        0x000F,
  UNDER_CONTACTOR_CONTROL:   0x0010,
  OVER_VOLTAGE_DEVIATION:   0x0011,
  WITHIN_COOLDOWN:          0x0012,
  TARGET_RACK_NOT_EXIST:    0x0013,
  INVALID_REQUEST:          0x0030,
  INVALID_ARGUMENT:         0x0031,
} as const;

/** BSC Info bit positions (ESSENTIAL.BSC_INFO — address 30037, 16-bit) */
export const BSC_INFO_BITS = {
  ALARM:                0,   // b0
  WARNING:              1,   // b1
  FAULT:                2,   // b2
  CHARGE_STATUS:        4,   // b4–b5: 00=None, 01=Charge, 10=Discharge, 11=Idle
  PRE_VPC:              10,  // b10: Pre Voltage-based Power Control
  VPC:                  11,  // b11: Voltage-based Power Control
  SPC:                  12,  // b12: SOC-based Power Control
  TPC:                  13,  // b13: Temperature-based Power Control
} as const;

/** Rack State enum (RACK_SUMMARY.STATE — per-rack offset 0) */
export const RACK_STATE = {
  INITIALIZATION:      0x00,
  ID_SET:              0x01,
  ID_SET_COMPLETE:     0x02,
  BMIC_INIT:           0x03,
  PACK_SOH_READ_FAIL:  0x04,
  BMIC_WAKE_FAIL:      0x05,
  NO_CONFIGURATION:    0x07,
  INITIAL_DIAG:        0x08,
  NORMAL:              0x09,
  NPS:                 0x0A, // Normal Power Saving
  PPS:                 0x0B, // Protective Power Saving
  MANUAL:              0x0C,
  EMERGENCY:           0x0D,
} as const;

/** Rack Status Flags bit positions (RACK_SUMMARY.STATUS_FLAGS — per-rack offset 1) */
export const RACK_STATUS_BITS = {
  CELL_BALANCING:      0,   // b0
  WARNING:             1,   // b1
  FAULT:               2,   // b2
  CHARGE_DISCHARGE:    3,   // b3–b4: 00=Idle, 01=Discharge, 10=Charge
  CER:                 5,   // b5–b6: 00=Normal, 10=MDVF, 11=RDVF
  DC_LINE:             7,   // b7: 0=Opened, 1=Closed
  BATTERY_READY:       8,   // b8: 0=Not Ready, 1=Ready
  CHARGE_PWR_CONTROL:  9,   // b9: 0=Not in de-rating, 1=In de-rating
  CURRENT_SENSOR_TYPE: 10,  // b10: 0=Hall, 1=Network
} as const;
