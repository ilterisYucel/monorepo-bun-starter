// packages/simulators/src/tms/tms-simulator.ts

interface TMSState {
  remoteOn: boolean;
  coolingSetpoint: number;       // x10 °C
  heatingSetpoint: number;       // x10 °C
  highTempAlarm: number;         // x10 °C
  lowTempAlarm: number;          // x10 °C
  serverTempMax: number;         // x10 °C
  serverTempMin: number;         // x10 °C
  serverTempAvg: number;         // x10 °C

  currentTemp: number;           // x10 °C (simulated room temp)
  outsideTemp: number;           // x10 °C
  condenserTemp: number;         // x10 °C
  evaporatorTemp: number;        // x10 °C
  returnHumidity: number;        // x10 %
  supplyTemp: number;            // x10 °C

  equipmentStatus: number;       // 1=standby, 2=running, 3=fault
  indoorFanStatus: number;
  outdoorFanStatus: number;
  compressorStatus: number;
  electricHeatingOn: number;

  internalFanSpeed: number;      // rpm
  externalFanSpeed: number;      // rpm
  acInputVoltage: number;        // x10 V

  equipmentRuntime: number;      // hours (uint32)
  compressorRuntime: number;     // hours
  internalFanRuntime: number;    // hours

  alarms: Map<number, number>;   // address -> 0 (normal) / 1 (alarm)
}

function defaultState(): TMSState {
  return {
    remoteOn: false,
    coolingSetpoint: 230,        // 23.0°C
    heatingSetpoint: 150,        // 15.0°C
    highTempAlarm: 400,          // 40.0°C
    lowTempAlarm: 0,             // 0.0°C
    serverTempMax: 230,
    serverTempMin: 220,
    serverTempAvg: 225,

    currentTemp: 250,            // 25.0°C
    outsideTemp: 300,            // 30.0°C
    condenserTemp: 350,          // 35.0°C
    evaporatorTemp: 150,         // 15.0°C
    returnHumidity: 500,         // 50.0%
    supplyTemp: 200,             // 20.0°C

    equipmentStatus: 1,          // standby
    indoorFanStatus: 1,
    outdoorFanStatus: 1,
    compressorStatus: 1,
    electricHeatingOn: 0,

    internalFanSpeed: 0,
    externalFanSpeed: 0,
    acInputVoltage: 2300,        // 230.0V

    equipmentRuntime: 1000,
    compressorRuntime: 500,
    internalFanRuntime: 800,

    alarms: new Map(),
  };
}

export class TMSSimulator {
  private state: TMSState;

  constructor() {
    this.state = defaultState();
  }

  tick(elapsedSeconds: number): void {
    const s = this.state;

    if (s.remoteOn && s.equipmentStatus !== 3) {
      s.equipmentStatus = 2;     // running
      s.indoorFanStatus = 2;
      s.outdoorFanStatus = 2;
      s.compressorStatus = 2;

      // Cool toward cooling setpoint, or heat toward heating setpoint
      const isCooling = s.currentTemp > s.coolingSetpoint + 10;
      const isHeating = s.currentTemp < s.heatingSetpoint - 10;

      const speed = 0.5 * elapsedSeconds; // 0.5°C per second
      if (isCooling) {
        s.currentTemp -= speed;
        s.supplyTemp = s.currentTemp - 50; // supply is ~5°C cooler than room
        s.internalFanSpeed = 1500;
        s.externalFanSpeed = 1200;
        s.compressorStatus = 2;
        s.electricHeatingOn = 0;
      } else if (isHeating) {
        s.currentTemp += speed;
        s.supplyTemp = s.currentTemp + 50;
        s.internalFanSpeed = 800;
        s.externalFanSpeed = 0;
        s.compressorStatus = 1;  // compressor off during heating
        s.electricHeatingOn = 1;
      } else {
        // Idle — slow fan
        s.internalFanSpeed = 300;
        s.externalFanSpeed = 0;
        s.compressorStatus = 1;
        s.electricHeatingOn = 0;
      }

      // Gradually outside/external temps approach ambient
      s.condenserTemp += (s.outsideTemp - s.condenserTemp) * 0.1 * elapsedSeconds;
      s.evaporatorTemp += (s.currentTemp - s.evaporatorTemp) * 0.1 * elapsedSeconds;

      // Runtime accumulation
      s.equipmentRuntime += elapsedSeconds / 3600;
      s.internalFanRuntime += elapsedSeconds / 3600;
      if (s.compressorStatus === 2) s.compressorRuntime += elapsedSeconds / 3600;
    } else {
      // Standby — temperatures drift toward ambient
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
    s.alarms.set(0x300, s.currentTemp > s.highTempAlarm ? 1 : 0);
    s.alarms.set(0x306, s.currentTemp < s.lowTempAlarm ? 1 : 0);
    s.alarms.set(0x309, s.acInputVoltage > 2530 ? 1 : 0);
    s.alarms.set(0x30A, s.acInputVoltage < 1800 ? 1 : 0);
  }

  readInputRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case 0x1000: return s.equipmentStatus;
      case 0x1001: return s.electricHeatingOn;
      case 0x1002: return s.indoorFanStatus;
      case 0x1003: return Math.round(s.supplyTemp);
      case 0x1004: return s.outdoorFanStatus;
      case 0x1005: return Math.round(s.returnHumidity);
      case 0x1006: return s.compressorStatus;
      case 0x1008: return Math.round(s.currentTemp);
      case 0x100C: return Math.round(s.outsideTemp);
      case 0x100E: return Math.round(s.condenserTemp);
      case 0x1010: return Math.round(s.evaporatorTemp);
      case 0x1012: return s.internalFanSpeed;
      case 0x1014: return s.externalFanSpeed;
      case 0x1016: return Math.round(s.acInputVoltage);
      // Runtime — uint32 split across 2 registers
      case 0x101C: return (Math.floor(s.equipmentRuntime) >>> 16) & 0xFFFF;
      case 0x101D: return Math.floor(s.equipmentRuntime) & 0xFFFF;
      case 0x1020: return (Math.floor(s.compressorRuntime) >>> 16) & 0xFFFF;
      case 0x1021: return Math.floor(s.compressorRuntime) & 0xFFFF;
      case 0x1024: return (Math.floor(s.internalFanRuntime) >>> 16) & 0xFFFF;
      case 0x1025: return Math.floor(s.internalFanRuntime) & 0xFFFF;
      // Alarm registers
      case 0x300: case 0x301: case 0x302: case 0x303:
      case 0x304: case 0x305: case 0x306:
      case 0x309: case 0x30A: case 0x30B: case 0x30C:
      case 0x30D: case 0x30E: case 0x30F: case 0x310:
      case 0x312: case 0x313: case 0x316: case 0x317:
        return s.alarms.get(address) ?? 0;
      default: return 0xFFFF;
    }
  }

  readHoldingRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case 0x07: return 1;                         // slave address
      case 0x08: return 9600;                      // baud rate
      case 0x09: return 4;                         // monitor temp mode
      case 0x0A: return s.coolingSetpoint;
      case 0x0B: return 0;
      case 0x0C: return 5;
      case 0x0D: return 600;
      case 0x0E: return s.highTempAlarm;
      case 0x0F: return 15;
      case 0x10: return s.lowTempAlarm;
      case 0x11: return 900;
      case 0x13: return 100;
      case 0x1C: return s.heatingSetpoint;
      case 0x1E: return 5;
      case 0x21: return 1;
      case 0x23: return 1;
      default: return 0;
    }
  }

  writeHoldingRegister(address: number, value: number): void {
    const s = this.state;

    switch (address) {
      case 0x202: s.remoteOn = (value === 1); break;
      case 0x0A:  s.coolingSetpoint = value; break;
      case 0x0E:  s.highTempAlarm = value; break;
      case 0x10:  s.lowTempAlarm = value; break;
      case 0x1C:  s.heatingSetpoint = value; break;
      case 0x2000: s.serverTempMax = value; break;
      case 0x2001: s.serverTempMin = value; break;
      case 0x2002: s.serverTempAvg = value; break;
      case 0x2003: /* server humidity — ignore */ break;
      case 0x200:  if (value === 0x0001) Object.assign(s, defaultState()); break;
      default: break;
    }
  }

  readCoil(_address: number): boolean { return false; }
  readDiscreteInput(_address: number): boolean { return false; }
  writeCoil(_address: number, _value: boolean): void {}
}
