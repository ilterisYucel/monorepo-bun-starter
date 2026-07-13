import type { Rack } from "../../../types";
import type { ChargeStatus } from "@gd-monorepo/shared-types";

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
  flowDirection: ChargeStatus;
  onClick?: (rack: Rack, position: { x: number; y: number }) => void;
}
