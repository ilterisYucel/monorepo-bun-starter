import type { StepConfig, OutputPosition } from "../../components/BSCGraphic/BSCGraphic.types";

export interface DCOutputProps {
  config: StepConfig;
  output: OutputPosition;
  dcOutput?: { status: "online" | "offline"; voltage: number; current: number };
  timestampRef: { current: number };
  frameCount: number;
}
