import type { StepConfig, BSCPositions } from "../../components/BSCGraphic/BSCGraphic.types";

export interface CircuitBreakerProps {
  config: StepConfig;
  positions: BSCPositions;
  breakerStatus: "online" | "offline";
  breakerPosition: "open" | "close";
  timestampRef: { current: number };
  frameCount: number;
  onClick?: () => void;
}
