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
}

export interface StepConfig {
  step: number;
  rackWidth: number;
  rackHeight: number;
  rackGap: number;
  breakerWidth: number;
  breakerHeight: number;
  outputWidth: number;
  outputHeight: number;
  startX: number;
  startY: number;
}
