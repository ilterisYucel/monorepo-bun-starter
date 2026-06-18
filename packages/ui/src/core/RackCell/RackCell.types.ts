import type { Rack } from "../../types";

export interface RackCellConfig {
  step: number;
  rackWidth: number;
  rackHeight: number;
}

export interface RackCellProps {
  rack: Rack;
  x: number;
  y: number;
  config: RackCellConfig;
  flowDirection: "Charge" | "Discharge" | "Idle";
  onClick?: (rack: Rack, position: { x: number; y: number }) => void;
}
