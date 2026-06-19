export interface ConvergencePoint {
  x: number;
}

export interface BreakerConfig {
  endX: number;
  gapSize: number;
}

export interface BreakerBusLayout {
  circuitBreaker: BreakerConfig;
  convergence: ConvergencePoint;
  topBusY: number;
  bottomBusY: number;
}

export interface OutputPosition {
  x: number;
  y: number;
  radius: number;
}
