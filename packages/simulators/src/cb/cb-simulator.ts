// CB Simulator — DC Circuit Breaker simulation
import { COILS, DISCRETE, INPUT, HOLDING } from "./register-map";

interface CbState {
  closed: boolean;
  tripped: boolean;
  current: number;
  voltage: number;
  temperature: number;
  tripCount: number;
  operateCount: number;
  tripThreshold: number;
  uvThreshold: number;
  ovThreshold: number;

  pendingOpen: boolean;
  pendingClose: boolean;
  pendingReset: boolean;
}

function defaultState(): CbState {
  return {
    closed: true,
    tripped: false,
    current: 1000,       // 100.0A
    voltage: 4000,       // 400.0V
    temperature: 350,    // 35.0°C
    tripCount: 0,
    operateCount: 100,
    tripThreshold: 5000, // 500.0A
    uvThreshold: 3200,   // 320.0V
    ovThreshold: 4800,   // 480.0V

    pendingOpen: false,
    pendingClose: false,
    pendingReset: false,
  };
}

export class CbSimulator {
  private state: CbState;

  constructor() {
    this.state = defaultState();
  }

  tick(elapsedSeconds: number): void {
    const s = this.state;

    if (s.pendingReset) {
      s.pendingReset = false;
      if (s.tripped) {
        s.tripped = false;
        s.closed = true;
        s.operateCount++;
      }
    }

    if (s.pendingOpen) {
      s.pendingOpen = false;
      if (s.closed && !s.tripped) {
        s.closed = false;
        s.current = 0;
        s.operateCount++;
      }
    }

    if (s.pendingClose) {
      s.pendingClose = false;
      if (!s.closed && !s.tripped) {
        s.closed = true;
        s.operateCount++;
      }
    }

    if (s.closed && !s.tripped) {
      const jitter = (Math.random() - 0.5) * 20;
      s.current = 1000 + jitter;

      if (s.current > s.tripThreshold) {
        s.tripped = true;
        s.closed = false;
        s.current = 0;
        s.tripCount++;
      }
    } else {
      s.current = 0;
    }

    s.temperature += (s.current / 1000) * 0.02 * elapsedSeconds;
    s.temperature += (35.0 * 10 - s.temperature) * 0.01 * elapsedSeconds;
  }

  readInputRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case INPUT.CURRENT:   return Math.round(s.current);
      case INPUT.VOLTAGE:   return Math.round(s.voltage);
      case INPUT.TEMP:      return Math.round(s.temperature);
      case INPUT.TRIP_COUNT:   return s.tripCount;
      case INPUT.OPERATE_COUNT: return s.operateCount;
      default: return 0;
    }
  }

  readHoldingRegister(address: number): number {
    const s = this.state;

    switch (address) {
      case HOLDING.TRIP_THRESHOLD: return s.tripThreshold;
      case HOLDING.UV_THRESHOLD:   return s.uvThreshold;
      case HOLDING.OV_THRESHOLD:   return s.ovThreshold;
      default: return 0;
    }
  }

  writeHoldingRegister(address: number, value: number): void {
    const s = this.state;

    switch (address) {
      case HOLDING.TRIP_THRESHOLD: s.tripThreshold = value; break;
      case HOLDING.UV_THRESHOLD:   s.uvThreshold = value; break;
      case HOLDING.OV_THRESHOLD:   s.ovThreshold = value; break;
      default: break;
    }
  }

  readCoil(address: number): boolean {
    const s = this.state;

    switch (address) {
      case COILS.OPEN:  return s.pendingOpen;
      case COILS.CLOSE: return s.pendingClose;
      case COILS.RESET: return s.pendingReset;
      default: return false;
    }
  }

  writeCoil(address: number, value: boolean): void {
    if (!value) return;

    switch (address) {
      case COILS.OPEN:  this.state.pendingOpen = true; break;
      case COILS.CLOSE: this.state.pendingClose = true; break;
      case COILS.RESET: this.state.pendingReset = true; break;
      default: break;
    }
  }

  readDiscreteInput(address: number): boolean {
    const s = this.state;

    switch (address) {
      case DISCRETE.IS_CLOSED:  return s.closed;
      case DISCRETE.IS_TRIPPED: return s.tripped;
      default: return false;
    }
  }
}
