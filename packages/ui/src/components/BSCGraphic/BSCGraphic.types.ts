import type { Rack } from "../../types";

export interface BSCGraphicProps {
  deviceId: string;
  racks: Rack[];
  width?: number | string;
  flowDirection: "Charge" | "Discharge" | "Idle";
  breakerStatus?: "online" | "offline";
  breakerPosition?: "open" | "close";
  dcOutput?: {
    status: "online" | "offline";
    voltage: number;
    current: number;
  };
  onRackClick?: (rackId: number) => void;
  onBreakerToggle?: (position: "open" | "close") => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
  showFlowDirection?: boolean;
  bordered?: boolean;
  refreshCounter?: number;
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
