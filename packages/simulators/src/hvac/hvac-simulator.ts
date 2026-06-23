// HVAC Simulator — Heating, Ventilation, Air Conditioning unit simulation
import { HOLDING, INPUT, ALARMS } from "./register-map";

interface HvacState {
  remoteOn: boolean;
  coolingSetpoint: number;
  heatingSetpoint: number;
  highTempAlarm: number;
  lowTempAlarm: number;
  serverTempMax: number;
  serverTempMin: number;
  serverTempAvg: number;

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

  alarms: Map<number, number>;
}

function defaultState(): HvacState {
  return {
    remoteOn: false,
    coolingSetpoint: 230,
    heatingSetpoint: 150,
    highTempAlarm: 400,
    lowTempAlarm: 0,
    serverTempMax: 230,
    serverTempMin: 220,
    serverTempAvg: 225,

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

    alarms: new Map(),
  };
}

export class HvacSimulator {
  private state: HvacState;

  constructor() {
    this.state = defaultState();
  }

  tick(elapsedSeconds: number): void {
    const s = this.state;

    if (s.remoteOn && s.equipmentStatus !== 3) {
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
    } else {
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
    s.alarms.set(ALARMS.OVER_VOLTAGE, s.acInputVoltage > 2530 ? 1 : 0);
    s.alarms.set(ALARMS.UNDER_VOLTAGE, s.acInputVoltage < 1800 ? 1 : 0);
    // Other alarms stay at 0 (healthy)
    for (const addr of Object.values(ALARMS)) {
      if (!s.alarms.has(addr)) s.alarms.set(addr, 0);
    }
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
      default: {
        const alarm = s.alarms.get(address);
        if (alarm !== undefined) return alarm;
        return 0xFFFF;
      }
    }
  }

  readHoldingRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case HOLDING.SLAVE_ADDRESS:      return 1;
      case HOLDING.BAUD_RATE:          return 9600;
      case HOLDING.MONITOR_TEMP_MODE:  return 4;
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
      default: return 0;
    }
  }

  writeHoldingRegister(address: number, value: number): void {
    const s = this.state;

    switch (address) {
      case HOLDING.REMOTE_ON_OFF:  s.remoteOn = (value === 1); break;
      case HOLDING.COOLING_SETPOINT:  s.coolingSetpoint = value; break;
      case HOLDING.HIGH_TEMP_ALARM:   s.highTempAlarm = value; break;
      case HOLDING.LOW_TEMP_ALARM:    s.lowTempAlarm = value; break;
      case HOLDING.HEATING_SETPOINT:  s.heatingSetpoint = value; break;
      case HOLDING.SERVER_TEMP_MAX:   s.serverTempMax = value; break;
      case HOLDING.SERVER_TEMP_MIN:   s.serverTempMin = value; break;
      case HOLDING.SERVER_TEMP_AVG:   s.serverTempAvg = value; break;
      case HOLDING.RESET:             if (value === 0x0001) Object.assign(s, defaultState()); break;
      default: break;
    }
  }

  readCoil(_address: number): boolean { return false; }
  readDiscreteInput(_address: number): boolean { return false; }
  writeCoil(_address: number, _value: boolean): void {}
}
