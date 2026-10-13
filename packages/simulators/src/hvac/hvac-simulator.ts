// HVAC Simulator — Heating, Ventilation, Air Conditioning unit simulation
import { HOLDING, INPUT, ALARMS } from "./register-map";
import { SimulatorServer } from "../server";
import type { SimulatorNetworkConfig } from "../server";
import { HvacSimulatorAdapter } from "./hvac-modbus-adapter";

interface HvacState {
  remoteOn: boolean;
  coolingSetpoint: number;
  heatingSetpoint: number;
  monitorTempMode: number;
  highTempAlarm: number;
  lowTempAlarm: number;
  serverTempMax: number;
  serverTempMin: number;
  serverTempAvg: number;
  serverRH: number;

  currentTemp: number;
  outsideTemp: number;
  condenserTemp: number;
  evaporatorTemp: number;
  returnHumidity: number;
  supplyTemp: number;

  equipmentStatus: number;
  indoorFanStatus: number;
  outdoorFanStatus: number;
  compressorStatus: number;
  electricHeatingOn: number;

  internalFanSpeed: number;
  externalFanSpeed: number;
  acInputVoltage: number;

  equipmentRuntime: number;
  compressorRuntime: number;
  internalFanRuntime: number;

  forcedEnable: number;
  forcedCooling: number;
  forcedAirSupply: number;
  forcedStandby: number;
  forcedHeating: number;

  alarms: Map<number, number>;
}

function defaultState(): HvacState {
  return {
    remoteOn: false,
    coolingSetpoint: 230,
    heatingSetpoint: 150,
    monitorTempMode: 4,
    highTempAlarm: 400,
    lowTempAlarm: 0,
    serverTempMax: 230,
    serverTempMin: 220,
    serverTempAvg: 225,
    serverRH: 500,

    currentTemp: 250,
    outsideTemp: 300,
    condenserTemp: 350,
    evaporatorTemp: 150,
    returnHumidity: 500,
    supplyTemp: 200,

    equipmentStatus: 1,
    indoorFanStatus: 1,
    outdoorFanStatus: 1,
    compressorStatus: 1,
    electricHeatingOn: 0,

    internalFanSpeed: 0,
    externalFanSpeed: 0,
    acInputVoltage: 2300,

    equipmentRuntime: 1000,
    compressorRuntime: 500,
    internalFanRuntime: 800,

    forcedEnable: 0,
    forcedCooling: 0,
    forcedAirSupply: 0,
    forcedStandby: 0,
    forcedHeating: 0,

    alarms: new Map(),
  };
}

export interface HvacSimulatorConfig {
  /** Verilirse self-host Modbus TCP sunucusu açılır (`start()`). */
  readonly network?: SimulatorNetworkConfig;
}

export class HvacSimulator {
  private state: HvacState;
  private readonly network: SimulatorNetworkConfig | undefined;
  private server: SimulatorServer | undefined;
  private injectedCurrentTemp: number | undefined;
  private injectedHumidity: number | undefined;
  private compressorStarts = 0;

  constructor(config: HvacSimulatorConfig = {}) {
    this.state = defaultState();
    this.network = config.network;
  }

  /** Komut — self-host sunucu + tick açar (network yoksa no-op). Idempotent. */
  async start(): Promise<void> {
    if (this.server || this.network === undefined) return;
    this.server = new SimulatorServer({
      adapter: new HvacSimulatorAdapter(this),
      network: this.network,
      tick: (seconds) => this.tick(seconds),
    });
    await this.server.start();
  }

  /** Komut — sunucu + tick'i durdurur (idempotent). */
  async stop(): Promise<void> {
    await this.server?.stop();
    this.server = undefined;
  }

  /** Sorgu — self-host server dinlenen port (start öncesi config portu). */
  port(): number {
    return this.server?.port() ?? this.network?.port ?? 0;
  }

  /**
   * Senaryo enjeksiyonu (dev/debug komut). Sıcaklık/nem değerleri her tick'te
   * sabitlenir (drift ezmez).
   * - `hot`: 32.0 °C (FL-05 overheat)
   * - `cold`: 0.0 °C (FL-05 overcold)
   * - `humid`: 90.0 %RH (nem alarmı)
   * - `nominal`: enjeksiyon kaldırılır (doğal drift)
   * Bilinmeyen senaryo → `false`.
   */
  inject(scenario: string): boolean {
    switch (scenario) {
      case "hot":
        this.injectedCurrentTemp = 320;
        return true;
      case "cold":
        this.injectedCurrentTemp = 0;
        return true;
      case "humid":
        this.injectedHumidity = 900;
        return true;
      case "nominal":
        this.injectedCurrentTemp = undefined;
        this.injectedHumidity = undefined;
        return true;
      default:
        return false;
    }
  }

  tick(elapsedSeconds: number): void {
    const s = this.state;
    const compBefore = s.compressorStatus;

    // Enjeksiyon override'ları (dev/debug) — tick drift'inden önce sabitlenir.
    if (this.injectedCurrentTemp !== undefined) s.currentTemp = this.injectedCurrentTemp;
    if (this.injectedHumidity !== undefined) s.returnHumidity = this.injectedHumidity;

    if (!s.forcedEnable && s.remoteOn && s.equipmentStatus !== 3) {
      s.equipmentStatus = 2;
      s.indoorFanStatus = 2;
      s.outdoorFanStatus = 2;
      s.compressorStatus = 2;

      const isCooling = s.currentTemp > s.coolingSetpoint + 10;
      const isHeating = s.currentTemp < s.heatingSetpoint - 10;

      const speed = 0.5 * elapsedSeconds;
      if (isCooling) {
        s.currentTemp -= speed;
        s.supplyTemp = s.currentTemp - 50;
        s.internalFanSpeed = 1500;
        s.externalFanSpeed = 1200;
        s.compressorStatus = 2;
        s.electricHeatingOn = 0;
      } else if (isHeating) {
        s.currentTemp += speed;
        s.supplyTemp = s.currentTemp + 50;
        s.internalFanSpeed = 800;
        s.externalFanSpeed = 0;
        s.compressorStatus = 1;
        s.electricHeatingOn = 1;
      } else {
        s.internalFanSpeed = 300;
        s.externalFanSpeed = 0;
        s.compressorStatus = 1;
        s.electricHeatingOn = 0;
      }

      s.condenserTemp += (s.outsideTemp - s.condenserTemp) * 0.1 * elapsedSeconds;
      s.evaporatorTemp += (s.currentTemp - s.evaporatorTemp) * 0.1 * elapsedSeconds;

      s.equipmentRuntime += elapsedSeconds / 3600;
      s.internalFanRuntime += elapsedSeconds / 3600;
      if (s.compressorStatus === 2) s.compressorRuntime += elapsedSeconds / 3600;
    } else if (!s.forcedEnable) {
      s.equipmentStatus = 1;
      s.indoorFanStatus = 1;
      s.outdoorFanStatus = 1;
      s.compressorStatus = 1;
      s.electricHeatingOn = 0;
      s.internalFanSpeed = 0;
      s.externalFanSpeed = 0;
      s.supplyTemp += (s.currentTemp - s.supplyTemp) * 0.05 * elapsedSeconds;
    }

    // Alarm checks
    s.alarms.set(ALARMS.HIGH_TEMP, s.currentTemp > s.highTempAlarm ? 1 : 0);
    s.alarms.set(ALARMS.LOW_TEMP, s.currentTemp < s.lowTempAlarm ? 1 : 0);
    s.alarms.set(ALARMS.AC_OVERVOLTAGE, s.acInputVoltage > 2530 ? 1 : 0);
    s.alarms.set(ALARMS.AC_UNDERVOLTAGE, s.acInputVoltage < 1800 ? 1 : 0);
    // Other alarms stay at 0 (healthy)
    for (const addr of Object.values(ALARMS)) {
      if (!s.alarms.has(addr)) s.alarms.set(addr, 0);
    }

    // Kompresör çalıştırma sayacı — duran (≠2) → çalışan (2) geçişinde artar.
    if (s.compressorStatus === 2 && compBefore !== 2) this.compressorStarts++;
  }

  readInputRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case INPUT.EQUIPMENT_STATUS:       return s.equipmentStatus;
      case INPUT.ELECTRIC_HEATING_ON:    return s.electricHeatingOn;
      case INPUT.INDOOR_FAN_STATUS:      return s.indoorFanStatus;
      case INPUT.SUPPLY_TEMP:            return Math.round(s.supplyTemp);
      case INPUT.OUTDOOR_FAN_STATUS:     return s.outdoorFanStatus;
      case INPUT.RETURN_HUMIDITY:        return Math.round(s.returnHumidity);
      case INPUT.COMPRESSOR_STATUS:      return s.compressorStatus;
      case INPUT.CURRENT_TEMP:           return Math.round(s.currentTemp);
      case INPUT.OUTSIDE_TEMP:           return Math.round(s.outsideTemp);
      case INPUT.CONDENSER_TEMP:         return Math.round(s.condenserTemp);
      case INPUT.EVAPORATOR_TEMP:        return Math.round(s.evaporatorTemp);
      case INPUT.INTERNAL_FAN_SPEED:     return s.internalFanSpeed;
      case INPUT.EXTERNAL_FAN_SPEED:     return s.externalFanSpeed;
      case INPUT.AC_INPUT_VOLTAGE:       return Math.round(s.acInputVoltage);
      case INPUT.EQUIPMENT_RUNTIME_H:    return (Math.floor(s.equipmentRuntime) >>> 16) & 0xFFFF;
      case INPUT.EQUIPMENT_RUNTIME_L:    return Math.floor(s.equipmentRuntime) & 0xFFFF;
      case INPUT.COMPRESSOR_RUNTIME_H:   return (Math.floor(s.compressorRuntime) >>> 16) & 0xFFFF;
      case INPUT.COMPRESSOR_RUNTIME_L:   return Math.floor(s.compressorRuntime) & 0xFFFF;
      case INPUT.INTERNAL_FAN_RUNTIME_H: return (Math.floor(s.internalFanRuntime) >>> 16) & 0xFFFF;
      case INPUT.INTERNAL_FAN_RUNTIME_L: return Math.floor(s.internalFanRuntime) & 0xFFFF;
      case INPUT.COMPRESSOR_ACTION_H:    return (this.compressorStarts >>> 16) & 0xFFFF;
      case INPUT.COMPRESSOR_ACTION_L:    return this.compressorStarts & 0xFFFF;
      default: {
        const alarm = s.alarms.get(address);
        if (alarm !== undefined) return alarm;
        return 0xFFFF;
      }
    }
  }

  readHoldingRegister(address: number): number {
    const s = this.state;

    // HVAC dokümanı (MC90HDNC1R-L): bilgi (0x1000) ve alarm (0x300) blokları da
    // FC03 (holding) ile okunur; ayar/komut blokları aşağıdaki switch'te.
    if (
      (address >= 0x1000 && address <= 0x1030) ||
      (address >= 0x300 && address <= 0x31f)
    ) {
      return this.readInputRegister(address);
    }

    switch (address) {
      case HOLDING.SLAVE_ADDRESS:      return 1;
      case HOLDING.BAUD_RATE:          return 9600;
      case HOLDING.MONITOR_TEMP_MODE:  return s.monitorTempMode;
      case HOLDING.COOLING_SETPOINT:   return s.coolingSetpoint;
      case HOLDING.COOLING_HYSTERESIS:  return 0;
      case HOLDING.COMPRESSOR_START_DELAY: return 5;
      case HOLDING.RESTART_DELAY:      return 600;
      case HOLDING.HIGH_TEMP_ALARM:    return s.highTempAlarm;
      case HOLDING.HIGH_TEMP_HYSTERESIS: return 15;
      case HOLDING.LOW_TEMP_ALARM:     return s.lowTempAlarm;
      case HOLDING.LOW_TEMP_HYSTERESIS: return 900;
      case HOLDING.HEATING_SETPOINT:   return s.heatingSetpoint;
      case HOLDING.HEATING_HYSTERESIS: return 5;
      case HOLDING.SERVER_TEMP_MAX:    return s.serverTempMax;
      case HOLDING.SERVER_TEMP_MIN:    return s.serverTempMin;
      case HOLDING.SERVER_TEMP_AVG:    return s.serverTempAvg;
      case HOLDING.SERVER_RH:          return s.serverRH;
      case HOLDING.FORCED_ENABLE:      return s.forcedEnable;
      case HOLDING.FORCED_COOLING:     return s.forcedCooling;
      case HOLDING.FORCED_AIR_SUPPLY:  return s.forcedAirSupply;
      case HOLDING.FORCED_STANDBY:     return s.forcedStandby;
      case HOLDING.FORCED_HEATING:     return s.forcedHeating;
      default: return 0;
    }
  }

  writeHoldingRegister(address: number, value: number): void {
    const s = this.state;

    switch (address) {
      case HOLDING.REMOTE_ON_OFF:  s.remoteOn = (value === 1); break;
      case HOLDING.MONITOR_TEMP_MODE: s.monitorTempMode = value; break;
      case HOLDING.COOLING_SETPOINT:  s.coolingSetpoint = value; break;
      case HOLDING.HIGH_TEMP_ALARM:   s.highTempAlarm = value; break;
      case HOLDING.LOW_TEMP_ALARM:    s.lowTempAlarm = value; break;
      case HOLDING.HEATING_SETPOINT:  s.heatingSetpoint = value; break;
      case HOLDING.SERVER_TEMP_MAX:   s.serverTempMax = value; break;
      case HOLDING.SERVER_TEMP_MIN:   s.serverTempMin = value; break;
      case HOLDING.SERVER_TEMP_AVG:   s.serverTempAvg = value; break;
      case HOLDING.SERVER_RH:         s.serverRH = value; break;
      case HOLDING.FORCED_ENABLE: {
        s.forcedEnable = value === 1 ? 1 : 0;
        if (s.forcedEnable === 0) {
          // Zorlama kapatıldı → normal kontrol (standby'a dön)
          s.forcedCooling = 0; s.forcedHeating = 0; s.forcedStandby = 0; s.forcedAirSupply = 0;
          s.equipmentStatus = 1; s.indoorFanStatus = 1; s.outdoorFanStatus = 1;
          s.compressorStatus = 1; s.electricHeatingOn = 0;
        }
        break;
      }
      case HOLDING.FORCED_COOLING:
        s.forcedCooling = value === 1 ? 1 : 0;
        if (s.forcedEnable && s.forcedCooling === 1) {
          s.equipmentStatus = 2; s.indoorFanStatus = 2; s.outdoorFanStatus = 2;
          s.compressorStatus = 2; s.electricHeatingOn = 0; s.internalFanSpeed = 1500; s.externalFanSpeed = 1200;
        }
        break;
      case HOLDING.FORCED_HEATING:
        s.forcedHeating = value === 1 ? 1 : 0;
        if (s.forcedEnable && s.forcedHeating === 1) {
          s.equipmentStatus = 2; s.indoorFanStatus = 2; s.outdoorFanStatus = 1;
          s.compressorStatus = 1; s.electricHeatingOn = 1; s.internalFanSpeed = 800; s.externalFanSpeed = 0;
        }
        break;
      case HOLDING.FORCED_STANDBY:
        s.forcedStandby = value === 1 ? 1 : 0;
        if (s.forcedEnable && s.forcedStandby === 1) {
          s.equipmentStatus = 1; s.indoorFanStatus = 1; s.outdoorFanStatus = 1;
          s.compressorStatus = 1; s.electricHeatingOn = 0; s.internalFanSpeed = 0; s.externalFanSpeed = 0;
        }
        break;
      case HOLDING.FORCED_AIR_SUPPLY:
        s.forcedAirSupply = value === 1 ? 1 : 0;
        if (s.forcedEnable && s.forcedAirSupply === 1) {
          s.equipmentStatus = 2; s.indoorFanStatus = 2; s.compressorStatus = 1; s.electricHeatingOn = 0;
        }
        break;
      case HOLDING.RESET:             if (value === 0x0001) Object.assign(s, defaultState()); break;
      default: break;
    }
  }

  readCoil(_address: number): boolean { return false; }
  readDiscreteInput(_address: number): boolean { return false; }
  writeCoil(_address: number, _value: boolean): void {}
}
