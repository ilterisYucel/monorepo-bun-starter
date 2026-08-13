import type { RectPosition } from "../../types";

export interface PanelCardProps {
  pos: RectPosition;
  panelTemp: number;
  panelHumidity?: number;
  config: { step: number };
  minimal?: boolean;
}
