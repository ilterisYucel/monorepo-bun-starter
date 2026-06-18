import type { HvacData, RectPosition, StepConfig } from "../../components/TMSGraphic/TMSGraphic.types";

export interface HvacUnitProps {
  hvac: HvacData;
  pos: RectPosition;
  config: StepConfig;
  timestampRef: { current: number };
  frameCount: number;
}
