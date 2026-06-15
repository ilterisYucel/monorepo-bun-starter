import type { Rack } from "../../types";

export interface BSCStackProps {
  deviceId: string;
  bscCount: number;
  racks: Rack[];
  width?: number | string;
  flowDirection: "Charge" | "Discharge" | "Idle";
  breakerStatuses?: Array<"online" | "offline">;
  breakerPositions?: Array<"open" | "close">;
  dcOutputs?: Array<{
    status: "online" | "offline";
    voltage: number;
    current: number;
  }>;
  onRackClick?: (rackId: number) => void;
  onBreakerToggle?: (bscIndex: number, position: "open" | "close") => void;
}
