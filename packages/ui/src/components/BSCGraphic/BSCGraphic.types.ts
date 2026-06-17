import type { Rack } from "../../types";

export interface BSCUnit {
  deviceId: string;
  racks: Rack[];
  breakerStatus?: "online" | "offline";
  breakerPosition?: "open" | "close";
  dcOutput?: {
    status: "online" | "offline";
    voltage: number;
    current: number;
  };
}

export interface BSCGraphicProps {
  deviceId: string;
  bscUnits: BSCUnit[];
  flowDirection: "Charge" | "Discharge" | "Idle";
  width?: number | string;
  onRackClick?: (rackId: number) => void;
  onBreakerToggle?: (bscIndex: number, position: "open" | "close") => void;
  bordered?: boolean;
  showRefresh?: boolean;
}

export interface StepConfig {
  step: number;
  rackWidth: number;
  rackHeight: number;
  rackGap: number;
  outputRadius: number;
  startX: number;
  startY: number;
}

export interface RackPosition {
  id: number;
  x: number;
  y: number;
}

export interface ConvergencePoint {
  x: number;
  topY: number;
  bottomY: number;
}

export interface CircuitBreakerConfig {
  startX: number;
  endX: number;
  y: number;
  gapSize: number;
}

export interface OutputPosition {
  x: number;
  y: number;
  radius: number;
}

export interface BSCPositions {
  racks: RackPosition[];
  topBusY: number;
  bottomBusY: number;
  convergence: ConvergencePoint;
  circuitBreaker: CircuitBreakerConfig;
  output: OutputPosition;
}
