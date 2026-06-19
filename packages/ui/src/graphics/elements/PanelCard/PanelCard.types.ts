import type { RectPosition } from "../../types";

export interface PanelCardProps {
  pos: RectPosition;
  panelTemp: number;
  config: { step: number };
}
