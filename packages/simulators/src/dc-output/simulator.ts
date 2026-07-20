// DC Output Simulator — DC Power Supply simulation
import { COILS, DISCRETE, INPUT, HOLDING } from "./register-map";

interface DcOutputState {
  outputOn: boolean;
  fault: boolean;
  voltageSetpoint: number;
  actualVoltage: number;
  currentLimit: number;
  actualCurrent: number;
  temperature: number;
  energyCounterKwh: number;
  ovThreshold: number;
  ocThreshold: number;

  pendingOn: boolean;
  pendingOff: boolean;
}

function defaultState(): DcOutputState {
  return {
    outputOn: true,
    fault: false,
    voltageSetpoint: 480,   // 48.0V
    actualVoltage: 480,     // 48.0V
    currentLimit: 1000,     // 100.0A
    actualCurrent: 500,     // 50.0A
    temperature: 400,       // 40.0°C
    energyCounterKwh: 0,
    ovThreshold: 550,       // 55.0V
    ocThreshold: 1100,      // 110.0A

    pendingOn: false,
    pendingOff: false,
  };
}

export class DcOutputSimulator {
  private state: DcOutputState;

  constructor() {
    this.state = defaultState();
  }

  tick(elapsedSeconds: number): void {
    const s = this.state;

    if (s.pendingOn) {
      s.pendingOn = false;
      if (!s.fault) s.outputOn = true;
    }

    if (s.pendingOff) {
      s.pendingOff = false;
      s.outputOn = false;
    }

    if (s.outputOn && !s.fault) {
      s.actualVoltage += (s.voltageSetpoint - s.actualVoltage) * 0.3 * elapsedSeconds;

      const baseCurrent = 500 + (Math.random() - 0.5) * 40;
      s.actualCurrent += (baseCurrent - s.actualCurrent) * 0.2 * elapsedSeconds;

      if (s.actualVoltage > s.ovThreshold * 10) {
        s.fault = true;
        s.outputOn = false;
      }

      if (s.actualCurrent > s.ocThreshold) {
        s.fault = true;
        s.outputOn = false;
      }
    } else {
      s.actualVoltage += (0 - s.actualVoltage) * 0.15 * elapsedSeconds;
      s.actualCurrent += (0 - s.actualCurrent) * 0.3 * elapsedSeconds;
    }

    s.temperature += ((s.outputOn ? 45.0 : 25.0) * 10 - s.temperature) * 0.02 * elapsedSeconds;

    if (s.outputOn && !s.fault) {
      const powerKw = (s.actualVoltage * s.actualCurrent) / 100000; // scaled values → kW
      s.energyCounterKwh += powerKw * (elapsedSeconds / 3600);
    }
  }

  readInputRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case INPUT.ACTUAL_VOLTAGE: return Math.round(s.actualVoltage);
      case INPUT.ACTUAL_CURRENT: return Math.round(s.actualCurrent);
      case INPUT.ACTUAL_POWER:   return Math.round((s.actualVoltage * s.actualCurrent) / 100);
      case INPUT.TEMP:           return Math.round(s.temperature);
      case INPUT.ENERGY_COUNTER_H: return (Math.floor(s.energyCounterKwh * 100) >>> 16) & 0xFFFF;
      case INPUT.ENERGY_COUNTER_L: return Math.floor(s.energyCounterKwh * 100) & 0xFFFF;
      default: return 0;
    }
  }

  readHoldingRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case HOLDING.VOLTAGE_SETPOINT: return s.voltageSetpoint;
      case HOLDING.CURRENT_LIMIT:    return s.currentLimit;
      case HOLDING.OV_THRESHOLD:     return s.ovThreshold;
      case HOLDING.OC_THRESHOLD:     return s.ocThreshold;
      default: return 0;
    }
  }

  writeHoldingRegister(address: number, value: number): void {
    const s = this.state;

    switch (address) {
      case HOLDING.VOLTAGE_SETPOINT: s.voltageSetpoint = value; break;
      case HOLDING.CURRENT_LIMIT:    s.currentLimit = value; break;
      case HOLDING.OV_THRESHOLD:     s.ovThreshold = value; break;
      case HOLDING.OC_THRESHOLD:     s.ocThreshold = value; break;
      default: break;
    }
  }

  readCoil(address: number): boolean {
    const s = this.state;

    switch (address) {
      case COILS.ON:  return s.pendingOn;
      case COILS.OFF: return s.pendingOff;
      default: return false;
    }
  }

  writeCoil(address: number, value: boolean): void {
    if (!value) return;

    switch (address) {
      case COILS.ON:  this.state.pendingOn = true; break;
      case COILS.OFF: this.state.pendingOff = true; break;
      default: break;
    }
  }

  readDiscreteInput(address: number): boolean {
    const s = this.state;

    switch (address) {
      case DISCRETE.IS_ON: return s.outputOn;
      case DISCRETE.FAULT: return s.fault;
      default: return false;
    }
  }
}
