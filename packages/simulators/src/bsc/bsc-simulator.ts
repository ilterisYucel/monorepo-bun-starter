// BSC Simulator — Full register-accurate simulation of LG Energy Solution BSC
import {
  NAMEPLATE,
  ESSENTIAL,
  DIAGNOSTICS,
  SYSTEM_SUMMARY,
  SUMMARY_STATS,
  RACK_NAMEPLATE_BASE,
  RACK_STRIDE,
  RACK_SUMMARY_BASE_OFFSET,
  RACK_NAMEPLATE as RN,
  RACK_SUMMARY  as RS,
  BSC_RACK_DIAG,
  RACK_FLAGS,
  CONTROLLER,
  BSC_STATE,
  COMMAND,
  ACKNOWLEDGE,
  BSC_INFO_BITS,
  RACK_STATE,
} from "./register-map";
import {
  capacityToSocVoltage,
  socToCapacity,
  MAX_SOC_PERCENT,
  MIN_SOC_PERCENT,
} from "./bsc-math";

// ─── types ──────────────────────────────────────────────────────────────────

type RegisterTable = "IR" | "HR" | "DI";

interface RegisterDef {
  address: number;
  type: "uint16" | "uint32" | "int16" | "sint32" | "float32" | "uint128" | "bit16" | "enum";
  name: string;
  dataTag: string;
  unit: string;
  scale: number;
  offset: number;
  registerType: "IR" | "HR" | "DI";
  bitFields?: { bitStart: number; bitEnd: number; name: string }[];
}

interface RackState {
  id: number;
  storedCapacityKwh: number;
  status: boolean;
  disabled: boolean;
}

export interface BSCSimulatorConfig {
  rackCount: number;
  registers: RegisterDef[];
  initialSocPercent?: number;
}

const SECONDS_PER_HOUR = 3600;

// ─── helpers ────────────────────────────────────────────────────────────────

function registerSize(type: string): number {
  switch (type) {
    case "uint16": case "int16": case "bit16": case "enum": return 1;
    case "uint32": case "sint32": case "float32": return 2;
    case "uint128": return 8;
    default: return 1;
  }
}

/** Split 32-bit unsigned value into 2 big-endian 16-bit registers */
function writeUint32(map: Map<number, number>, addr: number, value: number): void {
  map.set(addr,     (value >>> 16) & 0xFFFF);
  map.set(addr + 1, value & 0xFFFF);
}

/** Split 32-bit signed value into 2 big-endian 16-bit registers (two's complement) */
function writeSint32(map: Map<number, number>, addr: number, value: number): void {
  if (value < 0) {
    const unsigned = (value + 0x100000000) >>> 0;
    map.set(addr,     (unsigned >>> 16) & 0xFFFF);
    map.set(addr + 1, unsigned & 0xFFFF);
  } else {
    map.set(addr,     (value >>> 16) & 0xFFFF);
    map.set(addr + 1, value & 0xFFFF);
  }
}

function setBit(value: number, bit: number, on: boolean): number {
  if (on) return value | (1 << bit);
  return value & ~(1 << bit);
}

// ─── simulator ──────────────────────────────────────────────────────────────

export class BSCSimulator {
  private rackCount: number;
  private config: BSCSimulatorConfig;
  private registers: RegisterDef[];
  private holdingRegisters: Map<number, number> = new Map();
  private inputRegisters: Map<number, number> = new Map();
  private discreteInputs: Map<number, boolean> = new Map();
  private rackStates: Map<number, RackState> = new Map();

  // Runtime state
  private tickCount = 0;
  private bscState: number = BSC_STATE.NOT_INITIALIZED;
  private commandPending: number = COMMAND.NONE;
  private acknowledge: number = ACKNOWLEDGE.NONE;
  private lastControllerHeartbeat = 0;
  private controllerHeartbeatValue = 0;

  constructor(config: BSCSimulatorConfig) {
    this.config = config;
    this.rackCount = config.rackCount;
    this.registers = config.registers;
    this.initRegisters();
    this.initRackStates(config.initialSocPercent ?? 50);
  }

  // ── register init ───────────────────────────────────────────────────────

  private initRegisters(): void {
    for (const r of this.registers) {
      const map = r.registerType === "HR" ? this.holdingRegisters : this.inputRegisters;
      const size = registerSize(r.type);
      for (let i = 0; i < size; i++) {
        map.set(r.address + i, 0);
      }
    }

    // Initialize system registers with defaults
    writeUint32(this.inputRegisters, NAMEPLATE.SW_VERSION, 0x01000001);
    this.inputRegisters.set(NAMEPLATE.TOTAL_RACK_NO, this.rackCount);
    this.inputRegisters.set(NAMEPLATE.REQUEST_ACKNOWLEDGE, ACKNOWLEDGE.NONE);
    this.inputRegisters.set(NAMEPLATE.LAST_ACCEPTED_REQ, 0);

    this.inputRegisters.set(ESSENTIAL.HEARTBEAT, 0);
    this.inputRegisters.set(ESSENTIAL.BSC_STATE, BSC_STATE.NOT_INITIALIZED);
    this.inputRegisters.set(ESSENTIAL.BSC_INFO, 0);
    this.inputRegisters.set(ESSENTIAL.ONLINE_RACK_NO, 0);

    this.inputRegisters.set(DIAGNOSTICS.CONTROLLER_LOC, 0);
    for (const addr of Object.values(DIAGNOSTICS).slice(1)) {
      this.inputRegisters.set(addr, 0);
    }

    // System summary defaults
    this.inputRegisters.set(SYSTEM_SUMMARY.BSC_SOC, 0);
    this.inputRegisters.set(SYSTEM_SUMMARY.BSC_SOH, 99 * 100);
    writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DC_VOLTAGE_ANTICIPATED, 0);
    writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DC_VOLTAGE, 0);
    writeSint32(this.inputRegisters, SYSTEM_SUMMARY.DC_CURRENT, 0);
    writeUint32(this.inputRegisters, SYSTEM_SUMMARY.CHARGE_POWER_LIMIT, 0);
    writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DISCHARGE_POWER_LIMIT, 0);

    // Summary stats defaults
    for (const [k, addr] of Object.entries(SUMMARY_STATS)) {
      if (k.startsWith("MAX_CELL_SUM_VOLTAGE") || k.startsWith("AVG_CELL_SUM_VOLTAGE") || k.startsWith("MIN_CELL_SUM_VOLTAGE") ||
          k.startsWith("MAX_CURRENT") || k.startsWith("AVG_CURRENT") || k.startsWith("MIN_CURRENT")) {
        writeUint32(this.inputRegisters, addr, 0);
      } else {
        this.inputRegisters.set(addr, 0);
      }
    }

    // Per-rack registers
    for (let rackId = 1; rackId <= this.rackCount; rackId++) {
      this.initRackRegisters(rackId);
    }

    // Rack flags (discrete inputs)
    this.initRackFlags();

    // Holding register defaults
    this.holdingRegisters.set(CONTROLLER.HEARTBEAT, 0);
    this.holdingRegisters.set(CONTROLLER.COMMAND_REQUEST, 0);
    this.holdingRegisters.set(CONTROLLER.CHARGE_POWER_SETPOINT, 5000);
    this.holdingRegisters.set(CONTROLLER.DISCHARGE_POWER_SETPOINT, 0);
    for (const reg of Object.values(CONTROLLER)) {
      if (
        reg === CONTROLLER.HEARTBEAT ||
        reg === CONTROLLER.COMMAND_REQUEST ||
        reg === CONTROLLER.CHARGE_POWER_SETPOINT ||
        reg === CONTROLLER.DISCHARGE_POWER_SETPOINT
      ) continue;
      this.holdingRegisters.set(reg, 0);
    }
  }

  private initRackRegisters(rackId: number): void {
    const base = RACK_NAMEPLATE_BASE + (rackId - 1) * RACK_STRIDE;

    // Nameplate defaults
    writeUint32(this.inputRegisters, base + RN.RBMS_SW_VERSION, 0x01053203);
    writeUint32(this.inputRegisters, base + RN.UPDATER_VERSION, 0x12345678);
    writeUint32(this.inputRegisters, base + RN.BOOT_SELECTOR_VERSION, 0x01053203);
    writeUint32(this.inputRegisters, base + RN.RBMS_SW_CHECKSUM, 0x01020304);
    // BMS SW Name — 16 bytes (uint128 → 8 registers)
    this.inputRegisters.set(base + 8,  0x4733); // "G3"
    this.inputRegisters.set(base + 9,  0x585F); // "X_"
    this.inputRegisters.set(base + 10, 0x5242); // "RB"
    this.inputRegisters.set(base + 11, 0x4D53); // "MS"
    for (let i = 12; i <= 15; i++) this.inputRegisters.set(base + i, 0x0000);
    writeUint32(this.inputRegisters, base + RN.BMS_SERIAL_NUMBER, 0x4E25F371);
    writeUint32(this.inputRegisters, base + RN.BMS_HW_VERSION, 0x00010002);
    this.inputRegisters.set(base + RN.CURRENT_SENSOR_TYPE, 1);
    this.inputRegisters.set(base + RN.RELAY_CLOSE_CURRENT, 200);
    this.inputRegisters.set(base + RN.PACK_COUNT, 4);
    this.inputRegisters.set(base + RN.BMIC_COUNT, 2);
    this.inputRegisters.set(base + RN.TEMP_SENSOR_COUNT, 4);
    this.inputRegisters.set(base + RN.PCB_TEMP_SENSOR_COUNT, 2);
    this.inputRegisters.set(base + RN.PACK_VOLTAGE_SENSOR_COUNT, 2);
    this.inputRegisters.set(base + RN.VOLTAGE_SENSOR_COUNT, 14);
    this.inputRegisters.set(base + RN.PACK_TYPE, 0x0503);

    // Summary defaults
    const sBase = base + RACK_SUMMARY_BASE_OFFSET;
    this.inputRegisters.set(sBase + RS.STATE, RACK_STATE.NORMAL);
    this.inputRegisters.set(sBase + RS.STATUS_FLAGS, 0);
    this.inputRegisters.set(sBase + RS.COMPONENT_STATUS, 0);
    this.inputRegisters.set(sBase + RS.COMPONENT_FEEDBACK, 0);
    this.inputRegisters.set(sBase + RS.HEARTBEAT, 0);
    this.inputRegisters.set(sBase + RS.LIVE_UNIT_COUNT, 0);
    writeUint32(this.inputRegisters, sBase + RS.BALANCING_TIME, 0);
    for (let i = RS.SOC; i <= RS.NON_BALANCING_PERIOD; i++) {
      if (!this.inputRegisters.has(sBase + i)) this.inputRegisters.set(sBase + i, 0);
    }
  }

  private initRackFlags(): void {
    const N = this.rackCount;
    for (let i = 0; i < N * 6; i++) {
      this.discreteInputs.set(i + 1, false);
    }
  }

  private initRackStates(initialSoc: number): void {
    for (let i = 1; i <= this.rackCount; i++) {
      this.rackStates.set(i, {
        id: i,
        storedCapacityKwh: socToCapacity(initialSoc),
        status: false,
        disabled: false,
      });
    }
  }

  // ── tick ─────────────────────────────────────────────────────────────────

  tick(elapsedSeconds: number): void {
    this.tickCount++;

    // Auto-initialization after 2 ticks
    if (this.bscState === BSC_STATE.NOT_INITIALIZED && this.tickCount >= 3) {
      this.bscState = BSC_STATE.INITIALIZING;
    }
    if (this.bscState === BSC_STATE.INITIALIZING && this.tickCount >= 6) {
      this.bscState = BSC_STATE.NORMAL;
      for (const [, state] of this.rackStates) {
        state.status = !state.disabled;
      }
    }

    // Detect controller LOC (no heartbeat for 5+ seconds)
    const heartbeatTimeout = this.tickCount - this.lastControllerHeartbeat > 5;
    let locBits = 0;
    if (heartbeatTimeout) {
      locBits = setBit(locBits, 0, true); // Alarm
    }

    this.updateRackStates(elapsedSeconds);
    this.updateSystemRegisters(locBits);
    this.updatePerRackRegisters();
    this.updateRackFlags();
  }

  // ── rack state update ────────────────────────────────────────────────────

  private updateRackStates(elapsedSeconds: number): void {
    const cmd = this.holdingRegisters.get(CONTROLLER.COMMAND_REQUEST) ?? COMMAND.NONE;
    const chargeSetpoint = this.holdingRegisters.get(CONTROLLER.CHARGE_POWER_SETPOINT) ?? 0;
    const dischargeSetpoint = this.holdingRegisters.get(CONTROLLER.DISCHARGE_POWER_SETPOINT) ?? 0;

    let powerKw = 0;
    if (cmd === COMMAND.START) {
      powerKw = chargeSetpoint * 0.01;
    } else if (cmd === COMMAND.DISCHARGE) {
      powerKw = -(dischargeSetpoint * 0.01);
    }

    console.log(`[BSC-Sim] updateRackStates: cmd=${cmd} bscState=${this.bscState} chargeSp=${chargeSetpoint} powerKw=${powerKw}`);

    for (const [, state] of this.rackStates) {
      if (!state.status) continue;

      if (this.bscState === BSC_STATE.NORMAL || this.bscState === BSC_STATE.MANUAL) {
        const deltaEnergy = powerKw * (elapsedSeconds / 60);
        state.storedCapacityKwh += deltaEnergy;
        state.storedCapacityKwh = Math.max(state.storedCapacityKwh, socToCapacity(MIN_SOC_PERCENT));
        state.storedCapacityKwh = Math.min(state.storedCapacityKwh, socToCapacity(MAX_SOC_PERCENT));
        if (state.id === 1) {
          console.log(`[BSC-Sim] Rack1 storedCapacity=${state.storedCapacityKwh.toFixed(2)} kWh SOC=${capacityToSocVoltage(state.storedCapacityKwh).soc.toFixed(3)}% delta=${deltaEnergy.toFixed(4)}kWh`);
        }
      }
    }
  }

  // ── system registers ─────────────────────────────────────────────────────

  private updateSystemRegisters(locBits: number): void {
    this.inputRegisters.set(ESSENTIAL.HEARTBEAT, this.tickCount % 65536);
    this.inputRegisters.set(ESSENTIAL.BSC_STATE, this.bscState);

    // BSC Info bitfield
    let info = 0;

    // b4:b5 — charge status from command
    const cmd = this.holdingRegisters.get(CONTROLLER.COMMAND_REQUEST) ?? COMMAND.NONE;
    let chargeStatusBits: number;
    if (cmd === COMMAND.START) chargeStatusBits = 0b01; // Charge
    else if (cmd === COMMAND.DISCHARGE) chargeStatusBits = 0b10; // Discharge
    else chargeStatusBits = 0b11; // Idle
    // Shift into b4:b5
    info |= chargeStatusBits << BSC_INFO_BITS.CHARGE_STATUS;

    // b10:b13 — power control flags (simulated)
    const avgSoc = this.computeAverageSoc();
    if (avgSoc > 95) info = setBit(info, BSC_INFO_BITS.PRE_VPC, true);
    if (avgSoc > 90) info = setBit(info, BSC_INFO_BITS.VPC, true);
    if (avgSoc > 85) info = setBit(info, BSC_INFO_BITS.SPC, true);

    this.inputRegisters.set(ESSENTIAL.BSC_INFO, info);

    // Online rack count
    const onlineCount = this.onlineCount();
    this.inputRegisters.set(ESSENTIAL.ONLINE_RACK_NO, onlineCount);

    // Controller LOC
    this.inputRegisters.set(DIAGNOSTICS.CONTROLLER_LOC, locBits);

    // System SOC / SOH
    const avgSocPct = Math.round(avgSoc * 100);
    const avgSohPct = Math.round(this.computeAverageSoh() * 100);
    this.inputRegisters.set(SYSTEM_SUMMARY.BSC_SOC, avgSocPct);
    this.inputRegisters.set(SYSTEM_SUMMARY.BSC_SOH, avgSohPct);

    // DC Voltage / Current
    const sysCmd = this.holdingRegisters.get(CONTROLLER.COMMAND_REQUEST) ?? COMMAND.NONE;
    const chargeSetpoint = this.holdingRegisters.get(CONTROLLER.CHARGE_POWER_SETPOINT) ?? 0;
    const dischargeSetpoint = this.holdingRegisters.get(CONTROLLER.DISCHARGE_POWER_SETPOINT) ?? 0;

    let totalVoltage = 0;
    let voltCount = 0;
    for (const [, state] of this.rackStates) {
      if (!state.status) continue;
      const { voltage } = capacityToSocVoltage(state.storedCapacityKwh);
      totalVoltage += voltage;
      voltCount++;
    }
    const avgVoltage = voltCount > 0 ? totalVoltage / voltCount : 1300;
    writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DC_VOLTAGE, Math.round(avgVoltage * 10000));

    let powerKw: number;
    if (sysCmd === COMMAND.START) powerKw = chargeSetpoint * 0.01;
    else if (sysCmd === COMMAND.DISCHARGE) powerKw = -(dischargeSetpoint * 0.01);
    else powerKw = 0;
    const totalCurrent = avgVoltage > 0 ? Math.round((powerKw * 1000 / avgVoltage) / 0.001) : 0;
    writeSint32(this.inputRegisters, SYSTEM_SUMMARY.DC_CURRENT, totalCurrent);

    // Anticipated voltage (same as DC voltage for now)
    if (onlineCount === 0) {
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DC_VOLTAGE_ANTICIPATED, Math.round(avgVoltage * 10000));
    } else {
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DC_VOLTAGE_ANTICIPATED, 0);
    }

    // Power limits — from setpoint registers
    if (sysCmd === COMMAND.START) {
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.CHARGE_POWER_LIMIT, chargeSetpoint * 10);
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DISCHARGE_POWER_LIMIT, 0);
    } else if (sysCmd === COMMAND.DISCHARGE) {
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.CHARGE_POWER_LIMIT, 0);
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DISCHARGE_POWER_LIMIT, dischargeSetpoint * 10);
    } else {
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.CHARGE_POWER_LIMIT, 0);
      writeUint32(this.inputRegisters, SYSTEM_SUMMARY.DISCHARGE_POWER_LIMIT, 0);
    }

    // Summary stats
    this.inputRegisters.set(SUMMARY_STATS.MAX_SOC, avgSocPct);
    this.inputRegisters.set(SUMMARY_STATS.AVG_SOC, avgSocPct);
    this.inputRegisters.set(SUMMARY_STATS.MIN_SOC, avgSocPct);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MAX_SOC, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MIN_SOC, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.RECALIBRATION_NO, 0);
    this.inputRegisters.set(SUMMARY_STATS.MAX_SOH, avgSohPct);
    this.inputRegisters.set(SUMMARY_STATS.AVG_SOH, avgSohPct);
    this.inputRegisters.set(SUMMARY_STATS.MIN_SOH, avgSohPct);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MAX_SOH, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MIN_SOH, onlineCount > 0 ? 1 : 0);

    const voltMilli = Math.round(avgVoltage * 10000);
    writeUint32(this.inputRegisters, SUMMARY_STATS.MAX_CELL_SUM_VOLTAGE, voltMilli);
    writeUint32(this.inputRegisters, SUMMARY_STATS.AVG_CELL_SUM_VOLTAGE, voltMilli);
    writeUint32(this.inputRegisters, SUMMARY_STATS.MIN_CELL_SUM_VOLTAGE, voltMilli);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MAX_VOLTAGE, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MIN_VOLTAGE, onlineCount > 0 ? 1 : 0);

    writeSint32(this.inputRegisters, SUMMARY_STATS.MAX_CURRENT, totalCurrent);
    writeSint32(this.inputRegisters, SUMMARY_STATS.AVG_CURRENT, totalCurrent);
    writeSint32(this.inputRegisters, SUMMARY_STATS.MIN_CURRENT, totalCurrent);

    this.inputRegisters.set(SUMMARY_STATS.MAX_CELL_VOLTAGE, 35288);     // 3.5288V * 10000
    this.inputRegisters.set(SUMMARY_STATS.AVG_CELL_VOLTAGE, 35288);
    this.inputRegisters.set(SUMMARY_STATS.MIN_CELL_VOLTAGE, 35288);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MAX_CELL_V, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.PACK_MAX_CELL_V, 1);
    this.inputRegisters.set(SUMMARY_STATS.CELL_MAX_CELL_V, 1);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MIN_CELL_V, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.PACK_MIN_CELL_V, 1);
    this.inputRegisters.set(SUMMARY_STATS.CELL_MIN_CELL_V, 1);

    this.inputRegisters.set(SUMMARY_STATS.MAX_PACK_TEMP, 230); // 23.0°C * 10
    this.inputRegisters.set(SUMMARY_STATS.AVG_PACK_TEMP, 230);
    this.inputRegisters.set(SUMMARY_STATS.MIN_PACK_TEMP, 230);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MAX_TEMP, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.PACK_MAX_TEMP, 1);
    this.inputRegisters.set(SUMMARY_STATS.SENSOR_MAX_TEMP, 1);
    this.inputRegisters.set(SUMMARY_STATS.RACK_MIN_TEMP, onlineCount > 0 ? 1 : 0);
    this.inputRegisters.set(SUMMARY_STATS.PACK_MIN_TEMP, 1);
    this.inputRegisters.set(SUMMARY_STATS.SENSOR_MIN_TEMP, 1);
  }

  // ── per-rack registers ───────────────────────────────────────────────────

  private updatePerRackRegisters(): void {
    for (let rackId = 1; rackId <= this.rackCount; rackId++) {
      const state = this.rackStates.get(rackId)!;
      const base = RACK_NAMEPLATE_BASE + (rackId - 1) * RACK_STRIDE;
      const sBase = base + RACK_SUMMARY_BASE_OFFSET;

      // Heartbeat (per-rack)
      this.inputRegisters.set(sBase + RS.HEARTBEAT, (this.tickCount * (rackId + 1)) % 65536);

      if (!state.status) {
        // Offline rack — keep state at idle values
        this.inputRegisters.set(sBase + RS.STATE, RACK_STATE.NORMAL);
        this.inputRegisters.set(sBase + RS.STATUS_FLAGS, 0);
        this.inputRegisters.set(sBase + RS.LIVE_UNIT_COUNT, 0);
        continue;
      }

      const { soc, voltage } = capacityToSocVoltage(state.storedCapacityKwh);

      const rackCmd = this.holdingRegisters.get(CONTROLLER.COMMAND_REQUEST) ?? COMMAND.NONE;
      const chargeSp = this.holdingRegisters.get(CONTROLLER.CHARGE_POWER_SETPOINT) ?? 0;
      const dischargeSp = this.holdingRegisters.get(CONTROLLER.DISCHARGE_POWER_SETPOINT) ?? 0;

      let rackPowerKw: number;
      if (rackCmd === COMMAND.START) rackPowerKw = chargeSp * 0.01;
      else if (rackCmd === COMMAND.DISCHARGE) rackPowerKw = -(dischargeSp * 0.01);


      // State
      this.inputRegisters.set(sBase + RS.STATE, RACK_STATE.NORMAL);

      // Status flags
      let status = 0;
      status = setBit(status, 8, true);   // b8: Battery Ready
      status = setBit(status, 7, true);   // b7: DC Line Closed
      // b4:b3 charge/discharge: 00=Idle, 01=Charge, 10=Discharge (aligned with system)
      if (rackPowerKw > 0) {
        status = setBit(status, 3, true);   // b3=1
        status = setBit(status, 4, false);  // b4=0 → 01 = Charge
      } else if (rackPowerKw < 0) {
        status = setBit(status, 3, false);  // b3=0
        status = setBit(status, 4, true);   // b4=1 → 10 = Discharge
      }
      // else 00 = Idle (default)
      this.inputRegisters.set(sBase + RS.STATUS_FLAGS, status);

      // Component status
      let compStatus = 0;
      // b3:b2 MC(+) — Use and Closed = 11
      compStatus |= 0b11 << 2;
      // b5:b4 MC(-) — Use and Closed = 11
      compStatus |= 0b11 << 4;
      // b7:b6 CB — Use and Closed = 11
      compStatus |= 0b11 << 6;
      // b9:b8 Pack Fan1 — Use and Running = 11
      compStatus |= 0b11 << 8;
      // b11:b10 Pack Fan2 — Use and Idle = 10
      compStatus |= 0b10 << 10;
      this.inputRegisters.set(sBase + RS.COMPONENT_STATUS, compStatus);

      // Component feedback (same as status for simulation)
      this.inputRegisters.set(sBase + RS.COMPONENT_FEEDBACK, compStatus);

      // Live unit count
      this.inputRegisters.set(sBase + RS.LIVE_UNIT_COUNT, 200);

      // SOC / SOH
      this.inputRegisters.set(sBase + RS.SOC, Math.round(soc * 100));
      this.inputRegisters.set(sBase + RS.SOH, Math.round(99 * 100));

      // Power limits — total system power on each rack
      if (rackCmd === COMMAND.START) {
        writeUint32(this.inputRegisters, sBase + RS.CHARGE_POWER_LIMIT, chargeSp * 10);
        writeUint32(this.inputRegisters, sBase + RS.DISCHARGE_POWER_LIMIT, 0);
      } else if (rackCmd === COMMAND.DISCHARGE) {
        writeUint32(this.inputRegisters, sBase + RS.CHARGE_POWER_LIMIT, 0);
        writeUint32(this.inputRegisters, sBase + RS.DISCHARGE_POWER_LIMIT, dischargeSp * 10);
      } else {
        writeUint32(this.inputRegisters, sBase + RS.CHARGE_POWER_LIMIT, 0);
        writeUint32(this.inputRegisters, sBase + RS.DISCHARGE_POWER_LIMIT, 0);
      }

      // Cell sum voltage (V * 10000)
      writeUint32(this.inputRegisters, sBase + RS.CELL_SUM_VOLTAGE, Math.round(voltage * 10000));

      // Current — derived from power and voltage
      const rackCurrent = voltage > 0 ? Math.round((rackPowerKw * 1000 / voltage) / 0.001) : 0;
      writeSint32(this.inputRegisters, sBase + RS.CURRENT, rackCurrent);

      // Cell voltages
      this.inputRegisters.set(sBase + RS.MAX_CELL_VOLTAGE, 35288);
      this.inputRegisters.set(sBase + RS.MIN_CELL_VOLTAGE, 35288);
      this.inputRegisters.set(sBase + RS.AVG_CELL_VOLTAGE, 35288);

      // Cell locations
      this.inputRegisters.set(sBase + RS.MAX_CELL_LOCATION, 0x0107); // Pack 1, Cell 7
      this.inputRegisters.set(sBase + RS.MIN_CELL_LOCATION, 0x0102); // Pack 1, Cell 2

      // Temperatures
      this.inputRegisters.set(sBase + RS.MAX_PACK_TEMPERATURE, 230);
      this.inputRegisters.set(sBase + RS.MIN_PACK_TEMPERATURE, 210);
      this.inputRegisters.set(sBase + RS.AVG_PACK_TEMPERATURE, 220);
      this.inputRegisters.set(sBase + RS.MAX_TEMP_LOCATION, 0x0101);
      this.inputRegisters.set(sBase + RS.MIN_TEMP_LOCATION, 0x0101);
      this.inputRegisters.set(sBase + RS.MAX_DIFF_TEMP_RACK, 5);   // 0.5°C
      this.inputRegisters.set(sBase + RS.MAX_DIFF_TEMP_PACK, 3);   // 0.3°C

      // MC open count / calibration
      this.inputRegisters.set(sBase + RS.MC_OPEN_COUNT, 0);
      this.inputRegisters.set(sBase + RS.CALIBRATION_INFO, 0);
      this.inputRegisters.set(sBase + RS.NON_BALANCING_PERIOD, 0);

      // Diagnostics — all healthy (0)
      for (let i = RS.DIAG_RACK_VOLTAGE; i <= RS.DIAG_MISC; i++) {
        this.inputRegisters.set(sBase + i, 0);
      }
      this.inputRegisters.set(sBase + RS.DIAG_RESERVED_33, 0);
    }

    // BSC-level rack diagnostics
    this.inputRegisters.set(BSC_RACK_DIAG.BASE, 0);
  }

  // ── rack flags (discrete inputs) ─────────────────────────────────────────

  private updateRackFlags(): void {
    const N = this.rackCount;
    for (let i = 1; i <= N; i++) {
      const state = this.rackStates.get(i)!;
      // Disabled (offset 0)
      this.discreteInputs.set(i, state.disabled);
      // Online (offset N)
      this.discreteInputs.set(N + i, state.status);
      // Alarm/Warning/Fault — all healthy
      this.discreteInputs.set(2 * N + i, false);
      this.discreteInputs.set(3 * N + i, false);
      this.discreteInputs.set(4 * N + i, false);
      // Non-balancing entry
      this.discreteInputs.set(5 * N + i, false);
    }
  }

  // ── read/write ───────────────────────────────────────────────────────────

  readHoldingRegister(address: number): number {
    return this.holdingRegisters.get(address) ?? 0;
  }

  writeHoldingRegister(address: number, value: number): void {
    console.log(`[BSC-Sim] writeHoldingRegister: addr=${address} value=${value}`);
    this.holdingRegisters.set(address, value);

    // Controller heartbeat
    if (address === CONTROLLER.HEARTBEAT) {
      this.lastControllerHeartbeat = this.tickCount;
      this.controllerHeartbeatValue = value;
    }

    // Command request
    if (address === CONTROLLER.COMMAND_REQUEST) {
      this.handleCommand(value);
    }
  }

  readInputRegister(address: number): number {
    return this.inputRegisters.get(address) ?? 0;
  }

  readCoil(_address: number): boolean {
    return false;
  }

  readDiscreteInput(address: number): boolean {
    return this.discreteInputs.get(address) ?? false;
  }

  writeCoil(_address: number, _value: boolean): void {
    // coils not used in BSC
  }

  // ── command handling ─────────────────────────────────────────────────────

  private handleCommand(cmd: number): void {
    this.commandPending = cmd;

    // For most commands, simulate immediate Done response
    if (cmd === COMMAND.NONE) {
      this.acknowledge = ACKNOWLEDGE.NONE;
      return;
    }

    // Reject commands that can't be accepted in current state
    if (this.bscState === BSC_STATE.NOT_INITIALIZED && cmd !== COMMAND.START) {
      this.acknowledge = ACKNOWLEDGE.UNDER_INITIALIZING;
      return;
    }
    if (this.bscState === BSC_STATE.EMERGENCY && cmd !== COMMAND.RESET && cmd !== COMMAND.EMERGENCY) {
      this.acknowledge = ACKNOWLEDGE.BSC_EMERGENCY_MODE;
      return;
    }

    switch (cmd) {
      case COMMAND.EMERGENCY:
        this.bscState = BSC_STATE.EMERGENCY;
        for (const [, state] of this.rackStates) state.status = false;
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.START:
        this.bscState = BSC_STATE.NORMAL;
        for (const [, state] of this.rackStates) {
          state.status = !state.disabled;
        }
        this.acknowledge = ACKNOWLEDGE.DONE;
        this.updateSystemRegisters(0);
        this.updatePerRackRegisters();
        break;
      case COMMAND.STOP:
        this.acknowledge = ACKNOWLEDGE.DONE;
        this.updateSystemRegisters(0);
        this.updatePerRackRegisters();
        break;
      case COMMAND.OPEN_ALL_CONTACTORS:
        for (const [, state] of this.rackStates) state.status = false;
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.CLOSE_CONTACTORS:
        for (const [, state] of this.rackStates) {
          if (!state.disabled) state.status = true;
        }
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.ENTER_MANUAL:
        this.bscState = BSC_STATE.MANUAL;
        for (const [, state] of this.rackStates) state.status = false;
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.EXIT_MANUAL:
        if (this.bscState === BSC_STATE.MANUAL) {
          this.bscState = BSC_STATE.NORMAL;
          for (const [, state] of this.rackStates) state.status = !state.disabled;
        }
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.EVENT_CLEAR:
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.RESET:
        this.resetSimulator();
        this.acknowledge = ACKNOWLEDGE.DONE;
        break;
      case COMMAND.DISCHARGE:
        this.bscState = BSC_STATE.NORMAL;
        for (const [, state] of this.rackStates) {
          state.status = !state.disabled;
        }
        this.acknowledge = ACKNOWLEDGE.DONE;
        this.updateSystemRegisters(0);
        this.updatePerRackRegisters();
        break;
      default:
        this.acknowledge = ACKNOWLEDGE.INVALID_REQUEST;
        break;
    }

    // Update acknowledge + last accepted request registers
    this.inputRegisters.set(NAMEPLATE.REQUEST_ACKNOWLEDGE, this.acknowledge);
    if (this.acknowledge === ACKNOWLEDGE.IN_PROGRESS || this.acknowledge === ACKNOWLEDGE.DONE) {
      this.inputRegisters.set(NAMEPLATE.LAST_ACCEPTED_REQ, cmd);
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private computeAverageSoc(): number {
    let total = 0;
    let count = 0;
    for (const [, s] of this.rackStates) {
      if (s.status) { total += capacityToSocVoltage(s.storedCapacityKwh).soc; count++; }
    }
    return count > 0 ? total / count : 0;
  }

  private computeAverageSoh(): number {
    return 99; // Always healthy in simulation
  }

  private onlineCount(): number {
    let n = 0;
    for (const [, s] of this.rackStates) { if (s.status) n++; }
    return n;
  }

  private resetSimulator(): void {
    this.initRegisters();
    this.initRackStates(this.config.initialSocPercent ?? 50);
    this.bscState = BSC_STATE.NOT_INITIALIZED;
    this.acknowledge = ACKNOWLEDGE.NONE;
    this.commandPending = COMMAND.NONE;
  }
}
