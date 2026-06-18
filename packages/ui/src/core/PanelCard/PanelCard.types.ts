import type { RectPosition, StepConfig } from "../../components/TMSGraphic/TMSGraphic.types";

export interface PanelCardProps {
  pos: RectPosition;
  panelTemp: number;
  config: StepConfig;
  frameCount: number;
}
