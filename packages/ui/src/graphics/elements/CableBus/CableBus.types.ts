import type { FlowDirection, Point2D } from "../../types";

export type { FlowDirection };

export interface CableBusPosition {
  id: number;
  x: number;
  y: number;
}

export interface CableBusConfig {
  rackWidth: number;
  rackHeight: number;
  step: number;
}

export interface CableBusPositions {
  racks: CableBusPosition[];
  topBusY: number;
  bottomBusY: number;
  convergenceX: number;
  cbLeftMid: Point2D;
}

export interface CableBusProps {
  config: CableBusConfig;
  positions: CableBusPositions;
  flowDirection: FlowDirection;
}
