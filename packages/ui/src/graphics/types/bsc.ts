export interface ConvergencePoint {
  x: number;
  topY?: number;
  bottomY?: number;
}

export interface BreakerConfig {
  endX: number;
  gapSize: number;
  startX?: number;
  y?: number;
}

export interface BreakerBusLayout {
  circuitBreaker: BreakerConfig;
  convergence: ConvergencePoint;
  topBusY: number;
  bottomBusY: number;
  racks?: Array<{ id: number; x: number; y: number }>;
  output?: OutputPosition;
}

export interface OutputPosition {
  x: number;
  y: number;
  radius: number;
}
